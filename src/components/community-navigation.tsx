import { Brand } from "@/components/brand";
import Link from "next/link";
import { signOut } from "@/app/auth-actions";

const items = [
  { href: "/home", icon: "⌂", label: "Home", key: "home" },
  { href: "/home/profile", icon: "◎", label: "My profile", key: "profile" },
  { href: "/home/people", icon: "♧", label: "People", key: "people" },
  { href: "/home/messages", icon: "✉", label: "Messages", key: "messages" },
  { href: "/home/notifications", icon: "♢", label: "Notifications", key: "notifications" },
  { href: "/home/blocked", icon: "⊘", label: "Blocked", key: "blocked" },
  { href: "/home/groups", icon: "◈", label: "Groups", key: "groups" },
  { href: "/home/events", icon: "◇", label: "Events", key: "events" },
  { href: "/home/premium", icon: "✦", label: "Premium advertising", key: "premium" },
  { href: "/home/connect", icon: "↗", label: "Company links", key: "connect" },
];

export function CommunityNavigation({ active }: { active: string }) {
  return (
    <aside className="sidebar">
      <section className="community-nav-section" aria-label="TIZIBANE Africa community navigation">
        <Brand />
        <nav className="side-nav" aria-label="Main navigation">
          {items.map((item) => (
            <Link key={item.key} href={item.href} className={active === item.key ? "active" : undefined} aria-current={active === item.key ? "page" : undefined}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <p className="sidebar-note">More community spaces are being connected and tested before they appear here.</p>
        <form action={signOut} className="sidebar-signout">
          <button className="btn" type="submit" style={{ width: "100%" }}>Sign out</button>
        </form>
      </section>
    </aside>
  );
}
