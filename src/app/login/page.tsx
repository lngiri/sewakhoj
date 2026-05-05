"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2,
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

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && authUser) {
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
    }
  }, [authUser, authLoading, router, searchParams]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(searchParams.get("redirect") || "/")}`,
          queryParams: {
            prompt: 'select_account'
          }
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

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row overflow-hidden">
      
      {/* Left Panel: Visual/Branding (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gray-900 relative items-center justify-center overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sewakhoj-red/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
        
        <div className="relative z-10 max-w-lg px-12 text-center">
          <div className="mb-12 inline-flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl animate-in zoom-in duration-700">
            <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-24 h-24 rounded-2xl object-cover" />
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black text-white mb-8 tracking-tighter leading-none animate-in slide-in-from-bottom-8 duration-700 delay-200">
            Welcome <br />
            <span className="text-sewakhoj-red">Back.</span>
          </h1>
          
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <div className="flex items-center gap-4 text-left p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl hover:bg-white/10 transition-all cursor-default group">
              <div className="w-12 h-12 bg-sewakhoj-red/20 text-sewakhoj-red rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-black text-sm uppercase tracking-widest">Secure Access</p>
                <p className="text-gray-400 text-xs font-bold mt-1">End-to-end encrypted user authentication.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-left p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl hover:bg-white/10 transition-all cursor-default group">
              <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-black text-sm uppercase tracking-widest">Verified Profiles</p>
                <p className="text-gray-400 text-xs font-bold mt-1">Join thousands of verified taskers and customers.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer info for branding */}
        <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center opacity-30">
          <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">SewaKhoj © 2026</p>
          <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Built for Nepal</p>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-20 bg-white">
        <div className="w-full max-w-md space-y-10 animate-in slide-in-from-right-12 duration-700">
          <div className="md:hidden text-center mb-8">
             <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-xl" />
             <h2 className="text-3xl font-black text-gray-900 tracking-tight">Sign In</h2>
          </div>

          <div className="hidden md:block">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Sign In</h2>
            <p className="text-gray-500 font-bold text-sm">Enter your credentials to access your workspace.</p>
          </div>

          {/* Social Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-5 border-2 border-gray-100 rounded-[24px] flex items-center justify-center gap-4 hover:border-sewakhoj-red hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50 group"
          >
            <div className="bg-white p-1 rounded-lg group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <span className="font-black text-xs uppercase tracking-widest text-gray-900">Continue with Google</span>
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="px-4 bg-white text-gray-400">or use email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-sewakhoj-red transition-colors" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red focus:bg-white rounded-[24px] py-5 pl-14 pr-6 font-bold text-sm outline-none transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Password</label>
                <Link href="#" className="text-[10px] font-black uppercase text-sewakhoj-red hover:underline tracking-widest">Forgot?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-sewakhoj-red transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red focus:bg-white rounded-[24px] py-5 pl-14 pr-6 font-bold text-sm outline-none transition-all shadow-inner"
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-black uppercase tracking-tight">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-sewakhoj-red transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? "Verifying..." : "Sign In to SewaKhoj"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            Don't have an account?{" "}
            <Link href="/signup" className="text-sewakhoj-red hover:underline font-black">
              Create one now
            </Link>
          </p>
        </div>
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
