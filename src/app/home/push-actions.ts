"use server";

import { createClient } from "@/lib/supabase/server";

type PushSubscriptionInput = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function validSubscription(value: unknown): value is PushSubscriptionInput {
  if (!value || typeof value !== "object") return false;
  const subscription = value as PushSubscriptionInput;
  if (typeof subscription.endpoint !== "string" || subscription.endpoint.length > 2048) return false;
  if (!subscription.endpoint.startsWith("https://")) return false;
  if (!subscription.keys || typeof subscription.keys.p256dh !== "string" || typeof subscription.keys.auth !== "string") return false;
  return subscription.keys.p256dh.length >= 32 && subscription.keys.p256dh.length <= 256
    && subscription.keys.auth.length >= 16 && subscription.keys.auth.length <= 256;
}

export async function saveWebPushSubscription(value: unknown) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again before enabling notifications." };
  if (!validSubscription(value)) return { ok: false, message: "This device did not provide a valid push subscription." };

  const subscription = {
    endpoint: value.endpoint,
    keys: {
      p256dh: value.keys!.p256dh as string,
      auth: value.keys!.auth as string,
    },
  };

  const { error } = await supabase.from("web_push_subscriptions").upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    subscription,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,endpoint" });

  if (error) {
    console.error("[TIZIBANE push] subscription save failed", { code: error.code });
    return { ok: false, message: "We could not save this device yet. Please try again." };
  }
  return { ok: true, message: "This device is ready to receive TIZIBANE notifications." };
}

export async function removeWebPushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again before changing this setting." };
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2048) {
    return { ok: false, message: "This device subscription is not valid." };
  }

  const { error } = await supabase.from("web_push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("[TIZIBANE push] subscription removal failed", { code: error.code });
    return { ok: false, message: "We could not update this device yet. Please try again." };
  }
  return { ok: true, message: "Push notifications are switched off on this device." };
}
