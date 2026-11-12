"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setRealtimeAuth, reportRealtimeStatus } from "@/lib/realtime-auth";

/**
 * Lightweight global notification indicator.
 * Realtime events refresh the authoritative unread count; CSS handles the
 * reminder animation without timers, polling, images, or extra dependencies.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openedSinceNew, setOpenedSinceNew] = useState(false);
  const latestUnreadAt = useRef<string | null>(null);
  const seenStorageKey = "tizibane-notification-bell-seen:" + userId;

  const refreshUnreadCount = useCallback(async () => {
    const { data, count, error } = await supabase
      .from("notifications")
      .select("created_at", { count: "exact" })
      .eq("recipient_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || typeof count !== "number") return;
    setUnreadCount(count);
    latestUnreadAt.current = data?.created_at ?? null;
    const lastSeenAt = window.localStorage.getItem(seenStorageKey);
    setOpenedSinceNew(Boolean(
      count > 0 && latestUnreadAt.current && lastSeenAt && latestUnreadAt.current <= lastSeenAt
    ));
  }, [seenStorageKey, supabase, userId]);

  useEffect(() => {
    let alive = true;
    const topic = "notification-bell:" + userId;
    const channel = supabase.channel(topic, { config: { private: false } });

    channel.on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: "recipient_id=eq." + userId,
    }, (payload: { eventType: string }) => {
      if (!alive) return;
      if (payload.eventType === "INSERT") {
        window.localStorage.removeItem(seenStorageKey);
        setOpenedSinceNew(false);
      }
      void refreshUnreadCount();
    });

    void refreshUnreadCount();
    void setRealtimeAuth(supabase, topic).then(() => {
      if (alive) channel.subscribe((status: string, error?: Error) => reportRealtimeStatus(topic, status, error));
    }).catch((cause) => {
      if (alive) console.error("[TIZIBANE Realtime] notification bell setup failed", {
        topic,
        detail: cause instanceof Error ? cause.message : String(cause),
      });
    });

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [refreshUnreadCount, seenStorageKey, supabase, userId]);

  const isReminding = unreadCount > 0 && !openedSinceNew;

  return (
    <Link
      href="/home/notifications"
      className={`tizibane-notification-bell${isReminding ? " is-reminding" : ""}`}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      title="Notifications"
      onClick={() => {
        setOpenedSinceNew(true);
        if (latestUnreadAt.current) window.localStorage.setItem(seenStorageKey, latestUnreadAt.current);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      {unreadCount > 0 && (
        <span className="tizibane-notification-count" aria-live="polite">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      <span className="sr-only">{unreadCount} unread notifications</span>
    </Link>
  );
}
