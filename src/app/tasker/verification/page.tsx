import Link from "next/link";
import { ShieldCheck, FileText, Camera, CreditCard, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Tasker Verification | SewaKhoj",
  description: "Get verified to unlock job opportunities on SewaKhoj. Learn about our KYC process and commission model.",
};

export default function TaskerVerificationPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="relative pt-20 pb-32 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-20 w-96 h-96 bg-sewakhoj-red rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
            Tasker Verification
          </h1>
          <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">
            Complete your verification to unlock job opportunities and start earning on SewaKhoj.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="bg-[#f4f6fb] rounded-[40px] p-8 md:p-12 shadow-xl">
          <h2 className="text-3xl font-black text-slate-900 mb-8">Commission Model</h2>
          
          <div className="bg-white rounded-3xl p-8 border border-slate-200 mb-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-sewakhoj-red/10 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-sewakhoj-red" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">90/10 Split</h3>
                <p className="text-slate-500 font-medium">You keep 90% of what you earn</p>
              </div>
            </div>
            <p className="text-slate-600 leading-relaxed">
              For every job completed, you receive 90% of the total amount. A 10% platform fee covers 
              payment processing, customer support, and platform maintenance. This fee is deducted 
              automatically before payout.
            </p>
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
              <p className="text-sm text-slate-500">
                <strong>Example:</strong> For a Rs 1000 job, you receive Rs 900. For a Rs 2000 job, 
                you receive Rs 1800.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-8">KYC Verification Process</h2>
          
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="w-12 h-12 bg-sewakhoj-red rounded-2xl flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Step 1: Document Collection</h3>
                <p className="text-slate-500">
                  Collect clear photos of your citizenship certificate (Nagarikta) or passport. 
                  Both front and back sides are required.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-12 h-12 bg-sewakhoj-red rounded-2xl flex items-center justify-center shrink-0">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Step 2: Biometric Verification</h3>
                <p className="text-slate-500">
                  Take a clear selfie for facial matching with your ID documents. This ensures 
                  your identity matches the documents submitted.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-12 h-12 bg-sewakhoj-red rounded-2xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Step 3: Manual Review</h3>
<p className="text-slate-500">
                   Our security team manually reviews your documents. This typically takes 24-48 hours. 
                   You&apos;ll receive a notification once approved.
                 </p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
              <div>
                <h4 className="font-black text-blue-900 mb-2">Why Verification Matters</h4>
                <p className="text-blue-800 text-sm leading-relaxed">
                  Verification builds trust with customers, unlocks job opportunities, and allows 
                  you to receive payments. All documents are encrypted and stored securely per Nepal 
                  IT Act 2063 requirements.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/signup?redirect=/tasker/onboard"
              className="inline-flex items-center gap-2 bg-sewakhoj-red text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl"
            >
              Get Started as a Tasker
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}