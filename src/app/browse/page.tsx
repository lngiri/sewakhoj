"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, MapPin, Search, LayoutGrid, List as ListIcon, Map as MapIcon, Filter, X } from "lucide-react";
import { services } from "@/data/services";
import { supabase } from "@/lib/supabase";
import BrowseFilters from "./BrowseFilters";

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
  const [view, setView] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

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
              users!inner (
                id,
                full_name,
                phone,
                avatar_url
              )
            `)
            .eq("status", "active")
            .order("rating", { ascending: false });

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
                const skillMatch = t.skills?.some(s => s.toLowerCase().includes(q) || services.find(srv => srv.id === s)?.nameEn.toLowerCase().includes(q));
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
    const service = services.find(s => 
      skills.some(k => k.toLowerCase().includes(s.id.toLowerCase()) || 
      s.nameEn.toLowerCase().includes(k.toLowerCase()))
    );
    return service 
      ? { name: `${service.nameEn} / ${service.nameNp}`, emoji: service.emoji }
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
            <span>Back to Site / होम फर्कनुस्</span>
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
                defaultValue={queryParam}
                placeholder="Search by service or name... (e.g. Plumber, Sunita)" 
                className="w-full p-4 text-gray-900 outline-none text-[15px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    const url = new URL(window.location.href);
                    if (val) url.searchParams.set("q", val);
                    else url.searchParams.delete("q");
                    router.push(url.pathname + url.search);
                  }
                }}
              />
              <button className="bg-sewakhoj-red text-white px-8 font-bold hover:bg-sewakhoj-red-light transition-colors">Search</button>
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
            {services.map(s => (
              <button 
                key={s.id}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("service", s.id);
                  router.push(url.pathname + url.search);
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold transition-all border ${selectedService === s.id ? 'bg-sewakhoj-red border-sewakhoj-red text-white' : 'bg-transparent border-white/20 text-white/80 hover:border-white'}`}
              >
                {s.emoji} {s.nameEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* SIDEBAR FILTERS - Desktop */}
          <aside className="hidden lg:block w-[280px] shrink-0">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
              <BrowseFilters />
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0">
            
            {/* NEARBY BANNER */}
            <div className="bg-gradient-to-r from-[#1a1a2e] to-sewakhoj-red rounded-2xl p-4 md:p-6 text-white mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl shrink-0">📍</div>
                <div>
                  <h4 className="font-black text-[16px]">Enable Location for Nearby Taskers</h4>
                  <p className="text-white/80 text-[13px]">We'll show taskers closest to you first — नजिकका साथीहरू पहिले देखाउँछौं</p>
                </div>
              </div>
              <button className="bg-white text-sewakhoj-red px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-gray-50 transition-colors whitespace-nowrap">
                Use My Location
              </button>
            </div>

            {/* RESULTS TOP */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">
                  {loading ? 'Finding taskers...' : `${taskers.length} taskers found ${selectedCity ? `near ${selectedCity}` : 'across Nepal'}`}
                </h2>
                {!loading && <p className="text-muted-foreground text-[13px] mt-1 italic">Verified professionals ready to help</p>}
              </div>

              <div className="flex items-center gap-3">
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
                  <button 
                    onClick={() => setView('map')}
                    className={`p-2 rounded-lg transition-colors ${view === 'map' ? 'bg-sewakhoj-red text-white' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <MapIcon className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Mobile Filter Toggle */}
                <button 
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden p-3 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-600"
                >
                  <Filter className="w-5 h-5" />
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
            ) : view === 'map' ? (
              <div className="bg-[#e8f0fe] rounded-3xl h-[600px] border border-blue-100 relative overflow-hidden flex items-center justify-center flex-col text-blue-600 gap-4">
                <MapIcon className="w-20 h-20 opacity-20" />
                <div className="text-center">
                  <h3 className="text-xl font-black mb-1">Interactive Map Mode</h3>
                  <p className="text-[13px] opacity-80">Locating {taskers.length} active taskers in {selectedCity || 'your area'}...</p>
                </div>
                <div className="bg-white/50 backdrop-blur-md border border-blue-200 p-6 rounded-2xl max-w-sm text-center">
                  <p className="text-[14px] font-medium">Real-time GPS tracking is being optimized for your region. Use Grid view for instant booking.</p>
                </div>
                {/* Mock Pins */}
                <div className="absolute top-[40%] left-[50%] bg-sewakhoj-red text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-lg animate-bounce">Sunita · Rs 600</div>
                <div className="absolute top-[55%] left-[42%] bg-sewakhoj-red text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-lg">Ramesh · Rs 800</div>
                <div className="absolute top-[30%] left-[60%] bg-green-600 text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-lg animate-pulse">Bikash · Online</div>
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
              <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex flex-col gap-4"}>
                {taskers.map((tasker: TaskerWithUser) => {
                  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
                  const serviceInfo = getServiceInfo(tasker.skills);
                  const isFeatured = tasker.rating >= 4.9;
                  
                  return (
                    <Link
                      key={tasker.id}
                      href={`/book/${tasker.id}`}
                      className={`admin-card group hover:border-sewakhoj-red/40 transition-all ${view === 'list' ? 'flex flex-row items-center gap-6' : ''}`}
                    >
                      {/* Featured Badge */}
                      {isFeatured && (
                        <div className="absolute top-4 right-4 bg-sewakhoj-red text-white text-[10px] font-black px-3 py-1 rounded-full z-10 shadow-lg">
                          TOP RATED
                        </div>
                      )}

                      <div className={`p-6 flex gap-5 ${view === 'list' ? 'flex-1' : ''}`}>
                        <div className="relative shrink-0">
                          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-inner bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden`}>
                            {user?.avatar_url ? (
                              <img src={user.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              getInitials(user?.full_name || "?")
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-[3px] border-white rounded-full"></div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-[17px] font-black text-gray-900 group-hover:text-sewakhoj-red transition-colors truncate">
                            {user?.full_name || "Unknown Tasker"}
                          </h3>
                          <div className="flex items-center gap-2 text-[12px] text-muted-foreground font-bold mt-0.5">
                            <span className="text-sewakhoj-red">{serviceInfo.emoji} {serviceInfo.name.split(' / ')[0]}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {tasker.rating?.toFixed(1) || 'New'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[12px] font-medium mt-3 text-muted-foreground">
                            <span className="flex items-center gap-1">📍 {tasker.city}</span>
                            <span className="text-blue-600 font-bold">1.2 km away</span>
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 md:p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 ${view === 'list' ? 'border-t-0 border-l w-[200px] flex-col justify-center items-end' : ''}`}>
                        <div>
                          <div className="text-[18px] font-black text-green-600">Rs {tasker.hourly_rate || 500}<span className="text-[11px] text-muted-foreground font-normal ml-0.5">/hr</span></div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Starting Rate</div>
                        </div>
                        <button className="bg-sewakhoj-red text-white px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-sewakhoj-red-light transition-all shadow-md group-hover:shadow-lg">
                          Book Now
                        </button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FILTERS MODAL */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilters(false)}></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="p-2 bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <BrowseFilters />
            <button 
              onClick={() => setShowFilters(false)}
              className="w-full bg-sewakhoj-red text-white py-4 rounded-2xl font-black mt-8 shadow-xl"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
}
