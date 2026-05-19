"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { auditLog } from "@/lib/auditLog";
import { useNotification } from "@/context/NotificationContext";
import { UserPlus, ShieldAlert, CheckCircle2, Search, Trash2 } from "lucide-react";

export default function RolesManagementPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();

  // ALL hooks must be called before any conditional returns
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment Form State
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("admin");
  const [assigning, setAssigning] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_roles')
      .select('*, users!inner(full_name, email, avatar_url)');
       
    if (data && !error) setStaff(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchStaff();
  }, [isAdmin]);

  // Conditional returns AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sewakhoj-red" />
      </div>
    );
  }
  if (!isAdmin) return null;

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
      showError("User not found!");
      return;
    }
    setSearchResult(data);
  };

  const handleAssignRole = async () => {
    if (!searchResult || !selectedRole) return;
    setAssigning(true);
    
    const { error } = await supabase
      .from('staff_roles')
      .upsert({
        user_id: searchResult.id,
        role: selectedRole,
        assigned_by: user?.id
      }, { onConflict: 'user_id' });

    if (error) {
      showError("Failed to assign role: " + error.message);
    } else {
      showSuccess(`${searchResult.full_name} assigned as ${selectedRole}`);
      await auditLog('assign_role', { user_id: searchResult.id, role: selectedRole, email: searchResult.email }, user?.id || '');
      setSearchResult(null);
      setSearchEmail("");
      fetchStaff();
    }
    setAssigning(false);
  };

  const handleRevokeRole = async (userId: string) => {
    const { error } = await supabase
      .from('staff_roles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      showError("Failed to revoke role");
    } else {
      showSuccess("Role revoked successfully");
      await auditLog('revoke_role', { user_id: userId }, user?.id || '');
      fetchStaff();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-sewakhoj-red" />
            Role Management
          </h2>
          <p className="text-gray-500 text-sm mt-1">Assign and manage staff roles for platform administrators.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assign Role Card */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-sewakhoj-red" />
            Assign Role
          </h3>
          
          <form onSubmit={handleSearchUser} className="mb-4">
            <div className="admin-form-group mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Search User by Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="admin-form-input flex-1"
                  required
                />
                <button type="submit" className="admin-btn bg-gray-900 text-white px-4 py-2 rounded-xl">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {searchResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-bold text-green-800">{searchResult.full_name}</span>
              </div>
              <p className="text-sm text-green-600 mb-3">{searchResult.email}</p>
              
              <div className="admin-form-group mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Select Role</label>
                <select 
                  value={selectedRole} 
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="admin-form-input w-full"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="operations">Operations</option>
                  <option value="finance">Finance</option>
                  <option value="support">Support</option>
                </select>
              </div>
              
              <button
                onClick={handleAssignRole}
                disabled={assigning}
                className="admin-btn bg-sewakhoj-red text-white px-6 py-2 rounded-xl w-full"
              >
                {assigning ? "Assigning..." : "Assign Role"}
              </button>
            </div>
          )}
        </div>

        {/* Current Staff List */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-sewakhoj-red" />
            Current Staff Members
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sewakhoj-red" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No staff members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map((member) => {
                const userObj = Array.isArray(member.users) ? member.users[0] : member.users;
                return (
                  <div key={member.user_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sewakhoj-red/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-sewakhoj-red">
                          {userObj?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{userObj?.full_name}</p>
                        <p className="text-xs text-gray-500">{userObj?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="admin-badge bg-blue-100 text-blue-700 text-xs">
                        {member.role}
                      </span>
                      <button
                        onClick={() => handleRevokeRole(member.user_id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Revoke role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
