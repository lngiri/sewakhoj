"use client";
import Link from "next/link";
import { Heart, Star, MapPin, Briefcase, Clock, ShieldCheck, Zap, Navigation } from "lucide-react";

interface TaskerCardProps {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  experience?: number;
  rating?: number;
  jobsDone?: number;
  monthlyEarn?: string;
  responseTime?: string;
  bio: string;
  ratePerHour: number;
  avatarUrl?: string | null;
  isOnline?: boolean;
  isFavorited?: boolean;
  badges?: ("Verified" | "Top Rated" | "New")[];
  onBook?: () => void;
  bookingHref?: string;
  onFavoriteToggle?: () => void;
  distanceKm?: number | null;
  trustScore?: number | null;
}

export default function TaskerCard({
  id, name, initials, role, location, experience = 0, rating = 5.0,
  jobsDone = 0, responseTime = "--", monthlyEarn = "", bio, ratePerHour,
  avatarUrl, isOnline = false, isFavorited = false, badges = [], onBook, bookingHref, onFavoriteToggle,
  distanceKm = null, trustScore = null,
}: TaskerCardProps) {

  const displayBio = bio || null;

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-gray-200/60 dark:border-slate-800 rounded-[24px] p-5 w-full max-w-sm shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-300/60 transition-all duration-300 group relative flex flex-col gap-5"
      role="article"
    >
      <Link
        href={bookingHref || `/tasker/${id}`}
        className="absolute inset-0 z-0 rounded-[24px]"
        aria-label={`View profile of ${name}`}
      />

      {/* Header: Avatar, Name, Location, Fav */}
      <div className="flex items-start gap-4 relative z-10 pointer-events-none">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-[18px] bg-gray-50 flex items-center justify-center text-xl font-black text-gray-400 border border-gray-100 shadow-inner overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'T')}&background=random`; }}
              />
            ) : initials}
          </div>
          {isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-[3px] border-white shadow-sm" />
          )}
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-black text-gray-900 dark:text-white truncate group-hover:text-sewakhoj-red transition-colors">{name}</h3>
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-black text-amber-700 dark:text-amber-400">{rating.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 truncate">{role}</p>
          <div className="flex items-center gap-1 mt-1 text-gray-400 dark:text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider truncate">{location}</span>
            {distanceKm !== null && (
              <span className="text-[10px] font-black text-sewakhoj-red ml-1 flex items-center gap-0.5">
                <Navigation className="w-3 h-3" />
                {distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)}m` : `${distanceKm.toFixed(1)} km`}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteToggle?.();
          }}
          className="absolute -top-1 -right-1 p-2 rounded-full transition-all active:scale-90 z-20 hover:bg-gray-50 dark:hover:bg-slate-800 pointer-events-auto"
        >
          <Heart className={`w-5 h-5 transition-colors ${isFavorited ? 'fill-sewakhoj-red text-sewakhoj-red' : 'text-gray-300 hover:text-red-400'}`} />
        </button>
      </div>

      {/* Badges */}
      {(badges && badges.length > 0) || trustScore !== null ? (
        <div className="flex flex-wrap gap-2 relative z-10 pointer-events-none">
          {badges.includes("Verified") && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </span>
          )}
          {badges.includes("Top Rated") && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-500/20">
              <Zap className="w-3.5 h-3.5" /> Top Rated
            </span>
          )}
          {badges.includes("New") && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> New
            </span>
          )}
          {trustScore !== null && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
              trustScore >= 80 ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' :
              trustScore >= 60 ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
              trustScore >= 40 ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
              'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" /> Trust {trustScore}
            </span>
          )}
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2.5 relative z-10 pointer-events-none">
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-gray-100 dark:border-slate-700/50">
          <Briefcase className="w-4 h-4 text-gray-400 mx-auto mb-1.5" />
          <span className="block text-sm font-black text-gray-900 dark:text-white">{jobsDone}</span>
          <span className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mt-0.5">Jobs</span>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-gray-100 dark:border-slate-700/50">
          <Star className="w-4 h-4 text-gray-400 mx-auto mb-1.5" />
          <span className="block text-sm font-black text-gray-900 dark:text-white">{experience}y</span>
          <span className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mt-0.5">Exp</span>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-gray-100 dark:border-slate-700/50">
          <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1.5" />
          <span className="block text-sm font-black text-gray-900 dark:text-white">{responseTime}</span>
          <span className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mt-0.5">Res</span>
        </div>
      </div>

      {displayBio && (
        <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 relative z-10 pointer-events-none font-medium">
          {displayBio}
        </p>
      )}

      {/* Footer: Price & Action */}
      <div className="flex items-center justify-between pt-5 mt-auto border-t border-gray-100 dark:border-slate-800 relative z-10">
        <div className="pointer-events-none flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Rate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-gray-900 dark:text-white">Rs {ratePerHour}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase">/hr</span>
          </div>
        </div>

        {bookingHref ? (
          <Link
            href={bookingHref}
            className="px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-sewakhoj-red dark:hover:bg-sewakhoj-red dark:hover:text-white active:scale-95 transition-all shadow-md relative z-20 flex items-center justify-center font-black text-[11px] uppercase tracking-widest"
          >
            Book Now
          </Link>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBook?.();
            }}
            aria-label={`Book ${name} now`}
            className="px-6 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-sewakhoj-red dark:hover:bg-sewakhoj-red dark:hover:text-white active:scale-95 transition-all shadow-md relative z-20 flex items-center justify-center font-black text-[11px] uppercase tracking-widest"
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
}
