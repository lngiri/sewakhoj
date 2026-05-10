"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/lib/supabase";
import "leaflet/dist/leaflet.css";

// Fix leaflet icon issue
const taskerIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const idleIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const demandIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function LiveMap() {
  const [taskers, setTaskers] = useState<any[]>([]);
  const [marketTasks, setMarketTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTaskers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tasker-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'taskers' },
        (payload: any) => {
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
    const [taskerRes, taskRes] = await Promise.all([
      supabase
        .from('taskers')
        .select(`
          id, last_lat, last_long, last_seen_at, status, trust_score, is_elite,
          users (full_name, avatar_url, phone)
        `)
        .eq('status', 'active')
        .not('last_lat', 'is', null),
      supabase
        .from('market_tasks')
        .select('*')
        .eq('status', 'open')
        .not('last_lat', 'is', null) // We need coordinates for demand heatmap
    ]);

    if (taskerRes.data) setTaskers(taskerRes.data);
    if (taskRes.data) setMarketTasks(taskRes.data);
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
            
            const isIdle = new Date().getTime() - new Date(tasker.last_seen_at).getTime() > 20 * 60000; // 20 mins
            
            return (
              <Marker 
                key={tasker.id} 
                position={[tasker.last_lat, tasker.last_long]} 
                icon={isIdle ? idleIcon : taskerIcon}
              >
                <Popup>
                  <div className="flex flex-col gap-2 p-1 min-w-[150px]">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shadow-sm">
                            {user?.avatar_url ? <img src={user.avatar_url} alt="Tasker" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-gray-400 bg-gray-50">T</div>}
                        </div>
                        <div>
                           <p className="font-black text-sm text-gray-900 leading-none mb-1">{user?.full_name}</p>
                           {tasker.is_elite && <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Elite Pro</span>}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 space-y-1">
                       <div className="flex justify-between items-center text-[9px] font-bold">
                          <span className="text-gray-400 uppercase">Trust Score</span>
                          <span className={tasker.trust_score > 70 ? 'text-green-600' : 'text-amber-600'}>{tasker.trust_score}%</span>
                       </div>
                       <div className="flex justify-between items-center text-[9px] font-bold">
                          <span className="text-gray-400 uppercase">Status</span>
                          <span className={isIdle ? 'text-amber-500 animate-pulse' : 'text-green-500'}>{isIdle ? '● IDLE' : '● ACTIVE'}</span>
                       </div>
                    </div>
                    <div className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">
                        Updated: {new Date(tasker.last_seen_at).toLocaleTimeString()}
                    </div>
                    <a 
                        href={`tel:${user?.phone}`}
                        className="bg-gray-900 text-white text-center py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-sewakhoj-red transition-all"
                    >
                        Contact Now
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
        })}

        {/* Demand Markers (Heatmap Simulation) */}
        {marketTasks.map((task) => (
           <Marker 
             key={task.id} 
             position={[task.last_lat, task.last_long]} 
             icon={demandIcon}
           >
             <Popup>
               <div className="p-2 min-w-[120px]">
                  <p className="text-[10px] font-black uppercase text-blue-600 mb-1">🔥 LIVE DEMAND</p>
                  <p className="font-black text-sm text-gray-900">{task.title}</p>
                  <p className="text-[10px] text-gray-400 font-bold mb-3 italic">"Need {task.title} ASAP"</p>
                  <div className="text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 p-1.5 rounded text-center">
                     Rs {task.budget_amount || 'Negotiable'}
                  </div>
               </div>
             </Popup>
           </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
