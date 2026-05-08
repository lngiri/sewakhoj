"use client";

import { useState, useEffect, useMemo } from "react";
import { MapPin, X, Loader2, CheckCircle, ChevronLeft, Building2 } from "lucide-react";
import { useLocation, getCities, getLocationsForCity } from "@/context/LocationContext";
import { useNotification } from "@/context/NotificationContext";

type SelectionStep = "city" | "location";

export default function LocationModal() {
  const { setLocation, showModal, setShowModal, skipLocation, selectedCity, setSelectedCity, selectedLocation, setSelectedLocation } = useLocation();
  const { showError } = useNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectSuccess, setDetectSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<SelectionStep>("city");

  const cities = useMemo(() => getCities(), []);

  useEffect(() => {
    if (showModal) {
      // Reset to city step when modal opens
      setCurrentStep("city");
      setSearchQuery("");
      setFilteredItems(cities.slice(0, 10));
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showModal, cities]);

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

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    setDetectSuccess(false);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            // Use reverse geocoding to get location name via our proxy API
            const response = await fetch(
              `/api/reverse-geocode?lat=${latitude}&lon=${longitude}`
            );

            if (!response.ok) {
              throw new Error("Failed to detect location");
            }

            const data = await response.json();
            const locationName =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.county ||
              "Kathmandu";

            // Check if detected location matches a city
            const matchedCity = cities.find(city => 
              city.toLowerCase() === locationName.toLowerCase()
            );

            if (matchedCity) {
              setSelectedCity(matchedCity);
              setCurrentStep("location");
            } else {
              // Default to Kathmandu if no match
              setSelectedCity("Kathmandu");
              setCurrentStep("location");
            }

            setLocation({
              name: locationName,
              latitude,
              longitude,
            });

            setDetectSuccess(true);
            setIsDetecting(false);

            // Close modal after a short delay
            setTimeout(() => {
              setShowModal(false);
              sessionStorage.setItem("sewakhoj_location_modal_shown", "true");
            }, 1000);
          } catch (error) {
            console.error("Geocoding failed", error);
            setIsDetecting(false);
            showError("Unable to detect your location. Please try again or enter your area manually.");
          }
        },
        (error) => {
          console.warn("Geolocation permission denied", error);
          setIsDetecting(false);
          let errorMsg = "Location access denied. Please enable location services.";
          if (error.code === 1) {
            errorMsg = "Location permission denied. Please allow location access.";
          } else if (error.code === 2) {
            errorMsg = "Unable to determine your location. Please try again.";
          } else if (error.code === 3) {
            errorMsg = "Location request timed out. Please try again.";
          }
          showError(errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
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
    
    // Set the full location name
    const fullLocationName = selectedCity ? `${location}, ${selectedCity}` : location;
    setLocation({
      name: fullLocationName,
    });
    
    setShowModal(false);
    sessionStorage.setItem("sewakhoj_location_modal_shown", "true");
  };

  const handleBackToCity = () => {
    setCurrentStep("city");
    setSearchQuery("");
  };

  if (!showModal) return null;

  const stepTitle = currentStep === "city" ? "Select Your City" : `Select Area in ${selectedCity}`;
  const stepSubtitle = currentStep === "city" ? "Choose your primary city first" : "Choose your specific area within the city";
  const placeholder = currentStep === "city" ? "e.g. Kathmandu, Pokhara..." : "e.g. Thamel, Baneshwor...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sewakhoj-red to-orange-500 rounded-full mb-4 shadow-lg">
            {currentStep === "city" ? (
              <Building2 className="w-8 h-8 text-white" />
            ) : (
              <MapPin className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {stepTitle}
          </h2>
          <p className="text-sm text-gray-600 font-devanagari">
            {stepSubtitle}
          </p>
        </div>

        {/* Detect Location Button - Only show on city step */}
        {currentStep === "city" && (
          <>
            <button
              onClick={handleDetectLocation}
              disabled={isDetecting || detectSuccess}
              className="w-full bg-gradient-to-r from-sewakhoj-red to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDetecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Detecting...
                </>
              ) : detectSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Location Set!
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  Use My Current Location 📍
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
          </>
        )}

        {/* Back Button - Only show on location step */}
        {currentStep === "location" && (
          <button
            onClick={handleBackToCity}
            className="w-full mb-4 flex items-center justify-center gap-2 text-gray-600 hover:text-sewakhoj-red transition-colors font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to City Selection
          </button>
        )}

        {/* Manual Entry */}
        <div className="mb-4">
          <label htmlFor="area-input" className="block text-sm font-medium text-gray-700 mb-2">
            {currentStep === "city" ? "Search city" : "Search area"}
          </label>
          <input
            id="area-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all"
            autoComplete="off"
          />
        </div>

        {/* Autocomplete Suggestions */}
        {filteredItems.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl mb-4">
            {filteredItems.map((item) => (
              <button
                key={item}
                onClick={() => currentStep === "city" ? handleCitySelect(item) : handleLocationSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-sm text-gray-700"
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {filteredItems.length === 0 && searchQuery.trim() !== "" && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No {currentStep === "city" ? "cities" : "areas"} found matching "{searchQuery}"
          </div>
        )}

        {/* Skip Link - Only show on city step */}
        {currentStep === "city" && (
          <div className="text-center">
            <button
              onClick={skipLocation}
              className="text-sm text-gray-500 hover:text-sewakhoj-red transition-colors font-medium"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
