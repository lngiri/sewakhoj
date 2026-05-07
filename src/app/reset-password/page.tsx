"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type ResetState = "verifying" | "ready" | "error" | "success";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ResetState>("verifying");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function verifyToken() {
      const token = searchParams.get("token");
      const type = searchParams.get("type");

      if (!token || type !== "recovery") {
        if (!cancelled) {
          setError("Invalid or missing reset link. Please request a new password reset.");
          setState("error");
        }
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "recovery",
        });

        if (cancelled) return;

        if (verifyError) {
          console.error("Reset password - token verification failed:", verifyError);
          setError("This reset link has expired or is invalid. Please request a new one.");
          setState("error");
          return;
        }

        // Token is valid — show the password form (no session created)
        setState("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("Reset password - unexpected error:", err);
        setError("Something went wrong. Please try again or request a new reset link.");
        setState("error");
      }
    }

    verifyToken();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage("Password updated successfully! Redirecting to login...");
        setState("success");

        setTimeout(() => {
          router.push("/login?message=Password updated successfully. Please sign in with your new password.");
        }, 3000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update password";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while verifying token
  if (state === "verifying") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 border border-gray-100">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-gray-500">Verifying your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state (expired/invalid token)
  if (state === "error") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 border border-gray-100">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Link Expired</h1>
            <p className="text-sm font-bold text-gray-500">{error}</p>
            <button
              onClick={() => router.push("/forgot-password")}
              className="w-full bg-gray-900 text-white py-4 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-sewakhoj-red transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-3"
            >
              Request New Reset Link
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (state === "success") {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 border border-gray-100">
          <div className="bg-green-50 text-green-700 p-6 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 mx-auto" />
            <p className="font-bold text-sm">{message}</p>
            <p className="text-xs">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show password form (state === "ready")
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Set New Password</h1>
          <p className="text-sm font-bold text-gray-500 mt-2">
            Enter a strong password to secure your account.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-[24px] py-4 pl-14 pr-14 font-bold text-sm outline-none transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                Confirm New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-[24px] py-4 pl-14 pr-14 font-bold text-sm outline-none transition-all shadow-inner"
                />
              </div>
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
            className="w-full bg-gray-900 text-white py-4 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? "Updating..." : "Update Password"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 border border-gray-100">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
