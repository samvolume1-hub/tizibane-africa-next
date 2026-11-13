"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import styles from "./spotlight-vertical-feed.module.css";

type FeedItem = { title: string; source: string; publishedAt: string; summary: string; articleUrl?: string };
type Feed = { id: string; label: string; items: FeedItem[] };
type Topic = { id: string; label: string; image: string; fallbackHeadline: string; fallbackPassage: string };

const topics: Topic[] = [
  { id: "music-reviews", label: "Music Reviews", image: "/images/1.%20Music%20Reviews.jpg", fallbackHeadline: "Discover the latest music, artists and releases.", fallbackPassage: "Explore new Zambian releases, emerging artists, music videos and the creative work shaping the local sound. When a current publisher story is available, open it here to read the full report." },
  { id: "sports-feed", label: "Sports Feed", image: "/images/2.%20Sports%20Feed.jpg", fallbackHeadline: "The sporting stories and moments everyone is talking about.", fallbackPassage: "Follow Zambian and international sport, including football, athletics and other major competitions. A current publisher report will appear here when available." },
  { id: "chipata-activities", label: "Chipata Activities", image: "/images/3.%20Chipata%20Activities.jpg", fallbackHeadline: "What's happening in Chipata and across Eastern Province.", fallbackPassage: "Discover community developments, local events, people and opportunities around Chipata and Eastern Province. A current local report will appear here when available." },
  { id: "zambian-politics", label: "Zambian Politics", image: "/images/4.%20Zambian%20Politics.jpg", fallbackHeadline: "The latest developments shaping Zambia.", fallbackPassage: "Read about public policy, parliament, government decisions and civic affairs affecting Zambia. A current publisher report will appear here when available." },
  { id: "learn-trading", label: "Learn Online Trading", image: "/images/5.%20Learn%20Online%20Trading.jpg", fallbackHeadline: "Build your understanding of markets and responsible trading.", fallbackPassage: "Learn the basics of markets, trading terminology, risk and responsible decision-making. Educational content is not financial advice, and trading can result in losses. A relevant learning article will appear here when available." },
  { id: "business-hub", label: "Business Hub", image: "/images/5.%20Business.jpg", fallbackHeadline: "Zambian enterprise, local businesses and new opportunities.", fallbackPassage: "Explore Zambian entrepreneurs, small businesses, markets, services and practical opportunities. A current business report will appear here when available." },
];

function published(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" });
}

