"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useNotification } from "@/context/NotificationContext";
import {
  Users,
  Bell,
  MessageSquare,
  Mail,
  Play,
  History,
  RefreshCw,
  AlertCircle,
  UserCheck,
  Clock,
  Settings,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface CampaignStats {
  total_campaigns: number;
  total_notifications_sent: number;
  total_sms_scheduled: number;
  total_email_scheduled: number;
  last_campaign_at: string | null;
  total_dormant_contacted: number;
}

interface DormantStats {
  role: string;
  dormant_count: number;
  avg_days_inactive: number;
  oldest_dormant_days: number;
  sample_users: any[];
}

interface Campaign {
  id: string;
  run_at: string;
  dormant_customer_count: number;
  dormant_tasker_count: number;
  notifications_created: number;
  sms_scheduled: number;
  email_scheduled: number;
  status: string;
  details: any;
}

interface Template {
  id: string;
  target_role: string;
  channel: string;
  title: string;
  body: string;
  is_active: boolean;
}

export default function ReengagementTab() {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [dormantStats, setDormantStats] = useState<DormantStats[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [confirmRun, setConfirmRun] = useState(false);

  // Campaign config
  const [customerDays, setCustomerDays] = useState(30);
  const [taskerDays, setTaskerDays] = useState(30);
  const [channels, setChannels] = useState<string[]>(["notification"]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/reengagement?customer_days=${customerDays}&tasker_days=${taskerDays}`
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();

      setCampaignStats(data.campaignStats);
      setDormantStats(data.dormantStats || []);
      setRecentCampaigns(data.recentCampaigns || []);
      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [customerDays, taskerDays, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleRunCampaign = async () => {
    setConfirmRun(false);
    setRunning(true);
    try {
      const res = await fetch("/api/admin/reengagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_days: customerDays,
          tasker_days: taskerDays,
          channels,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Campaign failed");
      }

      const result = await res.json();
      showSuccess(
        `Campaign completed: ${result.campaign?.notifications_created || 0} notifications, ${result.campaign?.sms_scheduled || 0} SMS, ${result.campaign?.email_scheduled || 0} emails`
      );
      await fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const toggleTemplateActive = async (templateId: string, current: boolean) => {
    try {
      const res = await fetch("/api/admin/reengagement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, is_active: !current }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId ? { ...t, is_active: !current } : t
        )
      );
      showSuccess("Template updated");
    } catch (err: any) {
      showError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin h-8 w-8 border-4 border-sewakhoj-red border-t-transparent rounded-full" />
      </div>
    );
  }

  const customerDormant =
    dormantStats.find((d) => d.role === "customer")?.dormant_count || 0;
  const taskerDormant =
    dormantStats.find((d) => d.role === "tasker")?.dormant_count || 0;

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-sewakhoj-red" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{customerDormant}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
            Dormant Customers
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{taskerDormant}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
            Dormant Taskers
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <History className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">
            {campaignStats?.total_campaigns || 0}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
            Total Campaigns
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">
            {campaignStats?.total_notifications_sent || 0}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
            Notifications Sent
          </p>
        </div>
      </div>

      {/* Campaign Runner */}
      <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Play className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">
              Run Re-engagement Campaign
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Target dormant users with notifications, SMS, and email
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Customer Dormancy (days)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              value={customerDays}
              onChange={(e) => setCustomerDays(parseInt(e.target.value) || 30)}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-sewakhoj-red outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Tasker Dormancy (days)
            </label>
            <input
              type="number"
              min={7}
              max={365}
              value={taskerDays}
              onChange={(e) => setTaskerDays(parseInt(e.target.value) || 30)}
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-sewakhoj-red outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Channels
            </label>
            <div className="flex gap-3 pt-2">
              {[
                { key: "notification", icon: Bell, label: "In-App" },
                { key: "sms", icon: MessageSquare, label: "SMS" },
                { key: "email", icon: Mail, label: "Email" },
              ].map((ch) => {
                const Icon = ch.icon;
                const active = channels.includes(ch.key);
                return (
                  <button
                    key={ch.key}
                    onClick={() => toggleChannel(ch.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      active
                        ? "bg-sewakhoj-red text-white shadow-lg shadow-red-500/20"
                        : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            Will target {customerDormant} customers & {taskerDormant} taskers
          </p>
          <button
            onClick={() => setConfirmRun(true)}
            disabled={running || (customerDormant === 0 && taskerDormant === 0)}
            className="flex items-center gap-2 px-8 py-3 bg-sewakhoj-red text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Launch Campaign
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dormant Users Detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dormantStats.map((group) => (
          <div
            key={group.role}
            className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  group.role === "customer"
                    ? "bg-red-50 text-sewakhoj-red"
                    : "bg-orange-50 text-orange-500"
                }`}
              >
                {group.role === "customer" ? (
                  <Users className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="font-black text-sm text-gray-900 uppercase tracking-widest">
                  {group.role === "customer" ? "Customers" : "Taskers"}
                </h4>
                <p className="text-[10px] text-gray-400 font-medium">
                  {group.dormant_count} dormant · avg {group.avg_days_inactive}d inactive
                </p>
              </div>
            </div>

            {group.sample_users && group.sample_users.length > 0 && (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {group.sample_users.slice(0, 10).map((u: any) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {u.full_name || "Unknown"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {u.phone || "No phone"} · {u.days_inactive}d inactive
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded-lg shrink-0">
                      {u.days_inactive}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Campaign History */}
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest">
            Campaign History
          </h3>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <Play className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-400">
              No campaigns run yet
            </p>
            <p className="text-[10px] text-gray-300 font-medium mt-1">
              Launch your first re-engagement campaign above
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCampaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      c.status === "completed"
                        ? "bg-green-50 text-green-500"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    {c.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(c.run_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {c.notifications_created} notifications ·{" "}
                      {c.sms_scheduled} SMS · {c.email_scheduled} emails
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500">
                    {c.dormant_customer_count + c.dormant_tasker_count} contacted
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {c.dormant_customer_count} cust · {c.dormant_tasker_count} task
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Management */}
      <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-gray-400" />
          <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest">
            Message Templates
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-2xl border-2 transition-all ${
                t.is_active
                  ? "border-green-100 bg-green-50/30"
                  : "border-gray-100 bg-gray-50/30 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-white">
                    {t.target_role}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-white">
                    {t.channel}
                  </span>
                </div>
                <button
                  onClick={() => toggleTemplateActive(t.id, t.is_active)}
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                    t.is_active
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  {t.is_active ? "Active" : "Disabled"}
                </button>
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">{t.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{t.body}</p>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmRun}
        title="Launch Re-engagement Campaign?"
        message={`This will send ${
          channels.includes("notification") ? "in-app notifications, " : ""
        }${channels.includes("sms") ? "SMS, " : ""}${
          channels.includes("email") ? "emails " : ""
        }to ${customerDormant} dormant customers and ${taskerDormant} dormant taskers who have been inactive for ${
          Math.min(customerDays, taskerDays)
        }+ days.`}
        confirmLabel="Launch Campaign"
        onConfirm={handleRunCampaign}
        onCancel={() => setConfirmRun(false)}
      />
    </div>
  );
}