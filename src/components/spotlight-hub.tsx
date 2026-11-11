"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import styles from "./spotlight-hub.module.css";

const EMAIL = "samryt26@gmail.com";
const WHATSAPP = "260760930509";
const ALTERNATIVE_WHATSAPP = "260769614559";
const reviewCategories = ["Music talent", "Music video", "Photography"] as const;

type FeedItem = { title: string; source: string; publishedAt: string; summary: string; imageUrl: string | null };
type Feed = { id: string; label: string; items: FeedItem[] };
type FeedResponse = { updatedAt: string; feeds: Feed[] };

const topicOrder = [
  { id: "music-reviews", label: "Music Reviews", note: "New releases, top charts, album reviews, artist spotlights and music videos", sourceLabel: "Zambian & world music", art: "♫", tone: "music" },
  { id: "sports-feed", label: "Sports Feed", note: "Football, basketball, tennis, athletics and the sporting moments everyone is talking about", sourceLabel: "Zambian & international sport", art: "★", tone: "sports" },
  { id: "chipata-activities", label: "Chipata Activities", note: "Our town, our people and our progress — community life, events, business and development", sourceLabel: "Eastern Province · Zambia", art: "⌂", tone: "chipata" },
  { id: "zambian-politics", label: "Zambian Politics", note: "Public affairs, policy, civic issues and informed debate from across Zambia", sourceLabel: "Public affairs & analysis", art: "◈", tone: "politics" },
  { id: "learn-trading", label: "Learn Online Trading", note: "Beginner-friendly learning about markets, platforms, forex, stocks, crypto and risk management", sourceLabel: "Financial education", art: "↗", tone: "trading" },
  { id: "special-offers", label: "Special Offers", note: "Promotions, business offers, campaigns and opportunities worth discovering", sourceLabel: "Offers & promotions", art: "％", tone: "offers" },
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
  const [selectedStory, setSelectedStory] = useState<FeedItem | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [feedState, setFeedState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [category, setCategory] = useState<string>(reviewCategories[0]);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [question, setQuestion] = useState("");
  const [inquiryChannel, setInquiryChannel] = useState<"whatsapp" | "email">("whatsapp");

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
  const [activeTopicId, setActiveTopicId] = useState<string>(topicOrder[0].id);
  const activeTopic = topicOrder.find((topic) => topic.id === activeTopicId) ?? topicOrder[0];
  const activeTopicFeed = feedById.get(activeTopic.id);
  const featuredItem = activeTopicFeed?.items?.[0] ?? null;
  const activeTopicIndex = topicOrder.findIndex((topic) => topic.id === activeTopic.id);


  useEffect(() => {
    if (!selectedStory) return;
    function handleReaderKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedStory(null);
    }
    window.addEventListener("keydown", handleReaderKey);
    return () => window.removeEventListener("keydown", handleReaderKey);
  }, [selectedStory]);

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
          <div className={styles.heroFeatureMeta}>
            <span>{activeTopic.label}</span>
            <span>{featuredItem ? featuredItem.source : activeTopic.sourceLabel}</span>
          </div>
          <h2 className={styles.heroFeatureTitle}>{featuredItem?.title ?? activeTopic.note}</h2>
          <p className={styles.heroFeatureSummary}>{featuredItem?.summary || "Discover fresh perspectives, community stories and the latest updates from this Spotlight department."}</p>
          <div className={styles.heroActions}>
            {featuredItem ? <button type="button" className={styles.primaryLink} onClick={() => setSelectedStory(featuredItem)}>Read featured story <span aria-hidden="true">↗</span></button> : <a href="#latest" className={styles.primaryLink}>Explore this channel <span aria-hidden="true">↗</span></a>}
            <a href="#submit-review" className={styles.secondaryLink}>Submit your work</a>
          </div>
        </div>
        <div className={styles.heroArt} aria-label={featuredItem ? "Featured image for " + activeTopic.label : "Spotlight editorial artwork"}>
          {featuredItem?.imageUrl ? <img className={styles.heroFeatureImage} src={featuredItem.imageUrl} alt="" fetchPriority="high" decoding="async" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} /> : <div className={styles.heroArtFallback}><span>{activeTopic.art}</span><small>{activeTopic.label}</small></div>}
          <div className={styles.heroImageShade} />
          <span className={styles.heroImageStamp}>01 / 06</span>
          <span className={styles.heroImageCaption}>THE EDITOR'S PICK</span>
        </div>
      </section>
      <nav className={styles.editorialRail} aria-label="Spotlight departments">
        <div className={styles.railIntro}><span className={styles.kicker}>EXPLORE THE DESKS</span><strong>Six perspectives. One home.</strong></div>
        <div className={styles.railItems}>
          {topicOrder.map((topic, index) => {
            const item = feedById.get(topic.id)?.items?.[0];
            return <button type="button" key={topic.id} className={activeTopicId === topic.id ? styles.railItemActive : styles.railItem} onClick={() => { setActiveTopicId(topic.id); document.getElementById("topic-" + topic.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} aria-pressed={activeTopicId === topic.id}>
              <span className={styles.railThumb}>{item?.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} /> : <span>{topic.art}</span>}</span>
              <span className={styles.railLabel}><b>{topic.label}</b><small>{String(index + 1).padStart(2, "0")} / 06</small></span>
              <span className={styles.railArrow} aria-hidden="true">↗</span>
            </button>;
          })}
        </div>
      </nav>

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

      <section className={styles.latestSection} id="latest">
        <div className={styles.sectionHeading}>
          <div><span className={styles.kicker}>FRESH FROM ONLINE SOURCES</span><h2>Six channels. One Spotlight.</h2></div>
          <span className={styles.liveMark}><i /> AUTO-REFRESHED</span>
        </div>
        <p className={styles.sectionIntro}>Explore six dedicated channels for music, sport, Chipata community life, Zambian public affairs, financial learning and special offers. Headlines and available publisher images refresh from online sources. Select any story to read its available publisher-provided preview inside TIZIBANE.</p>
        {feedState === "loading" && <div className={styles.feedStatus}>Gathering the latest headlines from online sources…</div>}
        {feedState === "unavailable" && <div className={styles.feedStatus}>Live headlines are temporarily unavailable. Please return shortly; the feed refreshes automatically in the background.</div>}
        <div className={styles.topicList} aria-label="Six Spotlight channels">
          {topicOrder.map((topic, index) => {
            const feed = feedById.get(topic.id);
            const items = feed?.items ?? [];
            return (
              <section className={styles.topicSection} id={"topic-" + topic.id} key={topic.id} onMouseEnter={() => setActiveTopicId(topic.id)}>
                <div className={styles.topicHeading}>
                  <div className={styles.channelHeadingMain}><span className={styles.topicNumber}>{String(index + 1).padStart(2, "0")}</span><span className={styles.channelArt + " " + styles["channelTone" + topic.tone.charAt(0).toUpperCase() + topic.tone.slice(1)]} aria-hidden="true">{topic.art}</span><div><h3>{topic.label}</h3><p>{topic.note}</p></div></div>
                  <span className={styles.sourceLabel}>{topic.sourceLabel} · In-app preview</span>
                </div>
                {items.length > 0 ? (
                  <div className={styles.storyGrid}>
                    {items.slice(0, 4).map((item) => (
                      <button type="button" className={styles.storyCard} onClick={() => setSelectedStory(item)} key={item.source + item.title + item.publishedAt}>
                        <div className={styles.storyMedia}>
                          <div className={styles.storyArtwork} aria-hidden="true"><span>{topic.label.slice(0, 1)}</span></div>
                          {item.imageUrl && <img className={styles.storyImage} src={item.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} />}
                        </div>
                        <div className={styles.storyCopy}>
                          <span className={styles.storySource}>{item.source}</span>
                          <h4>{item.title}</h4>
                          <span className={styles.storyOpen}>{formatPublishedAt(item.publishedAt)} · Read inside TIZIBANE</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={styles.topicEmpty}><span>Latest updates from {topic.label}</span><span>In-app headlines will appear here when available</span></div>
                )}
              </section>
            );
          })}
        </div>
        {updatedAt && <p className={styles.updatedAt}>Feed checked {new Date(updatedAt).toLocaleString("en-ZM", { dateStyle: "medium", timeStyle: "short" })} · Headlines are cached for approximately 15 minutes. Images load only as they enter view.</p>}
        <p className={styles.privacyNote}>Publisher headlines, excerpts and images remain the property of their respective publishers. TIZIBANE displays available previews inside the app and does not reproduce full articles or host submitted videos.</p>
      </section>

      <section className={styles.contactStrip}>
        <div><span className={styles.kicker}>KEEP THE CONVERSATION GOING</span><h2>Have something worth sharing?</h2><p>Send a link, a short note or a question. We will take it from there.</p></div>
        <div className={styles.contactActions}>
          <a href={gmailComposeUrl("TIZIBANE Spotlight enquiry")}>Email the review team ↗</a>
          <a href={"https://wa.me/" + WHATSAPP} target="_blank" rel="noopener noreferrer">Message on WhatsApp ↗</a>
        </div>
      </section>

      <section className={styles.companyLinks}>
        <div><span className={styles.kicker}>OFFICIAL CONNECTIONS</span><h2>Stay connected with Royalty</h2></div>
        <div className={styles.companyLinkGrid}>
          <a href="https://pin.it/2EP4JejFq" target="_blank" rel="noopener noreferrer">Pinterest ↗</a>
          <a href="https://www.facebook.com/share/19Rz2LxXCP/" target="_blank" rel="noopener noreferrer">Facebook ↗</a>
          <a href="https://www.instagram.com/55samroyalty2024/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
          <a href="https://www.tiktok.com/@samshane10" target="_blank" rel="noopener noreferrer">TikTok · Sam Shane ↗</a>
          <a href="https://www.tiktok.com/@samshanemusicworld" target="_blank" rel="noopener noreferrer">TikTok · Music World ↗</a>
          <a href="https://www.youtube.com/@samshanemusicworld6626" target="_blank" rel="noopener noreferrer">YouTube ↗</a>
          <a href="https://whatsapp.com/channel/0029VbDlyjA4Crfrf3vyuK0t" target="_blank" rel="noopener noreferrer">WhatsApp Channel ↗</a>
          <a href="https://royalty-music-hub.samvolume1.workers.dev/" target="_blank" rel="noopener noreferrer">Royalty Music Hub ↗</a>
          <a href="https://sites.google.com/view/royalty-music/home" target="_blank" rel="noopener noreferrer">Royalty Music ↗</a>
          <a href="https://sites.google.com/view/sam-shane-music/home" target="_blank" rel="noopener noreferrer">Sam Shane Music ↗</a>
          <a href={gmailComposeUrl("TIZIBANE general enquiry")}>General email ↗</a>
          <a href="mailto:royaltymusicschool833@gmail.com">Royalty Music School ↗</a>
          <a href="mailto:samvolume1@gmail.com">Company enquiries ↗</a>
          <a href={"https://wa.me/" + WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp Royalty ↗</a>
          <a href={"https://wa.me/" + ALTERNATIVE_WHATSAPP} target="_blank" rel="noopener noreferrer">Alternative WhatsApp ↗</a>
        </div>
      </section>
      {selectedStory && (
        <div className={styles.readerOverlay} role="dialog" aria-modal="true" aria-labelledby="spotlight-reader-title">
          <article className={styles.readerPanel}>
            <div className={styles.readerNavigation}>
              <button type="button" onClick={() => setSelectedStory(null)}>← Back to headlines</button>
              <button type="button" onClick={() => { setSelectedStory(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>↑ Up to Spotlight</button>
            </div>
            {selectedStory.imageUrl && <img className={styles.readerImage} src={selectedStory.imageUrl} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; }} />}
            <span className={styles.readerSource}>{selectedStory.source} · {formatPublishedAt(selectedStory.publishedAt)}</span>
            <h2 id="spotlight-reader-title">{selectedStory.title}</h2>
            <p className={styles.readerSummary}>{selectedStory.summary || "The publisher has not supplied a readable excerpt for this story yet. Please check back when an in-app preview becomes available."}</p>
            <p className={styles.readerNotice}>You are reading the available publisher-provided preview within TIZIBANE. The original publisher retains ownership of the full story.</p>
          </article>
        </div>
      )}
    </div>
  );
}
