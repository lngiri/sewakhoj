"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Hierarchical structure: Cities with their specific locations
const NEPAL_CITIES: City[] = [
  {
    name: "Kathmandu",
    locations: [
      "Baneshwor", "Thamel", "Lazimpat", "Baluwatar", "Maharajgunj",
      "Sanepa", "Jhamsikhel", "Kupondole", "Kalimati", "New Baneshwor",
      "Koteshwor", "Boudha", "Chabahil", "Dillibazar", "Putalisadak",
      "Bagbazar", "Asan", "Indrachowk", "New Road", "Durbar Marg",
      "Kamaladi", "Tripureshwor", "Kalanki", "Swayambhu", "Naxal", "Bansbari"
    ]
  },
  {
    name: "Lalitpur",
    locations: [
      "Patan", "Pulchowk", "Jawalakhel", "Patan Dhoka", "Satdobato",
      "Lagankhel", "Sanepa", "Jhamsikhel", "Kupondole"
    ]
  },
  {
    name: "Bhaktapur",
    locations: [
      "Bhaktapur", "Suryabinayak", "Bode", "Thimi", "Siddhapur",
      "Changunarayan", "Madhyapur Thimi"
    ]
  },
  {
    name: "Pokhara",
    locations: [
      "Lakeside", "Chipledhunga", "Mahendrapul", "Baidam", "Hemja"
    ]
  },
  {
    name: "Biratnagar",
    locations: [
      "Biratnagar"
    ]
  },
  {
    name: "Dharan",
    locations: [
      "Dharan"
    ]
  },
  {
    name: "Itahari",
    locations: [
      "Itahari"
    ]
  },
  {
    name: "Inaruwa",
    locations: [
      "Inaruwa"
    ]
  },
  {
    name: "Birtamod",
    locations: [
      "Birtamod"
    ]
  },
  {
    name: "Damak",
    locations: [
      "Damak"
    ]
  },
  {
    name: "Butwal",
    locations: [
      "Butwal"
    ]
  },
  {
    name: "Bhairahawa",
    locations: [
      "Bhairahawa"
    ]
  },
  {
    name: "Nepalgunj",
    locations: [
      "Nepalgunj"
    ]
  },
  {
    name: "Birgunj",
    locations: [
      "Birgunj"
    ]
  },
  {
    name: "Hetauda",
    locations: [
      "Hetauda"
    ]
  },
  {
    name: "Janakpur",
    locations: [
      "Janakpur"
    ]
  },
  {
    name: "Chitwan",
    locations: [
      "Bharatpur", "Narayanghat", "Ratnanagar", "Tadi", "Sauraha"
    ]
  },
  {
    name: "Dhading",
    locations: [
      "Dhading"
    ]
  },
  {
    name: "Nuwakot",
    locations: [
      "Nuwakot"
    ]
  },
  {
    name: "Kirtipur",
    locations: [
      "Kirtipur", "Panga"
    ]
  }
];

// Helper function to get all city names
export const getCities = (): string[] => {
  return NEPAL_CITIES.map(city => city.name);
};

// Helper function to get locations for a specific city
export const getLocationsForCity = (cityName: string): string[] => {
  const city = NEPAL_CITIES.find(c => c.name === cityName);
  return city ? city.locations : [];
};

// Legacy export for backward compatibility
export const NEPAL_LOCALITIES = NEPAL_CITIES.flatMap(city => 
  [city.name, ...city.locations]
);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLocationSet, setIsLocationSet] = useState(false);

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

    // Check if we should show the modal (only once per session)
    const hasShownModal = sessionStorage.getItem("sewakhoj_location_modal_shown");
    if (!hasShownModal && !savedLocation) {
      // Don't show immediately - wait for auth state
      // The modal will be triggered by auth state change
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
    // Reset specific location when city changes
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

  const getLocationsForCityContext = (city: string): string[] => {
    return getLocationsForCity(city);
  };

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

export { NEPAL_CITIES };
