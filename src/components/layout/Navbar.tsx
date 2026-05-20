"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, LogOut, MapPin, ChevronDown, ChevronRight, Globe } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { supabase } from "@/lib/supabase";
import { useLocale, useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";

import NotificationCenter from "./NotificationCenter";

// Module-level cache for isTasker check — avoids DB query on every navigation
let cachedIsTasker: { userId: string; value: boolean; ts: number } | null = null;
const TASKER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTasker, setIsTasker] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();
  const { location, isLocationSet, setShowModal } = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  const locale = useLocale();
  const tnav = useTranslations("nav");

  const switchLocale = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    async function checkTasker() {
      if (!user) {
        setIsTasker(false);
        return;
      }
      // Use cache if valid
      if (cachedIsTasker && cachedIsTasker.userId === user.id && (Date.now() - cachedIsTasker.ts) < TASKER_CACHE_TTL) {
        setIsTasker(cachedIsTasker.value);
        return;
      }
      const { data } = await supabase.from('taskers').select('status').eq('user_id', user.id).maybeSingle();
      const value = !!data; // True if they have a tasker profile, regardless of status
      cachedIsTasker = { userId: user.id, value, ts: Date.now() };
      setIsTasker(value);
    }
    checkTasker();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Hide navbar on dashboard and admin pages
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) return null;

  // Only show location banner on service-discovery pages
  const showLocationBanner = pathname === '/' || pathname?.startsWith('/services') || pathname?.startsWith('/browse');

  // Nav link definitions
  const navLinks = [
    { href: "/", key: "home" },
    { href: "/services", key: "services" },
    { href: "/browse", key: "findAPro" },
    { href: "/about", key: "about" },
    { href: "/faq", key: "faq" },
    { href: "/contact", key: "contact" },
  ];

  const isActiveLink = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <>
      {/* Backdrop for Mobile Menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40] lg:hidden animate-in fade-in duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <nav className={`bg-white/95 backdrop-blur-xl ${isScrolled ? "shadow-lg shadow-black/5" : ""} sticky top-0 z-50 border-b border-gray-100/80 transition-all duration-300`} role="navigation" aria-label={tnav("mainNavigation")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-[60]">
        <div className="flex justify-between items-center h-[60px]">
          {/* Left Side: Logo */}
          <div className="flex items-center gap-5">
            <Link href="/" className="logo flex items-center gap-2.5 shrink-0 group">
              <Image src="/logo.png" alt={`${siteConfig.name} Logo`} width={36} height={36} className="w-9 h-9 rounded-xl object-cover shadow-sm group-hover:shadow-md transition-shadow" />
              <div className="hidden sm:block" translate="no">
                <div className="text-lg font-extrabold tracking-tight text-gray-900">{siteConfig.name}</div>
                <div className="text-[10px] font-medium -mt-0.5 text-gray-400">सेवा खोज</div>
              </div>
            </Link>

            {/* Location Pill — compact, desktop only */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-[13px] font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/60"
              >
                <MapPin className="w-3.5 h-3.5 text-sewakhoj-red shrink-0" />
                <span className="max-w-[100px] truncate">
                  {isLocationSet ? location?.name : tnav("location")}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            </div>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden lg:flex nav-links items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                  isActiveLink(link.href)
                    ? "text-sewakhoj-red bg-red-50/80"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {tnav(link.key)}
              </Link>
            ))}
          </div>

          {/* Right Side — Desktop */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Language Switcher */}
            <button
              onClick={() => switchLocale(locale === "ne" ? "en" : "ne")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all"
              title={locale === "ne" ? tnav("switchEnglish") : tnav("switchNepali")}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{locale === "ne" ? tnav("switchEnglish") : tnav("switchNepali")}</span>
            </button>

            {!loading && user ? (
              <>
                <NotificationCenter dark={false} />

                <Link
                  href={user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'super_admin' ? "/admin" : "/dashboard"} 
                  className="flex items-center gap-2 text-gray-700 hover:bg-gray-50 transition-all p-1 pr-3 rounded-full"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-sewakhoj-red text-white text-[11px] font-bold">
                    {user.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = user.email?.[0]?.toUpperCase() || 'U'; }}
                      />
                    ) : (
                      user.email?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <span className="font-bold text-[13px] max-w-[100px] truncate">
                    {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split("@")[0]}
                  </span>
                </Link>

                <button onClick={handleSignOut} className="text-gray-300 hover:text-sewakhoj-red transition-colors p-1.5 rounded-lg hover:bg-gray-50" title={tnav("signOut")}>
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : !loading ? (
              <>
                <Link href="/login" className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all">{tnav("login")}</Link>
                <Link href="/signup" className="px-4 py-2 rounded-xl text-[13px] font-bold bg-sewakhoj-red text-white hover:bg-red-700 active:scale-[0.97] transition-all whitespace-nowrap shadow-sm shadow-red-500/20">{tnav("signup")}</Link>
              </>
            ) : null}
            
            {!loading && (
              isTasker ? (
                <Link href="/dashboard" className="bg-gray-900 text-white hover:bg-black px-4 py-2 rounded-xl text-[13px] font-bold active:scale-[0.97] transition-all whitespace-nowrap shadow-sm">
                  {tnav("goToDashboard")}
                </Link>
              ) : (
                <div className="flex gap-1.5 ml-1">
                  <Link href="/post-task" className="border border-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-[13px] font-bold hover:bg-gray-50 hover:border-gray-300 active:scale-[0.97] transition-all whitespace-nowrap">
                    {tnav("postTask")}
                  </Link>
                  <Link href="/tasker/landing" className="bg-sewakhoj-red text-white px-3.5 py-2 rounded-xl text-[13px] font-bold hover:bg-red-700 active:scale-[0.97] transition-all whitespace-nowrap shadow-sm shadow-red-500/20">
                    {tnav("becomeTasker")}
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile: Notification + Hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            {!loading && user && (
              <NotificationCenter dark={false} />
            )}
            <button 
              className="p-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-all" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              aria-label={mobileMenuOpen ? tnav("closeMenu") : tnav("openMenu")}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Location Sticky Banner — only on service-discovery pages */}
      {showLocationBanner && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-100/80 py-2 px-4 animate-in slide-in-from-top duration-500 shadow-sm shadow-black/5">
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-gray-50/50 rounded-2xl hover:bg-gray-100 transition-all border border-gray-100/50 group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-sewakhoj-red/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-sewakhoj-red" />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">{tnav("serviceLocation")}</p>
                <p className="text-[12px] font-bold text-gray-900 truncate">
                  {isLocationSet ? location?.name : tnav("setLocation")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-black text-sewakhoj-red uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg border border-red-100">{tnav("change")}</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Menu Dropdown */}
      <div className={`lg:hidden bg-white border-t transition-all duration-300 ease-in-out relative z-[50] overflow-hidden ${mobileMenuOpen ? "max-h-[1200px] opacity-100 shadow-2xl" : "max-h-0 opacity-0"}`}>
        <div className="px-5 py-5 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex flex-col py-3 px-4 rounded-2xl transition-all ${
                isActiveLink(link.href) 
                  ? "text-sewakhoj-red bg-red-50/60" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-[14px] font-black tracking-tight">{tnav(link.key)}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{tnav(`${link.key}Np`)}</span>
            </Link>
          ))}

          {/* Mobile Language Switcher */}
          <div className="pt-2">
            <button
              onClick={() => switchLocale(locale === "ne" ? "en" : "ne")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all border border-gray-100"
            >
              <Globe className="w-4 h-4" />
              <span>{locale === "ne" ? tnav("switchEnglish") : tnav("switchNepali")}</span>
            </button>
          </div>

          <div className="pt-3 mt-2 border-t border-gray-100 space-y-2">
            {!loading && user ? (
              <>
                <Link 
                  href={user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'super_admin' ? "/admin" : "/dashboard"} 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-sewakhoj-red text-white text-xs font-bold shadow-sm">
                    {user.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = user.email?.[0]?.toUpperCase() || 'U'; }}
                      />
                    ) : (
                      user.email?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[14px] text-gray-900">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{tnav("viewDashboard")}</span>
                  </div>
                </Link>
                <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="w-full text-left py-2.5 px-3 text-red-500 font-semibold text-[13px] rounded-xl hover:bg-red-50 transition-all">
                  {tnav("signOut")}
                </button>
              </>
            ) : !loading ? (
              <div className="flex gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-3 text-gray-700 font-bold text-[13px] rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">{tnav("login")}</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-3 bg-sewakhoj-red text-white font-bold text-[13px] rounded-xl hover:bg-red-700 transition-all">{tnav("signup")}</Link>
              </div>
            ) : null}
          </div>

          <div className="pt-3 space-y-2">
            {isTasker ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block bg-gray-900 text-white text-center px-4 py-3.5 rounded-xl font-bold text-[13px] active:scale-[0.97] transition-all shadow-sm">
                {tnav("goToDashboard")}
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link href="/post-task" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold text-[13px] hover:bg-gray-50 active:scale-[0.97] transition-all">
                  {tnav("postTask")}
                </Link>
                <Link href="/tasker/landing" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center bg-sewakhoj-red text-white px-4 py-3 rounded-xl font-bold text-[13px] hover:bg-red-700 active:scale-[0.97] transition-all shadow-sm shadow-red-500/20">
                  {tnav("becomeTasker")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}

// Unread message badge hook
export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const channelIdRef = useRef(0); // ✅ Moved to top level — Rules of Hooks compliant
  
  useEffect(() => {
    if (!user?.id) return;
    
    let isMounted = true;
    let channelRef: any = null;
    
    channelIdRef.current += 1;
    const currentChannelId = channelIdRef.current;
    
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .is('read_at', null);
      
      if (isMounted) setUnreadCount(count || 0);
    };
    
    fetchUnread();
    
    channelRef = supabase
      .channel(`unread-msgs-${user.id}-${Math.random().toString(36).substring(2, 10)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload: any) => {
          if (currentChannelId === channelIdRef.current && isMounted) {
            setUnreadCount(c => c + 1);
          }
        }
      )
      .subscribe();
    
    return () => {
      isMounted = false;
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [user?.id]);
  
  return unreadCount;
}
