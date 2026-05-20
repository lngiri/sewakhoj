"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, FileText, AlertCircle, ArrowLeft, ShieldCheck, Mail, Send, Check } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";

export default function AdminTaskersPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { showSuccess, showError } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");
  const [taskers, setTaskers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTaskerId, setSelectedTaskerId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Confirm Dialog State
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [confirmNudge, setConfirmNudge] = useState<any>(null);

  // Verification Toggles State
  const [verificationPillars, setVerificationPillars] = useState<Record<string, { id: boolean, background: boolean, gear: boolean }>>({});

  const fetchPendingTaskers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("taskers")
      .select(`
        *,
        users (full_name, phone, email, avatar_url),
        tasker_kyc (*)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTaskers(data);
      // Initialize toggles
      const initialToggles: any = {};
      data.forEach((t: any) => {
        const hasKyc = t.tasker_kyc && t.tasker_kyc.length > 0;
        initialToggles[t.id] = {
          id: hasKyc ? true : false,
          background: false,
          gear: false
        };
      });
      setVerificationPillars(initialToggles);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPendingTaskers();
  }, [fetchPendingTaskers]);

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
      if (!adminUser) {
        showError("You must be logged in as admin.");
        return;
      }

      const { data: tasker, error: tErr } = await supabase
        .from("taskers")
        .select("*, users(full_name)")
        .eq("id", taskerId)
        .single();
      
      if (tErr || !tasker) {
        showError("Tasker not found.");
        return;
      }

      const taskerUser = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;

      // 1. Update Tasker Status
      const { error: updateError } = await supabase
        .from('taskers')
        .update({ 
          status: 'active', 
          id_verified: pillars.id, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', taskerId);

      if (updateError) throw updateError;

      // 2. Sync tasker_kyc table status to approved
      await supabase
        .from('tasker_kyc')
        .upsert({
          tasker_id: taskerId,
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        }, { onConflict: 'tasker_id' });

      // 3. Send In-App Notification
      await supabase.from('notifications').insert({
        user_id: tasker.user_id,
        title: "Application Approved! 🎉",
        message: `Congratulations ${taskerUser?.full_name?.split(' ')[0]}! Your SewaKhoj Tasker profile is now active. You can now start receiving bookings.`,
        type: 'status',
        link: '/dashboard'
      });

      // 4. Log Action
      await supabase.from('system_logs').insert({
        admin_id: adminUser.id,
        action_type: 'kyc_approval',
        target_id: taskerId,
        details: { 
          tasker_name: taskerUser?.full_name,
          pillars: { id: pillars.id, background: pillars.background, gear: pillars.gear }
        }
      });

      showSuccess("Tasker Approved and Activated!");
      fetchPendingTaskers();
    } catch (err: any) {
      console.error(err);
      showError(err.message || "Failed to approve tasker.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTaskerId || !rejectReason.trim()) {
      showError("Please provide a rejection reason.");
      return;
    }
    setRejecting(true);

    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) {
        showError("You must be logged in as admin.");
        return;
      }

      const { data: tasker, error: tErr } = await supabase
        .from("taskers")
        .select("*, users(full_name)")
        .eq("id", selectedTaskerId)
        .single();
      
      if (tErr || !tasker) {
        showError("Tasker not found.");
        return;
      }

      const taskerUser = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;

      // 1. Update Status to rejected
      const { error: updateError } = await supabase
        .from('taskers')
        .update({ 
          status: 'rejected', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedTaskerId);

      if (updateError) throw updateError;

      // 2. Sync tasker_kyc table status to rejected with feedback note
      await supabase
        .from('tasker_kyc')
        .upsert({
          tasker_id: selectedTaskerId,
          status: 'rejected',
          admin_note: rejectReason,
          reviewed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        }, { onConflict: 'tasker_id' });

      // 3. Send Feedback Notification
      await supabase.from('notifications').insert({
        user_id: tasker.user_id,
        title: "KYC Update Needed",
        message: `We couldn't approve your profile yet. Reason: ${rejectReason}. Please update your documents.`,
        type: 'warning',
        link: '/tasker/onboard'
      });

      // 4. Log Action
      await supabase.from('system_logs').insert({
        admin_id: adminUser.id,
        action_type: 'kyc_rejection',
        target_id: selectedTaskerId,
        details: { reason: rejectReason, tasker_name: taskerUser?.full_name }
      });

      showSuccess("Tasker rejected and feedback sent.");
      setShowRejectModal(false);
      setRejectReason("");
      fetchPendingTaskers();
    } catch (err: any) {
      console.error(err);
      showError(err.message || "Failed to reject tasker.");
    } finally {
      setRejecting(false);
    }
  };

  const sendNudge = async (tasker: any) => {
    setConfirmNudge(null);
    
    const { error } = await supabase.from("notifications").insert({
      user_id: tasker.user_id,
      title: "Complete Your SewaKhoj Profile",
      message: "You are one step away from earning! Please complete your KYC and profile setup.",
      type: "info",
      link: "/tasker/onboard"
    });

    if (!error) {
      showSuccess("Nudge sent to tasker!");
    } else {
      showError("Failed to send nudge.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">Loading KYC queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <PageHeader
          title="KYC Review & Operations"
          description="Pending Tasker Verification Queue"
          backHref="/admin"
          showBack
          className="mb-0"
          relatedLinks={[
            { label: "Command Center", href: "/admin", description: "Back to dashboard" },
            { label: "User Database", href: "/admin/users", description: "All registered users" },
            { label: "Operations", href: "/admin/operations", description: "Performance & flagged taskers" },
          ]}
        />
        <div className="flex items-center gap-2 shrink-0">
           <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
           <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{taskers.length} Pending</span>
        </div>
      </div>

      {taskers.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-10 h-10 text-green-500" />}
          title="Queue Clear"
          description="There are no pending tasker applications to review. Operations are fully stabilized."
          action={{ label: "Back to Dashboard", href: "/admin" }}
        />
      ) : (
        <div className="space-y-6">
          {taskers.map((tasker) => {
            const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
            const pillars = verificationPillars[tasker.id] || { id: false, background: false, gear: false };
            const isIncomplete = !tasker.id_document_url || !tasker.hourly_rate;

            return (
              <div
                key={tasker.id}
                ref={highlightId === tasker.id ? (el) => { if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); } } : undefined}
                className={`bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-8 cursor-pointer hover:border-sewakhoj-red/30 hover:shadow-md transition-all ${highlightId === tasker.id ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/30 border-blue-300' : ''}`}
                onClick={() => router.push(`/admin/taskers?id=${tasker.id}`)}
              >
                
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
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Application File: <span className="text-gray-900">#{tasker.id.slice(0,8)}</span></span>
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
                          <button onClick={() => {
                            if (tasker.tasker_kyc[0].document_front_url) window.open(tasker.tasker_kyc[0].document_front_url, '_blank');
                          }} className="text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Front
                          </button>
                          {tasker.tasker_kyc[0].document_back_url && (
                            <button onClick={() => {
                              if (tasker.tasker_kyc[0].document_back_url) window.open(tasker.tasker_kyc[0].document_back_url, '_blank');
                            }} className="text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Back
                            </button>
                          )}
                          <button onClick={() => {
                            if (tasker.tasker_kyc[0].selfie_url) window.open(tasker.tasker_kyc[0].selfie_url, '_blank');
                          }} className="text-purple-600 font-black text-[10px] uppercase bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Selfie
                          </button>
                        </div>
                      ) : (
                        <span className="text-red-500 font-black text-xs flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Missing KYC</span>
                      )}
                    </div>
                  </div>

                  {/* Verification Pillars Toggles */}
                  {!isIncomplete && (
                    <div className="mb-6">
                      <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">Trust Pillars Verification</p>
                      <div className="flex flex-wrap gap-3">
                         <button 
                            onClick={() => togglePillar(tasker.id, 'id')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${pillars.id ? 'bg-green-50 text-green-700 border-green-500' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                         >
                            <ShieldCheck className="w-4 h-4" /> Valid ID
                         </button>
                         <button 
                            onClick={() => togglePillar(tasker.id, 'background')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${pillars.background ? 'bg-green-50 text-green-700 border-green-500' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                         >
                            <ShieldCheck className="w-4 h-4" /> Background
                         </button>
                         <button 
                            onClick={() => togglePillar(tasker.id, 'gear')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${pillars.gear ? 'bg-green-50 text-green-700 border-green-500' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                         >
                            <ShieldCheck className="w-4 h-4" /> Gear Check
                         </button>
                      </div>
                    </div>
                  )}

                  {/* Operational Actions */}
                  <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                    {isIncomplete ? (
                       <Button
                         variant="brand"
                         size="pill"
                         onClick={(e) => { e.stopPropagation(); setConfirmNudge(tasker); }}
                       >
                          <Send className="w-4 h-4" /> Send Completion Nudge
                       </Button>
                    ) : (
                       <>
                         <Button
                           variant="brand"
                           size="pill"
                           className="!bg-green-500 hover:!bg-green-600 !shadow-green-500/20"
                           onClick={(e) => { e.stopPropagation(); setConfirmApprove(tasker.id); }}
                         >
                            <Check className="w-4 h-4" /> Final Approval
                         </Button>
                         <Button
                           variant="brand-ghost"
                           size="pill"
                           onClick={(e) => { e.stopPropagation(); setSelectedTaskerId(tasker.id); setShowRejectModal(true); }}
                         >
                            <XCircle className="w-4 h-4" /> Reject & Feedback
                         </Button>
                       </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
               <button 
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${rejectReason === reason ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}
               >
                  {reason}
               </button>
            ))}
          </div>
          <textarea 
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3} 
            placeholder="Or type custom reason here..."
            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-medium focus:bg-white focus:border-red-500/20 focus:outline-none transition-all"
          ></textarea>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            variant="brand"
            size="pill"
            className="flex-1 !bg-red-600 hover:!bg-red-700"
            onClick={handleReject}
            disabled={rejecting || !rejectReason}
          >
            {rejecting ? 'Sending...' : 'Reject & Notify'}
          </Button>
          <Button
            variant="brand-ghost"
            size="pill"
            className="flex-1"
            onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
          >
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
