"use client";

import { useFormStatus } from "react-dom";

export function PendingIconButton({
  className,
  label,
  pressed,
  children,
}: {
  className: string;
  label: string;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-busy={pending}
    >
      {pending ? <span aria-hidden="true">…</span> : children}
    </button>
  );
}
