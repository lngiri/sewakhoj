"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Scale, FileText, AlertCircle, Globe } from "lucide-react";

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms / सर्तहरूको स्वीकृति",
      icon: <ShieldCheck className="w-6 h-6 text-sewakhoj-red" />,
      content: "By accessing or using the SewaKhoj platform, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use this platform.",
      content_np: "SewaKhoj प्लेटफर्ममा पहुँच गरेर वा प्रयोग गरेर, तपाईं यी सेवाका सर्तहरूद्वारा बाँधिन सहमत हुनुहुन्छ। यदि तपाईं यी सबै सर्तहरूमा सहमत हुनुहुन्न भने, यो प्लेटफर्म प्रयोग नगर्नुहोस्।"
    },
    {
      title: "2. Service Marketplace / सेवा बजार",
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      content: "SewaKhoj is a marketplace that connects customers with independent service providers (Taskers). SewaKhoj does not provide the services directly and is not an employer of Taskers.",
      content_np: "SewaKhoj एक बजार हो जसले ग्राहकहरूलाई स्वतन्त्र सेवा प्रदायकहरू (Taskers) सँग जोड्दछ। SewaKhoj ले सीधा सेवाहरू प्रदान गर्दैन र Taskers को रोजगारदाता होइन।"
    },
    {
      title: "3. User Accounts / प्रयोगकर्ता खाताहरू",
      icon: <Scale className="w-6 h-6 text-green-500" />,
      content: "You are responsible for maintaining the confidentiality of your account and password. You must be at least 18 years old to create an account on SewaKhoj.",
      content_np: "तपाईं आफ्नो खाता र पासवर्डको गोपनीयता कायम राख्न जिम्मेवार हुनुहुन्छ। SewaKhoj मा खाता खोल्न तपाईं कम्तिमा १८ वर्षको हुनुपर्छ।"
    },
    {
      title: "4. Payments & Refunds / भुक्तानी र फिर्ता",
      icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
      content: "Payments for services are made directly to Taskers or through our platform. SewaKhoj facilitates dispute resolution but is not responsible for refunding payments made outside the platform.",
      content_np: "सेवाहरूको लागि भुक्तानी सीधा Taskers लाई वा हाम्रो प्लेटफर्म मार्फत गरिन्छ। SewaKhoj ले विवाद समाधानमा सहजीकरण गर्छ तर प्लेटफर्म बाहिर गरिएको भुक्तानी फिर्ता गर्न जिम्मेवार हुँदैन।"
    },
    {
      title: "5. Third-Party Bookings (Family Support)",
      icon: <Globe className="w-6 h-6 text-blue-600" />,
      content: "Users may book services for third parties (e.g., family members in Nepal). The 'Booker' is responsible for providing accurate recipient contact details and remains liable for all fees. Taskers are authorized to enter the provided location based on the Booker's request.",
      content_np: "प्रयोगकर्ताहरूले तेस्रो पक्षहरू (जस्तै नेपालमा रहेका परिवारका सदस्यहरू) का लागि सेवाहरू बुक गर्न सक्छन्। 'बुकर' सही प्राप्तकर्ता सम्पर्क विवरणहरू प्रदान गर्न जिम्मेवार छ र सबै शुल्कहरूको लागि उत्तरदायी रहन्छ।"
    },
    {
      title: "6. Global Compliance & Jurisdiction",
      icon: <Scale className="w-6 h-6 text-purple-600" />,
      content: "These terms are governed by the laws of Nepal. However, for users accessing from abroad, we comply with international consumer protection standards. Any disputes will be resolved through arbitration in Kathmandu, Nepal.",
      content_np: "यी सर्तहरू नेपालको कानूनद्वारा शासित छन्। यद्यपि, विदेशबाट पहुँच गर्ने प्रयोगकर्ताहरूका लागि, हामी अन्तर्राष्ट्रिय उपभोक्ता संरक्षण मापदण्डहरूको पालना गर्छौं।"
    },
    {
      title: "7. Cancellation & Refund Policy / रद्दीकरण र फिर्ता नीति",
      icon: <AlertCircle className="w-6 h-6 text-amber-600" />,
      content: "Customers may cancel bookings up to 2 hours before the scheduled start time for a full refund. Cancellations within 2 hours or after the task has started are non-refundable. Taskers must provide at least 24 hours notice for cancellations. Refunds are processed within 5-7 business days.",
      content_np: "ग्राहकहरूले निर्धारित सुरु हुने समयभन्दा २ घण्टा अगाडि बुकिङहरू फुल रिफन्डको लागि रद्द गर्न सक्छन्। २ घण्टाभित्र वा कार्य सुरु भएपछि केही हुँदैन। Taskers ले रद्दीकरणको लागि कम्तिमा २४ घण्टा सूचना दिनुपर्छ। फिर्ता ५-७ कार्य दिनभित्र प्रोसेस हुन्छ।"
    },
    {
      title: "8. Limitation of Liability / जिम्मेवारीको सीमा",
      icon: <ShieldCheck className="w-6 h-6 text-sewakhoj-red" />,
      content: "SewaKhoj serves as a platform to connect users with service providers. We are not liable for the quality, safety, or outcome of services provided by Taskers. Our total liability for any claim related to the platform is limited to the amount paid for the service in question. We do not warrant that the platform will be uninterrupted or error-free.",
      content_np: "SewaKhoj ले प्रयोगकर्ताहरूलाई सेवा प्रदायकहरूसँग जोड्ने प्लेटफर्मको रूपमा सेवा प्रदान गर्छ। Taskers द्वारा प्रदान गरिएको सेवाहरूको गुणस्तर, सुरक्षा वा नतिजाको लागि हामी जिम्मेवार छैनौं। प्लेटफर्मसँग सम्बन्धित कुनै पनि दावाको हाम्रो कुल जिम्मेवारी सोधिएको सेवाको लागि भुक्तान रकमसम्म सीमित छ।"
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sewakhoj-red font-black uppercase text-[10px] tracking-widest mb-8 hover:underline">
            <ArrowLeft className="w-4 h-4" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Back to Home</span>
              <span className="text-xs text-sewakhoj-red font-devanagari" style={{whiteSpace: 'pre-wrap', wordSpacing: '0.1em'}}>गृह पृष्ठ</span>
            </div>
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
            Terms of Service / सेवाका सर्तहरू
          </h1>
          <p className="text-xl text-gray-800 font-bold max-w-2xl mx-auto">
            Please read these terms carefully before using our platform.
            <br/>
            <span className="text-gray-600 italic">कृपया हाम्रो प्लेटफर्म प्रयोग गर्नु अघि यी सर्तहरू ध्यानपूर्वक पढ्नुहोस्।</span>
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8 md:p-12 space-y-12">
            {sections.map((section, idx) => (
              <section key={idx} className="relative pl-16">
                <div className="absolute left-0 top-0 w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm">
                  {section.icon}
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-4">{section.title}</h2>
                <div className="space-y-4">
                  <p className="text-lg text-gray-900 font-bold leading-relaxed">
                    {section.content}
                  </p>
                  <p className="text-gray-800 font-medium leading-relaxed italic border-l-4 border-gray-100 pl-4">
                    {section.content_np}
                  </p>
                </div>
              </section>
            ))}

            <div className="pt-8 border-t border-gray-100">
              <p className="text-sm text-gray-700 font-bold text-center">
                Last updated: May 2026 / अन्तिम अपडेट: मे २०२६
              </p>
            </div>
          </div>
        </div>

        {/* Quick Contact */}
        <div className="mt-12 text-center">
          <p className="text-gray-800 font-bold mb-4">Questions about our terms? / हाम्रा सर्तहरू बारे प्रश्नहरू छन्?</p>
          <div className="flex flex-col items-center gap-4">
            <Link href="/faq" className="text-sewakhoj-red font-black uppercase text-xs tracking-widest hover:underline">
              Visit Help Center / सहायता केन्द्रमा जानुहोस्
            </Link>
            <p className="text-sm text-gray-500">
              Or email us at <a href="mailto:hello@sewakhoj.com" className="text-gray-900 font-bold hover:underline">hello@sewakhoj.com</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
