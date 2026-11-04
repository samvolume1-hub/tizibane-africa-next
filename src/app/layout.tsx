import type {Metadata, Viewport} from "next";
import "./globals.css";

const siteUrl = "https://tizibane-africa-next.onrender.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "TIZIBANE Africa — Connect. Belong. Grow.",
  description: "You're invited to TIZIBANE Africa. Discover your people, join communities and build meaningful connections. Connect. Belong. Grow.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "TIZIBANE Africa",
    title: "You're invited to TIZIBANE Africa",
    description: "Join the community. Find your people, build your circle and stay connected. Connect. Belong. Grow.",
    images: [{url: "/opengraph-image", width: 1200, height: 630, alt: "TIZIBANE Africa — You're invited to join the community"}],
  },
  twitter: {
    card: "summary_large_image",
    title: "You're invited to TIZIBANE Africa",
    description: "Join the community. Find your people, build your circle and stay connected.",
    images: ["/opengraph-image"],
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
