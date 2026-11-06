"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function signedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function requireAdmin() {
  const { supabase, user } = await signedIn();
  const { data, error } = await supabase.rpc("is_current_platform_admin");
  if (error || data !== true) redirect("/home/announcements?error=admin");
  return { supabase, user };
}

function announcementRedirect(message: string) {
  redirect("/home/announcements" + (message ? "?notice=" + encodeURIComponent(message) : ""));
}

export async function createAnnouncement(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const pinned = formData.get("is_pinned") === "on";
  const expiry = String(formData.get("expires_at") ?? "").trim();
  if (title.length < 3 || title.length > 140 || body.length < 3 || body.length > 8000) {
    redirect("/home/announcements/manage?error=length");
  }
  if (!["draft", "published"].includes(status)) redirect("/home/announcements/manage?error=status");
  const { error } = await supabase.from("community_announcements").insert({
    title, body, status, is_pinned: pinned, created_by: user.id,
    published_at: status === "published" ? new Date().toISOString() : null,
    expires_at: expiry ? new Date(expiry).toISOString() : null,
  });
  if (error) redirect("/home/announcements/manage?error=create");
  revalidatePath("/home");
  revalidatePath("/home/announcements");
  revalidatePath("/home/announcements/manage");
  redirect("/home/announcements/manage?created=1");
}


export async function editAnnouncement(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || title.length < 3 || title.length > 140 || body.length < 3 || body.length > 8000) {
    redirect("/home/announcements/manage?error=length");
  }
  const { error } = await supabase.from("community_announcements").update({ title, body }).eq("id", id);
  if (error) redirect("/home/announcements/manage?error=update");
  revalidatePath("/home");
  revalidatePath("/home/announcements");
  revalidatePath("/home/announcements/manage");
  redirect("/home/announcements/manage?updated=1");
}

export async function updateAnnouncementStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["draft", "published", "archived"].includes(status)) redirect("/home/announcements/manage?error=invalid");
  const { error } = await supabase.from("community_announcements").update({
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) redirect("/home/announcements/manage?error=update");
  revalidatePath("/home");
  revalidatePath("/home/announcements");
  revalidatePath("/home/announcements/manage");
  redirect("/home/announcements/manage?updated=1");
}

export async function toggleAnnouncementPin(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const pinned = String(formData.get("pinned") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home/announcements/manage?error=invalid");
  const { error } = await supabase.from("community_announcements").update({ is_pinned: !pinned }).eq("id", id);
  if (error) redirect("/home/announcements/manage?error=update");
  revalidatePath("/home");
  revalidatePath("/home/announcements");
  revalidatePath("/home/announcements/manage");
  redirect("/home/announcements/manage?updated=1");
}

export async function deleteAnnouncement(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home/announcements/manage?error=invalid");
  const { error } = await supabase.from("community_announcements").delete().eq("id", id);
  if (error) redirect("/home/announcements/manage?error=delete");
  revalidatePath("/home");
  revalidatePath("/home/announcements");
  revalidatePath("/home/announcements/manage");
  redirect("/home/announcements/manage?deleted=1");
}

export async function commentOnAnnouncement(formData: FormData) {
  const { supabase, user } = await signedIn();
  const id = String(formData.get("announcement_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !body || body.length > 1000) announcementRedirect("Please write a comment of up to 1,000 characters.");
  const { error } = await supabase.from("announcement_comments").insert({ announcement_id: id, author_id: user.id, body });
  if (error) announcementRedirect("Your comment could not be added. Please try again.");
  revalidatePath("/home/announcements");
  announcementRedirect("commented");
}

export async function reactToAnnouncement(formData: FormData) {
  const { supabase, user } = await signedIn();
  const id = String(formData.get("announcement_id") ?? "");
  const reaction = String(formData.get("reaction") ?? "like");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["like", "love", "support", "celebrate"].includes(reaction)) announcementRedirect("Choose a valid reaction.");
  const { data: current } = await supabase.from("announcement_reactions").select("reaction").eq("announcement_id", id).eq("user_id", user.id).maybeSingle();
  const result = current?.reaction === reaction
    ? await supabase.from("announcement_reactions").delete().eq("announcement_id", id).eq("user_id", user.id)
    : await supabase.from("announcement_reactions").upsert({ announcement_id: id, user_id: user.id, reaction }, { onConflict: "announcement_id,user_id" });
  if (result.error) announcementRedirect("Your reaction could not be saved. Please try again.");
  revalidatePath("/home/announcements");
  redirect("/home/announcements");
}
