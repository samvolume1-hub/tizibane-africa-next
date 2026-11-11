"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import styles from "./spotlight-hub.module.css";

const EMAIL = "samryt26@gmail.com";
const WHATSAPP = "260760930509";
const ALTERNATIVE_WHATSAPP = "260769614559";
const reviewCategories = ["Music talent", "Music video", "Photography"] as const;

type FeedItem = { title: string; url: string; source: string; publishedAt: string; imageUrl: string | null };
type Feed = { id: string; label: string; items: FeedItem[] };
type FeedResponse = { updatedAt: string; feeds: Feed[] };

const topicOrder = [
  { id: "zambian-music", label: "Zambian music", note: "Artists, new releases, music videos and the Zed music conversation", sourceUrl: "https://zambianmusicblog.co/category/latest/", sourceLabel: "Zambian Music Blog" },
  { id: "education", label: "Education", note: "Learning, education policy, scholarships and opportunities", sourceUrl: "https://www.edu.gov.zm/?page_id=187", sourceLabel: "Ministry of Education" },
  { id: "sports", label: "Sports", note: "Zambian football, national teams and international sport", sourceUrl: "https://www.zambianfootballdata.com/", sourceLabel: "Football DNA Zambia" },
  { id: "gamers", label: "Gamers", note: "Gaming culture, esports, releases and the games industry", sourceUrl: "https://www.ign.com/news", sourceLabel: "IGN" },
  { id: "stock-market", label: "Stock market", note: "Official LuSE market data, listed companies and announcements", sourceUrl: "https://www.luse.co.zm/trading/market-data/", sourceLabel: "Lusaka Securities Exchange" },
  { id: "schools", label: "Schools", note: "School news, learner opportunities and official education notices", sourceUrl: "https://www.edu.gov.zm/?page_id=187", sourceLabel: "Ministry of Education" },
  { id: "zambia", label: "Hot Zambian news", note: "Fresh headlines from Zambian online publishers", sourceUrl: "https://mwebantu.com/", sourceLabel: "Mwebantu" },
  { id: "world-music", label: "World music chats", note: "Global artists, industry conversations and music culture", sourceUrl: "https://news.google.com/search?q=world+music+industry&hl=en&gl=US&ceid=US:en", sourceLabel: "World music coverage" },
  { id: "awards", label: "Music awards", note: "Nominations, winners and recognition of musical excellence", sourceUrl: "https://www.kwachaawards.com/", sourceLabel: "Kwacha Music Awards" },
];

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
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>TIZIBANE · CULTURE · DISCOVERY</span>
          <h1>Spotlight<span>.</span></h1>
          <p>A stage for Zambian talent, fresh ideas, important stories and the conversations shaping our world.</p>
          <div className={styles.heroActions}>
            <a href="#submit-review" className={styles.primaryLink}>Submit for review <span aria-hidden="true">↗</span></a>
            <a href="#latest" className={styles.secondaryLink}>Explore latest news</a>
          </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.orbit} />
          <div className={styles.orbit + " " + styles.orbitTwo} />
          <div className={styles.spotlightCore}><span>TZ</span><small>THE COMMUNITY STAGE</small></div>
          <i className={styles.sparkOne}>✦</i><i className={styles.sparkTwo}>✧</i>
        </div>
      </section>

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
            <input required type="url" maxLength={500} value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://…" />
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
            <button type="submit" className={styles.submitButton}>Continue to {channel === "whatsapp" ? "WhatsApp" : "Email"} <span aria-hidden="true">↗</span></button>
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
        <p className={styles.privacyNote}>This opens WhatsApp or your email app with your message ready. Your message is not published on TIZIBANE.</p>
      </section>

      <section className={styles.latestSection} id="latest">
        <div className={styles.sectionHeading}>
          <div><span className={styles.kicker}>FRESH FROM ONLINE SOURCES</span><h2>Latest news & conversations</h2></div>
          <span className={styles.liveMark}><i /> LIVE SOURCES</span>
        </div>
        <p className={styles.sectionIntro}>Zambian music, education and sport lead the coverage, followed by gaming, markets and schools. Headlines and available publisher images refresh from online sources. Every story opens on its original publisher’s website.</p>
        {feedState === "loading" && <div className={styles.feedStatus}>Gathering the latest headlines from online sources…</div>}
        {feedState === "unavailable" && <div className={styles.feedStatus}>Live headlines are temporarily unavailable. The official source links below remain available.</div>}
        <div className={styles.topicList}>
          {topicOrder.map((topic, index) => {
            const feed = feedById.get(topic.id);
            const items = feed?.items ?? [];
            return (
              <section className={styles.topicSection} key={topic.id}>
                <div className={styles.topicHeading}>
                  <div><span className={styles.topicNumber}>{String(index + 1).padStart(2, "0")}</span><div><h3>{topic.label}</h3><p>{topic.note}</p></div></div>
                  <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer">{topic.sourceLabel} ↗</a>
                </div>
                {items.length > 0 ? (
                  <div className={styles.storyGrid}>
                    {items.slice(0, 4).map((item) => (
                      <a className={styles.storyCard} href={item.url} target="_blank" rel="noopener noreferrer" key={item.url}>
                        {item.imageUrl ? <img className={styles.storyImage} src={item.imageUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <div className={styles.storyArtwork} aria-hidden="true"><span>{topic.label.slice(0, 1)}</span></div>}
                        <div className={styles.storyCopy}>
                          <span className={styles.storySource}>{item.source}</span>
                          <h4>{item.title}</h4>
                          <span className={styles.storyOpen}>{formatPublishedAt(item.publishedAt)} · Read at source ↗</span>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className={styles.topicEmpty}><span>Latest updates from {topic.label}</span><a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer">Open source ↗</a></div>
                )}
              </section>
            );
          })}
        </div>
        {updatedAt && <p className={styles.updatedAt}>Feed checked {new Date(updatedAt).toLocaleString("en-ZM", { dateStyle: "medium", timeStyle: "short" })} · Headlines are cached for approximately 15 minutes. Images load only as they enter view.</p>}
        <p className={styles.privacyNote}>External articles, images and videos remain the property of their publishers and creators. TIZIBANE provides links and previews only; it does not host or play submitted videos.</p>
      </section>

      <section className={styles.contactStrip}>
        <div><span className={styles.kicker}>KEEP THE CONVERSATION GOING</span><h2>Have something worth sharing?</h2><p>Send a link, a short note or a question. We will take it from there.</p></div>
        <div className={styles.contactActions}>
          <a href={"mailto:" + EMAIL}>Email the review team ↗</a>
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
    </div>
  );
}
