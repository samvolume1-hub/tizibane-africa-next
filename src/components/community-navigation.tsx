import Link from "next/link";
import { AppPageControls } from "@/components/app-page-controls";

const items = [
  { href: "/home", label: "Home", key: "home", artwork: 0 },
  { href: "/home/profile", label: "My profile", key: "profile", artwork: 3 },
  { href: "/home/stories", label: "Stories", key: "stories", artwork: 4 },
  { href: "/home/people", label: "People", key: "people", artwork: 1 },
  { href: "/home/messages", label: "Messages", key: "messages", artwork: 2 },
  { href: "/home/notifications", label: "Notifications", key: "notifications", artwork: 5 },
  { href: "/home/announcements", label: "Announcements", key: "announcements", artwork: 6 },
  { href: "/home/activity", label: "Community activity", key: "activity", artwork: 7 },
  { href: "/home/blocked", label: "Blocked", key: "blocked", artwork: 8 },
  { href: "/home/groups", label: "Groups", key: "groups", artwork: 9 },
  { href: "/home/events", label: "Events", key: "events", artwork: 10 },
  { href: "/home/premium", label: "Premium advertising", key: "premium", artwork: 11 },
  { href: "/home/connect", label: "Company links", key: "connect", artwork: 12 },
];

export function CommunityNavigation({ active }: { active: string }) {
  return (
    <aside className="sidebar tizibane-illustrated-sidebar">
      <section className="community-nav-section" aria-label="TIZIBANE Africa community navigation">
        <nav className="side-nav illustrated-side-nav" aria-label="Main navigation">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={active === item.key ? "active" : undefined}
              aria-current={active === item.key ? "page" : undefined}
              aria-label={item.label}
            >
              <span
                className="nav-illustration"
                data-icon={item.key}
                aria-hidden="true"
              />
            </Link>
          ))}
        </nav>
      </section>
      <AppPageControls />
    </aside>
  );
}
