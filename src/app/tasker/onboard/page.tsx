"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Clock } from "lucide-react";

const steps = [
  { id: 1, label: "Personal / व्यक्तिगत" },
  { id: 2, label: "Skills / सीप" },
  { id: 3, label: "Availability / उपलब्धता" },
  { id: 4, label: "Verification / प्रमाणीकरण" },
  { id: 5, label: "Pricing / मूल्य" },
  { id: 6, label: "Review / समीक्षा" },
];

const services = [
  { id: "plumbing", emoji: "🔧", en: "Plumbing", np: "प्लम्बिङ" },
  { id: "cleaning", emoji: "🧹", en: "Cleaning", np: "सफाई" },
  { id: "electrical", emoji: "⚡", en: "Electrical", np: "विद्युत" },
  { id: "moving", emoji: "📦", en: "Moving", np: "सार्ने" },
  { id: "tutoring", emoji: "📚", en: "Tutoring", np: "ट्युसन" },
  { id: "cooking", emoji: "🍳", en: "Cooking", np: "खाना" },
  { id: "painting", emoji: "🎨", en: "Painting", np: "रङ" },
  { id: "gardening", emoji: "🌿", en: "Gardening", np: "बागवानी" },
  { id: "tech", emoji: "💻", en: "Tech Help", np: "प्रविधि" },
  { id: "driving", emoji: "🚗", en: "Driving", np: "चालक" },
  { id: "caretaking", emoji: "👨‍⚕️", en: "Caretaking", np: "स्याहार" },
  { id: "petcare", emoji: "🐾", en: "Pet Care", np: "पाल्तु" },
];

