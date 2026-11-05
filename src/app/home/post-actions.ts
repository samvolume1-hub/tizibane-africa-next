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
  redirect("/home");
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
