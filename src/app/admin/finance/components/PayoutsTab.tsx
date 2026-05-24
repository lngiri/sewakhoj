"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { auditLog } from "@/lib/auditLog";
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  ArrowUpRight,
  Search,
  Loader2
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Payout {
  id: string;
  tasker_id: string;
  amount: number;
  payout_method: string;
  payout_details: Record<string, string>;
  status: "pending" | "processing" | "completed" | "failed";
  reference_id: string | null;
  admin_notes: string | null;
  processed_by: string | null;
  created_at: string;
  processed_at: string | null;
  taskers?: {
    users?: {
      full_name: string;
      phone: string;
    };
  };
}

export default function PayoutsTab() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmProcess, setConfirmProcess] = useState<Payout | null>(null);
  const [referenceId, setReferenceId] = useState("");
  const [stats, setStats] = useState({
    pendingTotal: 0,
    pendingCount: 0,
    completedTotal: 0,
  });

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payouts")
      .select("*, taskers!inner(users!inner(full_name, phone))")
      .order("created_at", { ascending: false });

    if (data && !error) {
      setPayouts(data as Payout[]);
      const pending = data.filter((p: any) => p.status === "pending");
      const completed = data.filter((p: any) => p.status === "completed");
      setStats({
        pendingTotal: pending.reduce((s: number, p: any) => s + Number(p.amount), 0),
        pendingCount: pending.length,
        completedTotal: completed.reduce((s: number, p: any) => s + Number(p.amount), 0),
      });
    }
    setLoading(false);
  };

  const handleProcess = async () => {
    if (!confirmProcess || !user || !referenceId.trim()) return;
    const payoutId = confirmProcess.id;
    setConfirmProcess(null);
    setProcessing(payoutId);

    try {
      const { error } = await supabase.rpc("process_payout", {
        p_payout_id: payoutId,
        p_reference_id: referenceId.trim(),
        p_admin_user_id: user.id,
        p_admin_notes: null,
      });

      if (error) throw error;

      await auditLog("payout_processed", {
        payout_id: payoutId,
        amount: confirmProcess.amount,
        tasker_id: confirmProcess.tasker_id,
        reference: referenceId.trim(),
      }, user.id);

      setReferenceId("");
      fetchPayouts();
    } catch (err: any) {
      console.error("Failed to process payout:", err);
      alert("Failed to process payout: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkFailed = async (payoutId: string) => {
    if (!user) return;
    if (!confirm("Mark this payout as failed? The funds will be returned to pending balance.")) return;

    setProcessing(payoutId);
    await supabase.from("payouts").update({
      status: "failed",
      admin_notes: "Marked failed by admin",
      processed_by: user.id,
      processed_at: new Date().toISOString(),
    }).eq("id", payoutId);
    await auditLog("payout_failed", { payout_id: payoutId }, user.id);
    setProcessing(null);
    fetchPayouts();
  };

  const filtered = payouts.filter((p) => {
    const name = p.taskers?.users?.full_name?.toLowerCase() || "";
    const phone = p.taskers?.users?.phone || "";
    const query = search.toLowerCase();
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return !search || name.includes(query) || phone.includes(query) || p.reference_id?.includes(query);
  });

  if (loading) return <LoadingSpinner size="md" />;

  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    processing: "bg-blue-50 text-blue-600 border-blue-200",
    completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
    failed: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Payouts</p>
          </div>
          <p className="text-3xl font-black text-amber-900">Rs {stats.pendingTotal.toLocaleString()}</p>
          <p className="text-xs font-bold text-amber-500 mt-1">{stats.pendingCount} requests awaiting processing</p>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Completed</p>
          </div>
          <p className="text-3xl font-black text-emerald-900">Rs {stats.completedTotal.toLocaleString()}</p>
          <p className="text-xs font-bold text-emerald-500 mt-1">Total disbursed to taskers</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Total Payouts</p>
          </div>
          <p className="text-3xl font-black text-gray-900">{payouts.length}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">All-time payout records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tasker name, phone, or reference..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sewakhoj-red/20 focus:border-sewakhoj-red"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["pending", "completed", "failed", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                statusFilter === s
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4">Tasker</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Requested</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <DollarSign className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm font-bold text-gray-500">No payouts found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {statusFilter === "pending" ? "All pending payouts have been processed!" : "No records match your search."}
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-sm text-gray-900">{payout.taskers?.users?.full_name || "Unknown"}</p>
                    <p className="text-[10px] font-bold text-gray-400">{payout.taskers?.users?.phone || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-900">Rs {Number(payout.amount).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold uppercase text-gray-600">
                      {payout.payout_method.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${statusColors[payout.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono font-bold text-gray-500">
                      {payout.reference_id || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-500">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {payout.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              setConfirmProcess(payout);
                              setReferenceId("");
                            }}
                            disabled={processing === payout.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50"
                          >
                            {processing === payout.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Process
                          </button>
                          <button
                            onClick={() => handleMarkFailed(payout.id)}
                            disabled={processing === payout.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            Fail
                          </button>
                        </>
                      )}
                      {payout.status === "completed" && (
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Done
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmProcess}
        onClose={() => setConfirmProcess(null)}
        onConfirm={handleProcess}
        title="Process Payout"
        confirmText="Process Payout"
        variant="default"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Amount</p>
            <p className="text-2xl font-black text-amber-900">Rs {Number(confirmProcess?.amount || 0).toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-bold text-gray-500 uppercase tracking-widest">Tasker</p>
              <p className="font-black text-gray-900">{confirmProcess?.taskers?.users?.full_name}</p>
            </div>
            <div>
              <p className="font-bold text-gray-500 uppercase tracking-widest">Method</p>
              <p className="font-black text-gray-900 uppercase">{confirmProcess?.payout_method?.replace("_", " ")}</p>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
              Reference ID (transaction ID, cheque no, or batch ref)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sewakhoj-red/20 focus:border-sewakhoj-red font-bold"
              placeholder="e.g., EPTXN123456 or BANK-REF-001"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
