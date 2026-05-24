"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Megaphone, X, Info, AlertTriangle, CheckCircle, Flame } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  target_role: string;
}

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchAnnouncements() {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (!error && data) {
        // Filter by role if necessary
        const filtered = data.filter((a: any) =>
          a.target_role === 'all' ||
          (user && a.target_role === user.role)
        );
        setAnnouncements(filtered);
      }
    }
    fetchAnnouncements();
  }, [user]);

  if (!isVisible || announcements.length === 0) return null;

  const current = announcements[currentIndex];

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-600 text-white';
      case 'warning': return 'bg-amber-500 text-white';
      case 'danger': return 'bg-red-600 text-white';
      case 'info':
      default: return 'bg-blue-600 text-white';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'danger': return <Flame className="w-4 h-4" />;
      case 'info':
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className={`relative ${getTypeStyles(current.type)} py-2 px-4 shadow-lg animate-in slide-in-from-top duration-500 z-[60]`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          {getIcon(current.type)}
          <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] truncate">
            <span className="opacity-80 hidden sm:inline">{current.title}:</span> {current.message}
          </p>
        </div>

        {announcements.length > 1 && (
          <button
            onClick={() => setCurrentIndex((currentIndex + 1) % announcements.length)}
            className="text-[10px] font-bold underline opacity-80 hover:opacity-100 ml-4 uppercase tracking-widest"
          >
            Next
          </button>
        )}
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
