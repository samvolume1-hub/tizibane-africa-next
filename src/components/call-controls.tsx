"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";


type CallInfo = {
  callId: string;
  roomName: string;
  callType: "audio" | "video";
  appId: string;
  token: string;
  isInitiator: boolean;
};
type CallSessionRow = {
  id: string;
  started_by: string;
  room_name: string;
  call_type: "audio" | "video";
  status: string;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      addListener: (event: string, callback: (payload?: unknown) => void) => void;
      dispose: () => void;
    };
  }
}

export function CallControls({ conversationId, userId }: { conversationId: string; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [incoming, setIncoming] = useState<CallSessionRow | null>(null);
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);
  const [busy, setBusy] = useState<"audio" | "video" | "join" | null>(null);
  const [error, setError] = useState("");
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);
  const activeCallRef = useRef<CallInfo | null>(null);
  const autoAnsweredCallRef = useRef<string | null>(null);

  const openCall = useCallback(async (info: CallInfo) => {
    activeCallRef.current = info;
    setActiveCall(info);
    setIncoming(null);
  }, []);

  const joinCall = useCallback(async (callId: string) => {
    setBusy("join");
    setError("");
    try {
      const response = await fetch("/api/calls/" + callId + "/token", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to join the call.");
      await openCall(result as CallInfo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to join the call.");
    } finally {
      setBusy(null);
    }
  }, [openCall]);

  useEffect(() => {
    if (!incoming || busy || activeCall || typeof window === "undefined") return;
    const requestedCallId = new URLSearchParams(window.location.search).get("answerCall");
    if (requestedCallId !== incoming.id || autoAnsweredCallRef.current === incoming.id) return;
    autoAnsweredCallRef.current = incoming.id;
    void joinCall(incoming.id);
  }, [incoming?.id, busy, activeCall, joinCall]);

  const startCall = async (callType: "audio" | "video") => {
    if (busy) return;
    setBusy(callType);
    setError("");
    try {
      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, callType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to start the call.");
      await openCall(result as CallInfo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start the call.");
    } finally {
      setBusy(null);
    }
  };

  const closeCall = useCallback(async (action: "leave" | "end" = "leave") => {
    const callId = activeCall?.callId;
    const finalAction = action === "leave" && activeCall?.isInitiator ? "end" : action;
    apiRef.current?.dispose();
    apiRef.current = null;
    activeCallRef.current = null;
    setActiveCall(null);
    if (callId) {
      await fetch("/api/calls/" + callId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: finalAction }),
      }).catch(() => undefined);
    }
  }, [activeCall]);

  useEffect(() => {
    let alive = true;
    const channel = supabase.channel("conversation-calls:" + conversationId, { config: { private: true } });
    const receive = (row: CallSessionRow) => {
      if (row.started_by !== userId && row.status === "ringing") setIncoming(row);
      if (row.status === "ended" || row.status === "declined" || row.status === "missed") {
        setIncoming((current) => current?.id === row.id ? null : current);
      }
      if (row.status === "ended" && activeCallRef.current?.callId === row.id) {
        apiRef.current?.dispose();
        apiRef.current = null;
        activeCallRef.current = null;
        setActiveCall(null);
        void fetch("/api/calls/" + row.id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
        }).catch(() => undefined);
      }
    };
    channel.on("postgres_changes", {
      event: "*", schema: "public", table: "call_sessions", filter: "conversation_id=eq." + conversationId,
    }, (payload: { new: CallSessionRow }) => receive(payload.new));
    channel.subscribe();
    void supabase.from("call_sessions")
      .select("id,started_by,room_name,call_type,status")
      .eq("conversation_id", conversationId)
      .eq("status", "ringing")
      .neq("started_by", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then((result: { data: CallSessionRow[] | null }) => {
        if (alive && result.data?.[0]) setIncoming(result.data[0]);
      });
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, userId]);

  useEffect(() => {
    if (!activeCall || !mountRef.current) return;
    let cancelled = false;
    const appId = activeCall.appId;
    const scriptUrl = "https://8x8.vc/" + appId + "/external_api.js";

    const mountMeeting = () => {
      if (cancelled || !mountRef.current || !window.JitsiMeetExternalAPI) return;
      const api = new window.JitsiMeetExternalAPI("8x8.vc", {
        roomName: appId + "/" + activeCall.roomName,
        parentNode: mountRef.current,
        jwt: activeCall.token,
        width: "100%",
        height: "100%",
        configOverwrite: {
          prejoinPageEnabled: true,
          startWithAudioMuted: false,
          startWithVideoMuted: activeCall.callType === "audio",
          disableDeepLinking: true,
          enableWelcomePage: false,
          toolbarButtons: ["microphone", "camera", "desktop", "hangup", "chat", "tileview", "fullscreen"],
        },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, SHOW_BRAND_WATERMARK: false },
      });
      apiRef.current = api;
      api.addListener("readyToClose", () => { void closeCall("leave"); });
    };

    if (window.JitsiMeetExternalAPI) {
      mountMeeting();
    } else {
      let script = document.querySelector<HTMLScriptElement>('script[src="' + scriptUrl + '"]');
      if (!script) {
        script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener("load", mountMeeting, { once: true });
      script.addEventListener("error", () => {
        if (!cancelled) setError("The secure calling service could not be loaded. Please check your connection.");
      }, { once: true });
    }
    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [activeCall, closeCall]);

  const declineCall = async () => {
    if (!incoming) return;
    await fetch("/api/calls/" + incoming.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    setIncoming(null);
  };

  return (
    <>
      <div className="message-call-actions" aria-label="Calling options">
        <button type="button" className="message-call-button" onClick={() => void startCall("audio")} disabled={Boolean(busy)} aria-label="Start voice call" title="Start a secure voice call">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8 9.1 3.3l2 4.7-2 1.5a15 15 0 0 0 5.4 5.4l1.5-2 4.7 2-.5 2.5a2 2 0 0 1-2 1.6A15.5 15.5 0 0 1 4.9 5.8a2 2 0 0 1 1.7-2Z" /></svg>
          <span>{busy === "audio" ? "Calling…" : "Call"}</span>
        </button>
        <button type="button" className="message-call-button" onClick={() => void startCall("video")} disabled={Boolean(busy)} aria-label="Start video call" title="Start a secure video call">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3" /></svg>
          <span>{busy === "video" ? "Calling…" : "Video"}</span>
        </button>
      </div>
      {error && <p role="alert" style={{ color: "#b42318", fontSize: 12, margin: "8px 0" }}>{error}</p>}
      {incoming && !activeCall && (
        <div role="dialog" aria-label="Incoming call" style={{ position: "fixed", zIndex: 80, right: 20, bottom: 20, width: "min(360px, calc(100vw - 40px))", padding: 18, borderRadius: 18, background: "#21142c", color: "#fff", border: "1px solid #9c6bb5", boxShadow: "0 18px 55px #0008" }}>
          <strong>Incoming {incoming.call_type === "audio" ? "voice" : "video"} call</strong>
          <p style={{ color: "#e7dced", fontSize: 13 }}>A member of this conversation is calling you.</p>
          <div style={{ display: "flex", gap: 9 }}>
            <button type="button" className="btn btn-primary" disabled={Boolean(busy)} onClick={() => void joinCall(incoming.id)}>{busy === "join" ? "Joining…" : "Accept"}</button>
            <button type="button" className="btn" onClick={() => void declineCall()}>Decline</button>
          </div>
        </div>
      )}
      {activeCall && (
        <div role="dialog" aria-modal="true" aria-label={activeCall.callType === "audio" ? "Voice call" : "Video call"} style={{ position: "fixed", inset: 0, zIndex: 100, background: "#08060c", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", color: "#fff", background: "#21142c" }}>
            <strong>TIZIBANE · {activeCall.callType === "audio" ? "Voice call" : "Video call"}</strong>
            <button type="button" className="btn" onClick={() => void closeCall("leave")}>Leave call</button>
          </div>
          <div ref={mountRef} style={{ flex: 1, minHeight: 0 }} />
        </div>
      )}
    </>
  );
}
