"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireSpotlightAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin, error } = await supabase.rpc("is_current_platform_admin");
  if (error || !isAdmin) redirect("/home/premium?error=Administrator%20access%20only");
  return { supabase, user };
}
function validId(value: string) { return /^[0-9a-f-]{36}$/i.test(value); }
function refreshSpotlight() {
  revalidatePath("/home/spotlight");
  revalidatePath("/home/premium/admin");
}

export async function createSpotlightCompanyReview(formData: FormData) {
  const { supabase, user } = await requireSpotlightAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "TIZIBANE").trim();
  const category = String(formData.get("category") ?? "Company review").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sourceUrl = String(formData.get("source_url") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  if (title.length < 3 || title.length > 140 || companyName.length < 2 || companyName.length > 100 || category.length < 2 || category.length > 60 || body.length < 20 || body.length > 5000 || !["draft", "published"].includes(status)) {
    redirect("/home/premium/admin?spotlightError=Check%20the%20company%20review%20fields");
  }
  if (sourceUrl) {
    try { const url = new URL(sourceUrl); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); }
    catch { redirect("/home/premium/admin?spotlightError=Source%20link%20must%20be%20a%20valid%20HTTPS%20URL"); }
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from("spotlight_company_reviews").insert({
    title, company_name: companyName, category, body, source_url: sourceUrl || null,
    status, created_by: user.id, published_at: status === "published" ? now : null,
    is_pinned: formData.get("is_pinned") === "on",
  });
  if (error) redirect("/home/premium/admin?spotlightError=Company%20review%20could%20not%20be%20saved");
  refreshSpotlight();
  redirect("/home/premium/admin?spotlight=company-created");
}

export async function setSpotlightCompanyReviewStatus(formData: FormData) {
  const { supabase } = await requireSpotlightAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!validId(id) || !["draft", "published", "archived"].includes(status)) redirect("/home/premium/admin?spotlightError=Invalid%20company%20review%20action");
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("spotlight_company_reviews").update({
    status, published_at: status === "published" ? now : null, updated_at: now,
  }).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect("/home/premium/admin?spotlightError=Could%20not%20update%20company%20review");
  refreshSpotlight();
  redirect("/home/premium/admin?spotlight=company-updated");
}

export async function moderateSpotlightSubmission(formData: FormData) {
  const { supabase, user } = await requireSpotlightAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const adminNote = String(formData.get("admin_note") ?? "").trim();
  if (!validId(id) || !["approved", "rejected"].includes(status) || adminNote.length > 1000) redirect("/home/premium/admin?spotlightError=Invalid%20submission%20review");
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("spotlight_submissions").update({
    status, admin_note: adminNote, reviewed_by: user.id, reviewed_at: now, updated_at: now,
  }).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect("/home/premium/admin?spotlightError=Could%20not%20save%20submission%20review");
  refreshSpotlight();
  redirect("/home/premium/admin?spotlight=submission-reviewed");
}
