"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function fail(message: string): never {
  redirect("/home/stories?error=" + encodeURIComponent(message));
}

async function signedIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createStory(formData: FormData) {
  const caption = String(formData.get("caption") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "friends");
  const photo = formData.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (!caption && !hasPhoto) fail("Add a caption or choose a photo for your story.");
  if (caption.length > 500) fail("Story captions must be 500 characters or fewer.");
  if (!["public", "friends", "private"].includes(visibility)) fail("Choose a valid story audience.");
  const { supabase, user } = await signedIn();
  let photoPath: string | null = null;
  if (hasPhoto && photo instanceof File) {
    const extension = EXTENSIONS[photo.type];
    if (!extension || photo.size > MAX_PHOTO_BYTES) fail("Choose a JPG, PNG or WebP photo up to 2 MB.");
    const path = user.id + "/stories/" + crypto.randomUUID() + "." + extension;
    const { data, error } = await supabase.storage.from("community-photos").upload(path, photo, { contentType: photo.type, cacheControl: "3600", upsert: false });
    if (error || !data?.path) fail("Your story photo could not be uploaded.");
    photoPath = data.path;
  }
  const { error } = await supabase.from("stories").insert({
    author_id: user.id,
    caption,
    photo_path: photoPath,
    visibility,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) {
    if (photoPath) await supabase.storage.from("community-photos").remove([photoPath]);
    fail("Your story could not be published. Please try again.");
  }
  revalidatePath("/home/stories");
  redirect("/home/stories?created=1");
}

export async function updateStory(formData: FormData) {
  const storyId = String(formData.get("story_id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "friends");
  if (!UUID.test(storyId) || caption.length > 500) fail("Check your story caption and try again.");
  if (!["public", "friends", "private"].includes(visibility)) fail("Choose a valid story audience.");
  const { supabase, user } = await signedIn();
  const { data, error } = await supabase.from("stories").update({ caption, visibility }).eq("id", storyId).eq("author_id", user.id).select("id").maybeSingle();
  if (error || !data) fail("You can edit only your own story.");
  revalidatePath("/home/stories");
  redirect("/home/stories?updated=1");
}

export async function deleteStory(formData: FormData) {
  const storyId = String(formData.get("story_id") ?? "");
  if (!UUID.test(storyId)) fail("That story could not be found.");
  const { supabase, user } = await signedIn();
  const { data, error } = await supabase.from("stories").delete().eq("id", storyId).eq("author_id", user.id).select("photo_path").maybeSingle();
  if (error || !data) fail("You can delete only your own story.");
  let cleanupFailed = false;
  if (data.photo_path) {
    const { error: storageError } = await supabase.storage.from("community-photos").remove([data.photo_path]);
    cleanupFailed = Boolean(storageError);
  }
  revalidatePath("/home/stories");
  redirect(cleanupFailed ? "/home/stories?deleted=1&cleanup=1" : "/home/stories?deleted=1");
}

export async function replaceStoryPhoto(formData: FormData) {
  const storyId = String(formData.get("story_id") ?? "");
  const photo = formData.get("photo");
  if (!UUID.test(storyId) || !(photo instanceof File) || photo.size < 1) fail("Choose a replacement story photo.");
  const extension = EXTENSIONS[photo.type];
  if (!extension || photo.size > MAX_PHOTO_BYTES) fail("Choose a JPG, PNG or WebP photo up to 2 MB.");
  const { supabase, user } = await signedIn();
  const { data: current, error: readError } = await supabase.from("stories").select("photo_path").eq("id", storyId).eq("author_id", user.id).maybeSingle();
  if (readError || !current) fail("You can replace photos only on your own story.");
  const path = user.id + "/stories/" + crypto.randomUUID() + "." + extension;
  const { data: uploaded, error: uploadError } = await supabase.storage.from("community-photos").upload(path, photo, { contentType: photo.type, cacheControl: "3600", upsert: false });
  if (uploadError || !uploaded?.path) fail("Your replacement photo could not be uploaded.");
  const { data: saved, error } = await supabase.from("stories").update({ photo_path: uploaded.path }).eq("id", storyId).eq("author_id", user.id).select("id").maybeSingle();
  if (error || !saved) {
    await supabase.storage.from("community-photos").remove([uploaded.path]);
    fail("Your story was not changed. Please try again.");
  }
  let cleanupFailed = false;
  if (current.photo_path) {
    const { error: removeError } = await supabase.storage.from("community-photos").remove([current.photo_path]);
    cleanupFailed = Boolean(removeError);
  }
  revalidatePath("/home/stories");
  redirect(cleanupFailed ? "/home/stories?updated=1&cleanup=1" : "/home/stories?updated=1");
}

export async function removeStoryPhoto(formData: FormData) {
  const storyId = String(formData.get("story_id") ?? "");
  if (!UUID.test(storyId)) fail("That story could not be found.");
  const { supabase, user } = await signedIn();
  const { data: current, error: readError } = await supabase.from("stories").select("photo_path").eq("id", storyId).eq("author_id", user.id).maybeSingle();
  if (readError || !current) fail("You can remove photos only from your own story.");
  const { data: saved, error } = await supabase.from("stories").update({ photo_path: null }).eq("id", storyId).eq("author_id", user.id).select("id").maybeSingle();
  if (error || !saved) fail("The story photo could not be removed.");
  let cleanupFailed = false;
  if (current.photo_path) {
    const { error: removeError } = await supabase.storage.from("community-photos").remove([current.photo_path]);
    cleanupFailed = Boolean(removeError);
  }
  revalidatePath("/home/stories");
  redirect(cleanupFailed ? "/home/stories?updated=1&cleanup=1" : "/home/stories?updated=1");
}
