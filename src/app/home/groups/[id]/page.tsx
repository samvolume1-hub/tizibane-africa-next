import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "../../../auth-actions";
import {joinGroup} from "../../group-actions";
import {createGroupPost,createGroupComment,toggleGroupReaction,deleteGroupPost,deleteGroupComment} from "../../group-feed-actions";
import {reportPost} from "../../safety-actions";

type Group={id:string;owner_id:string;name:string;description:string;category:string;visibility:string;join_policy:string;rules:string};
type Membership={role:string;status:string};
type Post={id:string;author_id:string;body:string;photo_path:string|null;created_at:string};
type Profile={id:string;display_name:string;handle:string|null;initials:string;avatar_color:string;avatar_path:string|null};
type Reaction={post_id:string;user_id:string;reaction:string};
type Comment={id:string;post_id:string;author_id:string;body:string;created_at:string};
export default async function GroupDetailPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;posted?:string;commented?:string;deleted?:string;commentDeleted?:string}>}){
 const [{id},notice]=await Promise.all([params,searchParams]);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))redirect("/home/groups");
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:groupData}=await supabase.from("groups").select("id,owner_id,name,description,category,visibility,join_policy,rules").eq("id",id).maybeSingle();
 if(!groupData)redirect("/home/groups?error=That%20group%20could%20not%20be%20found");
 const group=groupData as Group;
 const {data:memberData}=await supabase.from("group_members").select("role,status").eq("group_id",id).eq("user_id",user.id).maybeSingle();
 const membership=memberData as Membership|null,active=membership?.status==="active",manager=group.owner_id===user.id||(active&&["owner","moderator"].includes(membership?.role??""));
 let posts:Post[]=[],postError=false,reactions:Reaction[]=[],comments:Comment[]=[];
 if(active){
  const result=await supabase.from("posts").select("id,author_id,body,photo_path,created_at").eq("group_id",id).order("created_at",{ascending:false}).limit(30);
  posts=(result.data??[]) as Post[];postError=Boolean(result.error);
  const postIds=posts.map(p=>p.id);
  if(postIds.length){
   const [reactionResult,commentResult]=await Promise.all([
    supabase.from("post_reactions").select("post_id,user_id,reaction").in("post_id",postIds),
    supabase.from("comments").select("id,post_id,author_id,body,created_at").in("post_id",postIds).order("created_at",{ascending:true}).limit(120)
   ]);
   reactions=(reactionResult.data??[]) as Reaction[];comments=(commentResult.data??[]) as Comment[];
  }
 }
 const profileIds=[...new Set([...posts.map(p=>p.author_id),...comments.map(c=>c.author_id)])];
 let profiles:Profile[]=[];
 if(profileIds.length){const {data}=await supabase.from("profiles").select("id,display_name,handle,initials,avatar_color,avatar_path").in("id",profileIds);profiles=(data??[]) as Profile[]}
 const profileById=new Map(profiles.map(p=>[p.id,p]));
 const reactionCounts:Record<string,number>={},myReactions:Record<string,string>={},commentsByPost:Record<string,Comment[]>={};
 for(const r of reactions){reactionCounts[r.post_id]=(reactionCounts[r.post_id]??0)+1;if(r.user_id===user.id)myReactions[r.post_id]=r.reaction}
 for(const c of comments)(commentsByPost[c.post_id]??=[]).push(c);
 const photoUrls:Record<string,string>={},avatarUrls:Record<string,string>={};
 for(const p of posts){if(!p.photo_path)continue;const {data}=await supabase.storage.from("community-photos").createSignedUrl(p.photo_path,3600);if(data?.signedUrl)photoUrls[p.id]=data.signedUrl}
 for(const p of profiles){if(!p.avatar_path)continue;const {data}=await supabase.storage.from("community-photos").createSignedUrl(p.avatar_path,3600);if(data?.signedUrl)avatarUrls[p.id]=data.signedUrl}
 return <main className="app-layout"><aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">T</span><span>TIZIBANE<small>AFRICA</small></span></Link><nav className="side-nav" aria-label="Main navigation"><Link href="/home"><span className="nav-icon">⌂</span>Home</Link><Link href="/home/profile"><span className="nav-icon">◎</span>My profile</Link><Link href="/home/people"><span className="nav-icon">♧</span>People</Link>
          <Link href="/home/messages"><span className="nav-icon">✉</span>Messages</Link>
          <Link href="/home/notifications"><span className="nav-icon">♢</span>Notifications</Link><Link href="/home/groups" className="active"><span className="nav-icon">◈</span>Groups</Link><Link href="/home/events"><span className="nav-icon">◇</span>Events</Link></nav><form action={signOut} className="sidebar-signout"><button className="btn" style={{width:"100%"}}>Sign out</button></form></aside>
 <section className="app-main"><header className="topbar"><Link href="/home/groups" className="back-link">← All groups</Link><span className="muted">COMMUNITY SPACE</span></header><div className="app-content">
 <section className="welcome"><span className="eyebrow">{group.category||"Community"} · {group.visibility}</span><h1>{group.name}</h1><p>{group.description||"A space for members to connect and share."}</p></section>
 {notice.error&&<div className="notice" role="alert">{notice.error}</div>}{notice.posted&&<div className="notice" role="status">Your group update has been published.</div>}{notice.commented&&<div className="notice" role="status">Your comment has been added.</div>}{notice.deleted&&<div className="notice" role="status">The post has been deleted.</div>}{notice.commentDeleted&&<div className="notice" role="status">The comment has been deleted.</div>}
 {active?<><section className="composer group-composer"><div className="eyebrow">Share with this group</div><form action={createGroupPost} encType="multipart/form-data"><input type="hidden" name="group_id" value={id}/><label className="sr-only" htmlFor="group-post-body">Write a group update</label><textarea id="group-post-body" name="body" maxLength={3000} placeholder="Share an update with your group..."/><div className="composer-bottom"><div className="composer-options"><label className="photo-picker" htmlFor="group-post-photo">＋ Add photo</label><input id="group-post-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"/></div><button className="btn btn-primary" type="submit">Publish to group</button></div><p className="field-help">Text and photos only. JPG, PNG or WebP up to 8 MB. Music and video uploads are not supported.</p></form></section>
 <div className="feed-heading"><div><span className="eyebrow">Members only</span><h2>Group conversations</h2></div><span className="muted">{posts.length} recent posts</span></div>
 {postError?<div className="module"><h3>Group feed unavailable</h3><p>Please refresh in a moment.</p></div>:posts.length===0?<div className="empty-state"><div className="empty-symbol">◈</div><h3>Start the conversation.</h3><p>This group has no posts yet. Share the first update with its members.</p></div>:<div className="feed-list">{posts.map(post=>{const author=profileById.get(post.author_id),recentComments=(commentsByPost[post.id]??[]).slice(-3);return <article className="post-card" key={post.id}><div className="post-author">{avatarUrls[post.author_id]?<img className="avatar avatar-image" src={avatarUrls[post.author_id]} alt=""/>:<div className="avatar" style={{background:author?.avatar_color||"#345844"}}>{author?.initials||"T"}</div>}<div><strong>{author?.display_name||"TIZIBANE member"}</strong><span>{post.created_at?new Date(post.created_at).toLocaleString("en-ZM",{dateStyle:"medium",timeStyle:"short"}):""} · Group members</span></div></div>{post.body&&<p className="post-body">{post.body}</p>}{photoUrls[post.id]&&<img className="post-photo" src={photoUrls[post.id]} alt="Photo shared with this group"/>}<div className="post-interactions"><form action={toggleGroupReaction} className="reaction-form"><input type="hidden" name="group_id" value={id}/><input type="hidden" name="post_id" value={post.id}/><select name="reaction" aria-label="Choose a reaction" defaultValue={myReactions[post.id]||"like"}><option value="like">Like</option><option value="love">Love</option><option value="celebrate">Celebrate</option><option value="support">Support</option></select><button className="text-action" type="submit">{myReactions[post.id]?"Update reaction":"React"} · {reactionCounts[post.id]??0}</button></form><span className="comment-count">{commentsByPost[post.id]?.length??0} comments</span></div>{recentComments.length>0&&<div className="comment-list">{recentComments.map(c=>{const commenter=profileById.get(c.author_id);return <div className="comment" key={c.id}><strong>{commenter?.display_name||"Member"}</strong><p>{c.body}</p>{(manager||c.author_id===user.id)&&<form action={deleteGroupComment}><input type="hidden" name="group_id" value={id}/><input type="hidden" name="post_id" value={post.id}/><input type="hidden" name="comment_id" value={c.id}/><button className="text-action muted-action" type="submit">Delete comment</button></form>}</div>})}</div>}<form action={createGroupComment} className="comment-form"><input type="hidden" name="group_id" value={id}/><input type="hidden" name="post_id" value={post.id}/><label className="sr-only" htmlFor={"group-comment-"+post.id}>Write a comment</label><input id={"group-comment-"+post.id} name="body" maxLength={1000} placeholder="Write a comment..." required/><button className="text-action" type="submit">Comment</button></form><form action={reportPost} className="report-post-form"><input type="hidden" name="post_id" value={post.id}/><select name="reason" aria-label="Report this group post"><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="inappropriate">Inappropriate</option><option value="other">Other</option></select><button className="text-action muted-action" type="submit">Report post</button></form>{(manager||post.author_id===user.id)&&<form action={deleteGroupPost} className="delete-post-form"><input type="hidden" name="group_id" value={id}/><input type="hidden" name="post_id" value={post.id}/><button className="text-action muted-action" type="submit">Delete your post</button></form>}</article>})}</div>}</>:<section className="module-section"><span className="eyebrow">Group access</span><h2>{membership?.status==="pending"?"Your request is pending":group.join_policy==="invite"?"Invitation required":"Join this community"}</h2><p>{membership?.status==="pending"?"A group manager will review your request.":group.join_policy==="invite"?"This group is invitation-only. Contact a group manager for access.":"Join to read conversations and share updates with members."}</p>{!membership&&group.join_policy!=="invite"&&<form action={joinGroup}><input type="hidden" name="group_id" value={id}/><button className="btn btn-primary" type="submit">{group.visibility==="private"?"Request to join":"Join group"}</button></form>}<Link href="/home/groups" className="text-action">Back to group directory</Link></section>}
 {group.rules&&<section className="module-section"><span className="eyebrow">Community guidelines</span><h2>Group rules</h2><p className="rules-text">{group.rules}</p></section>}
 </div></section></main>;
}
