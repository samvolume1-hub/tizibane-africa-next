"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "./spotlight-hub.module.css";

type CompanyReview = {
  id: string; title: string; company_name: string; category: string; body: string;
  source_url: string | null; is_pinned: boolean; published_at: string | null; created_at: string;
};
type Submission = {
  id: string; category: string; title: string; public_url: string; note: string;
  status: "pending" | "approved" | "rejected"; admin_note: string; created_at: string; reviewed_at: string | null;
};
type CommunityPick = { id: string; category: string; title: string; public_url: string; note: string; created_at: string };
type PublicationResponse = { authenticated: boolean; companyReviews: CompanyReview[]; communitySubmissions: CommunityPick[]; submissions: Submission[]; error?: string };
const categories = ["Music talent", "Music video", "Photography"];

export function SpotlightCompanyReviews() {
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/spotlight-publication", { cache: "no-store" })
      .then(async response => {
        const data = await response.json() as PublicationResponse;
        if (!response.ok) throw new Error(data.error || "Company reviews could not be loaded.");
        if (active) setReviews(data.companyReviews ?? []);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Company reviews could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className={styles.companySpotlight} aria-labelledby="company-spotlight-title" id="tizibane-company-reviews">
    <div className={styles.companyHeading}>
      <div><span className={styles.kicker}>OFFICIAL · FROM TIZIBANE</span><h2 id="company-spotlight-title">TIZIBANE Company Reviews</h2></div>
      <span className={styles.companyPill}>Public for everyone</span>
    </div>
    <p className={styles.companyIntro}>Company reviews, official updates and featured work from TIZIBANE. This section is visible to every visitor; only authorised TIZIBANE administrators can publish here.</p>
    {loading ? <p className={styles.companyEmpty}>Loading official reviews…</p> : error ? <p className={styles.companyEmpty} role="status">{error}</p> : reviews.length === 0 ?
      <div className={styles.companyEmpty}><strong>Our official reviews will appear here.</strong><span>New TIZIBANE company reviews and announcements will be published in this space.</span></div> :
      <div className={styles.companyReviews}>{reviews.map(review => <article className={styles.companyReview} key={review.id}>
        <div className={styles.companyMeta}><span>{review.category}</span>{review.is_pinned && <span className={styles.featuredPill}>FEATURED</span>}{review.published_at && <time dateTime={review.published_at}>{new Date(review.published_at).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })}</time>}</div>
        <h3>{review.title}</h3><p>{review.body}</p>
        {review.source_url && <a className={styles.companySource} href={review.source_url} target="_blank" rel="noopener noreferrer">View original source ↗</a>}
      </article>)}</div>}
  </section>;
}

function CommunitySpotlight({ items }: { items: CommunityPick[] }) {
  return <section className={styles.communitySpotlight} aria-labelledby="community-spotlight-title">
    <div className={styles.companyHeading}><div><span className={styles.kicker}>MEMBER WORK · MODERATED</span><h2 id="community-spotlight-title">Community Spotlight</h2></div><span className={styles.companyPill}>Approved submissions</span></div>
    <p className={styles.companyIntro}>Selected work shared by TIZIBANE members. Every item is checked by the review team before it appears here.</p>
    {items.length === 0 ? <p className={styles.companyEmpty}>Approved member submissions will appear here.</p> :
      <div className={styles.communityPicks}>{items.map(item => <article className={styles.communityPick} key={item.id}>
        <span>{item.category}</span><h3>{item.title}</h3>{item.note && <p>{item.note}</p>}
        <a href={item.public_url} target="_blank" rel="noopener noreferrer">View original work ↗</a>
      </article>)}</div>}
  </section>;
}


