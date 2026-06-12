"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface City {
  name: string;
  locations: string[];
}

interface LocationContextType {
  selectedCity: string | null;
  setSelectedCity: (city: string | null) => void;
  cities: City[];
  citiesLoading: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  getLocationsForCity: (cityName: string) => string[];
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
        console.warn("Failed to fetch cities from DB:", err);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }
    fetchCities();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const savedCity = localStorage.getItem("sewakhoj_city");
    if (savedCity) {
      setSelectedCity(savedCity);
    }
  }, []);

  const setSelectedCityWithStorage = (city: string | null) => {
    setSelectedCity(city);
    if (city) {
      localStorage.setItem("sewakhoj_city", city);
    } else {
      localStorage.removeItem("sewakhoj_city");
    }
  };

  const getLocationsForCityContext = useCallback((cityName: string): string[] => {
    const city = cities.find(c => c.name === cityName);
    return city ? city.locations : [];
  }, [cities]);

  return (
    <LocationContext.Provider
      value={{
        selectedCity,
        setSelectedCity: setSelectedCityWithStorage,
        cities,
        citiesLoading,
        showModal,
        setShowModal,
        getLocationsForCity: getLocationsForCityContext,
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
