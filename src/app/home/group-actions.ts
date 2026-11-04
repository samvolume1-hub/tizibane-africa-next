"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message:string):never{redirect(`/home/groups?error=${encodeURIComponent(message)}`)}
export async function createGroup(form:FormData){
 const name=String(form.get("name")??"").trim(),description=String(form.get("description")??"").trim(),category=String(form.get("category")??"Community").trim(),visibility=String(form.get("visibility")??"public"),join_policy=String(form.get("join_policy")??"open"),rules=String(form.get("rules")??"").trim();
 if(name.length<2||name.length>80)fail("Group names must be between 2 and 80 characters.");
 if(description.length>500||rules.length>1500||category.length>60)fail("Please shorten the group details.");
 if(!["public","private"].includes(visibility)||!["open","approval","invite"].includes(join_policy))fail("Choose valid group access settings.");
 if((visibility==="public"&&join_policy!=="open")||(visibility==="private"&&join_policy==="open"))fail("Public groups use open joining. Private groups use approval or invite-only access.");
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {error}=await supabase.from("groups").insert({owner_id:user.id,name,description,category:category||"Community",visibility,join_policy,rules});
 if(error)fail("Your group could not be created. Please try again.");
 revalidatePath("/home/groups");redirect("/home/groups?created=1");
}
export async function joinGroup(form:FormData){
 const groupId=String(form.get("group_id")??"");if(!UUID.test(groupId))fail("That group could not be found.");
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:group}=await supabase.from("groups").select("id,visibility,join_policy").eq("id",groupId).maybeSingle();
 if(!group)fail("That group is not available.");
 const status=group.visibility==="public"&&group.join_policy==="open"?"active":group.visibility==="private"&&group.join_policy==="approval"?"pending":null;
 if(!status)fail("This group is invite-only.");
 const {error}=await supabase.from("group_members").insert({group_id:groupId,user_id:user.id,role:"member",status});
 if(error)fail(error.code==="23505"?"You already have a membership or request for this group.":"Your group request could not be saved.");
 revalidatePath("/home/groups");redirect(status==="pending"?"/home/groups?requested=1":"/home/groups?joined=1");
}
export async function leaveGroup(form:FormData){
 const groupId=String(form.get("group_id")??"");if(!UUID.test(groupId))fail("That group could not be found.");
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:group}=await supabase.from("groups").select("owner_id").eq("id",groupId).maybeSingle();
 if(group?.owner_id===user.id)fail("Group owners cannot leave their own group. Transfer ownership first.");
 const {error}=await supabase.from("group_members").delete().eq("group_id",groupId).eq("user_id",user.id);
 if(error)fail("You could not leave this group. Please try again.");
 revalidatePath("/home/groups");redirect("/home/groups?left=1");
}
export async function moderateGroupRequest(form:FormData){
 const groupId=String(form.get("group_id")??""),memberId=String(form.get("member_id")??""),decision=String(form.get("decision")??"");
 if(!UUID.test(groupId)||!UUID.test(memberId)||!["approve","decline"].includes(decision))fail("That membership request is invalid.");
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const result=decision==="approve"?await supabase.from("group_members").update({status:"active"}).eq("group_id",groupId).eq("user_id",memberId).eq("status","pending"):await supabase.from("group_members").delete().eq("group_id",groupId).eq("user_id",memberId).eq("status","pending");
 if(result.error)fail("You do not have permission to manage that request, or it is no longer pending.");
 revalidatePath("/home/groups");redirect("/home/groups?managed=1");
}
