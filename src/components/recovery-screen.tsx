"use client";

import Link from "next/link";

export function RecoveryScreen({
  title = "This page couldn't load",
  message = "A connection or temporary application problem may have interrupted this page. Your account and saved community content have not been intentionally changed.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "var(--tz-page, #f7f5fa)",
        color: "var(--tz-text, #281e32)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section
        role="alert"
        style={{
          width: "min(100%, 520px)",
          padding: "clamp(22px, 5vw, 36px)",
          border: "1px solid var(--tz-border, #e8e1ef)",
          borderRadius: "18px",
          background: "var(--tz-surface, #fff)",
          boxShadow: "0 8px 28px rgba(35,20,48,.08)",
        }}
      >
        <p style={{ margin: "0 0 10px", color: "var(--tz-accent, #59327f)", fontSize: 12, fontWeight: 800, letterSpacing: ".12em" }}>
          TIZIBANE · COMMUNITY
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(23px, 5vw, 30px)", lineHeight: 1.2 }}>
          {title}
        </h1>
        <p style={{ margin: "0 0 22px", lineHeight: 1.65, color: "var(--tz-muted, #756b80)" }}>
          {message}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            onClick={onRetry}
            style={{
              minHeight: 44,
              padding: "10px 18px",
              border: 0,
              borderRadius: 11,
              background: "var(--tz-accent, #59327f)",
              color: "#fff",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 16px",
              border: "1px solid var(--tz-border, #e8e1ef)",
              borderRadius: 11,
              color: "inherit",
              textDecoration: "none",
              fontWeight: 650,
            }}
          >
            Return to TIZIBANE
          </Link>
        </div>
      </section>
    </main>
  );
}
