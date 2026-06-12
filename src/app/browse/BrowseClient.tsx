"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LayoutGrid, List as ListIcon, Search, RefreshCw, AlertCircle } from "lucide-react";
import PageHeader from "@/components/navigation/PageHeader";
import TaskerCard from "@/components/TaskerCard";
import { supabase } from "@/lib/supabase";

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

  const [taskers, setTaskers] = useState<any[]>(initialTaskers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const selectedService = searchParams.get("service") || undefined;
  const selectedCity = searchParams.get("city") || undefined;
  const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!) : undefined;
  const queryParam = searchParams.get("q") || "";

  const fetchTaskers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("taskers")
        .select(`
          id, hourly_rate, city, rating, status, bio, skills,
          users!inner (id, full_name, avatar_url)
        `)
        .eq("status", "active");

      if (selectedCity) query = query.ilike("city", selectedCity);
      if (selectedService) query = query.contains("skills", [selectedService]);
      if (minPrice !== undefined) query = query.gte("hourly_rate", minPrice);
      if (maxPrice !== undefined) query = query.lte("hourly_rate", maxPrice);

      const { data, error: queryError } = await query;

      if (queryError) {
        setError("Unable to load taskers right now. Please try again.");
        setTaskers([]);
        return;
      }

      if (data) {
        let filtered = data as any[];

        if (queryParam) {
          const q = queryParam.toLowerCase();
          filtered = filtered.filter(t => {
            const u = Array.isArray(t.users) ? t.users[0] : t.users;
            const name = u?.full_name || '';
            return name.toLowerCase().includes(q) || t.skills?.some((s: string) => s.toLowerCase().includes(q));
          });
        }

        filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        setTaskers(filtered);
      }
    } catch {
      setError("Unable to load taskers right now. Please try again.");
      setTaskers([]);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [selectedCity, selectedService, minPrice, maxPrice, queryParam]);

  useEffect(() => {
    if (isInitialLoad && initialTaskers.length > 0) {
      setIsInitialLoad(false);
      return;
    }
    fetchTaskers();
  }, [fetchTaskers]);

  const getServiceInfo = (skills: string[] | null) => {
    if (!skills || skills.length === 0) return { name: "General", emoji: "🔧" };
    const service = initialServices.find(s => skills.includes(s.id));
    return service ? { name: service.nameEn || service.name, emoji: service.emoji || "🔧" } : { name: skills[0], emoji: "🔧" };
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb]">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] pt-12 pb-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PageHeader
            title="Find Taskers Near You"
            className="mb-4 [&_.title-wrapper]:hidden"
            relatedLinks={[
              { href: "/services", label: "Service Catalog" },
              { href: "/", label: "Home" },
            ]}
          />
          <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">
            Find Taskers Near You
          </h1>
          <div className="mt-8 relative z-20 max-w-xl">
            <input
              type="text"
              placeholder="Search by name or skill..."
              defaultValue={queryParam}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const url = new URL(window.location.href);
                  const val = (e.target as HTMLInputElement).value;
                  if (val) url.searchParams.set("q", val);
                  else url.searchParams.delete("q");
                  router.push(url.pathname + url.search);
                }
              }}
              className="w-full px-5 py-3.5 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
            />
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
               <button onClick={() => { router.push('/browse'); }} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-sewakhoj-red transition-all">
                 Reset Filters
               </button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
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

            {loading && isInitialLoad && (
              <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            )}

            {error && !loading && (
              <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-red-200" role="alert">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Unable to load taskers</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto mb-6">{error}</p>
                <button
                  onClick={fetchTaskers}
                  className="inline-flex items-center gap-2 bg-sewakhoj-red text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              </div>
            )}

            {!loading && !error && taskers.length > 0 && (
              <div className={view === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                {taskers.map((tasker) => {
                  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
                  const serviceInfo = getServiceInfo(tasker.skills);
                  const name = user?.full_name || tasker.full_name || "Tasker";
                  const avatarUrl = user?.avatar_url || tasker.avatar_url;
                  return (
                    <TaskerCard
                      key={tasker.id}
                      id={tasker.id}
                      name={name}
                      initials={name?.[0]?.toUpperCase() || "?"}
                      role={serviceInfo.name}
                      location={tasker.city}
                      rating={tasker.rating || 5.0}
                      bio={tasker.bio}
                      ratePerHour={tasker.hourly_rate}
                      avatarUrl={avatarUrl}
                      isOnline={tasker.status === 'active'}
                      bookingHref={user ? `/book/${tasker.id}` : `/login?redirect=/book/${tasker.id}`}
                    />
                  );
                })}
              </div>
            )}

            {!loading && !error && taskers.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100" role="status" aria-label="No taskers found">
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
