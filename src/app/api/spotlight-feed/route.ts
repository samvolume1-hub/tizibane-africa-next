import { isIP } from "node:net";
import { NextResponse } from "next/server";

export const revalidate = 300;

const topics = [
  { id: "music-reviews", label: "Music Reviews", query: "Zambian music new releases album reviews artist spotlight music videos Zambia" },
  { id: "sports-feed", label: "Sports Feed", query: "Zambia sports football basketball tennis athletics international sport" },
  { id: "chipata-activities", label: "Chipata Activities", query: "Chipata Eastern Province Zambia community events business development local news" },
  { id: "zambian-politics", label: "Zambian Politics", query: "Zambia politics parliament public policy government civic affairs analysis" },
  { id: "learn-trading", label: "Learn Online Trading", query: "beginner financial education forex stocks crypto trading platforms risk management" },
  { id: "business-hub", label: "Business Hub", query: "Lusaka Chipata Zambia local businesses entrepreneurs small business markets shops services business openings" },
] as const;

const USER_AGENT = "Mozilla/5.0 (compatible; TIZIBANE-Spotlight/1.1; +https://tizibane-africa-next.onrender.com)";
const FEED_TIMEOUT_MS = 8000;
const MAX_FEED_BYTES = 512_000;
const MAX_CANDIDATES = 40;
const MAX_STORY_AGE_DAYS = 45;

type FeedItem = {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  extendedSummary: string;
  articleUrl: string;
};

type Provider = { name: string; url: string };

const musicProviders: Provider[] = [
  { name: "Zambian Music Blog", url: "https://zambianmusicblog.co/feed/" },
  { name: "ZambianPlay", url: "https://zambianplay.com/feed/" },
  { name: "AfroFire", url: "https://afrofire.com/feed/" },
  { name: "Zedhousezambia", url: "https://zedhousezambia.com/feed/" },
];

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
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp("<" + escapedTag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + escapedTag + ">", "i"));
  return match ? decodeXml(match[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function readArticleLink(item: string) {
  const linkTag = item.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
  const linkAttribute = item.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?\s*>/i);
  const guid = item.match(/<guid\b[^>]*>([\s\S]*?)<\/guid>/i);
  const candidate = linkTag?.[1] || linkAttribute?.[1] || (guid?.[1] || "");
  return safeHttps(decodeXml(candidate.replace(/<[^>]+>/g, "").trim()));
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

function parseFeed(xml: string, providerName: string): FeedItem[] {
  const entries = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)]
    .slice(0, MAX_CANDIDATES);
  return entries.map((match) => {
    const item = match[1];
    const articleUrl = readArticleLink(item);
    const title = readTag(item, "title");
    if (!articleUrl || !title) return null;
    const sourceTag = item.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i);
    const source = sourceTag ? decodeXml(sourceTag[1]).replace(/<[^>]+>/g, "").trim() : providerName;
    return {
      title: title.slice(0, 240),
      source: source.slice(0, 100) || providerName,
      publishedAt: readTag(item, "pubDate") || readTag(item, "published") || readTag(item, "updated"),
      summary: (readTag(item, "description") || readTag(item, "summary") || readTag(item, "content:encoded") || readTag(item, "content")).slice(0, 900),
      extendedSummary: (readTag(item, "content:encoded") || readTag(item, "content") || readTag(item, "description") || readTag(item, "summary")).slice(0, 1800),
      articleUrl,
    } satisfies FeedItem;
  }).filter((item): item is FeedItem => Boolean(item));
}

async function fetchProvider(provider: Provider) {
  const startedAt = Date.now();
  try {
    const response = await fetch(provider.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9" },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn("[spotlight-feed] provider HTTP failure", { provider: provider.name, status: response.status });
      return { items: [] as FeedItem[], ok: false };
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_FEED_BYTES) {
      console.warn("[spotlight-feed] provider response too large", { provider: provider.name, contentLength });
      return { items: [] as FeedItem[], ok: false };
    }
    const xml = await readLimitedText(response);
    const items = parseFeed(xml, provider.name);
    const looksLikeFeed = /<(?:rss|feed|rdf:RDF)\b/i.test(xml);
    if (!looksLikeFeed) {
      console.warn("[spotlight-feed] provider returned non-feed content", { provider: provider.name, bytes: xml.length });
      return { items: [] as FeedItem[], ok: false };
    }
    console.info("[spotlight-feed] provider fetched", { provider: provider.name, status: response.status, parsed: items.length, durationMs: Date.now() - startedAt });
    return { items, ok: true };
  } catch (error) {
    console.warn("[spotlight-feed] provider request failed", {
      provider: provider.name,
      reason: error instanceof Error ? error.name : "unknown",
      durationMs: Date.now() - startedAt,
    });
    return { items: [] as FeedItem[], ok: false };
  }
}

function isRelevantMusicStory(item: FeedItem) {
  const text = (item.title + " " + item.summary).toLowerCase();
  const relevant = /zambia|zambian|zed music|zed artist|album|single|music|musician|artist|singer|rapper|producer|song|video|concert|afrobeats|afropop|zamrock|gospel|hip.?hop|r.?&.?b|entertainment/.test(text);
  const obviousNoise = /betting bonus|casino|loan offer|job vacancy|real estate listing|cryptocurrency giveaway/.test(text);
  return relevant && !obviousNoise;
}

function isRecent(item: FeedItem) {
  if (!item.publishedAt) return true;
  const timestamp = Date.parse(item.publishedAt);
  if (!Number.isFinite(timestamp)) return true;
  const age = Date.now() - timestamp;
  return age <= MAX_STORY_AGE_DAYS * 24 * 60 * 60 * 1000 && age >= -24 * 60 * 60 * 1000;
}

function deduplicateAndRank(items: FeedItem[], limit = 6) {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.articleUrl.replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aDate = Date.parse(a.publishedAt) || 0;
      const bDate = Date.parse(b.publishedAt) || 0;
      return bDate - aDate;
    })
    .slice(0, limit);
}

async function readTopic(topic: (typeof topics)[number]) {
  const query = encodeURIComponent(topic.query);
  const googleUrl = "https://news.google.com/rss/search?q=" + query + "&hl=en-ZM&gl=ZM&ceid=ZM:en";
  const providers = topic.id === "music-reviews" ? musicProviders : [];
  const [directResults, googleResult] = await Promise.all([
    Promise.all(providers.map(fetchProvider)),
    fetchProvider({ name: "Google News", url: googleUrl }),
  ]);
  const directItems = directResults.flatMap((result) => result.items);
  const googleItems = googleResult.items;
  const candidates = topic.id === "music-reviews"
    ? [...directItems.filter(isRelevantMusicStory), ...googleItems.filter(isRelevantMusicStory)]
    : googleItems;
  const accepted = candidates.filter(isRecent);
  const items = deduplicateAndRank(accepted);
  const anyProviderSucceeded = googleResult.ok || directResults.some((result) => result.ok);
  console.info("[spotlight-feed] topic summary", {
    topic: topic.id,
    providersAttempted: providers.length + 1,
    providersSucceeded: Number(googleResult.ok) + directResults.filter((result) => result.ok).length,
    parsed: directItems.length + googleItems.length,
    relevant: candidates.length,
    recent: accepted.length,
    published: items.length,
  });
  return { id: topic.id, label: topic.label, available: anyProviderSucceeded, items };
}

export async function GET() {
  const feeds = await Promise.all(topics.map(readTopic));
  return NextResponse.json(
    { updatedAt: new Date().toISOString(), feeds },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
  );
}
