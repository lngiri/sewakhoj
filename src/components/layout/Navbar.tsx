"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, LogOut, User, Shield, Search, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import LocationSelector from "./LocationSelector";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTasker, setIsTasker] = useState<boolean | null>(null);
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  useEffect(() => {
    if (user) {
      supabase.from('taskers').select('id').eq('user_id', user.id).single().then(({ data }) => {
        setIsTasker(!!data);
      });
    } else {
      setIsTasker(false);
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side: Logo & Location */}
          <div className="flex items-center gap-6">
            <Link href="/" className="logo flex items-center gap-2 shrink-0">
              <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-10 h-10 rounded-lg object-cover" />
              <div className="hidden sm:block" translate="no">
                <div className="text-xl font-bold text-sewakhoj-red">SewaKhoj</div>
                <div className="text-xs text-gray-500">सेवा खोज</div>
              </div>
            </Link>
            
            <div className="hidden md:block">
              <LocationSelector />
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex nav-links items-center gap-6">
            <Link href="/browse" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Services</Link>
            <Link href="/#how-it-works" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">How it Works</Link>
          </div>

          {/* Right Side — Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && user ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-700 mr-2">
                  <div className="w-8 h-8 bg-sewakhoj-red rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="font-medium max-w-[120px] truncate">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
                </div>
                <Link href="/dashboard" className="text-gray-600 hover:text-sewakhoj-red text-sm font-bold transition">
                  Dashboard
                </Link>
                <Link href="/settings" className="text-gray-600 hover:text-sewakhoj-red text-sm font-bold flex items-center gap-1 transition">
                  <Settings className="w-4 h-4" /> Settings
                </Link>

                <button onClick={handleSignOut} className="text-gray-500 hover:text-sewakhoj-red text-sm font-medium flex items-center gap-1 ml-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : !loading ? (
              <>
                <Link href="/login" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Login</Link>
                <Link href="/signup" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Sign Up</Link>
              </>
            ) : null}
            {!isTasker && (
              <Link href="/tasker/onboard" className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors whitespace-nowrap">
                Become a Tasker
              </Link>
            )}
          </div>

          {/* Mobile Location & Hamburger */}
          <div className="md:hidden flex items-center gap-4">
            <LocationSelector />
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
            <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Services / सेवाहरू</Link>
            <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">How it Works / कसरी?</Link>
            {!loading && user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-gray-700 border-b border-gray-100">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Dashboard / प्रोफाइल</span>
                </Link>
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-gray-700 border-b border-gray-100">
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">Settings / सेटिङहरू</span>
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
            {!isTasker && (
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
