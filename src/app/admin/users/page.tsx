"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNotification } from "@/context/NotificationContext";
import { toast } from "@/lib/toast-messages";
import { useLocale } from "next-intl";
import { auditLog } from "@/lib/auditLog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ArrowLeft, Search, Filter, Shield, CheckCircle, XCircle, Clock, Check, Settings2, MoreVertical, EyeOff, Eye, Ban, Download } from "lucide-react";

interface UserWithTasker {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role: string;
  account_status: string;
  created_at: string;
  taskers?: Array<{
    id: string;
    status: string;
    id_verified: boolean;
  }>;
  staff_roles?: {
    role: string;
  } | null;
}

type ColumnDef = { id: string; label: string; defaultVisible: boolean };
const AVAILABLE_COLUMNS: ColumnDef[] = [
  { id: "avatar", label: "Avatar", defaultVisible: true },
  { id: "name", label: "Full Name", defaultVisible: true },
  { id: "email", label: "Email Address", defaultVisible: true },
  { id: "phone", label: "Phone Number", defaultVisible: true },
  { id: "role", label: "System Role", defaultVisible: true },
  { id: "account_status", label: "Account Status", defaultVisible: true },
  { id: "tasker_status", label: "Tasker Status", defaultVisible: true },
  { id: "verified", label: "KYC Verified", defaultVisible: true },
  { id: "joined", label: "Joined Date", defaultVisible: false },
  { id: "user_id", label: "User ID", defaultVisible: false },
  { id: "actions", label: "Actions", defaultVisible: true },
];

