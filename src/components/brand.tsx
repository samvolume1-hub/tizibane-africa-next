import Link from "next/link";

export function ZambiaMark() {
  return (
    <svg className="zambia-mark" viewBox="0 0 64 64" role="img" aria-label="Outline map of Zambia">
      <path d="M9 13 17 10 24 12 30 8 37 11 43 9 49 14 55 13 53 20 57 25 52 31 54 38 48 42 47 50 41 52 38 59 32 55 26 57 22 51 17 50 15 44 10 41 12 34 8 29 11 23 7 19Z" fill="rgba(216,181,107,.14)" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round" />
      <path d="m22 19 8 3 7-2 7 5-3 7 4 6-7 5-8-2-5-7-7-3 4-6Z" fill="currentColor" opacity=".16" />
      <circle cx="35" cy="35" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`brand ${className}`.trim()} aria-label="TIZIBANE Africa home">
      <span className="brand-mark"><ZambiaMark /></span>
      <span>TIZIBANE<small>AFRICA</small></span>
    </Link>
  );
}
