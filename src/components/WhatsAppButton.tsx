"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function WhatsAppButton() {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { getWhatsAppLink } = useSiteSettings();

  // Hide on admin/dashboard/portal pages
  const isPortal = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");

  // Show tooltip after 5 seconds on first visit
  useEffect(() => {
    const hasSeen = sessionStorage.getItem("wa_tooltip_shown");
    if (!hasSeen && !isPortal) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        sessionStorage.setItem("wa_tooltip_shown", "true");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPortal]);

  // Auto-hide tooltip after 8 seconds
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  if (isPortal) return null;

  const whatsappUrl = getWhatsAppLink();

  return (
<div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-3000">
      {/* Tooltip / CTA Bubble */}
      {showTooltip && !dismissed && (
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-green-900/10 dark:shadow-green-900/30 border border-green-100 dark:border-green-800 p-4 max-w-[220px] relative">
          <button
            onClick={() => { setShowTooltip(false); setDismissed(true); }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>
          <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 leading-snug mb-1">
            Need help? Chat with us!
          </p>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 leading-snug">
            सहयोग चाहिन्छ? हामीसँग कुरा गर्नुहोस्!
          </p>
        </div>
      )}

      {/* WhatsApp FAB */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group relative w-14 h-14 bg-[#25D366] dark:bg-[#25D366] rounded-full shadow-lg shadow-green-500/30 dark:shadow-green-500/50 flex items-center justify-center hover:scale-110 hover:shadow-xl hover:shadow-green-500/40 active:scale-95 transition-all duration-300"
      >
        {/* WhatsApp SVG Icon */}
        <svg
          className="w-7 h-7 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>

        {/* Pulse animation ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
      </a>
    </div>
  );
}
