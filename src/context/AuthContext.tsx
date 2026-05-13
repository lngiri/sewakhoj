"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase-browser";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (phone: string) => Promise<{ error: Error | null }>;
  verifyOTP: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    let mounted = true;

    // Step 1: Get initial session first
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Only set loading false AFTER getSession
    });

    // Step 2: Listen for future changes (NOT for initial load)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: Session | null) => {
      if (!mounted) return;
      // Only update state, don't set loading here
      setSession(session);
      setUser(session?.user ?? null);

      // Intercept password recovery flow
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password';
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Dynamic Theming based on Role
  useEffect(() => {
    if (user?.user_metadata?.role === 'tasker') {
      document.body.classList.add('theme-tasker');
    } else {
      document.body.classList.remove('theme-tasker');
    }
  }, [user]);

  const signIn = async (phone: string) => {

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  };

  const verifyOTP = async (phone: string, token: string) => {

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    return { error };
  };

  const signOut = async () => {

    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, verifyOTP, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
