"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REACTIONS = ["like", "love", "laugh", "wow", "sad", "celebrate", "support", "salute", "pray"] as const;

function fail(message: string): never {
  redirect(`/home?error=${encodeURIComponent(message)}`);
}

export async function toggleReaction(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  const reaction = String(formData.get("reaction") ?? "like");
  if (!UUID_PATTERN.test(postId)) fail("That post could not be found.");
  if (!REACTIONS.includes(reaction as (typeof REACTIONS)[number])) fail("Choose a valid reaction.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing, error: lookupError } = await supabase
    .from("post_reactions")
    .select("reaction")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) fail("Your reaction could not be updated. Please try again.");

  const result = existing?.reaction === reaction
    ? await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id)
    : existing
      ? await supabase.from("post_reactions").update({ reaction }).eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id, reaction });

  if (result.error) fail("Your reaction could not be saved. Please try again.");
  revalidatePath("/home");
}

export async function createComment(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID_PATTERN.test(postId)) fail("That post could not be found.");
  if (!body || body.length > 1000) fail("Comments must be between 1 and 1000 characters.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    body,
  });
  if (error) fail("Your comment could not be added. Please try again.");

  revalidatePath("/home");
  redirect("/home?commented=1");
}


export async function updatePost(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID_PATTERN.test(postId) || body.length > 3000) fail("Check the post and keep it under 3000 characters.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: current, error: readError } = await supabase.from("posts").select("photo_path,body").eq("id", postId).eq("author_id", user.id).maybeSingle();
  if (readError || !current) fail("You can edit only your own post.");
  if (!body && !current.photo_path) fail("A post needs text or a photo. Add content or delete the post instead.");
  const { data, error } = await supabase.from("posts").update({ body }).eq("id", postId).eq("author_id", user.id).select("id").maybeSingle();
  if (error || !data) fail("You can edit only your own post.");
  revalidatePath("/home");
  redirect("/home?updated=post");
}

export async function deletePost(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  if (!UUID_PATTERN.test(postId)) fail("That post could not be found.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: post, error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", user.id).select("photo_path").maybeSingle();
  if (error || !post) fail("You can delete only your own post.");
  let cleanupFailed = false;
  if (post.photo_path) {
    const { error: storageError } = await supabase.storage.from("community-photos").remove([post.photo_path]);
    cleanupFailed = Boolean(storageError);
  }
  revalidatePath("/home");
  redirect(cleanupFailed ? "/home?deleted=post&cleanup=1" : "/home?deleted=post");
}

export async function replacePostPhoto(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  const photo = formData.get("photo");
  if (!UUID_PATTERN.test(postId) || !(photo instanceof File) || photo.size < 1) fail("Choose a replacement photo.");
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[photo.type];
  if (!extension || photo.size > 2 * 1024 * 1024) fail("Choose a JPG, PNG or WebP photo up to 2 MB.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: current, error: readError } = await supabase.from("posts").select("photo_path").eq("id", postId).eq("author_id", user.id).maybeSingle();
  if (readError || !current) fail("You can replace photos only on your own post.");
  const path = user.id + "/" + crypto.randomUUID() + "." + extension;
  const { data: uploaded, error: uploadError } = await supabase.storage.from("community-photos").upload(path, photo, { contentType: photo.type, cacheControl: "3600", upsert: false });
  if (uploadError || !uploaded?.path) fail("Your replacement photo could not be uploaded.");
  const { data: saved, error: updateError } = await supabase.from("posts").update({ photo_path: uploaded.path }).eq("id", postId).eq("author_id", user.id).select("id").maybeSingle();
  if (updateError || !saved) {
    await supabase.storage.from("community-photos").remove([uploaded.path]);
    fail("Your post was not changed. Please try again.");
  }
  let cleanupFailed = false;
  if (current.photo_path) {
    const { error } = await supabase.storage.from("community-photos").remove([current.photo_path]);
    cleanupFailed = Boolean(error);
  }
  revalidatePath("/home");
  redirect(cleanupFailed ? "/home?updated=photo&cleanup=1" : "/home?updated=photo");
}

export async function removePostPhoto(formData: FormData) {
  const postId = String(formData.get("post_id") ?? "");
  if (!UUID_PATTERN.test(postId)) fail("That post could not be found.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: current, error: readError } = await supabase.from("posts").select("photo_path").eq("id", postId).eq("author_id", user.id).maybeSingle();
  if (readError || !current) fail("You can remove photos only from your own post.");
  if (!current.body.trim()) fail("This post has no text. Add text before removing its only photo, or delete the post.");
  const { data: saved, error } = await supabase.from("posts").update({ photo_path: null }).eq("id", postId).eq("author_id", user.id).select("id").maybeSingle();
  if (error || !saved) fail("The photo could not be removed from your post.");
  let cleanupFailed = false;
  if (current.photo_path) {
    const { error: storageError } = await supabase.storage.from("community-photos").remove([current.photo_path]);
    cleanupFailed = Boolean(storageError);
  }
  revalidatePath("/home");
  redirect(cleanupFailed ? "/home?updated=photo-removed&cleanup=1" : "/home?updated=photo-removed");
}

export async function updateComment(formData: FormData) {
  const commentId = String(formData.get("comment_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID_PATTERN.test(commentId) || !body || body.length > 1000) fail("Comments must be between 1 and 1000 characters.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("comments").update({ body }).eq("id", commentId).eq("author_id", user.id).select("id").maybeSingle();
  if (error || !data) fail("You can edit only your own comment.");
  revalidatePath("/home");
  redirect("/home?updated=comment");
}

export async function deleteComment(formData: FormData) {
  const commentId = String(formData.get("comment_id") ?? "");
  if (!UUID_PATTERN.test(commentId)) fail("That comment could not be found.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).eq("author_id", user.id).select("id").maybeSingle();
  if (error || !data) fail("You can delete only your own comment.");
  revalidatePath("/home");
  redirect("/home?deleted=comment");
}
