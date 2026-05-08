"use client";

import { useState, useEffect, use, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Navigation, Phone, Star, MessageCircle, Send, X, AlertTriangle, HelpCircle, User, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

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
  
  // Modal scroll lock effect
  useEffect(() => {
    if (showReviewModal || showDisputeModal || confirmData?.show) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showReviewModal, showDisputeModal, confirmData?.show]);

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
            <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full overflow-hidden p-4">
        {/* MOBILE TABS (Hidden on Desktop) */}
        <div className="md:hidden pb-4">
          <div className="flex bg-gray-100 p-1 rounded-xl relative">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${activeTab === 'chat' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
            ></div>
            <button 
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all relative z-10 ${activeTab === 'tracking' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tracking
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all relative z-10 flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MessageCircle className="w-4 h-4" /> Chat
            </button>
          </div>
        </div>

        {/* MAIN CONTENT GRID (2 Rows on Desktop) */}
        <div className="flex-1 grid grid-cols-1 md:grid-rows-2 gap-4 overflow-hidden h-full">
          
          {/* TRACKING SECTION (Top Row) */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${activeTab === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex-1 relative min-h-0">
               {/* Map container takes full row height */}
               <div className="absolute inset-0 z-0">
                 <MapComponent address={booking.address || "Kathmandu, Nepal"} />
               </div>
               
               {/* Overlay Content */}
               <div className="absolute inset-0 z-10 p-6 pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl text-sm font-black text-gray-900 flex items-center gap-3 border border-white pointer-events-auto">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      {status === 'on-the-way' ? "Tasker En Route" : status === 'completed' ? "Task Finished" : "Booking Live"}
                    </div>
                    
                    {tasker && (
                      <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white pointer-events-auto flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden border-2 border-white">
                          {tUser?.avatar_url ? <img src={tUser.avatar_url} alt="Tasker" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-sewakhoj-red flex items-center justify-center text-white font-bold">{tUser?.full_name?.charAt(0)}</div>}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-none">{tUser?.full_name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-[10px] font-bold text-gray-500">{tasker.rating?.toFixed(1)} Rating</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 border-l pl-3 ml-1">
                          <a href={`tel:${tUser?.phone}`} className="w-8 h-8 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-100 transition-colors"><Phone className="w-3.5 h-3.5" /></a>
                          <button onClick={() => setActiveTab('chat')} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors md:hidden"><MessageCircle className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto border border-gray-800">
                      {steps.map((step, idx) => {
                        const stepStatus = getStepStatus(idx);
                        const isCurrent = stepStatus === 'current';
                        const isCompleted = stepStatus === 'completed';
                        return (
                          <div key={idx} className="flex items-center gap-4">
                            <div className={`w-2.5 h-2.5 rounded-full ${isCompleted ? 'bg-green-400' : isCurrent ? 'bg-sewakhoj-red ring-4 ring-sewakhoj-red/30' : 'bg-gray-700'}`}></div>
                            {isCurrent && <span className="text-[10px] font-black uppercase tracking-widest">{step.label}</span>}
                            {idx < steps.length - 1 && !isCurrent && <div className="w-4 h-[1px] bg-gray-700"></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* CHAT SECTION (Bottom Row) */}
          <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 ${activeTab === 'tracking' ? 'hidden md:flex' : 'flex'}`}>
            {/* Header for Chat on Desktop */}
            <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Chat Support</span>
              </div>
              <span className="text-[10px] text-gray-400 font-bold">Encrypted Connection</span>
            </div>

            {/* Conversation Area - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                const status = msg.status || 'read';
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] relative ${isMe ? 'bg-sewakhoj-red text-white rounded-2xl rounded-br-none shadow-sm' : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none shadow-sm'} px-5 py-3`}>
                      <p className="text-[13px] leading-relaxed mb-1 pr-6">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1.5 h-3">
                        <span className={`text-[9px] font-bold ${isMe ? 'text-red-200/80' : 'text-gray-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <div className="flex items-center translate-y-[1px]">
                            {status === 'sent' && <svg className="w-2.5 h-2.5 text-red-200/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                            {status === 'delivered' && <div className="flex"><svg className="w-2.5 h-2.5 text-red-200/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg><svg className="w-2.5 h-2.5 text-red-200/60 -ml-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg></div>}
                            {status === 'read' && <div className="flex"><svg className="w-2.5 h-2.5 text-[#34B7F1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg><svg className="w-2.5 h-2.5 text-[#34B7F1] -ml-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg></div>}
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
            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
              <form onSubmit={sendMessage} className="flex items-center gap-3 max-w-4xl mx-auto">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={booking.status === 'completed' ? "Booking completed" : "Type a message..."} 
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-sewakhoj-red/5 transition-all font-medium"
                  disabled={booking.status === 'completed'}
                />
                <button type="submit" disabled={!newMessage.trim() || booking.status === 'completed'} className="w-12 h-12 bg-sewakhoj-red text-white rounded-2xl flex items-center justify-center hover:bg-sewakhoj-red-light disabled:opacity-50 transition-all shadow-lg active:scale-95 shrink-0"><Send className="w-5 h-5 translate-x-0.5" /></button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* TASKER ACTION BAR (Sticky Bottom) */}
      {isTasker && status !== 'completed' && status !== 'cancelled' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-50 flex justify-center">
          <div className="max-w-2xl w-full">
            {status === 'accepted' && (
              <button 
                onClick={() => updateStatus('on-the-way')}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4"
              >
                <Navigation className="w-6 h-6 animate-pulse" /> START JOURNEY (On the way)
              </button>
            )}
            {status === 'on-the-way' && (
              <button 
                onClick={() => updateStatus('in-progress')}
                className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4"
              >
                <MapPin className="w-6 h-6 animate-bounce" /> I HAVE ARRIVED (Start Work)
              </button>
            )}
            {status === 'in-progress' && (
              <button 
                onClick={() => updateStatus('completed')}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-3 animate-in slide-in-from-bottom-4"
              >
                <CheckCircle2 className="w-6 h-6" /> MARK AS COMPLETED
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dispute Modal */}
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

      {/* Review Modal */}
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
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className="focus:outline-none transform hover:scale-125 transition-all duration-300"
                >
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

      {/* TOAST NOTIFICATION */}
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

      {/* CONFIRMATION MODAL */}
      {confirmData?.show && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Info className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-2">{confirmData.title}</h3>
            <p className="text-gray-500 text-center text-sm mb-8 leading-relaxed">{confirmData.message}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmData.onConfirm}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-colors"
              >
                Yes, Proceed
              </button>
              <button 
                onClick={() => setConfirmData(null)}
                className="w-full bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
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
        
        /* Modal scroll lock */
        body.modal-open {
          overflow: hidden !important;
        }
      `}</style>
    </main>
  );
}
