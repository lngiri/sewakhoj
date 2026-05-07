"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Globe, ArrowRight, Star, CheckCircle, Shield, Clock, Menu, X, LogOut, User, Wallet, ShieldCheck, MapPin } from "lucide-react";
import { services } from "@/data/services";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import TaskerCard from "@/components/TaskerCard";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredTaskers, setFeaturedTaskers] = useState<any[]>([]);
  const [isTasker, setIsTasker] = useState<boolean | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const { getWhatsAppNumber, getWhatsAppLink } = useSiteSettings();

  useEffect(() => {
    async function checkTasker() {
      if (user) {
        // Priority check via metadata
        if (user.user_metadata?.role === 'tasker') {
          setIsTasker(true);
          return;
        }
        
        const { data } = await supabase.from('taskers').select('id').eq('user_id', user.id).maybeSingle();
        setIsTasker(!!data);
      } else {
        setIsTasker(false);
      }
    }
    checkTasker();

    async function fetchFeatured() {
      const { data } = await supabase
        .from('taskers')
        .select(`
          id,
          hourly_rate,
          city,
          rating,
          status,
          skills,
          is_featured,
          users (
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq('status', 'active')
        .eq('is_featured', true)
        .limit(4);
      
      if (data && data.length > 0) {
        setFeaturedTaskers(data);
      } else {
        // Fallback or empty state handled in render
        setFeaturedTaskers([]);
      }
    }
    fetchFeatured();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Is SewaKhoj safe to use?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Every tasker on SewaKhoj undergoes a background check and KYC verification. We also have a dedicated safety team and an SOS feature for emergency situations."
                }
              },
              {
                "@type": "Question",
                "name": "How do I pay for the service?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "You can pay directly via eSewa, Khalti, or Cash after the work is completed. The rates are clearly mentioned on the tasker's profile to avoid confusion."
                }
              },
              {
                "@type": "Question",
                "name": "What if I am not satisfied with the work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "We offer a satisfaction guarantee. If the work is not up to the standard, you can report it via our <a href='/contact'>Support Desk</a>, and we will help resolve the issue or process a refund."
                }
              },
              {
                "@type": "Question",
                "name": "Can I become a tasker too?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Absolutely! If you have a skill like plumbing, cleaning, or tutoring, click on 'Become a Tasker' to sign up and start earning today."
                }
              },
              {
                "@type": "Question",
                "name": "How fast can I get a service?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Most taskers respond within minutes. Depending on your location and their availability, you can often get a service on the same day."
                }
              }
            ]
          })
        }}
      />
      {/* Hero Section */}
      <header className="hero bg-gradient-to-br from-blue-50 to-white py-12 md:py-20" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight tracking-tight break-words">
            Find Trusted Local Services in Nepal
            <br />
            <span className="text-sewakhoj-red" translate="no">SewaKhoj</span> - <span className="font-devanagari">नेपालमा विश्वसनीय सेवाहरू</span>
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
            <button type="submit" className="bg-sewakhoj-red text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Search className="w-5 h-5" /> Search / खोज्नुस्
            </button>
          </form>

          {/* Hero Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-2xl mx-auto text-sm text-gray-600" aria-label="Platform statistics">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
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
                <p className="text-xs md:text-base text-gray-700 font-bold mb-2">{service.nameNp}</p>
                <p className="text-[10px] md:text-xs text-gray-500 leading-relaxed group-hover:text-gray-600 line-clamp-2">{service.descriptionEn}</p>
                <p className="text-[10px] md:text-xs text-gray-400 leading-relaxed mt-1 line-clamp-2">{service.descriptionNp}</p>
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
            Simple steps to <Link href="/browse" className="text-sewakhoj-red hover:underline font-bold">get your tasks done</Link> quickly
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

      {/* Tasker Value Proposition Section */}
      <section className="py-16 md:py-24 bg-slate-900 text-white overflow-hidden relative" aria-labelledby="tasker-value-heading">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-sewakhoj-red rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-blue-600 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <h2 id="tasker-value-heading" className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Turn Your Skills into <br/>
                <span className="text-sewakhoj-red">Serious Earnings</span>
              </h2>
              <p className="text-lg text-slate-400 font-medium max-w-xl mx-auto lg:mx-0">
                Join Nepal&apos;s fastest-growing <Link href="/browse" className="text-white hover:underline decoration-sewakhoj-red font-bold">service marketplace</Link>. Set your own rates, work on your own schedule, and build a professional reputation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 text-left">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 text-sewakhoj-red" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-widest">Earn More</h4>
                    <p className="text-xs text-slate-500 mt-1">Keep 90% of your earnings with direct payouts.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-left">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-widest">Flexible Schedule</h4>
                    <p className="text-xs text-slate-500 mt-1">You decide when and where you want to work.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-left">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-widest">Get Verified</h4>
                    <p className="text-xs text-slate-500 mt-1">Build trust with our professional badge system.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-left">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Star className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-widest">Build Reputation</h4>
                    <p className="text-xs text-slate-500 mt-1">Get reviews and become a top-rated professional.</p>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Link href="/tasker/onboard" className="inline-flex items-center gap-3 bg-sewakhoj-red text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-slate-900 active:scale-95 transition-all shadow-2xl shadow-red-500/20">
                  Become a Tasker Today <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-sewakhoj-red/20 to-blue-600/20 rounded-[40px] blur-3xl"></div>
                <div className="relative bg-slate-800 border border-slate-700 p-8 rounded-[40px] shadow-2xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-slate-700 rounded-full border-4 border-slate-600 flex items-center justify-center text-2xl">👨‍🔧</div>
                    <div>
                      <h4 className="font-black text-xl">Sandeep K.</h4>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-black text-green-500 uppercase tracking-widest"><CheckCircle className="w-3 h-3" /> Verified</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs font-bold text-slate-400">Plumber in Butwal</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                      <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Monthly Earnings</p>
                        <p className="text-3xl font-black">Rs 85,000+</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">↑ 12% Growth</p>
                        <p className="text-xs font-bold text-slate-400">Past 30 days</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Profile Views</p>
                        <p className="text-xl font-black text-blue-400">1,240</p>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">New Leads</p>
                        <p className="text-xl font-black text-sewakhoj-red">48</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            {featuredTaskers.length > 0 ? (
              featuredTaskers.map((tasker) => {
                const user = tasker.users;
                const badges: ("Verified" | "Top Rated" | "New")[] = ["Verified"];
                if (tasker.is_featured || tasker.rating >= 4.8) badges.push("Top Rated");

                return (
                  <TaskerCard
                    key={tasker.id}
                    id={tasker.id}
                    name={user?.full_name || "Tasker"}
                    initials={user?.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : "?"}
                    role={tasker.skills?.[0] || "General Service"}
                    location={tasker.city || "Nepal"}
                    experience={2}
                    rating={tasker.rating || 5.0}
                    jobsDone={15}
                    monthlyEarn={`Rs ${(tasker.hourly_rate * 40 / 1000).toFixed(0)}k+`}
                    responseTime="1h"
                    bio="Professional and reliable service provider in Nepal."
                    ratePerHour={tasker.hourly_rate}
                    isOnline={tasker.status === 'active'}
                    badges={badges}
                    onBook={() => {
                      if (!user) {
                        router.push(`/login?redirect=/book/${tasker.id}`);
                      } else {
                        router.push(`/book/${tasker.id}`);
                      }
                    }}
                  />
                );
              })
            ) : (
              <div className="col-span-full text-center py-10 text-gray-500 font-medium">
                Loading featured taskers...
              </div>
            )}
          </div>

          <div className="text-center mt-8">
            <Link href="/browse" className="btn-secondary inline-flex items-center gap-2 border-2 border-sewakhoj-red text-sewakhoj-red px-8 py-4 rounded-xl font-bold hover:bg-sewakhoj-red hover:text-white active:scale-95 transition-all">
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
            <Link href="/browse" className="bg-white text-sewakhoj-red px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 active:scale-95 transition-all duration-300 inline-flex items-center justify-center gap-2 shadow-2xl">
              Find a Service <ArrowRight className="w-5 h-5" />
            </Link>
            {isTasker ? (
              <Link href="/dashboard" className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black active:scale-95 transition-all duration-300 shadow-2xl flex items-center justify-center gap-2">
                Go to My Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link href="/tasker/onboard" className="bg-transparent border-2 border-white text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-sewakhoj-red active:scale-95 transition-all duration-300 shadow-2xl flex items-center justify-center gap-2">
                Become a Tasker
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-gray-50" id="faq">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Frequently Asked Questions / बारम्बार सोधिने प्रश्नहरू</h2>
            <p className="text-gray-600 font-medium italic">Everything you need to know about SewaKhoj</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Is SewaKhoj safe to use?",
                a: "Yes! Every tasker on SewaKhoj undergoes a background check and KYC verification. We also have a dedicated safety team and an SOS feature for emergency situations."
              },
              {
                q: "How do I pay for the service?",
                a: "You can pay directly via eSewa, Khalti, or Cash after the work is completed. The rates are clearly mentioned on the tasker's profile to avoid confusion."
              },
              {
                q: "What if I am not satisfied with the work?",
                a: <>We offer a satisfaction guarantee. If the work is not up to the standard, you can report it via our <Link href="/faq" className="text-blue-600 hover:underline font-semibold">Support Desk</Link>, and we will help resolve the issue or process a refund.</>
              },
              {
                q: "Can I become a tasker too?",
                a: <>Absolutely! If you have a skill like <Link href="/browse?service=plumbing" className="text-blue-600 hover:underline font-semibold">plumbing</Link>, <Link href="/browse?service=cleaning" className="text-blue-600 hover:underline font-semibold">cleaning</Link>, or <Link href="/browse?service=tutoring" className="text-blue-600 hover:underline font-semibold">tutoring</Link>, click on 'Become a Tasker' to sign up and start earning today.</>
              },
              {
                q: "How fast can I get a service?",
                a: "Most taskers respond within minutes. Depending on your location and their availability, you can often get a service on the same day."
              }
            ].map((faq, idx) => (
              <details key={idx} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <h3 className="font-bold text-gray-900 group-open:text-sewakhoj-red transition-colors">{faq.q}</h3>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-1">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-10 md:py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="footer-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8 mb-8">
            <div className="footer-brand col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="logo flex items-center gap-2 mb-4">
                <img src="/logo.jpeg" alt="SewaKhoj Logo" className="w-10 h-10 rounded-lg object-cover" />
                <div translate="no">
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
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
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
                  <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">+{getWhatsAppNumber()}</a>
                </li>
                <li className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href="mailto:hello@sewakhoj.com" className="hover:text-white transition-colors">hello@sewakhoj.com</a>
                </li>
                <li className="flex items-center gap-2">
                  <span>📍</span>
                  <span>Kathmandu, Nepal</span>
                </li>
                <li className="flex items-center gap-2 pt-2">
                  <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <a href="https://facebook.com/sewakhoj" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Follow us on Facebook</a>
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
