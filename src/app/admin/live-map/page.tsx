"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Navigation, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Use dynamic import for Leaflet to avoid SSR issues
const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center">Loading Real-time Map...</div>
});

export default function AdminLiveMapPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [stats, setStats] = useState({ online: 0, activeJobs: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // 1. Get online taskers (active + is_online from weekly schedule auto-toggle)
    const { count: onlineCount } = await supabase
      .from('taskers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_online', true);

    // 2. Get active bookings
    const { count: jobCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress']);

    setStats({
      online: onlineCount || 0,
      activeJobs: jobCount || 0
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="md" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Tasker Map"
        description="Monitor active taskers across Nepal in real-time."
        relatedLinks={[
          { label: "Command Center", href: "/admin", description: "Back to dashboard" },
          { label: "Operations", href: "/admin/operations", description: "Tasker performance" },
          { label: "Taskers", href: "/admin/taskers", description: "Manage taskers" },
        ]}
      />
      <div className="flex items-center gap-2 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Live Updates Active</span>
      </div>

      <LiveMap />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Total Online</h4>
            <p className="text-3xl font-black">{stats.online}</p>
        </div>
        <div className="admin-card p-6">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Active Jobs</h4>
            <p className="text-3xl font-black">{stats.activeJobs}</p>
        </div>
        <div className="admin-card p-6">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Platform Load</h4>
            <p className="text-3xl font-black text-green-600 flex items-center gap-2">
                Stable <Activity className="w-5 h-5 opacity-30" />
            </p>
        </div>
      </div>
    </div>
  );
}
