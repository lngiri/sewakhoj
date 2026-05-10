"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase-browser";
import Link from "next/link";
import { ArrowLeft, Search, Filter, Shield, CheckCircle, XCircle, Clock, ChevronDown, Check, Settings2 } from "lucide-react";

interface UserWithTasker {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role: string;
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
  { id: "tasker_status", label: "Tasker Status", defaultVisible: true },
  { id: "verified", label: "KYC Verified", defaultVisible: true },
  { id: "joined", label: "Joined Date", defaultVisible: false },
  { id: "user_id", label: "User ID", defaultVisible: false },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithTasker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)
  );
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
        setIsColumnDropdownOpen(false);
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

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    
    let effectiveRole = user.role;
    if (user.staff_roles) effectiveRole = user.staff_roles.role;

    const matchesRole = filterRole === "all" || effectiveRole === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (user: UserWithTasker) => {
    if (user.staff_roles) {
      const staffRole = user.staff_roles.role;
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-sewakhoj-red border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-black uppercase tracking-widest text-gray-400 animate-pulse">Loading Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-sewakhoj-red flex items-center gap-1 mb-2 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Database Explorer: Users & Taskers</h2>
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
                  return (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                      {visibleColumns.includes("avatar") && (
                        <td className="px-6 py-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center font-bold text-gray-400 text-sm">
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
                        <td className="px-6 py-3 text-[10px] font-mono text-gray-400 bg-gray-50/50 rounded p-1">
                          {user.id}
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
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Total Records: {filteredUsers.length}</p>
        </div>
      </div>
    </div>
  );
}
