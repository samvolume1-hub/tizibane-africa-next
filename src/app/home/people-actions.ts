"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function back(query:string,message:string,isError=false):never{
 const params=new URLSearchParams();
 if(query)params.set("q",query);
 params.set(isError?"error":"status",message);
 redirect("/home/people?"+params.toString());
}
async function currentUser(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 return {supabase,user};
}
export async function sendFriendRequest(form:FormData){
 const memberId=String(form.get("member_id")??""),query=String(form.get("query")??"");
 if(!UUID.test(memberId))back(query,"That member could not be found.",true);
 const {supabase,user}=await currentUser();
 if(memberId===user.id)back(query,"You cannot send a friend request to yourself.",true);
 const {data:rows,error:lookupError}=await supabase.from("friendships").select("id,requester_id,recipient_id,status").or("and(requester_id.eq."+user.id+",recipient_id.eq."+memberId+"),and(requester_id.eq."+memberId+",recipient_id.eq."+user.id+")");
 if(lookupError)back(query,"Friendship status could not be checked. Try again.",true);
 const existing=rows?.[0];
 if(existing?.status==="accepted")back(query,"You are already friends.");
 if(existing?.status==="pending"&&existing.requester_id===user.id)back(query,"Your friend request is already pending.");
 if(existing?.status==="pending"&&existing.recipient_id===user.id){
  const {error}=await supabase.from("friendships").update({status:"accepted"}).eq("id",existing.id);
  if(error)back(query,"The incoming request could not be accepted.",true);
  revalidatePath("/home/people");back(query,"You are now friends.");
 }
 if(existing)back(query,"A previous request already exists. You cannot send another yet.",true);
 const {error}=await supabase.from("friendships").insert({requester_id:user.id,recipient_id:memberId,status:"pending"});
 if(error)back(query,"Friend request could not be sent. The member may have blocked this connection.",true);
 revalidatePath("/home/people");back(query,"Friend request sent.");
}
export async function respondFriendRequest(form:FormData){
 const id=String(form.get("friendship_id")??""),response=String(form.get("response")??""),query=String(form.get("query")??"");
 if(!UUID.test(id)||!["accepted","declined"].includes(response))back(query,"That request is invalid.",true);
 const {supabase}=await currentUser();
 const {error}=await supabase.from("friendships").update({status:response}).eq("id",id).eq("status","pending");
 if(error)back(query,"Your response could not be saved. Please refresh and try again.",true);
 revalidatePath("/home/people");back(query,response==="accepted"?"Friend request accepted.":"Friend request declined.");
}
export async function cancelFriendRequest(form:FormData){
 const id=String(form.get("friendship_id")??""),query=String(form.get("query")??"");
 if(!UUID.test(id))back(query,"That request is invalid.",true);
 const {supabase}=await currentUser();
 const {error}=await supabase.from("friendships").delete().eq("id",id).eq("status","pending");
 if(error)back(query,"Your request could not be cancelled.",true);
 revalidatePath("/home/people");back(query,"Friend request cancelled.");
}
export async function endFriendship(form:FormData){
 const id=String(form.get("friendship_id")??""),query=String(form.get("query")??"");
 if(!UUID.test(id))back(query,"That friendship is invalid.",true);
 const {supabase}=await currentUser();
 const {error}=await supabase.from("friendships").delete().eq("id",id).eq("status","accepted");
 if(error)back(query,"This friendship could not be removed.",true);
 revalidatePath("/home/people");back(query,"Friendship removed.");
}
export async function toggleFollow(form:FormData){
 const memberId=String(form.get("member_id")??""),query=String(form.get("query")??"");
 if(!UUID.test(memberId))back(query,"That member could not be found.",true);
 const {supabase,user}=await currentUser();
 if(memberId===user.id)back(query,"You cannot follow yourself.",true);
 const {data:existing,error:lookupError}=await supabase.from("follows").select("followed_id").eq("follower_id",user.id).eq("followed_id",memberId).maybeSingle();
 if(lookupError)back(query,"Follow status could not be checked.",true);
 if(existing){
  const {error}=await supabase.from("follows").delete().eq("follower_id",user.id).eq("followed_id",memberId);
  if(error)back(query,"You could not unfollow this member.",true);
  revalidatePath("/home/people");back(query,"You have unfollowed this member.");
 }
 const {error}=await supabase.from("follows").insert({follower_id:user.id,followed_id:memberId});
 if(error)back(query,"You could not follow this member. Check whether this connection is blocked.",true);
 revalidatePath("/home/people");back(query,"You are now following this member.");
}
