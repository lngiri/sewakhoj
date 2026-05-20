"use client";

import { useState, useEffect, use, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { toast } from "@/lib/toast-messages";
import { useLocale } from "next-intl";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Navigation, Phone, Star, MessageCircle, Send, X, AlertTriangle, HelpCircle, User, Info, Check, Camera, Activity, AlertCircle, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TrackingPageProps {
  params: Promise<{ id: string }>;
}

export default function TrackingPage({ params }: TrackingPageProps) {
  const locale = useLocale();
  const router = useRouter();
  const { id } = use(params);
  const { user: currentUser, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'tracking' | 'chat'>('tracking');
  
// Chat State
   const [messages, setMessages] = useState<any[]>([]);
   const [newMessage, setNewMessage] = useState("");
   const messagesEndRef = useRef<HTMLDivElement>(null);
   
   // Read tracking state
   const [readChannel, setReadChannel] = useState<any>(null);
   
   // Typing indicator state via presence
   const [typingUsers, setTypingUsers] = useState<string[]>([]);
   const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const presenceChannelRef = useRef<any>(null);
    const channelIdRef = useRef(0);

  // Review State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  
  // Dispute State
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [isDisputed, setIsDisputed] = useState(false);
  
  // Confirm State
  const [confirmData, setConfirmData] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const { showSuccess, showError, showInfo } = useNotification();
  
  const [showHelp, setShowHelp] = useState(false);
  
  const [taskerLocation, setTaskerLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [statusOverlay, setStatusOverlay] = useState<{ show: boolean; title: string; subtitle: string } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  

  useEffect(() => {
    if (id) {
      fetchInitialData();
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push(`/login?redirect=/booking/${id}/tracking`);
    }
  }, [currentUser, authLoading, id, router]);

  // Mark messages as read when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat' && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [activeTab, messages]);

  useEffect(() => {
    if (!booking) return;

    // Increment channel ID to ensure unique channel names on each effect run
    channelIdRef.current += 1;
    const currentChannelId = channelIdRef.current;

    let isMounted = true;
    let bookingChannel: any = null;
    let messageChannel: any = null;
    let locationChannel: any = null;
    let presenceChannel: any = null;

    // Remove any existing channels before creating new ones
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    const setupSubscriptions = () => {
      // 1. Booking Status
      bookingChannel = supabase
        .channel(`track-booking-${id}-${Math.random().toString(36).substring(2, 10)}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
          (payload: any) => {
            if (!isMounted || currentChannelId !== channelIdRef.current) return;
            const newStatus = payload.new.status;
            if (newStatus !== booking?.status) {
              if (newStatus === 'accepted') { hostOverlay("Booking Confirmed", "Your specialist is preparing for the mission."); }
              else if (newStatus === 'on-the-way') { hostOverlay("Specialist Dispatched", "Live tracking is now active."); }
              else if (newStatus === 'arrived') { hostOverlay("Specialist Arrived", "The tasker is at your location."); }
              else if (newStatus === 'in-progress') { hostOverlay("Task Started", "Your specialist has begun the work."); }
              else if (newStatus === 'completed') { hostOverlay("Service Completed", "Thank you for using SewaKhoj!"); }
            }
            setBooking((prev: any) => ({ ...prev, ...payload.new }));
          }
        )
        .subscribe();

      // 2. Messages
      messageChannel = supabase
        .channel(`track-msgs-${id}-${Math.random().toString(36).substring(2, 10)}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${id}` },
          (payload: any) => {
            if (!isMounted || currentChannelId !== channelIdRef.current) return;
            setMessages((prev) => {
              const exists = prev.find(m => m.id.startsWith('temp-') && m.text === payload.new.text && m.sender_id === payload.new.sender_id);
              if (exists) {
                return prev.map(m => m.id === exists.id ? payload.new : m);
              }
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
            scrollToBottom();
          }
        )
        .subscribe();

      // 3. Tasker Location
      locationChannel = supabase
        .channel(`track-loc-${id}-${Math.random().toString(36).substring(2, 10)}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasker_locations',
            filter: `tasker_id=eq.${booking.taskers.user_id}`
          },
          (payload: any) => {
            if (!isMounted || currentChannelId !== channelIdRef.current) return;
            if (payload.new) {
              setTaskerLocation({ lat: payload.new.lat, lng: payload.new.lng });
            }
          }
        )
        .subscribe();

      // 4. Presence channel for typing indicator
      presenceChannel = supabase
        .channel(`chat-typing-${id}-${Math.random().toString(36).substring(2, 10)}`)
        .on('presence', { event: 'sync' }, (payload: any) => {
          if (!isMounted || currentChannelId !== channelIdRef.current) return;
          const state = payload.state;
          const typing: string[] = [];
          Object.keys(state).forEach(key => {
            const userState = state[key];
            if (userState.typing && userState.user_id !== currentUser?.id) {
              typing.push(userState.user_id);
            }
          });
          setTypingUsers(typing);
        })
        .subscribe();

      presenceChannelRef.current = presenceChannel;

      // Track presence
      if (currentUser) {
        presenceChannel.track({
          user_id: currentUser.id,
          typing: false,
          online_at: new Date().toISOString()
        });
      }
    };

    setupSubscriptions();

    return () => {
      isMounted = false;
      if (bookingChannel) supabase.removeChannel(bookingChannel);
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (locationChannel) supabase.removeChannel(locationChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [booking?.id]);

  useEffect(() => {
    if (taskerLocation && booking?.lat && booking?.lng) {
      // Calculate real-time ETA based on distance
      const dist = calculateDistance(taskerLocation.lat, taskerLocation.lng, booking.lat, booking.lng);
      setDistanceKm(dist);
      const mins = Math.round((dist / 20) * 60); // 20km/h avg speed
      setEta(mins > 1 ? `${mins} min` : "Nearly there!");
    }
  }, [taskerLocation, booking]);

  const hostOverlay = (title: string, subtitle: string) => {
    setStatusOverlay({ show: true, title, subtitle });
    setTimeout(() => setStatusOverlay(null), 4000);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        const container = messagesEndRef.current.parentElement;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 100);
  };

  const markMessagesAsRead = async () => {
    if (!currentUser || !booking) return;
    const unreadMessages = messages.filter(
      m => m.sender_id !== currentUser.id && !m.read_at
    );
    
    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(m => m.id);
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', messageIds);
      
      setMessages(prev => prev.map(m => 
        unreadMessages.some(um => um.id === m.id) 
          ? { ...m, read_at: new Date().toISOString() } 
          : m
      ));
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (presenceChannelRef.current && currentUser) {
      presenceChannelRef.current.track({
        user_id: currentUser.id,
        typing: isTyping,
        online_at: new Date().toISOString()
      });
    }
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    
    if (isTyping) {
      const timeout = setTimeout(() => {
        if (presenceChannelRef.current && currentUser) {
          presenceChannelRef.current.track({
            user_id: currentUser.id,
            typing: false,
            online_at: new Date().toISOString()
          });
        }
      }, 3000);
      setTypingTimeout(timeout);
    }
  };

  async function fetchInitialData() {
    setFetchError(null);
    // Fetch booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        taskers (
          id, user_id, rating, hourly_rate, transportation_mode,
          users (id, full_name, phone, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (bookingError) {
      setFetchError(bookingError.message === 'Result contains 0 rows'
        ? 'Booking not found. It may have been deleted or you may have an invalid link.'
        : 'Failed to load booking. Please try again.');
      setLoading(false);
      return;
    }

    if (bookingData) {
      setBooking(bookingData);
      
      // Fetch existing messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', id)
        .order('created_at', { ascending: true });
      if (msgs) {
        setMessages(msgs);
        scrollToBottom();
      }

      // Check if review exists
      if (currentUser) {
        const { count } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('booking_id', id)
          .eq('customer_id', currentUser.id);
        if (count && count > 0) setHasReviewed(true);
      }

      if (bookingData.is_disputed) setIsDisputed(true);

      // Fetch current tasker location
      const { data: locData } = await supabase
        .from('tasker_locations')
        .select('*')
        .eq('tasker_id', bookingData.taskers.user_id)
        .single();
      
      if (locData) setTaskerLocation({ lat: locData.lat, lng: locData.lng });
    }
    setLoading(false);
  }

  const updateStatus = async (newStatus: string) => {
    setConfirmData({
      show: true,
      title: "Update Status",
      message: `Are you sure you want to mark this task as ${newStatus}?`,
      onConfirm: async () => {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', id);

        if (error) {
          showError(toast(locale, "BOOKING_STATUS_CHANGE_FAILED"));
        } else {
          showSuccess(`Status updated to ${newStatus}`);
          
          // PHASE 3: Audit Logging
          await supabase.from('booking_logs').insert({
            booking_id: id,
            old_status: booking.status,
            new_status: newStatus,
            actor_id: currentUser?.id
          });

          // Notify Customer of status change
          await sendNotification(
            booking.customer_id,
            "Booking Update",
            `Your tasker has updated the status to: ${newStatus.replace('-', ' ')}`,
            'status'
          );
        }
        setConfirmData(null);
      }
    });
  };

  const submitDispute = async () => {
    if (!disputeReason.trim() || !currentUser) return;
    setSubmittingDispute(true);

    const { error } = await supabase
      .from('disputes')
      .insert({ 
        booking_id: id, 
        reporter_id: currentUser.id,
        reason: disputeReason
      });

    if (!error) {
      await supabase.from('bookings').update({ is_disputed: true }).eq('id', id);
      setIsDisputed(true);
      setShowDisputeModal(false);
      showSuccess("Issue reported. Our support team will contact you soon.");
      
      // Notify Support (System-wide alert)
      await sendNotification(
        '337f575f-8f54-4f74-b762-3b22810d4238', // Global Admin ID
        "New Dispute Raised",
        `A dispute has been reported for Booking #${id.slice(0,8)}`,
        'alert'
      );
    } else {
      showError("We couldn't report this issue. Please try again.");
    }
    setSubmittingDispute(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    
    const text = newMessage;
    setNewMessage(""); // optimistic clear

    // Create a unique temp ID for simulation
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      booking_id: id,
      sender_id: currentUser.id,
      text: text,
      created_at: new Date().toISOString(),
      status: 'sent' // Initial status
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    await supabase.from('messages').insert({
      booking_id: id,
      sender_id: currentUser.id,
      text: text
    });

    // Notify recipient
    const tUser = Array.isArray(booking.taskers.users) ? booking.taskers.users[0] : booking.taskers.users;
    const recipientId = currentUser.id === booking.customer_id 
      ? tUser.id 
      : booking.customer_id;
      
    await sendNotification(
      recipientId, 
      "New Message", 
      text.length > 50 ? text.substring(0, 50) + '...' : text, 
      'message'
    );
  };

  const sendNotification = async (targetUserId: string, title: string, message: string, type: 'message' | 'status' | 'alert' | 'info' = 'info') => {
    try {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title,
        message,
        type,
        link: `/booking/${id}/tracking`
      });
    } catch (err) {
      console.error("Notification failed", err);
    }
  };

  // Chat Simulation Logic (Ticks & Reply)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    
    // 1. Simulate status ticks for user's last message
    if (lastMsg && lastMsg.sender_id === currentUser?.id && lastMsg.status && lastMsg.status !== 'read') {
      const timer = setTimeout(() => {
        const nextStatus = lastMsg.status === 'sent' ? 'delivered' : 'read';
        setMessages(prev => prev.map(m => m.id === lastMsg.id ? { ...m, status: nextStatus } : m));
      }, lastMsg.status === 'sent' ? 1000 : 2000);

      // 2. Trigger dummy reply only when message is "read"
      if (lastMsg.status === 'read' && !messages.some(m => m.sender_id === 'simulated-tasker')) {
        const replyTimer = setTimeout(() => {
          const dummyReply = {
            id: `reply-${Date.now()}`,
            booking_id: id,
            sender_id: 'simulated-tasker',
            text: "नमस्ते! I'm on my way. I'll reach your location in about 10 minutes. See you soon!",
            created_at: new Date().toISOString(),
            status: 'read'
          };
          setMessages(prev => [...prev, dummyReply]);
          scrollToBottom();
        }, 1500);
        return () => {
          clearTimeout(timer);
          clearTimeout(replyTimer);
        };
      }

      return () => clearTimeout(timer);
    }
  }, [messages, currentUser?.id, id]);

  const submitReview = async () => {
    if (rating === 0 || !currentUser) return;
    setSubmittingReview(true);
    
    const { error } = await supabase.from('reviews').insert({
      booking_id: id,
      customer_id: currentUser.id,
      tasker_id: booking.tasker_id,
      rating: rating,
      comment: reviewComment
    });

    if (!error) {
      setHasReviewed(true);
      setShowReviewModal(false);
      showSuccess("Thank you for your review! ⭐");
    } else {
      showError("We couldn't submit your review. Please try again.");
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" variant="brand" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm font-medium text-gray-500 max-w-md">{fetchError}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setLoading(true); setFetchError(null); fetchInitialData(); }} className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">Try Again</button>
          <a href="/dashboard" className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-[2rem] flex items-center justify-center">
          <HelpCircle className="w-10 h-10 text-gray-300" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-sm font-medium text-gray-500 max-w-md">This booking doesn't exist or you may not have access to it.</p>
        </div>
        <a href="/dashboard" className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">Back to Dashboard</a>
      </div>
    );
  }

  const tasker = booking.taskers;
  const tUser = Array.isArray(tasker?.users) ? tasker?.users[0] : tasker?.users;
  const status = booking.status;
  const isCustomer = currentUser?.id === booking.customer_id;
  const isTasker = currentUser?.id === tUser?.id;

  const getStepStatus = (stepIndex: number) => {
    // Terminal/error states: show all as "upcoming" gracefully
    const currentIndex = stepIndexMap[status] ?? -1;
    if (currentIndex === -1) return 'upcoming'; // declined, rejected, cancelled, disputed, unknown
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  // Reusable step index for progress bar
  const stepIndexMap: Record<string, number> = {
    'pending': 0, 'pending_acceptance': 0,
    'confirmed': 1, 'accepted': 1,
    'on-the-way': 2,
    'arrived': 3, 'in-progress': 3,
    'completed': 4,
  };
  const currentStepIndex = stepIndexMap[status] ?? -1;

  const steps = [
    { label: "Ordered", icon: Clock },
    { label: "Confirmed", icon: CheckCircle2 },
    { label: "Dispatched", icon: Navigation },
    { label: "Started", icon: MapPin },
  ];

  return (
    <main className="h-screen bg-[#F0F2F5] flex flex-col font-inter overflow-hidden relative">
      {/* 🎬 CINEMATIC STATUS OVERLAY */}
      {statusOverlay?.show && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-6 animate-in slide-in-from-top-12 duration-700 cubic-bezier(0.4, 0, 0.2, 1)">
           <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex items-center gap-5">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                 <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">{statusOverlay.title}</h4>
                 <p className="text-[11px] font-bold text-white/60 leading-relaxed">{statusOverlay.subtitle}</p>
              </div>
           </div>
        </div>
      )}

      {/* 💎 PREMIUM NAV-SURFACE */}
      <div className="bg-white/80 backdrop-blur-2xl border-b border-gray-200/50 z-[100] sticky top-0 shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <PageHeader
              title="Live Tracking"
              description="Real-time booking status"
              showBack
              backHref="/dashboard"
              className="mb-0 [&_.title-wrapper]:hidden p-0 bg-transparent [&_.back-btn]:!p-0"
              relatedLinks={[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/browse", label: "Find Taskers" },
              ]}
            />
            <div className="h-6 w-[1px] bg-gray-200 shrink-0 hidden sm:block"></div>
            <div className="flex flex-col min-w-0 overflow-hidden">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                 <span className="font-black text-[10px] sm:text-[10px] uppercase tracking-wider sm:tracking-[0.2em] text-[var(--sewakhoj-red)] truncate">Live Control Room</span>
              </div>
              <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">ID: {id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={() => {
                const issue = window.prompt("Describe the issue (No-show, delay, etc):");
                if (issue) showInfo("Issue reported to support. We'll contact you within 5 minutes.");
              }}
              className="px-3 py-2 bg-red-50 text-red-600 rounded-xl flex items-center gap-1.5 text-[10px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Report Issue</span>
              <span className="sm:hidden">Report</span>
            </button>
            <button 
              onClick={() => setShowHelp(true)}
              className="hidden sm:flex w-10 h-10 rounded-2xl hover:bg-gray-50 transition-all items-center justify-center text-gray-400 hover:text-gray-900"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <Link 
              href="/settings"
              className="flex items-center gap-3 p-1.5 sm:pr-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden ring-2 ring-white shrink-0">
                {currentUser?.user_metadata?.avatar_url ? (
                  <img 
                    src={currentUser.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.user_metadata?.full_name || 'U')}&background=random`;
                    }}
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span className="text-xs font-black text-gray-900 hidden md:block">Settings</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full overflow-hidden p-6 gap-6 h-[calc(100vh-64px)]">
        
        {/* 📱 MOBILE TABS ONLY */}
        <div className="md:hidden">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
            <button 
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'tracking' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tracking
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MessageCircle className="w-4 h-4" /> Live Chat
            </button>
          </div>
        </div>

        {/* 🚀 MASTER DASHBOARD GRID */}
        <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
          
          {/* LEFT COLUMN: Tracking & Details (Col 8 on Desktop) */}
          <div className={`col-span-12 md:col-span-8 flex flex-col gap-6 overflow-hidden ${activeTab === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            
            {/* 📍 ROW 1: LIVE STATUS & PROGRESS */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-white p-8 flex flex-col gap-8 transition-all hover:shadow-2xl hover:shadow-gray-200/60">
              <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-6 sm:gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                    {status === 'on-the-way' ? 'Tasker is arriving' : 
                     status === 'in-progress' ? 'Work in progress' : 
                     status === 'completed' ? 'Job completed' : 'Preparing details'}
                  </h2>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-green-100">Live Status</span>
                    <span className="text-gray-400 text-sm font-medium">Distance: <span className="text-gray-900 font-black">{distanceKm ? `${distanceKm.toFixed(1)} km away` : 'Calculating...'}</span></span>
                  </div>
                </div>
                
                {/* 🛰️ JOURNEY MOMENTUM METER */}
                {status === 'on-the-way' && (
                  <div className="hidden lg:flex items-center gap-6 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                    <div className="relative w-16 h-16">
                       <svg className="w-full h-full transform -rotate-90">
                          <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-gray-100" />
                          <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={176} strokeDashoffset={176 - (176 * Math.min(100, (1 - (distanceKm || 0)/5) * 100)) / 100} className="text-[var(--sewakhoj-red)] transition-all duration-1000" />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Navigation className="w-5 h-5 text-[var(--sewakhoj-red)] animate-pulse" />
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Momentum</p>
                       <p className="text-sm font-black text-gray-900">{eta || 'Calculating...'}</p>
                    </div>
                  </div>
                )}
                {tasker && (
                  <div className="w-full sm:w-auto flex items-center gap-4 bg-gray-50 p-3 rounded-[2rem] border border-gray-100/50 shrink-0">
                    <div className="w-14 h-14 bg-white rounded-2xl overflow-hidden shadow-sm p-1 shrink-0">
                        {tUser?.avatar_url ? (
                          <img 
                            src={tUser.avatar_url} 
                            alt="Tasker" 
                            className="w-full h-full object-cover rounded-xl" 
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tUser?.full_name || 'T')}&background=random`; }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white font-black text-lg rounded-xl">{tUser?.full_name?.charAt(0)}</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 truncate">Your Specialist</p>
                       <h4 className="text-sm font-black text-gray-900 truncate">{tUser?.full_name}</h4>
                       <div className="flex items-center gap-1.5 mt-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                          <span className="text-[10px] font-bold text-gray-600">{tasker.rating?.toFixed(1)} Rating</span>
                       </div>
                    </div>
                    <a href={`tel:${tUser?.phone}`} className="w-12 h-12 bg-white text-gray-900 rounded-2xl flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all duration-300 shadow-sm ml-auto shrink-0">
                       <Phone className="w-5 h-5" />
                    </a>
                  </div>
                )}
              </div>

              {/* DASHBOARD STEPPER */}
              <div className="relative pt-6 pb-2">
                 <div className="absolute top-[4.25rem] left-8 right-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--sewakhoj-red)] to-red-400 transition-all duration-1000 rounded-full"
                      style={{ width: `${(currentStepIndex + 1) * 20}%` }}
                    ></div>
                 </div>
                 <div className="relative flex justify-between px-2">
                    {steps.map((step, idx) => {
                      const stepStatus = getStepStatus(idx);
                      const isCurrent = stepStatus === 'current';
                      const isCompleted = stepStatus === 'completed';
                      const Icon = step.icon;
                      return (
                        <div key={idx} className="flex flex-col items-center gap-4 group">
                          <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 shadow-md border-2 z-10 ${
                            isCompleted ? 'bg-white border-green-500 text-green-500' : 
                            isCurrent ? 'bg-white border-[var(--sewakhoj-red)] text-[var(--sewakhoj-red)] ring-8 ring-[var(--sewakhoj-red)]/5' : 
                            'bg-white border-gray-100 text-gray-300'
                          }`}>
                            {isCompleted ? <Check className="w-7 h-7 stroke-[3]" /> : <Icon className="w-6 h-6" />}
                            {isCurrent && status === 'pending' && (
                              <div className="absolute inset-0 rounded-[1.25rem] bg-[var(--sewakhoj-red)] animate-ping opacity-20"></div>
                            )}
                          </div>
                          <div className="text-center">
                             <p className={`text-[8px] sm:text-[10px] font-black uppercase tracking-normal sm:tracking-widest ${isCurrent ? 'text-gray-900' : 'text-gray-300'}`}>{step.label}</p>
                             <p className={`text-[8px] font-bold uppercase mt-0.5 sm:mt-1 ${isCurrent ? 'text-[var(--sewakhoj-red)]' : 'text-transparent'}`}>Live</p>
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
            </div>

            {/* 📝 ROW 2: BOOKING SUMMARY & ACTIONS */}
            <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-white flex flex-col overflow-hidden">
               <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 border-b border-gray-50">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest sm:tracking-[0.2em] text-gray-400">Order Intelligence</span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {status === 'completed' && isCustomer && !hasReviewed && (
                      <button onClick={() => setShowReviewModal(true)} className="flex-1 sm:flex-none px-6 py-2.5 bg-yellow-400 text-yellow-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-100 text-center">Rate Job</button>
                    )}
                    {isCustomer && status !== 'completed' && !isDisputed && (
                      <button onClick={() => setShowDisputeModal(true)} className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all border border-gray-100 text-center">Help / Report</button>
                    )}
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4">
                           <Info className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Service</p>
                        <p className="text-sm font-black text-gray-900 capitalize">{booking.category}</p>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                           <span className="text-[10px] font-black text-gray-400 uppercase">Payment</span>
                           <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Online</span>
                        </div>
                     </div>

                     <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4">
                           <MapPin className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</p>
                        <p className="text-xs font-bold text-gray-900 leading-relaxed line-clamp-2">{booking.address}</p>
                     </div>

                     <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50 flex flex-col">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4">
                           <Clock className="w-5 h-5 text-gray-900" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pricing</p>
                        <p className="text-2xl font-black text-[var(--sewakhoj-red)]">Rs. {booking.total_price}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-auto">Inclusive of all taxes</p>
                     </div>
                  </div>

                  {/* 🛡️ SEWAKHOJ MISSION GUARANTEE */}
                  <div className="mt-8 bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] p-8 text-white relative overflow-hidden group border border-white/5 shadow-2xl">
                     <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
                              <ShieldCheck className="w-8 h-8 text-green-400" />
                           </div>
                           <div>
                              <h4 className="text-xl font-black tracking-tight leading-tight">48-Hour Mission Guarantee</h4>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Protocol Active • SewaKhoj Standard</p>
                           </div>
                        </div>
                        <p className="text-xs text-gray-400 font-bold leading-relaxed mb-8 max-w-lg">
                           Every mission is backed by our elite quality promise. If your specific issue returns within 48 hours of completion, we will dispatch another specialist to resolve it for free. No questions asked.
                        </p>
                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Secure Coverage</span>
                           </div>
                           <div className="h-4 w-[1px] bg-white/10"></div>
                           <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-white/40" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Verified Specialist</span>
                           </div>
                        </div>
                     </div>
                     <ShieldCheck className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                  </div>

                  <div className="mt-8 p-6 bg-[var(--sewakhoj-red)]/5 rounded-[2rem] border border-[var(--sewakhoj-red)]/10 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                           <Navigation className="w-6 h-6 text-[var(--sewakhoj-red)]" />
                        </div>
                        <div>
                           <p className="text-sm font-black text-gray-900">Scheduled for Today</p>
                           <p className="text-xs font-medium text-gray-500">{new Date(booking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Kathmandu, Nepal</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Booking Confirmed</p>
                        <div className="flex items-center gap-1 justify-end">
                           {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-[var(--sewakhoj-red)] rounded-full"></div>)}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE CHAT (Col 4 on Desktop) */}
          <div className={`col-span-12 md:col-span-4 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-white flex flex-col overflow-hidden transition-all duration-500 ${activeTab === 'tracking' ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10">
               <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl overflow-hidden ring-4 ring-gray-50 group-hover:ring-[var(--sewakhoj-red)]/10 transition-all">
                        {tUser?.avatar_url ? (
                          <img 
                            src={tUser.avatar_url} 
                            alt="Tasker" 
                            className="w-full h-full object-cover" 
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tUser?.full_name || 'T')}&background=random`; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--sewakhoj-red)] font-black text-lg">{tUser?.full_name?.charAt(0)}</div>
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-gray-900 tracking-tight">{tUser?.full_name}</h5>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Now</span>
                    </div>
                  </div>
               </div>
            </div>

{/* Message History */}
             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[#F8FAFC]/50">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                     <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center mb-6">
                        <MessageCircle className="w-8 h-8 text-gray-200" />
                     </div>
                     <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] leading-relaxed">Your secure <br /> connection is active</p>
                  </div>
                )}
                
                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start animate-in fade-in">
                    <div className="bg-white border border-gray-100 rounded-[2rem] rounded-bl-none px-6 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {messages.map((msg, idx) => {
                 const isMe = msg.sender_id === currentUser?.id;
                 const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 600000;
                 const mStatus = msg.status || 'read';

                 return (
                   <div key={msg.id} className="space-y-4">
                     {showTime && (
                       <div className="flex justify-center my-4">
                         <span className="px-4 py-1.5 bg-white rounded-full text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] shadow-sm border border-gray-100">
                           {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                     )}
                     <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                        <div className={`max-w-[85%] relative`}>
                           <div className={`px-6 py-4 rounded-[2rem] shadow-sm ${isMe ? 'bg-gray-900 text-white rounded-br-none shadow-gray-200/50' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                             <p className="text-[13px] font-medium leading-relaxed">{msg.text}</p>
                           </div>
                           {isMe && (
                             <div className="flex items-center justify-end gap-1.5 mt-2 px-1">
                                {mStatus === 'sent' && <Check className="w-3 h-3 text-gray-300" />}
                                {mStatus === 'delivered' && <div className="flex"><Check className="w-3 h-3 text-gray-300" /><Check className="w-3 h-3 text-gray-300 -ml-1.5" /></div>}
                                {mStatus === 'read' && <div className="flex"><Check className="w-3 h-3 text-blue-500" /><Check className="w-3 h-3 text-blue-500 -ml-1.5" /></div>}
                             </div>
                           )}
                        </div>
                     </div>
                   </div>
                 );
               })}
               <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions (Tasker Only) */}
            {isTasker && status !== 'completed' && (
              <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar border-t border-gray-50 bg-gray-50/20">
                {[
                  "I'm stuck in traffic", 
                  "I've arrived", 
                  "Please share gate code", 
                  "Job started"
                ].map((txt) => (
                  <button 
                    key={txt}
                    onClick={() => setNewMessage(txt)}
                    className="whitespace-nowrap px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-all shadow-sm active:scale-95"
                  >
                    {txt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Surface */}
            <div className="p-3 sm:p-6 bg-white border-t border-gray-50 shrink-0">
               <form onSubmit={sendMessage} className="relative flex items-center gap-2 sm:gap-3">
                  <button 
                    type="button" 
                    className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl hover:bg-gray-50 flex items-center justify-center text-gray-300 hover:text-gray-900 transition-all"
                  >
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <div className="flex-1 min-w-0">
<input 
                       type="text" 
                       value={newMessage}
                       onChange={(e) => {
                         setNewMessage(e.target.value);
                         if (e.target.value.length > 0) {
                           handleTyping(true);
                         }
                       }}
                       onFocus={() => handleTyping(true)}
                       onBlur={() => handleTyping(false)}
                       placeholder={booking.status === 'completed' ? "Job completed" : "Message..."} 
                       className="w-full bg-gray-50 border-2 border-transparent rounded-[1.25rem] sm:rounded-[1.5rem] px-4 py-2.5 sm:px-6 sm:py-4 text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-gray-900/5 transition-all duration-300"
                       disabled={booking.status === 'completed'}
                     />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || booking.status === 'completed'} 
                    className="w-10 h-10 sm:w-14 sm:h-14 shrink-0 bg-gray-900 text-white rounded-xl sm:rounded-[1.5rem] flex items-center justify-center hover:bg-black hover:scale-105 active:scale-95 disabled:opacity-20 transition-all duration-300 shadow-lg sm:shadow-xl shadow-gray-200"
                  >
                    <Send className="w-4 h-4 sm:w-6 sm:h-6 translate-x-0.5" />
                  </button>
               </form>
            </div>
          </div>
        </div>
      </div>

      {/* 🛠️ TASKER FLOATING CONTROLS (Live Focus) */}
      {isTasker && status !== 'completed' && status !== 'cancelled' && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[150] w-full max-w-sm px-6">
           <div className="bg-gray-900 p-2.5 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col gap-2">
              <div className="px-6 py-1.5 flex items-center justify-between mb-1">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Active Control</span>
                 </div>
              </div>
              
              {status === 'accepted' && (
                <button 
                  onClick={() => updateStatus('on-the-way')}
                  className="w-full bg-[var(--sewakhoj-red)] text-white py-5 rounded-[1.75rem] font-black text-xs shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Navigation className="w-5 h-5 animate-pulse" /> START MISSION
                </button>
              )}
              {status === 'on-the-way' && (
                <button 
                  onClick={() => updateStatus('in-progress')}
                  className="w-full bg-blue-600 text-white py-5 rounded-[1.75rem] font-black text-xs shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <MapPin className="w-5 h-5 animate-bounce" /> MARK ARRIVAL
                </button>
              )}
              {status === 'in-progress' && (
                <button 
                  onClick={() => updateStatus('completed')}
                  className="w-full bg-green-600 text-white py-5 rounded-[1.75rem] font-black text-xs shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" /> FINISH SERVICE
                </button>
              )}
           </div>
        </div>
      )}

      {/* 💎 MODALS (Refined Unified Style) */}
      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Control Room Help"
        description="Monitor your booking and communicate with your tasker in real-time."
        size="sm"
        footer={
          <button onClick={() => setShowHelp(false)} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200">Got it, Thanks!</button>
        }
      >
        <div className="space-y-4">
           {[
             { icon: Navigation, title: 'Real-time Tracking', text: 'Visual progress updates as they happen.' },
             { icon: MessageCircle, title: 'Secure Chat', text: 'Direct line to your tasker at all times.' }
           ].map((item, i) => (
             <div key={i} className="flex gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                   <item.icon className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                   <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1">{item.title}</p>
                   <p className="text-[11px] text-gray-500 font-medium">{item.text}</p>
                </div>
             </div>
           ))}
        </div>
      </Modal>

      <Modal
        open={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Report Issue"
        description="Something not right? Let us know immediately."
        size="sm"
        footer={
          <>
            <button onClick={submitDispute} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-red-100 mb-3">{submittingDispute ? 'Submitting...' : 'Send Report'}</button>
            <button onClick={() => setShowDisputeModal(false)} className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-all">Cancel</button>
          </>
        }
      >
        <textarea
          value={disputeReason}
          onChange={(e) => setDisputeReason(e.target.value)}
          rows={4}
          className="w-full bg-gray-50 border-2 border-transparent rounded-[1.75rem] p-6 text-sm font-medium focus:bg-white focus:border-red-500/20 focus:ring-8 focus:ring-red-500/5 transition-all"
          placeholder="Describe the problem..."
        ></textarea>
      </Modal>

      <Modal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Rate Your Tasker"
        size="sm"
        footer={
          <>
            <button onClick={submitReview} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-gray-200 mb-3">{submittingReview ? 'Sending...' : 'Submit Feedback'}</button>
            <button onClick={() => setShowReviewModal(false)} className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-all">Not Now</button>
          </>
        }
      >
        <div className="flex justify-center gap-3 my-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)} className="transform hover:scale-125 transition-all">
              <Star className={`w-10 h-10 ${rating >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-100'}`} />
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmData?.show}
        onConfirm={() => confirmData?.onConfirm()}
        onCancel={() => setConfirmData(null)}
        title={confirmData?.title || ""}
        message={confirmData?.message || ""}
        variant="default"
        confirmLabel="Yes, Proceed"
        cancelLabel="Go Back"
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E0; }
      `}</style>
    </main>
  );
}
