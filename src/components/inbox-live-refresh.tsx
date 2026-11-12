"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export function InboxLiveRefresh({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.realtime.setAuth().then(() => {
      if (!alive) return;
      channel = supabase
        .channel("inbox:" + userId, { config: { private: true } })
        .on("broadcast", { event: "message" }, () => router.refresh())
        .subscribe();
    }).catch(() => {
      // The primary app-wide listener reports its own connection state.
    });
    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router, supabase, userId]);

  return null;
}
