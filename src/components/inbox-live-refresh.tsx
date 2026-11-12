"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { setRealtimeAuth, reportRealtimeStatus } from "@/lib/realtime-auth";

/**
 * Inbox refresh fallback uses recipient-filtered Postgres Changes rather than
 * opening a second private inbox broadcast channel.
 */
export function InboxLiveRefresh({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    const topic = "inbox-refresh:" + userId;
    const channel = supabase.channel(topic, { config: { private: false } });
    channel.on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: "recipient_id=eq." + userId,
    }, () => router.refresh());

    void setRealtimeAuth(supabase, topic).then(() => {
      if (alive) channel.subscribe((status: string, error?: Error) => reportRealtimeStatus(topic, status, error));
    }).catch((cause) => {
      if (alive) console.error("[TIZIBANE Realtime] inbox refresh setup failed", {
        topic, detail: cause instanceof Error ? cause.message : String(cause),
      });
    });

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [router, supabase, userId]);

  return null;
}
