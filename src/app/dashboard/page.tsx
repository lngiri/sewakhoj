"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/data/services";

interface JobPost {
  id: string;
  service: string;
  city: string;
  description: string;
  budget: number | null;
  status: string;
  created_at: string;
  accepted_by_tasker_id: string | null;
  taskers?: {
    users?: {
      full_name: string;
      phone: string;
    };
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    } else if (user) {
      fetchJobs();
    }
  }, [user, authLoading, router]);

  const fetchJobs = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("job_posts")
        .select(`
          *,
          taskers:accepted_by_tasker_id (
            users (
              full_name,
              phone
            )
          )
        `)
        .eq("customer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data as any);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <Link href="/post-task" className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg font-medium hover:bg-sewakhoj-red-light transition">
            Post New Task
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-semibold">My Posted Tasks</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {jobs.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                You haven't posted any tasks yet.
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-gray-50 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">{getServiceName(job.service)}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        job.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{job.description}</p>
                    <div className="flex gap-4 text-xs text-gray-500 font-medium">
                      <span>📍 {job.city.charAt(0).toUpperCase() + job.city.slice(1)}</span>
                      <span>💰 {job.budget ? `Rs ${job.budget}` : 'Negotiable'}</span>
                      <span>📅 {new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {job.status === 'accepted' && job.taskers?.users && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 w-full md:w-auto">
                      <p className="text-xs text-green-800 font-bold mb-1">Accepted By:</p>
                      <p className="text-sm font-semibold">{job.taskers.users.full_name}</p>
                      <p className="text-sm">📞 {job.taskers.users.phone}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
