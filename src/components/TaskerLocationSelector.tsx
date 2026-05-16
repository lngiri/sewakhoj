"use client";

import { useState } from "react";
import { MapPin, Navigation, Search } from "lucide-react";
import { useLocation } from "@/context/LocationContext";

interface LocationSelectorProps {
  onLocationSelect: (location: { 
    district?: string; 
    ward?: number;
    lat?: number;
    lng?: number;
  }) => void;
  defaultValue?: { district?: string; ward?: number };
}

export default function LocationSelector({ onLocationSelect, defaultValue }: LocationSelectorProps) {
  const { cities } = useLocation();
  const [useGPSDetect, setUseGPSDetect] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState(defaultValue?.district || "");
  const [selectedWard, setSelectedWard] = useState(defaultValue?.ward || "");
  const [gpsError, setGpsError] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  const detectLocation = () => {
    setIsDetecting(true);
    setGpsError("");
    
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSelect({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsDetecting(false);
      },
      (error) => {
        setGpsError(error.message || "Unable to detect location");
        setUseGPSDetect(false);
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const districts = cities.map(c => c.name);
  const wards = selectedDistrict ? Array.from({ length: 32 }, (_, i) => i + 1) : [];

  const handleSave = () => {
    onLocationSelect({
      district: selectedDistrict || undefined,
      ward: typeof selectedWard === 'number' ? selectedWard : undefined
    });
  };

  return (
    <div className="space-y-4">
      {useGPSDetect ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
          <Navigation className="w-10 h-10 text-sewakhoj-red mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900 mb-2">Allow GPS Detection</p>
          <p className="text-xs text-gray-500 mb-4">We'll find taskers near you instantly</p>
          <button
            onClick={detectLocation}
            disabled={isDetecting}
            className="px-6 py-2.5 bg-sewakhoj-red text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {isDetecting ? "Detecting..." : "Detect My Location"}
          </button>
          {gpsError && (
            <p className="text-red-500 text-xs mt-2">{gpsError}</p>
          )}
          <button
            onClick={() => setUseGPSDetect(false)}
            className="text-xs text-gray-400 underline mt-3"
          >
            Enter manually instead
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedWard("");
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-sewakhoj-red"
            >
              <option value="">Select District</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Ward Number
            </label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(Number(e.target.value))}
              disabled={!selectedDistrict}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:border-sewakhoj-red disabled:opacity-50"
            >
              <option value="">Select Ward</option>
              {wards.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={!selectedDistrict || !selectedWard}
            className="w-full py-3 bg-sewakhoj-red text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
          >
            Save Location
          </button>

          <button
            onClick={() => setUseGPSDetect(true)}
            className="text-xs text-gray-400 underline"
          >
            Use GPS instead
          </button>
        </div>
      )}
    </div>
  );
}