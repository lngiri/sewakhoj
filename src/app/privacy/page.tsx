import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, RefreshCw, Trash2, Globe } from "lucide-react";

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Global Data Protection (GDPR & CCPA)",
      icon: <Globe className="w-5 h-5 text-blue-500" />,
      content: "As a global platform serving the Nepali diaspora, we comply with international data protection standards including GDPR (EU) and CCPA (USA). Your data is processed securely and with full transparency."
    },
    {
      title: "2. Information We Collect",
      icon: <Eye className="w-5 h-5 text-purple-500" />,
      content: "We collect personal identifiers (Name, Email, Phone), location data, and payment details. For international bookings, we also collect recipient information (family member details in Nepal) provided by you."
    },
    {
      title: "3. International Data Transfers",
      icon: <RefreshCw className="w-5 h-5 text-green-500" />,
      content: "Your data may be transferred to and processed in Nepal and other countries where our servers are located. We use Standard Contractual Clauses (SCCs) to ensure your data remains protected during cross-border transfers."
    },
    {
      title: "4. Your Rights (Access & Control)",
      icon: <Trash2 className="w-5 h-5 text-rose-500" />,
      content: "You have the right to: (a) Access your personal data, (b) Correct inaccuracies, (c) Request data erasure ('Right to be Forgotten'), and (d) Object to automated processing. Email dpo@sewakhoj.com to exercise these rights."
    },
    {
      title: "5. Data Retention",
      icon: <Lock className="w-5 h-5 text-amber-500" />,
      content: "We retain your data only for as long as necessary to provide services and comply with legal obligations. Financial records are kept for 7 years as per international accounting standards."
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sewakhoj-red font-black uppercase text-xs tracking-widest mb-12 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Home / गृह पृष्ठ
        </Link>
        
        <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-sewakhoj-red to-red-600 p-12 text-white text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 opacity-80" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Privacy Policy</h1>
            <p className="text-red-100 font-bold max-w-xl mx-auto">Your privacy is our priority. We protect your data across borders and jurisdictions.</p>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            {sections.map((section, idx) => (
              <section key={idx} className="flex gap-6">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 mb-2">{section.title}</h2>
                  <p className="text-gray-600 leading-relaxed font-medium">{section.content}</p>
                </div>
              </section>
            ))}

            <div className="pt-12 border-t border-gray-100 text-center">
              <p className="text-gray-900 font-black uppercase text-xs tracking-widest mb-4">Data Protection Officer</p>
              <p className="text-sm text-gray-500 font-medium italic mb-8">For any privacy-related inquiries or to exercise your GDPR rights:</p>
              <a href="mailto:dpo@sewakhoj.com" className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl">Contact DPO</a>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
          Last Updated: May 9, 2026 • Globally Compliant V2.0
        </div>
      </div>
    </main>
  );
}
