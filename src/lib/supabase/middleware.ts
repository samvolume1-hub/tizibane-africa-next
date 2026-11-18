import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import { supabaseFetch } from "./fetch";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items, headers) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Supabase SSR supplies cache-control headers when a session refreshes.
        // Preserve them on the response so authenticated responses are not cached.
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // A transient auth-network failure must not turn every /home navigation into
  // an opaque middleware 500. The destination page still verifies the user;
  // its route error boundary provides a visible retry if the service is down.
  try {
    await supabase.auth.getClaims();
  } catch {
    // Continue with the request; authoritative page-level auth checks remain.
  }
  return response;
}
