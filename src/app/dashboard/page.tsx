"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useAuth } from "@/context/AuthContext";
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
  Lock
} from "lucide-react";
import ChatModal from "@/components/chat/ChatModal";

// --- Types ---
type DashboardSection = 'overview' | 'tasks' | 'finance' | 'profile' | 'security' | 'logs';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  // State
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [taskerProfile, setTaskerProfile] = useState<TaskerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    totalEarnings: 0,
    pendingEarnings: 0
  });

  // Modal States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{ bookingId: string, otherUserName: string } | null>(null);

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
      const supabase = createBrowserSupabaseClient();
      const isTasker = user?.user_metadata?.role === 'tasker';

      if (isTasker) {
        const { data: tData } = await supabase.from('taskers').select('*').eq('user_id', user?.id).single();
        if (tData) {
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

          const completed = bData?.filter(b => b.status === 'completed') || [];
          const active = bData?.filter(b => !['completed', 'cancelled'].includes(b.status)) || [];
          const earnings = lData?.filter(l => l.status === 'settled').reduce((acc, curr) => acc + (curr.type === 'payable' ? Number(curr.total_amount) - Number(curr.commission_amount) : 0), 0) || 0;
          const pending = lData?.filter(l => l.status === 'pending').reduce((acc, curr) => acc + (Number(curr.total_amount) - Number(curr.commission_amount)), 0) || 0;
          
          setStats({
            active: active.length,
            completed: completed.length,
            totalEarnings: earnings,
            pendingEarnings: pending
          });
        }
      } else {
        const { data: bData } = await supabase
          .from('bookings')
          .select(`*, taskers(users(full_name, phone, avatar_url))`)
          .eq('customer_id', user?.id)
          .order('created_at', { ascending: false });
        if (bData) setBookings(bData as any);
      }

      const { data: logs } = await supabase
        .from('system_logs')
        .select('*')
        .or(`target_id.eq.${user?.id},admin_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (logs) setSystemLogs(logs);

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.from('taskers').update({
        bio: profileForm.bio,
        hourly_rate: profileForm.hourlyRate,
        experience: profileForm.experience,
        skills: profileForm.skills
      }).eq('user_id', user?.id);
      await supabase.auth.updateUser({ data: { full_name: profileForm.fullName } });
      alert("Profile updated!");
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally { setIsSubmitting(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) return alert("Passwords don't match");
    setIsSubmitting(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.updateUser({ password: passwordForm.new });
      alert("Password updated!");
      setPasswordForm({ new: "", confirm: "" });
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setIsSubmitting(false); }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.from('bookings').update({ status }).eq('id', bookingId);
      fetchData();
      setIsDetailModalOpen(false);
    } catch (err: any) { alert("Status update failed: " + err.message); }
  };

  const toggleSkill = (skillId: string) => {
    setProfileForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skillId) ? prev.skills.filter(s => s !== skillId) : [...prev.skills, skillId]
    }));
  };

  const logout = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-sewakhoj-red border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs animate-pulse">Initializing Dashboard...</p>
      </div>
    );
  }

  const isTasker = user?.user_metadata?.role === 'tasker';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* --- Sidebar --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-sewakhoj-red rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-500/20">S</div>
            <div>
              <h1 className="font-black text-gray-900 text-lg leading-tight">SewaKhoj</h1>
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Portal HQ</p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5">
            <SidebarItem icon={<LayoutDashboard />} label="Overview" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} />
            <SidebarItem icon={<Briefcase />} label="My Tasks" active={activeSection === 'tasks'} onClick={() => setActiveSection('tasks')} badge={bookings.filter(b => b.status === 'pending').length} />
            {isTasker && <SidebarItem icon={<Wallet />} label="Earnings" active={activeSection === 'finance'} onClick={() => setActiveSection('finance')} />}
            <SidebarItem icon={<UserCircle />} label="Profile & KYC" active={activeSection === 'profile'} onClick={() => setActiveSection('profile')} />
            <SidebarItem icon={<History />} label="Activity Logs" active={activeSection === 'logs'} onClick={() => setActiveSection('logs')} />
            <SidebarItem icon={<Lock />} label="Security" active={activeSection === 'security'} onClick={() => setActiveSection('security')} />
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-sm text-gray-900 truncate">{user?.user_metadata?.full_name || "User"}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase truncate">{isTasker ? 'Verified Tasker' : 'Customer'}</p>
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
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest hidden md:block">
            {activeSection} / {isTasker ? "Tasker Dashboard" : "Customer Area"}
          </h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-gray-100"></div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-black uppercase leading-none mb-1">Local Time</p>
              <p className="text-xs font-black text-gray-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          {activeSection === 'overview' && <OverviewSection isTasker={isTasker} stats={stats} bookings={bookings} setSelectedBooking={setSelectedBooking} setIsDetailModalOpen={setIsDetailModalOpen} taskerProfile={taskerProfile} setActiveSection={setActiveSection} />}
          {activeSection === 'tasks' && <TasksSection bookings={bookings} setSelectedBooking={setSelectedBooking} setIsDetailModalOpen={setIsDetailModalOpen} />}
          {activeSection === 'finance' && isTasker && <FinanceSection ledger={ledger} stats={stats} />}
          {activeSection === 'profile' && <ProfileSection isTasker={isTasker} taskerProfile={taskerProfile} profileForm={profileForm} setProfileForm={setProfileForm} handleUpdateProfile={handleUpdateProfile} isSubmitting={isSubmitting} toggleSkill={toggleSkill} />}
          {activeSection === 'logs' && <LogsSection logs={systemLogs} />}
          {activeSection === 'security' && <SecuritySection passwordForm={passwordForm} setPasswordForm={setPasswordForm} handleChangePassword={handleChangePassword} isSubmitting={isSubmitting} />}
        </div>
      </main>

      {/* --- Modals --- */}
      {isDetailModalOpen && selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          onClose={() => setIsDetailModalOpen(false)} 
          updateStatus={updateBookingStatus}
          isTasker={isTasker}
          onChat={() => {
            setActiveChat({ 
              bookingId: selectedBooking.id, 
              otherUserName: isTasker ? selectedBooking.users?.full_name || 'Customer' : selectedBooking.taskers?.users?.full_name || 'Tasker' 
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

function SidebarItem({ icon, label, active, onClick, badge }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm group ${active ? 'bg-sewakhoj-red text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'} transition-colors`}>{icon}</span>
      {label}
      {badge ? <span className={`ml-auto w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${active ? 'bg-white text-sewakhoj-red' : 'bg-red-500 text-white'}`}>{badge}</span> : null}
    </button>
  );
}

