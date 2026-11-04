"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
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
  const rawHandle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const avatar = formData.get("avatar");

  if (!displayName || displayName.length > 80) fail("Your display name must be between 1 and 80 characters.");
  if (rawHandle && !/^[a-z0-9_]{3,30}$/.test(rawHandle)) fail("Your handle must be 3–30 characters using letters, numbers or underscores.");
  if (bio.length > 240) fail("Your bio must be 240 characters or fewer.");
  if (location.length > 120) fail("Your location must be 120 characters or fewer.");
  if (!["public", "members", "friends", "private"].includes(visibility)) fail("Choose a valid profile visibility setting.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let avatarPath: string | undefined;
  if (avatar instanceof File && avatar.size > 0) {
    const extension = MIME_TO_EXTENSION[avatar.type];
    if (!extension) fail("Choose a JPG, PNG or WebP image.");
    if (avatar.size > MAX_AVATAR_BYTES) fail("Your profile photo must be 8 MB or smaller.");

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

  const update: Record<string, string | null> = {
    display_name: displayName,
    handle: rawHandle || null,
    bio,
    location,
    visibility,
    initials: displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase().slice(0, 3) || "TZ",
  };
  if (avatarPath) update.avatar_path = avatarPath;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const result = existing
    ? await supabase.from("profiles").update(update).eq("id", user.id)
    : await supabase.from("profiles").insert({ id: user.id, ...update });

  if (result.error) {
    if (avatarPath) await supabase.storage.from("community-photos").remove([avatarPath]);
    const message = result.error.code === "23505"
      ? "That handle is already in use. Please choose another."
      : "Your profile could not be saved. Please try again.";
    fail(message);
  }

  revalidatePath("/home");
  revalidatePath("/home/profile");
  redirect("/home/profile?saved=1");
}
