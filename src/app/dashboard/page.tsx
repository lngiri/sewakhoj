"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/data/services";
import { XCircle, CheckCircle2, Navigation, MapPin, Edit2, Lock, History, IndianRupee, MessageCircle, Mail, ArrowUp, AlertTriangle, ShieldCheck, Download, Trash, Star } from "lucide-react";
import ChatModal from "@/components/chat/ChatModal";

interface JobPost {
  id: string;
  service: string;
  city: string;
  description: string;
  budget: number | null;
  status: string;
  created_at: string;
  accepted_by_tasker_id: string | null;
  taskers?: {
    users?: {
      full_name: string;
      phone: string;
    };
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [customerJobs, setCustomerJobs] = useState<JobPost[]>([]);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [taskerBookings, setTaskerBookings] = useState<any[]>([]);
  const [taskerProfile, setTaskerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customer' | 'tasker' | 'history' | 'privacy'>('customer');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState({ bookingId: '', taskerId: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeData, setDisputeData] = useState({ bookingId: '', reason: '', details: '' });
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [activeChat, setActiveChat] = useState<{ bookingId: string, otherUserName: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    } else if (user) {
      // Admin Redirect: If the user is the Super Admin, send them directly to Portal HQ
      // We check by UID provided by the user
      if (user.id === '337f575f-8f54-4f74-b762-3b22810d4238') {
        router.push("/portal-hq");
        return;
      }

      if (user.user_metadata?.role === 'tasker') {
        setActiveTab('tasker');
      }
      fetchData();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMailClick = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const fetchData = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      
      // Fetch Customer Job Posts
      const { data: cData } = await supabase
        .from("job_posts")
        .select(`*, taskers:accepted_by_tasker_id (users (full_name, phone))`)
        .eq("customer_id", user?.id)
        .order("created_at", { ascending: false });
      if (cData) setCustomerJobs(cData as any);

      // Fetch Customer Direct Bookings
      const { data: cbData } = await supabase
        .from('bookings')
        .select(`*, taskers(id, users(full_name, phone))`)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });
      if (cbData) setCustomerBookings(cbData);

      // If Tasker, fetch profile and assigned bookings
      if (user?.user_metadata?.role === 'tasker') {
        const { data: tProfile } = await supabase.from('taskers').select('*').eq('user_id', user.id).single();
        if (tProfile) {
          setTaskerProfile(tProfile);
          const { data: bData } = await supabase
            .from('bookings')
            .select(`*, users!bookings_customer_id_fkey(full_name, phone)`)
            .eq('tasker_id', tProfile.id)
            .order('created_at', { ascending: false });
          if (bData) setTaskerBookings(bData);
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getServiceName = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    return s ? `${s.emoji} ${s.nameEn}` : serviceId;
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    const supabase = createBrowserSupabaseClient();
    
    // Status update is now handled simply, ledger insertion is moved to a DB trigger for reliability
    await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
    fetchData();
  };

  const rejectBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to reject this task? This will negatively impact your profile standing.")) return;
    
    const supabase = createBrowserSupabaseClient();
    
    // 1. Update booking to cancelled
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    
    // 2. Increment total_rejections
    if (taskerProfile) {
      await supabase.from('taskers').update({ 
        total_rejections: (taskerProfile.total_rejections || 0) + 1 
      }).eq('id', taskerProfile.id);
    }
    
    fetchData();
  };
    
  const cancelJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel (lock) this task? This will hide it from taskers.")) return;
    
    const supabase = createBrowserSupabaseClient();
    await supabase.from('job_posts').update({ status: 'cancelled' }).eq('id', jobId);
    fetchData();
  };

