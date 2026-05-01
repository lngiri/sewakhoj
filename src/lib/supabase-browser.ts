import { createBrowserClient, type CookieOptions } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton pattern for client-side
let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;

export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Server-side: return a dummy that won't be used
    return null as any;
  }
  
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  
  return browserClient;
})();
