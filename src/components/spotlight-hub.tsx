"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import styles from "./spotlight-hub.module.css";
import { SpotlightVerticalFeed } from "./spotlight-vertical-feed";

const EMAIL = "samryt26@gmail.com";
const WHATSAPP = "260760930509";
const ALTERNATIVE_WHATSAPP = "260769614559";
const reviewCategories = ["Music talent", "Music video", "Photography"] as const;

type FeedItem = { title: string; source: string; publishedAt: string; summary: string; imageUrl: string | null; articleUrl?: string };
type Feed = { id: string; label: string; items: FeedItem[] };
type FeedResponse = { updatedAt: string; feeds: Feed[] };

const topicOrder = [
  { id: "music-reviews", label: "Music Reviews", note: "New releases, top charts, album reviews, artist spotlights and music videos", tagline: "New sounds. Fresh perspectives.", sourceLabel: "Zambian & world music", art: "♫", tone: "music", placeholderImage: "/images/1.%20Music%20Reviews.jpg" },
  { id: "sports-feed", label: "Sports Feed", note: "Football, basketball, tennis, athletics and the sporting moments everyone is talking about", tagline: "The moments that move us.", sourceLabel: "Zambian & international sport", art: "★", tone: "sports", placeholderImage: "/images/2.%20Sports%20Feed.jpg" },
  { id: "chipata-activities", label: "Chipata Activities", note: "Our town, our people and our progress — community life, events, business and development", tagline: "Our town. Our people. Our progress.", sourceLabel: "Eastern Province · Zambia", art: "⌂", tone: "chipata", placeholderImage: "/images/3.%20Chipata%20Activities.jpg" },
  { id: "zambian-politics", label: "Zambian Politics", note: "Public affairs, policy, civic issues and informed debate from across Zambia", tagline: "The issues shaping Zambia.", sourceLabel: "Public affairs & analysis", art: "◈", tone: "politics", placeholderImage: "/images/4.%20Zambian%20Politics.jpg" },
  { id: "learn-trading", label: "Learn Online Trading", note: "Beginner-friendly learning about markets, platforms, forex, stocks, crypto and risk management", tagline: "Build knowledge. Understand risk.", sourceLabel: "Financial education", art: "↗", tone: "trading", placeholderImage: "/images/5.%20Learn%20Online%20Trading.jpg" },
  { id: "business-hub", label: "Business Hub", note: "Discover local Zambian businesses, services and enterprise stories from Lusaka and Chipata. Support local entrepreneurs and help our communities grow.", tagline: "Discover local. Support Zambian.", sourceLabel: "Lusaka · Chipata · Zambia", art: "▦", tone: "business", placeholderImage: "/images/6.%20Business%20Hub.jpg" },
] as const;

function messageBody(title: string, category: string, link: string, note: string) {
  return [
    "Hello TIZIBANE Spotlight,",
    "I would like to submit something for review.",
    "Category: " + category,
    "Title / artist name: " + title.trim(),
    "Public link: " + link.trim(),
    "Brief message: " + (note.trim() || "Please review this submission."),
  ].join("\n");
}

function gmailComposeUrl(subject: string, body = "") {
  return "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(EMAIL)
    + "&su=" + encodeURIComponent(subject)
    + "&body=" + encodeURIComponent(body);
}

function openContact(channel: "whatsapp" | "email", subject: string, body: string) {
  const destination = channel === "whatsapp"
    ? "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(body)
    : gmailComposeUrl(subject, body);
  window.open(destination, "_blank", "noopener,noreferrer");
}

function formatPublishedAt(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-ZM", { day: "numeric", month: "short" });
}

