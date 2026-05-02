"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserPlus, ShieldAlert, CheckCircle2, Search, Trash2 } from "lucide-react";

export default function RolesManagementPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment Form State
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("admin");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_roles')
      .select('*, users!inner(full_name, email, avatar_url)');
      
    if (data && !error) setStaff(data);
    setLoading(false);
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearchResult(null);
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('email', searchEmail.toLowerCase().trim())
      .single();

    if (error) {
      alert("User not found!");
    } else {
      setSearchResult(data);
    }
  };

  const handleAssignRole = async () => {
    if (!searchResult || !selectedRole) return;
    setAssigning(true);

    const { error } = await supabase
      .from('staff_roles')
      .upsert({ user_id: searchResult.id, role: selectedRole });

    if (error) {
      alert("Failed to assign role. Make sure you are a Super Admin.");
    } else {
      alert("Role assigned successfully!");
      setSearchEmail("");
      setSearchResult(null);
      fetchStaff();
    }
    setAssigning(false);
  };

  const handleRevokeRole = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this user's admin privileges?")) return;
    
    const { error } = await supabase
      .from('staff_roles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      alert("Failed to revoke role.");
    } else {
      fetchStaff();
    }
  };

  if (loading) return <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red mx-auto mt-20"></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
        <p className="text-gray-600 mt-2">Super Admin portal to assign staff roles (Admin, Finance, Support).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ASSIGN ROLE FORM */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
            <div className="flex items-center gap-2 mb-4 text-sewakhoj-red font-bold">
              <UserPlus className="w-5 h-5" /> Assign New Role
            </div>

            <form onSubmit={handleSearchUser} className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search User by Email</label>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="user@example.com" 
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"
                />
                <button type="submit" className="bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {searchResult && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
                <p className="text-xs text-blue-500 font-bold uppercase mb-1">User Found</p>
                <p className="font-bold text-gray-900">{searchResult.full_name}</p>
                <p className="text-sm text-gray-600 mb-4">{searchResult.email}</p>

                <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff Role</label>
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sewakhoj-red mb-4"
                >
                  <option value="admin">Admin (KYC Manager)</option>
                  <option value="finance">Finance (Ledger Manager)</option>
                  <option value="support">Support (Dispute Resolution)</option>
                  <option value="super_admin">Super Admin (DANGER)</option>
                </select>

                <button 
                  onClick={handleAssignRole}
                  disabled={assigning}
                  className="w-full bg-sewakhoj-red text-white py-2 rounded-lg font-bold hover:bg-sewakhoj-red-light disabled:opacity-50"
                >
                  {assigning ? "Assigning..." : "Assign Role"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* EXISTING STAFF LIST */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Current Staff Members</h2>
              <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">{staff.length} Active</span>
            </div>
            
            <div className="divide-y divide-gray-100">
              {staff.map((member) => (
                <div key={member.user_id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 font-bold">
                      {member.users?.avatar_url ? <img src={member.users.avatar_url} alt="" className="w-full h-full object-cover" /> : member.users?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{member.users?.full_name}</h3>
                      <p className="text-sm text-gray-500">{member.users?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                      ${member.role === 'super_admin' ? 'bg-red-100 text-red-800 border border-red-200' :
                        member.role === 'finance' ? 'bg-green-100 text-green-800 border border-green-200' :
                        member.role === 'support' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }
                    `}>
                      {member.role.replace('_', ' ')}
                    </span>
                    
                    <button 
                      onClick={() => handleRevokeRole(member.user_id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revoke Role"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
