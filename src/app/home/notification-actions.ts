"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function signedIn(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");return {supabase,user}}
export async function markNotificationRead(form:FormData){
 const id=String(form.get("notification_id")??"");if(!UUID.test(id))redirect("/home/notifications?error=That%20notification%20is%20invalid");
 const {supabase,user}=await signedIn();
 const {error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("recipient_id",user.id);
 if(error)redirect("/home/notifications?error=This%20notification%20could%20not%20be%20updated");
 revalidatePath("/home/notifications");redirect("/home/notifications");
}
export async function markAllNotificationsRead(){
 const {supabase,user}=await signedIn();
 const {error}=await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("recipient_id",user.id).is("read_at",null);
 if(error)redirect("/home/notifications?error=Notifications%20could%20not%20be%20marked%20as%20read");
 revalidatePath("/home/notifications");redirect("/home/notifications");
}
