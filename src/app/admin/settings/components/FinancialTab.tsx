"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { auditLog } from "@/lib/auditLog";
import { Settings, Percent, Save } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
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
        showError("Failed to update. Make sure you are a Super Admin.");
      } else {
        await auditLog('commission_changed', { old_rate: rate, new_rate: rate }, user?.id || '');
        showSuccess("Commission rate updated successfully! Future bookings will use this rate.");
      }
    }
    
    setSaving(false);
  };

  if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red mx-auto mt-20"></div>;

  return (
    <div className="space-y-6">
      <div className="admin-card max-w-lg">
        <div className="admin-card-header">
          <h3 className="text-[14px] font-bold uppercase tracking-wider flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" /> Financial Configuration
          </h3>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="admin-form-group">
            <label>Global Commission Rate (%)</label>
            <p className="text-[12px] text-muted-foreground mb-2">
              This percentage is automatically deducted from Tasker payouts for online transactions, or owed by Taskers for cash transactions.
            </p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Percent className="h-5 w-5 text-[#ccc]" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="admin-form-input w-full !pl-12 !py-3 !text-xl font-bold"
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label>Platform Currency</label>
            <select className="admin-form-input">
              <option>NPR (Rs)</option>
              <option>USD ($)</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label>Default Payment Method</label>
            <select className="admin-form-input">
              <option>Cash on Delivery</option>
              <option>eSewa</option>
              <option>Khalti</option>
            </select>
          </div>

          <button 
            onClick={saveSettings}
            disabled={saving}
            className="admin-btn admin-btn-red w-full !py-4 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5"/> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
