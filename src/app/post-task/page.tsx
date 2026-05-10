"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/data/services";

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
  const [success, setSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!service || !city || !description) {
      setError("Please fill out all required fields.");
      return;
    }
    
    if (description.trim().length < 20) {
      setError("Description is too short. Please provide at least 20 characters so taskers know what to do.");
      return;
    }

    if (budget && isNaN(parseInt(budget))) {
      setError("Budget must be a valid number.");
      return;
    }

    setIsSubmitting(true);
    setError("");

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
        
        // Detailed structured message for admin (Table Format)
        const adminMessage = `
┌────────────────┬──────────────────────────┐
│ SEEKER NAME    │ ${user.user_metadata?.full_name || 'User'}
├────────────────┼──────────────────────────┤
│ EMAIL          │ ${user.email}
├────────────────┼──────────────────────────┤
│ PHONE          │ ${user.user_metadata?.phone || 'N/A'}
├────────────────┼──────────────────────────┤
│ PLATFORM       │ ${platform}
├────────────────┼──────────────────────────┤
│ USER LOCATION  │ ${userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'DENIED'}
├────────────────┼──────────────────────────┤
│ TASK CITY      │ ${city.toUpperCase()}
├────────────────┼──────────────────────────┤
│ BUDGET         │ Rs ${budget || 'Negotiable'}
├────────────────┼──────────────────────────┤
│ POSTED AT      │ ${timestamp}
└────────────────┴──────────────────────────┘
        `.trim();

        const adminNotifications = admins.map((admin: any) => ({
          user_id: admin.user_id,
          title: `🚨 NEW CUSTOM REQUEST: ${serviceName}`,
          message: adminMessage,
          type: 'info',
          link: '/admin/support' // Link to support where tasks are listed
        }));

        await supabase.from('notifications').insert(adminNotifications);
      }

      // 3. Log System Event
      await supabase.from('system_logs').insert({
        action_type: 'task_broadcast',
        admin_id: null, // This is a user action
        target_id: user.id,
        details: { 
          service: service, 
          city: city, 
          budget: budget,
          is_edit: !!editId,
          user_location: userLocation,
          platform: navigator.userAgent
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Select Category</label>
                    <select 
                      required
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-2xl p-5 font-bold text-gray-900 transition-all outline-none"
                    >
                      <option value="" disabled>What do you need help with?</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.emoji} {s.nameEn} / {s.nameNp}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">Your City</label>
                    <select 
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-2xl p-5 font-bold text-gray-900 transition-all outline-none"
                    >
                      <option value="" disabled>Where is the task located?</option>
                      <option value="kathmandu">Kathmandu / काठमाडौं</option>
                      <option value="pokhara">Pokhara / पोखरा</option>
                      <option value="lalitpur">Lalitpur / ललितपुर</option>
                      <option value="bhaktapur">Bhaktapur / भक्तपुर</option>
                      <option value="biratnagar">Biratnagar / विराटनगर</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">
                    Task Details <span className="text-gray-300 font-normal ml-2">(Required)</span>
                  </label>
                  <textarea 
                    required
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., I need a plumber to fix a burst pipe under the sink. It's urgent! Please bring tools."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-2xl p-6 font-bold text-gray-900 transition-all outline-none resize-none"
                  ></textarea>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1 tracking-widest">
                    Your Budget (Rs) <span className="text-gray-300 font-normal ml-2">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">Rs</span>
                    <input 
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. 2500"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-slate-900 focus:bg-white rounded-2xl p-5 pl-14 font-bold text-gray-900 transition-all outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-tighter">You can still negotiate with bidders later.</p>
                </div>

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
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading Form...</div>}>
      <PostTaskForm />
    </Suspense>
  );
}
