import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
const keys=raw?JSON.parse(raw) as Record<string,string>:{};
const SERVICE_ROLE_KEY=keys.default??Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL="https://tizibane-africa-next.onrender.com/home";
if(!SERVICE_ROLE_KEY) throw new Error("Supabase server secret is not configured.");
type Entry={id:string;recipient_email:string;kind:string;metadata:Record<string,unknown>|null;attempts:number};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
function describe(kind:string,actor:string,m:Record<string,unknown>){
 const context=String(m.group_name??m.event_title??m.title??"").trim().slice(0,120);
 const map:Record<string,{subject:string;heading:string;detail:string}>={
 message:{subject:"You have a new private message",heading:"A new message is waiting",detail:"Open TIZIBANE to read your message privately."},
 friend_request:{subject:actor+" sent you a friend request",heading:"New friend request",detail:actor+" would like to connect with you on TIZIBANE."},
 friend_accepted:{subject:actor+" accepted your friend request",heading:"Friend request accepted",detail:actor+" is now connected with you on TIZIBANE."},
 friend_declined:{subject:"Your friend request has an update",heading:"Friend request update",detail:"There is an update to your friend request."},
 follow:{subject:actor+" is following you",heading:"Someone followed you",detail:actor+" is now following your profile."},
 reaction:{subject:actor+" reacted to your post",heading:"A new reaction",detail:actor+" reacted to something you shared."},
 comment:{subject:actor+" commented on your post",heading:"A new comment",detail:actor+" left a comment on something you shared."},
 group:{subject:"A TIZIBANE group update",heading:"Group update",detail:"There is a new update in one of your TIZIBANE groups."},
 group_join_request:{subject:"A new group membership request",heading:"Group membership request",detail:actor+" requested to join a group you manage."},
 group_join_approved:{subject:"Your group request was approved",heading:"You're in!",detail:"Your request to join a TIZIBANE group was approved."},
 group_join_declined:{subject:"Your group request has an update",heading:"Group request update",detail:"There is an update to your request to join a TIZIBANE group."},
 event:{subject:"A TIZIBANE event update",heading:"Event update",detail:"There is a new update about a community event."},
 event_attendance:{subject:"A community event attendance update",heading:"Event attendance update",detail:actor+" updated an event attendance response."},
 business_ad:{subject:"A new TIZIBANE business advertisement",heading:"Business Hub update",detail:"There is a new business promotion to discover in TIZIBANE."},
 trending_post:{subject:"A post is trending on TIZIBANE",heading:"Trending community post",detail:"A community post is receiving attention. Open TIZIBANE to explore it."}
 };
 return {...(map[kind]??{subject:"You have a new TIZIBANE notification",heading:"A new community update",detail:actor==="TIZIBANE"?"There is a new update from TIZIBANE.":actor+" has a new update for you on TIZIBANE."}),context};
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 const token=req.headers.get("x-tizibane-cron-token");if(!token)return Response.json({error:"Unauthorized"},{status:401});
 const sb=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:authorized,error:authError}=await sb.rpc("validate_spotlight_cron_token",{p_token:token});
 if(authError||authorized!==true)return Response.json({error:"Unauthorized"},{status:401});
 const apiKey=Deno.env.get("BREVO_API_KEY"),senderEmail=Deno.env.get("BREVO_SENDER_EMAIL"),senderName=Deno.env.get("BREVO_SENDER_NAME")??"TIZIBANE Zambia";
 if(!apiKey||!senderEmail)return Response.json({error:"Brevo email delivery is not configured"},{status:503});
 const {data:batch,error:claimError}=await sb.rpc("claim_activity_email_batch",{p_limit:30,p_token:token});
 if(claimError){console.error("[Activity email] claim failed",{code:claimError.code});return Response.json({error:"Queue claim failed"},{status:500});}
 const entries=Array.isArray(batch)?batch as Entry[]:[];let sent=0,failed=0;
 for(const entry of entries){
  let ok=false,failure="Brevo email delivery failed";
  try{
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.recipient_email))throw new Error("Recipient email is invalid");
   const m=entry.metadata??{},actor=String(m.actor_name??"TIZIBANE").trim().slice(0,80)||"TIZIBANE",d=describe(entry.kind,actor,m);
   const contextHtml=d.context?'<p style="margin:12px 0 0;color:#755c80;font-size:13px"><strong>'+esc(d.context)+'</strong></p>':"";
   const textContent=["TIZIBANE ZAMBIA",d.heading,"",d.detail,d.context?"Update: "+d.context:"","","Open TIZIBANE: "+APP_URL,"","Connect. Belong. Grow.","© 2026 TIZIBANE Zambia","You are receiving this email because you have an account on TIZIBANE."].filter(Boolean).join("\n");
   const htmlContent='<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f5f1f8;font-family:Arial,Helvetica,sans-serif;color:#281b32"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="padding:26px 30px;background:#211033;color:#fff"><div style="font-size:24px;font-weight:800;letter-spacing:2px">TIZIBANE</div><div style="margin-top:8px;font-size:11px;letter-spacing:2px;color:#f3c9e4">CONNECT. BELONG. GROW.</div></td></tr><tr><td style="padding:30px"><div style="font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a33a83">YOUR COMMUNITY UPDATE</div><h1 style="font-size:25px;line-height:1.25;margin:12px 0;color:#291638">'+esc(d.heading)+'</h1><p style="font-size:15px;line-height:1.7;color:#51435a">'+esc(d.detail)+'</p>'+contextHtml+'<p style="margin:28px 0"><a href="'+APP_URL+'" style="display:inline-block;padding:13px 22px;background:#54246f;color:#fff;text-decoration:none;border-radius:9px;font-weight:700">OPEN TIZIBANE</a></p><p style="font-size:13px;color:#7b6d82">Stay connected with your friends and communities across Zambia.</p></td></tr><tr><td style="padding:18px 30px;background:#f8f4fa;color:#8b7d91;font-size:11px;line-height:1.6">© 2026 TIZIBANE Zambia<br>A Royalty Uncle Sam creation<br>You are receiving this email because you have an account on TIZIBANE.</td></tr></table></td></tr></table></body></html>';
   const res=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{"api-key":apiKey,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({sender:{name:senderName,email:senderEmail},to:[{email:entry.recipient_email}],subject:d.subject.slice(0,180),textContent,htmlContent,headers:{"X-Tizibane-Notification-Id":entry.id}}),signal:AbortSignal.timeout(20000)});
   if(!res.ok)throw new Error("Brevo API returned "+res.status+": "+(await res.text()).slice(0,250));ok=true;
  }catch(e){failure=e instanceof Error?e.message.slice(0,500):failure;console.error("[Activity email] delivery failed",{queue_id:entry.id,error:failure});}
  const {error:doneError}=await sb.rpc("complete_activity_email",{p_id:entry.id,p_sent:ok,p_error:ok?null:failure,p_token:token});
  if(doneError)console.error("[Activity email] completion failed",{queue_id:entry.id,code:doneError.code});else if(ok)sent++;else failed++;
 }
 return Response.json({ok:true,claimed:entries.length,sent,failed});
});
