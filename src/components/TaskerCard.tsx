"use client";
import Link from "next/link";
import { Heart } from "lucide-react";

interface TaskerCardProps {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  experience: number;
  rating: number;
  jobsDone: number;
  monthlyEarn: string;
  responseTime: string;
  bio: string;
  ratePerHour: number;
  avatarUrl?: string | null;
  isOnline?: boolean;
  isFavorited?: boolean;
  badges?: ("Verified" | "Top Rated" | "New")[];
  onBook?: () => void;
  bookingHref?: string;
  onFavoriteToggle?: () => void;
}

export default function TaskerCard({
   id, name, initials, role, location, experience, rating = 5.0,
   jobsDone, monthlyEarn, responseTime, bio, ratePerHour,
   avatarUrl, isOnline = false, isFavorited = false, badges = [], onBook, bookingHref, onFavoriteToggle,
 }: TaskerCardProps) {
   // Personalize bio if it matches the detected placeholder
   const displayBio = (bio === "Professional and reliable service provider in Nepal" || !bio)
     ? `Expert ${role} based in ${location} with ${experience} years of professional experience. Committed to delivering high-quality results for every task.`
     : bio;

   return (
<div 
        className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-sm hover:shadow-md transition-all group relative"
        role="article"
        aria-labelledby={`tasker-name-${id}`}
      >
       {/* Absolute Link Overlay for the whole card */}
       <Link 
         href={`/tasker/${id}`} 
         className="absolute inset-0 z-0 rounded-2xl"
         aria-label={`View profile of ${name}, ${role} in ${location}`}
       />

<div 
          className="flex items-start gap-3 mb-4 relative z-10 pointer-events-none"
          aria-label={`Tasker ${name}, ${experience} years experience`}
        >
          <div className="relative shrink-0">
            <div 
              className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-sm font-bold text-emerald-900 border border-emerald-100 shadow-sm overflow-hidden"
              role="img"
              aria-label={`${name}'s avatar`}
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={`${name}'s profile picture`} 
                  loading="lazy" 
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'T')}&background=random`; }}
                />
              ) : (
                initials
              )}
            </div>
            {isOnline && (
              <span 
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                role="status"
                aria-label="Online now"
              />
            )}
          </div>
        <div className="flex-1 min-w-0">
          <div className="block group/name">
            <p className="text-sm font-black text-gray-900 truncate group-hover/name:text-emerald-700 transition-colors">{name}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 font-bold uppercase tracking-tight">{role} · {location}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavoriteToggle?.();
            }}
            className={`p-2 rounded-full transition-all active:scale-90 relative z-20 ${isFavorited ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-400'}`}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-1 shrink-0 shadow-sm" aria-label={`Rating: ${rating} stars`}>
            <span className="text-amber-500 text-[10px]">★</span>
            <span className="text-[11px] font-black text-amber-800">{rating || '5.0'}</span>
          </div>
        </div>
      </div>

<div 
          className="flex flex-wrap gap-1.5 items-center mb-4 relative z-10 pointer-events-none"
          role="list"
          aria-label="Tasker badges and experience"
        >
          {badges.includes("Verified") && (
            <span 
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200"
              role="listitem"
              aria-label="Verified badge"
            >
              Verified · प्रमाणित
            </span>
          )}
          {badges.includes("Top Rated") && (
            <span 
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200"
              role="listitem"
              aria-label="Top Rated badge"
            >
              Top Rated · उत्कृष्ट
            </span>
          )}
          {badges.includes("New") && (
            <span 
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800 border border-violet-200"
              role="listitem"
              aria-label="New tasker badge"
            >
              New · नयाँ
            </span>
          )}
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider" role="listitem">
            {experience}y Experience · {experience} वर्ष अनुभव
          </span>
        </div>

<div 
          className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4 relative z-10 pointer-events-none"
          role="table"
          aria-label="Tasker statistics"
        >
          {[
            { val: jobsDone, lbl: "Jobs Done", lblNp: "सम्पन्न काम" },
            { val: monthlyEarn, lbl: "Monthly Earn", lblNp: "मासिक आम्दानी" },
            { val: responseTime, lbl: "Response", lblNp: "प्रतिक्रिया" },
          ].map((s) => (
            <div 
              key={s.lbl} 
              className="py-2.5 text-center"
              role="cell"
              aria-label={`${s.lbl}: ${s.val}`}
            >
              <span className="block text-sm font-black text-gray-900">{s.val}</span>
              <span className="block text-[8px] font-bold uppercase text-gray-400 tracking-tighter mt-0.5">{s.lbl}</span>
              <span className="block text-[7px] font-medium text-gray-300 uppercase tracking-tighter -mt-0.5">{s.lblNp}</span>
            </div>
          ))}
        </div>

      <p className="text-[13px] text-gray-500 leading-relaxed mb-5 line-clamp-2 italic font-medium relative z-10 pointer-events-none">"{displayBio}"</p>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50 relative z-10">
        <div className="pointer-events-none">
          <span className="text-lg font-black text-emerald-700">Rs {ratePerHour}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"> / hr</span>
        </div>
        {bookingHref ? (
          <Link
            href={bookingHref}
            className="flex flex-col items-center justify-center px-6 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95 transition-all shadow-md shadow-emerald-100 relative z-20 group/btn"
          >
            <span className="text-[11px] font-black uppercase tracking-widest">Book Now</span>
            <span className="text-[9px] font-bold opacity-70 group-hover/btn:opacity-100 transition-opacity">बुक गर्नुहोस्</span>
          </Link>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBook?.();
            }}
            aria-label={`Book ${name} now`}
            className="flex flex-col items-center justify-center px-6 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95 transition-all shadow-md shadow-emerald-100 relative z-20 group/btn"
          >
            <span className="text-[11px] font-black uppercase tracking-widest">Book Now</span>
            <span className="text-[9px] font-bold opacity-70 group-hover/btn:opacity-100 transition-opacity">बुक गर्नुहोस्</span>
          </button>
        )}
      </div>
    </div>
  );
}
