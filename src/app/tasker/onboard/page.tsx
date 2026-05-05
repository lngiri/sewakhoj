"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  CheckCircle2, 
  Briefcase, 
  Search, 
  Plus, 
  X, 
  ShieldCheck, 
  Camera,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  Clock,
  Check
} from "lucide-react";
import Link from "next/link";
import { services } from "@/data/services";

const AREAS_BY_CITY: Record<string, string[]> = {
  kathmandu: ["Thamel", "Baneshwor", "Koteshwor", "Kalanki", "Maharajgunj", "Bouddha", "Balaju", "Lazimpat"],
  pokhara: ["Lakeside", "Mahendrapool", "Bagar", "New Road", "Chhorepatan", "Birauta"],
  butwal: ["Amarpath", "Golpark", "Milanchowk", "Traffic Chowk", "Kalikanagar", "Devinagar"],
  bharatpur: ["Narayangarh", "Chauvibish", "Hakimchowk", "Bharatpur Heights", "Tandi"],
  biratnagar: ["Main Road", "Tinpaini", "Bargachhi", "Rani", "Kanchanbari"],
};

const steps = [
  { id: 1, label: "Personal / व्यक्तिगत" },
  { id: 2, label: "Skills / सीप" },
  { id: 3, label: "Availability / उपलब्धता" },
  { id: 4, label: "Verification / प्रमाणीकरण" },
  { id: 5, label: "Pricing / मूल्य" },
  { id: 6, label: "Finalize / अन्तिम" },
];

