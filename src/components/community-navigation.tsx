"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppPageControls } from "@/components/app-page-controls";

const items = [
  { href: "/home", label: "Home", key: "home" },
  { href: "/home/profile", label: "My profile", key: "profile" },
  { href: "/home/stories", label: "Stories", key: "stories" },
  { href: "/home/people", label: "People", key: "people" },
  { href: "/home/messages", label: "Messages", key: "messages" },
  { href: "/home/connect", label: "Spotlight", key: "connect" },
  { href: "/home/notifications", label: "Notifications", key: "notifications" },
  { href: "/home/announcements", label: "Announcements", key: "announcements" },
  { href: "/home/activity", label: "Community activity", key: "activity" },
  { href: "/home/blocked", label: "Blocked", key: "blocked" },
  { href: "/home/groups", label: "Groups", key: "groups" },
  { href: "/home/events", label: "Events", key: "events" },
  { href: "/home/premium", label: "Premium advertising", key: "premium" },
];

const primaryKeys = new Set([
  "home",
  "profile",
  "stories",
  "people",
  "messages",
  "connect",
  "notifications",
  "announcements",
  "groups",
]);

const primaryItems = items.filter((item) => primaryKeys.has(item.key));
const moreItems = items.filter((item) => !primaryKeys.has(item.key));

export function CommunityNavigation({ active }: { active: string }) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(() => moreItems.some((item) => item.key === active));
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreIsActive = moreItems.some((item) => item.key === active);

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        moreTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen]);

  return (
    <aside className="sidebar tizibane-illustrated-sidebar">
      <section className="community-nav-section" aria-label="TIZIBANE community navigation">
        <nav className="side-nav illustrated-side-nav" aria-label="Main navigation">
          {primaryItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={active === item.key ? "active" : undefined}
              aria-current={active === item.key ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              onMouseEnter={() => setHoveredItem(item.key)}
              onMouseLeave={() => setHoveredItem(null)}
              onFocus={() => setHoveredItem(item.key)}
              onBlur={() => setHoveredItem(null)}
              onClick={() => setHoveredItem(null)}
            >
              <span className="nav-illustration" data-icon={item.key} aria-hidden="true" />
              <span className={"nav-hover-label" + (hoveredItem === item.key ? " is-visible" : "")} aria-hidden="true">
                {item.label}
              </span>
            </Link>
          ))}

          <div className="community-nav-more-wrap" ref={moreMenuRef}>
            <button
              ref={moreTriggerRef}
              type="button"
              className={"community-nav-more-button" + (moreOpen || moreIsActive ? " active" : "")}
              aria-label="More sections"
              aria-expanded={moreOpen}
              aria-controls="community-nav-more-menu"
              title="More sections"
              onClick={() => setMoreOpen((open) => !open)}
              onMouseEnter={() => setHoveredItem("more")}
              onMouseLeave={() => setHoveredItem(null)}
              onFocus={() => setHoveredItem("more")}
              onBlur={() => setHoveredItem(null)}
            >
              <span className="nav-illustration" data-icon="more" aria-hidden="true" />
              <span className={"nav-hover-label" + (hoveredItem === "more" ? " is-visible" : "")} aria-hidden="true">More</span>
            </button>

            {moreOpen && (
              <div id="community-nav-more-menu" className="community-nav-more-menu" aria-label="More destinations">
                {moreItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={active === item.key ? "community-nav-more-link active" : "community-nav-more-link"}
                    aria-current={active === item.key ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span>{item.label}</span>
                    <span className="community-nav-more-arrow" aria-hidden="true">›</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </section>
      <AppPageControls />
    </aside>
  );
}
