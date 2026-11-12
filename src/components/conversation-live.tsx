"use client";

import { createClient } from "@/lib/supabase/client";
import { CallControls } from "@/components/call-controls";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { setRealtimeAuth, reportRealtimeStatus } from "@/lib/realtime-auth";

type Message = { id: string; sender_id: string; body: string; created_at: string; edited_at: string | null };
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
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState("");
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
    let alive = true;
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
      table: "messages",
      filter: "conversation_id=eq." + conversationId,
    }, (payload: { new: Message }) => {
      setMessages((current) => current.map((message) => message.id === payload.new.id ? payload.new : message));
    });

    channel.on("postgres_changes", {
      event: "DELETE",
      schema: "public",
      table: "messages",
      filter: "conversation_id=eq." + conversationId,
    }, (payload: { old: { id?: string } }) => {
      if (payload.old?.id) setMessages((current) => current.filter((message) => message.id !== payload.old.id));
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

    // Private conversation topics require the current signed-in member JWT.
    const topic = "conversation:" + conversationId;
    void setRealtimeAuth(supabase, topic).then(() => {
      if (!alive) return;
      channel.subscribe(async (status: string, error?: Error) => {
        reportRealtimeStatus(topic, status, error);
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });
    }).catch((cause) => {
      if (alive) {
        console.error("[TIZIBANE Realtime] conversation subscription setup failed", {
          topic, detail: cause instanceof Error ? cause.message : String(cause),
        });
        setError("Live message updates could not connect. Please refresh to retry.");
      }
    });

    channelRef.current = channel;
    return () => {
      alive = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [appendMessage, conversationId, otherUserId, supabase, userId]);

  useEffect(() => {
    const newestInitialMessage = initialMessages[initialMessages.length - 1];
    if (!newestInitialMessage) return;
    const readAt = newestInitialMessage.created_at;
    void supabase.from("conversation_members")
      .update({ last_read_at: readAt })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);
    void supabase.from("notifications")
      .update({ read_at: readAt })
      .eq("recipient_id", userId)
      .eq("kind", "message")
      .eq("subject_id", conversationId)
      .lte("created_at", readAt)
      .is("read_at", null);
  }, [conversationId, initialMessages, supabase, userId]);

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
      .select("id,sender_id,body,created_at,edited_at")
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
      .select("id,sender_id,body,created_at,edited_at")
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

  const beginEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditDraft(message.body);
    setOpenMessageMenuId(null);
    setActionNotice("");
  };

  const saveEdit = async (message: Message) => {
    const body = editDraft.trim();
    if (!body || body.length > 4000 || savingEdit) return;
    if (body === message.body) {
      setEditingMessageId(null);
      setEditDraft("");
      return;
    }
    setSavingEdit(true);
    setError("");
    setActionNotice("");
    const { data, error: editError } = await supabase
      .from("messages")
      .update({ body })
      .eq("id", message.id)
      .eq("sender_id", userId)
      .select("id,sender_id,body,created_at,edited_at")
      .single();
    if (editError || !data) {
      setError("This message could not be edited. It may have been removed or you may no longer have access to this conversation.");
    } else {
      setMessages((current) => current.map((item) => item.id === message.id ? data as Message : item));
      setEditingMessageId(null);
      setEditDraft("");
      setActionNotice("Message updated.");
    }
    setSavingEdit(false);
  };

  const copyMessage = async (message: Message) => {
    setOpenMessageMenuId(null);
    try {
      await navigator.clipboard.writeText(message.body);
      setActionNotice("Message copied to clipboard.");
    } catch {
      setError("Could not copy this message. Your browser may not allow clipboard access.");
    }
  };

  const deleteMessage = async (message: Message) => {
    setOpenMessageMenuId(null);
    if (!window.confirm("Delete this message for everyone in this conversation? This cannot be undone.")) return;
    setDeletingMessageId(message.id);
    setError("");
    setActionNotice("");
    const { data, error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", message.id)
      .eq("sender_id", userId)
      .select("id")
      .single();
    if (deleteError || !data) {
      setError("This message could not be deleted. It may have already been removed or you may no longer have access.");
    } else {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setActionNotice("Message deleted.");
    }
    setDeletingMessageId(null);
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
        <CallControls conversationId={conversationId} userId={userId} />
      </header>
      <div className="message-thread" ref={scrollRef} aria-live="polite" aria-relevant="additions">
        {hasOlder && (
          <button type="button" className="message-load-older" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? "Loading…" : "Load earlier messages"}
          </button>
        )}
        {messages.length === 0 ? (
          <div className="empty-state message-empty"><div className="empty-symbol">✉</div><h3>Say hello.</h3><p>This is the beginning of your private conversation.</p></div>
        ) : messages.map((message) => {
          const isOwnMessage = message.sender_id === userId;
          const isEditing = editingMessageId === message.id;
          return (
            <article className={"message-bubble " + (isOwnMessage ? "message-own" : "message-theirs")} key={message.id}>
              {isEditing ? (
                <div className="message-edit-form">
                  <textarea
                    aria-label="Edit message"
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value.slice(0, 4000))}
                    maxLength={4000}
                    rows={Math.min(6, Math.max(2, editDraft.split("\n").length))}
                    autoFocus
                  />
                  <div className="message-edit-actions">
                    <span>{editDraft.length}/4000</span>
                    <button type="button" onClick={() => { setEditingMessageId(null); setEditDraft(""); }} disabled={savingEdit}>Cancel</button>
                    <button type="button" onClick={() => void saveEdit(message)} disabled={!editDraft.trim() || savingEdit}>{savingEdit ? "Saving…" : "Save"}</button>
                  </div>
                </div>
              ) : <p>{message.body}</p>}
              <div className="message-bubble-meta">
                <span>{isOwnMessage ? "You" : otherName} · {new Date(message.created_at).toLocaleString("en-ZM", { dateStyle: "short", timeStyle: "short" })}{message.edited_at ? " · Edited" : ""}</span>
                {isOwnMessage && !isEditing && (
                  <div className="message-action-wrap">
                    <button type="button" className="message-action-trigger" aria-label="Message actions" aria-haspopup="menu" aria-expanded={openMessageMenuId === message.id}
                      onClick={() => setOpenMessageMenuId((current) => current === message.id ? null : message.id)}
                      disabled={deletingMessageId === message.id}>
                      <span aria-hidden="true">⋯</span>
                    </button>
                    {openMessageMenuId === message.id && (
                      <div className="message-action-menu" role="menu">
                        <button type="button" role="menuitem" onClick={() => beginEdit(message)}>Edit</button>
                        <button type="button" role="menuitem" onClick={() => void copyMessage(message)}>Copy</button>
                        <button type="button" role="menuitem" className="is-destructive" onClick={() => void deleteMessage(message)}>Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {seen && <p className="message-seen-status" aria-live="polite">Seen</p>}
      {error && <div className="notice" role="alert">{error}</div>}
      {actionNotice && <p className="message-action-status" role="status">{actionNotice}</p>}
      <section className="message-composer">
        <form onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="message-body">Write a message</label>
          <textarea
            id="message-body"
            value={draft}
            onChange={(event) => { setDraft(event.target.value.slice(0, 4000)); sendTyping(); }}
            maxLength={4000}
            spellCheck={true}
            autoCorrect="off"
            autoCapitalize="sentences"
            lang="en"
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
        <p className="field-help">Spelling suggestions are available from your browser’s spelling menu. Choose a suggestion when you want one — TIZIBANE never silently autocorrects your words. Keep personal information safe and report anything concerning.</p>
      </section>
    </section>
  );
}
