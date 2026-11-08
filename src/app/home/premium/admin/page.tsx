import { CommunityNavigation } from "@/components/community-navigation";
import { PendingIconButton } from "@/components/pending-icon-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompressedImageForm } from "@/components/compressed-image-form";
import { ContentMoreMenu } from "@/components/content-more-menu";
import { createPremiumProduct, publishPremiumProduct, pausePremiumProduct, deletePremiumProduct, togglePremiumFeatured, updatePremiumProduct, replacePremiumProductPhotos } from "../actions";

type Product = {
  id: string; product_name: string; seller_type: string; seller_name: string;
  business_name: string | null; category: string; description: string; price_zmw: number | null;
  seller_location: string; whatsapp_number: string; contact_email: string | null;
  status: string; payment_status: string; is_featured: boolean; created_at: string; image_paths: string[];
};

export default async function PremiumAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; welcome?: string; published?: string; paused?: string; deleted?: string; updated?: string; featured?: string; cleanup?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_platform_admin");
  if (adminError || !isAdmin) redirect("/home/premium?error=Administrator%20access%20only");

  const { data } = await supabase.from("premium_products").select("id,product_name,seller_type,seller_name,business_name,category,description,price_zmw,seller_location,whatsapp_number,contact_email,status,payment_status,is_featured,created_at,image_paths").order("created_at", { ascending: false }).limit(100);
  const products = (data ?? []) as Product[];

  return <main className="app-layout"><CommunityNavigation active="premium" /><section className="app-main">
    <header className="topbar"><Link href="/home/premium" className="back-link">← Marketplace</Link><span className="muted">PLATFORM ADMINISTRATOR</span></header>
    <div className="app-content premium-content">
      <section className="premium-admin-heading"><span className="eyebrow">ROYALTY CONTROL CENTRE</span><h1>Premium advertising</h1><p>Create client listings, confirm payment and publish advertisements for the TIZIBANE community.</p></section>
      {params.welcome && <div className="notice" role="status">Logged in successfully. Welcome back!</div>}
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
          <PendingIconButton className="btn btn-primary premium-form-full" label="Save product as draft" pendingLabel="Saving…">Save product as draft</PendingIconButton>
        </CompressedImageForm>
      </section>
      {params.created && <div className="notice" role="status">Your listing and photos have been saved as a draft. Confirm payment before publishing.</div>}
      {params.published && <div className="notice" role="status">The listing is now published and marked as paid.</div>}
      {params.paused && <div className="notice" role="status">The listing has been paused.</div>}
      {params.featured && <div className="notice" role="status">The featured placement has been updated.</div>}
      {params.deleted && <div className="notice" role="status">The listing has been deleted from the database.</div>}
      {params.updated && <div className="notice" role="status">{params.updated === "photos" ? "The product photographs have been replaced." : "The listing details have been updated."}</div>}
      {params.cleanup && <div className="notice" role="alert">The database change succeeded, but one or more old images could not be removed from storage. Please review the listing's image storage.</div>}
      {params.error && <div className="notice" role="alert">{params.error}</div>}
      <section className="premium-admin-list">
        <div className="feed-heading"><div><span className="eyebrow">LISTING MANAGEMENT</span><h2>Client advertisements</h2></div><span className="muted">{products.length} records · newest first</span></div>
        {products.length === 0 ? <div className="empty-state"><h3>No product listings yet</h3><p>New client advertisements will appear here after you save them.</p></div> :
        <div className="premium-admin-items">{products.map(product => <article className="premium-admin-item" key={product.id}>
          <div><strong>{product.product_name}</strong><p>{product.seller_type === "business" ? product.business_name : product.seller_name} · {product.category}{product.price_zmw !== null ? ` · K${Number(product.price_zmw).toFixed(2)}` : ""}</p><span className={`premium-status premium-status-${product.status}`}>{product.status.replace("_"," ")}</span> <span className="premium-status">Payment: {product.payment_status}</span><small>Added {new Date(product.created_at).toLocaleDateString("en-ZM")}</small></div>
          <div className="premium-admin-actions">
            <ContentMoreMenu fields={{ product_id: product.id }}>
              <details className="content-more-submenu">
                <summary>Edit listing details</summary>
                <form action={updatePremiumProduct} className="content-menu-form">
                  <input type="hidden" name="product_id" value={product.id}/>
                  <label>Seller type<select name="seller_type" defaultValue={product.seller_type}><option value="business">Business</option><option value="individual">Individual</option></select></label>
                  <label>Product name<input name="product_name" defaultValue={product.product_name} required maxLength={120}/></label>
                  <label>Category<input name="category" defaultValue={product.category} required maxLength={60}/></label>
                  <label>Price in ZMW<input name="price_zmw" type="number" min="0" step="0.01" defaultValue={product.price_zmw ?? ""}/></label>
                  <label>Seller name<input name="seller_name" defaultValue={product.seller_name} required maxLength={100}/></label>
                  <label>Business name<input name="business_name" defaultValue={product.business_name ?? ""} maxLength={120}/></label>
                  <label>Location<input name="seller_location" defaultValue={product.seller_location ?? ""} maxLength={120}/></label>
                  <label>WhatsApp<input name="whatsapp_number" defaultValue={product.whatsapp_number ?? ""} required maxLength={30}/></label>
                  <label>Contact email<input name="contact_email" type="email" defaultValue={product.contact_email ?? ""} maxLength={254}/></label>
                  <label>Description<textarea name="description" defaultValue={product.description ?? ""} rows={4} maxLength={1200}/></label>
                  <PendingIconButton className="btn btn-primary" label="Save listing changes" pendingLabel="Saving…">Save listing changes</PendingIconButton>
                </form>
              </details>
              <details className="content-more-submenu">
                <summary>Replace product photos</summary>
                <CompressedImageForm action={replacePremiumProductPhotos} className="content-menu-form">
                  <input type="hidden" name="product_id" value={product.id}/>
                  <label className="content-menu-file">Choose 2–4 new photos<input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple required/></label>
                  <p>New photos are optimized toward 1 MB each and must be no larger than 2 MB after optimization.</p>
                  <PendingIconButton className="btn btn-primary" label="Save replacement photos" pendingLabel="Uploading…">Save replacement photos</PendingIconButton>
                </CompressedImageForm>
              </details>
              {product.status !== "published" && <details className="content-more-submenu"><summary>Publish listing</summary><form action={publishPremiumProduct} className="content-menu-form"><input type="hidden" name="id" value={product.id}/><label>Advertising period<select name="days" defaultValue="30"><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label><p>Only publish after payment has actually been received and verified.</p><button className="btn btn-primary" type="submit">Confirm paid & publish</button></form></details>}
              {product.status === "published" && <details className="content-more-submenu"><summary>Pause listing</summary><form action={pausePremiumProduct} className="content-menu-form"><input type="hidden" name="id" value={product.id}/><p>Pause this advertisement so it no longer appears in the marketplace.</p><button className="btn" type="submit">Confirm pause</button></form></details>}
              <details className="content-more-submenu"><summary>{product.is_featured ? "Remove featured placement" : "Feature listing"}</summary><form action={togglePremiumFeatured} className="content-menu-form"><input type="hidden" name="id" value={product.id}/><input type="hidden" name="featured" value={product.is_featured ? "false" : "true"}/><button className="btn" type="submit">{product.is_featured ? "Remove featured" : "Feature listing"}</button></form></details>
              <details className="content-more-submenu"><summary>Delete listing</summary><form action={deletePremiumProduct} className="content-menu-form"><input type="hidden" name="id" value={product.id}/><p>This permanently removes the advertisement and its database record.</p><button className="text-action danger-action" type="submit">Confirm delete</button></form></details>
            </ContentMoreMenu>
          </div>
        </article>)}</div>}
      </section>
      <footer className="community-credit">Developed by Royalty For the Zambian community.</footer>
    </div>
  </section></main>;
}
