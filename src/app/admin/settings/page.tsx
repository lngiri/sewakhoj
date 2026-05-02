"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Settings, Percent, Save } from "lucide-react";

export default function PlatformSettingsPage() {
  const [rate, setRate] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('platform_settings').select('*').limit(1).single();
    if (data && !error) {
      setRate(data.commission_rate_percentage);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    
    // There's only one row in platform_settings, so we just update the first one
    const { data: existing } = await supabase.from('platform_settings').select('id').limit(1).single();
    
    if (existing) {
      const { error } = await supabase.from('platform_settings').update({ commission_rate_percentage: rate }).eq('id', existing.id);
      if (error) {
        alert("Failed to update. Make sure you are a Super Admin.");
      } else {
        alert("Commission rate updated successfully! Future bookings will use this rate.");
      }
    }
    
    setSaving(false);
  };

  if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red mx-auto mt-20"></div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Settings className="w-8 h-8"/> Platform Settings</h1>
        <p className="text-gray-600 mt-2">Configure global variables and commission structures for the marketplace.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-lg">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Financial Configuration</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Global Commission Rate</label>
          <p className="text-sm text-gray-500 mb-4">This percentage is automatically deducted from Tasker payouts for online transactions, or owed by Taskers for cash transactions.</p>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Percent className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl font-bold text-xl focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
            />
          </div>
        </div>

        <button 
          onClick={saveSettings}
          disabled={saving}
          className="w-full bg-sewakhoj-red text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sewakhoj-red-light transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5"/> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
