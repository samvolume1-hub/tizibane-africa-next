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
      "music-reviews", "sports-feed", "chipata-activities", "zambian-politics", "learn-trading",
    ]);
    if (!Array.isArray(payload.feeds) || payload.feeds.length !== expectedCategories.size) {
      return Response.json({ error: "Spotlight feed did not return all five departments" }, { status: 502 });
    }

    const seenCategories = new Set<string>();
    const items: Record<string, unknown>[] = [];
    for (const feed of payload.feeds) {
      if (!feed.id || !expectedCategories.has(feed.id) || seenCategories.has(feed.id)
        || feed.available !== true || !Array.isArray(feed.items)) {
        return Response.json({ error: "A Spotlight department feed is temporarily unavailable" }, { status: 502 });
      }
      seenCategories.add(feed.id);
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
    return Response.json({ ok: true, items_checked: items.length, result: data });
  } catch (error) {
    console.error("[Spotlight notification sync] sync failed", error);
    return Response.json({ error: "Spotlight sync failed" }, { status: 502 });
  }
});
