"use client";

import { ShieldCheck, Star, Briefcase, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Factor {
  name: string;
  icon: string;
  weight: number;
  score: number;
  max_score: number;
  status: string;
  description: string;
}

interface TrustScoreBreakdownData {
  overall_score: number;
  factors: Factor[];
  raw_metrics: {
    average_rating: number;
    completion_count: number;
    cancellation_count: number;
    response_time_avg: number;
    total_jobs: number;
    id_verified: boolean;
  };
  tier: string;
}

interface TrustScoreBreakdownProps {
  taskerId: string;
  compact?: boolean;
  className?: string;
}

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  shield: <ShieldCheck className="w-4 h-4" />,
  star: <Star className="w-4 h-4" />,
  briefcase: <Briefcase className="w-4 h-4" />,
  "x-circle": <XCircle className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
};

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-blue-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getTierLabel(tier: string): { label: string; color: string; bg: string } {
  switch (tier) {
    case "excellent":
      return { label: "Excellent", color: "text-green-700", bg: "bg-green-50 border-green-100" };
    case "good":
      return { label: "Good", color: "text-blue-700", bg: "bg-blue-50 border-blue-100" };
    case "average":
      return { label: "Average", color: "text-amber-700", bg: "bg-amber-50 border-amber-100" };
    default:
      return { label: "Needs Improvement", color: "text-red-700", bg: "bg-red-50 border-red-100" };
  }
}

export default function TrustScoreBreakdown({ taskerId, compact = false, className = "" }: TrustScoreBreakdownProps) {
  const [data, setData] = useState<TrustScoreBreakdownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBreakdown = async () => {
    if (data) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = (await import("@/lib/supabase-browser")).supabase;
      const { data: result, error: rpcError } = await supabase
        .rpc("get_trust_score_breakdown", { p_tasker_id: taskerId });

      if (rpcError) throw rpcError;
      if (!result) throw new Error("No data returned");

      setData(result as unknown as TrustScoreBreakdownData);
      setExpanded(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tierInfo = data ? getTierLabel(data.tier) : null;

  return (
    <div className={`${className}`}>
      {/* Trigger button — shows compact score badge */}
      <button
        onClick={fetchBreakdown}
        className="flex items-center gap-2 text-xs font-bold transition-all hover:opacity-80"
        aria-label="View trust score breakdown"
      >
        {data ? (
          <>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${tierInfo?.bg}`}>
              <ShieldCheck className={`w-3 h-3 ${tierInfo?.color}`} />
              <span className={tierInfo?.color}>{data.overall_score}</span>
            </span>
            {expanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
          </>
        ) : loading ? (
          <span className="text-gray-400 animate-pulse">Loading trust score...</span>
        ) : (
          <span className="text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            View Trust Score
          </span>
        )}
      </button>

      {/* Expanded breakdown */}
      {expanded && data && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
          {/* Overall score ring */}
          <div className="flex items-center gap-5 mb-5 pb-5 border-b border-gray-50">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke={data.overall_score >= 80 ? "#16a34a" : data.overall_score >= 60 ? "#2563eb" : data.overall_score >= 40 ? "#d97706" : "#dc2626"}
                  strokeWidth="4"
                  strokeDasharray={`${(data.overall_score / 100) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900">
                {data.overall_score}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-gray-900">Trust Score</span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${tierInfo?.bg} ${tierInfo?.color}`}>
                  {tierInfo?.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Based on {data.raw_metrics.total_jobs || 0} total jobs · {
                  data.raw_metrics.id_verified ? "ID Verified" : "ID Not Verified"
                }
              </p>
            </div>
          </div>

          {/* Factor breakdown */}
          <div className="space-y-4">
            {data.factors.map((factor) => {
              const pct = factor.max_score > 0 ? (factor.score / factor.max_score) * 100 : 0;
              return (
                <div key={factor.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={getScoreColor(factor.score, factor.max_score)}>
                        {FACTOR_ICONS[factor.icon] || <ShieldCheck className="w-4 h-4" />}
                      </span>
                      <span className="text-xs font-bold text-gray-700">{factor.name}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {factor.weight}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${getScoreColor(factor.score, factor.max_score)}`}>
                        {factor.score}/{factor.max_score}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getScoreBg(factor.score, factor.max_score)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">{factor.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expanded && error && (
        <div className="mt-2 text-xs text-red-500 font-medium">
          Failed to load trust score breakdown: {error}
        </div>
      )}
    </div>
  );
}
