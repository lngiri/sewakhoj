"use client";

import { ArrowRight, Search, CheckCircle2, Star, ShieldCheck, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { services } from "@/data/services";
import { supabase } from "@/lib/supabase";

const subServicesMap: Record<string, string[]> = {
  plumbing: ["Leak Repair", "Pipe Installation", "Faucet & Shower Fix", "Drain Cleaning", "Water Tank Cleaning", "Geyser Repair"],
  cleaning: ["Deep Home Cleaning", "Kitchen Sanitization", "Bathroom Scrubbing", "Sofa & Carpet Wash", "Window Cleaning", "Office Cleaning"],
  electrical: ["Wiring & Rewiring", "Switch & Socket Repair", "Fan & Light Fitting", "Fuse Box Fix", "Inverter Setup", "Short Circuit Repair"],
  moving: ["House Shifting", "Office Relocation", "Furniture Disassembly", "Packing & Unpacking", "Heavy Loading", "Local Transport"],
  tutoring: ["Math & Science", "Language Classes", "Music Lessons", "Coding for Kids", "Exam Preparation", "Art & Craft"],
  cooking: ["Daily Meal Prep", "Event Catering", "Party Chef", "Dietary Special Meals", "Kitchen Management", "Traditional Cuisine"],
  painting: ["Interior Wall Paint", "Exterior Finishing", "Wall Putty & Primer", "Texture Painting", "Waterproofing", "Wood & Metal Polish"],
  gardening: ["Lawn Mowing", "Hedge Trimming", "Plantation & Soil Care", "Pest Control", "Garden Design", "Vertical Garden Setup"],
  "tech-help": ["PC & Laptop Repair", "Wi-Fi & Router Setup", "Software Install", "Data Recovery", "Printer Fix", "Smart Home Setup"],
  driver: ["City Daily Driver", "Outstation Trip", "Airport Pickup/Drop", "Monthly Driver", "Luxury Car Handling", "Valet Service"],
  caretaking: ["Elderly Care", "Patient Assistance", "Baby Sitting", "House Sitting", "Property Monitoring", "General Support"],
  "pet-care": ["Dog Walking", "Pet Grooming", "Pet Sitting", "Training Basics", "Vet Visit Assist", "Nutritional Care"]
};

export default function ServicesCatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dbServices, setDbServices] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDbServices() {
      const { data } = await supabase.from('services').select('*');
      if (data && data.length > 0) {
        setDbServices(data);
      }
    }
    fetchDbServices();
  }, []);

  const displayServices = (dbServices.length > 0 ? dbServices : services).filter(s => {
    const query = searchQuery.toLowerCase();
    const name = (s.nameEn || s.name || "").toLowerCase();
    const desc = (s.descriptionEn || s.description || "").toLowerCase();
    return name.includes(query) || desc.includes(query);
  });
  return (
    <main className="min-h-screen bg-white">
      {/* Premium Hero Section */}
      <section className="relative bg-slate-900 pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-20 w-96 h-96 bg-sewakhoj-red rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/80 text-xs font-black uppercase tracking-widest mb-8 border border-white/10">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            Complete Service Portfolio
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Professional Services for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sewakhoj-red to-orange-400">Every Corner of Your Life</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 font-medium">
            Explore our curated catalog of verified services. From minor repairs to major projects, we connect you with Nepal's most trusted specialists.
          </p>
          
          <div className="max-w-xl mx-auto relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-sewakhoj-red transition-colors" />
            <input 
              type="text" 
              placeholder="What do you need help with today?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border-2 border-white/10 rounded-[30px] py-6 pl-14 pr-8 text-white focus:bg-white focus:text-slate-900 focus:border-sewakhoj-red outline-none transition-all font-bold"
            />
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="max-w-7xl mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: "Verified Pros", desc: "Every tasker is background checked" },
            { icon: Clock, title: "On-Time Service", desc: "Punctuality is our top priority" },
            { icon: CheckCircle2, title: "Quality Assured", desc: "100% satisfaction guarantee" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 flex items-center gap-4 border border-slate-50">
              <div className="w-12 h-12 bg-sewakhoj-red/10 rounded-2xl flex items-center justify-center">
                <item.icon className="w-6 h-6 text-sewakhoj-red" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">{item.title}</h4>
                <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="max-w-7xl mx-auto px-4 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {displayServices.map((service) => (
            <div key={service.id} className="group">
              <div className="relative mb-8 overflow-hidden rounded-[40px] aspect-[4/3] bg-slate-50">
                <img 
                  src={service.image_url || `https://images.unsplash.com/photo-${service.id === 'plumbing' ? '1584622650111-993a426fbf0a' : service.id === 'cleaning' ? '1581578731548-c64695cc6952' : service.id === 'electrical' ? '1621905251189-08b45d6a269e' : '1504328345606-18bbc8c9d7d1'}?auto=format&fit=crop&q=80&w=800`} 
                  alt={service.nameEn || service.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="text-4xl mb-4 transform group-hover:scale-125 transition-transform duration-500">{service.emoji}</div>
                  <h3 className="text-3xl font-black text-white mb-2">{service.nameEn || service.name}</h3>
                  <p className="text-white/70 text-sm font-medium line-clamp-2">{service.descriptionEn || service.description}</p>
                </div>
              </div>

              <div className="space-y-4 px-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Included Sub-Services</h4>
                <div className="flex flex-wrap gap-2">
                  {(service.sub_services || subServicesMap[service.id])?.map((sub: string, i: number) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold border border-slate-100 group-hover:border-sewakhoj-red/20 group-hover:bg-sewakhoj-red/5 transition-colors">
                      {sub}
                    </span>
                  ))}
                </div>
                
                <Link 
                  href={`/services/${service.id}`}
                  className="inline-flex items-center gap-2 text-sewakhoj-red font-black text-xs uppercase tracking-widest mt-6 group/link"
                >
                  Find {service.nameEn || service.name} Pros
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-8">Can't find what you're looking for?</h2>
          <p className="text-lg text-slate-500 mb-12 font-medium">
            Our concierge team can help you find specialists for unique or custom tasks not listed in our catalog.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/post-task" 
              className="bg-sewakhoj-red text-white px-10 py-5 rounded-[20px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-red-200 hover:scale-105 active:scale-95 transition-all"
            >
              Post a Custom Task
            </Link>
            <Link 
              href="/contact" 
              className="bg-white text-slate-900 border-2 border-slate-200 px-10 py-5 rounded-[20px] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-50 transition-all"
            >
              Talk to Support
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
