"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_POST_CHARS = 3000;
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function signIn(data: FormData) {
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  if (!email || !password) redirect("/login?error=Enter%20your%20email%20and%20password");

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect("/login?error=Authentication%20is%20not%20configured");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Sign-in%20failed.%20Check%20your%20details");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Could%20not%20verify%20your%20session");
  if (user.email?.toLowerCase() === "samvolume1@gmail.com") {
    redirect("/home/premium/admin");
  }
  redirect("/home");
}

export async function signUp(data: FormData) {
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  if (!name || !email || password.length < 10) {
    redirect("/signup?error=Enter%20your%20name%20and%20email.%20Password%20must%20be%20at%20least%2010%20characters");
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect("/signup?error=Authentication%20is%20not%20configured");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/home`,
    },
  });
  if (error) redirect("/signup?error=Account%20creation%20failed.%20Please%20try%20again");
  redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createPost(data: FormData) {
  const body = String(data.get("body") ?? "").trim();
  const visibility = String(data.get("visibility") ?? "public");
  const photo = data.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;

  if (!body && !hasPhoto) redirect("/home?error=Write%20an%20update%20or%20choose%20a%20photo");
  if (body.length > MAX_POST_CHARS) redirect("/home?error=Keep%20your%20post%20under%203000%20characters");
  if (!["public", "friends", "private"].includes(visibility)) {
    redirect("/home?error=Choose%20a%20valid%20audience");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let photoPath: string | null = null;
  if (hasPhoto && photo instanceof File) {
    const extension = MIME_TO_EXTENSION[photo.type];
    if (!extension) redirect("/home?error=Choose%20a%20JPG,%20PNG%20or%20WebP%20photo");
    if (photo.size > MAX_PHOTO_BYTES) redirect("/home?error=Photos%20must%20be%208%20MB%20or%20smaller");

    const objectPath = `${user.id}/posts/${crypto.randomUUID()}.${extension}`;
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from("community-photos")
      .upload(objectPath, photo, {
        contentType: photo.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError || !uploaded?.path) {
      redirect("/home?error=Your%20photo%20could%20not%20be%20uploaded.%20Please%20try%20again");
    }
    photoPath = uploaded.path;
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    body,
    visibility,
    photo_path: photoPath,
  });

  if (error) {
    if (photoPath) await supabase.storage.from("community-photos").remove([photoPath]);
    redirect("/home?error=Your%20post%20could%20not%20be%20shared.%20Please%20try%20again");
  }

  revalidatePath("/home");
  redirect("/home?posted=1");
}
