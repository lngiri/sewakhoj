"use client";

import { useState, useEffect } from "react";
import { MapPin, X, Check } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import Modal from "@/components/ui/Modal";

export default function LocationModal() {
  const { selectedCity, setSelectedCity, cities, citiesLoading, showModal, setShowModal } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (showModal) {
      setSearchQuery("");
    }
  }, [showModal]);

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal open={showModal} onClose={() => setShowModal(false)}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sewakhoj-red/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-sewakhoj-red" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Select Your City</h3>
              <p className="text-sm text-gray-500">Choose your city to find nearby taskers</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search cities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sewakhoj-red/20"
          />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1">
          {citiesLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading cities...</div>
          ) : filteredCities.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No cities found</div>
          ) : (
            filteredCities.map(city => (
              <button
                key={city.name}
                onClick={() => {
                  setSelectedCity(city.name);
                  setShowModal(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left ${
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
    </Modal>
  );
}
