import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Only authenticated application pages need a refreshed Supabase session.
// Public landing, login, signup, and email-confirmation requests do not need
// an extra auth network round-trip before rendering or handling their action.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/home/:path*"],
};
