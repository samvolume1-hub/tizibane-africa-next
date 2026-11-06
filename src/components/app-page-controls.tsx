"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/auth-actions";

export function AppPageControls() {
  const router = useRouter();
  const [showTop, setShowTop] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setShowTop(window.scrollY > 240);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
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
      <div className="app-page-controls" aria-label="Page navigation controls">
        {showTop && (
          <button type="button" className="app-page-control" onClick={goToTop} aria-label="Back to top" title="Back to top">
            <span aria-hidden="true">↑</span><span>Top</span>
          </button>
        )}
        <button type="button" className="app-page-control" onClick={goBack} aria-label="Back to previous page" title="Back to previous page">
          <span aria-hidden="true">←</span><span>Back</span>
        </button>
      </div>

      <div className="app-logout-controls" aria-label="Account controls">
        {confirmLogout ? (
          <div className="app-logout-confirm" role="group" aria-label="Confirm sign out">
            <span>Are you sure you want to log out?</span>
            <form action={signOut}>
              <button type="submit" className="app-page-control app-logout-yes">Yes</button>
            </form>
            <button type="button" className="app-page-control app-logout-no" onClick={() => setConfirmLogout(false)}>No</button>
          </div>
        ) : (
          <button type="button" className="app-page-control app-logout-trigger" onClick={() => setConfirmLogout(true)} aria-label="Log out" title="Log out">
            <span aria-hidden="true">↪</span><span>Log out</span>
          </button>
        )}
      </div>
    </>
  );
}
