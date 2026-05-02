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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Support & Monitoring</h1>
        <p className="text-gray-600 mt-2">Monitor all active bookings in real-time to ensure platform safety and resolve disputes.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500"/> Active Bookings</h2>
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold">{bookings.length} Live</span>
        </div>
        
        <div className="divide-y divide-gray-100">
          {bookings.map(b => {
            const tUser = Array.isArray(b.tasker?.users) ? b.tasker?.users[0] : b.tasker?.users;
            return (
              <div key={b.id} className="p-6 flex flex-col md:flex-row justify-between hover:bg-gray-50">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-mono">{b.id.split('-')[0]}</span>
                    <span className="font-bold text-lg">{b.service}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase rounded">{b.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-8 text-sm mt-4">
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase mb-1">Customer</p>
                      <p className="font-bold">{b.customer?.full_name}</p>
                      <p>{b.customer?.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs font-bold uppercase mb-1">Tasker</p>
                      <p className="font-bold">{tUser?.full_name}</p>
                      <p>{tUser?.phone}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 flex items-center">
                  <Link href={`/booking/${b.id}/tracking`} className="flex items-center gap-2 bg-sewakhoj-red text-white px-4 py-2 rounded-lg font-bold hover:bg-sewakhoj-red-light">
                    <MessageSquare className="w-4 h-4"/> View Live Chat / Tracking
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
