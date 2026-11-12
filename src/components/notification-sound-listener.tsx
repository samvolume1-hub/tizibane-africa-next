"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  notificationSoundKind,
  playNotificationSound,
  vibrateForNotification,
} from "@/lib/notification-sounds";

type IncomingNotification = { recipient_id?: string; kind?: string };

export function NotificationSoundListener() {
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let stopped = false;

    const connect = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (stopped || !user) return;

      channel = supabase.channel("inbox:" + user.id, { config: { private: true } });
      channel
        .on("broadcast", { event: "message" }, () => {
          playNotificationSound("message");
          vibrateForNotification(32);
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
          playNotificationSound(notificationSoundKind(notification.kind ?? ""));
          vibrateForNotification(28);
        })
        .subscribe();
    };

    void connect();
    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
