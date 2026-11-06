"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function requirePremiumAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_platform_admin");
  if (adminError || !isAdmin) redirect("/home/premium?error=Administrator%20access%20only");
  return { supabase, user };
}

export async function createPremiumProduct(formData: FormData) {
  const { supabase, user } = await requirePremiumAdmin();
  const sellerType = String(formData.get("seller_type") ?? "");
  const productName = String(formData.get("product_name") ?? "").trim();
  const category = String(formData.get("category") ?? "Other").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sellerName = String(formData.get("seller_name") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const location = String(formData.get("seller_location") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp_number") ?? "").replace(/[^+0-9]/g, "");
  const email = String(formData.get("contact_email") ?? "").trim();
  const priceRaw = String(formData.get("price_zmw") ?? "").trim();
  const price = priceRaw ? Number(priceRaw) : null;
  const files = formData.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);

  if (!["business", "individual"].includes(sellerType)) redirect("/home/premium/admin?error=Choose%20a%20seller%20type");
  if (productName.length < 2 || productName.length > 120 || sellerName.length < 2) redirect("/home/premium/admin?error=Enter%20valid%20product%20and%20seller%20names");
  if (sellerType === "business" && !businessName) redirect("/home/premium/admin?error=Enter%20the%20business%20name");
  if (description.length > 1200 || category.length < 2 || category.length > 60) redirect("/home/premium/admin?error=Check%20the%20description%20and%20category");
  if (whatsapp.length < 7 || whatsapp.length > 30) redirect("/home/premium/admin?error=Enter%20a%20valid%20WhatsApp%20number");
  if (price !== null && (!Number.isFinite(price) || price < 0)) redirect("/home/premium/admin?error=Enter%20a%20valid%20ZMW%20price");
  if (files.length < 2 || files.length > 4) redirect("/home/premium/admin?error=Upload%20between%202%20and%204%20product%20photos");
  if (files.some((file) => !extensions[file.type] || file.size > MAX_IMAGE_BYTES)) redirect("/home/premium/admin?error=Use%20JPG,%20PNG%20or%20WebP%20photos%20up%20to%202%20MB%20each");

  const paths: string[] = [];
  for (const file of files) {
    const path = `admin/${crypto.randomUUID()}.${extensions[file.type]}`;
    const { error } = await supabase.storage.from("premium-marketplace").upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      if (paths.length) await supabase.storage.from("premium-marketplace").remove(paths);
      redirect("/home/premium/admin?error=One%20or%20more%20photos%20could%20not%20be%20uploaded");
    }
    paths.push(path);
  }

  const { error } = await supabase.from("premium_products").insert({
    seller_type: sellerType,
    product_name: productName,
    category,
    description,
    price_zmw: price,
    seller_name: sellerName,
    business_name: sellerType === "business" ? businessName : null,
    seller_location: location,
    whatsapp_number: whatsapp,
    contact_email: email || null,
    image_paths: paths,
    created_by: user.id,
    status: "draft",
    payment_status: "pending",
  });

  if (error) {
    await supabase.storage.from("premium-marketplace").remove(paths);
    redirect("/home/premium/admin?error=Listing%20could%20not%20be%20saved");
  }
  revalidatePath("/home/premium");
  revalidatePath("/home/premium/admin");
  redirect("/home/premium/admin?created=1");
}

export async function publishPremiumProduct(formData: FormData) {
  const { supabase } = await requirePremiumAdmin();
  const id = String(formData.get("id") ?? "");
  const days = Math.min(90, Math.max(1, Number(formData.get("days") ?? 30)));
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home/premium/admin?error=Invalid%20listing");
  const now = new Date();
  const expiry = new Date(now.getTime() + days * 86400000);
  const { data, error } = await supabase.from("premium_products").update({
    status: "published",
    payment_status: "paid",
    published_at: now.toISOString(),
    expires_at: expiry.toISOString(),
    updated_at: now.toISOString(),
  }).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect("/home/premium/admin?error=Could%20not%20publish%20listing");
  revalidatePath("/home/premium");
  revalidatePath("/home/premium/admin");
  redirect("/home/premium/admin?published=1");
}

export async function pausePremiumProduct(formData: FormData) {
  const { supabase } = await requirePremiumAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home/premium/admin?error=Invalid%20listing");
  const { data, error } = await supabase.from("premium_products").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect("/home/premium/admin?error=Could%20not%20pause%20listing");
  revalidatePath("/home/premium");
  revalidatePath("/home/premium/admin");
  redirect("/home/premium/admin?paused=1");
}

export async function deletePremiumProduct(formData: FormData) {
  const { supabase } = await requirePremiumAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home/premium/admin?error=Invalid%20listing");
  const { data: product, error: readError } = await supabase.from("premium_products").select("image_paths").eq("id", id).maybeSingle();
  if (readError || !product) redirect("/home/premium/admin?error=Listing%20could%20not%20be%20found");
  const { data: deleted, error } = await supabase.from("premium_products").delete().eq("id", id).select("id").maybeSingle();
  if (error || !deleted) redirect("/home/premium/admin?error=Could%20not%20delete%20listing");
  const paths = (product.image_paths ?? []) as string[];
  const { error: cleanupError } = paths.length ? await supabase.storage.from("premium-marketplace").remove(paths) : { error: null };
  revalidatePath("/home/premium");
  revalidatePath("/home/premium/admin");
  redirect(cleanupError ? "/home/premium/admin?deleted=1&cleanup=1" : "/home/premium/admin?deleted=1");
}

