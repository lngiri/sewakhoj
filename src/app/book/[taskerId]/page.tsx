"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Check, CreditCard, MapPin, Clock, Calendar, ChevronRight, ChevronLeft, Upload, Phone, Mail } from "lucide-react";
import { services } from "@/data/services";
import { supabase } from "@/lib/supabase";
import { simulatePayment } from "@/lib/payments";

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
  transportation_mode: string;
  users: TaskerUser | TaskerUser[];
}

interface BookingPageProps {
  params: Promise<{ taskerId: string }>;
}

export default function BookingPage({ params }: BookingPageProps) {
  const router = useRouter();
  const { taskerId } = use(params);
  
  const [tasker, setTasker] = useState<TaskerWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(2);
  const [address, setAddress] = useState<string>("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("esewa");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");
  const [bookedTimeslots, setBookedTimeslots] = useState<string[]>([]);
  const [dbServices, setDbServices] = useState<any[]>([]);
  
  const [taskPhotoFile, setTaskPhotoFile] = useState<File | null>(null);
  const [taskPhotoPreview, setTaskPhotoPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time slots
  const timeSlots = [
    "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM",
    "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
    "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM"
  ];

  // Helper to convert DB time (13:00:00) to our slot format (01:00 PM)
  const formatDbTimeToSlot = (dbTime: string) => {
    const [hours] = dbTime.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `${h.toString().padStart(2, '0')}:00 ${ampm}`;
  };

  // Helper to convert our slot (01:00 PM) to DB time (13:00:00)
  const formatSlotToDbTime = (slot: string) => {
    const match = slot.match(/(\d+):(\d+)\s(AM|PM)/);
    if (!match) return "09:00:00";
    let h = parseInt(match[1]);
    if (match[3] === "PM" && h < 12) h += 12;
    if (match[3] === "AM" && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:00:00`;
  };

  // Fetch tasker data
  useEffect(() => {
    async function fetchTasker() {
      const { data, error } = await supabase
        .from("taskers")
        .select(`
          id, hourly_rate, city, rating, status, bio, skills, transportation_mode,
          users (id, full_name, phone, avatar_url)
        `)
        .eq("id", taskerId)
        .single();

      if (error) {
        console.error("Error fetching tasker:", error.message);
      } else {
        setTasker(data as unknown as TaskerWithUser);
        if (data.skills && data.skills.length > 0) {
          setSelectedService(data.skills[0]);
        }
      }
      setLoading(false);
    }
    fetchTasker();

    async function fetchServices() {
      const { data } = await supabase.from('services').select('*');
      if (data) setDbServices(data);
    }
    fetchServices();
  }, [taskerId]);

  // Fetch booked times for selected date
  useEffect(() => {
    async function fetchBookings() {
      if (!selectedDate || !taskerId) return;
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time, hours')
        .eq('tasker_id', taskerId)
        .eq('booking_date', selectedDate)
        .in('status', ['pending', 'confirmed', 'accepted', 'on-the-way', 'in-progress']);

      if (!error && data) {
        const blocked: string[] = [];
        data.forEach(b => {
          const startTime = formatDbTimeToSlot(b.booking_time);
          const startIndex = timeSlots.indexOf(startTime);
          if (startIndex !== -1) {
            // Block the start time and subsequent hours based on duration
            for (let i = 0; i < (b.hours || 1); i++) {
              if (timeSlots[startIndex + i]) {
                blocked.push(timeSlots[startIndex + i]);
              }
            }
          }
        });
        setBookedTimeslots(blocked);
      }
    }
    fetchBookings();
  }, [selectedDate, taskerId]);

  const getServiceInfo = (skillId: string) => {
    const fromDb = dbServices.find(s => s.id === skillId || s.name === skillId);
    if (fromDb) return { 
      id: fromDb.id, 
      nameEn: fromDb.name, 
      nameNp: fromDb.name_ne, 
      emoji: fromDb.icon, 
      descriptionEn: fromDb.description 
    };
    return services.find(s => s.id === skillId) || services[0];
  };

  const calculateTotal = () => {
    const baseRate = tasker?.hourly_rate || 500;
    const subtotal = (baseRate * duration) + getAddonsTotal();
    
    // Apply payment discount (5% for platform payments)
    const paymentDiscount = (paymentMethod !== 'cash') ? subtotal * 0.05 : 0;
    
    return Math.max(0, subtotal - paymentDiscount - promoDiscount);
  };

  const getAddonsTotal = () => {
    const addonPrices: Record<string, number> = {
      "deep-clean": 200, "eco-products": 150, "urgent": 300, "weekend": 500
    };
    return selectedAddons.reduce((sum, addon) => sum + (addonPrices[addon] || 0), 0);
  };

  const getAddonName = (id: string) => {
    const names: Record<string, string> = {
      "deep-clean": "Deep Clean", "eco-products": "Eco Products", "urgent": "Urgent Service", "weekend": "Weekend Service"
    };
    return names[id] || id;
  };

  const getAddonPrice = (id: string) => {
    const prices: Record<string, number> = {
      "deep-clean": 200, "eco-products": 150, "urgent": 300, "weekend": 500
    };
    return prices[id] || 0;
  };

  const applyPromo = async () => {
    if (!promoCode) return;
    
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      alert("Invalid or expired promo code.");
      return;
    }

    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      alert("This promo code has expired.");
      return;
    }

    if (data.current_uses >= data.max_uses) {
      alert("This promo code has reached its maximum usage.");
      return;
    }

    const discount = (calculateTotal() * (data.discount_percent / 100));
    setPromoDiscount(discount);
    setPromoApplied(true);
    alert(`Success! ${data.discount_percent}% discount applied (Rs ${discount.toFixed(0)} off).`);
  };

  const getEta = (mode: string) => {
    switch (mode) {
      case 'walking': return '45-60 mins';
      case 'bicycle': return '30-45 mins';
      case 'motorcycle': return '15-25 mins';
      case 'car': return '20-30 mins';
      case 'public_transit': return '40-55 mins';
      default: return '30 mins';
    }
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(a => a !== addonId)
        : [...prev, addonId]
    );
  };

  const handleBooking = async () => {
    if (!tasker || !agreedToTerms) return;
    setSubmitting(true);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      alert("Please login to complete booking");
      router.push(`/login?redirect=/book/${taskerId}`);
      return;
    }

    // 1. Process Payment First (Mock)
    if (paymentMethod !== 'cash') {
      const paymentResult = await simulatePayment(paymentMethod, calculateTotal(), 'PENDING');
      if (!paymentResult.success) {
        alert(paymentResult.error);
        setSubmitting(false);
        return;
      }
    }

    // 2. Upload Photo
    let photoUrl = null;
    if (taskPhotoFile) {
      const ext = taskPhotoFile.name.split('.').pop();
      const filename = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('task_photos').upload(filename, taskPhotoFile);
      if (uploadData && !uploadError) {
        photoUrl = supabase.storage.from('task_photos').getPublicUrl(filename).data.publicUrl;
      }
    }

    // 3. Insert Booking
    const { data: bookingData, error: bookingError } = await supabase.from('bookings').insert({
      customer_id: authUser.id,
      tasker_id: tasker.id,
      service: selectedService,
      booking_date: selectedDate,
      booking_time: formatSlotToDbTime(selectedTime),
      hours: duration,
      total_amount: calculateTotal(),
      address: address,
      task_photo_url: photoUrl,
      payment_method: paymentMethod,
      status: 'pending'
    }).select('id').single();

    if (bookingError) {
      alert("Failed to submit booking. Please try again.");
      console.error(bookingError);
      setSubmitting(false);
      return;
    }

    // 4. Send Email Notification
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: authUser.email, // In reality, we'd email the Tasker too!
          subject: `Booking Confirmed: ${getServiceInfo(selectedService).nameEn}`,
          html: `<p>Your booking for ${selectedDate} at ${selectedTime} has been received.</p>
                 <p>Total: Rs ${calculateTotal()}</p>
                 <p>Payment: ${paymentMethod}</p>`,
        })
      });
    } catch (e) {
      console.error("Failed to send email", e);
    }

    setBookingId(bookingData.id);
    setCurrentStep(5);
    setSubmitting(false);
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
          <Link href="/browse" className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium hover:bg-sewakhoj-red-light transition-colors">
            Browse Other Taskers
          </Link>
        </div>
      </main>
    );
  }

  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
  const userName = user?.full_name || "Unknown Tasker";
  const serviceInfo = getServiceInfo(selectedService);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/browse" className="inline-flex items-center gap-2 text-sewakhoj-red hover:text-sewakhoj-red-light transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Browse</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {currentStep === 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-gradient-to-br from-sewakhoj-red to-red-600 p-8 text-white">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-4xl font-black text-sewakhoj-red shadow-xl shrink-0 overflow-hidden">
                      {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : userName.charAt(0)}
                    </div>
                    <div className="text-center md:text-left">
                      <h2 className="text-3xl font-black">{userName}</h2>
                      <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">📍 {tasker.city}</span>
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">⭐ {tasker.rating?.toFixed(1)} Rating</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-widest text-[12px]">About Tasker</h3>
                      <p className="text-gray-600 leading-relaxed italic">"{tasker.bio || 'I am a dedicated professional ready to help you with your tasks.'}"</p>
                      
                      <h3 className="text-lg font-black text-gray-900 mt-8 mb-4 uppercase tracking-widest text-[12px]">Skills & Expertise</h3>
                      <div className="flex flex-wrap gap-2">
                        {tasker.skills?.map(s => (
                          <span key={s} className="bg-red-50 text-sewakhoj-red px-3 py-1.5 rounded-lg text-sm font-bold border border-red-100 uppercase">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-2xl p-6">
                      <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-widest text-[12px]">Service Details</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Hourly Rate</span>
                          <span className="font-bold text-gray-900">Rs {tasker.hourly_rate}/hr</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Tasks</span>
                          <span className="font-bold text-gray-900">{(tasker as any).total_jobs || 0} completed</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Transport</span>
                          <span className="font-bold text-gray-900 uppercase">{tasker.transportation_mode?.replace('_', ' ') || 'Motorcycle'}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setCurrentStep(1)}
                        className="w-full bg-sewakhoj-red text-white py-4 rounded-xl font-black mt-8 shadow-lg hover:bg-sewakhoj-red-light transition-all flex items-center justify-center gap-2"
                      >
                        Start Booking <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className={`flex items-center ${step < 4 ? 'flex-1' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= step ? 'bg-sewakhoj-red text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {currentStep > step ? <Check className="w-5 h-5" /> : step}
                      </div>
                      {step < 4 && <div className={`flex-1 h-1 mx-2 ${currentStep > step ? 'bg-sewakhoj-red' : 'bg-gray-200'}`}></div>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Service</span><span>Date & Location</span><span>Add-ons</span><span>Confirm</span>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Service / सेवा छान्नुस्</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                  {tasker.skills?.map((skill) => {
                    const svc = getServiceInfo(skill);
                    return (
                      <div key={skill} onClick={() => setSelectedService(skill)} className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedService === skill ? 'border-sewakhoj-red bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="text-3xl mb-2">{svc.emoji}</div>
                        <h3 className="font-bold text-gray-900">{svc.nameEn}</h3>
                        <p className="text-sm text-gray-600">{svc.nameNp}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-end">
                  <button onClick={() => setCurrentStep(2)} className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium hover:bg-sewakhoj-red-light inline-flex items-center gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-white rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Date, Time & Location</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-widest text-[11px]"><Calendar className="w-4 h-4 inline mr-2 text-sewakhoj-red" />Select Date / मिति छान्नुस्</label>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedTime(""); // Reset time when date changes
                      }} 
                      min={new Date().toISOString().split('T')[0]} 
                      className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-sewakhoj-red/10 focus:border-sewakhoj-red outline-none transition-all font-bold" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><Clock className="w-4 h-4 inline mr-1" />Duration</label>
                    <select value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red">
                      <option value={1}>1 Hour</option><option value={2}>2 Hours</option><option value={3}>3 Hours</option><option value={4}>4 Hours</option><option value={8}>8 Hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Time Slot</label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {timeSlots.map((slot) => {
                        const isBooked = bookedTimeslots.includes(slot);
                        
                        // Check if slot is in the past (if date is today)
                        let isPast = false;
                        const today = new Date().toISOString().split('T')[0];
                        if (selectedDate === today) {
                          const now = new Date();
                          const currentHour = now.getHours();
                          const currentMinute = now.getMinutes();
                          
                          // Parse slot time (e.g. "09:00 AM")
                          const match = slot.match(/(\d+):(\d+)\s(AM|PM)/);
                          if (match) {
                            let slotHour = parseInt(match[1]);
                            if (match[3] === "PM" && slotHour < 12) slotHour += 12;
                            if (match[3] === "AM" && slotHour === 12) slotHour = 0;
                            
                            if (slotHour < currentHour || (slotHour === currentHour && currentMinute > 0)) {
                              isPast = true;
                            }
                          }
                        }

                        const isDisabled = isBooked || isPast;

                        return (
                          <div 
                            key={slot} 
                            onClick={() => !isDisabled && setSelectedTime(slot)} 
                            className={`p-2 text-center border rounded-lg text-sm transition-all ${
                              isDisabled 
                                ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed opacity-50' 
                                : selectedTime === slot 
                                  ? 'border-sewakhoj-red bg-red-50 text-sewakhoj-red font-medium cursor-pointer ring-2 ring-sewakhoj-red/20' 
                                  : 'border-gray-200 hover:border-sewakhoj-red/50 hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            {slot}
                          </div>
                        );
                      })}
                    </div>
                    {bookedTimeslots.length > 0 && <p className="text-[11px] text-sewakhoj-red mt-2 flex items-center gap-1 font-medium"><Clock className="w-3 h-3"/> Some times are already booked for this date.</p>}
                    {selectedDate === new Date().toISOString().split('T')[0] && <p className="text-[11px] text-gray-500 mt-1 italic">Past times are hidden for today.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><MapPin className="w-4 h-4 inline mr-1" />Service Address</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red" />
                  </div>
                  <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload Photo of the Task (Optional)</p>
                    {taskPhotoPreview ? (
                      <div className="mt-2"><img src={taskPhotoPreview} alt="Preview" className="h-32 mx-auto rounded-lg object-cover" /><button className="text-xs text-red-500 mt-2" onClick={() => {setTaskPhotoFile(null); setTaskPhotoPreview("");}}>Remove</button></div>
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()} className="text-sewakhoj-red text-sm font-medium">Browse Files</button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { setTaskPhotoFile(f); setTaskPhotoPreview(URL.createObjectURL(f)); } }} />
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <button onClick={() => setCurrentStep(1)} className="text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100"><ChevronLeft className="w-4 h-4 inline" /> Previous</button>
                  <button onClick={() => setCurrentStep(3)} disabled={!selectedDate || !selectedTime || !address} className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50">Next <ChevronRight className="w-4 h-4 inline" /></button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Add-ons</h2>
                  <div className="space-y-3">
                    {[{ id: "deep-clean", name: "Deep Clean", price: 200 }, { id: "eco-products", name: "Eco Products", price: 150 }, { id: "urgent", name: "Urgent Service", price: 300 }].map((addon) => (
                      <div key={addon.id} onClick={() => toggleAddon(addon.id)} className={`p-4 border-2 rounded-xl cursor-pointer ${selectedAddons.includes(addon.id) ? 'border-sewakhoj-red bg-red-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between font-medium"><span>{addon.name}</span><span className="text-sewakhoj-red">+Rs {addon.price}</span></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Promocode / कुपन कोड</h2>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code (e.g. SEWA500)"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red outline-none"
                    />
                    <button 
                      onClick={applyPromo}
                      className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Try "WELCOME" or "SEWA500" for testing.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4"><CreditCard className="w-6 h-6 inline mr-2" />Payment Method</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[{ id: "esewa", name: "eSewa", logo: "🟢" }, { id: "khalti", name: "Khalti", logo: "🟣" }, { id: "cash", name: "Cash", logo: "💵" }].map((method) => (
                      <div key={method.id} onClick={() => setPaymentMethod(method.id)} className={`p-4 border-2 rounded-xl cursor-pointer text-center ${paymentMethod === method.id ? 'border-sewakhoj-red bg-red-50' : 'border-gray-200'}`}>
                        <div className="text-2xl">{method.logo}</div><div className="font-medium text-sm">{method.name}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-bold flex items-center gap-2">
                    <span>💡 Tip:</span> Pay online to get a 5% platform discount!
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep(2)} className="text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100"><ChevronLeft className="w-4 h-4 inline" /> Previous</button>
                  <button onClick={() => setCurrentStep(4)} className="bg-sewakhoj-red text-white px-6 py-3 rounded-lg font-medium">Next <ChevronRight className="w-4 h-4 inline" /></button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="bg-white rounded-xl shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Confirm</h2>
                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Estimated Arrival</h3>
                    <p className="text-sewakhoj-red font-bold text-lg">{getEta(tasker.transportation_mode || 'motorcycle')}</p>
                    <p className="text-xs text-gray-500">Based on tasker's transport mode ({tasker.transportation_mode || 'Motorcycle'})</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold">Service</h3><p>{serviceInfo.nameEn}</p></div>
                  <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold">Date & Time</h3><p>{selectedDate} at {selectedTime}</p></div>
                  <div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold">Address</h3><p>{address}</p></div>
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Base Task ({duration} hrs)</span>
                      <span>Rs {(tasker?.hourly_rate || 500) * duration}</span>
                    </div>
                    {selectedAddons.map(addonId => (
                      <div key={addonId} className="flex justify-between text-sm text-gray-600">
                        <span>{getAddonName(addonId)}</span>
                        <span>+Rs {getAddonPrice(addonId)}</span>
                      </div>
                    ))}
                    {paymentMethod !== 'cash' && (
                      <div className="flex justify-between text-sm text-green-600 font-bold">
                        <span>Platform Discount (5%)</span>
                        <span>-Rs {(((tasker?.hourly_rate || 500) * duration + getAddonsTotal()) * 0.05).toFixed(0)}</span>
                      </div>
                    )}
                    {promoApplied && (
                      <div className="flex justify-between text-sm text-green-600 font-bold">
                        <span>Promo Discount</span>
                        <span>-Rs {promoDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold pt-2 border-t mt-2">
                      <span>Total Amount</span>
                      <span className="text-sewakhoj-red">Rs {calculateTotal()}</span>
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-3 mb-6 cursor-pointer">
                  <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 w-5 h-5 text-sewakhoj-red rounded focus:ring-sewakhoj-red" />
                  <span className="text-sm text-gray-600">I agree to the terms and conditions</span>
                </label>
                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep(3)} className="text-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100"><ChevronLeft className="w-4 h-4 inline" /> Previous</button>
                  <button onClick={handleBooking} disabled={!agreedToTerms || submitting} className="bg-sewakhoj-red text-white px-8 py-3 rounded-lg font-bold disabled:opacity-50">
                    {submitting ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="w-10 h-10 text-green-600" /></div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                <p className="text-gray-600 mb-6">Your booking has been successfully submitted.</p>
                <div className="flex justify-center mt-6">
                  <Link href={`/booking/${bookingId}/tracking`} className="bg-sewakhoj-red text-white px-8 py-4 rounded-xl font-bold hover:bg-sewakhoj-red-light transition-all flex items-center gap-2 text-lg shadow-lg">
                    <MapPin className="w-5 h-5" /> Track Your Booking
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Booking Summary</h3>
              <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                <div className="w-16 h-16 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                  {user?.avatar_url ? <img src={user.avatar_url} alt={userName} className="w-full h-full object-cover" /> : userName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{userName}</h4>
                  <div className="flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4 fill-yellow-400" /><span className="text-sm font-bold">{tasker.rating?.toFixed(1) || "N/A"}</span></div>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm font-medium"><span className="text-gray-600">Task Rate</span><span>Rs {tasker.hourly_rate}/hr</span></div>
                <div className="flex justify-between text-sm font-medium"><span className="text-gray-600">Duration</span><span>{duration} hrs</span></div>
                
                {selectedAddons.length > 0 && (
                  <div className="pt-3 mt-3 border-t-2 border-gray-100">
                    <p className="text-[11px] font-black text-gray-400 uppercase mb-2 tracking-widest">Selected Add-ons</p>
                    <div className="space-y-2">
                      {selectedAddons.map(id => (
                        <div key={id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800 leading-tight">{getAddonName(id)}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">Per Service</span>
                          </div>
                          <span className="font-black text-sewakhoj-red">Rs {getAddonPrice(id)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between font-black text-xl pt-4 border-t-2 border-gray-900 mt-4 text-gray-900">
                  <span>TOTAL</span>
                  <span className="text-sewakhoj-red">Rs {calculateTotal()}</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2"><Phone className="w-4 h-4"/> Need help?</p>
                <p className="text-sm font-bold text-blue-800">+977-9800000000</p>
                <p className="text-xs text-blue-700 mt-1 flex items-center gap-2"><Mail className="w-3 h-3"/> sewakhoj@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
