import Link from "next/link";

export function Brand({ className = "", showSignature = false }: { className?: string; showSignature?: boolean }) {
  return (
    <Link href="mailto:samryt26@gmail.com" className={`brand ${className}`.trim()} aria-label="Email TIZIBANE at samryt26@gmail.com" title="Email samryt26@gmail.com">
      <span className="brand-mark" aria-hidden="true"><span className="brand-letter">T</span></span>
      <span>TIZIBANE{showSignature && <span className="brand-signature" aria-label="Zambia and Royalty"><span aria-hidden="true">🇿🇲</span><span aria-hidden="true">👑</span></span>}<small>AFRICA</small></span>
    </Link>
  );
}
