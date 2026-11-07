"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASONS=["spam","harassment","unsafe","impersonation","other"];
function peopleError(message:string):never{redirect("/home/people?error="+encodeURIComponent(message))}
async function signedIn(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");return {supabase,user}}
export async function reportMember(form:FormData){
 const targetId=String(form.get("member_id")??""),reason=String(form.get("reason")??"");
 if(!UUID.test(targetId)||!REASONS.includes(reason))peopleError("Choose a valid member and report reason.");
 const {supabase,user}=await signedIn();if(targetId===user.id)peopleError("You cannot report your own account.");
 const {error}=await supabase.from("safety_reports").insert({reporter_id:user.id,target_user_id:targetId,reason,details:""});
 if(error)peopleError("Your report could not be submitted. Please try again.");
 revalidatePath("/home/people");redirect("/home/people?status="+encodeURIComponent("Thank you. Your report has been submitted for review."));
}
export async function blockMember(form:FormData){
 const targetId=String(form.get("member_id")??"");
 if(!UUID.test(targetId))peopleError("That member could not be found.");
 const {supabase,user}=await signedIn();if(targetId===user.id)peopleError("You cannot block your own account.");
 const {error:blockError}=await supabase.from("blocked_users").insert({blocker_id:user.id,blocked_id:targetId});
 if(blockError&&blockError.code!=="23505")peopleError("This member could not be blocked.");
 const {data:relations}=await supabase.from("friendships").select("id,requester_id,recipient_id,status").or("and(requester_id.eq."+user.id+",recipient_id.eq."+targetId+"),and(requester_id.eq."+targetId+",recipient_id.eq."+user.id+")");
 for(const relation of relations??[]){
  if(relation.status==="accepted"||(relation.status==="pending"&&relation.requester_id===user.id)){
   await supabase.from("friendships").delete().eq("id",relation.id);
  }else if(relation.status==="pending"&&relation.recipient_id===user.id){
   await supabase.from("friendships").update({status:"declined"}).eq("id",relation.id);
  }
 }
 await supabase.from("follows").delete().eq("follower_id",user.id).eq("followed_id",targetId);
 revalidatePath("/home");revalidatePath("/home/people");revalidatePath("/home/messages");
 redirect("/home/people?status="+encodeURIComponent("Member blocked. Their access to your profile and private content is now restricted."));
}
export async function unblockMember(form:FormData){
 const targetId=String(form.get("member_id")??"");
 if(!UUID.test(targetId))redirect("/home/blocked?error=That%20member%20could%20not%20be%20found");
 const {supabase,user}=await signedIn();
 const {error}=await supabase.from("blocked_users").delete().eq("blocker_id",user.id).eq("blocked_id",targetId);
 if(error)redirect("/home/blocked?error=This%20member%20could%20not%20be%20unblocked");
 revalidatePath("/home/blocked");revalidatePath("/home/people");
 redirect("/home/blocked?status="+encodeURIComponent("Member unblocked."));
}

export async function reportPost(form:FormData){
 const postId=String(form.get("post_id")??""),reason=String(form.get("reason")??"");
 if(!UUID.test(postId)||!REASONS.includes(reason))redirect("/home?error=Choose%20a%20valid%20post%20and%20report%20reason");
 const {supabase,user}=await signedIn();
 const {data:post,error:postError}=await supabase.from("posts").select("id,author_id").eq("id",postId).maybeSingle();
 if(postError||!post)redirect("/home?error=That%20post%20is%20not%20available%20to%20report");
 if(post.author_id===user.id)redirect("/home?error=You%20cannot%20report%20your%20own%20post");
 const {error}=await supabase.from("safety_reports").insert({reporter_id:user.id,target_user_id:post.author_id,post_id:postId,reason,details:""});
 if(error)redirect("/home?error=Your%20report%20could%20not%20be%20submitted");
 revalidatePath("/home");redirect("/home?status="+encodeURIComponent("Thank you. Your post report has been submitted for review."));
}
