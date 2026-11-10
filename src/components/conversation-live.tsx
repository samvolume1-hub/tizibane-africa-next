"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Message = { id: string; sender_id: string; body: string; created_at: string };
type Presence = { user_id?: string };
type MemberUpdate = { user_id: string; last_read_at: string | null };

export function ConversationLive({
  conversationId,
  userId,
  otherUserId,
  otherName,
  initialMessages,
  initialOtherLastReadAt,
}: {
  conversationId: string;
  userId: string;
  otherUserId: string;
  otherName: string;
  initialMessages: Message[];
  initialOtherLastReadAt: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(initialMessages.length === 100);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState(initialOtherLastReadAt);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const keepScrollRef = useRef(false);
  const previousHeightRef = useRef(0);
  const previousScrollTopRef = useRef(0);

  const appendMessage = useCallback((message: Message) => {
    setMessages((current) => current.some((item) => item.id === message.id)
      ? current
      : [...current, message].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
  }, []);

  useEffect(() => {
    const channel = supabase.channel("conversation:" + conversationId, {
      config: { private: true, presence: { key: userId } },
    }) as RealtimeChannel;

    channel.on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: "conversation_id=eq." + conversationId,
    }, (payload: { new: Message }) => {
      const message = payload.new;
      appendMessage(message);
      if (message.sender_id !== userId) {
        const readAt = new Date().toISOString();
        void supabase.from("conversation_members")
          .update({ last_read_at: readAt })
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);
        void supabase.from("notifications")
          .update({ read_at: readAt })
          .eq("recipient_id", userId)
          .eq("kind", "message")
          .eq("subject_id", conversationId)
          .is("read_at", null);
      }
    });

    channel.on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "conversation_members",
      filter: "conversation_id=eq." + conversationId,
    }, (payload: { new: MemberUpdate }) => {
      const member = payload.new;
      if (member.user_id === otherUserId) setOtherLastReadAt(member.last_read_at);
    });

    channel.on("broadcast", { event: "typing" }, (message: { payload: { user_id?: string; is_typing?: boolean } }) => {
      if (message.payload?.user_id !== userId) {
        setIsTyping(Boolean(message.payload?.is_typing));
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        if (message.payload?.is_typing) {
          typingClearRef.current = setTimeout(() => setIsTyping(false), 2200);
        }
      }
    });

    channel.on("presence", { event: "sync" }, () => {
      const presence = channel.presenceState() as Record<string, Presence[]>;
      const online = Object.values(presence).flat().some((entry: Presence) => entry.user_id === otherUserId);
      setIsOnline(online);
    });

    channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });

    channelRef.current = channel;
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [appendMessage, conversationId, otherUserId, supabase, userId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (keepScrollRef.current) {
      container.scrollTop = previousScrollTopRef.current + (container.scrollHeight - previousHeightRef.current);
      keepScrollRef.current = false;
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 900) return;
    lastTypingSentRef.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, is_typing: true },
    });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      void channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId, is_typing: false },
      });
    }, 1400);
  }, [userId]);

  const loadOlder = async () => {
    if (loadingOlder || !hasOlder || messages.length === 0) return;
    setLoadingOlder(true);
    setError("");
    const container = scrollRef.current;
    previousHeightRef.current = container?.scrollHeight ?? 0;
    previousScrollTopRef.current = container?.scrollTop ?? 0;
    keepScrollRef.current = true;
    const oldest = messages[0];
    const { data, error: loadError } = await supabase
      .from("messages")
      .select("id,sender_id,body,created_at")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(50);
    if (loadError) {
      keepScrollRef.current = false;
      setError("Older messages could not be loaded. Please try again.");
    } else {
      const older = ((data ?? []) as Message[]).reverse();
      setMessages((current) => [...older, ...current]);
      setHasOlder((data ?? []).length === 50);
    }
    setLoadingOlder(false);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: userId, body })
      .select("id,sender_id,body,created_at")
      .single();
    if (sendError || !data) {
      setError(sendError?.code === "42501"
        ? "This conversation is no longer available for messaging. Check whether either member has blocked the other."
        : "Your message could not be sent. Please check your connection and try again.");
    } else {
      appendMessage(data as Message);
      setDraft("");
      void channelRef.current?.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId, is_typing: false },
      });
    }
    setSending(false);
  };

  const lastOwnMessage = [...messages].reverse().find((message) => message.sender_id === userId);
  const seen = Boolean(lastOwnMessage && otherLastReadAt && new Date(otherLastReadAt).getTime() >= new Date(lastOwnMessage.created_at).getTime());

  return (
    <section className="message-live-panel">
      <header className="message-chat-toolbar">
        <div className="message-presence-line" aria-live="polite">
          <span className={"message-presence-dot" + (isOnline ? " is-online" : "")} />
          <span>{isTyping ? otherName + " is typing…" : isOnline ? "Online" : "Offline"}</span>
        </div>
        <div className="message-call-actions" aria-label="Calling options">
          <button type="button" className="message-call-button" disabled title="Secure voice calling is being set up" aria-label="Voice call coming soon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.8 9.1 3.3l2 4.7-2 1.5a15 15 0 0 0 5.4 5.4l1.5-2 4.7 2-.5 2.5a2 2 0 0 1-2 1.6A15.5 15.5 0 0 1 4.9 5.8a2 2 0 0 1 1.7-2Z" /></svg>
            <span>Call</span>
          </button>
          <button type="button" className="message-call-button" disabled title="Secure video calling is being set up" aria-label="Video call coming soon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3" /></svg>
            <span>Video</span>
          </button>
        </div>
      </header>
      <div className="message-thread" ref={scrollRef} aria-live="polite" aria-relevant="additions">
        {hasOlder && (
          <button type="button" className="message-load-older" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {messages.length === 0 ? (
          <div className="empty-state message-empty"><div className="empty-symbol">✉</div><h3>Say hello.</h3><p>This is the beginning of your private conversation.</p></div>
        ) : messages.map((message) => (
          <article className={"message-bubble " + (message.sender_id === userId ? "message-own" : "message-theirs")} key={message.id}>
            <p>{message.body}</p>
            <span>{message.sender_id === userId ? "You" : otherName} · {new Date(message.created_at).toLocaleString("en-ZM", { dateStyle: "short", timeStyle: "short" })}</span>
          </article>
        ))}
      </div>
      {seen && <p className="message-seen-status" aria-live="polite">Seen</p>}
      {error && <div className="notice" role="alert">{error}</div>}
      <section className="message-composer">
        <form onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="message-body">Write a message</label>
          <textarea
            id="message-body"
            value={draft}
            onChange={(event) => { setDraft(event.target.value.slice(0, 4000)); sendTyping(); }}
            maxLength={4000}
            rows={3}
            placeholder="Write a private message…"
            required
          />
          <div className="message-composer-footer">
            <span className="field-help">{draft.length}/4000</span>
            <button className="btn btn-primary" type="submit" disabled={!draft.trim() || sending}>
              {sending ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
        <p className="field-help">Private text messages. Keep personal information safe and report anything concerning.</p>
      </section>
    </section>
  );
}
