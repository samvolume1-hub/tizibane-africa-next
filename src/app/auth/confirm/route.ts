import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import {
  getSafeAuthNext,
} from "@/lib/supabase/auth-flow";
import {
  createAuthRedirectClient,
  setAuthRedirectDestination,
} from "@/lib/supabase/auth-redirect";

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "https://tizibane-africa-next.onrender.com").replace(/\/+$/, "");

function redirectTo(response: Response, path: string, origin: string) {
  response.headers.set("Location", new URL(path, origin).toString());
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const requestedType = url.searchParams.get("type");
  const next = getSafeAuthNext(url.searchParams.get("next"));
  const origin = siteUrl();
  const fallbackUrl = new URL("/login?error=Could%20not%20confirm%20your%20email", origin);
  const { supabase, response } = createAuthRedirectClient(request, fallbackUrl);

  try {
    // Supabase's SSR/PKCE template sends token_hash; standard ConfirmationURL
    // redirects with a one-time code. The browser fallback supports legacy
    // implicit-flow links whose tokens are delivered in the URL fragment.
    if (tokenHash) {
      const otpType: EmailOtpType =
        requestedType === "email" ? "email" : "signup";
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (error) {
        return redirectTo(
          response,
          "/login?error=This%20confirmation%20link%20is%20invalid%20or%20has%20expired.%20Please%20request%20a%20new%20one",
          origin,
        );
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return response;
    } else {
      return redirectTo(
        response,
        `/auth/finish?next=${encodeURIComponent(next)}`,
        origin,
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirectTo(
        response,
        "/login?error=Your%20email%20was%20confirmed%2C%20but%20we%20could%20not%20start%20your%20session.%20Please%20sign%20in",
        origin,
      );
    }

    const { data: isPlatformAdmin, error: adminCheckError } =
      await supabase.rpc("is_current_platform_admin");
    const destination =
      !adminCheckError && isPlatformAdmin ? "/home/premium/admin" : next;

    return setAuthRedirectDestination(response, new URL(destination, origin));
  } catch {
    return response;
  }
}
