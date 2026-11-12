import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
const secretKeys = secretKeysRaw ? JSON.parse(secretKeysRaw) as Record<string, string> : {};
// Prefer the current Supabase secret-key format, while retaining compatibility
// with projects that still expose the legacy service_role JWT variable.
const SERVICE_ROLE_KEY = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SERVICE_ROLE_KEY) throw new Error("Supabase server secret is not configured.");
const topics = [
  { id: "music-reviews", label: "Music Reviews", query: "Zambian music new releases album reviews artist spotlight music videos Zambia" },
  { id: "sports-feed", label: "Sports Feed", query: "Zambia sports football basketball tennis athletics international sport" },
  { id: "chipata-activities", label: "Chipata Activities", query: "Chipata Eastern Province Zambia community events business development local news" },
  { id: "zambian-politics", label: "Zambian Politics", query: "Zambia politics parliament public policy government civic affairs analysis" },
  { id: "learn-trading", label: "Learn Online Trading", query: "beginner financial education forex stocks crypto trading platforms risk management" },
] as const;

const USER_AGENT = "TIZIBANE-Spotlight/1.0 (+https://tizibane-africa-next.onrender.com)";

function decodeXml(value: string) {
  return value
    .replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .trim();
}

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp("<" + tag + "(?:\\\\s[^>]*)?>([\\\\s\\\\S]*?)<\\\\/" + tag + ">", "i"));
  return match ? decodeXml(match[1]).replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim() : "";
}

function trustedArticleUrl(value: string) {
  try {
    const url = new URL(decodeXml(value));
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "news.google.com"
      || !url.pathname.startsWith("/rss/articles/") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function readTopic(topic: (typeof topics)[number]) {
  const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(topic.query) + "&hl=en-ZM&gl=ZM&ceid=ZM:en";
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.1" },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return { id: topic.id, label: topic.label, available: false, items: [] as FeedItem[] };
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/gi)].slice(0, 5).flatMap((match) => {
      const item = match[1];
      const articleUrl = trustedArticleUrl(readTag(item, "link"));
      const title = readTag(item, "title").slice(0, 240);
      if (!articleUrl || !title) return [];
      return [{
        title,
        source: readTag(item, "source").slice(0, 100) || "Online source",
        publishedAt: readTag(item, "pubDate").slice(0, 100),
        summary: readTag(item, "description").slice(0, 900),
        articleUrl,
      }];
    });
    return { id: topic.id, label: topic.label, available: true, items };
  } catch {
    return { id: topic.id, label: topic.label, available: false, items: [] as FeedItem[] };
  }
}

type FeedItem = { title: string; source: string; publishedAt: string; summary: string; articleUrl: string };
type Feed = { id: string; label: string; available: boolean; items: FeedItem[] };

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
    const feeds = await Promise.all(topics.map(readTopic));
    if (feeds.length !== topics.length || feeds.some((feed) => !feed.available)) {
      return Response.json({ error: "A Spotlight department feed is temporarily unavailable" }, { status: 502 });
    }

    const seenCategories = new Set(feeds.map((feed) => feed.id));
    if (seenCategories.size !== topics.length) {
      return Response.json({ error: "Spotlight feed is incomplete" }, { status: 502 });
    }

    const items: Record<string, unknown>[] = [];
    for (const feed of feeds) {
      for (const item of feed.items) {
        items.push({
          item_key: await digest(item.articleUrl),
          fingerprint: await digest(JSON.stringify([item.title, item.source, item.publishedAt, item.summary])),
          category_id: feed.id,
          category: feed.label,
          title: item.title,
          source: item.source,
          published_at: item.publishedAt,
          summary: item.summary,
          article_url: item.articleUrl,
        });
      }
    }

    const { data, error } = await supabase.rpc("process_spotlight_feed", { p_items: items });
    if (error) {
      console.error("[Spotlight notification sync] database processing failed", error);
      return Response.json({ error: "Notification processing failed" }, { status: 500 });
    }
    return Response.json({ ok: true, items_checked: items.length, result: data });
  } catch (error) {
    console.error("[Spotlight notification sync] sync failed", error);
    return Response.json({ error: "Spotlight sync failed" }, { status: 502 });
  }
});
