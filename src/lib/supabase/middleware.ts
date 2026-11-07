import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try {
    // Refresh sessions when Supabase is reachable, but don't let a transient
    // Auth/network failure take down public pages. Protected pages still call
    // getUser() server-side and enforce authentication before rendering.
    await supabase.auth.getUser();
  } catch {
    // Continue with the current response; the server page remains authoritative.
  }

  return response;
}
