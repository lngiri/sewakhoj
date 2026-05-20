"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Power,
  PowerOff,
  CalendarX,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

// Day labels
const DAYS = [
  { key: "0", label: "Sun", full: "Sunday" },
  { key: "1", label: "Mon", full: "Monday" },
  { key: "2", label: "Tue", full: "Tuesday" },
  { key: "3", label: "Wed", full: "Wednesday" },
  { key: "4", label: "Thu", full: "Thursday" },
  { key: "5", label: "Fri", full: "Friday" },
  { key: "6", label: "Sat", full: "Saturday" },
];

// Hour options for start/end selectors (06:00 to 22:00)
const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6;
  const label = `${h.toString().padStart(2, "0")}:00`;
  return { value: label, label };
});

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface WeeklySchedule {
  [key: string]: DaySchedule;
}

interface BlockedDay {
  id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}

interface WeeklyScheduleEditorProps {
  /** Initial schedule to load */
  initialSchedule?: WeeklySchedule;
  /** Initial blocked days */
  initialBlockedDays?: BlockedDay[];
  /** Called when schedule changes */
  onScheduleChange?: (schedule: WeeklySchedule) => void;
  /** Called when blocked days change */
  onBlockedDaysChange?: (days: BlockedDay[]) => void;
  /** Whether the component is in a loading state */
  loading?: boolean;
}

