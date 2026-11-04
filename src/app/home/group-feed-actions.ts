"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PHOTO=8*1024*1024;
const EXTENSIONS:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
const REACTIONS=["like","love","celebrate","support"];
function fail(groupId:string,message:string):never{redirect("/home/groups/"+groupId+"?error="+encodeURIComponent(message))}
async function signedIn(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");return {supabase,user}}
export async function createGroupPost(form:FormData){
 const groupId=String(form.get("group_id")??""),body=String(form.get("body")??"").trim(),photo=form.get("photo"),hasPhoto=photo instanceof File&&photo.size>0;
 if(!UUID.test(groupId))redirect("/home/groups?error=That%20group%20could%20not%20be%20found");
 if(!body&&!hasPhoto)fail(groupId,"Write an update or choose a photo.");
 if(body.length>3000)fail(groupId,"Keep your post under 3000 characters.");
 const {supabase,user}=await signedIn();
 const {data:membership}=await supabase.from("group_members").select("group_id").eq("group_id",groupId).eq("user_id",user.id).eq("status","active").maybeSingle();
 if(!membership)fail(groupId,"Only active group members can publish to this feed.");
 let photoPath:string|null=null;
 if(hasPhoto&&photo instanceof File){
  const ext=EXTENSIONS[photo.type];if(!ext)fail(groupId,"Choose a JPG, PNG or WebP image.");
  if(photo.size>MAX_PHOTO)fail(groupId,"Images must be 8 MB or smaller.");
  const path=user.id+"/groups/"+groupId+"/"+crypto.randomUUID()+"."+ext;
  const {data,error}=await supabase.storage.from("community-photos").upload(path,photo,{contentType:photo.type,cacheControl:"3600",upsert:false});
  if(error||!data?.path)fail(groupId,"Your image could not be uploaded. Please try again.");
  photoPath=data.path;
 }
 const {error}=await supabase.from("posts").insert({author_id:user.id,body,visibility:"group",group_id:groupId,photo_path:photoPath});
 if(error){if(photoPath)await supabase.storage.from("community-photos").remove([photoPath]);fail(groupId,"Your group post could not be published.");}
 revalidatePath("/home/groups/"+groupId);redirect("/home/groups/"+groupId+"?posted=1");
}
export async function createGroupComment(form:FormData){
 const groupId=String(form.get("group_id")??""),postId=String(form.get("post_id")??""),body=String(form.get("body")??"").trim();
 if(!UUID.test(groupId)||!UUID.test(postId))redirect("/home/groups?error=That%20post%20could%20not%20be%20found");
 if(!body||body.length>1000)fail(groupId,"Comments must be between 1 and 1000 characters.");
 const {supabase,user}=await signedIn();
 const {data:post}=await supabase.from("posts").select("id").eq("id",postId).eq("group_id",groupId).maybeSingle();
 if(!post)fail(groupId,"That post is not available in this group.");
 const {error}=await supabase.from("comments").insert({post_id:postId,author_id:user.id,body});
 if(error)fail(groupId,"Your comment could not be added.");
 revalidatePath("/home/groups/"+groupId);redirect("/home/groups/"+groupId+"?commented=1");
}
export async function toggleGroupReaction(form:FormData){
 const groupId=String(form.get("group_id")??""),postId=String(form.get("post_id")??""),reaction=String(form.get("reaction")??"like");
 if(!UUID.test(groupId)||!UUID.test(postId)||!REACTIONS.includes(reaction))redirect("/home/groups?error=That%20reaction%20is%20invalid");
 const {supabase,user}=await signedIn();
 const {data:post}=await supabase.from("posts").select("id").eq("id",postId).eq("group_id",groupId).maybeSingle();
 if(!post)fail(groupId,"That post is not available in this group.");
 const {data:existing,error:lookup}=await supabase.from("post_reactions").select("reaction").eq("post_id",postId).eq("user_id",user.id).maybeSingle();
 if(lookup)fail(groupId,"Your reaction could not be updated.");
 const result=existing?.reaction===reaction
  ? await supabase.from("post_reactions").delete().eq("post_id",postId).eq("user_id",user.id)
  : existing
   ? await supabase.from("post_reactions").update({reaction}).eq("post_id",postId).eq("user_id",user.id)
   : await supabase.from("post_reactions").insert({post_id:postId,user_id:user.id,reaction});
 if(result.error)fail(groupId,"Your reaction could not be saved.");
 revalidatePath("/home/groups/"+groupId);redirect("/home/groups/"+groupId);
}
export async function deleteGroupPost(form:FormData){
 const groupId=String(form.get("group_id")??""),postId=String(form.get("post_id")??"");
 if(!UUID.test(groupId)||!UUID.test(postId))redirect("/home/groups?error=That%20post%20could%20not%20be%20found");
 const {supabase,user}=await signedIn();
 const {data:group}=await supabase.from("groups").select("owner_id").eq("id",groupId).maybeSingle();
 const {data:membership}=await supabase.from("group_members").select("role,status").eq("group_id",groupId).eq("user_id",user.id).maybeSingle();
 const manager=group?.owner_id===user.id||(membership?.status==="active"&&["owner","moderator"].includes(membership.role));
 let query=supabase.from("posts").delete().eq("id",postId).eq("group_id",groupId);
 if(!manager)query=query.eq("author_id",user.id);
 const {data,error}=await query.select("id").maybeSingle();
 if(error||!data)fail(groupId,"You do not have permission to delete this post, or it is no longer available.");
 revalidatePath("/home/groups/"+groupId);redirect("/home/groups/"+groupId+"?deleted=1");
}
export async function deleteGroupComment(form:FormData){
 const groupId=String(form.get("group_id")??""),postId=String(form.get("post_id")??""),commentId=String(form.get("comment_id")??"");
 if(!UUID.test(groupId)||!UUID.test(postId)||!UUID.test(commentId))redirect("/home/groups?error=That%20comment%20could%20not%20be%20found");
 const {supabase,user}=await signedIn();
 const {data:group}=await supabase.from("groups").select("owner_id").eq("id",groupId).maybeSingle();
 const {data:membership}=await supabase.from("group_members").select("role,status").eq("group_id",groupId).eq("user_id",user.id).maybeSingle();
 const manager=group?.owner_id===user.id||(membership?.status==="active"&&["owner","moderator"].includes(membership.role));
 let query=supabase.from("comments").delete().eq("id",commentId).eq("post_id",postId);
 if(!manager)query=query.eq("author_id",user.id);
 const {data,error}=await query.select("id").maybeSingle();
 if(error||!data)fail(groupId,"You do not have permission to delete this comment, or it is no longer available.");
 revalidatePath("/home/groups/"+groupId);redirect("/home/groups/"+groupId+"?commentDeleted=1");
}
