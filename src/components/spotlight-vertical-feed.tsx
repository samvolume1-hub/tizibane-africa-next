"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./spotlight-vertical-feed.module.css";

type FeedItem = { title: string; source: string; publishedAt: string; summary: string; articleUrl?: string };
type Feed = { id: string; label: string; items: FeedItem[] };
type Topic = { id: string; label: string; image: string; fallbackHeadline: string };
type SubmissionPreview = { category: string; title: string; link: string; note: string };

const topics: Topic[] = [
  { id: "music-reviews", label: "Music Reviews", image: "/images/1.%20Music%20Reviews.jpg", fallbackHeadline: "Discover the latest music, artists and releases." },
  { id: "sports-feed", label: "Sports Feed", image: "/images/2.%20Sports%20Feed.jpg", fallbackHeadline: "The sporting stories and moments everyone is talking about." },
  { id: "chipata-activities", label: "Chipata Activities", image: "/images/3.%20Chipata%20Activities.jpg", fallbackHeadline: "What's happening in Chipata and across Eastern Province." },
  { id: "zambian-politics", label: "Zambian Politics", image: "/images/4.%20Zambian%20Politics.jpg", fallbackHeadline: "The latest developments shaping Zambia." },
  { id: "learn-trading", label: "Learn Online Trading", image: "/images/5.%20Learn%20Online%20Trading.jpg", fallbackHeadline: "Build your understanding of markets and responsible trading." },
  { id: "business-hub", label: "Business Hub", image: "/images/5.%20Business.jpg", fallbackHeadline: "Zambian enterprise, local businesses and new opportunities." },
];

function published(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" });
}

