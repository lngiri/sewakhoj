"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, MapPin, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { auditLog } from "@/lib/auditLog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface City {
  id: string;
  name: string;
  name_np: string;
  is_active: boolean;
}

export default function CityManagementPage() {
  const { showError, showSuccess } = useNotification();
  const { user } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCity, setNewCity] = useState({ name: "", name_np: "" });
  const [adding, setAdding] = useState(false);
  const [confirmDeleteCity, setConfirmDeleteCity] = useState<string | null>(null);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cities")
      .select("*")
      .order("name", { ascending: true });

    if (!error && data) {
      setCities(data);
    }
    setLoading(false);
  };

  const toggleCityStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("cities")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (!error) {
      await auditLog('city_status_toggled', { city_id: id, is_active: !currentStatus }, user?.id || '');
      fetchCities();
    }
  };

  const deleteCity = (id: string) => {
    setConfirmDeleteCity(id);
  };

  const executeDeleteCity = async () => {
    if (!confirmDeleteCity) return;
    const id = confirmDeleteCity;
    setConfirmDeleteCity(null);

    const { error } = await supabase
      .from("cities")
      .delete()
      .eq("id", id);

    if (!error) {
      await auditLog('city_deleted', { city_id: id }, user?.id || '');
      fetchCities();
    }
  };

  const addCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.name) return;

    setAdding(true);

    // Check if name already exists
    const { data: existing } = await supabase
      .from("cities")
      .select("id")
      .ilike("name", newCity.name)
      .maybeSingle();

    if (existing) {
      showError(`The city "${newCity.name}" is already in the system.`);
      setAdding(false);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("cities")
      .insert([newCity])
      .select("id")
      .single();

    if (!error) {
      setNewCity({ name: "", name_np: "" });
      await auditLog('city_added', { city_id: inserted?.id, name: newCity.name }, user?.id || '');
      fetchCities();
      showSuccess("City added successfully!");
    } else {
      showError("Error adding city: " + error.message);
    }
    setAdding(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-sewakhoj-red transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <MapPin className="w-8 h-8 text-sewakhoj-red" />
              City Management
            </h1>
            <p className="text-gray-500 font-medium">Manage active service areas across the platform</p>
          </div>
        </div>

        {/* Add City Form */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 mb-8">
          <h2 className="text-[12px] font-black uppercase text-gray-400 mb-4 tracking-widest">Add New City / नयाँ सहर थप्नुहोस्</h2>
          <form onSubmit={addCity} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="City Name (English)"
              value={newCity.name}
              onChange={(e) => setNewCity({...newCity, name: e.target.value})}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all font-bold"
              required
            />
            <input
              type="text"
              placeholder="City Name (Nepali)"
              value={newCity.name_np}
              onChange={(e) => setNewCity({...newCity, name_np: e.target.value})}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all font-bold"
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-sewakhoj-red text-white px-6 py-3 rounded-xl font-bold hover:bg-sewakhoj-red-light transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" /> {adding ? "Adding..." : "Add City"}
            </button>
          </form>
        </div>

        {/* Cities List */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">City Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Nepali Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest">Loading Cities...</td>
                  </tr>
                ) : cities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest">No cities found</td>
                  </tr>
                ) : (
                  cities.map((city) => (
                    <tr key={city.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-gray-900">{city.name}</td>
                      <td className="px-6 py-4 font-bold text-gray-600">{city.name_np || "-"}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleCityStatus(city.id, city.is_active)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${city.is_active ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                        >
                          {city.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {city.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteCity(city.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete City"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      <ConfirmDialog
        open={!!confirmDeleteCity}
        onCancel={() => setConfirmDeleteCity(null)}
        onConfirm={executeDeleteCity}
        title="Delete City"
        message="Are you sure you want to delete this city?"
        variant="danger"
        confirmLabel="Yes, Delete"
      />
      </div>
    </div>
  );
}
