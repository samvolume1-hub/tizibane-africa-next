import { NextResponse } from "next/server";

export const revalidate = 900;

const topics = [
  { id: "sports", label: "Sports", query: "Zambia sports football athletics" },
  { id: "gamers", label: "Gamers", query: "Zambia gaming esports gamers" },
  { id: "zambia", label: "Zambian news", query: "Zambia latest news" },
  { id: "world-music", label: "World music", query: "world music industry latest" },
  { id: "awards", label: "Music awards", query: "African music awards music awards" },
  { id: "zambian-music", label: "Hot Zambian music", query: "Zambian music artists latest" },
  { id: "education", label: "Education", query: "Zambia education news" },
  { id: "stock-market", label: "Stock markets", query: "Zambia Lusaka Securities Exchange stock market" },
  { id: "schools", label: "Schools", query: "Zambia schools education schools news" },
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
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")) : "";
}

function safeHttps(value: string) {
  try {
    const url = new URL(decodeXml(value));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function readImage(xml: string) {
  const attribute = xml.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl=["']([^"']+)["']/i);
  const inline = xml.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return safeHttps(attribute?.[1] || inline?.[1] || "");
}

async function readTopic(topic: (typeof topics)[number]) {
  const query = encodeURIComponent(topic.query);
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-ZM&gl=ZM&ceid=ZM:en`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "TIZIBANE-Spotlight/1.0 (+https://tizibane-africa-next.onrender.com)" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return { id: topic.id, label: topic.label, items: [] };
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 5).map((match) => {
      const item = match[1];
      const link = safeHttps(readTag(item, "link"));
      const title = readTag(item, "title");
      if (!link || !title) return null;
      return {
        title: title.slice(0, 240),
        url: link,
        source: readTag(item, "source").slice(0, 100) || "Online source",
        publishedAt: readTag(item, "pubDate"),
        imageUrl: readImage(item),
      };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    return { id: topic.id, label: topic.label, items };
  } catch {
    return { id: topic.id, label: topic.label, items: [] };
  }
}

export async function GET() {
  const feeds = await Promise.all(topics.map(readTopic));
  return NextResponse.json(
    { updatedAt: new Date().toISOString(), feeds },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
  );
}
