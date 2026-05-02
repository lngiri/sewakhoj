"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/lib/supabase";
import "leaflet/dist/leaflet.css";

// Fix leaflet icon issue
const taskerIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function LiveMap() {
  const [taskers, setTaskers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTaskers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tasker-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taskers' },
        (payload) => {
          console.log('Change received!', payload);
          fetchActiveTaskers(); // Refresh on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveTaskers = async () => {
    const { data, error } = await supabase
      .from('taskers')
      .select(`
        id,
        last_lat,
        last_long,
        last_seen_at,
        status,
        users (full_name, avatar_url, phone)
      `)
      .eq('status', 'active')
      .not('last_lat', 'is', null);

    if (data) {
      setTaskers(data);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading Map...</div>;

  const center: [number, number] = [27.7172, 85.3240]; // Kathmandu

  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {taskers.map((tasker) => {
            const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
            if (!tasker.last_lat || !tasker.last_long) return null;
            
            return (
              <Marker 
                key={tasker.id} 
                position={[tasker.last_lat, tasker.last_long]} 
                icon={taskerIcon}
              >
                <Popup>
                  <div className="flex flex-col gap-2 p-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden">
                            {user?.avatar_url && <img src={user.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                        <span className="font-bold text-sm">{user?.full_name}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase font-black">
                        Last seen: {new Date(tasker.last_seen_at).toLocaleTimeString()}
                    </div>
                    <a 
                        href={`tel:${user?.phone}`}
                        className="bg-sewakhoj-red text-white text-center py-1 rounded text-xs font-bold"
                    >
                        Call Tasker
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
        })}
      </MapContainer>
    </div>
  );
}
