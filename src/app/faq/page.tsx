import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FAQPage() {
  const faqs = [
    { q: "What is SewaKhoj?", a: "SewaKhoj is Nepal's trusted platform connecting customers with skilled local taskers for home services, repairs, and more." },
    { q: "How do I book a tasker?", a: "Simply browse the categories, select a tasker that meets your needs, and follow the booking steps to schedule a service." },
    { q: "How do I pay?", a: "You can pay online via eSewa or Khalti (with a 5% discount) or choose Cash on Delivery." },
    { q: "Is it safe?", a: "Yes, all taskers on SewaKhoj are verified through a strict KYC process, including government ID verification." },
    { q: "Can I cancel a booking?", a: "Yes, you can cancel your booking from your dashboard. Please refer to our cancellation policy for details." }
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sewakhoj-red hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> गृह पृष्ठ
        </Link>
        <h1 className="text-4xl font-black text-gray-900 mb-8">Frequently Asked Questions / बारम्बार सोधिने प्रश्नहरू</h1>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
