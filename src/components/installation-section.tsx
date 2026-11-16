import styles from "./installation-section.module.css";

const androidDownload =
  "https://github.com/samvolume1-hub/tizibane-africa-next/releases/latest/download/tizibane-android.apk";

export function InstallationSection() {
  return (
    <section className={styles.installSection} aria-labelledby="install-heading">
      <div className={styles.installPanel}>
        <p className={styles.eyebrow}>CLICK &amp; DOWNLOAD TO INSTALL</p>
        <h2 id="install-heading">Install TIZIBANE Africa on your device</h2>
        <p className={styles.intro}>One community. Wherever you connect.</p>

        <a className={styles.androidButton} href={androidDownload}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
          </svg>
          <span>DOWNLOAD ANDROID APK</span>
        </a>
        <p className={styles.androidNote}>For Android phones and tablets · Direct APK download</p>

        <div className={styles.platformLinks} aria-label="Other installation options">
          <a href="https://support.apple.com/en-us/guide/iphone/iphea86e5236/ios" target="_blank" rel="noreferrer">
            <span className={styles.platformIcon} aria-hidden="true"></span>
            <span><strong>iPhone &amp; iPad</strong><small>Open in Safari · Add to Home Screen</small></span>
            <span className={styles.arrow} aria-hidden="true">↗</span>
          </a>
          <a href="https://support.microsoft.com/en-us/microsoft-edge/install-manage-or-uninstall-apps-in-microsoft-edge-0c156575-a94a-45e4-a54f-3a84846f6113" target="_blank" rel="noreferrer">
            <span className={styles.platformIcon} aria-hidden="true">▣</span>
            <span><strong>Windows desktop</strong><small>Install this site as an app in Edge</small></span>
            <span className={styles.arrow} aria-hidden="true">↗</span>
          </a>
        </div>
        <p className={styles.helpText}>Need help? <a href="mailto:samvolume1@gmail.com?subject=TIZIBANE%20installation%20help">Contact TIZIBANE support</a></p>
      </div>
    </section>
  );
}
