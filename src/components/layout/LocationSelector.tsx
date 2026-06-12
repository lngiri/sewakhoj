"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { useLocation } from "@/context/LocationContext";

export default function LocationSelector() {
  const { selectedCity, setSelectedCity, cities, citiesLoading } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all text-sm font-semibold text-gray-700 border border-gray-100"
      >
        <MapPin className="w-4 h-4 text-sewakhoj-red" />
        <span>{selectedCity || "Select City"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search cities..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sewakhoj-red/20"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {citiesLoading ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading cities...</div>
            ) : filteredCities.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">No cities found</div>
            ) : (
              filteredCities.map(city => (
                <button
                  key={city.name}
                  onClick={() => {
                    setSelectedCity(city.name);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                    selectedCity === city.name
                      ? 'bg-sewakhoj-red/10 text-sewakhoj-red font-bold'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="flex-1">{city.name}</span>
                  {selectedCity === city.name && <Check className="w-4 h-4" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
