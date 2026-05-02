"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Globe, ArrowRight, Star, CheckCircle, Shield, Clock, Menu, X, LogOut, User } from "lucide-react";
import { services } from "@/data/services";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="logo flex items-center gap-2 shrink-0">
              <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-10 h-10 rounded-lg object-cover" />
              <div>
                <div className="text-xl font-bold text-sewakhoj-red">SewaKhoj</div>
                <div className="text-xs text-gray-500">सेवा खोजी</div>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex nav-links items-center gap-6">
              <a href="#services" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Services</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">How it Works</a>
              <a href="#taskers" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Taskers</a>
            </div>

            {/* Right Side — Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {!loading && user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mr-2">
                    <div className="w-8 h-8 bg-sewakhoj-red rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="font-medium max-w-[120px] truncate">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
                  </div>
                  <Link href="/dashboard" className="text-gray-600 hover:text-sewakhoj-red text-sm font-bold flex items-center gap-1 transition">
                    Dashboard
                  </Link>
                  <Link href="/admin" className="text-gray-600 hover:text-sewakhoj-red text-sm font-bold flex items-center gap-1 transition">
                    <Shield className="w-4 h-4" /> Admin
                  </Link>
                  <button onClick={handleSignOut} className="text-gray-500 hover:text-sewakhoj-red text-sm font-medium flex items-center gap-1 ml-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : !loading ? (
                <>
                  <Link href="/login" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Login</Link>
                  <Link href="/signup" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">Sign Up</Link>
                </>
              ) : null}
              <Link href="/tasker/onboard" className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors whitespace-nowrap">
                Become a Tasker
              </Link>
            </div>

            {/* Hamburger — Mobile */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg">
            <div className="px-4 py-4 space-y-3">
              <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Services / सेवाहरू</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">How it Works / कसरी?</a>
              <a href="#taskers" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Taskers / साथीहरू</a>
              {!loading && user ? (
                <>
                  <div className="flex items-center gap-2 py-2 text-gray-700 border-b border-gray-100">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
                  </div>
                  <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-red-600 font-medium">
                    Sign Out
                  </button>
                </>
              ) : !loading ? (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Login / साइन इन</Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-700 font-medium border-b border-gray-100">Sign Up / साइन अप</Link>
                </>
              ) : null}
              <Link href="/tasker/onboard" onClick={() => setMobileMenuOpen(false)} className="block bg-sewakhoj-red text-white text-center px-4 py-3 rounded-lg font-medium">
                Become a Tasker / साथी बन्नुहोस्
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="hero bg-gradient-to-br from-blue-50 to-white py-12 md:py-20" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight tracking-tight break-words">
            Find Trusted Local Services in Nepal
            <br className="hidden sm:block" />
            <span className="text-sewakhoj-red">सेवा खोजी</span> - नेपालमा विश्वसनीय सेवाहरू
          </h1>
          <p className="text-base md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed font-medium">
            Book verified taskers for home services, repairs, cleaning and more.
            <br className="hidden sm:block" />
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
                    <Link href="/browse" className="flex-1 text-center py-2 text-sm border border-sewakhoj-red text-sewakhoj-red rounded-lg font-medium hover:bg-red-50 transition-colors">
                      View Profile
                    </Link>
                    <Link href="/browse" className="flex-1 text-center py-2 text-sm bg-sewakhoj-red text-white rounded-lg font-medium hover:bg-sewakhoj-red-light transition-colors">
                      Book Now
                    </Link>
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
          <div className="footer-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="footer-brand">
              <div className="logo flex items-center gap-2 mb-4">
                <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <div className="text-xl font-bold text-white">SewaKhoj</div>
                  <div className="text-xs text-gray-400">सेवा खोजी</div>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Nepal&apos;s trusted platform for local services. Connecting customers with skilled taskers since 2024.
              </p>
            </div>
            <div className="footer-col">
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a></li>
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
            <p>&copy; 2025 SewaKhoj (सेवा खोजी). All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
