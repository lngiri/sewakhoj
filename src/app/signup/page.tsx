"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type UserRole = 'customer' | 'tasker';

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('customer');
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createBrowserSupabaseClient();
      
      // Store role and fullName in cookies for the callback to read
      document.cookie = `oauth_role=${role}; path=/; max-age=300; SameSite=Lax`;
      document.cookie = `oauth_fullName=${encodeURIComponent(fullName)}; path=/; max-age=300; SameSite=Lax`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    setError("Facebook signup is currently unavailable. Please use Google or email signup.");
    return;
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
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // If email confirmation is required, show message
        if (data.session === null) {
          setError("Please check your email to confirm your account, then sign in.");
          setLoading(false);
          return;
        }
        
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel: Branding */}
        <div className="md:w-1/2 bg-blue-50 p-8 flex flex-col justify-center items-center text-center">
          <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-32 mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            SewaKhoj.com: Connecting Nepal to trusted services.
          </h2>
          <p className="text-gray-600">
            Welcome! Choose a quick sign-up method or create your account.
          </p>
        </div>

        {/* Right Panel: Form */}
        <div className="md:w-1/2 p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Sign Up</h2>
           
          {/* Role Selection */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`flex-1 py-2 rounded-lg border transition ${
                role === 'customer'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setRole('tasker')}
              className={`flex-1 py-2 rounded-lg border transition ${
                role === 'tasker'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tasker
            </button>
          </div>
           
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full py-2 border rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" width="20" alt="Google"/>
              <span>Sign Up with Google</span>
            </button>
            <button
              onClick={handleFacebookSignup}
              disabled={loading}
              className="w-full py-2 border rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/facebook.svg" width="20" alt="Facebook"/>
              <span>Sign Up with Facebook</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
            />
            
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
