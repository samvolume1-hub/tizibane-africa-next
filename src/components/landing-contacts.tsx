"use client";

import { useState } from "react";

export function LandingContacts() {
  const [open, setOpen] = useState<"whatsapp" | "email" | null>(null);

  return (
    <div className="landing-contacts" aria-label="Contact TIZIBANE">
      <details className="landing-contact" open={open === "whatsapp"}>
        <summary onClick={(event) => { event.preventDefault(); setOpen(current => current === "whatsapp" ? null : "whatsapp"); }}>WhatsApp</summary>
        <div className="landing-contact-panel">
          <a href="https://wa.me/260760930509" target="_blank" rel="noreferrer">+260 760 930 509</a>
          <a href="https://wa.me/260769614559" target="_blank" rel="noreferrer">+260 769 614 559</a>
          <a href="https://whatsapp.com/channel/0029VbDlyjA4Crfrf3vyuK0t" target="_blank" rel="noreferrer">TIZIBANE WhatsApp Channel</a>
        </div>
      </details>
      <details className="landing-contact" open={open === "email"}>
        <summary onClick={(event) => { event.preventDefault(); setOpen(current => current === "email" ? null : "email"); }}>Email</summary>
        <div className="landing-contact-panel">
          <a href="mailto:samryt26@gmail.com">samryt26@gmail.com</a>
          <a href="mailto:royaltymusicschool833@gmail.com">royaltymusicschool833@gmail.com</a>
          <a href="mailto:samvolume1@gmail.com">samvolume1@gmail.com</a>
        </div>
      </details>
    </div>
  );
}
