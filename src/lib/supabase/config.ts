const FALLBACK_SUPABASE_URL = "https://pqgqdhzcpaugxcfokjrk.supabase.co";
const FALLBACK_PUBLISHABLE_KEY = "sb_publishable_qkYaoLAG7Bupp4lojHXF3g_Hiaq-u3s";

/**
 * The Supabase URL and publishable key are public application configuration.
 * Environment variables override these project defaults in local and hosted
 * environments. Never put a service-role or secret key in this module.
 */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    FALLBACK_PUBLISHABLE_KEY;

  return { url, key };
}
