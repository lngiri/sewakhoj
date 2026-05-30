"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase-browser";
import Link from "next/link";
import { ShieldAlert, Search, Bell, X, Calendar, User, Info, AlertTriangle, Flame, ShieldCheck, CheckCircle2, Menu } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const channelRef = useRef<any>(null);
  const channelIdRef = useRef(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingTaskerCount, setPendingTaskerCount] = useState(0);
  const [permissions, setPermissions] = useState({
    canVerifyTaskers: false,
    canManagePayments: false,
    canManageRoles: false,
    canEditSettings: false,
    isSuperAdmin: false
  });
  const [verifying, setVerifying] = useState(true);
  const [accessDenied, setAccessDenied] = useState<{isDenied: boolean, reason: string, userId?: string}>({ isDenied: false, reason: "" });

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    channelIdRef.current += 1;
    const currentChannelId = channelIdRef.current;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const uniqueId = Math.random().toString(36).substring(2, 10);
    const channelName = `admin-notif-${user.id}-${uniqueId}`;
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload: any) => {
        if (currentChannelId === channelIdRef.current) {
          fetchNotifications();
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `target_role=eq.admin`
      }, (payload: any) => {
        if (currentChannelId === channelIdRef.current) {
          fetchNotifications();
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  // Handle body scroll lock when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [isSidebarOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    const [userNotifs, adminNotifs] = await Promise.all([
      supabase.from('notifications').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('notifications').select('*')
        .eq('target_role', 'admin')
        .order('created_at', { ascending: false }).limit(5)
    ]);

    const merged = [...(userNotifs.data || []), ...(adminNotifs.data || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    setNotifications(merged);
    setUnreadCount(merged.filter((n: any) => !n.is_read).length);
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', notifications.map((n: any) => n.id));
    setUnreadCount(0);
  };

  useEffect(() => {
    async function verifyAdmin() {
      if (!user) {
        router.push("/login?redirect=/admin");
        return;
      }

      // Use SECURITY DEFINER function to bypass RLS entirely (migration 063)
      const { data, error } = await supabase
        .rpc('get_my_staff_role');

      if (error || !data || data.length === 0) {
        console.error("Admin Verification Failed:", error);
        setAccessDenied({
          isDenied: true,
          reason: error?.message || "No role found in database.",
          userId: user.id
        });
        setVerifying(false);
        return;
      }

      const role = data[0].role === 'support' || data[0].role === 'finance' ? 'operations' : data[0].role;
      setStaffRole(role);

      setPermissions({
        canVerifyTaskers: role === 'super_admin' || role === 'operations',
        canManagePayments: role === 'super_admin' || role === 'operations',
        canManageRoles: role === 'super_admin',
        canEditSettings: role === 'super_admin',
        isSuperAdmin: role === 'super_admin'
      });

      const { count } = await supabase
        .from('taskers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingTaskerCount(count || 0);

      if (pathname === '/admin') {
        if (role === 'super_admin' || role === 'admin') {
          router.push('/admin/full-access');
        } else if (role === 'operations') {
          router.push('/admin/operations');
        }
      }

      setVerifying(false);
    }

    if (!authLoading) {
      verifyAdmin();
    }
  }, [user, authLoading, router]);

  if (authLoading || verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <LoadingSpinner size="xl" variant="neutral" className="mb-4" />
        <h2 className="text-[18px] font-black text-foreground">SewaKhoj Admin Portal</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Establishing secure connection...</p>
      </div>
    );
  }

  if (accessDenied.isDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-20 h-20 bg-admin-red-light text-primary rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-3">ACCESS DENIED</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Your account does not have permission to access the admin portal.
          Please contact the platform administrator.
        </p>

        <Link href="/">
          <Button variant="brand" size="pill">
            Return to Site
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden relative">
      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-[260px] bg-[var(--admin-sidebar)] text-white flex flex-col shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-4 py-[20px_14px] border-b border-white/10">
          <Link href="/admin" className="block hover:bg-white/5 transition-colors flex-1">
            <div className="text-[17px] font-bold text-white flex items-center gap-1">
              ⚡ SewaKhoj <span className="text-[10px] bg-sewakhoj-red text-white px-2 py-0.5 rounded-[10px] ml-1">ADMIN</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-[2px]">Management Portal</div>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-3 flex-1 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] text-gray-500 px-4 py-[10px_4px] uppercase tracking-[0.8px] opacity-50">Main</div>

          <Link href="/admin" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin' || pathname?.includes('/full-access') ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">📊</span>
            <span>Dashboard Home</span>
          </Link>

          {(staffRole === 'super_admin' || staffRole === 'operations') && (
            <Link href="/admin/operations" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/operations' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">⚙️</span>
              <span>Operations Hub</span>
            </Link>
          )}

          <Link href="/admin/taskers" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/taskers' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">👷</span>
            <span>Taskers KYC</span>
            {pendingTaskerCount > 0 && (
              <span className="ml-auto bg-sewakhoj-red text-white text-[10px] px-1.5 py-px rounded-[8px]">
                {pendingTaskerCount}
              </span>
            )}
          </Link>

          <Link href="/admin/users" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/users' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">👥</span>
            <span>User Directory</span>
          </Link>

          <Link href="/admin/duplicates" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/duplicates' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">🔍</span>
            <span>Duplicates</span>
          </Link>

          <Link href="/admin/live-map" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/live-map' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">🗺️</span>
            <span>Live Map</span>
          </Link>

          <Link href="/admin/marketing" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/marketing' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">🚀</span>
            <span>Marketing Hub</span>
          </Link>

          {permissions.canManagePayments && (
            <Link href="/admin/finance" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/finance' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">💰</span>
              <span>Finance Ledger</span>
            </Link>
          )}

          {permissions.canVerifyTaskers && (
            <Link href="/admin/support" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/support' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">🎧</span>
              <span>Support Desk</span>
            </Link>
          )}

          <div className="text-[10px] text-gray-500 px-4 pt-5 pb-1 uppercase tracking-[0.8px] opacity-50 mt-4">Settings</div>

          {permissions.canManageRoles && (
            <Link href="/admin/roles" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/roles' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">👤</span>
              <span>Role Management</span>
            </Link>
          )}

          {permissions.canEditSettings && (
            <Link href="/admin/settings" className={`flex items-center gap-2 px-4 py-2 text-[13px] transition-all border-l-[3px] ${pathname === '/admin/settings' ? 'bg-sewakhoj-red/15 text-white border-l-sewakhoj-red' : 'text-gray-400 border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">⚙️</span>
              <span>Platform Settings Hub</span>
            </Link>
          )}

          <Link href="/" className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-400 hover:bg-white/5 hover:text-white transition-all border-l-[3px] border-l-transparent mt-8">
            <span className="w-5 text-center">🏠</span>
            <span>Back to Site</span>
          </Link>
        </div>

        <div className="px-4 py-3 border-t border-white/10 text-[12px] text-gray-400">
          v1.0 · {staffRole?.replace('_', ' ')}
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 h-[65px] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-[15px] md:text-[17px] font-black text-gray-900 truncate max-w-[200px] md:max-w-none uppercase tracking-tight">
              {pathname === '/admin' || pathname.includes('/full-access') ? '📊 Dashboard Home' :
               pathname.includes('/finance') ? '💰 Finance Ledger' :
               pathname.includes('/support') ? '🎧 Support Desk' :
               pathname.includes('/roles') ? '👤 Role Management' :
               pathname.includes('/live-map') ? '🗺️ Live Map' :
               pathname.includes('/marketing') ? '🚀 Marketing Hub' :
               pathname.includes('/settings') ? '⚙️ Platform Hub' :
               pathname.includes('/users') ? '👥 User Directory' :
               pathname.includes('/operations') ? '⚙️ Operations Hub' : '👷 KYC Queue'}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAsRead(); }}
                className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:text-sewakhoj-red transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-sewakhoj-red text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[320px] bg-white rounded-[24px] shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Live Alerts</h3>
                    <button onClick={() => setShowNotifications(false)}><X className="w-3 h-3 text-gray-400" /></button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                    {notifications.length > 0 ? notifications.map(n => {
                      const NotificationWrapper = n.link ? Link : 'div';
                      return (
                        <NotificationWrapper
                          href={n.link || '#'}
                          key={n.id}
                          onClick={() => n.link && setShowNotifications(false)}
                          className={`p-4 hover:bg-gray-50 transition-all flex gap-3 ${n.link ? 'cursor-pointer block' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                            n.type === 'success' ? 'bg-green-50 text-green-600' :
                            n.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {n.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-[12px] font-black text-gray-900 leading-tight mb-1.5">{n.title}</p>
                            <p className="text-[10px] text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50/50 p-2 rounded-lg border border-gray-100 font-mono">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-widest">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        </NotificationWrapper>
                      );
                    }) : (
                      <div className="p-10 text-center text-gray-400 text-[11px] font-bold uppercase tracking-widest">No New Alerts</div>
                    )}
                  </div>
                  <Link href="/dashboard" onClick={() => setShowNotifications(false)} className="block p-3 text-center bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-sewakhoj-red transition-all">View All Activity</Link>
                </div>
              )}
            </div>
            <div className="w-[34px] h-[34px] rounded-full bg-sewakhoj-red text-white flex items-center justify-center text-[13px] font-bold uppercase shadow-lg shadow-sewakhoj-red/20">
              {user?.email?.[0] || 'A'}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
