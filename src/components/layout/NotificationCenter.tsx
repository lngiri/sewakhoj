"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Info, MessageSquare, Navigation, AlertTriangle, X, BellRing, BellOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const messageChannelRef = useRef<any>(null);
  const channelIdRef = useRef(0);
  const messageChannelIdRef = useRef(0);
  const push = usePushNotifications(user?.id);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const totalUnread = unreadCount + unreadMessageCount;

  // Show push prompt when dropdown opens and push is supported but not subscribed
  useEffect(() => {
    const isDismissed = localStorage.getItem('sewakhoj_push_dismissed');
    if (isOpen && push.isSupported && push.isConfigured && !push.isSubscribed && !push.isDenied && !isDismissed) {
      setShowPushPrompt(true);
    }
  }, [isOpen, push.isSupported, push.isSubscribed, push.isDenied, push.isConfigured]);

  const handleEnablePush = async () => {
    const success = await push.subscribe();
    if (success) {
      setShowPushPrompt(false);
    } else {
      // If it failed (e.g., permissions denied), hide it anyway
      setShowPushPrompt(false);
      localStorage.setItem('sewakhoj_push_dismissed', 'true');
    }
  };

  const handleDismissPush = () => {
    setShowPushPrompt(false);
    localStorage.setItem('sewakhoj_push_dismissed', 'true');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    channelIdRef.current += 1;
    const currentChannelId = channelIdRef.current;

    const fetchNotifications = async () => {
      try {
        const isAdmin = user.user_metadata?.role === 'admin';
        let data: Notification[] = [];
        let error: any = null;

        if (isAdmin) {
          const [userNotifs, roleNotifs] = await Promise.all([
            supabase
              .from('notifications')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(10),
            supabase
              .from('notifications')
              .select('*')
              .eq('target_role', 'admin')
              .order('created_at', { ascending: false })
              .limit(10)
          ]);

          if (userNotifs.error) error = userNotifs.error;
          else if (roleNotifs.error) error = roleNotifs.error;

          data = [...(userNotifs.data || []), ...(roleNotifs.data || [])] as any;
          data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          data = data.slice(0, 10);
        } else {
          const res = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          data = (res.data || []) as any;
          error = res.error;
        }

        if (isMounted && data && currentChannelId === channelIdRef.current) {
          setNotifications(data);
        }
        if (error) console.error("Error fetching notifications:", error);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const uniqueId = Math.random().toString(36).substring(2, 10);
    const channelName = `notifications-${user.id}-${uniqueId}`;
    const isAdmin = user.user_metadata?.role === 'admin';
    const newChannel = supabase.channel(channelName);

    newChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Notification }) => {
          if (isMounted && currentChannelId === channelIdRef.current) {
            setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          }
        }
      );

    if (isAdmin) {
      newChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `target_role=eq.admin`,
        },
        (payload: { new: Notification }) => {
          if (isMounted && currentChannelId === channelIdRef.current) {
            setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          }
        }
      );
    }

    newChannel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED' && currentChannelId === channelIdRef.current) {
        console.log(`Realtime: Subscribed to notifications ${isAdmin ? '(Admin Mode)' : ''}`);
      }
    });

    channelRef.current = newChannel;

    fetchNotifications();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    setNotifications([]);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    messageChannelIdRef.current += 1;
    const currentChannelId = messageChannelIdRef.current;

    const fetchUnreadMessages = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (isMounted && currentChannelId === messageChannelIdRef.current) {
        setUnreadMessageCount(count || 0);
      }
    };

    fetchUnreadMessages();

    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
    }

    const uniqueId = Math.random().toString(36).substring(2, 10);
    const channelName = `msg-unread-${user.id}-${uniqueId}`;
    const msgChannel = supabase.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (isMounted && currentChannelId === messageChannelIdRef.current) {
            setUnreadMessageCount(c => c + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (isMounted && payload.new.read_at && payload.old.read_at !== payload.new.read_at && currentChannelId === messageChannelIdRef.current) {
            setUnreadMessageCount(c => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    messageChannelRef.current = msgChannel;

    return () => {
      isMounted = false;
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
  }, [user?.id]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'status': return <Navigation className="w-4 h-4 text-green-500" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all ${dark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-gray-500 hover:text-gray-900 hover:bg-sewakhoj-red/5"}`}
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-sewakhoj-red text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-white shadow-sm shadow-red-500/30">
            {totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-x-0 top-[60px] mx-2 sm:mx-0 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(200,16,46,0.08)] border border-gray-100 z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-sewakhoj-red/[0.03]">
              <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest">Notifications</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearAll}
                  className="text-[10px] font-black text-sewakhoj-red uppercase tracking-widest hover:text-red-700 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto custom-scrollbar">
              {/* Push Notification Enable Prompt */}
              {showPushPrompt && (
                <div className="p-4 bg-gradient-to-r from-sewakhoj-red/5 to-amber-50 border-b border-red-50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-sewakhoj-red/10 rounded-xl flex items-center justify-center shrink-0">
                      <BellRing className="w-5 h-5 text-sewakhoj-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-gray-900 mb-1">Stay Updated</h4>
                      <p className="text-[11px] font-medium text-gray-500 leading-relaxed mb-3">
                        Get instant alerts when your booking is accepted, when you receive messages, and more.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEnablePush}
                          disabled={push.isLoading}
                          className="bg-sewakhoj-red text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {push.isLoading ? "Enabling..." : "Enable"}
                        </button>
                        <button
                          onClick={handleDismissPush}
                          className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors px-3 py-2"
                        >
                          Not Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {notifications.length === 0 && !showPushPrompt ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-200">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">No alerts yet. <br /> You&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 sm:p-5 hover:bg-gray-50 transition-colors group cursor-pointer relative ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) window.location.href = n.link;
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex gap-3 sm:gap-4">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${!n.is_read ? 'bg-white' : 'bg-gray-50'}`}>
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-black text-gray-900 tracking-tight leading-tight mb-1 truncate">{n.title}</h4>
                            <span className="text-[10px] font-bold text-gray-300 uppercase shrink-0">
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
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-gray-900 transition-colors"
                >
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