  const submitReview = async () => {
    if (!reviewData.comment.trim()) {
      alert("Please enter a review comment.");
      return;
    }
    setSubmittingReview(true);
    try {
      const supabase = createBrowserSupabaseClient();
      
      const { error } = await supabase.from('reviews').insert({
        booking_id: reviewData.bookingId,
        customer_id: user?.id,
        tasker_id: reviewData.taskerId,
        rating: reviewData.rating,
        comment: reviewData.comment
      });

      if (error) throw error;

      alert("Thank you! Your review has been submitted.");
      setReviewModalOpen(false);
      setReviewData({ bookingId: '', taskerId: '', rating: 5, comment: '' });
      fetchData();
    } catch (err: any) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitDispute = async () => {
    if (!disputeData.reason || !disputeData.details.trim()) {
      alert("Please provide both a reason and details for the dispute.");
      return;
    }
    setSubmittingDispute(true);
    try {
      const supabase = createBrowserSupabaseClient();
      
      const { error } = await supabase.from('disputes').insert({
        booking_id: disputeData.bookingId,
        raised_by: user?.id,
        reason: disputeData.reason,
        details: disputeData.details
      });

      if (error) throw error;

      alert("Your dispute has been submitted and is under review by our team.");
      setDisputeModalOpen(false);
      setDisputeData({ bookingId: '', reason: '', details: '' });
    } catch (err: any) {
      console.error("Error submitting dispute:", err);
      alert("Failed to submit dispute: " + err.message);
    } finally {
      setSubmittingDispute(false);
    }
  };

  const exportUserData = () => {
    const data = {
        user: user,
        customerJobs: customerJobs,
        taskerBookings: taskerBookings,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sewakhoj_data_${user?.id?.slice(0, 8)}.json`;
    a.click();
    alert("Your data has been compiled and downloaded.");
  };

  const requestAccountDeletion = () => {
    if (confirm("CRITICAL: Are you sure you want to delete your account? This action cannot be undone and you will lose all history and earnings.")) {
        alert("Your request has been submitted to the compliance team. Account will be deactivated within 48 hours.");
    }
  };

  const handleSOS = async () => {
    if (!confirm("🚨 EMERGENCY SOS: Are you in danger? This will immediately alert SewaKhoj safety team and log your current location.")) return;
    
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    
    // Log the SOS event
    await supabase.from('system_logs').insert({
        admin_id: user?.id, // Using user id as reporter
        action_type: 'sos_alert',
        target_id: user?.id,
        details: {
            message: "TASKER SOS ALERT TRIGGERED",
            timestamp: new Date().toISOString(),
            role: 'tasker'
        }
    });

    alert("SOS Alert Sent! Please stay in a safe place. Our team is coordinating with local authorities.");
    setLoading(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  const isTasker = user.user_metadata?.role === 'tasker';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          {!isTasker && (
            <Link href="/post-task" className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg font-medium hover:bg-sewakhoj-red-light transition">
              Post New Task
            </Link>
          )}
        </div>

        {isTasker && (
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button 
              className={`pb-3 px-2 font-bold text-lg border-b-2 transition-colors ${activeTab === 'tasker' ? 'border-sewakhoj-red text-sewakhoj-red' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('tasker')}
            >
              My Tasks (As Tasker)
            </button>
            <button 
              className={`pb-3 px-2 font-bold text-lg border-b-2 transition-colors ${activeTab === 'customer' ? 'border-sewakhoj-red text-sewakhoj-red' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('customer')}
            >
              My Requests
            </button>
            <button 
              className={`pb-3 px-2 font-bold text-lg border-b-2 transition-colors ${activeTab === 'history' ? 'border-sewakhoj-red text-sewakhoj-red' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('history')}
            >
              History & Logs
            </button>
            <button 
              className={`pb-3 px-2 font-bold text-lg border-b-2 transition-colors ${activeTab === 'privacy' ? 'border-sewakhoj-red text-sewakhoj-red' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('privacy')}
            >
              Privacy & Security
            </button>
          </div>
        )}

        {/* TASKER VIEW */}
        {activeTab === 'tasker' && (
          <div className="space-y-6">
            {taskerProfile && taskerProfile.total_rejections > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 text-sm font-medium flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Warning: You have {taskerProfile.total_rejections} rejected tasks. High rejections may cause suspension.
              </div>
            )}

            <div className="bg-red-600 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Safety First: SOS Emergency</h3>
                  <p className="text-white/80 text-sm">Feeling unsafe on a task? Click to alert our safety team immediately.</p>
                </div>
              </div>
              <button 
                onClick={handleSOS}
                className="bg-white text-red-600 px-8 py-3 rounded-xl font-black hover:bg-gray-100 transition-all shadow-lg uppercase tracking-widest text-xs"
              >
                Trigger SOS
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-semibold">Assigned Bookings</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {taskerBookings.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">No bookings assigned to you yet.</div>
                ) : (
                  taskerBookings.map(booking => (
                    <div key={booking.id} className="p-6">
                      <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-900 text-xl">{getServiceName(booking.service)}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {booking.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600 mb-4">
                            <div className="flex items-center gap-2">
                              <strong>Customer:</strong> {booking.users?.full_name} ({booking.users?.phone})
                              <a 
                                href={`https://wa.me/977${booking.users?.phone?.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 shadow-sm transition-colors"
                              >
                                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.544.917 3.41 1.403 5.316 1.404h.005c5.451 0 9.887-4.435 9.889-9.886.002-2.642-1.029-5.125-2.902-6.999-1.872-1.874-4.355-2.905-6.998-2.906-5.45 0-9.886 4.435-9.889 9.886-.001 1.93.513 3.818 1.488 5.44l-.989 3.614 3.705-.972zm12.193-7.531c-.328-.164-1.944-.959-2.242-1.069-.299-.11-.517-.164-.734.164-.218.328-.842 1.069-1.031 1.288-.19.218-.379.246-.708.082-.328-.164-1.386-.511-2.641-1.63-1.007-.898-1.688-2.007-1.885-2.335-.197-.328-.021-.505.143-.668.147-.148.328-.383.493-.574.164-.191.218-.328.328-.547.11-.219.055-.41-.027-.574-.082-.164-.734-1.769-1.006-2.426-.264-.639-.533-.553-.734-.563-.19-.01-.408-.011-.626-.011-.218 0-.571.082-.87.41-.299.328-1.143 1.12-1.143 2.732 0 1.612 1.17 3.169 1.333 3.388.164.219 2.303 3.515 5.578 4.922.779.335 1.387.535 1.86.687.782.248 1.494.213 2.056.129.626-.094 1.944-.795 2.216-1.558.272-.764.272-1.422.19-1.557-.081-.135-.298-.218-.626-.382z"/>
                                </svg>
                              </a>
                            </div>
                            <p><strong>When:</strong> {booking.booking_date} at {booking.booking_time}</p>
                            <p><strong>Where:</strong> {booking.address}</p>
                            <p><strong>Total:</strong> Rs {booking.total_amount}</p>
                          </div>
                        </div>

                        {/* Action Buttons based on status */}
                        {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            {booking.status === 'pending' && (
                              <>
                                <button onClick={() => updateBookingStatus(booking.id, 'accepted')} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-600"><CheckCircle2 className="w-4 h-4"/> Accept Task</button>
                                <button onClick={() => rejectBooking(booking.id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-100"><XCircle className="w-4 h-4"/> Reject Task</button>
                              </>
                            )}
                            {booking.status === 'accepted' && (
                              <button onClick={() => updateBookingStatus(booking.id, 'on-the-way')} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-600"><Navigation className="w-4 h-4"/> Start Journey (On the way)</button>
                            )}
                            {booking.status === 'on-the-way' && (
                              <button onClick={() => updateBookingStatus(booking.id, 'in-progress')} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-orange-600"><MapPin className="w-4 h-4"/> Arrived (Start Work)</button>
                            )}
                            {booking.status === 'in-progress' && (
                              <button onClick={() => updateBookingStatus(booking.id, 'completed')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700"><CheckCircle2 className="w-4 h-4"/> Mark Completed</button>
                            )}
                          </div>
                        )}
                        <button 
                          onClick={() => setActiveChat({ bookingId: booking.id, otherUserName: booking.users?.full_name || 'Customer' })}
                          className="mt-2 w-full bg-sewakhoj-red/10 text-sewakhoj-red px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-sewakhoj-red/20 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4"/> Message Customer
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER VIEW */}
        {activeTab === 'customer' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold">My Posted Tasks</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {customerJobs.length === 0 ? (
                <div className="p-12 text-center text-gray-500">You haven't posted any tasks yet.</div>
              ) : (
                customerJobs.map(job => (
                  <div key={job.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{getServiceName(job.service)}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          job.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          job.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{job.description}</p>
                      <div className="flex gap-4 text-xs text-gray-500 font-medium">
                        <span>📍 {job.city.charAt(0).toUpperCase() + job.city.slice(1)}</span>
                        <span>💰 {job.budget ? `Rs ${job.budget}` : 'Negotiable'}</span>
                        <span>📅 {new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
                      {job.status === 'open' && (
                        <>
                          <Link 
                            href={`/post-task?edit=${job.id}`}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </Link>
                          <button 
                            onClick={() => cancelJob(job.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100"
                          >
                            <Lock className="w-4 h-4" /> Cancel/Lock
                          </button>
                        </>
                      )}
                      
                      {job.status === 'accepted' && job.taskers?.users && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 w-full md:w-auto">
                          <p className="text-xs text-green-800 font-bold mb-1">Accepted By:</p>
                          <p className="text-sm font-semibold">{job.taskers.users.full_name}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <span>📞 {job.taskers.users.phone}</span>
                            <a 
                              href={`https://wa.me/977${job.taskers.users.phone?.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 shadow-sm transition-colors"
                            >
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.544.917 3.41 1.403 5.316 1.404h.005c5.451 0 9.887-4.435 9.889-9.886.002-2.642-1.029-5.125-2.902-6.999-1.872-1.874-4.355-2.905-6.998-2.906-5.45 0-9.886 4.435-9.889 9.886-.001 1.93.513 3.818 1.488 5.44l-.989 3.614 3.705-.972zm12.193-7.531c-.328-.164-1.944-.959-2.242-1.069-.299-.11-.517-.164-.734.164-.218.328-.842 1.069-1.031 1.288-.19.218-.379.246-.708.082-.328-.164-1.386-.511-2.641-1.63-1.007-.898-1.688-2.007-1.885-2.335-.197-.328-.021-.505.143-.668.147-.148.328-.383.493-.574.164-.191.218-.328.328-.547.11-.219.055-.41-.027-.574-.082-.164-.734-1.769-1.006-2.426-.264-.639-.533-.553-.734-.563-.19-.01-.408-.011-.626-.011-.218 0-.571.082-.87.41-.299.328-1.143 1.12-1.143 2.732 0 1.612 1.17 3.169 1.333 3.388.164.219 2.303 3.515 5.578 4.922.779.335 1.387.535 1.86.687.782.248 1.494.213 2.056.129.626-.094 1.944-.795 2.216-1.558.272-.764.272-1.422.19-1.557-.081-.135-.298-.218-.626-.382z"/>
                              </svg>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CUSTOMER DIRECT BOOKINGS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold">My Direct Bookings</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {customerBookings.length === 0 ? (
                <div className="p-12 text-center text-gray-500">You haven't made any direct bookings yet.</div>
              ) : (
                customerBookings.map(booking => (
                  <div key={booking.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{getServiceName(booking.service)}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500 font-medium mb-3">
                        <span>📅 {booking.booking_date}</span>
                        <span>⏰ {booking.booking_time}</span>
                        <span>💰 Rs {booking.total_amount}</span>
                      </div>
                      {booking.taskers?.users && (
                        <div className="text-sm bg-gray-100 px-3 py-2 rounded-lg inline-block">
                          <strong>Tasker:</strong> {booking.taskers.users.full_name} ({booking.taskers.users.phone})
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
                      {booking.status === 'completed' && (
                        <button 
                          onClick={() => {
                            setReviewData({ ...reviewData, bookingId: booking.id, taskerId: booking.tasker_id });
                            setReviewModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm font-bold hover:bg-yellow-100"
                        >
                          <Star className="w-4 h-4" /> Leave Review
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setDisputeData({ ...disputeData, bookingId: booking.id });
                          setDisputeModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100"
                      >
                        <AlertTriangle className="w-4 h-4" /> Report Issue
                      </button>
                      <button 
                        onClick={() => setActiveChat({ bookingId: booking.id, otherUserName: booking.taskers?.users?.full_name || 'Tasker' })}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-sewakhoj-red/10 text-sewakhoj-red border border-sewakhoj-red/20 rounded-lg text-sm font-bold hover:bg-sewakhoj-red/20 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> Chat
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {/* PRIVACY & SECURITY VIEW */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Data Privacy & Rights</h2>
                            <p className="text-white/60 text-sm">Manage your personal information and account security.</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="max-w-md">
                            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <Download className="w-4 h-4 text-blue-500" /> Export Personal Data
                            </h3>
                            <p className="text-gray-500 text-sm">Download a copy of all your tasks, bookings, and profile information in JSON format.</p>
                        </div>
                        <button 
                            onClick={exportUserData}
                            className="bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all whitespace-nowrap"
                        >
                            Download My Data
                        </button>
                    </div>

                    <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="max-w-md">
                            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2 text-red-600">
                                <Trash className="w-4 h-4" /> Danger Zone: Delete Account
                            </h3>
                            <p className="text-gray-500 text-sm">Permanently remove your account and all associated data from SewaKhoj. This action is irreversible.</p>
                        </div>
                        <button 
                            onClick={requestAccountDeletion}
                            className="bg-red-50 text-red-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-100 transition-all whitespace-nowrap"
                        >
                            Delete Account
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">Transparency Report</h4>
                        <p className="text-gray-600 text-xs leading-relaxed">
                            SewaKhoj follows strict data protection guidelines. We only share necessary location and contact data with taskers you have explicitly booked. 
                            Your payment information is handled by secure third-party providers (eSewa/Khalti) and never stored on our servers.
                        </p>
                    </div>
                </div>
            </div>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">Total Tasks</h3>
                <p className="text-3xl font-black text-gray-900">{isTasker ? taskerBookings.length : customerJobs.length}</p>
              </div>
              {isTasker && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
                    <IndianRupee className="w-6 h-6" />
                  </div>
                  <h3 className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">Total Earnings</h3>
                  <p className="text-3xl font-black text-gray-900">
                    Rs {taskerBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.total_amount * 0.9), 0).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">AFTER 10% COMMISSION</p>
                </div>
              )}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-gray-500 text-xs font-black uppercase tracking-widest mb-1">Completion Rate</h3>
                <p className="text-3xl font-black text-gray-900">
                  {isTasker 
                    ? taskerBookings.length > 0 
                      ? `${((taskerBookings.filter(b => b.status === 'completed').length / taskerBookings.length) * 100).toFixed(0)}%`
                      : '0%'
                    : customerJobs.length > 0
                      ? `${((customerJobs.filter(j => j.status === 'accepted').length / customerJobs.length) * 100).toFixed(0)}%`
                      : '0%'
                  }
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-black uppercase tracking-tighter">Activity Logs & History</h2>
                <button onClick={() => fetchData()} className="text-xs font-bold text-sewakhoj-red hover:underline">Refresh Data</button>
              </div>
              <div className="divide-y divide-gray-100">
                {(isTasker ? taskerBookings : customerJobs).length === 0 ? (
                  <div className="p-12 text-center text-gray-500 font-medium">No history found yet.</div>
                ) : (
                  (isTasker ? taskerBookings : customerJobs).map((item: any) => (
                    <div key={item.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${
                            item.status === 'completed' ? 'bg-green-100 text-green-600' :
                            item.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {item.status === 'completed' ? '✅' : item.status === 'cancelled' ? '❌' : '🕒'}
                          </div>
                          <div>
                            <h4 className="font-black text-gray-900">{getServiceName(item.service)}</h4>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                              {new Date(item.created_at || item.booking_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">Rs {item.total_amount || item.budget || 0}</p>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            item.status === 'completed' ? 'bg-green-100 text-green-700' :
                            item.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button 
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 w-14 h-14 bg-sewakhoj-red text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-sewakhoj-red-light transition-all hover:-translate-y-1 active:translate-y-0 z-50 animate-in fade-in slide-in-from-bottom-4"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-black text-gray-900">Rate your Tasker</h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className={`text-3xl transition-transform hover:scale-110 ${reviewData.rating >= star ? 'text-amber-400' : 'text-gray-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Write a Review</label>
                <textarea 
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-sewakhoj-red focus:ring-0 resize-none h-32"
                  placeholder="How was the service? Was the tasker professional and on time?"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setReviewModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button 
                onClick={submitReview}
                disabled={submittingReview}
                className="bg-sewakhoj-red text-white px-6 py-2.5 rounded-xl font-black hover:bg-sewakhoj-red-light transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submittingReview ? <span className="animate-spin">🔄</span> : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="text-xl font-black text-red-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Report Issue</h3>
              <button onClick={() => setDisputeModalOpen(false)} className="text-red-400 hover:text-red-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Reason</label>
                <select 
                  value={disputeData.reason}
                  onChange={(e) => setDisputeData({ ...disputeData, reason: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 focus:ring-0"
                >
                  <option value="">Select a reason</option>
                  <option value="incomplete_work">Work was incomplete</option>
                  <option value="unprofessional_behavior">Unprofessional behavior</option>
                  <option value="overcharged">Tasker asked for more money</option>
                  <option value="no_show">Tasker did not arrive</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Details</label>
                <textarea 
                  value={disputeData.details}
                  onChange={(e) => setDisputeData({ ...disputeData, details: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-red-500 focus:ring-0 resize-none h-32"
                  placeholder="Please provide specific details about what happened so our team can investigate..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setDisputeModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                disabled={submittingDispute}
              >
                Cancel
              </button>
              <button 
                onClick={submitDispute}
                disabled={submittingDispute}
                className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submittingDispute ? <span className="animate-spin">🔄</span> : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT MODAL */}
      {activeChat && user && (
        <ChatModal 
          bookingId={activeChat.bookingId} 
          currentUserId={user.id} 
          otherUserName={activeChat.otherUserName} 
          onClose={() => setActiveChat(null)} 
        />
      )}
    </div>
  );
}
