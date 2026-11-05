import { Brand } from "@/components/brand";
import Link from "next/link";

export default function SignupSuccess() {
  return (
    <main className="auth-wrap">
      <section className="auth-card signup-success-card">
        <Brand />

        <div className="signup-success-mark" aria-hidden="true">✓</div>
        <h1>Account created successfully! 🎉</h1>
        <p>Your TIZIBANE Africa account has been created.</p>

        <div className="signup-step">
          <span>STEP 1 — REGISTRATION</span>
          <h2>Account created successfully!</h2>
          <p>Your TIZIBANE Africa account has been created.</p>
        </div>

        <div className="signup-step">
          <span>STEP 2 — EMAIL CONFIRMATION</span>
          <h2>One last step!</h2>
          <p>Please check your email and click the confirmation link to activate your account.</p>
        </div>

        <div className="signup-step">
          <span>STEP 3 — SIGN IN</span>
          <h2>Welcome to TIZIBANE Africa!</h2>
          <p>Once your email is confirmed, return here and sign in.</p>
        </div>

        <Link className="btn btn-primary signup-success-button" href="/login">
          Continue to sign in
        </Link>
        <p className="muted signup-success-note">
          Haven't confirmed your email yet? You can come back to this page after checking your inbox.
        </p>
      </section>
    </main>
  );
}
