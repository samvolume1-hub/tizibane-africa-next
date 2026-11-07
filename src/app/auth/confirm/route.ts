import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const requestedNext = url.searchParams.get("next") ?? "/home";

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://tizibane-africa-next.onrender.com"
  ).replace(/\\/+$/, "");

  const siteOrigin = new URL(siteUrl).origin;
  let safeNext = "/home";
  try {
    const candidate = new URL(requestedNext, siteUrl);
    if (candidate.origin === siteOrigin) {
      safeNext = candidate.pathname + candidate.search + candidate.hash;
    }
  } catch {
    safeNext = "/home";
  }

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL("/login?error=The%20confirmation%20link%20is%20missing%20or%20invalid", siteUrl),
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "signup" as EmailOtpType,
    });

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=This%20confirmation%20link%20is%20invalid%20or%20has%20expired.%20Please%20request%20a%20new%20one", siteUrl),
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=Your%20email%20was%20confirmed%2C%20but%20we%20could%20not%20start%20your%20session.%20Please%20sign%20in", siteUrl),
      );
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_platform_admin");
    const destination = !adminError && isAdmin ? "/home/premium/admin" : safeNext;

    return NextResponse.redirect(new URL(destination, siteUrl));
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=We%20could%20not%20complete%20email%20confirmation.%20Please%20try%20again", siteUrl),
    );
  }
}