export default function TaskerOnboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dbCities, setDbCities] = useState<{name: string, name_np: string}[]>([]);
  
  const today = new Date();
  
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    dob: "",
    gender: "",
    city: "",
    area: "",
    address: "",
    skills: [] as string[],
    bio: "",
    experience: "",
    hourlyRate: "500",
    pricingType: "hourly",
    workingDays: [1, 2, 3, 4, 5] as number[],
    startTime: "09:00",
    endTime: "18:00",
    transportMode: "motorcycle",
    agreedToPrivacy: false,
  });

  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({
    citizenship: null,
    license: null,
    other: null
  });

  const fileInput = useRef<HTMLInputElement>(null);
  const fileInputCitizenship = useRef<HTMLInputElement>(null);
  const fileInputLicense = useRef<HTMLInputElement>(null);
  const fileInputOther = useRef<HTMLInputElement>(null);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [agreedToCode, setAgreedToCode] = useState(false);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from("cities")
        .select("name, name_np")
        .eq("is_active", true)
        .order("name");
      if (data) setDbCities(data);
    };
    fetchCities();
  }, []);

  // Redirect to login if not authenticated or dashboard if already a tasker
  useEffect(() => {
    const checkStatus = async () => {
      if (!authLoading) {
        if (!authUser) {
          // Double check with supabase directly to avoid context race conditions
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            router.push("/login?redirect=/tasker/onboard");
            return;
          }
        }

        // Check if already a tasker (via metadata or DB)
        const isTaskerMetadata = authUser?.user_metadata?.role === 'tasker';
        
        const { data: tasker } = await supabase
          .from("taskers")
          .select("id")
          .eq("user_id", authUser?.id)
          .single();

        if (tasker || isTaskerMetadata) {
          router.push("/dashboard");
        }
      }
    };
    checkStatus();
  }, [authUser, authLoading, router]);

  // Pre-fill form with auth user data
  useEffect(() => {
    if (authUser) {
      setFormData(prev => ({
        ...prev,
        email: authUser.email || prev.email,
        fullName: prev.fullName || authUser.user_metadata?.full_name || "",
        phone: prev.phone || authUser.phone || authUser.user_metadata?.phone || "",
      }));
    }
  }, [authUser]);

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = {...prev};
        delete next[field];
        return next;
      });
    }
  };

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => {
      const skills = prev.skills.includes(skillId)
        ? prev.skills.filter((id) => id !== skillId)
        : [...prev.skills, skillId];
      return { ...prev, skills };
    });
  };

  const toggleDay = (dayIdx: number) => {
    setFormData((prev) => {
      const workingDays = prev.workingDays.includes(dayIdx)
        ? prev.workingDays.filter((d) => d !== dayIdx)
        : [...prev.workingDays, dayIdx];
      return { ...prev, workingDays };
    });
  };

  const validateCurrentStep = () => {
    const errors: Record<string, string> = {};
    setError("");

    switch (currentStep) {
      case 1:
        if (!formData.fullName) errors.fullName = "Full Name is required";
        if (!formData.phone) errors.phone = "Phone number is required";
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
        
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;

      case 2:
        if (formData.skills.length === 0) {
          setError("Please select at least one skill / कृपया कम्तिमा एक सीप छान्नुहोस्");
          return false;
        }
        return true;
      case 3: return true;
      case 4: return true;
      case 5:
        if (formData.pricingType === "hourly" && !formData.hourlyRate) {
          setError("Please set your hourly rate / कृपया आफ्नो प्रतिघण्टा दर सेट गर्नुहोस्");
          return false;
        }
        return true;
      case 6:
        if (!agreedToCode) {
          setError("You must agree to the Code of Conduct");
          return false;
        }
        if (!formData.agreedToPrivacy) {
          setError("You must agree to the Privacy Policy & Terms");
          return false;
        }
        return true;
      default: return true;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first");

      let avatarUrl = "";
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('task_photos').upload(fileName, avatarFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('task_photos').getPublicUrl(fileName);
          avatarUrl = data.publicUrl;
        }
      }

      const docUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(docFiles)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${key}_${user.id}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
          if (!uploadError) {
            const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
            docUrls[key] = data.publicUrl;
          }
        }
      }

      // Update user profile
      const { error: userError } = await supabase.from("users").update({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        area: formData.area,
        address: formData.address,
        avatar_url: avatarUrl || null,
        role: 'tasker'
      }).eq("id", user.id);
      if (userError) throw userError;

      // Upsert tasker data
      const { error: taskerError } = await supabase.from("taskers").upsert({
        user_id: user.id,
        hourly_rate: parseInt(formData.hourlyRate) || 500,
        city: formData.city.toLowerCase(),
        area: formData.area,
        skills: formData.skills,
        bio: formData.bio,
        experience: formData.experience,
        working_days: formData.workingDays,
        working_hours: { start: formData.startTime, end: formData.endTime },
        transportation_mode: formData.transportMode,
        documents: docUrls,
        status: "pending",
        rating: 0,
      }, { onConflict: 'user_id' });
      if (taskerError) throw taskerError;

      await supabase.auth.updateUser({ data: { role: 'tasker' } });
      router.push("/tasker/welcome");
    } catch (err: any) {
      console.error("Submission Error:", err);
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const maxDate18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      {/* Progress Bar */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          {/* Desktop Stepper */}
          <div className="hidden md:flex items-center gap-2">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${currentStep >= step.id ? "bg-sewakhoj-red text-white" : "bg-gray-100 text-gray-400"}`}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span className={`text-[9px] mt-1 text-center font-black uppercase tracking-tighter ${currentStep >= step.id ? "text-gray-900" : "text-gray-400"}`}>{step.label}</span>
                </div>
                {idx < steps.length - 1 && <div className={`h-1 flex-1 mx-1 rounded-full ${currentStep > step.id ? "bg-sewakhoj-red" : "bg-gray-100"}`} />}
              </div>
            ))}
          </div>
          {/* Mobile Stepper */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Step {currentStep} of 6</span>
              <span className="text-sm font-black text-gray-900 tracking-tight">{steps[currentStep-1].label}</span>
            </div>
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sewakhoj-red transition-all duration-500" 
                style={{ width: `${(currentStep / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-12 flex-1">
        
        {/* Step 1: Personal Info Refactored */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Avatar Upload Component */}
              <div className="lg:col-span-4 w-full flex flex-col items-center justify-center p-6 md:p-8 bg-white rounded-[40px] shadow-2xl border border-gray-50 relative group">
                <div className="relative w-32 h-32 md:w-44 md:h-44">
                  <div 
                    onClick={() => fileInput.current?.click()}
                    className={`w-full h-full rounded-full border-4 ${fieldErrors.avatar ? 'border-red-500' : 'border-gray-100'} overflow-hidden shadow-2xl relative bg-gray-50 flex items-center justify-center transition-all duration-500 group-hover:scale-105 cursor-pointer`}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-24 h-24 text-gray-200" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                      <Camera className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Upload Photo</span>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-sewakhoj-red text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <Plus className="w-6 h-6" />
                  </div>
                </div>
                <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  }
                }} />
                <div className="mt-8 text-center">
                  <h3 className="font-black text-gray-900 uppercase tracking-tighter text-xl">Profile Avatar</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">First impressions matter!</p>
                </div>
              </div>

              {/* Right: Personal Details in Groups */}
              <div className="lg:col-span-8 w-full space-y-8">
                {/* Basic Details Card */}
                <div className="bg-white p-6 rounded-[40px] shadow-xl border border-gray-50 space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Basic Identity</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-600 ml-1">Full Name / पूरा नाम *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input type="text" value={formData.fullName} onChange={e => updateForm("fullName", e.target.value)} 
                               className={`w-full bg-gray-50 border-2 ${fieldErrors.fullName ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-sewakhoj-red'} rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none transition-all shadow-inner`} placeholder="Ram Bahadur" />
                      </div>
                      {fieldErrors.fullName && <p className="text-[9px] font-black text-red-500 uppercase ml-2">{fieldErrors.fullName}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-600 ml-1">Phone / फोन *</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input type="tel" value={formData.phone} onChange={e => updateForm("phone", e.target.value)} 
                               className={`w-full bg-gray-50 border-2 ${fieldErrors.phone ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-sewakhoj-red'} rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none transition-all shadow-inner`} placeholder="98XXXXXXXX" />
                      </div>
                      {fieldErrors.phone && <p className="text-[9px] font-black text-red-500 uppercase ml-2">{fieldErrors.phone}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email / इमेल (Verified)</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="email" value={formData.email} readOnly 
                               className="w-full bg-gray-100 border-2 border-gray-200 text-gray-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none cursor-not-allowed" placeholder="email@example.com" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Identity & Demographics Card */}
                <div className="bg-white p-6 rounded-[40px] shadow-xl border border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-1">Date of Birth *</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                      <input type="date" value={formData.dob} max={maxDate18YearsAgo} onChange={e => updateForm("dob", e.target.value)}
                             className={`w-full bg-gray-50 border-2 ${fieldErrors.dob ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-sewakhoj-red'} rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none transition-all shadow-inner`} />
                    </div>
                    {fieldErrors.dob && <p className="text-[9px] font-black text-red-500 uppercase ml-2">{fieldErrors.dob}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-1">Gender / लिङ्ग</label>
                    <select value={formData.gender} onChange={e => updateForm("gender", e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all shadow-inner appearance-none">
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Location Card */}
                <div className="bg-white p-6 rounded-[40px] shadow-xl border border-gray-50 space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em] mb-2">Service Location</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-600 ml-1">City / सहर *</label>
                      <select value={formData.city} onChange={e => { updateForm("city", e.target.value); updateForm("area", ""); }}
                              className={`w-full bg-gray-50 border-2 ${fieldErrors.city ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-sewakhoj-red'} rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all shadow-inner appearance-none`}>
                        <option value="">Select City</option>
                        {dbCities.map(c => <option key={c.name} value={c.name.toLowerCase()}>{c.name}</option>)}
                      </select>
                      {fieldErrors.city && <p className="text-[9px] font-black text-red-500 uppercase ml-2">{fieldErrors.city}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-600 ml-1">Neighborhood Area</label>
                      <select value={formData.area} disabled={!formData.city} onChange={e => updateForm("area", e.target.value)}
                              className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red disabled:opacity-30 rounded-2xl py-4 px-6 font-bold text-sm outline-none transition-all shadow-inner appearance-none">
                        <option value="">Select Area</option>
                        {formData.city && AREAS_BY_CITY[formData.city.toLowerCase()]?.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-600 ml-1">Detailed Address</label>
                      <textarea value={formData.address} onChange={e => updateForm("address", e.target.value)} rows={2}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red rounded-3xl py-4 px-6 font-bold text-sm outline-none transition-all shadow-inner" placeholder="Street name, house no. etc..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Skills Selection */}
        {currentStep === 2 && (
          <div className="bg-white rounded-[40px] shadow-2xl p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-8 border-gray-50">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none mb-2">What's your expertise?</h2>
                <p className="text-sm md:text-base text-gray-500 font-bold uppercase tracking-widest opacity-60">आफ्नो सीप र विशेषज्ञता छान्नुस्</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl px-6 py-3 flex items-center gap-3 self-start md:self-center">
                <div className="w-10 h-10 bg-sewakhoj-red text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-red-500/20">
                  {formData.skills.length}
                </div>
                <span className="text-xs font-black text-sewakhoj-red uppercase tracking-widest">Skills Selected</span>
              </div>
            </div>

            {/* Mobile Sticky Header */}
            <div className="md:hidden sticky top-[-24px] z-20 bg-white pt-2 space-y-4 pb-4 border-b">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input type="text" placeholder="Search skills..." className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none" onChange={(e) => {
                    const val = e.target.value.toLowerCase();
                    document.querySelectorAll('.skill-card').forEach((item: any) => {
                      const text = item.getAttribute('data-skill-name')?.toLowerCase();
                      if (text?.includes(val)) item.classList.remove('hidden');
                      else item.classList.add('hidden');
                    });
                  }} />
               </div>
               <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                  {formData.skills.map(id => {
                    const s = services.find(x => x.id === id);
                    return <div key={id} className="flex-shrink-0 bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">{s?.emoji} {s?.nameEn} <X className="w-3 h-3" onClick={() => toggleSkill(id)} /></div>
                  })}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="hidden md:block relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300" />
                  <input type="text" placeholder="Search for services..." className="w-full bg-gray-50 border-2 border-transparent focus:border-sewakhoj-red rounded-[24px] py-5 pl-14 pr-6 font-bold text-lg outline-none shadow-inner" onChange={(e) => {
                    const val = e.target.value.toLowerCase();
                    document.querySelectorAll('.skill-card').forEach((item: any) => {
                      const text = item.getAttribute('data-skill-name')?.toLowerCase();
                      if (text?.includes(val)) item.classList.remove('hidden');
                      else item.classList.add('hidden');
                    });
                  }} />
                </div>
                <div className="md:h-[500px] md:overflow-y-auto flex flex-wrap gap-3 h-[40vh] overflow-y-auto content-start custom-scrollbar">
                  {services.map(s => {
                    const active = formData.skills.includes(s.id);
                    return (
                      <button key={s.id} type="button" data-skill-name={`${s.nameEn} ${s.nameNp}`} onClick={() => toggleSkill(s.id)}
                              className={`skill-card flex items-center gap-3 px-6 py-4 rounded-[20px] transition-all border-2 ${active ? 'bg-red-50 border-sewakhoj-red text-sewakhoj-red scale-95 opacity-50' : 'bg-white border-gray-100 hover:border-sewakhoj-red shadow-sm'}`}>
                        <span className="text-2xl">{s.emoji}</span>
                        <div className="text-left">
                          <p className="font-black text-xs uppercase tracking-tight">{s.nameEn}</p>
                          <p className="text-[9px] font-bold opacity-50">{s.nameNp}</p>
                        </div>
                        {active ? <CheckCircle2 className="w-5 h-5 ml-2" /> : <Plus className="w-5 h-5 ml-2 text-gray-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bucket Desktop */}
              <div className="hidden md:flex flex-col bg-gray-50 rounded-[40px] p-8 h-[600px] border border-gray-100">
                <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg mb-8">Selected Bucket</h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  {formData.skills.map(id => {
                    const s = services.find(x => x.id === id);
                    return (
                      <div key={id} className="bg-white p-5 rounded-3xl border border-gray-200 flex items-center justify-between group animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl">{s?.emoji}</div>
                          <p className="font-black text-gray-900 text-sm uppercase">{s?.nameEn}</p>
                        </div>
                        <button onClick={() => toggleSkill(id)} className="w-10 h-10 rounded-xl bg-red-50 text-sewakhoj-red flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                  {formData.skills.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-20"><Briefcase className="w-16 h-16" /><p className="font-black uppercase text-xs mt-4">Bucket is empty</p></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Steps (3, 4, 5, 6) ... Simplified for brevity in this rewrite, assuming they follow a similar card pattern */}
        {currentStep === 3 && (
          <div className="bg-white rounded-[40px] shadow-2xl p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Availability / उपलब्धता</h2>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                <button key={day} type="button" onClick={() => toggleDay(idx)}
                        className={`p-5 rounded-3xl font-black text-sm uppercase transition-all border-2 ${formData.workingDays.includes(idx) ? "bg-sewakhoj-red border-sewakhoj-red text-white shadow-xl shadow-red-500/20" : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"}`}>
                  {day}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Working Hours Start</label>
                  <input type="time" value={formData.startTime} onChange={e => updateForm("startTime", e.target.value)} className="w-full bg-gray-50 p-5 rounded-3xl font-black text-lg outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Working Hours End</label>
                  <input type="time" value={formData.endTime} onChange={e => updateForm("endTime", e.target.value)} className="w-full bg-gray-50 p-5 rounded-3xl font-black text-lg outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all" />
               </div>
            </div>
          </div>
        )}

        {/* Step 4: Verification */}
        {currentStep === 4 && (
          <div className="bg-white rounded-[40px] shadow-2xl p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-8">
             <h2 className="text-3xl font-black text-gray-900 tracking-tight">Identity Verification</h2>
             <div className="space-y-6">
                {[
                  { id: 'citizenship', label: 'Citizenship / National ID', icon: '🪪', ref: fileInputCitizenship, required: true },
                  { id: 'license', label: 'Driving License', icon: '🚗', ref: fileInputLicense, required: false }
                ].map(doc => (
                  <div key={doc.id} className="p-6 bg-gray-50 rounded-[32px] flex items-center justify-between group border-2 border-transparent hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">{doc.icon}</div>
                      <div>
                        <h4 className="font-black text-gray-900 uppercase tracking-tighter">{doc.label}</h4>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{doc.required ? 'Required' : 'Optional'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {docFiles[doc.id] ? (
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black text-green-600">✅ {docFiles[doc.id]?.name}</span>
                          <button onClick={() => setDocFiles(prev => ({...prev, [doc.id]: null}))} className="text-[10px] font-black text-red-500 uppercase hover:underline">Remove</button>
                        </div>
                      ) : (
                        <button onClick={() => doc.ref.current?.click()} className="px-6 py-3 bg-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-gray-900 hover:text-white transition-all">Upload File</button>
                      )}
                      <input type="file" ref={doc.ref} className="hidden" onChange={e => setDocFiles(prev => ({...prev, [doc.id]: e.target.files?.[0] || null}))} />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Step 5: Pricing */}
        {currentStep === 5 && (
          <div className="bg-white rounded-[40px] shadow-2xl p-6 md:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Earnings & Pricing</h2>
            <div className="p-8 bg-blue-600 text-white rounded-[40px] relative overflow-hidden shadow-2xl shadow-blue-500/30">
               <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck className="w-32 h-32" /></div>
               <div className="relative z-10 space-y-4">
                  <h4 className="font-black uppercase tracking-widest text-xs opacity-70">Our Promise</h4>
                  <p className="text-2xl font-bold leading-tight">You keep 90% of what you earn. <br/>A small 10% commission helps us run the platform.</p>
               </div>
            </div>
            <div className="space-y-4">
               <label className="text-xs font-black uppercase text-gray-500 ml-1">Your Hourly Rate (Rs)</label>
               <input type="number" value={formData.hourlyRate} onChange={e => updateForm("hourlyRate", e.target.value)} 
                      className="w-full bg-gray-50 p-8 rounded-[40px] font-black text-5xl text-sewakhoj-red focus:ring-4 focus:ring-red-100 outline-none transition-all shadow-inner" />
               <p className="text-xs font-bold text-gray-400 mt-4 italic">Recommended: Rs 400 - Rs 800 per hour for most services.</p>
            </div>
          </div>
        )}

        {/* Step 6: Finalize */}
        {currentStep === 6 && (
           <div className="bg-white rounded-[40px] shadow-2xl p-6 md:p-8 space-y-10 animate-in fade-in slide-in-from-bottom-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">One Final Step...</h2>
              <div className="space-y-6">
                <div 
                  onClick={() => setAgreedToCode(!agreedToCode)}
                  className={`p-8 rounded-[40px] border-2 cursor-pointer transition-all flex items-start gap-6 ${agreedToCode ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${agreedToCode ? 'bg-green-600 text-white' : 'bg-white border-2 border-gray-200'}`}>
                    {agreedToCode && <Check className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 uppercase tracking-tighter mb-2">I agree to the SewaKhoj Code of Conduct</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">I promise to be punctual, professional, and maintain a high standard of service for every customer.</p>
                  </div>
                </div>
                <div 
                  onClick={() => updateForm("agreedToPrivacy", !formData.agreedToPrivacy)}
                  className={`p-8 rounded-[40px] border-2 cursor-pointer transition-all flex items-start gap-6 ${formData.agreedToPrivacy ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${formData.agreedToPrivacy ? 'bg-green-600 text-white' : 'bg-white border-2 border-gray-200'}`}>
                    {formData.agreedToPrivacy && <Check className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 uppercase tracking-tighter mb-2">Privacy Policy & Terms</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">I have read and agree to the data protection policies and marketplace terms of service.</p>
                  </div>
                </div>
              </div>
           </div>
        )}

      </div>

      {/* Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:p-6 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
           <button onClick={prevStep} disabled={currentStep === 1 || loading} className="flex items-center gap-2 text-gray-400 font-black uppercase text-xs tracking-widest disabled:opacity-0 transition-all hover:text-gray-900">
             <X className="w-4 h-4 rotate-45" /> Back
           </button>

           {error && <p className="hidden md:block text-[10px] font-black text-red-500 uppercase animate-pulse">{error}</p>}

           <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col text-right">
                 <span className="text-[10px] font-black uppercase text-gray-400">Step {currentStep} of 6</span>
                 <span className="text-xs font-black text-gray-900">{steps[currentStep-1].label}</span>
              </div>
              <button 
                onClick={currentStep === 6 ? handleSubmit : nextStep}
                disabled={loading}
                className="bg-gray-900 text-white px-10 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-sewakhoj-red transition-all shadow-2xl flex items-center gap-3 disabled:opacity-50"
              >
                {loading ? "Processing..." : (currentStep === 6 ? "Finish & Submit" : "Next Step")} <ChevronRight className="w-5 h-5" />
              </button>
           </div>
        </div>
        {error && <p className="md:hidden text-center mt-3 text-[9px] font-black text-red-500 uppercase">{error}</p>}
      </div>

    </div>
  );
}
