import { Brand } from "@/components/brand";
import Link from "next/link";
import { signIn, resendConfirmation } from "../auth-actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const p = await searchParams;

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <Brand />
        <h1>Welcome back.</h1>
        <p>Sign in to reconnect with your community.</p>
        {p.error && <div className="notice" role="alert">{p.error}</div>}
        {p.message && <div className="notice" role="status">{p.message}</div>}
        <form action={signIn}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn btn-primary" type="submit">Sign in securely</button>
          <button
            className="btn"
            type="submit"
            formAction={resendConfirmation}
            formNoValidate
          >
            Resend confirmation email
          </button>
        </form>
        <p>New to TIZIBANE? <Link href="/signup" style={{ color: "var(--gold2)" }}>Create an account</Link></p>
        <p><Link href="/" className="muted">← Back to home</Link></p>
      </section>
    </main>
  );
}
