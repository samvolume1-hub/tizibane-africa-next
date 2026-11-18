import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
  profile: <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14a5.5 5.5 0 0 1 3.5 5"/></>,
  messages: <><path d="M20 11.5a8 8 0 0 1-8 8 8.5 8.5 0 0 1-4-.95L3 20l1.45-4.2A8 8 0 1 1 20 11.5Z"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"/></>,
  groups: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M14 15a4.5 4.5 0 0 1 7.5 3.3"/></>,
  stories: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></>,
  notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  connect: <><path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z"/></>,
  announcements: <><path d="M4 13V8a2 2 0 0 1 2-2h2l10-3v17L8 17H6a2 2 0 0 1-2-2v-2Z"/><path d="m8 17 1.5 4M18 8h3M18 13h3"/></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
  blocked: <><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></>,
  events: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3"/></>,
  premium: <><path d="m12 2 2.4 6.8L21 11l-6.6 2.2L12 20l-2.4-6.8L3 11l6.6-2.2L12 2Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  back: <><path d="m14 5-7 7 7 7"/><path d="M7 12h14"/></>,
  top: <><path d="m5 14 7-7 7 7"/><path d="M12 7v14"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
};

export function NavigationIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name] ?? paths.more}
    </svg>
  );
}
