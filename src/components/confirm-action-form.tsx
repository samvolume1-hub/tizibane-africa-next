"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  confirmMessage: string;
  confirmTitle?: string;
  confirmYesLabel?: string;
  children: ReactNode;
};

export function ConfirmActionForm({
  action,
  className,
  confirmMessage,
  confirmTitle = "Please confirm",
  confirmYesLabel = "Yes, continue",
  children,
}: Props) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    formRef.current = event.currentTarget;
    setError("");
    setConfirmOpen(true);
  }

  async function confirmAction() {
    if (!formRef.current || busy) return;
    setBusy(true);
    setError("");
    try {
      await action(new FormData(formRef.current));
      setConfirmOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That action could not be completed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <form action={action} className={className} onSubmit={handleSubmit}>
        {children}
      </form>
      {confirmOpen && (
        <div className="tiz-confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setConfirmOpen(false); }}>
          <section className="tiz-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="tiz-action-title" aria-describedby="tiz-action-description">
            <div className="tiz-confirm-icon" aria-hidden="true">✦</div>
            <h2 id="tiz-action-title">{confirmTitle}</h2>
            <p id="tiz-action-description">{confirmMessage}</p>
            {error && <p className="tiz-confirm-error" role="alert">{error}</p>}
            <div className="tiz-confirm-actions">
              <button type="button" className="tiz-confirm-no" disabled={busy} onClick={() => setConfirmOpen(false)}>No, keep it</button>
              <button type="button" className="tiz-confirm-yes" disabled={busy} onClick={confirmAction}>{busy ? "Working…" : confirmYesLabel}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
