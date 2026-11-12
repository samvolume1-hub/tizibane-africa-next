"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  notificationSoundKind,
  playNotificationSound,
  vibrateForNotification,
} from "@/lib/notification-sounds";

type IncomingNotification = { recipient_id?: string; actor_id?: string | null; kind?: string };
type InboxMessageEvent = { payload?: { sender_id?: string } };

export function NotificationSoundListener() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);

  // Keep the active route current without tearing down the private Realtime
  // subscription on every in-app navigation.
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let stopped = false;

    const connect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (stopped || !user) return;

      const { data: mutedRows } = await supabase.from("member_preferences")
        .select("member_id").eq("owner_id", user.id).eq("muted", true);
      const mutedActorIds = new Set((mutedRows ?? []).map((row: { member_id: string }) => row.member_id));
      if (stopped) return;

      channel = supabase.channel("inbox:" + user.id, { config: { private: true } });
      channel
        .on("broadcast", { event: "message" }, (event: InboxMessageEvent) => {
          const senderId = event.payload?.sender_id;
          if (!senderId || !mutedActorIds.has(senderId)) {
            playNotificationSound("message");
            vibrateForNotification(32);
          }
          if (pathnameRef.current.startsWith("/home/messages")) router.refresh();
        })
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "recipient_id=eq." + user.id,
        }, (payload: { new: IncomingNotification }) => {
          const notification = payload.new;
          if (!notification || notification.recipient_id !== user.id) return;
          // Messages already have a dedicated inbox Broadcast event. Ignoring
          // their notification row prevents a double chime.
          if (notification.kind === "message") return;
          if (notification.actor_id && mutedActorIds.has(notification.actor_id)) return;
          playNotificationSound(notificationSoundKind(notification.kind ?? ""));
          vibrateForNotification(28);
          if (pathnameRef.current === "/home/notifications") router.refresh();
        })
        .subscribe();
    };

    void connect();
    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
