"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AppPageControls() {
  const router = useRouter();
  const [showTop, setShowTop] = useState(false);

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
  );
}
