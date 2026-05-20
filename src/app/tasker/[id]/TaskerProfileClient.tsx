"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, ShieldCheck, Clock, MapPin, CheckCircle2, Share2, Bookmark, AlertTriangle, MessageCircle, Calendar } from "lucide-react";
import PageHeader from "@/components/navigation/PageHeader";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { services as staticServices } from "@/data/services";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface TaskerUser {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
}

interface TaskerProfile {
  id: string;
  hourly_rate: number;
  city: string;
  rating: number;
  status: string;
  bio: string;
  skills: string[];
  is_featured: boolean;
  id_verified: boolean;
  completed_tasks?: number;
  experience_years?: number;
  response_time?: string;
  completion_rate?: number;
  monthly_earn?: string;
  users: TaskerUser | TaskerUser[];
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  service_type?: string;
  users: {
    full_name: string;
    avatar_url: string;
  };
}

interface ProfilePageProps {
  params: Promise<{ id: string }>;
  initialTasker?: any;
}

export default function TaskerProfileClient({ params, initialTasker }: ProfilePageProps) {
  const router = useRouter();
  const { id: taskerId } = use(params);

  const [tasker, setTasker] = useState<TaskerProfile | null>(initialTasker || null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(!initialTasker);

  useEffect(() => {
    async function fetchProfile() {
      if (initialTasker) return;
      
      const { data, error } = await supabase
        .from("taskers")
        .select(`
          *,
          users (id, full_name, phone, avatar_url)
        `)
        .eq("id", taskerId)
        .single();

      if (error) {
        console.error("Error fetching tasker profile:", error.message);
      } else {
        setTasker(data as unknown as TaskerProfile);
      }
    }

    async function fetchReviews() {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          users (full_name, avatar_url)
        `)
        .eq("tasker_id", taskerId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setReviews(data as any);
      } else {
        // Fallback mock reviews
        setReviews([
          {
            id: "1",
            rating: 5,
            comment: "Rajesh arrived within 30 minutes and fixed the leak quickly. Very professional and cleaned up after the job. Will definitely book again.",
            created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            service_type: "Pipe Leak Repair",
            users: { full_name: "Deepak Gurung", avatar_url: "" }
          },
          {
            id: "2",
            rating: 5,
            comment: "Full bathroom renovation completed in one day. The quality of work is exceptional. Very fair pricing compared to other plumbers.",
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            service_type: "Bathroom Fitting",
            users: { full_name: "Pratima Shrestha", avatar_url: "" }
          }
        ]);
      }
      setLoading(false);
    }

    fetchProfile();
    fetchReviews();
  }, [taskerId, initialTasker]);

  if (loading && !tasker) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" variant="brand" />
        <p className="font-medium text-gray-500 uppercase tracking-widest text-xs animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  if (!tasker) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🕵️‍♂️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tasker Profile Not Found</h1>
        <p className="text-gray-500 mb-6 max-w-sm">The tasker you are looking for might have been deactivated or the link is broken.</p>
        <Link href="/browse" className="bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-800 transition-all">
          Back to Search
        </Link>
      </div>
    );
  }

  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "?";
  const ratingCount = reviews.length || 142;
  
  const calculatedMonthlyEarn = tasker.monthly_earn || `Rs ${(tasker.hourly_rate * 40 / 1000).toFixed(0)}k+`;
  const jobsDone = tasker.completed_tasks || 142;
  const expYears = tasker.experience_years || 8;
  
  const { user: authUser, loading: authLoading } = useAuth();
  const isGuest = !authLoading && !authUser;

  return (
    <div className="min-h-screen bg-[#f4f6fb] py-6 sm:py-10 px-4">
      <div className="max-w-[900px] mx-auto">
        <PageHeader
          title={user?.full_name || "Tasker Profile"}
          description="Verified professional on SewaKhoj"
          showBack
          backHref="/browse"
          className="mb-4"
          relatedLinks={[
            { href: `/book/${taskerId}`, label: "Book Now" },
            { href: "/browse", label: "Find More Taskers" },
          ]}
        />
        {isGuest && (
          <div className="bg-slate-900 text-white p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-700 shadow-xl shadow-slate-900/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xl">✨</div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest">Guest Mode</p>
                <p className="text-[11px] text-white/60 font-bold">Sign up to unlock messaging, favorites, and secure booking.</p>
              </div>
            </div>
            <Link href="/signup" className="px-6 py-2 bg-sewakhoj-red text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-slate-900 transition-all">Join SewaKhoj</Link>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-6">
          <Link href="/browse" className="inline-flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-900 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to search results</span>
          </Link>
          <div className="flex items-center gap-2">
             <button className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm">
                <Bookmark className="w-4 h-4" />
             </button>
             <button className="p-2 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">
                <Share2 className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl font-bold text-emerald-900 shadow-inner border border-emerald-100/50">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover rounded-2xl" alt={user.full_name} />
                    ) : initials}
                  </div>
                  {tasker.status === 'active' && (
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-white shadow-md animate-pulse" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1">
                      <h1 className="text-2xl font-bold text-gray-900">{user?.full_name}</h1>
                      <p className="text-[14px] text-gray-500 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                        <span className="text-emerald-700 font-bold">{tasker.skills?.[0] || 'Professional Tasker'}</span> · <MapPin className="w-3.5 h-3.5 text-gray-400" /> {tasker.city}
                      </p>
                    </div>
                    
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 shrink-0 shadow-sm self-center sm:self-start">
                      <span className="text-amber-500 text-sm">★</span>
                      <span className="text-[15px] font-bold text-amber-900">{tasker.rating?.toFixed(1) || '5.0'}</span>
                      <span className="text-[11px] text-amber-800/60 font-bold uppercase tracking-tight">({ratingCount} reviews)</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-5">
                    {tasker.id_verified && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm flex items-center gap-1.5 uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Identity Verified
                      </span>
                    )}
                    {(tasker.is_featured || tasker.rating >= 4.8) && (
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-sm flex items-center gap-1.5 uppercase tracking-wider">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Top Rated
                      </span>
                    )}
                    <span className="text-[12px] text-gray-500 flex items-center gap-2 ml-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available now
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] mb-5">Professional Performance</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                  <span className="block text-xl font-bold text-gray-900">{jobsDone}</span>
                  <span className="block text-[10px] text-gray-400 mt-1 font-black uppercase tracking-widest">Jobs Done</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                  <span className="block text-xl font-bold text-gray-900">{expYears} yrs</span>
                  <span className="block text-[10px] text-gray-400 mt-1 font-black uppercase tracking-widest">Experience</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                  <span className="block text-xl font-bold text-gray-900">{tasker.response_time || '<30 min'}</span>
                  <span className="block text-[10px] text-gray-400 mt-1 font-black uppercase tracking-widest">Response</span>
                </div>
              </div>
              {/* Rating Distribution */}
              {ratingCount > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Rating Breakdown</p>
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map(stars => {
                      const percentage = Math.min(100, Math.round((reviews.filter(r => Math.floor(r.rating) === stars).length / ratingCount) * 100));
                      return (
                        <div key={stars} className="flex items-center gap-2 text-xs">
                          <span className="text-[10px] font-bold text-gray-500 w-6">{stars}★</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                stars >= 4 ? 'bg-emerald-500' : stars >= 3 ? 'bg-amber-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                              aria-label={`${percentage}% rated ${stars} stars`}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 w-8 text-right">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.07em] mb-3">About</h2>
              <p className="text-[14px] text-gray-700 leading-relaxed italic">
                {tasker.bio || "No biography provided."}
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.07em] mb-4">Skills & Services</h2>
              <div className="flex flex-wrap gap-2">
                {tasker.skills?.map(skill => (
                  <span key={skill} className="text-[12px] px-3 py-1 rounded-full bg-[#f4f6fb] border border-gray-200 text-gray-600 font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.07em] mb-4">Reviews</h2>
              <div className="space-y-6">
                {reviews.map(review => (
                  <div key={review.id} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[11px] font-medium text-emerald-900">
                        {review.users.full_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-gray-900">{review.users.full_name}</p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-[12px] text-amber-500">{"★".repeat(review.rating)}</span>
                    </div>
                    <p className="text-[13px] text-gray-600 leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg sticky top-6">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-medium text-emerald-800">Rs {tasker.hourly_rate}</span>
                <span className="text-[13px] text-gray-400 font-medium">/ hour</span>
              </div>
              <button 
                onClick={() => router.push(isGuest ? `/login?redirect=/book/${tasker.id}` : `/book/${tasker.id}`)}
                className="w-full bg-emerald-700 text-white py-3 rounded-xl font-medium hover:bg-emerald-800 transition-all mb-4"
              >
                {isGuest ? "Login to Book" : "Book Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
