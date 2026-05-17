import { services } from "@/data/services";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowLeft, MapPin, Star, ShieldCheck, Clock, ChevronRight } from "lucide-react";
import TaskerCard from "@/components/TaskerCard";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

// City display names
const CITY_NAMES: Record<string, { en: string; np: string }> = {
  kathmandu: { en: "Kathmandu", np: "काठमाडौं" },
  lalitpur: { en: "Lalitpur", np: "ललितपुर" },
  bhaktapur: { en: "Bhaktapur", np: "भक्तपुर" },
  pokhara: { en: "Pokhara", np: "पोखरा" },
  biratnagar: { en: "Biratnagar", np: "विराटनगर" },
  butwal: { en: "Butwal", np: "बुटवल" },
  chitwan: { en: "Chitwan", np: "चितवन" },
  birgunj: { en: "Birgunj", np: "वीरगञ्ज" },
};

interface Props {
  params: Promise<{ id: string; city: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, city } = await params;
  const service = services.find((s) => s.id === id);
  const cityInfo = CITY_NAMES[city.toLowerCase()];

  if (!service || !cityInfo) {
    return { title: "Page Not Found | SewaKhoj" };
  }

  const title = `${service.nameEn} in ${cityInfo.en} | SewaKhoj`;
  const description = `Book verified ${service.nameEn.toLowerCase()} professionals in ${cityInfo.en}, Nepal. ${service.descriptionEn} Fast, trusted, and affordable service at your doorstep.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${service.nameEn} in ${cityInfo.en}`,
    "serviceType": service.nameEn,
    "provider": {
      "@type": "LocalBusiness",
      "name": "SewaKhoj",
      "url": "https://sewakhoj.com",
      "areaServed": cityInfo.en
    },
    "areaServed": cityInfo.en,
    "description": description,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "NPR",
      "availability": "https://schema.org/InStock"
    }
  };

  return {
    title,
    description,
    keywords: `${service.nameEn} ${cityInfo.en}, ${service.nameEn.toLowerCase()} services ${cityInfo.en}, ${service.nameEn.toLowerCase()} near me ${cityInfo.en}, ${service.nameEn.toLowerCase()} Nepal`,
    openGraph: {
      title: `${service.nameEn} in ${cityInfo.en} — SewaKhoj`,
      description,
      url: `https://sewakhoj.com/services/${id}/${city}`,
      images: [{ url: "https://sewakhoj.com/logo.png", width: 1200, height: 630, alt: `${service.nameEn} in ${cityInfo.en}` }],
      locale: "en_NP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${service.nameEn} in ${cityInfo.en} | SewaKhoj`,
      description,
      images: ["https://sewakhoj.com/logo.png"],
    },
    alternates: {
      canonical: `https://sewakhoj.com/services/${id}/${city}`,
    },
    other: {
      "@json-ld": JSON.stringify(jsonLd)
    }
  };
}

