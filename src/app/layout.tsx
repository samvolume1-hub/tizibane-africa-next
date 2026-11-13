import type {Metadata, Viewport} from "next";
import "./globals.css";
import { NotificationSoundListener } from "@/components/notification-sound-listener";
import { PwaServiceWorkerRegistration } from "@/components/pwa-service-worker-registration";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

const siteUrl = "https://tizibane-africa-next.onrender.com";
const previewImage = "/images/zfYl72ihl030o9SInNkzfy4-KiVQKN_NSxKvmFQPSJ_TsRvOTWXol0PwR-_i9ylJeocFChP4YecYSB8rj33c-3K7f8Z0MUJOfhDOS1AImcZOaZquQcuhHsjk56tioosY2XbBpKWUkKvAIGTI3NZcPHcvrDD588zSAZrotyamDJB9NUTqtNuOdiGMgZSIFdFi.jpg?v=2";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  title: "TIZIBANE Zambia — Connect. Belong. Grow.",
  description: "TIZIBANE is a home for Zambian communities, friendships and meaningful conversations. Build connections, share stories and belong. Connect. Belong. Grow.",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/icons/tizibane-app-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/tizibane-app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TIZIBANE",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "TIZIBANE Zambia",
    title: "You're invited to TIZIBANE Zambia",
    description: "TIZIBANE is a home for Zambian communities, friendships and meaningful conversations. Connect. Belong. Grow.",
    images: [{ url: previewImage, alt: "TIZIBANE Zambia — You're invited to connect, belong and grow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "You're invited to TIZIBANE Zambia",
    description: "A home for Zambian communities, friendships and meaningful conversations. Connect. Belong. Grow.",
    images: [previewImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#24112f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&family=Great+Vibes&family=Manrope:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>
        {children}
        <NotificationSoundListener />
        <PwaServiceWorkerRegistration />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
