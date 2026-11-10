import Link from "next/link";
import styles from "./brand-signature.module.css";

export function Brand({ className = "", showSignature = false }: { className?: string; showSignature?: boolean }) {
  return (
    <Link href="mailto:samryt26@gmail.com" className={`brand ${className}`.trim()} aria-label="Email TIZIBANE at samryt26@gmail.com" title="Email samryt26@gmail.com">
      <span className="brand-mark" aria-hidden="true"><span className="brand-letter">T</span></span>
      <span>TIZIBANE{showSignature && <span className={`brand-signature ${styles.signatureGroup}`} aria-label="Zambia and Royalty"><img className={`brand-signature-icon brand-map-icon ${styles.signatureIcon}`} src="/images/zambian-map-original.jpg" alt="" /><img className={`brand-signature-icon brand-royalty-icon ${styles.signatureIcon}`} src="/images/royalty-emblem-original.jpg" alt="" /></span>}<small>AFRICA</small></span>
    </Link>
  );
}
