"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Service {
  id: string;
  name: string;
  name_ne: string;
  description: string;
  icon: string;
  base_price: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    name_ne: "",
    description: "",
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
        setEditingId(null);
        fetchCategories();
      }
    } else {
      const { error } = await supabase
        .from('services')
        .insert([formData]);
      
      if (!error) {
        setIsAdding(false);
        fetchCategories();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      
      if (!error) {
        fetchCategories();
      }
    }
  };

  if (loading) return <div>Loading categories...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-foreground">Task Categories</h2>
          <p className="text-sm text-muted-foreground">Manage the services available on SewaKhoj.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: "", name_ne: "", description: "", icon: "🔧", base_price: 500 }); }}
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
              <label>Description</label>
              <textarea 
                className="admin-form-input min-h-[80px]" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
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
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Base Rate</span>
                <span className="font-black text-foreground">Rs {cat.base_price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
