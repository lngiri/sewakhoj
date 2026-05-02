"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, ArrowDownRight, ArrowUpRight, CheckCircle2 } from "lucide-react";

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
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Finance Ledger</h1>
        <p className="text-gray-600 mt-2">Manage platform commissions, receivables from Cash payments, and payables for Online payments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 text-gray-500 mb-2 font-bold"><DollarSign className="w-5 h-5 text-green-500" /> Total Platform Revenue</div>
          <p className="text-3xl font-black text-gray-900">Rs {stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200">
          <div className="flex items-center gap-3 text-gray-500 mb-2 font-bold"><ArrowDownRight className="w-5 h-5 text-red-500" /> Taskers Owe Us (Cash)</div>
          <p className="text-3xl font-black text-red-600">Rs {stats.pendingReceivables.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200">
          <div className="flex items-center gap-3 text-gray-500 mb-2 font-bold"><ArrowUpRight className="w-5 h-5 text-blue-500" /> We Owe Taskers (Online)</div>
          <p className="text-3xl font-black text-blue-600">Rs {stats.pendingPayables.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Tasker</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Amount Due</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {ledgers.map(l => {
              const u = Array.isArray(l.taskers?.users) ? l.taskers?.users[0] : l.taskers?.users;
              const amountDue = l.type === 'receivable' ? l.commission_amount : (l.total_amount - l.commission_amount);
              
              return (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{new Date(l.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold">{u?.full_name}<br/><span className="text-xs text-gray-500 font-normal">{u?.phone}</span></td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${l.type === 'receivable' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {l.type.toUpperCase()} ({l.payment_method})
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold">Rs {amountDue}</td>
                  <td className="px-6 py-4">
                    {l.status === 'settled' ? 
                      <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Settled</span> : 
                      <span className="text-yellow-600 font-bold">Pending</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    {l.status === 'pending' && (
                      <button onClick={() => markSettled(l.id)} className="bg-gray-900 text-white px-3 py-1 rounded text-xs font-bold hover:bg-gray-800">
                        Mark Settled
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
  );
}
