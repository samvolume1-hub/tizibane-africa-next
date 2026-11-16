"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/client";
import {
  getSafeAuthNext,
  readAuthRedirectTokens,
} from "@/lib/supabase/auth-flow";

export default function AuthFinishPage() {
  const [message, setMessage] = useState("Confirming your email and opening TIZIBANE…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      const { accessToken, refreshToken, errorDescription } =
        readAuthRedirectTokens(window.location.hash);

      if (errorDescription) {
        if (active) {
          setMessage(errorDescription);
          setFailed(true);
        }
        return;
      }

      if (!accessToken || !refreshToken) {
        if (active) {
          setMessage("This confirmation link is incomplete or has expired. Request a fresh email and open its newest link.");
          setFailed(true);
        }
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        if (active) {
          setMessage("Your email may be confirmed, but we could not finish signing you in. Please request a fresh link or sign in.");
          setFailed(true);
        }
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        if (active) {
          setMessage("We couldn't verify your sign-in session. Please sign in again.");
          setFailed(true);
        }
        return;
      }

      const next = getSafeAuthNext(
        new URLSearchParams(window.location.search).get("next"),
      );
      const { data: isPlatformAdmin, error: adminCheckError } =
        await supabase.rpc("is_current_platform_admin");
      const destination =
        !adminCheckError && isPlatformAdmin ? "/home/premium/admin" : next;

      // Remove one-time tokens from the visible URL before navigating.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      if (active) window.location.replace(destination);
    }

    void finishSignIn().catch(() => {
      if (active) {
        setMessage("We couldn't complete sign-in. Please request a fresh confirmation email or sign in.");
        setFailed(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="auth-wrap">
      <section className="auth-card" aria-live="polite">
        <Brand />
        <div className="signup-success-mark" aria-hidden="true">{failed ? "!" : "✓"}</div>
        <h1>{failed ? "One more step" : "Welcome to TIZIBANE!"}</h1>
        <p>{message}</p>
        {failed && (
          <p>
            <Link href="/login" className="btn btn-primary">Continue to sign in</Link>
          </p>
        )}
      </section>
    </main>
  );
}
