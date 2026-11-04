import Link from "next/link";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`brand ${className}`.trim()} aria-label="TIZIBANE Africa home">
      <span className="brand-mark" aria-hidden="true"><span className="brand-letter">T</span></span>
      <span>TIZIBANE<small>AFRICA</small></span>
    </Link>
  );
}