export function SpotlightVerticalFeed({ feeds, afterSports }: { feeds: Feed[]; afterSports?: ReactNode }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [unavailableStory, setUnavailableStory] = useState<{ title: string; url: string } | null>(null);
  const deepLinkHandled = useRef(false);
  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);

  function openTopic(topicId: string) {
    setExpanded((current) => current === topicId ? null : topicId);
  }

  function moveTopic(direction: -1 | 1, fromTopicId: string) {
    const currentIndex = topics.findIndex((topic) => topic.id === fromTopicId);
    const nextTopic = topics[(currentIndex + direction + topics.length) % topics.length];
    setExpanded(nextTopic.id);
    window.setTimeout(() => document.getElementById("spotlight-card-" + nextTopic.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  useEffect(() => {
    if (!feeds.length || deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const articleUrl = params.get("story");
    const title = params.get("title");
    const requestedTopic = params.get("topic");
    if (!articleUrl && !title && !requestedTopic) { deepLinkHandled.current = true; return; }
    const matchingTopic = topics.find((topic) => {
      const current = feedById.get(topic.id)?.items[0];
      return Boolean(current && ((articleUrl && current.articleUrl === articleUrl) || (title && current.title.toLowerCase() === title.toLowerCase())));
    });
    const target = topics.find((topic) => topic.id === requestedTopic) || matchingTopic;
    deepLinkHandled.current = true;
    if (target) {
      const current = feedById.get(target.id)?.items[0];
      const storyIsCurrent = Boolean(current && ((articleUrl && current.articleUrl === articleUrl) || (title && current.title.toLowerCase() === title.toLowerCase())));
      setExpanded(target.id);
      if (articleUrl && !storyIsCurrent) setUnavailableStory({ title: title || "This Spotlight story", url: articleUrl });
      window.setTimeout(() => document.getElementById("spotlight-card-" + target.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    } else if (articleUrl) {
      setUnavailableStory({ title: title || "This Spotlight story", url: articleUrl });
      window.setTimeout(() => document.getElementById("spotlight-unavailable-story")?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    }
  }, [feeds, feedById]);

  return (
    <section className={styles.feed} id="spotlight-vertical-feed" aria-label="Six Spotlight topics">
      <header className={styles.feedIntro}>
        <div>
          <span className={styles.eyebrow}>SIX TOPICS · ONE PLACE TO DISCOVER</span>
          <h2>Explore Spotlight</h2>
          <p>Tap anywhere on a story card to reveal its passage. Continue to the publisher for the full story.</p>
        </div>
        <a className={styles.submitLink} href="#submit-review">Submit your work for review <span aria-hidden="true">↓</span></a>
      </header>

      <div className={styles.cards} id="spotlight-topic-cards">
        {topics.map((topic, index) => {
          const item = feedById.get(topic.id)?.items[0];
          const isOpen = expanded === topic.id;
          const passage = item?.summary?.trim() || topic.fallbackPassage;
          return (
            <article className={styles.card} id={"spotlight-card-" + topic.id} key={topic.id}>
              <button
                type="button"
                className={styles.cardTrigger}
                aria-expanded={isOpen}
                aria-controls={"spotlight-expanded-" + topic.id}
                onClick={() => openTopic(topic.id)}
              >
                <span className={styles.imageFrame}>
                  <img src={topic.image} alt={topic.label} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
                  <span className={styles.imageCount}>{String(index + 1).padStart(2, "0")} / 06</span>
                </span>
                <span className={styles.cardCopy}>
                  <span className={styles.topicLabel}>{topic.label}</span>
                  <span className={styles.headline}>{item?.title || topic.fallbackHeadline}</span>
                  <span className={styles.toggle}>{isOpen ? "HIDE PASSAGE ↑" : "TAP TO EXPLORE ↓"}</span>
                </span>
              </button>

              {isOpen && (
                <section className={styles.expanded} id={"spotlight-expanded-" + topic.id} aria-label={topic.label + " story passage"}>
                  <div className={styles.storyMeta}>
                    <span>{item?.source || "TIZIBANE Spotlight"}</span>
                    {item?.publishedAt && <time dateTime={item.publishedAt}>{published(item.publishedAt)}</time>}
                  </div>
                  <p>{passage}</p>
                  {item?.articleUrl ? (
                    <a className={styles.readStory} href={item.articleUrl} target="_blank" rel="noopener noreferrer">
                      Continue reading at {item.source || "the original publisher"} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <p className={styles.sourcePending}>A current publisher link is not available for this topic yet. Please check again shortly.</p>
                  )}
                </section>
              )}

              <nav className={styles.topicActions} aria-label={topic.label + " navigation"}>
                <button type="button" className={styles.navButton} onClick={() => moveTopic(-1, topic.id)}>Previous topic</button>
                <button type="button" className={styles.navButton} onClick={() => moveTopic(1, topic.id)}>Next topic</button>
                <a className={styles.navButton} href="#spotlight-vertical-feed">Back to Spotlight</a>
                <Link className={styles.navButton} href="/home/premium">Premium page ↗</Link>
                <Link href={"/home/notifications?topic=" + encodeURIComponent(topic.id)} className={styles.notificationsLink}>Related notifications ↗</Link>
              </nav>
            </article>
            {index === 1 && afterSports}
          );
        })}
      </div>

      {unavailableStory && (
        <aside id="spotlight-unavailable-story" className={styles.unavailableStory}>
          <div>
            <strong>{unavailableStory.title} is no longer the latest story in Spotlight.</strong>
            <span>The story has moved on from the live feed, but the original publisher link is still available.</span>
          </div>
          <a href={unavailableStory.url} target="_blank" rel="noopener noreferrer">Read original story ↗</a>
        </aside>
      )}
      <div className={styles.afterTopicsAction}>
        <a href="#submit-review" className={styles.submitLink}>Submit your work for review ↓</a>
      </div>
    </section>
  );
}
