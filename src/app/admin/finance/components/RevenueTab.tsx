"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  ChevronRight, 
  TrendingDown, 
  MessageSquare, 
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/context/NotificationContext";
import { auditLog } from "@/lib/auditLog";

interface AbandonedBooking {
  id: string;
  created_at: string;
  category: string;
  address: string;
  total_amount: number;
  last_step_completed: number;
  customer_id: string;
  users: {
    full_name: string;
    phone: string;
    email: string;
  };
}

export default function RevenueRecoveryPage() {
  const { showSuccess, showError } = useNotification();
  const [abandoned, setAbandoned] = useState<AbandonedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLostValue: 0,
    recoveryPotential: 0
  });

  useEffect(() => {
    fetchAbandonedBookings();
  }, []);

  const fetchAbandonedBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        users:customer_id (full_name, phone, email)
      `)
      .eq('is_draft', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAbandoned(data as any);
      
      const lostValue = (data as any[]).reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
      setStats({
        totalLostValue: lostValue,
        recoveryPotential: Math.round(lostValue * 0.3) // Estimating 30% recovery rate
      });
    }
    setLoading(false);
  };

  const markAsRecovered = async (id: string) => {
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('category')
      .eq('id', id)
      .single();
    
    if (fetchError || !booking) {
      showError("Booking not found");
      return;
    }

    const { data: availableTasker, error: taskerError } = await supabase
      .from('taskers')
      .select('id')
      .contains('skills', [booking.category])
      .eq('status', 'active')
      .limit(1)
      .single();

    const { error } = await supabase
      .from('bookings')
      .update({ 
        is_draft: false, 
        status: 'confirmed',
        tasker_id: availableTasker?.id || null
      })
      .eq('id', id);

    if (!error) {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await auditLog('booking_recovered', { booking_id: id, tasker_assigned: availableTasker?.id || null }, adminUser.id);
      }
      showSuccess(availableTasker?.id 
        ? "Booking recovered and assigned!" 
        : "Booking recovered. Tasker assignment pending.");
      fetchAbandonedBookings();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">Scanning for lost revenue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* HEADER */}
      <div className="bg-gray-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/admin" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6 hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Command Center
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-red-500" /> Revenue Recovery Radar
              </h2>
              <p className="text-gray-400 text-sm mt-2 max-w-lg font-medium">Tracking customers who dropped off during checkout. These are your highest-intent leads.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Lost Value</p>
                  <p className="text-2xl font-black">Rs {stats.totalLostValue.toLocaleString()}</p>
               </div>
               <div className="bg-green-500/20 backdrop-blur-md p-6 rounded-[2rem] border border-green-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">Recovery Potential</p>
                  <p className="text-2xl font-black text-green-400">Rs {stats.recoveryPotential.toLocaleString()}</p>
               </div>
            </div>
          </div>
        </div>
        <DollarSign className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 pointer-events-none" />
      </div>

      {abandoned.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100">
           <div className="w-20 h-20 bg-green-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
           </div>
           <h3 className="text-xl font-black text-gray-900 mb-2">No Leakage Detected</h3>
           <p className="text-sm font-medium text-gray-400 max-w-sm mx-auto">All customers are currently completing their bookings or no new drafts have been created.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {abandoned.map((b) => (
            <div key={b.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-xl transition-all duration-500 flex flex-col lg:flex-row gap-8 group">
              
              {/* Customer Info */}
              <div className="lg:w-1/3 shrink-0">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <Users className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="text-lg font-black text-gray-900">{b.users?.full_name || 'Anonymous User'}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customer ID: #{b.customer_id.slice(0,8)}</p>
                   </div>
                </div>
                <div className="space-y-2">
                   <a href={`tel:${b.users?.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100">
                      <Phone className="w-4 h-4" /> {b.users?.phone || 'No phone'}
                   </a>
                   <a href={`mailto:${b.users?.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100">
                      <Mail className="w-4 h-4" /> {b.users?.email || 'No email'}
                   </a>
                </div>
              </div>

              {/* Abandonment Intelligence */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Abandoned {new Date(b.created_at).toLocaleString()}
                   </span>
                   <div className="flex items-center gap-2">
                      {[1, 2, 3].map(step => (
                        <div key={step} className={`w-2 h-2 rounded-full ${b.last_step_completed >= step ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                      ))}
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Step {b.last_step_completed}/3 Reach</span>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                   <div>
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Target Service</p>
                      <p className="text-sm font-black text-gray-900">{b.category}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Lost Revenue</p>
                      <p className="text-sm font-black text-red-600">Rs {b.total_amount?.toLocaleString()}</p>
                   </div>
                   <div className="col-span-2">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1 flex items-center gap-1.5">
                         <MapPin className="w-3 h-3" /> Intended Location
                      </p>
                      <p className="text-sm font-bold text-gray-600 leading-relaxed">{b.address}</p>
                   </div>
                </div>
              </div>

              {/* Actions */}
              <div className="lg:w-1/4 shrink-0 flex flex-col gap-3 justify-center">
                 <button 
                  onClick={() => window.open(`https://wa.me/${b.users?.phone?.replace(/\+/g, '')}`, '_blank')}
                  className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                 >
                   <MessageSquare className="w-4 h-4" /> Reach on WhatsApp
                 </button>
                 <button 
                  onClick={() => markAsRecovered(b.id)}
                  className="w-full py-4 bg-white text-blue-600 border border-blue-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                 >
                   <CheckCircle2 className="w-4 h-4" /> Marked Recovered
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
