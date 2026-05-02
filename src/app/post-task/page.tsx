"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/data/services";

export default function PostTaskPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [service, setService] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/post-task");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setError("");

    try {
      const supabase = createBrowserSupabaseClient();
      
      const { error: insertError } = await supabase
        .from("job_posts")
        .insert({
          customer_id: user.id,
          service,
          city,
          description,
          budget: budget ? parseInt(budget) : null,
          status: 'open'
        });

      if (insertError) throw insertError;
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || "Failed to post task");
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  if (!user) return null; // Will redirect

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-sewakhoj-red px-6 py-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">Post a Task</h1>
            <p className="text-red-100">Describe what you need done, and let taskers come to you.</p>
          </div>
          
          <div className="p-6 md:p-8">
            {success ? (
              <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-xl text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-2">Task Posted Successfully!</h3>
                <p>Nearby taskers have been notified. Redirecting to your dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <select 
                      required
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-sewakhoj-red outline-none"
                    >
                      <option value="" disabled>Select a service</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.emoji} {s.nameEn} / {s.nameNp}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <select 
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-sewakhoj-red outline-none"
                    >
                      <option value="" disabled>Select your city</option>
                      <option value="kathmandu">Kathmandu / काठमाडौं</option>
                      <option value="pokhara">Pokhara / पोखरा</option>
                      <option value="lalitpur">Lalitpur / ललितपुर</option>
                      <option value="bhaktapur">Bhaktapur / भक्तपुर</option>
                      <option value="biratnagar">Biratnagar / विराटनगर</option>
                      <option value="birgunj">Birgunj / वीरगञ्ज</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-gray-500 font-normal">(Be as specific as possible)</span>
                  </label>
                  <textarea 
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., I need someone to fix a leaking pipe under the kitchen sink. Must bring own tools."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-sewakhoj-red outline-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Budget (Rs) <span className="text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sewakhoj-red focus:border-sewakhoj-red outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank if you want to negotiate with the tasker.</p>
                </div>

                {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-sewakhoj-red text-white py-4 rounded-xl font-bold text-lg hover:bg-sewakhoj-red-light transition disabled:opacity-50"
                >
                  {isSubmitting ? "Posting..." : "Post Task Now"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
