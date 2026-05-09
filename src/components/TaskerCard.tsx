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
  onFavoriteToggle?: () => void;
}

export default function TaskerCard({
  id, name, initials, role, location, experience, rating = 5.0,
  jobsDone, monthlyEarn, responseTime, bio, ratePerHour,
  avatarUrl, isOnline = false, isFavorited = false, badges = [], onBook, onFavoriteToggle,
}: TaskerCardProps) {
  // Personalize bio if it matches the detected placeholder
  const displayBio = (bio === "Professional and reliable service provider in Nepal" || !bio)
    ? `Expert ${role} based in ${location} with ${experience} years of professional experience. Committed to delivering high-quality results for every task.`
    : bio;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 w-full max-w-sm shadow-sm hover:shadow-md transition-all group relative">
      {/* Absolute Link Overlay for the whole card */}
      <Link 
        href={`/tasker/${id}`} 
        className="absolute inset-0 z-0 rounded-2xl"
        aria-label={`View profile of ${name}`}
      />

      <div className="flex items-start gap-3 mb-4 relative z-10 pointer-events-none">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-sm font-bold text-emerald-900 border border-emerald-100 shadow-sm overflow-hidden">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={`${name}'s profile`} 
                loading="lazy" 
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
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

      <div className="flex flex-wrap gap-1.5 items-center mb-4 relative z-10 pointer-events-none">
        {badges.includes("Verified") && (
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">Verified</span>
        )}
        {badges.includes("Top Rated") && (
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">Top Rated</span>
        )}
        {badges.includes("New") && (
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-violet-50 text-violet-800 border border-violet-200">New</span>
        )}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{experience}y Experience</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4 relative z-10 pointer-events-none">
        {[
          { val: jobsDone, lbl: "Jobs Done" },
          { val: monthlyEarn, lbl: "Monthly Earn" },
          { val: responseTime, lbl: "Response" },
        ].map((s) => (
          <div key={s.lbl} className="py-2.5 text-center">
            <span className="block text-sm font-black text-gray-900">{s.val}</span>
            <span className="block text-[9px] font-bold uppercase text-gray-400 tracking-tighter mt-0.5">{s.lbl}</span>
          </div>
        ))}
      </div>

      <p className="text-[13px] text-gray-500 leading-relaxed mb-5 line-clamp-2 italic font-medium relative z-10 pointer-events-none">"{displayBio}"</p>

      <div className="flex items-center justify-between pt-2 border-t border-gray-50 relative z-10">
        <div className="pointer-events-none">
          <span className="text-lg font-black text-emerald-700">Rs {ratePerHour}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"> / hr</span>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBook?.();
          }}
          aria-label={`Book ${name} now`}
          className="text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95 transition-all shadow-md shadow-emerald-100 relative z-20"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
