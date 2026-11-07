import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://tizibane-africa-next.onrender.com"
  ).replace(/\/+$/, "");

  const siteOrigin = new URL(siteUrl).origin;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/home";

  let safeNext = "/home";
  try {
    const candidate = new URL(requestedNext, siteUrl);
    if (candidate.origin === siteOrigin) {
      safeNext = candidate.pathname + candidate.search + candidate.hash;
    }
  } catch {
    safeNext = "/home";
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.redirect(
            new URL("/login?error=Could%20not%20confirm%20your%20email", siteUrl),
          );
        }

        const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_platform_admin");
        const destination = !adminError && isAdmin ? "/home/premium/admin" : safeNext;

        return NextResponse.redirect(new URL(destination, siteUrl));
      }
    } catch {
      // Fall through to the confirmation error below.
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Could%20not%20confirm%20your%20email", siteUrl),
  );
}
