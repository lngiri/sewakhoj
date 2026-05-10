"use client";

import { useState, useEffect, Suspense, useRef } from "react";
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
  Info,
  EyeOff
} from "lucide-react";
import ChatModal from "@/components/chat/ChatModal";

// --- Types ---
type DashboardSection = 'overview' | 'tasks' | 'finance' | 'profile' | 'security' | 'logs' | 'favorites' | 'market_jobs' | 'my_posts';

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
  const [marketTasks, setMarketTasks] = useState<any[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [bidsReceived, setBidsReceived] = useState<any[]>([]);
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountStatus, setAccountStatus] = useState<string>('active');

  // Modal States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{ bookingId: string, otherUserName: string } | null>(null);
  
  // Modal & Sidebar scroll lock effect
  useEffect(() => {
    if (isDetailModalOpen || activeChat || isSidebarOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isDetailModalOpen, activeChat, isSidebarOpen]);

  // Form States
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    city: "",
    area: "",
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
      // Check for Admin redirection
      const checkAdmin = async () => {
        const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
        const { data: staff } = await supabase.from('staff_roles').select('role').eq('user_id', user.id).single();
        
        if (staff || (data && (data.role === 'admin' || data.role === 'super_admin'))) {
          // If they are an admin, send them to the admin portal automatically
          // unless they came here with a specific section intent (optional)
          if (!searchParams.get('force_customer')) {
            router.push("/admin");
            return true;
          }
        }
        return false;
      };

      checkAdmin().then((isRedirecting) => {
        if (!isRedirecting) {
          const section = searchParams.get('section') as DashboardSection;
          if (section) setActiveSection(section);
          fetchData();
        }
      });
    }
  }, [user, authLoading, router, searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      
      // First, check if they are a tasker in the database regardless of metadata
      const { data: tData } = await supabase.from('taskers').select('*').eq('user_id', user?.id).single();
      const confirmedIsTasker = !!tData;
      setHasTaskerRole(confirmedIsTasker);

      // Check if user is an admin and fetch account status
      const { data: uData } = await supabase.from('users').select('role, account_status').eq('id', user?.id).single();
      if (uData && (uData.role === 'admin' || uData.role === 'super_admin')) {
        setIsAdmin(true);
      }
      if (uData?.account_status) {
        setAccountStatus(uData.account_status);
      }
      
      // If user has both roles and we haven't decided which view to show yet
      // We check session storage so we don't annoy them on every refresh
      const preferredView = sessionStorage.getItem('dashboard_view');

      // Sync profile form with user data
      setProfileForm(prev => ({
        ...prev,
        fullName: user?.user_metadata?.full_name || "",
        email: user?.email || "",
        phone: uData?.phone || "",
        dob: uData?.dob || "",
        gender: uData?.gender || "",
        city: uData?.city || "",
        area: uData?.area || "",
      }));

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
          setProfileForm(prev => ({
            ...prev,
            bio: tData.bio || "",
            hourlyRate: tData.hourly_rate || 0,
            experience: tData.experience || "",
            skills: tData.skills || []
          }));

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
          const pending = lData?.filter((l: any) => l.status === 'pending').reduce((acc: number, curr: any) => acc + (curr.type === 'payable' ? Number(curr.total_amount) - Number(curr.commission_amount) : 0), 0) || 0;
          const commissionOwed = lData?.filter((l: any) => l.status === 'pending' && l.type === 'receivable').reduce((acc: number, curr: any) => acc + Number(curr.commission_amount), 0) || 0;
          
          setStats({
            active: active.length,
            completed: completed.length,
            totalEarnings: earnings,
            pendingEarnings: pending,
            commissionOwed: commissionOwed
          } as any);

          // Fetch Market Jobs for Tasker
          const { data: mjData } = await supabase
            .from('market_tasks')
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false });
          if (mjData) setMarketTasks(mjData);

          const { data: myBidsData } = await supabase
            .from('task_bids')
            .select('*, task:market_tasks(*)')
            .eq('tasker_id', tData.id);
          if (myBidsData) setMyBids(myBidsData);
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

        // Fetch My Posted Tasks for Customer
        const { data: mtData } = await supabase
          .from('market_tasks')
          .select('*, bids:task_bids(*, tasker:taskers(users(full_name, avatar_url)))')
          .eq('customer_id', user?.id)
          .order('created_at', { ascending: false });
        if (mtData) setMarketTasks(mtData);
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
      const { data: sData } = await supabase.from('platform_settings').select('commission_rate_percentage').single();
      if (sData) setCommissionRate(Number(sData.commission_rate_percentage) / 100);

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    let channel: any = null;

    const setupSubscription = () => {
      const channelName = `dashboard-notifs-${user.id}`;
      
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        }, (payload: any) => {
          if (isMounted) {
            setNotifications((prev: any[]) => [payload.new, ...prev].slice(0, 10));
            setSuccess(`New Notification: ${(payload.new as any).title}`);
            setTimeout(() => {
              if (isMounted) setSuccess(null);
            }, 5000);
          }
        })
        .subscribe();
    };

    setupSubscription();
    
    return () => { 
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Update Public.Users (Shared info)
      const { error: userError } = await supabase.from('users').update({
        full_name: profileForm.fullName,
        phone: profileForm.phone,
        dob: profileForm.dob,
        gender: profileForm.gender,
        city: profileForm.city,
        area: profileForm.area
      }).eq('id', user?.id);

      if (userError) throw userError;

      // 2. Update Public.Taskers (Professional info)
      if (hasTaskerRole) {
        const { error: taskerError } = await supabase.from('taskers').update({
          bio: profileForm.bio,
          hourly_rate: profileForm.hourlyRate,
          experience: profileForm.experience,
          skills: profileForm.skills
        }).eq('user_id', user?.id);
        
        if (taskerError) throw taskerError;
      }

      // 3. Update Auth Metadata
      await supabase.auth.updateUser({ 
        data: { 
          full_name: profileForm.fullName,
        } 
      });

      setSuccess("Profile settings synchronized globally!");
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message?.includes("network") ? "Network error. Check your connection." : "Failed to update profile. " + err.message);
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
        let type: 'info' | 'status' | 'alert' = 'info';

        if (extraData.adjustment_reason) {
          title = "Price Adjusted 💹";
          message = `Specialist updated the quote to Rs ${extraData.total_amount}. Reason: ${extraData.adjustment_reason}`;
          type = 'alert';
        } else if (status === 'accepted') {
          title = "Tasker Accepted! ✅";
          message = "Good news! Your tasker has accepted the booking and will arrive at the scheduled time.";
          type = 'status';
        } else if (status === 'on-the-way') {
          title = "Tasker is on the way! 🚀";
          message = "Your tasker has started their journey to your location.";
        } else if (status === 'arrived') {
          title = "Tasker has arrived! 📍";
          message = "Your specialist is at your location. Please meet them at the entrance.";
        } else if (status === 'completed') {
          title = "Job Completed! ✨";
          message = "Your tasker has marked the job as completed. Please verify and leave a review.";
          type = 'status';
        } else if (status === 'cancelled') {
          title = "Mission Reassigned? 🔄";
          message = "The specialist is unavailable. Would you like us to find another pro for you immediately?";
          type = 'alert';
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

  const handleDeactivateAccount = async () => {
    if (!window.confirm("Are you sure you want to request account deactivation? Your profile will be hidden, but your transaction history will remain securely archived.")) return;
    
    setIsSubmitting(true);
    try {
      // 1. Check for active bookings
      const { data: activeBookings, error: bError } = await supabase
        .from('bookings')
        .select('id')
        .or(`customer_id.eq.${user?.id},tasker_id.eq.${user?.id}`)
        .in('status', ['pending', 'accepted', 'on-the-way', 'in-progress']);

      if (bError) throw bError;
      if (activeBookings && activeBookings.length > 0) {
        showError("You cannot deactivate your account while you have active or pending bookings. Please complete or cancel them first.");
        setIsSubmitting(false);
        return;
      }

      // 2. Check for unsettled commissions (if tasker)
      const { data: pendingCommissions, error: cError } = await supabase
        .from('commission_ledger')
        .select('id')
        .eq('tasker_id', user?.id)
        .eq('status', 'pending');

      if (cError) throw cError;
      if (pendingCommissions && pendingCommissions.length > 0) {
        showError("You have pending financial settlements. Please clear your dues before deactivating your account.");
        setIsSubmitting(false);
        return;
      }

      // 3. Send notification to admin
      const { error: notifError } = await supabase.from('notifications').insert({
        target_role: 'admin',
        title: 'Account Deactivation Request',
        message: `User ${user?.email} has requested account deactivation.`,
        type: 'alert',
        link: '/admin/users'
      });

      if (notifError) throw notifError;

      // 4. Update user status in metadata or database if applicable (for now, just logged request)
      showError("Account deactivation requested. An admin will verify and deactivate your profile shortly.");
      
    } catch (err: any) {
      showError("Request failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBid = async (task: any) => {
    const amount = window.prompt(`Enter your bid amount for "${task.title}" (Budget: Rs ${task.budget_amount || 'Negotiable'}):`);
    const message = window.prompt("Send a short message to the customer about your skills:");
    
    if (!amount || isNaN(Number(amount))) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('task_bids').insert({
        task_id: task.id,
        tasker_id: taskerProfile?.id,
        bid_amount: Number(amount),
        message: message || "I can help with this task!"
      });
      if (error) throw error;
      showSuccess("Bid sent successfully!");
      fetchData();
    } catch (err: any) {
      showError("Failed to send bid: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptBid = async (task: any, bid: any) => {
    if (!window.confirm(`Are you sure you want to hire ${bid.tasker?.users?.full_name} for Rs ${bid.bid_amount}?`)) return;
    
    setIsSubmitting(true);
    try {
      // 1. Create a Booking
      const { error: bError } = await supabase.from('bookings').insert({
        customer_id: user?.id,
        tasker_id: bid.tasker_id,
        service: task.category_id,
        booking_date: new Date().toISOString().split('T')[0],
        booking_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        status: 'accepted',
        total_amount: bid.bid_amount,
        address: task.location_name
      });
      if (bError) throw bError;

      // 2. Mark Task as Assigned
      await supabase.from('market_tasks').update({ status: 'assigned' }).eq('id', task.id);
      
      // 3. Mark Bid as Accepted
      await supabase.from('task_bids').update({ status: 'accepted' }).eq('id', bid.id);

      // 4. Notify Tasker
      await supabase.from('notifications').insert({
        user_id: bid.tasker.user_id || (await supabase.from('taskers').select('user_id').eq('id', bid.tasker_id).single()).data?.user_id,
        title: "Bid Accepted! 🎉",
        message: `Your bid of Rs ${bid.bid_amount} for "${task.title}" was accepted. Check your active tasks!`,
        type: 'success'
      });

      showSuccess("Specialist hired! Booking created.");
      fetchData();
    } catch (err: any) {
      showError("Failed to hire: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to withdraw this task?")) return;
    try {
      await supabase.from('market_tasks').delete().eq('id', postId);
      showSuccess("Task withdrawn.");
      fetchData();
    } catch (err: any) {
      showError("Failed to withdraw: " + err.message);
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

  // --- Data Export Function ---
  const handleExportData = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const [profileRes, bookingsRes, ledgerRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('bookings').select('*').or(`customer_id.eq.${user.id},tasker_id.eq.${user.id}`).order('created_at', { ascending: false }),
        supabase.from('commission_ledger').select('*').eq('tasker_id', user.id).order('created_at', { ascending: false }),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        bookings: bookingsRes.data || [],
        financial_ledger: ledgerRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sewakhoj-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess("Data exported successfully!");
    } catch (err: any) {
      showError("Export failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Reactivation Request ---
  const handleRequestReactivation = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Account Reactivation Request',
        message: `User ${user.email} has requested account reactivation.`,
        type: 'alert',
        link: '/admin/users'
      });
      showSuccess("Reactivation request sent! An admin will review your account shortly.");
    } catch (err: any) {
      showError("Failed to send request: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Deactivated/Suspended Account Blocker ---
  if (accountStatus !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[40px] shadow-2xl max-w-lg w-full p-10 text-center space-y-8">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${accountStatus === 'suspended' ? 'bg-red-100' : 'bg-amber-100'}`}>
            {accountStatus === 'suspended' ? (
              <ShieldCheck className="w-10 h-10 text-red-500" />
            ) : (
              <EyeOff className="w-10 h-10 text-amber-500" />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {accountStatus === 'suspended' ? 'Account Suspended' : 'Account Deactivated'}
            </h2>
            <p className="text-gray-500 font-bold text-sm leading-relaxed">
              {accountStatus === 'suspended' 
                ? 'Your account has been suspended by an administrator. Please contact support for more information.'
                : 'Your account is currently hidden from the platform. Your data and transaction history are safely archived.'}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRequestReactivation}
              disabled={isSubmitting}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Request Reactivation'}
            </button>

            <button
              onClick={handleExportData}
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-50 text-blue-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Download My Data
            </button>

            <button
              onClick={() => { supabase.auth.signOut(); router.push('/'); }}
              className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <p className="text-[10px] text-gray-400 font-bold">
            Need help? Contact support@sewakhoj.com
          </p>
        </div>
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
            <SidebarItem isTasker={isTaskerView} icon={<UserCircle />} label="Profile & Settings" active={activeSection === 'profile' || activeSection === 'security'} onClick={() => { setActiveSection('profile'); setIsSidebarOpen(false); }} />
            <SidebarItem isTasker={isTaskerView} icon={<History />} label="Activity Logs" active={activeSection === 'logs'} onClick={() => { setActiveSection('logs'); setIsSidebarOpen(false); }} />
            
            {/* Marketplace Bidding Entry Points */}
            {isTaskerView ? (
              <SidebarItem isTasker={isTaskerView} icon={<Search className="w-5 h-5" />} label="Available Jobs" active={activeSection === 'market_jobs'} onClick={() => { setActiveSection('market_jobs'); setIsSidebarOpen(false); }} />
            ) : (
              <SidebarItem isTasker={isTaskerView} icon={<Plus className="w-5 h-5" />} label="Post a Task" onClick={() => router.push('/post-task')} />
            )}
            {!isTaskerView && <SidebarItem isTasker={isTaskerView} icon={<FileText className="w-5 h-5" />} label="My Posted Tasks" active={activeSection === 'my_posts'} onClick={() => { setActiveSection('my_posts'); setIsSidebarOpen(false); }} />}
            
            {/* Admin Portal Link for privileged users */}
            {(isAdmin || user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'super_admin') && (
              <div className="pt-4 mt-4 border-t border-gray-100/10">
                <Link 
                  href="/admin"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${isTaskerView ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                  <ShieldCheck className="w-4 h-4 text-sewakhoj-red" /> Admin Portal Hub
                </Link>
              </div>
            )}

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
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="User avatar" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user_metadata?.full_name || 'User'}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-sm">
                    {user?.user_metadata?.full_name?.[0] || '👤'}
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <p className={`font-black text-sm ${isTaskerView ? 'text-white' : 'text-gray-900'} truncate`}>{user?.user_metadata?.full_name || "User"}</p>
                <p className={`text-[10px] ${isTaskerView ? 'text-blue-400' : 'text-gray-500'} font-black uppercase truncate`}>
                  {hasTaskerRole ? 'Customer & Tasker' : (isTaskerView ? 'Verified Tasker' : 'Customer')}
                </p>
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
            <div className="h-8 w-px bg-gray-100 hidden md:block"></div>
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
          {activeSection === 'profile' && (
            <ProfileSection 
              isTasker={isTaskerView} 
              taskerProfile={taskerProfile} 
              profileForm={profileForm} 
              setProfileForm={setProfileForm} 
              handleUpdateProfile={handleUpdateProfile} 
              isSubmitting={isSubmitting} 
              toggleSkill={toggleSkill} 
              onCloseTasker={handleDeleteTaskerProfile}
              passwordForm={passwordForm}
              setPasswordForm={setPasswordForm}
              handleChangePassword={handleChangePassword}
              onDeactivateAccount={handleDeactivateAccount}
              onExportData={handleExportData}
            />
          )}
        </div>
      </main>

      {/* --- Modals --- */}
      {isDetailModalOpen && selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          bookings={bookings}
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
              <StatCard icon={<Wallet />} label="Net Wallet" value={`Rs ${stats.pendingEarnings - stats.commissionOwed}`} color={stats.pendingEarnings >= stats.commissionOwed ? "green" : "red"} />
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
        <h3 className="text-3xl font-black text-gray-900">My Tasks</h3>
        <div className="w-full md:w-auto">
          <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
            {['all', 'pending', 'accepted', 'completed'].map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)} 
                className={`flex-1 md:flex-none px-3 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
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

function ProfileSection({ 
  isTasker, 
  taskerProfile, 
  profileForm, 
  setProfileForm, 
  handleUpdateProfile, 
  isSubmitting, 
  toggleSkill, 
  onCloseTasker,
  passwordForm,
  setPasswordForm,
  handleChangePassword,
  onDeactivateAccount,
  onExportData
}: any) {
  const [activeTab, setActiveTab] = useState<'account' | 'professional' | 'security'>('account');
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const filteredServices = serviceData.filter(s => 
    s.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nameNp.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'account', label: 'Account Info', icon: <UserCircle className="w-4 h-4" /> },
    ...(isTasker ? [{ id: 'professional', label: 'Professional', icon: <Briefcase className="w-4 h-4" /> }] : []),
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight uppercase">Identity Hub</h3>
          <p className="text-xs md:text-sm text-gray-500 font-bold mt-2">Manage your global presence and security preferences.</p>
        </div>
        <div className="w-full md:w-auto flex bg-white/50 backdrop-blur-md p-1 rounded-xl border border-gray-100 shadow-sm overflow-x-auto custom-scrollbar no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
        {/* Left Column: Visual Identity */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center space-y-6">
             <div className="w-32 h-32 mx-auto rounded-[40px] bg-gray-50 border-4 border-white shadow-2xl relative group overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileForm.fullName || 'User'}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="text-white w-8 h-8" />
                </div>
             </div>
             <div>
                <h4 className="font-black text-xl text-gray-900">{profileForm.fullName || "User Name"}</h4>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">{isTasker ? 'Verified Specialist' : 'Verified Member'}</p>
             </div>
             
             <div className="pt-6 border-t border-gray-50 space-y-3">
                <div className={`p-4 rounded-2xl border flex items-center justify-center gap-3 ${taskerProfile?.id_verified ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                   <ShieldCheck className="w-5 h-5" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{taskerProfile?.id_verified ? "KYC Verified" : "KYC Pending"}</span>
                </div>
                {!taskerProfile?.id_verified && (
                  <Link href="/tasker/kyc" className="block w-full py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sewakhoj-red transition-all">Complete KYC Now</Link>
                )}
             </div>
          </div>

          {isTasker && (
             <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                <h5 className="font-black text-xs uppercase tracking-widest text-gray-400">Tasker Status</h5>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500">Hourly Rate</span>
                      <span className="font-black text-gray-900">Rs {profileForm.hourlyRate}/hr</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500">Level</span>
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase">{profileForm.experience} Exp</span>
                   </div>
                </div>
                <button 
                  onClick={onCloseTasker}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all"
                >
                  Close Professional Profile
                </button>
             </div>
          )}
        </div>

        {/* Right Column: Tab Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            <div className="flex-1 p-8 md:p-12">
              {activeTab === 'account' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-gray-900">Personal Information</h4>
                    <p className="text-sm font-bold text-gray-400">Basic details used for verification and service delivery.</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label>
                        <input type="text" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email Address (Locked)</label>
                        <input type="email" value={profileForm.email} readOnly className="w-full bg-gray-100 border-none rounded-2xl p-4 font-bold text-gray-400 cursor-not-allowed outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Phone Number</label>
                        <input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Date of Birth</label>
                        <input type="date" value={profileForm.dob} onChange={e => setProfileForm({...profileForm, dob: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Gender</label>
                        <select value={profileForm.gender} onChange={e => setProfileForm({...profileForm, gender: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all">
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">City</label>
                          <input type="text" value={profileForm.city} onChange={e => setProfileForm({...profileForm, city: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Area</label>
                          <input type="text" value={profileForm.area} onChange={e => setProfileForm({...profileForm, area: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                        </div>
                      </div>
                    </div>
                    
                    <button type="submit" disabled={isSubmitting} className="bg-gray-900 text-white px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl shadow-gray-900/10">
                       {isSubmitting ? "Updating..." : "Synchronize Changes"}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'professional' && isTasker && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-gray-900">Professional Profile</h4>
                    <p className="text-sm font-bold text-gray-400">Customize how you appear to potential customers.</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Hourly Rate (Rs)</label>
                          <div className="relative">
                            <input type="number" value={profileForm.hourlyRate} onChange={e => setProfileForm({...profileForm, hourlyRate: parseInt(e.target.value)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-6 font-black text-2xl outline-none transition-all pl-12" />
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-300">Rs</span>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Work Experience</label>
                          <select value={profileForm.experience} onChange={e => setProfileForm({...profileForm, experience: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-6 font-bold outline-none transition-all h-[76px]">
                             <option>0-1 years</option>
                             <option>1-3 years</option>
                             <option>3-5 years</option>
                             <option>5+ years</option>
                          </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Professional Bio</label>
                      <textarea rows={4} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-3xl p-6 font-bold resize-none outline-none transition-all" placeholder="Describe your expertise, tools, and why customers should hire you..." />
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <h5 className="font-black uppercase text-xs tracking-widest text-gray-400">Skills & Services</h5>
                          <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase">{profileForm.skills.length} Selected</span>
                       </div>
                       
                       <div className="flex flex-wrap gap-2 min-h-[40px]">
                          {profileForm.skills.map((skillId: string) => {
                            const skill = serviceData.find(s => s.id === skillId);
                            return (
                              <div key={skillId} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-2xl border-2 border-gray-100 font-black text-xs group hover:border-sewakhoj-red hover:bg-red-50 transition-all">
                                <span className="text-lg leading-none">{skill?.emoji}</span>
                                <span className="uppercase tracking-tight">{skill?.nameEn}</span>
                                <button type="button" onClick={() => toggleSkill(skillId)} className="w-5 h-5 rounded-lg bg-gray-100 text-gray-400 hover:bg-sewakhoj-red hover:text-white flex items-center justify-center transition-all"><X className="w-3 h-3" /></button>
                              </div>
                            );
                          })}
                       </div>

                       <div className="relative" ref={dropdownRef}>
                          <div className={`flex items-center gap-3 rounded-[24px] p-4 border-2 transition-all ${isDropdownOpen ? 'bg-white border-sewakhoj-red shadow-xl' : 'bg-gray-50 border-transparent'}`}>
                            <Search className={`w-5 h-5 ${isDropdownOpen ? 'text-sewakhoj-red' : 'text-gray-400'}`} />
                            <input type="text" placeholder="Add more skills..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} className="flex-1 bg-transparent border-none outline-none font-bold text-sm" />
                          </div>

                          {isDropdownOpen && (
                            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-[32px] border border-gray-100 shadow-2xl z-50 max-h-60 overflow-auto p-2 space-y-1">
                               {filteredServices.map(s => (
                                 <button key={s.id} type="button" onClick={() => { toggleSkill(s.id); setSearchTerm(""); setIsDropdownOpen(false); }} className="w-full flex items-center gap-4 p-4 hover:bg-red-50 rounded-2xl text-left transition-all group">
                                    <div className="w-10 h-10 bg-gray-50 group-hover:bg-white rounded-xl flex items-center justify-center text-xl">{s.emoji}</div>
                                    <span className="font-black text-xs uppercase tracking-tight">{s.nameEn}</span>
                                 </button>
                               ))}
                            </div>
                          )}
                       </div>
                    </div>
                    
                    <button type="submit" disabled={isSubmitting} className="bg-gray-900 text-white px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">Save Professional Details</button>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div className="space-y-1">
                    <h4 className="text-2xl font-black text-gray-900">Security Suite</h4>
                    <p className="text-sm font-bold text-gray-400">Protect your account and manage your privacy.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <form onSubmit={handleChangePassword} className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                           <Lock className="w-5 h-5 text-gray-900" />
                           <h5 className="font-black text-xs uppercase tracking-widest">Change Password</h5>
                        </div>
                        <div className="space-y-4">
                           <input type="password" placeholder="New Password" required value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
                           <input type="password" placeholder="Confirm Password" required value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sewakhoj-red transition-all shadow-lg shadow-gray-200">Update Password</button>
                     </form>

                     <div className="space-y-8">
                        <div className="bg-blue-50/50 p-8 rounded-[40px] border border-blue-100 space-y-4">
                           <div className="flex items-center gap-3">
                              <Download className="w-5 h-5 text-blue-600" />
                              <h5 className="font-black text-xs uppercase tracking-widest text-blue-600">Data Portability</h5>
                           </div>
                           <p className="text-xs font-bold text-blue-800/60 leading-relaxed">Download your entire profile, transaction history, and activity logs in JSON format.</p>
                           <button onClick={onExportData} className="w-full py-3 bg-white text-blue-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm">Export My Data</button>
                        </div>

                        <div className="bg-amber-50/50 p-8 rounded-[40px] border border-amber-100 space-y-4">
                           <div className="flex items-center gap-3">
                              <Activity className="w-5 h-5 text-amber-600" />
                              <h5 className="font-black text-xs uppercase tracking-widest text-amber-600">Account Control</h5>
                           </div>
                           <p className="text-xs font-bold text-amber-800/60 leading-relaxed">Request to deactivate your profile. Your data will be archived securely.</p>
                           <button onClick={onDeactivateAccount} className="w-full py-3 bg-white text-amber-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-amber-100 hover:bg-amber-600 hover:text-white transition-all shadow-sm">Request Deactivation</button>
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">All systems operational & encrypted</p>
               </div>
               <p className="text-[10px] font-bold text-gray-300">SewaKhoj V2.0 Global Privacy Standard</p>
            </div>
          </div>
        </div>
      </div>
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

// SecuritySection is now merged into ProfileSection tabbed view
function SecuritySection() { return null; }

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

function MarketJobsSection({ tasks, myBids, onBid }: any) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">Available Jobs</h3>
          <p className="text-sm font-bold text-gray-500 mt-1">Direct requests from customers looking for your expertise.</p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
          {tasks.length} Live Tasks
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tasks.map((task: any) => {
          const hasBid = myBids.some((b: any) => b.task_id === task.id);
          const service = serviceData.find(s => s.id === task.category_id);
          return (
            <div key={task.id} className="bg-white rounded-[32px] border border-gray-100 p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                  {service?.emoji || '🔧'}
                </div>
                {hasBid ? (
                  <span className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-green-100">Bid Sent</span>
                ) : (
                  <span className="bg-gray-50 text-gray-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Open</span>
                )}
              </div>
              
              <h4 className="text-xl font-black text-gray-900 mb-2 truncate">{task.title}</h4>
              <p className="text-sm text-gray-500 font-medium line-clamp-3 mb-6 leading-relaxed">
                {task.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Budget</p>
                  <p className="text-sm font-black text-gray-900">Rs {task.budget_amount || 'Negotiable'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Location</p>
                  <p className="text-sm font-black text-gray-900 capitalize">{task.location_name}</p>
                </div>
              </div>

              <button 
                onClick={() => onBid(task)}
                disabled={hasBid}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${hasBid ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-sewakhoj-red text-white hover:bg-slate-900 shadow-xl shadow-red-500/10 active:scale-95'}`}
              >
                {hasBid ? "Applied" : "Send Quote / Bid"}
              </button>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[48px] border-2 border-dashed border-gray-100">
            <Search className="w-16 h-16 text-gray-200 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-gray-900 mb-2">The Job Board is Clear</h3>
            <p className="text-gray-500 font-bold max-w-sm mx-auto">New custom tasks will appear here as soon as customers post them. Keep an eye out!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MyPostsSection({ tasks, onAcceptBid, onDeletePost }: any) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 sm:gap-0">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">My Posted Tasks</h3>
          <p className="text-sm font-bold text-gray-500 mt-1">Manage your requests and review offers from verified pros.</p>
        </div>
        <Link href="/post-task" className="w-full sm:w-auto bg-sewakhoj-red text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> New Task
        </Link>
      </div>

      <div className="space-y-6">
        {tasks.map((task: any) => (
          <div key={task.id} className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-8 md:p-10 flex flex-col lg:flex-row gap-10">
              {/* Task Info */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl">
                    {serviceData.find(s => s.id === task.category_id)?.emoji || '🔧'}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-gray-900">{task.title}</h4>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Posted on {new Date(task.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-gray-500 font-medium leading-relaxed">{task.description}</p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-600">
                    <MapPin className="w-4 h-4" /> {task.location_name}
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-600">
                    <Wallet className="w-4 h-4" /> Rs {task.budget_amount || 'Negotiable'}
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter ${task.status === 'open' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    <Activity className="w-4 h-4" /> {task.status}
                  </div>
                </div>
                <button 
                  onClick={() => onDeletePost(task.id)}
                  className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors pt-4 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Withdraw Task
                </button>
              </div>

              {/* Bids List */}
              <div className="lg:w-96 bg-gray-50 rounded-[32px] p-8 space-y-6">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
                  Bids Received <span className="bg-white text-gray-900 px-2 py-1 rounded-lg shadow-sm">{task.bids?.length || 0}</span>
                </h5>
                
                <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                  {task.bids?.map((bid: any) => (
                    <div key={bid.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-sewakhoj-red transition-all group">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gray-50 overflow-hidden border border-gray-100">
                          {bid.tasker?.users?.avatar_url ? <img src={bid.tasker.users.avatar_url} alt="Avatar" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-xs text-gray-900 truncate">{bid.tasker?.users?.full_name}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Pro Specialist</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium line-clamp-2 mb-4 leading-relaxed italic">"{bid.message}"</p>
                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-50">
                        <div className="text-gray-900 font-black text-sm">Rs {bid.bid_amount}</div>
                        <button 
                          onClick={() => onAcceptBid(task, bid)}
                          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sewakhoj-red transition-all shadow-lg active:scale-95"
                        >
                          Hire
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!task.bids || task.bids.length === 0) && (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Clock className="w-6 h-6 text-gray-200 animate-pulse" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waiting for Pros...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="py-24 text-center bg-white rounded-[48px] border-2 border-dashed border-gray-100">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-gray-900 mb-2">No Active Requests</h3>
            <p className="text-gray-500 font-bold max-w-sm mx-auto mb-10">You haven't posted any custom tasks yet. Need something specific done?</p>
            <Link href="/post-task" className="bg-gray-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">Post Your First Task</Link>
          </div>
        )}
      </div>
    </div>
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

function BookingDetailModal({ booking, bookings, onClose, updateStatus, isTasker, onChat, commissionRate }: any) {
  const displayUser = isTasker ? booking.users : booking.taskers?.users;
  const displayName = displayUser?.full_name || (isTasker ? "Customer" : "Tasker");

  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleEsewaPayment = async () => {
    setIsPaying(true);
    try {
      const res = await fetch('/api/esewa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, amount: booking.total_amount })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      // Create a hidden form and submit to eSewa
      const form = document.createElement('form');
      form.setAttribute('method', 'POST');
      form.setAttribute('action', data.endpoint);

      for (const key in data.payload) {
        const hiddenField = document.createElement('input');
        hiddenField.setAttribute('type', 'hidden');
        hiddenField.setAttribute('name', key);
        hiddenField.setAttribute('value', data.payload[key]);
        form.appendChild(hiddenField);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      alert("Payment Initiation Failed: " + err.message);
      setIsPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 md:p-8 bg-[#F8FAFC] border-b border-gray-50 flex justify-between items-start shrink-0">
          <div className="flex gap-5"><div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-xl shrink-0">{serviceData.find(s => s.id === booking.service)?.emoji || '🔧'}</div><div><h3 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">{serviceData.find(s => s.id === booking.service)?.nameEn || booking.service}</h3><p className="text-gray-400 font-bold uppercase text-[10px] mt-1">ID: {booking.id.slice(0,8)}</p></div></div>
          <button onClick={onClose} className="p-3 bg-white hover:bg-gray-100 rounded-2xl shadow-sm shrink-0"><X className="w-5 h-5 md:w-6 md:h-6 text-gray-500" /></button>
        </div>
        <div className="p-6 md:p-8 space-y-10 overflow-y-auto custom-scrollbar">
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
                 <p className="text-white/40 text-[10px] font-black uppercase">{isTasker ? "Earning" : "Total Cost"}</p>
                 <p className="text-4xl font-black">Rs {isTasker ? Number(booking.total_amount) * (1 - commissionRate) : booking.total_amount}</p>
                 
                 <div className="pt-4 mt-2 border-t border-white/10 flex flex-col gap-3">
                   <p className="text-white/40 text-[10px] font-black uppercase">
                     Status: <span className={booking.payment_status === 'escrowed' ? 'text-green-400' : 'text-amber-400'}>{booking.payment_status || 'pending'}</span>
                   </p>
                   
                   {!isTasker && (!booking.payment_status || booking.payment_status === 'pending') && (
                     <button 
                       onClick={handleEsewaPayment}
                       disabled={isPaying}
                       className="w-full py-3 bg-[#60BB46] hover:bg-[#4d9c36] text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                     >
                       {isPaying ? "Processing..." : "Pay securely via eSewa (Escrow)"}
                     </button>
                   )}
                   {isTasker && booking.payment_status === 'escrowed' && (
                     <p className="text-green-400 text-xs font-bold">💰 Funds secured in Escrow. Will release upon completion.</p>
                   )}
                 </div>
               </div>
            </div>
          </div>
          {isTasker && !['completed', 'cancelled'].includes(booking.status) && (
            <div className="flex gap-3">
              {booking.status === 'pending' && <>
                <button 
                  onClick={() => {
                    const conflict = bookings.find((b: any) => 
                      b.id !== booking.id && 
                      b.booking_date === booking.booking_date && 
                      b.booking_time === booking.booking_time && 
                      ['accepted', 'on-the-way', 'in-progress'].includes(b.status)
                    );
                    if (conflict && !window.confirm(`⚠️ CONFLICT: You already have a booking for this time slot. Accept anyway?`)) return;
                    updateStatus(booking.id, 'accepted');
                  }} 
                  className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-100 hover:bg-green-600 transition-all"
                >
                  Accept Task
                </button>
                <button onClick={() => updateStatus(booking.id, 'cancelled')} className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs hover:bg-red-100 transition-all">Reject</button>
              </>}
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
