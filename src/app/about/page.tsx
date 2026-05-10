import { Heart, Shield, Users, Target, Rocket, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { siteStats } from "@/data/siteStats";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About SewaKhoj | Nepal's Most Trusted Local Service Marketplace",
  description: "Learn about SewaKhoj's mission to modernize local services in Nepal. Connecting skilled taskers with customers in Kathmandu, Lalitpur, Pokhara and beyond.",
  alternates: {
    canonical: 'https://sewakhoj.com/about',
  }
};

export default function AboutPage() {
  const stats = [
    { label: "Verified Taskers", value: siteStats.verifiedTaskers, icon: <Users className="w-6 h-6" /> },
    { label: "Tasks Completed", value: siteStats.servicesBooked, icon: <CheckCircle2 className="w-6 h-6" /> },
    { label: "Happy Customers", value: siteStats.happyCustomers, icon: <Heart className="w-6 h-6" /> },
    { label: "Cities Covered", value: siteStats.citiesCovered, icon: <Rocket className="w-6 h-6" /> }
  ];

  const values = [
    {
      title: "Trust & Safety",
      description: "Every tasker undergoes a rigorous KYC verification and background check because your safety is our priority.",
      icon: <Shield className="w-8 h-8 text-sewakhoj-red" />
    },
    {
      title: "Quality Service",
      description: "We connect you with the best skilled professionals who take pride in their craftsmanship and reliability.",
      icon: <Target className="w-8 h-8 text-blue-600" />
    },
    {
      title: "Community Growth",
      description: "By using SewaKhoj, you're directly supporting local experts and helping build a stronger service economy in Nepal.",
      icon: <Users className="w-8 h-8 text-green-600" />
    }
  ];

  return (
    <main className="min-h-screen bg-white font-inter">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-gray-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sewakhoj-red/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tighter leading-tight">
              Modernizing Local Services in <span className="text-sewakhoj-red underline decoration-red-200">Nepal.</span>
            </h1>
            <p className="text-xl text-gray-600 font-medium leading-relaxed mb-10">
              SewaKhoj is more than just a platform; it's a movement to bridge the gap between skilled local professionals and people who need reliable help.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/signup" className="px-10 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200">
                Join Our Community
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mb-6">
                  {stat.icon}
                </div>
                <p className="text-3xl font-black text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <div className="aspect-square bg-gray-200 rounded-[3rem] overflow-hidden">
                <img src="/logo.jpeg" alt="SewaKhoj Impact" className="w-full h-full object-cover grayscale opacity-80" />
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-sewakhoj-red rounded-[2rem] p-8 flex flex-col justify-end text-white shadow-2xl">
                <p className="text-4xl font-black">Est.</p>
                <p className="text-xl font-bold">2024</p>
              </div>
            </div>
            <div className="space-y-8">
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">Our Mission</h2>
              <div className="h-2 w-20 bg-sewakhoj-red rounded-full" />
              <p className="text-lg text-gray-700 leading-relaxed font-medium">
                SewaKhoj was born from a simple observation: finding a reliable plumber, electrician, or cleaner in Kathmandu shouldn't be based on luck. 
              </p>
              <p className="text-lg text-gray-700 leading-relaxed font-medium">
                Our mission is to empower local skilled workers by providing them with a digital platform to showcase their expertise, while giving customers a transparent, safe, and efficient way to book home services.
              </p>
              <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 italic font-bold text-gray-600">
                "We are building the trust layer for services in Nepal, one task at a time."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 text-center mb-16">
          <h2 className="text-4xl font-black text-gray-900 mb-4">The Values We Live By</h2>
          <p className="text-gray-500 font-medium max-w-2xl mx-auto uppercase text-xs tracking-widest font-black">Our core principles guide every decision we make.</p>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {values.map((value, idx) => (
              <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border border-gray-100 group hover:-translate-y-2">
                <div className="mb-8 transform transition-transform group-hover:scale-110 duration-500">
                  {value.icon}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-4">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sewakhoj-red/20 rounded-full blur-3xl" />
            <h2 className="text-4xl md:text-5xl font-black mb-8 relative z-10 tracking-tight">Ready to join the future of services?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link href="/signup" className="px-10 py-5 bg-white text-gray-900 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-gray-100 transition-all">
                Sign Up as Customer
              </Link>
              <Link href="/tasker/onboard" className="px-10 py-5 bg-sewakhoj-red text-white rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-red-700 transition-all">
                Become a Tasker
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
