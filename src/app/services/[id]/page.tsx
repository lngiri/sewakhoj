import { services } from "@/data/services";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Zap,
  Info,
  ChevronRight,
  Search,
  MapPin,
  UserPlus
} from "lucide-react";
import TaskerCard from "@/components/TaskerCard";
import { Metadata } from "next";

// Initialize a server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

// UUID regex for detecting DB UUIDs in URL
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ city?: string; page?: string }>;
}

// Helper: resolve a service by slug (static first, then DB)
async function resolveService(slug: string) {
  // 1. Try static data by slug
  const staticService = services.find((s) => s.id === slug);
  if (staticService) return staticService;

  // 2. Try DB by slug column
  const { data: dbService } = await supabaseServer
    .from("services")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (dbService) {
    return {
      id: dbService.slug, // use slug as the canonical id
      dbId: dbService.id, // keep UUID for tasker skills matching
      nameEn: dbService.name,
      nameNp: dbService.name_ne,
      emoji: dbService.icon || "🔧",
      descriptionEn: dbService.description,
      descriptionNp: dbService.description_ne || dbService.description,
    };
  }

  return null;
}

// Helper: resolve a service by UUID (for redirect)
async function resolveServiceByUuid(uuid: string) {
  const { data } = await supabaseServer
    .from("services")
    .select("slug, name, name_ne, icon, description, description_ne")
    .eq("id", uuid)
    .maybeSingle();
  return data;
}

// Generate static params for all services (SSG)
export async function generateStaticParams() {
  // Static services
  const staticParams = services.map((service) => ({
    id: service.id,
  }));

  // Also fetch DB services with slugs
  const { data: dbServices } = await supabaseServer
    .from("services")
    .select("slug")
    .not("slug", "is", null);

  const dbParams = (dbServices || [])
    .filter((s: any) => s.slug && !services.find((ss) => ss.id === s.slug))
    .map((s: any) => ({ id: s.slug }));

  return [...staticParams, ...dbParams];
}

// Dynamic Metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // If UUID, redirect — metadata won't matter but generate it anyway
  if (UUID_REGEX.test(id)) {
    const dbService = await resolveServiceByUuid(id);
    if (dbService?.slug) {
      return {
        title: `${dbService.name} Services in Nepal | SewaKhoj`,
        alternates: {
          canonical: `https://sewakhoj.com/services/${dbService.slug}`,
        },
      };
    }
    return { title: "Service Not Found | SewaKhoj" };
  }

  const service = await resolveService(id);
  if (!service) return { title: "Service Not Found | SewaKhoj" };

  // Fetch distinct cities for dynamic areaServed
  const { data: cityData } = await supabaseServer
    .from("taskers")
    .select("city")
    .eq("status", "active")
    .contains("skills", [service.dbId || service.id]);

  const cities = [...new Set(
    (cityData || [])
      .map((t: any) => t.city)
      .filter(Boolean)
  )].slice(0, 8);

  const areaServed = cities.length > 0 ? cities : ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.nameEn,
    "serviceType": service.nameEn,
    "provider": {
      "@type": "LocalBusiness",
      "name": "SewaKhoj",
      "url": "https://sewakhoj.com"
    },
    "areaServed": areaServed,
    "description": service.descriptionEn,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "NPR",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "Varies",
        "description": `Starting from NPR 500`
      }
    }
  };

  return {
    title: `${service.nameEn} Services in Nepal | SewaKhoj`,
    description: `Book verified ${service.nameEn} professionals in your area. ${service.descriptionEn}`,
    keywords: `${service.nameEn}, ${service.nameEn} services, ${service.nameEn.toLowerCase()} Nepal, ${service.nameEn.toLowerCase()} Kathmandu, ${service.nameEn.toLowerCase()} service near me, ${service.descriptionEn.toLowerCase().split('.')[0]}`,
    openGraph: {
      title: `${service.nameEn} - SewaKhoj`,
      description: service.descriptionEn,
      url: `https://sewakhoj.com/services/${service.id}`,
      images: [
        {
          url: "https://sewakhoj.com/logo.png",
          width: 1200,
          height: 630,
          alt: `${service.nameEn} Services - SewaKhoj`,
        },
      ],
      locale: "en_NP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${service.nameEn} - Expert Services | SewaKhoj`,
      description: `${service.descriptionEn}`,
      images: ["https://sewakhoj.com/logo.png"],
    },
    alternates: {
      canonical: `https://sewakhoj.com/services/${service.id}`,
      languages: {
        "ne-NP": `https://sewakhoj.com/ne/services/${service.id}`,
      } as Record<string, string>,
    },
    other: {
      "@json-ld": JSON.stringify(jsonLd)
    }
  };
}

