import type { NextRequest } from "next/server";
import {
  createAuthRedirectClient,
  setAuthRedirectDestination,
} from "@/lib/supabase/auth-redirect";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://tizibane-africa-next.onrender.com"
  ).replace(/\/+$/, "");
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/home";

  const safeNext =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/home";

  const fallbackUrl = new URL(
    "/login?error=Could%20not%20confirm%20your%20email",
    siteUrl,
  );
  const { supabase, response } = createAuthRedirectClient(request, fallbackUrl);

  if (!code) return response;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return response;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return response;

  const destination =
    user.email?.toLowerCase() === "samvolume1@gmail.com"
      ? "/home/premium/admin"
      : safeNext;

  return setAuthRedirectDestination(response, new URL(destination, siteUrl));
}
