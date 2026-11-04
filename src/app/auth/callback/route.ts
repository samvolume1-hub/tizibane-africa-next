import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/home";
  const safeNext =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const destination =
        user?.email?.toLowerCase() === "samvolume1@gmail.com"
          ? "/home/premium/admin"
          : safeNext;

      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Could%20not%20confirm%20your%20email", origin),
  );
}
