import { Brand } from "@/components/brand";
import { PasswordField } from "@/components/password-field";
import Link from "next/link";
import { signUp } from "../auth-actions";

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const p = await searchParams;

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <Brand />

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
          <PasswordField
            id="password"
            name="password"
            label="Create password"
            autoComplete="new-password"
            minLength={10}
          />
          <p className="muted password-help">Use at least 10 characters.</p>
          <button className="btn btn-primary" type="submit">Create my account</button>
        </form>

        <p>Already a member? <Link href="/login" style={{ color: "var(--gold2)" }}>Sign in</Link></p>

        <p><Link href="/" className="muted">← Back to home</Link></p>
      </section>
      
    </main>
  );
}
