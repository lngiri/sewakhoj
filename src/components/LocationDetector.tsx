"use client";

import { useState, useEffect } from "react";
import { MapPin, Locate, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useLocation } from "@/context/LocationContext";

type LocationState = "default" | "loading" | "success" | "error";

export default function LocationDetector() {
  const { selectedCity, setSelectedCity } = useLocation();
  const [locationState, setLocationState] = useState<LocationState>(() => {
    const savedCity = typeof window !== 'undefined' ? localStorage.getItem("sewakhoj_city") : null;
    return savedCity ? "success" : "default";
  });
  const [detectedCity, setDetectedCity] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem("sewakhoj_city") || "" : "";
  });
  const [errorMessage, setErrorMessage] = useState<string>("");

  const detectLocation = async () => {
    setLocationState("loading");
    setErrorMessage("");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position: GeolocationPosition) => {
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
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Kathmandu";
            
            setDetectedCity(city);
            setSelectedCity(city);
            setLocationState("success");
            
            // Dispatch event for other components
            window.dispatchEvent(new Event('locationChanged'));
          } catch (error) {
            console.error("Geocoding failed", error);
            setErrorMessage("Unable to detect your location. Please try again.");
            setLocationState("error");
          }
        },
        (error: GeolocationPositionError) => {
          console.warn("Geolocation permission denied", error);
          let errorMsg = "Location access denied. Please enable location services.";
          if (error.code === 1) {
            errorMsg = "Location permission denied. Please allow location access.";
          } else if (error.code === 2) {
            errorMsg = "Unable to determine your location. Please try again.";
          } else if (error.code === 3) {
            errorMsg = "Location request timed out. Please try again.";
          }
          setErrorMessage(errorMsg);
          setLocationState("error");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setErrorMessage("Geolocation is not supported by your browser.");
      setLocationState("error");
    }
  };


  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative group">
        {/* Gradient background with subtle animation */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sewakhoj-red via-orange-500 to-sewakhoj-red rounded-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 blur-sm animate-gradient-x"></div>
        
        {/* Main card */}
        <div className="relative bg-white rounded-2xl p-6 shadow-xl">
          {/* Default State */}
          {locationState === "default" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sewakhoj-red to-orange-500 rounded-full mb-4 shadow-lg">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Find Services Near You
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Detect your location to see available taskers in your area
              </p>
              <button
                onClick={detectLocation}
                className="w-full bg-gradient-to-r from-sewakhoj-red to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Locate className="w-5 h-5" />
                Detect My Location
              </button>
            </div>
          )}

          {/* Loading State */}
          {locationState === "loading" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sewakhoj-red to-orange-500 rounded-full mb-4 shadow-lg">
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Detecting Your Location...
              </h3>
              <p className="text-sm text-gray-600">
                Please wait while we find your location
              </p>
            </div>
          )}

          {/* Success State */}
          {locationState === "success" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-4 shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Location Detected!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Showing taskers in <span className="font-bold text-sewakhoj-red">{detectedCity}</span>
              </p>
              <button
                onClick={detectLocation}
                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Update Location
              </button>
            </div>
          )}

          {/* Error State */}
          {locationState === "error" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-rose-500 rounded-full mb-4 shadow-lg">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Location Detection Failed
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {errorMessage}
              </p>
              <button
                onClick={detectLocation}
                className="w-full bg-gradient-to-r from-sewakhoj-red to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-700 hover:to-orange-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