export default function AdminUsersPage() {
  const locale = useLocale();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");
  const [users, setUsers] = useState<UserWithTasker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)
  );
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const columnDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setIsColumnDropdownOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          taskers(id, status, id_verified),
          staff_roles(role)
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setUsers(data as any[]);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const [confirmAction, setConfirmAction] = useState<{ userId: string; newStatus: string; userName: string } | null>(null);

  const executeStatusChange = async () => {
    if (!confirmAction) return;
    const { userId, newStatus, userName } = confirmAction;
    const actionLabels: Record<string, string> = {
      active: 'reactivate',
      deactivated: 'deactivate',
      suspended: 'suspend',
    };
    const action = actionLabels[newStatus] || newStatus;
    try {
      const { error } = await supabase
        .from('users')
        .update({ account_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Also update tasker status if deactivating/suspending
      if (newStatus === 'deactivated' || newStatus === 'suspended') {
        await supabase
          .from('taskers')
          .update({ status: newStatus === 'deactivated' ? 'inactive' : 'suspended' })
          .eq('user_id', userId);
      } else if (newStatus === 'active') {
        // Reactivate tasker if they had one
        await supabase
          .from('taskers')
          .update({ status: 'active' })
          .eq('user_id', userId)
          .eq('status', 'suspended');
      }

      // Audit log
      await auditLog('user_status_changed', { target_user_id: userId, new_status: newStatus, reason: `Account ${action}d by admin` }, user?.id || '');

      showSuccess(`Account ${action}d successfully.`);
      setActionMenuOpen(null);
      fetchUsers();
    } catch (err: any) {
      showError(`Failed: ${err.message}`);
    }
  };

  const updateAccountStatus = (userId: string, newStatus: string, userName: string) => {
    setConfirmAction({ userId, newStatus, userName });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    
    let effectiveRole = user.role;
    const staffRoleObj = Array.isArray(user.staff_roles) ? user.staff_roles[0] : user.staff_roles;
    if (staffRoleObj) effectiveRole = staffRoleObj.role;
 
    const matchesRole = filterRole === "all" || effectiveRole === filterRole;
    const matchesStatus = filterStatus === "all" || (user.account_status || 'active') === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (user: UserWithTasker) => {
    const staffRoleObj = Array.isArray(user.staff_roles) ? user.staff_roles[0] : user.staff_roles;
    if (staffRoleObj) {
      const staffRole = staffRoleObj.role;
      if (staffRole === 'super_admin') {
        return <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-black rounded-md tracking-widest uppercase">Super Admin</span>;
      }
      return <span className="px-2 py-1 bg-gray-900 text-white text-[10px] font-black rounded-md tracking-widest uppercase">{staffRole}</span>;
    }

    switch (user.role) {
      case "admin": return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-black rounded-md tracking-widest uppercase">Admin</span>;
      case "tasker": return <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-md tracking-widest uppercase">Tasker</span>;
      case "customer": return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md tracking-widest uppercase">Customer</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[10px] font-black rounded-md tracking-widest uppercase">{user.role}</span>;
    }
  };

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success" icon={<Eye className="w-3 h-3" />}>Active</Badge>;
      case 'deactivated': return <Badge variant="neutral" icon={<EyeOff className="w-3 h-3" />}>Hidden</Badge>;
      case 'suspended': return <Badge variant="danger" icon={<Ban className="w-3 h-3" />}>Suspended</Badge>;
      default: return <Badge variant="success" icon={<Eye className="w-3 h-3" />}>Active</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-400 animate-pulse">Loading Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <PageHeader
            title="Database Explorer: Users & Taskers"
            description="View, filter, and manage all platform users."
            className="mb-0"
            relatedLinks={[
              { label: "Command Center", href: "/admin", description: "Back to dashboard" },
              { label: "Tasker Queue", href: "/admin/taskers", description: "Pending verifications" },
              { label: "Operations", href: "/admin/operations", description: "Performance & finance overview" },
            ]}
          />
        </div>
        <div className="flex gap-3">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active</p>
            <p className="text-lg font-black text-green-600">{users.filter(u => (u.account_status || 'active') === 'active').length}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hidden</p>
            <p className="text-lg font-black text-gray-400">{users.filter(u => u.account_status === 'deactivated').length}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Suspended</p>
            <p className="text-lg font-black text-red-500">{users.filter(u => u.account_status === 'suspended').length}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center z-20 relative">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search database records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-100 font-bold text-sm outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-none px-4 py-3 pr-10 rounded-xl font-bold text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="tasker">Taskers</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 md:flex-none">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full appearance-none bg-gray-50 border-none px-4 py-3 pr-10 rounded-xl font-bold text-sm text-gray-700 focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="deactivated">Hidden</option>
              <option value="suspended">Suspended</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative" ref={columnDropdownRef}>
            <button 
              onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap"
            >
              <Settings2 className="w-4 h-4" /> Columns
            </button>

            {isColumnDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-50 mb-2">Configure Table</div>
                {AVAILABLE_COLUMNS.map(col => (
                  <button 
                    key={col.id} 
                    onClick={() => toggleColumn(col.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors text-left"
                  >
                    <span className={`text-sm font-bold ${visibleColumns.includes(col.id) ? 'text-gray-900' : 'text-gray-400'}`}>{col.label}</span>
                    {visibleColumns.includes(col.id) && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-[2rem] flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
              <tr>
                {AVAILABLE_COLUMNS.map(col => visibleColumns.includes(col.id) && (
                  <th key={col.id} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-12 text-center text-gray-400 font-bold">
                    No records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const tUser = user.taskers?.[0];
                  const accStatus = user.account_status || 'active';
                  const isDeactivated = accStatus !== 'active';
                  const isHighlighted = highlightId === user.id;
                  return (
                    <tr
                      ref={isHighlighted ? (el) => { if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); } } : undefined}
                      key={user.id}
                      className={`hover:bg-blue-50/30 transition-colors group cursor-pointer ${isDeactivated ? 'opacity-60' : ''} ${isHighlighted ? 'bg-blue-100/70 ring-2 ring-blue-400 ring-inset shadow-sm' : ''}`}
                      onClick={() => router.push(`/admin/users?id=${user.id}`)}
                    >
                      {visibleColumns.includes("avatar") && (
                        <td className="px-6 py-3">
                          <div className={`w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center font-bold text-gray-400 text-sm ${isDeactivated ? 'grayscale' : ''}`}>
                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="avatar"/> : user.full_name?.[0] || 'U'}
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.includes("name") && (
                        <td className="px-6 py-3 font-bold text-sm text-gray-900">
                          {user.full_name || 'N/A'}
                        </td>
                      )}

                      {visibleColumns.includes("email") && (
                        <td className="px-6 py-3 text-sm text-gray-500 font-medium">
                          {user.email || 'N/A'}
                        </td>
                      )}

                      {visibleColumns.includes("phone") && (
                        <td className="px-6 py-3 text-sm text-gray-900 font-bold">
                          {user.phone || 'N/A'}
                        </td>
                      )}

                      {visibleColumns.includes("role") && (
                        <td className="px-6 py-3">
                          {getRoleBadge(user)}
                        </td>
                      )}

                      {visibleColumns.includes("account_status") && (
                        <td className="px-6 py-3">
                          {getAccountStatusBadge(accStatus)}
                        </td>
                      )}

                      {visibleColumns.includes("tasker_status") && (
                        <td className="px-6 py-3">
                          {tUser ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              tUser.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
                              tUser.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {tUser.status === 'active' ? <CheckCircle className="w-3 h-3" /> :
                               tUser.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {tUser.status}
                            </span>
                          ) : <span className="text-gray-300 font-bold text-xs">-</span>}
                        </td>
                      )}

                      {visibleColumns.includes("verified") && (
                        <td className="px-6 py-3">
                          {tUser ? (
                            tUser.id_verified ? (
                              <span className="inline-flex items-center gap-1 text-blue-600 font-black text-xs">
                                <Shield className="w-4 h-4" /> YES
                              </span>
                            ) : (
                              <span className="text-gray-400 font-bold text-xs">NO</span>
                            )
                          ) : <span className="text-gray-300 font-bold text-xs">-</span>}
                        </td>
                      )}

                      {visibleColumns.includes("joined") && (
                        <td className="px-6 py-3 text-xs font-bold text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      )}

                      {visibleColumns.includes("user_id") && (
                        <td className="px-6 py-3 text-[10px] font-mono text-gray-400">
                          {user.id.slice(0, 8)}...
                        </td>
                      )}

                      {visibleColumns.includes("actions") && (
                        <td className="px-6 py-3 relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionMenuOpen(actionMenuOpen === user.id ? null : user.id); }}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>

                          {actionMenuOpen === user.id && (
                            <div ref={actionMenuRef} className="absolute right-6 top-full mt-1 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                              <div className="px-3 py-2 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-50 mb-1">{user.full_name}</div>
                              
                              {accStatus === 'active' ? (
                                <>
                                  <button onClick={() => updateAccountStatus(user.id, 'deactivated', user.full_name)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors text-left">
                                    <EyeOff className="w-4 h-4" /> Deactivate (Hide)
                                  </button>
                                  <button onClick={() => updateAccountStatus(user.id, 'suspended', user.full_name)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left">
                                    <Ban className="w-4 h-4" /> Suspend
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => updateAccountStatus(user.id, 'active', user.full_name)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 rounded-xl transition-colors text-left">
                                  <Eye className="w-4 h-4" /> Reactivate
                                </button>
                              )}

                              <a
                                href={`https://wa.me/977${user.phone?.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors text-left"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 p-4 border-t border-gray-100 text-right">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Showing {filteredUsers.length} of {users.length} Records</p>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onCancel={() => setConfirmAction(null)}
        onConfirm={executeStatusChange}
        title="Confirm Account Action"
        message={`Are you sure you want to ${(() => {
          const labels: Record<string, string> = { active: 'reactivate', deactivated: 'deactivate', suspended: 'suspend' };
          return labels[confirmAction?.newStatus || ''] || confirmAction?.newStatus || '';
        })()} the account for "${confirmAction?.userName}"?`}
        variant="danger"
        confirmLabel="Yes, Proceed"
      />

    </div>
  );
}
