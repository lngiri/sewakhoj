"use client";

import { useState, useEffect } from 'react';
import { Phone, MessageCircle, X, ChevronRight, Headphones, Calendar, ShieldCheck } from 'lucide-react';

export default function ConciergeSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-8 left-8 z-[200] font-inter">
      {/* 🔮 Support Bubble */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-16 h-16 rounded-[2rem] bg-gray-900 text-white shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group ${isOpen ? 'rotate-90 bg-red-500' : ''}`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
        
        {/* 💓 Pulse Effect */}
        {showPulse && !isOpen && (
          <div className="absolute inset-0 rounded-[2rem] bg-gray-900 animate-ping opacity-20"></div>
        )}
        
        {/* 🏷️ Label (Desktop) */}
        {!isOpen && (
          <div className="absolute left-20 bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Need help booking?</p>
            <p className="text-xs font-black text-gray-900">Talk to Support</p>
          </div>
        )}
      </button>

      {/* 📱 Support Panel */}
      {isOpen && (
        <div className="absolute bottom-24 left-0 w-80 bg-white rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="p-8 bg-gray-900 text-white">
            <h4 className="text-xl font-black tracking-tight mb-2">Concierge Support</h4>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">Book a service via phone or chat. Our specialists are ready to help you find the right tasker.</p>
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

            <div className="p-4 mt-2">
               <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-[10px] font-bold text-blue-800 leading-tight">Support is active 6 AM - 10 PM. Outside these hours, we will call you back.</p>
               </div>
            </div>
          </div>
          
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-center items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">SewaKhoj Protocol Verified</p>
          </div>
        </div>
      )}
    </div>
  );
}
