export type AuthRedirectTokens = {
  accessToken: string | null;
  refreshToken: string | null;
  errorDescription: string | null;
};

const INTERNAL_ORIGIN = "https://tizibane.invalid";

export function getSafeAuthNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/home";
  }

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return "/home";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/home";
  }
}

export function readAuthRedirectTokens(hash: string): AuthRedirectTokens {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    // URLSearchParams already decodes this value. Do not decode it a second time.
    errorDescription: params.get("error_description"),
  };
}

export function getAuthFailureMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
