import { timingSafeEqual } from "node:crypto";
import { connect as netConnect, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QueueItem = {
  id: string;
  recipient_email: string;
  kind: "spotlight_new" | "spotlight_updated";
  metadata: Record<string, unknown>;
  attempts?: number;
};

class SmtpSession {
  private socket: Socket | TLSSocket;
  private buffer = "";
  private lines: string[] = [];
  private waiter: ((line: string) => void) | null = null;
  private failure: Error | null = null;
  private onData = (chunk: Buffer) => {
    this.buffer += chunk.toString("utf8");
    let index = this.buffer.indexOf("\r\n");
    while (index >= 0) {
      const line = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 2);
      if (this.waiter) {
        const resolve = this.waiter;
        this.waiter = null;
        resolve(line);
      } else {
        this.lines.push(line);
      }
      index = this.buffer.indexOf("\r\n");
    }
  };
  private onError = (error: Error) => {
    this.failure = error;
    if (this.waiter) {
      const resolve = this.waiter;
      this.waiter = null;
      resolve("");
    }
  };
  private onClose = () => {
    if (!this.failure) this.failure = new Error("SMTP connection closed unexpectedly");
    if (this.waiter) {
      const resolve = this.waiter;
      this.waiter = null;
      resolve("");
    }
  };

  constructor(socket: Socket | TLSSocket) {
    this.socket = socket;
    this.attach();
  }

  private attach() {
    this.socket.on("data", this.onData);
    this.socket.on("error", this.onError);
    this.socket.on("close", this.onClose);
    this.socket.setTimeout(25_000, () => this.socket.destroy(new Error("SMTP connection timed out")));
  }

  private detach() {
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("close", this.onClose);
  }

  private async readLine(): Promise<string> {
    if (this.lines.length) return this.lines.shift()!;
    if (this.failure) throw this.failure;
    return await new Promise<string>((resolve) => { this.waiter = resolve; });
  }

  async response(): Promise<{ code: number; text: string }> {
    const lines: string[] = [];
    while (true) {
      const line = await this.readLine();
      if (!line && this.failure) throw this.failure;
      lines.push(line);
      if (/^\d{3} /.test(line)) {
        const code = Number(line.slice(0, 3));
        return { code, text: lines.join("\n") };
      }
      if (!/^\d{3}-/.test(line)) throw new Error("Unexpected SMTP response");
    }
  }

  async expect(...codes: number[]) {
    const result = await this.response();
    if (!codes.includes(result.code)) {
      throw new Error(`Brevo SMTP rejected a command (${result.code}). ${result.text.slice(0, 400)}`);
    }
    return result;
  }

  async command(value: string, ...codes: number[]) {
    this.socket.write(value + "\r\n");
    return await this.expect(...codes);
  }

  async upgradeTls(host: string) {
    const raw = this.socket as Socket;
    this.detach();
    const secured = tlsConnect({ socket: raw, servername: host, rejectUnauthorized: true });
    await new Promise<void>((resolve, reject) => {
      secured.once("secureConnect", resolve);
      secured.once("error", reject);
    });
    this.socket = secured;
    this.failure = null;
    this.attach();
  }

  write(value: string) {
    this.socket.write(value);
  }

  close() {
    this.socket.end();
  }
}

