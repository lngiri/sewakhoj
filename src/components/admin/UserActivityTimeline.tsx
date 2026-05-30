"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  ShieldCheck, XCircle, Send, Calendar, Clock, UserRound,
  CheckCircle2, AlertTriangle, Activity, DollarSign, Ban,
  ShoppingCart, FileText, MessageSquare
} from "lucide-react";

interface ActivityEvent {
  id: string;
  type: "system_log" | "notification" | "booking" | "kyc";
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
  link?: string;
}

interface Props {
  userId: string;
  taskerId?: string;
  userName?: string;
}

export default function UserActivityTimeline({ userId, taskerId, userName }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchActivity();
  }, [userId]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const results: ActivityEvent[] = [];

      // 1. Fetch system_logs for this user (admin actions)
      const { data: logs } = await supabase
        .from("system_logs")
        .select("*")
        .or(`target_id.eq.${userId},target_id.eq.${taskerId || ""}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (logs) {
        for (const log of logs) {
          const event = logToEvent(log);
          if (event) results.push(event);
        }
      }

      // 2. Fetch notifications sent to this user
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (notifs) {
        for (const n of notifs) {
          results.push({
            id: `notif-${n.id}`,
            type: "notification",
            title: n.title || "Notification",
            description: n.message || "",
            timestamp: n.created_at,
            icon: <Send className="w-4 h-4" />,
            color: "bg-blue-50 text-blue-600 border-blue-200",
            link: n.link || undefined,
          });
        }
      }

      // 3. Fetch bookings for this user
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .or(`customer_id.eq.${userId},tasker_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (bookings) {
        for (const b of bookings) {
          const statusColors: Record<string, string> = {
            pending_acceptance: "bg-amber-50 text-amber-600 border-amber-200",
            accepted: "bg-blue-50 text-blue-600 border-blue-200",
            confirmed: "bg-green-50 text-green-600 border-green-200",
            "in-progress": "bg-purple-50 text-purple-600 border-purple-200",
            completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
            cancelled: "bg-red-50 text-red-600 border-red-200",
          };
          results.push({
            id: `booking-${b.id}`,
            type: "booking",
            title: `Booking: ${b.service || "Service"} — ${b.status?.replace("_", " ") || "Unknown"}`,
            description: `${b.booking_date || ""} at ${b.booking_time || ""} · Rs ${b.total_amount || 0}`,
            timestamp: b.created_at,
            icon: <ShoppingCart className="w-4 h-4" />,
            color: statusColors[b.status] || "bg-gray-50 text-gray-600 border-gray-200",
          });
        }
      }

      // Sort all by timestamp descending
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(results.slice(0, 50));
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <LoadingSpinner size="md" />
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-3 animate-pulse">
            Loading activity...
          </p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-7 h-7 text-gray-300" />
        </div>
        <p className="font-bold text-gray-400 text-sm">No Activity Recorded</p>
        <p className="text-xs text-gray-400 mt-1">This user has no logged events yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-100" />

      <div className="space-y-0">
        {events.map((event, idx) => (
          <div key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
            {/* Dot */}
            <div className="relative z-10 mt-0.5">
              <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 ${event.color}`}>
                {event.icon}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-gray-900 leading-snug">{event.title}</p>
                <span className="text-[10px] text-gray-400 font-medium shrink-0 whitespace-nowrap">
                  {formatTimeAgo(event.timestamp)}
                </span>
              </div>
              {event.description && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{event.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  event.type === "system_log" ? "bg-gray-100 text-gray-600" :
                  event.type === "notification" ? "bg-blue-50 text-blue-600" :
                  event.type === "booking" ? "bg-green-50 text-green-600" :
                  "bg-purple-50 text-purple-600"
                }`}>
                  {event.type === "system_log" ? "Admin Action" :
                   event.type === "notification" ? "Notification" :
                   event.type === "booking" ? "Booking" : "KYC"}
                </span>
                <span className="text-[9px] text-gray-400 font-mono">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function logToEvent(log: any): ActivityEvent | null {
  const details = log.details || {};

  switch (log.action_type) {
    case "kyc_approval":
      return {
        id: `log-${log.id}`,
        type: "system_log",
        title: `KYC Approved`,
        description: `Tasker ${details.tasker_name || "unknown"} was approved`,
        timestamp: log.created_at,
        icon: <ShieldCheck className="w-4 h-4" />,
        color: "bg-green-50 text-green-600 border-green-200",
      };
    case "kyc_rejection":
      return {
        id: `log-${log.id}`,
        type: "system_log",
        title: `KYC Rejected`,
        description: `Reason: ${details.reason || "N/A"}`,
        timestamp: log.created_at,
        icon: <XCircle className="w-4 h-4" />,
        color: "bg-red-50 text-red-600 border-red-200",
      };
    case "user_status_changed":
      return {
        id: `log-${log.id}`,
        type: "system_log",
        title: `Account ${log.details?.new_status || "Status Changed"}`,
        description: log.details?.reason || "",
        timestamp: log.created_at,
        icon: <Ban className="w-4 h-4" />,
        color: "bg-amber-50 text-amber-600 border-amber-200",
      };
    case "role_change":
    case "assign_role":
      return {
        id: `log-${log.id}`,
        type: "system_log",
        title: `Role Changed`,
        description: `Role: ${details.role || details.new_role || "Changed"} · Email: ${details.email || "N/A"}`,
        timestamp: log.created_at,
        icon: <UserRound className="w-4 h-4" />,
        color: "bg-purple-50 text-purple-600 border-purple-200",
      };
    case "ledger_settlement":
      return {
        id: `log-${log.id}`,
        type: "system_log",
        title: `Ledger Settlement`,
        description: `Amount settled for booking ${details.booking_id || "N/A"}`,
        timestamp: log.created_at,
        icon: <DollarSign className="w-4 h-4" />,
        color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      };
    default:
      return {
        id: `log-${log.id}`,
        type: "system_log",
        title: log.action_type?.replace(/_/g, " ") || "Action",
        description: JSON.stringify(details).slice(0, 120),
        timestamp: log.created_at,
        icon: <FileText className="w-4 h-4" />,
        color: "bg-gray-50 text-gray-600 border-gray-200",
      };
  }
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
