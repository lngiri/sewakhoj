"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/data/services";

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
  
  const [taskerProfile, setTaskerProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<OpenJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [hasActiveJob, setHasActiveJob] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/tasker/jobs");
    } else if (user) {
      checkTaskerAndFetchJobs();
    }
  }, [user, authLoading, router]);
  const checkTaskerAndFetchJobs = async () => {
    try {
      
      // 1. Get tasker profile
      const { data: taskerData, error: taskerError } = await supabase
        .from("taskers")
        .select("*")
        .eq("user_id", user?.id)
        .single();
        
      if (taskerError || !taskerData) {
        // Not a tasker, or no profile
        router.push("/tasker/onboard");
        return;
      }
      
      setTaskerProfile(taskerData);

      // 2. Fetch open jobs matching their city (or all open jobs for now)
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

      // 3. Check if tasker has active jobs
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

      setHasActiveJob((jobPostsCount || 0) + (bookingsCount || 0) > 0);
      
    } catch (err) {
      console.error("Error loading jobs board:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!taskerProfile || taskerProfile.status !== 'active') {
      alert("Your tasker profile must be active to accept jobs.");
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
        .eq("status", "open"); // Double check it's still open
        
      if (error) throw error;
      
      alert("Job accepted successfully! The customer will contact you.");
      // Remove from list
      setJobs(jobs.filter(j => j.id !== jobId));
      
    } catch (err: any) {
      alert(err.message || "Failed to accept job. It may have been taken by someone else.");
    } finally {
      setAcceptingId(null);
    }
  };

  const getServiceName = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    return s ? `${s.emoji} ${s.nameEn}` : serviceId;
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Available Jobs</h1>
          <p className="text-gray-600 mt-2">Customers in your area are looking for help right now.</p>
          {hasActiveJob && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm font-medium">
              ⚠️ You currently have an active job. You must finish your current task before accepting a new one.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-xl font-semibold mb-2">No open jobs right now</h3>
              <p>Check back later! We'll show new customer requests here.</p>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                      {getServiceName(job.service)}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-3">
                    "{job.description}"
                  </h3>
                  
                  <div className="space-y-2 mt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>📍</span> <span className="font-medium capitalize">{job.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>💰</span> <span className="font-medium text-sewakhoj-red">
                        {job.budget ? `Rs ${job.budget} budget` : 'Budget negotiable'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>👤</span> <span>Posted by {job.customers?.full_name || 'Customer'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => handleAcceptJob(job.id)}
                    disabled={acceptingId === job.id || hasActiveJob}
                    className={`w-full py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                      hasActiveJob 
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                    }`}
                  >
                    {acceptingId === job.id ? "Accepting..." : "Accept Job"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
