"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "./spotlight-hub.module.css";
import { SpotlightVerticalFeed } from "./spotlight-vertical-feed";
import { SpotlightCompanyReviews, SpotlightSubmissionCentre } from "./spotlight-publishing";

const EMAIL = "samryt26@gmail.com";
const WHATSAPP = "260760930509";

type FeedItem = { title: string; source: string; publishedAt: string; summary: string; articleUrl?: string };
type Feed = { id: string; label: string; items: FeedItem[] };
type FeedResponse = { updatedAt: string; feeds: Feed[] };

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

export function SpotlightHub() {
  const [feeds, setFeeds] = useState<Feed[]>([]);

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

  function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = "Hello TIZIBANE Spotlight,\n\nI have a quick enquiry:\n" + question.trim() + "\n\nPlease let me know how we can continue the conversation.";
    openContact(inquiryChannel, "TIZIBANE Spotlight enquiry", body);
  }

  return (
    <div className={styles.spotlight} id="tizibane-spotlight-page">
      <SpotlightCompanyReviews />
      <SpotlightVerticalFeed feeds={feeds} />

      <SpotlightSubmissionCentre />

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
