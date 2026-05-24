"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/navigation/PageHeader";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNotification } from "@/context/NotificationContext";
import { toast } from "@/lib/toast-messages";
import { useLocale } from "next-intl";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Activity,
  Zap,
  Shield,
  MapPin,
  Settings,
  Save,
  Bell,
  X,
  ShieldAlert,
  Wallet,
  Briefcase,
  ChevronRight
} from "lucide-react";

export default function AdminDashboard() {
  const locale = useLocale();
  const { user } = useAuth();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTaskers: 0,
    droppedUsers: 0,
    pendingTaskers: 0,
    totalBookings: 0,
    totalRevenue: 0, // Platform commission
    grossVolume: 0,  // Total money moved
    activeJobs: 0,
    unsettledCommissions: 0,
    activeDisputes: 0,
    abandonedValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<Array<{ id: string; value: string; description?: string }>>([]);
  const [savingSettings, setSavingSettings] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
    booking_id?: string;
  }>>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*');
    if (data) setSiteSettings(data);
  };

  const fetchNotifications = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},target_role.eq.admin`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setNotifications(data);
  };

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
        { data: unsettledData },
        { data: droppedData },
        { data: grossData },
        { count: disputesCount },
        { data: abandonedData }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('taskers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('taskers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('commission_ledger').select('commission_amount'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress']),
        supabase.from('commission_ledger').select('commission_amount').eq('status', 'pending'),
        supabase.from('users').select('id, taskers(id)').eq('role', 'tasker'),
        supabase.from('bookings').select('total_amount').eq('status', 'completed'),
        supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('bookings').select('total_amount').eq('is_draft', true)
      ]);

      const revenue = (revenueData as any)?.reduce((sum: number, item: any) => sum + Number(item.commission_amount || 0), 0) || 0;
      const unsettled = (unsettledData as any)?.reduce((sum: number, item: any) => sum + Number(item.commission_amount || 0), 0) || 0;
      const grossVolume = (grossData as any)?.reduce((sum: number, item: any) => sum + Number(item.total_amount || 0), 0) || 0;
      const abandonedValue = (abandonedData as any)?.reduce((sum: number, item: any) => sum + Number(item.total_amount || 0), 0) || 0;
      const droppedUsersCount = (droppedData as any)?.filter((u: any) => !u.taskers).length || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalTaskers: taskersCount || 0,
        droppedUsers: droppedUsersCount,
        pendingTaskers: pendingCount || 0,
        totalBookings: bookingsCount || 0,
        totalRevenue: revenue,
        grossVolume: grossVolume,
        activeJobs: activeJobsCount || 0,
        unsettledCommissions: unsettled,
        activeDisputes: disputesCount || 0,
        abandonedValue: abandonedValue
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSettings();
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }

    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  const saveSetting = async (id: string, value: string) => {
    setSavingSettings(id);
    const { error } = await supabase
      .from('site_settings')
      .upsert({ id, value, updated_at: new Date().toISOString() });

    if (!error) {
      showSuccess(toast(locale, "ADMIN_SETTINGS_SAVED"));
      fetchSettings();
    } else {
      showError(toast(locale, "ADMIN_SETTINGS_FAILED"));
    }
    setSavingSettings(null);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).is('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notification: {
    id: string;
    type: string;
    booking_id?: string;
  }) => {
    await markAsRead(notification.id);
    setIsNotifOpen(false);

    if (notification.type === 'booking') {
      router.push(`/booking/${notification.booking_id}`);
    } else if (notification.type === 'kyc') {
      router.push('/admin/taskers?status=pending');
    } else if (notification.type === 'user_signup') {
      router.push('/admin/users');
    } else if (notification.type === 'dispute') {
      router.push('/admin/support');
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">Initializing Boss Mode...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Command Center Header */}
      <div className="bg-gray-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <PageHeader
          title="SewaKhoj Command Center"
          description="Live financial tracking, operational radar, and platform health. You are in full control."
          className="mb-0 text-white [&_h1]:text-white [&_.tracking-tight]:text-white [&_p]:text-gray-400"
          relatedLinks={[
            { label: "Operations", href: "/admin/operations", description: "Tasker verification & performance" },
            { label: "Finance", href: "/admin/finance", description: "Ledger & revenue recovery" },
            { label: "Taskers", href: "/admin/taskers", description: "Manage tasker approvals" },
            { label: "Users", href: "/admin/users", description: "User directory" },
            { label: "Live Map", href: "/admin/live-map", description: "Real-time tasker tracking" },
            { label: "Marketing", href: "/admin/marketing", description: "Promos & announcements" },
            { label: "Support", href: "/admin/support", description: "Disputes & reviews" },
            { label: "Settings", href: "/admin/settings", description: "Platform configuration" },
          ]}
        />
        <div className="flex gap-4 items-center relative z-10 mt-4">
          <button onClick={fetchStats} className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95">
            <Clock className="w-4 h-4" /> Refresh
          </button>
        </div>
        {/* Background Graphic */}
        <Activity className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 pointer-events-none" />
      </div>

      {/* 💰 Boss Finance Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/finance" className="block bg-gradient-to-br from-green-500 to-green-600 rounded-[2rem] p-8 text-white shadow-xl shadow-green-500/20 relative overflow-hidden group hover:brightness-105 transition-all">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-full flex items-center gap-1">
              Gross Volume <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black mb-1">Rs {stats.grossVolume.toLocaleString()}</p>
            <p className="text-sm font-medium text-green-100">Total money moved through SewaKhoj</p>
          </div>
          <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
        </Link>

        <Link href="/admin/finance" className="block bg-white border-2 border-gray-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group hover:border-blue-500 hover:bg-blue-50/10 transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <Wallet className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1">
              Platform Profit <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-900 mb-1">Rs {stats.totalRevenue.toLocaleString()}</p>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Realized Earnings (10% Cut)</p>
          </div>
        </Link>

        <Link href="/admin/finance?tab=revenue" className="block bg-white border-2 border-red-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group hover:bg-red-50 transition-all cursor-pointer">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center group-hover:bg-red-500 transition-colors">
              <AlertTriangle className="w-6 h-6 text-red-500 group-hover:text-white transition-colors" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-100 px-3 py-1.5 rounded-full flex items-center gap-1">
              Unsettled Ops <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-black text-red-600 mb-1">Rs {stats.unsettledCommissions.toLocaleString()}</p>
            <p className="text-sm font-bold text-red-400 uppercase tracking-widest">Receivables</p>
          </div>
        </Link>
      </div>

{/* 🛑 Revenue Leakage Warning */}
       {stats.abandonedValue > 0 && (
         <Link href="/admin/finance?tab=revenue" className="block bg-gradient-to-r from-orange-500 to-red-600 p-8 rounded-[2rem] shadow-xl shadow-orange-500/20 relative overflow-hidden group animate-in slide-in-from-top-4 hover:brightness-105 transition-all">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                     <TrendingDown className="w-8 h-8" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black tracking-tight">Rs {stats.abandonedValue.toLocaleString()} Leakage Detected</h3>
                     <p className="text-orange-100 text-sm font-medium mt-1">High-intent customers abandoned checkout. Click to recover them now.</p>
                  </div>
               </div>
               <div className="bg-white text-orange-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-50 transition-all shadow-xl flex items-center gap-1">
                  Open Recovery Radar <ArrowUpRight className="w-4 h-4" />
               </div>
            </div>
            <DollarSign className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 pointer-events-none" />
         </Link>
       )}

      {/* 🚨 Intervention Radar & Core Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Intervention Radar (Left Col) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white border-2 border-gray-100 rounded-[2rem] overflow-hidden shadow-sm flex-1">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-gray-900">
                <ShieldAlert className="w-5 h-5 text-amber-500" /> Intervention Radar
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Live</span>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {/* Disputes Alert */}
              <Link href="/admin/support" className="p-6 hover:bg-red-50/50 transition-colors flex items-center justify-between group cursor-pointer block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 mb-0.5">Active Disputes</p>
                    <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Requires Mediation</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-red-100 text-red-700 text-sm font-black px-3 py-1 rounded-xl">{stats.activeDisputes}</span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-500 transition-colors" />
                </div>
              </Link>

              {/* KYC Alert */}
              <Link href="/admin/taskers?status=pending" className="p-6 hover:bg-amber-50/50 transition-colors flex items-center justify-between group cursor-pointer block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 mb-0.5">Pending KYC Reviews</p>
                    <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Verify Documents</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-amber-100 text-amber-700 text-sm font-black px-3 py-1 rounded-xl">{stats.pendingTaskers}</span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
                </div>
              </Link>

              {/* Active Missions */}
              <Link href="/admin/live-map" className="p-6 hover:bg-blue-50/50 transition-colors flex items-center justify-between group cursor-pointer block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 mb-0.5">Live Missions</p>
                    <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">Track in Progress</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-700 text-sm font-black px-3 py-1 rounded-xl">{stats.activeJobs}</span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Growth & Network Stats (Right Col) */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-6">
          <Link href="/admin/users" className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 hover:border-gray-200 transition-colors group block">
            <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Network</p>
            <p className="text-3xl font-black text-gray-900">{stats.totalUsers}</p>
          </Link>

          <Link href="/admin/taskers?status=active" className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 hover:border-gray-200 transition-colors group block">
            <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Elite Taskers</p>
            <p className="text-3xl font-black text-gray-900">{stats.totalTaskers}</p>
          </Link>

          <Link href="/admin/operations" className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 hover:border-gray-200 transition-colors group block">
            <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bookings</p>
            <p className="text-3xl font-black text-gray-900">{stats.totalBookings}</p>
          </Link>

          <Link href="/admin/live-map" className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 hover:border-gray-200 transition-colors group block">
            <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Coverage Areas</p>
            <p className="text-3xl font-black text-gray-900 flex items-center gap-2">Live Map <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" /></p>
          </Link>

          <Link href="/admin/finance?tab=escrow" className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 hover:border-gray-200 transition-colors group block">
            <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Connect Hub</p>
            <p className="text-3xl font-black text-gray-900 flex items-center gap-2">Payouts <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" /></p>
          </Link>

          <Link href="/admin/marketing" className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 hover:border-gray-200 transition-colors group block">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Broadcaster</p>
            <p className="text-3xl font-black text-gray-900 flex items-center gap-2">Marketing <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" /></p>
          </Link>
        </div>
      </div>

      {/* ⚙️ GLOBAL SETTINGS SECTION */}
      <div className="bg-white border-2 border-gray-100 rounded-[2rem] overflow-hidden shadow-sm mt-6">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-gray-900">
                  <Settings className="w-5 h-5 text-blue-600" /> Platform Configuration
              </h3>
          </div>
          <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {siteSettings.map((setting) => (
                      <div key={setting.id} className="space-y-3 p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              {setting.id.replace(/_/g, ' ')}
                          </label>
                          <div className="flex gap-2">
                              <input
                                  type="text"
                                  value={setting.value}
                                  onChange={(e) => {
                                      const newVal = e.target.value;
                                      setSiteSettings(prev => prev.map(s => s.id === setting.id ? { ...s, value: newVal } : s));
                                  }}
                                  className="flex-1 bg-white border-2 border-transparent rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                              />
                              <button
                                  onClick={() => saveSetting(setting.id, setting.value)}
                                  disabled={savingSettings === setting.id}
                                  className="bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                              >
                                  {savingSettings === setting.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                                  <span>Save</span>
                              </button>
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 mt-2 leading-relaxed">{setting.description}</p>
                      </div>
                  ))}
                  {siteSettings.length === 0 && (
                      <div className="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                          <Settings className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-400 text-xs font-black uppercase tracking-widest">No configurations found in database</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

    </div>
  );
}
