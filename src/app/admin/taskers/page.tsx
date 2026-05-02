"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, FileText, AlertCircle } from "lucide-react";

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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tasker KYC Verification</h1>
        <p className="text-gray-600 mt-2">Review and approve new tasker applications before they can appear on the marketplace.</p>
      </div>

      {taskers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
          <p>There are no pending tasker applications to review at this time.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {taskers.map((tasker) => {
            const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
            return (
              <div key={tasker.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col lg:flex-row gap-6">
                
                {/* Profile Avatar */}
                <div className="w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-200">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{user?.full_name || "Unknown"}</h2>
                      <div className="text-sm text-gray-500 space-y-1 mt-1">
                        <p>📞 {user?.phone}</p>
                        <p>✉️ {user?.email}</p>
                        <p className="capitalize">📍 {tasker.city}</p>
                      </div>
                    </div>
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-yellow-200">
                      Pending Review
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-xl text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Services Offered</p>
                      <p className="font-semibold text-gray-900">{tasker.skills?.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Hourly Rate</p>
                      <p className="font-semibold text-sewakhoj-red">Rs {tasker.hourly_rate}/hr</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Transport Mode</p>
                      <p className="font-semibold text-gray-900 capitalize">{tasker.transportation_mode || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">ID Document</p>
                      {tasker.id_document_url ? (
                        <a href={tasker.id_document_url} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                          <FileText className="w-4 h-4" /> View Document
                        </a>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Missing</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-6 min-w-[200px]">
                  <button 
                    onClick={() => updateTaskerStatus(tasker.id, 'active', true)}
                    disabled={!tasker.id_document_url}
                    className="w-full bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Approve KYC
                  </button>
                  <button 
                    onClick={() => updateTaskerStatus(tasker.id, 'rejected', false)}
                    className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition"
                  >
                    <XCircle className="w-5 h-5" /> Reject Application
                  </button>
                  {!tasker.id_document_url && (
                    <p className="text-xs text-red-500 text-center mt-2">Cannot approve without ID document.</p>
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