export default function TaskerOnboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabase
        .from('cities')
        .select('name')
        .eq('is_active', true)
        .order('name');
      if (data) setCities(data.map(c => c.name));
    };
    fetchCities();
  }, [supabase]);
  const [uploadedDocs, setUploadedDocs] = useState({
    citizenship: "",
    license: "",
    other: ""
  });
  const fileInputCitizenship = useRef<HTMLInputElement>(null);
  const fileInputLicense = useRef<HTMLInputElement>(null);
  const fileInputOther = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push("/login?redirect=/tasker/onboard");
    }
  }, [authUser, authLoading, router]);
  // Auto-fill email
  useEffect(() => {
    if (authUser && !formData.email && authUser.email) {
      setFormData(prev => ({ ...prev, email: authUser.email || "" }));
    }
  }, [authUser]);

  // Calculate max date for 18 years ago
  const today = new Date();
  const maxDate18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  // Form state
  const [agreedToCode, setAgreedToCode] = useState(false);
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
    experience: "3-5 years",
    bio: "",
    languages: ["Nepali"],
    workingDays: [0, 1, 2, 3, 4], // Sun to Thu
    startTime: "08:00",
    endTime: "20:00",
    pricingType: "hourly",
    hourlyRate: "500",
    idVerified: false,
    transportMode: "motorcycle",
    agreedToPrivacy: false,
  });

  const updateForm = (field: string, value: string | string[] | number[] | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => {
      const skills = prev.skills.includes(skillId)
        ? prev.skills.filter((s) => s !== skillId)
        : [...prev.skills, skillId];
      return { ...prev, skills };
    });
  };

  const toggleDay = (dayIndex: number) => {
    setFormData((prev) => {
      const days = prev.workingDays.includes(dayIndex)
        ? prev.workingDays.filter((d) => d !== dayIndex)
        : [...prev.workingDays, dayIndex];
      return { ...prev, workingDays: days.sort() };
    });
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

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.fullName || !formData.phone) {
          setError("Please fill all required fields / कृपया सबै आवश्यक फिल्डहरू भर्नुहोस्");
          return false;
        }
        
        // Age validation
        if (formData.dob) {
          const birthDate = new Date(formData.dob);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age < 18) {
            setError("You must be at least 18 years old to join / सामेल हुनको लागि तपाई कम्तिमा १८ वर्षको हुनुपर्छ");
            return false;
          }
        } else {
          setError("Please enter your date of birth / कृपया आफ्नो जन्म मिति प्रविष्ट गर्नुहोस्");
          return false;
        }
        return true;
      case 2:
        if (formData.skills.length === 0) {
          setError("Please select at least one skill / कृपया कम्तिमा एक सीप छान्नुहोस्");
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        if (formData.pricingType === "hourly" && !formData.hourlyRate) {
          setError("Please set your hourly rate / कृपया आफ्नो प्रतिघण्टा दर सेट गर्नुहोस्");
          return false;
        }
        return true;
      case 6:
        if (!agreedToCode) {
          setError("You must agree to the Code of Conduct / तपाईले आचार संहिता स्वीकार गर्नुपर्छ");
          return false;
        }
        if (!formData.agreedToPrivacy) {
          setError("You must agree to the Privacy Policy & Terms / तपाईले गोपनीयता नीति र सर्तहरू स्वीकार गर्नुपर्छ");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createBrowserSupabaseClient();
      
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please login first / कृपया पहिले लगइन गर्नुस्");
        setLoading(false);
        return;
      }

      // Upload Avatar if exists (using task_photos public bucket for simplicity)
      let avatarUrl = "";
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatar_${user.id}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('task_photos')
          .upload(fileName, avatarFile);
        
        if (!uploadError) {
          const { data } = supabase.storage.from('task_photos').getPublicUrl(fileName);
          avatarUrl = data.publicUrl;
        }
      }

      // Update user profile in users table
      const { error: userError } = await supabase
        .from("users")
        .update({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          avatar_url: avatarUrl || null,
        })
        .eq("id", user.id);

      if (userError) throw userError;

      // Insert tasker data (without is_online — column doesn't exist yet)
      const { error: taskerError } = await supabase.from("taskers").insert({
        user_id: user.id,
        hourly_rate: formData.pricingType === "hourly" ? parseInt(formData.hourlyRate) || 500 : 500,
        city: formData.city.toLowerCase(),
        skills: formData.skills,
        bio: formData.bio,
        experience: formData.experience,
        working_days: formData.workingDays,
        working_hours: { start: formData.startTime, end: formData.endTime },
        transportation_mode: formData.transportMode,
        status: "pending",
        rating: 0,
      });

      if (taskerError) throw taskerError;

      // Set user role to tasker in auth metadata for easier future lookups
      await supabase.auth.updateUser({
        data: { role: 'tasker' }
      });
      
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError(err.message || "Something went wrong / केहि गलत भयो");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo.jpeg"
                alt="SewaKhoj Logo"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div translate="no">
                <div className="text-xl font-bold text-sewakhoj-red">
                  SewaKhoj
                </div>
                <div className="text-xs text-gray-500">सेवा खोज</div>
              </div>
            </Link>
            <div className="text-sm text-gray-600">
              Already a tasker?{" "}
              <Link
                href="/login"
                className="text-sewakhoj-red font-semibold"
              >
                Sign In / साइन इन
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      {!submitted && (
        <div className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        currentStep >= step.id
                           ? "bg-sewakhoj-red text-white"
                           : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {step.id}
                    </div>
                    <span className={`text-[10px] md:text-xs mt-1 text-center font-black uppercase tracking-tighter ${currentStep >= step.id ? "text-gray-900" : "text-gray-500"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 ${
                        currentStep > step.id ? "bg-sewakhoj-red" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {submitted ? (
          <div className="bg-white rounded-[40px] shadow-2xl p-8 md:p-14 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden">
            {/* Simple CSS animation background elements */}
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-sewakhoj-red/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
            
            <div className="relative z-10">
              <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 text-6xl shadow-xl shadow-green-500/30 animate-bounce">
                🎉
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
                Welcome to SewaKhoj! / सेवाखोजमा स्वागत छ!
              </h2>
              <p className="text-lg md:text-xl text-gray-800 mb-12 font-bold max-w-2xl mx-auto leading-relaxed">
                Your application has been received successfully. / तपाईंको आवेदन सफलतापूर्वक प्राप्त भएको छ।
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
                <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl mb-4">🛡️</div>
                  <h4 className="font-black text-blue-900 uppercase tracking-widest text-xs mb-2">1. Profile & KYC Verification / प्रोफाइल र केवाइसी प्रमाणीकरण</h4>
                  <p className="text-sm text-blue-900 leading-relaxed font-bold">
                    Our team will verify your submitted ID document within 24-48 hours. / हाम्रो टोलीले २४-४८ घण्टा भित्र तपाईंको परिचयपत्र प्रमाणीकरण गर्नेछ।
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-3xl p-6 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl mb-4">💰</div>
                  <h4 className="font-black text-green-900 uppercase tracking-widest text-xs mb-2">2. Earnings & Commission / कमाई र कमीशन</h4>
                  <p className="text-sm text-green-900 leading-relaxed font-bold">
                    You keep 90% of your earnings. A 10% platform commission is automatically tracked. / तपाईंले आफ्नो कमाईको ९०% राख्नुहुन्छ। १०% प्लेटफर्म कमीशन स्वचालित रूपमा ट्र्याक गरिन्छ।
                  </p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-3xl p-6 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl mb-4">📧</div>
                  <h4 className="font-black text-purple-900 uppercase tracking-widest text-xs mb-2">3. Email & SMS Notices / इमेल र एसएमएस सूचना</h4>
                  <p className="text-sm text-purple-900 leading-relaxed font-bold">
                    Watch your inbox! We will notify you via SMS once your account is activated. / आफ्नो इनबक्स हेर्नुहोस्! तपाईंको खाता सक्रिय भएपछि हामी तपाईंलाई एसएमएस मार्फत सूचित गर्नेछौं।
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xl mb-4">🚀</div>
                  <h4 className="font-black text-amber-900 uppercase tracking-widest text-xs mb-2">4. Ready for Action / कामको लागि तयार</h4>
                  <p className="text-sm text-amber-900 leading-relaxed font-bold">
                    Keep your phone nearby and your availability updated. / आफ्नो फोन नजिकै राख्नुहोस् र आफ्नो उपलब्धता अपडेट राख्नुहोस्।
                  </p>
                </div>
              </div>

              <Link href="/dashboard" className="inline-block bg-gray-900 text-white px-12 py-5 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl hover:-translate-y-1 active:translate-y-0">
                Go to My Dashboard / मेरो ड्यासबोर्डमा जानुहोस्
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 font-bold flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6">Personal Information / व्यक्तिगत जानकारी</h2>
                
                <div className="mb-6 flex items-center gap-4 border-b pb-6">
                  <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-3xl">👤</span>
                        <span className="text-[10px] text-gray-700 mt-1 uppercase font-black tracking-widest">Preview</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Profile Picture / प्रोफाइल तस्वीर (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="text-sm text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-black file:bg-sewakhoj-red file:text-white hover:file:bg-sewakhoj-red-light cursor-pointer"
                    />
                    <p className="text-[11px] text-gray-700 mt-2 font-bold uppercase tracking-tight">Max size: 5MB / अधिकतम साइज: ५MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Full Name / पूरा नाम *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => updateForm("fullName", e.target.value)}
                      placeholder="e.g. Ram Bahadur Thapa"
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Phone / फोन *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Email / इमेल
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Date of Birth / जन्म मिति *
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => updateForm("dob", e.target.value)}
                      max={maxDate18YearsAgo}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all shadow-sm"
                      required
                    />
                    <p className="text-[10px] text-gray-800 mt-1 uppercase font-black tracking-widest">Min 18 years required / न्यूनतम १८ वर्ष अनिवार्य</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Gender / लिङ्ग
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => updateForm("gender", e.target.value)}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all shadow-sm"
                    >
                      <option value="">Select / छान्नुस्</option>
                      <option value="male">Male / पुरुष</option>
                      <option value="female">Female / महिला</option>
                      <option value="other">Other / अन्य</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      City / सहर *
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => updateForm("city", e.target.value)}
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all shadow-sm"
                      required
                    >
                      <option value="">Select City / सहर छान्नुस्</option>
                      {cities.map((city) => (
                        <option key={city} value={city.toLowerCase()}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      Area / क्षेत्र
                    </label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => updateForm("area", e.target.value)}
                      placeholder="e.g. Thamel, Kathmandu"
                      className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    Full Address / पूरा ठेगाना
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => updateForm("address", e.target.value)}
                    rows={3}
                    className="w-full p-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Skills */}
            {currentStep === 2 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6">Select Your Skills / आफ्नो सीप छान्नुस्</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleSkill(service.id)}
                      className={`p-4 border-2 rounded-lg text-left transition ${
                        formData.skills.includes(service.id)
                          ? "border-sewakhoj-red bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-2xl mb-2">{service.emoji}</div>
                      <div className="font-semibold text-gray-900">{service.en}</div>
                      <div className="text-sm text-gray-600">{service.np}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Availability */}
            {currentStep === 3 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6">Availability / उपलब्धता</h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Working Days / काम गर्ने दिनहरू
                  </label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day, idx) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={`p-3 border-2 rounded-lg text-center transition ${
                            formData.workingDays.includes(idx)
                              ? "border-sewakhoj-red bg-red-50 text-sewakhoj-red"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-sm font-semibold">{day}</div>
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time / सुरु समय
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        updateForm("startTime", e.target.value)
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time / अन्त्य समय
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        updateForm("endTime", e.target.value)
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none shadow-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transportation Mode / यातायातको साधन
                  </label>
                  <select
                    value={formData.transportMode}
                    onChange={(e) => updateForm("transportMode", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                  >
                    <option value="walking">Walking / पैदल</option>
                    <option value="bicycle">Bicycle / साइकल</option>
                    <option value="motorcycle">Motorcycle / मोटरसाइकल</option>
                    <option value="car">Car / कार</option>
                    <option value="public_transit">Public Transit / सार्वजनिक यातायात</option>
                    <option value="virtual">Virtual / अनलाइन</option>
                  </select>
                  <p className="text-xs text-gray-800 mt-2 font-bold leading-relaxed">This helps us calculate your estimated arrival time for bookings. / यसले हामीलाई बुकिंगको लागि तपाईंको आगमन समय गणना गर्न मद्दत गर्दछ।</p>
                </div>
              </div>
            )}

            {/* Step 4: Verification */}
            {currentStep === 4 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6">Verification / प्रमाणीकरण</h2>
                <p className="text-sm text-gray-500 mb-8 font-medium">Please upload clear photos of your identity documents for verification.</p>
                
                <div className="space-y-6">
                  {/* Citizenship / National ID */}
                  <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-xl">🪪</div>
                        <div>
                          <h4 className="font-black text-gray-900 text-sm">Citizenship or National ID / नागरिकता वा राष्ट्रिय परिचयपत्र</h4>
                          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Required / अनिवार्य</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadedDocs.citizenship ? (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-green-600 truncate max-w-[150px]">✅ {uploadedDocs.citizenship}</span>
                            <button onClick={() => setUploadedDocs(prev => ({ ...prev, citizenship: "" }))} className="text-[10px] font-black text-red-500 uppercase hover:underline">Remove</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => fileInputCitizenship.current?.click()}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase hover:border-sewakhoj-red hover:text-sewakhoj-red transition-all shadow-sm"
                          >
                            Upload File
                          </button>
                        )}
                        <input type="file" ref={fileInputCitizenship} className="hidden" accept="image/*,.pdf" onChange={(e) => setUploadedDocs(prev => ({ ...prev, citizenship: e.target.files?.[0]?.name || "" }))} />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-800 mt-2 font-black uppercase tracking-tight">Max size: 5MB / अधिकतम साइज: ५MB</p>
                  </div>

                  {/* Driving License */}
                  <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-xl">🚗</div>
                        <div>
                          <h4 className="font-black text-gray-900 text-sm">Driving License / सवारी चालक अनुमति पत्र</h4>
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Optional / वैकल्पिक</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadedDocs.license ? (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-green-600 truncate max-w-[150px]">✅ {uploadedDocs.license}</span>
                            <button onClick={() => setUploadedDocs(prev => ({ ...prev, license: "" }))} className="text-[10px] font-black text-red-500 uppercase hover:underline">Remove</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => fileInputLicense.current?.click()}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase hover:border-sewakhoj-red hover:text-sewakhoj-red transition-all shadow-sm"
                          >
                            Upload File
                          </button>
                        )}
                        <input type="file" ref={fileInputLicense} className="hidden" accept="image/*,.pdf" onChange={(e) => setUploadedDocs(prev => ({ ...prev, license: e.target.files?.[0]?.name || "" }))} />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-800 mt-2 font-black uppercase tracking-tight">Max size: 5MB / अधिकतम साइज: ५MB</p>
                  </div>

                  {/* Other Documents */}
                  <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-xl">📂</div>
                        <div>
                          <h4 className="font-black text-gray-900 text-sm">Other Documents / अन्य कागजातहरू</h4>
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Optional / वैकल्पिक</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadedDocs.other ? (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-green-600 truncate max-w-[150px]">✅ {uploadedDocs.other}</span>
                            <button onClick={() => setUploadedDocs(prev => ({ ...prev, other: "" }))} className="text-[10px] font-black text-red-500 uppercase hover:underline">Remove</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => fileInputOther.current?.click()}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase hover:border-sewakhoj-red hover:text-sewakhoj-red transition-all shadow-sm"
                          >
                            Upload File
                          </button>
                        )}
                        <input type="file" ref={fileInputOther} className="hidden" accept="image/*,.pdf" onChange={(e) => setUploadedDocs(prev => ({ ...prev, other: e.target.files?.[0]?.name || "" }))} />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-800 mt-2 font-black uppercase tracking-tight">Max size: 5MB / अधिकतम साइज: ५MB</p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5 flex gap-4">
                    <span className="text-2xl">💡</span>
                    <p className="text-sm text-yellow-800 leading-relaxed font-medium">
                      <strong>Verification Timeline:</strong> Your documents will be reviewed by our compliance team within 24-48 hours. You can complete your profile now, and we'll notify you once you're approved to work!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Pricing */}
            {currentStep === 5 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6">Pricing / मूल्य</h2>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Pricing Type / मूल्य प्रकार
                    </label>
                    <div className="group relative">
                      <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 cursor-help">i</div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        <strong>Hourly:</strong> Charge per hour of work. Best for cleaning, tutoring.<br/><br/>
                        <strong>Fixed:</strong> Charge a flat fee per job. Best for simple repairs.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => updateForm("pricingType", "hourly")}
                      className={`flex-1 p-4 border-2 rounded-lg transition text-left ${
                        formData.pricingType === "hourly"
                          ? "border-sewakhoj-red bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-bold text-gray-900">Hourly Rate</div>
                      <div className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">प्रतिघण्टा</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateForm("pricingType", "fixed")}
                      className={`flex-1 p-4 border-2 rounded-lg transition text-left ${
                        formData.pricingType === "fixed"
                          ? "border-sewakhoj-red bg-red-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-bold text-gray-900">Fixed Price</div>
                      <div className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">तय मूल्य</div>
                    </button>
                  </div>
                </div>

                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.pricingType === "hourly" ? "Hourly Rate (NPR) / प्रतिघण्टा दर" : "Base Price (NPR) / आधार मूल्य"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rs.</span>
                    <input
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => updateForm("hourlyRate", e.target.value)}
                      min="100"
                      max="10000"
                      placeholder="e.g. 500"
                      className="w-full p-3.5 pl-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent outline-none shadow-sm font-bold text-lg"
                    />
                  </div>
                  <p className="text-[11px] text-gray-800 mt-2 font-black uppercase tracking-tight">
                    {formData.pricingType === "hourly" 
                      ? "Average hourly rate is Rs. 400 - 800 / औसत दर रु. ४०० - ८०० छ" 
                      : "Set a starting price for your service. / आफ्नो सेवाको लागि सुरुवाती मूल्य सेट गर्नुहोस्।"}
                  </p>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience / अनुभव
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) => updateForm("experience", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                  >
                    <option value="0-1 years">0-1 years / ०-१ वर्ष</option>
                    <option value="1-3 years">1-3 years / १-३ वर्ष</option>
                    <option value="3-5 years">3-5 years / ३-५ वर्ष</option>
                    <option value="5+ years">5+ years / ५+ वर्ष</option>
                  </select>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio / परिचय
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => updateForm("bio", e.target.value)}
                    rows={4}
                    placeholder="Tell customers about yourself... / आफ्नो बारेमा ग्राहकलाई बताउनुस्..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-6">Review & Submit / समीक्षा र पेश गर्नुस्</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                      <h3 className="text-[12px] font-black uppercase text-gray-900 mb-4 tracking-widest">Personal & Contact</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Full Name</p>
                          <p className="font-black text-gray-900 text-lg">{formData.fullName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Phone</p>
                            <p className="font-black text-gray-900">{formData.phone}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">DOB</p>
                            <p className="font-black text-gray-900">{formData.dob}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Address</p>
                          <p className="font-black text-gray-900">{formData.city}, {formData.area}</p>
                          <p className="text-sm text-gray-800 font-bold">{formData.address}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[12px] font-black uppercase text-gray-900 tracking-widest">Skills & Experience</h3>
                        <button 
                          onClick={() => {
                            setCurrentStep(2);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="text-[11px] font-black text-sewakhoj-red uppercase flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded-lg transition-all"
                        >
                          <span className="text-sm">+</span> Add More
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {formData.skills.map((skillId) => {
                          const skill = services.find((s) => s.id === skillId);
                          return (
                            <div key={skillId} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-sewakhoj-red/20 text-sewakhoj-red rounded-xl text-xs font-black shadow-sm group">
                              {skill?.emoji} {skill?.en}
                              <button 
                                onClick={() => toggleSkill(skillId)}
                                className="ml-1 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-sm font-bold text-gray-700 italic">"{formData.bio}"</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                      <h3 className="text-[12px] font-black uppercase text-blue-500 mb-4 tracking-widest">Financial & Commission</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-blue-100 pb-3">
                          <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase">Your Hourly Rate</p>
                            <p className="text-2xl font-black text-blue-900">Rs {formData.hourlyRate}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-blue-400 uppercase">Commission (10%)</p>
                            <p className="font-black text-red-500">- Rs {(parseInt(formData.hourlyRate) * 0.1).toFixed(0)}</p>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                          <p className="text-[10px] font-black text-green-600 uppercase mb-1 tracking-widest">Your Net Earning per hour</p>
                          <p className="text-3xl font-black text-green-600">Rs {(parseInt(formData.hourlyRate) * 0.9).toFixed(0)}</p>
                          <p className="text-[11px] text-gray-800 mt-2 leading-relaxed font-bold">
                            SewaKhoj keeps a small 10% service fee to maintain the platform and bring you more customers.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <h3 className="text-[12px] font-black uppercase text-gray-400 mb-4 tracking-widest">Availability</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                          formData.workingDays.includes(idx) && (
                            <span key={day} className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-[10px] font-black uppercase border border-green-100">
                              {day}
                            </span>
                          )
                        ))}
                      </div>
                      <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                        <Clock className="w-4 h-4 text-sewakhoj-red" />
                        <span className="text-sm font-black text-gray-900">
                          {formData.startTime} - {formData.endTime}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-800 mt-2 uppercase font-black tracking-widest">Transport: {formData.transportMode}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
                    <h4 className="font-black text-amber-900 mb-2 uppercase tracking-widest text-sm">Code of Conduct / आचार संहिता</h4>
                    <p className="text-xs text-amber-800 mb-4 leading-relaxed font-medium">
                      By submitting this application, I agree to maintain professional behavior, arrive on time, deliver high-quality work, and not engage in any fraudulent activity. I understand that SewaKhoj can suspend my account if I violate these terms.
                      <br /><br />
                      यस आवेदन पेश गरेर, म व्यावसायिक व्यवहार कायम राख्न, समयमै पुग्न, उच्च गुणस्तरको काम प्रदान गर्न, र कुनै पनि धोखाधडी गतिविधिमा संलग्न नहुन सहमत छु। म बुझ्दछु कि यदि मैले यी सर्तहरू उल्लंघन गरेमा SewaKhoj ले मेरो खाता निलम्बन गर्न सक्छ।
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={agreedToCode}
                        onChange={(e) => setAgreedToCode(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-sewakhoj-red focus:ring-sewakhoj-red"
                      />
                      <span className="text-sm font-bold text-amber-900">
                        I have read and agree to the Tasker Code of Conduct *
                      </span>
                    </label>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.agreedToPrivacy}
                        onChange={(e) => updateForm("agreedToPrivacy", e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-sewakhoj-red focus:ring-sewakhoj-red"
                      />
                      <span className="text-sm font-bold text-blue-900 leading-relaxed">
                        I agree to the <Link href="/privacy" target="_blank" className="text-sewakhoj-red underline">Privacy Policy</Link> and <Link href="/terms" target="_blank" className="text-sewakhoj-red underline">Terms of Service</Link> *
                        <br/>
                        <span className="text-[11px] text-blue-700 font-medium italic">म गोपनीयता नीति र सेवाका सर्तहरूमा सहमत छु</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-12 pb-20">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-8 py-4 border border-gray-300 rounded-2xl font-black text-gray-600 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-widest"
              >
                ← Previous
              </button>
              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-10 py-4 bg-sewakhoj-red text-white rounded-2xl font-black text-lg hover:bg-sewakhoj-red-light transition shadow-xl hover:-translate-y-1 active:translate-y-0"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-10 py-4 bg-sewakhoj-red text-white rounded-2xl font-black text-lg hover:bg-sewakhoj-red-light transition shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Application ✓"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
