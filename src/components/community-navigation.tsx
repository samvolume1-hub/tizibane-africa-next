"use client";

import Link from "next/link";
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
  { href: "/home/settings", label: "Settings", key: "settings" },
];

export function CommunityNavigation({ active }: { active: string }) {
  return (
    <aside className="sidebar tizibane-illustrated-sidebar">
      <section className="community-nav-section" aria-label="TIZIBANE Africa community navigation">
        <nav className="side-nav illustrated-side-nav" aria-label="Main navigation">
          {items.filter((item) => !["people", "blocked", "activity", "events", "premium"].includes(item.key)).map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={active === item.key ? "active" : undefined}
              aria-current={active === item.key ? "page" : undefined}
              aria-label={item.label}
            >
              <span className="nav-illustration" data-icon={item.key} aria-hidden="true" />
              <span className="nav-item-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </section>
      <AppPageControls />
    </aside>
  );
}
