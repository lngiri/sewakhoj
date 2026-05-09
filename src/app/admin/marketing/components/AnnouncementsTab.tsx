"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Megaphone, Check, X, Calendar, User, Info, AlertTriangle, Flame, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  is_active: boolean;
  target_role: string;
  expires_at: string | null;
}

export default function AnnouncementsAdminPage() {
  const { showSuccess, showError } = useNotification();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as any,
    target_role: "all",
    is_active: true,
    expires_at: ""
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.message) {
      showError("Please fill in both title and message.");
      return;
    }

    const payload = {
      ...formData,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
    };

    const { error } = await supabase
      .from('announcements')
      .insert([payload]);
    
    if (!error) {
      showSuccess("Announcement broadcasted successfully!");
      setIsAdding(false);
      setFormData({ title: "", message: "", type: "info", target_role: "all", is_active: true, expires_at: "" });
      fetchAnnouncements();
    } else {
      showError("Failed to save announcement.");
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !current })
      .eq('id', id);
    
    if (!error) {
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showSuccess("Announcement deleted.");
    }
  };

  if (loading) {
    return <div className="p-20 text-center font-black uppercase text-xs tracking-widest text-gray-400">Loading Broadcaster...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Broadcast Center</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Manage Live Platform Announcements</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isAdding ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? 'Cancel' : 'New Broadcast'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-10 rounded-[2.5rem] border-2 border-blue-100 shadow-xl animate-in fade-in slide-in-from-top-6">
          <h3 className="text-xl font-black text-gray-900 mb-8">Craft New Announcement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Headline</label>
                <input 
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. System Update, Holiday Promo..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Message Content</label>
                <textarea 
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                  rows={3}
                  placeholder="Write the public message here..."
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Alert Type</label>
                  <select 
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="info">Information (Blue)</option>
                    <option value="success">Success (Green)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="danger">Danger (Red)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Target Audience</label>
                  <select 
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                    value={formData.target_role}
                    onChange={e => setFormData({...formData, target_role: e.target.value})}
                  >
                    <option value="all">Everyone</option>
                    <option value="customer">Customers Only</option>
                    <option value="tasker">Taskers Only</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Expires At (Optional)</label>
                <input 
                  type="datetime-local"
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                  value={formData.expires_at}
                  onChange={e => setFormData({...formData, expires_at: e.target.value})}
                />
              </div>
              <button 
                onClick={handleSave}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-700 shadow-2xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Megaphone className="w-4 h-4" /> Go Live Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-blue-200 transition-all">
            <div className="flex items-center gap-6 flex-1">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                a.type === 'danger' ? 'bg-red-50 text-red-600' :
                a.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                a.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {a.type === 'danger' ? <Flame className="w-6 h-6" /> :
                 a.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> :
                 a.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <Info className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-lg font-black text-gray-900">{a.title}</h4>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                    a.target_role === 'customer' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    a.target_role === 'tasker' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>Target: {a.target_role}</span>
                </div>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">{a.message}</p>
                {a.expires_at && (
                  <p className="text-[10px] font-bold text-gray-400 mt-3 flex items-center gap-1.5 uppercase tracking-widest">
                    <Calendar className="w-3 h-3" /> Expires: {new Date(a.expires_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
               <button 
                onClick={() => toggleActive(a.id, a.is_active)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  a.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
               >
                 {a.is_active ? 'Live' : 'Paused'}
               </button>
               <button 
                onClick={() => handleDelete(a.id)}
                className="w-10 h-10 bg-white text-gray-300 hover:text-red-600 border border-gray-100 rounded-xl flex items-center justify-center transition-all hover:bg-red-50"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          </div>
        ))}
        
        {announcements.length === 0 && !loading && (
          <div className="p-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
             <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-4" />
             <p className="text-gray-400 text-xs font-black uppercase tracking-widest">No active broadcasts in archive</p>
          </div>
        )}
      </div>
    </div>
  );
}
