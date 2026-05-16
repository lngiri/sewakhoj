"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
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
  Check,
  AlertCircle
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
  { id: 1, label: "Personal", labelNp: "व्यक्तिगत" },
  { id: 2, label: "Skills", labelNp: "सीप" },
  { id: 3, label: "Availability", labelNp: "उपलब्धता" },
  { id: 4, label: "Verification", labelNp: "प्रमाणीकरण" },
  { id: 5, label: "Pricing", labelNp: "मूल्य" },
  { id: 6, label: "Finalize", labelNp: "अन्तिम" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_RETRIES = 2;

export default function TaskerOnboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dbCities, setDbCities] = useState<{name: string, name_np: string}[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  
  const today = new Date();
  
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    dob: "",
    gender: "",
    city: "",
    area: "",
    customArea: "",
    address: "",
    isPhoneEditable: true,
    isEmailEditable: false,
    isNameEditable: true,
    skills: [] as string[],
    skillLevels: {} as Record<string, string>,
    hasTools: false,
    languages: ["Nepali"] as string[],
    shortPitch: "",
    availability: {
      0: ["morning", "afternoon"],
      1: ["morning", "afternoon"],
      2: ["morning", "afternoon"],
      3: ["morning", "afternoon"],
      4: ["morning", "afternoon"],
      5: ["morning", "afternoon"],
      6: ["morning", "afternoon"],
    } as Record<number, string[]>,
    bio: "",
    experience: "",
    hourlyRate: "500",
    pricingType: "hourly",
    workingDays: [1, 2, 3, 4, 5] as number[],
    startTime: "09:00",
    endTime: "18:00",
    transportMode: "motorcycle",
    agreedToPrivacy: false,
    docsExpiryDate: "",
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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [agreedToCode, setAgreedToCode] = useState(false);
  const [commissionRate, setCommissionRate] = useState(10); // Default fallback
  const [stepsCompleted, setStepsCompleted] = useState<number[]>([]);

  // Fetch cities and settings
  useEffect(() => {
    const fetchData = async () => {
      // Fetch cities
      const { data: citiesData } = await supabase
        .from("cities")
        .select("name, name_np")
        .eq("is_active", true)
        .order("name");
      if (citiesData) setDbCities(citiesData);

      // Fetch commission rate
      const { data: settingsData } = await supabase
        .from("platform_settings")
        .select("commission_rate_percentage")
        .single();
      if (settingsData) setCommissionRate(Number(settingsData.commission_rate_percentage));
    };
    fetchData();
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

  // PERSISTENCE PROTOCOL: Load progress from DB (Phase 5.2)
  useEffect(() => {
    const loadProgress = async () => {
      if (!authUser?.id) return;
      const { data } = await supabase
        .from("onboarding_progress")
        .select("current_step, steps_completed, form_data")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (data) {
        if (data.current_step) setCurrentStep(data.current_step);
        if (data.steps_completed) setStepsCompleted(data.steps_completed);
        if (data.form_data && typeof data.form_data === 'object') {
          setFormData(prev => ({ ...prev, ...data.form_data }));
        }
      }
    };
    if (authUser?.id) loadProgress();
  }, [authUser?.id]);

  // PERSISTENCE PROTOCOL: Save progress to DB (debounced, Phase 5.2)
  useEffect(() => {
    if (!authUser?.id) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase.from("onboarding_progress").upsert({
        user_id: authUser.id,
        current_step: currentStep,
        steps_completed: stepsCompleted,
        form_data: formData,
        last_updated: new Date().toISOString()
      }, { onConflict: 'user_id' });
    }, 800); // Debounce 800ms
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [formData, currentStep, stepsCompleted, authUser?.id]);

  // Pre-fill form with auth user data AND database data
  useEffect(() => {
    const loadProfile = async () => {
      if (authUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (profile) {
          setFormData(prev => ({
            ...prev,
            fullName: prev.fullName || profile.full_name || "",
            phone: prev.phone || profile.phone || "",
            email: prev.email || profile.email || "",
            dob: prev.dob || profile.dob || "",
            gender: prev.gender || profile.gender || "",
            city: prev.city || profile.city || "",
            area: prev.area || profile.area || "",
            address: prev.address || profile.address || "",
            // If data exists in DB, make fields read-only by default
            isNameEditable: !profile.full_name,
            isPhoneEditable: !profile.phone,
          }));
          
          if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
        } else {
          // Fallback to auth metadata if no DB profile yet
          setFormData(prev => ({
            ...prev,
            email: authUser.email || prev.email,
            fullName: authUser.user_metadata?.full_name || "",
            phone: authUser.phone || authUser.user_metadata?.phone || "",
          }));
        }
      }
    };
    loadProfile();
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
      const isSelected = prev.skills.includes(skillId);
      const skills = isSelected
        ? prev.skills.filter((id) => id !== skillId)
        : [...prev.skills, skillId];
      
      const skillLevels = { ...prev.skillLevels };
      if (!isSelected) {
        skillLevels[skillId] = 'Intermediate'; // Default
      } else {
        delete skillLevels[skillId];
      }
      return { ...prev, skills, skillLevels };
    });
  };

  const updateSkillLevel = (skillId: string, level: string) => {
    setFormData(prev => ({
      ...prev,
      skillLevels: { ...prev.skillLevels, [skillId]: level }
    }));
  };

  const toggleAvailability = (dayIdx: number, slot: string) => {
    setFormData(prev => {
      const current = prev.availability[dayIdx] || [];
      const updated = current.includes(slot)
        ? current.filter(s => s !== slot)
        : [...current, slot];
      return {
        ...prev,
        availability: { ...prev.availability, [dayIdx]: updated }
      };
    });
  };

  const setBulkAvailability = (mode: 'all' | 'none' | 'weekdays' | 'weekends') => {
    setFormData(prev => {
      const nextAvailability = { ...prev.availability };
      const days = [0, 1, 2, 3, 4, 5, 6];
      const slots = ['morning', 'afternoon', 'evening'];

      days.forEach(day => {
        if (mode === 'all') {
          nextAvailability[day] = [...slots];
        } else if (mode === 'none') {
          nextAvailability[day] = [];
        } else if (mode === 'weekdays') {
          if (day >= 1 && day <= 5) nextAvailability[day] = [...slots];
          else nextAvailability[day] = [];
        } else if (mode === 'weekends') {
          if (day === 0 || day === 6) nextAvailability[day] = [...slots];
          else nextAvailability[day] = [];
        }
      });

      return { ...prev, availability: nextAvailability };
    });
  };

  const calculateProfileStrength = () => {
    let strength = 10; // Base
    if (avatarFile) strength += 15;
    if (formData.skills.length > 0) strength += 15;
    if (formData.skills.length >= 3) strength += 10;
    if (formData.hasTools) strength += 10;
    if (formData.languages.length > 1) strength += 5;
    if (formData.experience) strength += 10;
    if (formData.shortPitch.length > 20) strength += 15;
    if (Object.values(formData.availability).some(v => v.length > 0)) strength += 20;
    return Math.min(strength, 100);
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
        
        // Nepal Phone Validation: 98 or 97 followed by 8 digits
        const phoneRegex = /^9[78]\d{8}$/;
        if (!formData.phone) {
          errors.phone = "Phone number is required";
        } else if (!phoneRegex.test(formData.phone)) {
          errors.phone = "Enter a valid Nepal mobile number (9[678]XXXXXXXX)";
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
        
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;

      case 2:
if (formData.skills.length === 0) {
            setError("Please select at least one skill (कृपया कम्तिमा एक सीप छान्नुहोस्)");
            return false;
         }
        return true;
      case 3: return true;
      case 4: return true;
      case 5:
if (formData.pricingType === "hourly" && !formData.hourlyRate) {
            setError("Please set your hourly rate (कृपया आफ्नो प्रतिघण्टा दर सेट गर्नुहोस्)");
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
      setStepsCompleted(prev => {
        if (!prev.includes(currentStep)) return [...prev, currentStep];
        return prev;
      });
      setCurrentStep((prev) => Math.min(prev + 1, 6));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  // Validate a file before upload
  const validateFile = (file: File, docId: string): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `Unsupported file type. Please upload JPG, PNG, WebP, or PDF.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `File too large (${sizeMB}MB). Maximum size is 5MB.`;
    }
    return null;
  };

  // Upload a file with progress tracking and retry
  const uploadFileWithProgress = async (
    bucket: string,
    path: string,
    file: File,
    docId: string
  ): Promise<string> => {
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        setUploadProgress(prev => ({ ...prev, [docId]: 0 }));
        setUploadErrors(prev => ({ ...prev, [docId]: "" }));

        // Use XMLHttpRequest for progress tracking (fetch doesn't support upload progress)
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
        
        // Get auth token before creating XHR (avoid await in non-async callback)
        const { data: sessionData } = await supabase.auth.getSession();
        const authToken = sessionData.session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        const result = await new Promise<{ publicUrl: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(prev => ({ ...prev, [docId]: pct }));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const { data } = supabase.storage.from(bucket).getPublicUrl(path);
              resolve({ publicUrl: data.publicUrl });
            } else {
              try {
                const errBody = JSON.parse(xhr.responseText);
                reject(new Error(errBody.message || errBody.error || `Upload failed (${xhr.status})`));
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            }
          });

          xhr.addEventListener('error', () => reject(new Error("Network error during upload. Check your connection.")));
          xhr.addEventListener('abort', () => reject(new Error("Upload cancelled.")));

          xhr.open('PUT', url);
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
          xhr.setRequestHeader('x-upsert', 'true');
          xhr.send(file);
        });

        setUploadProgress(prev => ({ ...prev, [docId]: 100 }));
        return result.publicUrl;
      } catch (err: any) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          // Wait before retry (exponential backoff: 1s, 2s)
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        }
      }
    }
    
    throw lastError || new Error("Upload failed after retries");
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    setError("");
    setUploadErrors({});

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first");

      let avatarUrl = "";
      if (avatarFile) {
        const validationError = validateFile(avatarFile, 'avatar');
        if (validationError) throw new Error(validationError);
        
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
        try {
          avatarUrl = await uploadFileWithProgress('task_photos', fileName, avatarFile, 'avatar');
        } catch (err: any) {
          setUploadErrors(prev => ({ ...prev, avatar: err.message }));
          throw new Error(`Avatar upload failed: ${err.message}`);
        }
      }

      const docUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(docFiles)) {
        if (file) {
          const validationError = validateFile(file, key);
          if (validationError) {
            setUploadErrors(prev => ({ ...prev, [key]: validationError }));
            throw new Error(`${key}: ${validationError}`);
          }
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${key}_${Date.now()}.${fileExt}`;
          try {
            docUrls[key] = await uploadFileWithProgress('documents', fileName, file, key);
          } catch (err: any) {
            setUploadErrors(prev => ({ ...prev, [key]: err.message }));
            throw new Error(`Document upload failed (${key}): ${err.message}`);
          }
        }
      }

      // Upsert user profile (ensures record exists in public.users)
      const { error: userError } = await supabase.from("users").upsert({
        id: user.id,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        area: formData.area === 'other' ? formData.customArea : formData.area,
        address: formData.address,
        gender: formData.gender,
        avatar_url: avatarUrl || null,
        role: 'tasker'
      });
      if (userError) throw userError;

      // Upsert tasker data (capture returned ID for junction writes)
      const { data: upsertedTasker, error: taskerError } = await supabase
        .from("taskers")
        .upsert({
          user_id: user.id,
          hourly_rate: parseInt(formData.hourlyRate) || 500,
          city: formData.city.toLowerCase(),
          area: formData.area === 'other' ? formData.customArea : formData.area,
          skills: formData.skills,
          bio: formData.bio,
          experience: Object.entries(formData.skillLevels)
            .map(([id, level]) => {
              const s = services.find(x => x.id === id);
              return `${s?.nameEn}: ${level}`;
            }).join("; ") || formData.experience,
          working_days: Object.entries(formData.availability)
            .filter(([_, slots]) => slots.length > 0)
            .map(([day]) => parseInt(day)),
          working_hours: formData.availability,
          transportation_mode: formData.transportMode,
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

      // Write to tasker_skills junction table (Phase 1.12)
      if (upsertedTasker && formData.skills.length > 0) {
        const taskerId = upsertedTasker.id;

        // Delete existing junction rows for this tasker
        await supabase
          .from("tasker_skills")
          .delete()
          .eq("tasker_id", taskerId);

        // Insert new junction rows
        const skillRows = formData.skills.map((skillId: string) => ({
          tasker_id: taskerId,
          service_id: skillId,
          skill_level: formData.skillLevels[skillId] || 'Intermediate',
          hourly_rate: parseInt(formData.hourlyRate) || 500
        }));

        const { error: skillsError } = await supabase
          .from("tasker_skills")
          .insert(skillRows);

        if (skillsError) {
          console.error("Failed to write tasker_skills junction:", skillsError);
          // Non-fatal: the sync trigger will still update taskers.skills[] from the upsert above
        }
      }

      await supabase.auth.updateUser({ data: { role: 'tasker' } });
      
      // Mark onboarding as completed in DB (Phase 5.2)
      await supabase.from("onboarding_progress").upsert({
        user_id: user.id,
        current_step: 6,
        steps_completed: [1, 2, 3, 4, 5, 6],
        form_data: formData,
        completed_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }, { onConflict: 'user_id' });
      
      router.push("/tasker/welcome");
    } catch (err: any) {
      console.error("Submission Error:", err);
      setError(err.message || "Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const maxDate18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  
  return (
    <div className="flex min-h-screen w-full bg-white font-sans overflow-x-hidden">
      {/* Left Panel - Hidden on mobile */}
      <div className="hidden lg:flex flex-col w-[360px] xl:w-[420px] bg-gray-900 text-white relative shrink-0 sticky top-0 h-screen">
        <div className="absolute inset-0 opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-blue-600/30 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sewakhoj-red/20 blur-[100px] rounded-full"></div>
        
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
          <div className="mb-12">
            <Link href="/">
               <img src="/logo.png" className="h-12 w-12 rounded-xl object-cover shadow-lg" alt="SewaKhoj" />
            </Link>
          </div>
          
          <h1 className="text-3xl font-black mb-3 tracking-tight">Become a Tasker</h1>
          <p className="text-gray-400 font-bold text-base mb-12">Join Nepal's premier service marketplace.</p>

          <div className="space-y-8 flex-1">
            {steps.map((step, idx) => (
               <div key={step.id} className={`flex items-start gap-5 transition-all duration-500 ${currentStep === step.id ? 'opacity-100' : currentStep > step.id ? 'opacity-70' : 'opacity-30'}`}>
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2 transition-colors ${currentStep === step.id ? 'bg-sewakhoj-red border-sewakhoj-red text-white shadow-[0_0_20px_rgba(234,67,53,0.4)]' : currentStep > step.id ? 'bg-white text-gray-900 border-white' : 'border-gray-600 text-gray-400'}`}>
                   {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                 </div>
<div className="pt-2">
                    <p className={`font-black text-base uppercase tracking-wider ${currentStep === step.id ? 'text-white' : 'text-gray-300'}`}>{step.label}</p>
                    <p className={`text-xs font-bold mt-1 font-devanagari ${currentStep === step.id ? 'text-blue-400' : 'text-gray-500'}`}>{step.labelNp}</p>
                  </div>
               </div>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-white/10">
            <div className="flex justify-between items-end mb-3">
               <div>
                  <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Profile Strength</p>
                  <p className="text-xl font-black mt-1">{calculateProfileStrength()}%</p>
               </div>
               <p className="text-[10px] font-bold uppercase text-sewakhoj-red bg-sewakhoj-red/10 px-3 py-1.5 rounded-lg">{calculateProfileStrength() >= 80 ? 'Strong' : 'Needs Work'}</p>
            </div>
            <div className="h-2.5 w-full bg-gray-800 rounded-full overflow-hidden">
               <div className="h-full bg-sewakhoj-red transition-all duration-700 ease-out" style={{ width: `${calculateProfileStrength()}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-gray-50 min-h-screen">
         <div className="lg:hidden bg-white border-b border-gray-100 p-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-sewakhoj-red text-white rounded-lg flex items-center justify-center font-black text-sm">{currentStep}</div>
               <div>
                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Step {currentStep} of 6</p>
                 <p className="text-sm font-black text-gray-900">{steps[currentStep-1].label}</p>
               </div>
            </div>
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-sewakhoj-red transition-all" style={{ width: `${(currentStep / 6) * 100}%` }}></div>
            </div>
         </div>

         <div className="flex-1 flex flex-col p-6 md:py-8 md:px-12">
           <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">
              
              {currentStep === 1 && (
                 <div className="animate-in slide-in-from-bottom-8 duration-500">
                    <div className="mb-8">
                       <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Basic Identity</h2>
                       <p className="text-base text-gray-500 font-medium mt-2">Let's start with your personal details.</p>
                    </div>
                    
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-8 mb-10 pb-10 border-b border-gray-100">
                        <div className="relative shrink-0 group">
                           <div onClick={() => fileInput.current?.click()} className={`w-28 h-28 md:w-32 md:h-32 rounded-[24px] border-4 ${fieldErrors.avatar ? 'border-red-500' : 'border-gray-100'} bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:border-blue-200 hover:shadow-xl`}>
                              {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                              ) : formData.gender === 'female' ? (
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&gender=female" alt="Default Female" className="w-full h-full object-cover opacity-50" />
                              ) : formData.gender === 'male' ? (
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&gender=male" alt="Default Male" className="w-full h-full object-cover opacity-50" />
                              ) : (
                                <User className="w-12 h-12 text-gray-300 group-hover:scale-110 transition-transform" />
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                                 <Camera className="w-6 h-6 mb-1" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                              </div>
                           </div>
                           <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-sewakhoj-red text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white pointer-events-none">
                              <Plus className="w-5 h-5" />
                           </div>
                        </div>
                        <div>
                           <h3 className="font-black text-xl text-gray-900 mb-1">Profile Photo</h3>
                           <p className="text-sm font-medium text-gray-500">Taskers with clear profile photos get booked 3x more often.</p>
                        </div>
                        <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
                        }} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                         <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Full Name *</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input type="text" value={formData.fullName} onChange={e => updateForm("fullName", e.target.value)} 
                                     className={`w-full bg-gray-50 border-2 ${fieldErrors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-100 focus:border-sewakhoj-red focus:bg-white'} rounded-xl py-3.5 pl-12 pr-4 font-bold text-base outline-none transition-all`} placeholder="Ram Bahadur" />
                            </div>
                            {fieldErrors.fullName && <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.fullName}</p>}
                         </div>

                         <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-bold text-gray-700">Phone Number *</label>
                              {!formData.isPhoneEditable && (
                                <button type="button" onClick={() => updateForm("isPhoneEditable", true)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Change</button>
                              )}
                            </div>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input type="tel" value={formData.phone} onChange={e => updateForm("phone", e.target.value)} 
                                     disabled={!formData.isPhoneEditable}
                                     className={`w-full bg-gray-50 border-2 ${fieldErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-100 focus:border-sewakhoj-red focus:bg-white'} ${!formData.isPhoneEditable ? 'opacity-70 cursor-not-allowed' : ''} rounded-xl py-3.5 pl-12 pr-4 font-bold text-base outline-none transition-all`} placeholder="9[678]XXXXXXXX" />
                            </div>
                            {fieldErrors.phone && <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.phone}</p>}
                         </div>

                         <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Gender *</label>
                            <div className="flex gap-4">
                              {['male', 'female', 'other'].map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => updateForm("gender", g)}
                                  className={`flex-1 py-3.5 rounded-xl border-2 font-bold text-sm capitalize transition-all ${formData.gender === g ? 'border-sewakhoj-red bg-red-50 text-sewakhoj-red' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                            {fieldErrors.gender && <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.gender}</p>}
                         </div>

                         <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input type="email" value={formData.email} readOnly 
                                     className="w-full bg-gray-100 border-2 border-gray-200 text-gray-500 rounded-xl py-3.5 pl-12 pr-4 font-bold text-base outline-none cursor-not-allowed" />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Date of Birth *</label>
                            <div className="relative">
                              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                              <input type="date" value={formData.dob} max={maxDate18YearsAgo} onChange={e => updateForm("dob", e.target.value)}
                                     className={`w-full bg-gray-50 border-2 ${fieldErrors.dob ? 'border-red-500 bg-red-50' : 'border-gray-100 focus:border-sewakhoj-red focus:bg-white'} rounded-xl py-3.5 pl-12 pr-4 font-bold text-base outline-none transition-all`} />
                            </div>
                            {fieldErrors.dob && <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.dob}</p>}
                         </div>

                         <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">City *</label>
                            <select value={formData.city} onChange={e => { updateForm("city", e.target.value); updateForm("area", ""); }}
                                    className={`w-full bg-gray-50 border-2 ${fieldErrors.city ? 'border-red-500 bg-red-50' : 'border-gray-100 focus:border-sewakhoj-red focus:bg-white'} rounded-xl py-3.5 px-4 font-bold text-base outline-none transition-all appearance-none`}>
                              <option value="">Select City</option>
                              {dbCities.map(c => <option key={c.name} value={c.name.toLowerCase()}>{c.name}</option>)}
                            </select>
                            {fieldErrors.city && <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.city}</p>}
                         </div>

                         <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Area</label>
                            <select value={formData.area} disabled={!formData.city} onChange={e => updateForm("area", e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-sewakhoj-red focus:bg-white disabled:opacity-50 rounded-xl py-3.5 px-4 font-bold text-base outline-none transition-all appearance-none">
                              <option value="">Select Area</option>
                              {formData.city && AREAS_BY_CITY[formData.city.toLowerCase()]?.map(a => <option key={a} value={a}>{a}</option>)}
                              <option value="other">Other</option>
                            </select>
                         </div>

                         {formData.area === 'other' && (
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-sm font-bold text-gray-700">Custom Area Name *</label>
                              <input type="text" value={formData.customArea} onChange={e => updateForm("customArea", e.target.value)} 
                                     className={`w-full bg-gray-50 border-2 ${fieldErrors.customArea ? 'border-red-500 bg-red-50' : 'border-gray-100 focus:border-sewakhoj-red focus:bg-white'} rounded-xl py-3.5 px-4 font-bold text-base outline-none transition-all`} placeholder="Ex: Sanepa-2" />
                              {fieldErrors.customArea && <p className="text-xs font-bold text-red-500 mt-1">{fieldErrors.customArea}</p>}
                            </div>
                         )}
                      </div>
                    </div>
                 </div>
              )}

              {currentStep === 2 && (
                 <div className="animate-in slide-in-from-bottom-8 duration-500 flex flex-col h-full">
                    <div className="mb-6 shrink-0">
                       <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Expertise Dashboard</h2>
                       <p className="text-base text-gray-500 font-medium mt-2">What services can you provide?</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
                       <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col">
                          <div className="relative mb-4 shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" placeholder="Search services..." className="w-full bg-gray-50 border-2 border-gray-100 focus:border-sewakhoj-red rounded-xl py-3.5 pl-12 pr-4 font-bold text-base outline-none transition-all" onChange={(e) => {
                              const val = e.target.value.toLowerCase();
                              document.querySelectorAll('.skill-card').forEach((item: any) => {
                                if (item.getAttribute('data-skill-name')?.toLowerCase().includes(val)) item.classList.remove('hidden');
                                else item.classList.add('hidden');
                              });
                            }} />
                          </div>
                          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2">
                             {services.map(s => {
                               const active = formData.skills.includes(s.id);
                               return (
                                 <button key={s.id} type="button" data-skill-name={`${s.nameEn} ${s.nameNp}`} onClick={() => toggleSkill(s.id)}
                                         className={`skill-card flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${active ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-gray-50 border-transparent hover:border-gray-200 hover:bg-gray-100'}`}>
                                    <div className="flex items-center gap-4">
                                       <span className="text-2xl bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0">{s.emoji}</span>
                                       <div>
                                         <p className="font-black text-sm text-gray-900 leading-tight">{s.nameEn}</p>
                                         <p className="font-medium text-xs text-gray-500">{s.nameNp}</p>
                                       </div>
                                    </div>
                                    {active ? <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0" /> : <Plus className="w-5 h-5 text-gray-400 shrink-0" />}
                                 </button>
                               )
                             })}
                          </div>
                       </div>

                       <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex flex-col">
                          <h3 className="font-black text-gray-900 mb-4 shrink-0">Selected Services</h3>
                          {formData.skills.length === 0 ? (
                             <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                <Briefcase className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="font-bold text-base text-gray-500">No services selected yet.</p>
                                <p className="text-sm font-medium mt-1">Select from the list on the left.</p>
                             </div>
                          ) : (
                             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                                {formData.skills.map(id => {
                                   const s = services.find(x => x.id === id);
                                   const level = formData.skillLevels[id] || 'Intermediate';
                                   return (
                                      <div key={id} className="bg-gray-50 border border-gray-200 p-4 rounded-2xl animate-in slide-in-from-right-4">
                                         <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                               <span className="text-xl">{s?.emoji}</span>
                                               <p className="font-black text-sm text-gray-900">{s?.nameEn}</p>
                                            </div>
                                            <button onClick={() => toggleSkill(id)} className="text-gray-400 hover:text-red-500 p-1"><X className="w-4 h-4" /></button>
                                         </div>
                                         <div className="flex bg-gray-200/50 p-1 rounded-xl">
                                            {['Beginner', 'Intermediate', 'Expert'].map(l => (
                                               <button key={l} onClick={() => updateSkillLevel(id, l)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${level === l ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                                  {l}
                                               </button>
                                            ))}
                                         </div>
                                      </div>
                                   )
                                })}
                             </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-gray-100 shrink-0">
                             <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <span className="font-bold text-sm text-blue-900">I have my own tools</span>
                                <button onClick={() => updateForm("hasTools", !formData.hasTools)} className={`w-12 h-6 rounded-full relative transition-colors ${formData.hasTools ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.hasTools ? 'left-7' : 'left-1'}`}></div>
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {currentStep === 3 && (
                 <div className="animate-in slide-in-from-bottom-8 duration-500">
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                       <div>
                          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Availability Grid</h2>
                          <p className="text-base text-gray-500 font-medium mt-2">When are you ready to work?</p>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => setBulkAvailability('weekdays')} className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-900 rounded-xl font-bold text-xs transition-all shadow-sm">Weekdays</button>
                          <button onClick={() => setBulkAvailability('weekends')} className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-900 rounded-xl font-bold text-xs transition-all shadow-sm">Weekends</button>
                       </div>
                    </div>

                    <div className="bg-white rounded-[32px] p-4 md:p-8 shadow-sm border border-gray-100 overflow-hidden relative">
                        {/* Mobile Scroll Hint */}
                        <div className="lg:hidden flex items-center justify-center gap-2 mb-4 animate-pulse">
                           <div className="h-px w-8 bg-gray-200" />
                           <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Scroll to see all days</span>
                           <div className="h-px w-8 bg-gray-200" />
                        </div>

                        <div className="overflow-x-auto md:overflow-x-visible custom-scrollbar">
                           <div className="min-w-[480px] md:min-w-0">
                              <div className="grid grid-cols-[70px_repeat(7,1fr)] md:grid-cols-[100px_repeat(7,1fr)] gap-1 md:gap-3 mb-4">
                                <div className="sticky left-0 bg-white z-20" />
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                    <div key={d} className="text-center font-black text-[10px] md:text-sm text-gray-400 uppercase tracking-widest">
                                       <span className="hidden md:inline">{d}</span>
                                       <span className="md:hidden">{d[0]}</span>
                                    </div>
                                ))}
                             </div>
                             {['morning', 'afternoon', 'evening'].map(slot => (
                                 <div key={slot} className="grid grid-cols-[70px_repeat(7,1fr)] md:grid-cols-[100px_repeat(7,1fr)] gap-1 md:gap-3 mb-2 md:mb-4">
                                   <div className="flex flex-col items-end justify-center pr-3 md:pr-4 sticky left-0 bg-white z-10 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] md:shadow-none border-r border-gray-50 md:border-none">
                                       <span className="font-black text-[10px] md:text-sm text-gray-900 uppercase tracking-tighter leading-none">
                                          <span className={slot === 'afternoon' ? 'hidden md:inline' : ''}>{slot}</span>
                                          {slot === 'afternoon' && <span className="md:hidden">Aft</span>}
                                       </span>
                                      <span className="text-[9px] md:text-[10px] font-bold text-gray-400 whitespace-nowrap mt-1">
                                        {slot === 'morning' ? '8-12' : slot === 'afternoon' ? '12-5' : '5-9'}
                                      </span>
                                   </div>
                                   {[0, 1, 2, 3, 4, 5, 6].map(day => {
                                      const active = formData.availability[day]?.includes(slot);
                                      return (
                                         <button key={`${day}-${slot}`} onClick={() => toggleAvailability(day, slot)}
                                                 className={`h-14 md:h-20 rounded-xl md:rounded-2xl border transition-all flex items-center justify-center ${active ? 'bg-sewakhoj-red border-sewakhoj-red text-white shadow-lg shadow-red-500/20' : 'bg-gray-50 border-gray-100 hover:border-gray-300 text-transparent'}`}>
                                            {active ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-current opacity-20" />}
                                         </button>
                                      )
                                   })}
                                </div>
                             ))}
                          </div>
                       </div>
                       <p className="mt-4 text-[10px] md:text-xs text-gray-400 font-bold italic text-center md:text-left">
                         Tip: Tap and hold to select multiple slots if needed.
                       </p>
                    </div>
                 </div>
              )}

              {currentStep === 4 && (
                 <div className="animate-in slide-in-from-bottom-8 duration-500">
                    <div className="mb-8">
                       <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Identity Verification</h2>
                       <p className="text-base text-gray-500 font-medium mt-2">Upload documents to build trust with customers.</p>
                    </div>

                    <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100 space-y-6">
                       {[
                         { id: 'citizenship', label: 'Citizenship / National ID', icon: '🪪', ref: fileInputCitizenship, required: true },
                         { id: 'license', label: 'Driving License', icon: '🚗', ref: fileInputLicense, required: false }
                       ].map(doc => {
                         const file = docFiles[doc.id];
                         const progress = uploadProgress[doc.id];
                         const uploadErr = uploadErrors[doc.id];
                         const isUploading = progress !== undefined && progress > 0 && progress < 100;
                         
                         return (
                         <div key={doc.id} className={`p-6 rounded-2xl flex flex-col gap-4 transition-colors ${uploadErr ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50 border-2 border-gray-100 hover:border-blue-200'}`}>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                               <div className="flex items-center gap-5">
                                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 shrink-0">{doc.icon}</div>
                                  <div>
                                    <h4 className="font-black text-lg text-gray-900 leading-tight">{doc.label}</h4>
                                    <p className="text-xs font-bold text-gray-500 mt-1">{doc.required ? 'Required for verification' : 'Optional — JPG, PNG, WebP, PDF up to 5MB'}</p>
                                  </div>
                               </div>
                               
                               {file ? (
                                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-green-200 w-full md:w-auto">
                                     <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                     <div className="min-w-0">
                                       <span className="font-bold text-sm text-gray-900 truncate block max-w-[150px]">{file.name}</span>
                                       <span className="text-[10px] text-gray-400 font-bold">{(file.size / 1024).toFixed(0)} KB</span>
                                     </div>
                                     <button onClick={() => { setDocFiles(prev => ({...prev, [doc.id]: null})); setUploadProgress(prev => ({...prev, [doc.id]: 0})); setUploadErrors(prev => ({...prev, [doc.id]: ""})); }} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors ml-auto">
                                        <X className="w-4 h-4" />
                                     </button>
                                  </div>
                               ) : (
                                  <button onClick={() => doc.ref.current?.click()} className="w-full md:w-auto bg-white border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm">
                                     Choose File
                                  </button>
                               )}
                            </div>
                            
                            {/* Upload Progress Bar */}
                            {isUploading && (
                               <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div className="bg-sewakhoj-red h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                               </div>
                            )}
                            {progress === 100 && !uploadErr && (
                               <p className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Upload complete
                               </p>
                            )}
                            
                            {/* Upload Error */}
                            {uploadErr && (
                               <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" /> {uploadErr}
                               </p>
                            )}
                            
                            <input
                               type="file"
                               ref={doc.ref}
                               className="hidden"
                               accept="image/jpeg,image/png,image/webp,application/pdf"
                               onChange={e => {
                                  const selectedFile = e.target.files?.[0];
                                  if (!selectedFile) return;
                                  const err = validateFile(selectedFile, doc.id);
                                  if (err) {
                                     setUploadErrors(prev => ({ ...prev, [doc.id]: err }));
                                     return;
                                  }
                                  setUploadErrors(prev => ({ ...prev, [doc.id]: "" }));
                                  setDocFiles(prev => ({...prev, [doc.id]: selectedFile}));
                               }}
                            />
                         </div>
                         );
                       })}

                       <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 leading-none">Validity Period (म्याद)</h4>
                                    <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">When do these documents expire?</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Document Expiry Date</label>
                                <input 
                                    type="date"
                                    value={formData.docsExpiryDate}
                                    onChange={(e) => setFormData({...formData, docsExpiryDate: e.target.value})}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-amber-500 rounded-2xl px-6 py-4 font-bold text-sm transition-all outline-none"
                                />
                                <p className="text-[10px] text-amber-600 font-bold ml-1 italic">Notice: Accounts with expired IDs are suspended automatically.</p>
                            </div>
                        </div>
                    </div>
                 </div>
              )}

              {currentStep === 5 && (
                 <div className="animate-in slide-in-from-bottom-8 duration-500">
                    <div className="mb-8">
                       <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Earnings & Pricing</h2>
                       <p className="text-base text-gray-500 font-medium mt-2">Set your rates and transport details.</p>
                    </div>

                    <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100">
                       <div className="bg-blue-600 rounded-[24px] p-8 text-white relative overflow-hidden mb-8 shadow-xl shadow-blue-500/20">
                          <ShieldCheck className="absolute -right-4 -bottom-4 w-40 h-40 opacity-10" />
                          <div className="relative z-10">
                             <p className="text-sm font-bold text-blue-200 uppercase tracking-widest mb-2">Our Promise</p>
                             <h3 className="text-2xl font-black leading-tight max-w-sm">
                               You keep {100 - commissionRate}% of what you earn. A small {commissionRate}% platform fee applies.
                             </h3>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="text-sm font-bold text-gray-700">Your Base Hourly Rate (Rs)</label>
                             <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-2xl text-gray-400">Rs</span>
                                <input type="number" value={formData.hourlyRate} onChange={e => updateForm("hourlyRate", e.target.value)} 
                                       className="w-full bg-gray-50 border-2 border-gray-100 focus:border-sewakhoj-red focus:bg-white rounded-2xl py-6 pl-16 pr-6 font-black text-3xl text-gray-900 outline-none transition-all" />
                             </div>
                             <p className="text-sm font-medium text-gray-500">Recommended: Rs 400 - 800 / hr</p>
                             {error && currentStep === 5 && <p className="text-xs font-bold text-red-500">{error}</p>}
                          </div>

                          <div className="space-y-6">
                             <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Mode of Transport</label>
                                <select value={formData.transportMode} onChange={e => updateForm("transportMode", e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-gray-100 focus:border-sewakhoj-red focus:bg-white rounded-xl py-3.5 px-4 font-bold text-base outline-none transition-all appearance-none">
                                    <option value="walking">Walking / No Transport</option>
                                    <option value="bicycle">Bicycle</option>
                                    <option value="motorcycle">Motorcycle / Scooter</option>
                                    <option value="car">Car / Van</option>
                                    <option value="public_transit">Public Transit</option>
                                </select>
                             </div>
                             <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Short Bio / Pitch</label>
                                <textarea value={formData.shortPitch} onChange={e => updateForm("shortPitch", e.target.value.slice(0, 150))} 
                                          className="w-full bg-gray-50 border-2 border-gray-100 focus:border-sewakhoj-red focus:bg-white rounded-xl py-3.5 px-4 font-bold text-base outline-none transition-all resize-none" rows={2} placeholder="I am highly experienced in..."></textarea>
                                <p className="text-right text-xs font-bold text-gray-400">{formData.shortPitch.length}/150</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {currentStep === 6 && (
                 <div className="animate-in slide-in-from-bottom-8 duration-500">
                    <div className="mb-8">
                       <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Review & Finalize</h2>
                       <p className="text-base text-gray-500 font-medium mt-2">Check your details and agree to our terms.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                       <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
                          <div className="flex items-center gap-5 mb-6">
                             <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shadow-inner shrink-0">
                                {avatarPreview ? <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-gray-300" />}
                             </div>
                             <div className="min-w-0">
                                <p className="font-black text-xl text-gray-900 truncate">{formData.fullName}</p>
                                <p className="font-bold text-gray-500 text-sm truncate">{formData.city}, {formData.area === 'other' ? formData.customArea : formData.area}</p>
                                <p className="font-black text-sewakhoj-red mt-1">Rs {formData.hourlyRate}/hr</p>
                             </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                             {formData.skills.map(id => {
                                const s = services.find(x => x.id === id);
                                return <span key={id} className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700">{s?.nameEn}</span>
                             })}
                          </div>
                       </div>

                       <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-4">
                          <div onClick={() => setAgreedToCode(!agreedToCode)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${agreedToCode ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                             <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${agreedToCode ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-300'}`}>
                                {agreedToCode && <Check className="w-4 h-4" />}
                             </div>
                             <div>
                                <p className="font-bold text-sm text-gray-900">I agree to the Code of Conduct</p>
                                <p className="text-xs font-medium text-gray-500 mt-1">I promise to be punctual and professional.</p>
                             </div>
                          </div>

                          <div onClick={() => updateForm("agreedToPrivacy", !formData.agreedToPrivacy)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${formData.agreedToPrivacy ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                             <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${formData.agreedToPrivacy ? 'bg-green-500 text-white' : 'bg-white border-2 border-gray-300'}`}>
                                {formData.agreedToPrivacy && <Check className="w-4 h-4" />}
                             </div>
                             <div>
                                <p className="font-bold text-sm text-gray-900">Privacy Policy & Terms</p>
                                <p className="text-xs font-medium text-gray-500 mt-1">I accept the terms of service.</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

           </div>
         </div>

         <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-5 md:px-12 md:py-6 flex justify-between items-center z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <button 
               type="button"
               onClick={(e) => { e.preventDefault(); prevStep(); }} 
               disabled={currentStep === 1 || loading} 
               className="font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest text-xs flex items-center gap-2 transition-colors disabled:opacity-0"
             >
                <X className="w-4 h-4 rotate-45" /> Back
             </button>
            
            <div className="flex items-center gap-6">
               {error && <p className="hidden md:block text-xs font-black text-red-500 uppercase">{error}</p>}
               <button 
                 onClick={currentStep === 6 ? handleSubmit : nextStep}
                 disabled={loading || (currentStep === 6 && (!agreedToCode || !formData.agreedToPrivacy))}
                 title={currentStep === 6 && (!agreedToCode || !formData.agreedToPrivacy) ? "Please agree to the terms to continue" : ""}
                 className={`flex items-center gap-3 px-8 py-4 md:px-10 md:py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:cursor-not-allowed ${
                   (currentStep === 6 && (!agreedToCode || !formData.agreedToPrivacy)) || loading
                     ? "bg-gray-300 text-gray-400 shadow-none" 
                     : "bg-gray-900 hover:bg-sewakhoj-red text-white"
                 }`}
               >
                 {loading ? "Processing..." : (currentStep === 6 ? "Finish & Submit" : "Next Step")} 
                 <ChevronRight className="w-5 h-5" />
               </button>
            </div>
         </div>

      </div>
    </div>
  );
}

