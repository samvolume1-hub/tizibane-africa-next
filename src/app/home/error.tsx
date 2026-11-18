"use client";

import { RecoveryScreen } from "@/components/recovery-screen";

export default function HomeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RecoveryScreen
      title="Your community page couldn't load"
      message="The page may have been interrupted by a slow connection or a temporary service issue. Try again; if it continues, return to TIZIBANE and reopen the page."
      onRetry={reset}
    />
  );
}
