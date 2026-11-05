"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function toggleMemberPreference(form:FormData){
 const memberId=String(form.get("member_id")??"");
 const preference=String(form.get("preference")??"");
 const enabled=String(form.get("enabled")??"")==="true";
 if(!UUID.test(memberId)||!["muted","best_friend"].includes(preference)||!["true","false"].includes(String(form.get("enabled")??""))) redirect("/home/people?error=That%20preference%20could%20not%20be%20updated");
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 if(memberId===user.id) redirect("/home/people?error=You%20cannot%20set%20a%20preference%20for%20yourself");
 const {data:existing,error:lookupError}=await supabase.from("member_preferences").select("muted,best_friend").eq("owner_id",user.id).eq("member_id",memberId).maybeSingle();
 if(lookupError) redirect("/home/people?error=Preferences%20could%20not%20be%20loaded");
 const next={muted:preference==="muted"?enabled:(existing?.muted??false),best_friend:preference==="best_friend"?enabled:(existing?.best_friend??false),updated_at:new Date().toISOString()};
 const {error}=await supabase.from("member_preferences").upsert({owner_id:user.id,member_id:memberId,...next},{onConflict:"owner_id,member_id"});
 if(error) redirect("/home/people?error=Your%20preference%20could%20not%20be%20saved");
 revalidatePath("/home/people");
 redirect("/home/people?status=Your%20member%20preference%20was%20updated");
}
