"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import {
  notificationSoundKind,
  playNotificationSound,
  unlockNotificationAudio,
  vibrateForNotification,
} from "@/lib/notification-sounds";

type IncomingNotification = { recipient_id?: string; actor_id?: string | null; kind?: string };
type InboxMessageEvent = { payload?: { sender_id?: string } };
type IncomingCall = {
  id: string;
  conversationId: string;
  callType: "audio" | "video";
  callerName: string;
  showOverlay: boolean;
};
type CallParticipantEvent = {
  call_id?: string;
  conversation_id?: string;
  invited_by?: string;
  status?: string;
};

export function NotificationSoundListener() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const [userId, setUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callActionBusy, setCallActionBusy] = useState(false);
  const seenIncomingCallIds = useRef(new Set<string>());

  useEffect(() => {
    // Unlock Web Audio on the first genuine interaction anywhere in TIZIBANE.
    // This is deliberately app-wide: members should not need to visit Settings
    // or press a preview button before an incoming call can ring.
    const unlock = () => { void unlockNotificationAudio(); };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // The root layout survives login/logout navigation. Follow auth changes so
  // the global listener starts and stops with the signed-in account.
  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    void supabase.auth.getUser().then((result: { data: { user: User | null } }) => {
      if (alive) setUserId(result.data.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUserId(session?.user?.id ?? null);
      setIncomingCall(null);
      seenIncomingCallIds.current.clear();
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setIncomingCall(null);
      return;
    }
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let stopped = false;

    const receiveIncomingCall = async (row: CallParticipantEvent): Promise<boolean> => {
      if (stopped || row.status !== "invited" || !row.call_id || !row.conversation_id || !row.invited_by || row.invited_by === userId) return false;
      if (seenIncomingCallIds.current.has(row.call_id)) return true;
      seenIncomingCallIds.current.add(row.call_id);
      const { data: call } = await supabase.from("call_sessions")
        .select("id,conversation_id,started_by,status,call_type")
        .eq("id", row.call_id)
        .maybeSingle();
      if (stopped || !call || call.status !== "ringing" || call.started_by !== row.invited_by) {
        seenIncomingCallIds.current.delete(row.call_id);
        return false;
      }
      const { data: profile } = await supabase.from("profiles")
        .select("display_name").eq("id", row.invited_by).maybeSingle();
      if (stopped) {
        seenIncomingCallIds.current.delete(row.call_id);
        return false;
      }
      const currentConversationId = typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("conversation");
      const alreadyInConversation = pathnameRef.current.startsWith("/home/messages")
        && currentConversationId === call.conversation_id;
      setIncomingCall({
        id: call.id,
        conversationId: call.conversation_id,
        callType: call.call_type === "video" ? "video" : "audio",
        callerName: profile?.display_name || "A TIZIBANE member",
        showOverlay: !alreadyInConversation,
      });
      return true;
    };

    const connect = async () => {
      // Private Realtime topics need the current Auth JWT set explicitly.
      await supabase.realtime.setAuth();
      if (stopped) return;
      const { data: mutedRows } = await supabase.from("member_preferences")
        .select("member_id").eq("owner_id", userId).eq("muted", true);
      const mutedActorIds = new Set((mutedRows ?? []).map((row: { member_id: string }) => row.member_id));
      if (stopped) return;

      channel = supabase.channel("inbox:" + userId, { config: { private: true } });
      channel
        .on("broadcast", { event: "message" }, (event: InboxMessageEvent) => {
          const senderId = event.payload?.sender_id;
          if (!senderId || !mutedActorIds.has(senderId)) {
            playNotificationSound("message", false, 6);
            vibrateForNotification(32);
          }
          if (pathnameRef.current.startsWith("/home/messages")) router.refresh();
        })
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "recipient_id=eq." + userId,
        }, (payload: { new: IncomingNotification }) => {
          const notification = payload.new;
          if (!notification || notification.recipient_id !== userId) return;
          if (notification.kind === "message") return;
          if (notification.actor_id && mutedActorIds.has(notification.actor_id)) return;
          playNotificationSound(notificationSoundKind(notification.kind ?? ""), false, 6);
          vibrateForNotification([45, 65, 45, 65, 45, 65]);
          if (pathnameRef.current === "/home/notifications") router.refresh();
        })
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "call_participants",
          filter: "user_id=eq." + userId,
        }, (payload: { eventType?: string; new: CallParticipantEvent & { user_id?: string } }) => {
          if (payload.new.user_id === userId && payload.new.status !== "invited") {
            setIncomingCall((current) => current?.id === payload.new.call_id ? null : current);
            return;
          }
          if (payload.eventType === "INSERT") void receiveIncomingCall(payload.new);
        })
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "call_sessions",
        }, (payload: { new: { id?: string; status?: string } }) => {
          if (payload.new.status !== "ringing") {
            setIncomingCall((current) => current?.id === payload.new.id ? null : current);
          }
        })
        .subscribe();

      // Recover a ringing invite after a refresh or a brief network reconnect.
      const { data: pendingInvites } = await supabase.from("call_participants")
        .select("call_id,conversation_id,invited_by,status,created_at")
        .eq("user_id", userId)
        .eq("status", "invited")
        .neq("invited_by", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      if (!stopped && pendingInvites?.length) {
        for (const invite of pendingInvites) {
          const accepted = await receiveIncomingCall(invite);
          if (stopped || accepted) return;
        }
      }
    };

    void connect();
    return () => {
      stopped = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  // Calls keep ringing while the invite remains pending, including when the
  // recipient is already viewing the conversation. Any resolution stops this loop.
  useEffect(() => {
    if (!incomingCall) return;
    const kind = incomingCall.callType === "video" ? "video_call" : "voice_call";
    playNotificationSound(kind);
    vibrateForNotification([70, 90, 70]);
    const interval = window.setInterval(() => {
      playNotificationSound(kind);
      vibrateForNotification([70, 90, 70]);
    }, 2400);
    return () => window.clearInterval(interval);
  }, [incomingCall?.id, incomingCall?.callType]);

  const openIncomingCall = () => {
    if (!incomingCall) return;
    const destination = "/home/messages?conversation=" + encodeURIComponent(incomingCall.conversationId) + "&answerCall=" + encodeURIComponent(incomingCall.id);
    setIncomingCall(null);
    router.push(destination);
  };

  const declineIncomingCall = async () => {
    if (!incomingCall || callActionBusy) return;
    setCallActionBusy(true);
    try {
      const response = await fetch("/api/calls/" + incomingCall.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      if (response.ok) setIncomingCall(null);
    } finally {
      setCallActionBusy(false);
    }
  };

  return (
    <>
      {incomingCall?.showOverlay && (
        <aside
          role="alertdialog"
          aria-label="Incoming call"
          aria-live="assertive"
          style={{
            position: "fixed", zIndex: 120, right: 18, bottom: 18,
            width: "min(390px, calc(100vw - 36px))", padding: 19,
            borderRadius: 20, border: "1px solid rgba(222,180,245,.55)",
            background: "linear-gradient(145deg,#321b43,#171020)",
            color: "#fff", boxShadow: "0 22px 70px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(221,183,244,.16)", fontSize: 21 }}>
              {incomingCall.callType === "video" ? "▣" : "☎"}
            </span>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 15 }}>Incoming {incomingCall.callType} call</strong>
              <span style={{ display: "block", marginTop: 3, color: "rgba(255,255,255,.76)", fontSize: 13 }}>{incomingCall.callerName} is calling you</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
            <button type="button" onClick={openIncomingCall} style={{ flex: 1, border: 0, borderRadius: 999, padding: "11px 14px", color: "#24122e", background: "#f0d8ff", fontWeight: 750, cursor: "pointer" }}>
              Answer call
            </button>
            <button type="button" onClick={() => void declineIncomingCall()} disabled={callActionBusy} style={{ border: "1px solid rgba(255,255,255,.3)", borderRadius: 999, padding: "11px 15px", color: "#fff", background: "rgba(255,255,255,.08)", fontWeight: 650, cursor: callActionBusy ? "wait" : "pointer" }}>
              {callActionBusy ? "Please wait…" : "Decline"}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
