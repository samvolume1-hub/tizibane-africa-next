import type { NextRequest } from "next/server";
import { getSafeAuthNext } from "@/lib/supabase/auth-flow";
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
  const next = getSafeAuthNext(searchParams.get("next"));

  const fallbackUrl = new URL(
    "/login?error=Could%20not%20confirm%20your%20email",
    siteUrl,
  );
  const { supabase, response } = createAuthRedirectClient(request, fallbackUrl);

  if (!code) return response;

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return response;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return response;

    const { data: isPlatformAdmin, error: adminCheckError } =
      await supabase.rpc("is_current_platform_admin");
    const destination =
      !adminCheckError && isPlatformAdmin ? "/home/premium/admin" : next;

    return setAuthRedirectDestination(response, new URL(destination, siteUrl));
  } catch {
    return response;
  }
}
