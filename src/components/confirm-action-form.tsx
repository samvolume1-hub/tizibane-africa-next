"use client";

import type { FormEvent, ReactNode } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  confirmMessage: string;
  children: ReactNode;
};

export function ConfirmActionForm({ action, className, confirmMessage, children }: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(confirmMessage)) event.preventDefault();
  }

  return <form action={action} className={className} onSubmit={handleSubmit}>{children}</form>;
}
