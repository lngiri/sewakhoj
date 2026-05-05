"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { ShieldAlert, Search } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [staffRole, setStaffRole] = useState<string | null>(null);
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
    async function verifyAdmin() {
      if (!user) {
        router.push("/login?redirect=/admin");
        return;
      }
      
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('staff_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        console.error("Admin Verification Failed:", error);
        setAccessDenied({ 
          isDenied: true, 
          reason: error?.message || "No role found in database.",
          userId: user.id
        });
        setVerifying(false);
        return;
      }

      const role = data.role === 'support' || data.role === 'finance' ? 'operations' : data.role;
      setStaffRole(role);
      
      // Flexible Architecture: Permissions based logic
      setPermissions({
        canVerifyTaskers: role === 'super_admin' || role === 'operations',
        canManagePayments: role === 'super_admin' || role === 'operations',
        canManageRoles: role === 'super_admin',
        canEditSettings: role === 'super_admin',
        isSuperAdmin: role === 'super_admin'
      });

      // Auto-redirect to appropriate sub-portal if on base admin route
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6fb]">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-[18px] font-black text-foreground">SewaKhoj Admin Portal</h2>
        <p className="text-[13px] text-muted-foreground mt-1">Establishing secure connection...</p>
      </div>
    );
  }

  if (accessDenied.isDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6fb] p-6 text-center">
        <div className="w-20 h-20 bg-admin-red-light text-primary rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-foreground mb-3">ACCESS DENIED</h1>
        <p className="text-muted-foreground mb-8 max-w-md">Your account does not have permission to view the SewaKhoj Admin Portal.</p>
        
        <div className="admin-card text-left max-w-lg w-full">
          <div className="admin-card-header !bg-primary text-white">
            <h3 className="text-[14px] font-bold uppercase tracking-wider">Troubleshooting Detail</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="admin-form-group">
              <label>Your User ID</label>
              <div className="admin-form-input font-mono break-all bg-muted border-none">{accessDenied.userId}</div>
            </div>
            <div className="admin-form-group">
              <label>Database Diagnostics</label>
              <div className="admin-form-input text-primary font-bold bg-admin-red-light border-none">{accessDenied.reason}</div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <p className="text-[11px] font-bold uppercase text-muted-foreground mb-3 tracking-widest">Self-Service Fix</p>
              <ul className="text-[12px] space-y-2 text-foreground">
                <li className="flex gap-2"><span>1.</span> Copy your User ID shown above.</li>
                <li className="flex gap-2"><span>2.</span> Go to <strong>staff_roles</strong> table in Supabase.</li>
                <li className="flex gap-2"><span>3.</span> Insert new row with this ID and <strong>super_admin</strong> role.</li>
              </ul>
            </div>
          </div>
        </div>
        
        <Link href="/" className="mt-8 admin-btn admin-btn-red !px-8 !py-3">
          Return to Site
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f4f6fb] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-[230px] bg-[#1a1a2e] text-white flex flex-col shrink-0 overflow-y-auto">
        <Link href="/admin" className="p-[20px_18px_14px] border-b border-white/10 block hover:bg-white/5 transition-colors">
          <div className="text-[17px] font-bold text-white flex items-center gap-1">
            ⚡ SewaKhoj <span className="text-[10px] bg-[#C0392B] text-white px-[7px] py-[2px] rounded-[10px] ml-1">ADMIN</span>
          </div>
          <div className="text-[11px] text-[#888] mt-[2px]">Management Portal</div>
        </Link>
        
        <nav className="py-[14px] flex-1">
          <div className="text-[10px] text-gray-500 px-[18px] py-[10px_4px] uppercase tracking-[0.8px] opacity-50">Main</div>
          
          <Link href="/admin" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin' || pathname?.includes('/full-access') ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">📊</span>
            <span>Dashboard Home</span>
          </Link>

          {(staffRole === 'super_admin' || staffRole === 'operations') && (
            <Link href="/admin/operations" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/operations' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">⚙️</span>
              <span>Operations Hub</span>
            </Link>
          )}
          
          <Link href="/admin/taskers" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/taskers' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">👷</span>
            <span>Taskers KYC</span>
            <span className="ml-auto bg-[#C0392B] text-white text-[10px] px-[6px] py-[1px] rounded-[8px]">New</span>
          </Link>

          <Link href="/admin/live-map" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/live-map' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">🗺️</span>
            <span>Live Map</span>
          </Link>

          <Link href="/admin/promo" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/promo' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
            <span className="w-5 text-center">🏷️</span>
            <span>Promo Codes</span>
          </Link>

          {permissions.canManagePayments && (
            <Link href="/admin/finance" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/finance' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">💰</span>
              <span>Finance Ledger</span>
            </Link>
          )}

          {permissions.canVerifyTaskers && (
            <Link href="/admin/support" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/support' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">🎧</span>
              <span>Support Desk</span>
            </Link>
          )}

          <div className="text-[10px] color-[#555] px-[18px] py-[20px_4px] uppercase tracking-[0.8px] opacity-50 mt-4">Settings</div>
          
          {permissions.canManageRoles && (
            <Link href="/admin/roles" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/roles' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">👤</span>
              <span>Role Management</span>
            </Link>
          )}

          {permissions.isSuperAdmin && (
            <Link href="/admin/categories" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/categories' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">📂</span>
              <span>Task Categories</span>
            </Link>
          )}

          {permissions.canEditSettings && (
            <Link href="/admin/settings" className={`flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] transition-all border-l-[3px] ${pathname === '/admin/settings' ? 'bg-[#C0392B]/15 text-white border-l-[#C0392B]' : 'text-[#aaa] border-l-transparent hover:bg-white/5 hover:text-white'}`}>
              <span className="w-5 text-center">⚙️</span>
              <span>Platform Settings</span>
            </Link>
          )}

          <Link href="/" className="flex items-center gap-[10px] px-[18px] py-[10px] text-[13px] text-[#aaa] hover:bg-white/5 hover:text-white transition-all border-l-[3px] border-l-transparent mt-8">
            <span className="w-5 text-center">🏠</span>
            <span>Back to Site</span>
          </Link>
        </nav>
        
        <div className="p-[14px_18px] border-t border-white/10 text-[12px] text-[#888]">
          v1.0 · {staffRole?.replace('_', ' ')}
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-[#e8e8e8] px-6 h-[58px] flex items-center justify-between shrink-0">
          <h1 className="text-[17px] font-bold text-[#1a1a1a]">
            {pathname.includes('/finance') ? '💰 Finance Ledger' : 
             pathname.includes('/support') ? '🎧 Support Desk' : 
             pathname.includes('/roles') ? '👤 Role Management' : 
             pathname.includes('/live-map') ? '🗺️ Live Tasker Map' :
             pathname.includes('/promo') ? '🏷️ Promo Campaigns' :
             pathname.includes('/settings') ? '⚙️ Platform Settings' : 
             pathname.includes('/operations') ? '⚙️ Operations Hub' : '👷 Tasker KYC'}
          </h1>
          <div className="flex items-center gap-[14px]">
            <input className="border border-[#e8e8e8] rounded-[8px] p-[7px_12px] text-[13px] outline-none w-[200px] text-[#1a1a1a]" type="text" placeholder="Search..." />
            <div className="w-[34px] h-[34px] rounded-full bg-[#C0392B] text-white flex items-center justify-center text-[13px] font-bold uppercase">
              {user?.email?.[0] || 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-[22px_24px]">
          {children}
        </main>
      </div>
    </div>
  );
}
