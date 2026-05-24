"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Camera, UploadCloud, ShieldCheck, AlertCircle, ArrowLeft, Lock, Fingerprint, FileText } from 'lucide-react';
import PageHeader from "@/components/navigation/PageHeader";
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';
import { toast } from '@/lib/toast-messages';
import { useLocale } from "next-intl";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function KYCUploadPage() {
  const locale = useLocale();
  const router = useRouter();
  const { showError } = useNotification();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taskerId, setTaskerId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(1);

  const [formData, setFormData] = useState({
    document_type: 'nagarikta',
    front_file: null as File | null,
    back_file: null as File | null,
    selfie_file: null as File | null
  });
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    checkStatus();
  }, []);

  const extractStoragePath = (urlOrPath: string, bucket: string) => {
    if (!urlOrPath) return "";
    const publicMatch = `/storage/v1/object/public/${bucket}/`;
    if (urlOrPath.includes(publicMatch)) {
      return urlOrPath.split(publicMatch)[1];
    }
    const genericMatch = `/storage/v1/object/${bucket}/`;
    if (urlOrPath.includes(genericMatch)) {
      return urlOrPath.split(genericMatch)[1];
    }
    return urlOrPath;
  };

  const checkStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Fetch tasker with documents
      const { data: tasker } = await supabase.from('taskers').select('id, documents').eq('user_id', user.id).maybeSingle();
      if (!tasker) return router.push('/dashboard');
      setTaskerId(tasker.id);

      // Fetch user data with avatar_url
      const { data: userData } = await supabase.from('users').select('avatar_url').eq('id', user.id).maybeSingle();

      // Fetch KYC status
      const { data: kyc } = await supabase.from('tasker_kyc').select('*').eq('tasker_id', tasker.id).maybeSingle();
      if (kyc) {
        setKycStatus(kyc);
      }

      // Prefill previews from existing uploaded files in KYC or Tasker onboarding
      const existingFront = kyc?.document_front_url || (tasker.documents as any)?.citizenship || "";
      const existingBack = kyc?.document_back_url || (tasker.documents as any)?.license || "";
      const existingSelfie = kyc?.selfie_url || userData?.avatar_url || "";

      // Convert relative paths to public URLs if necessary
      setPreviews({
        front_file: existingFront ? (existingFront.startsWith('http') ? existingFront : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kyc_documents/${existingFront}`) : "",
        back_file: existingBack ? (existingBack.startsWith('http') ? existingBack : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kyc_documents/${existingBack}`) : "",
        selfie_file: existingSelfie ? (existingSelfie.startsWith('http') ? existingSelfie : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${existingSelfie}`) : ""
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showError(toast(locale, "FILE_TOO_LARGE"));
        return;
      }
      setFormData({ ...formData, [field]: file });
      setPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${taskerId}/${path}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('kyc_documents').upload(fileName, file);
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasFront = formData.front_file || previews.front_file;
    const hasSelfie = formData.selfie_file || previews.selfie_file;

    if (!hasFront || !hasSelfie || !taskerId) {
      setError("Please upload the required documents.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let frontPath = "";
      if (formData.front_file) {
        frontPath = await uploadFile(formData.front_file, 'front');
      } else if (previews.front_file) {
        frontPath = extractStoragePath(previews.front_file, 'kyc_documents');
        if (previews.front_file.includes('/storage/v1/object/public/documents/')) {
          frontPath = extractStoragePath(previews.front_file, 'documents');
        }
      }

      let backPath = null;
      if (formData.back_file) {
        backPath = await uploadFile(formData.back_file, 'back');
      } else if (previews.back_file) {
        backPath = extractStoragePath(previews.back_file, 'kyc_documents');
        if (previews.back_file.includes('/storage/v1/object/public/documents/')) {
          backPath = extractStoragePath(previews.back_file, 'documents');
        }
      }

      let selfiePath = "";
      if (formData.selfie_file) {
        selfiePath = await uploadFile(formData.selfie_file, 'selfie');
      } else if (previews.selfie_file) {
        selfiePath = extractStoragePath(previews.selfie_file, 'avatars');
        if (previews.selfie_file.includes('/storage/v1/object/public/task_photos/')) {
          selfiePath = extractStoragePath(previews.selfie_file, 'task_photos');
        }
      }

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
    } catch (err: any) {
      setError(err.message || "Failed to submit documents.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        <PageHeader
          title="Identity Verification"
          description="Build institutional trust and unlock professional payouts"
          showBack
          backHref="/dashboard"
          className="mb-0"
          relatedLinks={[
            { href: "/tasker/jobs", label: "Mission Board" },
            { href: "/tasker/welcome", label: "Post-KYC Setup" },
          ]}
        />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
             <Lock className="w-3 h-3 text-green-500" />
             <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400">256-bit AES Encryption</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">Identity Verification</h1>
          <p className="text-gray-500 font-bold text-lg">Build institutional trust and unlock professional payouts.</p>
        </div>

        {/* Steps Visualizer */}
        {!kycStatus && (
          <div className="flex justify-center items-center gap-4 max-w-md mx-auto">
             {[1, 2, 3].map(step => (
               <div key={step} className="flex items-center gap-4 flex-1 last:flex-none">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all ${activeStep >= step ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20' : 'bg-white text-gray-300 border border-gray-100'}`}>
                    {step}
                  </div>
                  {step < 3 && <div className={`flex-1 h-1 rounded-full ${activeStep > step ? 'bg-gray-900' : 'bg-gray-100'}`} />}
               </div>
             ))}
          </div>
        )}

        {kycStatus ? (
          <div className="bg-white p-16 rounded-[60px] shadow-2xl text-center border border-gray-100 space-y-8 animate-in zoom-in-95 duration-500">
            {kycStatus.status === 'pending' && (
              <>
                <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-[40px] flex items-center justify-center mx-auto animate-pulse">
                  <Fingerprint className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">Verification in Progress</h3>
                  <p className="text-gray-500 font-bold text-lg max-w-sm mx-auto">Our security team is manually reviewing your documents. You'll be notified within 24-48 hours.</p>
                </div>
                <div className="pt-8 grid grid-cols-2 gap-4 max-w-xs mx-auto">
                   <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-gray-400">Status</p>
                      <p className="text-xs font-black text-blue-600 uppercase">Reviewing</p>
                   </div>
                   <div className="p-4 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] font-black uppercase text-gray-400">Time</p>
                      <p className="text-xs font-black text-gray-900 uppercase">~24h Left</p>
                   </div>
                </div>
              </>
            )}
            {kycStatus.status === 'approved' && (
              <>
                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[40px] flex items-center justify-center mx-auto shadow-lg shadow-green-100">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">System Verified</h3>
                  <p className="text-gray-500 font-bold text-lg max-w-sm mx-auto">Institutional trust achieved. Your profile now features the Pro Verified badge.</p>
                </div>
                <Link href="/dashboard" className="inline-block px-10 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">Enter Dashboard</Link>
              </>
            )}
            {kycStatus.status === 'rejected' && (
              <>
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[40px] flex items-center justify-center mx-auto">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">Action Required</h3>
                  <p className="text-gray-500 font-bold text-lg max-w-sm mx-auto">Verification failed: <span className="text-red-500">{kycStatus.admin_note || "Invalid documents."}</span></p>
                </div>
                <button onClick={() => setKycStatus(null)} className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">Re-submit Documents</button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[50px] shadow-2xl border border-gray-100 space-y-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <ShieldCheck className="w-32 h-32" />
                </div>

                {activeStep === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-gray-900">Document Type</h3>
                      <p className="text-sm font-bold text-gray-400">Select the official government ID you wish to use.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       {[
                         { id: 'nagarikta', label: 'Citizenship', icon: <FileText /> },
                         { id: 'driving_license', label: 'Driving License', icon: <Fingerprint /> },
                         { id: 'passport', label: 'Passport', icon: <ShieldCheck /> }
                       ].map(type => (
                         <button
                           key={type.id}
                           type="button"
                           onClick={() => setFormData({...formData, document_type: type.id})}
                           className={`p-6 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all ${formData.document_type === type.id ? 'bg-gray-900 text-white border-gray-900 shadow-xl' : 'bg-gray-50 border-transparent text-gray-500 hover:border-gray-200'}`}
                         >
                           <div className="text-2xl">{type.icon}</div>
                           <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                         </button>
                       ))}
                    </div>
                    <button type="button" onClick={() => setActiveStep(2)} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">Continue to Uploads</button>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-gray-900">Document Upload</h3>
                      <p className="text-sm font-bold text-gray-400">Upload clear, high-resolution photos of your {formData.document_type.replace('_', ' ')}.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Document Front</label>
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[40px] p-6 text-center hover:bg-white hover:border-sewakhoj-red transition-all relative min-h-[200px] flex flex-col items-center justify-center group">
                          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {previews.front_file ? (
                            <div className="relative w-full h-full">
                               <img src={previews.front_file} className="w-full h-40 object-cover rounded-3xl shadow-lg" />
                               <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <UploadCloud className="text-white w-8 h-8" />
                               </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4"><UploadCloud className="w-6 h-6 text-gray-400" /></div>
                              <p className="text-xs font-black text-gray-900 uppercase">Select Front Side</p>
                              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Max 5MB • JPG/PNG</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Document Back (Optional)</label>
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[40px] p-6 text-center hover:bg-white hover:border-sewakhoj-red transition-all relative min-h-[200px] flex flex-col items-center justify-center group">
                          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {previews.back_file ? (
                            <div className="relative w-full h-full">
                               <img src={previews.back_file} className="w-full h-40 object-cover rounded-3xl shadow-lg" />
                               <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <UploadCloud className="text-white w-8 h-8" />
                               </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4"><UploadCloud className="w-6 h-6 text-gray-400" /></div>
                              <p className="text-xs font-black text-gray-900 uppercase">Select Back Side</p>
                              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Back view of card</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                       <button type="button" onClick={() => setActiveStep(1)} className="px-8 py-5 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all">Back</button>
                       <button type="button" onClick={() => setActiveStep(3)} className="flex-1 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl">Confirm & Continue</button>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2 text-center">
                      <h3 className="text-2xl font-black text-gray-900">Biometric Verification</h3>
                      <p className="text-sm font-bold text-gray-400">Take a clear selfie to match your ID documents.</p>
                    </div>

                    <div className="max-w-sm mx-auto">
                       <div className="bg-gray-900 aspect-square rounded-[60px] border-8 border-gray-800 shadow-2xl relative group overflow-hidden flex flex-col items-center justify-center text-center p-8">
                          <input type="file" accept="image/*" capture="user" onChange={(e) => handleFileChange(e, 'selfie_file')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {previews.selfie_file ? (
                            <img src={previews.selfie_file} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <>
                              <Camera className="w-16 h-16 text-gray-700 mb-6 group-hover:scale-110 group-hover:text-sewakhoj-red transition-all duration-500" />
                              <p className="text-white font-black uppercase tracking-widest text-sm">Open Camera</p>
                              <p className="text-gray-500 text-[10px] font-bold mt-2">Center your face within the frame</p>
                            </>
                          )}
                       </div>
                    </div>

                    <div className="flex gap-4">
                       <button type="button" onClick={() => setActiveStep(2)} className="px-8 py-5 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all">Back</button>
                       <button
                         type="submit"
                         disabled={submitting || (!formData.selfie_file && !previews.selfie_file)}
                         className="flex-1 py-5 bg-sewakhoj-red text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 disabled:opacity-50"
                       >
                         {submitting ? "Processing Biometrics..." : "Finish & Submit for Review"}
                       </button>
                    </div>
                  </div>
                )}

                {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><AlertCircle className="w-5 h-5" />{error}</div>}
              </form>
            </div>

            <div className="space-y-8">
               <div className="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 space-y-6">
                  <h4 className="font-black text-gray-900 uppercase tracking-widest text-[11px]">Security Protocol</h4>
                  <div className="space-y-6">
                     <div className="flex gap-4">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0"><Lock className="w-5 h-5 text-green-600" /></div>
                        <div><p className="text-xs font-black text-gray-900">End-to-End Encryption</p><p className="text-[10px] font-bold text-gray-400 leading-tight mt-1">Your sensitive data is encrypted before reaching our servers.</p></div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-blue-600" /></div>
                        <div><p className="text-xs font-black text-gray-900">Manual Audit Team</p><p className="text-[10px] font-bold text-gray-400 leading-tight mt-1">Real humans verify your identity to ensure platform safety.</p></div>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-900 p-10 rounded-[50px] shadow-2xl text-white space-y-4">
                  <Fingerprint className="w-8 h-8 text-blue-400" />
                  <h4 className="font-black uppercase tracking-widest text-xs">Privacy Guarantee</h4>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed">SewaKhoj follows international data protection standards. Your documents are used strictly for identity verification and are never shared with third parties.</p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
