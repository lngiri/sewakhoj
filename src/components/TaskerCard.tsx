import Link from "next/link";

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
  isOnline?: boolean;
  badges?: ("Verified" | "Top Rated" | "New")[];
  onBook?: () => void;
}

export default function TaskerCard({
  id, name, initials, role, location, experience, rating,
  jobsDone, monthlyEarn, responseTime, bio, ratePerHour,
  isOnline = false, badges = [], onBook,
}: TaskerCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 w-full max-w-sm shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start gap-3 mb-4">
        <Link href={`/tasker/${id}`} className="relative shrink-0 block hover:opacity-90 transition-opacity">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-sm font-medium text-emerald-900 border border-emerald-100 shadow-sm">
            {initials}
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/tasker/${id}`} className="block group/name">
            <p className="text-sm font-medium text-gray-900 truncate group-hover/name:text-emerald-700 transition-colors">{name}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{role} · {location}</p>
          </Link>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-1 shrink-0 shadow-sm">
          <span className="text-amber-500 text-[10px]">★</span>
          <span className="text-[11px] font-medium text-amber-800">{rating}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center mb-4">
        {badges.includes("Verified") && (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">Verified</span>
        )}
        {badges.includes("Top Rated") && (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Top Rated</span>
        )}
        {badges.includes("New") && (
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-800 border border-violet-200">New</span>
        )}
        <span className="text-xs text-gray-400">{experience} years exp</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4">
        {[
          { val: jobsDone, lbl: "Jobs Done" },
          { val: monthlyEarn, lbl: "Monthly Earn" },
          { val: responseTime, lbl: "Response" },
        ].map((s) => (
          <div key={s.lbl} className="py-2.5 text-center">
            <span className="block text-sm font-medium text-gray-900">{s.val}</span>
            <span className="block text-[10px] text-gray-400 mt-0.5">{s.lbl}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{bio}</p>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-medium text-emerald-700">Rs {ratePerHour}</span>
          <span className="text-xs text-gray-400"> / hour</span>
        </div>
        <button
          onClick={onBook}
          className="text-xs font-medium px-5 py-2.5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95 transition-all"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
