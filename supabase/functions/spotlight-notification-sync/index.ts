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
    // Email is a separate optional delivery channel. If its server-side
    // configuration is absent, the private queue remains pending and in-app
    // notifications continue normally.
    const emailDispatchUrl = Deno.env.get("TIZIBANE_EMAIL_DISPATCH_URL");
    const emailDispatchToken = Deno.env.get("TIZIBANE_EMAIL_DISPATCH_TOKEN");
    const emailDispatch: Record<string, unknown> = {
      configured: Boolean(emailDispatchUrl && emailDispatchToken),
      claimed: 0,
      sent: 0,
      failed: 0,
    };

    if (emailDispatchUrl && emailDispatchToken) {
      const { data: batch, error: claimError } = await supabase.rpc(
        "claim_spotlight_email_batch", { p_limit: 30 },
      );
      if (claimError) {
        console.error("[Spotlight email] queue claim failed", { code: claimError.code });
        emailDispatch.error = "Queue claim failed";
      } else if (Array.isArray(batch) && batch.length > 0) {
        emailDispatch.claimed = batch.length;
        try {
          const delivery = await fetch(emailDispatchUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-tizibane-email-dispatch-token": emailDispatchToken,
            },
            body: JSON.stringify({ items: batch }),
            signal: AbortSignal.timeout(60_000),
          });
          if (!delivery.ok) throw new Error("Email delivery endpoint returned " + delivery.status);
          const result = await delivery.json() as {
            sent_ids?: string[];
            failed?: Array<{ id: string; error?: string }>;
          };
          const sentIds = new Set(result.sent_ids ?? []);
          const failedById = new Map((result.failed ?? []).map((entry) => [entry.id, entry.error ?? "Delivery failed"]));
          for (const entry of batch as Array<{ id: string }>) {
            const sent = sentIds.has(entry.id);
            const failure = failedById.get(entry.id);
            const { error: completionError } = await supabase.rpc("complete_spotlight_email", {
              p_id: entry.id,
              p_sent: sent,
              p_error: sent ? null : (failure ?? "Email delivery did not confirm success"),
            });
            if (completionError) {
              console.error("[Spotlight email] queue completion failed", { code: completionError.code });
            } else if (sent) {
              emailDispatch.sent = Number(emailDispatch.sent) + 1;
            } else {
              emailDispatch.failed = Number(emailDispatch.failed) + 1;
            }
          }
        } catch (dispatchError) {
          console.error("[Spotlight email] dispatch failed", dispatchError);
          for (const entry of batch as Array<{ id: string }>) {
            await supabase.rpc("complete_spotlight_email", {
              p_id: entry.id,
              p_sent: false,
              p_error: "Email service temporarily unavailable",
            });
          }
          emailDispatch.failed = batch.length;
        }
      }
    }

    return Response.json({ ok: true, items_checked: items.length, result: data, email_dispatch: emailDispatch });
  } catch (error) {
    console.error("[Spotlight notification sync] sync failed", error);
    return Response.json({ error: "Spotlight sync failed" }, { status: 502 });
  }
});
