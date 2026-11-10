"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function WelcomeActions() {
  const [hidden, setHidden] = useState(false);
  const actionsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mobileOrTablet = window.matchMedia("(max-width: 820px)");
    let lastY = window.scrollY;
    let frame = 0;

    const updateVisibility = () => {
      frame = 0;
      const currentY = Math.max(0, window.scrollY);

      if (!mobileOrTablet.matches || currentY <= 48) {
        setHidden(false);
        lastY = currentY;
        return;
      }

      const delta = currentY - lastY;
      if (Math.abs(delta) < 9) return;

      const actionHasFocus =
        actionsRef.current?.contains(document.activeElement) ?? false;

      if (!actionHasFocus) setHidden(delta > 0);
      lastY = currentY;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateVisibility);
    };

    const onViewportChange = () => {
      lastY = window.scrollY;
      setHidden(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    mobileOrTablet.addEventListener("change", onViewportChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      mobileOrTablet.removeEventListener("change", onViewportChange);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav
      ref={actionsRef}
      className={`actions welcome-top-actions${hidden ? " is-hidden" : ""}`}
      aria-label="Account access"
      aria-hidden={hidden}
    >
      <Link className="btn" href="/login" tabIndex={hidden ? -1 : undefined}>
        Sign in
      </Link>
      <Link
        className="btn btn-primary"
        href="/signup"
        tabIndex={hidden ? -1 : undefined}
      >
        Join the community
      </Link>
    </nav>
  );
}
