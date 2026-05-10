"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, ChevronDown, Check, Building2, ChevronLeft } from "lucide-react";
import { useLocation, getCities, getLocationsForCity } from "@/context/LocationContext";

type SelectionStep = "city" | "location";

export default function LocationSelector() {
  const { selectedCity, setSelectedCity, selectedLocation, setSelectedLocation } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<SelectionStep>("city");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cities = getCities();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    // Try to get city from localStorage
    const savedCity = localStorage.getItem("sewakhoj_city");
    if (savedCity) {
      setSelectedCity(savedCity);
    }
    
    const savedLocation = localStorage.getItem("sewakhoj_specific_location");
    if (savedLocation) {
      setSelectedLocation(savedLocation);
    }
  }, [setSelectedCity, setSelectedLocation]);

  useEffect(() => {
    if (isOpen) {
      // Reset to city step when dropdown opens
      setCurrentStep("city");
      setSearchQuery("");
      setFilteredItems(cities.slice(0, 10));
    }
  }, [isOpen, cities]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      if (currentStep === "city") {
        setFilteredItems(cities.slice(0, 10));
      } else if (selectedCity) {
        const locations = getLocationsForCity(selectedCity);
        setFilteredItems(locations.slice(0, 10));
      }
    } else {
      if (currentStep === "city") {
        const filtered = cities.filter((city) =>
          city.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredItems(filtered);
      } else if (selectedCity) {
        const locations = getLocationsForCity(selectedCity);
        const filtered = locations.filter((location) =>
          location.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredItems(filtered);
      }
    }
  }, [searchQuery, currentStep, selectedCity, cities]);

  const detectLocation = () => {
    setDetecting(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position: any) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Use reverse geocoding to get city name via our proxy API
            const response = await fetch(
              `/api/reverse-geocode?lat=${latitude}&lon=${longitude}`
            );
            
            if (!response.ok) {
              throw new Error("Failed to detect location");
            }
            
            const data = await response.json();
            const detectedCity = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Kathmandu";
            
            // Check if detected location matches a city
            const matchedCity = cities.find(city => 
              city.toLowerCase() === detectedCity.toLowerCase()
            );

            if (matchedCity) {
              setSelectedCity(matchedCity);
            } else {
              // Default to Kathmandu if no match
              setSelectedCity("Kathmandu");
            }
            
            setDetecting(false);
            setIsOpen(false);
            
            // Dispatch event for other components
            window.dispatchEvent(new Event('locationChanged'));
          } catch (error) {
            console.error("Geocoding failed", error);
            setDetecting(false);
          }
        },
        (error: any) => {
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
    setCurrentStep("location");
    setSearchQuery("");
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    localStorage.setItem("sewakhoj_specific_location", location);
    setIsOpen(false);
    // Dispatch event for other components
    window.dispatchEvent(new Event('locationChanged'));
  };

  const handleBackToCity = () => {
    setCurrentStep("city");
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const exactMatch = filteredItems.find(item => item.toLowerCase() === searchQuery.toLowerCase());
      if (exactMatch) {
        currentStep === "city" ? handleCitySelect(exactMatch) : handleLocationSelect(exactMatch);
      } else if (filteredItems.length === 1) {
        currentStep === "city" ? handleCitySelect(filteredItems[0]) : handleLocationSelect(filteredItems[0]);
      }
    }
  };

  const displayText = selectedLocation 
    ? `${selectedLocation}, ${selectedCity}` 
    : selectedCity || "Select Location";

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors text-sm font-bold text-gray-700 border border-gray-100 bg-white shadow-sm"
      >
        <MapPin className={`w-3.5 h-3.5 text-sewakhoj-red ${detecting ? 'animate-bounce' : ''}`} />
        <span className="max-w-[120px] truncate">SewaKhoj-{displayText}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
            {/* Header */}
            <div className="px-4 py-2 border-b border-gray-50 mb-1">
              <div className="flex items-center gap-2">
                {currentStep === "location" && (
                  <button
                    onClick={handleBackToCity}
                    className="text-gray-500 hover:text-sewakhoj-red transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  {currentStep === "city" ? "Select City" : `Select Area in ${selectedCity}`}
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="px-4 py-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentStep === "city" ? "Search city..." : "Search area..."}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all"
                autoComplete="off"
              />
            </div>

            {/* Items List */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isSelected = currentStep === "city" 
                    ? selectedCity === item 
                    : selectedLocation === item;
                  
                  return (
                    <button
                      key={item}
                      onClick={() => currentStep === "city" ? handleCitySelect(item) : handleLocationSelect(item)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${isSelected ? 'text-sewakhoj-red font-bold' : 'text-gray-600'}`}
                    >
                      <span className="truncate">{item}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })
              ) : searchQuery.trim() !== "" ? (
                <div className="px-4 py-4 text-center text-sm text-gray-500">
                  No {currentStep === "city" ? "cities" : "areas"} found
                </div>
              ) : null}
            </div>

            {/* Detect Location Button - Only show on city step */}
            {currentStep === "city" && (
              <button 
                onClick={detectLocation}
                className="w-full mt-1 border-t border-gray-50 px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5" /> Detect My Location
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
