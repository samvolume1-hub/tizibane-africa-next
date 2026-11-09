"use client";

import Link from "next/link";
import { PendingIconButton } from "@/components/pending-icon-button";
import featuredIllustrations from "@/components/featured-illustrations.module.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/auth-actions";

const featuredLinks = [
  { href: "/home/connect", label: "Company links", key: "connect" },
  { href: "/home/premium", label: "Premium advertising", key: "premium" },
  { href: "/home/events", label: "Events", key: "events" },
  { href: "/home/activity", label: "Community activity", key: "activity" },
];

export function AppPageControls() {
  const router = useRouter();
  const [showTop, setShowTop] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [peopleHubOpen, setPeopleHubOpen] = useState(false);
  const [featuredLabel, setFeaturedLabel] = useState<string | null>(null);
  const [logoutLabelVisible, setLogoutLabelVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [controlsPinned, setControlsPinned] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearControlsHideTimer() {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  }

  function scheduleControlsHide() {
    clearControlsHideTimer();
    if (controlsPinned || peopleHubOpen) return;
    hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 1500);
  }

  function holdControlsVisible() {
    clearControlsHideTimer();
    setControlsVisible(true);
  }

  function revealControls() {
    holdControlsVisible();
    if (!controlsPinned && !peopleHubOpen) {
      hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 1500);
    }
  }

  function toggleControlsPin() {
    if (controlsPinned) {
      setControlsPinned(false);
      setControlsVisible(true);
      hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 1500);
    } else {
      clearControlsHideTimer();
      setControlsPinned(true);
      setControlsVisible(true);
    }
  }

  function revealAndPinControls() {
    clearControlsHideTimer();
    setControlsPinned(true);
    setControlsVisible(true);
  }

  useEffect(() => {
    const updateVisibility = () => setShowTop(window.scrollY > 240);
    const revealWhileScrolling = () => {
      setControlsVisible(true);
      clearControlsHideTimer();
      if (!controlsPinned && !peopleHubOpen) {
        hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 1500);
      }
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility);
    window.addEventListener("scroll", revealWhileScrolling, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("scroll", revealWhileScrolling);
      clearControlsHideTimer();
    };
  }, [controlsPinned, peopleHubOpen]);

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  }

  function goToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <div
        className={`app-page-controls${controlsVisible || controlsPinned ? " is-visible" : " is-auto-hidden"}`}
        aria-label="Page navigation controls"
        inert={!controlsVisible && !controlsPinned}
        onMouseEnter={holdControlsVisible}
        onMouseLeave={scheduleControlsHide}
        onFocusCapture={holdControlsVisible}
      >
        <button
          type="button"
          className="app-page-controls-pin"
          onClick={toggleControlsPin}
          aria-label={controlsPinned ? "Return navigation to auto-hide" : "Keep navigation controls visible"}
          aria-pressed={controlsPinned}
          title={controlsPinned ? "Unpin navigation" : "Pin navigation open"}
        >
          <span aria-hidden="true">{controlsPinned ? "●" : "⌖"}</span>
        </button>
        <section className={`app-people-hub${peopleHubOpen ? " is-open" : ""}`} aria-label="People hub">
          <button
            type="button"
            className="app-people-hub-trigger"
            aria-expanded={peopleHubOpen}
            aria-controls="app-people-hub-menu"
            onClick={() => {
              const nextOpen = !peopleHubOpen;
              setPeopleHubOpen(nextOpen);
              if (nextOpen) {
                clearControlsHideTimer();
                setControlsVisible(true);
              } else {
                clearControlsHideTimer();
                if (!controlsPinned) {
                  hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 1500);
                }
              }
            }}
          >
            <span className="app-people-hub-icon" aria-hidden="true" />
            <span>PEOPLE</span>
            <span className="app-people-hub-chevron" aria-hidden="true">{peopleHubOpen ? "⌃" : "⌄"}</span>
          </button>
          {peopleHubOpen && (
            <nav id="app-people-hub-menu" className="app-people-hub-menu" aria-label="People destinations">
              <Link href="/home/people" onClick={() => setPeopleHubOpen(false)}>
                <span className="app-people-hub-menu-icon people" aria-hidden="true" />
                <span>Find People</span>
              </Link>
              <Link href="/home/messages" onClick={() => setPeopleHubOpen(false)}>
                <span className="app-people-hub-menu-icon messages" aria-hidden="true" />
                <span>Messages</span>
              </Link>
              <Link href="/home/blocked" onClick={() => setPeopleHubOpen(false)}>
                <span className="app-people-hub-menu-icon blocked" aria-hidden="true" />
                <span>Blocked</span>
              </Link>
            </nav>
          )}
        </section>
        <nav className="app-featured-side-controls" aria-label="Featured navigation">
          {featuredLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="app-featured-side-control"
              aria-label={item.label}
              onMouseEnter={() => setFeaturedLabel(item.key)}
              onMouseLeave={() => setFeaturedLabel(null)}
              onFocus={() => setFeaturedLabel(item.key)}
              onBlur={() => setFeaturedLabel(null)}
              onClick={() => setFeaturedLabel(null)}
            >
              <span className={`nav-illustration ${featuredIllustrations.illustration} ${featuredIllustrations[item.key]}`} data-icon={item.key} aria-hidden="true" />
              <span className={`app-featured-side-label${featuredLabel === item.key ? " is-visible" : ""}`} aria-hidden="true">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="app-page-control-actions">
          {showTop && (
            <button type="button" className="app-page-control" onClick={goToTop} aria-label="Back to top" title="Back to top">
              <span aria-hidden="true">↑</span><span>Top</span>
            </button>
          )}
          <button type="button" className="app-page-control" onClick={goBack} aria-label="Back to previous page" title="Back to previous page">
            <span aria-hidden="true">←</span><span>Back</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`app-page-controls-edge-toggle${controlsVisible || controlsPinned ? " is-panel-visible" : ""}`}
        onClick={revealAndPinControls}
        aria-label="Reveal and pin navigation controls"
        title="Show navigation controls"
        tabIndex={controlsVisible || controlsPinned ? -1 : 0}
      >
        <span aria-hidden="true">‹</span>
      </button>

      <div className="app-logout-controls" aria-label="Account controls">
        {confirmLogout ? (
          <div className="app-logout-confirm" role="group" aria-label="Confirm sign out">
            <span>Are you sure you want to log out?</span>
            <form action={signOut}>
              <PendingIconButton className="app-page-control app-logout-yes" label="Confirm sign out" pendingLabel="Signing out…">YES</PendingIconButton>
            </form>
            <button type="button" className="app-page-control app-logout-no" onClick={() => setConfirmLogout(false)}>NO</button>
          </div>
        ) : (
          <button
            type="button"
            className="app-page-control app-logout-trigger"
            onMouseEnter={() => setLogoutLabelVisible(true)}
            onMouseLeave={() => setLogoutLabelVisible(false)}
            onFocus={() => setLogoutLabelVisible(true)}
            onBlur={() => setLogoutLabelVisible(false)}
            onClick={() => { setLogoutLabelVisible(false); setConfirmLogout(true); }}
            aria-label="Log out"
          >
            <span className="app-logout-icon" aria-hidden="true" />
            <span className={`app-logout-label${logoutLabelVisible ? " is-visible" : ""}`} aria-hidden="true">Log out</span>
          </button>
        )}
      </div>
    </>
  );
}
