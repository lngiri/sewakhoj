"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Star, CheckCircle, Shield, Clock, Wallet, ShieldCheck, MapPin, ChevronDown } from "lucide-react";
import { services } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import TaskerCard from "@/components/TaskerCard";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import LocationModal from "@/components/LocationModal";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface TaskerUser {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface FeaturedTasker {
  id: string;
  hourly_rate: number;
  city: string | null;
  rating: number | null;
  status: string;
  skills: string[] | null;
  is_featured: boolean;
  users: TaskerUser | null;
}

export default function Home() {
  const [featuredTaskers, setFeaturedTaskers] = useState<FeaturedTasker[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [isTasker, setIsTasker] = useState<boolean | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const { location, isLocationSet, setShowModal } = useLocation();
  const { getWhatsAppNumber } = useSiteSettings();

  useEffect(() => {
    async function checkTasker() {
      if (user) {
        if (user.user_metadata?.role === "tasker") {
          setIsTasker(true);
          return;
        }
        const { data } = await supabase
          .from("taskers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsTasker(!!data);
      } else {
        setIsTasker(false);
      }
    }
    checkTasker();

    // Show location modal after sign-in if location is not set
    if (user && !isLocationSet) {
      const hasShownModal = sessionStorage.getItem("sewakhoj_location_modal_shown");
      if (!hasShownModal) {
        setShowModal(true);
      }
    }

    async function fetchFeatured() {
      setLoadingFeatured(true);
      const { data } = await supabase
        .from("taskers")
        .select(
          `
          id,
          hourly_rate,
          city,
          rating,
          status,
          skills,
          is_featured,
          users (
            id,
            full_name,
            phone,
            avatar_url
          )
        `
        )
        .eq("status", "active")
        .eq("is_featured", true)
        .limit(20); // Fetch more to allow for proximity sorting

      if (data && data.length > 0) {
        let taskers = data as FeaturedTasker[];
        
        // PRODUCTION FIX: Prevent taskers from seeing themselves in featured list
        if (user) {
          taskers = taskers.filter(t => {
            const u = Array.isArray(t.users) ? t.users[0] : t.users;
            return u?.id !== user.id;
          });
        }
        
        // Sort by proximity if location is set with coordinates
        if (location && location.latitude && location.longitude) {
          taskers = taskers.sort((a, b) => {
            // Simple distance calculation based on city name matching
            // In a real app, you'd use actual coordinates from tasker profiles
            const aMatch = a.city?.toLowerCase() === location.name.toLowerCase();
            const bMatch = b.city?.toLowerCase() === location.name.toLowerCase();
            
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            
            // If both match or neither matches, sort by rating
            return (b.rating || 0) - (a.rating || 0);
          });
        } else {
          // Default sort by rating
          taskers = taskers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        
        setFeaturedTaskers(taskers.slice(0, 4)); // Take top 4
      } else {
        setFeaturedTaskers([]);
      }
      setLoadingFeatured(false);
    }

    async function fetchDbServices() {
      const { data } = await supabase.from('services').select('*');
      if (data && data.length > 0) {
        setDbServices(data);
      }
    }

    fetchFeatured();
    fetchDbServices();
  }, [user, location, isLocationSet, setShowModal]);

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Is SewaKhoj safe to use?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Every tasker on SewaKhoj undergoes a background check and KYC verification. We respond to all inquiries within 24 hours.",
                },
              },
              {
                "@type": "Question",
                "name": "How do I pay for the service?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "You can pay directly via eSewa or Cash after the work is completed. The rates are clearly mentioned on the tasker's profile to avoid confusion.",
                },
              },
              {
                "@type": "Question",
                "name": "What if I am not satisfied with the work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "We offer a satisfaction guarantee. If the work is not up to the standard, you can report it via our <a href='/contact'>Support Desk</a>, and we will help resolve the issue or process a refund.",
                },
              },
              {
                "@type": "Question",
                "name": "Can I become a tasker too?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Absolutely! If you have a skill like plumbing, cleaning, or tutoring, click on 'Become a Tasker' to sign up and start earning today.",
                },
              },
              {
                "@type": "Question",
                "name": "How fast can I get a service?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Most taskers respond within minutes. Depending on your location and their availability, you can often get a service on the same day.",
                },
              },
            ],
          }),
        }}
      />
      {/* Hero Section */}
      <header
        className="hero bg-gradient-to-br from-blue-50 to-white py-12 md:py-20"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-gray-900 mb-6 leading-none tracking-tighter">
            <span className="block mb-2">Find Skilled Taskers Near You</span>
            <span className="block font-devanagari text-sewakhoj-red text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold opacity-90">
              नजिकैका सीपालु साथीहरू भेट्टाउनुहोस्
            </span>
          </h1>
          <p className="text-sm md:text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed font-bold uppercase tracking-widest">
            Book verified taskers for home services, repairs, cleaning & more.
          </p>

          {/* 2-Part Search: Location + Service */}
          <div className="max-w-3xl mx-auto bg-white p-2 sm:p-3 rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-blue-50/50 mb-12 relative z-30">
            <div className="flex flex-col md:flex-row gap-2">
              {/* Location Part */}
              <button 
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 px-6 py-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all text-left md:min-w-[200px]"
              >
                <div className="w-8 h-8 rounded-xl bg-sewakhoj-red/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-sewakhoj-red" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Location</p>
                  <p className="text-[13px] font-bold text-gray-900 truncate">
                    {isLocationSet ? location?.name : "Set Location"}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-300 ml-auto" />
              </button>

              {/* Service Part */}
              <div className="flex-1">
                <SearchAutocomplete minimal />
              </div>
            </div>
            
            {/* Quick Chips */}