export default async function CityServicePage({ params }: Props) {
  const { id, city } = await params;

  // UUID redirect: if the id looks like a UUID, look up the slug and 301 redirect
  if (UUID_REGEX.test(id)) {
    try {
      const { data: dbService } = await supabaseServer
        .from("services")
        .select("slug")
        .eq("id", id)
        .maybeSingle();
      if (dbService?.slug) {
        redirect(`/services/${dbService.slug}/${city}`);
      }
    } catch (err) {
      console.error("UUID redirect failed for city page:", err);
    }
    notFound();
  }

  const service = services.find((s) => s.id === id);
  const cityInfo = CITY_NAMES[city.toLowerCase()];

  if (!service || !cityInfo) {
    notFound();
  }

  // Fetch taskers for this service+city combo with real metrics
  const { data: taskers } = await supabaseServer
    .from("taskers")
    .select(`
      id, hourly_rate, city, rating, status, bio, skills, transportation_mode,
      id_verified, experience, completion_count, total_jobs,
      response_time_avg, average_rating, is_elite, trust_score,
      users!taskers_user_id_fkey (id, full_name, phone, avatar_url)
    `)
    .eq("status", "active")
    .ilike("city", `%${cityInfo.en}%`)
    .contains("skills", [id])
    .limit(12);

  // Also fetch taskers from nearby cities as fallback
  let nearbyTaskers: any[] = [];
  if (!taskers || taskers.length < 4) {
    const { data: nearby } = await supabaseServer
      .from("taskers")
      .select(`
        id, hourly_rate, city, rating, status, bio, skills, transportation_mode,
        id_verified, experience, completion_count, total_jobs,
        response_time_avg, average_rating, is_elite, trust_score,
        users!taskers_user_id_fkey (id, full_name, phone, avatar_url)
      `)
      .eq("status", "active")
      .contains("skills", [id])
      .limit(8);
    nearbyTaskers = nearby || [];
  }

  const displayTaskers = (taskers && taskers.length > 0) ? taskers : nearbyTaskers;

  // Related services (other services available in this city)
  const relatedServices = services.filter(s => s.id !== id).slice(0, 6);

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Hero */}
      <section className="relative bg-slate-900 py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-sewakhoj-red/20" />
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-sewakhoj-red/5 blur-[120px] rounded-full" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href={`/services/${id}`} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 text-xs font-bold uppercase tracking-widest transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All {service.nameEn} Services
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{service.emoji}</span>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                {service.nameEn} in {cityInfo.en}
              </h1>
              <p className="text-lg md:text-xl text-white/60 font-medium mt-2">
                {service.nameNp} — {cityInfo.np}
              </p>
            </div>
          </div>
          
          <p className="text-white/70 text-lg max-w-2xl mt-4">
            Find trusted, verified {service.nameEn.toLowerCase()} professionals in {cityInfo.en}. 
            {service.descriptionEn}
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <span className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-4 py-2 rounded-full text-sm font-bold">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Background Verified
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-4 py-2 rounded-full text-sm font-bold">
              <Clock className="w-4 h-4 text-yellow-400" />
              Same-Day Available
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-4 py-2 rounded-full text-sm font-bold">
              <MapPin className="w-4 h-4 text-blue-400" />
              {cityInfo.en} & Nearby
            </span>
          </div>
        </div>
      </section>

      {/* Taskers List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              {displayTaskers.length > 0 
                ? `${displayTaskers.length} ${service.nameEn}(s) in ${cityInfo.en}`
                : `Available ${service.nameEn}s`
              }
            </h2>
            <p className="text-gray-500 font-medium mt-1">
              {displayTaskers.length > 0 
                ? "All taskers are background-verified and rated by real customers"
                : `No ${service.nameEn.toLowerCase()}s in ${cityInfo.en} yet — showing nearby professionals`
              }
            </p>
          </div>
        </div>

        {displayTaskers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTaskers.map((tasker: any) => {
              const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
              const name = user?.full_name || "Tasker";
              const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
              const role = service.nameEn;
              const location = tasker.city || cityInfo.en;
              const skills = Array.isArray(tasker.skills) ? tasker.skills : [];
              const serviceInfo = services.find(s => skills.includes(s.id));
              const displayRole = serviceInfo?.nameEn || role;
              
              // Compute badges from real data
              const badges: ("Verified" | "Top Rated" | "New")[] = [];
              if (tasker.id_verified) badges.push("Verified");
              if (tasker.is_elite || (tasker.average_rating && tasker.average_rating >= 4.5)) badges.push("Top Rated");
              if (!tasker.completion_count || tasker.completion_count < 5) badges.push("New");
              
              // Compute experience from DB
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
                : "Same day";
              
              // Use average_rating if available
              const displayRating = tasker.average_rating || tasker.rating || 5.0;
              
              return (
                <TaskerCard
                  key={tasker.id}
                  id={tasker.id}
                  name={name}
                  initials={initials}
                  role={displayRole}
                  location={location}
                  experience={experienceYears}
                  rating={displayRating}
                  jobsDone={jobsDone}
                  monthlyEarn={tasker.hourly_rate ? `Rs ${(tasker.hourly_rate * 40 / 1000).toFixed(0)}k+` : ""}
                  responseTime={responseTime}
                  bio={tasker.bio || `Professional ${displayRole.toLowerCase()} in ${location}`}
                  ratePerHour={tasker.hourly_rate || 500}
                  avatarUrl={user?.avatar_url || null}
                  badges={badges}
                  trustScore={tasker.trust_score ?? null}
                  bookingHref={`/book/${tasker.id}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No {service.nameEn}s in {cityInfo.en} Yet</h3>
            <p className="text-gray-500 font-medium mb-6 max-w-md mx-auto">
              We're expanding fast! Be the first {service.nameEn.toLowerCase()} in {cityInfo.en} — 
              or browse available pros in nearby cities.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/browse" className="bg-sewakhoj-red text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors">
                Browse All Taskers
              </Link>
              <Link href="/tasker/landing" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors">
                Become a Tasker
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Related Services in this City */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black text-gray-900 mb-8">
            Other Services in {cityInfo.en}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {relatedServices.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.id}/${city}`}
                className="group bg-gray-50 rounded-2xl p-4 text-center hover:bg-sewakhoj-red/5 hover:border-sewakhoj-red/20 border-2 border-transparent transition-all"
              >
                <span className="text-3xl block mb-2">{s.emoji}</span>
                <span className="text-sm font-bold text-gray-700 group-hover:text-sewakhoj-red transition-colors">
                  {s.nameEn}
                </span>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 text-sewakhoj-red font-black text-sm uppercase tracking-widest hover:underline"
            >
              View All Services <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <article className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-black text-gray-900">
            Why Choose {service.nameEn} Services in {cityInfo.en}?
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Finding a reliable {service.nameEn.toLowerCase()} in {cityInfo.en} doesn't have to be stressful. 
            At SewaKhoj, every {service.nameEn.toLowerCase()} professional is background-verified, 
            rated by real customers, and committed to quality service. Whether you need emergency 
            repairs or routine maintenance, our {cityInfo.en}-based taskers are ready to help.
          </p>

          <h3 className="text-xl font-black text-gray-900 mt-8">
            How It Works
          </h3>
          <ol className="space-y-4 text-gray-600">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-sewakhoj-red text-white rounded-full flex items-center justify-center font-black text-sm">1</span>
              <span><strong>Browse</strong> — View verified {service.nameEn.toLowerCase()} profiles with ratings, reviews, and hourly rates in {cityInfo.en}.</span>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-sewakhoj-red text-white rounded-full flex items-center justify-center font-black text-sm">2</span>
              <span><strong>Book</strong> — Select your preferred date and time. Instant confirmation.</span>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-sewakhoj-red text-white rounded-full flex items-center justify-center font-black text-sm">3</span>
              <span><strong>Relax</strong> — Your {service.nameEn.toLowerCase()} arrives at your doorstep. Pay only when satisfied.</span>
            </li>
          </ol>

          <h3 className="text-xl font-black text-gray-900 mt-8">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <details className="group bg-gray-50 rounded-2xl p-6">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                How much does a {service.nameEn.toLowerCase()} cost in {cityInfo.en}?
                <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-4 text-gray-600">
                {service.nameEn} rates in {cityInfo.en} typically range from NPR 500 to NPR 2,000 depending on 
                the complexity of the job. All taskers on SewaKhoj provide transparent pricing before starting work.
              </p>
            </details>
            <details className="group bg-gray-50 rounded-2xl p-6">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                Are {service.nameEn.toLowerCase()}s in {cityInfo.en} background-checked?
                <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-4 text-gray-600">
                Yes! Every {service.nameEn.toLowerCase()} on SewaKhoj undergoes ID verification and background 
                checks before being listed. You can see their verification badges on their profile.
              </p>
            </details>
            <details className="group bg-gray-50 rounded-2xl p-6">
              <summary className="font-bold text-gray-900 cursor-pointer list-none flex items-center justify-between">
                Can I get same-day {service.nameEn.toLowerCase()} service in {cityInfo.en}?
                <ChevronRight className="w-5 h-5 text-gray-400 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-4 text-gray-600">
                Many of our {cityInfo.en} taskers offer same-day service. When booking, simply select 
                today's date and available time slots will be shown.
              </p>
            </details>
          </div>
        </article>
      </section>

      {/* CTA */}
      <section className="bg-sewakhoj-red py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Ready to Find Your {service.nameEn} in {cityInfo.en}?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Join thousands of happy customers across Nepal. Book your verified {service.nameEn.toLowerCase()} today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/book/${displayTaskers[0]?.id || ""}`}
              className="bg-white text-sewakhoj-red px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-xl"
            >
              Book a {service.nameEn}
            </Link>
            <Link
              href="/browse"
              className="bg-white/10 text-white border-2 border-white/30 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-colors"
            >
              Browse All Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}