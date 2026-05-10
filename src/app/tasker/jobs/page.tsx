"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { services } from "@/data/services";
import { 
  Briefcase, MapPin, Clock, DollarSign, User, ShieldCheck, 
  AlertTriangle, ChevronRight, Activity, Zap, ArrowLeft,
  CheckCircle2, XCircle, TrendingUp, Bell
} from "lucide-react";

interface OpenJob {
  id: string;
  service: string;
  city: string;
  description: string;
  budget: number | null;
  created_at: string;
  customers?: {
    full_name: string;
  };
}

export default function TaskerJobsBoard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useNotification();
  
  const [taskerProfile, setTaskerProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<OpenJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0.10); // Default to 10%

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/tasker/jobs");
    } else if (user) {
      checkTaskerAndFetchJobs();
    }
  }, [user, authLoading, router]);

  const checkTaskerAndFetchJobs = async () => {
    try {
      const { data: taskerData, error: taskerError } = await supabase
        .from("taskers")
        .select("*")
        .eq("user_id", user?.id)
        .single();
        
      if (taskerError || !taskerData) {
        router.push("/tasker/onboard");
        return;
      }
      
      setTaskerProfile(taskerData);

      const { data: jobsData, error: jobsError } = await supabase
        .from("job_posts")
        .select(`
          *,
          customers:customer_id (
            full_name
          )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData as any);

      const { count: jobPostsCount } = await supabase
        .from("job_posts")
        .select('*', { count: 'exact', head: true })
        .eq("accepted_by_tasker_id", taskerData.id)
        .in("status", ["accepted", "on-the-way", "in-progress"]);

      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select('*', { count: 'exact', head: true })
        .eq("tasker_id", taskerData.id)
        .in("status", ["confirmed", "accepted", "on-the-way", "in-progress"]);

      const total = (jobPostsCount || 0) + (bookingsCount || 0);
      setActiveBookingsCount(total);
      setHasActiveJob(total > 0);
      
      // Fetch dynamic commission rate
      const { data: settingsData } = await supabase.from('platform_settings').select('commission_rate_percentage').single();
      if (settingsData && settingsData.commission_rate_percentage) {
        setCommissionRate(parseFloat(settingsData.commission_rate_percentage) / 100);
      }
      
    } catch (err) {
      console.error("Error loading jobs board:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!taskerProfile || taskerProfile.status !== 'active') {
      showError("Your tasker profile must be active to accept jobs.");
      return;
    }
    setAcceptingId(jobId);
    try {
      const { error } = await supabase
        .from("job_posts")
        .update({
          status: 'accepted',
          accepted_by_tasker_id: taskerProfile.id
        })
        .eq("id", jobId)
        .eq("status", "open");
        
      if (error) throw error;
      
      showSuccess("Mission accepted! Head to your dashboard to start.");
      setJobs(jobs.filter(j => j.id !== jobId));
      
    } catch (err: any) {
      showError(err.message || "Failed to accept. It may have been taken.");
    } finally {
      setAcceptingId(null);
    }
  };

  const getServiceInfo = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    return s ? { emoji: s.emoji, name: s.nameEn } : { emoji: '🔧', name: serviceId };
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-white uppercase tracking-widest text-xs animate-pulse">Loading Mission Board...</p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* NAV */}
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-black uppercase tracking-widest text-green-400">Live Mission Board</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {activeBookingsCount > 0 && (
              <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/30 transition-all">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{activeBookingsCount} Active</span>
              </Link>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Your Rate</p>
              <p className="text-sm font-black text-white">Rs {taskerProfile?.hourly_rate}/hr</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-3">Available Missions</h1>
              <p className="text-slate-400 font-medium max-w-lg">Customers near you need help. Accept a mission, complete it, and get paid. Your earnings are protected by the SewaKhoj Protocol.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 text-center">
                <p className="text-3xl font-black text-white">{jobs.length}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Open Jobs</p>
              </div>
              <div className="bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 text-center">
                <p className="text-3xl font-black text-green-400">{taskerProfile?.total_jobs || 0}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Completed</p>
              </div>
            </div>
          </div>

          {/* ACTIVE JOB WARNING */}
          {hasActiveJob && (
            <div className="mt-8 flex items-center gap-4 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-black text-amber-300">Active Mission in Progress</p>
                <p className="text-xs text-amber-400/70 font-medium mt-1">Finish your current job before accepting a new one. <Link href="/dashboard" className="underline hover:text-amber-300">Go to Dashboard →</Link></p>
              </div>
            </div>
          )}

          {/* EARNINGS INFO */}
          <div className="mt-8 flex items-center gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-blue-300">SewaKhoj Earnings Protection</p>
              <p className="text-xs text-slate-400 font-medium mt-1">You keep <span className="text-white font-black">{100 - (commissionRate * 100)}%</span> of every job. Platform fee is only {commissionRate * 100}%. Payment is guaranteed once the customer confirms completion.</p>
            </div>
          </div>
        </div>

        {/* JOBS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.length === 0 ? (
            <div className="col-span-full bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-16 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-black text-white mb-3">No Missions Available</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto">New customer requests will appear here in real-time. Keep this page open or check back soon.</p>
              <div className="mt-8 flex items-center justify-center gap-2 text-slate-600">
                <Bell className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">You&apos;ll be notified of new jobs</span>
              </div>
            </div>
          ) : (
            jobs.map(job => {
              const svc = getServiceInfo(job.service);
              const takeHome = job.budget ? Math.round(job.budget * (1 - commissionRate)) : null;
              
              return (
                <div key={job.id} className="group bg-slate-900/50 rounded-[2rem] border border-white/5 overflow-hidden flex flex-col hover:border-white/10 hover:bg-slate-900/80 transition-all duration-500">
                  <div className="p-7 flex-1">
                    {/* TOP: Service + Time */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl border border-white/5">
                          {svc.emoji}
                        </div>
                        <div>
                          <h4 className="font-black text-white text-sm tracking-tight">{svc.name}</h4>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{job.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-white/5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{timeAgo(job.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* DESCRIPTION */}
                    <p className="text-sm text-slate-300 font-medium leading-relaxed line-clamp-3 mb-6">&ldquo;{job.description}&rdquo;</p>
                    
                    {/* DETAILS */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-4 h-4" />
                          <span className="text-xs font-bold">{job.customers?.full_name || 'Customer'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-[9px] font-black text-green-500/70 uppercase tracking-widest">Verified</span>
                        </div>
                      </div>

                      {/* EARNINGS BREAKDOWN */}
                      <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Customer Budget</span>
                          <span className="text-sm font-black text-white">{job.budget ? `Rs ${job.budget}` : 'Negotiable'}</span>
                        </div>
                        {takeHome && (
                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Your Take-Home</span>
                            <span className="text-lg font-black text-green-400">Rs {takeHome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* ACTION */}
                  <div className="p-5 border-t border-white/5">
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      disabled={acceptingId === job.id || hasActiveJob}
                      className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${
                        hasActiveJob 
                          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                          : "bg-green-500 text-white hover:bg-green-400 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-green-500/20"
                      }`}
                    >
                      {acceptingId === job.id ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Accepting...</>
                      ) : hasActiveJob ? (
                        <><XCircle className="w-4 h-4" /> Finish Current Job First</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Accept Mission</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* TASKER SUPPORT FOOTER */}
        <div className="mt-16 bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h5 className="text-sm font-black text-white mb-1">Payment Guaranteed</h5>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Once the customer confirms, your earnings are locked and protected.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h5 className="text-sm font-black text-white mb-1">Cancellation Shield</h5>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">If a customer cancels after you&apos;ve started traveling, you receive a compensation fee.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h5 className="text-sm font-black text-white mb-1">Rank Up System</h5>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Complete more missions to earn Elite Pro status and priority on high-value jobs.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
