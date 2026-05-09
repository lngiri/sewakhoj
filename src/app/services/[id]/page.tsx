"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Star, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Search,
  ChevronRight,
  Sparkles,
  Zap
} from "lucide-react";
import { services } from "@/data/services";
import { supabase } from "@/lib/supabase";
import TaskerCard from "@/components/TaskerCard";

interface TaskerUser {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
}

interface TaskerWithUser {
  id: string;
  hourly_rate: number;
  city: string;
  rating: number;
  status: string;
  bio: string;
  skills: string[];
  is_featured: boolean;
  users: TaskerUser[];
}

export default function ServiceProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: serviceId } = use(params);
  const router = useRouter();
  const [taskers, setTaskers] = useState<TaskerWithUser[]>([]);
  const [dbService, setDbService] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoLoading, setInfoLoading] = useState(true);

  const staticService = services.find((s) => s.id === serviceId);

  useEffect(() => {
    async function fetchServiceInfo() {
      if (staticService) {
        setInfoLoading(false);
        return;
      }
      
      const { data } = await supabase.from('services').select('*').eq('id', serviceId).maybeSingle();
      if (data) {
        setDbService(data);
      }
      setInfoLoading(false);
    }
    fetchServiceInfo();
  }, [serviceId, staticService]);

  const service = staticService || dbService;

  useEffect(() => {
    async function fetchTaskers() {
      setLoading(true);
      const { data, error } = await supabase
        .from("taskers")
        .select(`
          id, hourly_rate, city, rating, status, bio, skills, is_featured,
          users!inner (id, full_name, phone, avatar_url)
        `)
        .eq("status", "active")
        .contains("skills", [serviceId]);

      if (data) {
        setTaskers(data as unknown as TaskerWithUser[]);
      }
      setLoading(false);
    }

    if (service) {
      fetchTaskers();
    }
  }, [serviceId, service]);

  if (infoLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-sewakhoj-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-black text-gray-900 mb-4">Service Not Found</h1>
        <Link href="/services" className="text-sewakhoj-red font-bold hover:underline">
          Browse All Services
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Dynamic Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 -left-20 w-96 h-96 bg-sewakhoj-red rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <Link 
            href="/services" 
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8 text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Services
          </Link>

          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Verified Professionals
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-xl rounded-[32px] flex items-center justify-center text-5xl md:text-6xl shadow-2xl border border-white/20">
                  {service.emoji}
                </div>
                <div>
                  <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
                    {service.nameEn || service.name}
                  </h1>
                  <p className="text-2xl md:text-3xl font-black text-sewakhoj-red font-devanagari mt-1">
                    {service.nameNp || service.name_np}
                  </p>
                </div>
              </div>

              <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed mb-10 font-medium">
                {service.descriptionEn || service.description} <br />
                <span className="text-slate-500 font-devanagari text-base md:text-lg block mt-2 opacity-80">
                  {service.descriptionNp || service.description_np}
                </span>
              </p>

              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <button 
                  onClick={() => {
                    const el = document.getElementById('taskers-list');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-sewakhoj-red text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-500/20"
                >
                  Find a Pro Now
                </button>
                <Link 
                  href="/post-task"
                  className="bg-white/10 text-white border border-white/20 backdrop-blur-md px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/20 transition-all"
                >
                  Custom Request
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md hidden lg:block">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] p-8 relative">
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-white font-black text-xl mb-6">Service Standards</h3>
                <div className="space-y-6">
                  {[
                    { icon: ShieldCheck, t: "Vetted Pros", d: "Strict background & identity checks", c: "text-emerald-400" },
                    { icon: Clock, t: "Quick Booking", d: "Average response time < 30 mins", c: "text-blue-400" },
                    { icon: Zap, t: "Instant Help", d: "Same-day emergency services", c: "text-amber-400" },
                    { icon: CheckCircle2, t: "Guaranteed", d: "100% Satisfaction or refund", c: "text-sewakhoj-red" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${item.c}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{item.t}</h4>
                        <p className="text-slate-500 text-xs mt-0.5">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-20" id="taskers-list">
        <div className="bg-[#f4f6fb] rounded-[48px] p-8 md:p-12 shadow-2xl shadow-slate-200/50">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
                Available {service.nameEn || service.name} Pros
                <span className="block text-xl md:text-2xl text-slate-500 font-devanagari mt-2">
                  उपलब्ध {service.nameNp || service.name_ne || service.name_np} विशेषज्ञहरू
                </span>
              </h2>
              <p className="text-slate-500 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {taskers.length} active professionals near you
              </p>
            </div>
            
            <div className="flex gap-4">
              <Link 
                href={`/browse?service=${serviceId}`}
                className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 hover:border-sewakhoj-red transition-all flex items-center gap-2"
              >
                Advanced Filters <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : taskers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {taskers.map(tasker => {
                const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
                return (
                  <TaskerCard
                    key={tasker.id}
                    id={tasker.id}
                    name={user?.full_name || "Tasker"}
                    initials={user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || "?"}
                    role={service.nameEn || service.name}
                    location={tasker.city}
                    experience={2}
                    rating={tasker.rating || 5.0}
                    jobsDone={14}
                    monthlyEarn={`Rs ${(tasker.hourly_rate * 40 / 1000).toFixed(0)}k+`}
                    responseTime="<30 min"
                    bio={tasker.bio}
                    ratePerHour={tasker.hourly_rate}
                    avatarUrl={user?.avatar_url}
                    isOnline={tasker.status === 'active'}
                    badges={["Verified", "Top Rated"]}
                    onBook={() => router.push(`/book/${tasker.id}`)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">No Pros Found Yet</h3>
              <p className="text-slate-500 font-bold max-w-sm mx-auto mb-8">
                We couldn't find any professionals for this service in your area. Try posting a custom task.
              </p>
              <Link href="/post-task" className="bg-sewakhoj-red text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/10">
                Post a Custom Task
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Why Book {service.nameEn || service.name} on SewaKhoj?
            <span className="block text-2xl md:text-3xl text-slate-400 font-devanagari mt-3 font-bold">
              सेवाखोजमा {service.nameNp || service.name_ne || service.name_np} किन बुक गर्ने?
            </span>
          </h2>
          <p className="text-slate-500 font-bold text-lg mt-4">Quality and Trust in every single task. <span className="text-slate-400 font-devanagari ml-2">(प्रत्येक कार्यमा गुणस्तर र विश्वास)</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { 
              t: "Verified Expertise", 
              d: `Our ${service.nameEn || service.name} specialists are hand-picked after rigorous background checks and skill assessments.`,
              i: ShieldCheck,
              bg: "bg-emerald-50 text-emerald-600"
            },
            { 
              t: "Transparent Pricing", 
              d: "No hidden costs. See rates upfront and pay only after the job is completed to your satisfaction.",
              i: Sparkles,
              bg: "bg-amber-50 text-amber-600"
            },
            { 
              t: "Support 24/7", 
              d: "Need help? Our dedicated support team is available round the clock to ensure your task goes smoothly.",
              i: CheckCircle2,
              bg: "bg-sewakhoj-red/5 text-sewakhoj-red"
            }
          ].map((item, i) => (
            <div key={i} className="group p-8 rounded-[40px] border border-slate-100 hover:border-sewakhoj-red/20 transition-all hover:shadow-2xl hover:shadow-slate-200">
              <div className={`w-16 h-16 rounded-3xl ${item.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                <item.i className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-4">{item.t}</h3>
              <p className="text-slate-500 font-medium leading-relaxed">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-slate-900 rounded-[56px] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 -left-20 w-96 h-96 bg-sewakhoj-red rounded-full blur-[120px]"></div>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-tight relative z-10">
            Ready to get your <br /> 
            <span className="text-sewakhoj-red">{service.nameEn || service.name}</span> task done?
            <span className="block text-2xl md:text-3xl text-white/40 font-devanagari mt-6 font-bold leading-relaxed">
              के तपाईं आफ्नो <span className="text-sewakhoj-red/80">{service.nameNp || service.name_ne || service.name_np}</span> कार्य पुरा गर्न तयार हुनुहुन्छ?
            </span>
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
            <Link 
              href={`/browse?service=${serviceId}`}
              className="bg-white text-slate-900 px-12 py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl"
            >
              Browse All Pros
            </Link>
            <Link 
              href="/post-task"
              className="bg-sewakhoj-red text-white px-12 py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl"
            >
              Post a Task
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
