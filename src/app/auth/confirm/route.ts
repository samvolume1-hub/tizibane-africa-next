import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  createAuthRedirectClient,
  setAuthRedirectDestination,
} from "@/lib/supabase/auth-redirect";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const requestedType = url.searchParams.get("type");
  const requestedNext = url.searchParams.get("next") ?? "/home";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://tizibane-africa-next.onrender.com"
  ).replace(/\/+$/, "");

  const safeNext =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/home";

  const fallbackUrl = new URL(
    "/login?error=Could%20not%20complete%20email%20confirmation.%20Please%20request%20a%20new%20link",
    siteUrl,
  );
  const { supabase, response } = createAuthRedirectClient(request, fallbackUrl);

  try {
    // Support both Supabase's server-side token-hash email template and
    // the PKCE code callback produced by the standard ConfirmationURL flow.
    if (tokenHash) {
      const otpType: EmailOtpType =
        requestedType === "email" ? "email" : "signup";
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (error) {
        response.headers.set(
          "Location",
          new URL(
            "/login?error=This%20confirmation%20link%20is%20invalid%20or%20has%20expired.%20Please%20request%20a%20new%20one",
            siteUrl,
          ).toString(),
        );
        return response;
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return response;
    } else {
      return response;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      response.headers.set(
        "Location",
        new URL(
          "/login?error=Your%20email%20was%20confirmed%2C%20but%20we%20could%20not%20start%20your%20session.%20Please%20sign%20in",
          siteUrl,
        ).toString(),
      );
      return response;
    }

    const destination =
      user.email?.toLowerCase() === "samvolume1@gmail.com"
        ? "/home/premium/admin"
        : safeNext;

    return setAuthRedirectDestination(response, new URL(destination, siteUrl));
  } catch {
    return response;
  }
}
