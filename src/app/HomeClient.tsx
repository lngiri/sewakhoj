"use client";

import Link from "next/link";
import { ArrowRight, Shield, MapPin, ChevronDown, CheckCircle2, Clock, Star, UserPlus } from "lucide-react";
import { services } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import LocationModal from "@/components/LocationModal";

export default function Home() {
  const { user } = useAuth();
  const { selectedCity, setShowModal } = useLocation();

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero Section */}
      <header
        className="hero bg-gradient-to-br from-blue-50 to-white py-12 md:py-20"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-gray-900 mb-6 leading-none tracking-tighter">
            <span className="block mb-2">Find Skilled Taskers Near You</span>
          </h1>
          <p className="text-sm md:text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed font-medium uppercase tracking-widest">
            Book verified taskers for home services, repairs, cleaning & more.
          </p>

          {/* 2-Part Search: Location + Service */}
          <div className="max-w-3xl mx-auto bg-white p-2 sm:p-3 rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-blue-50/50 mb-12 relative z-30">
            <div className="flex flex-col md:flex-row gap-2">
              {/* Location Part */}
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 px-6 py-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all text-left md:min-w-[200px]"
              >
                <div className="w-8 h-8 rounded-xl bg-sewakhoj-red/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-sewakhoj-red" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Location</p>
                  <p className="text-[13px] font-bold text-gray-900 truncate">
                    {selectedCity || "Set Location"}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-300 ml-auto" />
              </button>

              {/* Service Part */}
              <div className="flex-1">
                <div className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-left font-medium text-gray-400">
                  What service do you need?
                </div>
              </div>
            </div>
          </div>

          {/* Quick Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 px-2">
            {[
              { id: 'plumbing', label: 'Plumbing', emoji: '🔧' },
              { id: 'cleaning', label: 'Cleaning', emoji: '🧹' },
              { id: 'electrical', label: 'Electric', emoji: '⚡' },
              { id: 'tutoring', label: 'Tutor', emoji: '📚' },
              { id: 'painting', label: 'Painting', emoji: '🎨' }
            ].map(chip => (
              <Link
                key={chip.id}
                href={`/browse?service=${chip.id}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-gray-100 text-[11px] font-bold text-gray-600 hover:border-sewakhoj-red hover:text-sewakhoj-red transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Services Section */}
      <section
        id="services"
        className="py-12 md:py-20 bg-white"
        aria-labelledby="services-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="services-heading"
            className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight"
          >
            Our Services
          </h2>
          <p className="text-sm md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Choose from a wide range of professional services
          </p>
          <div
            className="services-grid grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            role="list"
          >
            {services.map((service) => {
              const getIcon = (s: any) => {
                if (s.emoji) return s.emoji;
                if (s.icon) return s.icon;
                const name = (s.nameEn || s.name || "").toLowerCase();
                const iconMap: Record<string, string> = {
                  'carpentry': '🔨', 'woodwork': '🔨', 'furniture': '🔨',
                  'painting': '🎨', 'paint': '🎨', 'wall paint': '🎨',
                  'plumbing': '🔧', 'plumber': '🔧', 'pipes': '🔧', 'leak': '🔧',
                  'cleaning': '🧹', 'clean': '🧹', 'maid': '🧹',
                  'electric': '⚡', 'electrical': '⚡', 'wiring': '⚡', 'electrician': '⚡',
                  'move': '📦', 'moving': '📦', 'shifting': '📦', 'relocation': '📦',
                  'garden': '🌱', 'gardening': '🌱', 'lawn': '🌱', 'landscaping': '🌱',
                  'repair': '🛠️', 'fix': '🛠️', 'maintenance': '🛠️', 'handyman': '🛠️',
                  'tutoring': '📚', 'tutor': '📚', 'teaching': '📚', 'education': '📚',
                  'cooking': '🍳', 'chef': '🍳', 'catering': '🍳', 'meal prep': '🍳',
                  'tech': '💻', 'computer': '💻', 'it': '💻', 'software': '💻',
                  'driver': '🚗', 'driving': '🚗', 'transport': '🚗',
                  'caretaking': '👨‍⚕️', 'elderly': '👨‍⚕️', 'nurse': '👨‍⚕️',
                  'pet': '🐕', 'dog': '🐕', 'cat': '🐕', 'pet care': '🐕',
                };
                for (const [key, emoji] of Object.entries(iconMap)) {
                  if (name.includes(key)) return emoji;
                }
                return '🔧';
              };

              return (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="service-card h-full flex flex-col bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-5 md:p-6 text-center hover:shadow-2xl hover:border-sewakhoj-red hover:from-red-50 hover:to-white transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                  role="listitem"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 bg-gradient-to-br from-sewakhoj-red/10 to-sewakhoj-red/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl md:text-4xl">
                      {getIcon(service)}
                    </span>
                  </div>
                  <div className="group-hover:text-sewakhoj-red transition-colors">
                    <h3 className="font-bold text-gray-900 text-sm md:text-lg leading-tight">
                      {service.nameEn || service.name || 'Service'}
                    </h3>
                    <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-70 group-hover:text-sewakhoj-red/70 transition-colors">
                      {service.nameNp || 'सेवा'}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-600 line-clamp-2">
                    {service.descriptionEn || service.description || ''}
                  </p>
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/services"
              className="btn-secondary inline-flex items-center gap-2 border-2 border-sewakhoj-red text-sewakhoj-red px-8 py-4 rounded-xl font-bold hover:bg-sewakhoj-red hover:text-white active:scale-95 transition-all"
            >
              View All Services <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        className="how py-16 md:py-20 bg-gradient-to-br from-gray-50 to-white"
        id="how-it-works"
        aria-labelledby="how-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="how-heading"
            className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight"
          >
            How It Works
          </h2>
          <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Simple steps to get your tasks done quickly
          </p>
          <div className="steps grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <Link
              href="/browse"
              className="step text-center bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer block"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 shadow-lg font-bold">
                1
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                Search
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Browse services and find taskers near you
              </p>
            </Link>
            <Link
              href="/browse"
              className="step text-center bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer block"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 shadow-lg font-bold">
                2
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                Book
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Choose a tasker and schedule your service
              </p>
            </Link>
            <div className="step text-center bg-white p-6 md:p-8 rounded-2xl shadow-lg transition-all duration-300">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 shadow-lg font-bold">
                3
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                Get it Done
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                Service completed with satisfaction guarantee
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section
        className="trust py-16 md:py-20 bg-gradient-to-br from-blue-50 via-white to-red-50"
        aria-labelledby="trust-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id="trust-heading"
            className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight"
          >
            Why Trust SewaKhoj?
          </h2>
          <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            We ensure quality and reliability in every service
          </p>
          <div className="trust-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                color: "from-sewakhoj-red to-red-600",
                title: "Verified Taskers",
                desc: "All taskers are background checked",
              },
              {
                icon: CheckCircle2,
                color: "from-sewakhoj-green to-green-600",
                title: "Satisfaction Guarantee",
                desc: "100% satisfaction or money back",
              },
              {
                icon: Clock,
                color: "from-blue-500 to-blue-700",
                title: "Quick Response",
                desc: "Get service within hours, not days",
              },
              {
                icon: Star,
                color: "from-yellow-400 to-yellow-600",
                title: "Rated & Reviewed",
                desc: "Transparent ratings from real customers",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="trust-item bg-white p-6 md:p-8 rounded-2xl text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              >
                <div
                  className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}
                >
                  <item.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2">
                  {item.title}
                </h3>
                <p className="text-sm md:text-base text-gray-700 font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="cta-section py-16 md:py-20 bg-gradient-to-r from-sewakhoj-red via-red-600 to-sewakhoj-red relative overflow-hidden animate-gradient-x"
        aria-labelledby="cta-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2
            id="cta-heading"
            className="text-2xl md:text-4xl font-extrabold text-white mb-4 tracking-tight"
          >
            Ready to Get Started?
          </h2>
          <p className="text-lg md:text-xl text-red-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of satisfied customers across Nepal
          </p>
          <div className="cta-btns flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/browse"
              className="bg-white text-sewakhoj-red px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 active:scale-95 transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-2xl"
            >
              Find a Service <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/tasker/onboard"
              className="bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-sewakhoj-red active:scale-95 transition-all duration-300 shadow-2xl flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" /> Become a Tasker
            </Link>
          </div>
        </div>
      </section>

      {/* Location Modal */}
      <LocationModal />
    </main>
  );
}
