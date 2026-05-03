"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { services } from "@/data/services";

interface BrowseFiltersProps {
  categories?: any[];
}

export default function BrowseFilters({ categories }: BrowseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedService = searchParams.get("service") || "";
  const selectedCity = searchParams.get("city") || "";
  const minPriceVal = searchParams.get("minPrice") || "";
  const maxPriceVal = searchParams.get("maxPrice") || "";
  const minRatingVal = searchParams.get("minRating") || "";

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
    <div className="space-y-8">
      {/* City Filter */}
      <div className="filter-section">
        <h4 className="text-[12px] font-black text-muted-foreground uppercase tracking-widest mb-4">Location / सहर</h4>
        <select
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sewakhoj-red text-[14px] font-medium"
          defaultValue={selectedCity}
          onChange={(e) => updateParam("city", e.target.value)}
        >
          <option value="">All Cities / सबै सहरहरू</option>
          <option value="kathmandu">Kathmandu / काठमाडौं</option>
          <option value="pokhara">Pokhara / पोखरा</option>
          <option value="lalitpur">Lalitpur / ललितपुर</option>
          <option value="bhaktapur">Bhaktapur / भक्तपुर</option>
          <option value="biratnagar">Biratnagar / विराटनगर</option>
          <option value="birgunj">Birgunj / वीरगञ्ज</option>
        </select>
      </div>

      {/* Service Filter */}
      <div className="filter-section">
        <h4 className="text-[12px] font-black text-muted-foreground uppercase tracking-widest mb-4">Category / सेवा</h4>
        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
          {(categories || services).map((service) => (
            <label key={service.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
              <input 
                type="radio" 
                name="service"
                checked={selectedService === service.id}
                onChange={() => updateParam("service", service.id)}
                className="w-4 h-4 accent-sewakhoj-red"
              />
              <span className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900">
                {service.emoji || service.icon || "🔧"} {service.nameEn || service.name}
              </span>
            </label>
          ))}
        </div>
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
