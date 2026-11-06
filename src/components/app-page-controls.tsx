"use client";

import { useRouter } from "next/navigation";

export function AppPageControls() {
  const router = useRouter();

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
      <button type="button" className="app-page-control" onClick={goBack} aria-label="Back to previous page" title="Back to previous page">
        <span aria-hidden="true">←</span><span>Back</span>
      </button>
      <button type="button" className="app-page-control" onClick={goToTop} aria-label="Back to top" title="Back to top">
        <span aria-hidden="true">↑</span><span>Top</span>
      </button>
    </div>
  );
}