export async function togglePremiumFeatured(formData: FormData) {
  const { supabase } = await requirePremiumAdmin();
  const id = String(formData.get("id") ?? "");
  const featured = String(formData.get("featured") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home/premium/admin?error=Invalid%20listing");
  const { data, error } = await supabase.from("premium_products").update({ is_featured: featured, updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect("/home/premium/admin?error=Could%20not%20update%20featured%20placement");
  revalidatePath("/home/premium");
  revalidatePath("/home/premium/admin");
  redirect("/home/premium/admin?featured=1");
}

export async function updatePremiumProduct(formData: FormData) {
  const { supabase } = await requirePremiumAdmin();
  const id = String(formData.get("product_id") ?? "");
  const productName = String(formData.get("product_name") ?? "").trim();
  const category = String(formData.get("category") ?? "Other").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sellerName = String(formData.get("seller_name") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const location = String(formData.get("seller_location") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp_number") ?? "").replace(/[^+0-9]/g, "");
  const email = String(formData.get("contact_email") ?? "").trim();
  const priceRaw = String(formData.get("price_zmw") ?? "").trim();
  const price = priceRaw ? Number(priceRaw) : null;
  const sellerType = String(formData.get("seller_type") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home/premium/admin?error=Invalid%20listing");
  if (!["business", "individual"].includes(sellerType) || productName.length < 2 || productName.length > 120 || sellerName.length < 2 || sellerName.length > 100) redirect("/home/premium/admin?error=Check%20the%20product%20and%20seller%20names");
  if (sellerType === "business" && !businessName) redirect("/home/premium/admin?error=Enter%20the%20business%20name");
  if (category.length < 2 || category.length > 60 || description.length > 1200 || location.length > 120) redirect("/home/premium/admin?error=Check%20the%20listing%20details");
  if (whatsapp.length < 7 || whatsapp.length > 30 || (price !== null && (!Number.isFinite(price) || price < 0))) redirect("/home/premium/admin?error=Check%20the%20price%20and%20WhatsApp%20number");

  const { data, error } = await supabase.from("premium_products").update({
    seller_type: sellerType,
    product_name: productName,
    category,
    description,
    price_zmw: price,
    seller_name: sellerName,
    business_name: sellerType === "business" ? businessName : null,
    seller_location: location,
    whatsapp_number: whatsapp,
    contact_email: email || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect("/home/premium/admin?error=Listing%20details%20could%20not%20be%20saved");
  revalidatePath("/home/premium");
  revalidatePath("/home/premium/admin");
  redirect("/home/premium/admin?updated=1");
}

export async function replacePremiumProductPhotos(formData: FormData) {
  const { supabase } = await requirePremiumAdmin();
  const id = String(formData.get("product_id") ?? "");
  const files = formData.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home/premium/admin?error=Invalid%20listing");
  if (files.length < 2 || files.length > 4) redirect("/home/premium/admin?error=Choose%202%20to%204%20replacement%20photos");
  if (files.some((file) => !extensions[file.type] || file.size > MAX_IMAGE_BYTES)) redirect("/home/premium/admin?error=Use%20JPG,%20PNG%20or%20WebP%20photos%20up%20to%202%20MB%20each");

  const { data: product, error: readError } = await supabase.from("premium_products").select("image_paths").eq("id", id).maybeSingle();
  if (readError || !product) redirect("/home/premium/admin?error=Listing%20could%20not%20be%20found");
  const newPaths: string[] = [];
  for (const file of files) {
    const path = `admin/${crypto.randomUUID()}.${extensions[file.type]}`;
    const { data, error } = await supabase.storage.from("premium-marketplace").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error || !data?.path) {
      if (newPaths.length) await supabase.storage.from("premium-marketplace").remove(newPaths);
      redirect("/home/premium/admin?error=Replacement%20photos%20could%20not%20be%20uploaded");
    }
    newPaths.push(data.path);
  }

  const { data: saved, error: saveError } = await supabase.from("premium_products").update({ image_paths: newPaths, updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
  if (saveError || !saved) {
    await supabase.storage.from("premium-marketplace").remove(newPaths);
    redirect("/home/premium/admin?error=Replacement%20photos%20were%20not%20saved");
  }
  const oldPaths = (product.image_paths ?? []) as string[];
  const { error: cleanupError } = oldPaths.length ? await supabase.storage.from("premium-marketplace").remove(oldPaths) : { error: null };
  revalidatePath("/home/premium");
  revalidatePath("/home/premium/admin");
  redirect(cleanupError ? "/home/premium/admin?updated=photos&cleanup=1" : "/home/premium/admin?updated=photos");
}

