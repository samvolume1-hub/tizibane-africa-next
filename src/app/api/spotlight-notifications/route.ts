import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const topics = [
  { id: "music-reviews", label: "Music Reviews", query: "Zambian music new releases album reviews artist spotlight music videos Zambia" },
  { id: "sports-feed", label: "Sports Feed", query: "Zambia sports football basketball tennis athletics international sport" },
  { id: "chipata-activities", label: "Chipata Activities", query: "Chipata Eastern Province Zambia community events business development local news" },
  { id: "zambian-politics", label: "Zambian Politics", query: "Zambia politics parliament public policy government civic affairs analysis" },
  { id: "learn-trading", label: "Learn Online Trading", query: "beginner financial education forex stocks crypto trading platforms risk management" },
] as const;

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .trim();
}

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return match ? decodeXml(match[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
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
      headers: { "User-Agent": "TIZIBANE-Spotlight/1.0 (+https://tizibane-africa-next.onrender.com)" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 5).flatMap((match) => {
      const item = match[1];
      const articleUrl = trustedArticleUrl(readTag(item, "link"));
      const title = readTag(item, "title").slice(0, 240);
      if (!articleUrl || !title) return [];
      return [{
        topic_id: topic.id,
        topic: topic.label,
        article_url: articleUrl,
        title,
        source: readTag(item, "source").slice(0, 100) || "Online source",
        summary: readTag(item, "description").slice(0, 900),
        published_at: readTag(item, "pubDate").slice(0, 100),
      }];
    });
  } catch {
    return [];
  }
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const feeds = await Promise.all(topics.map(readTopic));
  const items = feeds.flat();
  if (!items.length) {
    return NextResponse.json({ checked: false, reason: "Spotlight feeds are temporarily unavailable." }, { status: 503 });
  }

  const { data, error } = await supabase.rpc("sync_spotlight_notifications", { p_items: items });
  if (error) {
    console.error("[TIZIBANE Spotlight] notification sync failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Spotlight notifications could not be synchronized." }, { status: 500 });
  }

  return NextResponse.json({ checked: true, notificationsCreated: Number(data ?? 0) });
}
