"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocation, NEPAL_CITIES } from "@/context/LocationContext";
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
  AlertCircle,
  Globe,
  DollarSign,
  Award,
  CreditCard,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { services } from "@/data/services";
import imageCompression from "browser-image-compression";
import WeeklyScheduleEditor, { WeeklySchedule } from "@/components/tasker/WeeklyScheduleEditor";

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

// Lightweight canvas image compression
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file); // Return unchanged if not an image (e.g. a PDF)
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.82); // High efficiency JPEG compression
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function TaskerOnboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const { selectedCity, selectedLocation, cities: contextCities } = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dbCities, setDbCities] = useState<{name: string, name_np: string}[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [compressing, setCompressing] = useState<Record<string, boolean>>({});
  
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
    paymentMethods: ["cash", "esewa"] as string[],
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
    weeklySchedule: {
      "0": { enabled: false, start: "09:00", end: "18:00" },
      "1": { enabled: true, start: "09:00", end: "18:00" },
      "2": { enabled: true, start: "09:00", end: "18:00" },
      "3": { enabled: true, start: "09:00", end: "18:00" },
      "4": { enabled: true, start: "09:00", end: "18:00" },
      "5": { enabled: true, start: "09:00", end: "18:00" },
      "6": { enabled: false, start: "09:00", end: "18:00" },
    } as WeeklySchedule,
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
  const [stepsCompleted, setStepsCompleted] = useState<number[]>([1]);

  // --- Profile Photo Crop Editor States ---
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropFlipH, setCropFlipH] = useState(false);
  const [isCroppingActive, setIsCroppingActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const [cropSuccess, setCropSuccess] = useState(false);
  const [cropError, setCropError] = useState("");
  const [originalImageInfo, setOriginalImageInfo] = useState<{ name: string; size: number } | null>(null);
  const [isCompressingOriginal, setIsCompressingOriginal] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgDimensions({ width: naturalWidth, height: naturalHeight });
    // Reset position/zoom parameter on image load
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCropRotation(0);
    setCropFlipH(false);
    setCropSuccess(false);
    setCropError("");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - cropPosition.x, y: clientY - cropPosition.y });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setCropPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setCropZoom(prev => Math.max(0.5, Math.min(6, prev * zoomFactor)));
  };

  const handleCropSave = async () => {
    if (!cropImageSrc || !authUser?.id) return;
    
    setIsSavingCrop(true);
    setCropError("");
    
    try {
      // 1. Load image onto HTMLImageElement
      const img = new Image();
      img.src = cropImageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      // 2. Setup output canvas to exactly 300x300px
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not construct 2D context.");
      
      // 3. Clear with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 300);
      
      // 4. Calculate drawn width and height of the image fitting the 280x280 box
      const ratio = img.naturalWidth / img.naturalHeight;
      let drawWidth = 280;
      let drawHeight = 280;
      if (ratio > 1) {
        drawHeight = 280 / ratio;
      } else {
        drawWidth = 280 * ratio;
      }
      
      // 5. Apply transformations relative to 300x300 canvas center
      // Center context
      ctx.translate(150, 150);
      // Scale from 210px circle guideline (75% of 280px) to 300px target size
      const scaleMultiplier = 300 / 210;
      ctx.scale(scaleMultiplier, scaleMultiplier);
      
      // Apply user translations
      ctx.translate(cropPosition.x, cropPosition.y);
      // Apply user zoom
      ctx.scale(cropZoom, cropZoom);
      // Apply rotation
      ctx.rotate(cropRotation * Math.PI / 180);
      // Apply horizontal flip
      if (cropFlipH) {
        ctx.scale(-1, 1);
      }
      
      // Draw image centered
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      
      // 6. Convert to standard JPEG blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
      });
      if (!blob) throw new Error("Canvas output failed.");
      
      // 7. Save cropped blob to Supabase Storage bucket 'avatars' at path: userId/profile.jpg
      const fileName = `${authUser.id}/profile.jpg`;
      const { data, error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      let finalPublicUrl = "";
      if (uploadErr) {
        // Defensive fallback: Use 'task_photos' bucket
        console.warn("Avatar bucket upload error, trying task_photos:", uploadErr);
        const fallbackPath = `avatar_${authUser.id}_profile.jpg`;
        const { error: fbErr } = await supabase.storage
          .from('task_photos')
          .upload(fallbackPath, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });
        if (fbErr) throw new Error(`Upload failed: ${fbErr.message}`);
        
        const { data: fbUrlData } = supabase.storage
          .from('task_photos')
          .getPublicUrl(fallbackPath);
        finalPublicUrl = fbUrlData.publicUrl;
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        finalPublicUrl = publicUrlData.publicUrl;
      }
      
      // 8. Update users table with public URL
      const { error: userUpdateErr } = await supabase
        .from('users')
        .update({ avatar_url: finalPublicUrl })
        .eq('id', authUser.id);
      if (userUpdateErr) throw userUpdateErr;
      
      setAvatarPreview(finalPublicUrl);
      setCropSuccess(true);
      setIsCroppingActive(false);
    } catch (err: any) {
      console.error(err);
      setCropError(err.message || "An error occurred during cropping/upload.");
    } finally {
      setIsSavingCrop(false);
    }
  };

  // Fetch cities and settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: citiesData } = await supabase
          .from("cities")
          .select("name, name_np")
          .eq("is_active", true)
          .order("name");
        
        if (citiesData && citiesData.length > 0) {
          setDbCities(citiesData);
        } else {
          setDbCities(NEPAL_CITIES.map(c => ({ name: c.name, name_np: "" })));
        }
      } catch (err) {
        console.warn("Failed to fetch cities from DB, using fallback:", err);
        setDbCities(NEPAL_CITIES.map(c => ({ name: c.name, name_np: "" })));
      }

      try {
        const { data: settingsData } = await supabase
          .from("platform_settings")
          .select("commission_rate_percentage")
          .single();
        if (settingsData) setCommissionRate(Number(settingsData.commission_rate_percentage));
      } catch (err) {
        console.warn("Failed to fetch commission rate:", err);
      }
    };
    fetchData();
  }, []);

  // Redirect to login if not authenticated or dashboard if already a tasker
  useEffect(() => {
    const checkStatus = async () => {
      if (!authLoading) {
        if (!authUser) {
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

  // Load progress from DB
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

  // Save progress to DB (debounced)
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
    }, 800);
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

        const initialCity = profile?.city || selectedCity || "";
        const initialArea = profile?.area || selectedLocation || "";

        if (profile) {
          setFormData(prev => ({
            ...prev,
            fullName: prev.fullName || profile.full_name || "",
            phone: prev.phone || profile.phone || "",
            email: prev.email || profile.email || "",
            dob: prev.dob || profile.dob || "",
            gender: prev.gender || profile.gender || "",
            city: prev.city || initialCity.toLowerCase() || "",
            area: prev.area || initialArea || "",
            address: prev.address || profile.address || "",
            isNameEditable: !profile.full_name,
            isPhoneEditable: !profile.phone,
          }));
          
          if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
        } else {
          setFormData(prev => ({
            ...prev,
            email: authUser.email || prev.email,
            fullName: authUser.user_metadata?.full_name || "",
            phone: authUser.phone || authUser.user_metadata?.phone || "",
            city: prev.city || initialCity.toLowerCase() || "",
            area: prev.area || initialArea || "",
          }));
        }
      }
    };
    loadProfile();
  }, [authUser, selectedCity, selectedLocation]);

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
        skillLevels[skillId] = 'Intermediate';
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

  const toggleLanguage = (lang: string) => {
    setFormData((prev) => {
      const active = prev.languages.includes(lang);
      const languages = active
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang];
      return { ...prev, languages };
    });
  };

  const togglePaymentMethod = (method: string) => {
    setFormData((prev) => {
      const active = prev.paymentMethods.includes(method);
      const paymentMethods = active
        ? prev.paymentMethods.filter(m => m !== method)
        : [...prev.paymentMethods, method];
      return { ...prev, paymentMethods };
    });
  };

  const getAreasForSelectedCity = () => {
    if (!formData.city) return [];
    const matchedCity = contextCities?.find(
      c => c.name.toLowerCase() === formData.city.toLowerCase()
    );
    if (matchedCity && matchedCity.locations && matchedCity.locations.length > 0) {
      return matchedCity.locations;
    }
    return AREAS_BY_CITY[formData.city.toLowerCase()] || [];
  };

  const calculateProfileStrength = () => {
    let strength = 10;
    if (avatarFile || avatarPreview) strength += 15;
    if (formData.skills.length > 0) strength += 15;
    if (formData.skills.length >= 3) strength += 10;
    if (formData.hasTools) strength += 10;
    if (formData.languages.length > 1) strength += 5;
    if (formData.experience || formData.shortPitch) strength += 15;
    if (docFiles.citizenship) strength += 15;
    if (Object.values(formData.weeklySchedule).some((v: any) => v.enabled)) strength += 15;
    return Math.min(strength, 100);
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
        
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;

      case 2:
        if (formData.skills.length === 0) {
          setError("Please select at least one skill");
          return false;
        }
        return true;
      case 3:
        // Check that at least one day has schedule enabled
        const hasSchedule = Object.values(formData.weeklySchedule).some((day: any) => day.enabled);
        if (!hasSchedule) {
          setError("Please enable at least one day in your weekly schedule");
          return false;
        }
        return true;
      case 4:
        if (!docFiles.citizenship) {
          setError("Citizenship / National ID document is required for verification");
          return false;
        }
        return true;
      case 5:
        if (!formData.hourlyRate || parseInt(formData.hourlyRate) <= 0) {
          setError("Please enter a valid hourly rate greater than 0");
          return false;
        }
        if (formData.paymentMethods.length === 0) {
          setError("Please select at least one accepted payment method");
          return false;
        }
        return true;
      case 6:
        if (!agreedToCode) {
          setError("You must agree to the Code of Conduct to finalize onboarding");
          return false;
        }
        if (!formData.agreedToPrivacy) {
          setError("You must agree to the Privacy Policy & Terms");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setStepsCompleted(prev => {
        const next = [...prev];
        if (!next.includes(currentStep)) next.push(currentStep);
        if (!next.includes(currentStep + 1)) next.push(currentStep + 1);
        return next;
      });
      setCurrentStep((prev) => Math.min(prev + 1, 6));
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

        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
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

          xhr.addEventListener('error', () => reject(new Error("Network error during upload.")));
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
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
        }
      }
    }
    
    throw lastError || new Error("Upload failed");
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    setError("");
    setUploadErrors({});

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failed. Please login.");

      let avatarUrl = avatarPreview;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
        try {
          avatarUrl = await uploadFileWithProgress('task_photos', fileName, avatarFile, 'avatar');
        } catch (err: any) {
          throw new Error(`Avatar upload failed: ${err.message}`);
        }
      }

      const docUrls: Record<string, string> = {};
      for (const [key, file] of Object.entries(docFiles)) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${key}_${Date.now()}.${fileExt}`;
          try {
            docUrls[key] = await uploadFileWithProgress('documents', fileName, file, key);
          } catch (err: any) {
            throw new Error(`Document upload failed (${key}): ${err.message}`);
          }
        }
      }

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

      const { data: upsertedTasker, error: taskerError } = await supabase
        .from("taskers")
        .upsert({
          user_id: user.id,
          hourly_rate: parseInt(formData.hourlyRate) || 500,
          city: formData.city.toLowerCase(),
          area: formData.area === 'other' ? formData.customArea : formData.area,
          skills: formData.skills,
          bio: formData.shortPitch || "Professional service provider in Nepal.",
          experience: Object.entries(formData.skillLevels)
            .map(([id, level]) => {
              const s = services.find(x => x.id === id);
              return `${s?.nameEn}: ${level}`;
            }).join("; "),
          working_days: Object.entries(formData.availability)
            .filter(([_, slots]) => slots.length > 0)
            .map(([day]) => parseInt(day)),
          working_hours: formData.availability,
          transportation_mode: formData.transportMode,
          payment_methods: formData.paymentMethods,
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

      if (upsertedTasker && formData.skills.length > 0) {
        const taskerId = upsertedTasker.id;
        await supabase.from("tasker_skills").delete().eq("tasker_id", taskerId);

        const skillRows = formData.skills.map((skillId: string) => ({
          tasker_id: taskerId,
          service_id: skillId,
          skill_level: formData.skillLevels[skillId] || 'Intermediate',
          hourly_rate: parseInt(formData.hourlyRate) || 500
        }));

        await supabase.from("tasker_skills").insert(skillRows);

        // Save weekly schedule
        await fetch("/api/tasker/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schedule: formData.weeklySchedule }),
        });
      }

      await supabase.auth.updateUser({ data: { role: 'tasker' } });
      
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
      setError(err.message || "Failed to finalize registration.");
    } finally {
      setLoading(false);
    }
  };

  const maxDate18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const progressPercent = Math.max(10, Math.round(((currentStep - 1) / 5) * 100));

  return (
    <div className="flex h-screen w-full bg-[#0f0f1a] text-[#f1f1f6] font-sans overflow-hidden select-none">
      
      {/* Dynamic Scrollbar Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f0f1a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27274a;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #C8102E;
        }
      `}} />

      {/* LEFT SIDEBAR: 220px fixed */}
      <div className="w-[220px] bg-[#141426] border-r border-[#22223b] flex flex-col justify-between p-6 shrink-0 relative z-20">
        
        {/* Glow Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[120px] h-[120px] bg-[#C8102E]/10 blur-[40px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[100px] h-[100px] bg-blue-600/10 blur-[40px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col flex-1">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#C8102E] to-red-600 flex items-center justify-center font-black text-white text-sm shadow-[0_0_15px_rgba(200,16,46,0.3)]">S</div>
              <span className="font-black text-sm uppercase tracking-wider text-white">SewaKhoj</span>
            </Link>
          </div>

          {/* Navigation Steps */}
          <div className="space-y-4 flex-1 mt-2">
            {steps.map((step) => {
              const active = currentStep === step.id;
              const done = stepsCompleted.includes(step.id) && currentStep > step.id;
              
              return (
                <button 
                  key={step.id} 
                  type="button" 
                  disabled={loading}
                  onClick={() => {
                    if (stepsCompleted.includes(step.id) || step.id < currentStep) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`w-full flex items-start gap-3 text-left transition-all duration-300 group outline-none ${
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
                    {done ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="pt-0.5">
                    <p className={`font-black text-[10px] uppercase tracking-widest leading-none ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {step.label}
                    </p>
                    <p className="text-[9px] font-bold text-gray-500 mt-0.5 font-devanagari">
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
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Progress</span>
            <span className="text-[10px] font-black text-white">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#1e1e38] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#C8102E] to-red-500 transition-all duration-700 ease-out" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT PANEL: flex-1 */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0a14] relative z-10 overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="h-16 border-b border-[#22223b] px-8 flex items-center justify-between bg-[#111124]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-[#C8102E]/10 border border-[#C8102E]/20 text-[#C8102E] rounded-md text-[10px] font-black uppercase tracking-wider">
              Step {currentStep} / 6
            </div>
            <h2 className="font-black text-sm uppercase tracking-widest text-white">
              {steps[currentStep - 1].label} Onboarding
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profile strength</span>
            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
              calculateProfileStrength() >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {calculateProfileStrength()}%
            </span>
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
                
                {/* Avatar Uploader & Dicebear Preview with Crop / Success Previews */}
                <div className="flex items-center gap-6 pb-6 border-b border-[#22223b]">
                  <div className="relative group">
                    <div 
                      onClick={() => fileInput.current?.click()} 
                      className={`w-24 h-24 rounded-[1.5rem] border-2 bg-[#1b1b36] flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:border-[#C8102E]/50 ${
                        fieldErrors.avatar ? 'border-red-500' : 'border-[#22223b]'
                      }`}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover animate-in zoom-in duration-300" />
                      ) : formData.gender === 'female' ? (
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&gender=female" alt="Female" className="w-full h-full object-cover opacity-60" />
                      ) : formData.gender === 'male' ? (
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&gender=male" alt="Male" className="w-full h-full object-cover opacity-60" />
                      ) : (
                        <User className="w-10 h-10 text-slate-500" />
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                        <Camera className="w-5 h-5 mb-1" />
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          {avatarPreview ? "Change" : "Upload"}
                        </span>
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-[#C8102E] text-white rounded-lg flex items-center justify-center shadow-lg pointer-events-none">
                      {cropSuccess ? <Check className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-white uppercase">Profile Photo</h4>
                      {cropSuccess && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-black uppercase tracking-wider animate-bounce">
                          ✓ Verified Crop
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-sm">
                      {cropSuccess 
                        ? "Your professional profile photo has been successfully panned, circular-cropped, compressed, and synchronized!"
                        : "Upload a high-quality passport photo. Drag-to-crop guidance tool will automatically appear."}
                    </p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInput} 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      setOriginalImageInfo({ name: file.name, size: file.size });
                      setCropError("");
                      setCropSuccess(false);
                      
                      const processImageSelection = async (selectedFile: File) => {
                        let fileToCrop = selectedFile;
                        
                        if (selectedFile.size > 2 * 1024 * 1024) {
                          setIsCompressingOriginal(true);
                          try {
                            const options = {
                              maxSizeMB: 1.5,
                              maxWidthOrHeight: 1920,
                              useWebWorker: true
                            };
                            fileToCrop = await imageCompression(selectedFile, options);
                          } catch (cErr) {
                            console.error("Compression error:", cErr);
                          } finally {
                            setIsCompressingOriginal(false);
                          }
                        }
                        
                        setCropImageSrc(URL.createObjectURL(fileToCrop));
                        setIsCroppingActive(true);
                      };
                      
                      processImageSelection(file);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name (पूरा नाम)</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        value={formData.fullName} 
                        onChange={e => updateForm("fullName", e.target.value)} 
                        className={`w-full bg-[#181832] border-2 rounded-xl py-3 pl-11 pr-4 font-bold text-sm text-white outline-none transition-all ${
                          fieldErrors.fullName ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'
                        }`} 
                        placeholder="Ram Bahadur" 
                      />
                    </div>
                    {fieldErrors.fullName && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.fullName}</p>}
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nepal Mobile Number (मोवाइल नम्बर)</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="tel" 
                        value={formData.phone} 
                        onChange={e => updateForm("phone", e.target.value.replace(/\D/g, '').slice(0, 10))} 
                        disabled={!formData.isPhoneEditable}
                        className={`w-full bg-[#181832] border-2 rounded-xl py-3 pl-11 pr-4 font-bold text-sm text-white outline-none transition-all ${
                          fieldErrors.phone ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'
                        } ${!formData.isPhoneEditable ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        placeholder="98XXXXXXXX" 
                      />
                    </div>
                    {fieldErrors.phone && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.phone}</p>}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Date of Birth (जन्म मिति)</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input 
                        type="date" 
                        value={formData.dob} 
                        max={maxDate18YearsAgo} 
                        onChange={e => updateForm("dob", e.target.value)}
                        className={`w-full bg-[#181832] border-2 rounded-xl py-3 pl-11 pr-4 font-bold text-sm text-white outline-none transition-all ${
                          fieldErrors.dob ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'
                        }`} 
                      />
                    </div>
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
                          className={`flex-1 py-3 rounded-xl border-2 font-black text-xs uppercase transition-all ${
                            formData.gender === g 
                              ? 'border-[#C8102E] bg-[#C8102E]/10 text-white' 
                              : 'border-[#22223b] bg-[#181832] text-slate-400 hover:border-[#27274e]'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.gender && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.gender}</p>}
                  </div>

                  {/* City Dropdown */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Working City Coverage (शहर)</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <select 
                        value={formData.city} 
                        onChange={e => { updateForm("city", e.target.value); updateForm("area", ""); }}
                        className={`w-full bg-[#181832] border-2 rounded-xl py-3 pl-11 pr-10 font-bold text-sm text-white outline-none transition-all appearance-none cursor-pointer ${
                          fieldErrors.city ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'
                        }`}
                      >
                        <option value="">Select City</option>
                        {dbCities.map(c => (
                          <option key={c.name} value={c.name.toLowerCase()}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {fieldErrors.city && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.city}</p>}
                  </div>

                  {/* Area */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Area / Locality (टोल / ठाउँ)</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <select 
                        value={formData.area} 
                        disabled={!formData.city} 
                        onChange={e => updateForm("area", e.target.value)}
                        className="w-full bg-[#181832] border-2 border-[#22223b] focus:border-[#C8102E] disabled:opacity-40 rounded-xl py-3 pl-11 pr-10 font-bold text-sm text-white outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select Area</option>
                        {getAreasForSelectedCity().map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                        <option value="other">Other / Custom</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Custom Area Name if 'other' is selected */}
                  {formData.area === 'other' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Custom Area Name *</label>
                      <input 
                        type="text" 
                        value={formData.customArea} 
                        onChange={e => updateForm("customArea", e.target.value)} 
                        className={`w-full bg-[#181832] border-2 rounded-xl py-3 px-4 font-bold text-sm text-white outline-none transition-all ${
                          fieldErrors.customArea ? 'border-red-500' : 'border-[#22223b] focus:border-[#C8102E]'
                        }`} 
                        placeholder="Ex: Sanepa-2" 
                      />
                      {fieldErrors.customArea && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.customArea}</p>}
                    </div>
                  )}

                  {/* Address */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Detailed Street Address (टोल, घर नं.)</label>
                    <input 
                      type="text" 
                      value={formData.address} 
                      onChange={e => updateForm("address", e.target.value)} 
                      className="w-full bg-[#181832] border-2 border-[#22223b] focus:border-[#C8102E] rounded-xl py-3 px-4 font-bold text-sm text-white outline-none transition-all" 
                      placeholder="Ex: Ward 4, Ekantakuna Road, house 4B" 
                    />
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SERVICES & SKILLS */}
          {currentStep === 2 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Expertise & Skills (सीप र दक्षता)</h3>
                <p className="text-xs text-slate-400 mt-1">Select the tasks you can confidently perform and define your expertise tier.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[350px]">
                
                {/* Search & Service Card Picker */}
                <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-5 flex flex-col h-[380px]">
                  <div className="relative mb-3 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search services..." 
                      className="w-full bg-[#181832] border-2 border-[#22223b] focus:border-[#C8102E] rounded-xl py-2.5 pl-10 pr-4 font-bold text-xs text-white outline-none transition-all" 
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase();
                        document.querySelectorAll('.skill-card').forEach((item: any) => {
                          if (item.getAttribute('data-skill-name')?.toLowerCase().includes(val)) item.classList.remove('hidden');
                          else item.classList.add('hidden');
                        });
                      }} 
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-2">
                    {services.map(s => {
                      const active = formData.skills.includes(s.id);
                      return (
                        <button 
                          key={s.id} 
                          type="button" 
                          data-skill-name={`${s.nameEn} ${s.nameNp}`} 
                          onClick={() => toggleSkill(s.id)}
                          className={`skill-card flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                            active 
                              ? 'bg-[#C8102E]/10 border-[#C8102E] shadow-lg shadow-red-950/20' 
                              : 'bg-[#181832]/60 border-transparent hover:border-[#22223b] hover:bg-[#181832]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl bg-[#1d1d3a] w-8 h-8 rounded-lg flex items-center justify-center shrink-0">{s.emoji}</span>
                            <div>
                              <p className="font-black text-xs text-white leading-tight">{s.nameEn}</p>
                              <p className="font-medium text-[10px] text-gray-500">{s.nameNp}</p>
                            </div>
                          </div>
                          {active ? <CheckCircle2 className="w-5 h-5 text-[#C8102E] shrink-0" /> : <Plus className="w-4 h-4 text-gray-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Level Selectors for Chosen Services */}
                <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-5 flex flex-col h-[380px]">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3 shrink-0">Selected Categories</h4>
                  
                  {formData.skills.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                      <Briefcase className="w-10 h-10 text-slate-500 mb-2" />
                      <p className="font-black text-xs text-slate-400">No services selected.</p>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-[200px]">Select category chips from the left panel.</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                      {formData.skills.map(id => {
                        const s = services.find(x => x.id === id);
                        const level = formData.skillLevels[id] || 'Intermediate';
                        return (
                          <div key={id} className="bg-[#181832]/50 border border-[#22223b] p-3 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{s?.emoji}</span>
                                <p className="font-black text-xs text-white">{s?.nameEn}</p>
                              </div>
                              <button onClick={() => toggleSkill(id)} className="text-slate-500 hover:text-red-500 p-1"><X className="w-3 h-3" /></button>
                            </div>
                            <div className="flex bg-[#0f0f1c] p-1 rounded-lg">
                              {['Beginner', 'Intermediate', 'Expert'].map(l => (
                                <button 
                                  key={l} 
                                  onClick={() => updateSkillLevel(id, l)} 
                                  className={`flex-1 py-1 rounded text-[10px] font-black uppercase transition-all ${
                                    level === l 
                                      ? 'bg-[#C8102E] text-white shadow-sm' 
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tool Ownership Toggle */}
                  <div className="mt-3 pt-3 border-t border-[#22223b] shrink-0">
                    <div className="flex items-center justify-between bg-[#191932]/40 p-3 rounded-xl border border-[#22223b]">
                      <div>
                        <span className="font-black text-[11px] text-white uppercase tracking-wider block">Own Professional Tools</span>
                        <span className="text-[9px] text-slate-500 font-bold block">I own the required tools for selected jobs</span>
                      </div>
                      <button 
                        onClick={() => updateForm("hasTools", !formData.hasTools)} 
                        className={`w-10 h-5 rounded-full relative transition-colors ${
                          formData.hasTools ? 'bg-[#C8102E]' : 'bg-[#27274a]'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                          formData.hasTools ? 'left-5' : 'left-1'
                        }`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tag selectors for Languages & Pitch */}
              <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Languages Tag Selector */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 block ml-1">Languages (बोलिने भाषाहरू)</label>
                  <div className="flex flex-wrap gap-2">
                    {["Nepali", "English", "Maithili", "Bhojpuri", "Newari", "Tamang"].map((lang) => {
                      const active = formData.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-black transition-all ${
                            active 
                              ? 'bg-[#C8102E]/20 border-[#C8102E] text-white' 
                              : 'bg-[#181832] border-[#22223b] text-slate-400 hover:border-[#2c2c4d]'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Short Pitch Textarea */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block ml-1">100-Char Short Pitch (छोटो परिचय)</label>
                  <textarea 
                    value={formData.shortPitch} 
                    onChange={e => updateForm("shortPitch", e.target.value.slice(0, 100))} 
                    className="w-full bg-[#181832] border-2 border-[#22223b] focus:border-[#C8102E] rounded-xl py-3 px-4 font-bold text-xs text-white outline-none transition-all resize-none" 
                    rows={2} 
                    placeholder="Describe your service quality, experience, or dedication..."
                  ></textarea>
                  <p className="text-right text-[10px] font-bold text-gray-500">{formData.shortPitch.length}/100</p>
                </div>
              </div>
              
              {error && currentStep === 2 && (
                <div className="p-3 bg-red-950/20 border border-red-900 rounded-xl text-red-400 font-bold text-xs text-center">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: WEEKLY SCHEDULE EDITOR */}
          {currentStep === 3 && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Availability Planner (कार्यतालिका)</h3>
                <p className="text-xs text-slate-400 mt-1">Set your weekly working days and hours. Your online status will auto-toggle based on this schedule.</p>
              </div>

              <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 overflow-hidden">
                <WeeklyScheduleEditor
                  initialSchedule={formData.weeklySchedule}
                  onScheduleChange={(s) => setFormData(prev => ({ ...prev, weeklySchedule: s }))}
                />
              </div>
              
              {error && currentStep === 3 && (
                <div className="p-3 bg-red-950/20 border border-red-900 rounded-xl text-red-400 font-bold text-xs text-center">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: KYC VERIFICATION & COMPRESSION */}
          {currentStep === 4 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">KYC Verification (प्रमाणीकरण)</h3>
                <p className="text-xs text-slate-400 mt-1">Upload verified identification documents. Images will be automatically compressed before uploading.</p>
              </div>

              <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 space-y-6">
                {[
                  { id: 'citizenship', label: 'Citizenship / National ID Card *', icon: '🪪', ref: fileInputCitizenship, required: true },
                  { id: 'license', label: 'Driving License (optional)', icon: '🚗', ref: fileInputLicense, required: false }
                ].map(doc => {
                  const file = docFiles[doc.id];
                  const progress = uploadProgress[doc.id];
                  const uploadErr = uploadErrors[doc.id];
                  const isUploading = progress !== undefined && progress > 0 && progress < 100;
                  const isCompressing = compressing[doc.id];
                  
                  return (
                    <div 
                      key={doc.id} 
                      className={`p-5 rounded-2xl flex flex-col gap-3 transition-colors ${
                        uploadErr 
                          ? 'bg-red-950/10 border-2 border-red-900/50' 
                          : 'bg-[#181832]/60 border-2 border-[#22223b] hover:border-[#27274e]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#1b1b36] rounded-xl flex items-center justify-center text-2xl border border-[#22223b] shrink-0">{doc.icon}</div>
                          <div>
                            <h4 className="font-black text-sm text-white leading-tight">{doc.label}</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">JPG, PNG, WebP up to 5MB (Real-time compression enabled)</p>
                          </div>
                        </div>
                        
                        {file ? (
                          <div className="flex items-center gap-3 bg-[#111124] p-2.5 rounded-lg border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-black text-xs text-white truncate block max-w-[130px]">{file.name}</span>
                              <span className="text-[9px] text-gray-500 font-bold">{(file.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button 
                              onClick={() => { 
                                setDocFiles(prev => ({...prev, [doc.id]: null})); 
                                setUploadProgress(prev => ({...prev, [doc.id]: 0})); 
                                setUploadErrors(prev => ({...prev, [doc.id]: ""})); 
                              }} 
                              className="text-red-400 hover:bg-red-500/10 p-1 rounded-md transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => doc.ref.current?.click()} 
                            disabled={isCompressing}
                            className="bg-[#1b1b36] border border-[#2c2c4d] hover:border-[#C8102E] text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                          >
                            {isCompressing ? "Compressing..." : "Choose File"}
                          </button>
                        )}
                      </div>
                      
                      {isUploading && (
                        <div className="w-full bg-[#1e1e35] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#C8102E] h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                      )}
                      
                      {progress === 100 && !uploadErr && (
                        <p className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded to Supabase Storage
                        </p>
                      )}
                      
                      {uploadErr && (
                        <p className="text-[9px] font-bold text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {uploadErr}
                        </p>
                      )}
                      
                      <input
                        type="file"
                        ref={doc.ref}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={async (e) => {
                          const selectedFile = e.target.files?.[0];
                          if (!selectedFile) return;
                          
                          const err = validateFile(selectedFile, doc.id);
                          if (err) {
                            setUploadErrors(prev => ({ ...prev, [doc.id]: err }));
                            return;
                          }
                          
                          setUploadErrors(prev => ({ ...prev, [doc.id]: "" }));
                          setCompressing(prev => ({ ...prev, [doc.id]: true }));
                          
                          try {
                            const compressed = await compressImage(selectedFile);
                            setDocFiles(prev => ({ ...prev, [doc.id]: compressed }));
                          } catch (cErr) {
                            setDocFiles(prev => ({ ...prev, [doc.id]: selectedFile }));
                          } finally {
                            setCompressing(prev => ({ ...prev, [doc.id]: false }));
                          }
                        }}
                      />
                    </div>
                  );
                })}

                {/* Expiry Calendar */}
                <div className="pt-4 border-t border-[#22223b] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block ml-1">Document Expiry Date</label>
                    <input 
                      type="date"
                      value={formData.docsExpiryDate}
                      onChange={(e) => setFormData({...formData, docsExpiryDate: e.target.value})}
                      className="w-full bg-[#181832] border-2 border-[#22223b] focus:border-[#C8102E] rounded-xl px-4 py-3 font-bold text-sm text-white transition-all outline-none"
                    />
                    <p className="text-[9px] text-amber-500 font-bold ml-1">Leave empty if document does not expire.</p>
                  </div>
                </div>
              </div>
              
              {error && currentStep === 4 && (
                <div className="p-3 bg-red-950/20 border border-red-900 rounded-xl text-red-400 font-bold text-xs text-center">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: PRICING & PAYMENT */}
          {currentStep === 5 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Earnings & Pricing (दर र भुक्तानी)</h3>
                <p className="text-xs text-slate-400 mt-1">Set your base hourly price and define accepted payout methods.</p>
              </div>

              <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 space-y-6">
                
                {/* Commission Explainer Banner */}
                <div className="bg-gradient-to-r from-blue-950/60 to-slate-900/60 border border-blue-900/40 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Transparent Commission Model</span>
                    <h4 className="font-black text-sm text-white">Keep {100 - commissionRate}% of your earnings</h4>
                    <p className="text-[10px] text-slate-400 max-w-md">
                      A small {commissionRate}% service fee is deducted to cover insurance, operations, and support channels.
                    </p>
                  </div>
                  <DollarSign className="w-10 h-10 text-emerald-500 opacity-20 hidden sm:block shrink-0" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hourly Rate */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block ml-1">Your Base Hourly Rate (Rs / hour)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-slate-500">Rs</span>
                      <input 
                        type="number" 
                        value={formData.hourlyRate} 
                        onChange={e => updateForm("hourlyRate", e.target.value)}
                        className="w-full bg-[#181832] border-2 border-[#22223b] focus:border-[#C8102E] rounded-xl py-3 pl-11 pr-4 font-black text-xl text-white outline-none transition-all" 
                        placeholder="500" 
                      />
                    </div>
                    {/* Dynamic Calculation */}
                    <div className="p-3 bg-[#111124] rounded-lg border border-[#22223b] space-y-1.5 mt-2">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>Base Rate:</span>
                        <span>Rs {formData.hourlyRate || 0} / hr</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>Platform Fee ({commissionRate}%):</span>
                        <span>- Rs {Math.round((parseInt(formData.hourlyRate) || 0) * (commissionRate / 100))} / hr</span>
                      </div>
                      <div className="h-px bg-[#22223b] my-1" />
                      <div className="flex justify-between text-xs font-black text-emerald-400">
                        <span>Your Take-Home Payout:</span>
                        <span>Rs {Math.round((parseInt(formData.hourlyRate) || 0) * ((100 - commissionRate) / 100))} / hr</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Transport Mode */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 block ml-1">Mode of Transport</label>
                      <div className="relative">
                        <select 
                          value={formData.transportMode} 
                          onChange={e => updateForm("transportMode", e.target.value)}
                          className="w-full bg-[#181832] border-2 border-[#22223b] focus:border-[#C8102E] rounded-xl py-3 pl-4 pr-10 font-black text-xs text-white outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="walking">Walking / No Transport</option>
                          <option value="bicycle">Bicycle</option>
                          <option value="motorcycle">Motorcycle / Scooter</option>
                          <option value="car">Car / Van</option>
                          <option value="public_transit">Public Transit</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Payment tag selectors */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 block ml-1">Accepted Payment Methods</label>
                      <div className="flex flex-wrap gap-2">
                        {["cash", "esewa", "khalti", "bank_transfer"].map(method => {
                          const active = formData.paymentMethods.includes(method);
                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => togglePaymentMethod(method)}
                              className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${
                                active 
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md' 
                                  : 'bg-[#181832] border-[#22223b] text-slate-400 hover:border-[#2c2c4d]'
                              }`}
                            >
                              {method.replace('_', ' ')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {error && currentStep === 5 && (
                <div className="p-3 bg-red-950/20 border border-red-900 rounded-xl text-red-400 font-bold text-xs text-center">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 6: FINALIZE & SUBMIT */}
          {currentStep === 6 && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Review & Finalize (समीक्षा र पुष्टि)</h3>
                <p className="text-xs text-slate-400 mt-1">Take a look at your details and agree to our code of conduct rules to join SewaKhoj.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual Summary */}
                <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tasker Profile Card</h4>
                  
                  <div className="flex items-center gap-4 p-3 bg-[#111124] rounded-2xl border border-[#22223b]">
                    <div className="w-16 h-16 rounded-xl bg-[#1b1b36] overflow-hidden shrink-0 border border-[#22223b]">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full p-3 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-white truncate">{formData.fullName}</h4>
                      <p className="text-[10px] text-gray-500 capitalize">{formData.city}, {formData.area === 'other' ? formData.customArea : formData.area}</p>
                      <p className="text-xs font-black text-[#C8102E] mt-1">Rs {formData.hourlyRate} / hour</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 block">Skills Selected</span>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.skills.map(id => {
                        const s = services.find(x => x.id === id);
                        return (
                          <span key={id} className="px-2 py-1 bg-[#181832] border border-[#22223b] text-white text-[9px] font-black uppercase rounded">
                            {s?.nameEn}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 block">Transport & Payouts</span>
                    <p className="text-[10px] font-bold text-slate-300 capitalize">
                      🚀 {formData.transportMode.replace('_', ' ')} &middot; 💳 {formData.paymentMethods.join(', ')}
                    </p>
                  </div>
                </div>

                {/* Rules Checkboxes */}
                <div className="bg-[#121226]/50 border border-[#22223b] rounded-[2rem] p-6 flex flex-col gap-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rules & Policies</h4>

                  {/* Code of Conduct */}
                  <div 
                    onClick={() => setAgreedToCode(!agreedToCode)} 
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      agreedToCode ? 'bg-emerald-500/5 border-emerald-500 text-white' : 'bg-[#181832] border-[#22223b]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      agreedToCode ? 'bg-emerald-500 text-white' : 'bg-[#111124] border border-[#2c2c4d]'
                    }`}>
                      {agreedToCode && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h5 className="font-black text-xs text-white uppercase tracking-wider">Rule 1: Code of Conduct</h5>
                      <p className="text-[10px] text-gray-400 font-medium mt-1 leading-relaxed">
                        I promise to arrive on time, respect customer privacy, and complete tasks with professional dedication.
                      </p>
                    </div>
                  </div>

                  {/* Terms */}
                  <div 
                    onClick={() => updateForm("agreedToPrivacy", !formData.agreedToPrivacy)} 
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      formData.agreedToPrivacy ? 'bg-emerald-500/5 border-emerald-500 text-white' : 'bg-[#181832] border-[#22223b]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      formData.agreedToPrivacy ? 'bg-emerald-500 text-white' : 'bg-[#111124] border border-[#2c2c4d]'
                    }`}>
                      {formData.agreedToPrivacy && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h5 className="font-black text-xs text-white uppercase tracking-wider">Rule 2: Terms & Safety</h5>
                      <p className="text-[10px] text-gray-400 font-medium mt-1 leading-relaxed">
                        I accept the commission schedule, background KYC reviews, and platform safety rules.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {error && currentStep === 6 && (
                <div className="p-3 bg-red-950/20 border border-red-900 rounded-xl text-red-400 font-bold text-xs text-center">
                  {error}
                </div>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM ACTION BAR: h-20 fixed */}
        <div className="h-20 border-t border-[#22223b] px-8 flex items-center justify-between bg-[#111124]/40 shrink-0 relative z-30">
          
          {/* Back Button */}
          <button 
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1 || loading}
            className="font-black text-slate-400 hover:text-white uppercase tracking-widest text-[10px] flex items-center gap-1.5 transition-colors disabled:opacity-0 disabled:pointer-events-none"
          >
            &larr; Back
          </button>

          {/* Action Call / Dynamic Errors */}
          <div className="flex items-center gap-5">
            <button
              onClick={currentStep === 6 ? handleSubmit : nextStep}
              disabled={
                loading || 
                (currentStep === 6 && (!agreedToCode || !formData.agreedToPrivacy))
              }
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:cursor-not-allowed ${
                (currentStep === 6 && (!agreedToCode || !formData.agreedToPrivacy)) || loading
                  ? "bg-[#181832] text-slate-600 border border-[#22223b]"
                  : "bg-[#C8102E] hover:bg-red-600 text-white shadow-[0_0_20px_rgba(200,16,46,0.3)]"
              }`}
            >
              {loading ? "Registering..." : currentStep === 6 ? "Finish & Submit" : "Continue"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* --- GORGEOUS DYNAMIC CROP MODAL WORKSPACE --- */}
      {isCroppingActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-[#111124] border border-[#22223b] rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-[#22223b] flex justify-between items-center bg-[#14142b]/60">
              <div>
                <h4 className="font-black text-sm text-white uppercase tracking-wider">Reposition & Crop Profile Photo</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Drag to pan &bull; scroll or use slider to zoom</p>
              </div>
              <button 
                onClick={() => setIsCroppingActive(false)} 
                className="text-slate-400 hover:text-white p-1.5 hover:bg-[#181832] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {isCompressingOriginal ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#C8102E] border-t-transparent animate-spin" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Compressing original image (&gt;2MB)...</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
                  
                  {/* Interactive Crop guidelines box (280x280px) */}
                  <div className="space-y-2 shrink-0">
                    <div 
                      className="relative w-[280px] h-[280px] bg-[#0d0d18] rounded-2xl overflow-hidden border border-[#22223b] cursor-move select-none"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onWheel={handleWheel}
                    >
                      {cropImageSrc && (
                        <div 
                          className="absolute"
                          style={{
                            width: '280px',
                            height: '280px',
                            left: '50%',
                            top: '50%',
                            transform: `translate(-50%, -50%) translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom}) rotate(${cropRotation}deg) scaleX(${cropFlipH ? -1 : 1})`,
                            transformOrigin: 'center center',
                          }}
                        >
                          <img 
                            src={cropImageSrc} 
                            alt="Reposition workspace" 
                            onLoad={handleImgLoad}
                            className="w-full h-full object-contain pointer-events-none" 
                          />
                        </div>
                      )}

                      {/* Circular guideline indicator (75% of 280px container = 210px) */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[210px] h-[210px] rounded-full border-2 border-dashed border-[#C8102E] shadow-[0_0_0_9999px_rgba(10,10,20,0.8)]" />
                      </div>
                    </div>
                    
                    {originalImageInfo && (
                      <div className="flex justify-between text-[9px] font-bold text-gray-500 px-1">
                        <span className="truncate max-w-[150px]">{originalImageInfo.name}</span>
                        <span>Original: {(originalImageInfo.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    )}
                  </div>

                  {/* Action Controls & Preview Column */}
                  <div className="flex-1 w-full space-y-4">
                    
                    {/* Control dials */}
                    <div className="space-y-3">
                      {/* Zoom range controller */}
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-500">Zoom Guidelines</span>
                          <span className="text-[10px] font-black text-white">{Math.round(cropZoom * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="5" 
                          step="0.05" 
                          value={cropZoom}
                          onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                          className="w-full accent-[#C8102E] h-1 bg-[#1b1b36] rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setCropRotation(prev => (prev - 90) % 360)}
                          className="flex-1 py-2 bg-[#181832] hover:bg-[#1b1b3b] border border-[#22223b] hover:border-[#C8102E]/40 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          ↺ Rotate -90°
                        </button>
                        <button 
                          type="button"
                          onClick={() => setCropRotation(prev => (prev + 90) % 360)}
                          className="flex-1 py-2 bg-[#181832] hover:bg-[#1b1b3b] border border-[#22223b] hover:border-[#C8102E]/40 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          ↻ Rotate +90°
                        </button>
                        <button 
                          type="button"
                          onClick={() => setCropFlipH(prev => !prev)}
                          className={`flex-1 py-2 border rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                            cropFlipH 
                              ? 'bg-[#C8102E]/10 border-[#C8102E] text-white' 
                              : 'bg-[#181832] border-[#22223b] text-slate-400 hover:text-white hover:border-[#27274e]'
                          }`}
                        >
                          ↔ Flip Horizontal
                        </button>
                      </div>
                    </div>

                    {/* Live preview in 3 circular sizes (64px, 40px, 28px) */}
                    <div className="p-4 bg-[#14142b]/60 rounded-2xl border border-[#22223b] space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">Hardware-Accelerated Live Previews</span>
                      
                      <div className="flex items-end gap-6 justify-center pt-2">
                        {/* 64px Size */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-[64px] h-[64px] rounded-full overflow-hidden border-2 border-[#22223b] relative bg-[#0d0d18] shrink-0">
                            {cropImageSrc && (
                              <div 
                                className="absolute"
                                style={{
                                  width: '280px',
                                  height: '280px',
                                  left: '50%',
                                  top: '50%',
                                  transform: `translate(-50%, -50%) translate(${cropPosition.x * (64 / 280)}px, ${cropPosition.y * (64 / 280)}px) scale(${cropZoom}) rotate(${cropRotation}deg) scaleX(${cropFlipH ? -1 : 1})`,
                                  transformOrigin: 'center center',
                                }}
                              >
                                <img src={cropImageSrc} className="w-full h-full object-contain pointer-events-none" />
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-black text-gray-500">64px</span>
                        </div>

                        {/* 40px Size */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-[40px] h-[40px] rounded-full overflow-hidden border border-[#22223b] relative bg-[#0d0d18] shrink-0">
                            {cropImageSrc && (
                              <div 
                                className="absolute"
                                style={{
                                  width: '280px',
                                  height: '280px',
                                  left: '50%',
                                  top: '50%',
                                  transform: `translate(-50%, -50%) translate(${cropPosition.x * (40 / 280)}px, ${cropPosition.y * (40 / 280)}px) scale(${cropZoom}) rotate(${cropRotation}deg) scaleX(${cropFlipH ? -1 : 1})`,
                                  transformOrigin: 'center center',
                                }}
                              >
                                <img src={cropImageSrc} className="w-full h-full object-contain pointer-events-none" />
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-black text-gray-500">40px</span>
                        </div>

                        {/* 28px Size */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-[28px] h-[28px] rounded-full overflow-hidden border border-[#22223b] relative bg-[#0d0d18] shrink-0">
                            {cropImageSrc && (
                              <div 
                                className="absolute"
                                style={{
                                  width: '280px',
                                  height: '280px',
                                  left: '50%',
                                  top: '50%',
                                  transform: `translate(-50%, -50%) translate(${cropPosition.x * (28 / 280)}px, ${cropPosition.y * (28 / 280)}px) scale(${cropZoom}) rotate(${cropRotation}deg) scaleX(${cropFlipH ? -1 : 1})`,
                                  transformOrigin: 'center center',
                                }}
                              >
                                <img src={cropImageSrc} className="w-full h-full object-contain pointer-events-none" />
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-black text-gray-500">28px</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#22223b] bg-[#14142b]/40 flex flex-col sm:flex-row gap-3 items-center justify-between">
              {cropError ? (
                <p className="text-[9px] font-black text-red-400 uppercase tracking-wide flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {cropError}
                </p>
              ) : (
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  🔒 Synchronized to avatars secure storage
                </p>
              )}
              <div className="flex gap-2 ml-auto w-full sm:w-auto shrink-0 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsCroppingActive(false)}
                  className="px-5 py-2.5 bg-[#181832] hover:bg-[#1b1b3b] border border-[#22223b] hover:border-slate-500 rounded-xl font-black text-xs uppercase tracking-wider text-slate-400 hover:text-white transition-all w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleCropSave}
                  disabled={isSavingCrop}
                  className="px-6 py-2.5 bg-[#C8102E] hover:bg-red-600 disabled:bg-[#1b1b36] disabled:text-slate-600 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(200,16,46,0.35)] transition-all w-full sm:w-auto"
                >
                  {isSavingCrop ? "Processing Crop..." : "Set as Profile Photo"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
