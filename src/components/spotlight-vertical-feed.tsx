"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import styles from "./spotlight-vertical-feed.module.css";

type FeedItem = { title: string; source: string; publishedAt: string; summary: string; extendedSummary?: string; articleUrl?: string };
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

function storyParagraphs(value: string) {
  const clean = value.replace(/\\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = (clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean]).map((part) => part.trim()).filter(Boolean);
  if (sentences.length === 1) {
    const midpoint = Math.floor(clean.length / 2);
    const splitAt = clean.lastIndexOf(" ", midpoint);
    return splitAt > 20 ? [clean.slice(0, splitAt).trim(), clean.slice(splitAt + 1).trim()] : [clean];
  }
  const paragraphs = [sentences[0]];
  let current = "";
  for (const sentence of sentences.slice(1)) {
    const next = current ? current + " " + sentence : sentence;
    if (current && next.length > 360 && paragraphs.length < 4) {
      paragraphs.push(current);
      current = sentence;
    } else current = next;
  }
  if (current) paragraphs.push(current);
  return paragraphs.slice(0, 5);
}

function published(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" });
}

export function SpotlightVerticalFeed({ feeds, afterSports }: { feeds: Feed[]; afterSports?: ReactNode }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reader, setReader] = useState<{ topicId: string; item: FeedItem } | null>(null);
  const [readMore, setReadMore] = useState(false);
  const [storiesRead, setStoriesRead] = useState(0);
  const [unavailableStory, setUnavailableStory] = useState<{ title: string; url: string } | null>(null);
  const deepLinkHandled = useRef(false);
  const feedById = useMemo(() => new Map(feeds.map((feed) => [feed.id, feed])), [feeds]);

  function openReader(topicId: string, item: FeedItem) {
    setReader({ topicId, item });
    setReadMore(false);
    setStoriesRead((count) => count + 1);
    window.setTimeout(() => document.getElementById("spotlight-in-app-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function closeReader() {
    setReader(null);
    setReadMore(false);
    window.setTimeout(() => {
      const target = document.getElementById("spotlight-card-" + (reader?.topicId || ""));
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

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
            <Fragment key={topic.id}>
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
                <section className={styles.expanded} id={"spotlight-expanded-" + topic.id} aria-label={topic.label + " stories"}>
                  <div className={styles.storyListHeading}>
                    <div><strong>Latest stories in {topic.label}</strong><span>Choose a story to read it here on TIZIBANE.</span></div>
                    <span className={styles.storyCount}>{feedById.get(topic.id)?.items.length || 0} available</span>
                  </div>
                  {(feedById.get(topic.id)?.items || []).length > 0 ? (
                    <div className={styles.storyList}>
                      {(feedById.get(topic.id)?.items || []).map((story, storyIndex) => (
                        <button type="button" className={styles.storyChoice} key={story.articleUrl || story.title} onClick={() => openReader(topic.id, story)}>
                          <span className={styles.storyChoiceNumber}>{String(storyIndex + 1).padStart(2, "0")}</span>
                          <span className={styles.storyChoiceCopy}><strong>{story.title}</strong><small>{story.source}{story.publishedAt ? " · " + published(story.publishedAt) : ""}</small></span>
                          <span className={styles.storyChoiceArrow} aria-hidden="true">Read ↗</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.sourcePending}>There are no current publisher stories in this topic yet. Please check again shortly.</div>
                  )}
                  {item && <p className={styles.topicFallback}>{passage}</p>}
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
            </Fragment>
          );
        })}
      </div>


      {reader && (() => {
        const topic = topics.find((entry) => entry.id === reader.topicId);
        const fullText = (reader.item.extendedSummary || reader.item.summary || "").trim();
        const paragraphs = storyParagraphs(fullText);
        const opening = paragraphs.slice(0, 2);
        const remaining = paragraphs.slice(2);
        const hasMore = remaining.length > 0;
        return (
          <section className={styles.reader} id="spotlight-in-app-reader" aria-labelledby="spotlight-reader-title">
            <div className={styles.readerTopline}>
              <span className={styles.readerEyebrow}>TIZIBANE SPOTLIGHT · IN-APP READING</span>
              <button type="button" className={styles.readerClose} onClick={closeReader}>← Back to Spotlight</button>
            </div>
            {topic && <img className={styles.readerImage} src={topic.image} alt={topic.label} loading="lazy" />}
            <div className={styles.readerBody}>
              <span className={styles.readerTopic}>{topic?.label || "Spotlight"}</span>
              <h2 id="spotlight-reader-title">{reader.item.title}</h2>
              <div className={styles.storyMeta}><span>{reader.item.source || "TIZIBANE Spotlight"}</span>{reader.item.publishedAt && <time dateTime={reader.item.publishedAt}>{published(reader.item.publishedAt)}</time>}</div>
              {opening.length ? opening.map((paragraph, index) => <p className={styles.readerParagraph} key={index}>{paragraph}</p>) : <p className={styles.readerParagraph}>This publisher has not supplied a readable summary for this story yet. Check the other stories in this topic while we wait for a fuller update.</p>}
              {readMore && hasMore && remaining.map((paragraph, index) => <p className={styles.readerParagraph} key={"more-" + index}>{paragraph}</p>)}
              <button type="button" className={styles.readMoreButton} onClick={() => setReadMore((value) => !value)} aria-expanded={readMore}>
                {readMore ? "SHOW LESS ↑" : "READ MORE ↓"}
              </button>
              {readMore && !hasMore && <p className={styles.readerNote}>That is the full short brief currently supplied by the publisher feed. We have kept you on TIZIBANE rather than sending you away for a longer article.</p>}
              <div className={styles.readerFooter}>
                <button type="button" className={styles.backToStories} onClick={closeReader}>← Return to Spotlight stories</button>
                {reader.item.articleUrl && <a className={styles.originalSource} href={reader.item.articleUrl} target="_blank" rel="noopener noreferrer">Original publisher source ↗</a>}
              </div>
              {storiesRead >= 2 && <aside className={styles.premiumInvitation}>
                <span>DISCOVER MORE ON TIZIBANE</span>
                <strong>Give your business a place in the spotlight.</strong>
                <p>Reach Zambian communities with a Premium advertising feature on TIZIBANE.</p>
                <Link href="/home/premium" className={styles.premiumButton}>Explore Premium advertising ↗</Link>
              </aside>}
            </div>
          </section>
        );
      })()}

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
