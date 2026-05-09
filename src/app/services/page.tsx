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
            <span className="block font-devanagari text-sewakhoj-red mb-2 text-3xl md:text-5xl">
              तपाईंको जीवनको हरेक क्षेत्रका लागि व्यावसायिक सेवाहरू
            </span>
            Professional Services for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sewakhoj-red to-orange-400">Every Corner of Your Life</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 font-medium">
            Explore our curated catalog of verified services. From minor repairs to major projects, we connect you with Nepal's most trusted specialists.
            <br />
            <span className="text-slate-500 text-sm mt-2 block">
              हाम्रो प्रमाणित सेवाहरूको सूची अन्वेषण गर्नुहोस्। सानो मर्मतदेखि ठूला परियोजनाहरूसम्म, हामी तपाईंलाई नेपालका सबैभन्दा भरपर्दो विशेषज्ञहरूसँग जोड्दछौं।
            </span>
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
            { icon: ShieldCheck, title: "Verified Pros", titleNp: "प्रमाणित प्रोहरू", desc: "Every tasker is background checked", descNp: "प्रत्येक साथीको पृष्ठभूमि जाँच गरिएको छ" },
            { icon: Clock, title: "On-Time Service", titleNp: "समयमै सेवा", desc: "Punctuality is our top priority", descNp: "समयको पाबन्दी हाम्रो प्राथमिकता हो" },
            { icon: CheckCircle2, title: "Quality Assured", titleNp: "गुणस्तर सुनिश्चित", desc: "100% satisfaction guarantee", descNp: "१००% सन्तुष्टि ग्यारेन्टी" }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 flex items-center gap-4 border border-slate-50">
              <div className="w-12 h-12 bg-sewakhoj-red/10 rounded-2xl flex items-center justify-center">
                <item.icon className="w-6 h-6 text-sewakhoj-red" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm leading-tight">
                  {item.title} <span className="block text-[12px] text-slate-600 font-devanagari mt-0.5">{item.titleNp}</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-1.5">
                  {item.desc} <span className="block text-[10px] text-slate-400 mt-0.5 italic">{item.descNp}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog Grid */}
      <section className="max-w-7xl mx-auto px-4 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {displayServices.map((service) => {
            const getIcon = (s: any) => {
              if (s.emoji) return s.emoji;
              if (s.icon) return s.icon;
              const name = (s.nameEn || s.name || "").toLowerCase();
              if (name.includes('carpentry')) return '🔨';
              if (name.includes('painting')) return '🎨';
              if (name.includes('plumbing')) return '🔧';
              if (name.includes('clean')) return '🧹';
              if (name.includes('electric')) return '⚡';
              if (name.includes('move')) return '📦';
              if (name.includes('tutoring')) return '📚';
              return '🔧';
            };

            const fallbackImage = (s: any) => {
              const id = (s.id || '').toLowerCase();
              const name = (s.nameEn || s.name || '').toLowerCase();
              const map: any = {
                'plumbing': '1584622650111-993a426fbf0a',
                'cleaning': '1581578731548-c64695cc6952',
                'electrical': '1621905251189-08b45d6a269e',
                'moving': '1600585154340-be6161a56a0c',
                'painting': '1562259946-08eb536c8499',
                'gardening': '1585320806297-9794b3e4eeae',
                'tutoring': '1434030216411-0b793f4b4173',
                'tech-help': '1518770660219-4672373070b1',
                'driver': '1449965072631-45c3aade10c1'
              };

              // Keyword matching for database entries with UUIDs
              let foundId = map[id];
              if (!foundId) {
                if (name.includes('plumbing')) foundId = map['plumbing'];
                else if (name.includes('cleaning')) foundId = map['cleaning'];
                else if (name.includes('elect')) foundId = map['electrical'];
                else if (name.includes('move') || name.includes('shifting')) foundId = map['moving'];
                else if (name.includes('paint')) foundId = map['painting'];
                else if (name.includes('garden')) foundId = map['gardening'];
                else if (name.includes('tutor') || name.includes('class')) foundId = map['tutoring'];
                else if (name.includes('tech') || name.includes('pc')) foundId = map['tech-help'];
                else if (name.includes('drive')) foundId = map['driver'];
              }

              return `https://images.unsplash.com/photo-${foundId || '1504328345606-18bbc8c9d7d1'}?auto=format&fit=crop&q=80&w=800`;
            };

            return (
              <div key={service.id} className="group">
                <div className="relative mb-8 overflow-hidden rounded-[40px] aspect-[4/3] bg-slate-100 shadow-lg shadow-slate-200">
                  <img 
                    src={service.image_url || fallbackImage(service)} 
                    alt={service.nameEn || service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImage(service);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="text-4xl mb-4 transform group-hover:scale-125 transition-transform duration-500">{getIcon(service)}</div>
                    <h3 className="text-2xl md:text-3xl font-black text-white mb-1 leading-tight">
                      {service.nameEn || service.name}
                    </h3>
                    <div className="text-sewakhoj-red font-devanagari text-lg md:text-xl font-bold mb-3">
                      {service.nameNp || service.name_ne || ''}
                    </div>
                    <p className="text-white/80 text-xs md:text-sm font-medium line-clamp-2 leading-relaxed">
                      {service.descriptionEn || service.description}
                      <span className="block mt-1 text-white/50 text-[10px] italic">
                        {service.descriptionNp || service.description_ne || ''}
                      </span>
                    </p>
                  </div>
                </div>

              <div className="space-y-4 px-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  Included Sub-Services
                  <span className="text-[9px] text-slate-300 font-devanagari normal-case">(समावेश गरिएका उप-सेवाहरू)</span>
                </h4>
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
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-8">
            <span className="block font-devanagari text-sewakhoj-red text-2xl md:text-4xl mb-4">के तपाईंले खोजिरहनुभएको सेवा भेट्टाउनुभएन?</span>
            Can't find what you're looking for?
          </h2>
          <p className="text-lg text-slate-500 mb-12 font-medium">
            Our concierge team can help you find specialists for unique or custom tasks not listed in our catalog.
            <br />
            <span className="text-slate-400 text-sm mt-2 block italic">
              हाम्रो ढोकापाले टोलीले तपाईंलाई हाम्रो सूचीमा नपरेका अद्वितीय वा अनुकूल कार्यहरूको लागि विशेषज्ञहरू फेला पार्न मद्दत गर्न सक्छ।
            </span>
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
