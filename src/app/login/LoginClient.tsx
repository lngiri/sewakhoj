"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && authUser) {
      let redirect = searchParams.get("redirect");
      if (!redirect || redirect === "/" || redirect.includes('/login') || redirect.includes('/signup')) {
        redirect = authUser.id === '337f575f-8f54-4f74-b762-3b22810d4238' ? '/admin' : '/dashboard';
      }
      window.location.href = redirect;
    }
  }, [authUser, authLoading, router, searchParams]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      // Set oauth_role cookie so the callback knows the user's intended role
      document.cookie = `oauth_role=customer; path=/; max-age=300; SameSite=Lax`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(searchParams.get("redirect") || "/dashboard")}`,
          queryParams: { prompt: 'select_account' }
        },
      });
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // If successful, the useEffect at the top will handle the redirect via window.location.href.
  };

  return (
    <div className="login-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        html, body { 
          overflow: hidden !important; 
          margin: 0; 
          padding: 0; 
          height: 100% !important; 
          width: 100% !important; 
          box-sizing: border-box;
        }
        * { box-sizing: border-box; }
        :root { --vh: 1vh; }
        .login-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          height: calc(var(--vh, 1vh) * 100);
          min-height: -webkit-fill-available;
          background: #F8FAFC;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
        .login-card {
          max-width: clamp(340px, 90vw, 420px);
          width: 100%;
          max-height: 100dvh;
          max-height: calc(var(--vh, 1vh) * 100);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(1rem, 3vh, 2.5rem);
          background: white;
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        input { font-size: 16px !important; }
        .animate-in {
          animation-duration: 0.7s;
          animation-fill-mode: both;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation-name: slideUp; }
      ` }} />
      
      <div className="login-card animate-in animate-slide-up">
        {/* Logo + Header */}
        <div className="text-center" style={{ marginBottom: 'clamp(12px, 2vh, 32px)' }}>
          <img 
            src="/logo.png" 
            alt="SewaKhoj" 
            className="rounded-2xl mx-auto shadow-xl" 
            style={{ 
              width: 'clamp(48px, 8vh, 80px)', 
              height: 'clamp(48px, 8vh, 80px)', 
              marginBottom: 'clamp(8px, 1.5vh, 16px)' 
            }} 
          />
          <h2 
            className="font-black text-gray-900 tracking-tight" 
            style={{ fontSize: 'clamp(1.25rem, 3vh, 1.875rem)' }}
          >
            Welcome Back
          </h2>
          <p 
            className="text-gray-500 font-bold" 
            style={{ 
              fontSize: 'clamp(0.7rem, 1.5vh, 0.875rem)', 
              marginTop: 'clamp(4px, 0.8vh, 8px)' 
            }}
          >
            Sign in to your SewaKhoj account
          </p>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full border-2 border-gray-100 rounded-[24px] flex items-center justify-center gap-4 hover:border-sewakhoj-red hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50 group"
          style={{ 
            padding: 'clamp(10px, 1.8vh, 16px)', 
            marginBottom: 'clamp(12px, 2vh, 24px)' 
          }}
        >
          <div className="bg-white p-1 rounded-lg group-hover:scale-110 transition-transform">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>
          <span className="font-black text-xs uppercase tracking-widest text-gray-900">Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative" style={{ marginBottom: 'clamp(12px, 2vh, 24px)' }}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
            <span className="px-4 bg-white text-gray-400">or use email</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.8vh, 20px)' }}>
          {/* Email Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.8vh, 8px)' }}>
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-sewakhoj-red transition-colors" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red focus:bg-white rounded-[24px] pl-14 pr-6 font-bold text-sm outline-none transition-all shadow-inner"
                style={{ 
                  paddingTop: 'clamp(10px, 1.8vh, 16px)', 
                  paddingBottom: 'clamp(10px, 1.8vh, 16px)' 
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 0.8vh, 8px)' }}>
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Password</label>
              <Link href="/forgot-password" className="text-[10px] font-black uppercase text-sewakhoj-red hover:underline tracking-widest">Forgot?</Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-sewakhoj-red transition-colors" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red focus:bg-white rounded-[24px] pl-14 pr-6 font-bold text-sm outline-none transition-all shadow-inner"
                style={{ 
                  paddingTop: 'clamp(10px, 1.8vh, 16px)', 
                  paddingBottom: 'clamp(10px, 1.8vh, 16px)' 
                }}
              />
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-black uppercase tracking-tight">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-sewakhoj-red transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-3"
            style={{ 
              padding: 'clamp(10px, 1.8vh, 16px)' 
            }}
          >
            {loading ? "Verifying..." : "Sign In"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Signup Link */}
        <p 
          className="text-center font-bold text-gray-500 uppercase tracking-widest" 
          style={{ 
            fontSize: 'clamp(0.65rem, 1.2vh, 0.688rem)', 
            marginTop: 'clamp(12px, 2vh, 32px)' 
          }}
        >
          Don't have an account?{" "}
          <Link href="/signup" className="text-sewakhoj-red hover:underline font-black">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-sewakhoj-red border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs">Authenticating...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
