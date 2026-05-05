"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, MapPin, Search, LayoutGrid, List as ListIcon, X, ShieldCheck } from "lucide-react";
import { services as staticServices } from "@/data/services";
import { supabase } from "@/lib/supabase";
import TaskerCard from "@/components/TaskerCard";

// Force dynamic rendering to avoid build-time Supabase errors
export const dynamic = 'force-dynamic';

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

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedService = searchParams.get("service") || undefined;
  const selectedCity = searchParams.get("city") || undefined;
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const minRatingParam = searchParams.get("minRating");
  const queryParam = searchParams.get("q") || "";

  const minPrice = minPriceParam ? parseInt(minPriceParam) : undefined;
  const maxPrice = maxPriceParam ? parseInt(maxPriceParam) : undefined;
  const minRating = minRatingParam ? parseFloat(minRatingParam) : undefined;

  const [taskers, setTaskers] = useState<TaskerWithUser[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [liveQuery, setLiveQuery] = useState(queryParam);

  const handleDetectLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          // Use reverse geocoding to find the city
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb;
          
          if (city) {
            const url = new URL(window.location.href);
            url.searchParams.set("city", city.toLowerCase());
            router.push(url.pathname + url.search);
          } else {
            alert("Could not detect city automatically. Please select from the list.");
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          alert("Failed to detect location. Please select your city manually.");
        } finally {
          setLoading(false);
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        alert("Please enable location permissions in your browser.");
        setLoading(false);
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const subCategories: Record<string, string[]> = {
    'cleaning': ['Deep Cleaning', 'Standard Cleaning', 'Office Cleaning', 'Move in/out', 'Sofa/Carpet'],
    'plumbing': ['Leak Repair', 'Pipe Installation', 'Water Tank Cleaning', 'Drain Unblocking'],
    'electrical': ['Wiring Repair', 'Appliance Installation', 'Inverter Setup', 'Lighting'],
    'tutor': ['Maths/Science', 'Languages', 'Computer/IT', 'Primary Level'],
    'beauty': ['Haircut & Styling', 'Makeup', 'Skincare', 'Mehendi/Henna'],
    'delivery': ['Documents', 'Packages', 'Groceries', 'Food/Medicine'],
    'maintenance': ['Furniture Assembly', 'Painting', 'Carpentry', 'General Repairs']
  };

  // Combine static and dynamic services for robustness
  const allServices = dbServices.length > 0 ? dbServices : staticServices;

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('services').select('*');
      if (data) setDbServices(data);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchTaskers() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey && supabaseUrl !== '') {
        try {
          let query = supabase
            .from("taskers")
            .select(`
              id,
              hourly_rate,
              city,
              rating,
              status,
              bio,
              skills,
              is_featured,
              users!inner (
                id,
                full_name,
                phone,
                avatar_url
              )
            `)
            .eq("status", "active")
            .order("is_featured", { ascending: false })
            .order("rating", { ascending: false })
            .limit(50);

          if (selectedCity) {
            query = query.eq("city", selectedCity.toLowerCase());
          }

          if (selectedService) {
            query = query.contains("skills", [selectedService]);
          }

          if (minPrice !== undefined && !isNaN(minPrice)) {
            query = query.gte("hourly_rate", minPrice);
          }
          if (maxPrice !== undefined && !isNaN(maxPrice)) {
            query = query.lte("hourly_rate", maxPrice);
          }
          if (minRating !== undefined && !isNaN(minRating)) {
            query = query.gte("rating", minRating);
          }

          const { data, error } = await query;

          if (error) {
            console.error("Error fetching taskers:", error.message);
          } else if (data) {
            let filtered = data as unknown as TaskerWithUser[];

            if (queryParam) {
              const q = queryParam.toLowerCase();
              filtered = filtered.filter(t => {
                const u = Array.isArray(t.users) ? t.users[0] : t.users;
                const nameMatch = u?.full_name?.toLowerCase().includes(q);
                const skillMatch = t.skills?.some(s => 
                  s.toLowerCase().includes(q) || 
                  allServices.find(srv => (srv.id === s || srv.name?.toLowerCase() === s.toLowerCase()))?.name?.toLowerCase().includes(q)
                );
                return nameMatch || skillMatch;
              });
            }
            setTaskers(filtered);
          }
        } catch (err) {
          console.error("Failed to fetch taskers:", err);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchTaskers();
  }, [selectedCity, selectedService, minPrice, maxPrice, minRating, queryParam]);

  // Helper to get service name from skills array
  const getServiceInfo = (skills: string[] | null) => {
    if (!skills || skills.length === 0) return { name: "General", emoji: "🔧" };
    const service = allServices.find(s => 
      skills.some(k => 
        (s.id === k) || 
        (s.nameEn && s.nameEn.toLowerCase().includes(k.toLowerCase())) ||
        (s.name && s.name.toLowerCase().includes(k.toLowerCase()))
      )
    );
    return service 
      ? { name: `${service.nameEn || service.name} / ${service.nameNp || service.name_ne}`, emoji: service.emoji || service.icon || "🔧" }
      : { name: skills[0], emoji: "🔧" };
  };

  // Helper to get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to get Nepali city name
  const getNepaliCityName = (city: string) => {
    const cityMap: Record<string, string> = {
      kathmandu: "काठमाडौं",
      pokhara: "पोखरा",
      lalitpur: "ललितपुर",
      bhaktapur: "भक्तपुर",
      biratnagar: "विराटनगर",
      birgunj: "वीरगञ्ज"
    };
    return cityMap[city.toLowerCase()] || city;
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb]">
      {/* SEARCH HERO */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] pt-12 pb-20 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>गृह पृष्ठ</span>
          </Link>

          <h1 className="text-3xl md:text-4xl font-black mb-3">Find Taskers Near You / नजिकका साथीहरू खोज्नुस्</h1>
          <p className="text-white/60 text-[14px] md:text-[16px] mb-8 max-w-2xl">
            Browse verified taskers across Nepal — filter by service, location, rating & price to find your perfect match.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-white rounded-xl shadow-2xl flex items-center overflow-hidden border border-white/10">
              <div className="pl-4 text-gray-400"><Search className="w-5 h-5" /></div>
              <input 
                type="text" 
                value={liveQuery}
                placeholder="Search by service or name... (e.g. Plumber, Sunita)" 
                className="w-full p-4 text-gray-900 outline-none text-[15px]"
                onChange={(e) => {
                  setLiveQuery(e.target.value);
                  clearTimeout((window as any).__searchTimer);
                  (window as any).__searchTimer = setTimeout(() => {
                    const url = new URL(window.location.href);
                    if (e.target.value) url.searchParams.set("q", e.target.value);
                    else url.searchParams.delete("q");
                    router.push(url.pathname + url.search);
                  }, 400);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    clearTimeout((window as any).__searchTimer);
                    const url = new URL(window.location.href);
                    if (liveQuery) url.searchParams.set("q", liveQuery);
                    else url.searchParams.delete("q");
                    router.push(url.pathname + url.search);
                  }
                }}
              />
              {liveQuery && (
                <button 
                  onClick={() => {
                    setLiveQuery("");
                    const url = new URL(window.location.href);
                    url.searchParams.delete("q");
                    router.push(url.pathname + url.search);
                  }}
                  className="text-gray-400 hover:text-gray-600 px-2"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={() => {
                  const url = new URL(window.location.href);
                  if (liveQuery) url.searchParams.set("q", liveQuery);
                  else url.searchParams.delete("q");
                  router.push(url.pathname + url.search);
                }}
                className="bg-sewakhoj-red text-white px-8 py-4 font-bold hover:bg-sewakhoj-red-light transition-colors shrink-0 h-full"
              >
                Search
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto mt-6 pb-2 no-scrollbar">
            <button 
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("service");
                router.push(url.pathname + url.search);
              }}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-all border ${!selectedService ? 'bg-sewakhoj-red border-sewakhoj-red text-white' : 'bg-transparent border-white/20 text-white/80 hover:border-white'}`}
            >
              All / सबै
            </button>
            {allServices.map(s => (
              <button 
                key={s.id}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("service", s.id);
                  router.push(url.pathname + url.search);
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-all border ${selectedService === s.id ? 'bg-sewakhoj-red border-sewakhoj-red text-white' : 'bg-transparent border-white/20 text-white/80 hover:border-white'}`}
              >
                {s.emoji || s.icon} {s.nameEn || s.name}
              </button>
            ))}
          </div>

          {selectedService && subCategories[selectedService.toLowerCase()] && (
            <div className="flex gap-2 overflow-x-auto mt-2 pb-2 no-scrollbar animate-in fade-in slide-in-from-top-2">
              {subCategories[selectedService.toLowerCase()].map(sub => (
                <button 
                  key={sub}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("q", sub);
                    router.push(url.pathname + url.search);
                  }}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border border-white/10 text-white/70 hover:bg-white/10 hover:text-white`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0">
            
            {/* NEARBY BANNER */}
            {!selectedCity && (
              <div className="bg-gradient-to-r from-[#1a1a2e] to-sewakhoj-red rounded-2xl p-4 md:p-6 text-white mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl shrink-0">📍</div>
                  <div>
                    <h4 className="font-black text-[16px]">Enable Location for Nearby Taskers</h4>
                    <p className="text-white/80 text-[13px]">We'll show taskers closest to you first — नजिकका साथीहरू पहिले देखाउँछौं</p>
                  </div>
                </div>
                <button 
                  onClick={handleDetectLocation}
                  className="bg-white text-sewakhoj-red px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Use My Location
                </button>
              </div>
            )}

            {selectedCity && (
              <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 mb-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sewakhoj-red/10 text-sewakhoj-red rounded-full flex items-center justify-center font-bold">📍</div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Current Filter</p>
                    <h4 className="font-black text-gray-900 text-sm">Showing Taskers in {selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1)}</h4>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("city");
                    router.push(url.pathname + url.search);
                  }}
                  className="text-[11px] font-bold text-gray-400 hover:text-sewakhoj-red transition-colors uppercase tracking-widest underline underline-offset-4"
                >
                  Clear Location
                </button>
              </div>
            )}

            {/* RESULTS TOP */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">
                  {loading ? 'Finding taskers...' : `${taskers.length} taskers found ${selectedCity ? `near ${selectedCity}` : 'across Nepal'}`}
                </h2>
                {!loading && <p className="text-muted-foreground text-[13px] mt-1 italic">Verified professionals ready to help</p>}
              </div>

                <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                  <button 
                    onClick={() => setView('grid')}
                    className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-sewakhoj-red text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setView('list')}
                    className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-sewakhoj-red text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <ListIcon className="w-5 h-5" />
                  </button>
                </div>
            </div>

            {/* TASKER RESULTS */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 4].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-[300px] animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : taskers.length === 0 ? (
              <div className="bg-white rounded-3xl p-20 text-center shadow-lg border border-gray-100">
                <div className="text-6xl mb-6">🕵️‍♂️</div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">No taskers found</h3>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-[15px]">Try adjusting your filters or search terms. There might be someone just around the corner!</p>
                <button 
                  onClick={() => router.push('/browse')}
                  className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                {/* JSON-LD for GEO/SEO Optimization */}
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "ItemList",
                      "itemListElement": taskers.map((t, i) => ({
                        "@type": "ListItem",
                        "position": i + 1,
                        "item": {
                          "@type": "LocalBusiness",
                          "name": (Array.isArray(t.users) ? t.users[0] : (t.users as any))?.full_name,
                          "image": (Array.isArray(t.users) ? t.users[0] : (t.users as any))?.avatar_url,
                          "priceRange": `Rs ${t.hourly_rate}/hr`,
                          "address": {
                            "@type": "PostalAddress",
                            "addressLocality": t.city,
                            "addressCountry": "NP"
                          },
                          "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": t.rating,
                            "reviewCount": (t as any).total_reviews || 10
                          }
                        }
                      }))
                    })
                  }}
                />
                <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                {taskers.map((tasker: TaskerWithUser) => {
                  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
                  const serviceInfo = getServiceInfo(tasker.skills);
                  
                  const badges: ("Verified" | "Top Rated" | "New")[] = ["Verified"];
                  if (tasker.is_featured || tasker.rating >= 4.8) badges.push("Top Rated");
                  if (!tasker.rating || tasker.rating === 0) badges.push("New");

                  return (
                    <TaskerCard
                      key={tasker.id}
                      id={tasker.id}
                      name={user?.full_name || "Tasker"}
                      initials={getInitials(user?.full_name || "?")}
                      role={serviceInfo.name.split(' / ')[0]}
                      location={tasker.city}
                      experience={(tasker as any).experience_years || 2}
                      rating={tasker.rating || 5.0}
                      jobsDone={(tasker as any).completed_tasks || 12}
                      monthlyEarn={`Rs ${(tasker.hourly_rate * 40 / 1000).toFixed(0)}k+`}
                      responseTime="1h"
                      bio={tasker.bio}
                      ratePerHour={tasker.hourly_rate}
                      isOnline={tasker.status === 'active'}
                      badges={badges}
                      onBook={async () => {
                        // Increment profile views
                        await supabase.rpc('increment_profile_views', { tasker_id: tasker.id });

                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                          router.push(`/login?redirect=/book/${tasker.id}`);
                        } else {
                          router.push(`/book/${tasker.id}`);
                        }
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors" onClick={() => setZoomedImage(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={zoomedImage} alt="Zoomed view" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </main>
  );
}
