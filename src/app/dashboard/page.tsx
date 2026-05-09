"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { services as serviceData } from "@/data/services";
import { 
  LayoutDashboard, 
  Briefcase, 
  Wallet, 
  UserCircle, 
  ShieldCheck, 
  LogOut, 
  Bell, 
  ChevronRight, 
  Star, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  MessageCircle, 
  AlertTriangle, 
  Navigation,
  History,
  FileText,
  Menu,
  X,
  CreditCard,
  Activity,
  Globe,
  Camera,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Search,
  Plus,
  Briefcase as BriefcaseIcon,
  ArrowLeft,
  LayoutGrid,
  List as ListIcon,
  Heart,
  Info
} from "lucide-react";
import ChatModal from "@/components/chat/ChatModal";

// --- Types ---
type DashboardSection = 'overview' | 'tasks' | 'finance' | 'profile' | 'security' | 'logs' | 'favorites';

interface TaskerProfile {
  id: string;
  skills: string[];
  bio: string;
  hourly_rate: number;
  experience: string;
  status: 'pending' | 'active' | 'suspended';
  id_verified: boolean;
  total_jobs: number;
  rating: number;
  total_reviews: number;
  total_rejections: number;
}

interface Booking {
  id: string;
  service: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_amount: number;
  address: string;
  customer_id: string;
  tasker_id: string;
  users?: {
    full_name: string;
    phone: string;
    avatar_url: string;
  };
  taskers?: {
    users?: {
      full_name: string;
      phone: string;
      avatar_url: string;
    }
  };
}

interface LedgerEntry {
  id: string;
  total_amount: number;
  commission_amount: number;
  type: 'receivable' | 'payable';
  status: 'pending' | 'settled';
  created_at: string;
  booking_id: string;
}



