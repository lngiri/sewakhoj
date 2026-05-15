"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, List as ListIcon, Search, RefreshCw, AlertCircle } from "lucide-react";
import TaskerCard from "@/components/TaskerCard";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { useLocation } from "@/context/LocationContext";

interface Props {
  initialTaskers: any[];
  initialServices: any[];
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 rounded-lg flex-1" />
        <div className="h-8 bg-gray-100 rounded-lg w-20" />
      </div>
    </div>
  );
}

export default function BrowseClient({ initialTaskers, initialServices }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser } = useAuth();
  const { location, isLocationSet } = useLocation();
  const { showError } = useNotification();
  
  const [taskers, setTaskers] = useState<any[]>(initialTaskers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const selectedService = searchParams.get("service") || undefined;
  const selectedCity = searchParams.get("city") || undefined;
  const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
  const minRating = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : undefined;
  const queryParam = searchParams.get("q") || "";

  useEffect(() => {
    async function fetchFavorites() {
      if (authUser) {
        const { data } = await supabase.from('favorites').select('tasker_id').eq('user_id', authUser.id);
        if (data) setFavorites(data.map((f: any) => f.tasker_id));
      }
    }
    fetchFavorites();
  }, [authUser]);

  const fetchTaskers = useCallback(async () => {
    setLoading(true);
    setError(null);
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

      const { data, error: queryError } = await query;
      
      if (queryError) {
        setError("Unable to load taskers right now. Please try again.");
        setTaskers([]);
        return;
      }
      
      if (data) {
        let filtered = data as any[];
        
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
            return u?.full_name?.toLowerCase().includes(q) || t.skills?.some((s: string) => s.toLowerCase().includes(q));
          });
        }

        // Sort logic
        filtered = filtered.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });

        setTaskers(filtered);
      }
    } catch {
      setError("Unable to load taskers right now. Please try again.");
      setTaskers([]);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [selectedCity, selectedService, minPrice, maxPrice, minRating, queryParam, authUser]);

  useEffect(() => {
    // Skip initial fetch on client if we already have initialTaskers from server
    if (isInitialLoad && initialTaskers.length > 0) {
      setIsInitialLoad(false);
      return;
    }
    if (isInitialLoad && initialTaskers.length === 0) {
      // Server returned empty — fetch on client
      fetchTaskers();
      return;
    }

    fetchTaskers();
  }, [fetchTaskers]);

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
          }
        } catch (err) {
          console.error("Geocoding error:", err);
        } finally {
          setLoading(false);
        }
      }, () => setLoading(false));
    }
  };

  const getServiceInfo = (skills: string[] | null) => {
    if (!skills || skills.length === 0) return { name: "General", emoji: "🔧" };
    const service = initialServices.find(s => skills.includes(s.id));
    return service ? { name: service.nameEn || service.name, emoji: service.emoji || "🔧" } : { name: skills[0], emoji: "🔧" };
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb]">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] pt-12 pb-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 text-xs font-bold uppercase tracking-widest flex-col items-start">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Home</span>
            <span className="text-xs text-gray-300 font-devanagari" style={{ whiteSpace: 'pre-wrap', wordSpacing: '0.1em' }}>गृह पृष्ठ</span>
          </Link>
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">
            <span className="block font-devanagari text-sewakhoj-red text-2xl md:text-4xl mb-1">नजिकैका सीपालु साथीहरू भेट्टाउनुहोस्</span>
            Find Taskers Near You
          </h1>
          <div className="mt-8 relative z-20">
            <SearchAutocomplete />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-64 shrink-0 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Filter Results</h3>
               <div className="space-y-4 mb-8">
                  <p className="text-sm font-bold text-gray-900">Price Range (Rs)</p>
                  <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Min" value={minPrice || ""} 
                        onChange={e => {
                          const url = new URL(window.location.href);
                          if (e.target.value) url.searchParams.set("minPrice", e.target.value);
                          else url.searchParams.delete("minPrice");
                          router.replace(url.pathname + url.search, { scroll: false });
                        }}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-2 text-xs font-bold focus:border-sewakhoj-red outline-none transition-all"
                      />
                      <input type="number" placeholder="Max" value={maxPrice || ""} 
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
               <div className="space-y-4 mb-8">
                  <p className="text-sm font-bold text-gray-900">Minimum Rating</p>
                  <div className="flex flex-wrap gap-2">
                    {[5, 4, 3].map(r => (
                      <button key={r}
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
               <button onClick={() => router.push('/browse')} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-sewakhoj-red transition-all">
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
              <h2 className="text-xl font-black text-gray-900">
                {loading && isInitialLoad
                  ? 'Finding taskers near you...'
                  : loading
                    ? 'Updating results...'
                    : error
                      ? 'Something went wrong'
                      : taskers.length === 0
                        ? 'No taskers in your area yet'
                        : `${taskers.length} ${taskers.length === 1 ? 'tasker' : 'taskers'} ready to help`
                }
              </h2>
              <div className="flex bg-white rounded-xl shadow-sm border p-1">
                <button onClick={() => setView('grid')} className={`p-2 rounded-lg ${view === 'grid' ? 'bg-sewakhoj-red text-white' : 'text-gray-400'}`}><LayoutGrid className="w-5 h-5" /></button>
                <button onClick={() => setView('list')} className={`p-2 rounded-lg ${view === 'list' ? 'bg-sewakhoj-red text-white' : 'text-gray-400'}`}><ListIcon className="w-5 h-5" /></button>
              </div>
            </div>

            {/* LOADING STATE: Skeleton cards */}
            {loading && isInitialLoad && (
              <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* ERROR STATE */}
            {error && !loading && (
              <div
                className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-red-200"
                role="alert"
              >
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Unable to load taskers</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto mb-6">
                  {error}
                </p>
                <button
                  onClick={fetchTaskers}
                  className="inline-flex items-center gap-2 bg-sewakhoj-red text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            )}

            {/* TASKER CARDS */}
            {!loading && !error && taskers.length > 0 && (
              <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                {taskers.map((tasker) => {
                  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
                  const serviceInfo = getServiceInfo(tasker.skills);
                  return (
                    <TaskerCard
                      key={tasker.id}
                      id={tasker.id}
                      name={user?.full_name || "Tasker"}
                      initials={user?.full_name?.[0]?.toUpperCase() || "?"}
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
                      bookingHref={authUser ? `/book/${tasker.id}` : `/login?redirect=/book/${tasker.id}`}
                    />
                  );
                })}
              </div>
            )}

            {/* EMPTY STATE */}
            {!loading && !error && taskers.length === 0 && (
              <div
                className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100"
                role="status"
                aria-label="No taskers found"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No taskers in your area yet</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto mb-6">
                  We're growing fast — check back soon or be the first to join!
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/post-task" className="bg-sewakhoj-red text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-all">
                    Post a Custom Task
                  </Link>
                  <Link href="/tasker/onboard" className="border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">
                    Become a Tasker
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
