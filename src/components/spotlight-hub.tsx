"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./spotlight-hub.module.css";

const EMAIL = "samryt26@gmail.com";
const WHATSAPP = "260760930509";
const reviewCategories = ["Music talent", "Music video", "Photography", "Creative work"] as const;

type FeedItem = { title: string; url: string; source: string; publishedAt: string; imageUrl: string | null };
type Feed = { id: string; label: string; items: FeedItem[] };
type FeedResponse = { updatedAt: string; feeds: Feed[] };

const topicOrder = [
  { id: "sports", label: "Sports", note: "Zambian and international sport" },
  { id: "gamers", label: "Gamers", note: "Gaming, esports and player culture" },
  { id: "zambia", label: "Zambian news", note: "Stories shaping the country" },
  { id: "world-music", label: "World music", note: "Global music conversations" },
  { id: "awards", label: "Awards", note: "Music awards and recognition" },
  { id: "zambian-music", label: "Hot Zambian music", note: "Artists, releases and music culture" },
  { id: "education", label: "Education", note: "Learning and education updates" },
  { id: "stock-market", label: "Stock markets", note: "Markets and business headlines" },
  { id: "schools", label: "Schools", note: "School news and opportunities" },
];

function messageBody(title: string, category: string, link: string, note: string) {
  return [
    "Hello TIZIBANE Spotlight,",
    "I would like to submit something for review.",
    `Category: ${category}`,
    `Title / name: ${title.trim()}`,
    `Link: ${link.trim()}`,
    `Message: ${note.trim() || "Please review this submission."}`,
  ].join("\n");
}

