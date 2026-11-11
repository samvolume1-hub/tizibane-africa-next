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
        <div className="app-content messages-page">
          <InboxLiveRefresh userId={user.id} />
          <header className="messages-titlebar">
            <div>
              <span className="eyebrow">YOUR PRIVATE SPACE</span>
              <h1>Messaging</h1>
              <p>Conversations with your TIZIBANE connections.</p>
            </div>
            <Link href="/home/people" className="messages-new-button"><span aria-hidden="true">＋</span> New message</Link>
          </header>
          {params.error && <div className="notice" role="alert">{params.error}</div>}
          <section className="messages-workspace" aria-label="Messaging workspace">
            <aside className="messages-sidebar">
              <div className="messages-sidebar-heading"><h2>Chats</h2><span>{conversations.length}</span></div>
              {memberError ? (
                <div className="messages-list-empty"><p>We couldn't load your chats just now.</p><span>Please refresh to try again.</span></div>
              ) : conversations.length === 0 ? (
                <div className="messages-list-empty">
                  <div className="messages-empty-icon" aria-hidden="true">✉</div>
                  <strong>No chats yet</strong>
                  <p>Your conversations will appear here when you message a connection.</p>
                  <Link href="/home/people">Find people to message <span aria-hidden="true">→</span></Link>
                </div>
              ) : (
                <div className="conversation-list">
                  {conversations.map((conversation) => {
                    const otherId = otherByConversation.get(conversation.id);
                    const profile = otherId ? profileById.get(otherId) : undefined;
                    const last = lastByConversation.get(conversation.id);
                    const unread = unreadByConversation.get(conversation.id) ?? 0;
                    const preview = last ? (last.sender_id === user.id ? "You: " : "") + last.body : "Start the conversation";
                    return (
                      <Link href={"/home/messages/" + conversation.id} className="conversation-card" key={conversation.id}>
                        <div className="person-identity">
                          {otherId && avatarUrls[otherId] ? <img src={avatarUrls[otherId]} alt="" className="person-avatar" loading="lazy" decoding="async" /> : <div className="person-avatar person-avatar-fallback">{profile?.initials || "TZ"}</div>}
                          <div className="conversation-card-copy">
                            <strong>{profile?.display_name || "TIZIBANE member"}</strong>
                            <span>{profile?.handle ? "@" + profile.handle : "Connection"}</span>
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
            </aside>
            <section className="messages-chat-placeholder" aria-label="Conversation preview">
              <div className="messages-placeholder-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M8 11.5h32v23H8z" /><path d="m9 13 15 12 15-12" /></svg></div>
              <h2>Your conversations, all in one place.</h2>
              <p>Select a chat to pick up where you left off, or start a new message with one of your connections.</p>
              <Link href="/home/people" className="messages-start-link">Start a conversation</Link>
              <span className="messages-privacy-note"><span aria-hidden="true">🔒</span> Your messages are private</span>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
