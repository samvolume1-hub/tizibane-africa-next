"use client";

import { useState } from "react";
import { reportMember, reportPost } from "./safety-actions";

const reasons = [
  { value: "spam", label: "Spam or unwanted content" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Something else" },
] as const;

type Props =
  | { kind: "post"; targetId: string; displayName?: string }
  | { kind: "member"; targetId: string; displayName: string };

export function ReportControl(props: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const selectedReason = reasons.find((item) => item.value === reason);

  function openReport() {
    setMenuOpen(false);
    setReason("");
    setStep(1);
    setDialogOpen(true);
  }

  function closeReport() {
    setDialogOpen(false);
    setReason("");
    setStep(1);
  }

  return (
    <div className="report-control">
      <div className="report-menu-wrap">
        <button
          className="report-menu-trigger"
          type="button"
          aria-label="More options"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span aria-hidden="true">•••</span>
        </button>
        {menuOpen && (
          <div className="report-menu-popover">
            <button type="button" onClick={openReport}>Report</button>
          </div>
        )}
      </div>

      {dialogOpen && (
        <div className="report-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeReport();
        }}>
          <section className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
            <button className="report-dialog-close" type="button" onClick={closeReport} aria-label="Close report">×</button>
            {step === 1 ? (
              <>
                <span className="eyebrow">TIZIBANE safety</span>
                <h2 id="report-dialog-title">Report a concern</h2>
                <p>What would you like us to review?</p>
                <form onSubmit={(event) => { event.preventDefault(); if (reason) setStep(2); }}>
                  <fieldset className="report-reasons">
                    <legend className="sr-only">Choose a report reason</legend>
                    {reasons.map((item) => (
                      <label className={reason === item.value ? "report-reason is-selected" : "report-reason"} key={item.value}>
                        <input
                          type="radio"
                          name="report-reason"
                          value={item.value}
                          checked={reason === item.value}
                          onChange={() => setReason(item.value)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </fieldset>
                  <div className="report-dialog-actions">
                    <button className="btn" type="button" onClick={closeReport}>Cancel</button>
                    <button className="btn btn-primary" type="submit" disabled={!reason}>Continue</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <span className="eyebrow">Final confirmation</span>
                <h2 id="report-dialog-title">Review your report</h2>
                <p>Reason selected: <strong>{selectedReason?.label}</strong></p>
                <p>Are you sure you want to submit this report? It will be sent to the TIZIBANE moderation team for review.</p>
                <form action={props.kind === "post" ? reportPost : reportMember} onSubmit={closeReport}>
                  {props.kind === "post" ? (
                    <input type="hidden" name="post_id" value={props.targetId} />
                  ) : (
                    <input type="hidden" name="member_id" value={props.targetId} />
                  )}
                  <input type="hidden" name="reason" value={reason} />
                  <div className="report-dialog-actions">
                    <button className="btn" type="button" onClick={() => setStep(1)}>Go back</button>
                    <button className="btn btn-primary" type="submit">Submit report</button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
