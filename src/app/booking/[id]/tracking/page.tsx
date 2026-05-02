"use client";

import { useState, useEffect, use, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CheckCircle2, Clock, MapPin, Navigation, Phone, Star, MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), { ssr: false });

interface TrackingPageProps {
  params: Promise<{ id: string }>;
}

export default function TrackingPage({ params }: TrackingPageProps) {
  const { id } = use(params);
  const router = useRouter();
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
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

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  useEffect(() => {
    if (!booking) return;

    // Subscribe to booking status updates
    const bookingChannel = supabase
      .channel(`public:bookings:id=eq.${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        (payload) => {
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
        (payload) => {
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
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

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
      if (user) {
        const { count } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('booking_id', id)
          .eq('customer_id', user.id);
        if (count && count > 0) setHasReviewed(true);
      }
    }
    setLoading(false);
  }

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
    } else {
      alert("Failed to submit review");
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

  const getStepStatus = (stepIndex: number) => {
    const statuses = ['pending', 'accepted', 'on-the-way', 'in-progress', 'completed'];
    const normalizedStatus = status === 'arrived' ? 'in-progress' : status;
    const currentIndex = statuses.indexOf(normalizedStatus);
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const steps = [
    { label: "Request Sent", icon: Clock },
    { label: "Tasker Accepted", icon: CheckCircle2 },
    { label: "On the Way", icon: Navigation },
    { label: "In Progress", icon: MapPin },
    { label: "Completed", icon: Star }
  ];

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-sm z-10 sticky top-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-800" />
            </Link>
            <h1 className="font-bold text-lg text-gray-900">Job {booking.id.slice(0,6)}</h1>
            <div className="w-10"></div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('tracking')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'tracking' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Live Tracking
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
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
                        {tUser?.avatar_url ? <img src={tUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-sewakhoj-red to-red-600 flex items-center justify-center text-white font-bold">{tUser?.full_name?.charAt(0)}</div>}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-gray-900">{tUser?.full_name || "Tasker"}</h2>
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-medium mt-1">
                          <Star className="w-3 h-3 fill-yellow-400" /> {tasker.rating?.toFixed(1) || "New"} 
                          <span className="text-gray-400 mx-1">•</span> <span className="text-gray-600 capitalize">{tasker.transportation_mode}</span>
                        </div>
                      </div>
                    </div>
                    <a href={`tel:${tUser?.phone}`} className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200"><Phone className="w-4 h-4 fill-current" /></a>
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

              {/* Stepper */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-6">Booking Status</h3>
                <div className="relative">
                  <div className="absolute left-[1.15rem] top-4 bottom-8 w-0.5 bg-gray-200"></div>
                  <div className="space-y-6 relative">
                    {steps.map((step, idx) => {
                      const stepStatus = getStepStatus(idx);
                      const isCurrent = stepStatus === 'current';
                      const isCompleted = stepStatus === 'completed';
                      const Icon = step.icon;
                      return (
                        <div key={idx} className={`flex items-start gap-4 ${isCurrent ? 'opacity-100' : isCompleted ? 'opacity-70' : 'opacity-40'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 border-4 border-white shadow-sm transition-colors ${isCompleted ? 'bg-sewakhoj-green text-white' : isCurrent ? 'bg-sewakhoj-red text-white' : 'bg-gray-200 text-gray-500'}`}>
                            <Icon className={`w-4 h-4 ${isCurrent && idx !== 4 ? 'animate-bounce' : ''}`} />
                          </div>
                          <div className="pt-2">
                            <h4 className={`font-bold ${isCurrent ? 'text-gray-900' : 'text-gray-700'}`}>{step.label}</h4>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
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

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setShowReviewModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Rate your Tasker</h3>
              <p className="text-gray-600 text-sm">How was your experience with {tUser?.full_name}?</p>
            </div>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className="focus:outline-none transform hover:scale-110 transition-transform"
                >
                  <Star className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Leave a comment (Optional)</label>
              <textarea 
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
                placeholder="They did a great job fixing my sink..."
              ></textarea>
            </div>

            <button 
              onClick={submitReview}
              disabled={rating === 0 || submittingReview}
              className="w-full bg-sewakhoj-red text-white py-4 rounded-xl font-bold hover:bg-sewakhoj-red-light disabled:opacity-50 transition-colors"
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
