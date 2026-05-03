"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Activity,
  Zap,
  Globe,
  Shield,
  MapPin
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTaskers: 0,
    pendingTaskers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeJobs: 0,
    unsettledCommissions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        { count: usersCount },
        { count: taskersCount },
        { count: pendingCount },
        { count: bookingsCount },
        { data: revenueData },
        { count: activeJobsCount },
        { count: unsettledCount }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('taskers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('taskers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('commission_ledger').select('commission_amount'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'in-progress']),
        supabase.from('commission_ledger').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      const revenue = revenueData?.reduce((sum, item) => sum + Number(item.commission_amount), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalTaskers: taskersCount || 0,
        pendingTaskers: pendingCount || 0,
        totalBookings: bookingsCount || 0,
        totalRevenue: revenue,
        activeJobs: activeJobsCount || 0,
        unsettledCommissions: unsettledCount || 0
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Platform Overview</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time performance metrics and business growth KPIs.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={fetchStats} className="admin-btn admin-btn-ghost !py-2">
                <Clock className="w-4 h-4 mr-2" /> Refresh Data
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/portal-hq/taskers" className="admin-card p-6 bg-gradient-to-br from-white to-blue-50/30 hover:scale-[1.02] transition-transform cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full">
              +12% <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Community</h3>
          <p className="text-3xl font-black text-gray-900">{stats.totalUsers}</p>
          <p className="text-[11px] text-gray-400 mt-2">Active users and taskers</p>
        </Link>

        <Link href="/portal-hq/finance" className="admin-card p-6 bg-gradient-to-br from-white to-red-50/30 hover:scale-[1.02] transition-transform cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-100 text-sewakhoj-red rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full">
              +8% <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Platform Revenue</h3>
          <p className="text-3xl font-black text-gray-900">Rs {stats.totalRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-2">Total commission earned</p>
        </Link>

        <div className="admin-card p-6 bg-gradient-to-br from-white to-green-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Bookings</h3>
          <p className="text-3xl font-black text-gray-900">{stats.totalBookings}</p>
          <p className="text-[11px] text-gray-400 mt-2">Services delivered since launch</p>
        </div>

        <Link href="/portal-hq/live-map" className="admin-card p-6 bg-gradient-to-br from-white to-amber-50/30 hover:scale-[1.02] transition-transform cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Active Jobs</h3>
          <p className="text-3xl font-black text-gray-900">{stats.activeJobs}</p>
          <p className="text-[11px] text-gray-400 mt-2">Currently in-progress</p>
        </Link>
      </div>

      {/* Operational Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/portal-hq/cities" className="admin-card p-6 bg-gradient-to-br from-white to-purple-50/30 hover:scale-[1.02] transition-transform cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest bg-purple-50 px-2 py-1 rounded-lg">Operational</span>
          </div>
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Geographical Coverage</h3>
          <p className="text-2xl font-black text-gray-900">Manage Cities</p>
          <p className="text-[11px] text-gray-400 mt-2">Active service areas & local availability</p>
        </Link>

        {/* Developer Oversight: System Health */}
        <div className="admin-card p-6 border-blue-100 bg-blue-50/10">
          <div className="flex items-center justify-between mb-6">
              <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> System Health & DevOps
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-tighter">Developer Oversight Dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                  <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">All Systems Operational</span>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-blue-100">
                      <Zap className="w-5 h-5" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Latency</p>
                      <p className="font-black text-gray-900">124ms</p>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-600 border border-gray-100">
                      <Activity className="w-5 h-5" />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">DB Load</p>
                      <p className="font-black text-gray-900">8.4%</p>
                  </div>
              </div>
          </div>
        </div>
      </div>

      {/* Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 admin-card overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Growth Trends
            </h3>
            <div className="flex gap-2 text-[10px] font-bold uppercase text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Users</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Bookings</span>
            </div>
          </div>
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-full h-48 flex items-end gap-2 px-4">
                {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-blue-500/10 rounded-t-lg relative group">
                        <div style={{ height: `${h}%` }} className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all group-hover:bg-blue-600"></div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-400 font-bold mt-6 uppercase tracking-widest">Weekly Activity Insights</p>
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Operational Action Items
            </h3>
          </div>
          <div className="p-0 divide-y divide-gray-100">
            <Link href="/portal-hq/taskers?status=pending" className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold">Pending KYC Reviews</p>
                        <p className="text-[11px] text-gray-400">Taskers awaiting approval</p>
                    </div>
                </div>
                <span className="bg-amber-100 text-amber-700 text-[11px] font-black px-2 py-1 rounded-lg">{stats.pendingTaskers}</span>
            </Link>
            <Link href="/portal-hq/finance" className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 text-sewakhoj-red rounded-xl flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold">Unsettled Commissions</p>
                        <p className="text-[11px] text-gray-400">Receivables from taskers</p>
                    </div>
                </div>
                <span className="bg-red-100 text-sewakhoj-red text-[11px] font-black px-2 py-1 rounded-lg">{stats.unsettledCommissions}</span>
            </Link>
            <div className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold">Platform Status</p>
                        <p className="text-[11px] text-gray-400">All systems operational</p>
                    </div>
                </div>
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Healthy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
