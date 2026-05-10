"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/context/NotificationContext";
import { Tag, Plus, Trash2, Calendar, CheckCircle2, XCircle } from "lucide-react";

export default function PromoManagementPage() {
  const { showError, showSuccess } = useNotification();
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: "",
    discount_percent: 10,
    max_uses: 100,
    valid_until: ""
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPromos(data);
    setLoading(false);
  };

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('promo_codes').insert({
        code: newPromo.code.toUpperCase(),
        discount_percent: newPromo.discount_percent,
        max_uses: newPromo.max_uses,
        valid_until: newPromo.valid_until || null
    });

    if (error) {
        showError(error.message);
    } else {
        showSuccess("Promo code created successfully!");
        setShowAddForm(false);
        setNewPromo({ code: "", discount_percent: 10, max_uses: 100, valid_until: "" });
        fetchPromos();
    }
  };

  const togglePromo = async (id: string, currentStatus: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !currentStatus }).eq('id', id);
    fetchPromos();
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;
    await supabase.from('promo_codes').delete().eq('id', id);
    fetchPromos();
  };

  if (loading) return <div className="p-12 text-center">Loading Promo Codes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-sewakhoj-red" />
            Promo Code Management
          </h2>
          <p className="text-gray-500 text-sm mt-1">Create and manage marketing discount campaigns.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="admin-btn admin-btn-red flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create Promo
        </button>
      </div>

      {showAddForm && (
        <div className="admin-card p-8 border-sewakhoj-red/20 bg-white shadow-xl shadow-red-500/5 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-50 text-sewakhoj-red rounded-xl flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">New Promo Campaign</h3>
                    <p className="text-xs text-gray-500 font-medium">Configure discount details and usage limits</p>
                </div>
            </div>

            <form onSubmit={handleAddPromo} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="admin-form-group">
                        <label>Promo Code</label>
                        <input 
                            type="text" 
                            required 
                            value={newPromo.code}
                            onChange={e => setNewPromo({...newPromo, code: e.target.value})}
                            placeholder="e.g. WELCOME20" 
                            className="admin-form-input" 
                        />
                    </div>
                    <div className="admin-form-group">
                        <label>Discount %</label>
                        <input 
                            type="number" 
                            required 
                            min="1" max="100"
                            value={newPromo.discount_percent}
                            onChange={e => setNewPromo({...newPromo, discount_percent: parseInt(e.target.value)})}
                            className="admin-form-input" 
                        />
                    </div>
                    <div className="admin-form-group">
                        <label>Max Uses</label>
                        <input 
                            type="number" 
                            required 
                            value={newPromo.max_uses}
                            onChange={e => setNewPromo({...newPromo, max_uses: parseInt(e.target.value)})}
                            className="admin-form-input" 
                        />
                    </div>
                    <div className="admin-form-group">
                        <label>Valid Until</label>
                        <div className="relative">
                            <input 
                                type="datetime-local" 
                                value={newPromo.valid_until}
                                onChange={e => setNewPromo({...newPromo, valid_until: e.target.value})}
                                className="admin-form-input pr-10" 
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                    <button type="button" onClick={() => setShowAddForm(false)} className="admin-btn admin-btn-ghost px-8">Cancel</button>
                    <button type="submit" className="admin-btn admin-btn-red px-10 shadow-lg shadow-red-500/20">Save Campaign</button>
                </div>
            </form>
        </div>
      )}

      <div className="admin-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Campaign Code</th>
                <th>Discount</th>
                <th>Usage Analytics</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                            <Tag className="w-4 h-4" />
                        </div>
                        <span className="font-black text-gray-900 tracking-tight">{p.code}</span>
                    </div>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-black uppercase tracking-tighter border border-green-100">
                        {p.discount_percent}% OFF
                    </span>
                  </td>
                  <td className="min-w-[180px]">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                        <span>{p.current_uses} Used</span>
                        <span>{p.max_uses} Limit</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out ${
                                (p.current_uses / p.max_uses) > 0.8 ? 'bg-amber-500' : 'bg-sewakhoj-red'
                            }`} 
                            style={{ width: `${Math.min(100, (p.current_uses / p.max_uses) * 100)}%` }}
                        ></div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        {p.valid_until ? new Date(p.valid_until).toLocaleDateString() : 'Never Expires'}
                    </div>
                  </td>
                  <td>
                    <button 
                        onClick={() => togglePromo(p.id, p.is_active)}
                        className={`admin-badge transition-all active:scale-95 ${p.is_active ? 'admin-badge-green' : 'admin-badge-red cursor-not-allowed opacity-50'}`}
                    >
                        {p.is_active ? 'Live' : 'Paused'}
                    </button>
                  </td>
                  <td className="text-right">
                    <button 
                        onClick={() => deletePromo(p.id)} 
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-90"
                        title="Delete Campaign"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {promos.length === 0 && (
                <tr><td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center opacity-30">
                        <Tag className="w-12 h-12 mb-4" />
                        <p className="font-black uppercase tracking-[0.2em] text-sm">No campaigns active</p>
                    </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
