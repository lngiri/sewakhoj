"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/context/NotificationContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { auditLog } from "@/lib/auditLog";
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
  Info,
  Zap,
  Flag,
  UserX
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function OperationsDashboard() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { user } = useAuth();
  const { showError } = useNotification();
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    activeJobs: 0,
    todayCommission: 0,
    lateMissions: 0
  });
  const [eliteTaskers, setEliteTaskers] = useState<any[]>([]);
  const [performanceAlerts, setPerformanceAlerts] = useState<any[]>([]);
  const [pendingTaskers, setPendingTaskers] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [flaggedTaskers, setFlaggedTaskers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{show: boolean, id: string | null, name: string}>({ show: false, id: null, name: '' });
  const [docModal, setDocModal] = useState<{show: boolean, docs: any, name: string}>({ show: false, docs: null, name: '' });
  const [rejectReason, setRejectReason] = useState("");
  const [manualRegModal, setManualRegModal] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState({
    email: "",
    fullName: "",
    phone: "",
    skills: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const results = await Promise.allSettled([
        supabase.from('taskers').select('*, user:users(full_name, email, avatar_url, phone)').eq('status', 'pending'),
        supabase.from('bookings').select('*, customer:customer_id(full_name), tasker:tasker_id(users(full_name))').in('status', ['confirmed', 'on-the-way', 'in-progress']),
        supabase.from('commission_ledger').select('commission_amount').gte('created_at', today),
        supabase.from('commission_ledger').select('*, tasker:taskers(user:users(full_name))').order('created_at', { ascending: false }).limit(5),
        supabase.from('system_logs').select('*, admin:users!admin_id(full_name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('taskers').select('*, user:users(full_name)').eq('is_elite', true).limit(5),
        supabase.from('taskers').select('*, user:users(full_name)').lt('trust_score', 40).limit(5),
        supabase.from('tasker_acceptance_metrics').select('*, tasker:taskers(user:users(full_name, phone))').eq('flagged_for_review', true).order('last_updated', { ascending: false }),
        supabase.from('services').select('id, name').order('name', { ascending: true })
      ]);

      const pendingData = results[0].status === 'fulfilled' ? results[0].value.data : [];
      const activeJobsData = results[1].status === 'fulfilled' ? results[1].value.data : [];
      const commissionData = results[2].status === 'fulfilled' ? results[2].value.data : [];
      const ledgerData = results[3].status === 'fulfilled' ? results[3].value.data : [];
      const logsData = results[4].status === 'fulfilled' ? results[4].value.data : [];
      const eliteData = results[5].status === 'fulfilled' ? results[5].value.data : [];
      const riskData = results[6].status === 'fulfilled' ? results[6].value.data : [];
      const flaggedData = results[7].status === 'fulfilled' ? results[7].value.data : [];
      const servicesData = results[8].status === 'fulfilled' ? results[8].value.data : [];

      // Calculate Late Missions (Ghosting Prevention)
      const now = new Date();
      const lateCount = activeJobsData?.filter((b: any) => {
        const scheduledTime = new Date(b.scheduled_at);
        return b.status === 'confirmed' && scheduledTime < now && (now.getTime() - scheduledTime.getTime()) > 30 * 60000;
      }).length || 0;

      const todayTotal = commissionData?.reduce((sum: number, item: any) => sum + Number(item.commission_amount), 0) || 0;

      setStats({
        pendingVerifications: pendingData?.length || 0,
        activeJobs: activeJobsData?.length || 0,
        todayCommission: todayTotal,
        lateMissions: lateCount
      });

      setPendingTaskers(pendingData || []);
      setRecentTransactions(ledgerData || []);
      setLogs(logsData || []);
      setEliteTaskers(eliteData || []);
      setPerformanceAlerts(riskData || []);
      setFlaggedTaskers(flaggedData || []);
      setServices(servicesData || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Modal scroll lock effect
  useEffect(() => {
    if (rejectModal.show || docModal.show || manualRegModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [rejectModal.show, docModal.show, manualRegModal]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sewakhoj-red" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleApprove = async (tasker: any) => {
    setProcessingId(tasker.id);
    try {
      // 1. Update Tasker Status
      const { error: updateError } = await supabase
        .from('taskers')
        .update({ status: 'active', id_verified: true, updated_at: new Date().toISOString() })
        .eq('id', tasker.id);

      if (updateError) throw updateError;

      // 1b. Sync tasker_kyc table status to approved
      await supabase
        .from('tasker_kyc')
        .upsert({
          tasker_id: tasker.id,
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        }, { onConflict: 'tasker_id' });

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
      await auditLog('kyc_approval', { tasker_id: tasker.id, tasker_name: userName }, user?.id || '');

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
      showError("Failed to approve tasker.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.id || !rejectReason) return;
    
    setProcessingId(rejectModal.id);
    try {
      // 1. Update Status to rejected
      const { error: updateError } = await supabase
        .from('taskers')
        .update({ 
          status: 'rejected', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', rejectModal.id);

      if (updateError) throw updateError;

      // 1b. Sync tasker_kyc table status to rejected with feedback note
      await supabase
        .from('tasker_kyc')
        .upsert({
          tasker_id: rejectModal.id,
          status: 'rejected',
          admin_note: rejectReason,
          reviewed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        }, { onConflict: 'tasker_id' });
      
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
        await auditLog('kyc_rejection', { tasker_id: rejectModal.id, reason: rejectReason, tasker_name: userName }, user?.id || '');
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

  const togglePayout = async (id: string, currentStatus: string, amount: number) => {
    if (currentStatus === 'pending') {
      const confirmed = confirm(`Mark Rs ${amount} as settled? This records that money has been transferred.`);
      if (!confirmed) return;
    }
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

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <div className={`p-3 rounded-2xl ${stats.lateMissions > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-green-50 text-green-600'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${stats.lateMissions > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {stats.lateMissions > 0 ? 'Late Detected' : 'All On-Time'}
            </span>
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Ghosting Radar</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.lateMissions}</h3>
          {stats.lateMissions > 0 && <p className="text-[10px] text-red-400 font-bold mt-1">⚠️ Taskers delayed by 30m+</p>}
        </div>
      </div>

      {/* 🚀 New: Tasker Performance Radar (Suggestion 1 & 7) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
           <div className="flex-1">
              <h3 className="text-xl font-black flex items-center gap-3">
                 <TrendingUp className="w-6 h-6 text-sewakhoj-red" /> Performance Intelligence
              </h3>
              <p className="text-slate-400 text-xs mt-1 font-medium">Automatic monitoring of tasker reliability and elite status.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                 <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Elite Pros (Auto-Promoted)</p>
                    <div className="space-y-3">
                       {eliteTaskers.map(t => (
                          <div key={t.id} className="flex items-center justify-between">
                             <span className="text-xs font-bold">{(Array.isArray(t.user) ? t.user[0] : t.user)?.full_name}</span>
                             <span className="bg-amber-400/20 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full">🏆 ELITE</span>
                          </div>
                       ))}
                       {eliteTaskers.length === 0 && <p className="text-[10px] text-slate-600 italic">No taskers hit elite criteria yet.</p>}
                    </div>
                 </div>
                 
                 <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-4">Low Trust Alerts (Radar)</p>
                    <div className="space-y-3">
                       {performanceAlerts.map(t => (
                          <div key={t.id} className="flex items-center justify-between">
                             <span className="text-xs font-bold">{(Array.isArray(t.user) ? t.user[0] : t.user)?.full_name}</span>
                             <span className="text-red-400 text-[10px] font-black flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {t.trust_score}%
                             </span>
                          </div>
                       ))}
                       {performanceAlerts.length === 0 && <p className="text-[10px] text-slate-600 italic">Security clean. No high-risk taskers.</p>}
                    </div>
                 </div>
              </div>
           </div>
        </div>
        <Zap className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 pointer-events-none" />
      </div>

      {/* 🚩 Flagged Taskers — Low Acceptance Rate */}
      {flaggedTaskers.length > 0 && (
        <div className="bg-white rounded-[32px] border border-red-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/50">
            <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-red-700">
              <Flag className="w-4 h-4" /> Flagged Taskers — Low Acceptance Rate
            </h3>
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{flaggedTaskers.length} flagged</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-red-50/30 text-[10px] font-black uppercase text-red-400 tracking-widest">
                <tr>
                  <th className="px-6 py-4">Tasker</th>
                  <th className="px-6 py-4 text-center">Acceptance Rate</th>
                  <th className="px-6 py-4 text-center">Requests</th>
                  <th className="px-6 py-4 text-center">Ghosted</th>
                  <th className="px-6 py-4 text-center">Avg Response</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {flaggedTaskers.map((m: any) => {
                  const taskerUser = m.tasker?.user;
                  const userName = Array.isArray(taskerUser) ? taskerUser[0]?.full_name : taskerUser?.full_name;
                  const userPhone = Array.isArray(taskerUser) ? taskerUser[0]?.phone : taskerUser?.phone;
                  const rate = m.total_requests > 0 ? Math.round((m.accepted_count / m.total_requests) * 100) : 0;
                  const avgRespMin = m.avg_response_seconds ? Math.round(m.avg_response_seconds / 60) : null;
                  return (
                    <tr key={m.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-500">
                            {userName?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-gray-900">{userName || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{userPhone || 'No phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[12px] font-black px-3 py-1 rounded-full ${rate < 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-[12px] font-bold text-gray-700">{m.accepted_count}/{m.total_requests}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[12px] font-bold ${m.timeout_count > 3 ? 'text-red-600' : 'text-gray-500'}`}>
                          {m.timeout_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[11px] font-bold text-gray-500">
                          {avgRespMin !== null ? `${avgRespMin}m` : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/taskers?id=${m.tasker_id}`} className="text-[10px] font-black text-gray-500 hover:text-sewakhoj-red uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-red-50 transition-all">
                            Review
                          </Link>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Send warning to this tasker about low acceptance rate?')) return;
                              const { error } = await supabase.from('notifications').insert({
                                user_id: m.tasker?.user_id,
                                title: '⚠️ Low Acceptance Rate Warning',
                                message: `Your booking acceptance rate is ${rate}%. Please respond to booking requests promptly to avoid account restrictions.`,
                                type: 'alert',
                                link: '/dashboard'
                              });
                              if (!error) {
                                await auditLog('tasker_warned', { user_id: m.tasker?.user_id, rate: rate }, user?.id || '');
                                alert('Warning sent successfully.');
                              }
                            }}
                            className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-amber-50 transition-all"
                          >
                            Warn
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Verification Section */}
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" /> Verification Queue
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hidden sm:block">{pendingTaskers.length} Awaiting</span>
              <button 
                onClick={() => setManualRegModal(true)}
                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sewakhoj-red transition-all"
              >
                Manual Register
              </button>
            </div>
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
                            return finalUser?.avatar_url ? <img src={finalUser.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : finalUser?.full_name?.[0];
                          })()}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
                            {(() => {
                                const u: any = t.user;
                                return Array.isArray(u) ? u[0]?.full_name : u?.full_name;
                            })()}
                            {t.is_elite && <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Elite</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-gray-400 font-medium">
                              {(() => {
                                  const u: any = t.user;
                                  return Array.isArray(u) ? u[0]?.email : u?.email;
                              })()}
                            </p>
                            {t.docs_expiry_date && (
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${new Date(t.docs_expiry_date) < new Date() ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                Exp: {t.docs_expiry_date}
                              </span>
                            )}
                          </div>
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
                        <button 
                          onClick={() => {
                            const u: any = t.user;
                            const name = Array.isArray(u) ? u[0]?.full_name : u?.full_name;
                            setDocModal({ show: true, docs: t.documents, name: name });
                          }}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" 
                          title="View Documents"
                        >
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
                        onChange={() => togglePayout(tx.id, tx.status, tx.total_amount)}
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
            <Link href="/admin/full-access" className="text-[10px] font-black uppercase text-white/50 hover:text-white transition-colors">View All Logs</Link>
        </div>
        <div className="space-y-4">
            {logs.length > 0 ? logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 text-xs group">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        log.action_type === 'kyc_approval' ? 'bg-green-500' : 
                        log.action_type === 'task_broadcast' ? 'bg-blue-500' :
                        log.action_type === 'kyc_rejection' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></span>
                    <div className="flex-1">
                        <p className="opacity-80">
                            <span className="font-bold text-white mr-1">{log.admin?.full_name || 'System'}</span>
                            {log.action_type === 'task_broadcast' ? 'broadcasted a new custom task' :
                             log.action_type === 'kyc_approval' ? `approved KYC for ${log.details?.tasker_name || 'a tasker'}` :
                             log.action_type === 'kyc_rejection' ? `rejected KYC for ${log.details?.tasker_name || 'a tasker'}` :
                             log.action_type.replace(/_/g, ' ')}
                            {log.details?.reason && <span className="block text-[10px] text-white/40 mt-0.5">Reason: {log.details.reason}</span>}
                        </p>
                    </div>
                    <span className="opacity-40 whitespace-nowrap text-[10px]">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            )) : (
                <p className="text-center text-white/20 text-xs py-4">No recent activity logs.</p>
            )}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/20">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Reject Application</h3>
                <p className="text-xs font-bold text-red-500 mt-1 uppercase tracking-widest">Feedback for {rejectModal.name}</p>
              </div>
              <button onClick={() => setRejectModal({ show: false, id: null, name: '' })} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Rejection Reason</label>
                <textarea 
                  placeholder="Tell the tasker why they were rejected (e.g. ID blurry, skills mismatch)..." 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-red-500 focus:bg-white rounded-2xl p-4 font-bold text-sm outline-none transition-all h-32 resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setRejectModal({ show: false, id: null, name: '' })}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReject}
                  disabled={!rejectReason || processingId === rejectModal.id}
                  className="flex-[2] py-4 bg-sewakhoj-red text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-900 transition-all shadow-xl shadow-red-500/10 disabled:opacity-50"
                >
                  {processingId === rejectModal.id ? "Processing..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {docModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-6" onClick={() => setDocModal({ show: false, docs: null, name: '' })}>
          <div className="bg-white w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{docModal.name} - Identity Proofs</h3>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Document Verification Phase</p>
              </div>
              <button onClick={() => setDocModal({ show: false, docs: null, name: '' })} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              {!docModal.docs || Object.keys(docModal.docs).length === 0 ? (
                <div className="text-center py-20">
                  <AlertCircle className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No documents uploaded for this tasker.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {Object.entries(docModal.docs).map(([key, url]: [string, any]) => (
                    <div key={key} className="space-y-4 group">
                      <div className="flex items-center justify-between">
                         <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">{key.replace(/_/g, ' ')}</h4>
                         <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1">
                            Full Size <ExternalLink className="w-3 h-3" />
                         </a>
                      </div>
                      <div className="bg-gray-100 rounded-3xl overflow-hidden aspect-[4/3] relative border-2 border-transparent group-hover:border-blue-500 transition-all">
                        {url.toString().toLowerCase().endsWith('.pdf') ? (
                           <iframe src={url} className="w-full h-full" title={key} />
                        ) : (
                           <img src={url} alt={key} className="w-full h-full object-contain" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button onClick={() => setDocModal({ show: false, docs: null, name: '' })} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">Close Viewer</button>
              <button 
                onClick={() => {
                   const tasker = pendingTaskers.find(t => {
                     const u: any = t.user;
                     return (Array.isArray(u) ? u[0]?.full_name : u?.full_name) === docModal.name;
                   });
                   if (tasker) {
                     setDocModal({ show: false, docs: null, name: '' });
                     handleApprove(tasker);
                   }
                }}
                className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 shadow-xl shadow-green-100 transition-all"
              >
                Approve Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Registration Modal */}
      {manualRegModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/20">
            <div className="p-10 border-b border-gray-50 flex justify-between items-start bg-gray-50/50 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Manual Pro Registration</h3>
                <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">Onboard a specialist directly</p>
              </div>
              <button onClick={() => setManualRegModal(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar">
              <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setProcessingId('manual');
                try {
                  // 1. Check if user exists
                  const { data: existingUser } = await supabase.from('users').select('id').eq('email', manualForm.email).maybeSingle();
                  
                  if (!existingUser) {
                    showError("User with this email does not exist. Please have them sign up as a customer first.");
                    return;
                  }

                  // 2. Create Tasker profile
                  const { data: newTasker, error: tError } = await supabase
                    .from('taskers')
                    .insert({
                      user_id: existingUser.id,
                      status: 'active', // Admin registration is pre-approved
                      id_verified: true,
                      trust_score: 100,
                      skills: manualForm.skills
                    })
                    .select('id')
                    .single();

                  if (tError) throw tError;

                  // Sync tasker_skills junction table
                  if (newTasker && manualForm.skills.length > 0) {
                    const skillRows = manualForm.skills.map((skillId: string) => ({
                      tasker_id: newTasker.id,
                      service_id: skillId,
                      skill_level: 'Intermediate'
                    }));
                    await supabase.from("tasker_skills").insert(skillRows);
                  }

                  // 3. Notify User
                  await supabase.from('notifications').insert({
                    user_id: existingUser.id,
                    title: "You are now a verified Pro! 🚀",
                    message: "An administrator has registered you as a specialist. Welcome to SewaKhoj!",
                    type: 'success'
                  });

                  await auditLog('tasker_registered_manually', { user_id: existingUser.id, full_name: manualForm.fullName }, user?.id || '');

                  fetchData();
                  setManualRegModal(false);
                  setManualForm({ email: "", fullName: "", phone: "", skills: [] });
                } catch (err: any) {
                  showError("Registration failed: " + err.message);
                } finally {
                  setProcessingId(null);
                }
              }}
              className="p-10 space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Account Email</label>
                  <input 
                    type="email" 
                    placeholder="Enter existing user's email" 
                    required 
                    value={manualForm.email}
                    onChange={e => setManualForm({...manualForm, email: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-gray-900 focus:bg-white rounded-2xl p-4 font-bold text-sm transition-all" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Select Primary Skills</label>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto p-2 border border-gray-100 rounded-2xl bg-gray-50 custom-scrollbar">
                    {services.map(service => {
                      const isChecked = manualForm.skills.includes(service.id);
                      return (
                        <label key={service.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'}`}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const checked = manualForm.skills.includes(service.id);
                              setManualForm({
                                ...manualForm,
                                skills: checked
                                  ? manualForm.skills.filter(id => id !== service.id)
                                  : [...manualForm.skills, service.id]
                              });
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs font-black uppercase tracking-tight">{service.name}</span>
                        </label>
                      );
                    })}
                    {services.length === 0 && (
                      <p className="text-[11px] text-gray-400 italic col-span-2 text-center py-4">No services available.</p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                    Admins can only register existing users as Pros. This ensures identity is already tied to a valid account.
                  </p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={processingId === 'manual'}
                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-3"
              >
                {processingId === 'manual' ? "Processing..." : "Complete Registration"}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
