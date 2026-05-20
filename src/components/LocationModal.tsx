"use client";

import { useState, useEffect } from "react";
import { MapPin, X, CheckCircle, ChevronLeft, Building2 } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { useNotification } from "@/context/NotificationContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";

type SelectionStep = "city" | "location";

export default function LocationModal() {
  const { setLocation, showModal, setShowModal, skipLocation, selectedCity, setSelectedCity, selectedLocation, setSelectedLocation, cities, getLocationsForCity } = useLocation();
  const { showError } = useNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectSuccess, setDetectSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<SelectionStep>("city");

  useEffect(() => {
    if (showModal) {
      setCurrentStep("city");
      setSearchQuery("");
      setFilteredItems(cities.map(c => c.name).slice(0, 10));
    }
  }, [showModal, cities]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      if (currentStep === "city") {
        setFilteredItems(cities.map(c => c.name).slice(0, 10));
      } else if (selectedCity) {
        const locations = getLocationsForCity(selectedCity);
        setFilteredItems(locations.slice(0, 10));
      }
    } else {
      if (currentStep === "city") {
        const filtered = cities.filter((c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(c => c.name);
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

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    setDetectSuccess(false);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            // Use reverse geocoding
            const response = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
            if (!response.ok) throw new Error("Failed to detect location");

            const data = await response.json();
            const locationName = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Kathmandu";

            const matchedCity = cities.find(c => c.name.toLowerCase() === locationName.toLowerCase());

            if (matchedCity) {
              setSelectedCity(matchedCity.name);
              setCurrentStep("location");
            } else {
              setSelectedCity("Kathmandu");
              setCurrentStep("location");
            }

            setLocation({ name: locationName, latitude, longitude });
            setDetectSuccess(true);
            setIsDetecting(false);

            setTimeout(() => {
              setShowModal(false);
              sessionStorage.setItem("sewakhoj_location_modal_shown", "true");
            }, 1000);
          } catch (error) {
            console.error("Geocoding failed", error);
            setIsDetecting(false);
            showError("Unable to detect your location.");
          }
        },
        (error) => {
          setIsDetecting(false);
          showError("Location access denied.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsDetecting(false);
      showError("Geolocation is not supported by your browser.");
    }
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setCurrentStep("location");
    setSearchQuery("");
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    const fullLocationName = selectedCity ? `${location}, ${selectedCity}` : location;
    setLocation({ name: fullLocationName });
    setShowModal(false);
    sessionStorage.setItem("sewakhoj_location_modal_shown", "true");
  };

  const handleBackToCity = () => {
    setCurrentStep("city");
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Only proceed if exactly one item is filtered, or if they typed an exact match
      const exactMatch = filteredItems.find(item => item.toLowerCase() === searchQuery.toLowerCase());
      if (exactMatch) {
        currentStep === "city" ? handleCitySelect(exactMatch) : handleLocationSelect(exactMatch);
      } else if (filteredItems.length === 1) {
        currentStep === "city" ? handleCitySelect(filteredItems[0]) : handleLocationSelect(filteredItems[0]);
      }
    }
  };

  return (
    <Modal
      open={showModal}
      onClose={() => setShowModal(false)}
      title={currentStep === "city" ? "Select City" : "Select Area"}
      description={currentStep === "city" ? "Your primary city" : `In ${selectedCity}`}
      size="sm"
    >
      <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-sewakhoj-red rounded-full mb-3 shadow-sm">
            {currentStep === "city" ? <Building2 className="w-5 h-5 text-white" /> : <MapPin className="w-5 h-5 text-white" />}
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {currentStep === "city" ? "Select City" : "Select Area"}
          </h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
            {currentStep === "city" ? "Your primary city" : `In ${selectedCity}`}
          </p>
        </div>

        {currentStep === "city" && (
          <>
            <button
              onClick={handleDetectLocation}
              disabled={isDetecting || detectSuccess}
              className="w-full bg-gray-900 text-white px-4 py-3.5 rounded-xl font-bold hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2 mb-4 disabled:opacity-50 text-sm shadow-sm"
            >
              {isDetecting ? (
                <><LoadingSpinner size="xs" variant="white" /> Detecting...</>
              ) : detectSuccess ? (
                <><CheckCircle className="w-4 h-4 text-green-400" /> Set!</>
              ) : (
                <><MapPin className="w-4 h-4" /> Detect My Location</>
              )}
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-gray-100"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">OR</span>
              <div className="flex-1 h-px bg-gray-100"></div>
            </div>
          </>
        )}

        {currentStep === "location" && (
          <button
            onClick={handleBackToCity}
            className="w-full mb-4 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" /> Back to Cities
          </button>
        )}

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentStep === "city" ? "Search city..." : "Search area..."}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-sewakhoj-red focus:ring-1 focus:ring-sewakhoj-red outline-none transition-all text-sm font-bold text-gray-900"
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="max-h-48 overflow-y-auto custom-scrollbar border border-gray-100 rounded-xl mb-4">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item}
                onClick={() => currentStep === "city" ? handleCitySelect(item) : handleLocationSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 text-sm font-bold text-gray-600 hover:text-gray-900"
              >
                {item}
              </button>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Not Found</p>
              <p className="text-xs text-gray-400 mt-1">Try another keyword</p>
            </div>
          )}
        </div>

        {currentStep === "city" && (
          <div className="text-center">
            <button
              onClick={skipLocation}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
    </Modal>
  );
}
