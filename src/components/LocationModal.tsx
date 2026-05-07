"use client";

import { useState, useEffect } from "react";
import { MapPin, X, Loader2, CheckCircle } from "lucide-react";
import { useLocation, NEPAL_LOCALITIES } from "@/context/LocationContext";

export default function LocationModal() {
  const { setLocation, showModal, setShowModal, skipLocation } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLocalities, setFilteredLocalities] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectSuccess, setDetectSuccess] = useState(false);

  useEffect(() => {
    if (showModal) {
      setFilteredLocalities(NEPAL_LOCALITIES.slice(0, 10));
    }
  }, [showModal]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLocalities(NEPAL_LOCALITIES.slice(0, 10));
    } else {
      const filtered = NEPAL_LOCALITIES.filter((locality) =>
        locality.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocalities(filtered);
    }
  }, [searchQuery]);

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    setDetectSuccess(false);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            // Use reverse geocoding to get location name
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
              {
                headers: {
                  "Accept-Language": "ne,en",
                },
              }
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
            alert("Unable to detect your location. Please try again or enter your area manually.");
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
          alert(errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setIsDetecting(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleLocalitySelect = (locality: string) => {
    setLocation({
      name: locality,
    });
    setShowModal(false);
    sessionStorage.setItem("sewakhoj_location_modal_shown", "true");
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
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
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Where are you located?
          </h2>
          <p className="text-sm text-gray-600 font-devanagari">
            तपाईं कहाँ हुन्हुन्छ?
          </p>
        </div>

        {/* Detect Location Button */}
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

        {/* Manual Entry */}
        <div className="mb-4">
          <label htmlFor="area-input" className="block text-sm font-medium text-gray-700 mb-2">
            Enter your area
          </label>
          <input
            id="area-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. Baneshwor, Patan..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all"
            autoComplete="off"
          />
        </div>

        {/* Autocomplete Suggestions */}
        {filteredLocalities.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl mb-4">
            {filteredLocalities.map((locality) => (
              <button
                key={locality}
                onClick={() => handleLocalitySelect(locality)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-sm text-gray-700"
              >
                {locality}
              </button>
            ))}
          </div>
        )}

        {/* Skip Link */}
        <div className="text-center">
          <button
            onClick={skipLocation}
            className="text-sm text-gray-500 hover:text-sewakhoj-red transition-colors font-medium"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
