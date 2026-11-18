"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavigationIcon } from "@/components/navigation-icon";
import { secondaryNavigationItems } from "@/components/navigation-items";
import styles from "@/components/community-navigation.module.css";

const railItems = secondaryNavigationItems.filter((item) => item.key !== "settings");

export function AppPageControls({ active }: { active: string }) {
  const router = useRouter();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setShowTop(window.scrollY > 240);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/home");
  }

  return (
    <nav className={styles.secondaryRail} aria-label="Additional destinations and page controls">
      {railItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={styles.secondaryLink}
          aria-current={active === item.key ? "page" : undefined}
          title={item.label}
        >
          <NavigationIcon name={item.key} className={styles.secondaryIcon} />
          <span className={styles.secondaryLabel}>{item.label}</span>
        </Link>
      ))}
      <span className={styles.railDivider} aria-hidden="true" />
      <button type="button" className={styles.utilityButton} onClick={goBack} aria-label="Back to previous page" title="Back">
        <NavigationIcon name="back" />
        <span className={styles.utilityLabel}>Back</span>
      </button>
      {showTop && (
        <button type="button" className={styles.utilityButton} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" title="Top">
          <NavigationIcon name="top" />
          <span className={styles.utilityLabel}>Top</span>
        </button>
      )}
    </nav>
  );
}
