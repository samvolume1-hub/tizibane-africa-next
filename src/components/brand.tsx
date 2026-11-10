import Link from "next/link";
import styles from "./brand-signature.module.css";

export function Brand({ className = "", showSignature = false }: { className?: string; showSignature?: boolean }) {
  return (
    <Link href="mailto:samryt26@gmail.com" className={`brand ${className}`.trim()} aria-label="Email TIZIBANE at samryt26@gmail.com" title="Email samryt26@gmail.com">
      <span className="brand-mark" aria-hidden="true"><span className="brand-letter">T</span></span>
      {showSignature ? (
        <span className={styles.brandCopy}>
          <span className={styles.brandNameRow}>
            <span className={styles.brandName}>TIZIBANE</span>
            <span className={styles.signatureGroup} aria-label="Zambia and Royalty">
              <img className={styles.signatureIcon} src="/images/zambian-map-original.jpg" alt="" />
              <img className={styles.signatureIcon} src="/images/royalty-emblem-original.jpg" alt="" />
            </span>
          </span>
          <small className={styles.brandAfrica}>AFRICA</small>
        </span>
      ) : (
        <span>TIZIBANE<small>AFRICA</small></span>
      )}
    </Link>
  );
}
