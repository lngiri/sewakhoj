"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Plus, Pencil, Trash2, Check, X, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { toast } from "@/lib/toast-messages";
import { useLocale } from "next-intl";
import { auditLog } from "@/lib/auditLog";
import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Service {
  id: string;
  name: string;
  name_ne: string;
  description: string;
  description_ne: string;
  icon: string;
  base_price: number;
}

export default function CategoriesPage() {
  const locale = useLocale();
  const { user } = useAuth();
  const { showError } = useNotification();
  const [categories, setCategories] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    name_ne: "",
    description: "",
    description_ne: "",
    icon: "🔧",
    base_price: 500
  });

  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  }

  const handleSave = async () => {
    if (editingId) {
      const { error } = await supabase
        .from('services')
        .update(formData)
        .eq('id', editingId);

      if (!error) {
        await auditLog('service_updated', { service_id: editingId, name: formData.name }, user?.id || '');
        setEditingId(null);
        fetchCategories();
      }
    } else {
      // Check for duplicate name
      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .ilike('name', formData.name)
        .maybeSingle();

      if (existing) {
        showError(toast(locale, "CATEGORY_EXISTS"));
        return;
      }

      const { data: inserted, error } = await supabase
        .from('services')
        .insert([formData])
        .select('id')
        .single();

      if (!error) {
        await auditLog('service_created', { service_id: inserted?.id, name: formData.name }, user?.id || '');
        setIsAdding(false);
        fetchCategories();
      }
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteCat(id);
  };

  const executeDeleteCategory = async () => {
    if (!confirmDeleteCat) return;
    const id = confirmDeleteCat;
    setConfirmDeleteCat(null);

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (!error) {
      await auditLog('service_deleted', { service_id: id }, user?.id || '');
      fetchCategories();
    }
  };

  if (loading) return <div>Loading categories...</div>;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-sewakhoj-red transition-colors uppercase tracking-widest mb-2">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-foreground">Task Categories</h2>
          <p className="text-sm text-muted-foreground">Manage the services available on SewaKhoj.</p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: "", name_ne: "", description: "", description_ne: "", icon: "🔧", base_price: 500 }); }}
          className="admin-btn admin-btn-red flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="admin-card animate-in fade-in slide-in-from-top-4">
          <div className="admin-card-header !bg-primary text-white flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase">{editingId ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }}><X className="w-4 h-4" /></button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="admin-form-group">
              <label>Name (English)</label>
              <input
                className="admin-form-input"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="admin-form-group">
              <label>Name (Nepali)</label>
              <input
                className="admin-form-input font-devanagari"
                value={formData.name_ne}
                onChange={e => setFormData({...formData, name_ne: e.target.value})}
              />
            </div>
            <div className="admin-form-group col-span-2">
              <label>Description (English)</label>
              <textarea
                className="admin-form-input min-h-[80px]"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="admin-form-group col-span-2">
              <label>Description (Nepali)</label>
              <textarea
                className="admin-form-input min-h-[80px] font-devanagari"
                value={formData.description_ne}
                onChange={e => setFormData({...formData, description_ne: e.target.value})}
              />
            </div>
            <div className="admin-form-group">
              <label>Icon (Emoji)</label>
              <input
                className="admin-form-input"
                value={formData.icon}
                onChange={e => setFormData({...formData, icon: e.target.value})}
              />
            </div>
            <div className="admin-form-group">
              <label>Base Price (Rs)</label>
              <input
                type="number"
                className="admin-form-input"
                value={formData.base_price}
                onChange={e => setFormData({...formData, base_price: parseInt(e.target.value)})}
              />
            </div>
            <div className="col-span-2 flex justify-end gap-3 mt-4">
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="admin-btn bg-muted text-foreground">Cancel</button>
              <button onClick={handleSave} className="admin-btn admin-btn-red flex items-center gap-2">
                <Check className="w-4 h-4" /> Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="admin-card group hover:shadow-md transition-all">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-admin-red-light rounded-xl flex items-center justify-center text-2xl">
                  {cat.icon}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(cat.id); setFormData(cat); setIsAdding(false); }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-bold text-lg text-foreground">{cat.name}</h4>
                <p className="text-sm text-primary font-bold font-devanagari">{cat.name_ne}</p>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{cat.description}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-devanagari line-clamp-1 italic">{cat.description_ne}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Base Rate</span>
                <span className="font-black text-foreground">Rs {cat.base_price}</span>
              </div>
            </div>
          </div>
        ))}
      <ConfirmDialog
        open={!!confirmDeleteCat}
        onCancel={() => setConfirmDeleteCat(null)}
        onConfirm={executeDeleteCategory}
        title="Delete Category"
        message="Are you sure you want to delete this category?"
        variant="danger"
        confirmLabel="Yes, Delete"
      />
      </div>
    </div>
  );
}
