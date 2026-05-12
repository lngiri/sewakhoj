"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/chat");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  const supportWhatsApp = "9779800000000"; // Replace with real admin number
  const supportEmail = "support@sewakhoj.com";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-6 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Concierge Support</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active Response Team</p>
            </div>
          </div>
        </div>
        <img src="/logo.png" alt="SewaKhoj" className="w-10 h-10 rounded-xl grayscale opacity-20" />
      </div>
      
      <main className="flex-1 p-8 md:p-12 max-w-4xl mx-auto w-full">
        <div className="bg-blue-600 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden mb-12 shadow-2xl shadow-blue-200">
           <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                 <MessageCircle className="w-8 h-8" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">Chat with our <br/> expert concierge.</h2>
              <p className="text-blue-100 font-bold text-lg max-w-sm">Get instant help with bookings, disputes, or platform guidance.</p>
              
              <div className="pt-8 flex flex-col sm:flex-row gap-4">
                 <a 
                   href={`https://wa.me/${supportWhatsApp}?text=Hi SewaKhoj Support, I need help with...`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="bg-white text-blue-600 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"
                 >
                   Open WhatsApp Chat
                 </a>
                 <a 
                   href={`mailto:${supportEmail}`}
                   className="bg-blue-700 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-3"
                 >
                   Email Support
                 </a>
              </div>
           </div>
           {/* Decorative elements */}
           <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/10 blur-[100px] rounded-full" />
           <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[50%] bg-blue-400/20 blur-[120px] rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 space-y-4">
              <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Operating Hours</h4>
              <p className="text-sm font-bold text-gray-500">Our team is available daily from <span className="text-gray-900">7:00 AM to 9:00 PM</span> (NPT).</p>
           </div>
           <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 space-y-4">
              <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Emergency?</h4>
              <p className="text-sm font-bold text-gray-500">For urgent booking issues, please use the WhatsApp button for priority queueing.</p>
           </div>
        </div>

        <div className="mt-20 text-center border-t border-gray-100 pt-12">
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-4">SewaKhoj Global Platform Hub</p>
           <p className="text-xs font-bold text-gray-400">© 2026 SewaKhoj Marketplace. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
