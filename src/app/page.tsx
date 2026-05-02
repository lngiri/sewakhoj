"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Globe, ArrowRight, Star, CheckCircle, Shield, Clock, Menu, X, LogOut, User } from "lucide-react";
import { services } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { user } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <header className="hero bg-gradient-to-br from-blue-50 to-white py-12 md:py-20" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight tracking-tight break-words">
            Find Trusted Local Services in Nepal
            <br />
            <span className="text-sewakhoj-red">SewaKhoj</span> - <span className="font-devanagari">नेपालमा विश्वसनीय सेवाहरू</span>
          </h1>
          <p className="text-base md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed font-medium">
            Book verified taskers for home services, repairs, cleaning and more.
            <br />
            <span className="text-gray-700">घरेलु सेवा, मर्मत, सफाइ र अरूका लागि प्रमाणित साथीहरू बुक गर्नुहोस्।</span>
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="search-bar max-w-3xl mx-auto flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl shadow-lg" role="search">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What service are you looking for? / के सेवा खोज्दै हुनुहुन्छ?"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red text-gray-700"
            />
            <button type="submit" className="bg-sewakhoj-red text-white px-8 py-3 rounded-lg font-semibold hover:bg-sewakhoj-red-light transition-colors flex items-center justify-center gap-2">
              <Search className="w-5 h-5" /> Search / खोज्नुस्
            </button>
          </form>

          {/* Hero Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-2xl mx-auto text-sm text-gray-600" aria-label="Platform statistics">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-sewakhoj-green shrink-0" />
              <span><strong className="text-gray-900">500+</strong> Verified Taskers</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 shrink-0" />
              <span><strong className="text-gray-900">4.8</strong> Average Rating</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-blue-500 shrink-0" />
              <span><strong className="text-gray-900">10K+</strong> Services Booked</span>
            </div>
          </div>
        </div>
      </header>

      {/* Services Section */}
      <section id="services" className="py-16 md:py-20 bg-white" aria-labelledby="services-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="services-heading" className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
            Our Services / हाम्रा सेवाहरू
          </h2>
          <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Choose from a wide range of professional services
          </p>
          <div className="services-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6" role="list">
            {services.map((service) => (
              <Link key={service.id} href={`/browse?service=${service.id}`} className="service-card bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-4 md:p-6 text-center hover:shadow-2xl hover:border-sewakhoj-red hover:from-red-50 hover:to-white transition-all duration-300 cursor-pointer group transform hover:-translate-y-1" role="listitem">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 bg-gradient-to-br from-sewakhoj-red/10 to-sewakhoj-red/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl md:text-4xl">{service.emoji}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm md:text-xl mb-1 group-hover:text-sewakhoj-red transition-colors">{service.nameEn}</h3>
                <p className="text-xs md:text-base text-gray-700 font-medium">{service.nameNp}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how py-16 md:py-20 bg-gradient-to-br from-gray-50 to-white" id="how-it-works" aria-labelledby="how-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="how-heading" className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
            How It Works / कसरी काम गर्छ?
          </h2>
          <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Simple steps to get your tasks done quickly
          </p>
          <div className="steps grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: 1, title: "Search / खोज्नुस्", desc: "Browse services and find taskers near you" },
              { step: 2, title: "Book / बुक गर्नुस्", desc: "Choose a tasker and schedule your service" },
              { step: 3, title: "Get it Done / काम सकियो", desc: "Service completed with satisfaction guarantee" },
            ].map((item) => (
              <article key={item.step} className="step text-center bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 shadow-lg font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm md:text-base">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Taskers Section */}
      <section className="py-16 md:py-20 bg-white" aria-labelledby="taskers-heading" id="taskers">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="taskers-heading" className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
            Featured Taskers / प्रमुख साथीहरू
          </h2>
          <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            Top-rated and trusted professionals ready to serve you
          </p>

          <div className="taskers-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" role="list">
            {[
              { emoji: "👨‍🔧", name: "Ram Bahadur", city: "Kathmandu / काठमाडौं", rating: 4.9, service: "Plumbing / प्लम्बिङ", price: 500, available: true },
              { emoji: "👩‍🦰", name: "Sita Sharma", city: "Pokhara / पोखरा", rating: 4.8, service: "Cleaning / सफाइ", price: 400, available: true },
              { emoji: "👨‍🏫", name: "Hari Prasad", city: "Lalitpur / ललितपुर", rating: 4.7, service: "Tutoring / ट्युशन", price: 600, available: false },
              { emoji: "👨‍🍳", name: "Krishna Thapa", city: "Bhaktapur / भक्तपुर", rating: 4.9, service: "Cooking / खाना पकाउने", price: 550, available: true },
            ].map((tasker, idx) => (
              <article key={idx} className="tasker-card bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100" role="listitem">
                <div className="tasker-top p-5 text-center bg-gradient-to-br from-red-50 to-white">
                  <div className={`w-16 h-16 ${tasker.available ? 'bg-gradient-to-br from-sewakhoj-red to-red-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'} rounded-full mx-auto mb-3 flex items-center justify-center text-2xl shadow-lg`}>
                    {tasker.emoji}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{tasker.name}</h3>
                  <p className="text-sm text-gray-600 font-medium mt-1">{tasker.city}</p>
                </div>
                <div className="px-5 pb-5 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-yellow-400" />
                      <span className="text-sm font-bold">{tasker.rating}</span>
                    </div>
                    <span className="text-sm text-gray-700 font-semibold truncate ml-2">{tasker.service}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-extrabold text-sewakhoj-red">Rs {tasker.price}/hr</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${tasker.available ? 'text-sewakhoj-green bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                      {tasker.available ? "Available" : "Busy"}
                    </span>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <a 
                      href={`https://wa.me/9779800000000`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors shadow-sm shrink-0"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.417-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.305 1.652zm6.599-3.835c1.544.917 3.41 1.403 5.316 1.404h.005c5.451 0 9.887-4.435 9.889-9.886.002-2.642-1.029-5.125-2.902-6.999-1.872-1.874-4.355-2.905-6.998-2.906-5.45 0-9.886 4.435-9.889 9.886-.001 1.93.513 3.818 1.488 5.44l-.989 3.614 3.705-.972zm12.193-7.531c-.328-.164-1.944-.959-2.242-1.069-.299-.11-.517-.164-.734.164-.218.328-.842 1.069-1.031 1.288-.19.218-.379.246-.708.082-.328-.164-1.386-.511-2.641-1.63-1.007-.898-1.688-2.007-1.885-2.335-.197-.328-.021-.505.143-.668.147-.148.328-.383.493-.574.164-.191.218-.328.328-.547.11-.219.055-.41-.027-.574-.082-.164-.734-1.769-1.006-2.426-.264-.639-.533-.553-.734-.563-.19-.01-.408-.011-.626-.011-.218 0-.571.082-.87.41-.299.328-1.143 1.12-1.143 2.732 0 1.612 1.17 3.169 1.333 3.388.164.219 2.303 3.515 5.578 4.922.779.335 1.387.535 1.86.687.782.248 1.494.213 2.056.129.626-.094 1.944-.795 2.216-1.558.272-.764.272-1.422.19-1.557-.081-.135-.298-.218-.626-.382z"/>
                      </svg>
                    </a>
                    <button 
                      onClick={() => {
                        if (!user) {
                          router.push("/login?redirect=/browse");
                        } else {
                          router.push("/browse");
                        }
                      }}
                      className="flex-1 text-center py-2 text-sm bg-sewakhoj-red text-white rounded-lg font-bold hover:bg-sewakhoj-red-light transition-all shadow-md active:scale-95"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/browse" className="inline-flex items-center gap-2 bg-white border-2 border-sewakhoj-red text-sewakhoj-red px-6 py-3 rounded-lg font-semibold hover:bg-sewakhoj-red hover:text-white transition-colors">
              View All Taskers / सबै साथीहरू हेर्नुस् <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust py-16 md:py-20 bg-gradient-to-br from-blue-50 via-white to-red-50" aria-labelledby="trust-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="trust-heading" className="text-2xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
            Why Trust SewaKhoj?
          </h2>
          <p className="text-base md:text-lg text-center text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
            We ensure quality and reliability in every service
          </p>
          <div className="trust-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, color: "from-sewakhoj-red to-red-600", title: "Verified Taskers", desc: "All taskers are background checked" },
              { icon: CheckCircle, color: "from-sewakhoj-green to-green-600", title: "Satisfaction Guarantee", desc: "100% satisfaction or money back" },
              { icon: Clock, color: "from-blue-500 to-blue-700", title: "Quick Response", desc: "Get service within hours, not days" },
              { icon: Star, color: "from-yellow-400 to-yellow-600", title: "Rated & Reviewed", desc: "Transparent ratings from real customers" },
            ].map((item, idx) => (
              <div key={idx} className="trust-item bg-white p-6 md:p-8 rounded-2xl text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                <div className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <item.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-base md:text-lg mb-2">{item.title}</h3>
                <p className="text-sm md:text-base text-gray-700 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section py-16 md:py-20 bg-gradient-to-r from-sewakhoj-red via-red-600 to-sewakhoj-red relative overflow-hidden" aria-labelledby="cta-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 id="cta-heading" className="text-2xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Ready to Get Started?
          </h2>
          <p className="text-lg md:text-xl text-red-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join thousands of satisfied customers across Nepal
          </p>
          <div className="cta-btns flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/browse" className="bg-white text-sewakhoj-red px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-2xl">
              Find a Service <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/tasker/onboard" className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-sewakhoj-red transition-all duration-300 shadow-2xl">
              Become a Tasker
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-10 md:py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="footer-grid grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="footer-brand col-span-2 lg:col-span-1">
              <div className="logo flex items-center gap-2 mb-4">
                <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <div className="text-xl font-bold text-white">SewaKhoj</div>
                  <div className="text-xs text-gray-400">सेवा खोज</div>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Nepal&apos;s trusted platform for local services. Connecting customers with skilled taskers since 2024.
              </p>
            </div>
            <div className="footer-col">
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">Services</button></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">How it Works</button></li>
                <li><Link href="/browse" className="hover:text-white transition-colors">Browse Taskers</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h3 className="text-white font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/browse?service=plumbing" className="hover:text-white transition-colors">Plumbing</Link></li>
                <li><Link href="/browse?service=cleaning" className="hover:text-white transition-colors">Cleaning</Link></li>
                <li><Link href="/browse?service=electrical" className="hover:text-white transition-colors">Electrical</Link></li>
                <li><Link href="/browse?service=tutoring" className="hover:text-white transition-colors">Tutoring</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h3 className="text-white font-semibold mb-4">Need Help?</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  <a href="https://wa.me/9779800000000" className="hover:text-white transition-colors">+977-9800000000</a>
                </li>
                <li className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href="mailto:sewakhoj@gmail.com" className="hover:text-white transition-colors">sewakhoj@gmail.com</a>
                </li>
                <li className="flex items-center gap-2">
                  <span>📍</span>
                  <span>Kathmandu, Nepal</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2025 सेवा खोज (SewaKhoj). All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
