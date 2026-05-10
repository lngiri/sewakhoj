"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, List as ListIcon, Search, X } from "lucide-react";
import { services as staticServices } from "@/data/services";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useNotification } from "@/context/NotificationContext";
import TaskerCard from "@/components/TaskerCard";
import SearchAutocomplete from "@/components/SearchAutocomplete";

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
    <Suspense fallback={
      <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-sewakhoj-red border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs animate-pulse">Finding Specialists...</p>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser } = useAuth();
  const { location, isLocationSet } = useLocation();
  const { showError } = useNotification();
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
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    async function fetchFavorites() {
      if (authUser) {
        const { data } = await supabase.from('favorites').select('tasker_id').eq('user_id', authUser.id);
        if (data) setFavorites(data.map((f: any) => f.tasker_id));
      }
    }
    fetchFavorites();
  }, [authUser]);

  const toggleFavorite = async (taskerId: string) => {
    if (!authUser) {
      router.push(`/login?redirect=/browse`);
      return;
    }

    const isFav = favorites.includes(taskerId);
    if (isFav) {
      setFavorites(prev => prev.filter(id => id !== taskerId));
      await supabase.from('favorites').delete().eq('user_id', authUser.id).eq('tasker_id', taskerId);
    } else {
      setFavorites(prev => [...prev, taskerId]);
      await supabase.from('favorites').insert({ user_id: authUser.id, tasker_id: taskerId });
    }
  };

  const handleDetectLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const response = await fetch(`/api/reverse-geocode?lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county;
          
          if (city) {
            const url = new URL(window.location.href);
            url.searchParams.set("city", city.toLowerCase());
            router.push(url.pathname + url.search);
          } else {
            showError("Could not detect city automatically.");
          }
        } catch (err) {
          console.error("Geocoding error:", err);
        } finally {
          setLoading(false);
        }
      }, () => setLoading(false));
    }
  };

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
      setLoading(true);
      try {
        let query = supabase
          .from("taskers")
          .select(`
            id, hourly_rate, city, rating, status, bio, skills, is_featured,
            users!inner (id, full_name, phone, avatar_url)
          `)
          .eq("status", "active");

        if (selectedCity) query = query.eq("city", selectedCity.toLowerCase());
        if (selectedService) query = query.contains("skills", [selectedService]);
        if (minPrice !== undefined) query = query.gte("hourly_rate", minPrice);
        if (maxPrice !== undefined) query = query.lte("hourly_rate", maxPrice);
        if (minRating !== undefined) query = query.gte("rating", minRating);

        const { data, error } = await query;
        if (data) {
          let filtered = data as unknown as TaskerWithUser[];
          
          // PRODUCTION FIX: Prevent taskers from seeing themselves in the browse list
          if (authUser) {
            filtered = filtered.filter(t => {
              const u = Array.isArray(t.users) ? t.users[0] : t.users;
              return u?.id !== authUser.id;
            });
          }

          if (queryParam) {
            const q = queryParam.toLowerCase();
            filtered = filtered.filter(t => {
              const u = Array.isArray(t.users) ? t.users[0] : t.users;
              return u?.full_name?.toLowerCase().includes(q) || t.skills?.some(s => s.toLowerCase().includes(q));
            });
          }

          // Sort by proximity if location is set
          if (isLocationSet && location) {
            filtered = filtered.sort((a, b) => {
              // Simple distance calculation based on city name matching
              const aMatch = a.city?.toLowerCase() === location.name.toLowerCase();
              const bMatch = b.city?.toLowerCase() === location.name.toLowerCase();
              
              if (aMatch && !bMatch) return -1;
              if (!aMatch && bMatch) return 1;
              
              // If both match or neither matches, sort by rating then featured
              if (a.is_featured && !b.is_featured) return -1;
              if (!a.is_featured && b.is_featured) return 1;
              return (b.rating || 0) - (a.rating || 0);
            });
          } else {
            // Default sort by featured then rating
            filtered = filtered.sort((a, b) => {
              if (a.is_featured && !b.is_featured) return -1;
              if (!a.is_featured && b.is_featured) return 1;
              return (b.rating || 0) - (a.rating || 0);
            });
          }

          setTaskers(filtered);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTaskers();
  }, [selectedCity, selectedService, minPrice, maxPrice, minRating, queryParam, isLocationSet, location]);

  const getServiceInfo = (skills: string[] | null) => {
    if (!skills || skills.length === 0) return { name: "General", emoji: "🔧" };
    const service = allServices.find(s => skills.includes(s.id));
    return service ? { name: service.nameEn || service.name, emoji: service.emoji || "🔧" } : { name: skills[0], emoji: "🔧" };
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <main className="min-h-screen bg-[#f4f6fb]">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] pt-12 pb-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>गृह पृष्ठ</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-black mb-3">Find Taskers Near You</h1>
          <div className="mt-8 relative z-20">
            <SearchAutocomplete />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* SIDEBAR FILTERS */}
          <div className="w-full lg:w-64 shrink-0 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Filter Results</h3>
               
               {/* PRICE FILTER */}
               <div className="space-y-4 mb-8">
                  <p className="text-sm font-bold text-gray-900">Price Range (Rs)</p>
                  <div className="grid grid-cols-2 gap-2">
                      <input 
                       type="number" 
                       placeholder="Min" 
                       value={minPrice || ""} 
                       onChange={e => {
                         const url = new URL(window.location.href);
                         if (e.target.value) url.searchParams.set("minPrice", e.target.value);
                         else url.searchParams.delete("minPrice");
                         router.replace(url.pathname + url.search, { scroll: false });
                       }}
                       className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-2 text-xs font-bold focus:border-sewakhoj-red outline-none transition-all"
                      />
                      <input 
                       type="number" 
                       placeholder="Max" 
                       value={maxPrice || ""} 
                       onChange={e => {
                         const url = new URL(window.location.href);
                         if (e.target.value) url.searchParams.set("maxPrice", e.target.value);
                         else url.searchParams.delete("maxPrice");
                         router.replace(url.pathname + url.search, { scroll: false });
                       }}
                       className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-2 text-xs font-bold focus:border-sewakhoj-red outline-none transition-all"
                      />
                  </div>
               </div>

               {/* RATING FILTER */}
               <div className="space-y-4 mb-8">
                  <p className="text-sm font-bold text-gray-900">Minimum Rating</p>
                  <div className="flex flex-wrap gap-2">
                    {[5, 4, 3].map(r => (
                      <button 
                        key={r}
                        onClick={() => {
                          const url = new URL(window.location.href);
                          if (minRating === r) url.searchParams.delete("minRating");
                          else url.searchParams.set("minRating", r.toString());
                          router.push(url.pathname + url.search);
                        }}
                        className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black transition-all ${minRating === r ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                      >
                        {r}.0+ ⭐
                      </button>
                    ))}
                  </div>
               </div>

               <button 
                onClick={() => router.push('/browse')}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-sewakhoj-red transition-all"
               >
                 Reset Filters
               </button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {!selectedCity && (
              <div className="bg-white rounded-2xl p-6 text-gray-900 mb-6 flex items-center justify-between shadow-lg">
                <div>
                  <h4 className="font-bold">Enable Location</h4>
                  <p className="text-sm text-gray-500">Find taskers in your city.</p>
                </div>
                <button onClick={handleDetectLocation} className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg font-bold text-sm">Use My Location</button>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black">{loading ? 'Loading...' : `${taskers.length} taskers found`}</h2>
              <div className="flex bg-white rounded-xl shadow-sm border p-1">
                <button onClick={() => setView('grid')} className={`p-2 rounded-lg ${view === 'grid' ? 'bg-sewakhoj-red text-white' : 'text-gray-400'}`}><LayoutGrid className="w-5 h-5" /></button>
                <button onClick={() => setView('list')} className={`p-2 rounded-lg ${view === 'list' ? 'bg-sewakhoj-red text-white' : 'text-gray-400'}`}><ListIcon className="w-5 h-5" /></button>
              </div>
            </div>

            <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-[32px] h-[450px] animate-pulse border border-gray-100 p-6 space-y-6">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                    <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-12 bg-gray-50 rounded-xl"></div>
                      <div className="h-12 bg-gray-50 rounded-xl"></div>
                      <div className="h-12 bg-gray-50 rounded-xl"></div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <div className="h-6 bg-gray-100 rounded w-1/4"></div>
                      <div className="h-10 bg-gray-100 rounded w-1/3"></div>
                    </div>
                  </div>
                ))
              ) : taskers.length > 0 ? (
                taskers.map((tasker) => {
                  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
                  const serviceInfo = getServiceInfo(tasker.skills);
                  return (
                    <TaskerCard
                      key={tasker.id}
                      id={tasker.id}
                      name={user?.full_name || "Tasker"}
                      initials={getInitials(user?.full_name || "?")}
                      role={serviceInfo.name}
                      location={tasker.city}
                      experience={2}
                      rating={tasker.rating || 5.0}
                      jobsDone={12}
                      monthlyEarn="Rs 40k+"
                      responseTime="1h"
                      bio={tasker.bio}
                      ratePerHour={tasker.hourly_rate}
                      avatarUrl={user?.avatar_url}
                      isOnline={tasker.status === 'active'}
                      isFavorited={favorites.includes(tasker.id)}
                      onFavoriteToggle={() => toggleFavorite(tasker.id)}
                      onBook={() => router.push(authUser ? `/book/${tasker.id}` : `/login?redirect=/book/${tasker.id}`)}
                    />
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                   <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-gray-200" />
                   </div>
                   <h3 className="text-2xl font-black text-gray-900 mb-2">No pros found in this area</h3>
                   <p className="text-gray-500 font-bold max-w-md mx-auto mb-10">We couldn't find any specialists matching your exact filters. Try broadening your search or resetting filters.</p>
                   <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={() => router.push('/browse')}
                        className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl shadow-gray-200"
                      >
                        Reset All Filters
                      </button>
                      <Link 
                        href="/contact"
                        className="bg-white text-gray-900 border-2 border-gray-100 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-50 transition-all"
                      >
                        Request a Pro
                      </Link>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
