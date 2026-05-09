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
        <div className="admin-card p-6 border-sewakhoj-red/30 bg-red-50/10">
            <h3 className="text-sm font-black uppercase mb-4 tracking-widest">New Promo Code</h3>
            <form onSubmit={handleAddPromo} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="admin-form-group">
                    <label>Promo Code</label>
                    <input 
                        type="text" 
                        required 
                        value={newPromo.code}
                        onChange={e => setNewPromo({...newPromo, code: e.target.value})}
                        placeholder="e.g. SUMMER2026" 
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
                    <input 
                        type="datetime-local" 
                        value={newPromo.valid_until}
                        onChange={e => setNewPromo({...newPromo, valid_until: e.target.value})}
                        className="admin-form-input" 
                    />
                </div>
                <div className="flex gap-2">
                    <button type="submit" className="admin-btn admin-btn-red flex-1">Save</button>
                    <button type="button" onClick={() => setShowAddForm(false)} className="admin-btn admin-btn-ghost">Cancel</button>
                </div>
            </form>
        </div>
      )}

      <div className="admin-card">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Usage</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id}>
                  <td className="font-black text-gray-900">{p.code}</td>
                  <td className="font-bold text-green-600">{p.discount_percent}% OFF</td>
                  <td className="text-[12px] font-medium">
                    {p.current_uses} / {p.max_uses}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div 
                            className="bg-sewakhoj-red h-full" 
                            style={{ width: `${(p.current_uses / p.max_uses) * 100}%` }}
                        ></div>
                    </div>
                  </td>
                  <td>{p.valid_until ? new Date(p.valid_until).toLocaleDateString() : 'Infinite'}</td>
                  <td>
                    <button 
                        onClick={() => togglePromo(p.id, p.is_active)}
                        className={`admin-badge ${p.is_active ? 'admin-badge-green' : 'admin-badge-red'}`}
                    >
                        {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="flex gap-2">
                    <button onClick={() => deletePromo(p.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {promos.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No promo codes active.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