function OverviewSection({ isTasker, stats, bookings, setSelectedBooking, setIsDetailModalOpen, taskerProfile, setActiveSection }: any) {
  const recentBookings = bookings.slice(0, 3);
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">Welcome back! 👋</h3>
          <p className="text-gray-500 font-bold">Here's what's happening with your account today.</p>
        </div>
        {isTasker && (
          <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border shadow-sm ${taskerProfile?.status === 'active' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
            <div className={`w-2 h-2 rounded-full ${taskerProfile?.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className="text-xs font-black uppercase tracking-widest">{taskerProfile?.status || 'Pending'} Profile</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Briefcase />} label="Active Tasks" value={stats.active} color="blue" />
        <StatCard icon={<CheckCircle2 />} label="Completed" value={stats.completed} color="green" />
        {isTasker ? (
          <>
            <StatCard icon={<Activity />} label="Total Earnings" value={`Rs ${stats.totalEarnings}`} color="purple" />
            <StatCard icon={<Clock />} label="Pending Payout" value={`Rs ${stats.pendingEarnings}`} color="amber" />
          </>
        ) : (
          <>
            <StatCard icon={<Star />} label="Average Rating" value="4.9" color="purple" />
            <StatCard icon={<Activity />} label="Total Tasks" value={bookings.length} color="amber" />
          </>
        )}
      </div>

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
             <SupportLink icon={<MessageCircle className="w-4 h-4" />} label="Live Chat Support" href="#" color="text-green-600" />
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

function ProfileSection({ isTasker, taskerProfile, profileForm, setProfileForm, handleUpdateProfile, isSubmitting, toggleSkill }: any) {
  return (
    <div className="space-y-10">
      <h3 className="text-3xl font-black text-gray-900">Profile & KYC</h3>
      <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
          <div className="flex gap-8 items-start">
            <div className="w-32 h-32 rounded-[40px] bg-gray-100 overflow-hidden border-4 border-white shadow-xl relative group">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="text-white w-8 h-8" /></div>
            </div>
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label><input type="text" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Experience</label><select value={profileForm.experience} onChange={e => setProfileForm({...profileForm, experience: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold"><option>0-1 years</option><option>1-3 years</option><option>3-5 years</option><option>5+ years</option></select></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Bio</label><textarea rows={3} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold resize-none" placeholder="Tell us about yourself..." /></div>
            </div>
          </div>
          {isTasker && (
            <div className="pt-8 border-t border-gray-50 space-y-6">
              <h5 className="font-black uppercase text-sm">Skills & Services</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {serviceData.map(s => (
                  <button key={s.id} type="button" onClick={() => toggleSkill(s.id)} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${profileForm.skills.includes(s.id) ? 'border-sewakhoj-red bg-red-50' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}`}>
                    <span className="text-2xl">{s.emoji}</span><span className="text-[10px] font-black uppercase tracking-tight text-center">{s.nameEn}</span>
                  </button>
                ))}
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
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Event</th><th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th><th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th></tr>
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
  );
}

function SecuritySection({ passwordForm, setPasswordForm, handleChangePassword, isSubmitting }: any) {
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
          <button className="px-8 py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all">Request Deletion</button>
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

function BookingDetailModal({ booking, onClose, updateStatus, isTasker, onChat }: any) {
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
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Info</h5>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center font-black">{booking.users?.full_name?.charAt(0) || 'U'}</div>
                <div className="flex-1 min-w-0"><p className="font-black text-gray-900 truncate">{booking.users?.full_name || "Unknown"}</p><p className="text-xs text-gray-500 font-bold">{booking.users?.phone}</p></div>
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
                 <p className="text-4xl font-black">Rs {isTasker ? Number(booking.total_amount) * 0.9 : booking.total_amount}</p>
                 <p className="text-white/40 text-[10px] font-black uppercase pt-4 border-t border-white/10">Cash on Delivery</p>
               </div>
            </div>
          </div>
          {isTasker && !['completed', 'cancelled'].includes(booking.status) && (
            <div className="flex gap-3">
              {booking.status === 'pending' && <><button onClick={() => updateStatus(booking.id, 'accepted')} className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs">Accept</button><button onClick={() => updateStatus(booking.id, 'cancelled')} className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs">Reject</button></>}
              {booking.status === 'accepted' && <button onClick={() => updateStatus(booking.id, 'on-the-way')} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-xs">Start Journey</button>}
              {booking.status === 'on-the-way' && <button onClick={() => updateStatus(booking.id, 'in-progress')} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs">Arrived</button>}
              {booking.status === 'in-progress' && <button onClick={() => updateStatus(booking.id, 'completed')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs">Mark Complete</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
