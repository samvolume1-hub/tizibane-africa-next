import { CommunityNavigation } from "@/components/community-navigation";
import { PendingIconButton } from "@/components/pending-icon-button";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createGroup,joinGroup,leaveGroup,moderateGroupRequest} from "../group-actions";
import {signOut} from "../../auth-actions";
import {CreateGroupForm} from "./create-group-form";
import styles from "./create-group-form.module.css";
import editorial from "./groups-editorial.module.css";
type Group={id:string;owner_id:string;name:string;description:string;category:string;visibility:"public"|"private";join_policy:"open"|"approval"|"invite";rules:string;cover_path:string|null;created_at:string};
type Membership={group_id:string;role:string;status:string};
type Pending={group_id:string;user_id:string};
type Profile={id:string;display_name:string;handle:string|null};
export default async function GroupsPage({searchParams}:{searchParams:Promise<{error?:string;created?:string;joined?:string;requested?:string;left?:string;managed?:string;q?:string;category?:string}>}){
 const params=await searchParams,supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const [groupResult,membershipResult,ownedResult]=await Promise.all([
  supabase.from("groups").select("id,owner_id,name,description,category,visibility,join_policy,rules,cover_path,created_at").order("created_at",{ascending:false}).limit(60),
  supabase.from("group_members").select("group_id,role,status").eq("user_id",user.id),
  supabase.from("groups").select("id,owner_id,name,description,category,visibility,join_policy,rules,cover_path,created_at").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(100)
 ]);
 const error=groupResult.error;let memberships=(membershipResult.data??[]) as Membership[];
 const baseGroups=(groupResult.data??[]) as Group[],ownedGroups=(ownedResult.data??[]) as Group[];
 const knownIds=new Set([...baseGroups,...ownedGroups].map(g=>g.id)),missingMemberIds=[...new Set(memberships.map(m=>m.group_id))].filter(id=>!knownIds.has(id));
 const {data:memberGroups}=missingMemberIds.length?await supabase.from("groups").select("id,owner_id,name,description,category,visibility,join_policy,rules,cover_path,created_at").in("id",missingMemberIds):{data:[]};
 const groupByUniqueId=new Map([...baseGroups,...ownedGroups,...((memberGroups??[]) as Group[])].map(g=>[g.id,g]));
 const groups=[...groupByUniqueId.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)),ids=groups.map(g=>g.id);
 const {data:memberCountRows}=ids.length?await supabase.from("group_members").select("group_id").in("group_id",ids).eq("status","active"):{data:[]};
 const memberCounts=new Map<string,number>();for(const row of memberCountRows??[])memberCounts.set(row.group_id,(memberCounts.get(row.group_id)??0)+1);
 const fallbackGroupImage=(category:string)=>{const c=category.toLowerCase();if(/sport|football/.test(c))return "/images/2. Sports Feed.jpg";if(/business|professional|career/.test(c))return "/images/5. Learn Online Trading.jpg";if(/travel|tour/.test(c))return "/images/EVENTS.jpg";if(/education|learn|school/.test(c))return "/images/always%20find%20something%20new.jpg";if(/music/.test(c))return "/images/1. Music Reviews.jpg";return "/images/connct%20with%20friends.jpg"};
 const coverPaths=[...new Set(groups.map(g=>g.cover_path).filter((path):path is string=>Boolean(path)))];
 const {data:signedCovers}=coverPaths.length?await supabase.storage.from("community-photos").createSignedUrls(coverPaths,3600):{data:[]};
 const coverUrlByPath=new Map((signedCovers??[]).map(item=>[item.path,item.signedUrl]));
 const memberByGroup=new Map(memberships.map(m=>[m.group_id,m])),managedIds=groups.filter(g=>g.owner_id===user.id||(memberByGroup.get(g.id)?.status==="active"&&["owner","moderator"].includes(memberByGroup.get(g.id)?.role??""))).map(g=>g.id);
 const myGroups=groups.filter(g=>g.owner_id===user.id||memberByGroup.get(g.id)?.status==="active");
 const discoverGroups=groups.filter(g=>g.owner_id!==user.id&&memberByGroup.get(g.id)?.status!=="active");
 const query=(params.q??"").trim().slice(0,80),selectedCategory=(params.category??"").trim().slice(0,60);
 const categories=[...new Set(discoverGroups.map(g=>g.category?.trim()).filter((value):value is string=>Boolean(value)))].sort((a,b)=>a.localeCompare(b));
 const filteredGroups=discoverGroups.filter(g=>(!selectedCategory||g.category===selectedCategory)&&(!query||[g.name,g.description,g.category].some(value=>value?.toLocaleLowerCase().includes(query.toLocaleLowerCase()))));
 let pending:Pending[]=[];if(managedIds.length){const {data}=await supabase.from("group_members").select("group_id,user_id").in("group_id",managedIds).eq("status","pending");pending=(data??[]) as Pending[]}
 const pendingIds=[...new Set(pending.map(p=>p.user_id))];let pendingProfiles:Profile[]=[];if(pendingIds.length){const {data}=await supabase.from("profiles").select("id,display_name,handle").in("id",pendingIds);pendingProfiles=(data??[]) as Profile[]}
 const profileById=new Map(pendingProfiles.map(p=>[p.id,p])),groupById=new Map(groups.map(g=>[g.id,g]));
 return <main className={`app-layout groups-page ${styles.scope} ${editorial.editorial}`}><CommunityNavigation active="groups" /><section className="app-main"><header className="topbar"><Link href="/home" className="back-link">← Home</Link><span className="muted">TIZIBANE GROUPS</span></header><div className="app-content"><section className={editorial.editorialHero} aria-labelledby="groups-title">
  <div className={editorial.editorialIntro}>
   <span className={editorial.kicker}>TIZIBANE GROUPS</span>
   <h1 id="groups-title">Our Groups</h1>
   <p>Find and join groups that match your interests and passions.</p>
   <div className={editorial.heroActions}><a className={editorial.createAction} href="#create-group">✦ &nbsp; Create a Group</a><a className={editorial.exploreAction} href="#discover-groups">⌕ &nbsp; Explore Groups</a></div>
  </div>
  <div className={editorial.editorialMainImage}><img src="/images/connct%20with%20friends.jpg" alt="Friends enjoying time together" fetchPriority="high"/></div>
 </section>
 {params.error&&<div className="notice" role="alert">{params.error}</div>}{params.created&&<div className="notice" role="status">Your group has been created. You are its owner.</div>}{params.joined&&<div className="notice" role="status">You have joined the group.</div>}{params.requested&&<div className="notice" role="status">Your request has been sent to the group managers.</div>}{params.left&&<div className="notice" role="status">You have left the group.</div>}{params.managed&&<div className="notice" role="status">The membership request has been updated.</div>}
 
 {pending.length>0&&<section className="module-section"><div className="section-title-row"><div><span className="eyebrow">Manager tools</span><h2>Membership requests</h2></div></div><div className="request-list">{pending.map(req=>{const g=groupById.get(req.group_id),p=profileById.get(req.user_id);return <article className="request-row" key={req.group_id+req.user_id}><div><strong>{p?.display_name||"Member"}</strong><span>Requested to join {g?.name||"your group"}</span></div><div className="inline-actions"><form action={moderateGroupRequest}><input type="hidden" name="group_id" value={req.group_id}/><input type="hidden" name="member_id" value={req.user_id}/><input type="hidden" name="decision" value="approve"/><PendingIconButton className="text-action" label="Approve group request" pendingLabel="Approving…">Approve</PendingIconButton></form><form action={moderateGroupRequest}><input type="hidden" name="group_id" value={req.group_id}/><input type="hidden" name="member_id" value={req.user_id}/><input type="hidden" name="decision" value="decline"/><PendingIconButton className="text-action muted-action" label="Decline group request" pendingLabel="Declining…">Decline</PendingIconButton></form></div></article>})}</div></section>}
 <section className="groups-my-section">
  <div className="feed-heading"><div><span className="eyebrow">YOUR GROUPS</span><h2>My Groups</h2></div><span className="muted">{myGroups.length} joined</span></div>
  {myGroups.length===0?<div className="empty-state"><div className="empty-symbol">✦</div><h3>Your circles will live here.</h3><p>Join a group or create one to build your own community space.</p></div>:<div className="group-grid">{myGroups.map(g=>{const m=memberByGroup.get(g.id);return <article className="group-card" key={g.id}><div className={editorial.discoverCover}><img src={g.cover_path&&coverUrlByPath.get(g.cover_path)?coverUrlByPath.get(g.cover_path)!:fallbackGroupImage(g.category||"")} alt="" loading="lazy" decoding="async"/></div><div className="group-card-top"><span className="group-category">{g.category||"Community"}</span><span className="group-privacy">{g.visibility==="private"?"Private":"Public"}</span></div><h3><Link href={"/home/groups/"+g.id}>{g.name}</Link></h3><p>{g.description||"A place for members to connect and share."}</p><div className="group-meta">{memberCounts.get(g.id)??0} members</div><div className="group-card-actions"><Link href={"/home/groups/"+g.id} className="text-action">Open group →</Link></div></article>})}</div>}
 </section>
 <section className="groups-discovery-section" id="discover-groups">
  <div className="feed-heading"><div><span className="eyebrow">FIND YOUR NEXT CIRCLE</span><h2>Discover Groups</h2></div><span className="muted">{filteredGroups.length} of {discoverGroups.length} groups</span></div>
  <form className="groups-discovery-toolbar" method="get" action="/home/groups">
   <label className="groups-search-label" htmlFor="groups-search">Search groups</label>
   <div className="groups-search-row"><input id="groups-search" name="q" type="search" defaultValue={query} maxLength={80} placeholder="Search TIZIBANE Groups…"/><select name="category" aria-label="Filter groups by category" defaultValue={selectedCategory}><option value="">All categories</option>{categories.map(category=><option key={category} value={category}>{category}</option>)}</select><button className="btn btn-primary" type="submit">Search</button></div>
  </form>
  {categories.length>0&&<nav className="groups-category-chips" aria-label="Group categories"><Link href={query?"/home/groups?q="+encodeURIComponent(query):"/home/groups"} aria-current={!selectedCategory?"page":undefined}>All</Link>{categories.map(category=><Link key={category} href={"/home/groups?"+(query?"q="+encodeURIComponent(query)+"&":"")+"category="+encodeURIComponent(category)} aria-current={selectedCategory===category?"page":undefined}>{category}</Link>)}</nav>}
  {error?<div className="module"><h3>Groups are temporarily unavailable</h3><p>Please refresh in a moment.</p></div>:discoverGroups.length===0?<div className="empty-state"><div className="empty-symbol">◈</div><h3>Be the first to start a circle.</h3><p>There are no other groups yet. Create one and invite people to join.</p></div>:filteredGroups.length===0?<div className="empty-state"><div className="empty-symbol">⌕</div><h3>No groups match that search.</h3><p>Try another name or choose a different category.</p><Link href="/home/groups" className="text-action">Clear filters</Link></div>:<div className="group-grid">{filteredGroups.map(g=>{const m=memberByGroup.get(g.id);return <article className="group-card" key={g.id}><div className={editorial.discoverCover}><img src={g.cover_path&&coverUrlByPath.get(g.cover_path)?coverUrlByPath.get(g.cover_path)!:fallbackGroupImage(g.category||"")} alt="" loading="lazy" decoding="async"/></div><div className="group-card-top"><span className="group-category">{g.category||"Community"}</span><span className="group-privacy">{g.visibility==="private"?"Private":"Public"}</span></div><h3><Link href={"/home/groups/"+g.id}>{g.name}</Link></h3><p>{g.description||"A place for members to connect and share."}</p><div className="group-meta">{memberCounts.get(g.id)??0} members · {g.join_policy==="invite"?"Invite only":g.join_policy==="approval"?"Approval required":"Open to join"}</div><div className="group-card-actions">{m?.status==="pending"?<span className="member-state pending-state">Request pending</span>:g.join_policy==="invite"?<span className="member-state">Invitation required</span>:<form action={joinGroup}><input type="hidden" name="group_id" value={g.id}/><PendingIconButton className="btn btn-primary" label={g.visibility==="private"?"Request to join group":"Join group"} pendingLabel="Joining…">{g.visibility==="private"?"Request to join":"Join group"}</PendingIconButton></form>}</div></article>})}</div>}
 </section><div className="create-group-section" id="create-group"><CreateGroupForm action={createGroup}/></div></div></section></main>;
}
