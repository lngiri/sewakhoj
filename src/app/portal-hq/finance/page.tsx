"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DollarSign, ArrowDownRight, ArrowUpRight, CheckCircle2, ArrowLeft } from "lucide-react";

export default function FinanceDashboard() {
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, pendingReceivables: 0, pendingPayables: 0 });

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('commission_ledger')
      .select('*, taskers!inner(users(full_name, phone))')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setLedgers(data);
      
      // Calculate Stats
      let revenue = 0;
      let receivables = 0;
      let payables = 0;
      
      data.forEach(l => {
        revenue += Number(l.commission_amount);
        if (l.status === 'pending') {
          if (l.type === 'receivable') receivables += Number(l.commission_amount);
          if (l.type === 'payable') payables += (Number(l.total_amount) - Number(l.commission_amount));
        }
      });
      
      setStats({ totalRevenue: revenue, pendingReceivables: receivables, pendingPayables: payables });
    }
    setLoading(false);
  };

  const markSettled = async (id: string) => {
    if (!confirm("Are you sure this transaction has been settled (money transferred)?")) return;
    
    await supabase.from('commission_ledger').update({ status: 'settled', settled_at: new Date().toISOString() }).eq('id', id);
    fetchLedger();
  };

  if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red mx-auto mt-20"></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/portal-hq" className="text-xs font-bold text-gray-500 hover:text-primary flex items-center gap-1 transition-colors uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Platform Revenue / आम्दानी</div>
          <div className="admin-stat-value">Rs {stats.totalRevenue.toLocaleString()}</div>
          <div className="text-[12px] text-admin-green mt-1">↑ Platform Commission</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Taskers Owe Us (Cash)</div>
          <div className="admin-stat-value text-primary">Rs {stats.pendingReceivables.toLocaleString()}</div>
          <div className="text-[12px] text-primary mt-1">⚠ Collection Pending</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">We Owe Taskers (Online)</div>
          <div className="admin-stat-value text-admin-blue">Rs {stats.pendingPayables.toLocaleString()}</div>
          <div className="text-[12px] text-admin-blue mt-1">💰 Settlement Pending</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="text-[14px] font-bold uppercase tracking-wider">Financial Transactions / भुक्तानी विवरण</h3>
          <div className="flex gap-2">
            <button className="admin-btn admin-btn-ghost">Export CSV</button>
          </div>
        </div>
        <div className="admin-table-responsive custom-scrollbar">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Tasker</th>
                <th>Type / Method</th>
                <th>Amount Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.map(l => {
                const u = Array.isArray(l.taskers?.users) ? l.taskers?.users[0] : l.taskers?.users;
                const amountDue = l.type === 'receivable' ? l.commission_amount : (l.total_amount - l.commission_amount);
                
                return (
                  <tr key={l.id} className="hover:bg-[#fafafa]">
                    <td>{new Date(l.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-bold">
                          {u?.full_name?.[0]}
                        </span>
                        <div>
                          <div className="font-bold">{u?.full_name}</div>
                          <div className="text-[11px] text-muted-foreground">{u?.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${l.type === 'receivable' ? 'admin-badge-red' : 'admin-badge-blue'}`}>
                        {l.type.toUpperCase()} ({l.payment_method})
                      </span>
                    </td>
                    <td className="font-bold">Rs {amountDue.toLocaleString()}</td>
                    <td>
                      {l.status === 'settled' ? 
                        <span className="admin-badge admin-badge-green">Settled</span> : 
                        <span className="admin-badge admin-badge-amber">Pending</span>
                      }
                    </td>
                    <td>
                      {l.status === 'pending' && (
                        <button onClick={() => markSettled(l.id)} className="admin-btn admin-btn-red !py-1 !px-3 !text-[11px]">
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
