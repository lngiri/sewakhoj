"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  // Get referral code from URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref);
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && authUser) {
      window.location.href = "/dashboard";
    }
  }, [authUser, authLoading]);

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      // Everyone starts as customer
      document.cookie = `oauth_role=customer; path=/; max-age=300; SameSite=Lax`;
      document.cookie = `oauth_fullName=${encodeURIComponent(fullName)}; path=/; max-age=300; SameSite=Lax`;
      if (referralCode) {
        document.cookie = `oauth_referral=${referralCode}; path=/; max-age=300; SameSite=Lax`;
      }
      
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

    // 🇳🇵 Nepal Phone Validation
    const phoneRegex = /^9[678]\d{8}$/;
    if (phone && !phoneRegex.test(phone)) {
      setError("Invalid Nepal mobile number (98XXXXXXXX, 97XXXXXXXX, or 96XXXXXXXX)");
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
            phone: phone,
            role: 'customer',
            referred_by: referralCode || undefined,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Immediate persistence to public.users to prevent "vanishing" data
        await supabase.from("users").upsert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          phone: phone,
          role: 'customer',
          onboarded: false
        });

        if (data.session === null) {
          setError("Please check your email to confirm your account, then sign in.");
          setLoading(false);
          return;
        }
        // If session exists, let the useEffect handle the redirection to /dashboard
        // once the AuthContext state updates.
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
        input { font-size: 16px !important; }
        .animate-in {
          animation-duration: 0.7s;
          animation-fill-mode: both;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-in-right { animation-name: slideInRight; }
        .animate-zoom-in { animation-name: zoomIn; }
      ` }} />

      <div
        className="flex flex-col md:flex-row bg-[#F8FAFC]"
        style={{
          height: '100dvh',
          overflow: 'hidden'
        }}
      >
        
        {/* Left Panel: Visual/Branding (Hidden on mobile) */}
        <div className="hidden md:flex md:w-1/2 bg-gray-900 relative items-center justify-center overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sewakhoj-red/10 blur-[120px] rounded-full animate-pulse delay-1000" />
          
          <div className="relative z-10 max-w-lg px-12 text-center">
            {/* Logo */}
            <div 
              className="inline-flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl animate-in animate-zoom-in"
              style={{ 
                padding: 'clamp(8px, 1.5vh, 16px)', 
                marginBottom: 'clamp(16px, 3vh, 48px)' 
              }}
            >
              <img 
                src="/logo.png" 
                alt="SewaKhoj Logo" 
                className="rounded-2xl object-cover" 
                style={{ 
                  width: 'clamp(56px, 10vh, 96px)', 
                  height: 'clamp(56px, 10vh, 96px)' 
                }} 
              />
            </div>
            
            {/* Heading */}
            <h1 
              className="font-black text-white tracking-tighter leading-none"
              style={{ 
                fontSize: 'clamp(1.75rem, 5vh, 4.5rem)', 
                marginBottom: 'clamp(16px, 3vh, 32px)' 
              }}
            >
              Join the <br />
              <span className="text-blue-500">Future.</span>
            </h1>
            
            {/* Feature Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.5vh, 24px)' }}>
              <div 
                className="flex items-center gap-4 text-left bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl group"
                style={{ padding: 'clamp(10px, 1.8vh, 24px)' }}
              >
                <div 
                  className="bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ 
                    width: 'clamp(36px, 6vh, 48px)', 
                    height: 'clamp(36px, 6vh, 48px)' 
                  }}
                >
                  <Zap style={{ width: 'clamp(18px, 3vh, 24px)', height: 'clamp(18px, 3vh, 24px)' }} />
                </div>
                <div>
                  <p className="text-white font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.7rem, 1.3vh, 0.875rem)' }}>
                    Instant Matching
                  </p>
                  <p className="text-gray-400 font-bold" style={{ fontSize: 'clamp(0.65rem, 1.1vh, 0.75rem)', marginTop: 'clamp(2px, 0.4vh, 4px)' }}>
                    Connect with trusted pros in minutes.
                  </p>
                </div>
              </div>
              
              <div 
                className="flex items-center gap-4 text-left bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl group"
                style={{ padding: 'clamp(10px, 1.8vh, 24px)' }}
              >
                <div 
                  className="bg-green-500/20 text-green-500 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ 
                    width: 'clamp(36px, 6vh, 48px)', 
                    height: 'clamp(36px, 6vh, 48px)' 
                  }}
                >
                  <ShieldCheck style={{ width: 'clamp(18px, 3vh, 24px)', height: 'clamp(18px, 3vh, 24px)' }} />
                </div>
                <div>
                  <p className="text-white font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.7rem, 1.3vh, 0.875rem)' }}>
                    Trusted Network
                  </p>
                  <p className="text-gray-400 font-bold" style={{ fontSize: 'clamp(0.65rem, 1.1vh, 0.75rem)', marginTop: 'clamp(2px, 0.4vh, 4px)' }}>
                    Rigorous verification for every tasker.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Signup Form */}
        <div 
          className="flex-1 flex items-center justify-center bg-white overflow-hidden"
          style={{ padding: 'clamp(12px, 2vh, 48px)' }}
        >
          <div 
            className="w-full max-w-lg animate-in animate-slide-in-right"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'clamp(10px, 1.8vh, 32px)',
              maxHeight: '100%' 
            }}
          >
            {/* Header */}
            <div className="text-center md:text-left">
              <h2 
                className="font-black text-gray-900 tracking-tight uppercase"
                style={{ 
                  fontSize: 'clamp(1.25rem, 3vh, 2.25rem)', 
                  marginBottom: 'clamp(2px, 0.5vh, 8px)' 
                }}
              >
                Create Account
              </h2>
              <p 
                className="text-gray-500 font-bold"
                style={{ fontSize: 'clamp(0.7rem, 1.3vh, 0.875rem)' }}
              >
                Join Nepal's most trusted service marketplace.
              </p>
            </div>
            
            {/* Referral Banner */}
            {referralCode && (
              <div 
                className="bg-green-50 border border-green-200 rounded-[20px] text-center"
                style={{ padding: 'clamp(8px, 1.5vh, 16px)' }}
              >
                <p className="font-bold text-green-700" style={{ fontSize: 'clamp(0.7rem, 1.3vh, 0.875rem)' }}>
                  🎉 You're joining via referral code: <span className="font-black">{referralCode}</span>
                </p>
                <p className="text-green-600" style={{ fontSize: 'clamp(0.65rem, 1.1vh, 0.75rem)', marginTop: 'clamp(2px, 0.4vh, 4px)' }}>
                  You and your friend both get Rs 500 after your first task!
                </p>
              </div>
            )}
               
            {/* Google Button */}
            <button
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full border-2 border-gray-100 rounded-[24px] flex items-center justify-center gap-4 hover:border-gray-900 hover:bg-gray-50 transition-all group"
              style={{ padding: 'clamp(10px, 1.8vh, 20px)' }}
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

            {/* Divider */}
            <div className="relative" style={{ paddingTop: 'clamp(4px, 0.8vh, 8px)', paddingBottom: 'clamp(4px, 0.8vh, 8px)' }}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="px-4 bg-white text-gray-400">or use email</span>
              </div>
            </div>

            {/* Email Signup Form */}
            <form 
              onSubmit={handleEmailSignup} 
              style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.5vh, 20px)' }}
            >
              {/* Full Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.5vh, 8px)' }}>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Ram Bahadur"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] pl-12 pr-6 font-bold text-sm outline-none transition-all"
                    style={{ 
                      paddingTop: 'clamp(8px, 1.5vh, 16px)', 
                      paddingBottom: 'clamp(8px, 1.5vh, 16px)' 
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.5vh, 8px)' }}>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] pl-12 pr-6 font-bold text-sm outline-none transition-all"
                    style={{ 
                      paddingTop: 'clamp(8px, 1.5vh, 16px)', 
                      paddingBottom: 'clamp(8px, 1.5vh, 16px)' 
                    }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.5vh, 8px)' }}>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Phone Number (Nepal)</label>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="tel"
                    placeholder="9[678]XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] pl-12 pr-6 font-bold text-sm outline-none transition-all"
                    style={{ 
                      paddingTop: 'clamp(8px, 1.5vh, 16px)', 
                      paddingBottom: 'clamp(8px, 1.5vh, 16px)' 
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.5vh, 8px)' }}>
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
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[24px] pl-12 pr-6 font-bold text-sm outline-none transition-all"
                    style={{ 
                      paddingTop: 'clamp(8px, 1.5vh, 16px)', 
                      paddingBottom: 'clamp(8px, 1.5vh, 16px)' 
                    }}
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 rounded-2xl flex items-center gap-3" style={{ padding: 'clamp(8px, 1.5vh, 16px)' }}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-3"
                style={{ padding: 'clamp(10px, 1.8vh, 20px)' }}
              >
                {loading ? "Creating..." : "Create Account"}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            {/* Login Link */}
            <p 
              className="text-center font-bold text-gray-500 uppercase tracking-widest"
              style={{ fontSize: 'clamp(0.65rem, 1.2vh, 0.688rem)' }}
            >
              Already have an account?{" "}
              <Link href="/login" className="text-blue-500 hover:underline font-black">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
