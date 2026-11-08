import { CommunityNavigation } from "@/components/community-navigation";

export default function HomeLoading() {
  return (
    <main className="app-layout app-route-loading">
      <CommunityNavigation active="" />
      <section className="app-main" aria-busy="true">
        <header className="topbar">
          <span className="muted">TIZIBANE AFRICA</span>
          <span className="signed-in">Opening…</span>
        </header>
        <div className="app-content route-loading-content">
          <p className="route-loading-status" role="status" aria-live="polite">
            Opening your community…
          </p>
          <div className="route-loading-hero" />
          <div className="route-loading-line route-loading-line-short" />
          <div className="route-loading-line" />
          <div className="route-loading-card" />
          <div className="route-loading-card route-loading-card-small" />
        </div>
      </section>
    </main>
  );
}
