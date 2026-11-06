import { CommunityNavigation } from "@/components/community-navigation";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompressedImageForm } from "@/components/compressed-image-form";
import { createPremiumProduct, publishPremiumProduct, pausePremiumProduct, deletePremiumProduct, togglePremiumFeatured } from "../actions";

type Product = {
  id: string; product_name: string; seller_type: string; seller_name: string;
  business_name: string | null; category: string; price_zmw: number | null;
  status: string; payment_status: string; is_featured: boolean; created_at: string; image_paths: string[];
};

export default async function PremiumAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; welcome?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_platform_admin");
  if (adminError || !isAdmin) redirect("/home/premium?error=Administrator%20access%20only");

  const { data } = await supabase.from("premium_products").select("id,product_name,seller_type,seller_name,business_name,category,price_zmw,status,payment_status,is_featured,created_at,image_paths").order("created_at", { ascending: false }).limit(100);
  const products = (data ?? []) as Product[];

  return <main className="app-layout"><CommunityNavigation active="premium" /><section className="app-main">
    <header className="topbar"><Link href="/home/premium" className="back-link">← Marketplace</Link><span className="muted">PLATFORM ADMINISTRATOR</span></header>
    <div className="app-content premium-content">
      <section className="premium-admin-heading"><span className="eyebrow">ROYALTY CONTROL CENTRE</span><h1>Premium advertising</h1><p>Create client listings, confirm payment and publish advertisements for the TIZIBANE community.</p></section>
      {params.welcome && <div className="notice" role="status">Logged in successfully. Welcome back!</div>}
      {params.error && <div className="notice" role="alert">{params.error}</div>}
      {params.created && <div className="notice" role="status">Listing saved as a draft. Confirm payment before publishing it.</div>}
      <section className="premium-admin-form">
        <div className="feed-heading"><div><span className="eyebrow">NEW CLIENT ADVERTISEMENT</span><h2>Create product canvas</h2></div><span className="muted">Administrator only</span></div>
        <CompressedImageForm action={createPremiumProduct} className="premium-listing-form">
          <label>Seller type<select name="seller_type" required defaultValue="business"><option value="business">Business</option><option value="individual">Individual</option></select></label>
          <label>Product name<input name="product_name" required maxLength={120} placeholder="e.g. Handmade leather handbag"/></label>
          <label>Category<select name="category" defaultValue="Fashion"><option>Fashion</option><option>Shoes & Accessories</option><option>Beauty & Cosmetics</option><option>Electronics</option><option>Furniture & Home</option><option>Food & Catering</option><option>Art & Crafts</option><option>Services</option><option>Other</option></select></label>
          <label>Price in ZMW (optional)<input name="price_zmw" type="number" min="0" step="0.01" placeholder="e.g. 450"/></label>
          <label>Seller / contact name<input name="seller_name" required maxLength={100} placeholder="Name shown to customers"/></label>
          <label>Business name (required for businesses)<input name="business_name" maxLength={120} placeholder="Business or shop name"/></label>
          <label>Seller location<input name="seller_location" maxLength={120} placeholder="Town / area"/></label>
          <label>Seller WhatsApp number<input name="whatsapp_number" required placeholder="e.g. +260 97 000 0000"/></label>
          <label>Contact email (optional)<input name="contact_email" type="email" maxLength={254} placeholder="seller@example.com"/></label>
          <label className="premium-form-full">Product description<textarea name="description" rows={4} maxLength={1200} placeholder="Describe the product, key features and useful details…"/></label>
          <label className="premium-form-full">Product photographs <span className="muted">(2–4 photos · JPG, PNG or WebP · optimized toward 1 MB each · maximum 2 MB each)</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple required/></label>
          <p className="premium-form-full premium-form-hint">Listings are saved as unpaid drafts. After you verify the client's payment, use Publish below to mark the payment as confirmed and set the advertising period. Do not publish until payment has actually been received.</p>
          <button className="btn btn-primary premium-form-full" type="submit">Save product as draft</button>
        </CompressedImageForm>
      </section>
      <section className="premium-admin-list">
        <div className="feed-heading"><div><span className="eyebrow">LISTING MANAGEMENT</span><h2>Client advertisements</h2></div><span className="muted">{products.length} records · newest first</span></div>
        {products.length === 0 ? <div className="empty-state"><h3>No product listings yet</h3><p>New client advertisements will appear here after you save them.</p></div> :
        <div className="premium-admin-items">{products.map(product => <article className="premium-admin-item" key={product.id}>
          <div><strong>{product.product_name}</strong><p>{product.seller_type === "business" ? product.business_name : product.seller_name} · {product.category}{product.price_zmw !== null ? ` · K${Number(product.price_zmw).toFixed(2)}` : ""}</p><span className={`premium-status premium-status-${product.status}`}>{product.status.replace("_"," ")}</span> <span className="premium-status">Payment: {product.payment_status}</span><small>Added {new Date(product.created_at).toLocaleDateString("en-ZM")}</small></div>
          <div className="premium-admin-actions">
            {product.status !== "published" && <form action={publishPremiumProduct}><input type="hidden" name="id" value={product.id}/><label>Days<select name="days" defaultValue="30"><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label><button className="btn btn-primary" type="submit">Confirm paid & publish</button></form>}
            {product.status === "published" && <form action={pausePremiumProduct}><input type="hidden" name="id" value={product.id}/><button className="btn" type="submit">Pause listing</button></form>}
            <form action={togglePremiumFeatured}><input type="hidden" name="id" value={product.id}/><input type="hidden" name="featured" value={product.is_featured ? "false" : "true"}/><button className="btn" type="submit">{product.is_featured ? "Remove featured" : "Feature listing"}</button></form>
            <form action={deletePremiumProduct}><input type="hidden" name="id" value={product.id}/><button className="text-action muted-action" type="submit">Delete</button></form>
          </div>
        </article>)}</div>}
      </section>
      <footer className="community-credit">Developed by Royalty For the Zambian community.</footer>
    </div>
  </section></main>;
}
