"use client";

import dynamic from "next/dynamic";
import { Navigation } from "lucide-react";

// Use dynamic import for Leaflet to avoid SSR issues
const LiveMap = dynamic(() => import("./LiveMap"), { 
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center">Loading Real-time Map...</div>
});

export default function AdminLiveMapPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-sewakhoj-red" />
            Live Tasker Map
          </h2>
          <p className="text-gray-500 text-sm mt-1">Monitor active taskers across Nepal in real-time.</p>
        </div>
        <div className="flex gap-4">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Live Updates Active</span>
            </div>
        </div>
      </div>

      <LiveMap />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Total Online</h4>
            <p className="text-3xl font-black">24</p>
        </div>
        <div className="admin-card p-6">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Active Jobs</h4>
            <p className="text-3xl font-black">12</p>
        </div>
        <div className="admin-card p-6">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Platform Load</h4>
            <p className="text-3xl font-black text-green-600">Stable</p>
        </div>
      </div>
    </div>
  );
}
