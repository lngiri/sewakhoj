"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase-browser";
import Link from "next/link";
import { CheckCircle2, XCircle, FileText, AlertCircle, ArrowLeft, ShieldCheck, Mail, Send, Check } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";

export default function AdminTaskersPage() {
  const { showSuccess, showError } = useNotification();
  const [taskers, setTaskers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTaskerId, setSelectedTaskerId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

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

  useEffect(() => {
    if (showRejectModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showRejectModal]);

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
      return;
    }

    if (!confirm("Are you sure you want to approve this tasker? They will immediately appear to customers.")) return;

    const { error } = await supabase
      .from("taskers")
      .update({
        status: "active",
        is_id_verified: pillars.id,
        is_background_checked: pillars.background,
        is_gear_certified: pillars.gear,
        rejection_reason: null
      })
      .eq("id", taskerId);

    if (!error) {
      // Also update KYC status
      await supabase
        .from("tasker_kyc")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("tasker_id", taskerId);

      showSuccess("Tasker Approved and Activated!");
      fetchPendingTaskers();
    } else {
      showError("Failed to approve tasker.");
    }
  };

  const handleReject = async () => {
    if (!selectedTaskerId || !rejectReason.trim()) {
      showError("Please provide a rejection reason.");
      return;
    }
    setRejecting(true);

    const { error } = await supabase
      .from("taskers")
      .update({
        status: "rejected",
        rejection_reason: rejectReason
      })
      .eq("id", selectedTaskerId);

    if (!error) {
      // Also update KYC status
      await supabase
        .from("tasker_kyc")
        .update({ 
          status: "rejected", 
          admin_note: rejectReason,
          reviewed_at: new Date().toISOString() 
        })
        .eq("tasker_id", selectedTaskerId);

      // Simulate sending a notification
      await supabase.from("notifications").insert({
        user_id: taskers.find(t => t.id === selectedTaskerId)?.user_id,
        title: "Action Required: Profile Update",
        message: `Your SewaKhoj tasker application requires changes. Reason: ${rejectReason}`,
        type: "system"
      });

      showSuccess("Tasker rejected and feedback sent.");
      setShowRejectModal(false);
      setRejectReason("");
      fetchPendingTaskers();
    } else {
      showError("Failed to reject tasker.");
    }
    setRejecting(false);
  };

  const sendNudge = async (tasker: any) => {
    if (!confirm(`Send completion reminder to ${tasker.users?.full_name}?`)) return;
    
    // In a real app, this would trigger an SMS or push. We'll simulate with our notification table.
    const { error } = await supabase.from("notifications").insert({
      user_id: tasker.user_id,
      title: "Complete Your SewaKhoj Profile",
      message: "You are one step away from earning! Please complete your KYC and profile setup.",
      type: "system"
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
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">Loading KYC queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all">
              <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">KYC Review & Operations</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Pending Tasker Verification Queue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
           <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{taskers.length} Pending</span>
        </div>
      </div>

      {taskers.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-16 text-center border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Queue Clear</h3>
          <p className="text-sm font-medium text-gray-400 max-w-sm mx-auto">There are no pending tasker applications to review. Operations are fully stabilized.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {taskers.map((tasker) => {
            const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
            const pillars = verificationPillars[tasker.id] || { id: false, background: false, gear: false };
            const isIncomplete = !tasker.id_document_url || !tasker.hourly_rate;

            return (
              <div key={tasker.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-8">
                
                {/* Profile & Contact */}
                <div className="lg:w-1/4 shrink-0">
                  <div className="w-24 h-24 bg-gray-100 rounded-[2rem] overflow-hidden mb-4 border border-gray-200 shadow-inner">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
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
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Services</p>
                      <p className="font-black text-xs text-gray-900 line-clamp-1">{tasker.skills?.join(", ") || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Rate</p>
                      <p className="font-black text-xs text-gray-900">Rs {tasker.hourly_rate || 0}/hr</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">City</p>
                      <p className="font-black text-xs text-gray-900 capitalize">{tasker.city || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">KYC Documents</p>
                      {tasker.tasker_kyc && tasker.tasker_kyc.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={async () => {
                            const { data } = await supabase.storage.from('kyc_documents').createSignedUrl(tasker.tasker_kyc[0].document_front_url, 60);
                            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                          }} className="text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Front
                          </button>
                          {tasker.tasker_kyc[0].document_back_url && (
                            <button onClick={async () => {
                              const { data } = await supabase.storage.from('kyc_documents').createSignedUrl(tasker.tasker_kyc[0].document_back_url, 60);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            }} className="text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Back
                            </button>
                          )}
                          <button onClick={async () => {
                            const { data } = await supabase.storage.from('kyc_documents').createSignedUrl(tasker.tasker_kyc[0].selfie_url, 60);
                            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
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
                       <button onClick={() => sendNudge(tasker)} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2">
                          <Send className="w-4 h-4" /> Send Completion Nudge
                       </button>
                    ) : (
                       <>
                         <button 
                            onClick={() => approveTasker(tasker.id)}
                            className="px-6 py-3 bg-green-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-green-500/20"
                         >
                            <Check className="w-4 h-4" /> Final Approval
                         </button>
                         <button 
                            onClick={() => { setSelectedTaskerId(tasker.id); setShowRejectModal(true); }}
                            className="px-6 py-3 bg-white text-red-600 border border-red-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2"
                         >
                            <XCircle className="w-4 h-4" /> Reject & Feedback
                         </button>
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
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/50 shrink-0">
               <h3 className="text-xl font-black text-gray-900 mb-2">Reject Application</h3>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">This will send a feedback notification to the tasker.</p>
            </div>
            
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="space-y-4 mb-8">
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
            </div>
            
            <div className="p-8 border-t border-gray-50 bg-white shrink-0 flex gap-3">
              <button 
                onClick={handleReject} 
                disabled={rejecting || !rejectReason}
                className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {rejecting ? 'Sending...' : 'Reject & Notify'}
              </button>
              <button 
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }} 
                className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
