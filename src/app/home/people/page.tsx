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
 // Sign member images concurrently. Sequential storage requests made the directory
 // wait for up to two network round-trips per member, which is especially costly
 // on mobile connections.
 const signedImageResults=await Promise.all(allProfiles.map(async p=>{
  const [avatarResult,coverResult]=await Promise.all([
   p.avatar_path?supabase.storage.from("community-photos").createSignedUrl(p.avatar_path,3600):Promise.resolve({data:null}),
   p.cover_path?supabase.storage.from("community-photos").createSignedUrl(p.cover_path,3600):Promise.resolve({data:null}),
  ]);
  return {id:p.id,avatarUrl:avatarResult.data?.signedUrl,coverUrl:coverResult.data?.signedUrl};
 }));
 for(const item of signedImageResults){
  if(item.avatarUrl)avatarUrls[item.id]=item.avatarUrl;
  if(item.coverUrl)coverUrls[item.id]=item.coverUrl;
 }
 return <main className="app-layout"><CommunityNavigation active="people" />
 <section className="app-main"><header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">MEMBER DIRECTORY</span></header><div className="app-content">
 <section className="welcome"><span className="eyebrow">Find your people</span><h1>Good connections start here.</h1><p>Discover members, build friendships and follow the people and communities you want to keep up with.</p></section>
 {params.error&&<div className="notice" role="alert">{params.error}</div>}{params.status&&<div className="notice" role="status">{params.status}</div>}
 <section className="people-search-panel" aria-labelledby="find-friends-title"><h2 id="find-friends-title">Find friends on TIZIBANE</h2><p>Search the member directory by a person’s name or username, then send a friend request.</p><form method="get" className="people-search"><div className="field"><label htmlFor="people-query">Search friends and members</label><input id="people-query" name="q" defaultValue={q} maxLength={50} placeholder="Type a name or username…"/></div><button className="btn btn-primary" type="submit">Search people</button>{q&&<Link className="text-action" href="/home/people">Clear search</Link>}</form></section>
 {incoming.length>0&&<section className="module-section"><div className="section-title-row"><div><span className="eyebrow">Your inbox</span><h2>Friend requests</h2></div><span className="muted">{incoming.length} waiting</span></div><div className="people-list">{incoming.map(f=>{const p=profileById.get(f.requester_id);return <article className="person-card" key={f.id}><div className="person-identity">{avatarUrls[f.requester_id]?<img src={avatarUrls[f.requester_id]} alt="" className="person-avatar"/>:<div className="person-avatar person-avatar-fallback">{p?.initials||"TZ"}</div>}<div><strong>{p?.display_name||"TIZIBANE member"}</strong><span>{p?.handle?"@"+p.handle:"Member"}</span></div></div><div className="person-actions"><form action={respondFriendRequest}><input type="hidden" name="friendship_id" value={f.id}/><input type="hidden" name="response" value="accepted"/><input type="hidden" name="query" value={q}/><button className="btn btn-primary" type="submit">Accept</button></form><form action={respondFriendRequest}><input type="hidden" name="friendship_id" value={f.id}/><input type="hidden" name="response" value="declined"/><input type="hidden" name="query" value={q}/><button className="text-action muted-action" type="submit">Decline</button></form></div></article>})}</div></section>}
 <div className="feed-heading"><div><span className="eyebrow">Explore</span><h2>{q?"Search results":"People you may know"}</h2></div><span className="muted">{profiles.length} members</span></div>
 {profileResult.error||friendResult.error||followResult.error||blockedResult.error?<div className="module"><h3>Member directory is temporarily unavailable</h3><p>Please refresh in a moment.</p></div>:profiles.length===0?<div className="empty-state"><div className="empty-symbol">♧</div><h3>No members found.</h3><p>Try another name or handle, or come back as more people join TIZIBANE.</p></div>:<div className="people-list">{profiles.map(p=>{const friendship=friendByMember.get(p.id),incomingRequest=friendship?.status==="pending"&&friendship.recipient_id===user.id,outgoingRequest=friendship?.status==="pending"&&friendship.requester_id===user.id,areFriends=friendship?.status==="accepted";return <article className="person-card person-card-with-cover" key={p.id}>{coverUrls[p.id]?<img className="person-cover-image" src={coverUrls[p.id]} alt="" />:<div className="person-cover-placeholder" aria-hidden="true" />}<div className="person-identity">{avatarUrls[p.id]?<img src={avatarUrls[p.id]} alt="" className="person-avatar"/>:<div className="person-avatar person-avatar-fallback" style={{background:p.avatar_color||undefined}}>{p.initials||"TZ"}</div>}<div className="person-copy"><strong>{p.display_name}</strong><span>{p.handle?"@"+p.handle:"TIZIBANE member"}{p.location?" · "+p.location:""}</span>{p.bio&&<p>{p.bio}</p>}</div></div><div className="person-actions">{areFriends?<><span className="member-state">Friends</span><form action={startDirectMessage}><input type="hidden" name="recipient_id" value={p.id}/><button className="text-action" type="submit">Message</button></form><form action={endFriendship}><input type="hidden" name="friendship_id" value={friendship!.id}/><input type="hidden" name="query" value={q}/><button className="text-action muted-action" type="submit">Remove friend</button></form></>:incomingRequest?<span className="member-state pending-state">Request received above</span>:outgoingRequest?<><span className="member-state pending-state">Request sent</span><form action={cancelFriendRequest}><input type="hidden" name="friendship_id" value={friendship!.id}/><input type="hidden" name="query" value={q}/><button className="text-action muted-action" type="submit">Cancel</button></form></>:!friendship?<form action={sendFriendRequest}><input type="hidden" name="member_id" value={p.id}/><input type="hidden" name="query" value={q}/><button className="btn btn-primary" type="submit">Add friend</button></form>:<span className="member-state">Not connected</span>}<form action={toggleFollow}><input type="hidden" name="member_id" value={p.id}/><input type="hidden" name="query" value={q}/><button className="text-action" type="submit">{followSet.has(p.id)?"Following · Unfollow":"＋ Follow"}</button></form><form action={toggleMemberPreference}><input type="hidden" name="member_id" value={p.id}/><input type="hidden" name="preference" value="muted"/><input type="hidden" name="enabled" value={String(!preferences.get(p.id)?.muted)}/><button className="text-action muted-action" type="submit">{preferences.get(p.id)?.muted?"Unmute":"Mute"}</button></form><form action={toggleMemberPreference}><input type="hidden" name="member_id" value={p.id}/><input type="hidden" name="preference" value="best_friend"/><input type="hidden" name="enabled" value={String(!preferences.get(p.id)?.best_friend)}/><button className="text-action" type="submit">{preferences.get(p.id)?.best_friend?"★ Best friend":"☆ Best friend"}</button></form><form action={blockMember}><input type="hidden" name="member_id" value={p.id}/><button className="text-action muted-action" type="submit">Block</button></form><ReportControl kind="member" targetId={p.id} displayName={p.display_name} /></div></article>})}</div>}
 </div></section></main>;
}
