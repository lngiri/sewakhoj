"use client";

import { useState, useEffect, use, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Navigation, Phone, Star, MessageCircle, Send, X, AlertTriangle, HelpCircle, User, Info, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TrackingPageProps {
  params: Promise<{ id: string }>;
}

export default function TrackingPage({ params }: TrackingPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { user: currentUser, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'tracking' | 'chat'>('tracking');
  
  // Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
  
  // Toast & Confirm State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmData, setConfirmData] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  
  const [showHelp, setShowHelp] = useState(false);
  
  // Modal scroll lock effect
  useEffect(() => {
    if (showReviewModal || showDisputeModal || confirmData?.show || showHelp) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showReviewModal, showDisputeModal, confirmData?.show, showHelp]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  useEffect(() => {
    if (!booking) return;

    // Subscribe to booking status updates
    const bookingChannel = supabase
      .channel(`public:bookings:id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        (payload: any) => {
          setBooking((prev: any) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`public:messages:booking_id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${id}` },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(messageChannel);
    };
  }, [id, booking?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  async function fetchInitialData() {
    // Fetch booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        taskers (
          id, rating, hourly_rate, transportation_mode,
          users (full_name, phone, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (!bookingError && bookingData) {
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
          showToast("Failed to update status", "error");
        } else {
          showToast(`Status updated to ${newStatus}`, "success");
        }
        setConfirmData(null);
      }
    });
  };

  const submitDispute = async () => {
    if (!disputeReason.trim() || !currentUser) return;
    setSubmittingDispute(true);

    const { error } = await supabase
      .from('bookings')
      .update({ 
        is_disputed: true, 
        dispute_reason: disputeReason,
        dispute_created_at: new Date().toISOString()
      })
      .eq('id', id);

    if (!error) {
      setIsDisputed(true);
      setShowDisputeModal(false);
      showToast("Issue reported to support desk. We will contact you soon.", "success");
    } else {
      showToast("Failed to report issue", "error");
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
      showToast("Thank you for your review!", "success");
    } else {
      showToast("Failed to submit review", "error");
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red"></div>
      </div>
    );
  }

  if (!booking) return <div className="min-h-screen flex items-center justify-center">Booking Not Found</div>;

  const tasker = booking.taskers;
  const tUser = Array.isArray(tasker?.users) ? tasker?.users[0] : tasker?.users;
  const status = booking.status;
  const isCustomer = currentUser?.id === booking.customer_id;
  const isTasker = currentUser?.id === tUser?.id;

  const getStepStatus = (stepIndex: number) => {
    const statuses = ['pending', 'accepted', 'on-the-way', 'in-progress', 'completed'];
    const normalizedStatus = status === 'arrived' ? 'in-progress' : status;
    const currentIndex = statuses.indexOf(normalizedStatus);
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const steps = [
    { label: "Ordered", icon: Clock },
    { label: "Confirmed", icon: CheckCircle2 },
    { label: "Dispatched", icon: Navigation },
    { label: "Started", icon: MapPin },
    { label: "Complete", icon: Star }
  ];

  return (
    <main className="h-screen bg-gray-50 flex flex-col font-inter overflow-hidden">
      {/* MODERN STICKY HEADER */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 sticky top-0 shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <span className="font-black text-xl tracking-tight text-sewakhoj-red">SEWAKHOJ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex bg-gray-100 p-1 rounded-xl mr-4">
               <span className="px-4 py-1.5 text-xs font-black uppercase tracking-widest text-gray-500">Live Dashboard</span>
            </div>
            <button 
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 cursor-pointer"
              title="Help & Support"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <Link 
              href="/settings"
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 cursor-pointer"
              title="Profile Settings"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full overflow-hidden p-4 h-[calc(100vh-64px)]">
        {/* TAB NAVIGATION (Segmented Control) */}
        <div className="pb-4">
          <div className="flex bg-gray-200/50 p-1 rounded-2xl relative max-w-sm mx-auto md:mx-0">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${activeTab === 'chat' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
            ></div>
            <button 
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all relative z-10 ${activeTab === 'tracking' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Tracking
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all relative z-10 flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <MessageCircle className="w-4 h-4" /> Chat
            </button>
          </div>
        </div>

        {/* MAIN CONTENT GRID (2 Rows on Desktop) */}
        <div className="flex-1 grid grid-cols-1 md:grid-rows-2 gap-4 overflow-hidden h-full">
          
          {/* TRACKING SECTION (Top Row) */}
          <div className={`bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden ${activeTab === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Side: Status & Tasker */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-green-100">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      {status === 'on-the-way' ? "Tasker En Route" : status === 'completed' ? "Task Finished" : "Booking Live"}
                    </div>
                    <span className="text-xs font-bold text-gray-400">Order #{booking.id.slice(0,8)}</span>
                  </div>

                  {tasker && (
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                          {tUser?.avatar_url ? <img src={tUser.avatar_url} alt="Tasker" className="w-full h-full object-cover" /> : <div className="bg-[var(--sewakhoj-red)] w-full h-full flex items-center justify-center text-white font-black text-xl">{tUser?.full_name?.charAt(0)}</div>}
                        </div>
                        <div className="flex-1">
                          <h2 className="font-black text-xl text-gray-900">{tUser?.full_name}</h2>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                              <Star className="w-4 h-4 fill-current" /> {tasker.rating?.toFixed(1) || "New"}
                            </div>
                            <div className="text-xs font-bold text-gray-400 capitalize flex items-center gap-1.5">
                              <Navigation className="w-3.5 h-3.5" /> {tasker.transportation_mode}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a href={`tel:${tUser?.phone}`} className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center hover:bg-green-600 transition-all shadow-lg shadow-green-100 active:scale-90">
                            <Phone className="w-5 h-5 fill-current" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Horizontal Stepper */}
                  <div className="py-4">
                    <div className="flex items-center justify-between relative px-2">
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 -z-10 mx-10"></div>
                      {steps.map((step, idx) => {
                        const stepStatus = getStepStatus(idx);
                        const isCurrent = stepStatus === 'current';
                        const isCompleted = stepStatus === 'completed';
                        const Icon = step.icon;
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2 ${
                              isCompleted ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100' : 
                              isCurrent ? 'bg-white border-[var(--sewakhoj-red)] text-[var(--sewakhoj-red)] shadow-lg shadow-red-100 animate-pulse' : 
                              'bg-white border-gray-100 text-gray-300'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-tight ${isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side: Booking Details */}
                <div className="lg:w-80 space-y-4">
                  <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6">Booking Details</h3>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-[var(--sewakhoj-red)]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Service</p>
                          <p className="text-sm font-black">{booking.category || "General Service"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-[var(--sewakhoj-red)]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Address</p>
                          <p className="text-sm font-black line-clamp-1">{booking.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-[var(--sewakhoj-red)]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Scheduled</p>
                          <p className="text-sm font-black">{new Date(booking.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Total Amount</span>
                        <span className="text-xl font-black text-[var(--sewakhoj-red)]">Rs. {booking.total_price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isCustomer && status !== 'completed' && status !== 'cancelled' && !isDisputed && (
                    <button 
                      onClick={() => setShowDisputeModal(true)}
                      className="w-full py-4 text-red-500 font-black text-xs flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                    >
                      <AlertTriangle className="w-4 h-4" /> Report Issue
                    </button>
                  )}
                  {status === 'completed' && isCustomer && !hasReviewed && (
                    <button 
                      onClick={() => setShowReviewModal(true)} 
                      className="w-full bg-yellow-400 text-yellow-900 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-yellow-100 hover:scale-[1.02] transition-all"
                    >
                      <Star className="w-5 h-5 fill-current" /> Rate Your Tasker
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CHAT SECTION (Bottom Row) */}
          <div className={`bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ${activeTab === 'tracking' ? 'hidden md:flex' : 'flex'}`}>
            {/* Header for Chat on Desktop */}
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-900">Live Conversation</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">End-to-End Encrypted</span>
              </div>
            </div>

            {/* Conversation Area - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50/20">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-3 opacity-50">
                  <MessageCircle className="w-12 h-12 stroke-[1.5]" />
                  <p className="text-sm font-bold">Start the conversation</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                const status = msg.status || 'read';
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[80%] md:max-w-[60%] relative ${isMe ? 'bg-[var(--sewakhoj-red)] text-white rounded-[1.5rem] rounded-br-none shadow-xl shadow-red-100/50' : 'bg-white text-gray-800 rounded-[1.5rem] rounded-bl-none shadow-sm border border-gray-100'} px-5 py-3.5`}>
                      <p className="text-[13px] font-medium leading-relaxed mb-1 pr-6">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1.5 h-3">
                        <span className={`text-[9px] font-bold ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <div className="flex items-center translate-y-[1px]">
                            {status === 'sent' && <Check className="w-2.5 h-2.5 text-white/50" />}
                            {status === 'delivered' && <div className="flex"><Check className="w-2.5 h-2.5 text-white/50" /><Check className="w-2.5 h-2.5 text-white/50 -ml-1.5" /></div>}
                            {status === 'read' && <div className="flex"><Check className="w-2.5 h-2.5 text-blue-300" /><Check className="w-2.5 h-2.5 text-blue-300 -ml-1.5" /></div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - FIXED AT BOTTOM OF ROW */}
            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
              <form onSubmit={sendMessage} className="flex items-center gap-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={booking.status === 'completed' ? "Booking completed - Chat closed" : "Message your tasker..."} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-[1.25rem] px-6 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[var(--sewakhoj-red)]/5 focus:border-[var(--sewakhoj-red)]/20 transition-all"
                    disabled={booking.status === 'completed'}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || booking.status === 'completed'} 
                  className="w-14 h-14 bg-[var(--sewakhoj-red)] text-white rounded-[1.25rem] flex items-center justify-center hover:bg-sewakhoj-red-light disabled:opacity-50 transition-all shadow-lg shadow-red-100 active:scale-95 shrink-0"
                >
                  <Send className="w-6 h-6 translate-x-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* TASKER ACTION BAR (Sticky Bottom) */}
      {isTasker && status !== 'completed' && status !== 'cancelled' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-[60] flex justify-center backdrop-blur-md bg-white/90">
          <div className="max-w-2xl w-full">
            {status === 'accepted' && (
              <button 
                onClick={() => updateStatus('on-the-way')}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4"
              >
                <Navigation className="w-6 h-6 animate-pulse" /> START JOURNEY
              </button>
            )}
            {status === 'on-the-way' && (
              <button 
                onClick={() => updateStatus('in-progress')}
                className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-100 flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4"
              >
                <MapPin className="w-6 h-6 animate-bounce" /> I HAVE ARRIVED
              </button>
            )}
            {status === 'in-progress' && (
              <button 
                onClick={() => updateStatus('completed')}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-green-100 flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4"
              >
                <CheckCircle2 className="w-6 h-6" /> MARK AS COMPLETED
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals & Toasts (Keep existing logic) */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowDisputeModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Report an Issue</h3>
              <p className="text-gray-500 text-sm">Tell us what went wrong. Our team will investigate immediately.</p>
            </div>
            <div className="mb-8">
              <textarea 
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4} 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all"
                placeholder="E.g. Tasker didn't show up, work was incomplete..."
              ></textarea>
            </div>
            <button 
              onClick={submitDispute}
              disabled={!disputeReason.trim() || submittingDispute}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-black hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-100"
            >
              {submittingDispute ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowReviewModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 fill-current" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Rate your Tasker</h3>
              <p className="text-gray-500 text-sm">How was your experience with {tUser?.full_name}?</p>
            </div>
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="focus:outline-none transform hover:scale-125 transition-all duration-300">
                  <Star className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400 text-yellow-400 drop-shadow-md' : 'text-gray-200'}`} />
                </button>
              ))}
            </div>
            <div className="mb-8">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Comment (Optional)</label>
              <textarea 
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3} 
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-sewakhoj-red/10 focus:border-sewakhoj-red transition-all"
                placeholder="Share your experience..."
              ></textarea>
            </div>
            <button 
              onClick={submitReview}
              disabled={rating === 0 || submittingReview}
              className="w-full bg-sewakhoj-red text-white py-4 rounded-xl font-black hover:bg-sewakhoj-red-light disabled:opacity-50 transition-all shadow-lg shadow-red-100"
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md ${
            toast.type === 'success' ? 'bg-green-600/90 text-white' : 
            toast.type === 'error' ? 'bg-red-600/90 text-white' : 
            'bg-gray-900/90 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
             toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : 
             <Info className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowHelp(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Need Help?</h3>
              <p className="text-gray-500 text-sm">We're here to assist you with your booking.</p>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-gray-900">How tracking works</p>
                  <p className="text-xs text-gray-500">Your tasker updates their status in real-time. You can see their journey and current work state.</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-gray-900">Chatting with tasker</p>
                  <p className="text-xs text-gray-500">Use the chat section below to discuss specific details or provide directions.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-black hover:bg-black transition-all shadow-lg"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E0;
        }
        body.modal-open {
          overflow: hidden !important;
        }
      `}</style>
    </main>
  );
}
