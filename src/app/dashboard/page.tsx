"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/data/services";
import { XCircle, CheckCircle2, Navigation, MapPin } from "lucide-react";

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
  const [taskerBookings, setTaskerBookings] = useState<any[]>([]);
  const [taskerProfile, setTaskerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customer' | 'tasker'>('customer');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    } else if (user) {
      if (user.user_metadata?.role === 'tasker') {
        setActiveTab('tasker');
      }
      fetchData();
    }
  }, [user, authLoading, router]);

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
    
    // If completing the task, calculate commission
    if (newStatus === 'completed') {
      const booking = taskerBookings.find(b => b.id === bookingId);
      if (booking) {
        // Fetch commission rate
        const { data: settings } = await supabase.from('platform_settings').select('commission_rate_percentage').single();
        const rate = settings ? settings.commission_rate_percentage : 10;
        
        const total = booking.total_amount;
        const commission = (total * rate) / 100;
        
        // If cash, Tasker owes us (receivable). If online, we owe Tasker (payable).
        const ledgerType = booking.payment_method === 'cash' ? 'receivable' : 'payable';

        await supabase.from('commission_ledger').insert({
          booking_id: booking.id,
          tasker_id: booking.tasker_id,
          total_amount: total,
          commission_amount: commission,
          payment_method: booking.payment_method,
          type: ledgerType,
          status: 'pending'
        });
      }
    }

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
              My Requests (As Customer)
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
                            <p><strong>Customer:</strong> {booking.users?.full_name} ({booking.users?.phone})</p>
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
                    
                    {job.status === 'accepted' && job.taskers?.users && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 w-full md:w-auto">
                        <p className="text-xs text-green-800 font-bold mb-1">Accepted By:</p>
                        <p className="text-sm font-semibold">{job.taskers.users.full_name}</p>
                        <p className="text-sm">📞 {job.taskers.users.phone}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