<div className="flex flex-wrap items-center justify-center gap-2 mt-4 px-2">
              {[
                { id: 'plumbing', label: 'Plumber', emoji: '🔧' },
                { id: 'cleaning', label: 'Cleaning', emoji: '🧹' },
                { id: 'electrical', label: 'Electric', emoji: '⚡' },
                { id: 'tutoring', label: 'Tutor', emoji: '📚' },
                { id: 'painting', label: 'Painting', emoji: '🎨' }
              ].map(chip => (
                <Link 
                  key={chip.id}
                  href={`/browse?service=${chip.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-100 text-[11px] font-bold text-gray-600 hover:border-sewakhoj-red hover:text-sewakhoj-red transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span>{chip.emoji}</span>
                  <span>{chip.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Launching Banner */}
          <div className="mt-10 mb-4">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sewakhoj-red to-red-600 text-white rounded-full font-bold text-sm shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Nepal's newest service marketplace — join our founding community
            </div>
          </div>
        </div>
      </header>

      {/* Services Section */}
      <section
        id="services"
        className="py-12 md:py-20 bg-white"
        aria-labelledby="services-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="services-heading"
            className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight"
          >
            Our Services
          </h2>
          <p className="text-sm md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Choose from a wide range of professional services
          </p>
          <div
            className="services-grid grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            role="list"
          >
            {(dbServices.length > 0 ? dbServices : services).map((service) => {
const getIcon = (s: any) => {
                 if (s.emoji) return s.emoji;
                 if (s.icon) return s.icon;
                 const name = (s.nameEn || s.name || "").toLowerCase();
                 // Extended service icon mapping with more categories
                 const iconMap: Record<string, string> = {
                   'carpentry': '🔨', 'woodwork': '🔨', 'furniture': '🔨',
                   'painting': '🎨', 'paint': '🎨', 'wall paint': '🎨',
                   'plumbing': '🔧', 'plumber': '🔧', 'pipes': '🔧', 'leak': '🔧',
                   'cleaning': '🧹', 'clean': '🧹', 'maid': '🧹',
                   'electric': '⚡', 'electrical': '⚡', 'wiring': '⚡', 'electrician': '⚡',
                   'move': '📦', 'moving': '📦', 'shifting': '📦', 'relocation': '📦',
                   'garden': '🌱', 'gardening': '🌱', 'lawn': '🌱', 'landscaping': '🌱',
                   'repair': '🛠️', 'fix': '🛠️', 'maintenance': '🛠️', 'handyman': '🛠️',
                   'tutoring': '📚', 'tutor': '📚', 'teaching': '📚', 'education': '📚',
                   'cooking': '🍳', 'chef': '🍳', 'catering': '🍳', 'meal prep': '🍳',
                   'tech': '💻', 'computer': '💻', 'it': '💻', 'software': '💻',
                   'driver': '🚗', 'driving': '🚗', 'transport': '🚗',
                   'caretaking': '👨‍⚕️', 'elderly': '👨‍⚕️', 'nurse': '👨‍⚕️',
                   'pet': '🐕', 'dog': '🐕', 'cat': '🐕', 'pet care': '🐕',
                 };
                 // Check for partial matches first
                 for (const [key, emoji] of Object.entries(iconMap)) {
                   if (name.includes(key)) return emoji;
                 }
                 return '🔧'; // Default fallback
               };
              
              return (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="service-card bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-5 md:p-6 text-center hover:shadow-2xl hover:border-sewakhoj-red hover:from-red-50 hover:to-white transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                  role="listitem"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 bg-gradient-to-br from-sewakhoj-red/10 to-sewakhoj-red/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl md:text-4xl">
                      {getIcon(service)}
                    </span>
                  </div>
                  <div className="group-hover:text-sewakhoj-red transition-colors">
                    <h3 className="font-bold text-gray-900 text-sm md:text-lg leading-tight">
                      {service.nameEn || service.name || 'Service'}
                    </h3>
                    <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-70 group-hover:text-sewakhoj-red/70 transition-colors">
                      {service.nameNp || 'सेवा'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-600 line-clamp-2">
                    {service.descriptionEn || service.description || ''}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        className="how py-16 md:py-20 bg-gradient-to-br from-gray-50 to-white"
        id="how-it-works"
        aria-labelledby="how-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="how-heading"
            className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight"
          >
            How It Works
          </h2>
          <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Simple steps to{" "}
            <Link
              href="/browse"
              className="text-sewakhoj-red hover:underline font-bold"
            >
              get your tasks done
            </Link>{" "}
            quickly
          </p>
          <div className="steps grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/browse"
              className="step text-center bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer block"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 shadow-lg font-bold">
                1
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                Search
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Browse services and find taskers near you
              </p>
            </Link>
            <Link
              href="/browse"
              className="step text-center bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer block"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 shadow-lg font-bold">
                2
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                Book
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Choose a tasker and schedule your service
              </p>
            </Link>
            <div className="step text-center bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 shadow-lg font-bold">
                3
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                Get it Done
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Service completed with satisfaction guarantee
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tasker Value Proposition Section */}
      <section
        className="py-16 md:py-24 bg-slate-900 text-white overflow-hidden relative"
        aria-labelledby="tasker-value-heading"
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-sewakhoj-red rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-blue-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <h2
                id="tasker-value-heading"
                className="text-3xl md:text-5xl font-black tracking-tight leading-tight"
              >
                Turn Your Skills into <br />
                <span className="text-sewakhoj-red">Serious Earnings</span>
              </h2>
              <p className="text-lg text-slate-400 font-medium max-w-xl mx-auto lg:mx-0">
                Join Nepal's fastest-growing{" "}
                <Link
                  href="/browse"
                  className="text-white hover:underline decoration-sewakhoj-red font-bold"
                >
                  service marketplace
                </Link>
                . Set your own rates, work on your own schedule, and build a
                professional reputation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 text-left">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 text-sewakhoj-red" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-widest">
                      Earn More
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Keep 90% of your earnings with direct payouts.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-left">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-widest">
                      Flexible Schedule
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      You decide when and where you want to work.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-left">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-widest">
                      Get Verified
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Build trust with our professional badge system.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-left">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Star className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-widest">
                      Build Reputation
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Get reviews and become a top-rated professional.
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Link
                  href="/tasker/onboard"
                  className="inline-flex items-center gap-3 bg-sewakhoj-red text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-slate-900 active:scale-95 transition-all shadow-2xl shadow-red-500/20"
                >
                  Become a Tasker <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-sewakhoj-red/20 to-blue-600/20 rounded-[40px] blur-3xl"></div>
<div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
{featuredTaskers.length > 0 ? (
                      featuredTaskers.slice(0, 2).map((tasker) => {
                        const taskerUser = tasker.users;
                        return (
                          <div 
                            key={tasker.id} 
                            className="transform scale-95 origin-center hover:scale-100 transition-transform duration-300"
                          >
                            <TaskerCard
                              id={tasker.id}
                              name={taskerUser?.full_name || "Tasker"}
                              initials={
                                taskerUser?.full_name
                                  ? taskerUser.full_name
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)
                                  : "?"
                              }
                              role={tasker.skills?.[0] || "General Service"}
                              location={tasker.city || "Nepal"}
                              experience={2}
                              rating={tasker.rating || 5.0}
                              jobsDone={15}
                              monthlyEarn={`Rs ${((tasker.hourly_rate * 40) / 1000).toFixed(0)}k+`}
                              responseTime="1h"
                              bio="Professional and reliable service provider in Nepal."
                              ratePerHour={tasker.hourly_rate}
                              isOnline={tasker.status === "active"}
                              badges={["Verified", "Top Rated"]}
                              onBook={() => router.push(`/book/${tasker.id}`)}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-2 text-center py-8">
                        <p className="text-gray-500 font-medium">Featured taskers coming soon</p>
                      </div>
                    )}
                  </div>
               </div>
             </div>
           </div>
         </div>
       </section>

      {/* Featured Taskers Section — only shown when taskers exist */}
      {featuredTaskers.length > 0 && (
        <section
          className="py-16 md:py-20 bg-white"
          aria-labelledby="taskers-heading"
          id="taskers"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2
              id="taskers-heading"
              className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight"
            >
              Featured Taskers
            </h2>
            <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              Top-rated and trusted professionals ready to serve you
            </p>

            <div
              className="taskers-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              role="list"
            >
              {featuredTaskers.map((tasker) => {
                const taskerUser = tasker.users;
                const badges: ("Verified" | "Top Rated" | "New")[] = [
                  "Verified",
                ];
                if (
                  tasker.is_featured ||
                  (tasker.rating && tasker.rating >= 4.8)
                )
                  badges.push("Top Rated");

                return (
                  <TaskerCard
                    key={tasker.id}
                    id={tasker.id}
                    name={taskerUser?.full_name || "Tasker"}
                    initials={
                      taskerUser?.full_name
                        ? taskerUser.full_name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "?"
                    }
                    role={tasker.skills?.[0] || "General Service"}
                    location={tasker.city || "Nepal"}
                    experience={2}
                    rating={tasker.rating || 5.0}
                    jobsDone={15}
                    monthlyEarn={`Rs ${(
                      (tasker.hourly_rate * 40) /
                      1000
                    ).toFixed(0)}k+`}
                    responseTime="1h"
                    bio="Professional and reliable service provider in Nepal."
                    ratePerHour={tasker.hourly_rate}
                    isOnline={tasker.status === "active"}
                    badges={badges}
                    onBook={() => {
                      if (!taskerUser) {
                        router.push(`/login?redirect=/book/${tasker.id}`);
                      } else {
                        router.push(`/book/${tasker.id}`);
                      }
                    }}
                  />
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link
                href="/browse"
                className="btn-secondary inline-flex items-center gap-2 border-2 border-sewakhoj-red text-sewakhoj-red px-8 py-4 rounded-xl font-bold hover:bg-sewakhoj-red hover:text-white active:scale-95 transition-all"
              >
                View All Taskers <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Trust Section */}
      <section
        className="trust py-16 md:py-20 bg-gradient-to-br from-blue-50 via-white to-red-50"
        aria-labelledby="trust-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="trust-heading"
            className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight"
          >
            Why Trust SewaKhoj?
          </h2>
          <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            We ensure quality and reliability in every service
          </p>
          <div className="trust-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                color: "from-sewakhoj-red to-red-600",
                title: "Verified Taskers",
                desc: "All taskers are background checked",
              },
              {
                icon: CheckCircle,
                color: "from-sewakhoj-green to-green-600",
                title: "Satisfaction Guarantee",
                desc: "100% satisfaction or money back",
              },
              {
                icon: Clock,
                color: "from-blue-500 to-blue-700",
                title: "Quick Response",
                desc: "Get service within hours, not days",
              },
              {
                icon: Star,
                color: "from-yellow-400 to-yellow-600",
                title: "Rated & Reviewed",
                desc: "Transparent ratings from real customers",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="trust-item bg-white p-6 md:p-8 rounded-2xl text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              >
                <div
                  className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}
                >
                  <item.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-sm md:text-base text-gray-700 font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

{/* Customer Reviews Section - Only show if real reviews exist */}
       {/* Empty state - no fake testimonials */}
       {/* CTA Section */}
      <section
        className="cta-section py-16 md:py-20 bg-gradient-to-r from-sewakhoj-red via-red-600 to-sewakhoj-red relative overflow-hidden"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2
            id="cta-heading"
            className="text-2xl md:text-4xl font-extrabold text-white mb-4 tracking-tight"
          >
            Ready to Get Started?
          </h2>
          <p className="text-lg md:text-xl text-red-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of satisfied customers across Nepal
          </p>
          <div className="cta-btns flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/browse"
              className="bg-white text-sewakhoj-red px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 active:scale-95 transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-2xl"
            >
              Find a Service <ArrowRight className="w-5 h-5" />
            </Link>
            {isTasker ? (
              <Link
                href="/dashboard"
                className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black active:scale-95 transition-all duration-300 shadow-2xl flex items-center justify-center gap-2"
              >
                Go to My Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                href="/tasker/onboard"
                className="bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-sewakhoj-red active:scale-95 transition-all duration-300 shadow-2xl flex items-center justify-center gap-2"
              >
                Become a Tasker
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-gray-50" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 font-medium italic">
              Everything you need to know about SewaKhoj
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Is SewaKhoj safe to use?",
                q_np: "के SewaKhoj प्रयोग गर्न सुरक्षित छ?",
                a: "Yes! Every tasker on SewaKhoj undergoes a background check and KYC verification. We respond to all inquiries within 24 hours.",
                a_np: "हो! SewaKhoj मा हरेक tasker को पृष्ठभूमि जाँच र KYC प्रमाणीकरण गरिन्छ। हामी २४ घण्टा भित्र सबै सोधपुछको जवाफ दिन्छौं।",
              },
              {
                q: "How do I pay for the service?",
                q_np: "सेवाको लागि कसरी भुक्तानी गर्ने?",
                a: "You can pay directly via eSewa or Cash after the work is completed. The rates are clearly mentioned on the tasker's profile to avoid confusion.",
                a_np: "तपाईं काम सकिएपछि eSewa वा नगद मार्फत सिधै भुक्तानी गर्न सक्नुहुन्छ। अन्योल हुन नदिन tasker को प्रोफाइलमा दर स्पष्ट रूपमा उल्लेख गरिएको हुन्छ।",
              },
              {
                q: "What if I am not satisfied with the work?",
                q_np: "यदि काम सन्तोषजनक भएन भने के गर्ने?",
                a: (
                  <>
                    We offer a satisfaction guarantee. If the work is not up
                    to the standard, you can report it via our{" "}
                    <Link
                      href="/contact"
                      className="text-sewakhoj-red hover:underline font-semibold"
                    >
                      Support Desk
                    </Link>
                    , and we will help resolve the issue or process a refund.
                  </>
                ),
                a_np: "हामी सन्तोषको ग्यारेन्टी दिन्छौं। यदि काम स्तरीय छैन भने, तपाईं हाम्रो सहयोग डेस्क मार्फत रिपोर्ट गर्न सक्नुहुन्छ, र हामी समस्या समाधान गर्न वा फिर्ता प्रक्रिया गर्न मद्दत गर्नेछौं।",
              },
              {
                q: "Can I become a tasker too?",
                q_np: "के म पनि tasker बन्न सक्छु?",
                a: (
                  <>
                    Absolutely! If you have a skill like{" "}
                    <Link
                      href="/browse?service=plumbing"
                      className="text-sewakhoj-red hover:underline font-semibold"
                    >
                      plumbing
                    </Link>
                    ,{" "}
                    <Link
                      href="/browse?service=cleaning"
                      className="text-sewakhoj-red hover:underline font-semibold"
                    >
                      cleaning
                    </Link>
                    , or{" "}
                    <Link
                      href="/browse?service=tutoring"
                      className="text-sewakhoj-red hover:underline font-semibold"
                    >
                      tutoring
                    </Link>
                    , click on 'Become a Tasker' to sign up and
                    start earning today.
                  </>
                ),
                a_np: "पक्कै! यदि तपाईंसँग प्लम्बिङ, सरसफाई, वा ट्युटोरिङ जस्तो कुनै सीप छ भने, 'Become a Tasker' मा क्लिक गरेर साइन अप गर्नुहोस् र आजै कमाउन सुरु गर्नुहोस्।",
              },
              {
                q: "How fast can I get a service?",
                q_np: "कति छिटो सेवा पाउन सकिन्छ?",
                a: "Most taskers respond within minutes. Depending on your location and their availability, you can often get a service on the same day.",
                a_np: "धेरैजसो tasker हरूले केही मिनेटमै जवाफ दिन्छन्। तपाईंको स्थान र उनीहरूको उपलब्धताको आधारमा, तपाईंले प्रायः सोही दिन सेवा पाउन सक्नुहुन्छ।",
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <div className="pr-4">
                    <h3 className="font-bold text-gray-900 group-open:text-sewakhoj-red transition-colors">
                      {faq.q}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 italic mt-1">{faq.q_np}</p>
                  </div>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-1">
                  <div className="h-px bg-gray-100 mb-5" />
                  <p className="text-gray-700 font-medium leading-relaxed mb-3">
                    {faq.a}
                  </p>
                  <p className="text-gray-500 italic leading-relaxed text-sm">
                    {faq.a_np}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Location Modal */}
      <LocationModal />
    </main>
  );
}
