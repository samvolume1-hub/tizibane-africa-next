import { CommunityNavigation } from "@/components/community-navigation";
import { PendingIconButton } from "@/components/pending-icon-button";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addMemberPostComment, toggleMemberFollow, toggleMemberPostLike } from "../member-profile-actions";

type Profile = {
  id: string; display_name: string; handle: string | null; bio: string;
  location: string; avatar_path: string | null; cover_path: string | null;
  avatar_color: string; initials: string; visibility: string;
};
type Post = { id: string; author_id: string; body: string; photo_path: string | null; visibility: string; created_at: string };
type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string };
type Reaction = { post_id: string; user_id: string; reaction: string };
type MiniProfile = { id: string; display_name: string; initials: string; avatar_color: string; avatar_path: string | null };

function initials(name: string) {
  return name.trim().split(/\\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "M";
}

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; commented?: string }>;
}) {
  const [{ id: memberId }, notices] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberId)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile and post reads remain subject to the database's existing visibility RLS policies.
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,handle,bio,location,avatar_path,cover_path,avatar_color,initials,visibility")
    .eq("id", memberId)
    .maybeSingle();
  if (profileError || !profileData) notFound();
  const profile = profileData as Profile;
  const isOwnProfile = profile.id === user.id;

  const [postResult, followResult, avatarResult, coverResult] = await Promise.all([
    supabase.from("posts").select("id,author_id,body,photo_path,visibility,created_at").eq("author_id", memberId).order("created_at", { ascending: false }).limit(20),
    supabase.from("follows").select("followed_id").eq("follower_id", user.id).eq("followed_id", memberId).maybeSingle(),
    profile.avatar_path ? supabase.storage.from("community-photos").createSignedUrl(profile.avatar_path, 3600) : Promise.resolve({ data: null }),
    profile.cover_path ? supabase.storage.from("community-photos").createSignedUrl(profile.cover_path, 3600) : Promise.resolve({ data: null }),
  ]);
  const posts = (postResult.data ?? []) as Post[];
  const postIds = posts.map((post) => post.id);
  const [reactionResult, commentResult] = postIds.length ? await Promise.all([
    supabase.from("post_reactions").select("post_id,user_id,reaction").in("post_id", postIds),
    supabase.from("comments").select("id,post_id,author_id,body,created_at").in("post_id", postIds).order("created_at", { ascending: true }).limit(80),
  ]) : [{ data: [] }, { data: [] }];
  const reactions = (reactionResult.data ?? []) as Reaction[];
  const comments = (commentResult.data ?? []) as Comment[];
  const authorIds = [...new Set(comments.map((comment) => comment.author_id))];
  let commentAuthors: MiniProfile[] = [];
  if (authorIds.length) {
    const { data } = await supabase.from("profiles").select("id,display_name,initials,avatar_color,avatar_path").in("id", authorIds);
    commentAuthors = (data ?? []) as MiniProfile[];
  }
  const imagePaths = [...new Set([
    ...posts.map((post) => post.photo_path),
    ...commentAuthors.map((author) => author.avatar_path),
  ].filter((path): path is string => Boolean(path)))];
  const { data: signedImages } = imagePaths.length
    ? await supabase.storage.from("community-photos").createSignedUrls(imagePaths, 3600)
    : { data: [] };
  const signedByPath = new Map((signedImages ?? []).map((item) => [item.path, item.signedUrl]));
  const postPhotoUrls = new Map(posts.map((post) => [post.id, post.photo_path ? signedByPath.get(post.photo_path) : undefined]));
  const authorById = new Map(commentAuthors.map((author) => [author.id, author]));
  const commentGroups = new Map<string, Comment[]>();
  for (const comment of comments) {
    const list = commentGroups.get(comment.post_id) ?? [];
    if (list.length < 3) list.push(comment);
    commentGroups.set(comment.post_id, list);
  }
  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const reaction of reactions) {
    if (reaction.reaction === "like") likeCounts.set(reaction.post_id, (likeCounts.get(reaction.post_id) ?? 0) + 1);
    if (reaction.user_id === user.id && reaction.reaction === "like") likedByMe.add(reaction.post_id);
  }
  const avatarUrl = avatarResult.data?.signedUrl ?? null;
  const coverUrl = coverResult.data?.signedUrl ?? null;
  const profileInitials = profile.initials || initials(profile.display_name || "Member");
  const commentAvatarUrls = new Map<string, string>();
  for (const author of commentAuthors) {
    const url = author.avatar_path ? signedByPath.get(author.avatar_path) : undefined;
    if (url) commentAvatarUrls.set(author.id, url);
  }

  return (
    <main className="app-layout">
      <CommunityNavigation active="people" />
      <section className="app-main">
        <header className="topbar">
          <Link href="/home/people" className="back-link">← Back to people</Link>
          <span className="muted">MEMBER PROFILE</span>
        </header>
        <div className="app-content member-profile-page">
          {notices.error && <div className="notice" role="alert">{notices.error}</div>}
          {notices.commented && <div className="notice" role="status">Your comment has been added.</div>}
          <section className="member-profile-hero">
            {coverUrl ? <img className="member-profile-cover" src={coverUrl} alt="" /> : <div className="member-profile-cover member-profile-cover-fallback" />}
            <div className="member-profile-heading">
              {avatarUrl ? <img className="member-profile-avatar" src={avatarUrl} alt={profile.display_name + " profile photo"} /> : <div className="member-profile-avatar member-profile-avatar-fallback" style={{ background: profile.avatar_color || undefined }}>{profileInitials}</div>}
              <div className="member-profile-identity">
                <h1>{profile.display_name || "TIZIBANE member"}</h1>
                <span>{profile.handle ? "@" + profile.handle : "TIZIBANE member"}{profile.location ? " · " + profile.location : ""}</span>
              </div>
              {!isOwnProfile && <form action={toggleMemberFollow} className="member-profile-follow">
                <input type="hidden" name="member_id" value={memberId} />
                <PendingIconButton className="btn btn-primary" label={followResult.data ? "Unfollow member" : "Follow member"} pendingLabel="Updating…">
                  {followResult.data ? "Following · Unfollow" : "＋ Follow"}
                </PendingIconButton>
              </form>}
              {isOwnProfile && <Link className="btn btn-primary member-profile-edit" href="/home/profile">Edit my profile</Link>}
            </div>
          </section>
          {profile.bio && <section className="member-profile-bio"><span className="eyebrow">ABOUT</span><p>{profile.bio}</p></section>}
          <div className="feed-heading member-profile-feed-heading">
            <div><span className="eyebrow">COMMUNITY POSTS</span><h2>{isOwnProfile ? "Your posts" : "Posts by " + profile.display_name}</h2></div>
            <span className="muted">{posts.length} shown</span>
          </div>
          {postResult.error ? <div className="module"><h3>Posts are temporarily unavailable</h3><p>Please refresh in a moment.</p></div> : posts.length === 0 ? (
            <div className="empty-state"><div className="empty-symbol">✦</div><h3>No visible posts yet.</h3><p>When {isOwnProfile ? "you share" : "this member shares"} posts with an audience you can view, they will appear here.</p></div>
          ) : <div className="feed-list member-profile-posts">
            {posts.map((post) => {
              const postComments = commentGroups.get(post.id) ?? [];
              return <article className="post-card member-profile-post" key={post.id}>
                <div className="post-author">
                  {avatarUrl ? <img className="avatar avatar-image" src={avatarUrl} alt="" /> : <div className="avatar" style={{ background: profile.avatar_color || "#8053ad" }}>{profileInitials}</div>}
                  <div><strong>{profile.display_name}</strong><span>{new Date(post.created_at).toLocaleString("en-ZM", { dateStyle: "medium", timeStyle: "short" })}</span></div>
                </div>
                {post.body && <p className="post-body">{post.body}</p>}
                {postPhotoUrls.get(post.id) && <img className="post-photo" src={postPhotoUrls.get(post.id)} alt="Photo shared in this post" loading="lazy" decoding="async" />}
                <div className="member-profile-post-actions">
                  <form action={toggleMemberPostLike}>
                    <input type="hidden" name="member_id" value={memberId} />
                    <input type="hidden" name="post_id" value={post.id} />
                    <PendingIconButton className="text-action" label={likedByMe.has(post.id) ? "Unlike post" : "Like post"} pendingLabel="Saving…" pressed={likedByMe.has(post.id)}>
                      {likedByMe.has(post.id) ? "♥ Liked" : "♡ Like"} · {likeCounts.get(post.id) ?? 0}
                    </PendingIconButton>
                  </form>
                  <span className="muted">{comments.filter((comment) => comment.post_id === post.id).length} comments</span>
                </div>
                {postComments.length > 0 && <div className="member-profile-comments">
                  {postComments.map((comment) => {
                    const author = authorById.get(comment.author_id);
                    const commentAvatar = commentAvatarUrls.get(comment.author_id);
                    const commentName = author?.display_name || "TIZIBANE member";
                    return <div className="member-profile-comment" key={comment.id}>
                      {commentAvatar ? <img src={commentAvatar} alt="" /> : <span className="member-profile-comment-fallback">{author?.initials || initials(commentName)}</span>}
                      <p><strong>{commentName}</strong> {comment.body}</p>
                    </div>;
                  })}
                </div>}
                <form action={addMemberPostComment} className="member-profile-comment-form">
                  <input type="hidden" name="member_id" value={memberId} />
                  <input type="hidden" name="post_id" value={post.id} />
                  <label className="sr-only" htmlFor={"comment-" + post.id}>Write a comment</label>
                  <input id={"comment-" + post.id} name="body" maxLength={1000} placeholder="Write a comment…" required />
                  <PendingIconButton className="btn btn-primary" label="Post comment" pendingLabel="Posting…">Comment</PendingIconButton>
                </form>
              </article>;
            })}
          </div>}
        </div>
      </section>
    </main>
  );
}