export function SpotlightHub() {
  const [feeds, setFeeds] = useState<Feed[]>([]);

  const [category, setCategory] = useState<string>(reviewCategories[0]);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [question, setQuestion] = useState("");
  const [inquiryChannel, setInquiryChannel] = useState<"whatsapp" | "email">("whatsapp");


  useEffect(() => {
    let active = true;
    let inFlight = false;
    const refreshFeeds = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/spotlight-feed", { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!response.ok) throw new Error("Feed unavailable");
        const data = await response.json() as FeedResponse;
        if (active) setFeeds(data.feeds ?? []);
      } catch {
        // Keep the last successfully loaded stories visible if a news source is temporarily unavailable.
      } finally {
        inFlight = false;
      }
    };
    void refreshFeeds();
    const interval = window.setInterval(() => { void refreshFeeds(); }, 30 * 60 * 1000);
    const onFocus = () => { if (document.visibilityState === "visible") void refreshFeeds(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openContact(
      channel,
      "TIZIBANE Spotlight submission: " + title.trim(),
      messageBody(title, category, link, note),
    );
  }

  function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = "Hello TIZIBANE Spotlight,\n\nI have a quick enquiry:\n" + question.trim() + "\n\nPlease let me know how we can continue the conversation.";
    openContact(inquiryChannel, "TIZIBANE Spotlight enquiry", body);
  }

  return (
    <div className={styles.spotlight}>
      <section className={styles.hero} aria-labelledby="spotlight-main-title">
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>TIZIBANE ORIGINALS · EDITORIAL DESK</span>
          <h1 id="spotlight-main-title">SPOTLIGHT<span className={styles.heroTitleDot}>.</span></h1>
          <p className={styles.heroLead}>Stories worth seeing. Voices worth hearing. Ideas moving Zambia forward.</p>
          <div className={styles.heroActions}>
            <a href="#spotlight-vertical-feed" className={styles.primaryLink}>Explore all stories <span aria-hidden="true">↓</span></a>
            <a href="#submit-review" className={styles.secondaryLink}>Submit your work</a>
          </div>
        </div>
        <div className={styles.heroArt} aria-label="Spotlight editorial artwork">
          <div className={styles.heroArtFallback}><small>THE STORIES THAT MOVE US</small></div>
          <img className={styles.heroFeatureImage} src="/images/AFRICA%20001.jpg" alt="" fetchPriority="high" decoding="async" />
          <div className={styles.heroImageShade} />
          <span className={styles.heroImageStamp}>TIZIBANE · ZAMBIA</span>
          <span className={styles.heroImageCaption}>CONNECT · DISCOVER · GROW</span>
        </div>
      </section>
      <SpotlightVerticalFeed feeds={feeds} />

      <section className={styles.reviewSection} id="submit-review">
        <div className={styles.sectionHeading}>
          <div><span className={styles.kicker}>THE HEART OF SPOTLIGHT</span><h2>Submit your work for review</h2></div>
          <span className={styles.pill}>Public links only · No uploads</span>
        </div>
        <p className={styles.sectionIntro}>Share a public link to music talent, a music video or photography. We review the work and direct visitors to the original platform. TIZIBANE does not upload, store or stream submitted media.</p>
        <form className={styles.reviewForm} onSubmit={submitReview}>
          <label>What are you submitting?
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {reviewCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Title or artist name
            <input required maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Artist, song, video or photography title" />
          </label>
          <label className={styles.fullField}>Public link
            <input required type="url" pattern="https://.*" title="Use a public HTTPS link." maxLength={500} value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" />
            <small>Use a public YouTube, TikTok, Instagram, Facebook, portfolio or website link.</small>
          </label>
          <label className={styles.fullField}>Brief note <span className={styles.optional}>Optional · 300 characters</span>
            <textarea maxLength={300} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tell our review team a little about this work…" />
          </label>
          <div className={styles.submitControls}>
            <label className={styles.channelChoice}>Continue using
              <select value={channel} onChange={(event) => setChannel(event.target.value as "whatsapp" | "email")}>
                <option value="whatsapp">WhatsApp</option><option value="email">Gmail</option>
              </select>
            </label>
            <button type="submit" className={styles.submitButton}>Continue to {channel === "whatsapp" ? "WhatsApp" : "Gmail"} <span aria-hidden="true">↗</span></button>
          </div>
          <p className={styles.privacyNote}>Your message opens in the service you choose. TIZIBANE does not store it as an in-app private conversation. Longer discussions continue directly by email or WhatsApp.</p>
        </form>
        <div className={styles.directContact}>
          <span>Prefer to contact the review team directly?</span>
          <a href={"https://wa.me/" + WHATSAPP} target="_blank" rel="noopener noreferrer">Continue on WhatsApp ↗</a>
          <a href={gmailComposeUrl("TIZIBANE Spotlight enquiry")}>Continue by Gmail ↗</a>
        </div>
      </section>

      <section className={styles.reviewSection} aria-labelledby="spotlight-inquiry-title">
        <div className={styles.sectionHeading}>
          <div><span className={styles.kicker}>A SHORT MESSAGE IS ENOUGH</span><h2 id="spotlight-inquiry-title">Quick enquiry</h2></div>
          <span className={styles.pill}>Brief messages · Private follow-up</span>
        </div>
        <p className={styles.sectionIntro}>Have a question about a review, partnership or feature? Leave a short message and choose where you want the conversation to continue.</p>
        <form className={styles.inquiryForm} onSubmit={submitInquiry}>
          <label className={styles.inquiryMessage}>Your message <span className={styles.optional}>Maximum 300 characters</span>
            <textarea required maxLength={300} rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Write a short message…" />
          </label>
          <label className={styles.channelChoice}>Continue using
            <select value={inquiryChannel} onChange={(event) => setInquiryChannel(event.target.value as "whatsapp" | "email")}>
              <option value="whatsapp">WhatsApp</option><option value="email">Gmail</option>
            </select>
          </label>
          <button type="submit" className={styles.submitButton}>Continue privately ↗</button>
        </form>
        <p className={styles.privacyNote}>This opens WhatsApp or Gmail with your message ready. Your message is not published on TIZIBANE.</p>
      </section>


    </div>
  );
}
