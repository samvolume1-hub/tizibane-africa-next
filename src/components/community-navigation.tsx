"use client";

import Link from "next/link";
import { AppPageControls } from "@/components/app-page-controls";

const items = [
  { href: "/home", label: "Home", key: "home", spriteY: 68 },
  { href: "/home/people", label: "People", key: "people", spriteY: 196 },
  { href: "/home/messages", label: "Messages", key: "messages", spriteY: 300 },
  { href: "/home/profile", label: "My profile", key: "profile", spriteY: 420 },
  { href: "/home/stories", label: "Stories", key: "stories", spriteY: 544 },
  { href: "/home/notifications", label: "Notifications", key: "notifications", spriteY: 655 },
  { href: "/home/announcements", label: "Announcements", key: "announcements", spriteY: 760 },
  { href: "/home/activity", label: "Community activity", key: "activity", spriteY: 867 },
  { href: "/home/blocked", label: "Blocked", key: "blocked", spriteY: 973 },
  { href: "/home/groups", label: "Groups", key: "groups", spriteY: 1079 },
  { href: "/home/events", label: "Events", key: "events", spriteY: 1178 },
  { href: "/home/premium", label: "Premium advertising", key: "premium", spriteY: 1289 },
  { href: "/home/connect", label: "Company links", key: "connect", spriteY: 1424 },
];

function NavigationLink({ item, active }: { item: (typeof items)[number]; active: string }) {
  const imageOffset = 26 - (item.spriteY * 68) / 281;

  return (
    <Link
      href={item.href}
      className={active === item.key ? "active" : undefined}
      aria-label={item.label}
      aria-current={active === item.key ? "page" : undefined}
      title={item.label}
    >
      <span className="nav-illustration-window" aria-hidden="true">
        <img
          className="nav-illustration-image"
          src="/images/tizibane-navigation-icons.webp"
          alt=""
          draggable={false}
          style={{ transform: `translateY(${imageOffset}px)` }}
        />
      </span>
      <span className="nav-illustration-label">{item.label}</span>
    </Link>
  );
}

export function CommunityNavigation({ active }: { active: string }) {
  return (
    <aside className="sidebar tizibane-icon-sidebar">
      <section className="community-nav-section" aria-label="TIZIBANE Africa community navigation">
        <nav className="tizibane-illustration-nav" aria-label="Main navigation">
          {items.map((item) => (
            <NavigationLink key={item.key} item={item} active={active} />
          ))}
        </nav>
      </section>
      <AppPageControls />
    </aside>
  );
}
