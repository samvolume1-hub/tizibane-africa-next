import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";

type AuthRedirectClient = {
  supabase: ReturnType<typeof createServerClient>;
  response: NextResponse;
};

/**
 * Create the redirect response before Supabase writes auth cookies.
 * Returning a different NextResponse after verification can discard Set-Cookie.
 */
export function createAuthRedirectClient(
  request: NextRequest,
  fallbackUrl: URL,
): AuthRedirectClient {
  const response = NextResponse.redirect(fallbackUrl);
  const { url, key } = getSupabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items, headers) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  return { supabase, response };
}

export function setAuthRedirectDestination(
  response: NextResponse,
  destination: URL,
): NextResponse {
  response.headers.set("Location", destination.toString());
  return response;
}
