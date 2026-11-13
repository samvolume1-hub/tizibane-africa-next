import { CommunityNavigation } from "@/components/community-navigation";
import { PendingIconButton } from "@/components/pending-icon-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompressedImageForm } from "@/components/compressed-image-form";
import { ContentMoreMenu } from "@/components/content-more-menu";
import { createPremiumProduct, publishPremiumProduct, pausePremiumProduct, deletePremiumProduct, togglePremiumFeatured, updatePremiumProduct, replacePremiumProductPhotos } from "../actions";
import { createSpotlightCompanyReview, setSpotlightCompanyReviewStatus, moderateSpotlightSubmission } from "../spotlight-actions";

type Product = {
  id: string; product_name: string; seller_type: string; seller_name: string;
  business_name: string | null; category: string; description: string; price_zmw: number | null;
  seller_location: string; whatsapp_number: string; contact_email: string | null;
  status: string; payment_status: string; is_featured: boolean; created_at: string; image_paths: string[];
};

export default async function PremiumAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; welcome?: string; published?: string; paused?: string; deleted?: string; updated?: string; featured?: string; cleanup?: string; spotlight?: string; spotlightError?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_platform_admin");
  if (adminError || !isAdmin) redirect("/home/premium?error=Administrator%20access%20only");

  const { data } = await supabase.from("premium_products").select("id,product_name,seller_type,seller_name,business_name,category,description,price_zmw,seller_location,whatsapp_number,contact_email,status,payment_status,is_featured,created_at,image_paths").order("created_at", { ascending: false }).limit(100);
  const products = (data ?? []) as Product[];

  const [{ data: companyReviews }, { data: submissions }] = await Promise.all([
    supabase.from("spotlight_company_reviews").select("id,title,company_name,category,body,source_url,status,is_pinned,published_at,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("spotlight_submissions").select("id,user_id,category,title,public_url,note,status,admin_note,created_at").order("created_at", { ascending: false }).limit(100),
  ]);

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
              {product.status !== "published" && <details className="content-more-submenu"><summary>Publish listing</summary><form action={publishPremiumProduct} className="content-menu-form"><input type="hidden" name="id" value={product.id}/><label>Advertising period<select name="days" defaultValue="30"><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label><p>Only publish after payment has actually been received and verified.</p><PendingIconButton className="btn btn-primary" label="Confirm payment and publish listing" pendingLabel="Publishing…">Confirm paid & publish</PendingIconButton></form></details>}
              {product.status === "published" && <details className="content-more-submenu"><summary>Pause listing</summary><form action={pausePremiumProduct} className="content-menu-form"><input type="hidden" name="id" value={product.id}/><p>Pause this advertisement so it no longer appears in the marketplace.</p><PendingIconButton className="btn" label="Pause advertisement" pendingLabel="Pausing…">Confirm pause</PendingIconButton></form></details>}
              <details className="content-more-submenu"><summary>{product.is_featured ? "Remove featured placement" : "Feature listing"}</summary><form action={togglePremiumFeatured} className="content-menu-form"><input type="hidden" name="id" value={product.id}/><input type="hidden" name="featured" value={product.is_featured ? "false" : "true"}/><PendingIconButton className="btn" label={product.is_featured ? "Remove featured placement" : "Feature listing"} pendingLabel="Updating…">{product.is_featured ? "Remove featured" : "Feature listing"}</PendingIconButton></form></details>
              <details className="content-more-submenu"><summary>Delete listing</summary><form action={deletePremiumProduct} className="content-menu-form"><input type="hidden" name="id" value={product.id}/><p>This permanently removes the advertisement and its database record.</p><PendingIconButton className="text-action danger-action" label="Delete advertisement" pendingLabel="Deleting…">Confirm delete</PendingIconButton></form></details>
            </ContentMoreMenu>
          </div>
        </article>)}</div>}
      </section>

      <section className="premium-admin-form" aria-labelledby="spotlight-company-admin-title">
        <div className="feed-heading"><div><span className="eyebrow">PUBLIC SPOTLIGHT · ADMIN ONLY</span><h2 id="spotlight-company-admin-title">Publish a TIZIBANE company review</h2></div><span className="muted">Visible to every visitor when published</span></div>
        <form action={createSpotlightCompanyReview} className="premium-listing-form">
          <label>Review title<input name="title" required minLength={3} maxLength={140} placeholder="Clear headline for the public review"/></label>
          <label>Company name<input name="company_name" defaultValue="TIZIBANE" required maxLength={100}/></label>
          <label>Category<input name="category" defaultValue="Company review" required maxLength={60}/></label>
          <label>Original source link (optional)<input name="source_url" type="url" pattern="https://.*" maxLength={1000} placeholder="https://…"/></label>
          <label className="premium-form-full">Review / official statement<textarea name="body" required minLength={20} maxLength={5000} rows={6} placeholder="Write the complete company review or official update…"/></label>
          <label>Publishing status<select name="status" defaultValue="draft"><option value="draft">Save as draft</option><option value="published">Publish now</option></select></label>
          <label><span>Featured placement</span><input type="checkbox" name="is_pinned"/> Pin this review near the top</label>
          <PendingIconButton className="btn btn-primary premium-form-full" label="Save company review" pendingLabel="Saving…">Save company review</PendingIconButton>
        </form>
      </section>
      {params.spotlight && <div className="notice" role="status">{params.spotlight === "company-created" ? "Company review saved." : params.spotlight === "company-updated" ? "Company review status updated." : "Community submission review saved."}</div>}
      {params.spotlightError && <div className="notice" role="alert">{params.spotlightError}</div>}
      <section className="premium-admin-list">
        <div className="feed-heading"><div><span className="eyebrow">OFFICIAL CONTENT</span><h2>TIZIBANE company reviews</h2></div><span className="muted">{(companyReviews ?? []).length} records</span></div>
        {!companyReviews?.length ? <div className="empty-state"><h3>No company reviews published yet</h3><p>Create the first official review above. Drafts remain private until published.</p></div> :
          <div className="premium-admin-items">{companyReviews.map((review: {id:string;title:string;company_name:string;category:string;body:string;source_url:string|null;status:string;is_pinned:boolean;created_at:string}) => <article className="premium-admin-item" key={review.id}>
            <div><strong>{review.title}</strong><p>{review.company_name} · {review.category}</p><span className={`premium-status premium-status-${review.status}`}>{review.status}</span> {review.is_pinned && <span className="premium-status">Featured</span>}<small>Added {new Date(review.created_at).toLocaleDateString("en-ZM")}</small><p>{review.body.slice(0,220)}{review.body.length>220?"…":""}</p></div>
            <div className="premium-admin-actions">
              {review.status !== "published" && <form action={setSpotlightCompanyReviewStatus}><input type="hidden" name="id" value={review.id}/><input type="hidden" name="status" value="published"/><PendingIconButton className="btn btn-primary" label="Publish company review" pendingLabel="Publishing…">Publish</PendingIconButton></form>}
              {review.status === "published" && <form action={setSpotlightCompanyReviewStatus}><input type="hidden" name="id" value={review.id}/><input type="hidden" name="status" value="archived"/><PendingIconButton className="btn" label="Archive company review" pendingLabel="Archiving…">Archive</PendingIconButton></form>}
              {review.status === "archived" && <form action={setSpotlightCompanyReviewStatus}><input type="hidden" name="id" value={review.id}/><input type="hidden" name="status" value="draft"/><PendingIconButton className="btn" label="Return company review to draft" pendingLabel="Updating…">Return to draft</PendingIconButton></form>}
            </div>
          </article>)}</div>}
      </section>
      <section className="premium-admin-list">
        <div className="feed-heading"><div><span className="eyebrow">COMMUNITY MODERATION</span><h2>Spotlight submissions</h2></div><span className="muted">{(submissions ?? []).filter((item: {status:string}) => item.status === "pending").length} awaiting review · {(submissions ?? []).length} total</span></div>
        {!submissions?.length ? <div className="empty-state"><h3>No community submissions yet</h3><p>Member submissions will appear here after they are sent from the Spotlight Submission Centre.</p></div> :
          <div className="premium-admin-items">{submissions.map((item: {id:string;user_id:string;category:string;title:string;public_url:string;note:string;status:string;admin_note:string;created_at:string}) => <article className="premium-admin-item" key={item.id}>
            <div><strong>{item.title}</strong><p>{item.category} · Member {item.user_id.slice(0,8)} · {new Date(item.created_at).toLocaleDateString("en-ZM")}</p><span className={`premium-status premium-status-${item.status}`}>{item.status}</span><p>{item.note || "No extra note."}</p><a href={item.public_url} target="_blank" rel="noopener noreferrer">Open submitted work ↗</a></div>
            {item.status === "pending" ? <div className="premium-admin-actions">
              <form action={moderateSpotlightSubmission} className="content-menu-form"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="approved"/><label>Optional note to member<textarea name="admin_note" rows={2} maxLength={1000} defaultValue={item.admin_note}/></label><PendingIconButton className="btn btn-primary" label="Approve and publish submission" pendingLabel="Approving…">Approve & publish</PendingIconButton></form>
              <form action={moderateSpotlightSubmission} className="content-menu-form"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="rejected"/><label>Reason / private note<textarea name="admin_note" rows={2} maxLength={1000} defaultValue={item.admin_note}/></label><PendingIconButton className="btn" label="Reject submission" pendingLabel="Rejecting…">Reject</PendingIconButton></form>
            </div> : <div className="premium-admin-actions"><form action={moderateSpotlightSubmission} className="content-menu-form"><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value={item.status === "approved" ? "rejected" : "approved"}/><label>Review note<textarea name="admin_note" rows={2} maxLength={1000} defaultValue={item.admin_note}/></label><PendingIconButton className="btn" label={item.status === "approved" ? "Unpublish submission" : "Approve submission"} pendingLabel="Updating…">{item.status === "approved" ? "Unpublish" : "Approve & publish"}</PendingIconButton></form></div>}
          </article>)}</div>}
      </section>
      <footer className="community-credit">Developed by Royalty For the Zambian community.</footer>
    </div>
  </section></main>;
}
