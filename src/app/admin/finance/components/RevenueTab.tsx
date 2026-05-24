"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  DollarSign,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Receipt,
  FileText,
  Search,
  Calendar,
  UserCheck,
  Banknote,
  XCircle,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/context/NotificationContext";
import { auditLog } from "@/lib/auditLog";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Invoice {
  id: string;
  invoice_number: string;
  ledger_id: string;
  tasker_id: string;
  booking_id: string | null;
  amount_due: number;
  commission_amount: number;
  total_amount: number;
  payment_method: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  due_date: string;
  issued_by: string | null;
  collected_by: string | null;
  collected_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  taskers?: {
    users?: {
      full_name: string;
      phone: string;
    };
  };
}

interface InvoiceStats {
  total_outstanding: number;
  overdue_amount: number;
  invoice_count: number;
  overdue_count: number;
}

export default function RevenueRecoveryPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InvoiceStats>({
    total_outstanding: 0,
    overdue_amount: 0,
    invoice_count: 0,
    overdue_count: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [confirmCollect, setConfirmCollect] = useState<string | null>(null);
  const totalCollected = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.amount_due), 0);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*, taskers!inner(users!inner(full_name, phone))")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInvoices(data as Invoice[]);

      // Calculate stats
      const outstanding = data.filter(
        (i: any) => ["draft", "sent", "overdue"].includes(i.status)
      );
      const overdue = data.filter(
        (i: any) =>
          i.status === "overdue" ||
          (["draft", "sent"].includes(i.status) && new Date(i.due_date) < new Date())
      );
      setStats({
        total_outstanding: outstanding.reduce((s: number, i: any) => s + Number(i.amount_due), 0),
        overdue_amount: overdue.reduce((s: number, i: any) => s + Number(i.amount_due), 0),
        invoice_count: outstanding.length,
        overdue_count: overdue.length,
      });
    }
    setLoading(false);
  };

  const handleCollect = async () => {
    if (!confirmCollect || !user) return;
    const invoiceId = confirmCollect;
    setConfirmCollect(null);

    try {
      const { error } = await supabase.rpc("mark_invoice_paid", {
        p_invoice_id: invoiceId,
        p_collected_by: user.id,
        p_notes: `Collected on-site. Amount: Rs ${collectedAmount || "full"}`,
      });

      if (error) throw error;

      await auditLog(
        "cash_commission_collected",
        { invoice_id: invoiceId, collected_by: user.id },
        user.id
      );

      showSuccess("Commission collected and invoice settled!");
      setCollectedAmount("");
      fetchInvoices();
    } catch (err: any) {
      showError("Failed to mark invoice as paid: " + err.message);
    }
  };

  const handleMarkOverdue = async (invoiceId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("invoices")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .eq("id", invoiceId);

    if (!error) {
      await auditLog("invoice_marked_overdue", { invoice_id: invoiceId }, user.id);
      showSuccess("Invoice marked as overdue");
      fetchInvoices();
    }
  };

  const isOverdue = (inv: Invoice) =>
    inv.status === "overdue" ||
    (["draft", "sent"].includes(inv.status) && new Date(inv.due_date) < new Date());

  const filtered = invoices.filter((inv) => {
    const name = inv.taskers?.users?.full_name?.toLowerCase() || "";
    const phone = inv.taskers?.users?.phone || "";
    const invNum = inv.invoice_number?.toLowerCase() || "";
    const query = search.toLowerCase();
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    return !search || name.includes(query) || phone.includes(query) || invNum.includes(query);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">
          Loading invoices...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-400 mb-6 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Command Center
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <Receipt className="w-8 h-8 text-amber-400" /> Cash Commission Collection
              </h2>
              <p className="text-gray-400 text-sm mt-2 max-w-lg font-medium">
                Track and collect commission payments from cash-paying taskers. Invoices are
                auto-generated when a cash booking is completed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Outstanding
                </p>
                <p className="text-2xl font-black text-amber-400">
                  Rs {stats.total_outstanding.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-gray-400 mt-1">
                  {stats.invoice_count} pending invoices
                </p>
              </div>
              <div className="bg-red-500/20 backdrop-blur-md p-6 rounded-[2rem] border border-red-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">
                  Overdue
                </p>
                <p className="text-2xl font-black text-red-400">
                  Rs {stats.overdue_amount.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-red-400 mt-1">
                  {stats.overdue_count} overdue invoices
                </p>
              </div>
            </div>
          </div>

          {/* Total Collected */}
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400">Total Collected All-time</p>
            <p className="text-lg font-black text-emerald-400">
              Rs {totalCollected.toLocaleString()}
            </p>
          </div>
        </div>
        <DollarSign className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 pointer-events-none" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tasker name, phone, or invoice number..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "draft", "sent", "paid", "overdue", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                statusFilter === s
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      {filtered.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">All Caught Up</h3>
          <p className="text-sm font-medium text-gray-400 max-w-sm mx-auto">
            No invoices match your current filter. All cash commissions are collected.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((inv) => {
            const overdue = isOverdue(inv);
            const statusColor: Record<string, string> = {
              draft: "bg-gray-100 text-gray-600 border-gray-200",
              sent: "bg-blue-50 text-blue-600 border-blue-200",
              paid: "bg-emerald-50 text-emerald-600 border-emerald-200",
              overdue: "bg-red-50 text-red-600 border-red-200",
              cancelled: "bg-gray-50 text-gray-400 border-gray-100",
            };

            return (
              <div
                key={inv.id}
                className={`bg-white p-6 rounded-[2rem] border transition-all duration-500 ${
                  overdue
                    ? "border-red-200 shadow-red-100/30 hover:shadow-xl"
                    : inv.status === "paid"
                    ? "border-emerald-100 hover:shadow-xl"
                    : "border-gray-100 hover:shadow-xl hover:border-amber-200"
                } shadow-sm`}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left: Tasker Info */}
                  <div className="lg:w-1/4 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900">
                          {inv.taskers?.users?.full_name || "Unknown Tasker"}
                        </h4>
                        <a
                          href={`tel:${inv.taskers?.users?.phone}`}
                          className="text-[10px] font-bold text-gray-400 hover:text-amber-600 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> {inv.taskers?.users?.phone || "—"}
                        </a>
                      </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {inv.invoice_number}
                    </p>
                  </div>

                  {/* Middle: Invoice Details */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                        Amount Due
                      </p>
                      <p className="text-lg font-black text-gray-900">
                        Rs {Number(inv.amount_due).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                        Booking Total
                      </p>
                      <p className="text-sm font-bold text-gray-700">
                        Rs {Number(inv.total_amount).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Due Date
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          overdue ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {new Date(inv.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                        Status
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          statusColor[inv.status] || statusColor.draft
                        }`}
                      >
                        {overdue && inv.status !== "overdue" ? (
                          <>
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </>
                        ) : inv.status === "paid" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </>
                        ) : (
                          inv.status
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="lg:w-1/5 shrink-0 flex items-center gap-2">
                    {inv.status !== "paid" && inv.status !== "cancelled" && (
                      <>
                        <button
                          onClick={() => {
                            setConfirmCollect(inv.id);
                            setCollectedAmount(String(inv.amount_due));
                          }}
                          className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                          <Banknote className="w-4 h-4" /> Collect
                        </button>
                        {!overdue && inv.status !== "overdue" && (
                          <button
                            onClick={() => handleMarkOverdue(inv.id)}
                            className="py-3 px-3 bg-white text-red-500 border border-red-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
                            title="Mark as overdue"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    {inv.status === "paid" && (
                      <div className="flex-1 text-center">
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Collected{" "}
                          {inv.collected_at
                            ? new Date(inv.collected_at).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmCollect}
        onCancel={() => {
          setConfirmCollect(null);
          setCollectedAmount("");
        }}
        onConfirm={handleCollect}
        title="Confirm Commission Collection"
        message={`Mark this invoice as paid for Rs ${parseFloat(collectedAmount || "0").toLocaleString()}? This will also settle the associated ledger entry.`}
        confirmLabel="Yes, Mark as Paid"
      />
    </div>
  );
}
