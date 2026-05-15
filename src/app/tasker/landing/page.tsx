"use client";

import Link from "next/link";
import { ArrowRight, Wallet, Clock, ShieldCheck, Star, CheckCircle2, Users, Briefcase, Award } from "lucide-react";

export default function TaskerLandingPage() {
  const benefits = [
    {
      icon: Wallet,
      title: "Earn More",
      desc: "Keep 90% of your earnings with direct payouts. No hidden fees.",
      color: "from-sewakhoj-red to-red-600"
    },
    {
      icon: Clock,
      title: "Flexible Schedule",
      desc: "You decide when and where you want to work.",
      color: "from-blue-500 to-blue-700"
    },
    {
      icon: ShieldCheck,
      title: "Verification Badge",
      desc: "Build instant trust with customers through our badge system.",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Star,
      title: "Build Reputation",
      desc: "Get reviews and become a top-rated professional.",
      color: "from-yellow-400 to-amber-600"
    }
  ];

  const steps = [
    {
      num: 1,
      title: "Tell Us About Yourself",
      desc: "Share your skills, experience, and availability"
    },
    {
      num: 2,
      title: "Set Your Rates",
      desc: "Choose your hourly rate and transport preferences"
    },
    {
      num: 3,
      title: "Start Earning",
      desc: "Get verified and start receiving booking requests"
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-sewakhoj-red/5 to-blue-600/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full mb-6 shadow-sm">
              <div className="w-2 h-2 bg-sewakhoj-red rounded-full animate-pulse" />
              <span className="text-sm font-bold text-gray-700">Now Accepting Applications</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tighter">
              Turn Your Skills into 
              <span className="text-sewakhoj-red block">Serious Earnings</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join Nepal's fastest-growing service marketplace. Set your own rates, work on your own schedule, 
              and build a professional reputation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/signup?redirect=/tasker/onboard"
                className="inline-flex items-center justify-center gap-3 bg-sewakhoj-red text-white px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-2xl shadow-red-500/20"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center justify-center gap-3 bg-white text-gray-900 border-2 border-gray-200 px-10 py-5 rounded-2xl font-bold uppercase text-sm tracking-widest hover:bg-gray-50 active:scale-95 transition-all"
              >
                Browse Services
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Verified Taskers Only</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Growing Community</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span className="font-medium">Top Ratings</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Why Become a Tasker?
            </h2>
            <p className="text-lg text-gray-600 font-medium">
              Join Nepal's founding community of professional taskers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="text-center group">
                <div className={`w-20 h-20 bg-gradient-to-br ${benefit.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-${benefit.color.split(' ')[1]}/20 group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Simple 3-Step Process
            </h2>
            <p className="text-lg text-gray-600 font-medium">
              Get started in minutes, not days
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step) => (
              <div key={step.num} className="text-center relative">
                <div className="w-20 h-20 bg-sewakhoj-red text-white rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-6 shadow-2xl shadow-red-500/20">
                  {step.num}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                
                {step.num < 3 && (
                  <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-sewakhoj-red to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-sewakhoj-red text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-lg md:text-xl text-red-100 mb-8">
            Join the founding community of taskers on SewaKhoj
          </p>
          <Link
            href="/tasker/onboard"
            className="inline-flex items-center justify-center gap-3 bg-white text-sewakhoj-red px-12 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-gray-100 active:scale-95 transition-all shadow-2xl"
          >
            Become a Tasker <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}