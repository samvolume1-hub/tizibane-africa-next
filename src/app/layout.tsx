import type {Metadata, Viewport} from "next";
import "./globals.css";

const siteUrl = "https://tizibane-africa-next.onrender.com";
const previewImage = "/images/zfYl72ihl030o9SInNkzfy4-KiVQKN_NSxKvmFQPSJ_TsRvOTWXol0PwR-_i9ylJeocFChP4YecYSB8rj33c-3K7f8Z0MUJOfhDOS1AImcZOaZquQcuhHsjk56tioosY2XbBpKWUkKvAIGTI3NZcPHcvrDD588zSAZrotyamDJB9NUTqtNuOdiGMgZSIFdFi.jpg?v=2";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "TIZIBANE Africa — Connect. Belong. Grow.",
  description: "You're invited to TIZIBANE Africa, a community made for Zambia. Discover Zambian people, join local communities and build meaningful connections. Connect. Belong. Grow.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "TIZIBANE Africa",
    title: "You're invited to TIZIBANE Africa",
    description: "Join Zambia's community. Find your people, build your circle and stay connected. Connect. Belong. Grow.",
    images: [{url: previewImage, alt: "TIZIBANE Africa — You're invited to join the community"}],
  },
  twitter: {
    card: "summary_large_image",
    title: "You're invited to TIZIBANE Africa",
    description: "Join Zambia's community. Find your people, build your circle and stay connected.",
    images: [previewImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
