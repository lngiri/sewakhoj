import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
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

interface BrowsePageProps {
  searchParams: Promise<{ 
    service?: string; 
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const selectedService = params.service;
  const selectedCity = params.city;
  const minPrice = params.minPrice ? parseInt(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : undefined;
  const minRating = params.minRating ? parseFloat(params.minRating) : undefined;

  let taskers: TaskerWithUser[] = [];

  // Only fetch from Supabase if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey && supabaseUrl !== '') {
    try {
      // Fetch taskers from Supabase with user data
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

      // Apply city filter if selected
      if (selectedCity) {
        query = query.eq("city", selectedCity.toLowerCase());
      }

      // Apply service filter if selected (check if skills array contains the service)
      if (selectedService) {
        query = query.contains("skills", [selectedService]);
      }

      // Apply price range filter
      if (minPrice !== undefined && !isNaN(minPrice)) {
        query = query.gte("hourly_rate", minPrice);
      }
      if (maxPrice !== undefined && !isNaN(maxPrice)) {
        query = query.lte("hourly_rate", maxPrice);
      }

      // Apply rating filter
      if (minRating !== undefined && !isNaN(minRating)) {
        query = query.gte("rating", minRating);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching taskers:", error.message);
      } else if (data) {
        taskers = data as unknown as TaskerWithUser[];
      }
    } catch (err) {
      console.error("Failed to fetch taskers:", err);
    }
  } else {
    console.warn("Supabase environment variables not set. Showing empty state.");
  }

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
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sewakhoj-red hover:text-red-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Home / होम फर्कनुस्</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Browse Taskers / काम गर्नेहरू हेर्नुस्
          </h1>
          <p className="text-gray-600 mt-2">
            Find trusted service professionals near you / आफ्नो नजिकै विश्वासिलो सेवा प्रदायक फेला पार्नुस्
          </p>
        </div>

        {/* Filters — Client Component with event handlers */}
        <Suspense fallback={
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-200 rounded-lg" />)}
            </div>
          </div>
        }>
          <BrowseFilters />
        </Suspense>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {taskers.length} taskers / {taskers.length} काम गर्नेहरू देखाइएको छ
          </p>
        </div>

        {/* Tasker Grid */}
        {(!taskers || taskers.length === 0) ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No taskers found / कुनै काम गर्ने फेला परेन
            </h3>
            <p className="text-gray-600 mb-8">
              Try adjusting your filters or post your task so taskers can find you!
            </p>
            <Link 
              href="/post-task" 
              className="inline-flex items-center gap-2 bg-sewakhoj-red text-white px-8 py-4 rounded-xl font-bold hover:bg-sewakhoj-red-light transition-colors shadow-lg transform hover:-translate-y-1"
            >
              Post a Task Instead / कार्य पोस्ट गर्नुस्
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taskers.map((tasker: TaskerWithUser) => {
              const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
              const serviceInfo = getServiceInfo(tasker.skills);
              
              return (
                <Link
                  key={tasker.id}
                  href={`/book/${tasker.id}`}
                  className="group"
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                    {/* Card Header */}
                    <div className="relative h-32 bg-gradient-to-br from-sewakhoj-red to-red-600 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-3xl font-bold text-sewakhoj-red shadow-lg">
                        {user?.full_name ? getInitials(user.full_name) : "?"}
                      </div>
                      <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Available / उपलब्ध
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {user?.full_name || "Unknown Tasker"}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {serviceInfo.emoji} {serviceInfo.name}
                      </p>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold text-gray-900">
                            {tasker.rating?.toFixed(1) || "New"}
                          </span>
                        </div>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">
                          Rs {tasker.hourly_rate || 500}/hr
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <span>📍</span>
                        <span>
                          {getNepaliCityName(tasker.city)} ({tasker.city})
                        </span>
                      </div>

                      {/* Bio Preview */}
                      {tasker.bio && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                          {tasker.bio}
                        </p>
                      )}

                      {/* Book Button */}
                      <div className="w-full bg-sewakhoj-red text-white text-center py-3 rounded-lg font-semibold group-hover:bg-sewakhoj-red-light transition-colors">
                        Book Now / अहिले बुक गर्नुस् →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
