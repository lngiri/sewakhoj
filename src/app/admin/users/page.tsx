"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase-browser";
import Link from "next/link";
import { ArrowLeft, Search, Filter, User, Shield, Clock, CheckCircle, XCircle } from "lucide-react";

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
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithTasker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          taskers(id, status, id_verified)
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setUsers(data as UserWithTasker[]);
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    
    const matchesRole = filterRole === "all" || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">ADMIN</span>;
      case "tasker":
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">TASKER</span>;
      case "customer":
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">CUSTOMER</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{role?.toUpperCase()}</span>;
    }
  };

  const getTaskerStatus = (taskers: UserWithTasker["taskers"]) => {
    if (!taskers || taskers.length === 0) return null;
    const tasker = taskers[0];
    switch (tasker.status) {
      case "active":
        return <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><CheckCircle className="w-3 h-3" /> ACTIVE</span>;
      case "pending":
        return <span className="flex items-center gap-1 text-amber-600 text-xs font-bold"><Clock className="w-3 h-3" /> PENDING</span>;
      case "rejected":
        return <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><XCircle className="w-3 h-3" /> REJECTED</span>;
      default:
        return <span className="text-gray-500 text-xs font-bold">{tasker.status?.toUpperCase()}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sewakhoj-red"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Link href="/admin" className="text-xs font-bold text-gray-500 hover:text-primary flex items-center gap-1 transition-colors uppercase tracking-widest">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">User Management</h2>
          <p className="text-gray-500 text-sm mt-1">View and manage all platform users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="tasker">Taskers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="text-sm font-bold uppercase tracking-wider">All Users ({filteredUsers.length})</h3>
        </div>
        <div className="divide-y divide-border">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No users found matching your criteria</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-muted rounded-full overflow-hidden shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                        {user.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 truncate">{user.full_name || "Unknown User"}</h4>
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      <p className="truncate">{user.email}</p>
                      <p>{user.phone}</p>
                    </div>
                    {user.role === "tasker" && user.taskers && user.taskers.length > 0 && (
                      <div className="mt-2 flex items-center gap-3">
                        {getTaskerStatus(user.taskers)}
                        {user.taskers[0].id_verified && (
                          <span className="flex items-center gap-1 text-blue-600 text-xs font-bold">
                            <Shield className="w-3 h-3" /> VERIFIED
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
