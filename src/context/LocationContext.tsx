"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface LocationData {
  name: string;
  latitude?: number;
  longitude?: number;
}

interface LocationContextType {
  location: LocationData | null;
  setLocation: (location: LocationData | null) => void;
  isLocationSet: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  skipLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const NEPAL_LOCALITIES = [
  "Baneshwor", "Patan", "Bhaktapur", "Thamel", "Lazimpat", "Baluwatar",
  "Maharajgunj", "Sanepa", "Jhamsikhel", "Kupondole", "Kalimati", "New Baneshwor",
  "Koteshwor", "Boudha", "Chabahil", "Baluwatar", "Dillibazar", "Putalisadak",
  "Bagbazar", "Asan", "Indrachowk", "New Road", "Durbar Marg", "Kamaladi",
  "Tripureshwor", "Kalanki", "Swayambhu", "Baluwatar", "Naxal", "Bansbari",
  "Maharajgunj", "Baluwatar", "Sanepa", "Jhamsikhel", "Kupondole", "Kalimati",
  "Lalitpur", "Pulchowk", "Jawalakhel", "Patan Dhoka", "Satdobato", "Lagankhel",
  "Bhaktapur", "Suryabinayak", "Bode", "Thimi", "Siddhapur", "Changunarayan",
  "Kirtipur", "Panga", "Bhaktapur", "Madhyapur Thimi", "Dhading", "Nuwakot",
  "Pokhara", "Lakeside", "Chipledhunga", "Mahendrapul", "Baidam", "Hemja",
  "Biratnagar", "Dharan", "Itahari", "Inaruwa", "Birtamod", "Damak",
  "Butwal", "Bhairahawa", "Nepalgunj", "Birgunj", "Hetauda", "Janakpur",
  "Chitwan", "Bharatpur", "Narayanghat", "Ratnanagar", "Tadi", "Sauraha"
];

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLocationSet, setIsLocationSet] = useState(false);

  useEffect(() => {
    // Load location from localStorage on mount
    const savedLocation = localStorage.getItem("sewakhoj_location");
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setLocation(parsed);
        setIsLocationSet(true);
      } catch (e) {
        console.error("Failed to parse saved location", e);
      }
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

  const skipLocation = () => {
    sessionStorage.setItem("sewakhoj_location_modal_shown", "true");
    setShowModal(false);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation: setLocationWithStorage,
        isLocationSet,
        showModal,
        setShowModal,
        skipLocation,
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

export { NEPAL_LOCALITIES };