export function SpotlightCommunityPicks() {
  const [items, setItems] = useState<CommunityPick[]>([]);
  useEffect(() => {
    let active = true;
    fetch("/api/spotlight-publication", { cache: "no-store" })
      .then(async response => {
        const data = await response.json() as PublicationResponse;
        if (response.ok && active) setItems(data.communitySubmissions ?? []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <CommunitySpotlight items={items}/>;
}

export function SpotlightSubmissionCentre() {
  const [category, setCategory] = useState(categories[0]);
  const [title, setTitle] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [note, setNote] = useState("");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const response = await fetch("/api/spotlight-publication", { cache: "no-store" });
      const data = await response.json() as PublicationResponse;
      if (!response.ok) throw new Error(data.error || "Submission status is unavailable.");
      setAuthenticated(data.authenticated);
      setSubmissions(data.submissions ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Submission status is unavailable.");
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/spotlight-publication", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ category, title, publicUrl, note }),
      });
      const data = await response.json() as { submission?: Submission; error?: string; signInRequired?: boolean };
      if (!response.ok) {
        if (data.signInRequired) setError("Please sign in to your TIZIBANE account before sending a submission. Your draft stays on this screen.");
        else setError(data.error || "Your submission could not be saved.");
        return;
      }
      if (data.submission) setSubmissions(current => [data.submission!, ...current]);
      setMessage("Your submission has been received and is awaiting review. It is not public yet.");
      setTitle(""); setPublicUrl(""); setNote("");
      setAuthenticated(true);
    } catch {
      setError("A connection problem prevented the submission. Please try again.");
    } finally { setBusy(false); }
  }

  return <section className={styles.reviewSection} id="submit-review" aria-labelledby="submit-review-title">
    <div className={styles.sectionHeading}>
      <div><span className={styles.kicker}>THE COMMUNITY SUBMISSION CENTRE</span><h2 id="submit-review-title">Submit your work for review</h2></div>
      <span className={styles.pill}>Private until approved</span>
    </div>
    <p className={styles.sectionIntro}>Share a public HTTPS link to music talent, a music video or photography. Your submission is saved privately to your account and sent to the TIZIBANE review queue. It only becomes visible to visitors after an administrator approves it. No media is uploaded or stored by TIZIBANE.</p>
    <form className={styles.reviewForm} onSubmit={submit}>
      <label>What are you submitting?
        <select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item}>{item}</option>)}</select>
      </label>
      <label>Title or artist name
        <input required minLength={2} maxLength={140} value={title} onChange={event => setTitle(event.target.value)} placeholder="Artist, song, video or photography title"/>
      </label>
      <label className={styles.fullField}>Public link
        <input required type="url" pattern="https://.*" title="Use a public HTTPS link." maxLength={1000} value={publicUrl} onChange={event => setPublicUrl(event.target.value)} placeholder="https://…"/>
        <small>Use a public YouTube, TikTok, Instagram, Facebook, portfolio or website link.</small>
      </label>
      <label className={styles.fullField}>Brief note <span className={styles.optional}>Optional · 500 characters</span>
        <textarea maxLength={500} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Tell our review team a little about this work…"/>
      </label>
      {(title || publicUrl || note) && <div className={styles.submissionPreview}>
        <strong>Your private preview</strong><span>{category}</span><b>{title || "Your title will appear here"}</b>
        {note && <p>{note}</p>}{publicUrl.startsWith("https://") && <a href={publicUrl} target="_blank" rel="noopener noreferrer">{publicUrl}</a>}
      </div>}
      <div className={styles.submitControls}>
        <span className={styles.channelHint}>{authenticated === false ? "Sign in is required to submit." : authenticated ? "Signed-in members can submit for review." : "Checking your sign-in…"}</span>
        <button type="submit" className={styles.submitButton} disabled={busy}>{busy ? "Sending for review…" : "Send for review"}</button>
      </div>
      {error && <p className={styles.formError} role="alert">{error} {error.includes("sign in") && <a href="/login">Sign in ↗</a>}</p>}
      {message && <p className={styles.formSuccess} role="status">{message}</p>}
      <p className={styles.privacyNote}>Your submissions and review status are private to your account and authorised moderators. Approval is required before a submission can appear publicly. You can return here to check its status.</p>
    </form>
    {authenticated && <div className={styles.submissionStatus}>
      <div className={styles.sectionHeading}><div><span className={styles.kicker}>YOUR ACCOUNT</span><h3>Your submissions</h3></div><button type="button" className={styles.refreshStatus} onClick={() => void refresh()}>Refresh status</button></div>
      {submissions.length === 0 ? <p className={styles.companyEmpty}>You have not submitted any work yet.</p> : submissions.map(item => <article className={styles.submissionRow} key={item.id}>
        <div><strong>{item.title}</strong><span>{item.category} · {new Date(item.created_at).toLocaleDateString("en-ZM")}</span>{item.admin_note && <small>Review note: {item.admin_note}</small>}</div>
        <span className={item.status === "approved" ? styles.statusApproved : item.status === "rejected" ? styles.statusRejected : styles.statusPending}>{item.status === "approved" ? "Approved" : item.status === "rejected" ? "Not approved" : "Awaiting review"}</span>
      </article>)}
    </div>}
  </section>;
}
