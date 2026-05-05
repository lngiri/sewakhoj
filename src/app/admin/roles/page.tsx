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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[18px]">
        
        {/* ASSIGN ROLE FORM */}
        <div className="lg:col-span-1">
          <div className="admin-card sticky top-6">
            <div className="admin-card-header !bg-white">
              <h3 className="text-[14px] font-bold uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Assign New Role
              </h3>
            </div>
            <div className="p-5">
              <form onSubmit={handleSearchUser} className="space-y-4">
                <div className="admin-form-group">
                  <label>Search User by Email</label>
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="user@example.com" 
                      className="admin-form-input flex-1"
                    />
                    <button type="submit" className="admin-btn admin-btn-red !p-[9px_12px]">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>

              {searchResult && (
                <div className="mt-6 p-4 rounded-xl bg-admin-blue-bg border border-admin-blue/20">
                  <p className="text-[10px] text-admin-blue font-bold uppercase mb-1">User Found</p>
                  <p className="font-bold text-[15px]">{searchResult.full_name}</p>
                  <p className="text-[12px] text-muted-foreground mb-4">{searchResult.email}</p>

                  <div className="admin-form-group mb-4">
                    <label>Select Staff Role</label>
                    <select 
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="admin-form-input"
                    >
                      <option value="admin">Admin (KYC Manager)</option>
                      <option value="finance">Finance (Ledger Manager)</option>
                      <option value="support">Support (Dispute Resolution)</option>
                      <option value="super_admin">Super Admin (DANGER)</option>
                    </select>
                  </div>

                  <button 
                    onClick={handleAssignRole}
                    disabled={assigning}
                    className="admin-btn admin-btn-red w-full !py-2.5"
                  >
                    {assigning ? "Assigning..." : "Assign Role"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EXISTING STAFF LIST */}
        <div className="lg:col-span-2">
          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="text-[14px] font-bold uppercase tracking-wider">Current Staff Members / कर्मचारीहरू</h3>
              <span className="admin-badge admin-badge-green">{staff.length} Active</span>
            </div>
            
            <div className="divide-y divide-[#e8e8e8]">
              {staff.map((member) => (
                <div key={member.user_id} className="p-6 flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center font-bold text-[14px]">
                      {member.users?.avatar_url ? <img src={member.users.avatar_url} alt="Staff avatar" className="w-full h-full object-cover" /> : member.users?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[15px]">{member.users?.full_name}</h3>
                      <p className="text-[12px] text-muted-foreground">{member.users?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className={`admin-badge 
                      ${member.role === 'super_admin' ? 'admin-badge-red' :
                        member.role === 'finance' ? 'admin-badge-green' :
                        member.role === 'support' ? 'admin-badge-blue' :
                        'admin-badge-amber'
                      }
                    `}>
                      {member.role.replace('_', ' ').toUpperCase()}
                    </span>
                    
                    <button 
                      onClick={() => handleRevokeRole(member.user_id)}
                      className="p-2 text-[#ccc] hover:text-primary transition-colors"
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
