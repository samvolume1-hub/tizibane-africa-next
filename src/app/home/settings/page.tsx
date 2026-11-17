import { CommunityNavigation } from "@/components/community-navigation";
import { ThemeSettings } from "@/components/theme-settings";
import { RoyaltyCopyright } from "@/components/royalty-copyright";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="app-layout">
      <CommunityNavigation active="settings" />
      <section className="app-main">
        <header className="topbar">
          <Link href="/home" className="back-link">← Community home</Link>
          <span className="muted">SETTINGS</span>
        </header>
        <div className="app-content settings-page">
          <section className="welcome settings-welcome">
            <span className="eyebrow">MAKE TIZIBANE YOURS</span>
            <h1>Settings</h1>
            <p>Manage your app experience and accessibility preferences.</p>
          </section>
          <ThemeSettings />
          <RoyaltyCopyright />
        </div>
      </section>
    </main>
  );
}
