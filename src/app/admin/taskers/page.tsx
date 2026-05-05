"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { CheckCircle2, XCircle, FileText, AlertCircle, ArrowLeft } from "lucide-react";

export default function AdminTaskersPage() {
  const [taskers, setTaskers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingTaskers();
  }, []);

  const fetchPendingTaskers = async () => {
    setLoading(true);
    // Fetch taskers that are 'pending' or not id_verified
    const { data, error } = await supabase
      .from("taskers")
      .select(`
        *,
        users (full_name, phone, email, avatar_url)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTaskers(data);
    }
    setLoading(false);
  };

  const updateTaskerStatus = async (taskerId: string, newStatus: string, idVerified: boolean) => {
    if (!confirm(`Are you sure you want to ${newStatus} this tasker?`)) return;

    const { error } = await supabase
      .from("taskers")
      .update({
        status: newStatus,
        id_verified: idVerified
      })
      .eq("id", taskerId);

    if (!error) {
      alert(`Tasker successfully marked as ${newStatus}`);
      fetchPendingTaskers(); // refresh
    } else {
      alert("Failed to update tasker status.");
      console.error(error);
    }
  };

  if (loading) {
    return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red mx-auto mt-20"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/admin" className="text-xs font-bold text-gray-500 hover:text-primary flex items-center gap-1 transition-colors uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
      </div>

      {taskers.length === 0 ? (
        <div className="admin-card p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
          <CheckCircle2 className="w-16 h-16 text-admin-green mb-4 opacity-30" />
          <h3 className="text-xl font-bold text-foreground mb-2">All Caught Up!</h3>
          <p>There are no pending tasker applications to review at this time.</p>
        </div>
      ) : (
        <div className="grid gap-[14px]">
          {taskers.map((tasker) => {
            const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
            return (
              <div key={tasker.id} className="admin-card p-6 flex flex-col lg:flex-row gap-6 hover:border-primary/30 transition-colors">
                
                {/* Profile Avatar */}
                <div className="w-24 h-24 bg-muted rounded-2xl overflow-hidden shrink-0 border border-border">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] uppercase font-bold">No Photo</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-[18px] font-black text-foreground">{user?.full_name || "Unknown User"}</h2>
                      <div className="text-[12px] text-muted-foreground space-y-0.5 mt-1">
                        <p className="flex items-center gap-1.5 font-medium"><span>📞</span> {user?.phone}</p>
                        <p className="flex items-center gap-1.5 font-medium"><span>✉️</span> {user?.email}</p>
                        <p className="flex items-center gap-1.5 font-medium capitalize"><span>📍</span> {tasker.city}</p>
                      </div>
                    </div>
                    <span className="admin-badge admin-badge-amber">PENDING KYC</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-12 gap-y-4 bg-[#fafafa] p-4 rounded-xl">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Services Offered</p>
                      <p className="font-bold text-[13px]">{tasker.skills?.join(", ") || 'Generalist'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Hourly Rate</p>
                      <p className="font-bold text-[13px] text-primary">Rs {tasker.hourly_rate}/hr</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Transport Mode</p>
                      <p className="font-bold text-[13px] capitalize">{tasker.transportation_mode || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">ID Document</p>
                      {tasker.id_document_url ? (
                        <a href={tasker.id_document_url} target="_blank" rel="noreferrer" className="text-admin-blue font-bold text-[13px] hover:underline flex items-center gap-1">
                          <FileText className="w-4 h-4" /> View Document
                        </a>
                      ) : (
                        <span className="text-primary font-bold text-[13px] flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Missing</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 min-w-[200px]">
                  <button 
                    onClick={() => updateTaskerStatus(tasker.id, 'active', true)}
                    disabled={!tasker.id_document_url}
                    className="admin-btn bg-admin-green text-white hover:bg-[#15803d] disabled:opacity-50 py-3"
                  >
                    <CheckCircle2 className="w-5 h-5 mx-auto" />
                    <span className="mt-1 block">Approve KYC</span>
                  </button>
                  <button 
                    onClick={() => updateTaskerStatus(tasker.id, 'rejected', false)}
                    className="admin-btn admin-btn-ghost text-primary hover:bg-admin-red-light border-primary/20 py-3"
                  >
                    <XCircle className="w-5 h-5 mx-auto" />
                    <span className="mt-1 block">Reject Application</span>
                  </button>
                  {!tasker.id_document_url && (
                    <p className="text-[10px] text-primary text-center font-bold uppercase tracking-tight">ID Required for Approval</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