function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function encodedWord(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function base64Lines(value: string) {
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return encoded.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function buildEmail(item: QueueItem, senderEmail: string, senderName: string) {
  const metadata = item.metadata ?? {};
  const title = String(metadata.title ?? "A new Spotlight update");
  const category = String(metadata.category ?? "TIZIBANE Spotlight");
  const summary = String(metadata.summary ?? "Discover the latest update from your community.");
  const source = String(metadata.source ?? "");
  const articleUrl = String(metadata.article_url ?? "");
  if (!articleUrl.startsWith("https://")) throw new Error("Spotlight link is not a secure HTTPS URL");
  const isUpdate = item.kind === "spotlight_updated";
  const heading = isUpdate ? "Spotlight story updated" : "New in Spotlight";
  const subject = isUpdate ? "Spotlight update: " + title : "New in TIZIBANE Spotlight: " + title;
  const safeTitle = htmlEscape(title);
  const safeCategory = htmlEscape(category);
  const safeSummary = htmlEscape(summary).replace(/\r?\n/g, "<br>");
  const safeSource = htmlEscape(source);
  const safeUrl = htmlEscape(articleUrl);
  const plain = [
    "TIZIBANE ZAMBIA",
    heading,
    "",
    title,
    category,
    summary,
    source ? "Source: " + source : "",
    "",
    "Read the update: " + articleUrl,
    "",
    "Connect. Belong. Grow.",
    "© 2026 TIZIBANE Zambia",
  ].filter(Boolean).join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f5f1f8;font-family:Arial,Helvetica,sans-serif;color:#281b32">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
  <tr><td style="padding:26px 30px;background:#211033;color:#fff">
  <div style="font-size:24px;font-weight:800;letter-spacing:2px">TIZIBANE</div>
  <div style="margin-top:8px;font-size:11px;letter-spacing:2px;color:#f3c9e4">CONNECT. BELONG. GROW.</div>
  </td></tr>
  <tr><td style="padding:30px">
  <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a33a83">${htmlEscape(heading)}</div>
  <h1 style="font-size:25px;line-height:1.25;margin:12px 0;color:#291638">${safeTitle}</h1>
  <div style="font-size:13px;color:#755c80;margin-bottom:18px">${safeCategory}${safeSource ? " · " + safeSource : ""}</div>
  <p style="font-size:15px;line-height:1.7;color:#51435a">${safeSummary}</p>
  <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;background:#54246f;color:#fff;text-decoration:none;border-radius:9px;font-weight:700">READ THE SPOTLIGHT UPDATE</a></p>
  <p style="font-size:13px;color:#7b6d82">Stay connected with what's happening across your Zambian community.</p>
  </td></tr>
  <tr><td style="padding:18px 30px;background:#f8f4fa;color:#8b7d91;font-size:11px;line-height:1.6">© 2026 TIZIBANE Zambia<br>A Royalty Uncle Sam creation</td></tr>
  </table></td></tr></table></body></html>`;
  const boundary = "tizibane-" + cryptoRandomBoundary();
  const mime = [
    `From: ${encodedWord(senderName)} <${senderEmail}>`,
    `To: <${item.recipient_email}>`,
    `Subject: ${encodedWord(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(plain),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  return mime.replace(/\n\./g, "\n..");
}

function cryptoRandomBoundary() {
  return Buffer.from(cryptoRandomBytes()).toString("hex");
}
function cryptoRandomBytes() {
  return requireRandomBytes();
}
function requireRandomBytes() {
  return Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(12)));
}

async function sendEmail(item: QueueItem) {
  const host = process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.BREVO_SMTP_PORT || "587");
  const login = process.env.BREVO_SMTP_LOGIN || "";
  const key = process.env.BREVO_SMTP_KEY || "";
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "";
  const senderName = process.env.BREVO_SENDER_NAME || "TIZIBANE Zambia";
  if (!login || !key || !senderEmail) throw new Error("Brevo SMTP login, key and verified sender are required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.recipient_email)) throw new Error("Recipient email is invalid");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) throw new Error("Verified sender email is invalid");

  const raw = netConnect({ host, port });
  await new Promise<void>((resolve, reject) => {
    raw.once("connect", resolve);
    raw.once("error", reject);
  });
  const smtp = new SmtpSession(raw);
  try {
    await smtp.expect(220);
    await smtp.command("EHLO tizibane-africa-next.onrender.com", 250);
    await smtp.command("STARTTLS", 220);
    await smtp.upgradeTls(host);
    await smtp.command("EHLO tizibane-africa-next.onrender.com", 250);
    await smtp.command("AUTH LOGIN", 334);
    await smtp.command(Buffer.from(login).toString("base64"), 334);
    await smtp.command(Buffer.from(key).toString("base64"), 235);
    await smtp.command(`MAIL FROM:<${senderEmail}>`, 250);
    await smtp.command(`RCPT TO:<${item.recipient_email}>`, 250, 251);
    await smtp.command("DATA", 354);
    const mime = buildEmail(item, senderEmail, senderName);
    smtp.write(mime.replace(/\r?\n\./g, "\r\n..") + "\r\n.\r\n");
    await smtp.expect(250);
    await smtp.command("QUIT", 221);
  } finally {
    smtp.close();
  }
}

function authorized(request: Request) {
  const expected = process.env.TIZIBANE_EMAIL_DISPATCH_TOKEN || "";
  const actual = request.headers.get("x-tizibane-email-dispatch-token") || "";
  if (!expected || !actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let payload: { items?: QueueItem[] };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(payload.items) || payload.items.length > 50) {
    return Response.json({ error: "Expected an items array of at most 50 emails" }, { status: 400 });
  }

  const sent_ids: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const item of payload.items) {
    if (!item || typeof item.id !== "string" || !["spotlight_new", "spotlight_updated"].includes(item.kind)) {
      continue;
    }
    try {
      await sendEmail(item);
      sent_ids.push(item.id);
    } catch (error) {
      failed.push({
        id: item.id,
        error: error instanceof Error ? error.message.slice(0, 400) : "Email delivery failed",
      });
    }
  }
  return Response.json({ sent_ids, failed });
}
