"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useNotification } from "@/context/NotificationContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import {
  CopyPlus, CopyCheck, Users, Smartphone, Mail,
  AlertTriangle, Send, UserRound, Calendar, Ban,
  CheckCircle2, XCircle, Search, Filter, ChevronDown,
  ExternalLink
} from "lucide-react";

interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role: string;
  account_status: string;
  created_at: string;
  taskers?: Array<{ id: string; status: string }>;
  staff_roles?: { role: string } | null;
}

interface DuplicateGroup {
  key: string;           // the shared phone or email
  type: "phone" | "email";
  users: UserRecord[];
}

type DupTab = "all" | "phone" | "email";

export default function AdminDuplicatesPage() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { showSuccess, showError } = useNotification();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DupTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Notification modal state
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyUserId, setNotifyUserId] = useState("");
  const [notifyUserName, setNotifyUserName] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyLink, setNotifyLink] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_all_users');
      if (error) {
        console.error("admin_get_all_users RPC failed:", error);
        const { data: fallback } = await supabase
          .from("users")
          .select("*, taskers(id, status)")
          .order("created_at", { ascending: false });
        setUsers((fallback || []) as UserRecord[]);
      } else if (data) {
        setUsers(data as UserRecord[]);
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
    return <LoadingSpinner size="lg" fullPage />;
  }
  if (!isAdmin) return null;

  // ── Detection logic ──────────────────────────────────────────────
  const phoneGroups = new Map<string, UserRecord[]>();
  const emailGroups = new Map<string, UserRecord[]>();

  for (const u of users) {
    if (u.phone) {
      const existing = phoneGroups.get(u.phone) || [];
      existing.push(u);
      phoneGroups.set(u.phone, existing);
    }
    if (u.email) {
      const email = u.email.toLowerCase().trim();
      const existing = emailGroups.get(email) || [];
      existing.push(u);
      emailGroups.set(email, existing);
    }
  }

  const allDupGroups: DuplicateGroup[] = [
    ...Array.from(phoneGroups.entries())
      .filter(([_, group]) => group.length > 1)
      .map(([phone, users]) => ({ key: phone, type: "phone" as const, users })),
    ...Array.from(emailGroups.entries())
      .filter(([_, group]) => group.length > 1)
      .map(([email, users]) => ({ key: email, type: "email" as const, users })),
  ];

  // Users that appear in at least one duplicate group
  const dupUserIds = new Set(allDupGroups.flatMap(g => g.users.map(u => u.id)));

  // Filter groups by search + tab
  const filteredGroups = allDupGroups.filter(g => {
    if (activeTab === "phone" && g.type !== "phone") return false;
    if (activeTab === "email" && g.type !== "email") return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return g.key.includes(q) || g.users.some(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  });

  // Stats
  const phoneDupCount = allDupGroups.filter(g => g.type === "phone").length;
  const emailDupCount = allDupGroups.filter(g => g.type === "email").length;
  const totalDupUsers = dupUserIds.size;

  // ── Actions ──────────────────────────────────────────────────────
  const openNotifyModal = (userId: string, userName: string) => {
    setNotifyUserId(userId);
    setNotifyUserName(userName || "User");
    setNotifyTitle("");
    setNotifyMessage("");
    setNotifyLink("");
    setShowNotifyModal(true);
  };

  const sendNotification = async () => {
    if (!notifyTitle.trim() || !notifyMessage.trim()) {
      showError("Title and message are required.");
      return;
    }
    setSendingNotify(true);
    try {
      const notifications = [{
        user_id: notifyUserId,
        title: notifyTitle.trim(),
        message: notifyMessage.trim(),
        type: 'info' as const,
        link: notifyLink || null,
      }];
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
      showSuccess("Notification sent!");
      setShowNotifyModal(false);
    } catch (err: any) {
      showError(err.message || "Failed to send notification");
    } finally {
      setSendingNotify(false);
    }
  };

  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const getRoleLabel = (u: UserRecord) => {
    const staffRole = Array.isArray(u.staff_roles) ? u.staff_roles[0] : u.staff_roles;
    if (staffRole) return staffRole.role === "super_admin" ? "Super Admin" : staffRole.role;
    return u.role;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin": return "bg-red-600 text-white";
      case "admin": return "bg-purple-100 text-purple-700";
      case "tasker": return "bg-green-100 text-green-700";
      case "customer": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-200"><CheckCircle2 className="w-2.5 h-2.5" /> Active</span>;
      case "deactivated": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200"><XCircle className="w-2.5 h-2.5" /> Hidden</span>;
      case "suspended": return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-700 border border-red-200"><Ban className="w-2.5 h-2.5" /> Suspended</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 border border-gray-200"><AlertTriangle className="w-2.5 h-2.5" /> {status}</span>;
    }
  };

  const renderUserCard = (u: UserRecord, groupKey: string) => {
    const tUser = u.taskers?.[0];
    return (
      <div
        key={u.id}
        className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
      >
        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center font-bold text-gray-400 text-sm shrink-0">
          {u.avatar_url
            ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
            : u.full_name?.[0] || "?"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-start">
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 truncate">{u.full_name || "Unknown"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getRoleColor(getRoleLabel(u))}`}>
                {getRoleLabel(u)}
              </span>
              {getStatusBadge(u.account_status || "active")}
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 truncate flex items-center gap-1.5">
              <Mail className="w-3 h-3 shrink-0" /> {u.email || "—"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Smartphone className="w-3 h-3 shrink-0" /> {u.phone || "—"}
            </p>
            <p className="text-[10px] font-medium text-gray-400 mt-0.5 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> {new Date(u.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => openNotifyModal(u.id, u.full_name || "User")}
            className="p-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors"
            title="Send Notification"
          >
            <Send className="w-4 h-4" />
          </button>
          {tUser && (
            <button
              onClick={() => window.open(`/tasker/${tUser.id}`, '_blank')}
              className="p-2 rounded-xl hover:bg-purple-50 text-purple-600 transition-colors"
              title="View Public Profile"
            >
              <UserRound className="w-4 h-4" />
            </button>
          )}
          <a
            href={`https://wa.me/977${u.phone?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            title="WhatsApp"
          >
            💬
          </a>
        </div>
      </div>
    );
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">Scanning for duplicates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Duplicate Account Detector"
        description="Find users sharing the same phone number or email address"
        backHref="/admin"
        showBack
        className="mb-0"
        relatedLinks={[
          { label: "Command Center", href: "/admin", description: "Back to dashboard" },
          { label: "User Directory", href: "/admin/users", description: "All registered users" },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <CopyPlus className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{totalDupUsers}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Users in Duplicates</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{phoneDupCount}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Phone Duplicate Groups</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{emailDupCount}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Email Duplicate Groups</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{users.length}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Total Users Scanned</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or duplicate key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none pl-11 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-100 font-bold text-sm outline-none transition-all"
          />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 shrink-0 bg-gray-50 p-1 rounded-xl">
          {[
            { key: "all" as DupTab, label: "All", icon: CopyCheck },
            { key: "phone" as DupTab, label: "Phone", icon: Smartphone },
            { key: "email" as DupTab, label: "Email", icon: Mail },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className="ml-1 text-[9px] opacity-60">
                {tab.key === "all" ? allDupGroups.length :
                 tab.key === "phone" ? phoneDupCount : emailDupCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Duplicate Groups */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CopyCheck className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">No Duplicates Found</h3>
          <p className="text-sm font-medium text-gray-400 max-w-md mx-auto">
            {searchTerm
              ? "No results match your search. Try different keywords."
              : "All users have unique phone numbers and email addresses. The database is clean."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.key);
            const previewLimit = 2;

            return (
              <div
                key={`${group.type}-${group.key}`}
                className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all"
              >
                {/* Group header */}
                <button
                  onClick={() => toggleGroupExpand(group.key)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      group.type === "phone"
                        ? "bg-orange-50 text-orange-600"
                        : "bg-blue-50 text-blue-600"
                    }`}>
                      {group.type === "phone"
                        ? <Smartphone className="w-5 h-5" />
                        : <Mail className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-black text-sm text-gray-900">
                          {group.type === "phone" ? "📞" : "✉️"} {group.key}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          group.type === "phone"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {group.type === "phone" ? "Phone" : "Email"}
                        </span>
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          {group.users.length} accounts
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Shared by {group.users.map(u => u.full_name?.split(" ")[0]).join(", ")}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Group body */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
                    {group.users.map(u => renderUserCard(u, group.key))}
                  </div>
                )}

                {/* Collapsed preview */}
                {!isExpanded && (
                  <div className="px-5 pb-5 space-y-3">
                    {group.users.slice(0, previewLimit).map(u => renderUserCard(u, group.key))}
                    {group.users.length > previewLimit && (
                      <button
                        onClick={() => toggleGroupExpand(group.key)}
                        className="w-full text-center py-3 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 rounded-2xl transition-colors"
                      >
                        + {group.users.length - previewLimit} more account{group.users.length - previewLimit > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="font-bold text-sm text-gray-900">{totalDupUsers} users involved in duplicate groups</p>
            <p className="text-xs text-gray-400">{allDupGroups.length} duplicate groups detected across {users.length} total users</p>
          </div>
        </div>
        <Button variant="brand-ghost" size="pill" onClick={() => router.push("/admin/users")}>
          <ExternalLink className="w-4 h-4" /> View All Users
        </Button>
      </div>

      {/* Send Notification Modal */}
      <Modal
        open={showNotifyModal}
        onClose={() => { setShowNotifyModal(false); setNotifyTitle(""); setNotifyMessage(""); setNotifyLink(""); }}
        title={`Send Notification to ${notifyUserName}`}
        description="This will create an in-app notification visible on their dashboard."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1.5">Notification Title</label>
            <input type="text" value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
              placeholder="e.g. Duplicate Account Detected"
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-medium focus:bg-white focus:border-blue-500/20 focus:outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1.5">Message</label>
            <textarea value={notifyMessage} onChange={e => setNotifyMessage(e.target.value)} rows={3}
              placeholder="Type your message..."
              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-medium focus:bg-white focus:border-blue-500/20 focus:outline-none transition-all" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="brand" size="pill" className="flex-1" onClick={sendNotification}
            disabled={sendingNotify || !notifyTitle.trim() || !notifyMessage.trim()}>
            {sendingNotify ? "Sending..." : "Send Notification"}
          </Button>
          <Button variant="brand-ghost" size="pill" className="flex-1"
            onClick={() => { setShowNotifyModal(false); setNotifyTitle(""); setNotifyMessage(""); setNotifyLink(""); }}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
