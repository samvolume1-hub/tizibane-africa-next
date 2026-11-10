import { CommunityNavigation } from "@/components/community-navigation";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "../../auth-actions";
import {sendFriendRequest,respondFriendRequest,cancelFriendRequest,endFriendship,toggleFollow} from "../people-actions";
import {startDirectMessage} from "../message-actions";
import {blockMember} from "../safety-actions";
import {toggleMemberPreference} from "../member-preference-actions";
import { ReportControl } from "../report-control";
import { PendingIconButton } from "@/components/pending-icon-button";

type Profile={id:string;handle:string|null;display_name:string;bio:string;location:string;avatar_path:string|null;cover_path:string|null;avatar_color:string;initials:string};
type Friendship={id:string;requester_id:string;recipient_id:string;status:string};
type Follow={followed_id:string};
function safeSearch(value:string){return value.slice(0,50).replace(/[^a-zA-Z0-9_ -]/g,"").trim();}
export default async function PeoplePage({searchParams}:{searchParams:Promise<{q?:string;status?:string;error?:string}>}){
 const params=await searchParams,q=safeSearch(params.q??""),supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 let profileQuery=supabase.from("profiles").select("id,handle,display_name,bio,location,avatar_path,cover_path,avatar_color,initials").neq("id",user.id).order("display_name",{ascending:true}).limit(80);
 if(q)profileQuery=profileQuery.or("display_name.ilike.%"+q+"%,handle.ilike.%"+q+"%");
 const [profileResult,friendResult,followResult,blockedResult,preferenceResult]=await Promise.all([
  profileQuery,
  supabase.from("friendships").select("id,requester_id,recipient_id,status").or("requester_id.eq."+user.id+",recipient_id.eq."+user.id),
  supabase.from("follows").select("followed_id").eq("follower_id",user.id),
  supabase.from("blocked_users").select("blocked_id").eq("blocker_id",user.id),
  supabase.from("member_preferences").select("member_id,muted,best_friend").eq("owner_id",user.id),
 ]);
 const blockedIds=new Set((blockedResult.data??[]).map(b=>b.blocked_id));
 const preferences=new Map((preferenceResult.data??[]).map(p=>[p.member_id,p]));
 const profiles=((profileResult.data??[]) as Profile[]).filter(p=>!blockedIds.has(p.id)),friendships=(friendResult.data??[]) as Friendship[],follows=(followResult.data??[]) as Follow[];
 const incoming=friendships.filter(f=>f.recipient_id===user.id&&f.status==="pending");
 const missingIds=incoming.map(f=>f.requester_id).filter(id=>!profiles.some(p=>p.id===id));
 let incomingProfiles:Profile[]=[];
 if(missingIds.length){const {data}=await supabase.from("profiles").select("id,handle,display_name,bio,location,avatar_path,cover_path,avatar_color,initials").in("id",missingIds);incomingProfiles=(data??[]) as Profile[]}
 const allProfiles=[...profiles,...incomingProfiles],profileById=new Map(allProfiles.map(p=>[p.id,p]));
 const followSet=new Set(follows.map(f=>f.followed_id));
 const friendByMember=new Map<string,Friendship>();
 for(const f of friendships){const other=f.requester_id===user.id?f.recipient_id:f.requester_id;friendByMember.set(other,f)}
 const avatarUrls:Record<string,string>={},coverUrls:Record<string,string>={};
 // Batch signed-URL creation into at most two Storage requests instead of
 // making one or two sequential requests for every member in the directory.
 const avatarProfiles=allProfiles.filter(p=>p.avatar_path);
 const coverProfiles=allProfiles.filter(p=>p.cover_path);
 const [avatarResult,coverResult]=await Promise.all([
  avatarProfiles.length
   ?supabase.storage.from("community-photos").createSignedUrls(avatarProfiles.map(p=>p.avatar_path!),3600)
   :Promise.resolve({data:[]}),
  coverProfiles.length
   ?supabase.storage.from("community-photos").createSignedUrls(coverProfiles.map(p=>p.cover_path!),3600)
   :Promise.resolve({data:[]}),
 ]);
 const avatarUrlByPath=new Map((avatarResult.data??[]).map(item=>[item.path,item.signedUrl]));
 const coverUrlByPath=new Map((coverResult.data??[]).map(item=>[item.path,item.signedUrl]));
 for(const p of avatarProfiles){const url=avatarUrlByPath.get(p.avatar_path!);if(url)avatarUrls[p.id]=url}
 for(const p of coverProfiles){const url=coverUrlByPath.get(p.cover_path!);if(url)coverUrls[p.id]=url}
 return <main className="app-layout"><CommunityNavigation active="people" />
 <section className="app-main"><header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">MEMBER DIRECTORY</span></header><div className="app-content">
 <section className="people-search-panel people-hero-search" aria-labelledby="find-people-title"><h1 id="find-people-title">Find people</h1><h2 id="find-friends-title">Find friends on TIZIBANE</h2><form method="get" className="people-search"><div className="field"><label htmlFor="people-query">Search friends and members</label><input id="people-query" name="q" defaultValue={q} maxLength={50} placeholder="Type a name or username…"/></div><button className="btn btn-primary" type="submit">Search people</button>{q&&<Link className="text-action" href="/home/people">Clear search</Link>}</form></section>
 {params.error&&<div className="notice" role="alert">{params.error}</div>}{params.status&&<div className="notice" role="status">{params.status}</div>}
 {incoming.length>0&&<section className="module-section"><div className="section-title-row"><div><span className="eyebrow">Your inbox</span><h2>Friend requests</h2></div><span className="muted">{incoming.length} waiting</span></div><div className="people-list">{incoming.map(f=>{const p=profileById.get(f.requester_id);return <article className="person-card" key={f.id}><div className="person-identity">{avatarUrls[f.requester_id]?<img src={avatarUrls[f.requester_id]} alt="" className="person-avatar"/>:<div className="person-avatar person-avatar-fallback">{p?.initials||"TZ"}</div>}<div><strong>{p?.display_name||"TIZIBANE member"}</strong><span>{p?.handle?"@"+p.handle:"Member"}</span></div></div><div className="person-actions"><form action={respondFriendRequest}><input type="hidden" name="friendship_id" value={f.id}/><input type="hidden" name="response" value="accepted"/><input type="hidden" name="query" value={q}/><PendingIconButton className="btn btn-primary" label="Accept friend request" pendingLabel="Accepting…">Accept</PendingIconButton></form><form action={respondFriendRequest}><input type="hidden" name="friendship_id" value={f.id}/><input type="hidden" name="response" value="declined"/><input type="hidden" name="query" value={q}/><PendingIconButton className="text-action muted-action" label="Decline friend request" pendingLabel="Declining…">Decline</PendingIconButton></form></div></article>})}</div></section>}
 <div className="feed-heading"><div><span className="eyebrow">Explore</span><h2>{q?"Search results":"People you may know"}</h2></div><span className="muted">{profiles.length} members</span></div>
 {profileResult.error||friendResult.error||followResult.error||blockedResult.error?<div className="module"><h3>Member directory is temporarily unavailable</h3><p>Please refresh in a moment.</p></div>:profiles.length===0?<div className="empty-state"><div className="empty-symbol">♧</div><h3>No members found.</h3><p>Try another name or handle, or come back as more people join TIZIBANE.</p></div>:<div className="people-list">{profiles.map(p=>{const friendship=friendByMember.get(p.id),incomingRequest=friendship?.status==="pending"&&friendship.recipient_id===user.id,outgoingRequest=friendship?.status==="pending"&&friendship.requester_id===user.id,areFriends=friendship?.status==="accepted";return <article className="person-card person-card-with-cover" key={p.id}>{coverUrls[p.id]?<img className="person-cover-image" src={coverUrls[p.id]} alt="" />:<div className="person-cover-placeholder" aria-hidden="true" />}<div className="person-identity">{avatarUrls[p.id]?<img src={avatarUrls[p.id]} alt="" className="person-avatar"/>:<div className="person-avatar person-avatar-fallback" style={{background:p.avatar_color||undefined}}>{p.initials||"TZ"}</div>}<div className="person-copy"><strong>{p.display_name}</strong><span>{p.handle?"@"+p.handle:"TIZIBANE member"}{p.location?" · "+p.location:""}</span>{p.bio&&<p>{p.bio}</p>}</div></div><div className="person-actions">{areFriends?<><span className="member-state">Friends</span><form action={startDirectMessage}><input type="hidden" name="recipient_id" value={p.id}/><PendingIconButton className="text-action" label="Message member" pendingLabel="Opening…">Message</PendingIconButton></form><form action={endFriendship}><input type="hidden" name="friendship_id" value={friendship!.id}/><input type="hidden" name="query" value={q}/><PendingIconButton className="text-action muted-action" label="Remove friend" pendingLabel="Updating…">Remove friend</PendingIconButton></form></>:incomingRequest?<span className="member-state pending-state">Request received above</span>:outgoingRequest?<><span className="member-state pending-state">Request sent</span><form action={cancelFriendRequest}><input type="hidden" name="friendship_id" value={friendship!.id}/><input type="hidden" name="query" value={q}/><PendingIconButton className="text-action muted-action" label="Cancel friend request" pendingLabel="Cancelling…">Cancel</PendingIconButton></form></>:!friendship?<form action={sendFriendRequest}><input type="hidden" name="member_id" value={p.id}/><input type="hidden" name="query" value={q}/><PendingIconButton className="btn btn-primary" label="Add friend" pendingLabel="Sending…">Add friend</PendingIconButton></form>:<span className="member-state">Not connected</span>}<form action={toggleFollow}><input type="hidden" name="member_id" value={p.id}/><input type="hidden" name="query" value={q}/><PendingIconButton className="text-action" label={followSet.has(p.id)?"Unfollow member":"Follow member"} pendingLabel="Updating…" pressed={followSet.has(p.id)}>{followSet.has(p.id)?"Following · Unfollow":"＋ Follow"}</PendingIconButton></form><form action={toggleMemberPreference}><input type="hidden" name="member_id" value={p.id}/><input type="hidden" name="preference" value="muted"/><input type="hidden" name="enabled" value={String(!preferences.get(p.id)?.muted)}/><PendingIconButton className="text-action muted-action" label={preferences.get(p.id)?.muted?"Unmute member":"Mute member"} pendingLabel="Updating…" pressed={Boolean(preferences.get(p.id)?.muted)}>{preferences.get(p.id)?.muted?"Unmute":"Mute"}</PendingIconButton></form><form action={toggleMemberPreference}><input type="hidden" name="member_id" value={p.id}/><input type="hidden" name="preference" value="best_friend"/><input type="hidden" name="enabled" value={String(!preferences.get(p.id)?.best_friend)}/><PendingIconButton className="text-action" label="Toggle best friend" pendingLabel="Updating…" pressed={Boolean(preferences.get(p.id)?.best_friend)}>{preferences.get(p.id)?.best_friend?"★ Best friend":"☆ Best friend"}</PendingIconButton></form><form action={blockMember}><input type="hidden" name="member_id" value={p.id}/><PendingIconButton className="text-action muted-action" label="Block member" pendingLabel="Blocking…">Block</PendingIconButton></form><ReportControl kind="member" targetId={p.id} displayName={p.display_name} /></div></article>})}</div>}
 </div></section></main>;
}
