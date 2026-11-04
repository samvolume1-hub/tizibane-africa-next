import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut, createPost } from "../auth-actions";
import { createComment, toggleReaction } from "./post-actions";
import {reportPost} from "./safety-actions";

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

  const displayName = String(
    user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Member",
  );
  const postResult = await supabase
    .from("posts")
    .select("id,author_id,body,photo_path,visibility,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const posts = (postResult.data ?? []) as Post[];
  const postIds = posts.map((post) => post.id);

  let reactions: Reaction[] = [];
  let comments: Comment[] = [];
  if (postIds.length) {
    const [reactionResult, commentResult] = await Promise.all([
      supabase.from("post_reactions").select("post_id,user_id,reaction").in("post_id", postIds),
      supabase.from("comments").select("id,post_id,author_id,body,created_at").in("post_id", postIds).order("created_at", { ascending: true }).limit(150),
    ]);
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
        <Link href="/" className="brand"><span className="brand-mark">T</span><span>TIZIBANE<small>AFRICA</small></span></Link>
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
        <form action={signOut} className="sidebar-signout"><button className="btn" style={{ width: "100%" }}>Sign out</button></form>
      </aside>

      <section className="app-main">
        <header className="topbar"><span className="muted">YOUR COMMUNITY SPACE</span><span className="signed-in">● Signed in</span></header>
        <div className="app-content">
          <section className="welcome">
            <span className="eyebrow">Welcome to TIZIBANE</span>
            <h1>Hello, {displayName}.</h1>
            <p>Your community home is ready. Share an update and connect with people across your circles.</p>
            <p><Link href="/home/connect" className="text-action">Explore official Royalty channels and contact details ↗</Link></p>
            <p><Link href="/home/premium" className="text-action">Advertise your products with TIZIBANE ↗</Link></p>
          </section>

          {params.posted && <div className="notice" role="status">Your post has been shared with your selected audience.</div>}
          {params.commented && <div className="notice" role="status">Your comment has been added.</div>}
          {params.error && <div className="notice" role="alert">{params.error}</div>}

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
                        : <div className="avatar" style={{ background: author?.avatar_color || "#345844" }}>{author?.initials || "T"}</div>}
                      <div><strong>{author?.display_name || "TIZIBANE member"}</strong><span>{post.created_at ? new Date(post.created_at).toLocaleString("en-ZM", { dateStyle: "medium", timeStyle: "short" }) : ""} · {post.visibility === "public" ? "Everyone" : post.visibility === "friends" ? "Friends" : "Only me"}</span></div>
                    </div>
                    {post.body && <p className="post-body">{post.body}</p>}
                    {photoUrls[post.id] && <img className="post-photo" src={photoUrls[post.id]} alt="Photo shared with this post" />}
                    <div className="post-interactions">
                      <form action={toggleReaction} className="reaction-form">
                        <input type="hidden" name="post_id" value={post.id} />
                        <select name="reaction" aria-label="Choose a reaction" defaultValue={myReaction || "like"}>
                          <option value="like">Like</option><option value="love">Love</option><option value="celebrate">Celebrate</option><option value="support">Support</option>
                        </select>
                        <button className="text-action" type="submit">{myReaction ? "Update reaction" : "React"} · {reactionCounts[post.id] ?? 0}</button>
                      </form>
                      <span className="comment-count">{commentsByPost[post.id]?.length ?? 0} comments</span>
                    </div>
                    {postComments.length > 0 && (
                      <div className="comment-list">
                        {postComments.map((comment) => {
                          const commenter = profileById.get(comment.author_id);
                          return <div className="comment" key={comment.id}><strong>{commenter?.display_name || "Member"}</strong><p>{comment.body}</p></div>;
                        })}
                      </div>
                    )}
                    <form action={createComment} className="comment-form">
                      <input type="hidden" name="post_id" value={post.id} />
                      <label className="sr-only" htmlFor={`comment-${post.id}`}>Write a comment</label>
                      <input id={`comment-${post.id}`} name="body" placeholder="Write a comment…" maxLength={1000} required />
                      <button className="text-action" type="submit">Comment</button>
                    </form>
                    <form action={reportPost} className="report-post-form"><input type="hidden" name="post_id" value={post.id}/><select name="reason" aria-label="Report this post"><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="inappropriate">Inappropriate</option><option value="other">Other</option></select><button className="text-action muted-action" type="submit">Report post</button></form>
                  </article>
                );
              })}
            </div>
          )}
          <p className="muted" style={{ fontSize: 11, marginTop: 26 }}>Signed in as {user.email}. Your feed is loaded from the shared TIZIBANE database.</p>
        </div>
      </section>
    </main>
  );
}
