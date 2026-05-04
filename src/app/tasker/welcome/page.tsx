"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle, 
  PlayCircle, 
  HelpCircle, 
  TrendingUp, 
  ArrowRight,
  Clock,
  ShieldCheck,
  Star
} from "lucide-react";

export default function TaskerWelcomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!authLoading) {
        if (!user) {
          router.push("/login?redirect=/tasker/welcome");
          return;
        }

        // Check if user is actually a tasker
        const { data: tasker } = await supabase
          .from("taskers")
          .select("status")
          .eq("user_id", user.id)
          .single();

        if (!tasker) {
          router.push("/tasker/onboard");
          return;
        }

        // If they are already active (verified), they don't need the welcome page anymore
        if (tasker.status === "active") {
          router.push("/dashboard");
          return;
        }

        setLoading(false);
      }
    };
    checkAccess();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-sewakhoj-red border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs animate-pulse">Preparing your workspace...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-12 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        {/* Celebratory Header */}
        <div className="text-center mb-16 animate-in fade-in zoom-in duration-700">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 text-5xl shadow-xl shadow-green-500/10">
            🎉
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight">
            Welcome to SewaKhoj!
          </h1>
          <p className="text-xl text-gray-600 font-bold max-w-2xl mx-auto">
            तपाईंको आवेदन सफलतापूर्वक प्राप्त भएको छ। हामी तपाईंलाई हाम्रो टोलीमा स्वागत गर्न पाउँदा खुसी छौं!
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-[40px] shadow-2xl p-8 md:p-12 mb-12 border border-blue-50 relative overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ShieldCheck className="w-32 h-32 text-blue-600" />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shrink-0">
              <Clock className="w-10 h-10" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Application Under Review</h2>
              <p className="text-gray-600 font-bold leading-relaxed">
                Your application is being reviewed by our verification team. We usually verify profiles within **24 hours**. 
                You will receive an email and SMS once your profile goes live.
              </p>
            </div>
            <div className="bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest">
              Pending Verification
            </div>
          </div>
        </div>

        {/* Educational Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 animate-in slide-in-from-bottom-12 duration-700 delay-300">
          {/* Tutorial */}
          <div className="bg-white p-8 rounded-[32px] shadow-lg hover:shadow-xl transition-all group border border-slate-50">
            <div className="w-14 h-14 bg-red-50 text-sewakhoj-red rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <PlayCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-3">Watch Tutorial</h3>
            <p className="text-gray-500 text-sm font-bold mb-6">Learn how to manage bookings and get more customers on SewaKhoj.</p>
            <Link href="#" className="text-sewakhoj-red font-black text-xs uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
              Watch Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Help Center */}
          <div className="bg-white p-8 rounded-[32px] shadow-lg hover:shadow-xl transition-all group border border-slate-50">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <HelpCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-3">Help Center</h3>
            <p className="text-gray-500 text-sm font-bold mb-6">Have questions? Check our FAQs or start a live chat with support.</p>
            <Link href="/faq" className="text-blue-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
              Visit FAQ <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Pro-Tips */}
          <div className="bg-white p-8 rounded-[32px] shadow-lg hover:shadow-xl transition-all group border border-slate-50">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Star className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-3">Pro-Tip</h3>
            <p className="text-gray-500 text-sm font-bold mb-6">"High-quality profile photos get 50% more bookings. Make yours count!"</p>
            <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest">
              <TrendingUp className="w-3 h-3" /> Booking Booster
            </div>
          </div>
        </div>

        {/* Primary Action */}
        <div className="text-center animate-in fade-in duration-1000 delay-500">
          <Link 
            href="/dashboard" 
            className="inline-block bg-gray-900 text-white px-12 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-sewakhoj-red transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0"
          >
            Continue to Dashboard / ड्यासबोर्डमा जानुहोस्
          </Link>
          <p className="mt-6 text-gray-400 text-xs font-bold uppercase tracking-tighter">
            You can start exploring the dashboard while we verify your account.
          </p>
        </div>
      </div>
    </main>
  );
}
