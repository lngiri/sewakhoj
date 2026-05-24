"use client";

import {
  Heart,
  ShieldCheck,
  Globe2,
  MessageCircle,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Camera,
  Star
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/navigation/PageHeader";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function DiasporaClient() {
  const { getWhatsAppLink, getWhatsAppNumber } = useSiteSettings();

  const features = [
    {
      title: "Trusted Professionals",
      titleNp: "प्रमाणित विशेषज्ञहरू",
      desc: "Every tasker is background-checked and KYC verified. We only send pros we'd trust in our own homes.",
      icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
      bg: "bg-emerald-50"
    },
    {
      title: "Real-time Updates",
      titleNp: "प्रत्यक्ष जानकारी",
      desc: "Get photo updates on WhatsApp once the job is done. Rest easy knowing the work was completed correctly.",
      icon: <Camera className="w-8 h-8 text-blue-500" />,
      bg: "bg-blue-50"
    },
    {
      title: "WhatsApp Coordination",
      titleNp: "सजिलो समन्वय",
      desc: "We coordinate with your family in Nepal directly. You book, we handle the rest.",
      icon: <MessageCircle className="w-8 h-8 text-green-500" />,
      bg: "bg-green-50"
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section - Emotional & Global */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-sewakhoj-red rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <PageHeader
                title="Care from Afar"
                description="Book trusted services for your family in Nepal"
                className="mb-6 [&_.breadcrumbs]:text-white/60 [&_.breadcrumbs_separator]:text-white/40 [&_.breadcrumbs_active]:text-white [&_.title-wrapper]:hidden"
                relatedLinks={[
                  { href: "/services", label: "Our Services" },
                  { href: "/contact", label: "Contact Us" },
                ]}
              />
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-white/10">
                <Globe2 className="w-4 h-4 text-blue-400" />
                For Nepali Diaspora Worldwide
              </div>

              <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tight">
                Care from Afar <br />
                <span className="text-sewakhoj-red">टाढाबाट माया</span>
              </h1>

              <p className="text-xl md:text-2xl text-slate-300 font-medium mb-12 max-w-2xl leading-relaxed">
                Living in UAE, Qatar, or Korea? <br />
                Book verified home services for your parents in Nepal. From plumbing to cleaning, we take care of your home as you would.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 text-white px-10 py-6 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-green-600 transition-all shadow-2xl shadow-green-500/20 flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-6 h-6" />
                  Book via WhatsApp
                </a>
                <Link
                  href="/browse"
                  className="bg-white/10 text-white border border-white/20 backdrop-blur-md px-10 py-6 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                >
                  Browse Taskers <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md relative">
              <div className="relative z-10 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[48px] p-8 shadow-3xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-sewakhoj-red rounded-2xl flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-xl">SewaKhoj Care™</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Family First Service</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    "International Payment Support",
                    "Dedicated Case Manager",
                    "Photo/Video Proof of Work",
                    "Direct Contact with Family",
                    "Happiness Guaranteed"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span className="text-sm font-bold text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-10 p-6 bg-white/5 rounded-3xl border border-white/10 italic text-slate-400 text-sm">
                  "I booked a plumber for my mom in Pokhara while sitting in Dubai. The job was done in 2 hours and I got photos on WhatsApp. Best service for us staying abroad!" <br />
                  <span className="text-white font-bold not-italic block mt-2">— Ramesh T., Dubai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">How It Works</h2>
          <p className="text-slate-500 font-bold text-lg">Taking care of home has never been easier for Expats.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((f, i) => (
            <div key={i} className="group p-10 rounded-[40px] border border-slate-100 hover:border-sewakhoj-red/20 transition-all hover:shadow-2xl">
              <div className={`w-16 h-16 rounded-3xl ${f.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sewakhoj-red font-black font-devanagari text-lg mb-4">{f.titleNp}</p>
              <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Specialized Services */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-[56px] p-12 md:p-20 shadow-xl flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 text-sewakhoj-red font-black uppercase text-xs tracking-[0.2em]">
                <Sparkles className="w-4 h-4" /> Most Popular Services
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Most requested by families back home</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { t: "Deep Cleaning", d: "For parents' peace of mind", i: "🧹" },
                  { t: "Plumbing Fixes", d: "Urgent leaks & repairs", i: "🔧" },
                  { t: "Safe Electrician", d: "Safety check for the whole house", i: "⚡" },
                  { t: "Elderly Tech Help", d: "Setting up routers/devices", i: "📱" }
                ].map((s, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <span className="text-2xl">{s.i}</span>
                    <div>
                      <h4 className="font-black text-sm">{s.t}</h4>
                      <p className="text-xs text-slate-500 font-medium">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 text-center">
              <div className="inline-block p-2 bg-emerald-50 rounded-full mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Active Diaspora Support</span>
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-6">Ready to book?</h3>
              <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto">
                No complex forms. Just message us on WhatsApp and our dedicated care manager will handle everything.
              </p>
              <a
                href={getWhatsAppLink()}
                className="inline-flex items-center gap-3 bg-gray-900 text-white px-12 py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl"
              >
                Start a WhatsApp Booking <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Verification */}
      <section className="py-24 max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-black mb-12">Trusted by 100+ Expats Monthly</h2>
        <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale">
          {/* Placeholders for expat associations or logos if any */}
          <div className="text-xl font-black">UAE NEPALIS</div>
          <div className="text-xl font-black">KOREA KOSH</div>
          <div className="text-xl font-black">QATAR MITRA</div>
          <div className="text-xl font-black">DUBAI DREAMS</div>
        </div>
      </section>
    </main>
  );
}
