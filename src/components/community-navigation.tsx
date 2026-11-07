import { Brand } from "@/components/brand";
import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { AppPageControls } from "@/components/app-page-controls";

const items = [
  { href: "/home", icon: "⌂", label: "Home", key: "home" },
  { href: "/home/profile", icon: "◎", label: "My profile", key: "profile" },
  { href: "/home/stories", icon: "◉", label: "Stories", key: "stories" },
  { href: "/home/people", icon: "♧", label: "People", key: "people" },
  { href: "/home/messages", icon: "✉", label: "Messages", key: "messages" },
  { href: "/home/notifications", icon: "♢", label: "Notifications", key: "notifications" },
  { href: "/home/announcements", icon: "✦", label: "Announcements", key: "announcements" },
  { href: "/home/activity", icon: "◷", label: "Community activity", key: "activity" },
  { href: "/home/blocked", icon: "⊘", label: "Blocked", key: "blocked" },
  { href: "/home/groups", icon: "◈", label: "Groups", key: "groups" },
  { href: "/home/events", icon: "◇", label: "Events", key: "events" },
  { href: "/home/premium", icon: "✦", label: "Premium advertising", key: "premium" },
  { href: "/home/connect", icon: "↗", label: "Company links", key: "connect" },
];

const mobilePrimary = ["home", "people", "messages", "groups"];
const mobileMore = ["profile", "stories", "notifications", "announcements", "activity", "blocked", "events", "premium", "connect"];

export function CommunityNavigation({ active }: { active: string }) {
  const moreIsActive = mobileMore.includes(active);
  return (
    <aside className="sidebar">
      <section className="community-nav-section" aria-label="TIZIBANE Africa community navigation">
        <div className="community-nav-brand"><Brand /></div>
        <nav className="side-nav desktop-side-nav" aria-label="Main navigation">
          {items.map((item) => (
            <Link key={item.key} href={item.href} className={active === item.key ? "active" : undefined} aria-current={active === item.key ? "page" : undefined}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {items.filter((item) => mobilePrimary.includes(item.key)).map((item) => (
            <Link key={item.key} href={item.href} className={active === item.key ? "active" : undefined} aria-current={active === item.key ? "page" : undefined}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
            </Link>
          ))}
          <details className={"mobile-more-menu" + (moreIsActive ? " active" : "")}>
            <summary aria-label="More navigation options" aria-current={moreIsActive ? "page" : undefined}>
              <span className="nav-icon" aria-hidden="true">•••</span><span>More</span>
            </summary>
            <div className="mobile-more-panel">
              {items.filter((item) => mobileMore.includes(item.key)).map((item) => (
                <Link key={item.key} href={item.href} className={active === item.key ? "active" : undefined} aria-current={active === item.key ? "page" : undefined}>
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
                </Link>
              ))}
              <form action={signOut} className="mobile-more-signout"><button type="submit">Sign out</button></form>
            </div>
          </details>
        </nav>
        <p className="sidebar-note">More community spaces are being connected and tested before they appear here.</p>
        <form action={signOut} className="sidebar-signout">
          <button className="btn" type="submit" style={{ width: "100%" }}>Sign out</button>
        </form>
      </section>
      <AppPageControls />
    </aside>
  );
}