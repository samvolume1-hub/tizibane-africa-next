import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
const secretKeys = secretKeysRaw ? JSON.parse(secretKeysRaw) as Record<string, string> : {};
// Prefer the current Supabase secret-key format, while retaining compatibility
// with projects that still expose the legacy service_role JWT variable.
const SERVICE_ROLE_KEY = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SERVICE_ROLE_KEY) throw new Error("Supabase server secret is not configured.");
const SPOTLIGHT_FEED_URL = "https://tizibane-africa-next.onrender.com/api/spotlight-feed";

type FeedItem = { title?: string; source?: string; publishedAt?: string; summary?: string; articleUrl?: string };
type Feed = { id?: string; label?: string; available?: boolean; items?: FeedItem[] };

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function digest(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const cronToken = request.headers.get("x-tizibane-cron-token");
  if (!cronToken) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authorized, error: authError } = await supabase.rpc(
    "validate_spotlight_cron_token", { p_token: cronToken },
  );
  if (authError || authorized !== true) {
    console.error("[Spotlight notification sync] cron authorization failed", {
      code: authError?.code ?? null,
      message: authError?.message ?? null,
      authorized: authorized === true,
    });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(SPOTLIGHT_FEED_URL + "?notification-sync=" + Date.now(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) {
      return Response.json({ error: "Spotlight feed unavailable", status: response.status }, { status: 502 });
    }

    const payload = await response.json() as { feeds?: Feed[] };
    const expectedCategories = new Set([
      "music-reviews", "sports-feed", "chipata-activities", "zambian-politics", "learn-trading", "business-hub",
    ]);
    if (!Array.isArray(payload.feeds) || payload.feeds.length !== expectedCategories.size) {
      return Response.json({ error: "Spotlight feed did not return all six departments" }, { status: 502 });
    }

    const seenCategories = new Set<string>();
    const unavailableCategories: string[] = [];
    const items: Record<string, unknown>[] = [];
    for (const feed of payload.feeds) {
      if (!feed.id || !expectedCategories.has(feed.id) || seenCategories.has(feed.id)
        || !Array.isArray(feed.items)) {
        return Response.json({ error: "Spotlight feed response is invalid" }, { status: 502 });
      }
      seenCategories.add(feed.id);
      if (feed.available !== true) {
        unavailableCategories.push(feed.id);
        continue;
      }
      for (const item of feed.items) {
        const articleUrl = item.articleUrl ?? "";
        const title = (item.title ?? "").trim();
        if (!articleUrl.startsWith("https://") || !title) continue;
        const publishedAt = item.publishedAt ?? "";
        const source = item.source ?? "";
        const summary = item.summary ?? "";
        items.push({
          item_key: await digest(articleUrl),
          fingerprint: await digest(JSON.stringify([title, source, publishedAt, summary])),
          category_id: feed.id,
          category: feed.label ?? "Spotlight",
          title,
          source,
          published_at: publishedAt,
          summary,
          article_url: articleUrl,
        });
      }
    }

    if (seenCategories.size !== expectedCategories.size) {
      return Response.json({ error: "Spotlight feed is incomplete" }, { status: 502 });
    }

    const { data, error } = await supabase.rpc("process_spotlight_feed", { p_items: items });
    if (error) {
      console.error("[Spotlight notification sync] database processing failed", error);
      return Response.json({ error: "Notification processing failed" }, { status: 500 });
    }
    // Email delivery uses Brevo's HTTPS API (port 443). Render's free
    // web services block outbound SMTP ports, so SMTP credentials are not used.
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "TIZIBANE Zambia";
    const emailDispatch: Record<string, unknown> = {
      configured: Boolean(brevoApiKey && senderEmail),
      claimed: 0,
      sent: 0,
      failed: 0,
    };

    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]!);

    if (brevoApiKey && senderEmail) {
      const { data: batch, error: claimError } = await supabase.rpc(
        "claim_spotlight_email_batch", { p_limit: 30, p_token: cronToken },
      );
      if (claimError) {
        console.error("[Spotlight email] queue claim failed", { code: claimError.code });
        emailDispatch.error = "Queue claim failed";
      } else if (Array.isArray(batch) && batch.length > 0) {
        emailDispatch.claimed = batch.length;
        for (const entry of batch as Array<{
          id: string;
          recipient_email: string;
          kind: string;
          metadata: Record<string, unknown>;
        }>) {
          let sent = false;
          let failure = "Brevo email delivery failed";
          try {
            const metadata = entry.metadata ?? {};
            const isDigest = entry.kind === "spotlight_digest";
            const digestItems = Array.isArray(metadata.digest_items)
              ? metadata.digest_items as Array<Record<string, unknown>>
              : [];
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.recipient_email)) {
              throw new Error("Recipient email is invalid");
            }

            let subject = "";
            let textContent = "";
            let htmlContent = "";

            if (isDigest) {
              if (digestItems.length < 1 || digestItems.length > 30) {
                throw new Error("Spotlight digest item count is invalid");
              }
              const safeItems = digestItems.map((item) => {
                const title = String(item.title ?? "").trim();
                const category = String(item.category ?? "Spotlight");
                const summary = String(item.summary ?? "");
                const source = String(item.source ?? "");
                const articleUrl = String(item.article_url ?? "");
                if (!title || !articleUrl.startsWith("https://")) {
                  throw new Error("Spotlight digest contains an invalid story");
                }
                const spotlightUrl = "https://tizibane-africa-next.onrender.com/home/connect?story=" + encodeURIComponent(articleUrl);
                return { title, category, summary, source, articleUrl, spotlightUrl };
              });
              subject = "Your TIZIBANE Spotlight catch-up: " + safeItems.length + " stories";
              textContent = [
                "TIZIBANE ZAMBIA",
                "Your 12-hour Spotlight catch-up",
                "",
                "Here are the latest stories gathered since your last digest:",
                "",
                ...safeItems.flatMap((item, index) => [
                  (index + 1) + ". " + item.title,
                  item.category + (item.source ? " · " + item.source : ""),
                  item.summary,
                  "Open in Spotlight: " + item.spotlightUrl,
                  "",
                ]),
                "Connect. Belong. Grow.",
                "© 2026 TIZIBANE Zambia",
              ].join("\n");
              const listHtml = safeItems.map((item, index) => `
                <tr><td style="padding:17px 0;border-bottom:1px solid #eee7f1">
                  <div style="font-size:11px;font-weight:800;color:#a33a83;text-transform:uppercase;letter-spacing:1px">${escapeHtml(item.category)}${item.source ? " · " + escapeHtml(item.source) : ""}</div>
                  <h2 style="font-size:17px;line-height:1.35;margin:7px 0;color:#291638">${index + 1}. ${escapeHtml(item.title)}</h2>
                  <p style="font-size:13px;line-height:1.65;color:#51435a;margin:0 0 10px">${escapeHtml(item.summary).replace(/\r?\n/g, "<br>")}</p>
                  <a href="${escapeHtml(item.spotlightUrl)}" style="color:#54246f;font-size:12px;font-weight:700">Open this story in Spotlight ↗</a>
                </td></tr>`).join("");
              htmlContent = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f5f1f8;font-family:Arial,Helvetica,sans-serif;color:#281b32">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
                <tr><td style="padding:26px 30px;background:#211033;color:#fff"><div style="font-size:24px;font-weight:800;letter-spacing:2px">TIZIBANE</div><div style="margin-top:8px;font-size:11px;letter-spacing:2px;color:#f3c9e4">CONNECT. BELONG. GROW.</div></td></tr>
                <tr><td style="padding:28px 30px"><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a33a83">YOUR 12-HOUR CATCH-UP</div>
                <h1 style="font-size:25px;line-height:1.25;margin:12px 0;color:#291638">Stories you may have missed</h1>
                <p style="font-size:14px;line-height:1.7;color:#51435a">Here are ${safeItems.length} fresh Spotlight updates gathered since your last digest.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${listHtml}</table>
                <p style="font-size:13px;color:#7b6d82;margin-top:24px">Open any story to explore it in TIZIBANE Spotlight.</p></td></tr>
                <tr><td style="padding:18px 30px;background:#f8f4fa;color:#8b7d91;font-size:11px;line-height:1.6">© 2026 TIZIBANE Zambia<br>A Royalty Uncle Sam creation</td></tr>
                </table></td></tr></table></body></html>`;
            } else {
              const title = String(metadata.title ?? "A new Spotlight update");
              const category = String(metadata.category ?? "TIZIBANE Spotlight");
              const summary = String(metadata.summary ?? "Discover the latest update from your community.");
              const source = String(metadata.source ?? "");
              const articleUrl = String(metadata.article_url ?? "");
              if (!articleUrl.startsWith("https://")) throw new Error("Spotlight link is not a secure HTTPS URL");
              const isUpdate = entry.kind === "spotlight_updated";
              const heading = isUpdate ? "Spotlight story updated" : "New in Spotlight";
              subject = isUpdate ? "Spotlight update: " + title : "New in TIZIBANE Spotlight: " + title;
              const safeTitle = escapeHtml(title);
              const safeCategory = escapeHtml(category);
              const safeSummary = escapeHtml(summary).replace(/\r?\n/g, "<br>");
              const safeSource = escapeHtml(source);
              const safeUrl = escapeHtml(articleUrl);
              textContent = [
                "TIZIBANE ZAMBIA", heading, "", title, category, summary,
                source ? "Source: " + source : "", "", "Read the update: " + articleUrl,
                "", "Connect. Belong. Grow.", "© 2026 TIZIBANE Zambia",
              ].filter(Boolean).join("\n");
              htmlContent = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f5f1f8;font-family:Arial,Helvetica,sans-serif;color:#281b32">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
                <tr><td style="padding:26px 30px;background:#211033;color:#fff"><div style="font-size:24px;font-weight:800;letter-spacing:2px">TIZIBANE</div><div style="margin-top:8px;font-size:11px;letter-spacing:2px;color:#f3c9e4">CONNECT. BELONG. GROW.</div></td></tr>
                <tr><td style="padding:30px"><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a33a83">${escapeHtml(heading)}</div>
                <h1 style="font-size:25px;line-height:1.25;margin:12px 0;color:#291638">${safeTitle}</h1>
                <div style="font-size:13px;color:#755c80;margin-bottom:18px">${safeCategory}${safeSource ? " · " + safeSource : ""}</div>
                <p style="font-size:15px;line-height:1.7;color:#51435a">${safeSummary}</p>
                <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:13px 22px;background:#54246f;color:#fff;text-decoration:none;border-radius:9px;font-weight:700">READ THE SPOTLIGHT UPDATE</a></p>
                <p style="font-size:13px;color:#7b6d82">Stay connected with what's happening across your Zambian community.</p></td></tr>
                <tr><td style="padding:18px 30px;background:#f8f4fa;color:#8b7d91;font-size:11px;line-height:1.6">© 2026 TIZIBANE Zambia<br>A Royalty Uncle Sam creation</td></tr>
                </table></td></tr></table></body></html>`;
            }
            const delivery = await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers: {
                "api-key": brevoApiKey,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify({
                sender: { name: senderName, email: senderEmail },
                to: [{ email: entry.recipient_email }],
                subject,
                textContent,
                htmlContent,
                headers: { "X-Tizibane-Notification-Id": entry.id },
              }),
              signal: AbortSignal.timeout(20_000),
            });
            if (!delivery.ok) {
              const detail = (await delivery.text()).slice(0, 300);
              throw new Error("Brevo API returned " + delivery.status + ": " + detail);
            }
            sent = true;
          } catch (emailError) {
            failure = emailError instanceof Error ? emailError.message.slice(0, 500) : failure;
            console.error("[Spotlight email] delivery failed", { queue_id: entry.id, error: failure });
          }

          const { error: completionError } = await supabase.rpc("complete_spotlight_email", {
            p_id: entry.id,
            p_sent: sent,
            p_error: sent ? null : failure,
            p_token: cronToken,
          });
          if (completionError) {
            console.error("[Spotlight email] queue completion failed", { code: completionError.code });
          } else if (sent) {
            emailDispatch.sent = Number(emailDispatch.sent) + 1;
          } else {
            emailDispatch.failed = Number(emailDispatch.failed) + 1;
          }
        }
      }
    }

    return Response.json({ ok: true, items_checked: items.length, unavailable_categories: unavailableCategories, result: data, email_dispatch: emailDispatch });
  } catch (error) {
    console.error("[Spotlight notification sync] sync failed", error);
    return Response.json({ error: "Spotlight sync failed" }, { status: 502 });
  }
});
