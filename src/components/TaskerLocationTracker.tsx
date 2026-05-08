"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

/**
 * TaskerLocationTracker
 * Synchronizes the tasker's current GPS coordinates to Supabase.
 * Rendered globally in the RootLayout but only active for Taskers.
 */
export default function TaskerLocationTracker() {
  const { user } = useAuth();
  const watchId = useRef<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Only track if user is a tasker and NOT on an admin page
    const isTasker = user?.user_metadata?.role === 'tasker';
    const isAdminRoute = pathname?.startsWith('/admin');
    
    if (!isTasker || isAdminRoute || !user) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    const updateLocation = async (position: GeolocationPosition) => {
      try {
        // Upsert live location to dedicated tracking table
        await supabase
          .from('tasker_locations')
          .upsert({
            tasker_id: user.id,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            last_updated: new Date().toISOString()
          }, { onConflict: 'tasker_id' });
      } catch (err) {
        console.error("Failed to sync live location", err);
      }
    };

    if ('geolocation' in navigator) {
      // Use watchPosition for high-frequency updates during active sessions
      watchId.current = navigator.geolocation.watchPosition(
        updateLocation,
        (err) => console.warn("Geo Watch Error:", err),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [user, pathname]);

  return null; 
}
