import { RoyaltyCopyright } from "@/components/royalty-copyright";
import { Brand } from "@/components/brand";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut, createPost } from "../auth-actions";
import { createComment, toggleReaction } from "./post-actions";
import { ReportControl } from "./report-control";

type Post = {
  id: string;
  author_id: string;
  body: string;
  photo_path: string | null;
  visibility: string;
  created_at: string;
};
type Profile = {
  id: string;
  display_name: string;
  handle: string | null;
  initials: string;
  avatar_color: string;
  avatar_path: string | null;
};
function initialsFromName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "M";
}

type Reaction = { post_id: string; user_id: string; reaction: string };
type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ posted?: string; commented?: string; error?: string }>;
}) {
  const params = await searchParams;
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect("/login?error=Connect%20the%20Supabase%20project%20to%20continue");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownProfile } = await supabase
    .from("profiles")
    .select("id,display_name,handle,avatar_path,avatar_color,initials")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = String(
    ownProfile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Member",
  );
  const { data: preferenceRows } = await supabase.from("member_preferences").select("member_id").eq("owner_id", user.id).eq("muted", true);
  const mutedMemberIds = new Set((preferenceRows ?? []).map((row) => row.member_id as string));

  const postResult = await supabase
    .from("posts")
    .select("id,author_id,body,photo_path,visibility,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const posts = ((postResult.data ?? []) as Post[]).filter((post) => !mutedMemberIds.has(post.author_id));
  const postIds = posts.map((post) => post.id);

  let reactions: Reaction[] = [];
  let comments: Comment[] = [];
  let interactionLoadError = "";
  if (postIds.length) {
    const [reactionResult, commentResult] = await Promise.all([
      supabase.from("post_reactions").select("post_id,user_id,reaction").in("post_id", postIds),
      supabase.from("comments").select("id,post_id,author_id,body,created_at").in("post_id", postIds).order("created_at", { ascending: true }).limit(500),
    ]);
    if (reactionResult.error || commentResult.error) {
      interactionLoadError = "Some reactions or comments could not be loaded. Please refresh and try again.";
    }
    reactions = (reactionResult.data ?? []) as Reaction[];
    comments = (commentResult.data ?? []) as Comment[];
  }

  const profileIds = [...new Set([
    ...posts.map((post) => post.author_id),
    ...comments.map((comment) => comment.author_id),
  ])];
  let profiles: Profile[] = [];
  if (profileIds.length) {
    const profileResult = await supabase
      .from("profiles")
      .select("id,display_name,handle,initials,avatar_color,avatar_path")
      .in("id", profileIds);
    profiles = (profileResult.data ?? []) as Profile[];
    if (ownProfile && !profiles.some((profile) => profile.id === user.id)) profiles.push(ownProfile as Profile);
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const reactionCounts: Record<string, number> = {};
  const myReactions: Record<string, string> = {};
  for (const reaction of reactions) {
    reactionCounts[reaction.post_id] = (reactionCounts[reaction.post_id] ?? 0) + 1;
    if (reaction.user_id === user.id) myReactions[reaction.post_id] = reaction.reaction;
  }
  const commentsByPost: Record<string, Comment[]> = {};
  for (const comment of comments) {
    (commentsByPost[comment.post_id] ??= []).push(comment);
  }

  const photoUrls: Record<string, string> = {};
  const avatarUrls: Record<string, string> = {};
  for (const post of posts) {
    if (!post.photo_path) continue;
    const { data } = await supabase.storage
      .from("community-photos")
      .createSignedUrl(post.photo_path, 60 * 60);
    if (data?.signedUrl) photoUrls[post.id] = data.signedUrl;
  }
  for (const profile of profiles) {
    if (!profile.avatar_path) continue;
    const { data } = await supabase.storage
      .from("community-photos")
      .createSignedUrl(profile.avatar_path, 60 * 60);
    if (data?.signedUrl) avatarUrls[profile.id] = data.signedUrl;
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <section className="community-nav-section" aria-label="TIZIBANE Africa community navigation">
          <Brand />
          <nav className="side-nav" aria-label="Main navigation">
          <Link href="/home" className="active"><span className="nav-icon">⌂</span>Home</Link>
          <Link href="/home/profile"><span className="nav-icon">◎</span>My profile</Link>
          <Link href="/home/people"><span className="nav-icon">♧</span>People</Link>
          <Link href="/home/messages"><span className="nav-icon">✉</span>Messages</Link>
          <Link href="/home/notifications"><span className="nav-icon">♢</span>Notifications</Link><Link href="/home/blocked"><span className="nav-icon">⊘</span>Blocked</Link>
          <Link href="/home/groups"><span className="nav-icon">◈</span>Groups</Link>
          <Link href="/home/events"><span className="nav-icon">◇</span>Events</Link>
          <Link href="/home/premium"><span className="nav-icon">✦</span>Premium advertising</Link>
          <Link href="/home/connect"><span className="nav-icon">↗</span>Company links</Link>
          </nav>
          <p className="sidebar-note">More community spaces are being connected and tested before they appear here.</p>
        </section>
        <details className="signout-confirm">
          <summary className="btn">Sign out</summary>
          <div className="signout-popover">
            <p>Would you like to log out of TIZIBANE Africa?</p>
            <form action={signOut}><button className="btn" type="submit">Yes, log out</button></form>
            <Link href="/home" className="signout-stay">Stay in the app</Link>
          </div>
        </details>
      </aside>

      <section className="app-main">
        <header className="topbar"><span className="muted">YOUR COMMUNITY SPACE</span><span className="signed-in">● Signed in</span></header>
        <div className="app-content">
          <section className="welcome welcome-home">
            <span className="eyebrow">Welcome to TIZIBANE</span>
            <h1>Hello, {displayName}.</h1>
            <p>Your community home is ready. Share an update and connect with people across your circles.</p>
            <p><Link href="/home/connect" className="text-action">Explore official Royalty channels and contact details ↗</Link></p>
            <p><Link href="/home/premium" className="text-action">Advertise your products with TIZIBANE ↗</Link></p>
          </section>

          {params.posted && <div className="notice" role="status">Your post has been shared with your selected audience.</div>}
          {params.commented && <div className="notice" role="status">Your comment has been added.</div>}
          {params.error && <div className="notice" role="alert">{params.error}</div>}
          {interactionLoadError && <div className="notice" role="alert">{interactionLoadError}</div>}

          <section className="composer">
            <div className="eyebrow">Start a conversation</div>
            <form action={createPost}>
              <label className="sr-only" htmlFor="post-body">Write an update</label>
              <textarea id="post-body" name="body" placeholder="What would you like to share with your community?" maxLength={3000} />
              <div className="composer-bottom">
                <div className="composer-options">
                  <label className="photo-picker" htmlFor="post-photo">＋ Add photo</label>
                  <input id="post-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
                  <select name="visibility" aria-label="Who can see this post">
                    <option value="public">Everyone</option>
                    <option value="friends">My friends</option>
                    <option value="private">Only me</option>
                  </select>
                </div>
                <button className="btn btn-primary" type="submit">Share update</button>
              </div>
              <p className="field-help">JPG, PNG or WebP photos up to 8 MB. Your post is saved to the shared community database.</p>
            </form>
          </section>

          <div className="feed-heading">
            <div><span className="eyebrow">Community</span><h2>Latest conversations</h2></div>
            <span className="muted">Recent posts</span>
          </div>

          {postResult.error ? (
            <div className="module"><h3>Feed is temporarily unavailable</h3><p>We could not load community posts right now. Please refresh in a moment.</p></div>
          ) : posts.length === 0 ? (
            <div className="empty-state"><div className="empty-symbol">✦</div><h3>Your community starts here.</h3><p>There are no posts to show yet. Share the first update and start a conversation.</p></div>
          ) : (
            <div className="feed-list">
              {posts.map((post) => {
                const author = profileById.get(post.author_id);
                const postComments = (commentsByPost[post.id] ?? []).slice(-3);
                const myReaction = myReactions[post.id];
                return (
                  <article className="post-card" key={post.id}>
                    <div className="post-author">
                      {avatarUrls[post.author_id]
                        ? <img className="avatar avatar-image" src={avatarUrls[post.author_id]} alt="" />
                        : <div className="avatar" style={{ background: author?.avatar_color || "#345844" }}>{initialsFromName(author?.display_name || (post.author_id === user.id ? displayName : "Profile unavailable"))}</div>}
                      <div><strong>{author?.display_name || (post.author_id === user.id ? displayName : "Profile unavailable")}</strong><span>{post.created_at ? new Date(post.created_at).toLocaleString("en-ZM", { dateStyle: "medium", timeStyle: "short" }) : ""} · {post.visibility === "public" ? "Everyone" : post.visibility === "friends" ? "Friends" : "Only me"}</span></div>
                    </div>
                    {post.body && <p className="post-body">{post.body}</p>}
                    {photoUrls[post.id] && <img className="post-photo" src={photoUrls[post.id]} alt="Photo shared with this post" />}
                    <div className="post-interactions">
                      <div className="reaction-picker" aria-label="Choose how you feel about this post">
                        {[
                          { value: "like", emoji: "👍", label: "Like" },
                          { value: "love", emoji: "❤️", label: "Love" },
                          { value: "laugh", emoji: "😂", label: "Joy" },
                          { value: "wow", emoji: "😮", label: "Wow" },
                          { value: "sad", emoji: "😢", label: "Sad" },
                          { value: "celebrate", emoji: "🎉", label: "Celebrate" },
                          { value: "support", emoji: "🤗", label: "Support" },
                          { value: "salute", emoji: "🫡", label: "Salute" },
                          { value: "pray", emoji: "🙏", label: "Pray" },
                        ].map((choice) => (
                          <form action={toggleReaction} key={choice.value}>
                            <input type="hidden" name="post_id" value={post.id} />
                            <input type="hidden" name="reaction" value={choice.value} />
                            <button
                              className={`reaction-choice${myReaction === choice.value ? " is-selected" : ""}`}
                              type="submit"
                              aria-pressed={myReaction === choice.value}
                              title={choice.label}
                            >
                              <span className="reaction-emoji" aria-hidden="true">{choice.emoji}</span>
                              <span className="reaction-label">{choice.label}</span>
                            </button>
                          </form>
                        ))}
                        <span className="reaction-total">{reactionCounts[post.id] ?? 0} reactions</span>
                      </div>
                      <span className="comment-count">{commentsByPost[post.id]?.length ?? 0} comments</span>
                    </div>
                    {postComments.length > 0 && (
                      <div className="comment-list">
                        {postComments.map((comment) => {
                          const commenter = profileById.get(comment.author_id);
                          const commenterName = commenter?.display_name || (comment.author_id === user.id ? displayName : "Profile unavailable");
                          const commenterInitials = initialsFromName(commenterName);
                          return (
                            <div className="comment" key={comment.id}>
                              {avatarUrls[comment.author_id]
                                ? <img className="comment-avatar avatar-image" src={avatarUrls[comment.author_id]} alt={`${commenterName} profile photo`} />
                                : <div className="comment-avatar comment-avatar-fallback" style={{ background: commenter?.avatar_color || "#8053ad" }} aria-hidden="true">{commenterInitials}</div>}
                              <div className="comment-content">
                                <strong>{commenterName}</strong>
                                <p>{comment.body}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <form action={createComment} className="comment-form">
                      <input type="hidden" name="post_id" value={post.id} />
                      <label className="sr-only" htmlFor={`comment-${post.id}`}>Write a comment</label>
                      <input id={`comment-${post.id}`} name="body" placeholder="Write a comment…" maxLength={1000} required />
                      <button className="text-action" type="submit">Comment</button>
                    </form>
                    {post.author_id !== user.id && <ReportControl kind="post" targetId={post.id} />}
                  </article>
                );
              })}
            </div>
          )}
          <p className="muted" style={{ fontSize: 11, marginTop: 26 }}>Signed in as {user.email}. Your feed is loaded from the shared TIZIBANE database.</p>
        <RoyaltyCopyright /></div>
      </section>
    </main>
  );
}

