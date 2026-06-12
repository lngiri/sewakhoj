"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { services } from "@/data/services";
import imageCompression from "browser-image-compression";

const steps = [
  { id: 1, label: "Personal", labelNp: "व्यक्तिगत" },
  { id: 2, label: "Skills", labelNp: "सीप" },
  { id: 3, label: "Verify", labelNp: "प्रमाणीकरण" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function TaskerOnboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const { selectedCity, cities: contextCities } = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    dob: "",
    gender: "",
    city: selectedCity || "",
    area: "",
    customArea: "",
    address: "",
    skills: [] as string[],
    shortPitch: "",
    agreedToCode: false,
    agreedToPrivacy: false,
    docsExpiryDate: "",
  });

  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({
    citizenship: null,
    license: null,
    other: null
  });

  const fileInputCitizenship = useRef<HTMLInputElement>(null);
  const fileInputLicense = useRef<HTMLInputElement>(null);
  const fileInputOther = useRef<HTMLInputElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push("/login?redirect=/tasker/onboard");
    }
  }, [authUser, authLoading, router]);

  // Pre-fill form with auth user data
  useEffect(() => {
    if (authUser) {
      setFormData(prev => ({
        ...prev,
        email: authUser.email || "",
        fullName: authUser.user_metadata?.full_name || "",
        phone: authUser.phone || authUser.user_metadata?.phone || "",
        city: selectedCity || "",
      }));
    }
  }, [authUser, selectedCity]);

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => {
      const isSelected = prev.skills.includes(skillId);
      const skills = isSelected
        ? prev.skills.filter((id) => id !== skillId)
        : [...prev.skills, skillId];
      return { ...prev, skills };
    });
  };

  const validateCurrentStep = () => {
    const errors: Record<string, string> = {};
    setError("");

    switch (currentStep) {
      case 1:
        if (!formData.fullName) errors.fullName = "Full Name is required";
        if (!formData.phone) {
          errors.phone = "Phone number is required";
        } else {
          const cleanPhone = formData.phone.replace(/\D/g, '');
          const localPhone = cleanPhone.length > 10 && cleanPhone.startsWith('977') ? cleanPhone.substring(3) : cleanPhone;
          const phoneRegex = /^9[678]\d{8}$/;
          if (!phoneRegex.test(localPhone)) {
            errors.phone = "Enter a valid 10-digit Nepal mobile number (e.g. 98XXXXXXXX)";
          } else {
            formData.phone = localPhone;
          }
        }
        if (!formData.gender) errors.gender = "Please select your gender";
        if (!formData.city) errors.city = "Please select a city";
        if (!formData.dob) {
          errors.dob = "Date of birth is required";
        } else {
          const birthDate = new Date(formData.dob);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
          if (age < 18) errors.dob = "Must be at least 18 years old";
        }
        if (formData.area === 'other' && !formData.customArea) {
          errors.customArea = "Please enter your area name";
        }
        break;

      case 2:
        if (formData.skills.length === 0) {
          setError("Please select at least one skill");
          return false;
        }
        break;

      case 3:
        if (!docFiles.citizenship) {
          setError("Citizenship / National ID document is required for verification");
          return false;
        }
        if (!formData.agreedToCode) {
          setError("You must agree to the Code of Conduct to finalize onboarding");
          return false;
        }
        if (!formData.agreedToPrivacy) {
          setError("You must agree to the Privacy Policy & Terms");
          return false;
        }
        break;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0 && error === "";
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const validateFile = (file: File, docId: string): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `Unsupported format. Upload JPG, PNG, WebP, or PDF.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds 5MB size limit.`;
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file, docId);
    if (validationError) {
      setUploadErrors(prev => ({ ...prev, [docId]: validationError }));
      return;
    }

    setUploadErrors(prev => ({ ...prev, [docId]: "" }));
    setUploadProgress(prev => ({ ...prev, [docId]: 0 }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser?.id}/${docId}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      setDocFiles(prev => ({ ...prev, [docId]: file }));
      setFormData(prev => ({ ...prev, [`${docId}Url`]: publicUrl }));
    } catch (err: any) {
      setUploadErrors(prev => ({ ...prev, [docId]: err.message || "Upload failed" }));
    } finally {
      setUploadProgress(prev => ({ ...prev, [docId]: 100 }));
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failed. Please login.");

      // Check phone uniqueness before upsert
      if (formData.phone) {
        const { data: phoneTaken, error: phoneCheckError } = await supabase
          .rpc('is_phone_taken', { p_phone: formData.phone, p_exclude_user_id: user.id });
        if (phoneCheckError) throw phoneCheckError;
        if (phoneTaken) {
          throw new Error('This phone number is already registered to another account. Please use a different phone number.');
        }
      }

      // Upload documents to storage
      const docUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(docFiles)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${key}_${Date.now()}.${fileExt}`;
          const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
          docUrls[key] = data.publicUrl;
        }
      }

      // Update users table
      const { error: userError } = await supabase.from("users").upsert({
        id: user.id,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        city: formData.city || null,
        area: formData.area === 'other' ? formData.customArea : formData.area,
        address: formData.address || null,
        gender: formData.gender || null,
        dob: formData.dob || null,
        role: 'tasker'
      }, { onConflict: 'id' });
      if (userError) throw userError;

      // Update taskers table
      const { data: upsertedTasker, error: taskerError } = await supabase
        .from("taskers")
        .upsert({
          user_id: user.id,
          hourly_rate: 500, // Default rate
          city: formData.city.toLowerCase(),
          area: formData.area === 'other' ? formData.customArea : formData.area,
          bio: formData.shortPitch || "Professional service provider in Nepal.",
          experience: "",
          working_days: [],
          working_hours: {},
          transportation_mode: "motorcycle",
          payment_methods: ["cash", "esewa"],
          documents: docUrls,
          docs_expiry_date: formData.docsExpiryDate || null,
          status: "pending",
          rating: 0,
          is_elite: false,
          trust_score: 50,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select('id')
        .single();
      if (taskerError) throw taskerError;

      // Save KYC documents
      if (upsertedTasker) {
        const { error: kycError } = await supabase.from("tasker_kyc").upsert({
          tasker_id: upsertedTasker.id,
          document_type: "nagarikta",
          document_front_url: docUrls.citizenship || 'pending_upload',
          document_back_url: docUrls.license || null,
          selfie_url: null,
          status: "pending",
          submitted_at: new Date().toISOString()
        }, { onConflict: 'tasker_id' });
        if (kycError) console.error("KYC Auto-Upsert Error:", kycError);
      }

      // Save skills
      if (upsertedTasker && formData.skills.length > 0) {
        const taskerId = upsertedTasker.id;
        await supabase.from("tasker_skills").delete().eq("tasker_id", taskerId);

        const skillRows = formData.skills.map((skillId: string) => ({
          tasker_id: taskerId,
          service_id: skillId,
          skill_level: 'Intermediate',
          hourly_rate: 500
        }));

        await supabase.from("tasker_skills").insert(skillRows);
      }

      await supabase.auth.updateUser({ data: { role: 'tasker' } });

      router.push("/tasker/welcome");
    } catch (err: any) {
      console.error("Submission Error:", err);
      setError(err.message || "Failed to finalize registration.");
    } finally {
      setLoading(false);
    }
  };

  const maxDate18YearsAgo = new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <LoadingSpinner size="lg" variant="brand" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0f0f1a] text-[#f1f1f6] font-sans select-none">
      <PageHeader
        title="Tasker Onboarding"
        description="Complete your professional profile"
        className="hidden md:block md:absolute md:top-4 md:left-[240px] md:z-30 [&_.breadcrumbs]:text-slate-400 [&_.breadcrumbs_active]:text-white [&_.breadcrumbs_separator]:text-slate-500 [&_.title-wrapper]:hidden"
        relatedLinks={[
          { href: "/tasker/landing", label: "Tasker Info" },
          { href: "/dashboard", label: "Dashboard" },
        ]}
      />

      {/* Mobile Header */}
      <div className="md:hidden bg-[#1b1b36] border-b border-[#22223b] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/tasker/landing')} className="p-2 hover:bg-[#22223b] rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-black text-white">Tasker Onboarding</h1>
        </div>
        <div className="px-3 py-1 bg-[#C8102E] text-white rounded-md text-[10px] font-black uppercase tracking-widest">
          Step {currentStep} / 3
        </div>
      </div>

      {/* LEFT SIDEBAR: 220px fixed on desktop, hidden on mobile */}
      <div className="hidden md:flex w-[220px] bg-[#141426] border-r border-[#22223b] flex-col justify-between p-6 shrink-0 relative z-20">
        <div className="flex flex-col flex-1">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-2">
            <button onClick={() => router.push('/')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#C8102E] to-red-600 flex items-center justify-center font-black text-white text-sm shadow-[0_0_15px_rgba(200,16,46,0.3)]">S</div>
              <span className="font-black text-sm uppercase tracking-wider text-white">SewaKhoj</span>
            </button>
          </div>

          {/* Navigation Steps */}
          <div className="space-y-4 flex-1 mt-2">
            {steps.map((step) => {
              const active = currentStep === step.id;
              const done = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (step.id < currentStep) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`w-full flex items-start gap-3 text-left transition-all group outline-none ${
                    active ? 'opacity-100' : 'opacity-50 hover:opacity-85'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 border-2 transition-all ${
                    active
                      ? 'bg-[#C8102E] border-[#C8102E] text-white shadow-[0_0_15px_rgba(200,16,46,0.5)]'
                      : done
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'border-[#2c2c4a] text-gray-400 bg-[#191932]'
                  }`}>
                    {done ? "✓" : step.id}
                  </div>
                  <div className="pt-0.5">
                    <p className={`font-black text-[10px] uppercase tracking-widest leading-none ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {step.label}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5 font-devanagari">
                      {step.labelNp}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Sidebar Progress */}
        <div className="pt-4 border-t border-[#22223b]">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Progress</span>
            <span className="text-[10px] font-black text-white">{Math.max(10, Math.round(((currentStep - 1) / 2) * 100))}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#1e1e38] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C8102E] to-red-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(10, Math.round(((currentStep - 1) / 2) * 100))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT PANEL */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0a14] relative z-10 overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-auto md:h-16 border-b border-[#22223b] px-4 md:px-8 py-3 md:py-0 flex flex-col md:flex-row md:items-center justify-between bg-[#111124]/40 shrink-0 gap-2">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 md:px-3 md:py-1 bg-[#C8102E]/10 border border-[#C8102E]/20 text-[#C8102E] rounded-md text-[10px] md:text-[10px] font-black uppercase tracking-widest shrink-0">
                Step {currentStep} / 3
              </div>
              <h2 className="font-black text-xs md:text-sm uppercase tracking-widest text-white truncate max-w-[170px] sm:max-w-none">
                {steps[currentStep - 1].label}
              </h2>
            </div>
            {/* Mobile Profile Strength Badge */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${calculateProfileStrength(formData) >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {calculateProfileStrength(formData)}% Strength
              </span>
            </div>
          </div>

          {/* Desktop Only Profile Strength */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile strength</span>
            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${calculateProfileStrength(formData) >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              {calculateProfileStrength(formData)}%
            </span>
          </div>

          {/* Mobile Horizontal Stepper */}
          <div className="flex md:hidden items-center w-full pt-1 border-t border-[#22223b]/20">
            <div className="flex items-center gap-1 py-1 w-full overflow-x-auto scrollbar-none">
              {steps.map((step) => {
                const active = currentStep === step.id;
                const done = step.id < currentStep;
                return (
                  <div key={step.id} className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        if (step.id < currentStep) {
                          setCurrentStep(step.id);
                        }
                      }}
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] border transition-all ${
                        active
                          ? 'bg-[#C8102E] border-[#C8102E] text-white shadow-[0_0_10px_rgba(200,16,46,0.3)]'
                          : done
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'border-[#2c2c4a] text-gray-500 bg-[#14142a]'
                      }`}
                    >
                      {done ? "✓" : step.id}
                    </button>
                    {step.id < 3 && <div className={`w-3 h-0.5 rounded shrink-0 ${done ? 'bg-emerald-500' : 'bg-[#22223b]'}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Inner Scrollable Forms */}
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar relative">

          {/* STEP 1: PERSONAL IDENTITY */}
          {currentStep === 1 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Basic Identity (व्यक्तिगत जानकारी)</h3>
                <p className="text-xs text-slate-400 mt-1">Provide your legal identity and working city coverage.</p>
              </div>

              <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name (पूरा नाम)</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={e => updateForm("fullName", e.target.value)}
                      className={`w-full bg-[#181832] border-2 rounded-xl py-3 px-4 font-bold text-sm text-white outline-none transition-all ${fieldErrors.fullName ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'}`}
                      placeholder="Ram Bahadur"
                    />
                    {fieldErrors.fullName && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.fullName}</p>}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nepal Mobile Number (मोवाइल नम्बर)</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => updateForm("phone", e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={`w-full bg-[#181832] border-2 rounded-xl py-3 px-4 font-bold text-sm text-white outline-none transition-all ${fieldErrors.phone ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'}`}
                      placeholder="98XXXXXXXX"
                    />
                    {fieldErrors.phone && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.phone}</p>}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date of Birth (जन्म मिति)</label>
                    <input
                      type="date"
                      value={formData.dob}
                      max={maxDate18YearsAgo}
                      onChange={e => updateForm("dob", e.target.value)}
                      className={`w-full bg-[#181832] border-2 rounded-xl py-3 px-4 font-bold text-sm text-white outline-none transition-all ${fieldErrors.dob ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'}`}
                    />
                    {fieldErrors.dob && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.dob}</p>}
                  </div>

                  {/* Gender Button Selectors */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gender (लिङ्ग)</label>
                    <div className="flex gap-2">
                      {['male', 'female', 'other'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => updateForm("gender", g)}
                          className={`flex-1 py-3 rounded-xl border-2 font-black text-xs uppercase transition-all ${formData.gender === g
                            ? 'border-[#C8102E] bg-[#C8102E]/10 text-white'
                            : 'border-[#22223b] bg-[#181832] text-slate-400 hover:border-[#27274e]'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* City */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">City (शहर)</label>
                    <select
                      value={formData.city}
                      onChange={e => updateForm("city", e.target.value)}
                      className="w-full bg-[#181832] border-2 rounded-xl py-3 px-4 font-bold text-sm text-white outline-none transition-all border-[#22223b] focus:border-[#C8102E]"
                    >
                      <option value="">Select City</option>
                      {contextCities?.map((city) => (
                        <option key={city.name} value={city.name}>{city.name}</option>
                      ))}
                    </select>
                    {fieldErrors.city && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.city}</p>}
                  </div>

                  {/* Area */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Area (क्षेत्र)</label>
                    <select
                      value={formData.area}
                      onChange={e => updateForm("area", e.target.value)}
                      className="w-full bg-[#181832] border-2 rounded-xl py-3 px-4 font-bold text-sm text-white outline-none transition-all border-[#22223b] focus:border-[#C8102E]"
                    >
                      <option value="">Select Area</option>
                      <option value="kathmandu">Kathmandu</option>
                      <option value="lalitpur">Lalitpur</option>
                      <option value="bhaktapur">Bhaktapur</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Custom Area (shown when area is 'other') */}
                  {formData.area === 'other' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Enter Your Area Name</label>
                      <input
                        type="text"
                        value={formData.customArea}
                        onChange={e => updateForm("customArea", e.target.value)}
                        className={`w-full bg-[#181832] border-2 rounded-xl py-3 px-4 font-bold text-sm text-white outline-none transition-all ${fieldErrors.customArea ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'}`}
                        placeholder="e.g. New Road"
                      />
                      {fieldErrors.customArea && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.customArea}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SKILLS */}
          {currentStep === 2 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Your Skills (तपाईंको सीप)</h3>
                <p className="text-xs text-slate-400 mt-1">Select the services you can provide. This helps customers find you easily.</p>
              </div>

              <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-black uppercase text-xs tracking-widest text-slate-400">Available Services</h4>
                  <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase">
                    {formData.skills.length} Selected
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {services.map((service) => {
                    const isSelected = formData.skills.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleSkill(service.id)}
                        className={`p-4 rounded-2xl border-2 transition-all text-left group ${isSelected
                          ? 'border-[#C8102E] bg-[#C8102E]/10 text-white'
                          : 'border-[#22223b] bg-[#181832] text-slate-400 hover:border-[#27274e] hover:bg-[#1e1e38]'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{service.emoji}</span>
                          <span className="font-black text-sm uppercase tracking-tight">{service.nameEn}</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 line-clamp-2">
                          {service.descriptionEn}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: VERIFY */}
          {currentStep === 3 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Identity Verification (प्रमाणीकरण)</h3>
                <p className="text-xs text-slate-400 mt-1">Upload your citizenship ID and other required documents. This ensures trust and quality.</p>
              </div>

              <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 space-y-6">
                <div className="space-y-4">
                  {[
                    { id: 'citizenship', label: 'Citizenship / National ID', required: true },
                    { id: 'license', label: 'Driving License (Optional)', required: false },
                    { id: 'other', label: 'Other Documents (Optional)', required: false }
                  ].map(doc => {
                    const docUrl = formData[`${doc.id}Url` as keyof typeof formData] as string | undefined;
                    const hasError = uploadErrors[doc.id];
                    const progress = uploadProgress[doc.id];
                    return (
                      <div key={doc.id} className="bg-[#0f0f1a] rounded-[24px] p-6 border-2 border-transparent hover:border-slate-600 transition-all flex flex-col space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-black text-sm text-white">{doc.label}</h5>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{doc.required ? 'Required' : 'Optional'}</p>
                          </div>
                          {docUrl && (
                            <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">Uploaded</span>
                          )}
                        </div>

                        {docUrl ? (
                          <div className="flex-1 flex flex-col justify-between space-y-4">
                            <div className="aspect-video w-full rounded-2xl bg-white border border-slate-100 overflow-hidden relative group">
                              {docUrl.toLowerCase().endsWith('.pdf') ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-400">
                                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-[10px] font-black uppercase mt-2">PDF Document</span>
                                </div>
                              ) : (
                                <img src={docUrl} alt={doc.label} className="w-full h-full object-cover" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                                  View High Res
                                </a>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => document.getElementById(`file-input-${doc.id}`)?.click()}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                Replace File
                              </button>
                              <button
                                onClick={() => {
                                  setDocFiles(prev => ({ ...prev, [doc.id]: null }));
                                  setFormData(prev => ({ ...prev, [`${doc.id}Url`]: undefined }));
                                }}
                                className="px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                              >
                                Delete
                              </button>
                            </div>
                            <input
                              id={`file-input-${doc.id}`}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleFileUpload(e, doc.id)}
                              className="hidden"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 bg-slate-800 border-2 border-dashed border-slate-600 rounded-[24px] p-8 text-center hover:border-[#C8102E] hover:bg-[#C8102E]/5 transition-all flex flex-col items-center justify-center min-h-[160px] relative">
                            <input
                              id={`file-input-${doc.id}`}
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleFileUpload(e, doc.id)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
                              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1118 6l9 9m.414-3.314a11.058 11.058 0 00-5.373-5.373" />
                              </svg>
                            </div>
                            <span className="text-xs font-black text-white uppercase">Upload Document</span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">PDF, JPG, PNG up to 5MB</span>
                            {hasError && <p className="text-[10px] font-bold text-red-400 mt-2">{hasError}</p>}
                            {progress > 0 && progress < 100 && (
                              <div className="w-full mt-3 bg-slate-700 rounded-full h-1.5">
                                <div className="bg-[#C8102E] h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4 pt-6 border-t border-[#22223b]">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="agreeToCode"
                      checked={formData.agreedToCode}
                      onChange={(e) => updateForm("agreedToCode", e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 text-[#C8102E] focus:ring-[#C8102E]"
                    />
                    <label htmlFor="agreeToCode" className="text-sm font-medium text-slate-300">
                      I agree to the Tasker Code of Conduct and professional standards
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="agreeToPrivacy"
                      checked={formData.agreedToPrivacy}
                      onChange={(e) => updateForm("agreedToPrivacy", e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 text-[#C8102E] focus:ring-[#C8102E]"
                    />
                    <label htmlFor="agreeToPrivacy" className="text-sm font-medium text-slate-300">
                      I agree to the Privacy Policy and Terms of Service
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-8 border-t border-[#22223b]">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                disabled={loading}
                className="px-8 py-4 bg-[#C8102E] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Next'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Complete Onboarding'}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl font-medium text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function calculateProfileStrength(data: {
  fullName: string; skills: string[]; agreedToCode: boolean; agreedToPrivacy: boolean;
}) {
  let strength = 10;
  if (data.fullName) strength += 15;
  if (data.skills.length > 0) strength += 15;
  if (data.skills.length >= 3) strength += 10;
  if (data.agreedToCode) strength += 15;
  if (data.agreedToPrivacy) strength += 15;
  return Math.min(strength, 100);
}
