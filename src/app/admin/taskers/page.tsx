"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, FileText, AlertCircle, ArrowLeft,
  ShieldCheck, Mail, Send, Check, Calendar, Search, Filter,
  Star, Briefcase, MessageSquare, UserRound, Ban, Users,
  MoreVertical, EyeOff, Eye, Clock
} from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";

type StatusTab = "all" | "pending" | "active" | "suspended" | "rejected";

const STATUS_TABS: { key: StatusTab; label: string; color: string }[] = [
  { key: "all", label: "All Taskers", color: "text-blue-600 border-blue-500 bg-blue-50" },
  { key: "pending", label: "Pending", color: "text-amber-600 border-amber-500 bg-amber-50" },
  { key: "active", label: "Active", color: "text-green-600 border-green-500 bg-green-50" },
  { key: "suspended", label: "Suspended", color: "text-red-600 border-red-500 bg-red-50" },
  { key: "rejected", label: "Rejected", color: "text-gray-600 border-gray-400 bg-gray-50" },
];

export default function AdminTaskersPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { showSuccess, showError } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");
  const [taskers, setTaskers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTaskerId, setSelectedTaskerId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Send Notification Modal State
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyUserId, setNotifyUserId] = useState("");
  const [notifyUserName, setNotifyUserName] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyLink, setNotifyLink] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [rejecting, setRejecting] = useState(false);

  // Confirm Dialog State
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [confirmNudge, setConfirmNudge] = useState<any>(null);

  // Verification Toggles State
  const [verificationPillars, setVerificationPillars] = useState<Record<string, { id: boolean, background: boolean, gear: boolean }>>({});

  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTaskers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("taskers")
        .select(`
          *,
          users (id, full_name, phone, email, avatar_url),
          tasker_kyc (*)
        `)
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch taskers:", error);
        return;
      }

      setTaskers(data || []);

      if (activeTab === "pending") {
        const initialToggles: any = {};
        (data || []).forEach((t: any) => {
          const hasKyc = t.tasker_kyc && t.tasker_kyc.length > 0;
          initialToggles[t.id] = { id: hasKyc, background: false, gear: false };
        });
        setVerificationPillars(initialToggles);
      }
    } catch (err) {
      console.error("Failed to fetch taskers:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTaskers();
  }, [fetchTaskers]);

  // Re-fetch when tab changes
  useEffect(() => {
    setSelectedIds([]);
    fetchTaskers();
  }, [activeTab, fetchTaskers]);

  if (authLoading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  if (!isAdmin) return null;

  const togglePillar = (taskerId: string, pillar: 'id' | 'background' | 'gear') => {
    setVerificationPillars(prev => ({
      ...prev,
      [taskerId]: {
        ...prev[taskerId],
        [pillar]: !prev[taskerId][pillar]
      }
    }));
  };

  const approveTasker = async (taskerId: string) => {
    const pillars = verificationPillars[taskerId];
    if (!pillars.id) {
      showError("ID Verification is mandatory for approval.");
      setConfirmApprove(null);
      return;
    }

    setConfirmApprove(null);
    setLoading(true);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) { showError("You must be logged in as admin."); return; }

      const { data: tasker, error: tErr } = await supabase
        .from("taskers")
        .select("*, users(full_name)")
        .eq("id", taskerId)
        .single();

      if (tErr || !tasker) { showError("Tasker not found."); return; }

      const taskerUser = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;

      await supabase.from('taskers').update({ status: 'active', id_verified: pillars.id, updated_at: new Date().toISOString() }).eq('id', taskerId);
      await supabase.from('tasker_kyc').upsert({ tasker_id: taskerId, status: 'approved', reviewed_at: new Date().toISOString(), submitted_at: new Date().toISOString() }, { onConflict: 'tasker_id' });
      await supabase.from('notifications').insert({ user_id: tasker.user_id, title: "Application Approved! 🎉", message: `Congratulations ${taskerUser?.full_name?.split(' ')[0]}! Your SewaKhoj Tasker profile is now active.`, type: 'status', link: '/dashboard' });
      await supabase.from('system_logs').insert({ admin_id: adminUser.id, action_type: 'kyc_approval', target_id: taskerId, details: { tasker_name: taskerUser?.full_name, pillars: { id: pillars.id, background: pillars.background, gear: pillars.gear } } });

      showSuccess("Tasker Approved and Activated!");
      fetchTaskers();
    } catch (err: any) {
      showError(err.message || "Failed to approve tasker.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTaskerId || !rejectReason.trim()) { showError("Please provide a rejection reason."); return; }
    setRejecting(true);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) { showError("You must be logged in as admin."); return; }

      const { data: tasker, error: tErr } = await supabase.from("taskers").select("*, users(full_name)").eq("id", selectedTaskerId).single();
      if (tErr || !tasker) { showError("Tasker not found."); return; }

      const taskerUser = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;

      await supabase.from('taskers').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', selectedTaskerId);
      await supabase.from('tasker_kyc').upsert({ tasker_id: selectedTaskerId, status: 'rejected', admin_note: rejectReason, reviewed_at: new Date().toISOString(), submitted_at: new Date().toISOString() }, { onConflict: 'tasker_id' });
      await supabase.from('notifications').insert({ user_id: tasker.user_id, title: "KYC Update Needed", message: `We couldn't approve your profile yet. Reason: ${rejectReason}. Please update your documents.`, type: 'warning', link: '/tasker/onboard' });
      await supabase.from('system_logs').insert({ admin_id: adminUser.id, action_type: 'kyc_rejection', target_id: selectedTaskerId, details: { reason: rejectReason, tasker_name: taskerUser?.full_name } });

      showSuccess("Tasker rejected and feedback sent.");
      setShowRejectModal(false);
      setRejectReason("");
      fetchTaskers();
    } catch (err: any) {
      showError(err.message || "Failed to reject tasker.");
    } finally {
      setRejecting(false);
    }
  };

  const sendNudge = async (tasker: any) => {
    setConfirmNudge(null);
    const { error } = await supabase.from("notifications").insert({
      user_id: tasker.user_id, title: "Complete Your SewaKhoj Profile",
      message: "You are one step away from earning! Please complete your KYC and profile setup.",
      type: "info", link: "/tasker/onboard"
    });
    if (!error) showSuccess("Nudge sent to tasker!");
    else showError("Failed to send nudge.");
  };

  const toggleSelect = (e: React.SyntheticEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTaskers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTaskers.map(t => t.id));
    }
  };

  const clearSelection = () => setSelectedIds([]);

  const sendNotification = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) { showError("Title and message are required."); return; }
    setSendingNotify(true);
    try {
      const userIds = notifyUserId ? [notifyUserId] : selectedIds.map(id => taskers.find(t => t.id === id)?.user_id).filter(Boolean);
      if (userIds.length === 0) { showError("No recipients selected."); return; }

      const notifications = userIds.map(uid => ({
        user_id: uid,
        title: notifyTitle.trim(),
        message: notifyMessage.trim(),
        type: 'info' as const,
        link: notifyLink || null,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      const count = userIds.length;
      showSuccess(`Notification sent to ${count} user${count > 1 ? 's' : ''}`);
      setShowNotifyModal(false);
      setSelectedIds([]);
      setNotifyTitle(""); setNotifyMessage(""); setNotifyLink("");
    } catch (err: any) {
      showError(err.message || "Failed to send notification");
    } finally {
      setSendingNotify(false);
    }
  };

  const openNotifyModal = (userId?: string, userName?: string) => {
    if (userId) {
      setNotifyUserId(userId); setNotifyUserName(userName || 'Tasker');
    } else {
      setNotifyUserId('');
      setNotifyUserName(`${selectedIds.length} taskers`);
    }
    setNotifyTitle(""); setNotifyMessage(""); setNotifyLink("");
    setShowNotifyModal(true); setActionMenuOpen(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-200"><CheckCircle2 className="w-3 h-3" /> Active</span>;
      case 'pending': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>;
      case 'suspended': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-700 border border-red-200"><Ban className="w-3 h-3" /> Suspended</span>;
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 border border-gray-200"><XCircle className="w-3 h-3" /> {status}</span>;
    }
  };

  // Filter by search + date range
  const filteredTaskers = taskers.filter(t => {
    const user = Array.isArray(t.users) ? t.users[0] : t.users;
    const matchesSearch = !searchTerm ||
      user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.phone?.includes(searchTerm) ||
      t.skills?.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDate = true;
    if (startDate || endDate) {
      if (!t.created_at) {
        matchesDate = false;
      } else {
        const createdDate = new Date(t.created_at);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (createdDate < start) matchesDate = false;
        }
        if (endDate && matchesDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (createdDate > end) matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesDate;
  });

  // Counts for each tab
  const tabCounts: Record<string, number> = { all: taskers.length };
  for (const t of taskers) {
    tabCounts[t.status] = (tabCounts[t.status] || 0) + 1;
  }

  const renderCompactTable = () => (
    <div className="bg-white border border-gray-100 shadow-sm rounded-[2rem] overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredTaskers.length && filteredTaskers.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tasker</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rating</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Jobs</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
              <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredTaskers.map((tasker) => {
              const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
              const isHighlighted = highlightId === tasker.id;
              return (
                <tr
                  key={tasker.id}
                  ref={isHighlighted ? (el) => { if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); } : undefined}
                  className={`hover:bg-blue-50/30 transition-colors group cursor-pointer ${isHighlighted ? 'bg-blue-100/70 ring-2 ring-blue-400 ring-inset shadow-sm' : ''} ${selectedIds.includes(tasker.id) ? 'bg-blue-50/50' : ''}`}
                  onClick={() => router.push(`/admin/taskers?id=${tasker.id}`)}
                >
                  <td className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tasker.id)}
                      onChange={(e) => toggleSelect(e, tasker.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center font-bold text-gray-400 text-xs shrink-0">
                        {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                          : user?.full_name?.[0] || 'T'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{user?.full_name || 'Unknown'}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{tasker.skills?.slice(0, 2).join(", ") || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-xs font-medium text-gray-500">{user?.email || '—'}</p>
                    <p className="text-xs font-bold text-gray-700">{user?.phone || '—'}</p>
                  </td>
                  <td className="px-5 py-3">{getStatusBadge(tasker.status)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-black text-sm">{tasker.rating?.toFixed(1) || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-bold text-sm">{tasker.total_jobs || 0}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-bold text-sm text-gray-900">
                    Rs {tasker.hourly_rate || '—'}
                  </td>
                  <td className="px-5 py-3 text-xs font-bold text-gray-500">
                    {new Date(tasker.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActionMenuOpen(actionMenuOpen === tasker.id ? null : tasker.id); }}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>

                    {actionMenuOpen === tasker.id && (
                      <div ref={actionMenuRef} className="absolute right-6 top-full mt-1 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3 py-2 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-50 mb-1">{user?.full_name}</div>

                        <button
                          onClick={(e) => { e.stopPropagation(); setActionMenuOpen(null); window.open(`/tasker/${tasker.id}`, '_blank'); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-purple-600 hover:bg-purple-50 rounded-xl transition-colors text-left"
                        >
                          <UserRound className="w-4 h-4" /> View Public Profile
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); openNotifyModal(tasker.user_id, user?.full_name || 'Tasker'); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-left"
                        >
                          <Send className="w-4 h-4" /> Send Notification
                        </button>

                        <a
                          href={`https://wa.me/977${user?.phone?.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors text-left"
                        >
                          💬 WhatsApp
                        </a>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 p-4 border-t border-gray-100 text-right">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Showing {filteredTaskers.length} of {taskers.length} Taskers</p>
      </div>
    </div>
  );

  const renderPendingCards = () => (
    <div className="space-y-6">
      {filteredTaskers.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-10 h-10 text-green-500" />}
          title="Queue Clear"
          description="There are no pending tasker applications to review."
          action={{ label: "Back to Dashboard", href: "/admin" }}
        />
      ) : (
        filteredTaskers.map((tasker) => {
          const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
          const pillars = verificationPillars[tasker.id] || { id: false, background: false, gear: false };
          const isIncomplete = !tasker.id_document_url || !tasker.hourly_rate;

          return (
            <div
              key={tasker.id}
              ref={highlightId === tasker.id ? (el) => { if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); } : undefined}
              className={`relative bg-white p-8 pt-12 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-8 cursor-pointer hover:border-sewakhoj-red/30 hover:shadow-md transition-all ${highlightId === tasker.id ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/30 border-blue-300' : ''} ${selectedIds.includes(tasker.id) ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''}`}
              onClick={() => router.push(`/admin/taskers?id=${tasker.id}`)}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(tasker.id)}
                  onChange={(e) => toggleSelect(e, tasker.id)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              {/* Profile & Contact */}
              <div className="lg:w-1/4 shrink-0">
                <div className="w-24 h-24 bg-gray-100 rounded-[2rem] overflow-hidden mb-4 border border-gray-200 shadow-inner">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-contain bg-gray-900" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-black uppercase tracking-widest bg-gray-50">No Photo</div>
                  )}
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight">{user?.full_name || "Unknown User"}</h2>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100"><Mail className="w-3.5 h-3.5 text-blue-500" /> {user?.email}</p>
                  <p className="text-xs font-bold text-gray-500 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100"><span className="text-[10px]">📞</span> {user?.phone}</p>
                </div>
              </div>

              {/* Application Details & Toggles */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Application File: <span className="text-gray-900">#{tasker.id.slice(0, 8)}</span></span>
                  {isIncomplete ? (
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">Incomplete Profile</span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">Ready for Review</span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-5 rounded-[1.5rem] border border-gray-100">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Services</p>
                    <p className="font-black text-xs text-gray-900 line-clamp-1">{tasker.skills?.join(", ") || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Rate</p>
                    <p className="font-black text-xs text-gray-900">Rs {tasker.hourly_rate || 0}/hr</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">City</p>
                    <p className="font-black text-xs text-gray-900 capitalize">{tasker.city || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">KYC Documents</p>
                    {tasker.tasker_kyc && tasker.tasker_kyc.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={(e) => { e.stopPropagation(); if (tasker.tasker_kyc[0].document_front_url) window.open(tasker.tasker_kyc[0].document_front_url, '_blank'); }}
                          className="text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Front
                        </button>
                        {tasker.tasker_kyc[0].document_back_url && (
                          <button onClick={(e) => { e.stopPropagation(); if (tasker.tasker_kyc[0].document_back_url) window.open(tasker.tasker_kyc[0].document_back_url, '_blank'); }}
                            className="text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Back
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); if (tasker.tasker_kyc[0].selfie_url) window.open(tasker.tasker_kyc[0].selfie_url, '_blank'); }}
                          className="text-purple-600 font-black text-[10px] uppercase bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Selfie
                        </button>
                      </div>
                    ) : (
                      <span className="text-red-500 font-black text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Missing KYC</span>
                    )}
                  </div>
                </div>

                {/* Verification Pillars */}
                {!isIncomplete && (
                  <div className="mb-6">
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">Trust Pillars Verification</p>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={(e) => { e.stopPropagation(); togglePillar(tasker.id, 'id'); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${pillars.id ? 'bg-green-50 text-green-700 border-green-500' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
                        <ShieldCheck className="w-4 h-4" /> Valid ID
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); togglePillar(tasker.id, 'background'); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${pillars.background ? 'bg-green-50 text-green-700 border-green-500' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
                        <ShieldCheck className="w-4 h-4" /> Background
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); togglePillar(tasker.id, 'gear'); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${pillars.gear ? 'bg-green-50 text-green-700 border-green-500' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}>
                        <ShieldCheck className="w-4 h-4" /> Gear Check
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                  {isIncomplete ? (
                    <>
                      <Button variant="brand" size="pill" onClick={(e) => { e.stopPropagation(); setConfirmNudge(tasker); }}>
                        <Send className="w-4 h-4" /> Send Completion Nudge
                      </Button>
                      <Button variant="brand-ghost" size="pill" onClick={(e) => { e.stopPropagation(); openNotifyModal(tasker.user_id, user?.full_name || 'Tasker'); }}>
                        <MessageSquare className="w-4 h-4" /> Notify
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="brand" size="pill" className="!bg-green-500 hover:!bg-green-600 !shadow-green-500/20"
                        onClick={(e) => { e.stopPropagation(); setConfirmApprove(tasker.id); }}>
                        <Check className="w-4 h-4" /> Final Approval
                      </Button>
                      <Button variant="brand-ghost" size="pill"
                        onClick={(e) => { e.stopPropagation(); setSelectedTaskerId(tasker.id); setShowRejectModal(true); }}>
                        <XCircle className="w-4 h-4" /> Reject & Feedback
                      </Button>
                      <Button variant="brand-ghost" size="pill" onClick={(e) => { e.stopPropagation(); openNotifyModal(tasker.user_id, user?.full_name || 'Tasker'); }}>
                        <MessageSquare className="w-4 h-4" /> Notify
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">Loading tasker registry...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 pb-12 ${activeTab === 'pending' ? 'max-w-5xl mx-auto' : 'max-w-7xl mx-auto'}`}>
      <div className="flex items-center justify-between">
        <PageHeader
          title="Tasker Registry"
          description={`${activeTab === 'pending' ? 'KYC Review Queue' : `Viewing ${activeTab === 'all' ? 'all' : activeTab} taskers`}`}
          backHref="/admin"
          showBack
          className="mb-0"
          relatedLinks={[
            { label: "Command Center", href: "/admin", description: "Back to dashboard" },
            { label: "User Database", href: "/admin/users", description: "All registered users" },
            { label: "Operations", href: "/admin/operations", description: "Performance & flagged taskers" },
          ]}
        />
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === tab.key
                ? tab.color + ' shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? 'bg-white/60' : 'bg-gray-100 text-gray-500'
            }`}>
              {tabCounts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar: Search + Date Range */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab} taskers...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-100 font-bold text-sm outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px] bg-gray-50 border-none pl-10 pr-3 py-3 rounded-xl font-bold text-xs text-gray-700 focus:ring-2 focus:ring-blue-100 outline-none" />
          </div>
          <span className="text-gray-300 font-bold text-xs">—</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px] bg-gray-50 border-none pl-10 pr-3 py-3 rounded-xl font-bold text-xs text-gray-700 focus:ring-2 focus:ring-blue-100 outline-none" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'pending' ? renderPendingCards() : renderCompactTable()}

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-0 z-30 animate-in slide-in-from-bottom-2 fade-in">
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-white font-bold text-sm">{selectedIds.length} selected</span>
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors ml-2"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="brand"
                size="pill"
                onClick={() => openNotifyModal()}
              >
                <Send className="w-4 h-4" /> Send Notification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      <Modal
        open={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectReason(""); }}
        title="Reject Application"
        description="This will send a feedback notification to the tasker."
        size="md"
      >
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest">Reason for rejection</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {["Blurry ID Photo", "ID Mismatch", "Missing Skills", "Incomplete Tools"].map(reason => (
              <button key={reason} onClick={() => setRejectReason(reason)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${rejectReason === reason ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}>
                {reason}
              </button>
            ))}
          </div>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
            placeholder="Or type custom reason here..."
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-medium focus:bg-white focus:border-red-500/20 focus:outline-none transition-all" />
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="brand" size="pill" className="flex-1 !bg-red-600 hover:!bg-red-700"
            onClick={handleReject} disabled={rejecting || !rejectReason}>
            {rejecting ? 'Sending...' : 'Reject & Notify'}
          </Button>
          <Button variant="brand-ghost" size="pill" className="flex-1"
            onClick={() => { setShowRejectModal(false); setRejectReason(""); }}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* SEND NOTIFICATION MODAL */}
      <Modal
        open={showNotifyModal}
        onClose={() => { setShowNotifyModal(false); setNotifyTitle(""); setNotifyMessage(""); setNotifyLink(""); }}
        title={`Send Notification to ${notifyUserName}`}
        description="This will create an in-app notification visible on their dashboard."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1.5">Notification Title</label>
            <input type="text" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="e.g. Profile Update Required"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-medium focus:bg-white focus:border-blue-500/20 focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1.5">Message</label>
            <textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} rows={3}
              placeholder="Type your message..."
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-medium focus:bg-white focus:border-blue-500/20 focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1.5">Optional Link</label>
            <input type="text" value={notifyLink} onChange={(e) => setNotifyLink(e.target.value)}
              placeholder="e.g. /dashboard or /tasker/onboard"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-medium focus:bg-white focus:border-blue-500/20 focus:outline-none transition-all" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="brand" size="pill" className="flex-1" onClick={sendNotification}
            disabled={sendingNotify || !notifyTitle.trim() || !notifyMessage.trim()}>
            {sendingNotify ? 'Sending...' : 'Send Notification'}
          </Button>
          <Button variant="brand-ghost" size="pill" className="flex-1"
            onClick={() => { setShowNotifyModal(false); setNotifyTitle(""); setNotifyMessage(""); setNotifyLink(""); }}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* APPROVAL CONFIRM DIALOG */}
      <ConfirmDialog
        open={!!confirmApprove}
        onConfirm={() => confirmApprove && approveTasker(confirmApprove)}
        onCancel={() => setConfirmApprove(null)}
        title="Approve Tasker"
        message="Are you sure you want to approve this tasker? They will immediately appear to customers."
        confirmLabel="Approve Tasker"
        variant="default"
      />

      {/* NUDGE CONFIRM DIALOG */}
      <ConfirmDialog
        open={!!confirmNudge}
        onConfirm={() => confirmNudge && sendNudge(confirmNudge)}
        onCancel={() => setConfirmNudge(null)}
        title="Send Nudge"
        message={`Send completion reminder to ${confirmNudge?.users?.full_name || 'this tasker'}?`}
        confirmLabel="Send Nudge"
        variant="default"
      />
    </div>
  );
}
