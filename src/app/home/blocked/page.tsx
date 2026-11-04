import { RoyaltyCopyright } from "@/components/royalty-copyright";
import { Brand } from "@/components/brand";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "../../auth-actions";
import {unblockMember} from "../safety-actions";
type Block={blocked_id:string;created_at:string};
type Profile={id:string;display_name:string;handle:string|null;initials:string;avatar_color:string;avatar_path:string|null};
export default async function BlockedMembersPage({searchParams}:{searchParams:Promise<{error?:string;status?:string}>}){
 const params=await searchParams,supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:rows,error}=await supabase.from("blocked_users").select("blocked_id,created_at").eq("blocker_id",user.id).order("created_at",{ascending:false});
 const blocks=(rows??[]) as Block[],ids=blocks.map(b=>b.blocked_id);let profiles:Profile[]=[];
 if(ids.length){const {data}=await supabase.from("profiles").select("id,display_name,handle,initials,avatar_color,avatar_path").in("id",ids);profiles=(data??[]) as Profile[]}
 const profileById=new Map(profiles.map(p=>[p.id,p])),avatarUrls:Record<string,string>={};
 for(const p of profiles){if(!p.avatar_path)continue;const {data}=await supabase.storage.from("community-photos").createSignedUrl(p.avatar_path,3600);if(data?.signedUrl)avatarUrls[p.id]=data.signedUrl}
 return <main className="app-layout"><aside className="sidebar"><Brand /><nav className="side-nav" aria-label="Main navigation"><Link href="/home"><span className="nav-icon">⌂</span>Home</Link><Link href="/home/profile"><span className="nav-icon">◎</span>My profile</Link><Link href="/home/people"><span className="nav-icon">♧</span>People</Link><Link href="/home/messages"><span className="nav-icon">✉</span>Messages</Link><Link href="/home/notifications"><span className="nav-icon">♢</span>Notifications</Link><Link href="/home/groups"><span className="nav-icon">◈</span>Groups</Link><Link href="/home/events"><span className="nav-icon">◇</span>Events</Link><Link href="/home/blocked" className="active"><span className="nav-icon">⊘</span>Blocked</Link></nav><form action={signOut} className="sidebar-signout"><button className="btn" style={{width:"100%"}}>Sign out</button></form></aside>
 <section className="app-main"><header className="topbar"><Link href="/home/people" className="back-link">← People</Link><span className="muted">PRIVACY & SAFETY</span></header><div className="app-content"><section className="welcome"><span className="eyebrow">Your safety controls</span><h1>Blocked members.</h1><p>People you block cannot see your profile or private content, start new connections or access private conversations with you.</p></section>
 {params.error&&<div className="notice" role="alert">{params.error}</div>}{params.status&&<div className="notice" role="status">{params.status}</div>}
 {error?<div className="module"><h3>Blocked members could not be loaded</h3><p>Please refresh in a moment.</p></div>:blocks.length===0?<div className="empty-state"><div className="empty-symbol">⊘</div><h3>No blocked members.</h3><p>Members you block will appear here, and you can unblock them whenever you choose.</p></div>:<div className="people-list">{blocks.map(b=>{const p=profileById.get(b.blocked_id);return <article className="person-card" key={b.blocked_id}><div className="person-identity">{avatarUrls[b.blocked_id]?<img src={avatarUrls[b.blocked_id]} alt="" className="person-avatar"/>:<div className="person-avatar person-avatar-fallback">{p?.initials||"TZ"}</div>}<div><strong>{p?.display_name||"Blocked member"}</strong><span>{p?.handle?"@"+p.handle:"Blocked on "+new Date(b.created_at).toLocaleDateString("en-ZM")}</span></div></div><form action={unblockMember}><input type="hidden" name="member_id" value={b.blocked_id}/><button className="btn" type="submit">Unblock</button></form></article>})}</div>}
 <RoyaltyCopyright /></div></section></main>;
}
