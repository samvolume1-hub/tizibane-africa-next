"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/auth-actions";
import { NavigationIcon } from "@/components/navigation-icon";
import { mobileNavigationItems, primaryNavigationItems, secondaryNavigationItems } from "@/components/navigation-items";
import { AppPageControls } from "@/components/app-page-controls";
import styles from "@/components/community-navigation.module.css";

const primaryItems = primaryNavigationItems;
const secondaryItems = secondaryNavigationItems;
const mobileItems = mobileNavigationItems;

export function CommunityNavigation({ active }: { active: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmMobileLogout, setConfirmMobileLogout] = useState(false);
  const [confirmSidebarLogout, setConfirmSidebarLogout] = useState(false);
  const isSecondaryActive = secondaryItems.some((item) => item.key === active);

  useEffect(() => {
    setMoreOpen(false);
    setConfirmMobileLogout(false);
    setConfirmSidebarLogout(false);
  }, [pathname]);

  return (
    <>
      <aside className={styles.sidebar} aria-label="TIZIBANE navigation" onKeyDown={(event) => { if (event.key === "Escape") { setMoreOpen(false); setConfirmSidebarLogout(false); } }}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">T</span>
          <span className={styles.brandCopy}>
            <span className={styles.brandName}>TIZIBANE</span>
            <span className={styles.brandTagline}>Connect. Belong. Grow.</span>
          </span>
        </div>

        <div className={styles.sectionLabel}>Your community</div>
        <nav className={styles.primaryNav} aria-label="Main navigation">
          {primaryItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={styles.primaryLink}
              aria-current={active === item.key ? "page" : undefined}
              title={item.label}
            >
              <span className={styles.iconContainer}><NavigationIcon name={item.key} /></span>
              <span className={styles.primaryLabel}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarActions} aria-label="Account controls">
          <Link
            href="/home/settings"
            className={styles.sidebarAction}
            aria-current={active === "settings" ? "page" : undefined}
            title="Settings"
          >
            <NavigationIcon name="settings" />
            <span>Settings</span>
          </Link>
          {confirmSidebarLogout ? (
            <div className={styles.sidebarLogoutConfirm} role="group" aria-label="Confirm sign out">
              <span>Are you sure you want to sign out?</span>
              <form action={signOut}><button type="submit">Yes, sign out</button></form>
              <button type="button" onClick={() => setConfirmSidebarLogout(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className={styles.sidebarAction} onClick={() => setConfirmSidebarLogout(true)} title="Sign out">
              <NavigationIcon name="logout" />
              <span>Sign out</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className={styles.desktopMoreTrigger}
          aria-expanded={moreOpen}
          aria-controls="tizibane-more-destinations"
          onClick={() => setMoreOpen((value) => !value)}
        >
          <span className={styles.iconContainer}><NavigationIcon name="more" /></span>
          More destinations
        </button>

        <div className={styles.sidebarFoot}>A home for Zambian communities.</div>

        <nav className={styles.mobileBar} aria-label="Mobile navigation">
          {mobileItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={styles.mobileLink}
              aria-current={active === item.key ? "page" : undefined}
              aria-label={item.label}
            >
              <NavigationIcon name={item.key} className={styles.mobileIcon} />
              <span className={styles.mobileLabel}>{item.key === "profile" ? "Profile" : item.key === "notifications" ? "Alerts" : item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            className={`${styles.moreTrigger}${isSecondaryActive ? ` ${styles.moreActive}` : ""}`}
            aria-expanded={moreOpen}
            aria-controls="tizibane-more-destinations"
            onClick={() => setMoreOpen((value) => !value)}
          >
            <NavigationIcon name="more" className={styles.mobileIcon} />
            <span className={styles.mobileLabel}>More</span>
          </button>
        </nav>

        <nav
          id="tizibane-more-destinations"
          className={styles.mobileMorePanel}
          aria-label="More destinations"
          onKeyDown={(event) => { if (event.key === "Escape") setMoreOpen(false); }}
          hidden={!moreOpen}
        >
          {secondaryItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={styles.moreLink}
              aria-current={active === item.key ? "page" : undefined}
              onClick={() => setMoreOpen(false)}
            >
              <NavigationIcon name={item.key} className={styles.moreIcon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className={styles.mobileMoreFooter}>
            {confirmMobileLogout ? (
              <div className={styles.logoutConfirm} role="group" aria-label="Confirm sign out">
                <span>Are you sure you want to sign out?</span>
                <form action={signOut}><button type="submit">Yes, sign out</button></form>
                <button type="button" onClick={() => setConfirmMobileLogout(false)}>Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmMobileLogout(true)}>Sign out</button>
            )}
          </div>
        </nav>
      </aside>

      <AppPageControls active={active} />
    </>
  );
}
