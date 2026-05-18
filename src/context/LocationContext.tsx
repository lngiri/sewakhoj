"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface LocationData {
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface City {
  name: string;
  locations: string[];
}

interface LocationContextType {
  location: LocationData | null;
  selectedCity: string | null;
  selectedLocation: string | null;
  setLocation: (location: LocationData | null) => void;
  setSelectedCity: (city: string | null) => void;
  setSelectedLocation: (location: string | null) => void;
  isLocationSet: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  skipLocation: () => void;
  getLocationsForCity: (city: string) => string[];
  cities: City[];
  citiesLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Removed hardcoded fallback per requirements. Cities will only be loaded from the DB.
const FALLBACK_CITIES: City[] = [];

// Legacy export for backward compatibility
export const NEPAL_CITIES: City[] = FALLBACK_CITIES;

// Legacy export for backward compatibility
export const NEPAL_LOCALITIES = FALLBACK_CITIES.flatMap(city =>
  [city.name, ...city.locations]
);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLocationSet, setIsLocationSet] = useState(false);
  const [cities, setCities] = useState<City[]>(FALLBACK_CITIES);
  const [citiesLoading, setCitiesLoading] = useState(true);

  // Fetch cities from database on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchCities() {
      try {
        const { data, error } = await supabase
          .from("cities")
          .select("name, locations")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (!cancelled && !error && data && data.length > 0) {
          const dbCities: City[] = data.map((c: { name: string; locations: string[] | null }) => ({
            name: c.name,
            locations: c.locations && c.locations.length > 0 ? c.locations : [c.name],
          }));
          setCities(dbCities);
        }
      } catch (err) {
        console.warn("Failed to fetch cities from DB, using fallback:", err);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }
    fetchCities();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Load location from localStorage on mount
    const savedLocation = localStorage.getItem("sewakhoj_location");
    const savedCity = localStorage.getItem("sewakhoj_city");
    const savedSpecificLocation = localStorage.getItem("sewakhoj_specific_location");

    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setLocation(parsed);
        setIsLocationSet(true);
      } catch (e) {
        console.error("Failed to parse saved location", e);
      }
    }

    if (savedCity) {
      setSelectedCity(savedCity);
    }

    if (savedSpecificLocation) {
      setSelectedLocation(savedSpecificLocation);
    }
  }, []);

  const setLocationWithStorage = (newLocation: LocationData | null) => {
    setLocation(newLocation);
    setIsLocationSet(!!newLocation);
    if (newLocation) {
      localStorage.setItem("sewakhoj_location", JSON.stringify(newLocation));
    } else {
      localStorage.removeItem("sewakhoj_location");
    }
  };

  const setSelectedCityWithStorage = (city: string | null) => {
    setSelectedCity(city);
    if (city) {
      localStorage.setItem("sewakhoj_city", city);
      setSelectedLocation(null);
      localStorage.removeItem("sewakhoj_specific_location");
    } else {
      localStorage.removeItem("sewakhoj_city");
      localStorage.removeItem("sewakhoj_specific_location");
    }
  };

  const setSelectedLocationWithStorage = (location: string | null) => {
    setSelectedLocation(location);
    if (location) {
      localStorage.setItem("sewakhoj_specific_location", location);
    } else {
      localStorage.removeItem("sewakhoj_specific_location");
    }
  };

  const skipLocation = () => {
    sessionStorage.setItem("sewakhoj_location_modal_shown", "true");
    setShowModal(false);
  };

  const getLocationsForCityContext = useCallback((cityName: string): string[] => {
    const city = cities.find(c => c.name === cityName);
    return city ? city.locations : [];
  }, [cities]);

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation: setLocationWithStorage,
        selectedCity,
        setSelectedCity: setSelectedCityWithStorage,
        selectedLocation,
        setSelectedLocation: setSelectedLocationWithStorage,
        isLocationSet,
        showModal,
        setShowModal,
        skipLocation,
        getLocationsForCity: getLocationsForCityContext,
        cities,
        citiesLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

// Helper: get all city names from current cities state (for external use)
export const getCities = (): string[] => {
  return FALLBACK_CITIES.map(city => city.name);
};

// Helper: get locations for a city from fallback (for external use)
export const getLocationsForCity = (cityName: string): string[] => {
  const city = FALLBACK_CITIES.find(c => c.name === cityName);
  return city ? city.locations : [];
};
