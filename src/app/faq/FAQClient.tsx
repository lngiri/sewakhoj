"use client";

import Link from "next/link";
import { Search, HelpCircle, MessageCircle, Shield, CreditCard, UserPlus } from "lucide-react";
import PageHeader from "@/components/navigation/PageHeader";
import { useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Head from "next/head";

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { getWhatsAppNumber, getWhatsAppLink } = useSiteSettings();

  const faqs = [
    {
      category: "General",
      categoryNp: "सामान्य",
      icon: <HelpCircle className="w-5 h-5 text-blue-500" />,
      items: [
        {
          q: "What is SewaKhoj?",
          q_np: "SewaKhoj के हो?",
          a: "SewaKhoj is Nepal's trusted marketplace connecting customers with skilled local professionals (Taskers) for home services, repairs, cleaning, and more.",
          a_np: "SewaKhoj नेपालको एक विश्वसनीय प्लेटफर्म हो जसले ग्राहकहरूलाई घरको सेवा, मर्मत, सरसफाई र अन्य कामका लागि दक्ष स्थानीय पेशेवरहरू (Taskers) सँग जोड्दछ।"
        },
        {
          q: "Is it free to use?",
          q_np: "के यो प्रयोग गर्न नि:शुल्क छ?",
          a: "Browsing and posting tasks is free for customers. We charge a small service fee once a task is successfully completed.",
          a_np: "ग्राहकहरूका लागि कार्यहरू खोज्न र पोस्ट गर्न नि:शुल्क छ। कार्य सफलतापूर्वक सम्पन्न भएपछि हामी सानो सेवा शुल्क लिन्छौं।"
        }
      ]
    },
    {
      category: "Booking & Payments",
      categoryNp: "बुकिङ र भुक्तानी",
      icon: <CreditCard className="w-5 h-5 text-green-500" />,
      items: [
        {
          q: "How do I pay for the service?",
          q_np: "मैले सेवाको लागि कसरी भुक्तानी गर्ने?",
          a: "You can pay via eSewa or Cash after the work is completed. Pricing is transparent and discussed upfront.",
          a_np: "तपाईंले काम सकिएपछि eSewa वा नगद (Cash) मार्फत भुक्तानी गर्न सक्नुहुन्छ। मूल्य निर्धारण पारदर्शी हुन्छ।"
        },
        {
          q: "Can I cancel a booking?",
          q_np: "के म बुकिङ रद्द गर्न सक्छु?",
          a: "Yes, you can cancel your booking from your dashboard. However, frequent last-minute cancellations may affect your user rating.",
          a_np: "हो, तपाईंले आफ्नो ड्यासबोर्डबाट बुकिङ रद्द गर्न सक्नुहुन्छ। तर, अन्तिम समयमा बारम्बार रद्द गर्दा तपाईंको रेटिङमा असर पर्न सक्छ।"
        }
      ]
    },
    {
      category: "Safety & Trust",
      categoryNp: "सुरक्षा र विश्वास",
      icon: <Shield className="w-5 h-5 text-red-500" />,
      items: [
        {
          q: "Are the Taskers verified?",
          q_np: "के Taskers प्रमाणित छन्?",
          a: "Yes, every Tasker on SewaKhoj undergoes a strict KYC process, including government ID verification and background checks.",
          a_np: "हो, SewaKhoj मा भएका प्रत्येक Tasker को सरकारी परिचयपत्र र पृष्ठभूमि जाँच सहित कडा KYC प्रक्रिया गरिन्छ।"
        },
        {
          q: "What if the work is not satisfactory?",
          q_np: "यदि काम सन्तोषजनक भएन भने के गर्ने?",
          a: "We offer a satisfaction guarantee. If the work isn't up to standard, contact our support team within 24 hours, and we will resolve it.",
          a_np: "हामी सन्तोषजनक कामको ग्यारेन्टी दिन्छौं। यदि काम स्तरीय छैन भने, २४ घण्टा भित्र हाम्रो सहयोग टोलीलाई सम्पर्क गर्नुहोस्।"
        }
      ]
    },
    {
      category: "For Taskers",
      categoryNp: "कामदारहरूका लागि",
      icon: <UserPlus className="w-5 h-5 text-purple-500" />,
      items: [
        {
          q: "How can I join as a Tasker?",
          q_np: "म कसरी Tasker को रूपमा जोडिन सक्छु?",
          a: "Click on 'Become a Tasker' on the homepage, fill out the onboarding form, upload your ID, and wait for our approval.",
          a_np: "होमपेजमा 'Become a Tasker' मा क्लिक गर्नुहोस्, फारम भर्नुहोस्, आफ्नो परिचयपत्र अपलोड गर्नुहोस् र हाम्रो स्वीकृतिको प्रतीक्षा गर्नुहोस्।"
        },
        {
          q: "How much can I earn?",
          q_np: "मैले कति कमाउन सक्छु?",
          a: "You set your own hourly or fixed rates. Your earnings depend on the number of tasks you complete and your performance rating.",
          a_np: "तपाईंले आफ्नो प्रतिघण्टा वा निश्चित दर आफैं सेट गर्नुहुन्छ। तपाईंको कमाई तपाईंले पूरा गर्नुभएको काम र रेटिङमा भर पर्छ।"
        }
      ]
    }
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.flatMap(cat => cat.items.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    })))
  };

  const filteredFaqs = faqs.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.q_np.includes(searchQuery) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a_np.includes(searchQuery)
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </Head>
      <main className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 text-center">
          <PageHeader
            title="Frequently Asked Questions"
            description="Find answers to common questions about SewaKhoj"
            className="mb-6 [&_.breadcrumbs-wrapper]:justify-center [&_.title-wrapper]:hidden"
            relatedLinks={[
              { href: "/contact", label: "Contact Support" },
              { href: "/services", label: "Our Services" },
            ]}
          />
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
            <span className="text-sm font-medium">How can we help?</span>
            <span className="text-xs text-gray-500 font-devanagari" style={{whiteSpace: 'pre-wrap', wordSpacing: '0.1em'}}>हामी कसरी मद्दत गर्न सक्छौं?</span>
          </h1>
          <p className="text-xl text-gray-800 font-bold mb-10">
            Find answers to frequently asked questions about SewaKhoj. <br />
            <span className="text-gray-500 font-devanagari text-lg block mt-2">सेवाखोजको बारेमा बारम्बार सोधिने प्रश्नहरूको जवाफ यहाँ फेला पार्नुहोस्।</span>
          </p>

          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-y-0 left-5 flex items-center text-gray-900">
              <Search className="w-6 h-6" />
            </div>
            <input
              type="text"
              placeholder="Search questions... / प्रश्नहरू खोज्नुहोस्..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-gray-100 border-none rounded-3xl text-lg font-bold focus:ring-2 focus:ring-sewakhoj-red transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="space-y-12">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((category, idx) => (
              <section key={idx}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                    {category.icon}
                  </div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">
                    <span className="text-sm font-medium">{category.category}</span>
                    <span className="text-xs text-gray-500 font-devanagari" style={{whiteSpace: 'pre-wrap', wordSpacing: '0.1em'}}>{category.categoryNp}</span>
                  </h2>
                </div>

                <div className="space-y-4">
                  {category.items.map((item, i) => (
                    <details key={i} className="group bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:border-sewakhoj-red/30">
                      <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                        <div className="pr-4">
                          <h3 className="font-black text-gray-900 group-open:text-sewakhoj-red transition-colors text-lg leading-tight mb-1">
                            {item.q}
                          </h3>
                          <p className="text-sm font-bold text-gray-700 italic">{item.q_np}</p>
                        </div>
                        <span className="text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </span>
                      </summary>
                      <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-1">
                        <div className="h-px bg-gray-100 mb-6" />
                        <p className="text-gray-900 font-bold leading-relaxed mb-4 text-lg">
                          {item.a}
                        </p>
                        <p className="text-gray-800 font-medium leading-relaxed italic">
                          {item.a_np}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">🔍</div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">
                <span className="text-sm font-medium">No results found</span>
                <span className="text-xs text-gray-500 font-devanagari" style={{whiteSpace: 'pre-wrap', wordSpacing: '0.1em'}}>कुनै परिणाम फेला परेन</span>
              </h3>
              <p className="text-gray-800 font-bold">
                <span className="text-sm font-medium">Try searching for something else.</span>
                <span className="text-xs text-gray-500 font-devanagari" style={{whiteSpace: 'pre-wrap', wordSpacing: '0.1em'}}>कृपया अर्को शब्द खोजी हेर्नुहोस्।</span>
              </p>
            </div>
          )}
        </div>

        {/* Support CTA */}
        <div className="mt-20 bg-gradient-to-br from-gray-900 to-gray-800 rounded-[40px] p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sewakhoj-red/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">💬</div>
            <h2 className="text-3xl md:text-4xl font-black mb-4">
                <span className="text-sm font-medium">Still have questions?</span>
                <span className="text-xs text-gray-500 font-devanagari" style={{whiteSpace: 'pre-wrap', wordSpacing: '0.1em'}}>अझै प्रश्नहरू छन्?</span>
              </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto font-medium">
              If you couldn't find the answer you were looking for, our team is ready to help you. We respond within 24 hours. <br />
              <span className="text-gray-400 font-devanagari mt-2 block">यदि तपाईंले खोजिरहनुभएको जवाफ फेला पार्न सक्नुभएन भने, हाम्रो टोली तपाईंलाई २४/७ मद्दत गर्न तयार छ।</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex flex-col items-center leading-tight">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Chat on WhatsApp
                </div>
                <span className="text-[10px] opacity-80 mt-1 font-devanagari font-bold normal-case">व्हाट्सएपमा कुराकानी गर्नुहोस् (+{getWhatsAppNumber()})</span>
              </a>
              <a href="mailto:hello@sewakhoj.com" className="px-8 py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-2xl font-black uppercase text-sm tracking-widest transition-all flex flex-col items-center leading-tight">
                <span>Email Support</span>
                <span className="text-[10px] text-gray-400 mt-1 font-devanagari font-bold normal-case">इमेल मार्फत सहयोग</span>
              </a>
            </div>
          </div>
</div>
       </div>
     </main>
   </>
 );
}
