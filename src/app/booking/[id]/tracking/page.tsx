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
    <main className="h-screen bg-[#F8FAFC] flex flex-col font-inter overflow-hidden">
      {/* PREMIUM CRYSTAL HEADER */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-gray-200/50 z-[70] sticky top-0 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="group p-2 -ml-2 rounded-2xl hover:bg-white hover:shadow-sm transition-all duration-300">
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </Link>
            <div className="flex flex-col">
              <span className="font-black text-xs uppercase tracking-[0.3em] text-[var(--sewakhoj-red)] leading-none mb-1">Live Tracking</span>
              <span className="font-bold text-sm text-gray-900">Booking #{id.slice(0, 8)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-green-50/50 px-3 py-1.5 rounded-full border border-green-100/50">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-green-700">Realtime Connection Active</span>
            </div>
            <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden lg:block"></div>
            <button 
              onClick={() => setShowHelp(true)}
              className="p-2.5 rounded-2xl hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-900"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <Link 
              href="/settings"
              className="p-0.5 rounded-full ring-2 ring-transparent hover:ring-[var(--sewakhoj-red)]/20 transition-all"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {currentUser?.user_metadata?.avatar_url ? (
                  <img src={currentUser.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full overflow-hidden px-6 pb-6 pt-4 h-[calc(100vh-64px)]">
        {/* SLEEK SEGMENTED CONTROL */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex bg-gray-200/40 backdrop-blur-md p-1 rounded-[1.25rem] relative w-72 shadow-inner">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-2xl shadow-md transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${activeTab === 'chat' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
            ></div>
            <button 
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-2xl transition-all relative z-10 ${activeTab === 'tracking' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Details
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-2xl transition-all relative z-10 flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <MessageCircle className="w-3.5 h-3.5" /> Chat
            </button>
          </div>

          <div className="hidden md:flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Status</p>
                <p className="text-xs font-bold text-gray-900 capitalize">{status.replace(/-/g, ' ')}</p>
             </div>
             <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[var(--sewakhoj-red)]">
                <Navigation className="w-5 h-5" />
             </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID (Strict 2-Row Viewport Balance) */}
        <div className="flex-1 grid grid-cols-1 md:grid-rows-2 gap-6 overflow-hidden">
          
          {/* TRACKING SECTION (Visual Dashboard) */}
          <div className={`bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white flex flex-col overflow-hidden transition-all duration-500 ${activeTab === 'chat' ? 'hidden md:flex opacity-50 scale-[0.98]' : 'flex'}`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
                {/* Left: Progress & Tasker (Col 7) */}
                <div className="lg:col-span-7 p-8 flex flex-col gap-8 border-r border-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 leading-tight">Your tasker is <br /> {status === 'on-the-way' ? 'heading to your location' : status === 'in-progress' ? 'performing the service' : 'waiting for next steps'}</h2>
                      <p className="text-gray-400 text-sm font-medium mt-2">Estimated arrival: <span className="text-gray-900 font-bold">10-15 mins</span></p>
                    </div>
                  </div>

                  {/* ADVANCED PROGRESS STEPPER */}
                  <div className="relative py-10 px-4">
                    <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
                       <div 
                        className="h-full bg-gradient-to-r from-[var(--sewakhoj-red)] to-red-400 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${(steps.findIndex(s => s.label.toLowerCase().includes(status === 'arrived' ? 'started' : status.split('-')[0])) + 1) * 20}%` }}
                       ></div>
                    </div>
                    <div className="relative flex justify-between">
                      {steps.map((step, idx) => {
                        const stepStatus = getStepStatus(idx);
                        const isCurrent = stepStatus === 'current';
                        const isCompleted = stepStatus === 'completed';
                        const Icon = step.icon;
                        return (
                          <div key={idx} className="flex flex-col items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border-2 ${
                              isCompleted ? 'bg-white border-green-500 text-green-500' : 
                              isCurrent ? 'bg-white border-[var(--sewakhoj-red)] text-[var(--sewakhoj-red)] ring-8 ring-[var(--sewakhoj-red)]/5' : 
                              'bg-white border-gray-100 text-gray-300'
                            }`}>
                              {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : <Icon className="w-5 h-5" />}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-gray-900' : 'text-gray-300'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PREMIUM TASKER CARD */}
                  {tasker && (
                    <div className="mt-auto bg-[#F1F5F9]/50 rounded-[2rem] p-6 flex items-center gap-6 border border-white shadow-sm">
                      <div className="relative">
                        <div className="w-20 h-20 bg-white rounded-3xl overflow-hidden p-1 shadow-lg shadow-gray-200">
                          {tUser?.avatar_url ? (
                            <img src={tUser.avatar_url} alt="Tasker" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className="bg-gradient-to-br from-[var(--sewakhoj-red)] to-red-400 w-full h-full flex items-center justify-center text-white font-black text-2xl rounded-2xl">
                              {tUser?.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-white px-2 py-1 rounded-xl shadow-md border border-gray-50 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-[10px] font-black text-gray-900">{tasker.rating?.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-black text-gray-900 tracking-tight">{tUser?.full_name}</h4>
                        <div className="flex items-center gap-3 mt-1.5">
                           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold text-gray-500 border border-gray-100 shadow-sm">
                             <Navigation className="w-3 h-3 text-[var(--sewakhoj-red)]" />
                             {tasker.transportation_mode}
                           </div>
                           <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold text-gray-500 border border-gray-100 shadow-sm">
                             <Clock className="w-3 h-3 text-blue-500" />
                             Active Now
                           </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                         <a href={`tel:${tUser?.phone}`} className="w-14 h-14 bg-white text-gray-900 rounded-2xl flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all duration-300 border border-gray-100">
                           <Phone className="w-6 h-6 stroke-[1.5]" />
                         </a>
                         <button onClick={() => setActiveTab('chat')} className="w-14 h-14 bg-[var(--sewakhoj-red)] text-white rounded-2xl flex items-center justify-center hover:shadow-[0_10px_30px_rgba(185,28,28,0.2)] hover:scale-105 transition-all duration-300 md:hidden">
                           <MessageCircle className="w-6 h-6 stroke-[1.5]" />
                         </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Booking Summary (Col 5) */}
                <div className="lg:col-span-5 bg-gray-50/50 p-8 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Order Summary</span>
                    <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-gray-900 shadow-sm border border-gray-100">PLATFORM VERIFIED</span>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white p-5 rounded-3xl border border-gray-100/50 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Service Type</p>
                          <p className="text-sm font-bold text-gray-900">{booking.category}</p>
                       </div>
                       <div className="bg-white p-5 rounded-3xl border border-gray-100/50 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Payment</p>
                          <p className="text-sm font-bold text-gray-900 capitalize">{booking.payment_method || 'Online'}</p>
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100/50 shadow-sm space-y-4">
                       <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Address</p>
                            <p className="text-xs font-bold text-gray-900 mt-0.5 leading-relaxed">{booking.address}</p>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Job Schedule</p>
                            <p className="text-xs font-bold text-gray-900 mt-0.5">{new Date(booking.scheduled_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                       <p className="text-sm font-black text-gray-900">Total Charged</p>
                       <p className="text-2xl font-black text-[var(--sewakhoj-red)]">Rs. {booking.total_price}</p>
                    </div>
                    
                    <div className="flex gap-3">
                       {isCustomer && status !== 'completed' && !isDisputed && (
                         <button 
                          onClick={() => setShowDisputeModal(true)}
                          className="flex-1 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-200 hover:bg-gray-100 hover:text-red-500 transition-all"
                         >
                           Report Issue
                         </button>
                       )}
                       {status === 'completed' && isCustomer && !hasReviewed && (
                         <button 
                          onClick={() => setShowReviewModal(true)}
                          className="flex-1 py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                         >
                           Rate Experience
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CHAT SECTION (Modern Messaging Interface) */}
          <div className={`bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white overflow-hidden flex flex-col transition-all duration-500 ${activeTab === 'tracking' ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-sm z-10">
               <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-100 rounded-2xl overflow-hidden">
                       {tUser?.avatar_url ? <img src={tUser.avatar_url} alt="Tasker" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--sewakhoj-red)] font-black text-sm">{tUser?.full_name?.charAt(0)}</div>}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-gray-900 leading-none">{tUser?.full_name}</h5>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Active Now</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100/50 hidden sm:flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    Support Moderated
                  </div>
               </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[#F8FAFC]/30">
               {messages.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-white rounded-[2.5rem] shadow-sm flex items-center justify-center mb-4">
                       <MessageCircle className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-sm font-black text-gray-300 uppercase tracking-[0.2em]">Start a private <br /> conversation</p>
                 </div>
               )}
               {messages.map((msg, idx) => {
                 const isMe = msg.sender_id === currentUser?.id;
                 const showTimestamp = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 300000;
                 const mStatus = msg.status || 'read';

                 return (
                   <div key={msg.id} className="space-y-2">
                     {showTimestamp && (
                       <div className="flex justify-center my-6">
                         <span className="px-3 py-1 bg-white/50 backdrop-blur-md rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 shadow-sm">
                           {new Date(msg.created_at).toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                     )}
                     <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[75%] md:max-w-[55%] relative group`}>
                           <div className={`px-6 py-4 rounded-[2rem] shadow-sm ${isMe ? 'bg-[var(--sewakhoj-red)] text-white rounded-br-none shadow-red-200/50' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                             <p className="text-[13.5px] font-medium leading-relaxed">{msg.text}</p>
                           </div>
                           <div className={`flex items-center gap-2 mt-1.5 px-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[9px] font-bold text-gray-400">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                <div className="flex">
                                   {mStatus === 'sent' && <Check className="w-3 h-3 text-white/50" />}
                                   {mStatus === 'delivered' && <div className="flex"><Check className="w-3 h-3 text-white/50" /><Check className="w-3 h-3 text-white/50 -ml-1.5" /></div>}
                                   {mStatus === 'read' && <div className="flex"><Check className="w-3 h-3 text-blue-300" /><Check className="w-3 h-3 text-blue-300 -ml-1.5" /></div>}
                                </div>
                              )}
                           </div>
                        </div>
                     </div>
                   </div>
                 );
               })}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Wrapper */}
            <div className="p-6 bg-white border-t border-gray-50">
               <form onSubmit={sendMessage} className="relative flex items-center gap-4 max-w-5xl mx-auto">
                  <div className="flex-1 relative group">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={booking.status === 'completed' ? "Job completed" : "Type a message..."} 
                      className="w-full bg-[#F1F5F9] border-2 border-transparent rounded-[1.75rem] px-8 py-5 text-sm font-medium focus:outline-none focus:bg-white focus:border-[var(--sewakhoj-red)]/10 focus:ring-8 focus:ring-[var(--sewakhoj-red)]/5 transition-all duration-300"
                      disabled={booking.status === 'completed'}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || booking.status === 'completed'} 
                    className="w-16 h-16 bg-[var(--sewakhoj-red)] text-white rounded-[1.75rem] flex items-center justify-center hover:shadow-[0_15px_40px_rgba(185,28,28,0.3)] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all duration-300 shrink-0 shadow-lg shadow-red-100"
                  >
                    <Send className="w-7 h-7 translate-x-0.5" />
                  </button>
               </form>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BAR (Tasker Only) */}
      {isTasker && status !== 'completed' && status !== 'cancelled' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[80] w-full max-w-md px-6">
           <div className="bg-gray-900/90 backdrop-blur-2xl p-3 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex flex-col gap-2">
              <div className="px-6 py-2 flex items-center justify-between border-b border-white/5 mb-1">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Live Control</span>
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-bold text-white uppercase">Active Session</span>
                 </div>
              </div>
              
              {status === 'accepted' && (
                <button 
                  onClick={() => updateStatus('on-the-way')}
                  className="w-full bg-[var(--sewakhoj-red)] text-white py-5 rounded-[1.75rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Navigation className="w-6 h-6 animate-pulse" /> START JOURNEY
                </button>
              )}
              {status === 'on-the-way' && (
                <button 
                  onClick={() => updateStatus('in-progress')}
                  className="w-full bg-blue-600 text-white py-5 rounded-[1.75rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <MapPin className="w-6 h-6 animate-bounce" /> I HAVE ARRIVED
                </button>
              )}
              {status === 'in-progress' && (
                <button 
                  onClick={() => updateStatus('completed')}
                  className="w-full bg-green-600 text-white py-5 rounded-[1.75rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <CheckCircle2 className="w-6 h-6" /> MARK AS COMPLETED
                </button>
              )}
           </div>
        </div>
      )}

      {/* Modals & Toasts (Keep Logic, Refine UI) */}
      {showHelp && (
        <div className="fixed inset-0 bg-gray-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowHelp(false)} className="absolute top-8 right-8 p-2 rounded-2xl hover:bg-gray-50 transition-colors">
              <X className="w-6 h-6 text-gray-300" />
            </button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                <HelpCircle className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Need Support?</h3>
              <p className="text-gray-400 text-sm font-medium">Everything you need to know about your live booking.</p>
            </div>
            <div className="space-y-5 mb-10">
              <div className="flex gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
                 <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                    <Navigation className="w-5 h-5 text-blue-500" />
                 </div>
                 <div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1">Live Updates</p>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">The tracking bar updates automatically as your tasker changes their status.</p>
                 </div>
              </div>
              <div className="flex gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
                 <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                 </div>
                 <div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1">Direct Chat</p>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Communicate securely with your tasker using the chat window below.</p>
                 </div>
              </div>
            </div>
            <button 
              onClick={() => setShowHelp(false)}
              className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200"
            >
              Understand, Continue
            </button>
          </div>
        </div>
      )}

      {/* Confirmation & Dispute Modals (Keep) */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-red-900/20 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowDisputeModal(false)} className="absolute top-8 right-8 p-2 rounded-2xl hover:bg-gray-50 transition-colors">
              <X className="w-6 h-6 text-gray-300" />
            </button>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Report Issue</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed">Your safety and satisfaction are our priority. Tell us what happened.</p>
            </div>
            <textarea 
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4} 
              className="w-full bg-gray-50 border-2 border-transparent rounded-[1.75rem] p-6 text-sm font-medium focus:outline-none focus:bg-white focus:border-red-500/20 focus:ring-8 focus:ring-red-500/5 transition-all mb-8"
              placeholder="Describe the problem in detail..."
            ></textarea>
            <button 
              onClick={submitDispute}
              disabled={!disputeReason.trim() || submittingDispute}
              className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-xl shadow-red-100"
            >
              {submittingDispute ? "Submitting..." : "Send Report"}
            </button>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 bg-yellow-900/10 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowReviewModal(false)} className="absolute top-8 right-8 p-2 rounded-2xl hover:bg-gray-50 transition-colors">
              <X className="w-6 h-6 text-gray-300" />
            </button>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-yellow-50 text-yellow-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                <Star className="w-10 h-10 fill-current" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">How was {tUser?.full_name}?</h3>
              <p className="text-gray-400 text-sm font-medium">Your feedback helps maintain high service standards.</p>
            </div>
            <div className="flex justify-center gap-3 mb-10">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="focus:outline-none transform hover:scale-125 active:scale-90 transition-all duration-300">
                  <Star className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg' : 'text-gray-100'}`} />
                </button>
              ))}
            </div>
            <textarea 
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3} 
              className="w-full bg-gray-50 border-2 border-transparent rounded-[1.75rem] p-6 text-sm font-medium focus:outline-none focus:bg-white focus:border-yellow-500/20 focus:ring-8 focus:ring-yellow-500/5 transition-all mb-8"
              placeholder="Share your experience (optional)..."
            ></textarea>
            <button 
              onClick={submitReview}
              disabled={rating === 0 || submittingReview}
              className="w-full bg-[var(--sewakhoj-red)] text-white py-5 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-red-100"
            >
              {submittingReview ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-bottom-10 duration-500">
          <div className={`px-8 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-4 backdrop-blur-2xl border border-white/20 ${
            toast.type === 'success' ? 'bg-green-600/90 text-white' : 
            toast.type === 'error' ? 'bg-red-600/90 text-white' : 
            'bg-gray-900/90 text-white'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
             toast.type === 'error' ? <AlertTriangle className="w-6 h-6" /> : 
             <Info className="w-6 h-6" />}
            <span className="font-black text-sm uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

      {confirmData?.show && (
        <div className="fixed inset-0 bg-gray-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-xs p-10 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
              <Info className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">{confirmData.title}</h3>
            <p className="text-gray-400 text-sm font-medium mb-10 leading-relaxed">{confirmData.message}</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmData.onConfirm} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-black transition-all">Yes, Confirm</button>
              <button onClick={() => setConfirmData(null)} className="w-full bg-gray-100 text-gray-500 py-5 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">Go Back</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E0;
        }
        body.modal-open {
          overflow: hidden !important;
        }
        
        @keyframes subtle-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        .animate-subtle-pulse {
          animation: subtle-pulse 2s infinite ease-in-out;
        }
      `}</style>
    </main>
  );
}
