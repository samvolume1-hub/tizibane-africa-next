import styles from "./installation-section.module.css";

const androidDownload =
  "https://github.com/samvolume1-hub/tizibane-africa-next/releases/latest/download/tizibane-android.apk";
const welcomePage = "https://tizibane-africa-next.onrender.com";

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

        <div className={styles.platformLinks} aria-label="Open TIZIBANE">
          <a href={welcomePage}>
            <span className={styles.platformIcon} aria-hidden="true">iOS</span>
            <span><strong>iPhone &amp; iPad</strong><small>Open TIZIBANE welcome page in your browser</small></span>
            <span className={styles.arrow} aria-hidden="true">↗</span>
          </a>
          <a href={welcomePage}>
            <span className={styles.platformIcon} aria-hidden="true">PC</span>
            <span><strong>Windows desktop</strong><small>Open TIZIBANE welcome page in your browser</small></span>
            <span className={styles.arrow} aria-hidden="true">↗</span>
          </a>
        </div>
        <p className={styles.helpText}>Need help? Use the contact options further down this page.</p>
      </div>
    </section>
  );
}
