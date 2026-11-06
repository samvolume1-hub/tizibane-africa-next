"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function fail(message: string): never {
  redirect(`/home/profile?error=${encodeURIComponent(message)}`);
}

export async function updateProfile(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const avatar = formData.get("avatar");
  const cover = formData.get("cover");

  if (!displayName || displayName.length > 80) fail("Your display name must be between 1 and 80 characters.");
  if (bio.length > 240) fail("Your bio must be 240 characters or fewer.");
  if (location.length > 120) fail("Your location must be 120 characters or fewer.");
  if (!["public", "members", "friends", "private"].includes(visibility)) fail("Choose a valid profile visibility setting.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let avatarPath: string | undefined;
  let coverPath: string | undefined;
  const { data: previousProfile, error: previousProfileError } = await supabase
    .from("profiles")
    .select("id,avatar_path,cover_path")
    .eq("id", user.id)
    .maybeSingle();

  if (previousProfileError) {
    fail("We could not load your existing profile before saving. Please refresh and try again.");
  }

  if (avatar instanceof File && avatar.size > 0) {
    const extension = MIME_TO_EXTENSION[avatar.type];
    if (!extension) fail("Choose a JPG, PNG or WebP image.");
    if (avatar.size > MAX_AVATAR_BYTES) fail("Your profile photo must be 2 MB or smaller.");

    const objectPath = `${user.id}/avatars/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage
      .from("community-photos")
      .upload(objectPath, avatar, {
        contentType: avatar.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (error || !data?.path) fail("Your profile photo could not be uploaded. Please try again.");
    avatarPath = data.path;
  }

  if (cover instanceof File && cover.size > 0) {
    const extension = MIME_TO_EXTENSION[cover.type];
    if (!extension) {
      if (avatarPath) await supabase.storage.from("community-photos").remove([avatarPath]);
      fail("Choose a JPG, PNG or WebP cover photo.");
    }
    if (cover.size > MAX_AVATAR_BYTES) {
      if (avatarPath) await supabase.storage.from("community-photos").remove([avatarPath]);
      fail("Your cover photo must be 2 MB or smaller.");
    }

    const objectPath = `${user.id}/covers/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage
      .from("community-photos")
      .upload(objectPath, cover, {
        contentType: cover.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (error || !data?.path) {
      if (avatarPath) await supabase.storage.from("community-photos").remove([avatarPath]);
      fail("Your cover photo could not be uploaded. Please try again.");
    }
    coverPath = data.path;
  }

  const update: Record<string, string | null> = {
    display_name: displayName,
    bio,
    location,
    visibility,
    initials: displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase().slice(0, 3) || "TZ",
  };
  if (avatarPath) update.avatar_path = avatarPath;
  if (coverPath) update.cover_path = coverPath;

  let savedProfileId: string | null = null;
  let saveError: { code?: string; message?: string } | null = null;

  if (previousProfile?.id) {
    const { data: saved, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select("id")
      .maybeSingle();
    savedProfileId = saved?.id ?? null;
    saveError = error;
  } else {
    const { data: saved, error } = await supabase
      .from("profiles")
      .insert({ id: user.id, ...update })
      .select("id")
      .maybeSingle();
    savedProfileId = saved?.id ?? null;
    saveError = error;
  }

  // Supabase can return no error when row-level security filters an UPDATE.
  // Verify that a row was actually returned before telling the member it saved.
  if (saveError || !savedProfileId) {
    const uploadedPaths = [avatarPath, coverPath].filter(Boolean) as string[];
    if (uploadedPaths.length) await supabase.storage.from("community-photos").remove(uploadedPaths);

    if (saveError?.code === "23505") {
      fail("A profile value conflicts with an existing record. Please check your details and try again.");
    }
    if (saveError?.code === "42501") {
      fail("Your profile could not be saved because the database denied the change. Please contact support.");
    }
    fail("Your profile was not confirmed as saved. Please refresh and try again; your existing details have been kept.");
  }

  const replacedPaths = [
    avatarPath && previousProfile?.avatar_path,
    coverPath && previousProfile?.cover_path,
  ].filter(Boolean) as string[];
  if (replacedPaths.length) await supabase.storage.from("community-photos").remove(replacedPaths);

  revalidatePath("/home");
  revalidatePath("/home/profile");
  revalidatePath("/home/people");
  redirect("/home/profile?saved=1");
}

export async function removeProfileImage(formData: FormData) {
  const kind = String(formData.get("image_kind") ?? "");
  if (kind !== "avatar" && kind !== "cover") fail("Choose a valid profile image.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const column = "avatar_path";
  const { data: profile, error: readError } = await supabase.from("profiles").select("id,avatar_path,cover_path").eq("id", user.id).maybeSingle();
  if (readError || !profile) fail("Your profile could not be loaded.");
  const oldPath = kind === "avatar" ? profile.avatar_path : profile.cover_path;
  const { data: saved, error } = await supabase.from("profiles").update({ avatar_path: null, cover_path: null }).eq("id", user.id).select("id").maybeSingle();
  if (error || !saved) fail("Your profile image could not be removed.");
  let cleanupFailed = false;
  const oldPaths = [...new Set([profile.avatar_path, profile.cover_path].filter(Boolean) as string[])];
  if (oldPaths.length) {
    const cleanup = supabase.storage.from("community-photos").remove(oldPaths);
    const result = await Promise.race([cleanup, new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800))]);
    cleanupFailed = result === null || Boolean(result.error);
  }
  revalidatePath("/home");
  revalidatePath("/home/profile");
  revalidatePath("/home/people");
  redirect(cleanupFailed ? "/home/profile?removed=1&cleanup=1" : "/home/profile?removed=1");
}

export async function replaceProfileImage(formData: FormData) {
  const kind = String(formData.get("image_kind") ?? "");
  const photo = formData.get("photo");
  if (kind !== "avatar" || !(photo instanceof File) || photo.size < 1) fail("Choose a profile photo to upload.");
  const extension = MIME_TO_EXTENSION[photo.type];
  if (!extension || photo.size > MAX_AVATAR_BYTES) fail("Choose a JPG, PNG or WebP image up to 2 MB.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const column = "avatar_path";
  const folder = "avatars";
  const { data: profile, error: readError } = await supabase.from("profiles").select("id,avatar_path,cover_path").eq("id", user.id).maybeSingle();
  if (readError || !profile) fail("Your profile could not be loaded.");
  const oldPath = kind === "avatar" ? profile.avatar_path : profile.cover_path;
  const newPath = user.id + "/" + folder + "/" + crypto.randomUUID() + "." + extension;
  const { data: uploaded, error: uploadError } = await supabase.storage.from("community-photos").upload(newPath, photo, { contentType: photo.type, cacheControl: "3600", upsert: false });
  if (uploadError || !uploaded?.path) fail("Your new profile image could not be uploaded.");
  const { data: saved, error: saveError } = await supabase.from("profiles").update({ avatar_path: uploaded.path, cover_path: uploaded.path }).eq("id", user.id).select("id").maybeSingle();
  if (saveError || !saved) {
    await supabase.storage.from("community-photos").remove([uploaded.path]);
    fail("Your profile image was not changed. Please try again.");
  }
  let cleanupFailed = false;
  const oldPaths = [...new Set([profile.avatar_path, profile.cover_path].filter(Boolean) as string[])];
  if (oldPaths.length) {
    const cleanup = supabase.storage.from("community-photos").remove(oldPaths);
    const result = await Promise.race([cleanup, new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800))]);
    cleanupFailed = result === null || Boolean(result.error);
  }
  revalidatePath("/home");
  revalidatePath("/home/profile");
  revalidatePath("/home/people");
  redirect(cleanupFailed ? "/home/profile?image=" + kind + "&cleanup=1" : "/home/profile?image=" + kind);
}
