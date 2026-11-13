"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function profilePath(memberId: string) {
  return `/home/member/${memberId}`;
}

function fail(memberId: string, message: string): never {
  redirect(`${profilePath(memberId)}?error=${encodeURIComponent(message)}`);
}

async function signedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function toggleMemberPostLike(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  if (!UUID.test(memberId) || !UUID.test(postId)) redirect("/home/people");
  const { supabase, user } = await signedIn();
  const { data: post } = await supabase.from("posts").select("id").eq("id", postId).eq("author_id", memberId).maybeSingle();
  if (!post) fail(memberId, "That post is no longer available.");
  const { data: existing, error: lookupError } = await supabase.from("post_reactions").select("reaction").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  if (lookupError) fail(memberId, "Your reaction could not be updated. Please try again.");
  const result = existing?.reaction === "like"
    ? await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id)
    : existing
      ? await supabase.from("post_reactions").update({ reaction: "like" }).eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, reaction: "like" });
  if (result.error) fail(memberId, "Your reaction could not be saved. Please try again.");
  revalidatePath(profilePath(memberId));
  redirect(profilePath(memberId));
}

export async function addMemberPostComment(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID.test(memberId) || !UUID.test(postId)) redirect("/home/people");
  if (!body || body.length > 1000) fail(memberId, "Comments must be between 1 and 1000 characters.");
  const { supabase, user } = await signedIn();
  const { data: post } = await supabase.from("posts").select("id").eq("id", postId).eq("author_id", memberId).maybeSingle();
  if (!post) fail(memberId, "That post is no longer available.");
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body });
  if (error) fail(memberId, "Your comment could not be added. Please try again.");
  revalidatePath(profilePath(memberId));
  redirect(profilePath(memberId) + "?commented=1");
}

export async function toggleMemberFollow(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  if (!UUID.test(memberId)) redirect("/home/people");
  const { supabase, user } = await signedIn();
  if (memberId === user.id) fail(memberId, "You cannot follow yourself.");
  const { data: existing, error: lookupError } = await supabase.from("follows").select("followed_id").eq("follower_id", user.id).eq("followed_id", memberId).maybeSingle();
  if (lookupError) fail(memberId, "Follow status could not be checked. Please try again.");
  const result = existing
    ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", memberId)
    : await supabase.from("follows").insert({ follower_id: user.id, followed_id: memberId });
  if (result.error) fail(memberId, "This follow action could not be completed. Check whether this connection is restricted.");
  revalidatePath(profilePath(memberId));
  revalidatePath("/home/people");
  redirect(profilePath(memberId));
}
