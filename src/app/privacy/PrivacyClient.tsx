import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, RefreshCw, Trash2, Globe } from "lucide-react";
import PageHeader from "@/components/navigation/PageHeader";

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Compliance with Nepal's Privacy Laws",
      icon: <Shield className="w-5 h-5 text-sewakhoj-red" />,
      content: "We operate in strict accordance with the Individual Privacy Act, 2075 (2018) and the Right to Privacy guaranteed under Article 28 of the Constitution of Nepal. Your personal data is protected as a fundamental right."
    },
    {
      title: "2. Consent & Purpose Specification",
      icon: <Eye className="w-5 h-5 text-blue-500" />,
      content: "As per the Individual Privacy Act 2075, we collect your personal information only with your explicit consent. We specify the purpose of collection (e.g., service booking, payment) and ensure your data is not used for any unrelated activities without further approval."
    },
    {
      title: "3. Nepal IT Act Compliance",
      icon: <Shield className="w-5 h-5 text-green-600" />,
      content: "As a Nepali platform, we fully comply with the Electronic Transactions Act, 2063 (2008) and the Individual Privacy Act, 2075 (2018). We maintain data within Nepal's jurisdiction and follow Nepali data protection standards for all users."
    },
    {
      title: "4. Information Collection",
      icon: <Lock className="w-5 h-5 text-amber-500" />,
      content: "We collect identifiers (Name, Phone, Address), citizenship/KYC details for taskers, and recipient data for international service bookings. All sensitive documents are encrypted and stored in secure local and cloud infrastructures."
    },
    {
      title: "5. Your Rights (Access & Deletion)",
      icon: <Trash2 className="w-5 h-5 text-rose-500" />,
      content: "Under the Individual Privacy Act, you have the right to access your data, request corrections, and demand the deletion of your personal information once its purpose is fulfilled ('Right to be Forgotten')."
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <PageHeader
          title="Privacy Policy"
          description="Your privacy is our priority"
          showBack
          backHref="/"
          className="mb-12"
          relatedLinks={[
            { href: "/terms", label: "Terms of Service" },
            { href: "/contact", label: "Contact Us" },
          ]}
        />

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

            <section id="cookies" className="flex gap-6 scroll-mt-24">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100">
                <RefreshCw className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-2">6. Cookies & Tracking Technologies</h2>
                <p className="text-gray-600 leading-relaxed font-medium">
                  We use cookies and similar tracking technologies to track activity on our platform and hold certain information.
                  Cookies are files with a small amount of data which may include an anonymous unique identifier.
                  You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                  However, if you do not accept cookies, you may not be able to use some portions of our Service.
                </p>
              </div>
            </section>

            <div className="pt-12 border-t border-gray-100 text-center">
              <p className="text-gray-900 font-black uppercase text-xs tracking-widest mb-4">Data Protection Officer</p>
              <p className="text-sm text-gray-500 font-medium italic mb-8">For any privacy-related inquiries or to exercise your GDPR rights:</p>
              <a href="mailto:dpo@sewakhoj.com" className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl">Contact DPO</a>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
          Last Updated: May 10, 2026 • Compliant with Individual Privacy Act 2075 (Nepal)
        </div>
      </div>
    </main>
  );
}
