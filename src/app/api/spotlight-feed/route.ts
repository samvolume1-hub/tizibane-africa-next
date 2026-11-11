import { NextResponse } from "next/server";

export const revalidate = 900;

const topics = [
  { id: "music-reviews", label: "Music Reviews", query: "Zambian music new releases album reviews artist spotlight music videos Zambia" },
  { id: "sports-feed", label: "Sports Feed", query: "Zambia sports football basketball tennis athletics international sport" },
  { id: "chipata-activities", label: "Chipata Activities", query: "Chipata Eastern Province Zambia community events business development local news" },
  { id: "zambian-politics", label: "Zambian Politics", query: "Zambia politics parliament public policy government civic affairs analysis" },
  { id: "learn-trading", label: "Learn Online Trading", query: "beginner financial education forex stocks crypto trading platforms risk management" },
  { id: "special-offers", label: "Special Offers", query: "Zambia special offers promotions business deals discounts campaigns" },
] as const;

const USER_AGENT = "Mozilla/5.0 (compatible; TIZIBANE-Spotlight/1.0; +https://tizibane-africa-next.onrender.com)";
const PAGE_TIMEOUT_MS = 3500;
const MAX_HTML_BYTES = 900_000;

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
  const match = xml.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return match ? decodeXml(match[1]).replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim() : "";
}

function safeHttps(value: string) {
  try {
    const url = new URL(decodeXml(value));
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
    if (/^(127\\.|10\\.|192\\.168\\.|169\\.254\\.|0\\.)/.test(host) || /^172\\.(1[6-9]|2\\d|3[01])\\./.test(host) || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function readImage(xml: string) {
  const tags = [...xml.matchAll(/<(media:content|media:thumbnail|enclosure)\\b([^>]*)>/gi)];
  for (const match of tags) {
    const tag = match[1].toLowerCase();
    const attributes = match[2];
    const url = attributes.match(/\\burl=["']([^"']+)["']/i)?.[1];
    const type = attributes.match(/\\btype=["']([^"']+)["']/i)?.[1] || "";
    const medium = attributes.match(/\\bmedium=["']([^"']+)["']/i)?.[1] || "";
    const isImage = tag === "media:thumbnail" || medium.toLowerCase() === "image" || type.toLowerCase().startsWith("image/");
    if (url && isImage) {
      const safe = safeHttps(url);
      if (safe) return safe;
    }
  }
  const content = xml.match(/<(?:content:encoded|description)\\b[^>]*>([\\s\\S]*?)<\\/(?:content:encoded|description)>/i);
  const inline = (content?.[1] || xml).match(/<img\\b[^>]*\\bsrc=["']([^"']+)["']/i);
  return safeHttps(inline?.[1] || "");
}

function extractMetaImage(html: string, pageUrl: string) {
  const candidates: string[] = [];
  const metaTags = html.match(/<meta\\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const property = tag.match(/\\b(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!["og:image", "og:image:url", "twitter:image", "twitter:image:src"].includes(property || "")) continue;
    const content = tag.match(/\\bcontent=["']([^"']+)["']/i)?.[1];
    if (content) candidates.push(content);
  }
  const jsonLd = html.match(/<script\\b[^>]*type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi) || [];
  for (const block of jsonLd) {
    const body = block.replace(/^<script[^>]*>/i, "").replace(/<\\/script>$/i, "");
    const imageMatch = body.match(/["']image["']\\s*:\\s*(?:\\[\\s*)?["']([^"']+)["']/i);
    if (imageMatch?.[1]) candidates.push(imageMatch[1]);
  }
  for (const candidate of candidates) {
    try {
      const resolved = new URL(decodeXml(candidate), pageUrl).toString();
      const safe = safeHttps(resolved);
      if (safe && !/\\.svg(?:[?#]|$)/i.test(safe)) return safe;
    } catch {
      // Ignore malformed publisher metadata and continue to the next candidate.
    }
  }
  return null;
}

async function readLimitedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = value.subarray(0, MAX_HTML_BYTES - total);
    chunks.push(chunk);
    total += chunk.byteLength;
    if (chunk.byteLength !== value.byteLength) break;
  }
  reader.cancel().catch(() => undefined);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

async function fetchPublicArticlePage(startUrl: string) {
  let current = safeHttps(startUrl);
  if (!current) return null;
  for (let hop = 0; hop <= 4; hop += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" },
        signal: controller.signal,
        cache: "force-cache",
        next: { revalidate: 3600 },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || hop === 4) return null;
        current = safeHttps(new URL(location, current).toString());
        if (!current) return null;
        continue;
      }
      if (!response.ok || !/text\\/html|application\\/xhtml\\+xml/i.test(response.headers.get("content-type") || "")) return null;
      const html = await readLimitedText(response);
      return extractMetaImage(html, response.url || current);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function mapWithConcurrency<T, R>(values: T[], limit: number, mapper: (value: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= values.length) return;
      results[index] = await mapper(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

type FeedItem = {
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  imageUrl: string | null;
  articleUrl: string;
};

async function readTopic(topic: (typeof topics)[number]) {
  const query = encodeURIComponent(topic.query);
  const url = "https://news.google.com/rss/search?q=" + query + "&hl=en-ZM&gl=ZM&ceid=ZM:en";
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return { id: topic.id, label: topic.label, items: [] as FeedItem[] };
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/gi)].slice(0, 5).map((match) => {
      const item = match[1];
      const link = safeHttps(readTag(item, "link"));
      const title = readTag(item, "title");
      if (!link || !title) return null;
      return {
        title: title.slice(0, 240),
        source: readTag(item, "source").slice(0, 100) || "Online source",
        publishedAt: readTag(item, "pubDate"),
        summary: readTag(item, "description").slice(0, 900),
        imageUrl: readImage(item),
        articleUrl: link,
      };
    }).filter((item): item is FeedItem => Boolean(item));
    return { id: topic.id, label: topic.label, items };
  } catch {
    return { id: topic.id, label: topic.label, items: [] as FeedItem[] };
  }
}

export async function GET() {
  const feeds = await Promise.all(topics.map(readTopic));
  const candidates = feeds.flatMap((feed) => feed.items.slice(0, 4).filter((item) => !item.imageUrl));
  await mapWithConcurrency(candidates, 4, async (item) => {
    item.imageUrl = await fetchPublicArticlePage(item.articleUrl);
    return item;
  });
  const publicFeeds = feeds.map((feed) => ({
    ...feed,
    items: feed.items.map(({ articleUrl: _articleUrl, ...item }) => item),
  }));
  return NextResponse.json(
    { updatedAt: new Date().toISOString(), feeds: publicFeeds },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
  );
}
