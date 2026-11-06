"use client";

import type { FormEvent } from "react";

type LoginEmailFieldProps = {
  id: string;
  name: string;
};

export function LoginEmailField({ id, name }: LoginEmailFieldProps) {
  function handleInput(event: FormEvent<HTMLInputElement>) {
    const inputType = (event.nativeEvent as InputEvent).inputType;
    if (inputType === "insertReplacementText" || inputType === "insertFromSuggestion") {
      event.currentTarget.blur();
    }
  }

  return (
    <input
      id={id}
      name={name}
      type="email"
      autoComplete="email"
      onInput={handleInput}
      required
    />
  );
}
