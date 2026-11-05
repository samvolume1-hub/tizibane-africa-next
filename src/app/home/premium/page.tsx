import { Brand } from "@/components/brand";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../../auth-actions";
import PremiumProductCarousel from "./ProductCarousel";

const whatsapp = (number: string, message: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

const generalMessage = "Hello Royalty, I would like to advertise with TIZIBANE. Please send me the advertising packages and prices.";
const businessMessage = "Hello Royalty, I am advertising as a BUSINESS on TIZIBANE. Please send me the packages, prices and submission requirements.";
const individualMessage = "Hello Royalty, I am advertising as an INDIVIDUAL on TIZIBANE. Please send me the packages, prices and submission requirements.";

type PremiumProduct = { id: string; seller_type: string; product_name: string; category: string; description: string; price_zmw: number | null; seller_name: string; business_name: string | null; seller_location: string; whatsapp_number: string; contact_email: string | null; image_paths: string[]; is_featured: boolean; published_at: string | null };

export default async function PremiumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const isPremiumAdmin = (user.email ?? "").toLowerCase() === "samvolume1@gmail.com";
  const { data: productRows } = await supabase.from("premium_products")
    .select("id,seller_type,product_name,category,description,price_zmw,seller_name,business_name,seller_location,whatsapp_number,contact_email,image_paths,is_featured,published_at")
    .eq("status", "published").eq("payment_status", "paid")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("is_featured", { ascending: false }).order("published_at", { ascending: false }).limit(40);
  const products = (productRows ?? []) as PremiumProduct[];

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Main navigation">
          <Link href="/home"><span className="nav-icon">⌂</span>Home</Link>
          <Link href="/home/profile"><span className="nav-icon">◎</span>My profile</Link>
          <Link href="/home/people"><span className="nav-icon">♧</span>People</Link>
          <Link href="/home/messages"><span className="nav-icon">✉</span>Messages</Link>
          <Link href="/home/notifications"><span className="nav-icon">♢</span>Notifications</Link>
          <Link href="/home/blocked"><span className="nav-icon">⊘</span>Blocked</Link>
          <Link href="/home/groups"><span className="nav-icon">◈</span>Groups</Link>
          <Link href="/home/events"><span className="nav-icon">◇</span>Events</Link>
          <Link href="/home/premium" className="active"><span className="nav-icon">✦</span>Premium advertising</Link>
          <Link href="/home/connect"><span className="nav-icon">↗</span>Company links</Link>
        </nav>
        <form action={signOut} className="sidebar-signout"><button className="btn" style={{ width: "100%" }}>Sign out</button></form>
      </aside>

      <section className="app-main">
        <header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">ROYALTY · PAID ADVERTISING</span></header>
        <div className="app-content premium-content">
          <section className="premium-hero premium-hero-photo">
            <img className="photo-backdrop" src="/images/fzJ2RgsQKQ0IRabCRUcpgTclFLNN70M311nzsjgfGvOZSxuLII03Hr_XJG_CQ9kRG_HBr7XzN-yIf5v371lJ6Z9hcw_chMa-d019Ll-Xdfl2I0ZqbhatI6-mY9hFMql1hC_1mtI-yYh06S8TZGGN3BCaf7mcZqeXzOFAef7KEQnKFb5-uv43k1f9NIlI-E0M.jpg" alt="" aria-hidden="true" loading="eager"/>
            <span className="eyebrow">TIZIBANE PREMIUM MARKETPLACE</span>
            <p className="premium-kicker">YOUR PRODUCTS. YOUR BUSINESS. OUR COMMUNITY.</p>
            <h1>Advertise with <em>TIZIBANE</em></h1>
            <p className="premium-lead">Put your products in front of our community. Royalty helps you present what you sell in a polished product showcase, so interested people can discover it and contact you directly.</p>
            <div className="premium-hero-actions">
              <a className="btn btn-primary" href={whatsapp("260760930509", generalMessage)} target="_blank" rel="noopener noreferrer">Ask about advertising ↗</a>
              <a className="premium-secondary-action" href="mailto:samryt26@gmail.com?subject=TIZIBANE%20advertising%20enquiry">Email Royalty</a>
            </div>
            <div className="premium-trust-row"><span>✦ Paid advertising service</span><span>◇ Reviewed by an administrator</span><span>↗ Direct seller enquiries</span></div>
          </section>


          <section className="premium-live-marketplace">
            <div className="feed-heading">
              <div><span className="eyebrow">DISCOVER LOCAL PRODUCTS</span><h2>Featured in our community</h2></div>
              <span className="muted">{products.length} published listings</span>
            </div>
            {products.length === 0 ? (
              <div className="premium-empty-market"><span className="premium-card-symbol">✦</span><h3>Our first products are on the way.</h3><p>New advertisements approved by Royalty will appear here. Check back soon and discover businesses and independent sellers from our community.</p></div>
            ) : (
              <div className="premium-product-grid">
                {products.map((product) => {
                  const images = product.image_paths.map((path) => supabase.storage.from("premium-marketplace").getPublicUrl(path).data.publicUrl);
                  const seller = product.seller_type === "business" ? (product.business_name || product.seller_name) : product.seller_name;
                  const message = `Hello ${seller}, I saw your ${product.product_name} advertisement on TIZIBANE. Is it still available?`;
                  return <article className="premium-product-card" key={product.id}>
                    {product.is_featured && <span className="premium-product-featured">✦ FEATURED</span>}
                    <PremiumProductCarousel images={images} title={product.product_name}/>
                    <div className="premium-product-copy">
                      <span className="premium-product-category">{product.category}</span>
                      <h3>{product.product_name}</h3>
                      {product.price_zmw !== null && <strong className="premium-product-price">K{Number(product.price_zmw).toLocaleString("en-ZM", {minimumFractionDigits:2,maximumFractionDigits:2})}</strong>}
                      {product.description && <p>{product.description}</p>}
                      <div className="premium-seller-details"><strong>{seller}</strong><span>{product.seller_location || (product.seller_type === "business" ? "Business advertiser" : "Individual seller")}</span></div>
                      <a className="btn btn-primary premium-contact-seller" href={`https://wa.me/${product.whatsapp_number.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Contact seller on WhatsApp ↗</a>
                      {product.contact_email && <a className="premium-seller-email" href={`mailto:${product.contact_email}`}>Email seller</a>}
                    </div>
                  </article>;
                })}
              </div>
            )}
          </section>
          {isPremiumAdmin && <div className="premium-admin-shortcut"><span><strong>Administrator access</strong><small>Manage client photos, payments and published advertisements.</small></span><Link className="btn btn-primary" href="/home/premium/admin">Open advertising control centre ↗</Link></div>}

          <section className="premium-intro">
            <div><span className="eyebrow">WHO CAN ADVERTISE?</span><h2>One marketplace. Two ways to grow.</h2></div>
            <p>Whether you run an established company or sell independently, you can promote your products to TIZIBANE members.</p>
          </section>

          <div className="premium-audience-grid">
            <article className="premium-audience-card">
              <div className="premium-card-symbol">▦</div>
              <span className="premium-card-label">FOR REGISTERED & GROWING BUSINESSES</span>
              <h3>Advertise as a Business</h3>
              <p>Give your business a professional presence and showcase the products or services you want customers to notice.</p>
              <ul><li>Business name and description</li><li>Product photographs and clear details</li><li>Seller location and contact information</li><li>Opportunity to request featured promotion</li></ul>
              <a className="btn btn-primary premium-wide-button" href={whatsapp("260760930509", businessMessage)} target="_blank" rel="noopener noreferrer">Advertise as a Business ↗</a>
            </article>
            <article className="premium-audience-card premium-individual-card">
              <div className="premium-card-symbol">✧</div>
              <span className="premium-card-label">FOR ENTREPRENEURS & INDIVIDUAL SELLERS</span>
              <h3>Advertise as an Individual</h3>
              <p>You do not need a registered company to promote something you make, own or sell. Individuals are welcome too.</p>
              <ul><li>Your name or preferred seller name</li><li>Product photographs and clear details</li><li>Your location and preferred contact</li><li>Direct enquiries from interested buyers</li></ul>
              <a className="btn btn-primary premium-wide-button" href={whatsapp("260760930509", individualMessage)} target="_blank" rel="noopener noreferrer">Advertise as an Individual ↗</a>
            </article>
          </div>

          <section className="premium-packages">
            <div className="feed-heading"><div><span className="eyebrow">ADVERTISING OPTIONS</span><h2>Choose the visibility you need</h2></div><span className="muted">Packages confirmed by Royalty</span></div>
            <div className="premium-package-grid">
              <article className="premium-package"><span className="premium-package-number">01</span><h3>Product Listing</h3><p>A clean, professional canvas for one product.</p><ul><li>One product showcase</li><li>2–4 photographs</li><li>Product and seller details</li><li>Direct contact button</li></ul><span className="premium-package-note">Ask for the current fee</span></article>
              <article className="premium-package premium-package-featured"><span className="premium-package-number">02</span><span className="premium-featured-label">EXTRA VISIBILITY</span><h3>Featured Product</h3><p>For sellers who want their selected product to receive more attention.</p><ul><li>Everything in Product Listing</li><li>Featured placement when available</li><li>Promotional period agreed in advance</li><li>Basic performance feedback where available</li></ul><span className="premium-package-note">Ask for the current fee</span></article>
              <article className="premium-package"><span className="premium-package-number">03</span><h3>Business Showcase</h3><p>A coordinated presence for businesses with several products.</p><ul><li>Multiple product listings</li><li>Business profile information</li><li>Consistent seller contact details</li><li>Bundle pricing on request</li></ul><span className="premium-package-note">Ask for the current fee</span></article>
            </div>
            <p className="premium-pricing-note">We will confirm the price, advertising period and available placement with you before payment. No fixed prices are displayed until Royalty publishes the official rate card.</p>
          </section>

          <section className="premium-process">
            <div className="feed-heading"><div><span className="eyebrow">SIMPLE & PERSONAL</span><h2>How advertising works</h2></div></div>
            <div className="premium-steps">
              <div><b>01</b><strong>Contact Royalty</strong><p>Tell us whether you are advertising as a business or individual.</p></div>
              <div><b>02</b><strong>Choose your package</strong><p>We confirm the fee, duration and submission requirements.</p></div>
              <div><b>03</b><strong>Send your details</strong><p>Provide 2–4 clear product photos, price, description, seller details and contact information.</p></div>
              <div><b>04</b><strong>Review & publish</strong><p>After payment is confirmed, an administrator reviews and publishes your listing.</p></div>
            </div>
          </section>

          <section className="premium-bottom-cta">
            <span className="eyebrow">LET'S HELP YOUR PRODUCTS GET NOTICED</span>
            <h2>Ready to advertise?</h2>
            <p>Start a conversation with Royalty. We will guide you through the package, payment and product submission process.</p>
            <div className="premium-hero-actions">
              <a className="btn btn-primary" href={whatsapp("260760930509", generalMessage)} target="_blank" rel="noopener noreferrer">WhatsApp Royalty · +260 760 930 509 ↗</a>
              <a className="premium-secondary-action" href={whatsapp("260769614559", generalMessage)} target="_blank" rel="noopener noreferrer">Alternative WhatsApp ↗</a>
              <a className="premium-secondary-action" href="mailto:samryt26@gmail.com?subject=TIZIBANE%20advertising%20enquiry">samryt26@gmail.com</a>
            </div>
            <small>Advertising is a paid promotional service. TIZIBANE provides product visibility and contact opportunities; sales and customer responses are not guaranteed.</small>
          </section>

          <footer className="community-credit">Developed by Royalty For the Zambian community.</footer>
        </div>
      </section>
    </main>
  );
}
