"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogOut, User, Shield, Search, Settings, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";


export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTasker, setIsTasker] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();

  const isTaskerView = pathname?.startsWith('/dashboard') && isTasker;
  const isPortalView = pathname?.startsWith('/admin');

  useEffect(() => {
    async function checkTasker() {
      if (user) {
        // First check metadata for speed
        if (user.user_metadata?.role === 'tasker') {
          setIsTasker(true);
          return;
        }

        // Fallback to DB check
        const { data } = await supabase.from('taskers').select('id').eq('user_id', user.id).single();
        setIsTasker(!!data);
      } else {
        setIsTasker(false);
      }
    }
    checkTasker();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <nav className={`${isTaskerView || isPortalView ? "bg-slate-900 text-white" : "bg-white/80 backdrop-blur-md"} shadow-sm sticky top-0 z-50 border-b ${isTaskerView || isPortalView ? "border-slate-800" : "border-gray-100"}`} role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side: Logo & Location */}
          <div className="flex items-center gap-6">
            <Link href="/" className="logo flex items-center gap-2 shrink-0">
              <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-10 h-10 rounded-lg object-cover" />
              <div className="hidden sm:block" translate="no">
                <div className={`text-xl font-bold ${isTaskerView || isPortalView ? "text-white" : "text-sewakhoj-red"}`}>SewaKhoj</div>
                <div className={`text-xs ${isTaskerView || isPortalView ? "text-slate-400" : "text-gray-500"}`}>सेवा खोज</div>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex nav-links items-center gap-6">
            <Link href="/" className={`${isTaskerView || isPortalView ? "text-slate-300 hover:text-white" : "text-gray-700 hover:text-sewakhoj-red"} font-medium text-sm transition-colors`}>Home</Link>
            <Link href="/browse" className={`${isTaskerView || isPortalView ? "text-slate-300 hover:text-white" : "text-gray-700 hover:text-sewakhoj-red"} font-medium text-sm transition-colors`}>Services</Link>
            <Link href="/#how-it-works" className={`${isTaskerView || isPortalView ? "text-slate-300 hover:text-white" : "text-gray-700 hover:text-sewakhoj-red"} font-medium text-sm transition-colors`}>How it Works</Link>
          </div>

          {/* Right Side — Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && user ? (
              <>
                <button className={`relative p-2 ${isTaskerView || isPortalView ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-gray-900"} transition-colors`}>
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-sewakhoj-red rounded-full border-2 border-white"></span>
                </button>

                <Link 
                  href={user.id === '337f575f-8f54-4f74-b762-3b22810d4238' ? "/admin" : "/dashboard"} 
                  className={`flex items-center gap-2 ${isTaskerView || isPortalView ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"} transition-all p-1 pr-3 rounded-full border border-transparent`}
                >
                  <div className="w-8 h-8 bg-sewakhoj-red rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="font-bold text-[14px] max-w-[120px] truncate">
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </span>
                </Link>

                <button onClick={handleSignOut} className={`${isTaskerView || isPortalView ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-sewakhoj-red"} transition-colors p-2`} title="Sign Out">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : !loading ? (
              <>
                <Link href="/login" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Login</Link>
                <Link href="/signup" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Sign Up</Link>
              </>
            ) : null}
            
            {!loading && (
              isTasker ? (
                <Link href="/dashboard" className={`${isTaskerView || isPortalView ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-900 text-white hover:bg-black"} px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap shadow-sm`}>
                  Go to Dashboard
                </Link>
              ) : (
                <Link href="/tasker/onboard" className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-sewakhoj-red-light transition-all whitespace-nowrap shadow-sm">
                  Become a Tasker
                </Link>
              )
            )}
          </div>

          {/* Mobile Location & Hamburger */}
          <div className="md:hidden flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <div className="px-4 py-4 space-y-3">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Home / मुख्य पृष्ठ</Link>
            <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Services / सेवाहरू</Link>
            <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">How it Works / कसरी?</Link>
            {!loading && user ? (
              <>
                <Link 
                  href={user.id === '337f575f-8f54-4f74-b762-3b22810d4238' ? "/admin" : "/dashboard"} 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center gap-3 py-3 text-gray-700 border-b border-gray-100"
                >
                  <div className="w-8 h-8 bg-sewakhoj-red rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-sm">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">View Dashboard / ड्यासबोर्ड</span>
                  </div>
                </Link>
                <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-red-600 font-medium">
                  Sign Out / साइन आउट
                </button>
              </>
            ) : !loading ? (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Login / साइन इन</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Sign Up / साइन अप</Link>
              </>
            ) : null}
            {isTasker ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block bg-gray-100 text-gray-700 text-center px-4 py-3 rounded-lg font-bold border border-gray-200">
                Go to My Dashboard / ड्यासबोर्डमा जानुहोस्
              </Link>
            ) : (
              <Link href="/tasker/onboard" onClick={() => setMobileMenuOpen(false)} className="block bg-sewakhoj-red text-white text-center px-4 py-3 rounded-lg font-medium">
                Become a Tasker / साथी बन्नुहोस्
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
