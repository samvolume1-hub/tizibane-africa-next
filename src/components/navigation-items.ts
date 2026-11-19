export const primaryNavigationItems = [
  { href: "/home", label: "Home", key: "home" },
  { href: "/home/profile", label: "My profile", key: "profile" },
  { href: "/home/people", label: "People", key: "people" },
  { href: "/home/messages", label: "Messages", key: "messages" },
  { href: "/home/groups", label: "Groups", key: "groups" },
  { href: "/home/stories", label: "Stories", key: "stories" },
  { href: "/home/notifications", label: "Notifications", key: "notifications" },
] as const;

export const secondaryNavigationItems = [
  { href: "/home/connect", label: "Spotlight", key: "connect" },
  { href: "/home/announcements", label: "Announcements", key: "announcements" },
  { href: "/home/activity", label: "Community activity", key: "activity" },
  { href: "/home/events", label: "Events", key: "events" },
  { href: "/home/premium", label: "Premium advertising", key: "premium" },
  { href: "/home/blocked", label: "Blocked", key: "blocked" },
  { href: "/home/settings", label: "Settings", key: "settings" },
] as const;

export const mobileNavigationItems = [
  primaryNavigationItems[0],
  primaryNavigationItems[1],
  primaryNavigationItems[2],
  primaryNavigationItems[3],
  primaryNavigationItems[4],
] as const;
