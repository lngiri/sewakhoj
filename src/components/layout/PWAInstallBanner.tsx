"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

export default function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    // 1. Detect if already installed or dismissed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = localStorage.getItem('pwa_install_dismissed');
    if (isStandalone || isDismissed) return;

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
      if (!isDismissed && !isStandalone) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    };

    const handleManualTrigger = () => {
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('trigger-pwa-install', handleManualTrigger);

    // 4. For iOS, we have to show instructions manually
    if (/iphone|ipad|ipod/.test(userAgent) && !isStandalone && !isDismissed) {
       // Show iOS banner after delay
       setTimeout(() => setShowBanner(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('trigger-pwa-install', handleManualTrigger);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    // Persist dismissal for 7 days (simplified as flag for now)
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      // For iOS, they just follow instructions on screen
      return;
    }
    
    if (!deferredPrompt) {
      alert("Please use the browser menu to install, or try again later.");
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('pwa_install_dismissed', 'accepted');
    }
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-8 sm:w-[380px] z-[70] animate-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 border-2 border-blue-50/50 p-6 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-gradient-to-br from-blue-50 to-red-50 rounded-full opacity-70 blur-2xl"></div>
        
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-50 rounded-full z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-gray-900 to-gray-800 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-gray-900/20 border border-gray-700">
             <Smartphone className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1 pr-6">
            <h3 className="text-[15px] font-black text-gray-900 tracking-tight leading-none mb-1">Install SewaKhoj App</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">Fast access • Offline mode</p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-50 relative z-10">
          {platform === 'ios' ? (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
                To install: Tap the <span className="inline-flex items-center text-blue-600 bg-blue-50 px-1 rounded"><Share className="w-3.5 h-3.5 mx-0.5" /> share</span> icon, then select <span className="text-gray-900 font-black">"Add to Home Screen"</span> <PlusSquare className="inline w-3.5 h-3.5 ml-0.5" />
              </p>
            </div>
          ) : (
            <button 
              onClick={handleInstallClick}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
