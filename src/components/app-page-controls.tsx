"use client";

import { PendingIconButton } from "@/components/pending-icon-button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/auth-actions";

export function AppPageControls() {
  const router = useRouter();
  const [showTop, setShowTop] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutLabelVisible, setLogoutLabelVisible] = useState(false);

  useEffect(() => {
    const updateTopVisibility = () => setShowTop(window.scrollY > 240);

    updateTopVisibility();
    window.addEventListener("scroll", updateTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateTopVisibility);
  }, []);

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
      <div className="app-page-controls app-page-controls-utilities" aria-label="Page controls">
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
            title="Log out"
          >
            <span className="app-logout-icon" aria-hidden="true" />
            <span className={"app-logout-label" + (logoutLabelVisible ? " is-visible" : "")} aria-hidden="true">Log out</span>
          </button>
        )}
      </div>
    </>
  );
}
