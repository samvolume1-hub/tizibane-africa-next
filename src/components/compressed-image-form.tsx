"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

const TARGET_BYTES = 1 * 1024 * 1024;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 1920;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
};

type Preview = { url: string; name: string; size: number };

async function encodeWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
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
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Please choose a JPG, PNG or WebP image.");
  }
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

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CompressedImageForm({ action, className, children }: Props) {
  const [busy, setBusy] = useState(false);
  const bypassSubmit = useRef(false);
  const [message, setMessage] = useState("Photos are checked and optimized before upload.");
  const [previews, setPreviews] = useState<Preview[]>([]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function handleFileChange(event: ChangeEvent<HTMLFormElement>) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "file") return;

    const files = Array.from(target.files ?? []);
    if (!files.length) {
      setPreviews([]);
      setMessage("Photos are checked and optimized before upload.");
      return;
    }

    setPreviews(files.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    })));

    const total = files.length;
    const overLimit = files.some((file) => file.size > MAX_BYTES);
    const needsCompression = files.some((file) => file.size > TARGET_BYTES);
    setMessage(
      overLimit
        ? `${total} photo${total === 1 ? "" : "s"} selected. Large files will be compressed; each final photo must be 2 MB or smaller.`
        : needsCompression
          ? `${total} photo${total === 1 ? "" : "s"} selected. We’ll optimize them toward 1 MB each before upload.`
          : `${total} photo${total === 1 ? "" : "s"} selected · ${files.map((file) => formatSize(file.size)).join(", ")}.`,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (bypassSubmit.current) {
      bypassSubmit.current = false;
      return;
    }
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const submitButtons = Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"]'));
    const originalLabels = submitButtons.map((button) => button.textContent ?? "Submit");
    setBusy(true);
    setMessage("Preparing your photos…");
    submitButtons.forEach((button) => {
      const label = button.textContent ?? "";
      button.disabled = true;
      button.textContent = /save/i.test(label) ? "Saving…" : /upload/i.test(label) ? "Uploading…" : /post|share|publish/i.test(label) ? "Posting…" : "Working…";
    });

    try {
      const imageInputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"]'));
      for (const input of imageInputs) {
        if (!input.name || !input.files?.length) continue;
        const optimizedFiles: File[] = [];
        for (const original of Array.from(input.files)) {
          const optimized = await optimizeImage(original);
          if (optimized.size > MAX_BYTES) {
            throw new Error(`${original.name} is still larger than 2 MB after optimization. Please choose a smaller image.`);
          }
          optimizedFiles.push(optimized);
        }
        const transfer = new DataTransfer();
        optimizedFiles.forEach((file) => transfer.items.add(file));
        input.files = transfer.files;
      }

      setMessage("Uploading and saving to TIZIBANE…");
      bypassSubmit.current = true;
      if (submitter instanceof HTMLButtonElement) form.requestSubmit(submitter);
      else form.requestSubmit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your photos could not be prepared. Please try again.");
      setBusy(false);
      submitButtons.forEach((button, index) => {
        button.disabled = false;
        button.textContent = originalLabels[index];
      });
    }
  }

  return (
    <form action={action} className={className} onChange={handleFileChange} onSubmit={handleSubmit}>
      {children}
      {previews.length > 0 && (
        <div className="image-upload-preview-list" aria-label="Selected photo previews">
          {previews.map((preview, index) => (
            <div className="image-upload-preview" key={preview.url}>
              <img src={preview.url} alt={`Selected photo ${index + 1}`} />
              <span>{preview.name} · {formatSize(preview.size)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="image-compression-status" role="status" aria-live="polite">{message}</p>
    </form>
  );
}
