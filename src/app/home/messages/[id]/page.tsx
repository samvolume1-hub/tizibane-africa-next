import { CommunityNavigation } from "@/components/community-navigation";
import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {signOut} from "../../../auth-actions";
import {sendDirectMessage} from "../../message-actions";
type Conversation={id:string;created_by:string;created_at:string;title:string|null;is_group:boolean};
type Member={user_id:string};
type Message={id:string;sender_id:string;body:string;created_at:string};
type Profile={id:string;display_name:string;handle:string|null;initials:string;avatar_color:string;avatar_path:string|null};
export default async function ConversationPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string}>}){
 const [{id},notice]=await Promise.all([params,searchParams]);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))redirect("/home/messages");
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:conversationData}=await supabase.from("conversations").select("id,created_by,created_at,title,is_group").eq("id",id).eq("is_group",false).maybeSingle();
 if(!conversationData)redirect("/home/messages");
 const conversation=conversationData as Conversation;
 const {data:memberRows}=await supabase.from("conversation_members").select("user_id").eq("conversation_id",id);
 const members=(memberRows??[]) as Member[];
 if(!members.some(m=>m.user_id===user.id))redirect("/home/messages");
 const otherId=members.find(m=>m.user_id!==user.id)?.user_id;
 if(!otherId)redirect("/home/messages");
 const [profileResult,messageResult]=await Promise.all([
  supabase.from("profiles").select("id,display_name,handle,initials,avatar_color,avatar_path").eq("id",otherId).maybeSingle(),
  supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id",id).order("created_at",{ascending:true}).limit(100)
 ]);
 const profile=profileResult.data as Profile|null,messages=(messageResult.data??[]) as Message[];
 let avatarUrl:string|null=null;if(profile?.avatar_path){const {data}=await supabase.storage.from("community-photos").createSignedUrl(profile.avatar_path,3600);avatarUrl=data?.signedUrl??null}
 return <main className="app-layout"><CommunityNavigation active="messages" />
 <section className="app-main"><header className="topbar"><Link href="/home/messages" className="back-link">← Inbox</Link><Link href={"/home/messages/"+id} className="muted">REFRESH CONVERSATION</Link></header><div className="app-content"><section className="conversation-heading"><div className="person-identity">{avatarUrl?<img src={avatarUrl} alt="" className="person-avatar"/>:<div className="person-avatar person-avatar-fallback" style={{background:profile?.avatar_color||undefined}}>{profile?.initials||"TZ"}</div>}<div><span className="eyebrow">Private conversation</span><h1>{profile?.display_name||"TIZIBANE member"}</h1><span>{profile?.handle?"@"+profile.handle:"Connected friend"}</span></div></div></section>
 {notice.error&&<div className="notice" role="alert">{notice.error}</div>}
 {messageResult.error?<div className="module"><h3>Messages could not be loaded</h3><p>Please refresh in a moment.</p></div>:messages.length===0?<div className="empty-state"><div className="empty-symbol">✉</div><h3>Say hello.</h3><p>This is the beginning of your private conversation.</p></div>:<div className="message-thread">{messages.map(m=><article className={"message-bubble "+(m.sender_id===user.id?"message-own":"message-theirs")} key={m.id}><p>{m.body}</p><span>{m.sender_id===user.id?"You":profile?.display_name||"Member"} · {new Date(m.created_at).toLocaleString("en-ZM",{dateStyle:"short",timeStyle:"short"})}</span></article>)}</div>}
 <section className="message-composer"><form action={sendDirectMessage}><input type="hidden" name="conversation_id" value={id}/><label className="sr-only" htmlFor="message-body">Write a message</label><textarea id="message-body" name="body" maxLength={4000} rows={3} placeholder="Write a private message..." required/><button className="btn btn-primary" type="submit">Send message</button></form><p className="field-help">Text-only private messages. Keep personal information safe and report anything concerning.</p></section>
 </div></section></main>;
}
