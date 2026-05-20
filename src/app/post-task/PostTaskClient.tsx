"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/data/services";
import FormSelect from "@/components/ui/FormSelect";
import FormTextarea from "@/components/ui/FormTextarea";
import FormInput from "@/components/ui/FormInput";
import { validateFields, required, minLength, isNumeric } from "@/lib/form-validation";

function PostTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { user, loading: authLoading } = useAuth();
  
  const [service, setService] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [userIp, setUserIp] = useState<string>("Detecting...");

  useEffect(() => {
    // 1. Get GPS
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => console.warn("GPS Denied"));
    }

    // 2. Get IP
    fetch("https://api.ipify.org?format=json")
      .then(res => res.json())
      .then(data => setUserIp(data.ip))
      .catch(() => setUserIp("Unknown"));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/post-task");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (editId) {
      const fetchJob = async () => {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase.from('market_tasks').select('*').eq('id', editId).single();
        if (data && !error) {
          setService(data.category_id);
          setCity(data.location_name);
          setDescription(data.description);
          setBudget(data.budget_amount?.toString() || "");
        }
      };
      fetchJob();
    }
  }, [editId]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const errors = validateFields([
      { field: "service", validator: () => required(service, "Category") },
      { field: "city", validator: () => required(city, "City") },
      { field: "description", validator: () => required(description, "Task details") },
      { field: "description", validator: () => minLength(description, 20, "Description") },
    ]);

    if (budget) {
      const budgetErr = isNumeric(budget, "Budget");
      if (budgetErr) errors.budget = budgetErr;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setFieldErrors({});

    try {
      const supabase = createBrowserSupabaseClient();
      
      const { error: insertError } = await supabase
        .from("market_tasks")
        .upsert({
          id: editId || undefined,
          customer_id: user.id,
          title: services.find(s => s.id === service)?.nameEn || "Task",
          category_id: service,
          location_name: city,
          description,
          budget_amount: budget ? parseInt(budget) : null,
          status: 'open'
        });

      if (insertError) throw insertError;
      
      // 1. Notify Customer
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: editId ? "Task Updated! 📝" : "Task Broadcasted! 🚀",
        message: editId 
          ? `Your requirements for "${services.find(s => s.id === service)?.nameEn}" have been updated.`
          : `Your request for "${services.find(s => s.id === service)?.nameEn}" is now live. Taskers in ${city} are being notified.`,
        type: 'success'
      });

      // 2. Notify Admins (Super Admin, Operations)
      const { data: admins } = await supabase
        .from('staff_roles')
        .select('user_id')
        .in('role', ['super_admin', 'admin', 'operations']);

      if (admins && admins.length > 0) {
        const platform = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "Mobile" : "PC/Desktop";
        const timestamp = new Date().toLocaleString();
        const serviceName = services.find(s => s.id === service)?.nameEn || "Task";

        // Fraud Detection: Location Confidence
        const cityCoords: Record<string, {lat: number, lng: number}> = {
          kathmandu: { lat: 27.7172, lng: 85.3240 },
          pokhara: { lat: 28.2096, lng: 83.9856 },
          lalitpur: { lat: 27.6710, lng: 85.3240 },
          bhaktapur: { lat: 27.6710, lng: 85.4298 },
          biratnagar: { lat: 26.4525, lng: 87.2717 }
        };

        let confidence = "UNKNOWN";
        let distanceText = "N/A";

        if (userLocation && cityCoords[city.toLowerCase()]) {
          const target = cityCoords[city.toLowerCase()];
          const dist = Math.sqrt(Math.pow(userLocation.lat - target.lat, 2) + Math.pow(userLocation.lng - target.lng, 2)) * 111; // Approx km
          distanceText = `${dist.toFixed(1)}km from city`;
          confidence = dist < 40 ? "HIGH (PROXIMITY VERIFIED)" : "LOW (REMOTE POSTING)";
        }
        
        // Detailed structured message for admin (Table Format)
        const adminMessage = `
  ┌────────────────┬──────────────────────────┐
  │ SEEKER NAME    │ ${user.user_metadata?.full_name || 'User'}
  ├────────────────┼──────────────────────────┤
  │ EMAIL / PHONE  │ ${user.email} / ${user.user_metadata?.phone || 'N/A'}
  ├────────────────┼──────────────────────────┤
  │ IP ADDRESS     │ ${userIp}
  ├────────────────┼──────────────────────────┤
  │ PLATFORM       │ ${platform}
  ├────────────────┼──────────────────────────┤
  │ GPS / DISTANCE │ ${userLocation ? `${userLocation.lat.toFixed(4)},${userLocation.lng.toFixed(4)}` : 'DENIED'} (${distanceText})
  ├────────────────┼──────────────────────────┤
  │ SECURITY SCAN  │ ${confidence}
  ├────────────────┼──────────────────────────┤
  │ BUDGET         │ Rs ${budget || 'Negotiable'}
  ├────────────────┼──────────────────────────┤
  │ POSTED AT      │ ${timestamp}
  └────────────────┴──────────────────────────┘
          `.trim();

        const adminNotifications = admins.map((admin: any) => ({
          user_id: admin.user_id,
          title: confidence.includes('LOW') ? `⚠️ SUSPICIOUS POST: ${serviceName}` : `🚨 NEW CUSTOM REQUEST: ${serviceName}`,
          message: adminMessage,
          type: confidence.includes('LOW') ? 'warning' : 'info',
          link: '/admin/support' 
        }));

        await supabase.from('notifications').insert(adminNotifications);
      }

      // 3. Log System Event (Audit Trail)
      await supabase.from('system_logs').insert({
        action_type: 'task_broadcast',
        admin_id: null,
        target_id: user.id,
        details: { 
          service: service, 
          city: city, 
          budget: budget,
          user_location: userLocation,
          user_ip: userIp,
          platform: navigator.userAgent,
          security_confidence: !!userLocation
        }
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || "Failed to post task");
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Auth...</div>;
  if (!user) return null;

  const cityOptions = [
    { value: "kathmandu", label: "Kathmandu / काठमाडौं" },
    { value: "pokhara", label: "Pokhara / पोखरा" },
    { value: "lalitpur", label: "Lalitpur / ललितपुर" },
    { value: "bhaktapur", label: "Bhaktapur / भक्तपुर" },
    { value: "biratnagar", label: "Biratnagar / विराटनगर" },
  ];

  return (
    <div className="min-h-screen bg-white py-12 md:py-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-[48px] shadow-2xl shadow-slate-200/50 border border-gray-100 overflow-hidden">
          <div className="bg-slate-900 px-10 py-16 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">{editId ? "Edit Your Task" : "Describe Your Task"}</h1>
              <p className="text-slate-400 font-bold max-w-lg">{editId ? "Update your requirements to attract the best professionals." : "Fill in the details below and we'll broadcast your request to our verified pro network."}</p>
            </div>
            {/* Background Graphic */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sewakhoj-red/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
          </div>
          
          <div className="p-10 md:p-16">
            {success ? (
              <div className="bg-green-50 border-2 border-green-100 text-green-800 p-10 rounded-[32px] text-center animate-in zoom-in duration-500">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-2xl font-black mb-3">{editId ? "Task Updated!" : "Task Broadcasted!"}</h3>
                <p className="font-bold opacity-80">Check your dashboard to see incoming bids from taskers.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormSelect
                    label="Select Category"
                    placeholder="What do you need help with?"
                    value={service}
                    onChange={(e) => { setService(e.target.value); clearFieldError("service"); }}
                    error={fieldErrors.service}
                    required
                    options={services.map(s => ({ value: s.id, label: `${s.emoji} ${s.nameEn}` }))}
                  />
                  
                  <FormSelect
                    label="Your City"
                    placeholder="Where is the task located?"
                    value={city}
                    onChange={(e) => { setCity(e.target.value); clearFieldError("city"); }}
                    error={fieldErrors.city}
                    required
                    options={cityOptions}
                  />
                </div>

                <FormTextarea
                  label={
                    <>
                      Task Details <span className="text-gray-300 font-normal ml-2">(Required)</span>
                    </>
                  }
                  placeholder="e.g., I need a plumber to fix a burst pipe under the sink. It's urgent! Please bring tools."
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearFieldError("description"); }}
                  error={fieldErrors.description}
                  required
                  rows={5}
                />

                <FormInput
                  label={
                    <>
                      Your Budget (Rs) <span className="text-gray-300 font-normal ml-2">(Optional)</span>
                    </>
                  }
                  type="number"
                  value={budget}
                  onChange={(e) => { setBudget(e.target.value); clearFieldError("budget"); }}
                  error={fieldErrors.budget}
                  placeholder="e.g. 2500"
                  hint="You can still negotiate with bidders later."
                />

                {error && <div className="text-red-500 font-black text-xs uppercase bg-red-50 p-4 rounded-2xl border border-red-100 animate-shake">{error}</div>}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-sewakhoj-red text-white py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-2xl shadow-red-500/20 disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? "Broadcasting..." : (editId ? "Update Requirements" : "Broadcast Task to Pros")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PostTaskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <PostTaskForm />
    </Suspense>
  );
}
