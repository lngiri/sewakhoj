"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, MessageSquare, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function SupportDashboard() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Fetch active bookings
    const { data: bData } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_id(full_name, phone),
        tasker:tasker_id(users(full_name, phone))
      `)
      .in('status', ['pending', 'accepted', 'on-the-way', 'in-progress'])
      .order('created_at', { ascending: false });

    // 2. Fetch formal disputes
    const { data: dData } = await supabase
      .from('disputes')
      .select(`
        *,
        booking:booking_id(*, customer:customer_id(full_name, phone), tasker:tasker_id(users(full_name, phone)))
      `)
      .order('created_at', { ascending: false });

    if (bData) setBookings(bData);
    if (dData) setDisputes(dData);
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
          <div className="admin-stat-label">Formal Disputes</div>
          <div className="admin-stat-value text-primary">{disputes.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Unresolved Issues</div>
          <div className="admin-stat-value text-admin-amber">{disputes.filter(d => d.status === 'open').length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Resolution Rate</div>
          <div className="admin-stat-value">
            {disputes.length > 0 ? `${((disputes.filter(d => d.status === 'resolved').length / disputes.length) * 100).toFixed(0)}%` : '100%'}
          </div>
        </div>
      </div>

      {disputes.length > 0 && (
        <div className="admin-card border-sewakhoj-red/30">
          <div className="admin-card-header bg-red-50/50">
            <h3 className="text-[14px] font-black uppercase tracking-wider text-primary">Critical: Active Disputes / उजुरीहरू</h3>
            <span className="admin-badge admin-badge-red">{disputes.length} Active</span>
          </div>
          <div className="divide-y divide-red-100">
            {disputes.map(d => {
                const b = d.booking;
                const tUser = Array.isArray(b?.tasker?.users) ? b?.tasker?.users[0] : b?.tasker?.users;
                return (
                    <div key={d.id} className="p-6 bg-red-50/10">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded">DISPUTE</span>
                                    <h4 className="font-bold text-lg">{b?.service}</h4>
                                    <span className="text-xs text-gray-400">#{d.id.split('-')[0]}</span>
                                </div>
                                <p className="text-sm font-bold text-gray-900 bg-white p-3 rounded-xl border border-red-100 shadow-sm mb-4">
                                    <AlertTriangle className="w-4 h-4 inline mr-2 text-primary" />
                                    Reason: {d.reason}
                                </p>
                                <div className="grid grid-cols-2 gap-8 text-sm">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Customer</p>
                                        <p className="font-bold">{b?.customer?.full_name}</p>
                                        <p className="text-xs text-gray-500">{b?.customer?.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Tasker</p>
                                        <p className="font-bold">{tUser?.full_name}</p>
                                        <p className="text-xs text-gray-500">{tUser?.phone}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-[180px]">
                                <button className="admin-btn admin-btn-red !text-[11px]">Mark Resolved</button>
                                <button className="admin-btn admin-btn-ghost !text-[11px]">Investigate</button>
                                <a 
                                    href={`tel:${b?.customer?.phone}`}
                                    className="text-center text-[11px] font-bold text-gray-500 mt-2 hover:underline"
                                >
                                    Call Customer
                                </a>
                            </div>
                        </div>
                    </div>
                );
            })}
          </div>
        </div>
      )}
        
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
                    {b.is_disputed && (
                      <span className="admin-badge admin-badge-red flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> DISPUTED
                      </span>
                    )}
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
                  {b.is_disputed && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 mt-2">
                      <p className="text-[10px] font-bold text-primary uppercase mb-1">Dispute Reason</p>
                      <p className="text-[12px] italic">"{b.dispute_reason || 'No reason provided'}"</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 md:mt-0 flex flex-col gap-2">
                  <a 
                    href={`https://wa.me/977${b.customer?.phone?.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn-outline flex items-center justify-center gap-2 !py-2 bg-green-50 text-green-600 border-green-200"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.544.917 3.41 1.403 5.316 1.404h.005c5.451 0 9.887-4.435 9.889-9.886.002-2.642-1.029-5.125-2.902-6.999-1.872-1.874-4.355-2.905-6.998-2.906-5.45 0-9.886 4.435-9.889 9.886-.001 1.93.513 3.818 1.488 5.44l-.989 3.614 3.705-.972zm12.193-7.531c-.328-.164-1.944-.959-2.242-1.069-.299-.11-.517-.164-.734.164-.218.328-.842 1.069-1.031 1.288-.19.218-.379.246-.708.082-.328-.164-1.386-.511-2.641-1.63-1.007-.898-1.688-2.007-1.885-2.335-.197-.328-.021-.505.143-.668.147-.148.328-.383.493-.574.164-.191.218-.328.328-.547.11-.219.055-.41-.027-.574-.082-.164-.734-1.769-1.006-2.426-.264-.639-.533-.553-.734-.563-.19-.01-.408-.011-.626-.011-.218 0-.571.082-.87.41-.299.328-1.143 1.12-1.143 2.732 0 1.612 1.17 3.169 1.333 3.388.164.219 2.303 3.515 5.578 4.922.779.335 1.387.535 1.86.687.782.248 1.494.213 2.056.129.626-.094 1.944-.795 2.216-1.558.272-.764.272-1.422.19-1.557-.081-.135-.298-.218-.626-.382z"/></svg>
                    WhatsApp Customer
                  </a>
                  <Link href={`/booking/${b.id}/tracking`} className="admin-btn admin-btn-red flex items-center justify-center gap-2 !py-2">
                    <MessageSquare className="w-4 h-4"/> Tracking & Chat
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
