import { supabase as unifiedSupabase, getSupabase } from "./supabase";

export const supabase = unifiedSupabase;

export function createBrowserSupabaseClient() {
  return getSupabase();
}
