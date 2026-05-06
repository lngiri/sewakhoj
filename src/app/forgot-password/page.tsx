"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Password reset instructions have been sent to your email.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 border border-gray-100 animate-in slide-in-from-bottom-8 duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-sewakhoj-red" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reset Password</h1>
          <p className="text-sm font-bold text-gray-500 mt-2">Enter your email and we'll send you instructions to reset your password.</p>
        </div>

        {message ? (
          <div className="bg-green-50 text-green-700 p-6 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 mx-auto" />
            <p className="font-bold text-sm">{message}</p>
            <div className="pt-4">
              <Link href="/login" className="text-xs font-black uppercase tracking-widest text-green-800 hover:text-green-600 transition-colors">
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
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
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red focus:bg-white rounded-[24px] py-4 pl-14 pr-6 font-bold text-sm outline-none transition-all shadow-inner"
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
              className="w-full bg-gray-900 text-white py-4 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-sewakhoj-red transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? "Sending..." : "Send Reset Link"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {!message && (
          <p className="text-center text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-8">
            Remember your password?{" "}
            <Link href="/login" className="text-sewakhoj-red hover:underline font-black">
              Sign In
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
