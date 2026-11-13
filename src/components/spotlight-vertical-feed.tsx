"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./spotlight-vertical-feed.module.css";

type FeedItem = { title: string; source: string; publishedAt: string; summary: string; imageUrl: string | null; articleUrl?: string };
type Feed = { id: string; label: string; items: FeedItem[] };
type Topic = { id: string; label: string; description: string; image: string; icon: string; location?: string };

const topics: Topic[] = [
  { id: "music-reviews", label: "Music Reviews", description: "New releases, top charts, album reviews, artist spotlights and music videos.", image: "/images/1.%20Music%20Reviews.jpg", icon: "♫" },
  { id: "sports-feed", label: "Sports Feed", description: "Football, basketball, tennis, athletics and the sporting moments everyone is talking about.", image: "/images/2.%20Sports%20Feed.jpg", icon: "★" },
  { id: "chipata-activities", label: "Chipata Activities", description: "Our town, our people and our progress — community life, events and development.", image: "/images/3.%20Chipata%20Activities.jpg", icon: "⌂", location: "EASTERN PROVINCE" },
  { id: "zambian-politics", label: "Zambian Politics", description: "Public affairs, policy, civic issues and informed debate from across Zambia.", image: "/images/4.%20Zambian%20Politics.jpg", icon: "◈" },
  { id: "learn-trading", label: "Learn Online Trading", description: "Beginner-friendly learning about markets, trading platforms and risk management.", image: "/images/5.%20Learn%20Online%20Trading.jpg", icon: "↗" },
  { id: "business-hub", label: "Business Hub", description: "Discover local Zambian businesses, services and enterprise stories from Lusaka and Chipata.", image: "/images/6.%20Business%20Hub.jpg", icon: "▦", location: "LUSAKA · CHIPATA" },
];

function keyFor(topicId: string, index: number) { return topicId + "-" + index; }
function published(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" });
}

export function SpotlightVerticalFeed({ feeds }: { feeds: Feed[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);

  useEffect(() => {
    if (!feeds.length) return;
    const params = new URLSearchParams(window.location.search);
    const articleUrl = params.get("story");
    const title = params.get("title");
    if (!articleUrl && !title) return;
    let match: { topicId: string; index: number } | null = null;
    for (const topic of topics) {
      const index = (feedById.get(topic.id)?.items ?? []).findIndex((item) =>
        (articleUrl && item.articleUrl === articleUrl) || (title && item.title.toLowerCase() === title.toLowerCase())
      );
      if (index >= 0) { match = { topicId: topic.id, index }; break; }
    }
    if (match) {
      const id = keyFor(match.topicId, match.index);
      setExpanded(id);
      window.setTimeout(() => document.getElementById("spotlight-card-" + id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    } else {
      const first = topics.find((topic) => (feedById.get(topic.id)?.items.length ?? 0) > 0);
      if (first) window.setTimeout(() => document.getElementById("spotlight-section-" + first.id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 180);
    }
  }, [feeds, feedById]);

  function nextStory(topicId: string, index: number) {
    const startTopic = topics.findIndex((topic) => topic.id === topicId);
    for (let step = 0; step < topics.length; step += 1) {
      const topic = topics[(startTopic + step) % topics.length];
      const items = feedById.get(topic.id)?.items ?? [];
      const nextIndex = step === 0 ? index + 1 : 0;
      if (items.length > nextIndex) {
        const id = keyFor(topic.id, nextIndex);
        setExpanded(id);
        window.setTimeout(() => document.getElementById("spotlight-card-" + id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
        return;
      }
    }
    setExpanded(null);
    document.getElementById("spotlight-vertical-feed")?.scrollIntoView({ behavior: "smooth" });
  }

  function submitBusiness() {
    const body = "Hello TIZIBANE Business Hub,\n\nI would like my local business considered for the Lusaka / Chipata Business Hub.\n\nBusiness name:\nTown / location:\nProducts or services:\nPublic contact or website:\n\nPlease let me know the next steps.";
    window.open("https://wa.me/260760930509?text=" + encodeURIComponent(body), "_blank", "noopener,noreferrer");
  }

  return (
    <section className={styles.feed} id="spotlight-vertical-feed" aria-label="Spotlight departments and stories">
      <div className={styles.feedIntro}>
        <div><span className={styles.eyebrow}>EXPLORE AT YOUR OWN PACE</span><h2>Stories & discoveries</h2><p>Choose a card to open it. Choose it again to close it. Everything is arranged vertically so the next place to explore is always clear.</p></div>
        <Link href="/home/notifications" className={styles.notificationsLink}>← Notifications</Link>
      </div>
      {topics.map((topic, topicIndex) => {
        const items = feedById.get(topic.id)?.items ?? [];
        return (
          <section className={styles.topic} id={"spotlight-section-" + topic.id} key={topic.id} aria-labelledby={"spotlight-title-" + topic.id}>
            <header className={styles.topicHeader}>
              <div className={styles.topicIcon} aria-hidden="true">{topic.icon}</div>
              <div className={styles.topicHeading}><span className={styles.eyebrow}>SPOTLIGHT · {String(topicIndex + 1).padStart(2, "0")}</span><h3 id={"spotlight-title-" + topic.id}>{topic.label}</h3><p>{topic.description}</p></div>
              {topic.location && <span className={styles.location}>{topic.location}</span>}
            </header>
            {topic.id === "business-hub" && (
              <div className={styles.businessIntro}>
                <div><strong>Local business. Local opportunity.</strong><p>Find stories about Zambian enterprise and help local businesses get discovered in Lusaka and Chipata.</p></div>
                <button type="button" onClick={submitBusiness}>List your business <span aria-hidden="true">↗</span></button>
              </div>
            )}
            {items.length ? (
              <div className={styles.cards}>
                {items.map((item, index) => {
                  const id = keyFor(topic.id, index);
                  const isOpen = expanded === id;
                  return (
                    <article className={styles.card} id={"spotlight-card-" + id} key={id}>
                      <button type="button" className={styles.cardTrigger} aria-expanded={isOpen} aria-controls={"spotlight-expanded-" + id} onClick={() => setExpanded(isOpen ? null : id)}>
                        <div className={styles.imageFrame}><img src={item.imageUrl || topic.image} alt="" loading={topicIndex === 0 && index === 0 ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.src = topic.image; }} /><span>{topic.label}</span></div>
                        <div className={styles.cardCopy}>
                          <span className={styles.source}>{item.source}{published(item.publishedAt) ? " · " + published(item.publishedAt) : ""}</span>
                          <h4>{item.title}</h4>
                          <p>{item.summary || topic.description}</p>
                          <span className={styles.toggle}>{isOpen ? "CLOSE STORY ↑" : "OPEN STORY ↓"}</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className={styles.expanded} id={"spotlight-expanded-" + id}>
                          <p>{item.summary || "The publisher has not supplied a longer preview. Visit the original source for the full report."}</p>
                          <div className={styles.actions}>
                            {item.articleUrl && <a href={item.articleUrl} target="_blank" rel="noopener noreferrer">Read original story ↗</a>}
                            <button type="button" onClick={() => nextStory(topic.id, index)}>Explore another interesting post ↓</button>
                            <button type="button" onClick={() => { setExpanded(null); document.getElementById("spotlight-vertical-feed")?.scrollIntoView({ behavior: "smooth" }); }}>Return to main Spotlight ↑</button>
                            <Link href="/home/notifications">Return to Notifications ↗</Link>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : <div className={styles.empty}>Fresh stories for this section are being gathered. Please check back soon.</div>}
          </section>
        );
      })}
    </section>
  );
}
