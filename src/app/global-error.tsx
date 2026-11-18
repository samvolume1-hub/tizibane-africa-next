"use client";

import { RecoveryScreen } from "@/components/recovery-screen";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <RecoveryScreen
          title="TIZIBANE needs a moment"
          message="A temporary application error interrupted the page. You can safely try loading it again."
          onRetry={reset}
        />
      </body>
    </html>
  );
}
