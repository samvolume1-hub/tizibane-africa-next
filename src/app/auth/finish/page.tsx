"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/client";

export default function AuthFinishPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email and opening TIZIBANE…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const errorDescription = hash.get("error_description");

      if (errorDescription) {
        if (active) {
          setMessage(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
          setFailed(true);
        }
        return;
      }

      if (!accessToken || !refreshToken) {
        if (active) {
          setMessage("Your email link did not include a sign-in session. Please request a fresh confirmation email and try again.");
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
          setMessage("Your email was confirmed, but we could not finish signing you in. Please request a fresh link or sign in.");
          setFailed(true);
        }
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setMessage("Your session could not be verified. Please sign in to continue.");
          setFailed(true);
        }
        return;
      }

      const requestedNext = new URLSearchParams(window.location.search).get("next") ?? "/home";
      const safeNext =
        requestedNext.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : "/home";
      const destination =
        user.email?.toLowerCase() === "samvolume1@gmail.com"
          ? "/home/premium/admin"
          : safeNext;

      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      router.replace(destination);
      router.refresh();
    }

    void finishSignIn();
    return () => {
      active = false;
    };
  }, [router]);

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
