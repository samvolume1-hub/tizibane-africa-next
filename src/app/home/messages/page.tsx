import { CommunityNavigation } from "@/components/community-navigation";
import { ConversationLive } from "@/components/conversation-live";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Conversation = { id: string; created_at: string };
type Member = { conversation_id: string; user_id: string };
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type Profile = { id: string; display_name: string; handle: string | null; initials: string; avatar_color: string; avatar_path: string | null };
type UnreadCount = { conversation_id: string; unread_count: number };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ error?: string; conversation?: string }> }) {
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

  const requestedId = params.conversation;
  const activeConversation = conversations.find((item) => item.id === requestedId) ?? conversations[0] ?? null;
  const activeOtherId = activeConversation ? otherByConversation.get(activeConversation.id) : undefined;
  const activeProfile = activeOtherId ? profileById.get(activeOtherId) : null;
  let activeMessages: Message[] = [];
  let activeOtherLastReadAt: string | null = null;
  let activeMessageError = false;
  if (activeConversation && activeOtherId) {
    const [memberResult, messageResult] = await Promise.all([
      supabase.from("conversation_members").select("user_id,last_read_at").eq("conversation_id", activeConversation.id),
      supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id", activeConversation.id).order("created_at", { ascending: false }).limit(100),
    ]);
    activeOtherLastReadAt = (memberResult.data ?? []).find((member) => member.user_id === activeOtherId)?.last_read_at ?? null;
    activeMessages = ((messageResult.data ?? []) as Message[]).reverse();
    activeMessageError = Boolean(messageResult.error);
  }
  const activeName = activeProfile?.display_name || "TIZIBANE member";
  const activeAvatar = activeProfile?.avatar_path ? avatarUrlByPath.get(activeProfile.avatar_path) ?? null : null;

  return (
    <main className="app-layout">
      <CommunityNavigation active="messages" />
      <section className="app-main">
        <header className="topbar messages-topbar">
          <Link href="/home" className="back-link">← Community home</Link>
          <span className="muted">PRIVATE MESSAGES</span>
        </header>
        <div className="app-content messages-page">
          <header className="messages-titlebar">
            <div><h1>Messaging</h1><p>Your private conversations on TIZIBANE.</p></div>
            <Link href="/home/people" className="messages-new-button"><span aria-hidden="true">＋</span> Start messaging</Link>
          </header>
          {params.error && <div className="notice" role="alert">{params.error}</div>}
          <section className={"messages-workspace messages-workspace-live" + (activeConversation ? " messages-workspace-has-active" : "")} aria-label="Messaging workspace">
            <aside className="messages-sidebar">
              <div className="messages-sidebar-heading"><h2>Chats</h2><span>{conversations.length}</span></div>
              {memberError ? (
                <div className="messages-list-empty"><p>We couldn't load your chats just now.</p><span>Please refresh to try again.</span></div>
              ) : conversations.length === 0 ? (
                <div className="messages-list-empty">
                  <div className="messages-empty-icon" aria-hidden="true">✉</div>
                  <strong>No conversations yet</strong>
                  <p>Choose a friend from People and tap Message. Your chats will appear here.</p>
                  <Link href="/home/people">Find people <span aria-hidden="true">→</span></Link>
                </div>
              ) : (
                <div className="conversation-list">
                  {conversations.map((conversation) => {
                    const otherId = otherByConversation.get(conversation.id);
                    const profile = otherId ? profileById.get(otherId) : undefined;
                    const last = lastByConversation.get(conversation.id);
                    const unread = unreadByConversation.get(conversation.id) ?? 0;
                    const preview = last ? (last.sender_id === user.id ? "You: " : "") + last.body : "Say hello and start chatting";
                    const active = activeConversation?.id === conversation.id;
                    return (
                      <Link href={"/home/messages?conversation=" + conversation.id} className={"conversation-card" + (active ? " is-active" : "")} aria-current={active ? "page" : undefined} key={conversation.id}>
                        <div className="person-identity">
                          {otherId && avatarUrls[otherId] ? <img src={avatarUrls[otherId]} alt="" className="person-avatar" loading="lazy" decoding="async" /> : <div className="person-avatar person-avatar-fallback">{profile?.initials || "TZ"}</div>}
                          <div className="conversation-card-copy">
                            <strong>{profile?.display_name || "TIZIBANE member"}</strong>
                            <span>{profile?.handle ? "@" + profile.handle : "Your connection"}</span>
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
            <section className="messages-chat-pane" aria-label="Selected conversation">
              {activeConversation && activeOtherId ? (
                <>
                  <header className="messages-selected-heading">
                    <Link href="/home/messages" className="messages-back-to-chats" aria-label="Back to chats"><span aria-hidden="true">←</span> Chats</Link>
                    <div className="person-identity">
                      {activeAvatar ? <img src={activeAvatar} alt="" className="person-avatar" /> : <div className="person-avatar person-avatar-fallback" style={{ background: activeProfile?.avatar_color || undefined }}>{activeProfile?.initials || "TZ"}</div>}
                      <div><h2>{activeName}</h2><span>{activeProfile?.handle ? "@" + activeProfile.handle : "TIZIBANE connection"}</span></div>
                    </div>
                    <Link href={"/home/messages?conversation=" + activeConversation.id} className="messages-open-full">Open chat</Link>
                  </header>
                  {activeMessageError ? <div className="messages-list-empty"><strong>Messages couldn't load</strong><p>Please refresh to try again.</p></div> : (
                    <ConversationLive conversationId={activeConversation.id} userId={user.id} otherUserId={activeOtherId} otherName={activeName} initialMessages={activeMessages} initialOtherLastReadAt={activeOtherLastReadAt} />
                  )}
                </>
              ) : (
                <div className="messages-chat-placeholder messages-start-hero">
                  <span className="messages-hero-eyebrow">YOUR PRIVATE INBOX</span>
                  <div className="messages-placeholder-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M8 11.5h32v23H8z" /><path d="m9 13 15 12 15-12" /><path d="M15 29h8" /></svg></div>
                  <h2>Start a conversation.</h2>
                  <p>Ready to chat? Choose a friend and send your first message. Your private chat will open right here.</p>
                  <Link href="/home/people" className="messages-start-link messages-start-primary"><span aria-hidden="true">＋</span> Choose a friend</Link>
                  <div className="messages-start-steps" aria-label="How to start messaging">
                    <span><b>1</b> Choose a friend</span>
                    <span><b>2</b> Tap Message on their profile</span>
                    <span><b>3</b> Chat here</span>
                  </div>
                  <span className="messages-privacy-note"><span aria-hidden="true">🔒</span> Private conversations between connected members</span>
                </div>
              )}
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
