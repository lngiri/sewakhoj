import { supabase as browserSupabase } from "./supabase-browser";
import { createClient } from "@supabase/supabase-js";

// Re-export the browser singleton to ensure consistency across the app
export const supabase = browserSupabase;

// For server-side compatibility where the browser singleton might be null,
// we provide a fallback or the user should use supabase-server.ts
if (!supabase && typeof window !== 'undefined') {
  console.warn("Supabase browser client initialization failed.");
}

