import { CommunityNavigation } from "@/components/community-navigation";
import { SpotlightHub } from "@/components/spotlight-hub";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SpotlightPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="app-layout">
      <CommunityNavigation active="connect" />
      <section className="app-main">
        <header className="topbar">
          <Link href="/home" className="back-link">↑ Up to Community home</Link>
          <span className="muted">TIZIBANE · SPOTLIGHT</span>
        </header>
        <div className="app-content">
          <SpotlightHub />
          <footer className="community-credit">A Royalty Uncle Sam creation · © 2026 TIZIBANE Zambia</footer>
        </div>
      </section>
    </main>
  );
}