// --- Main Component ---
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-sewakhoj-red border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs animate-pulse">Loading Workspace...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useNotification();
  
  // State
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const [hasTaskerRole, setHasTaskerRole] = useState(false);
  const [isTaskerView, setIsTaskerView] = useState(user?.user_metadata?.role === 'tasker');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [taskerProfile, setTaskerProfile] = useState<TaskerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    totalEarnings: 0,
    pendingEarnings: 0
  });
  const [favoriteTaskers, setFavoriteTaskers] = useState<any[]>([]);
  const [commissionRate, setCommissionRate] = useState(0.1); // Default 10%

  // Modal States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{ bookingId: string, otherUserName: string } | null>(null);
  
  // Modal scroll lock effect
  useEffect(() => {
    if (isDetailModalOpen || activeChat) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isDetailModalOpen, activeChat]);

  // Form States
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    bio: "",
    hourlyRate: 0,
    experience: "",
    skills: [] as string[]
  });
  const [passwordForm, setPasswordForm] = useState({ new: "", confirm: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    } else if (user) {
      const section = searchParams.get('section') as DashboardSection;
      if (section) setActiveSection(section);
      fetchData();
    }
  }, [user, authLoading, router, searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      
      // First, check if they are a tasker in the database regardless of metadata
      const { data: tData } = await supabase.from('taskers').select('*').eq('user_id', user?.id).single();
      const confirmedIsTasker = !!tData;
      setHasTaskerRole(confirmedIsTasker);
      
      // If user has both roles and we haven't decided which view to show yet
      // We check session storage so we don't annoy them on every refresh
      const preferredView = sessionStorage.getItem('dashboard_view');
      if (confirmedIsTasker && !preferredView) {
        setShowRoleSelector(true);
      } else if (preferredView) {
        setIsTaskerView(preferredView === 'tasker');
      } else {
        // If they only have one role, set it accordingly
        setIsTaskerView(confirmedIsTasker);
      }

      if (confirmedIsTasker && tData && (preferredView === 'tasker' || (!preferredView && isTaskerView))) {
        setTaskerProfile(tData);
          setProfileForm({
            fullName: user?.user_metadata?.full_name || "",
            bio: tData.bio || "",
            hourlyRate: tData.hourly_rate || 0,
            experience: tData.experience || "",
            skills: tData.skills || []
          });

          const { data: bData } = await supabase
            .from('bookings')
            .select(`*, users!bookings_customer_id_fkey(full_name, phone, avatar_url)`)
            .eq('tasker_id', tData.id)
            .order('created_at', { ascending: false });
          if (bData) setBookings(bData);

          const { data: lData } = await supabase
            .from('commission_ledger')
            .select('*')
            .eq('tasker_id', tData.id)
            .order('created_at', { ascending: false });
          if (lData) setLedger(lData);

          const completed = bData?.filter((b: any) => b.status === 'completed') || [];
          const active = bData?.filter((b: any) => !['completed', 'cancelled'].includes(b.status)) || [];
          const earnings = lData?.filter((l: any) => l.status === 'settled').reduce((acc: number, curr: any) => acc + (curr.type === 'payable' ? Number(curr.total_amount) - Number(curr.commission_amount) : 0), 0) || 0;
          const pending = lData?.filter((l: any) => l.status === 'pending').reduce((acc: number, curr: any) => acc + (Number(curr.total_amount) - Number(curr.commission_amount)), 0) || 0;
          
          setStats({
            active: active.length,
            completed: completed.length,
            totalEarnings: earnings,
            pendingEarnings: pending
        });
      } else {
        const { data: bData } = await supabase
          .from('bookings')
          .select(`*, taskers(users(full_name, phone, avatar_url))`)
          .eq('customer_id', user?.id)
          .order('created_at', { ascending: false });
        if (bData) setBookings(bData as any);

        // Fetch Favorites
        const { data: fData } = await supabase
          .from('favorites')
          .select('*, tasker:taskers(*, users(full_name, avatar_url))')
          .eq('user_id', user?.id);
        if (fData) setFavoriteTaskers(fData);
      }

      const { data: logs } = await supabase
        .from('system_logs')
        .select('*')
        .or(`target_id.eq.${user?.id},admin_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (logs) setSystemLogs(logs);

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (notifs) setNotifications(notifs);

      // Fetch commission rate
      const { data: sData } = await supabase.from('site_settings').select('value').eq('id', 'platform_commission_rate').single();
      if (sData) setCommissionRate(Number(sData.value) / 100);

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    const sub = supabase
      .channel(`notifs:${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload: any) => {
        setNotifications((prev: any[]) => [payload.new, ...prev].slice(0, 10));
        setSuccess(`New Notification: ${(payload.new as any).title}`);
      })
      .subscribe();
    
    return () => { 
      supabase.removeChannel(sub); 
    };
  }, [user?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabase.from('taskers').update({
        bio: profileForm.bio,
        hourly_rate: profileForm.hourlyRate,
        experience: profileForm.experience,
        skills: profileForm.skills
      }).eq('user_id', user?.id);
      await supabase.auth.updateUser({ data: { full_name: profileForm.fullName } });
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message?.includes("network") ? "Network error. Check your connection." : "Failed to update profile. Please try again.");
      setTimeout(() => setError(null), 5000);
    } finally { setIsSubmitting(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) return setError("Passwords don't match");
    setIsSubmitting(true);
    try {
      await supabase.auth.updateUser({ password: passwordForm.new });
      setSuccess("Password updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
      setPasswordForm({ new: "", confirm: "" });
    } catch (err: any) { 
      setError("Failed to update password. Ensure it's strong enough.");
      setTimeout(() => setError(null), 5000);
    }
    finally { setIsSubmitting(false); }
  };

  const updateStatus = async (bookingId: string, status: string, extraData: any = {}) => {
    try {
      const updatePayload: any = { status };
      if (extraData.total_amount) updatePayload.total_amount = extraData.total_amount;
      
      await supabase.from('bookings').update(updatePayload).eq('id', bookingId);
      
      // Send notification to customer
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        let title = "Booking Updated";
        let message = `Your booking status has changed to ${status}.`;
        let type: 'info' | 'success' | 'warning' = 'info';

        if (extraData.adjustment_reason) {
          title = "Price Adjusted 💹";
          message = `Specialist updated the quote to Rs ${extraData.total_amount}. Reason: ${extraData.adjustment_reason}`;
          type = 'warning';
        } else if (status === 'accepted') {
          title = "Tasker Accepted! ✅";
          message = "Good news! Your tasker has accepted the booking and will arrive at the scheduled time.";
          type = 'success';
        } else if (status === 'on-the-way') {
          title = "Tasker is on the way! 🚀";
          message = "Your tasker has started their journey to your location.";
        } else if (status === 'arrived') {
          title = "Tasker has arrived! 📍";
          message = "Your specialist is at your location. Please meet them at the entrance.";
        } else if (status === 'completed') {
          title = "Job Completed! ✨";
          message = "Your tasker has marked the job as completed. Please verify and leave a review.";
          type = 'success';
        } else if (status === 'cancelled') {
          title = "Mission Reassigned? 🔄";
          message = "The specialist is unavailable. Would you like us to find another pro for you immediately?";
          type = 'warning';
        }

        await supabase.from('notifications').insert({
          user_id: booking.customer_id,
          title,
          message,
          type
        });
      }

      fetchData();
      setIsDetailModalOpen(false);
    } catch (err: any) { showError("Status update failed: " + err.message); }
  };

  const toggleSkill = (skillId: string) => {
    setProfileForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skillId) ? prev.skills.filter(s => s !== skillId) : [...prev.skills, skillId]
    }));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDeleteTaskerProfile = async () => {
    if (!window.confirm("Are you sure you want to close your Tasker profile? You will no longer appear in search results, but your customer history will be preserved.")) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('taskers').delete().eq('user_id', user?.id);
      if (error) throw error;
      
      // Update metadata to reflect change
      await supabase.auth.updateUser({ data: { role: 'customer' } });
      
      showSuccess("Tasker profile closed successfully.");
      setIsTaskerView(false);
      setHasTaskerRole(false);
      sessionStorage.setItem('dashboard_view', 'customer');
      fetchData();
    } catch (err: any) {
      showError("Failed to close tasker profile: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("CRITICAL: This will permanently delete your entire account, including all booking history and settings. This cannot be undone. Proceed?")) return;
    
    setIsSubmitting(true);
    try {
      // In a real production app, this would likely be a call to a server-side function
      // because client-side auth.deleteUser() is restricted.
      // For now, we simulate by signing out and telling them to contact support,
      // or we use a custom RPC if available.
      showError("Account deletion requires admin verification for security. We have logged your request.");
      
      // Log the request
      await supabase.from('system_logs').insert({
        action_type: 'account_deletion_request',
        target_id: user?.id,
        details: { email: user?.email, requested_at: new Date().toISOString() }
      });
      
    } catch (err: any) {
      showError("Request failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-sewakhoj-red border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs animate-pulse">Initializing Dashboard...</p>
      </div>
    );
  }



  return (
    <div className={`min-h-screen ${isTaskerView ? "bg-slate-50" : "bg-[#F8FAFC]"} flex`}>
      {/* --- Sidebar --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 ${isTaskerView ? "bg-slate-900 text-white border-slate-800" : "bg-white border-gray-100"} border-r transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className={`w-10 h-10 ${isTaskerView ? "bg-blue-600" : "bg-sewakhoj-red"} rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg`}>S</div>
            <div>
              <h1 className={`font-black ${isTaskerView ? "text-white" : "text-gray-900"} text-lg leading-tight`}>SewaKhoj</h1>
              <p className={`text-[10px] ${isTaskerView ? "text-slate-400" : "text-gray-500"} uppercase font-black tracking-widest`}>Portal HQ</p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5">
            <SidebarItem isTasker={isTaskerView} icon={<LayoutDashboard />} label="Overview" active={activeSection === 'overview'} onClick={() => { setActiveSection('overview'); setIsSidebarOpen(false); }} />
            <SidebarItem isTasker={isTaskerView} icon={<Briefcase />} label="My Tasks" active={activeSection === 'tasks'} onClick={() => { setActiveSection('tasks'); setIsSidebarOpen(false); }} badge={bookings.filter(b => b.status === 'pending').length} />
            {!isTaskerView && <SidebarItem isTasker={isTaskerView} icon={<Heart className="w-5 h-5" />} label="Saved Taskers" active={activeSection === 'favorites'} onClick={() => { setActiveSection('favorites'); setIsSidebarOpen(false); }} />}
            {isTaskerView && <SidebarItem isTasker={isTaskerView} icon={<Wallet />} label="Earnings" active={activeSection === 'finance'} onClick={() => { setActiveSection('finance'); setIsSidebarOpen(false); }} />}
            <SidebarItem isTasker={isTaskerView} icon={<UserCircle />} label="Profile & KYC" active={activeSection === 'profile'} onClick={() => { setActiveSection('profile'); setIsSidebarOpen(false); }} />
            <SidebarItem isTasker={isTaskerView} icon={<History />} label="Activity Logs" active={activeSection === 'logs'} onClick={() => { setActiveSection('logs'); setIsSidebarOpen(false); }} />
            <SidebarItem isTasker={isTaskerView} icon={<Lock />} label="Security" active={activeSection === 'security'} onClick={() => { setActiveSection('security'); setIsSidebarOpen(false); }} />
            
            {hasTaskerRole && (
              <div className="pt-4 mt-4 border-t border-gray-100/10">
                <button 
                  onClick={() => {
                    const nextView = isTaskerView ? 'customer' : 'tasker';
                    setIsTaskerView(!isTaskerView);
                    sessionStorage.setItem('dashboard_view', nextView);
                    fetchData();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${isTaskerView ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'bg-sewakhoj-red/10 text-sewakhoj-red hover:bg-sewakhoj-red/20'}`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Switch to {isTaskerView ? 'Customer' : 'Tasker'} Mode
                </button>
              </div>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="User avatar" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-sm text-gray-900 truncate">{user?.user_metadata?.full_name || "User"}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase truncate">{isTaskerView ? 'Verified Tasker' : 'Customer'}</p>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-sm">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className={`sticky top-0 z-30 ${isTaskerView ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-gray-100"} backdrop-blur-md border-b px-6 py-4 flex items-center justify-between`}>
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
            <Menu className={`w-6 h-6 ${isTaskerView ? "text-white" : "text-gray-700"}`} />
          </button>
          <h2 className={`text-sm font-black ${isTaskerView ? "text-white" : "text-gray-900"} uppercase tracking-widest hidden md:block`}>
            {activeSection} / {isTaskerView ? "Tasker Dashboard" : "Customer Area"}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative p-2 transition-colors ${isNotifOpen ? 'text-gray-900 bg-gray-100 rounded-xl' : 'text-gray-400 hover:text-gray-900'}`}
              >
                <Bell className="w-6 h-6" />
                {notifications.some(n => !n.is_read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              
              {isNotifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-[32px] shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4">
                    <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">Notifications</h4>
                      <button 
                        onClick={async () => {
                          await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id);
                          setNotifications(prev => prev.map(n => ({...n, is_read: true})));
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Mark all as read
                      </button>
                    </div>
                    <div className="max-h-96 overflow-auto divide-y divide-gray-50">
                      {notifications.length > 0 ? notifications.map(n => (
                        <div key={n.id} className={`p-4 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                          <p className="text-xs font-black text-gray-900">{n.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      )) : (
                        <div className="p-10 text-center">
                          <Bell className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                          <p className="text-[11px] font-bold text-gray-400">All caught up! ✨</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="h-8 w-px bg-gray-100"></div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-black uppercase leading-none mb-1">Local Time</p>
              <p className="text-xs font-black text-gray-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-900 px-6 py-4 rounded-2xl mb-8 font-black text-sm animate-in slide-in-from-top-4">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border-2 border-green-200 text-green-900 px-6 py-4 rounded-2xl mb-8 font-black text-sm animate-in slide-in-from-top-4">
              ✅ {success}
            </div>
          )}
          {activeSection === 'overview' && <OverviewSection isTasker={isTaskerView} stats={stats} bookings={bookings} setSelectedBooking={setSelectedBooking} setIsDetailModalOpen={setIsDetailModalOpen} taskerProfile={taskerProfile} setActiveSection={setActiveSection} />}
          {activeSection === 'tasks' && <TasksSection bookings={bookings} setSelectedBooking={setSelectedBooking} setIsDetailModalOpen={setIsDetailModalOpen} />}
          {activeSection === 'finance' && isTaskerView && <FinanceSection ledger={ledger} stats={stats} />}
          {activeSection === 'profile' && <ProfileSection isTasker={isTaskerView} taskerProfile={taskerProfile} profileForm={profileForm} setProfileForm={setProfileForm} handleUpdateProfile={handleUpdateProfile} isSubmitting={isSubmitting} toggleSkill={toggleSkill} onCloseTasker={handleDeleteTaskerProfile} />}
          {activeSection === 'favorites' && !isTaskerView && <FavoritesSection favorites={favoriteTaskers} fetchFavorites={fetchData} />}
          {activeSection === 'logs' && <LogsSection logs={systemLogs} />}
          {activeSection === 'security' && <SecuritySection passwordForm={passwordForm} setPasswordForm={setPasswordForm} handleChangePassword={handleChangePassword} isSubmitting={isSubmitting} onDeleteAccount={handleDeleteAccount} />}
        </div>
      </main>

      {/* --- Modals --- */}
      {isDetailModalOpen && selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setIsDetailModalOpen(false)} 
          updateStatus={updateStatus}
          isTasker={isTaskerView}
          commissionRate={commissionRate}
          onChat={() => {
            setActiveChat({ 
              bookingId: selectedBooking.id, 
              otherUserName: isTaskerView ? selectedBooking.users?.full_name || 'Customer' : selectedBooking.taskers?.users?.full_name || 'Tasker' 
            });
            setIsDetailModalOpen(false);
          }}
        />
      )}

      {activeChat && (
        <ChatModal 
          bookingId={activeChat.bookingId} 
          otherUserName={activeChat.otherUserName} 
          onClose={() => setActiveChat(null)} 
          currentUserId={user?.id || ''}
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

function SidebarItem({ icon, label, active, onClick, badge, isTasker }: any) {
  const activeStyles = isTasker 
    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
    : 'bg-sewakhoj-red text-white shadow-lg shadow-red-500/20';
  
  const hoverStyles = isTasker
    ? 'text-slate-400 hover:bg-white/5 hover:text-white'
    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900';

  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm group ${active ? activeStyles : hoverStyles}`}
    >
      <span className={`${active ? 'text-white' : isTasker ? 'text-slate-500 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-900'} transition-colors`}>{icon}</span>
      {label}
      {badge ? <span className={`ml-auto w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${active ? 'bg-white text-slate-900' : 'bg-red-500 text-white'}`}>{badge}</span> : null}
    </button>
  );
}

function OverviewSection({ isTasker, stats, bookings, setSelectedBooking, setIsDetailModalOpen, taskerProfile, setActiveSection }: any) {
  const isPending = isTasker && taskerProfile?.status === 'pending';
  const recentBookings = bookings.slice(0, 3);
  
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">
            {isTasker ? "Tasker Dashboard" : "Welcome back!"}
          </h3>
          <p className="text-gray-500 font-bold mt-2">
            {isTasker 
              ? "Your professional hub for managing jobs and earnings." 
              : "Everything you need to manage your service requests."}
          </p>
        </div>
        {isPending && (
          <div className="flex items-center gap-3 bg-amber-50 text-amber-700 px-6 py-3 rounded-2xl border border-amber-100 animate-pulse">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Profile Under Review</span>
          </div>
        )}
      </div>

      {/* --- Verification Roadmap for Pending Taskers --- */}
      {isPending && (
        <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-xl shadow-slate-200/50 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h4 className="text-xl font-black text-gray-900">Your Verification Roadmap</h4>
              <p className="text-sm font-bold text-gray-400">Track your progress toward becoming a verified SewaKhoj Pro.</p>
            </div>
            <div className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
              Est. Approval: 24-48 Hours
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Progress Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0" />
            
            {[
              { step: 1, label: "Submitted", desc: "Profile received", status: 'complete' },
              { step: 2, label: "KYC Review", desc: "Document check", status: 'active' },
              { step: 3, label: "Quality Audit", desc: "Skills & Bio", status: 'pending' },
              { step: 4, label: "Go Live!", desc: "Accepting Jobs", status: 'pending' }
            ].map((s, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center gap-4 group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-4 ${
                  s.status === 'complete' ? 'bg-green-500 border-green-200 text-white shadow-lg shadow-green-200' :
                  s.status === 'active' ? 'bg-amber-500 border-amber-200 text-white animate-bounce shadow-lg shadow-amber-200' :
                  'bg-white border-gray-50 text-gray-200'
                }`}>
                  {s.status === 'complete' ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-black">{s.step}</span>}
                </div>
                <div>
                  <p className={`font-black text-xs uppercase tracking-widest ${s.status === 'pending' ? 'text-gray-300' : 'text-gray-900'}`}>{s.label}</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-gray-50 bg-gray-50/50 -mx-10 -mb-10 p-10 rounded-b-[48px] flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 space-y-2">
              <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4" /> Why is this important?
              </h5>
              <p className="text-xs font-bold text-gray-500 leading-relaxed">
                Verification builds trust. Customers are 4x more likely to book Pros with a verified badge. While our team reviews your documents, you can polish your bio or add more skills to your profile.
              </p>
            </div>
            <button 
              onClick={() => setActiveSection('profile')}
              className="bg-white text-gray-900 border-2 border-gray-200 px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all whitespace-nowrap"
            >
              Polish Profile
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row (Only for active taskers or all customers) */}
      {(!isTasker || taskerProfile?.status === 'active') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Briefcase />} label={isTasker ? "Active Jobs" : "Active Tasks"} value={stats.active} color="blue" />
          <StatCard icon={<CheckCircle2 />} label="Completed" value={stats.completed} color="green" />
          {isTasker ? (
            <>
              <StatCard icon={<Activity />} label="Total Earnings" value={`Rs ${stats.totalEarnings}`} color="purple" />
              <StatCard icon={<Globe />} label="Profile Views" value={taskerProfile?.profile_views || 0} color="amber" />
            </>
          ) : (
            <>
              <StatCard icon={<Star />} label="Average Rating" value="4.9" color="purple" />
              <StatCard icon={<Activity />} label="Total Tasks" value={bookings.length} color="amber" />
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Recent Tasks</h4>
          </div>
          <div className="space-y-4">
            {recentBookings.length > 0 ? recentBookings.map((b: any) => (
              <div key={b.id} onClick={() => { setSelectedBooking(b); setIsDetailModalOpen(true); }} className="bg-white p-5 rounded-3xl border border-gray-100 hover:border-sewakhoj-red/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-red-50 transition-colors">
                    {serviceData.find(s => s.id === b.service)?.emoji || '🔧'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-black text-gray-900 truncate">{serviceData.find(s => s.id === b.service)?.nameEn || b.service}</h5>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {b.booking_date}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{b.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">Rs {b.total_amount}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Budget</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-gray-400 font-bold p-10 text-center bg-white rounded-3xl border border-dashed">No recent tasks</p>}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">System Status</h4>
          {isTasker && (
            <div className="bg-gray-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
              <ShieldCheck className="w-8 h-8 text-green-400 mb-4" />
              <h5 className="font-black text-lg mb-1">KYC Verification</h5>
              <p className="text-white/60 text-xs font-bold leading-relaxed mb-6">
                {taskerProfile?.id_verified ? "Your identity is verified." : "Verification in progress."}
              </p>
              <div className="h-1.5 w-full bg-white/10 rounded-full mb-6">
                <div className={`h-full bg-green-500 rounded-full transition-all duration-1000 ${taskerProfile?.id_verified ? 'w-full' : 'w-2/3 animate-pulse'}`}></div>
              </div>
              <button onClick={() => setActiveSection('profile')} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Manage Documents</button>
            </div>
          )}
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-3">
             <SupportLink icon={<MessageCircle className="w-4 h-4" />} label="Live Chat Support" href="/chat" color="text-green-600" />
             <SupportLink icon={<FileText className="w-4 h-4" />} label="Help Center / FAQ" href="/faq" color="text-blue-600" />
             <SupportLink icon={<Phone className="w-4 h-4" />} label="Emergency Hotline" href="tel:+9770123456" color="text-red-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksSection({ bookings, setSelectedBooking, setIsDetailModalOpen }: any) {
  const [filter, setFilter] = useState('all');
  const filtered = bookings.filter((b: any) => filter === 'all' || b.status === filter);
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-black text-gray-900">My Tasks</h3>
        <div className="flex gap-2 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          {['all', 'pending', 'accepted', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((b: any) => (
          <div key={b.id} onClick={() => { setSelectedBooking(b); setIsDetailModalOpen(true); }} className="bg-white rounded-[32px] border border-gray-100 p-6 hover:shadow-xl transition-all cursor-pointer group">
            <div className="flex justify-between mb-6">
              <div className="w-14 h-14 bg-[#F8FAFC] rounded-2xl flex items-center justify-center text-3xl group-hover:bg-red-50 transition-colors">{serviceData.find(s => s.id === b.service)?.emoji || '🔧'}</div>
              <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700">{b.status}</span>
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-1 leading-tight">{serviceData.find(s => s.id === b.service)?.nameEn || b.service}</h4>
            <p className="text-xs font-bold text-gray-500 mb-6">{b.booking_date} • {b.booking_time}</p>
            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
              <div><p className="text-[10px] text-gray-400 font-black uppercase">Budget</p><p className="text-sm font-black text-gray-900">Rs {b.total_amount}</p></div>
              <button className="text-xs font-black text-sewakhoj-red flex items-center gap-1 group-hover:translate-x-1 transition-transform">Details <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceSection({ ledger, stats }: any) {
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-black text-gray-900">Earnings & Wallet</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-sewakhoj-red rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
          <Wallet className="w-12 h-12 mb-6 opacity-20" />
          <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Available Balance</p>
          <h4 className="text-4xl font-black">Rs {stats.totalEarnings}</h4>
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between">
             <div><p className="text-white/40 text-[10px] uppercase font-black">Pending</p><p className="font-black">Rs {stats.pendingEarnings}</p></div>
             <button className="bg-white text-sewakhoj-red px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Withdraw</button>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100"><h4 className="font-black uppercase text-sm">Recent Transactions</h4></div>
          <div className="divide-y divide-gray-50">
            {ledger.map((l: any) => (
              <div key={l.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.type === 'payable' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {l.type === 'payable' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div><p className="font-black text-sm">{l.type === 'payable' ? 'Booking Earning' : 'Platform Fee'}</p><p className="text-[10px] text-gray-500 font-bold">{new Date(l.created_at).toLocaleDateString()}</p></div>
                </div>
                <p className={`font-black ${l.type === 'payable' ? 'text-green-600' : 'text-red-600'}`}>Rs {l.total_amount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ isTasker, taskerProfile, profileForm, setProfileForm, handleUpdateProfile, isSubmitting, toggleSkill, onCloseTasker }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredServices = serviceData.filter(s => 
    s.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nameNp.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-3xl font-black text-gray-900">Profile Settings</h3>
          <p className="text-gray-500 font-bold mt-2">Manage your personal information and {isTasker ? 'Tasker identity' : 'account'}.</p>
        </div>
        {isTasker && (
          <button 
            onClick={onCloseTasker}
            className="px-6 py-2 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
          >
            Close Tasker Profile
          </button>
        )}
      </div>
      <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-32 h-32 rounded-[40px] bg-gray-100 overflow-hidden border-4 border-white shadow-xl relative group flex-shrink-0">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileForm.fullName || 'User'}`} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="text-white w-8 h-8" /></div>
            </div>
            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label><input type="text" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-red-100" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Experience</label><select value={profileForm.experience} onChange={e => setProfileForm({...profileForm, experience: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-red-100"><option>0-1 years</option><option>1-3 years</option><option>3-5 years</option><option>5+ years</option></select></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Bio</label><textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold resize-none focus:ring-2 focus:ring-red-100" placeholder="Tell us about yourself..." /></div>
            </div>
          </div>
          
          {isTasker && (
            <div className="pt-8 border-t border-gray-50 space-y-6">
              <div className="flex items-center justify-between">
                <h5 className="font-black uppercase text-xs tracking-widest text-gray-400">Skills & Services</h5>
                <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase">{profileForm.skills.length} Selected</span>
              </div>
              
              {/* Active Skill Chips */}
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {profileForm.skills.map((skillId: string) => {
                  const skill = serviceData.find(s => s.id === skillId);
                  return (
                    <div key={skillId} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-2xl border-2 border-gray-100 font-black text-xs group hover:border-sewakhoj-red hover:bg-red-50 transition-all">
                      <span className="text-lg leading-none">{skill?.emoji}</span>
                      <span className="uppercase tracking-tight">{skill?.nameEn}</span>
                      <button 
                        type="button" 
                        onClick={() => toggleSkill(skillId)}
                        className="w-5 h-5 rounded-lg bg-gray-100 text-gray-400 hover:bg-sewakhoj-red hover:text-white flex items-center justify-center transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {profileForm.skills.length === 0 && (
                  <div className="flex items-center gap-2 p-4 w-full border-2 border-dashed border-gray-100 rounded-[32px] justify-center opacity-50">
                    <BriefcaseIcon className="w-4 h-4" />
                    <p className="text-xs font-bold italic">No skills selected. Use the search below to add yours.</p>
                  </div>
                )}
              </div>

              {/* Enhanced Searchable Dropdown */}
              <div className="relative pt-2">
                <div className={`flex items-center gap-3 rounded-[24px] p-4 border-2 transition-all ${isDropdownOpen ? 'bg-white border-sewakhoj-red shadow-xl shadow-red-500/5' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                  <Search className={`w-5 h-5 ${isDropdownOpen ? 'text-sewakhoj-red' : 'text-gray-400'}`} />
                  <input 
                    type="text" 
                    placeholder="Search by skill name (e.g. Plumbing, Cleaning)..." 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-gray-900 placeholder:text-gray-400"
                  />
                  {isDropdownOpen ? (
                    <button onClick={() => { setIsDropdownOpen(false); setSearchTerm(""); }} className="p-1 hover:bg-red-100 rounded-lg text-sewakhoj-red transition-colors"><X className="w-4 h-4" /></button>
                  ) : (
                    <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest hidden sm:block">Search Bar</div>
                  )}
                </div>

                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                    <div className="absolute bottom-full mb-3 left-0 right-0 bg-white rounded-[32px] border border-gray-100 shadow-2xl z-50 max-h-72 overflow-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="p-3 grid grid-cols-1 gap-1">
                        {filteredServices.length > 0 ? filteredServices.map(s => {
                          const isSelected = profileForm.skills.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              disabled={isSelected}
                              onClick={() => {
                                toggleSkill(s.id);
                                setSearchTerm("");
                                setIsDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between p-4 rounded-2xl text-left transition-all ${isSelected ? 'bg-gray-50 cursor-not-allowed' : 'hover:bg-red-50 group active:scale-95'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-colors ${isSelected ? 'bg-gray-100 grayscale' : 'bg-gray-50 group-hover:bg-white shadow-sm'}`}>{s.emoji}</div>
                                <div>
                                  <p className={`font-black text-sm uppercase tracking-tight ${isSelected ? 'text-gray-300' : 'text-gray-900'}`}>{s.nameEn}</p>
                                  <p className={`text-[10px] font-bold ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>{s.nameNp}</p>
                                </div>
                              </div>
                              {isSelected ? (
                                <div className="bg-green-50 text-green-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Added</div>
                              ) : (
                                <div className="w-8 h-8 rounded-xl bg-gray-50 group-hover:bg-sewakhoj-red group-hover:text-white flex items-center justify-center transition-all">
                                  <Plus className="w-4 h-4" />
                                </div>
                              )}
                            </button>
                          );
                        }) : (
                          <div className="p-8 text-center space-y-2">
                             <Search className="w-8 h-8 text-gray-200 mx-auto" />
                             <p className="text-sm font-bold text-gray-400">No services match your search.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-8">
           <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
             <h5 className="font-black uppercase text-sm">Account Status</h5>
             <div className={`p-6 rounded-3xl border text-center space-y-4 ${taskerProfile?.id_verified ? 'bg-green-50 border-green-100 text-green-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
               <ShieldCheck className="w-10 h-10 mx-auto" />
               <p className="font-black uppercase text-xs">{taskerProfile?.id_verified ? "Verified" : "Verification Pending"}</p>
             </div>
             {isTasker && <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400">Hourly Rate (Rs)</label><input type="number" value={profileForm.hourlyRate} onChange={e => setProfileForm({...profileForm, hourlyRate: parseInt(e.target.value)})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-black text-xl" /></div>}
             <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl shadow-gray-900/10">{isSubmitting ? "Saving..." : "Save Changes"}</button>
           </div>
        </div>
      </form>
    </div>
  );
}

function LogsSection({ logs }: any) {
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-black text-gray-900">Activity Logs</h3>
      <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden">
        <div className="responsive-table-container">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Event</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6 font-black text-[10px] uppercase text-gray-900">{log.action_type.replace(/_/g, ' ')}</td>
                  <td className="px-8 py-6 text-sm font-bold text-gray-600 truncate max-w-xs">{JSON.stringify(log.details)}</td>
                  <td className="px-8 py-6 text-right text-[10px] font-black text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SecuritySection({ passwordForm, setPasswordForm, handleChangePassword, isSubmitting, onDeleteAccount }: any) {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h3 className="text-3xl font-black text-gray-900 text-center">Security</h3>
      <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-10">
        <form onSubmit={handleChangePassword} className="space-y-8">
          <h5 className="font-black uppercase text-sm">Update Password</h5>
          <div className="space-y-4">
            <input type="password" placeholder="New Password" required value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
            <input type="password" placeholder="Confirm Password" required value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">Update Password</button>
        </form>
        <div className="pt-10 border-t border-gray-50 text-center space-y-4">
          <h5 className="font-black text-red-600 uppercase text-xs tracking-widest">Danger Zone</h5>
          <p className="text-gray-500 text-sm font-bold">Permanently delete your account and data.</p>
          <button 
            onClick={onDeleteAccount}
            className="px-8 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all"
          >
            Request Deletion
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600" };
  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4 hover:shadow-xl transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div><p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{label}</p><p className="text-2xl font-black text-gray-900">{value}</p></div>
    </div>
  );
}

function SupportLink({ icon, label, href, color }: any) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
      <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center ${color}`}>{icon}</div><span className="text-xs font-black text-gray-900 group-hover:translate-x-1 transition-transform">{label}</span></div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </Link>
  );
}

function FavoritesSection({ favorites, fetchFavorites }: any) {
  const router = useRouter();
  
  const removeFavorite = async (id: string) => {
    await supabase.from('favorites').delete().eq('id', id);
    fetchFavorites();
  };

  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-black text-gray-900">Saved Taskers</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((f: any) => (
          <div key={f.id} className="bg-white rounded-[32px] border border-gray-100 p-6 hover:shadow-xl transition-all group relative">
            <button 
              onClick={() => removeFavorite(f.id)}
              className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
            >
              <Heart className="w-4 h-4 fill-current" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden">
                {f.tasker?.users?.avatar_url ? <img src={f.tasker.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-black">{f.tasker?.users?.full_name?.[0]}</div>}
              </div>
              <div>
                <h4 className="font-black text-gray-900 truncate">{f.tasker?.users?.full_name}</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{f.tasker?.city}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Rate</p>
                <p className="text-sm font-black text-gray-900">Rs {f.tasker?.hourly_rate}/hr</p>
              </div>
              <button 
                onClick={() => router.push(`/book/${f.tasker_id}`)}
                className="bg-sewakhoj-red text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-200"
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
        {favorites.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100">
            <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h4 className="text-lg font-black text-gray-900 mb-2">No saved taskers yet</h4>
            <p className="text-gray-500 text-sm font-bold mb-8">Heart your favorite taskers while browsing to save them here.</p>
            <button onClick={() => router.push('/browse')} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">Start Browsing</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingDetailModal({ booking, onClose, updateStatus, isTasker, onChat, commissionRate }: any) {
  const displayUser = isTasker ? booking.users : booking.taskers?.users;
  const displayName = displayUser?.full_name || (isTasker ? "Customer" : "Tasker");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-8 bg-[#F8FAFC] border-b border-gray-50 flex justify-between items-start">
          <div className="flex gap-5"><div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-xl">{serviceData.find(s => s.id === booking.service)?.emoji || '🔧'}</div><div><h3 className="text-2xl font-black text-gray-900 leading-tight">{serviceData.find(s => s.id === booking.service)?.nameEn || booking.service}</h3><p className="text-gray-400 font-bold uppercase text-[10px] mt-1">ID: {booking.id.slice(0,8)}</p></div></div>
          <button onClick={onClose} className="p-3 bg-white hover:bg-gray-100 rounded-2xl shadow-sm"><X className="w-6 h-6 text-gray-500" /></button>
        </div>
        <div className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isTasker ? "Client Info" : "Tasker Info"}</h5>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center font-black">
                  {displayUser?.avatar_url ? <img src={displayUser.avatar_url} alt={displayName || "User avatar"} className="w-full h-full rounded-full object-cover" /> : (displayName?.charAt(0) || 'U')}
                </div>
                <div className="flex-1 min-w-0"><p className="font-black text-gray-900 truncate">{displayName}</p><p className="text-xs text-gray-500 font-bold">{displayUser?.phone || "No phone"}</p></div>
                <button onClick={onChat} className="w-10 h-10 bg-sewakhoj-red text-white rounded-xl flex items-center justify-center shadow-lg"><MessageCircle className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><MapPin className="w-4 h-4 text-gray-400" /> {booking.address}</div>
                <div className="flex items-center gap-3 text-sm font-bold text-gray-700"><Clock className="w-4 h-4 text-gray-400" /> {booking.booking_date} @ {booking.booking_time}</div>
              </div>
            </div>
            <div className="space-y-6">
               <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</h5>
               <div className="bg-gray-900 p-8 rounded-[40px] text-white space-y-2">
                 <p className="text-white/40 text-[10px] font-black uppercase">Earning</p>
                 <p className="text-4xl font-black">Rs {isTasker ? Number(booking.total_amount) * (1 - commissionRate) : booking.total_amount}</p>
                 <p className="text-white/40 text-[10px] font-black uppercase pt-4 border-t border-white/10">Cash on Delivery</p>
               </div>
            </div>
          </div>
          {isTasker && !['completed', 'cancelled'].includes(booking.status) && (
            <div className="flex gap-3">
              {booking.status === 'pending' && <><button onClick={() => updateStatus(booking.id, 'accepted')} className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs">Accept</button><button onClick={() => updateStatus(booking.id, 'cancelled')} className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs">Reject</button></>}
              {booking.status === 'accepted' && <button onClick={() => updateStatus(booking.id, 'on-the-way')} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-xs">Start Journey</button>}
              {booking.status === 'on-the-way' && <button onClick={() => updateStatus(booking.id, 'arrived')} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs">Arrived</button>}
              {booking.status === 'arrived' && <button onClick={() => updateStatus(booking.id, 'in-progress')} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs">Start Working</button>}
              {booking.status === 'in-progress' && (
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => {
                      const amount = window.prompt("Enter new total amount (Rs):", booking.total_amount);
                      const reason = window.prompt("Reason for adjustment (e.g., Extra parts):");
                      if (amount && reason) {
                        updateStatus(booking.id, 'in-progress', { total_amount: Number(amount), adjustment_reason: reason });
                      }
                    }}
                    className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-black uppercase text-xs hover:bg-gray-200 transition-all"
                  >
                    Adjust Price (Digital Quote)
                  </button>
                  <button onClick={() => updateStatus(booking.id, 'completed')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs">Mark Complete</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
