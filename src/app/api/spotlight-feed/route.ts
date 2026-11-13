import { isIP } from "node:net";
import { NextResponse } from "next/server";

export const revalidate = 900;

const topics = [
  { id: "music-reviews", label: "Music Reviews", query: "Zambian music new releases album reviews artist spotlight music videos Zambia" },
  { id: "sports-feed", label: "Sports Feed", query: "Zambia sports football basketball tennis athletics international sport" },
  { id: "chipata-activities", label: "Chipata Activities", query: "Chipata Eastern Province Zambia community events business development local news" },
  { id: "zambian-politics", label: "Zambian Politics", query: "Zambia politics parliament public policy government civic affairs analysis" },
  { id: "learn-trading", label: "Learn Online Trading", query: "beginner financial education forex stocks crypto trading platforms risk management" },
  { id: "business-hub", label: "Business Hub", query: "Lusaka Chipata Zambia local businesses entrepreneurs small business markets shops services business openings" },
] as const;

const USER_AGENT = "Mozilla/5.0 (compatible; TIZIBANE-Spotlight/1.0; +https://tizibane-africa-next.onrender.com)";
const FEED_TIMEOUT_MS = 7000;
const MAX_FEED_BYTES = 512_000;

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
  const match = xml.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return match ? decodeXml(match[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function safeHttps(value: string) {
  try {
    const url = new URL(decodeXml(value));
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;
    const host = url.hostname.toLowerCase();
    if (!host || isIP(host.replace(/^\[|\]$/g, "")) || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function readLimitedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_FEED_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = MAX_FEED_BYTES - total;
    chunks.push(value.subarray(0, remaining));
    total += Math.min(value.byteLength, remaining);
    if (value.byteLength > remaining) {
      await reader.cancel().catch(() => undefined);
      break;
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

type FeedItem = {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  articleUrl: string;
};

async function readTopic(topic: (typeof topics)[number]) {
  const query = encodeURIComponent(topic.query);
  const url = "https://news.google.com/rss/search?q=" + query + "&hl=en-ZM&gl=ZM&ceid=ZM:en";
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml;q=0.9" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!response.ok) return { id: topic.id, label: topic.label, available: false, items: [] as FeedItem[] };
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_FEED_BYTES) return { id: topic.id, label: topic.label, available: false, items: [] as FeedItem[] };

    const xml = await readLimitedText(response);
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 5).map((match) => {
      const item = match[1];
      const articleUrl = safeHttps(readTag(item, "link"));
      const title = readTag(item, "title");
      if (!articleUrl || !title) return null;
      return {
        title: title.slice(0, 240),
        source: readTag(item, "source").slice(0, 100) || "Online source",
        publishedAt: readTag(item, "pubDate"),
        summary: readTag(item, "description").slice(0, 900),
        articleUrl,
      };
    }).filter((item): item is FeedItem => Boolean(item));
    return { id: topic.id, label: topic.label, available: true, items };
  } catch {
    return { id: topic.id, label: topic.label, available: false, items: [] as FeedItem[] };
  }
}

export async function GET() {
  const feeds = await Promise.all(topics.map(readTopic));
  return NextResponse.json(
    { updatedAt: new Date().toISOString(), feeds },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
  );
}
