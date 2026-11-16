import { Brand } from "@/components/brand";
import Link from "next/link";

export default function SignupSuccess() {
  return (
    <main className="auth-wrap">
      <section className="auth-card signup-success-card">
        <Brand />

        <div className="signup-success-mark" aria-hidden="true">✓</div>
        <p className="signup-step-label">STEP 1 — REGISTRATION</p>
        <h1>Account created successfully! 🎉</h1>
        <p>Your TIZIBANE Africa account has been created.</p>

        <div className="signup-step">
          <span>STEP 2 — EMAIL CONFIRMATION</span>
          <h2>One last step!</h2>
          <p>Check your inbox and open the newest confirmation email. After confirmation, TIZIBANE will sign you in and take you straight into your community.</p>
        </div>

        <div className="signup-step">
          <span>IF YOU NEED HELP</span>
          <h2>Having trouble?</h2>
          <p>If the link has expired or does not open TIZIBANE, return to sign in and request a fresh confirmation email.</p>
        </div>

        <Link className="btn btn-primary signup-success-button" href="/login">
          Open sign in / resend confirmation
        </Link>
      </section>
    </main>
  );
}
