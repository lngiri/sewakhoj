"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Check, CheckCircle2, CreditCard, MapPin, Clock, Calendar, ChevronRight, ChevronLeft, Upload, Phone, Mail, AlertCircle, ShieldCheck, Globe } from "lucide-react";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { services } from "@/data/services";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { toast } from "@/lib/toast-messages";
import { useLocale } from "next-intl";
import { simulatePayment } from "@/lib/payments";
import { sendTaskerAlert } from "@/lib/sms";
import TrustScoreBreakdown from "@/components/ui/TrustScoreBreakdown";

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
  is_online: boolean;
  bio: string;
  skills: string[];
  transportation_mode: string;
  users: TaskerUser | TaskerUser[];
}

interface BookingPageProps {
  params: Promise<{ taskerId: string }>;
}

export default function BookingPage({ params }: BookingPageProps) {
  const locale = useLocale();
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const { showNotification, showError, showSuccess } = useNotification();
  const { taskerId } = use(params);

  const searchParams = useSearchParams();
  const preSelectedService = searchParams.get('service');

  const [tasker, setTasker] = useState<TaskerWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");
  const [paymentExpiryMinutes] = useState(30); // 30-minute payment window
  const [timeRemaining, setTimeRemaining] = useState(paymentExpiryMinutes * 60); // seconds

  useEffect(() => {
    if (preSelectedService && tasker?.skills?.includes(preSelectedService)) {
      setSelectedService(preSelectedService);
    }
  }, [preSelectedService, tasker]);

  // 🛰️ Tasker Profile Fetch — multi-strategy with fallbacks
  useEffect(() => {
    async function fetchTasker() {
      if (!taskerId) return;

      try {
        setLoading(true);

        // Strategy 1: Fetch by tasker.id with user join
        const { data, error } = await supabase
          .from('taskers')
          .select(`*, users:user_id ( id, full_name, phone, avatar_url )`)
          .eq('id', taskerId)
          .maybeSingle();

        if (data) {
          setTasker(data as any);
          return;
        }
        if (error) console.warn("Strategy 1 (id+join):", error.message);

        // Strategy 2: Fetch by tasker.id WITHOUT user join (RLS fallback)
        const { data: d2, error: e2 } = await supabase
          .from('taskers')
          .select('*')
          .eq('id', taskerId)
          .maybeSingle();

        if (d2) {
          // Manually fetch user info
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, phone, avatar_url')
            .eq('id', d2.user_id)
            .maybeSingle();
          setTasker({ ...d2, users: userData } as any);
          return;
        }
        if (e2) console.warn("Strategy 2 (id only):", e2.message);

        // Strategy 3: Fetch by user_id with join
        const { data: d3 } = await supabase
          .from('taskers')
          .select(`*, users:user_id ( id, full_name, phone, avatar_url )`)
          .eq('user_id', taskerId)
          .maybeSingle();

        if (d3) {
          setTasker(d3 as any);
          return;
        }

        // Strategy 4: Fetch by user_id WITHOUT join
        const { data: d4 } = await supabase
          .from('taskers')
          .select('*')
          .eq('user_id', taskerId)
          .maybeSingle();

        if (d4) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, phone, avatar_url')
            .eq('id', d4.user_id)
            .maybeSingle();
          setTasker({ ...d4, users: userData } as any);
          return;
        }

        console.error("All fetch strategies failed for taskerId:", taskerId);
      } catch (err) {
        console.error("Booking fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTasker();
  }, [taskerId]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(1);
  const [address, setAddress] = useState<string>("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("esewa");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [bookingId, setBookingId] = useState<string>("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [bookedTimeslots, setBookedTimeslots] = useState<string[]>([]);
  const [isBookingForFamily, setIsBookingForFamily] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientNotes, setRecipientNotes] = useState("");
  const [dbServices, setDbServices] = useState<any[]>([]);
  const [addonPrices, setAddonPrices] = useState<Record<string, number>>({
    "deep-clean": 200, "eco-products": 150, "urgent": 300, "weekend": 500
  });
  const [taskPhotoFile, setTaskPhotoFile] = useState<File | null>(null);
  const [taskPhotoPreview, setTaskPhotoPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time slots — now dynamic from tasker's weekly schedule
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const timeSlotsRef = useRef(timeSlots);
  useEffect(() => {
    timeSlotsRef.current = timeSlots;
  }, [timeSlots]);
  const [scheduleBlocked, setScheduleBlocked] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [lastServerTotal, setLastServerTotal] = useState<number | null>(null);

  // Helper: convert API "HH:00" format to UI "HH:00 AM/PM" format
  const formatApiSlot = (apiSlot: string) => {
    const [hStr] = apiSlot.split(":");
    let h = parseInt(hStr);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h || 12;
    return `${h.toString().padStart(2, "0")}:00 ${ampm}`;
  };

  // Fetch blocked dates for the tasker (only once on load)
  useEffect(() => {
    async function fetchBlockedDates() {
      if (!taskerId) return;
      try {
        const res = await fetch(`/api/tasker/block-day?taskerId=${taskerId}`);
        if (res.ok) {
          const data = await res.json();
          setBlockedDates(
            (data.blockedDays || []).map((d: any) => d.blocked_date)
          );
        }
      } catch {
        // Silently fail — blocked dates just won't be highlighted
      }
    }
    fetchBlockedDates();
  }, [taskerId]);

  // Fetch available slots from tasker's weekly schedule
  useEffect(() => {
    async function fetchAvailableSlots() {
      if (!selectedDate || !taskerId) {
        setTimeSlots([]);
        setScheduleBlocked(false);
        return;
      }
      setSlotsLoading(true);
      try {
        const res = await fetch(
          `/api/tasker/available-slots?taskerId=${taskerId}&date=${selectedDate}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.blocked) {
            setScheduleBlocked(true);
            setTimeSlots([]);
          } else if (data.availableSlots && data.availableSlots.length > 0) {
            setScheduleBlocked(false);
            setTimeSlots(
              data.availableSlots.map((s: string) => formatApiSlot(s))
            );
          } else {
            // No schedule configured — fall back to default 6AM-8PM
            setScheduleBlocked(false);
            setTimeSlots([
              "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM",
              "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
              "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
            ]);
          }
        } else {
          // Fallback: if API fails, show default 6AM-8PM
          setScheduleBlocked(false);
          setTimeSlots([
            "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM",
            "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
            "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
          ]);
        }
      } catch {
        // Network error fallback
        setScheduleBlocked(false);
        setTimeSlots([
          "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM",
          "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
          "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
        ]);
      } finally {
        setSlotsLoading(false);
      }
    }
    fetchAvailableSlots();
  }, [selectedDate, taskerId]);

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

  // 🛰️ CEO PROTOCOL: Abandoned Booking Tracker
  const saveDraft = async (step: number) => {
    if (!authUser || !tasker) return;

    const draftData = {
      id: draftId || undefined,
      customer_id: authUser.id,
      tasker_id: tasker.id,
      service: selectedService || "General",
      booking_date: selectedDate || new Date().toISOString().split('T')[0],
      booking_time: selectedTime ? formatSlotToDbTime(selectedTime) : "09:00:00",
      hours: duration,
      address: address || "Draft Location",
      total_amount: (tasker.hourly_rate * duration) + getAddonsTotal() - promoDiscount,
      status: 'pending',
      is_draft: true,
      last_step_completed: step,
      abandoned_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('bookings')
      .upsert(draftData, { onConflict: 'id' })
      .select('id')
      .single();

    if (!error && data) {
      setDraftId(data.id);
    }
  };

  // Trigger draft save on step changes
  useEffect(() => {
    if (currentStep > 0) {
      saveDraft(currentStep);
    }
  }, [currentStep, selectedService, selectedDate, selectedTime, address, duration]);

  // Fetch booked times for selected date
  useEffect(() => {
    async function fetchBookings() {
      if (!selectedDate || !taskerId) return;
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time, hours')
        .eq('tasker_id', taskerId)
        .eq('booking_date', selectedDate)
        .eq('is_draft', false)
        .in('status', ['pending', 'confirmed', 'accepted', 'on-the-way', 'in-progress']);

      if (!error && data) {
        const blocked: string[] = [];
        data.forEach((b: any) => {
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
  }, [selectedDate, taskerId, timeSlots]);

  // 🔴 Supabase Realtime: Live slot availability updates
  useEffect(() => {
    if (!taskerId || !selectedDate) return;

    const channelName = `booking-slots-${taskerId}-${selectedDate}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `tasker_id=eq.${taskerId}`,
      }, (payload: any) => {
        const booking = payload.new || payload.old;
        // Only react to bookings for the currently selected date
        if (booking?.booking_date !== selectedDate) return;

        // Re-fetch all booked slots for this date to stay in sync
        const refreshSlots = async () => {
          const { data } = await supabase
            .from('bookings')
            .select('booking_time, hours')
            .eq('tasker_id', taskerId)
            .eq('booking_date', selectedDate)
            .eq('is_draft', false)
            .in('status', ['pending', 'confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress']);

          if (data) {
            const blocked: string[] = [];
            data.forEach((b: any) => {
              const startTime = formatDbTimeToSlot(b.booking_time);
              const startIndex = timeSlotsRef.current.indexOf(startTime);
              if (startIndex !== -1) {
                for (let i = 0; i < (b.hours || 1); i++) {
                  if (timeSlotsRef.current[startIndex + i]) {
                    blocked.push(timeSlotsRef.current[startIndex + i]);
                  }
                }
              }
            });
            setBookedTimeslots(blocked);
          }
        };
        refreshSlots();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskerId, selectedDate]);

  // Fetch addon prices from settings
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('site_settings')
        .select('id, value')
        .like('id', 'addon_price_%');

      if (data && data.length > 0) {
        const prices: Record<string, number> = { ...addonPrices };
        data.forEach((s: any) => {
          const id = s.key?.replace('addon_price_', '').replace(/_/g, '-') || s.id.replace('addon_price_', '').replace(/_/g, '-');
          prices[id] = Number(s.value);
        });
        setAddonPrices(prices);
      }
    }
    fetchSettings();
  }, []);

  // ⏱️ Payment timeout countdown — resets when entering review step
  useEffect(() => {
    if (currentStep !== 3 || paymentMethod === 'cash') {
      setTimeRemaining(paymentExpiryMinutes * 60);
      return;
    }
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          showError(toast(locale, "PAYMENT_WINDOW_EXPIRED"));
          setCurrentStep(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep, paymentMethod]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
    // Rounding down the discount to keep amounts as integers
    const paymentDiscount = (paymentMethod !== 'cash') ? Math.floor(subtotal * 0.05) : 0;

    const total = subtotal - paymentDiscount - promoDiscount;
    return Math.max(0, Math.round(total));
  };

  const getAddonsTotal = () => {
    return selectedAddons.reduce((sum, addon) => sum + (addonPrices[addon] || 0), 0);
  };

  const getAddonName = (id: string) => {
    const names: Record<string, string> = {
      "deep-clean": "Deep Clean", "eco-products": "Eco Products", "urgent": "Urgent Service", "weekend": "Weekend Service"
    };
    return names[id] || id;
  };

  const getAddonPrice = (id: string) => {
    return addonPrices[id] || 0;
  };

  const applyPromo = async () => {
    if (!promoCode) return;

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      showError(toast(locale, "PROMO_INVALID"));
      return;
    }

    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      showError(toast(locale, "PROMO_EXPIRED"));
      return;
    }

    if (data.current_uses >= data.max_uses) {
      showError(toast(locale, "PROMO_MAX_USAGE"));
      return;
    }

    const discount = (calculateTotal() * (data.discount_percent / 100));
    setPromoDiscount(discount);
    setPromoApplied(true);
    showSuccess(`Success! ${data.discount_percent}% discount applied (Rs ${discount.toFixed(0)} off).`);
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

  const getEndTime = () => {
    if (!selectedTime) return "";
    const startMatch = selectedTime.match(/(\d+):(\d+)\s(AM|PM)/);
    if (!startMatch) return "";
    let h = parseInt(startMatch[1]);
    const isPM = startMatch[3] === "PM";
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;

    const endH = h + duration;
    const endAmPm = endH >= 12 && endH < 24 ? "PM" : "AM";
    let formattedH = endH % 12;
    formattedH = formattedH ? formattedH : 12;
    return `${formattedH.toString().padStart(2, '0')}:00 ${endAmPm}`;
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
      showError(toast(locale, "LOGIN_REQUIRED"));
      router.push(`/login?redirect=/book/${taskerId}`);
      return;
    }

    // 🌍 Global Compliance: Recipient Phone Validation
    if (isBookingForFamily && recipientPhone) {
      const phoneRegex = /^9[678]\d{8}$/;
      if (!phoneRegex.test(recipientPhone)) {
        showError(toast(locale, "INVALID_PHONE"));
        setSubmitting(false);
        return;
      }
    }

    // 0. Server-Side Price Validation (prevents client-side price manipulation)
    const clientTotal = calculateTotal();
    try {
      const validateRes = await fetch("/api/bookings/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskerId: tasker.id,
          skillId: selectedService,
          hours: duration,
          addonIds: selectedAddons,
          promoCode: promoCode || undefined,
          paymentMethod,
          clientTotal,
        }),
      });
      const validateData = await validateRes.json();
      if (!validateData.valid) {
        showError(validateData.error || toast(locale, "PRICE_VALIDATION_FAILED"));
        setSubmitting(false);
        return;
      }
      // Use server-computed total for accuracy and security
      if (validateData.computedTotal) {
        setLastServerTotal(validateData.computedTotal);
      }
      if (validateData.computedTotal && Math.abs(validateData.computedTotal - clientTotal) > 1) {
        console.warn("Price adjusted by server:", { client: clientTotal, server: validateData.computedTotal });
      }
      } catch (valErr) {
        console.error("Price validation error:", valErr);
        // Non-blocking: proceed with client total if validation endpoint is down
    }

    // 1. Process Payment First (Mock)
    if (paymentMethod !== 'cash') {
      const paymentResult = await simulatePayment(paymentMethod, calculateTotal(), 'PENDING');
      if (!paymentResult.success) {
        showError(paymentResult.error || toast(locale, "PAYMENT_FAILED"));
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

    // 3. Insert Booking — use server-validated total (computedTotal from /api/bookings/validate)
    const safeTotal = typeof lastServerTotal === 'number' ? lastServerTotal : calculateTotal();
    const corePayload: any = {
      customer_id: authUser.id,
      tasker_id: tasker.id,
      service: selectedService,
      booking_date: selectedDate,
      booking_time: formatSlotToDbTime(selectedTime),
      hours: duration,
      total_amount: safeTotal,
      address: address,
      payment_method: paymentMethod,
      status: 'pending_acceptance',
    };

    // Optional fields — only include if they have values
    if (photoUrl) corePayload.task_photo_url = photoUrl;
    if (isBookingForFamily) {
      corePayload.is_family_booking = true;
      if (recipientName) corePayload.recipient_name = recipientName;
      if (recipientPhone) corePayload.recipient_phone = recipientPhone;
      if (recipientNotes) corePayload.recipient_notes = recipientNotes;
    }

    let bookingData: any = null;
    let bookingError: any = null;

    // Attempt 1: Full payload
    const res1 = await supabase.from('bookings').insert(corePayload).select('id').single();
    bookingData = res1.data;
    bookingError = res1.error;

    // Attempt 2: If failed, retry with minimal columns only
    if (bookingError) {
      console.warn("Full insert failed, retrying with core fields:", bookingError.message);
      const minimalPayload = {
        customer_id: authUser.id,
        tasker_id: tasker.id,
        service: selectedService,
        booking_date: selectedDate,
        booking_time: formatSlotToDbTime(selectedTime),
        hours: duration,
        total_amount: calculateTotal(),
        address: address,
        payment_method: paymentMethod,
        status: 'pending_acceptance',
      };
      const res2 = await supabase.from('bookings').insert(minimalPayload).select('id').single();
      bookingData = res2.data;
      bookingError = res2.error;
    }

    if (bookingError) {
      // Check for server-side conflict detection error
      if (bookingError.message?.includes('no longer available') ||
          bookingError.message?.includes('conflict') ||
          bookingError.code === '23505') {
        showError(toast(locale, "SLOT_TAKEN"));
        // Refresh booked slots to show the newly taken slot
        const { data: refreshData } = await supabase
          .from('bookings')
          .select('booking_time, hours')
          .eq('tasker_id', tasker.id)
          .eq('booking_date', selectedDate)
          .eq('is_draft', false)
          .in('status', ['pending_acceptance', 'pending', 'confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress']);
        if (refreshData) {
          const blocked: string[] = [];
          refreshData.forEach((b: any) => {
            const startTime = formatDbTimeToSlot(b.booking_time);
            const startIndex = timeSlots.indexOf(startTime);
            if (startIndex !== -1) {
              for (let i = 0; i < (b.hours || 1); i++) {
                if (timeSlots[startIndex + i]) blocked.push(timeSlots[startIndex + i]);
              }
            }
          });
          setBookedTimeslots(blocked);
        }
        setSelectedTime("");
      } else {
        showError(toast(locale, "BOOKING_SUBMIT_FAILED"));
      }
      console.error("Booking insert error:", bookingError);
      setSubmitting(false);
      return;
    }

    // 4. Cleanup Draft
    if (draftId) {
      await supabase.from('bookings').delete().eq('id', draftId);
    }

    // 5. Send System Notifications & Email
    try {
      const taskerUserId = Array.isArray(tasker.users) ? tasker.users[0]?.id : tasker.users?.id;

      const notifications = [
        {
          user_id: authUser.id,
          title: "Booking Request Sent ✅",
          message: `Your booking for ${selectedDate} at ${selectedTime} has been sent. The tasker has 30 minutes to respond. We'll notify you once they accept.`,
          type: "info",
          link: `/booking/${bookingData.id}/tracking`
        },
        {
          user_id: taskerUserId,
          title: "New Booking Request 📋",
          message: `You have a new booking request from ${userName} for ${getServiceInfo(selectedService).nameEn} on ${selectedDate} at ${selectedTime}. Accept within 30 minutes.`,
          type: "info",
          link: `/booking/${bookingData.id}/tracking`
        },
        {
          target_role: 'admin',
          title: "New Booking Created",
          message: `New order received for ${userName}. Total: Rs ${calculateTotal()}`,
          type: "info",
          link: `/admin/operations`
        }
      ].filter(n => n.user_id); // Ensure user_id exists

      await supabase.from('notifications').insert(notifications);

      // SMS to tasker — fire-and-forget
      const taskerPhone = Array.isArray(tasker.users) ? tasker.users[0]?.phone : tasker.users?.phone;
      if (taskerPhone) {
        sendTaskerAlert(
          taskerPhone,
          authUser.user_metadata?.full_name || authUser.email || "Customer",
          getServiceInfo(selectedService).nameEn,
          address
        ).catch(() => {}); // non-blocking
      }

      // Email Notification (Fallback)
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: authUser.email,
          subject: `Booking Confirmed: ${getServiceInfo(selectedService).nameEn}`,
          html: `<p>Your booking for ${selectedDate} at ${selectedTime} has been received.</p>
                 <p>Total: Rs ${calculateTotal()}</p>
                 <p>Payment: ${paymentMethod}</p>`,
        })
      });
    } catch (e) {
      console.error("Failed to send notifications", e);
    }

    setBookingId(bookingData.id);
    setConfirmedBookingId(bookingData.id);
    setBookingConfirmed(true);
    showSuccess(toast(locale, "BOOKING_CONFIRMED"));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" variant="brand" />
          <p className="text-gray-600 mt-4">Loading tasker details...</p>
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

  // 🎉 Booking Confirmation Success Screen
  if (bookingConfirmed && confirmedBookingId) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
          <p className="text-sm text-gray-500 mb-8">Your booking request has been submitted successfully.</p>

          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-bold">Service</span>
              <span className="font-black text-gray-900">{getServiceInfo(selectedService).nameEn}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-bold">Date & Time</span>
              <span className="font-black text-gray-900">{selectedDate} at {selectedTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-bold">Duration</span>
              <span className="font-black text-gray-900">{duration} {duration === 1 ? 'Hour' : 'Hours'}</span>
            </div>
            <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
              <span className="text-gray-400 font-bold">Total</span>
              <span className="font-black text-sewakhoj-red text-lg">Rs {calculateTotal()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 font-bold">Payment</span>
              <span className="font-black text-gray-900 uppercase">{paymentMethod}</span>
            </div>
            {paymentMethod !== 'cash' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Complete payment within {paymentExpiryMinutes} minutes to secure your slot
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push(`/booking/${confirmedBookingId}/tracking`)}
              className="w-full py-4 bg-sewakhoj-red text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red-light shadow-xl shadow-red-200 transition-all"
            >
              Track Your Booking
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/browse')}
              className="w-full py-3 text-gray-400 font-bold text-xs hover:text-gray-600 transition-colors"
            >
              Browse More Services
            </button>
          </div>
        </div>
      </main>
    );
  }

  const user = Array.isArray(tasker.users) ? tasker.users[0] : tasker.users;
  const userName = user?.full_name || "Unknown Tasker";

  if (authUser && user?.id && authUser.id === user.id) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 max-w-md w-full animate-in fade-in zoom-in-95">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Cannot Book Yourself</h2>
          <p className="text-gray-500 font-bold mb-8">You are currently viewing your own profile. You cannot book your own services.</p>
          <Link href="/browse" className="w-full bg-sewakhoj-red text-white px-8 py-4 rounded-xl font-black uppercase text-xs hover:bg-red-600 transition-colors block shadow-lg shadow-red-200">
            Find Other Pros
          </Link>
        </div>
      </main>
    );
  }

  const serviceInfo = getServiceInfo(selectedService);

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        title={`Book ${userName}`}
        description="Schedule a service with this tasker"
        showBack
        backHref="/browse"
        className="bg-white shadow-sm px-4 sm:px-6 lg:px-8 py-4"
        relatedLinks={[
          { href: `/tasker/${taskerId}`, label: "View Profile" },
          { href: "/services", label: "All Services" },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            {currentStep === 0 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-2">Select a Service</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Choose what you need {userName} to do</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tasker.skills?.map((skill, idx) => {
                    const svc = getServiceInfo(skill);
                    const isSelected = selectedService === skill;
                    const isSpecialty = idx < 2; // Mock: first two are specialties
                    return (
                      <div
                        key={skill}
                        onClick={() => setSelectedService(skill)}
                        className={`group relative p-6 rounded-[2rem] cursor-pointer transition-all duration-500 border-2 ${
                          isSelected
                            ? 'border-sewakhoj-red bg-red-50/50 shadow-[0_20px_40px_rgba(239,68,68,0.15)] scale-[1.02]'
                            : 'border-gray-50 bg-gray-50/50 hover:border-gray-200 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 ${isSelected ? 'bg-white shadow-md scale-110' : 'bg-white'}`}>
                            {svc.emoji}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                               <h4 className="font-black text-gray-900 tracking-tight">{svc.nameEn}</h4>
                               {isSpecialty && <span className="px-2 py-0.5 bg-gray-900 text-white text-[8px] font-black uppercase tracking-widest rounded-md">Specialty</span>}
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{svc.nameNp}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-4 right-4 w-6 h-6 bg-sewakhoj-red text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                            <Check className="w-3 h-3 stroke-[4]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    if (!selectedService) {
                      showError("Please select a service first");
                      return;
                    }
                    setCurrentStep(1);
                  }}
                  className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] mt-12 transition-all shadow-2xl flex flex-col items-center justify-center gap-0.5 ${
                    selectedService
                      ? "bg-gray-900 text-white hover:bg-black hover:scale-[1.02] shadow-gray-400/20"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                   }`}
                >
                  <span>Continue to Schedule</span>
                  <span className="text-[10px] opacity-60">समय तालिकामा जानुहोस्</span>
                </button>
              </div>
            )}

            {currentStep > 0 && (
              <div className="mb-10 px-4">
                <div className="flex items-center justify-between mb-2">
                  {['Schedule', 'Upgrades', 'Review'].map((label, i) => {
                    const step = i + 1;
                    return (
                      <div key={step} className={`flex items-center ${step < 3 ? 'flex-1' : ''}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500 ${currentStep >= step ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' : 'bg-white text-gray-300'}`}>
                          {currentStep > step ? <Check className="w-5 h-5 stroke-[3]" /> : `0${step}`}
                        </div>
                        {step < 3 && <div className={`flex-1 h-1 mx-4 rounded-full ${currentStep > step ? 'bg-gray-900' : 'bg-gray-200'}`}></div>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between px-1">
                  {['Schedule', 'Upgrades', 'Review'].map((label, i) => (
                    <span key={label} className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${currentStep >= (i + 1) ? 'text-gray-900' : 'text-gray-300'}`}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}


            {currentStep === 1 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-2">When & Where?</h2>
                <p className="text-xs font-bold text-gray-500 mb-8">Pick your preferred date, time, and location</p>

                <div className="space-y-10">
                  {/* Visual Date Picker */}
                  <div>
                    <label className="text-xs font-black text-gray-700 uppercase tracking-[0.15em] mb-4 block">Select Date</label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                        const date = new Date();
                        date.setDate(date.getDate() + i);
                        const dateStr = date.toISOString().split('T')[0];
                        const isSelected = selectedDate === dateStr;
                        const isBlocked = blockedDates.includes(dateStr);
                        return (
                          <div
                            key={i}
                            onClick={() => !isBlocked && setSelectedDate(dateStr)}
                            className={`p-4 rounded-2xl border-2 transition-all text-center ${
                              isBlocked
                                ? 'border-red-100 bg-red-50/50 cursor-not-allowed opacity-60'
                                : isSelected
                                ? 'border-gray-900 bg-gray-900 text-white shadow-xl cursor-pointer'
                                : 'border-gray-50 bg-gray-50 hover:border-gray-200 cursor-pointer'
                            }`}
                            title={isBlocked ? "Tasker unavailable on this date" : undefined}
                          >
                            <p className="text-[10px] font-black uppercase opacity-60">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                            <p className="text-lg font-black">
                              {date.getDate()}
                              {isBlocked && <span className="block text-[8px] font-black text-red-400 mt-0.5">BLOCKED</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Visual Duration Picker */}
                  <div>
                    <label className="text-xs font-black text-gray-700 uppercase tracking-[0.15em] mb-4 block">Estimated Duration</label>
                    <div className="flex flex-wrap gap-3">
                      {[1, 2, 3, 4, 8].map((h) => (
                        <button
                          key={h}
                          onClick={() => setDuration(h)}
                          className={`px-6 py-4 rounded-2xl border-2 font-black text-sm transition-all ${
                            duration === h ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {h} {h === 1 ? 'Hour' : 'Hours'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                                <label className="text-xs font-black text-gray-700 uppercase tracking-[0.15em] mb-4 block">Select Time Slot</label>
                                {scheduleBlocked && (
                                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-4">
                                    <p className="text-sm font-black text-red-700 mb-1">🚫 Tasker Unavailable</p>
                                    <p className="text-xs text-red-500 font-bold">
                                      This tasker has blocked this date. Please select another date.
                                    </p>
                                  </div>
                                )}
                                {slotsLoading && (
                                  <div className="grid grid-cols-5 gap-2 mb-4">
                                    {[0,1,2,3,4].map(i => (
                                      <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                                    ))}
                                  </div>
                                )}
                                {selectedTime && (
                                  <p className="text-xs font-bold text-gray-500 mb-3">
                                    🕐 {selectedTime} → {getEndTime()} ({duration} {duration === 1 ? 'hour' : 'hours'})
                                  </p>
                                )}
                                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
  {timeSlots.map((slot, slotIdx) => {
    const isBooked = bookedTimeslots.includes(slot);
    const isSelected = selectedTime === slot;

    const selectedIdx = timeSlots.indexOf(selectedTime);
    const isInRange = selectedIdx !== -1 && slotIdx > selectedIdx && slotIdx < selectedIdx + duration;
    const isRangeEnd = selectedIdx !== -1 && slotIdx === selectedIdx + duration - 1 && duration > 1;

    const wouldConflict = !isBooked && (() => {
      for (let i = 0; i < duration; i++) {
        if (bookedTimeslots.includes(timeSlots[slotIdx + i])) return true;
      }
      if (slotIdx + duration > timeSlots.length) return true;
      return false;
    })();

    // Disable past slots for today
        // Determine if a slot is in the past for the current day.
        // We compare the slot's hour (converted to 24‑hour format) with the
        // current hour and minute. If the slot hour is less than the current
        // hour, it is definitely in the past. If the slot hour equals the
        // current hour, we also need to check minutes – any minute past 0
        // means the slot has already started and should be disabled.
        const now = new Date();
        // Use UTC date string to match the format used when setting `selectedDate`
        // (which is derived from `date.toISOString().split('T')[0]`). This ensures
        // the comparison works correctly across time zones.
        const todayStr = now.toISOString().split('T')[0];
        const slotDb = formatSlotToDbTime(slot);
        const slotHour = parseInt(slotDb.split(':')[0], 10);
        const isPast = selectedDate === todayStr && (
          slotHour < now.getHours() ||
          (slotHour === now.getHours() && now.getMinutes() > 0)
        );

    const isDisabled = isBooked || wouldConflict || isPast;

    return (
      <button
        key={slot}
        disabled={isDisabled}
        onClick={() => setSelectedTime(slot)}
        className={`py-3 rounded-xl border-2 text-[11px] font-black transition-all relative ${
          isBooked
            ? 'bg-gray-100 border-transparent text-gray-300 cursor-not-allowed line-through'
            : wouldConflict
            ? 'bg-gray-50 border-transparent text-gray-300 cursor-not-allowed'
            : isPast
            ? 'bg-gray-200 border-transparent text-gray-400 cursor-not-allowed'
            : isSelected
            ? 'border-sewakhoj-red bg-sewakhoj-red text-white shadow-lg shadow-red-200'
            : isInRange
            ? 'border-red-200 bg-red-50 text-red-600'
            : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white'
        }`}
      >
        {slot}
        {isRangeEnd && !isSelected && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-red-500 bg-white px-1 rounded">END</span>
        )}
      </button>
    );
  })}
</div>
                      
                  </div>

                  <div>
                    <label className="text-xs font-black text-gray-700 uppercase tracking-[0.15em] mb-4 block">Service Location</label>
                    <div className="relative">
                       <MapPin className="absolute left-6 top-6 w-5 h-5 text-gray-300" />
                       <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House No, Street Name, Landmark..."
                        className="w-full bg-gray-50 border-2 border-transparent rounded-[2rem] p-6 pl-16 text-sm font-bold focus:bg-white focus:border-gray-900 transition-all outline-none"
                        rows={3}
                       />
                    </div>
                  </div>

                  {/* 🌍 GLOBAL COMPLIANCE: Family Support Feature */}
                  <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${isBookingForFamily ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-transparent'}`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><Globe className="w-5 h-5" /></div>
                        <div>
                          <h4 className="text-sm font-black text-indigo-900 tracking-tight">Booking for Family?</h4>
                          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Nepali Diaspora Support</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsBookingForFamily(!isBookingForFamily)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isBookingForFamily ? 'bg-indigo-600' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isBookingForFamily ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {isBookingForFamily && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Family Member's Name"
                            className="bg-white border border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="tel"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Nepal Phone (+977)"
                            className="bg-white border border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <textarea
                          value={recipientNotes}
                          onChange={(e) => setRecipientNotes(e.target.value)}
                          placeholder="Personal message (e.g. 'Mom, I booked this for you!')"
                          className="w-full bg-white border border-indigo-100 rounded-2xl p-6 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-12 flex gap-4">
                  <button onClick={() => setCurrentStep(0)} className="flex-1 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">Back</button>
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!selectedDate || !selectedTime || !address}
                    className="flex-[2] bg-gray-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-black shadow-2xl shadow-gray-400/20 disabled:opacity-30 disabled:shadow-none transition-all"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-10">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Premium Upgrades</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: "deep-clean", name: "Deep Clean", price: 200, emoji: "✨" },
                      { id: "eco-products", name: "Eco Products", price: 150, emoji: "🌿" },
                      { id: "urgent", name: "Urgent Priority", price: 300, emoji: "⚡" },
                      { id: "weekend", name: "Weekend Slot", price: 500, emoji: "🗓️" }
                    ].map((addon) => {
                      const isSelected = selectedAddons.includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddon(addon.id)}
                          className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col gap-3 ${
                            isSelected ? 'border-gray-900 bg-gray-900 text-white shadow-xl scale-[1.02]' : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-2xl">{addon.emoji}</span>
                          <div>
                            <p className="font-black text-sm tracking-tight">{addon.name}</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-sewakhoj-red'}`}>+Rs {addon.price}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-10">
                   <div className="flex items-center gap-4 mb-8">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight">Payment Method</h2>
                   </div>
<div className="flex flex-wrap gap-3">
                       {['esewa', 'cash'].map((m) => (
                         <button
                           key={m}
                           onClick={() => setPaymentMethod(m)}
                           className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${
                             paymentMethod === m ? 'border-gray-900 bg-gray-900 text-white shadow-lg' : 'border-gray-50 bg-gray-50 text-gray-400'
                           }`}
                         >
                           {m}
                         </button>
                       ))}
                    </div>
                </div>

                <div className="mt-12 flex gap-4">
                  <button onClick={() => setCurrentStep(1)} className="flex-1 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">Back</button>
                  <button onClick={() => setCurrentStep(3)} className="flex-[2] bg-gray-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-black shadow-2xl shadow-gray-400/20 transition-all">Review Order</button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-2">Final Review</h2>
                <p className="text-xs font-bold text-gray-500 mb-4">Confirm your booking details below</p>

                {/* ⏱️ Payment Timeout Countdown */}
                {paymentMethod !== 'cash' && (
                  <div className={`mb-6 p-4 rounded-2xl border-2 flex items-center gap-3 ${timeRemaining < 120 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-blue-50 border-blue-100'}`}>
                    <Clock className={`w-5 h-5 ${timeRemaining < 120 ? 'text-red-500' : 'text-blue-500'}`} />
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${timeRemaining < 120 ? 'text-red-600' : 'text-blue-600'}`}>
                        Payment Window
                      </p>
                      <p className={`text-lg font-black tabular-nums ${timeRemaining < 120 ? 'text-red-700' : 'text-blue-700'}`}>
                        {formatCountdown(timeRemaining)}
                      </p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold text-gray-400">Complete payment before expiry</span>
                  </div>
                )}

                <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 mb-10">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest mb-4">Booking Details</h3>
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm"><Calendar className="w-4 h-4 text-sewakhoj-red" /></div>
                        <p className="text-sm font-bold text-gray-900">{selectedDate} at {selectedTime} → {getEndTime()}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm"><Clock className="w-4 h-4 text-sewakhoj-red" /></div>
                        <p className="text-sm font-bold text-gray-900">{duration} {duration === 1 ? 'Hour' : 'Hours'} • {paymentMethod.toUpperCase()}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm"><MapPin className="w-4 h-4 text-sewakhoj-red" /></div>
                        <p className="text-sm font-bold text-gray-700">{address}</p>
                     </div>
                     {isBookingForFamily && (
                       <div className="mt-4 pt-4 border-t border-indigo-100">
                          <div className="flex items-center gap-2 mb-2">
                             <Globe className="w-3.5 h-3.5 text-indigo-600" />
                             <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Family Recipient</span>
                          </div>
                          <p className="text-sm font-black text-gray-900">{recipientName} · {recipientPhone}</p>
                       </div>
                     )}
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-8 mb-10">
                  <div className="flex items-center gap-3 mb-4">
                     <AlertCircle className="w-5 h-5 text-amber-500" />
                     <h4 className="text-[11px] font-black uppercase text-amber-900 tracking-widest">Code of Conduct</h4>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed mb-6">
                    By confirming, you agree to provide a safe working environment and ensure payment is settled upon completion.
                  </p>
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-sewakhoj-red border-sewakhoj-red shadow-lg shadow-red-200' : 'border-amber-200 bg-white group-hover:border-amber-300'}`}>
                       <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="hidden" />
                       {agreedToTerms && <Check className="w-4 h-4 text-white stroke-[4]" />}
                    </div>
                    <span className="text-sm font-black text-amber-900">I accept the SewaKhoj Protocol</span>
                  </label>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setCurrentStep(2)} className="flex-1 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">Back</button>
                  <button
                    onClick={handleBooking}
                    disabled={!agreedToTerms || submitting}
                    className="flex-[2] bg-sewakhoj-red text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-sewakhoj-red-light shadow-2xl shadow-red-500/20 disabled:opacity-30 disabled:shadow-none transition-all"
                  >
                    {submitting ? "Deploying..." : "Confirm & Deploy"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white p-8 sticky top-24">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-8">Mission Summary</h3>

              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                <div className="relative group">
                   <div className="w-20 h-20 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-[1.75rem] p-1 shadow-xl group-hover:scale-105 transition-transform duration-500">
                      <div className="w-full h-full bg-white rounded-[1.5rem] overflow-hidden flex items-center justify-center text-3xl font-black text-sewakhoj-red">
                         {user?.avatar_url ? <img src={user.avatar_url} alt={userName} className="w-full h-full object-cover" /> : userName.charAt(0)}
                      </div>
                   </div>
                   <div className="absolute -bottom-2 -right-2 bg-gray-900 text-white p-1.5 rounded-xl shadow-lg border-2 border-white">
                      <ShieldCheck className="w-4 h-4 text-green-400" />
                   </div>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 tracking-tight">{userName}</h4>
                  <div className="flex items-center gap-1.5 mt-1.5">
                     <div className="flex text-yellow-400"><Star className="w-3.5 h-3.5 fill-current" /></div>
                     <span className="text-xs font-black text-gray-900">{tasker.rating?.toFixed(1) || "4.9"}</span>
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 border-l pl-2 border-gray-200">Elite Pro</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className={`w-2 h-2 rounded-full ${tasker.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${tasker.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                      {tasker.is_online ? 'Online Now' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Score Breakdown */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <TrustScoreBreakdown taskerId={taskerId} />
              </div>

              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Rate</span>
                   <span className="text-sm font-black text-gray-900">Rs {tasker.hourly_rate}/hr</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Est. Duration</span>
                   <span className="text-sm font-black text-gray-900">{duration} Hours</span>
                </div>

                {selectedAddons.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Strategic Upgrades</p>
                    <div className="space-y-2">
                      {selectedAddons.map(id => (
                        <div key={id} className="flex justify-between items-center text-xs bg-gray-900 text-white p-4 rounded-2xl shadow-lg shadow-gray-200 transition-all hover:scale-[1.02]">
                          <span className="font-black uppercase tracking-widest">{getAddonName(id)}</span>
                          <span className="font-black text-red-400">+Rs {getAddonPrice(id)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMethod !== 'cash' && (
                  <div className="flex justify-between items-center px-4 py-3 bg-green-50 text-green-700 rounded-2xl border border-green-100 mt-6">
                    <span className="text-[10px] font-black uppercase tracking-widest">Platform Reward</span>
                    <span className="text-xs font-black">-Rs {(((tasker?.hourly_rate || 500) * duration + getAddonsTotal()) * 0.05).toFixed(0)}</span>
                  </div>
                )}

                <div className="flex justify-between items-end pt-8 mt-4 border-t-2 border-gray-900">
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Investment</p>
                     <p className="text-4xl font-black text-gray-900 tracking-tighter">Rs {calculateTotal()}</p>
                  </div>
                  <div className="mb-1">
                     <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">INC. VAT</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-black rounded-[2rem] p-6 text-white overflow-hidden relative group">
                 <div className="relative z-10">
                    <p className="text-sm font-black mb-2 flex items-center gap-2 tracking-tight"><ShieldCheck className="w-5 h-5 text-green-400"/> SewaKhoj Protocol</p>
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed">Every booking is protected by our service guarantee with 24-hour support response.</p>
                 </div>
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                    <ShieldCheck className="w-24 h-24" />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
