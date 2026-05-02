"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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

const cities = [
  "Kathmandu",
  "Lalitpur",
  "Bhaktapur",
  "Pokhara",
  "Chitwan",
  "Butwal",
  "Biratnagar",
  "Dharan",
  "Other",
];

export default function TaskerOnboardPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push("/login?redirect=/tasker/onboard");
    }
  }, [authUser, authLoading, router]);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
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
    startTime: "8:00 AM",
    endTime: "6:00 PM",
    pricingType: "hourly",
    hourlyRate: "500",
    idVerified: false,
    transportMode: "motorcycle",
  });

  const updateForm = (field: string, value: string | string[] | number[]) => {
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
        if (!formData.firstName || !formData.lastName || !formData.phone || !avatarFile) {
          setError("Please fill all required fields and upload a profile picture / कृपया सबै आवश्यक फिल्डहरू भर्नुहोस् र प्रोफाइल तस्वीर अपलोड गर्नुहोस्");
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
          full_name: `${formData.firstName} ${formData.lastName}`,
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

      // Show success and redirect
      alert(
        "Application submitted successfully! / तपाईंको आवेदन सफलतापूर्वक पेश गरियो!"
      );
      router.push("/");
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
              <div>
                <div className="text-xl font-bold text-sewakhoj-red">
                  SewaKhoj
                </div>
                <div className="text-xs text-gray-500">सेवा खोजी</div>
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
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step.id}
                  </div>
                  <span className="text-xs mt-1 text-gray-600 text-center">
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 ${
                      currentStep > step.id ? "bg-sewakhoj-red" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-6">Personal Information / व्यक्तिगत जानकारी</h2>
            
            <div className="mb-6 flex items-center gap-4 border-b pb-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Picture / प्रोफाइल तस्वीर *
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
                  className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sewakhoj-red file:text-white hover:file:bg-sewakhoj-red-light"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name / पहिलो नाम *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateForm("firstName", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name / थर *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateForm("lastName", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone / फोन *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email / इमेल
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth / जन्म मिति
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => updateForm("dob", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender / लिङ्ग
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateForm("gender", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                >
                  <option value="">Select / छान्नुस्</option>
                  <option value="male">Male / पुरुष</option>
                  <option value="female">Female / महिला</option>
                  <option value="other">Other / अन्य</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City / सहर *
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => updateForm("city", e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area / क्षेत्र
                </label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => updateForm("area", e.target.value)}
                  placeholder="e.g. Thamel, Kathmandu"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Address / पूरा ठेगाना
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => updateForm("address", e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
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
                  value={formData.startTime.replace(" AM", "").replace(" PM", "")}
                  onChange={(e) =>
                    updateForm("startTime", `${e.target.value} AM`)
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time / अन्त्य समय
                </label>
                <input
                  type="time"
                  value={formData.endTime.replace(" AM", "").replace(" PM", "")}
                  onChange={(e) =>
                    updateForm("endTime", `${e.target.value} PM`)
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
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
              </select>
              <p className="text-xs text-gray-500 mt-1">This helps us calculate your estimated arrival time for bookings.</p>
            </div>
          </div>
        )}

        {/* Step 4: Verification */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-6">Verification / प्रमाणीकरण</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">{uploadedFileName ? "✅" : "📄"}</div>
                <p className="text-gray-600 mb-2">Upload ID Document / आईडी कागजात अपलोड गर्नुहोस्</p>
                <p className="text-sm text-gray-500">Citizenship, Passport, or Driving License</p>
                {uploadedFileName ? (
                  <div className="mt-4">
                    <p className="text-sm text-sewakhoj-green font-semibold mb-2">✅ {uploadedFileName}</p>
                    <button
                      type="button"
                      onClick={() => { setUploadedFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Remove / हटाउनुहोस्
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-6 py-2 bg-sewakhoj-red text-white rounded-lg hover:bg-sewakhoj-red-light transition"
                  >
                    Upload / अपलोड
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedFileName(file.name);
                    }
                  }}
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Your ID will be verified within 24-48 hours.
                  You can start receiving bookings once verified.
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Pricing Type / मूल्य प्रकार
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => updateForm("pricingType", "hourly")}
                  className={`flex-1 p-4 border-2 rounded-lg transition ${
                    formData.pricingType === "hourly"
                      ? "border-sewakhoj-red bg-red-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="font-semibold">Hourly Rate</div>
                  <div className="text-sm text-gray-600">प्रतिघण्टा</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateForm("pricingType", "fixed")}
                  className={`flex-1 p-4 border-2 rounded-lg transition ${
                    formData.pricingType === "fixed"
                      ? "border-sewakhoj-red bg-red-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="font-semibold">Fixed Price</div>
                  <div className="text-sm text-gray-600">तय मूल्य</div>
                </button>
              </div>
            </div>
            {formData.pricingType === "hourly" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (NPR) / प्रतिघण्टा दर
                </label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => updateForm("hourlyRate", e.target.value)}
                  min="100"
                  max="5000"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-transparent"
                />
              </div>
            )}
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
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Personal Info</h3>
                <p className="text-gray-600">
                  {formData.firstName} {formData.lastName}
                </p>
                <p className="text-gray-600">{formData.phone}</p>
                <p className="text-gray-600">{formData.city}</p>
              </div>
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skillId) => {
                    const skill = services.find((s) => s.id === skillId);
                    return (
                      <span
                        key={skillId}
                        className="px-3 py-1 bg-sewakhoj-red/10 text-sewakhoj-red rounded-full text-sm"
                      >
                        {skill?.emoji} {skill?.en}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>
                <p className="text-gray-600">
                  {formData.workingDays.length} days/week, {formData.startTime} - {formData.endTime}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Pricing</h3>
                <p className="text-gray-600">
                  NPR {formData.hourlyRate}/hour
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous / अघिल्लो
          </button>
          {currentStep < 6 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-sewakhoj-red text-white rounded-lg hover:bg-sewakhoj-red-light transition"
            >
              Next / अर्को
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-sewakhoj-red text-white rounded-lg hover:bg-sewakhoj-red-light transition disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Application / आवेदन पेश गर्नुस्"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
