import { CommunityNavigation } from "@/components/community-navigation";
import { InboxLiveRefresh } from "@/components/inbox-live-refresh";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Conversation = { id: string; created_at: string };
type Member = { conversation_id: string; user_id: string };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type Profile = { id: string; display_name: string; handle: string | null; initials: string; avatar_color: string; avatar_path: string | null };
type UnreadCount = { conversation_id: string; unread_count: number };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myRows, error: memberError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  const ids = (myRows ?? []).map((member) => member.conversation_id);
  let conversations: Conversation[] = [];
  let members: Member[] = [];
  let messages: Message[] = [];
  let unreadRows: UnreadCount[] = [];

  if (ids.length) {
    const [conversationResult, memberResult, messageResult, unreadResult] = await Promise.all([
      supabase.from("conversations").select("id,created_at").eq("is_group", false).in("id", ids),
      supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids).neq("user_id", user.id),
      supabase.from("messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(500),
      supabase.from("conversation_unread_counts").select("conversation_id,unread_count").in("conversation_id", ids),
    ]);
    conversations = (conversationResult.data ?? []) as Conversation[];
    members = (memberResult.data ?? []) as Member[];
    messages = (messageResult.data ?? []) as Message[];
    unreadRows = (unreadResult.data ?? []) as UnreadCount[];
  }

  const otherIds = [...new Set(members.map((member) => member.user_id))];
  let profiles: Profile[] = [];
  if (otherIds.length) {
    const { data } = await supabase.from("profiles").select("id,display_name,handle,initials,avatar_color,avatar_path").in("id", otherIds);
    profiles = (data ?? []) as Profile[];
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const otherByConversation = new Map(members.map((member) => [member.conversation_id, member.user_id]));
  const lastByConversation = new Map<string, Message>();
  for (const message of messages) {
    if (!lastByConversation.has(message.conversation_id)) lastByConversation.set(message.conversation_id, message);
  }
  const unreadByConversation = new Map(unreadRows.map((row) => [row.conversation_id, row.unread_count]));
  conversations.sort((a, b) => {
    const aTime = lastByConversation.get(a.id)?.created_at ?? a.created_at;
    const bTime = lastByConversation.get(b.id)?.created_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const avatarUrls: Record<string, string> = {};
  const avatarPaths = [...new Set(profiles.map((profile) => profile.avatar_path).filter((path): path is string => Boolean(path)))];
  const { data: signedAvatars } = avatarPaths.length
    ? await supabase.storage.from("community-photos").createSignedUrls(avatarPaths, 3600)
    : { data: [] };
  const avatarUrlByPath = new Map((signedAvatars ?? []).map((item) => [item.path, item.signedUrl]));
  for (const profile of profiles) {
    const url = profile.avatar_path ? avatarUrlByPath.get(profile.avatar_path) : null;
    if (url) avatarUrls[profile.id] = url;
  }

  return (
    <main className="app-layout">
      <CommunityNavigation active="messages" />
      <section className="app-main">
        <header className="topbar">
          <Link href="/home" className="back-link">← Community home</Link>
          <span className="muted">PRIVATE MESSAGES</span>
        </header>
        <div className="app-content">
          <InboxLiveRefresh userId={user.id} />
          <section className="welcome">
            <span className="eyebrow">One-to-one conversations</span>
            <h1>Your conversations.</h1>
            <p>Private messages with members you have connected with as friends.</p>
          </section>
          {params.error && <div className="notice" role="alert">{params.error}</div>}
          {memberError ? (
            <div className="module"><h3>Messages are temporarily unavailable</h3><p>Please refresh in a moment.</p></div>
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-symbol">✉</div>
              <h3>Your inbox is ready.</h3>
              <p>Visit People, connect with a member and choose Message to start a private conversation.</p>
              <Link href="/home/people" className="btn btn-primary">Find people</Link>
            </div>
          ) : (
            <div className="conversation-list">
              {conversations.map((conversation) => {
                const otherId = otherByConversation.get(conversation.id);
                const profile = otherId ? profileById.get(otherId) : undefined;
                const last = lastByConversation.get(conversation.id);
                const unread = unreadByConversation.get(conversation.id) ?? 0;
                const preview = last ? (last.sender_id === user.id ? "You: " : "") + last.body : "No messages yet.";
                return (
                  <Link href={"/home/messages/" + conversation.id} className="conversation-card" key={conversation.id}>
                    <div className="person-identity">
                      {otherId && avatarUrls[otherId]
                        ? <img src={avatarUrls[otherId]} alt="" className="person-avatar" loading="lazy" decoding="async" />
                        : <div className="person-avatar person-avatar-fallback">{profile?.initials || "TZ"}</div>}
                      <div className="conversation-card-copy">
                        <strong>{profile?.display_name || "TIZIBANE member"}</strong>
                        <span>{profile?.handle ? "@" + profile.handle : "Private conversation"}</span>
                        <p>{preview}</p>
                      </div>
                    </div>
                    <div className="conversation-card-meta">
                      <span className="conversation-time">{last ? new Date(last.created_at).toLocaleDateString("en-ZM", { month: "short", day: "numeric" }) : new Date(conversation.created_at).toLocaleDateString("en-ZM", { month: "short", day: "numeric" })}</span>
                      {unread > 0 && <span className="conversation-unread" aria-label={unread + " unread messages"}>{unread > 99 ? "99+" : unread}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
