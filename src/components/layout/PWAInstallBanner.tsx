"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

export default function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    // 1. Detect if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // 2. Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // 3. Handle Android Install Prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after a short delay to be less intrusive
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. For iOS, we have to show instructions manually
    if (/iphone|ipad|ipod/.test(userAgent) && !isStandalone) {
       // Show iOS banner after delay
       setTimeout(() => setShowBanner(true), 5000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[70] animate-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 blur-2xl"></div>
        
        <button 
          onClick={() => setShowBanner(false)}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
             <Smartphone className="w-7 h-7 text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Install SewaKhoj App</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Fast access & real-time updates</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-50 relative z-10">
          {platform === 'ios' ? (
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
                To install: Tap the <span className="inline-flex items-center text-blue-600"><Share className="w-3.5 h-3.5 mx-1" /> share</span> icon and then <span className="text-blue-600 font-black">"Add to Home Screen"</span> <PlusSquare className="inline w-3.5 h-3.5 ml-1" />
              </p>
            </div>
          ) : (
            <button 
              onClick={handleInstallClick}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl shadow-gray-200"
            >
              Add to Home Screen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
