"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function messageError(text:string):never{redirect("/home/messages?error="+encodeURIComponent(text))}
async function signedIn(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");return {supabase,user}}
export async function startDirectMessage(form:FormData){
 const recipientId=String(form.get("recipient_id")??"");
 if(!UUID.test(recipientId))messageError("Choose a valid member.");
 const {supabase,user}=await signedIn();
 if(recipientId===user.id)messageError("You cannot message yourself.");
 const {data:friend,error:friendError}=await supabase.from("friendships").select("id").eq("status","accepted").or("and(requester_id.eq."+user.id+",recipient_id.eq."+recipientId+"),and(requester_id.eq."+recipientId+",recipient_id.eq."+user.id+")").maybeSingle();
 if(friendError||!friend)messageError("You can start a private conversation after becoming friends.");
 const {data:myMemberships,error:membershipError}=await supabase.from("conversation_members").select("conversation_id").eq("user_id",user.id);
 if(membershipError)messageError("Your conversations could not be loaded.");
 const ids=(myMemberships??[]).map(x=>x.conversation_id);
 if(ids.length){
  const {data:conversations}=await supabase.from("conversations").select("id").eq("is_group",false).in("id",ids);
  const directIds=(conversations??[]).map(c=>c.id);
  if(directIds.length){
   const {data:otherRows}=await supabase.from("conversation_members").select("conversation_id").eq("user_id",recipientId).in("conversation_id",directIds);
   const existingId=otherRows?.[0]?.conversation_id;
   if(existingId){redirect("/home/messages/"+existingId)}
  }
 }
 const conversationId=crypto.randomUUID();
 const {error:createError}=await supabase.from("conversations").insert({id:conversationId,created_by:user.id,is_group:false});
 if(createError)messageError("A conversation could not be created.");
 const {error:selfError}=await supabase.from("conversation_members").insert({conversation_id:conversationId,user_id:user.id});
 if(selfError)messageError("Your conversation could not be opened.");
 const {error:recipientError}=await supabase.from("conversation_members").insert({conversation_id:conversationId,user_id:recipientId});
 if(recipientError)messageError("The other member could not be added. Try opening the conversation again.");
 revalidatePath("/home/messages");
 redirect("/home/messages/"+conversationId);
}
export async function sendDirectMessage(form:FormData){
 const conversationId=String(form.get("conversation_id")??""),body=String(form.get("body")??"").trim();
 if(!UUID.test(conversationId))messageError("That conversation could not be found.");
 if(!body||body.length>4000)redirect("/home/messages/"+conversationId+"?error="+encodeURIComponent("Messages must be between 1 and 4000 characters."));
 const {supabase,user}=await signedIn();
 const {error}=await supabase.from("messages").insert({conversation_id:conversationId,sender_id:user.id,body});
 if(error)redirect("/home/messages/"+conversationId+"?error="+encodeURIComponent("Your message could not be sent."));
 revalidatePath("/home/messages/"+conversationId);revalidatePath("/home/messages");
 redirect("/home/messages/"+conversationId);
}
