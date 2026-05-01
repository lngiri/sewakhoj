"use client";

import Link from "next/link";
import { Search, Globe, ArrowRight, Star, CheckCircle, Shield, Clock } from "lucide-react";
import { services } from "@/data/services";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="logo flex items-center gap-2">
              <img
                src="/logo.jpeg"
                alt="SewaKhoj Logo"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <div className="text-xl font-bold text-sewakhoj-red">SewaKhoj</div>
                <div className="text-xs text-gray-500">सेवा खोजी</div>
              </div>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex nav-links items-center gap-8">
              <a href="#services" className="text-gray-700 hover:text-sewakhoj-red font-medium">Services / सेवाहरू</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-sewakhoj-red font-medium">How it Works / कसरी?</a>
              <a href="#taskers" className="text-gray-700 hover:text-sewakhoj-red font-medium">Taskers / साथीहरू</a>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <div className="lang-toggle cursor-pointer flex items-center gap-1 text-sm text-gray-600 hover:text-sewakhoj-red" onClick={() => {}}>
                <Globe className="w-4 h-4" />
                <span>EN | नेपाली</span>
              </div>
              <Link href="/login" className="text-gray-700 hover:text-sewakhoj-red font-medium text-sm">
                Login / साइन इन
              </Link>
              <Link
                href="/tasker/onboard"
                className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors"
              >
                Become a Tasker / साथी बन्नुहोस्
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero bg-gradient-to-br from-blue-50 to-white py-20" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight md:leading-snug tracking-tight">
            Find Trusted Local Services in Nepal
            <br className="mb-2" />
            <span className="text-sewakhoj-red">सेवा खोजी</span> - नेपालमा विश्वसनीय सेवाहरू
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed font-medium">
            Book verified taskers for home services, repairs, cleaning and more.
            <br className="mb-1" />
            <span className="text-gray-700">घरेलु सेवा, मर्मत, सफाइ र अरूका लागि प्रमाणित साथीहरू बुक गर्नुहोस्।</span>
          </p>

          {/* Search Bar */}
          <div className="search-bar max-w-3xl mx-auto flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-lg" role="search">
            <select
              aria-label="Select city"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red text-gray-700"
              defaultValue=""
            >
              <option value="" disabled>Select City / सहर छान्नुस्</option>
              <option value="kathmandu">Kathmandu / काठमाडौं</option>
              <option value="pokhara">Pokhara / पोखरा</option>
              <option value="lalitpur">Lalitpur / ललितपुर</option>
              <option value="bhaktapur">Bhaktapur / भक्तपुर</option>
              <option value="biratnagar">Biratnagar / विराटनगर</option>
              <option value="birgunj">Birgunj / वीरगञ्ज</option>
            </select>
            <select
              aria-label="Select service"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red text-gray-700"
              defaultValue=""
            >
              <option value="" disabled>Select Service / सेवा छान्नुस्</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.emoji} {service.nameEn} / {service.nameNp}
                </option>
              ))}
            </select>
            <Link
              href="/browse"
              className="bg-sewakhoj-red text-white px-8 py-3 rounded-lg font-semibold hover:bg-sewakhoj-red-light transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search / खोज्नुस्
            </Link>
          </div>

          {/* Hero Stats */}
          <div className="hero-stats flex justify-center gap-8 mt-12 text-sm text-gray-600" aria-label="Platform statistics">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-sewakhoj-green" />
              <span><strong className="text-gray-900">500+</strong> Verified Taskers / प्रमाणित साथीहरू</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span><strong className="text-gray-900">4.8</strong> Average Rating / औसत रेटिङ</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span><strong className="text-gray-900">10K+</strong> Services Booked / बुक गरिएका सेवाहरू</span>
            </div>
          </div>
        </div>
      </header>

      {/* Services Section */}
      <section id="services" className="py-20 bg-white" aria-labelledby="services-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="services-heading" className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
            Our Services / हाम्रा सेवाहरू
          </h2>
          <p className="text-lg text-center text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Choose from a wide range of professional services for your home and office
            <br />
            <span className="text-gray-700">तपाईंको घर र कार्यालयका लागि व्यावसायिक सेवाहरूको विस्तृत सङ्ग्रहबाट छान्नुस्</span>
          </p>

          <div className="services-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" role="list">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/browse?service=${service.id}`}
                className="service-card bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 text-center hover:shadow-2xl hover:border-sewakhoj-red hover:from-red-50 hover:to-white transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                role="listitem"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-sewakhoj-red/10 to-sewakhoj-red/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">{service.emoji}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-xl mb-2 group-hover:text-sewakhoj-red transition-colors">{service.nameEn}</h3>
                <p className="text-base text-gray-700 font-medium">{service.nameNp}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how py-20 bg-gradient-to-br from-gray-50 to-white" id="how-it-works" aria-labelledby="how-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="how-heading" className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
            How It Works / कसरी काम गर्छ?
          </h2>
          <p className="text-lg text-center text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Simple steps to get your tasks done quickly and efficiently
            <br />
            <span className="text-gray-700">आफ्नो काम छिटो र सजिलो तरिकाले गर्न सरल चरणहरू</span>
          </p>

          <div className="steps grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="step text-center bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-20 h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Search / खोज्नुस्</h3>
              <p className="text-gray-600 leading-relaxed">
                Browse services and find taskers near you
                <br />
                <span className="text-gray-700">सेवाहरू हेर्नुहोस् र आफ्नो नजिकैका साथीहरू फेला पार्नुहोस्</span>
              </p>
            </article>

            <article className="step text-center bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-20 h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Book / बुक गर्नुस्</h3>
              <p className="text-gray-600 leading-relaxed">
                Choose a tasker and schedule your service
                <br />
                <span className="text-gray-700">साथी छान्नुस् र आफ्नो सेवाको समय तालिका बनाउनुस्</span>
              </p>
            </article>

            <article className="step text-center bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-20 h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Get it Done / काम सकियो</h3>
              <p className="text-gray-600 leading-relaxed">
                Service completed with satisfaction guarantee
                <br />
                <span className="text-gray-700">सन्तुष्टिको ग्यारेन्टीसहित सेवा सम्पन्न</span>
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Featured Taskers Section */}
      <section className="py-20 bg-white" aria-labelledby="taskers-heading" id="taskers">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="taskers-heading" className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
            Featured Taskers / प्रमुख साथीहरू
          </h2>
          <p className="text-lg text-center text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Top-rated and trusted professionals ready to serve you
            <br />
            <span className="text-gray-700">तपाईंलाई सेवा दिन तयार उच्च रेटिङ र विश्वसनीय पेशेवरहरू</span>
          </p>

          <div className="taskers-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="taskers" role="list">
            {/* Tasker Card 1 */}
            <article className="tasker-card bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100" role="listitem">
              <div className="tasker-top p-6 text-center bg-gradient-to-br from-red-50 to-white">
                <div className="w-20 h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg">
                  👨‍🔧
                </div>
                <div className="tasker-info">
                  <h3 className="font-bold text-gray-900 text-xl">Ram Bahadur</h3>
                  <p className="text-base text-gray-600 font-medium mt-1">Kathmandu / काठमाडौं</p>
                </div>
              </div>
              <div className="tasker-bottom px-6 pb-6 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="text-base font-bold">4.9</span>
                  </div>
                  <span className="text-base text-gray-700 font-semibold">Plumbing / प्लम्बिङ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-sewakhoj-red">Rs 500/hr</span>
                  <span className="text-xs text-sewakhoj-green bg-green-50 px-3 py-1.5 rounded-full font-medium">Available / उपलब्ध</span>
                </div>
              </div>
            </article>

            {/* Tasker Card 2 */}
            <article className="tasker-card bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100" role="listitem">
              <div className="tasker-top p-6 text-center bg-gradient-to-br from-red-50 to-white">
                <div className="w-20 h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg">
                  👩‍🦰
                </div>
                <div className="tasker-info">
                  <h3 className="font-bold text-gray-900 text-xl">Sita Sharma</h3>
                  <p className="text-base text-gray-600 font-medium mt-1">Pokhara / पोखरा</p>
                </div>
              </div>
              <div className="tasker-bottom px-6 pb-6 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="text-base font-bold">4.8</span>
                  </div>
                  <span className="text-base text-gray-700 font-semibold">Cleaning / सफाइ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-sewakhoj-red">Rs 400/hr</span>
                  <span className="text-xs text-sewakhoj-green bg-green-50 px-3 py-1.5 rounded-full font-medium">Available / उपलब्ध</span>
                </div>
              </div>
            </article>

            {/* Tasker Card 3 */}
            <article className="tasker-card bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100" role="listitem">
              <div className="tasker-top p-6 text-center bg-gradient-to-br from-red-50 to-white">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg">
                  👨‍🏫
                </div>
                <div className="tasker-info">
                  <h3 className="font-bold text-gray-900 text-xl">Hari Prasad</h3>
                  <p className="text-base text-gray-600 font-medium mt-1">Lalitpur / ललितपुर</p>
                </div>
              </div>
              <div className="tasker-bottom px-6 pb-6 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="text-base font-bold">4.7</span>
                  </div>
                  <span className="text-base text-gray-700 font-semibold">Tutoring / ट्युशन</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-sewakhoj-red">Rs 600/hr</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">Busy / व्यस्त</span>
                </div>
              </div>
            </article>

            {/* Tasker Card 4 */}
            <article className="tasker-card bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100" role="listitem">
              <div className="tasker-top p-6 text-center bg-gradient-to-br from-red-50 to-white">
                <div className="w-20 h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg">
                  👨‍🍳
                </div>
                <div className="tasker-info">
                  <h3 className="font-bold text-gray-900 text-xl">Krishna Thapa</h3>
                  <p className="text-base text-gray-600 font-medium mt-1">Bhaktapur / भक्तपुर</p>
                </div>
              </div>
              <div className="tasker-bottom px-6 pb-6 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="text-base font-bold">4.9</span>
                  </div>
                  <span className="text-base text-gray-700 font-semibold">Cooking / खाना पकाउने</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-sewakhoj-red">Rs 550/hr</span>
                  <span className="text-xs text-sewakhoj-green bg-green-50 px-3 py-1.5 rounded-full font-medium">Available / उपलब्ध</span>
                </div>
              </div>
            </article>
          </div>

          <div className="text-center mt-8">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 bg-white border-2 border-sewakhoj-red text-sewakhoj-red px-6 py-3 rounded-lg font-semibold hover:bg-sewakhoj-red hover:text-white transition-colors"
            >
              View All Taskers / सबै साथीहरू हेर्नुस्
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust py-20 bg-gradient-to-br from-blue-50 via-white to-red-50" aria-labelledby="trust-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="trust-heading" className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 tracking-tight">
            Why Trust SewaKhoj? / सेवा खोजीमा किन भरोसा गर्ने?
          </h2>
          <p className="text-lg text-center text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            We ensure quality and reliability in every service
            <br />
            <span className="text-gray-700">हामी हरेक सेवामा गुणस्तर र भरपर्दोपन सुनिश्चित गर्छौं</span>
          </p>

          <div className="trust-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="trust-item bg-white p-8 rounded-2xl text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Verified Taskers / प्रमाणित साथीहरू</h3>
              <p className="text-base text-gray-700 font-medium">All taskers are background checked and verified</p>
            </div>

            <div className="trust-item bg-white p-8 rounded-2xl text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-sewakhoj-green to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Satisfaction Guarantee / सन्तुष्टि ग्यारेन्टी</h3>
              <p className="text-base text-gray-700 font-medium">100% satisfaction or money back guarantee</p>
            </div>

            <div className="trust-item bg-white p-8 rounded-2xl text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Quick Response / छिटो प्रतिक्रिया</h3>
              <p className="text-base text-gray-700 font-medium">Get service within hours, not days</p>
            </div>

            <div className="trust-item bg-white p-8 rounded-2xl text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Rated & Reviewed / रेटिङ र समीक्षा</h3>
              <p className="text-base text-gray-700 font-medium">Transparent ratings from real customers</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section py-20 bg-gradient-to-r from-sewakhoj-red via-red-600 to-sewakhoj-red relative overflow-hidden" aria-labelledby="cta-heading">
        <div className="absolute inset-0 bg-[url('/vercel.svg')] opacity-5 bg-repeat"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 id="cta-heading" className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Ready to Get Started? / सुरु गर्न तयार हुनुहुन्छ?
          </h2>
          <p className="text-xl text-red-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of satisfied customers across Nepal
            <br />
            नेपालभरका हजारौं सन्तुष्ट ग्राहकहरूमा सामेल हुनुहोस्
          </p>
          <div className="cta-btns flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/browse"
              className="bg-white text-sewakhoj-red px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5"
            >
              Find a Service / सेवा खोज्नुस्
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/tasker/onboard"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-sewakhoj-red transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:-translate-y-0.5"
            >
              Become a Tasker / साथी बन्नुहोस्
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="footer-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="footer-brand">
              <div className="logo flex items-center gap-2 mb-4">
                <img
                  src="/logo.jpeg"
                  alt="SewaKhoj Logo"
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div>
                  <div className="text-xl font-bold text-white">SewaKhoj</div>
                  <div className="text-xs text-gray-400">सेवा खोजी</div>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Nepals trusted platform for local services. Connecting customers with skilled taskers since 2024.
                <br />
                नेपालको विश्वसनीय स्थानीय सेवा प्लेटफर्म। २०२४ देखि ग्राहकहरूलाई सीपालु साथीहरूसँग जोड्दै।
              </p>
            </div>

            {/* Quick Links */}
            <div className="footer-col">
              <h3 className="text-white font-semibold mb-4">Quick Links / द्रुत लिङ्कहरू</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#services" className="hover:text-white transition-colors">Services / सेवाहरू</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it Works / कसरी?</a></li>
                <li><a href="/browse" className="hover:text-white transition-colors">Browse Taskers / साथीहरू हेर्नुस्</a></li>
                <li><a href="/login" className="hover:text-white transition-colors">Login / साइन इन</a></li>
              </ul>
            </div>

            {/* Services */}
            <div className="footer-col">
              <h3 className="text-white font-semibold mb-4">Services / सेवाहरू</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/browse?service=plumbing" className="hover:text-white transition-colors">Plumbing / प्लम्बिङ</a></li>
                <li><a href="/browse?service=cleaning" className="hover:text-white transition-colors">Cleaning / सफाइ</a></li>
                <li><a href="/browse?service=electrical" className="hover:text-white transition-colors">Electrical / इलेक्ट्रिकल</a></li>
                <li><a href="/browse?service=tutoring" className="hover:text-white transition-colors">Tutoring / ट्युशन</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="footer-col">
              <h3 className="text-white font-semibold mb-4">Contact / सम्पर्क</h3>
              <ul className="space-y-2 text-sm">
                <li>📞 +977-1-4444444</li>
                <li>✉️ info@sewakhoj.com</li>
                <li>📍 Kathmandu, Nepal / काठमाडौं, नेपाल</li>
                <li>
                  <a href="https://www.facebook.com/sewakhoj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook / फेसबुक
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2025 SewaKhoj (सेवा खोजी). All rights reserved. / सर्वाधिकार सुरक्षित।</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
