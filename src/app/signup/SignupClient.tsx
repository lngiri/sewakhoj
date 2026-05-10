"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  ShieldCheck,
  Zap,
  AlertCircle
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && authUser) {
      router.push("/dashboard");
    }
  }, [authUser, authLoading, router]);

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      // Everyone starts as customer
      document.cookie = `oauth_role=customer; path=/; max-age=300; SameSite=Lax`;
      document.cookie = `oauth_fullName=${encodeURIComponent(fullName)}; path=/; max-age=300; SameSite=Lax`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          queryParams: {
            prompt: 'select_account'
          }
        },
      });
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'customer',
          },
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        if (data.session === null) {
          setError("Please check your email to confirm your account, then sign in.");
          setLoading(false);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row overflow-hidden">
      
      {/* Left Panel: Visual/Branding (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gray-900 relative items-center justify-center overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sewakhoj-red/10 blur-[120px] rounded-full animate-pulse delay-1000" />
        
        <div className="relative z-10 max-w-lg px-12 text-center">
          <div className="mb-12 inline-flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl animate-in zoom-in duration-700">
            <img src="/logo.png" alt="SewaKhoj Logo" className="w-24 h-24 rounded-2xl object-cover" />
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black text-white mb-8 tracking-tighter leading-none">
            Join the <br />
            <span className="text-blue-500">Future.</span>
          </h1>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-left p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl group">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-black text-sm uppercase tracking-widest">Instant Matching</p>
                <p className="text-gray-400 text-xs font-bold mt-1">Connect with trusted pros in minutes.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-left p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl group">
              <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-black text-sm uppercase tracking-widest">Trusted Network</p>
                <p className="text-gray-400 text-xs font-bold mt-1">Rigorous verification for every tasker.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-20 bg-white">
        <div className="w-full max-w-lg space-y-8 animate-in slide-in-from-right-12 duration-700">
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Create Account</h2>
            <p className="text-xs md:text-sm text-gray-500 font-bold">Join Nepal's most trusted service marketplace.</p>
          </div>
            
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full py-5 border-2 border-gray-100 rounded-[24px] flex items-center justify-center gap-4 hover:border-gray-900 hover:bg-gray-50 transition-all group"
          >
            <div className="bg-white p-1 rounded-lg group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <span className="font-black text-xs uppercase tracking-widest text-gray-900">Sign up with Google</span>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="px-4 bg-white text-gray-400">or use email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Ram Bahadur"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] py-4 pl-12 pr-6 font-bold text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] py-4 pl-12 pr-6 font-bold text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Secure Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] py-4 pl-12 pr-6 font-bold text-sm outline-none transition-all"
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
              className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? "Creating..." : "Create Account"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:underline font-black">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
