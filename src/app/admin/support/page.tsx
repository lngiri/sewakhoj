"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Search, MessageSquare, AlertTriangle, X, Info, ExternalLink, Star, CheckCircle2, Flag, Clock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { auditLog } from "@/lib/auditLog";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";

export default function SupportDashboard() {
  const { isAdmin, loading: authLoading, hasAccess, role } = useAdminAuth(["super_admin", "admin", "operations", "support"]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [marketTasks, setMarketTasks] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskIntel, setSelectedTaskIntel] = useState<any>(null);
  const [fetchingIntel, setFetchingIntel] = useState(false);
  const [selectedTaskForBids, setSelectedTaskForBids] = useState<any>(null);
  const [confirmResolveDispute, setConfirmResolveDispute] = useState<{ disputeId: string; bookingId: string } | null>(null);

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

      // 3. Fetch Market Tasks (Custom Tasks)
    const { data: mtData } = await supabase
      .from('market_tasks')
      .select(`
        *,
        customer:customer_id(full_name, phone),
        bids:task_bids(*, tasker:taskers(users(full_name, phone)))
      `)
      .order('created_at', { ascending: false });

    if (bData) setBookings(bData);
    if (dData) setDisputes(dData);
    if (mtData) setMarketTasks(mtData);

    // 4. Fetch reviews needing moderation
    const { data: rData } = await supabase
      .from('reviews')
      .select(`*, users!reviews_customer_id_fkey(full_name), taskers!reviews_tasker_id_fkey(users(full_name))`)
      .or('moderation_status.eq.pending,is_flagged.eq.true')
      .order('created_at', { ascending: false });
    if (rData) setReviews(rData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="md" />
      </div>
    );
  }
if (!isAdmin) return null;

