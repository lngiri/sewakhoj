"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export default function StickyMobileCTA() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // Hide on non-homepage or portal pages
  const isHomepage = pathname === "/";
  const isPortal = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");
  const shouldShow = isHomepage && !isPortal;

  useEffect(() => {
    if (!shouldShow) {
      setVisible(false);
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > 500);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shouldShow]);

  useEffect(() => {
    if (!shouldShow) return;
    if (visible) {
      window.dispatchEvent(new CustomEvent('sticky-cta-visible'));
    }
  }, [visible, shouldShow]);

  if (!visible) return null;

  return (
    <div 
        className="fixed bottom-0 left-0 right-0 z-[55] lg:hidden animate-in slide-in-from-bottom-6 duration-500"
        role="navigation"
        aria-label="Mobile quick actions"
      >
        <div 
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-slate-700 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)] px-4 py-3 safe-area-bottom"
          role="region"
          aria-label="Service quick access"
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            {/* Quick Service Chips */}
            <div 
              className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1"
              role="list"
              aria-label="Popular services"
            >
              {[
                { id: "plumbing", emoji: "🔧", label: "Plumbing" },
                { id: "cleaning", emoji: "🧹", label: "Cleaning" },
                { id: "electrical", emoji: "⚡", label: "Electrical" },
                { id: "tutoring", emoji: "📚", label: "Tutoring" },
                { id: "painting", emoji: "🎨", label: "Painting" },
              ].map((chip) => (
                <Link
                  key={chip.id}
                  href={`/browse?service=${chip.id}`}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 text-lg hover:border-sewakhoj-red hover:bg-red-50 transition-all shrink-0 active:scale-90"
                  aria-label={`Browse ${chip.label} services`}
                  role="listitem"
                  title={chip.label}
                >
                  <span aria-hidden="true">{chip.emoji}</span>
                </Link>
              ))}
            </div>

            {/* Find a Pro CTA */}
            <Link
              href="/browse"
              className="flex items-center gap-2 bg-sewakhoj-red text-white px-5 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-500/20 shrink-0 whitespace-nowrap"
              aria-label="Find a professional tasker"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Find a Pro</span>
              <ArrowRight className="w-3 h-3 opacity-60" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
  );
}
