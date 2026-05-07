"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, List as ListIcon, X } from "lucide-react";
import { services as staticServices } from "@/data/services";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser } = useAuth();
  const { location, isLocationSet } = useLocation();
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
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb;
          
          if (city) {
            const url = new URL(window.location.href);
            url.searchParams.set("city", city.toLowerCase());
            router.push(url.pathname + url.search);
          } else {
            alert("Could not detect city automatically.");
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
          <div className="mt-8">
            <SearchAutocomplete />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-8">
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
              {taskers.map((tasker) => {
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
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
