import { createBrowserClient } from "@supabase/ssr";

// Singleton pattern for client-side to prevent "Multiple GoTrueClient instances" warning
let browserClient: any = null;

export function createBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  return browserClient;
}

// Single instance to be used throughout the client-side of the app
export const supabase = createBrowserSupabaseClient();
