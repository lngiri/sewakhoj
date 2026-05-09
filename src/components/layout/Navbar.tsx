"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogOut, User, Shield, Search, Settings, Bell, MapPin, ChevronDown, Smartphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { supabase } from "@/lib/supabase";

import NotificationCenter from "./NotificationCenter";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTasker, setIsTasker] = useState<boolean | null>(null);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();
  const { location, isLocationSet, setShowModal } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTaskerView = pathname?.startsWith('/dashboard') && isTasker;
  const isPortalView = pathname?.startsWith('/admin');

  useEffect(() => {
    const checkStandalone = () => {
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    };
    checkStandalone();
  }, []);

  useEffect(() => {
    async function checkTasker() {
      if (user) {
        // Fallback to DB check for actual status
        const { data } = await supabase.from('taskers').select('status').eq('user_id', user.id).maybeSingle();
        // Only consider them a "Tasker" in the UI if they are active
        // This keeps "Become a Tasker" visible if they are pending or rejected
        setIsTasker(data?.status === 'active');
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
    <nav className={`${isTaskerView || isPortalView ? "bg-slate-900 text-white" : "bg-white/95 backdrop-blur-xl"} ${isScrolled ? "shadow-lg shadow-black/5" : ""} sticky top-0 z-50 border-b ${isTaskerView || isPortalView ? "border-slate-800" : "border-gray-100/80"} transition-all duration-300`} role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[60px]">
          {/* Left Side: Logo */}
          <div className="flex items-center gap-5">
            <Link href="/" className="logo flex items-center gap-2.5 shrink-0 group">
              <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-9 h-9 rounded-xl object-cover shadow-sm group-hover:shadow-md transition-shadow" />
              <div className="hidden sm:block" translate="no">
                <div className={`text-lg font-extrabold tracking-tight ${isTaskerView || isPortalView ? "text-white" : "text-gray-900"}`}>SewaKhoj</div>
                <div className={`text-[10px] font-medium -mt-0.5 ${isTaskerView || isPortalView ? "text-slate-500" : "text-gray-400"}`}>सेवा खोज</div>
              </div>
            </Link>

            {/* Location Pill — compact */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-[13px] font-semibold ${
                  isLocationSet
                    ? `${isTaskerView || isPortalView ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/60"}`
                    : `${isTaskerView || isPortalView ? "bg-slate-800/50 text-slate-400 hover:bg-slate-700" : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200/60"}`
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-sewakhoj-red shrink-0" />
                <span className="max-w-[100px] truncate">
                  {isLocationSet ? location?.name : "Location"}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </div>
          </div>

          {/* Center: Desktop Nav Links — streamlined */}
          <div className="hidden lg:flex nav-links items-center gap-1">
            {[
              { href: "/", label: "Home" },
              { href: "/services", label: "Services" },
              { href: "/browse", label: "Find a Pro" },
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
            ].map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                    isActive
                      ? isTaskerView || isPortalView
                        ? "text-white bg-slate-800"
                        : "text-sewakhoj-red bg-red-50/80"
                      : isTaskerView || isPortalView
                        ? "text-slate-400 hover:text-white hover:bg-slate-800"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side — Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            {!loading && user ? (
              <>
                {!isPortalView && (
                  <NotificationCenter dark={isTaskerView || isPortalView} />
                )}

                <Link
                  href={user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'super_admin' ? "/admin" : "/dashboard"} 
                  className={`flex items-center gap-2 ${isTaskerView || isPortalView ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"} transition-all p-1 pr-3 rounded-full`}
                >
                  <div className="w-7 h-7 bg-sewakhoj-red rounded-full flex items-center justify-center text-white text-[11px] font-bold">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="font-bold text-[13px] max-w-[100px] truncate">
                    {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split("@")[0]}
                  </span>
                </Link>

                <button onClick={handleSignOut} className={`${isTaskerView || isPortalView ? "text-slate-500 hover:text-white" : "text-gray-300 hover:text-sewakhoj-red"} transition-colors p-1.5 rounded-lg hover:bg-gray-50`} title="Sign Out">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : !loading ? (
              <>
                <Link href="/login" className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold ${isTaskerView || isPortalView ? "text-slate-300 hover:text-white" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"} transition-all`}>Log in</Link>
                <Link href="/signup" className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold ${isTaskerView || isPortalView ? "text-slate-300 hover:text-white" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"} transition-all`}>Sign up</Link>
              </>
            ) : null}
            
            {!loading && (
              isTasker ? (
                <Link href="/dashboard" className={`${isTaskerView || isPortalView ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-gray-900 text-white hover:bg-black"} px-4 py-2 rounded-xl text-[13px] font-bold active:scale-[0.97] transition-all whitespace-nowrap shadow-sm`}>
                  Dashboard
                </Link>
              ) : (
                <div className="flex gap-1.5 ml-1">
                  <Link href="/post-task" className="border border-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-[13px] font-bold hover:bg-gray-50 hover:border-gray-300 active:scale-[0.97] transition-all whitespace-nowrap">
                    Post a Task
                  </Link>
                  <Link href="/tasker/onboard" className="bg-sewakhoj-red text-white px-3.5 py-2 rounded-xl text-[13px] font-bold hover:bg-red-700 active:scale-[0.97] transition-all whitespace-nowrap shadow-sm shadow-red-500/20 animate-pulse-subtle">
                    Become a Tasker
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile: Notification + Hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            {!loading && user && !isPortalView && (
              <NotificationCenter dark={isTaskerView || isPortalView} />
            )}
            <button className={`p-2 rounded-xl ${isTaskerView || isPortalView ? "hover:bg-slate-800" : "hover:bg-gray-100"} active:scale-95 transition-all`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`lg:hidden bg-white border-t transition-all duration-300 ease-in-out ${mobileMenuOpen ? "max-h-[600px] opacity-100 shadow-xl shadow-black/5" : "max-h-0 opacity-0 overflow-hidden"}`}>
        <div className="px-5 py-5 space-y-1">
          {/* Location for mobile */}
          <button
            onClick={() => { setShowModal(true); setMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 py-3 px-4 mb-3 bg-gray-50 rounded-xl text-left"
          >
            <MapPin className="w-4 h-4 text-sewakhoj-red" />
            <div>
              <div className="text-[13px] font-bold text-gray-900">{isLocationSet ? location?.name : "Set your location"}</div>
              <div className="text-[10px] text-gray-400 font-semibold">Tap to change location</div>
            </div>
          </button>

          {[
            { href: "/", label: "Home", labelNp: "मुख्य पृष्ठ" },
            { href: "/services", label: "Services", labelNp: "सेवाहरू" },
            { href: "/browse", label: "Find a Pro", labelNp: "प्रो खोज्नुहोस्" },
            { href: "/about", label: "About", labelNp: "हाम्रो बारेमा" },
            { href: "/contact", label: "Contact", labelNp: "सम्पर्क" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex flex-col py-3 px-4 rounded-xl transition-all ${
                pathname === link.href ? "text-sewakhoj-red bg-red-50/60" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-[15px] font-bold">{link.label}</span>
              <span className="text-[11px] text-gray-400 font-medium -mt-0.5">{link.labelNp}</span>
            </Link>
          ))}

          <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
            {!loading && user ? (
              <>
                <Link 
                  href={user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'super_admin' ? "/admin" : "/dashboard"} 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <div className="w-9 h-9 bg-sewakhoj-red rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[14px] text-gray-900">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">View Dashboard</span>
                  </div>
                </Link>
                <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="w-full text-left py-2.5 px-3 text-red-500 font-semibold text-[13px] rounded-xl hover:bg-red-50 transition-all">
                  Sign Out
                </button>
              </>
            ) : !loading ? (
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-3 text-gray-700 font-bold text-[13px] rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">Log in</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-3 bg-gray-900 text-white font-bold text-[13px] rounded-xl hover:bg-black transition-all">Sign up</Link>
              </div>
            ) : null}
          </div>

          <div className="pt-3 space-y-2">
            {isTasker ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block bg-gray-900 text-white text-center px-4 py-3.5 rounded-xl font-bold text-[13px] active:scale-[0.97] transition-all shadow-sm">
                Go to Dashboard
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link href="/post-task" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold text-[13px] hover:bg-gray-50 active:scale-[0.97] transition-all">
                  Post a Task
                </Link>
                <Link href="/tasker/onboard" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center bg-sewakhoj-red text-white px-4 py-3 rounded-xl font-bold text-[13px] hover:bg-red-700 active:scale-[0.97] transition-all shadow-sm shadow-red-500/20">
                  Become a Tasker
                </Link>
              </div>
            )}

            {!isStandalone && (
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-gray-200 text-gray-400 font-semibold text-[12px] hover:bg-gray-50 transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
