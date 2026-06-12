"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { services as serviceData } from "@/data/services";
import {
  Briefcase,
  Wallet,
  CheckCircle2,
  ArrowRight,
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
  taskers?: {
    users?: {
      full_name: string;
      phone: string;
      avatar_url: string;
    }
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [hasTaskerRole, setHasTaskerRole] = useState(false);
  const [isTaskerView, setIsTaskerView] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
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
      const confirmedIsTasker = !!tData;
      setHasTaskerRole(confirmedIsTasker);

      if (confirmedIsTasker && tData) {
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

        setIsTaskerView(true);
      } else {
        const { data: bData } = await supabase
          .from('bookings')
          .select(`*, taskers(users(full_name, phone, avatar_url))`)
          .eq('customer_id', user?.id)
          .order('created_at', { ascending: false });
        if (bData) setBookings(bData as any);

        setIsTaskerView(false);
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" variant="brand" />
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs animate-pulse">Initializing Dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-inter">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <PageHeader
            title={isTaskerView ? "Tasker Dashboard" : "Customer Dashboard"}
            description={isTaskerView ? "Manage your bookings and earnings" : "View your bookings and services"}
            showBack={false}
            className="mb-0 [&_.title-wrapper]:hidden p-0 bg-transparent"
          />
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        {isTaskerView ? (
          <TaskerDashboard bookings={bookings} stats={stats} />
        ) : (
          <CustomerDashboard bookings={bookings} />
        )}
      </div>
    </div>
  );
}

function TaskerDashboard({ bookings, stats }: { bookings: Booking[]; stats: any }) {
  const recentBookings = bookings.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Briefcase />} label="Active Jobs" value={stats.active} color="blue" />
        <StatCard icon={<CheckCircle2 />} label="Completed" value={stats.completed} color="green" />
        <StatCard icon={<Wallet />} label="Total Earnings" value={`Rs ${stats.totalEarnings}`} color="purple" />
      </div>

      <div>
        <h3 className="text-2xl font-black text-gray-900 mb-6">Recent Jobs</h3>
        <div className="space-y-4">
          {recentBookings.length > 0 ? recentBookings.map((b: any) => (
            <div key={b.id} className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">
                  {serviceData.find(s => s.id === b.service)?.emoji || '🔧'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 truncate">{serviceData.find(s => s.id === b.service)?.nameEn || b.service}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-gray-500">📅 {b.booking_date}</span>
                    <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{b.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">Rs {b.total_amount}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Budget</p>
                </div>
              </div>
            </div>
          )) : <p className="text-gray-400 font-bold p-10 text-center bg-white rounded-2xl border border-dashed">No recent jobs</p>}
        </div>
      </div>
    </div>
  );
}

function CustomerDashboard({ bookings }: { bookings: Booking[] }) {
  const recentBookings = bookings.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-black text-gray-900 mb-6">Your Bookings</h3>
        <div className="space-y-4">
          {recentBookings.length > 0 ? recentBookings.map((b: any) => (
            <div key={b.id} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-sewakhoj-red/30 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">
                  {serviceData.find(s => s.id === b.service)?.emoji || '🔧'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 truncate">{serviceData.find(s => s.id === b.service)?.nameEn || b.service}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-gray-500">📅 {b.booking_date}</span>
                    <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{b.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">Rs {b.total_amount}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Budget</p>
                </div>
              </div>
            </div>
          )) : <p className="text-gray-400 font-bold p-10 text-center bg-white rounded-2xl border border-dashed">No bookings yet</p>}
        </div>
      </div>

      <div className="bg-gradient-to-r from-sewakhoj-red to-red-600 rounded-2xl p-8 text-white">
        <h3 className="text-xl font-black mb-2">Ready to Book a Service?</h3>
        <p className="text-red-100 mb-6">Browse verified taskers in your area</p>
        <Link
          href="/browse"
          className="bg-white text-sewakhoj-red px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all shadow-lg inline-block text-center"
        >
          Find a Pro
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:shadow-xl transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div><p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{label}</p><p className="text-2xl font-black text-gray-900">{value}</p></div>
    </div>
  );
}
