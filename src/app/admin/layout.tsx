"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { ShieldAlert, Users, LayoutDashboard, Settings, UserPlus, DollarSign, MessageSquare } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [staffRole, setStaffRole] = useState<string | null>(null);
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

      setStaffRole(data.role);
      setVerifying(false);
    }

    if (!authLoading) {
      verifyAdmin();
    }
  }, [user, authLoading, router]);

  if (authLoading || verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <ShieldAlert className="w-16 h-16 text-sewakhoj-red mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-gray-900">Verifying Admin Access...</h2>
      </div>
    );
  }

  if (accessDenied.isDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-4xl font-black text-gray-900 mb-4">ACCESS DENIED</h1>
        <p className="text-gray-600 mb-8 max-w-md">Your account does not have permission to view the Admin Portal.</p>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 text-left max-w-lg w-full">
          <h3 className="font-bold text-red-600 mb-2">Debug Information:</h3>
          <p className="text-sm font-mono bg-gray-100 p-2 rounded mb-2 break-all"><span className="font-bold text-gray-500">Your Current User ID:</span><br/>{accessDenied.userId}</p>
          <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all"><span className="font-bold text-gray-500">Database Error:</span><br/>{accessDenied.reason}</p>
          
          <div className="mt-6 text-sm text-gray-600">
            <p className="font-bold mb-1">How to fix this:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Copy the User ID shown above.</li>
              <li>Go to your Supabase Dashboard.</li>
              <li>Open the <strong>staff_roles</strong> table.</li>
              <li>Insert a new row and paste that exact ID.</li>
              <li>Set the role to <strong>super_admin</strong> and click Save.</li>
            </ol>
          </div>
        </div>
        
        <Link href="/" className="mt-8 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition">
          Return to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2 mt-4">
          <ShieldAlert className="w-8 h-8 text-sewakhoj-red" />
          <span className="text-xl font-black tracking-tight">SewaKhoj Admin</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {(staffRole === 'super_admin' || staffRole === 'admin') && (
            <Link href="/admin/taskers" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname.includes('/admin/taskers') ? 'bg-sewakhoj-red text-white font-bold shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              <Users className="w-5 h-5" /> Tasker KYC
            </Link>
          )}

          {(staffRole === 'super_admin' || staffRole === 'finance') && (
            <Link href="/admin/finance" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname.includes('/admin/finance') ? 'bg-sewakhoj-red text-white font-bold shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              <DollarSign className="w-5 h-5" /> Finance Ledger
            </Link>
          )}

          {(staffRole === 'super_admin' || staffRole === 'support') && (
            <Link href="/admin/support" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname.includes('/admin/support') ? 'bg-sewakhoj-red text-white font-bold shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              <MessageSquare className="w-5 h-5" /> Support & Disputes
            </Link>
          )}

          {staffRole === 'super_admin' && (
            <Link href="/admin/roles" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname.includes('/admin/roles') ? 'bg-sewakhoj-red text-white font-bold shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              <UserPlus className="w-5 h-5" /> Role Management
            </Link>
          )}

          {staffRole === 'super_admin' && (
            <Link href="/admin/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${pathname.includes('/admin/settings') ? 'bg-sewakhoj-red text-white font-bold shadow-lg' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>
              <Settings className="w-5 h-5" /> Platform Settings
            </Link>
          )}
        </nav>
        
        <div className="mt-auto pt-4 border-t border-gray-800 text-xs text-gray-500 uppercase tracking-widest font-bold">
          Role: {staffRole?.replace('_', ' ')}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
