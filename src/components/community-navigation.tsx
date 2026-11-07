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

const primaryKeys = ["home", "messages", "people"];
const moreKeys = ["profile", "stories", "notifications", "announcements", "activity", "blocked", "groups", "events", "premium", "connect"];

function NavigationLink({ item, active }: { item: (typeof items)[number]; active: string }) {
  return (
    <Link
      href={item.href}
      className={active === item.key ? "active" : undefined}
      aria-current={active === item.key ? "page" : undefined}
    >
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

export function CommunityNavigation({ active }: { active: string }) {
  const moreIsActive = moreKeys.includes(active);
  return (
    <aside className="sidebar">
      <section className="community-nav-section" aria-label="TIZIBANE Africa community navigation">
        <div className="community-nav-brand"><Brand /></div>

        <nav className="side-nav desktop-side-nav" aria-label="Main navigation">
          {items.filter((item) => primaryKeys.includes(item.key)).map((item) => (
            <NavigationLink key={item.key} item={item} active={active} />
          ))}
          <details className={"desktop-more-menu" + (moreIsActive ? " active" : "")}>
            <summary aria-label="More navigation options" aria-current={moreIsActive ? "page" : undefined}>
              <span className="nav-icon" aria-hidden="true">•••</span>
              <span>More</span>
              <span className="more-chevron" aria-hidden="true">⌄</span>
            </summary>
            <div className="desktop-more-panel">
              {items.filter((item) => moreKeys.includes(item.key)).map((item) => (
                <NavigationLink key={item.key} item={item} active={active} />
              ))}
              <form action={signOut} className="desktop-more-signout">
                <button type="submit"><span className="nav-icon" aria-hidden="true">↪</span>Sign out</button>
              </form>
            </div>
          </details>
        </nav>

        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {items.filter((item) => primaryKeys.includes(item.key)).map((item) => (
            <NavigationLink key={item.key} item={item} active={active} />
          ))}
          <details className={"mobile-more-menu" + (moreIsActive ? " active" : "")}>
            <summary aria-label="More navigation options" aria-current={moreIsActive ? "page" : undefined}>
              <span className="nav-icon" aria-hidden="true">•••</span><span>More</span>
            </summary>
            <div className="mobile-more-panel">
              {items.filter((item) => moreKeys.includes(item.key)).map((item) => (
                <NavigationLink key={item.key} item={item} active={active} />
              ))}
              <form action={signOut} className="mobile-more-signout">
                <button type="submit"><span className="nav-icon" aria-hidden="true">↪</span>Sign out</button>
              </form>
            </div>
          </details>
        </nav>
      </section>
      <AppPageControls />
    </aside>
  );
}
