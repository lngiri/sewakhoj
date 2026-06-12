"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { services as serviceData } from "@/data/services";
import {
  Briefcase,
  Wallet,
  CheckCircle2,
} from "lucide-react";

interface Booking {
  id: string;
  service: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_amount: number;
  address: string;
  customer_id: string;
  tasker_id: string;
  users?: {
    full_name: string;
    phone: string;
    avatar_url: string;
  };
}

export default function TaskerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard/tasker");
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: tData } = await supabase
        .from('taskers')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!tData) {
        router.push('/tasker/onboard');
        return;
      }

      const { data: bData } = await supabase
        .from('bookings')
        .select(`*, users!bookings_customer_id_fkey(full_name, phone, avatar_url)`)
        .eq('tasker_id', tData.id)
        .order('created_at', { ascending: false });

      if (bData) setBookings(bData);

      const completed = bData?.filter((b: any) => b.status === 'completed') || [];
      const active = bData?.filter((b: any) => !['completed', 'cancelled'].includes(b.status)) || [];

      setStats({
        active: active.length,
        completed: completed.length,
        totalEarnings: 0,
        pendingEarnings: 0,
      });
    } catch (err) {
      console.error("Tasker Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" variant="brand" />
        <p className="font-black text-slate-900 uppercase tracking-widest text-xs animate-pulse">Loading Tasker Dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <PageHeader
            title="Tasker Dashboard"
            description="Manage your bookings and earnings"
            showBack={false}
            className="mb-0 [&_.title-wrapper]:hidden p-0 bg-transparent"
          />
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <TaskerDashboardContent bookings={bookings} stats={stats} />
      </div>
    </div>
  );
}

function TaskerDashboardContent({ bookings, stats }: { bookings: Booking[]; stats: any }) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const filteredBookings = bookings.filter(b =>
    activeTab === 'active' ? !['completed', 'cancelled'].includes(b.status) : b.status === 'completed'
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Briefcase />} label="Active Jobs" value={stats.active} color="blue" />
        <StatCard icon={<CheckCircle2 />} label="Completed" value={stats.completed} color="green" />
        <StatCard icon={<Wallet />} label="Total Earnings" value={`Rs ${stats.totalEarnings}`} color="purple" />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          {activeTab === 'active' ? 'Active Jobs' : 'Completed Jobs'}
        </h3>
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBookings.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-slate-200">
            <Briefcase className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {activeTab === 'active' ? 'No Active Jobs' : 'No Completed Jobs'}
            </h3>
            <p className="text-slate-500 font-bold max-w-sm mx-auto">
              {activeTab === 'active'
                ? 'Accept bookings to see them here. Customers will contact you to schedule services.'
                : 'Complete jobs to see them here. Add reviews and ratings for each completed service.'}
            </p>
          </div>
        ) : filteredBookings.map((b: any) => (
          <div key={b.id} className="bg-white rounded-[32px] border border-slate-100 p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                {serviceData.find(s => s.id === b.service)?.emoji || '🔧'}
              </div>
              <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-50 text-slate-600 border border-slate-100`}>{b.status}</span>
            </div>

            <h4 className="text-xl font-black text-slate-900 mb-2 truncate">{serviceData.find(s => s.id === b.service)?.nameEn || b.service}</h4>
            <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6 leading-relaxed">
              📅 {b.booking_date} • {b.booking_time}<br/>
              📍 {b.address}
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase">Customer</p>
                <p className="text-sm font-black text-slate-900 truncate">{b.users?.full_name || 'Customer'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-900">Rs {b.total_amount}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Budget</p>
              </div>
            </div>

            {activeTab === 'active' && (
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sewakhoj-red transition-all shadow-lg active:scale-95">
                  Confirm Arrival
                </button>
                <button className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
                  Start Job
                </button>
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-3">
                <button className="w-full py-3 bg-white border border-green-200 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-50 transition-all shadow-sm">
                  Add Review
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 hover:shadow-xl transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{label}</p><p className="text-2xl font-black text-slate-900">{value}</p></div>
    </div>
  );
}