export function SpotlightHub() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [feedState, setFeedState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [category, setCategory] = useState<string>(reviewCategories[0]);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");

  useEffect(() => {
    let active = true;
    fetch("/api/spotlight-feed", { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error("Feed unavailable");
        return response.json() as Promise<FeedResponse>;
      })
      .then((data) => {
        if (!active) return;
        setFeeds(data.feeds ?? []);
        setUpdatedAt(data.updatedAt ?? "");
        setFeedState("ready");
      })
      .catch(() => { if (active) setFeedState("unavailable"); });
    return () => { active = false; };
  }, []);

  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);

  function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = messageBody(title, category, link, note);
    const destination = channel === "whatsapp"
      ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(body)}`
      : `mailto:${EMAIL}?subject=${encodeURIComponent("TIZIBANE Spotlight submission: " + title.trim())}&body=${encodeURIComponent(body)}`;
    window.open(destination, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={styles.spotlight}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>TIZIBANE · CULTURE · DISCOVERY</span>
          <h1>Spotlight<span>.</span></h1>
          <p>A stage for Zambian talent, fresh ideas, important stories and the conversations shaping our world.</p>
          <div className={styles.heroActions}>
            <a href="#submit-review" className={styles.primaryLink}>Submit for review <span aria-hidden="true">↗</span></a>
            <a href="#latest" className={styles.secondaryLink}>Explore latest stories</a>
          </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.orbit orbitOne} />
          <div className={styles.orbit orbitTwo} />
          <div className={styles.spotlightCore}><span>TZ</span><small>THE COMMUNITY STAGE</small></div>
          <i className={styles.sparkOne}>✦</i><i className={styles.sparkTwo}>✧</i>
        </div>
      </section>

      <section className={styles.reviewSection} id="submit-review">
        <div className={styles.sectionHeading}>
          <div><span className={styles.kicker}>YOUR WORK · OUR SPOTLIGHT</span><h2>Submit for review</h2></div>
          <span className={styles.pill}>Link submissions only</span>
        </div>
        <p className={styles.sectionIntro}>Share a public link to music talent, a music video, photography or other creative work. TIZIBANE does not host the media — the original platform keeps it.</p>
        <form className={styles.reviewForm} onSubmit={submitReview}>
          <label>What are you submitting?
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {reviewCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>Title or artist name
            <input required maxLength={90} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Artist, song or photo collection" />
          </label>
          <label className={styles.fullField}>Public link
            <input required type="url" maxLength={500} value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" />
            <small>Use a public YouTube, TikTok, Instagram, Facebook, website or portfolio link.</small>
          </label>
          <label className={styles.fullField}>Brief message <span className={styles.optional}>Optional · 300 characters</span>
            <textarea maxLength={300} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tell our review team what makes this worth a look…" />
          </label>
          <div className={styles.submitControls}>
            <label className={styles.channelChoice}>Send using
              <select value={channel} onChange={(event) => setChannel(event.target.value as "whatsapp" | "email")}>
                <option value="whatsapp">WhatsApp</option><option value="email">Gmail / Email</option>
              </select>
            </label>
            <button type="submit" className={styles.submitButton}>Continue to {channel === "whatsapp" ? "WhatsApp" : "Email"} <span aria-hidden="true">↗</span></button>
          </div>
          <p className={styles.privacyNote}>Your message opens in the service you choose. It is not stored as a TIZIBANE private message. Longer conversations continue by email or WhatsApp.</p>
        </form>
        <div className={styles.directContact}>
          <span>Prefer a direct conversation?</span>
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">Continue on WhatsApp <span className={styles.srOnly}>opens WhatsApp</span> ↗</a>
          <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("TIZIBANE Spotlight enquiry")}`}>Continue by email ↗</a>
        </div>
      </section>

      <section className={styles.latestSection} id="latest">
        <div className={styles.sectionHeading}>
          <div><span className={styles.kicker}>FRESH FROM ONLINE SOURCES</span><h2>Latest stories & conversations</h2></div>
          <span className={styles.liveMark}><i /> LIVE SOURCES</span>
        </div>
        <p className={styles.sectionIntro}>Headlines and available publisher images refresh from external news feeds. Open any story on its original publisher’s website.</p>
        {feedState === "loading" && <div className={styles.feedStatus}>Gathering the latest headlines from online sources…</div>}
        {feedState === "unavailable" && <div className={styles.feedStatus}>Live headlines are temporarily unavailable. Use the topic links below to visit the online sources directly.</div>}
        <div className={styles.topicList}>
          {topicOrder.map((topic, index) => {
            const feed = feedById.get(topic.id);
            const items = feed?.items ?? [];
            return (
              <section className={styles.topicSection} key={topic.id}>
                <div className={styles.topicHeading}>
                  <div><span className={styles.topicNumber}>{String(index + 1).padStart(2, "0")}</span><div><h3>{topic.label}</h3><p>{topic.note}</p></div></div>
                  <a href={`https://news.google.com/search?q=${encodeURIComponent(topic.label + " Zambia")}&hl=en-ZM&gl=ZM&ceid=ZM:en`} target="_blank" rel="noopener noreferrer">More stories ↗</a>
                </div>
                {items.length > 0 ? (
                  <div className={styles.storyGrid}>
                    {items.slice(0, 4).map((item) => (
                      <a className={styles.storyCard} href={item.url} target="_blank" rel="noopener noreferrer" key={item.url}>
                        {item.imageUrl ? <img className={styles.storyImage} src={item.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <div className={styles.storyArtwork} aria-hidden="true"><span>{topic.label.slice(0, 1)}</span></div>}
                        <div className={styles.storyCopy}><span className={styles.storySource}>{item.source}</span><h4>{item.title}</h4><span className={styles.storyOpen}>Read at source ↗</span></div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className={styles.topicEmpty}><span>Latest updates from {topic.label}</span><a href={`https://news.google.com/search?q=${encodeURIComponent(topic.label + " Zambia")}&hl=en-ZM&gl=ZM&ceid=ZM:en`} target="_blank" rel="noopener noreferrer">Open live topic ↗</a></div>
                )}
              </section>
            );
          })}
        </div>
        {updatedAt && <p className={styles.updatedAt}>Feed checked {new Date(updatedAt).toLocaleString("en-ZM", { dateStyle: "medium", timeStyle: "short" })} · Feed cache refreshes approximately every 15 minutes.</p>}
      </section>

      <section className={styles.contactStrip}>
        <div><span className={styles.kicker}>KEEP THE CONVERSATION GOING</span><h2>Have something worth sharing?</h2><p>Send a link, a short note or a question. We will take it from there.</p></div>
        <div className={styles.contactActions}><a href={`mailto:${EMAIL}`}>Email the review team ↗</a><a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">Message on WhatsApp ↗</a></div>
      </section>

      <section className={styles.companyLinks}>
        <div><span className={styles.kicker}>OFFICIAL CONNECTIONS</span><h2>Stay connected with Royalty</h2></div>
        <div className={styles.companyLinkGrid}>
          <a href="https://www.facebook.com/share/19Rz2LxXCP/" target="_blank" rel="noopener noreferrer">Facebook ↗</a>
          <a href="https://www.instagram.com/55samroyalty2024/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
          <a href="https://www.tiktok.com/@samshane10" target="_blank" rel="noopener noreferrer">TikTok ↗</a>
          <a href="https://www.youtube.com/@samshanemusicworld6626" target="_blank" rel="noopener noreferrer">YouTube ↗</a>
          <a href="https://pin.it/2EP4JejFq" target="_blank" rel="noopener noreferrer">Pinterest ↗</a>
          <a href="https://whatsapp.com/channel/0029VbDlyjA4Crfrf3vyuK0t" target="_blank" rel="noopener noreferrer">WhatsApp Channel ↗</a>
          <a href="https://royalty-music-hub.samvolume1.workers.dev/" target="_blank" rel="noopener noreferrer">Royalty Music Hub ↗</a>
          <a href="https://sites.google.com/view/royalty-music/home" target="_blank" rel="noopener noreferrer">Royalty Music ↗</a>
        </div>
      </section>
    </div>
  );
}
