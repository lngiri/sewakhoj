"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Camera, UploadCloud, ShieldCheck, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function KYCUploadPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taskerId, setTaskerId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    document_type: 'nagarikta',
    front_file: null as File | null,
    back_file: null as File | null,
    selfie_file: null as File | null
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: tasker } = await supabase.from('taskers').select('id').eq('user_id', user.id).single();
      if (!tasker) return router.push('/dashboard');
      setTaskerId(tasker.id);

      const { data: kyc } = await supabase.from('tasker_kyc').select('*').eq('tasker_id', tasker.id).single();
      if (kyc) setKycStatus(kyc);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, [field]: e.target.files[0] });
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${taskerId}/${path}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('kyc_documents').upload(fileName, file);
    if (error) throw error;
    
    // Get public URL (assuming bucket is private, but we need the path)
    // Wait, bucket is private. We store the path and use signed URLs or admin retrieval.
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.front_file || !formData.selfie_file || !taskerId) {
      setError("Please upload the required documents.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Upload files
      const frontPath = await uploadFile(formData.front_file, 'front');
      const backPath = formData.back_file ? await uploadFile(formData.back_file, 'back') : null;
      const selfiePath = await uploadFile(formData.selfie_file, 'selfie');

      // 2. Insert DB record
      const { error: dbError } = await supabase.from('tasker_kyc').upsert({
        tasker_id: taskerId,
        document_type: formData.document_type,
        document_front_url: frontPath,
        document_back_url: backPath,
        selfie_url: selfiePath,
        status: 'pending',
        submitted_at: new Date().toISOString()
      }, { onConflict: 'tasker_id' });

      if (dbError) throw dbError;

      setKycStatus({ status: 'pending' });
      alert("Documents submitted successfully. Our team will review them shortly.");
    } catch (err: any) {
      setError(err.message || "Failed to submit documents.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-sewakhoj-red" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Identity Verification</h1>
          <p className="text-gray-500 font-medium mt-2">Build trust with customers by verifying your identity. Required for payouts.</p>
        </div>

        {kycStatus ? (
          <div className="bg-white p-12 rounded-[40px] shadow-sm text-center border border-gray-100">
            {kycStatus.status === 'pending' && (
              <>
                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 animate-spin" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Verification Pending</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto">Your documents have been submitted and are currently under review by our team. This usually takes 1-2 business days.</p>
              </>
            )}
            {kycStatus.status === 'approved' && (
              <>
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Identity Verified</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto">You are a verified professional on SewaKhoj. Your profile now shows a trust badge.</p>
              </>
            )}
            {kycStatus.status === 'rejected' && (
              <>
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Verification Rejected</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto mb-6">Unfortunately, we could not verify your documents. Reason: {kycStatus.admin_note}</p>
                <button onClick={() => setKycStatus(null)} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-xs">Try Again</button>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[40px] shadow-xl border border-gray-100 space-y-10">
            {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>}

            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Document Type</label>
              <select 
                value={formData.document_type} 
                onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-sewakhoj-red/20"
              >
                <option value="nagarikta">Citizenship Card (Nagarikta)</option>
                <option value="driving_license">Driving License</option>
                <option value="passport">Passport</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Document Front</label>
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">{formData.front_file ? formData.front_file.name : "Upload Front Side"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">Document Back (Optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">{formData.back_file ? formData.back_file.name : "Upload Back Side"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Selfie</label>
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center hover:bg-gray-50 transition-colors relative">
                <input type="file" accept="image/*" capture="user" onChange={(e) => handleFileChange(e, 'selfie_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-600">{formData.selfie_file ? formData.selfie_file.name : "Take a clear selfie"}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Please ensure your face is clearly visible and well-lit.</p>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-5 bg-sewakhoj-red text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-xl shadow-red-500/20"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {submitting ? "Uploading Securely..." : "Submit for Verification"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