export default function WeeklyScheduleEditor({
  initialSchedule,
  initialBlockedDays = [],
  onScheduleChange,
  onBlockedDaysChange,
  loading = false,
}: WeeklyScheduleEditorProps) {
  const [schedule, setSchedule] = useState<WeeklySchedule>(() => {
    const s: WeeklySchedule = {};
    for (let d = 0; d <= 6; d++) {
      s[d.toString()] = { enabled: false, start: "09:00", end: "18:00" };
    }
    return s;
  });
  const [blockedDays, setBlockedDays] =
    useState<BlockedDay[]>(initialBlockedDays);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockReason, setNewBlockReason] = useState("");
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load initial schedule
  useEffect(() => {
    if (initialSchedule) {
      const s: WeeklySchedule = {};
      for (let d = 0; d <= 6; d++) {
        const day = initialSchedule[d.toString()];
        s[d.toString()] = day
          ? { ...day }
          : { enabled: false, start: "09:00", end: "18:00" };
      }
      setSchedule(s);
    }
  }, [initialSchedule]);

  useEffect(() => {
    setBlockedDays(initialBlockedDays);
  }, [initialBlockedDays]);

  // Toggle day on/off
  const toggleDay = (dayKey: string) => {
    setSchedule((prev) => {
      const next = { ...prev };
      next[dayKey] = {
        ...next[dayKey],
        enabled: !next[dayKey].enabled,
      };
      onScheduleChange?.(next);
      return next;
    });
  };

  // Update start/end time for a day
  const updateTime = (dayKey: string, field: "start" | "end", value: string) => {
    setSchedule((prev) => {
      const next = { ...prev };
      next[dayKey] = { ...next[dayKey], [field]: value };
      onScheduleChange?.(next);
      return next;
    });
  };

  // Quick preset: apply to all days
  const applyPreset = (preset: "weekdays" | "all" | "none") => {
    setSchedule((prev) => {
      const next = { ...prev };
      for (let d = 0; d <= 6; d++) {
        const key = d.toString();
        if (preset === "all") {
          next[key] = { enabled: true, start: "09:00", end: "18:00" };
        } else if (preset === "none") {
          next[key] = { ...next[key], enabled: false };
        } else if (preset === "weekdays") {
          // Mon(1)-Fri(5)
          next[key] = {
            enabled: d >= 1 && d <= 5,
            start: "09:00",
            end: "18:00",
          };
        }
      }
      onScheduleChange?.(next);
      return next;
    });
  };

  // Add a blocked day
  const addBlockedDay = () => {
    setError("");
    if (!newBlockDate) {
      setError("Please select a date");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (newBlockDate < today) {
      setError("Cannot block a past date");
      return;
    }

    if (blockedDays.some((d) => d.blocked_date === newBlockDate)) {
      setError("This date is already blocked");
      return;
    }

    const newBlock: BlockedDay = {
      id: `temp-${Date.now()}`,
      blocked_date: newBlockDate,
      reason: newBlockReason || null,
      created_at: new Date().toISOString(),
    };

    const updated = [...blockedDays, newBlock].sort((a, b) =>
      a.blocked_date.localeCompare(b.blocked_date)
    );

    setBlockedDays(updated);
    setNewBlockDate("");
    setNewBlockReason("");
    setIsAddingBlock(false);
    onBlockedDaysChange?.(updated);
  };

  // Remove a blocked day
  const removeBlockedDay = (date: string) => {
    const updated = blockedDays.filter((d) => d.blocked_date !== date);
    setBlockedDays(updated);
    onBlockedDaysChange?.(updated);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded-xl w-48" />
        <div className="grid grid-cols-7 gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Weekly Schedule
          </h4>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Set your working days and hours. You'll auto-appear online during these times.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => applyPreset("weekdays")}
            className="px-3 py-1.5 text-[10px] font-black uppercase rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Weekdays 9-6
          </button>
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className="px-3 py-1.5 text-[10px] font-black uppercase rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            All Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset("none")}
            className="px-3 py-1.5 text-[10px] font-black uppercase rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {DAYS.map((day) => {
          const config = schedule[day.key];
          const isEnabled = config?.enabled;

          return (
            <div
              key={day.key}
              className={`rounded-2xl border-2 p-4 transition-all ${
                isEnabled
                  ? "border-sewakhoj-red/30 bg-sewakhoj-red/5"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              {/* Day header + toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day.key)}
                className="w-full flex items-center justify-between mb-3"
                title={`Toggle ${day.full}`}
              >
                <span
                  className={`text-xs font-black uppercase ${
                    isEnabled ? "text-sewakhoj-red" : "text-slate-400"
                  }`}
                >
                  {day.label}
                </span>
                {isEnabled ? (
                  <Power className="w-4 h-4 text-green-600" />
                ) : (
                  <PowerOff className="w-4 h-4 text-slate-300" />
                )}
              </button>

              {/* Time selectors (only when enabled) */}
              {isEnabled ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <select
                      value={config.start}
                      onChange={(e) =>
                        updateTime(day.key, "start", e.target.value)
                      }
                      className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-sewakhoj-red"
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold w-3 text-center">
                      to
                    </span>
                    <select
                      value={config.end}
                      onChange={(e) =>
                        updateTime(day.key, "end", e.target.value)
                      }
                      className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-sewakhoj-red"
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center font-medium italic">
                  Day off
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Block Day Section */}
      <div className="border-t border-slate-100 pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <CalendarX className="w-4 h-4 text-amber-600" />
              Emergency Leave / Block Days
            </h4>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Block entire days when you're unavailable (sick, personal, emergency).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingBlock(!isAddingBlock)}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Block Day
          </button>
        </div>

        {/* Add Block Form */}
        {isAddingBlock && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 space-y-3">
            {error && (
              <div className="flex items-center gap-2 text-[11px] font-bold text-red-600 bg-red-50 rounded-xl px-3 py-2">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newBlockDate}
                  onChange={(e) => {
                    setNewBlockDate(e.target.value);
                    setError("");
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex-[2]">
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  placeholder="Sick, personal, emergency..."
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={addBlockedDay}
                  className="px-4 py-2 text-[10px] font-black uppercase rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  Block
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBlock(false);
                    setError("");
                  }}
                  className="px-3 py-2 text-[10px] font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blocked Days List */}
        {blockedDays.length > 0 ? (
          <div className="space-y-2">
            {blockedDays.map((bd) => (
              <div
                key={bd.id}
                className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <CalendarX className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs font-bold text-red-700">
                      {new Date(bd.blocked_date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </p>
                    {bd.reason && (
                      <p className="text-[10px] text-red-400 font-medium">
                        {bd.reason}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeBlockedDay(bd.blocked_date)}
                  className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                  title="Unblock this day"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 italic text-center py-4">
            No days blocked. You're available on all scheduled days.
          </p>
        )}
      </div>

      {/* Info footer */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
          💡 Your online status will automatically toggle based on this schedule.
          Customers will only see time slots within your working hours. Blocked days
          completely hide your availability for that date.
        </p>
      </div>
    </div>
  );
}
