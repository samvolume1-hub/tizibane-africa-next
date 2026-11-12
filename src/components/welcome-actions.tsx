import Link from "next/link";

export function WelcomeActions() {
  return (
    <nav
      className="actions welcome-top-actions"
      aria-label="Account access"
    >
      <Link className="btn" href="/login">
        Log in
      </Link>
      <Link className="btn btn-primary" href="/signup">
        Create account
      </Link>
    </nav>
  );
}
