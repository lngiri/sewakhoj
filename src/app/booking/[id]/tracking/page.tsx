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

    await supabase.from('messages').insert({
      booking_id: id,
      sender_id: currentUser.id,
      text: text
    });
  };

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
    <main className="min-h-screen bg-gray-50 flex flex-col font-inter">
      {/* MODERN STICKY HEADER */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 sticky top-0 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            <span className="font-black text-xl tracking-tight text-sewakhoj-red">SEWAKHOJ</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex bg-gray-100/50 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'tracking' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tracking
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MessageCircle className="w-4 h-4" /> Chat
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col max-w-2xl mx-auto w-full">
        {/* TRACKING TAB */}
        {activeTab === 'tracking' && (
          <div className="overflow-y-auto w-full pb-12">
            {/* Live Map */}
            <div className="h-56 w-full relative z-0">
              <MapComponent address={booking.address || "Kathmandu, Nepal"} />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-bold text-gray-800 flex items-center gap-2 z-[400]">
                {status === 'on-the-way' ? <><Navigation className="w-4 h-4 text-sewakhoj-red animate-pulse" /> Tasker is moving</> : 
                 status === 'completed' ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> Task finished</> : 
                 <><MapPin className="w-4 h-4 text-sewakhoj-red" /> {status === 'pending' ? 'Finding Tasker...' : 'Location set'}</>}
              </div>
            </div>

            <div className="px-4 -mt-6 relative z-10">
              {/* Profile Card */}
              {tasker && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                        {tUser?.avatar_url ? <img src={tUser.avatar_url} alt="Tasker avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-sewakhoj-red to-red-600 flex items-center justify-center text-white font-bold">{tUser?.full_name?.charAt(0)}</div>}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-900">{tUser?.full_name || "Tasker"}</h2>
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-medium mt-1">
                          <Star className="w-3 h-3 fill-yellow-400" /> {tasker.rating?.toFixed(1) || "New"} 
                          <span className="text-gray-400 mx-1">•</span> <span className="text-gray-600 capitalize">{tasker.transportation_mode}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={`https://wa.me/977${tUser?.phone?.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 shadow-sm transition-colors"
                        title="WhatsApp Tasker"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.544.917 3.41 1.403 5.316 1.404h.005c5.451 0 9.887-4.435 9.889-9.886.002-2.642-1.029-5.125-2.902-6.999-1.872-1.874-4.355-2.905-6.998-2.906-5.45 0-9.886 4.435-9.889 9.886-.001 1.93.513 3.818 1.488 5.44l-.989 3.614 3.705-.972zm12.193-7.531c-.328-.164-1.944-.959-2.242-1.069-.299-.11-.517-.164-.734.164-.218.328-.842 1.069-1.031 1.288-.19.218-.379.246-.708.082-.328-.164-1.386-.511-2.641-1.63-1.007-.898-1.688-2.007-1.885-2.335-.197-.328-.021-.505.143-.668.147-.148.328-.383.493-.574.164-.191.218-.328.328-.547.11-.219.055-.41-.027-.574-.082-.164-.734-1.769-1.006-2.426-.264-.639-.533-.553-.734-.563-.19-.01-.408-.011-.626-.011-.218 0-.571.082-.87.41-.299.328-1.143 1.12-1.143 2.732 0 1.612 1.17 3.169 1.333 3.388.164.219 2.303 3.515 5.578 4.922.779.335 1.387.535 1.86.687.782.248 1.494.213 2.056.129.626-.094 1.944-.795 2.216-1.558.272-.764.272-1.422.19-1.557-.081-.135-.298-.218-.626-.382z"/>
                        </svg>
                      </a>
                      <a href={`tel:${tUser?.phone}`} className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200"><Phone className="w-4 h-4 fill-current" /></a>
                    </div>
                  </div>
                </div>
              )}

              {/* Action: Leave Review */}
              {status === 'completed' && isCustomer && !hasReviewed && (
                <button onClick={() => setShowReviewModal(true)} className="w-full mb-6 bg-yellow-400 text-yellow-900 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-yellow-500 transition-colors">
                  <Star className="w-5 h-5 fill-current" /> Rate Your Tasker
                </button>
              )}
              {status === 'completed' && isCustomer && hasReviewed && (
                <div className="w-full mb-6 bg-green-50 text-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-green-200">
                  <CheckCircle2 className="w-5 h-5" /> Review Submitted
                </div>
              )}

              {/* Dispute Alert */}
              {isDisputed && (
                <div className="w-full mb-6 bg-red-50 text-red-700 p-4 rounded-xl font-medium border border-red-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Issue Reported</div>
                    <p className="text-xs opacity-80 mt-1">Our support team is reviewing this booking. We may contact you via phone or chat.</p>
                  </div>
                </div>
              )}

              {/* PROGRESS STEPPER */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-12">
                <h3 className="font-black text-gray-900 mb-8 uppercase tracking-widest text-[11px]">Booking Status</h3>
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-[1.45rem] top-4 bottom-10 w-[2px] bg-gray-100"></div>
                  
                  <div className="space-y-10 relative">
                    {steps.map((step, idx) => {
                      const stepStatus = getStepStatus(idx);
                      const isCurrent = stepStatus === 'current';
                      const isCompleted = stepStatus === 'completed';
                      const Icon = step.icon;
                      
                      return (
                        <div key={idx} className="flex items-center gap-6 group">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative z-10 transition-all duration-500 ${
                            isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 
                            isCurrent ? 'bg-sewakhoj-red text-white shadow-lg shadow-red-100 animate-pulse' : 
                            'bg-gray-100 text-gray-400'
                          }`}>
                            <Icon className={`w-5 h-5 ${isCurrent && idx !== 4 ? 'animate-bounce' : ''}`} />
                            {isCompleted && (
                              <div className="absolute -right-1 -top-1 bg-white rounded-full p-0.5">
                                <CheckCircle2 className="w-4 h-4 text-green-500 fill-white" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className={`font-black transition-colors ${isCurrent ? 'text-gray-900 text-lg' : isCompleted ? 'text-gray-700' : 'text-gray-300'}`}>
                              {step.label}
                            </h4>
                            {isCurrent && (
                              <p className="text-xs text-gray-500 font-medium mt-0.5">In progress...</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* REPORT ISSUE BUTTON (For Customers) */}
              {isCustomer && status !== 'completed' && status !== 'cancelled' && !isDisputed && (
                <button 
                  onClick={() => setShowDisputeModal(true)}
                  className="mt-6 w-full py-3 text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" /> Report an Issue / समस्या रिपोर्ट गर्नुहोस्
                </button>
              )}
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full bg-white relative w-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="text-center text-xs text-gray-400 my-4 bg-gray-50 py-2 rounded-lg">
                This chat is end-to-end monitored for your safety.<br/>Never share your password.
              </div>
              
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? 'bg-sewakhoj-red text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-red-200' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3 bg-white w-full">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
                  disabled={status === 'completed' || status === 'cancelled'}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || status === 'completed' || status === 'cancelled'}
                  className="w-12 h-12 bg-sewakhoj-red text-white rounded-full flex items-center justify-center hover:bg-sewakhoj-red-light disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
              {(status === 'completed' || status === 'cancelled') && (
                <p className="text-center text-xs text-red-500 mt-2">Chat is disabled because the job is {status}.</p>
              )}
            </div>
          </div>
        )}
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
    </main>
  );
}
