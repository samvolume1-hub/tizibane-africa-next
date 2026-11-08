import { Brand } from "@/components/brand";
import { PendingIconButton } from "@/components/pending-icon-button";
import { PasswordField } from "@/components/password-field";
import { LoginEmailField } from "@/components/login-email-field";
import Link from "next/link";
import { signIn, resendConfirmation } from "../auth-actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const p = await searchParams;

  return (
    <main className="auth-wrap login-page">
      <section className="auth-card">
        <Brand />
        <h1>Welcome back.</h1>
        <p>Sign in to reconnect with your community.</p>
        {p.error && <div className="notice" role="alert">{p.error}</div>}
        {p.message && <div className="notice" role="status">{p.message}</div>}

        <form action={signIn}>
          <div className="field">
            <label htmlFor="signin-email">Email address</label>
            <LoginEmailField id="signin-email" name="email" />
          </div>
          <PasswordField
            id="signin-password"
            name="password"
            label="Password"
            autoComplete="current-password"
          />
          <PendingIconButton className="btn btn-primary" label="Sign in securely" pendingLabel="Signing in…">Sign in securely</PendingIconButton>
        </form>

        <div className="field" style={{ marginTop: "1.25rem" }}>
          <p><strong>Need a new confirmation email?</strong></p>
          <p className="muted">Enter your email below. No password is needed.</p>
        </div>
        <form action={resendConfirmation}>
          <div className="field">
            <label htmlFor="resend-email">Email address</label>
            <LoginEmailField id="resend-email" name="email" />
          </div>
          <PendingIconButton className="btn" label="Resend confirmation email" pendingLabel="Sending…">Resend confirmation email</PendingIconButton>
        </form>

        <p>New to TIZIBANE? <Link href="/signup" style={{ color: "var(--gold2)" }}>Create an account</Link></p>
        <p><Link href="/" className="muted">← Back to home</Link></p>
      </section>
    </main>
  );
}
