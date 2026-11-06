"use client";

import { useState, type FormEvent, type ReactNode } from "react";

const TARGET_BYTES = 1 * 1024 * 1024;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 1920;

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
};

async function encodeWebp(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== "image/webp") {
        reject(new Error("Your browser could not prepare this image. Please try a recent browser."));
        return;
      }
      resolve(blob);
    }, "image/webp", quality);
  });
}

async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= TARGET_BYTES) return file;

  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser cannot optimize images. Please use an up-to-date browser.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    let best: Blob | null = null;

    for (let sizePass = 0; sizePass < 6; sizePass += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your image could not be prepared. Please try again.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.8, 0.74, 0.68, 0.62, 0.56]) {
        const blob = await encodeWebp(canvas, quality);
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= TARGET_BYTES) {
          return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
            type: "image/webp",
            lastModified: Date.now(),
          });
        }
      }

      if (best && best.size <= MAX_BYTES) break;
      scale *= 0.82;
    }

    if (!best || best.size > MAX_BYTES) {
      throw new Error("This image is still larger than 2 MB after optimization. Please choose a smaller image.");
    }

    return new File([best], file.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export function CompressedImageForm({ action, className, children }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("Preparing your images…");

    const form = event.currentTarget;
    const submitButtons = Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"]'));
    submitButtons.forEach((button) => { button.disabled = true; });

    try {
      const data = new FormData(form);
      const imageInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"]'));
      for (const input of imageInputs) {
        if (!input.name || !input.files?.length) continue;
        const original = input.files[0];
        const optimized = await optimizeImage(original);
        if (optimized.size > MAX_BYTES) {
          throw new Error("Images must be 2 MB or smaller after optimization.");
        }
        data.set(input.name, optimized, optimized.name);
      }
      setMessage("Saving…");
      await action(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your image could not be prepared. Please try again.");
      setBusy(false);
      submitButtons.forEach((button) => { button.disabled = false; });
    }
  }

  return (
    <form action={action} className={className} onSubmit={handleSubmit}>
      {children}
      <p className="image-compression-status" aria-live="polite">{message}</p>
    </form>
  );
}
