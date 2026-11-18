import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import { supabaseFetch } from "./fetch";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!browserClient) {
    const { url, key } = getSupabaseConfig();
    browserClient = createBrowserClient(url, key, {
      global: { fetch: supabaseFetch },
    });
  }
  return browserClient;
}
