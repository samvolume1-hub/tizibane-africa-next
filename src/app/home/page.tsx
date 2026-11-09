import { CommunityNavigation } from "@/components/community-navigation";
import { RoyaltyCopyright } from "@/components/royalty-copyright";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "../auth-actions";
import { createComment, toggleReaction, updatePost, deletePost, replacePostPhoto, removePostPhoto, updateComment, deleteComment } from "./post-actions";
import { ContentMoreMenu } from "@/components/content-more-menu";
import { ReportControl } from "./report-control";
import { PendingIconButton } from "@/components/pending-icon-button";
import { CompressedImageForm } from "@/components/compressed-image-form";

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
type HomeGroup = { id: string; name: string; category: string; description: string; visibility: string };
type HomeEvent = { id: string; name: string; category: string; location: string; starts_at: string; is_public: boolean };
type HomeActivity = { id: number; actor_id: string | null; event_type: string; target_type: string; target_id: string; created_at: string };
type HomeAnnouncement = { id: string; title: string; body: string; is_pinned: boolean; published_at: string | null };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ posted?: string; commented?: string; error?: string; welcome?: string; updated?: string; deleted?: string; cleanup?: string }>;
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

  const [
    { data: ownProfile },
    { data: preferenceRows },
    groupPreviewResult,
    eventPreviewResult,
    activityPreviewResult,
    announcementPreviewResult,
    postResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id,display_name,handle,avatar_path,avatar_color,initials").eq("id", user.id).maybeSingle(),
    supabase.from("member_preferences").select("member_id").eq("owner_id", user.id).eq("muted", true),
    supabase.from("groups").select("id,name,category,description,visibility").eq("visibility", "public").order("created_at", { ascending: false }).limit(3),
    supabase.from("events").select("id,name,category,location,starts_at,is_public").eq("is_public", true).gte("ends_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(2),
    supabase.from("community_activity").select("id,actor_id,event_type,target_type,target_id,created_at").order("created_at", { ascending: false }).limit(12),
    supabase.from("community_announcements").select("id,title,body,is_pinned,published_at").eq("status", "published").or("expires_at.is.null,expires_at.gt." + new Date().toISOString()).order("is_pinned", { ascending: false }).order("published_at", { ascending: false }).limit(2),
    supabase.from("posts").select("id,author_id,body,photo_path,visibility,created_at").order("created_at", { ascending: false }).limit(12),
  ]);
  const displayName = String(
    ownProfile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Member",
  );
  const mutedMemberIds = new Set((preferenceRows ?? []).map((row) => row.member_id as string));
  const featuredGroups = (groupPreviewResult.data ?? []) as HomeGroup[];
  const upcomingEvents = (eventPreviewResult.data ?? []) as HomeEvent[];
  const recentActivity = ((activityPreviewResult.data ?? []) as HomeActivity[]).filter((item) => !item.actor_id || !mutedMemberIds.has(item.actor_id));
  const announcementPreviews = (announcementPreviewResult.data ?? []) as HomeAnnouncement[];
  const posts = ((postResult.data ?? []) as Post[]).filter((post) => !mutedMemberIds.has(post.author_id));
  const postIds = posts.map((post) => post.id);

  let reactions: Reaction[] = [];
  let comments: Comment[] = [];
  let interactionLoadError = "";
  if (postIds.length) {
    const [reactionResult, commentResult] = await Promise.all([
      supabase.from("post_reactions").select("post_id,user_id,reaction").in("post_id", postIds),
      supabase.from("comments").select("id,post_id,author_id,body,created_at").in("post_id", postIds).order("created_at", { ascending: false }).limit(60),
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
  }
  if (ownProfile && !profiles.some((profile) => profile.id === user.id)) {
    profiles.push(ownProfile as Profile);
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
  // Sign every feed image in one Storage request instead of issuing a request
  // for each post photo and member avatar on slower mobile connections.
  const imagePaths = [...new Set([
    ...posts.map((post) => post.photo_path),
    ...profiles.map((profile) => profile.avatar_path),
  ].filter((path): path is string => Boolean(path)))];
  const { data: signedImages } = imagePaths.length
    ? await supabase.storage.from("community-photos").createSignedUrls(imagePaths, 60 * 60)
    : { data: [] };
  const signedUrlByPath = new Map((signedImages ?? []).map((item) => [item.path, item.signedUrl]));
  for (const post of posts) {
    const url = post.photo_path ? signedUrlByPath.get(post.photo_path) : null;
    if (url) photoUrls[post.id] = url;
  }
  for (const profile of profiles) {
    const url = profile.avatar_path ? signedUrlByPath.get(profile.avatar_path) : null;
    if (url) avatarUrls[profile.id] = url;
  }

  return (
    <main className="app-layout">
      <CommunityNavigation active="home" />

      <section className="app-main">
        <header className="topbar"><span className="muted">YOUR COMMUNITY SPACE</span><span className="signed-in">● Signed in</span></header>
        <div className="app-content community-home-page">
          <section className={`welcome welcome-home home-welcome-compact${avatarUrls[user.id] ? " home-welcome-has-photo" : " home-welcome-no-photo"}`}>
            {avatarUrls[user.id] && (
              <img
                className="home-welcome-photo"
                src={avatarUrls[user.id]}
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                decoding="async"
              />
            )}
            <div className="home-welcome-copy">
              <h1 className="tizibane-welcome-title"><span className="tizibane-flourish-letter" aria-hidden="true">W</span><span className="tizibane-welcome-script">elcome Back</span><span className="tizibane-welcome-name">{displayName}</span></h1>
              <p>Connect. Belong. Grow.</p>
            </div>
          </section>
          <nav className="home-quick-actions home-quick-actions-below" aria-label="Quick community actions">
            <Link href="/home/people" className="home-quick-action home-quick-action-primary">
              <svg className="home-quick-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 8v6m-3-3h6"/></svg>
              <span>People</span>
            </Link>
            <Link href="/home/groups" className="home-quick-action">
              <svg className="home-quick-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Groups</span>
            </Link>
            <Link href="/home/events" className="home-quick-action">
              <svg className="home-quick-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
              <span>Events</span>
            </Link>
          </nav>

          {params.welcome && <div className="notice" role="status">Logged in successfully. Welcome to TIZIBANE!</div>}
          {params.commented && <div className="notice" role="status">Your comment has been added.</div>}
          {params.updated && <div className="notice" role="status">{params.updated === "comment" ? "Your comment has been updated." : params.updated === "photo" ? "Your post photo has been replaced." : params.updated === "photo-removed" ? "The photo has been removed from your post." : "Your post has been updated."}</div>}
          {params.deleted && <div className="notice" role="status">{params.deleted === "comment" ? "Your comment has been deleted." : "Your post has been deleted from the database."}</div>}
          {params.cleanup && <div className="notice" role="alert">The content was saved, but an old image could not be cleared from storage. Please contact support if it remains visible in storage.</div>}
          {interactionLoadError && <div className="notice" role="alert">{interactionLoadError}</div>}

          <section className="home-announcement-strip" aria-labelledby="home-announcements-title">
            <div className="home-announcement-mark" aria-hidden="true">✦</div>
            <div className="home-announcement-content">
              <div className="home-announcement-copy">
                <span className="eyebrow">OFFICIAL COMMUNITY NOTICES</span>
                <h2 id="home-announcements-title">Announcements</h2>
              </div>
              <div className="home-announcement-preview">
                {announcementPreviews.length ? announcementPreviews.map((notice) => (
                  <Link href="/home/announcements" className="home-announcement-link" key={notice.id}>
                    {notice.is_pinned && <span className="home-pinned-label">PINNED</span>}
                    <strong>{notice.title}</strong>
                    <span>{notice.body.length > 110 ? notice.body.slice(0, 110) + "…" : notice.body}</span>
                  </Link>
                )) : <p>Official TIZIBANE updates will appear here when published by an administrator.</p>}
              </div>
              <Link href="/home/announcements" className="home-view-all">View announcements ↗</Link>
            </div>
          </section>

          <section className="composer home-composer">
            <div className="home-composer-heading">
              {avatarUrls[user.id]
                ? <img className="home-composer-avatar" src={avatarUrls[user.id]} alt={`${displayName} profile photo`} />
                : <div className="home-composer-avatar home-composer-avatar-fallback" style={{ background: ownProfile?.avatar_color || "#8053ad" }} aria-hidden="true">{initialsFromName(displayName)}</div>}
              <div>
                <div className="home-section-kicker">YOUR VOICE</div>
                <div className="eyebrow">Start a conversation</div>
              </div>
            </div>
            <CompressedImageForm action={createPost}>
              <label className="sr-only" htmlFor="post-body">Write an update</label>
              <textarea id="post-body" name="body" placeholder="What would you like to share with your community?" maxLength={3000} />
              <div className="composer-bottom">
                <div className="composer-options">
                  <label className="photo-picker" htmlFor="post-photo" aria-label="Upload photo" title="Upload photo"><span aria-hidden="true">＋</span><span>Upload photo</span></label>
                  <input id="post-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
                  <select name="visibility" aria-label="Who can see this post">
                    <option value="public">Everyone</option>
                    <option value="friends">My friends</option>
                    <option value="private">Only me</option>
                  </select>
                </div>
                <button className="btn btn-primary" type="submit">Share update</button>
              </div>
              <p className="field-help">Photos are optimized toward 1 MB · Maximum 2 MB after optimization.</p>
            </CompressedImageForm>
          </section>
          {params.posted && <div className="notice" role="status">{params.posted === "photo" ? "Your photo and post have been uploaded, saved and shared with your selected audience." : "Your post has been saved and shared with your selected audience."}</div>}
          {params.error && <div className="notice" role="alert">{params.error}</div>}

          <div className="feed-heading home-feed-heading">
            <div><span className="eyebrow">THE COMMUNITY</span><h2>What's happening</h2></div>
            <span className="muted">Latest posts</span>
          </div>

          {postResult.error ? (
            <div className="module"><h3>Feed is temporarily unavailable</h3><p>We could not load community posts right now. Please refresh in a moment.</p></div>
          ) : posts.length === 0 ? (
            <div className="empty-state"><div className="empty-symbol">✦</div><h3>Your community starts here.</h3><p>There are no posts to show yet. Share the first update and start a conversation.</p></div>
          ) : (
            <div className="feed-list">
              {posts.map((post) => {
                const author = profileById.get(post.author_id);
                const postComments = (commentsByPost[post.id] ?? []).slice(0, 3).reverse();
                const myReaction = myReactions[post.id];
                return (
                  <article className="post-card" key={post.id}>
                    <div className="post-author">
                      {avatarUrls[post.author_id]
                        ? <img className="avatar avatar-image" src={avatarUrls[post.author_id]} alt="" loading="lazy" decoding="async" />
                        : <div className="avatar" style={{ background: author?.avatar_color || "#345844" }}>{initialsFromName(author?.display_name || (post.author_id === user.id ? displayName : "Profile unavailable"))}</div>}
                      <div><strong>{author?.display_name || (post.author_id === user.id ? displayName : "Profile unavailable")}</strong><span>{post.created_at ? new Date(post.created_at).toLocaleString("en-ZM", { dateStyle: "medium", timeStyle: "short" }) : ""} · {post.visibility === "public" ? "Everyone" : post.visibility === "friends" ? "Friends" : "Only me"}</span></div>
                      {post.author_id === user.id && <ContentMoreMenu fields={{ post_id: post.id }} edit={{ action: updatePost, value: post.body, label: "Edit post" }} deleteAction={deletePost} deleteLabel="Delete post" replacePhoto={{ action: replacePostPhoto, label: post.photo_path ? "Replace photo" : "Add photo" }} removePhoto={post.photo_path ? { action: removePostPhoto } : undefined} /> }
                    </div>
                    {post.body && <p className="post-body">{post.body}</p>}
                    {photoUrls[post.id] && <img className="post-photo" src={photoUrls[post.id]} alt="Photo shared with this post" loading="lazy" decoding="async" />}
                    <div className="post-interactions">
                      <div className="reaction-picker" aria-label="Choose how you feel about this post">
                        <details className="reaction-menu">
                          <summary aria-label="Choose a reaction" title="Choose a reaction">
                            <span aria-hidden="true">{myReaction === "love" ? "❤️" : myReaction === "laugh" ? "😂" : myReaction === "wow" ? "😮" : myReaction === "sad" ? "😢" : myReaction === "celebrate" ? "🎉" : myReaction === "support" ? "🤗" : myReaction === "salute" ? "🫡" : myReaction === "pray" ? "🙏" : "👍"}</span>
                          </summary>
                          <div className="reaction-menu-panel">
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
                                <PendingIconButton className={`reaction-choice${myReaction === choice.value ? " is-selected" : ""}`} pressed={myReaction === choice.value} label={choice.label}>
                                  <span className="reaction-emoji" aria-hidden="true">{choice.emoji}</span>
                                </PendingIconButton>
                              </form>
                            ))}
                          </div>
                        </details>
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
                                ? <img className="comment-avatar avatar-image" src={avatarUrls[comment.author_id]} alt={`${commenterName} profile photo`} loading="lazy" decoding="async" />
                                : <div className="comment-avatar comment-avatar-fallback" style={{ background: commenter?.avatar_color || "#8053ad" }} aria-hidden="true">{commenterInitials}</div>}
                              <div className="comment-content">
                                <strong>{commenterName}</strong>
                                <p>{comment.body}</p>
                              </div>
                              {comment.author_id === user.id && <ContentMoreMenu fields={{ comment_id: comment.id }} edit={{ action: updateComment, value: comment.body, label: "Edit comment", maxLength: 1000, rows: 3 }} deleteAction={deleteComment} deleteLabel="Delete comment" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <form action={createComment} className="comment-form">
                      <input type="hidden" name="post_id" value={post.id} />
                      <label className="sr-only" htmlFor={`comment-${post.id}`}>Write a comment</label>
                      <input id={`comment-${post.id}`} name="body" placeholder="Write a comment…" maxLength={1000} required />
                      <PendingIconButton className="text-action comment-submit-icon" label="Send comment">➤</PendingIconButton>
                    </form>
                    {post.author_id !== user.id && <ReportControl kind="post" targetId={post.id} />}
                  </article>
                );
              })}
            </div>
          )}
          <section className="home-discovery-grid" aria-label="Discover more of TIZIBANE">
            <div className="home-mini-section">
              <div className="home-mini-heading"><div><span className="eyebrow">FIND YOUR CIRCLE</span><h2>Featured groups</h2></div><Link href="/home/groups" className="home-view-all">See all <span aria-hidden="true">↗</span></Link></div>
              {featuredGroups.length ? <div className="home-group-preview-list">{featuredGroups.map((group) => <Link className="home-group-preview" href={"/home/groups/" + group.id} key={group.id}><span className="home-preview-icon" aria-hidden="true">◈</span><span className="home-preview-copy"><strong>{group.name}</strong><small>{group.category || "Community"}</small></span><span className="home-preview-arrow" aria-hidden="true">›</span></Link>)}</div> : <p className="home-empty-preview">Public groups will appear here as the community grows.</p>}
            </div>
            <div className="home-mini-section">
              <div className="home-mini-heading"><div><span className="eyebrow">SAVE THE DATE</span><h2>Coming up</h2></div><Link href="/home/events" className="home-view-all">See all <span aria-hidden="true">↗</span></Link></div>
              {upcomingEvents.length ? <div className="home-event-preview-list">{upcomingEvents.map((event) => <Link className="home-event-preview" href="/home/events" key={event.id}><span className="home-event-date"><strong>{new Date(event.starts_at).toLocaleDateString("en-ZM", { day: "2-digit" })}</strong><small>{new Date(event.starts_at).toLocaleDateString("en-ZM", { month: "short" })}</small></span><span className="home-preview-copy"><strong>{event.name}</strong><small>{event.category || "Community"}{event.location ? " · " + event.location : ""}</small></span><span className="home-preview-arrow" aria-hidden="true">›</span></Link>)}</div> : <p className="home-empty-preview">New community events will show up here.</p>}
            </div>
          </section>

          <section className="home-recent-activity">
            <div className="home-mini-heading"><div><span className="eyebrow">THE COMMUNITY PULSE</span><h2>Recent activity</h2></div><Link href="/home/activity" className="home-view-all">View all <span aria-hidden="true">↗</span></Link></div>
            {recentActivity.length ? <div className="home-activity-list">{recentActivity.slice(0, 3).map((item) => <div className="home-activity-item" key={item.id}><span className="home-activity-dot" aria-hidden="true">•</span><span>{item.event_type === "public_post" ? "A member shared a public discussion" : item.event_type === "public_comment" ? "A member joined a public discussion" : item.event_type === "public_reaction" ? "A member reacted to a public discussion" : item.event_type === "public_group_created" ? "A new public group was created" : item.event_type === "public_event_created" ? "A public community event was created" : "A member responded to a public event"}</span><time>{new Date(item.created_at).toLocaleDateString("en-ZM", { day: "numeric", month: "short" })}</time></div>)}</div> : <p className="home-empty-preview">Public community activity will appear here as members share and connect.</p>}
          </section>

          <p className="muted home-account-note">Signed in as {user.email} · Your feed is loaded from the shared TIZIBANE database.</p>
        <RoyaltyCopyright /></div>
      </section>
    </main>
  );
}

