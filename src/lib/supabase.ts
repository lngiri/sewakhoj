import { supabase as browserSupabase } from "./supabase-browser";

/**
 * Global Supabase client for client-side usage.
 * Re-exports the browser singleton to ensure consistency and prevent 
 * "Multiple GoTrueClient instances" warnings.
 */
export const supabase = browserSupabase;
