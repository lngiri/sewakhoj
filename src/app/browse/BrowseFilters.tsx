"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { services } from "@/data/services";

export default function BrowseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedService = searchParams.get("service") || "";
  const selectedCity = searchParams.get("city") || "";
  const minPriceVal = searchParams.get("minPrice") || "";
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Service Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Service / सेवा
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
            defaultValue={selectedService}
            onChange={(e) => updateParam("service", e.target.value)}
          >
            <option value="">All Services / सबै सेवाहरू</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.emoji} {service.nameEn} / {service.nameNp}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            City / सहर
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
            defaultValue={selectedCity}
            onChange={(e) => updateParam("city", e.target.value)}
          >
            <option value="">All Cities / सबै सहरहरू</option>
            <option value="kathmandu">Kathmandu / काठमाडौं</option>
            <option value="pokhara">Pokhara / पोखरा</option>
            <option value="lalitpur">Lalitpur / ललितपुर</option>
            <option value="bhaktapur">Bhaktapur / भक्तपुर</option>
          </select>
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Min Price (Rs/hr) / न्यूनतम मूल्य
          </label>
          <input
            type="number"
            placeholder="e.g. 300"
            defaultValue={minPriceVal}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
            onChange={(e) => updateParam("minPrice", e.target.value)}
          />
        </div>

        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Min Rating / न्यूनतम रेटिङ
          </label>
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
            defaultValue={minRatingVal}
            onChange={(e) => updateParam("minRating", e.target.value)}
          >
            <option value="">Any Rating / जुनसुकै</option>
            <option value="4">4+ Stars / ४+ तारा</option>
            <option value="4.5">4.5+ Stars / ४.५+ तारा</option>
            <option value="4.8">4.8+ Stars / ४.८+ तारा</option>
          </select>
        </div>
      </div>
    </div>
  );
}
