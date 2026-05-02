"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Check, CreditCard, MapPin, Clock, Calendar, ChevronRight, ChevronLeft } from "lucide-react";
import { services } from "@/data/services";
import { supabase } from "@/lib/supabase";

interface TaskerUser {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
}

interface TaskerWithUser {
  id: string;
  hourly_rate: number;
  city: string;
  rating: number;
  status: string;
  bio: string;
  skills: string[];
  users: TaskerUser[];
}

interface BookingPageProps {
  params: Promise<{ taskerId: string }>;
}

export default function BookingPage({ params }: BookingPageProps) {
  const router = useRouter();
  const { taskerId } = use(params);
  
  const [tasker, setTasker] = useState<TaskerWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(2);
  const [address, setAddress] = useState<string>("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("esewa");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [bookingRef, setBookingRef] = useState<string>("");

  // Fetch tasker data
  useEffect(() => {
    async function fetchTasker() {
      const { data, error } = await supabase
        .from("taskers")
        .select(`
          id, hourly_rate, city, rating, status, bio, skills,
          users!inner (id, full_name, phone, avatar_url)
        `)
        .eq("id", taskerId)
        .single();

      if (error) {
        console.error("Error fetching tasker:", error.message);
      } else {
        setTasker(data as unknown as TaskerWithUser);
        // Pre-select first skill as service
        if (data.skills && data.skills.length > 0) {
          setSelectedService(data.skills[0]);
        }
      }
      setLoading(false);
    }
    fetchTasker();
  }, [taskerId]);

  // Get service info
  const getServiceInfo = (skillId: string) => {
    return services.find(s => s.id === skillId) || services[0];
  };

  // Calculate total
  const calculateTotal = () => {
    const baseRate = tasker?.hourly_rate || 500;
    const addonPrices: Record<string, number> = {
      "deep-clean": 200,
      "eco-products": 150,
      "urgent": 300,
      "weekend": 500
    };
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + (addonPrices[addon] || 0), 0);
    return (baseRate * duration) + addonsTotal;
  };

  // Time slots
  const timeSlots = [
    "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM",
    "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
    "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"
  ];

  // Toggle addon
  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(a => a !== addonId)
        : [...prev, addonId]
    );
  };

  // Handle booking submission
  const handleBooking = async () => {
    if (!tasker || !agreedToTerms) return;

    const ref = "BK" + Date.now().toString().slice(-8);
    setBookingRef(ref);
    
    // Here you would save to Supabase bookings table
    // For now, just show confirmation
    setCurrentStep(5);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasker details...</p>
        </div>
      </main>
    );
  }

  if (!tasker) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tasker Not Found</h2>
          <p className="text-gray-600 mb-6">This tasker may no longer be available.</p>
          <Link href="/browse" className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium hover:bg-sewakhoj-red-light transition-colors">
            Browse Other Taskers
          </Link>
        </div>
      </main>
    );
  }

  const user = tasker.users?.[0];
  const userName = user?.full_name || "Unknown Tasker";
  const serviceInfo = getServiceInfo(selectedService);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-sewakhoj-red hover:text-sewakhoj-red-light transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Browse / ब्राउजमा फर्कनुस्</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Booking Steps */}
          <div className="lg:col-span-2">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex items-center ${step < 4 ? 'flex-1' : ''}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        currentStep >= step
                          ? 'bg-sewakhoj-red text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {currentStep > step ? <Check className="w-5 h-5" /> : step}
                    </div>
                    {step < 4 && (
                      <div className={`flex-1 h-1 mx-2 ${currentStep > step ? 'bg-sewakhoj-red' : 'bg-gray-200'}`}></div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Service / सेवा</span>
                <span>Date & Time / मिति</span>
                <span>Add-ons / थप</span>
                <span>Review / समीक्षा</span>
              </div>
            </div>

            {/* Step 1: Choose Service */}
            {currentStep === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Service / सेवा छान्नुस्</h2>
                <p className="text-gray-600 mb-6">Select the service you need from this tasker's skills</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {tasker.skills?.map((skill) => {
                    const svc = services.find(s => s.id === skill) || {
                      id: skill,
                      nameEn: skill,
                      nameNp: skill,
                      emoji: "🔧"
                    };
                    return (
                      <div
                        key={skill}
                        onClick={() => setSelectedService(skill)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedService === skill
                            ? 'border-sewakhoj-red bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-3xl mb-2">{svc.emoji}</div>
                        <h3 className="font-bold text-gray-900">{svc.nameEn}</h3>
                        <p className="text-sm text-gray-600">{svc.nameNp}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium hover:bg-sewakhoj-red-light transition-colors inline-flex items-center gap-2"
                  >
                    Next / अर्को <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Date, Time & Location */}
            {currentStep === 2 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Date, Time & Location / मिति, समय र स्थान</h2>
                <p className="text-gray-600 mb-6">When and where do you need the service?</p>
                
                <div className="space-y-6">
                  {/* Date Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Select Date / मिति छान्नुस्
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Duration (Hours) / अवधि (घण्टा)
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
                    >
                      <option value={1}>1 Hour</option>
                      <option value={2}>2 Hours</option>
                      <option value={3}>3 Hours</option>
                      <option value={4}>4 Hours</option>
                      <option value={6}>6 Hours</option>
                      <option value={8}>8 Hours (Full Day)</option>
                    </select>
                  </div>

                  {/* Time Slots */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Time Slot / समय छान्नुस्
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {timeSlots.map((slot) => (
                        <div
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`p-2 text-center border rounded-lg cursor-pointer text-sm transition-all ${
                            selectedTime === slot
                              ? 'border-sewakhoj-red bg-red-50 text-sewakhoj-red font-medium'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Service Address / सेवा ठेगाना
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your full address / पूरा ठेगाना लेख्नुहोस्"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous / पछिल्लो
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!selectedDate || !selectedTime || !address}
                    className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium hover:bg-sewakhoj-red-light transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next / अर्को <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Add-ons & Payment */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Add-ons */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Add-ons / थप सेवाहरू</h2>
                  <p className="text-gray-600 mb-6">Enhance your service with these add-ons</p>
                  
                  <div className="space-y-3">
                    {[
                      { id: "deep-clean", name: "Deep Clean / गहिरो सफाइ", price: 200, desc: "Extra thorough cleaning" },
                      { id: "eco-products", name: "Eco Products / इको प्रोडक्ट्स", price: 150, desc: "Environmentally friendly" },
                      { id: "urgent", name: "Urgent Service / तत्काल सेवा", price: 300, desc: "Priority scheduling" },
                      { id: "weekend", name: "Weekend Service / विदाको दिन", price: 500, desc: "Available on weekends" }
                    ].map((addon) => (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon.id)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedAddons.includes(addon.id)
                            ? 'border-sewakhoj-red bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-gray-900">{addon.name}</h3>
                            <p className="text-sm text-gray-600">{addon.desc}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-sewakhoj-red">+Rs {addon.price}</span>
                            {selectedAddons.includes(addon.id) && (
                              <Check className="w-5 h-5 text-sewakhoj-red ml-2 inline" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    <CreditCard className="w-6 h-6 inline mr-2" />
                    Payment Method / भुक्तानी
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[
                      { id: "esewa", name: "eSewa", logo: "🟢" },
                      { id: "khalti", name: "Khalti", logo: "🟣" },
                      { id: "bank", name: "Bank Transfer", logo: "🏦" },
                      { id: "cash", name: "Cash", logo: "💵" }
                    ].map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 border-2 rounded-xl cursor-pointer text-center transition-all ${
                          paymentMethod === method.id
                            ? 'border-sewakhoj-red bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{method.logo}</div>
                        <div className="font-medium text-sm">{method.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous / पछिल्लो
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium hover:bg-sewakhoj-red-light transition-colors inline-flex items-center gap-2"
                  >
                    Next / अर्को <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {currentStep === 4 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Confirm / समीक्षा गर्नुस्</h2>
                
                <div className="space-y-4 mb-6">
                  {/* Service Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Service / सेवा</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{serviceInfo.emoji}</span>
                        <div>
                          <p className="font-medium">{serviceInfo.nameEn} / {serviceInfo.nameNp}</p>
                          <p className="text-sm text-gray-600">{userName}</p>
                        </div>
                      </div>
                      <span className="font-bold text-sewakhoj-red">Rs {tasker.hourly_rate}/hr</span>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Date & Time / मिति र समय</h3>
                    <p className="text-gray-700">{selectedDate} at {selectedTime}</p>
                    <p className="text-sm text-gray-600">Duration: {duration} hour{duration > 1 ? 's' : ''}</p>
                  </div>

                  {/* Address */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Address / ठेगाना</h3>
                    <p className="text-gray-700">{address}</p>
                  </div>

                  {/* Add-ons */}
                  {selectedAddons.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-bold text-gray-900 mb-2">Add-ons / थप सेवाहरू</h3>
                      {selectedAddons.map(addonId => {
                        const addonPrices: Record<string, number> = {
                          "deep-clean": 200, "eco-products": 150, "urgent": 300, "weekend": 500
                        };
                        const addonNames: Record<string, string> = {
                          "deep-clean": "Deep Clean", "eco-products": "Eco Products", 
                          "urgent": "Urgent Service", "weekend": "Weekend Service"
                        };
                        return (
                          <div key={addonId} className="flex justify-between text-sm">
                            <span>{addonNames[addonId]}</span>
                            <span>+Rs {addonPrices[addonId]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Payment */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Payment / भुक्तानी</h3>
                    <p className="text-gray-700 capitalize">{paymentMethod}</p>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t-2 border-gray-200 pt-4 mb-6">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total / जम्मा</span>
                    <span className="text-sewakhoj-red">Rs {calculateTotal()}</span>
                  </div>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-3 mb-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 text-sewakhoj-red rounded focus:ring-sewakhoj-red"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the terms and conditions / म सर्तहरू स्वीकार गर्छु
                  </span>
                </label>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous / पछिल्लो
                  </button>
                  <button
                    onClick={handleBooking}
                    disabled={!agreedToTerms}
                    className="bg-sewakhoj-red text-white px-8 py-3 rounded-lg font-bold hover:bg-sewakhoj-red-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Booking / बुकिङ पुष्टि गर्नुस्
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {currentStep === 5 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed! / बुकिङ पुष्टि भयो!</h2>
                <p className="text-gray-600 mb-6">Your booking has been successfully submitted.</p>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600">Booking Reference / बुकिङ सन्दर्भ</p>
                    <p className="text-2xl font-bold text-sewakhoj-red">{bookingRef}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasker / साथी</span>
                      <span className="font-medium">{userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service / सेवा</span>
                      <span className="font-medium">{serviceInfo.nameEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date / मिति</span>
                      <span className="font-medium">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time / समय</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-3 border-t">
                      <span>Total / जम्मा</span>
                      <span className="text-sewakhoj-red">Rs {calculateTotal()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/browse"
                    className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium hover:bg-sewakhoj-red-light transition-colors"
                  >
                    Book Another / अर्को बुक गर्नुस्
                  </Link>
                  <Link
                    href="/"
                    className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Back to Home / होममा फर्कनुस्
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Tasker Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Booking Summary / सारांश</h3>
              
              {/* Tasker Info */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                <div className="w-16 h-16 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    userName.split(" ").map(n => n[0]).join("").toUpperCase()
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{userName}</h4>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-yellow-400" />
                    <span className="text-sm font-bold">{tasker.rating?.toFixed(1) || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rate / दर</span>
                  <span>Rs {tasker.hourly_rate}/hr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration / अवधि</span>
                  <span>{duration} hour{duration > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal / उप-जम्मा</span>
                  <span>Rs {(tasker.hourly_rate || 500) * duration}</span>
                </div>
                {selectedAddons.map(addonId => {
                  const addonPrices: Record<string, number> = {
                    "deep-clean": 200, "eco-products": 150, "urgent": 300, "weekend": 500
                  };
                  return (
                    <div key={addonId} className="flex justify-between text-sm">
                      <span className="text-gray-600">Add-on / थप</span>
                      <span>+Rs {addonPrices[addonId]}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total / जम्मा</span>
                  <span className="text-sewakhoj-red">Rs {calculateTotal()}</span>
                </div>
              </div>

              {/* Need Help */}
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-700 font-medium">Need help?</p>
                <p className="text-sm text-sewakhoj-red font-bold">+977-9800000000</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
