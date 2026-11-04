import Link from "next/link";
import { signUp } from "../auth-actions";

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const p = await searchParams;

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <Link href="/" className="brand">
          <span className="brand-mark">T</span>
          <span>TIZIBANE<small>AFRICA</small></span>
        </Link>

        <h1>Your circle starts here.</h1>
        <p>Create your account and join the conversation.</p>
        {p.error && <div className="notice" role="alert">{p.error}</div>}

        <form action={signUp}>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" type="text" autoComplete="name" maxLength={80} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Create password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
            <span className="muted">Use at least 10 characters.</span>
          </div>
          <button className="btn btn-primary">Create my account</button>
        </form>

        <p>Already a member? <Link href="/login" style={{ color: "var(--gold2)" }}>Sign in</Link></p>

        <p><Link href="/" className="muted">← Back to home</Link></p>
      </section>
    </main>
  );
}
