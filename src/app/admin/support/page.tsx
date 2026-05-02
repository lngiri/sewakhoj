"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, MessageSquare, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function SupportDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveBookings();
  }, []);

  const fetchActiveBookings = async () => {
    setLoading(true);
    // Fetch bookings that are not completed or cancelled, giving priority to disputes or active ones
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_id(full_name, phone),
        tasker:tasker_id(users(full_name, phone))
      `)
      .in('status', ['pending', 'accepted', 'on-the-way', 'in-progress'])
      .order('created_at', { ascending: false });

    if (data && !error) setBookings(data);
    setLoading(false);
  };

  if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red mx-auto mt-20"></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[14px]">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Live Bookings / सक्रिय बुकिङ</div>
          <div className="admin-stat-value text-admin-green">{bookings.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Disputes Raised</div>
          <div className="admin-stat-value text-primary">0</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Critical Alerts</div>
          <div className="admin-stat-value text-admin-amber">0</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Today's Total</div>
          <div className="admin-stat-value">24</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="text-[14px] font-bold uppercase tracking-wider">Active Bookings Monitoring / अनुगमन</h3>
          <span className="admin-badge admin-badge-blue">{bookings.length} Monitoring</span>
        </div>
        
        <div className="divide-y divide-[#e8e8e8]">
          {bookings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">
              No active bookings currently being monitored.
            </div>
          ) : bookings.map(b => {
            const tUser = Array.isArray(b.tasker?.users) ? b.tasker?.users[0] : b.tasker?.users;
            return (
              <div key={b.id} className="p-6 flex flex-col md:flex-row justify-between hover:bg-[#fafafa] transition-colors">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#1a1a2e] text-white px-2 py-0.5 rounded text-[10px] font-mono">#{b.id.split('-')[0]}</span>
                    <span className="font-bold text-[16px] text-foreground">{b.service}</span>
                    <span className={`admin-badge ${
                      b.status === 'pending' ? 'admin-badge-amber' : 
                      b.status === 'in-progress' ? 'admin-badge-blue' : 'admin-badge-green'
                    }`}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-12">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Customer</p>
                      <p className="font-bold text-[13px]">{b.customer?.full_name}</p>
                      <p className="text-[12px] text-muted-foreground">{b.customer?.phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Tasker</p>
                      <p className="font-bold text-[13px]">{tUser?.full_name || 'Pending'}</p>
                      <p className="text-[12px] text-muted-foreground">{tUser?.phone || 'Not Assigned'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 flex items-center gap-2">
                  <Link href={`/booking/${b.id}/tracking`} className="admin-btn admin-btn-red flex items-center gap-2">
                    <MessageSquare className="w-4 h-4"/> View Live Chat & Tracking
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
