"use client";

import { useState, useEffect } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";

const CITIES = [
  "Kathmandu",
  "Butwal",
  "Pokhara",
  "Lalitpur",
  "Bhaktapur",
  "Biratnagar",
  "Birgunj",
  "Dharan",
  "Bharatpur",
  "Hetauda"
];

export default function LocationSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Kathmandu");
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    // Try to get city from localStorage
    const savedCity = localStorage.getItem("sewakhoj_city");
    if (savedCity) {
      setSelectedCity(savedCity);
    } else {
      // Auto-detect if no saved city
      detectLocation();
    }
  }, []);

  const detectLocation = () => {
    setDetecting(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // In a real app, you'd use reverse geocoding here
            // For now, we'll mock it or just stay as is
            // const { latitude, longitude } = position.coords;
            // mock detection for demo
            console.log("Location detected:", position.coords);
            setDetecting(false);
          } catch (error) {
            console.error("Geocoding failed", error);
            setDetecting(false);
          }
        },
        (error) => {
          console.warn("Geolocation permission denied", error);
          setDetecting(false);
        }
      );
    } else {
      setDetecting(false);
    }
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    localStorage.setItem("sewakhoj_city", city);
    setIsOpen(false);
    // Reload or trigger a global state update if needed
    window.dispatchEvent(new Event('locationChanged'));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors text-sm font-bold text-gray-700 border border-gray-100 bg-white shadow-sm"
      >
        <MapPin className={`w-3.5 h-3.5 text-sewakhoj-red ${detecting ? 'animate-bounce' : ''}`} />
        <span className="max-w-[100px] truncate">SewaKhoj-{selectedCity}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-2 border-b border-gray-50 mb-1">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select City</p>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {CITIES.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${selectedCity === city ? 'text-sewakhoj-red font-bold' : 'text-gray-600'}`}
                >
                  {city}
                  {selectedCity === city && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
            <button 
              onClick={detectLocation}
              className="w-full mt-1 border-t border-gray-50 px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-3.5 h-3.5" /> Detect My Location
            </button>
          </div>
        </>
      )}
    </div>
  );
}
