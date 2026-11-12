import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Apply the current signed-in JWT to Realtime before joining channels.
 * Refresh near-expiry sessions explicitly so a stale token cannot silently
 * poison private-channel authorization after a long-lived browser tab.
 */
export async function setRealtimeAuth(supabase: SupabaseClient, topic: string) {
  const initial = await supabase.auth.getSession();
  if (initial.error) throw initial.error;
  let session = initial.data.session;
  if (!session?.access_token) throw new Error("No authenticated session is available for Realtime.");

  if (session.expires_at && session.expires_at * 1000 <= Date.now() + 60_000) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    session = refreshed.data.session;
    if (!session?.access_token) throw new Error("The Realtime session could not be refreshed.");
  }

  await supabase.realtime.setAuth(session.access_token);
  return { userId: session.user.id, expiresAt: session.expires_at ?? null, topic };
}

/** Log channel failures without ever logging access tokens or message payloads. */
export function reportRealtimeStatus(topic: string, status: string, error?: unknown) {
  if (status !== "CHANNEL_ERROR" && status !== "TIMED_OUT") return;
  const detail = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : error == null
        ? "No additional error detail was supplied by Realtime."
        : JSON.stringify(error);
  console.error("[TIZIBANE Realtime] subscription failed", { topic, status, detail });
}
