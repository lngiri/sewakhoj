"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { services } from "@/data/services";
import { supabase } from "@/lib/supabase";

interface BrowseFiltersProps {
  categories?: any[];
}

export default function BrowseFilters({ categories }: BrowseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cities, setCities] = useState<any[]>([]);

  const selectedService = searchParams.get("service") || "";
  const selectedCity = searchParams.get("city") || "";
  const minPriceVal = searchParams.get("minPrice") || "";
  const maxPriceVal = searchParams.get("maxPrice") || "";
  const minRatingVal = searchParams.get("minRating") || "";

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from('cities')
        .select('name, name_np')
        .eq('is_active', true)
        .order('name');
      if (data) setCities(data);
    };
    fetchCities();
  }, []);

  const updateParam = (key: string, value: string) => {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    router.push(url.pathname + url.search);
  };

  const clearFilters = () => {
    router.push("/browse");
  };

  return (
    <div className="space-y-8 overflow-hidden">
      {/* City Filter */}
      <div className="filter-section">
        <h4 className="text-[12px] font-black text-muted-foreground uppercase tracking-widest mb-4">Location / सहर</h4>
        <select
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sewakhoj-red text-[14px] font-medium appearance-none"
          defaultValue={selectedCity}
          onChange={(e) => updateParam("city", e.target.value)}
        >
          <option value="">All Cities / सबै सहरहरू</option>
          {cities.map(city => (
            <option key={city.name} value={city.name.toLowerCase()}>
              {city.name} {city.name_np ? `/ ${city.name_np}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Price Range Filter */}
      <div className="filter-section">
        <h4 className="text-[12px] font-black text-muted-foreground uppercase tracking-widest mb-4">Max Rate / अधिकतम मूल्य</h4>
        <div className="space-y-4">
          <input
            type="range"
            min="200"
            max="2500"
            step="50"
            defaultValue={maxPriceVal || "2500"}
            className="w-full accent-sewakhoj-red"
            onChange={(e) => updateParam("maxPrice", e.target.value)}
          />
          <div className="flex justify-between text-[13px] font-bold text-gray-900">
            <span>Rs 200</span>
            <span className="text-sewakhoj-red">Up to Rs {maxPriceVal || "2,500"}</span>
          </div>
        </div>
      </div>

      {/* Rating Filter */}
      <div className="filter-section">
        <h4 className="text-[12px] font-black text-muted-foreground uppercase tracking-widest mb-4">Minimum Rating / रेटिङ</h4>
        <div className="grid grid-cols-2 gap-2">
          {[0, 4, 4.5, 4.8].map((rating) => (
            <button
              key={rating}
              onClick={() => updateParam("minRating", rating === 0 ? "" : rating.toString())}
              className={`py-2 rounded-lg text-[12px] font-bold border transition-all ${
                (minRatingVal === rating.toString() || (rating === 0 && !minRatingVal))
                  ? "bg-sewakhoj-red border-sewakhoj-red text-white shadow-md"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {rating === 0 ? "Any" : `${rating}★ +`}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <button
          onClick={clearFilters}
          className="w-full py-3 text-[12px] font-black text-muted-foreground uppercase tracking-widest hover:text-gray-900 transition-colors"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );
}
