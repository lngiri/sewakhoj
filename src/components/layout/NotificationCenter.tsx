"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Info, MessageSquare, Navigation, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'message' | 'status' | 'alert';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationCenter({ dark }: { dark?: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;

    // 1. Initial Fetch
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setNotifications(data);
    };

    fetchNotifications();

    // 2. Realtime Subscription
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Notification }) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          // Play a subtle notification sound if needed
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'status': return <Navigation className="w-4 h-4 text-green-500" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all ${dark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-sewakhoj-red text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white border border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 z-[110] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest">Alerts</h3>
              <button 
                onClick={markAllRead}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-200">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">No alerts yet. <br /> You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-5 hover:bg-gray-50 transition-colors group cursor-pointer relative ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) window.location.href = n.link;
                      }}
                    >
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${!n.is_read ? 'bg-white' : 'bg-gray-50'}`}>
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                             <h4 className="text-xs font-black text-gray-900 tracking-tight leading-none mb-1">{n.title}</h4>
                             <span className="text-[9px] font-bold text-gray-300 uppercase shrink-0">
                               {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                          <p className="text-[11px] font-medium text-gray-500 leading-relaxed line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                      {!n.is_read && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 text-center">
                <Link href="/dashboard" className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-900 transition-colors">
                  View Full History
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
