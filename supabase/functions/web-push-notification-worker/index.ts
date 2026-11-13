import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { send, type Subscription } from "@daaku/webpush";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const rawKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
const secretKeys = rawKeys ? JSON.parse(rawKeys) as Record<string, string> : {};
const SERVICE_ROLE_KEY = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PRIVATE_VAPID = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");
const SUBSCRIBER = "mailto:samvolume1@gmail.com";

type QueueEntry = {
  id: string;
  notification_id: string | null;
  recipient_id: string;
  actor_id: string | null;
  kind: string;
  metadata: Record<string, unknown> | null;
  attempts: number;
};
type StoredSubscription = {
  id: string;
  endpoint: string;
  subscription: Subscription;
};

function cleanName(value: unknown) {
  if (typeof value !== "string") return "A TIZIBANE member";
  const name = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 60);
  return name || "A TIZIBANE member";
}

function notificationText(kind: string, actor: string, metadata: Record<string, unknown> | null) {
  switch (kind) {
    case "friend_request": return actor + " sent you a friend request.";
    case "friend_accepted": return actor + " accepted your friend request.";
    case "friend_declined": return "There is an update to your friend request.";
    case "follow": return actor + " started following you.";
    case "comment": return actor + " commented on your post.";
    case "reaction": return actor + " reacted to your post.";
    case "message": return "You have a new private message. Open TIZIBANE to read it.";
    case "group": return "There is a new update in one of your TIZIBANE groups.";
    case "group_invite": return "You have been invited to join a TIZIBANE group.";
    case "group_join_request": return actor + " requested to join a group you manage.";
    case "group_join_approved": return "Your request to join a TIZIBANE group was approved.";
    case "group_join_declined": return "There is an update to your group request.";
    case "event": return "There is a new community event update.";
    case "event_attendance": return actor + " responded to your community event.";
    case "business_ad":
    case "premium_update": return "A new Premium business update is available in TIZIBANE.";
    case "premium_ad": {
      const productName = typeof metadata?.product_name === "string"
        ? metadata.product_name.replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 90)
        : "";
      return productName ? "New Premium listing: " + productName + "." : "A new Premium listing is available in TIZIBANE.";
    }
    case "trending_post": return "A community post is receiving attention on TIZIBANE.";
    default: return "You have a new community update on TIZIBANE.";
  }
}

function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.port === "" || url.port === "443") && url.username === "" && url.password === "" && (
      url.hostname === "fcm.googleapis.com"
      || url.hostname === "updates.push.services.mozilla.com"
      || url.hostname === "web.push.apple.com"
      || url.hostname.endsWith(".notify.windows.com")
    );
  } catch {
    return false;
  }
}

function permanentPushFailure(error: unknown) {
  return Boolean(error && typeof error === "object" && "permanent" in error && (error as { permanent?: unknown }).permanent === true);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!SERVICE_ROLE_KEY || !PRIVATE_VAPID) {
    console.error("[TIZIBANE web push] Required server configuration is missing.");
    return Response.json({ error: "Push service is not configured." }, { status: 503 });
  }

  const token = request.headers.get("x-tizibane-cron-token");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authorized, error: authError } = await supabase.rpc("validate_spotlight_cron_token", { p_token: token });
  if (authError || authorized !== true) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: batch, error: claimError } = await supabase.rpc("claim_web_push_batch", {
    p_limit: 30,
    p_token: token,
  });
  if (claimError) {
    console.error("[TIZIBANE web push] Queue claim failed", { code: claimError.code });
    return Response.json({ error: "Queue claim failed." }, { status: 500 });
  }

  const entries = Array.isArray(batch) ? batch as QueueEntry[] : [];
  let sent = 0;
  let retried = 0;
  let failed = 0;
  const vapid = JSON.parse(PRIVATE_VAPID) as JsonWebKey;

  for (const entry of entries) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("web_push_subscriptions")
      .select("id,endpoint,subscription")
      .eq("user_id", entry.recipient_id);

    if (subscriptionError) {
      await supabase.rpc("complete_web_push_delivery", {
        p_id: entry.id, p_sent: false, p_error: "Device subscriptions could not be loaded.", p_token: token,
      });
      retried++;
      continue;
    }

    const activeSubscriptions = (subscriptions ?? []) as StoredSubscription[];
    if (activeSubscriptions.length === 0) {
      await supabase.rpc("complete_web_push_delivery", {
        p_id: entry.id, p_sent: true, p_error: null, p_token: token,
      });
      sent++;
      continue;
    }

    let transientFailures = 0;
    let actorName = cleanName(entry.metadata?.actor_name);
    if (actorName === "A TIZIBANE member" && entry.actor_id) {
      const { data: actorProfile } = await supabase.from("profiles").select("display_name").eq("id", entry.actor_id).maybeSingle();
      actorName = cleanName(actorProfile?.display_name);
    }
    for (const stored of activeSubscriptions) {
      if (!allowedPushEndpoint(stored.endpoint) || stored.subscription.endpoint !== stored.endpoint) {
        await supabase.from("web_push_subscriptions").delete().eq("id", stored.id);
        continue;
      }
      try {
        const pushEventId = entry.notification_id ?? entry.id;
        await send(stored.subscription, JSON.stringify({
          title: "TIZIBANE",
          body: notificationText(entry.kind, actorName, entry.metadata),
          url: entry.kind === "premium_ad" ? "/home/premium" : "/home/notifications",
          tag: "tz-" + pushEventId.replace(/-/g, "").slice(0, 24),
        }), {
          vapid,
          subscriber: SUBSCRIBER,
          ttl: 3600,
          urgency: "normal",
          topic: pushEventId.replace(/-/g, "").slice(0, 32),
        });
      } catch (error) {
        if (permanentPushFailure(error)) {
          await supabase.from("web_push_subscriptions").delete().eq("id", stored.id);
        } else {
          transientFailures++;
          console.error("[TIZIBANE web push] Temporary delivery failure", {
            subscription_id: stored.id,
            status: error && typeof error === "object" && "statusCode" in error ? (error as { statusCode?: unknown }).statusCode : "unknown",
          });
        }
      }
    }

    const success = transientFailures === 0;
    const { error: completionError } = await supabase.rpc("complete_web_push_delivery", {
      p_id: entry.id,
      p_sent: success,
      p_error: success ? null : "One or more push services temporarily rejected delivery.",
      p_token: token,
    });
    if (completionError) {
      console.error("[TIZIBANE web push] Queue completion failed", { queue_id: entry.id, code: completionError.code });
      failed++;
    } else if (success) {
      sent++;
    } else {
      retried++;
    }
  }

  return Response.json({ ok: true, claimed: entries.length, sent, retried, failed });
});