export function SpotlightVerticalFeed({ feeds, preview }: { feeds: Feed[]; preview: SubmissionPreview }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [unavailableStory, setUnavailableStory] = useState<{ title: string; url: string } | null>(null);
  const deepLinkHandled = useRef(false);
  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);

  function moveTopic(direction: -1 | 1, fromTopicId?: string) {
    const currentIndex = topics.findIndex((topic) => topic.id === (fromTopicId || expanded));
    const startIndex = currentIndex < 0 ? 0 : currentIndex;
    const nextIndex = (startIndex + direction + topics.length) % topics.length;
    const nextTopic = topics[nextIndex];
    setExpanded(nextTopic.id);
    window.setTimeout(() => document.getElementById("spotlight-card-" + nextTopic.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  useEffect(() => {
    if (!feeds.length || deepLinkHandled.current || !topics.every((topic) => feedById.has(topic.id))) return;
    const params = new URLSearchParams(window.location.search);
    const articleUrl = params.get("story");
    const title = params.get("title");
    const requestedTopic = params.get("topic");
    if (!articleUrl && !title && !requestedTopic) { deepLinkHandled.current = true; return; }
    const match = topics.find((topic) => {
      const item = feedById.get(topic.id)?.items[0];
      return Boolean(item && ((articleUrl && item.articleUrl === articleUrl) || (title && item.title.toLowerCase() === title.toLowerCase())));
    });
    deepLinkHandled.current = true;
    const topicMatch = topics.find((topic) => topic.id === requestedTopic);
    const targetTopic = topicMatch || match;
    if (targetTopic) {
      const currentItem = feedById.get(targetTopic.id)?.items[0];
      const requestedStoryIsCurrent = Boolean(currentItem && ((articleUrl && currentItem.articleUrl === articleUrl) || (title && currentItem.title.toLowerCase() === title.toLowerCase())));
      setExpanded(targetTopic.id);
      if (articleUrl && !requestedStoryIsCurrent) setUnavailableStory({ title: title || "This Spotlight story", url: articleUrl });
      window.setTimeout(() => document.getElementById("spotlight-card-" + targetTopic.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    } else if (articleUrl) {
      setUnavailableStory({ title: title || "This Spotlight story", url: articleUrl });
      window.setTimeout(() => document.getElementById("spotlight-unavailable-story")?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    }
  }, [feeds, feedById]);

  return (
    <section className={styles.feed} id="spotlight-vertical-feed" aria-label="Six Spotlight topics">

      <div className={styles.feedIntro}>
        <div><span className={styles.eyebrow}>SIX TOPICS · ONE PLACE TO DISCOVER</span><h2>Explore Spotlight</h2><p>Choose one of the six topics to open its latest story.</p></div>
        <a className={styles.submitLink} href="#submit-review">Submit your work for review ↓</a>
      </div>
      <div className={styles.cards} id="spotlight-topic-cards">
        {topics.map((topic, index) => {
          const item = feedById.get(topic.id)?.items[0];
          const isOpen = expanded === topic.id;
          return (
            <article className={styles.card} id={"spotlight-card-" + topic.id} key={topic.id}>
              {index === 0 ? (
                <>
                  <a className={styles.leadImageLink} href="#submit-review" aria-label="Go to the Spotlight submission and review form">
                    <div className={styles.imageFrame}><img src={topic.image} alt="Spotlight Music Reviews — submit your work for review" loading="eager" decoding="async" /></div>
                    <span className={styles.leadImageLabel}>SUBMIT YOUR WORK FOR REVIEW ↓</span>
                  </a>
                  <section className={styles.submissionPreview} aria-live="polite" aria-label="Live Spotlight submission preview">
                    <span className={styles.previewKicker}>SPOTLIGHT SUBMISSION PREVIEW</span>
                    <h4>{preview.title.trim() || "Your title or artist name will appear here"}</h4>
                    <span className={styles.previewCategory}>{preview.category}</span>
                    {preview.link.trim() && <p className={styles.previewLink}>{preview.link.trim()}</p>}
                    {preview.note.trim() && <p className={styles.previewNote}>{preview.note.trim()}</p>}
                    <small>Details update as you complete the form below. This is a live preview, not a published or approved review.</small>
                  </section>
                  <button type="button" className={styles.cardTrigger} aria-expanded={isOpen} aria-controls={"spotlight-expanded-" + topic.id} onClick={() => setExpanded(isOpen ? null : topic.id)}>
                    <div className={styles.cardCopy}>
                      <h3>{topic.label}</h3>
                      <p className={styles.headline}>{item?.title || topic.fallbackHeadline}</p>
                      <span className={styles.toggle}>{isOpen ? "CLOSE STORY ↑" : "EXPLORE TOPIC ↓"}</span>
                    </div>
                  </button>
                </>
              ) : (
                <button type="button" className={styles.cardTrigger} aria-expanded={isOpen} aria-controls={"spotlight-expanded-" + topic.id} onClick={() => setExpanded(isOpen ? null : topic.id)}>
                  <div className={styles.imageFrame}><img src={topic.image} alt="" loading="lazy" decoding="async" /></div>
                  <div className={styles.cardCopy}>
                    <h3>{topic.label}</h3>
                    <p className={styles.headline}>{item?.title || topic.fallbackHeadline}</p>
                    <span className={styles.toggle}>{isOpen ? "CLOSE STORY ↑" : "EXPLORE TOPIC ↓"}</span>
                  </div>
                </button>
              )}
              {isOpen && (
                <div className={styles.expanded} id={"spotlight-expanded-" + topic.id}>
                  {item ? (
                    <>
                      <div className={styles.storyMeta}>{item.source}{published(item.publishedAt) ? " · " + published(item.publishedAt) : ""}</div>
                      <p>{item.summary || "The publisher has not supplied a longer preview. Visit the original source for the full report."}</p>
                      {item.articleUrl && <a className={styles.readStory} href={item.articleUrl} target="_blank" rel="noopener noreferrer">Read the full story at its source ↗</a>}
                    </>
                  ) : <p>Fresh stories for this topic are being gathered. Please check back soon.</p>}
                </div>
              )}
              <nav className={styles.topicActions} aria-label={topic.label + " navigation"}>
                <button type="button" className={styles.navButton} onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.assign("/home"); }}>Previous page</button>
                <a className={styles.navButton} href="#spotlight-vertical-feed">Spotlight main page</a>
                <button type="button" className={styles.navButton} onClick={() => moveTopic(-1, topic.id)}>Previous topic</button>
                <button type="button" className={styles.navButton} onClick={() => moveTopic(1, topic.id)}>Next topic</button>
                <Link className={styles.navButton} href="/home/premium">Premium page ↗</Link>
                <Link href="/home/notifications" className={styles.notificationsLink}>Notifications ↗</Link>
              </nav>
            </article>
          );
        })}
      </div>
      {unavailableStory && <div id="spotlight-unavailable-story" className={styles.unavailableStory} role="status"><div><strong>{unavailableStory.title} is no longer the latest story in Spotlight.</strong><span>You can still read the original publisher story here.</span></div><a href={unavailableStory.url} target="_blank" rel="noopener noreferrer">Read original story ↗</a></div>}
      <div className={styles.afterTopicsAction}>
        <a href="#submit-review" className={styles.navButton}>Submit your work ↓</a>
      </div>
    </section>
  );
}
