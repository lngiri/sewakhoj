import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sewakhoj-red hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> गृह पृष्ठ
        </Link>
        <h1 className="text-4xl font-black text-gray-900 mb-8">Privacy Policy / गोपनीयता नीति</h1>
        <div className="prose prose-red max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as your name, email address, phone number, and location data to facilitate service bookings.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Information</h2>
            <p>We use your information to process bookings, verify identities, communicate updates, and improve our platform's user experience.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Sharing</h2>
            <p>We share your contact details with the Tasker you book (and vice versa) only after a booking is confirmed. We do not sell your data to third parties.</p>
          </section>
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Security</h2>
            <p>We implement industry-standard security measures to protect your personal information from unauthorized access or disclosure.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
