import Link from "next/link";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="mailto:samryt26@gmail.com" className={`brand ${className}`.trim()} aria-label="Email TIZIBANE at samryt26@gmail.com" title="Email samryt26@gmail.com">
      <span className="brand-mark" aria-hidden="true"><span className="brand-letter">T</span></span>
      <span>TIZIBANE<small>AFRICA</small></span>
    </Link>
  );
}
