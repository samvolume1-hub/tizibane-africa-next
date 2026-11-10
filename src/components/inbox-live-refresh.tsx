"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export function InboxLiveRefresh({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel("inbox:" + userId, { config: { private: true } })
      .on("broadcast", { event: "message" }, () => router.refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [router, supabase, userId]);

  return null;
}
