import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityNavigation } from "@/components/community-navigation";
import { RoyaltyCopyright } from "@/components/royalty-copyright";
import { commentOnAnnouncement, reactToAnnouncement } from "./announcement-actions";

type Announcement = { id: string; title: string; body: string; is_pinned: boolean; published_at: string | null; created_by: string };
type Comment = { id: string; announcement_id: string; author_id: string; body: string; created_at: string };
type Reaction = { announcement_id: string; user_id: string; reaction: string };

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: rows }, { data: adminFlag }] = await Promise.all([
    supabase.from("community_announcements").select("id,title,body,is_pinned,published_at,created_by").eq("status", "published").or("expires_at.is.null,expires_at.gt." + new Date().toISOString()).order("is_pinned", { ascending: false }).order("published_at", { ascending: false }),
    supabase.rpc("is_current_platform_admin"),
  ]);
  const announcements = (rows ?? []) as Announcement[];
  const ids = announcements.map((item) => item.id);
  let comments: Comment[] = [];
  let reactions: Reaction[] = [];
  if (ids.length) {
    const [commentResult, reactionResult] = await Promise.all([
      supabase.from("announcement_comments").select("id,announcement_id,author_id,body,created_at").in("announcement_id", ids).order("created_at", { ascending: true }),
      supabase.from("announcement_reactions").select("announcement_id,user_id,reaction").in("announcement_id", ids),
    ]);
    comments = (commentResult.data ?? []) as Comment[];
    reactions = (reactionResult.data ?? []) as Reaction[];
  }
  const profileIds = [...new Set([...announcements.map((a) => a.created_by), ...comments.map((c) => c.author_id)])];
  let profiles: { id: string; display_name: string }[] = [];
  if (profileIds.length) {
    const { data } = await supabase.from("profiles").select("id,display_name").in("id", profileIds);
    profiles = (data ?? []) as { id: string; display_name: string }[];
  }
  const profileNames = new Map(profiles.map((p) => [p.id, p.display_name]));
  const commentMap = new Map<string, Comment[]>();
  for (const comment of comments) commentMap.set(comment.announcement_id, [...(commentMap.get(comment.announcement_id) ?? []), comment]);
  const reactionMap = new Map<string, Reaction[]>();
  for (const reaction of reactions) reactionMap.set(reaction.announcement_id, [...(reactionMap.get(reaction.announcement_id) ?? []), reaction]);
  return <main className="app-layout"><CommunityNavigation active="announcements" /><section className="app-main">
    <header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">OFFICIAL TIZIBANE UPDATES</span></header>
    <div className="app-content community-feature-page">
      <section className="welcome announcement-hero-card"><span className="eyebrow">FROM THE TIZIBANE TEAM</span><h1>Official announcements</h1><p>Verified updates and important news from the people responsible for the platform.</p></section>
      {params.notice && <div className="notice" role="status">{params.notice === "commented" ? "Your comment has been added." : params.notice}</div>}
      {params.error === "admin" && <div className="notice" role="alert">Administrator access is required for that area.</div>}
      {adminFlag === true && <div className="feature-admin-link"><span>Platform administration</span><Link href="/home/announcements/manage" className="btn btn-primary">Manage announcements</Link></div>}
      {announcements.length ? <div className="feature-announcement-list">{announcements.map((item) => {
        const itemComments = commentMap.get(item.id) ?? [];
        const itemReactions = reactionMap.get(item.id) ?? [];
        const myReaction = itemReactions.find((reaction) => reaction.user_id === user.id)?.reaction;
        return <article className="feature-announcement-card" key={item.id}>
          <div className="feature-announcement-meta"><span className="eyebrow">{item.is_pinned ? "✦ PINNED OFFICIAL NOTICE" : "OFFICIAL NOTICE"}</span><time>{item.published_at ? new Date(item.published_at).toLocaleDateString("en-ZM", { dateStyle: "medium" }) : ""}</time></div>
          <h2>{item.title}</h2><p className="feature-announcement-author">Published by {profileNames.get(item.created_by) ?? "TIZIBANE Administration"}</p>
          <div className="feature-announcement-body">{item.body}</div>
          <div className="feature-announcement-reactions">
            {(["like","love","support","celebrate"] as const).map((reaction) => <form action={reactToAnnouncement} key={reaction}><input type="hidden" name="announcement_id" value={item.id}/><input type="hidden" name="reaction" value={reaction}/><button className={"feature-reaction" + (myReaction === reaction ? " selected" : "")} type="submit" aria-pressed={myReaction === reaction}>{reaction === "like" ? "👍 Like" : reaction === "love" ? "❤️ Love" : reaction === "support" ? "🤗 Support" : "🎉 Celebrate"}</button></form>)}
            <span>{itemReactions.length} reactions · {itemComments.length} comments</span>
          </div>
          <div className="feature-announcement-comments">{itemComments.map((comment) => <div className="feature-announcement-comment" key={comment.id}><strong>{profileNames.get(comment.author_id) ?? "Member"}</strong><p>{comment.body}</p></div>)}</div>
          <form action={commentOnAnnouncement} className="feature-announcement-comment-form"><input type="hidden" name="announcement_id" value={item.id}/><label className="sr-only" htmlFor={"announcement-comment-" + item.id}>Write a comment</label><input id={"announcement-comment-" + item.id} name="body" maxLength={1000} required placeholder="Add a thoughtful comment…"/><button className="btn btn-primary" type="submit">Comment</button></form>
        </article>;
      })}</div> : <div className="empty-state"><div className="empty-symbol">✦</div><h3>No official announcements yet.</h3><p>When the TIZIBANE team publishes an update, it will appear here.</p></div>}
      <RoyaltyCopyright />
    </div>
  </section></main>;
}
