import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "../../auth-actions";

type Conversation={id:string;created_at:string};
type Member={conversation_id:string;user_id:string};
type Message={id:string;conversation_id:string;sender_id:string;body:string;created_at:string};
type Profile={id:string;display_name:string;handle:string|null;initials:string;avatar_color:string;avatar_path:string|null};
export default async function MessagesPage({searchParams}:{searchParams:Promise<{error?:string}>}){
 const params=await searchParams,supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:myRows,error:memberError}=await supabase.from("conversation_members").select("conversation_id").eq("user_id",user.id);
 const ids=(myRows??[]).map(m=>m.conversation_id);let conversations:Conversation[]=[],members:Member[]=[],messages:Message[]=[];
 if(ids.length){
  const [conversationResult,memberResult,messageResult]=await Promise.all([
   supabase.from("conversations").select("id,created_at").eq("is_group",false).in("id",ids).order("created_at",{ascending:false}),
   supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id",ids).neq("user_id",user.id),
   supabase.from("messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id",ids).order("created_at",{ascending:false}).limit(100)
  ]);
  conversations=(conversationResult.data??[]) as Conversation[];members=(memberResult.data??[]) as Member[];messages=(messageResult.data??[]) as Message[];
 }
 const otherIds=[...new Set(members.map(m=>m.user_id))];let profiles:Profile[]=[];
 if(otherIds.length){const {data}=await supabase.from("profiles").select("id,display_name,handle,initials,avatar_color,avatar_path").in("id",otherIds);profiles=(data??[]) as Profile[]}
 const profileById=new Map(profiles.map(p=>[p.id,p])),otherByConversation=new Map(members.map(m=>[m.conversation_id,m.user_id])),lastByConversation=new Map<string,Message>();
 for(const m of messages){if(!lastByConversation.has(m.conversation_id))lastByConversation.set(m.conversation_id,m)}
 const avatarUrls:Record<string,string>={};for(const p of profiles){if(!p.avatar_path)continue;const {data}=await supabase.storage.from("community-photos").createSignedUrl(p.avatar_path,3600);if(data?.signedUrl)avatarUrls[p.id]=data.signedUrl}
 return <main className="app-layout"><aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">T</span><span>TIZIBANE<small>AFRICA</small></span></Link><nav className="side-nav" aria-label="Main navigation"><Link href="/home"><span className="nav-icon">⌂</span>Home</Link><Link href="/home/profile"><span className="nav-icon">◎</span>My profile</Link><Link href="/home/people"><span className="nav-icon">♧</span>People</Link><Link href="/home/messages" className="active"><span className="nav-icon">✉</span>Messages</Link><Link href="/home/notifications"><span className="nav-icon">♢</span>Notifications</Link><Link href="/home/blocked"><span className="nav-icon">⊘</span>Blocked</Link><Link href="/home/groups"><span className="nav-icon">◈</span>Groups</Link><Link href="/home/events"><span className="nav-icon">◇</span>Events</Link></nav><form action={signOut} className="sidebar-signout"><button className="btn" style={{width:"100%"}}>Sign out</button></form></aside>
 <section className="app-main"><header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">PRIVATE MESSAGES</span></header><div className="app-content"><section className="welcome"><span className="eyebrow">One-to-one conversations</span><h1>Your conversations.</h1><p>Private text messages with members you have connected with as friends.</p></section>
 {params.error&&<div className="notice" role="alert">{params.error}</div>}
 {memberError?<div className="module"><h3>Messages are temporarily unavailable</h3><p>Please refresh in a moment.</p></div>:conversations.length===0?<div className="empty-state"><div className="empty-symbol">✉</div><h3>Your inbox is ready.</h3><p>Visit People, connect with a member and choose Message to start a private conversation.</p><Link href="/home/people" className="btn btn-primary">Find people</Link></div>:<div className="conversation-list">{conversations.map(c=>{const otherId=otherByConversation.get(c.id),p=otherId?profileById.get(otherId):undefined,last=lastByConversation.get(c.id);return <Link href={"/home/messages/"+c.id} className="conversation-card" key={c.id}><div className="person-identity">{otherId&&avatarUrls[otherId]?<img src={avatarUrls[otherId]} alt="" className="person-avatar"/>:<div className="person-avatar person-avatar-fallback">{p?.initials||"TZ"}</div>}<div><strong>{p?.display_name||"TIZIBANE member"}</strong><span>{p?.handle?"@"+p.handle:"Private conversation"}</span><p>{last?(last.sender_id===user.id?"You: ":"")+last.body:"No messages yet."}</p></div></div><span className="conversation-time">{last?new Date(last.created_at).toLocaleDateString("en-ZM",{month:"short",day:"numeric"}):new Date(c.created_at).toLocaleDateString("en-ZM",{month:"short",day:"numeric"})}</span></Link>})}</div>}
 </div></section></main>;
}
