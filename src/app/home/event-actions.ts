"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message:string):never{redirect(`/home/events?error=${encodeURIComponent(message)}`)}
function parseLocalDateTime(value:string,offset:number):Date{
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
 if(!match)return new Date(Number.NaN);
 const [,year,month,day,hour,minute]=match;
 return new Date(Date.UTC(Number(year),Number(month)-1,Number(day),Number(hour),Number(minute))+offset*60_000);
}
export async function createEvent(form:FormData){
 const name=String(form.get("name")??"").trim(),description=String(form.get("description")??"").trim(),category=String(form.get("category")??"Community").trim(),location=String(form.get("location")??"").trim(),startsAt=String(form.get("starts_at")??""),endsAt=String(form.get("ends_at")??""),offset=Number(form.get("timezone_offset")??0),isPublic=String(form.get("is_public")??"true")==="true";
 if(!Number.isInteger(offset)||Math.abs(offset)>840)fail("Your device timezone could not be verified. Refresh and try again.");
 const start=parseLocalDateTime(startsAt,offset),end=parseLocalDateTime(endsAt,offset);
 if(name.length<2||name.length>100)fail("Event names must be between 2 and 100 characters.");
 if(description.length>2000||category.length>60||location.length>160)fail("Please shorten the event details.");
 if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<=start)fail("Choose a valid start and end time. The end must be after the start.");
 if(start.getTime()<Date.now()-60*60*1000)fail("Choose a future event start time.");
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const groupId=String(form.get("group_id")??"").trim()||null;\n if(groupId){if(!UUID.test(groupId))fail("Choose a valid group.");const {data:manager,error:managerError}=await supabase.rpc("is_group_manager",{g:groupId});if(managerError||!manager)fail("Only that group’s owner or active moderator can create a group event.");}\n const {error}=await supabase.from("events").insert({organizer_id:user.id,group_id:groupId,name,description,category:category||"Community",location,starts_at:start.toISOString(),ends_at:end.toISOString(),is_public:isPublic});
 if(error)fail("Your event could not be created. Please try again.");
 revalidatePath("/home/events");redirect("/home/events?created=1");
}
export async function updateAttendance(form:FormData){
 const eventId=String(form.get("event_id")??""),response=String(form.get("response")??"");
 if(!UUID.test(eventId)||!["going","interested"].includes(response))fail("Choose a valid event response.");
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {error}=await supabase.from("event_attendance").upsert({event_id:eventId,user_id:user.id,response},{onConflict:"event_id,user_id"});
 if(error)fail("Your event response could not be saved. Please try again.");
 revalidatePath("/home/events");redirect("/home/events?responded=1");
}
export async function cancelAttendance(form:FormData){
 const eventId=String(form.get("event_id")??"");if(!UUID.test(eventId))fail("That event could not be found.");
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {error}=await supabase.from("event_attendance").delete().eq("event_id",eventId).eq("user_id",user.id);
 if(error)fail("Your event response could not be removed.");
 revalidatePath("/home/events");redirect("/home/events?cancelled=1");
}

export async function updateEvent(form:FormData){
 const eventId=String(form.get("event_id")??""),name=String(form.get("name")??"").trim(),description=String(form.get("description")??"").trim(),category=String(form.get("category")??"Community").trim(),location=String(form.get("location")??"").trim(),startsAt=String(form.get("starts_at")??""),endsAt=String(form.get("ends_at")??""),offset=Number(form.get("timezone_offset")??0),isPublic=String(form.get("is_public")??"true")==="true";
 if(!UUID.test(eventId)||!Number.isInteger(offset)||Math.abs(offset)>840)fail("Check the event details and timezone.");
 const start=parseLocalDateTime(startsAt,offset),end=parseLocalDateTime(endsAt,offset);
 if(name.length<2||name.length>100||description.length>2000||category.length>60||location.length>160)fail("Check the event details and character limits.");
 if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<=start)fail("Choose a valid start and end time.");
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data,error}=await supabase.from("events").update({name,description,category:category||"Community",location,starts_at:start.toISOString(),ends_at:end.toISOString(),is_public:isPublic}).eq("id",eventId).select("id").maybeSingle();
 if(error||!data)fail("You do not have permission to edit this event, or it is no longer available.");
 revalidatePath("/home/events");redirect("/home/events?updated=1");
}
export async function deleteEvent(form:FormData){
 const eventId=String(form.get("event_id")??"");if(!UUID.test(eventId))fail("That event could not be found.");
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data,error}=await supabase.from("events").delete().eq("id",eventId).select("id").maybeSingle();
 if(error||!data)fail("You do not have permission to cancel this event, or it is no longer available.");
 revalidatePath("/home/events");redirect("/home/events?deleted=1");
}
