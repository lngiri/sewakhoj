import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sewakhoj-red hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> गृह पृष्ठ
        </Link>
        <h1 className="text-4xl font-black text-gray-900 mb-8">Terms of Service / सेवाका सर्तहरू</h1>
        <div className="prose prose-red max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using the SewaKhoj platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Service Marketplace</h2>
            <p>SewaKhoj is a marketplace platform. We facilitate the connection between Customers and Taskers. We do not employ Taskers; they are independent contractors.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Responsibilities</h2>
            <p>Users must provide accurate information and maintain the security of their accounts. Any fraudulent activity will lead to immediate suspension.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Payments & Fees</h2>
            <p>Payments can be made via integrated platform partners (eSewa, Khalti) or Cash. SewaKhoj may charge a service fee for successful bookings.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Limitation of Liability</h2>
            <p>SewaKhoj is not liable for the quality of work performed by Taskers. However, we provide a satisfaction guarantee and support for dispute resolution.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
