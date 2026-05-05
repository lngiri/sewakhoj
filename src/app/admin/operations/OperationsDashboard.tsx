"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  ShieldCheck, 
  Users, 
  DollarSign, 
  Briefcase,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Clock,
  MoreVertical,
  History,
  TrendingUp,
  Mail,
  Smartphone,
  Eye,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Info
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function OperationsDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    activeJobs: 0,
    todayCommission: 0,
  });
  const [pendingTaskers, setPendingTaskers] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{show: boolean, id: string | null, name: string}>({ show: false, id: null, name: '' });
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        { count: pendingCount, data: pendingData },
        { count: activeCount },
        { data: commissionData },
        { data: ledgerData }
      ] = await Promise.all([
        supabase.from('taskers').select('*, user:users(full_name, email, avatar_url, phone)').eq('status', 'pending'),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'in-progress']),
        supabase.from('commission_ledger').select('commission_amount').gte('created_at', today),
        supabase.from('commission_ledger').select('*, tasker:taskers(user:users(full_name))').order('created_at', { ascending: false }).limit(5)
      ]);

      const todayTotal = commissionData?.reduce((sum, item) => sum + Number(item.commission_amount), 0) || 0;

      setStats({
        pendingVerifications: pendingCount || 0,
        activeJobs: activeCount || 0,
        todayCommission: todayTotal
      });

      setPendingTaskers(pendingData || []);
      setRecentTransactions(ledgerData || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tasker: any) => {
    setProcessingId(tasker.id);
    try {
      // 1. Update Tasker Status
      const { error: updateError } = await supabase
        .from('taskers')
        .update({ status: 'active', id_verified: true, updated_at: new Date().toISOString() })
        .eq('id', tasker.id);

      if (updateError) throw updateError;

      // 2. Send In-App Notification
      const rawUser: any = tasker.user;
      const userName = Array.isArray(rawUser) ? rawUser[0]?.full_name : rawUser?.full_name;
      await supabase.from('notifications').insert({
        user_id: tasker.user_id,
        title: "Profile Approved! 🎉",
        message: `Congratulations ${userName?.split(' ')[0]}! Your SewaKhoj profile is now active. You can start accepting jobs.`,
        type: 'success'
      });

      // 3. Log Action
      await supabase.from('system_logs').insert({
        admin_id: user?.id,
        action_type: 'kyc_approval',
        target_id: tasker.id,
        details: { tasker_name: userName }
      });

      // SMS Placeholder (Twilio/Sparrow)
      /*
      await fetch('https://api.sparrowsms.com/v2/sms/', {
        method: 'POST',
        body: JSON.stringify({
          token: process.env.SPARROW_TOKEN,
          from: 'SewaKhoj',
          to: tasker.user?.phone,
          text: `Congrats! Your SewaKhoj profile is now active. Start earning now!`
        })
      });
      */

      fetchData();
    } catch (err) {
      console.error("Approval failed", err);
      alert("Failed to approve tasker.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.id || !rejectReason) return;
    
    setProcessingId(rejectModal.id);
    try {
      // 1. Update Status (Optional: could stay pending or be 'suspended')
      // For now, we'll keep it pending but send feedback
      
      // 2. Send Feedback Notification
      const { data: tasker } = await supabase.from('taskers').select('user_id, user:users(full_name)').eq('id', rejectModal.id).single();
      
      if (tasker) {
        await supabase.from('notifications').insert({
          user_id: tasker.user_id,
          title: "KYC Update Needed",
          message: `We couldn't approve your profile yet. Reason: ${rejectReason}. Please update your documents.`,
          type: 'warning'
        });

        // 3. Log Action
        const rawUser: any = tasker.user;
        const userName = Array.isArray(rawUser) ? rawUser[0]?.full_name : rawUser?.full_name;
        await supabase.from('system_logs').insert({
          admin_id: user?.id,
          action_type: 'kyc_rejection',
          target_id: rejectModal.id,
          details: { reason: rejectReason, tasker_name: userName }
        });
      }

      setRejectModal({ show: false, id: null, name: '' });
      setRejectReason("");
      fetchData();
    } catch (err) {
      console.error("Rejection failed", err);
    } finally {
      setProcessingId(null);
    }
  };

  const updateTrustScore = async (id: string, current: number, delta: number) => {
    const newVal = Math.min(100, Math.max(0, current + delta));
    await supabase.from('taskers').update({ trust_score: newVal }).eq('id', id);
    fetchData();
  };

  const togglePayout = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'settled' : 'pending';
    await supabase.from('commission_ledger').update({ 
      status: nextStatus,
      settled_at: nextStatus === 'settled' ? new Date().toISOString() : null
    }).eq('id', id);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Pending Review</span>
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">KYC Verifications</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.pendingVerifications}</h3>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">On-Going</span>
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Active Jobs Now</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.activeJobs}</h3>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-2 py-1 rounded-lg">Real-Time</span>
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Today's Commission</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">Rs {stats.todayCommission.toLocaleString()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Verification Section */}
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" /> Verification Queue
            </h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{pendingTaskers.length} Awaiting</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Tasker</th>
                  <th className="px-6 py-4 text-center">Trust</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendingTaskers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                          {(() => {
                            const u: any = t.user;
                            const finalUser = Array.isArray(u) ? u[0] : u;
                            return finalUser?.avatar_url ? <img src={finalUser.avatar_url} className="w-full h-full rounded-full object-cover" /> : finalUser?.full_name?.[0];
                          })()}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-gray-900">
                            {(() => {
                                const u: any = t.user;
                                return Array.isArray(u) ? u[0]?.full_name : u?.full_name;
                            })()}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {(() => {
                                const u: any = t.user;
                                return Array.isArray(u) ? u[0]?.email : u?.email;
                            })()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateTrustScore(t.id, t.trust_score || 50, -5)} className="p-1 hover:bg-red-50 text-red-400 rounded"><ThumbsDown className="w-3 h-3" /></button>
                            <span className={`text-[12px] font-black ${t.trust_score >= 80 ? 'text-green-600' : t.trust_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{t.trust_score || 50}</span>
                            <button onClick={() => updateTrustScore(t.id, t.trust_score || 50, 5)} className="p-1 hover:bg-green-50 text-green-400 rounded"><ThumbsUp className="w-3 h-3" /></button>
                        </div>
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div style={{ width: `${t.trust_score || 50}%` }} className={`h-full ${t.trust_score >= 80 ? 'bg-green-500' : t.trust_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="View Documents">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleApprove(t)}
                          disabled={processingId === t.id}
                          className={`p-2 rounded-lg transition-all ${processingId === t.id ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
                          {processingId === t.id ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => {
                            const u: any = t.user;
                            const name = Array.isArray(u) ? u[0]?.full_name : u?.full_name;
                            setRejectModal({ show: true, id: t.id, name: name });
                          }}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingTaskers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-xs italic">No pending verifications. All clear! ✨</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Finance Section */}
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Recent Finance
            </h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Latest Payouts</span>
          </div>
          <div className="flex-1">
            <div className="divide-y divide-gray-50">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">
                        {(() => {
                            const u: any = tx.tasker?.user;
                            return Array.isArray(u) ? u[0]?.full_name : u?.full_name;
                        })()}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">Platform Fee: Rs {tx.commission_amount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right mr-2">
                      <p className="text-[14px] font-black text-gray-900">Rs {tx.total_amount}</p>
                      <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">{new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={tx.status === 'settled'} 
                        onChange={() => togglePayout(tx.id, tx.status)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="px-6 py-12 text-center text-gray-400 text-xs italic">No recent transactions.</div>
              )}
            </div>
            <div className="p-4 bg-gray-50/50 border-t border-gray-50 text-center">
              <Link href="/admin/finance" className="text-[11px] font-black uppercase text-blue-600 hover:underline">View Full Ledger</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log / History Preview */}
      <div className="bg-[#1a1a2e] text-white rounded-[32px] p-8 shadow-xl">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <History className="w-5 h-5 text-sewakhoj-red" /> Operational History (Audit)
            </h3>
            <button className="text-[10px] font-black uppercase text-white/50 hover:text-white transition-colors">Export Logs</button>
        </div>
        <div className="space-y-4">
            <div className="flex items-center gap-4 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <p className="flex-1 opacity-80"><span className="font-bold text-white">System</span> automatically recalculated platform commissions for 12 pending jobs.</p>
                <span className="opacity-40">2 mins ago</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <p className="flex-1 opacity-80"><span className="font-bold text-white">Admin</span> verified ID for Tasker #8291 (Arjun K.)</p>
                <span className="opacity-40">15 mins ago</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
                <span className="w-2 h-2 rounded-full bg-sewakhoj-red"></span>
                <p className="flex-1 opacity-80"><span className="font-bold text-white">Finance</span> marked Rs 4,200 as paid to Sunil P.</p>
                <span className="opacity-40">1 hour ago</span>
            </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-gray-900">Reject Verification</h3>
                    <p className="text-xs text-gray-400">Feedback will be sent to {rejectModal.name}</p>
                </div>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 block">Reason for Rejection</label>
                    <textarea 
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. ID photo is blurry or invalid document type..."
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-red-500 rounded-2xl p-4 text-sm outline-none transition-all h-32"
                    />
                </div>
                
                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={() => setRejectModal({ show: false, id: null, name: '' })}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleReject}
                        disabled={!rejectReason || processingId === rejectModal.id}
                        className="flex-1 py-3 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50"
                    >
                        Confirm Rejection
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
