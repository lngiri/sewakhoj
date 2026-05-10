"use client";

import { useState, useEffect } from 'react';
import { Phone, MessageCircle, X, ChevronRight, Headphones, Calendar, ShieldCheck } from 'lucide-react';

export default function ConciergeSupport() {
  const [isOpen, setIsOpen] = useState(false);

  // Lock scroll when panel is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Floating Button — small & non-intrusive */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-[60] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Open support"
        >
          <Headphones className="w-5 h-5" />
        </button>
      )}

      {/* Support Panel — bottom sheet on mobile, positioned panel on desktop */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[90] bg-black/30" onClick={() => setIsOpen(false)} />
          
          {/* Panel */}
          <div className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-4 sm:right-auto sm:w-80 z-[100] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            {/* Header */}
            <div className="p-6 sm:p-8 bg-gray-900 text-white flex items-start justify-between">
              <div>
                <h4 className="text-lg sm:text-xl font-black tracking-tight mb-1">Concierge Support</h4>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">Book a service via phone or chat.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0 -mt-1 -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-2">
              <a 
                href="tel:+9779800000000"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-green-600">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Call to Book</p>
                    <p className="text-sm font-black text-gray-900">+977-9800000000</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
              </a>

              <button 
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">WhatsApp Help</p>
                    <p className="text-sm font-black text-gray-900">Chat with Experts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="p-3 mt-2">
                 <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                   <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                   <p className="text-[10px] font-bold text-blue-800 leading-tight">Support: 6 AM - 10 PM NPT</p>
                 </div>
              </div>
            </div>
            
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-center items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">SewaKhoj Verified</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