export default async function ServiceProfilePage({ params, searchParams }: Props) {
  const { id: serviceId } = await params;
  const { city: cityFilter, page: pageStr } = await searchParams;
  const page = parseInt(pageStr || "1", 10) || 1;
  const PAGE_SIZE = 20;
  const offset = (page - 1) * PAGE_SIZE;

  // UUID redirect: if the id looks like a UUID, look up the slug and 301 redirect
  if (UUID_REGEX.test(serviceId)) {
    const dbService = await resolveServiceByUuid(serviceId);
    if (dbService?.slug) {
      // Preserve query params in redirect
      const qs = cityFilter ? `?city=${encodeURIComponent(cityFilter)}` : "";
      redirect(`/services/${dbService.slug}${qs}`);
    }
    // UUID not found — show 404
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <h1 className="text-2xl font-black text-gray-900 mb-4">Service Not Found</h1>
        <Link href="/services" className="text-sewakhoj-red font-bold hover:underline">
          Browse All Services
        </Link>
      </div>
    );
  }

  // Resolve service by slug
  const service = await resolveService(serviceId);

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

  // The skills filter uses the DB UUID if available, otherwise the static slug
  const skillsFilterId = (service as any).dbId || serviceId;

  // Fetch Taskers with real metrics, left join, city filter, pagination, featured sort
  let query = supabaseServer
    .from("taskers")
    .select(`
      id, hourly_rate, city, rating, status, bio, skills, is_featured,
      id_verified, experience, completion_count, total_jobs,
      response_time_avg, average_rating, is_elite,
      users!taskers_user_id_fkey (id, full_name, phone, avatar_url)
    `)
    .eq("status", "active")
    .contains("skills", [skillsFilterId])
    .order("is_featured", { ascending: false })
    .order("average_rating", { ascending: false })
    .limit(PAGE_SIZE)
    .range(offset, offset + PAGE_SIZE - 1);

  if (cityFilter) {
    query = query.ilike("city", `%${cityFilter}%`);
  }

  const { data: taskersData, error } = await query;

  if (error) {
    console.error("Error fetching taskers for service:", error);
  }

  const taskers = (taskersData || []) as any[];

  // Fetch related services for empty state
  const relatedServices = services.filter(s => s.id !== serviceId).slice(0, 6);

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
                    {service.nameEn}
                  </h1>
                  <p className="text-2xl md:text-3xl font-black text-sewakhoj-red font-devanagari mt-1">
                    {service.nameNp}
                  </p>
                </div>
              </div>

              <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed mb-10 font-medium">
                {service.descriptionEn} <br />
                <span className="text-slate-500 font-devanagari text-base md:text-lg block mt-2 opacity-80">
                  {service.descriptionNp}
                </span>
              </p>

              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <Link 
                  href="#taskers-list"
                  className="bg-sewakhoj-red text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-500/20"
                >
                  Find a Pro Now
                </Link>
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
                    { icon: Clock, t: "Quick Booking", d: "Most taskers respond within 30 minutes", c: "text-blue-400" },
                    { icon: Zap, t: "Instant Help", d: "Same-day emergency services available", c: "text-amber-400" },
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
                Available {service.nameEn} Pros
                <span className="block text-xl md:text-2xl text-slate-500 font-devanagari mt-2">
                  उपलब्ध {service.nameNp} विशेषज्ञहरू
                </span>
              </h2>
              <p className="text-slate-500 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {taskers.length} active professionals{page > 1 ? ` (page ${page})` : ""}
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

          {taskers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {taskers.map(tasker => {
                  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
                  
                  // Compute badges from real data
                  const badges: ("Verified" | "Top Rated" | "New")[] = [];
                  if (tasker.id_verified) badges.push("Verified");
                  if (tasker.is_elite || (tasker.average_rating && tasker.average_rating >= 4.5)) badges.push("Top Rated");
                  if (!tasker.completion_count || tasker.completion_count < 5) badges.push("New");
                  
                  // Compute experience from DB (experience is TEXT like "2 years")
                  const experienceYears = tasker.experience 
                    ? parseInt(tasker.experience) || 0 
                    : 0;
                  
                  // Compute jobs done from real metrics
                  const jobsDone = tasker.completion_count || tasker.total_jobs || 0;
                  
                  // Compute response time from real avg
                  const responseTime = tasker.response_time_avg 
                    ? tasker.response_time_avg <= 60 
                      ? `<${tasker.response_time_avg} min`
                      : `${Math.round(tasker.response_time_avg / 60)} hr`
                    : "N/A";
                  
                  // Use average_rating if available, fall back to rating
                  const displayRating = tasker.average_rating || tasker.rating || 5.0;
                  
                  return (
                    <TaskerCard
                      key={tasker.id}
                      id={tasker.id}
                      name={user?.full_name || "Tasker"}
                      initials={user?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || "?"}
                      role={service.nameEn}
                      location={tasker.city || "Nepal"}
                      experience={experienceYears}
                      rating={displayRating}
                      jobsDone={jobsDone}
                      monthlyEarn={`Rs ${(tasker.hourly_rate * 40 / 1000).toFixed(0)}k+`}
                      responseTime={responseTime}
                      bio={tasker.bio}
                      ratePerHour={tasker.hourly_rate}
                      avatarUrl={user?.avatar_url}
                      isOnline={tasker.status === 'active'}
                      badges={badges}
                      bookingHref={`/book/${tasker.id}`} 
                    />
                  );
                })}
              </div>

              {/* Pagination */}
              {taskers.length === PAGE_SIZE && (
                <div className="flex justify-center gap-4 mt-10">
                  {page > 1 && (
                    <Link
                      href={`/services/${serviceId}?page=${page - 1}${cityFilter ? `&city=${encodeURIComponent(cityFilter)}` : ""}`}
                      className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 hover:border-sewakhoj-red transition-all"
                    >
                      ← Previous
                    </Link>
                  )}
                  <Link
                    href={`/services/${serviceId}?page=${page + 1}${cityFilter ? `&city=${encodeURIComponent(cityFilter)}` : ""}`}
                    className="bg-sewakhoj-red text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all"
                  >
                    Next Page →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">No Pros Found Yet</h3>
              <p className="text-slate-500 font-bold max-w-sm mx-auto mb-8">
                {cityFilter 
                  ? `No ${service.nameEn} professionals found in ${cityFilter}. Try a different city or browse all.`
                  : `We couldn't find any professionals for this service in your area. Try posting a custom task or browse related services.`
                }
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/post-task" className="bg-sewakhoj-red text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/10">
                  Post a Custom Task
                </Link>
                <Link href="/browse" className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest border-2 border-slate-200 hover:border-sewakhoj-red transition-all">
                  Browse All Taskers
                </Link>
                <Link href="/tasker/landing" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Become a Tasker
                </Link>
              </div>

              {/* Related services in empty state */}
              {relatedServices.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Other Services You Might Like</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {relatedServices.map((s) => (
                      <Link
                        key={s.id}
                        href={`/services/${s.id}`}
                        className="inline-flex items-center gap-2 bg-gray-50 hover:bg-sewakhoj-red/5 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-sewakhoj-red border border-gray-100 hover:border-sewakhoj-red/20 transition-all"
                      >
                        <span>{s.emoji}</span>
                        {s.nameEn}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Why Book {service.nameEn} on SewaKhoj?
            <span className="block text-2xl md:text-3xl text-slate-400 font-devanagari mt-3 font-bold">
              सेवाखोजमा {service.nameNp} किन बुक गर्ने?
            </span>
          </h2>
          <p className="text-slate-500 font-bold text-lg mt-4">Quality and Trust in every single task. <span className="text-slate-400 font-devanagari ml-2">(प्रत्येक कार्यमा गुणस्तर र विश्वास)</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { 
              t: "Verified Expertise", 
              d: `Our ${service.nameEn} specialists are hand-picked after rigorous background checks and skill assessments.`,
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
              t: "Fast Response", 
              d: "Most taskers respond within 30 minutes during business hours. Same-day service often available.",
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
            <span className="text-sewakhoj-red">{service.nameEn}</span> task done?
            <span className="block text-2xl md:text-3xl text-white/40 font-devanagari mt-6 font-bold leading-relaxed">
              के तपाईं आफ्नो <span className="text-sewakhoj-red/80">{service.nameNp}</span> कार्य पुरा गर्न तयार हुनुहुन्छ?
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
