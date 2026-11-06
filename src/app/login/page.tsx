import { Brand } from "@/components/brand";
import { PasswordField } from "@/components/password-field";
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
            <input id="signin-email" name="email" type="email" autoComplete="email" required />
          </div>
          <PasswordField
            id="signin-password"
            name="password"
            label="Password"
            autoComplete="current-password"
          />
          <button className="btn btn-primary" type="submit">Sign in securely</button>
        </form>

        <div className="field" style={{ marginTop: "1.25rem" }}>
          <p><strong>Need a new confirmation email?</strong></p>
          <p className="muted">Enter your email below. No password is needed.</p>
        </div>
        <form action={resendConfirmation}>
          <div className="field">
            <label htmlFor="resend-email">Email address</label>
            <input id="resend-email" name="email" type="email" autoComplete="email" required />
          </div>
          <button className="btn" type="submit">Resend confirmation email</button>
        </form>

        <p>New to TIZIBANE? <Link href="/signup" style={{ color: "var(--gold2)" }}>Create an account</Link></p>
        <p><Link href="/" className="muted">← Back to home</Link></p>
      </section>
    </main>
  );
}
