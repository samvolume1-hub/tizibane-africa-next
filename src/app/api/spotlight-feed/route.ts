import { NextResponse } from "next/server";

export const revalidate = 900;

// Keep this order aligned with the priorities requested for TIZIBANE Spotlight:
// Zambian music, education and sport first; gaming next; markets and schools after.
const topics = [
  { id: "zambian-music", label: "Zambian music", query: "Zambian music artists new releases music videos Zambia" },
  { id: "education", label: "Education", query: "Zambia education news learners universities scholarships" },
  { id: "sports", label: "Sports", query: "Zambia sports football Copper Queens athletics" },
  { id: "gamers", label: "Gamers", query: "gaming esports video games Africa gaming news" },
  { id: "stock-market", label: "Stock market", query: "Zambia Lusaka Securities Exchange market news LASI listed companies" },
  { id: "schools", label: "Schools", query: "Zambia schools learners school news opportunities" },
  { id: "zambia", label: "Hot Zambian news", query: "Zambia latest breaking news headlines" },
  { id: "world-music", label: "World music chats", query: "world music industry artists global music news conversations" },
  { id: "awards", label: "Music awards", query: "Zambia African music awards nominations winners latest" },
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

function safeHttps(value: string) {
  try {
    const url = new URL(decodeXml(value));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function readImage(xml: string) {
  const tags = [...xml.matchAll(/<(media:content|media:thumbnail|enclosure)\b([^>]*)>/gi)];
  for (const match of tags) {
    const tag = match[1].toLowerCase();
    const attributes = match[2];
    const url = attributes.match(/\burl=["']([^"']+)["']/i)?.[1];
    const type = attributes.match(/\btype=["']([^"']+)["']/i)?.[1] || "";
    const medium = attributes.match(/\bmedium=["']([^"']+)["']/i)?.[1] || "";
    const isImage = tag === "media:thumbnail" || medium.toLowerCase() === "image" || type.toLowerCase().startsWith("image/");
    if (url && isImage) {
      const safe = safeHttps(url);
      if (safe) return safe;
    }
  }
  const content = xml.match(/<(?:content:encoded|description)\b[^>]*>([\s\S]*?)<\/(?:content:encoded|description)>/i);
  const inline = (content?.[1] || xml).match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return safeHttps(inline?.[1] || "");
}

function publisherUrl(xml: string, fallbackLink: string) {
  const source = xml.match(/<source\b[^>]*\burl=["']([^"']+)["']/i);
  return safeHttps(source?.[1] || fallbackLink) || fallbackLink;
}

function publisherImage(link: string) {
  try {
    const host = new URL(link).hostname;
    return "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=256";
  } catch {
    return null;
  }
}

async function readTopic(topic: (typeof topics)[number]) {
  const query = encodeURIComponent(topic.query);
  const url = "https://news.google.com/rss/search?q=" + query + "&hl=en-ZM&gl=ZM&ceid=ZM:en";
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
      const publisher = publisherUrl(item, link);
      return {
        title: title.slice(0, 240),
        source: readTag(item, "source").slice(0, 100) || "Online source",
        publishedAt: readTag(item, "pubDate"),
        summary: readTag(item, "description").slice(0, 900),
        imageUrl: readImage(item) || publisherImage(publisher),
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
