import { CommunityNavigation } from "@/components/community-navigation";
import { ConversationLive } from "@/components/conversation-live";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Profile = { id: string; display_name: string; handle: string | null; initials: string; avatar_color: string; avatar_path: string | null };
type Member = { user_id: string; last_read_at: string | null };
type Message = { id: string; sender_id: string; body: string; created_at: string };

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) redirect("/home/messages");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversation } = await supabase.from("conversations")
    .select("id,is_group")
    .eq("id", id)
    .eq("is_group", false)
    .maybeSingle();
  if (!conversation) redirect("/home/messages");

  const { data: memberRows } = await supabase.from("conversation_members")
    .select("user_id,last_read_at")
    .eq("conversation_id", id);
  const members = (memberRows ?? []) as Member[];
  const currentMember = members.find((member) => member.user_id === user.id);
  const otherMember = members.find((member) => member.user_id !== user.id);
  if (!currentMember || !otherMember) redirect("/home/messages");

  const [profileResult, messageResult] = await Promise.all([
    supabase.from("profiles").select("id,display_name,handle,initials,avatar_color,avatar_path").eq("id", otherMember.user_id).maybeSingle(),
    supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  const profile = profileResult.data as Profile | null;
  const messages = ((messageResult.data ?? []) as Message[]).reverse();
  const otherName = profile?.display_name || "TIZIBANE member";
  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const { data } = await supabase.storage.from("community-photos").createSignedUrl(profile.avatar_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  const readAt = new Date().toISOString();
  await Promise.all([
    supabase.from("conversation_members").update({ last_read_at: readAt }).eq("conversation_id", id).eq("user_id", user.id),
    supabase.from("notifications").update({ read_at: readAt }).eq("recipient_id", user.id).eq("kind", "message").eq("subject_id", id).is("read_at", null),
  ]);

  return (
    <main className="app-layout">
      <CommunityNavigation active="messages" />
      <section className="app-main">
        <header className="topbar">
          <Link href="/home/messages" className="back-link">← Inbox</Link>
          <span className="muted">PRIVATE CONVERSATION</span>
        </header>
        <div className="app-content">
          <section className="conversation-heading">
            <div className="person-identity">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="person-avatar" />
                : <div className="person-avatar person-avatar-fallback" style={{ background: profile?.avatar_color || undefined }}>{profile?.initials || "TZ"}</div>}
              <div>
                <span className="eyebrow">One-to-one conversation</span>
                <h1>{otherName}</h1>
                <span>{profile?.handle ? "@" + profile.handle : "Connected friend"}</span>
              </div>
            </div>
          </section>
          {notice.error && <div className="notice" role="alert">{notice.error}</div>}
          {messageResult.error ? (
            <div className="module"><h3>Messages could not be loaded</h3><p>Please refresh in a moment.</p></div>
          ) : (
            <ConversationLive
              conversationId={id}
              userId={user.id}
              otherUserId={otherMember.user_id}
              otherName={otherName}
              initialMessages={messages}
              initialOtherLastReadAt={otherMember.last_read_at}
            />
          )}
        </div>
      </section>
    </main>
  );
}