// Role-scoped access guard: support desk is for super_admin, admin, operations, and support roles
if (!hasAccess) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Access Restricted</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        Your role ({role}) does not have permission to access the Support Desk.
        This section requires super_admin, admin, operations, or support role.
      </p>
      <Link href="/admin">
        <Button variant="brand" size="pill">Back to Dashboard</Button>
      </Link>
    </div>
  );
}


  const moderateReview = async (reviewId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('reviews')
      .update({ moderation_status: status, is_flagged: false })
      .eq('id', reviewId);
    if (!error) {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await auditLog('review_moderated', { review_id: reviewId, moderation_status: status }, adminUser.id);
      }
      fetchData();
    }
  };

  const resolveDispute = (disputeId: string, bookingId: string) => {
    setConfirmResolveDispute({ disputeId, bookingId });
  };

  const executeResolveDispute = async () => {
    if (!confirmResolveDispute) return;
    const { disputeId, bookingId } = confirmResolveDispute;
    setConfirmResolveDispute(null);

    try {
      const { error: dError } = await supabase
        .from('disputes')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', disputeId);

      if (dError) throw dError;

      await supabase
        .from('bookings')
        .update({ is_disputed: false })
        .eq('id', bookingId);

      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await auditLog('dispute_resolved', { dispute_id: disputeId, booking_id: bookingId }, adminUser.id);
      }

      fetchData();
    } catch (err) {
      console.error("Failed to resolve dispute:", err);
    }
  };

  const handleViewIntel = async (task: any) => {
    setFetchingIntel(true);
    try {
      // Find the broadcast log for this task to get metadata
      const { data: logs } = await supabase
        .from('system_logs')
        .select('*')
        .eq('action_type', 'task_broadcast')
        .eq('target_id', task.customer_id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Try to find matching log by service ID in details
      const match = logs?.find((l: any) => l.details?.service === task.category_id) || logs?.[0];

      setSelectedTaskIntel({
        task,
        metadata: match?.details || {},
        timestamp: match?.created_at || task.created_at
      });
    } catch (err) {
      console.error("Failed to fetch intel:", err);
    } finally {
      setFetchingIntel(false);
    }
  };

  if (loading) return <LoadingSpinner size="md" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Dashboard"
        description="Live bookings, disputes, marketplace tasks, and review moderation."
        relatedLinks={[
          { label: "Command Center", href: "/admin", description: "Back to dashboard" },
          { label: "Operations", href: "/admin/operations", description: "Tasker verification" },
          { label: "Users", href: "/admin/users", description: "User directory" },
        ]}
      />
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
        <div className="admin-stat-card">
          <div className="admin-stat-label">Custom Tasks / खुल्ला कामहरू</div>
          <div className="admin-stat-value text-blue-600">{marketTasks.length}</div>
        </div>
      </div>

      {/* Marketplace Tasks Section */}
      <div className="admin-card">
        <div className="admin-card-header bg-blue-50/30">
          <h3 className="text-[14px] font-black uppercase tracking-wider text-blue-900">Marketplace Tasks (Custom Requests)</h3>
          <span className="admin-badge admin-badge-blue">{marketTasks.filter(t => t.status === 'open').length} Open</span>
        </div>
        <div className="divide-y divide-gray-100">
          {marketTasks.length === 0 ? (
            <div className="p-10 text-center text-gray-400 italic">No custom tasks posted yet.</div>
          ) : marketTasks.map(task => {
            const customerUser = Array.isArray(task.customer) ? task.customer[0] : task.customer;
            return (
              <div key={task.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-bold">
                        {task.title?.[0] || 'T'}
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900 text-lg leading-tight">{task.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{task.location_name} • Rs {task.budget_amount || 'Negotiable'}</p>
                      </div>
                      <span className={`admin-badge ${task.status === 'open' ? 'admin-badge-green' : 'admin-badge-gray'}`}>
                        {task.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 italic font-medium">"{task.description}"</p>
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Posted By</p>
                        <p className="text-xs font-bold">{customerUser?.full_name}</p>
                        <p className="text-[10px] text-gray-500">{customerUser?.phone}</p>
                      </div>
                      <div className="h-8 w-px bg-gray-100" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Activity</p>
                        <p className="text-xs font-bold text-blue-600">{task.bids?.length || 0} Bids Received</p>
                      </div>
                    </div>
                  </div>
                    <div className="flex flex-col gap-2 min-w-[160px]">
                      <button
                        onClick={() => handleViewIntel(task)}
                        disabled={fetchingIntel}
                        className="admin-btn admin-btn-outline !py-2 bg-blue-50 text-blue-600 border-blue-200 text-center text-[11px] flex items-center justify-center gap-2"
                      >
                        {fetchingIntel ? '...' : <Info className="w-3 h-3" />} Seeker Intel
                      </button>
                      <a
                        href={`https://wa.me/977${customerUser?.phone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-btn admin-btn-outline !py-2 bg-green-50 text-green-600 border-green-200 text-center text-[11px]"
                      >
                        Contact Client
                      </a>
                      <button onClick={() => setSelectedTaskForBids(task)} className="admin-btn admin-btn-ghost !py-2 text-[11px]">View Bids</button>
                    </div>
                </div>
              </div>
            );
          })}
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
                const customerUser = Array.isArray(b?.customer) ? b?.customer[0] : b?.customer;
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
                                {d.sla_deadline && (
                                  <div className={`flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest ${
                                    new Date(d.sla_deadline).getTime() - Date.now() < 12 * 60 * 60 * 1000 ? 'text-red-600' : 'text-amber-600'
                                  }`}>
                                    <Clock className="w-3 h-3" />
                                    SLA: {new Date(d.sla_deadline).toLocaleString()}
                                    ({Math.round((new Date(d.sla_deadline).getTime() - Date.now()) / (1000 * 60 * 60))}h remaining)
                                    {d.escalation_level > 0 && (
                                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Escalated L{d.escalation_level}</span>
                                    )}
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-8 text-sm">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Customer</p>
                                        <p className="font-bold">{customerUser?.full_name}</p>
                                        <p className="text-xs text-gray-500">{customerUser?.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Tasker</p>
                                        <p className="font-bold">{tUser?.full_name}</p>
                                        <p className="text-xs text-gray-500">{tUser?.phone}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-[180px]">
                                <button
                                    onClick={() => resolveDispute(d.id, b.id)}
                                    className="admin-btn admin-btn-red !text-[11px]"
                                >
                                    Mark Resolved
                                </button>
                                <Link
                                    href={`/booking/${b.id}/tracking`}
                                    className="admin-btn admin-btn-ghost !text-[11px] flex items-center justify-center"
                                >
                                    Investigate
                                </Link>
                                <a
                                    href={`tel:${customerUser?.phone}`}
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

      <div className="admin-card mt-8">
        <div className="admin-card-header">
          <h3 className="text-[14px] font-bold uppercase tracking-wider text-gray-900">Active Bookings Monitoring / अनुगमन</h3>
          <span className="admin-badge admin-badge-blue">{bookings.length} Live</span>
        </div>

        <div className="divide-y divide-[#e8e8e8]">
          {bookings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">
              No active bookings currently being monitored.
            </div>
          ) : bookings.map(b => {
            const tUser = Array.isArray(b.tasker?.users) ? b.tasker?.users[0] : b.tasker?.users;
            const customerUser = Array.isArray(b.customer) ? b.customer[0] : b.customer;
            return (
              <div key={b.id} className="p-6 flex flex-col md:flex-row justify-between hover:bg-[#fafafa] transition-colors">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#1a1a2e] text-white px-2 py-0.5 rounded text-[10px] font-mono">#{b.id.split('-')[0]}</span>
                    <span className="font-bold text-[16px] text-foreground">{b.service}</span>
                    <span className={`admin-badge ${
                      b.status === 'pending' || b.status === 'pending_acceptance' ? 'admin-badge-amber' :
                      b.status === 'accepted' || b.status === 'on-the-way' || b.status === 'arrived' || b.status === 'in-progress' ? 'admin-badge-blue' :
                      'admin-badge-green'
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
                      <p className="font-bold text-[13px]">{customerUser?.full_name}</p>
                      <p className="text-[12px] text-muted-foreground">{customerUser?.phone}</p>
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
                    href={`https://wa.me/977${customerUser?.phone?.replace(/\D/g, '')}`}
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

      <Modal
        open={!!selectedTaskForBids}
        onClose={() => setSelectedTaskForBids(null)}
        title={`Bids for "${selectedTaskForBids?.title}"`}
        description={`Total ${selectedTaskForBids?.bids?.length || 0} bids received`}
        size="lg"
      >
        {selectedTaskForBids && (
          <div className="space-y-4">
            {(!selectedTaskForBids.bids || selectedTaskForBids.bids.length === 0) ? (
                <div className="text-center p-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-bold">No bids received yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedTaskForBids.bids.map((bid: any) => {
                    const taskerUser = Array.isArray(bid.tasker?.users) ? bid.tasker?.users[0] : bid.tasker?.users;
                    return (
                      <div key={bid.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 font-black flex items-center justify-center rounded-xl">
                              {taskerUser?.full_name?.[0] || 'T'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{taskerUser?.full_name || 'Unknown Tasker'}</p>
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{taskerUser?.phone || 'No phone'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-lg text-gray-900">Rs {bid.amount}</p>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${bid.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {bid.status}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-sm font-medium text-gray-700 italic">"{bid.message}"</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmResolveDispute}
        onCancel={() => setConfirmResolveDispute(null)}
        onConfirm={executeResolveDispute}
        title="Resolve Dispute"
        message="Are you sure you want to mark this dispute as resolved?"
        variant="danger"
        confirmLabel="Yes, Resolve"
      />

      {/* Seeker Intel Modal */}
      <Modal
        open={!!selectedTaskIntel}
        onClose={() => setSelectedTaskIntel(null)}
        title="Seeker Identity Intelligence"
        description="Metadata Audit: Verified Stream"
        size="lg"
      >
        {selectedTaskIntel && (() => {
          const customerUser = Array.isArray(selectedTaskIntel.task.customer) ? selectedTaskIntel.task.customer[0] : selectedTaskIntel.task.customer;
          return (
            <div className="space-y-8">
              <div className="overflow-hidden rounded-[24px] border border-gray-100 shadow-sm">
                <table className="w-full text-left text-sm border-collapse">
                  <tbody className="divide-y divide-gray-50 font-bold">
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 uppercase text-[10px] tracking-widest bg-gray-50/30 w-1/3">Full Name</td>
                      <td className="px-6 py-4 text-gray-900">{customerUser?.full_name || 'N/A'}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 uppercase text-[10px] tracking-widest bg-gray-50/30">Email Address</td>
                      <td className="px-6 py-4 text-gray-900">{customerUser?.email || 'N/A'}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 uppercase text-[10px] tracking-widest bg-gray-50/30">IP Address</td>
                      <td className="px-6 py-4 text-gray-900 font-mono text-xs">{selectedTaskIntel.metadata.user_ip || 'N/A'}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 uppercase text-[10px] tracking-widest bg-gray-50/30">Phone Number</td>
                      <td className="px-6 py-4 text-gray-900 font-mono">{customerUser?.phone || 'N/A'}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 uppercase text-[10px] tracking-widest bg-gray-50/30">Platform/UA</td>
                      <td className="px-6 py-4 text-gray-900 text-xs break-all leading-relaxed">
                        {selectedTaskIntel.metadata.platform?.includes('Mobile') ? '📱 Mobile App' :
                         selectedTaskIntel.metadata.platform?.includes('PC') ? '💻 Desktop' : '🌐 Browser'}
                        <span className="block opacity-40 font-normal mt-1">{selectedTaskIntel.metadata.platform || 'System Direct'}</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 uppercase text-[10px] tracking-widest bg-gray-50/30">User GPS (Live)</td>
                      <td className="px-6 py-4">
                         {selectedTaskIntel.metadata.user_location ? (
                           <div className="space-y-1">
                             <p className="text-gray-900 font-mono">{selectedTaskIntel.metadata.user_location.lat.toFixed(6)}, {selectedTaskIntel.metadata.user_location.lng.toFixed(6)}</p>
                             <a
                               href={`https://www.google.com/maps?q=${selectedTaskIntel.metadata.user_location.lat},${selectedTaskIntel.metadata.user_location.lng}`}
                               target="_blank"
                               className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                             >
                                View on Radar <ExternalLink className="w-3 h-3" />
                             </a>
                           </div>
                         ) : (
                           <span className="text-red-400 font-black italic">Permission Denied / Hidden</span>
                         )}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 uppercase text-[10px] tracking-widest bg-gray-50/30">Posting Time</td>
                      <td className="px-6 py-4 text-gray-900">{new Date(selectedTaskIntel.timestamp).toLocaleString()}</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-400 uppercase text-[10px] tracking-widest bg-gray-50/30">Confidence</td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                               <div className={`h-full ${selectedTaskIntel.metadata.security_confidence ? 'bg-green-500 w-[95%]' : 'bg-red-500 w-[30%]'}`}></div>
                            </div>
                            <span className={`text-[11px] font-black ${selectedTaskIntel.metadata.security_confidence ? 'text-green-600' : 'text-red-600'}`}>
                               {selectedTaskIntel.metadata.security_confidence ? 'HIGH: PROXIMITY VERIFIED' : 'LOW: UNVERIFIED ORIGIN'}
                            </span>
                         </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Review Moderation Section */}
      {reviews.length > 0 && (
        <div className="admin-card border-amber-200 mt-8">
          <div className="admin-card-header bg-amber-50/50">
            <h3 className="text-[14px] font-black uppercase tracking-wider text-amber-900">Review Moderation / समीक्षा नियन्त्रण</h3>
            <span className="admin-badge admin-badge-amber">{reviews.length} Pending</span>
          </div>
          <div className="divide-y divide-amber-100">
            {reviews.map((review) => {
              const taskerUser = Array.isArray(review.taskers?.users) ? review.taskers?.users[0] : review.taskers?.users;
              const customerUser = Array.isArray(review.users) ? review.users[0] : review.users;
              return (
                <div key={review.id} className="p-6 hover:bg-amber-50/30 transition-colors">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
                          {customerUser?.full_name?.[0] || 'C'}
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{customerUser?.full_name || 'Customer'}</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                            ))}
                            <span className="text-[10px] text-gray-400 font-bold ml-2">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-auto">
                          {review.is_flagged && (
                            <span className="admin-badge admin-badge-red flex items-center gap-1">
                              <Flag className="w-3 h-3" /> FLAGGED
                            </span>
                          )}
                          <span className={`admin-badge ${review.moderation_status === 'pending' ? 'admin-badge-amber' : review.moderation_status === 'approved' ? 'admin-badge-green' : 'admin-badge-red'}`}>
                            {review.moderation_status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 font-medium italic ml-13">"{review.comment}"</p>
                      )}
                      <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-13">
                        <span>Tasker: {taskerUser?.full_name || 'Unknown'}</span>
                        <span>Booking #{review.booking_id?.split('-')[0] || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <button
                        onClick={() => moderateReview(review.id, 'approved')}
                        className="admin-btn admin-btn-green !py-2 !text-[11px] flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => moderateReview(review.id, 'rejected')}
                        className="admin-btn admin-btn-red !py-2 !text-[11px] flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
