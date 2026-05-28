"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import TrustScoreBreakdown from "@/components/ui/TrustScoreBreakdown";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { toast } from "@/lib/toast-messages";
import { useLocale, useTranslations } from "next-intl";
import { services as serviceData } from "@/data/services";
import { sendTaskerAlert } from "@/lib/sms";
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
  EyeOff,
  Trash2,
  ClipboardList,
  Award,
  UploadCloud,
  Loader2,
  DollarSign,
  XCircle,
  CheckCircle
} from "lucide-react";
import ChatModal from "@/components/chat/ChatModal";

// --- Types ---
type DashboardSection = 'overview' | 'tasks' | 'finance' | 'profile' | 'security' | 'logs' | 'favorites' | 'market_jobs' | 'my_posts' | 'reviews';

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
  documents?: any;
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
  payment_status?: string;
  expires_at?: string;
  arrived_at?: string;
  departed_at?: string;
  checklist?: { item: string; done: boolean }[];
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
  const tcom = useTranslations("common");
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" variant="brand" />
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs animate-pulse">{tcom("loading")}</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const locale = useLocale();
  const tdash = useTranslations("dashboard");
  const tcommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useNotification();
  // TOAST constants imported at top — use them for branded messages

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
    pendingEarnings: 0,
    avgRating: 0
  });
  const [favoriteTaskers, setFavoriteTaskers] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<{ points: number; tier: string } | null>(null);
  const [commissionRate, setCommissionRate] = useState(0.1); // Default 10%
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountStatus, setAccountStatus] = useState<string>('active');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingPhone, setOnboardingPhone] = useState("");
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const notifChannelIdRef = useRef(0);
  const channelRef = useRef<any>(null);

  // Modal States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{ bookingId: string, otherUserName: string } | null>(null);

  // Confirm Dialog States
  const [confirmDeleteTasker, setConfirmDeleteTasker] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDeleteData, setConfirmDeleteData] = useState(false);
  const [confirmAcceptBid, setConfirmAcceptBid] = useState<{ task: any; bid: any } | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);
  const [confirmDeclineBooking, setConfirmDeclineBooking] = useState<any | null>(null);
  const [confirmAcceptWithConflict, setConfirmAcceptWithConflict] = useState<{ booking: any; conflicts: number; mode: 'accept' | 'accept_task' } | null>(null);

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
    skills: [] as string[],
    avatarUrl: ""
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
        // Use SECURITY DEFINER function to bypass RLS entirely (migration 063)
        const { data: staff } = await supabase.rpc('get_my_staff_role');

        if (staff && staff.length > 0) {
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
      const { data: tData } = await supabase.from('taskers').select('*').eq('user_id', user?.id).maybeSingle();
      const confirmedIsTasker = !!tData;
      setHasTaskerRole(confirmedIsTasker);

      // Check if user is an admin and load all profile fields completely
      const { data: uData } = await supabase.from('users').select('role, onboarded, full_name, phone, dob, gender, city, area, address, avatar_url').eq('id', user?.id).maybeSingle();
      if (uData && (uData.role === 'admin' || uData.role === 'super_admin')) {
        setIsAdmin(true);
      }

      // Check if user needs profile completion (onboarded === false)
      if (uData && uData.onboarded === false) {
        setNeedsOnboarding(true);
        setOnboardingName(uData.full_name || "");
        setOnboardingPhone(uData.phone || "");
      }

      // Self-healing database pipeline: reconstruct documents and KYC if missing but files exist in storage
      if (confirmedIsTasker && tData && (!tData.documents || Object.keys(tData.documents).length === 0)) {
        try {
          const { data: storageFiles } = await supabase.storage.from('documents').list(user?.id);
          if (storageFiles && storageFiles.length > 0) {
            const reconstructedDocs: Record<string, string> = {};
            const citizenshipFile = storageFiles.find((f: any) => f.name.startsWith('citizenship'));
            const licenseFile = storageFiles.find((f: any) => f.name.startsWith('license'));
            const otherFile = storageFiles.find((f: any) => f.name.startsWith('other'));

            if (citizenshipFile) {
              const { data } = supabase.storage.from('documents').getPublicUrl(`${user?.id}/${citizenshipFile.name}`);
              reconstructedDocs.citizenship = data.publicUrl;
            }
            if (licenseFile) {
              const { data } = supabase.storage.from('documents').getPublicUrl(`${user?.id}/${licenseFile.name}`);
              reconstructedDocs.license = data.publicUrl;
            }
            if (otherFile) {
              const { data } = supabase.storage.from('documents').getPublicUrl(`${user?.id}/${otherFile.name}`);
              reconstructedDocs.other = data.publicUrl;
            }

            if (Object.keys(reconstructedDocs).length > 0) {
              await supabase.from('taskers').update({ documents: reconstructedDocs }).eq('id', tData.id);
              tData.documents = reconstructedDocs;

              // Also create/upsert tasker_kyc row if not exists
              const { data: existingKyc } = await supabase.from('tasker_kyc').select('id').eq('tasker_id', tData.id).maybeSingle();
              if (!existingKyc) {
                await supabase.from('tasker_kyc').upsert({
                  tasker_id: tData.id,
                  document_type: 'nagarikta',
                  document_front_url: reconstructedDocs.citizenship || 'pending_upload',
                  document_back_url: reconstructedDocs.license || null,
                  selfie_url: uData?.avatar_url || user?.user_metadata?.avatar_url || null,
                  status: 'pending',
                  submitted_at: new Date().toISOString()
                }, { onConflict: 'tasker_id' });
              }
            }
          }
        } catch (healErr) {
          console.error('Self-healing error:', healErr);
        }
      }

      // If user has both roles and we haven't decided which view to show yet
      // We check session storage so we don't annoy them on every refresh
      const preferredView = sessionStorage.getItem('dashboard_view');

      // Combined profile form update in ONE SINGLE CALL to avoid React batching/race conditions!
      setProfileForm({
        fullName: uData?.full_name || user?.user_metadata?.full_name || "",
        email: user?.email || "",
        phone: uData?.phone || "",
        dob: uData?.dob || "",
        gender: uData?.gender || "",
        city: uData?.city || "",
        area: uData?.area || "",
        avatarUrl: uData?.avatar_url || user?.user_metadata?.avatar_url || "",
        bio: tData?.bio || "",
        hourlyRate: tData?.hourly_rate || 0,
        experience: tData?.experience || "",
        skills: tData?.skills || []
      });

      if (confirmedIsTasker && !preferredView) {
        setShowRoleSelector(true);
      } else if (preferredView) {
        setIsTaskerView(preferredView === 'tasker');
      } else {
        // If they only have one role, set it accordingly
        setIsTaskerView(confirmedIsTasker);
      }

      if (confirmedIsTasker && tData) {
        setTaskerProfile(tData);

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

        // Fetch average rating from reviews left by this customer for taskers
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('rating')
          .eq('customer_id', user?.id);
        if (reviewData && reviewData.length > 0) {
          const avgRating = reviewData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewData.length;
          setStats(prev => ({ ...prev, avgRating }));
        }
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

      // Fetch loyalty points
      const { data: loyData } = await supabase.from('loyalty_points').select('points, tier').eq('user_id', user?.id).maybeSingle();
      if (loyData) setLoyalty(loyData);

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    notifChannelIdRef.current += 1;
    const currentChannelId = notifChannelIdRef.current;

    let isMounted = true;
    let channel: any = null;

    const setupSubscription = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const uniqueId = Math.random().toString(36).substring(2, 10);
      const channelName = `dashboard-notifs-${user.id}-${uniqueId}`;

      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload: any) => {
          if (isMounted && currentChannelId === notifChannelIdRef.current) {
            setNotifications((prev: any[]) => [payload.new, ...prev].slice(0, 10));
            setSuccess(`New Notification: ${(payload.new as any).title}`);
            setTimeout(() => {
              if (isMounted && currentChannelId === notifChannelIdRef.current) setSuccess(null);
            }, 5000);
          }
        })
        .subscribe();

      channelRef.current = channel;
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      channelRef.current = null;
    };
  }, [user?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict Nepal Phone Validation (NTC, Ncell, Smart)
    const phoneRegex = /^9[678]\d{8}$/;
    if (profileForm.phone && !phoneRegex.test(profileForm.phone)) {
      setError("Invalid Nepal number (98XXXXXXXX, 97XXXXXXXX, or 96XXXXXXXX)");
      setTimeout(() => setError(null), 4000);
      return;
    }

    // Age Validation (Min 18 Years)
    if (profileForm.dob) {
      const birthDate = new Date(profileForm.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      if (age < 18) {
        setError("Legal Notice: You must be at least 18 years old to register as a service provider or customer.");
        setTimeout(() => setError(null), 5000);
        return;
      }
      if (birthDate > today) {
        setError("Date of birth cannot be in the future.");
        setTimeout(() => setError(null), 4000);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Update Public.Users (Shared info) - Use upsert to handle cases where initial record creation failed
      const { error: userError } = await supabase.from('users').upsert({
        id: user?.id,
        email: user?.email,
        full_name: profileForm.fullName,
        phone: profileForm.phone || null,
        dob: profileForm.dob || null,
        gender: profileForm.gender || null,
        city: profileForm.city || null,
        area: profileForm.area || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (userError) throw userError;

      // 2. Update Public.Taskers (Professional info)
      if (hasTaskerRole) {
        const { data: upsertedTasker, error: taskerError } = await supabase
          .from('taskers')
          .upsert({
            user_id: user?.id,
            bio: profileForm.bio,
            hourly_rate: profileForm.hourlyRate,
            experience: profileForm.experience,
            city: profileForm.city || null,
            area: profileForm.area || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
          .select('id')
          .single();

        if (taskerError) throw taskerError;

        // Sync tasker_skills junction table (Phase 1.13)
        if (upsertedTasker) {
          const taskerId = upsertedTasker.id;

          // Delete old junction rows
          await supabase
            .from("tasker_skills")
            .delete()
            .eq("tasker_id", taskerId);

          // Insert new junction rows
          if (profileForm.skills.length > 0) {
            const skillRows = profileForm.skills.map((skillId: string) => ({
              tasker_id: taskerId,
              service_id: skillId,
              skill_level: 'Intermediate',
              hourly_rate: profileForm.hourlyRate
            }));

            const { error: skillsError } = await supabase
              .from("tasker_skills")
              .insert(skillRows);

            if (skillsError) {
              console.error("Failed to sync tasker_skills junction:", skillsError);
            }
          }
        }
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

  // Legal status transitions (mirrors server-side trigger)
  const LEGAL_TRANSITIONS: Record<string, string[]> = {
    'pending_acceptance': ['accepted', 'declined', 'cancelled'],
    'pending': ['confirmed', 'accepted', 'cancelled', 'rejected'],
    'declined': ['pending_acceptance', 'cancelled'],
    'confirmed': ['accepted', 'cancelled', 'rejected'],
    'accepted': ['on-the-way', 'arrived', 'in-progress', 'cancelled'],
    'on-the-way': ['arrived', 'in-progress', 'cancelled'],
    'arrived': ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'disputed'],
    'completed': ['disputed'],
    'disputed': ['completed', 'cancelled'],
    'cancelled': [],
    'rejected': [],
  };

  const updateStatus = async (bookingId: string, status: string, extraData: any = {}) => {
    try {
      // Client-side transition validation (server also validates via trigger)
      const currentBooking = bookings.find(b => b.id === bookingId);
      if (currentBooking) {
        const allowedTransitions = LEGAL_TRANSITIONS[currentBooking.status] || [];
        if (!allowedTransitions.includes(status)) {
          showError(`Cannot change status from "${currentBooking.status}" to "${status}".`);
          return;
        }
      }

      const updatePayload: any = { status };
      if (extraData.total_amount) updatePayload.total_amount = extraData.total_amount;
      if (extraData.arrived_at) updatePayload.arrived_at = extraData.arrived_at;
      if (extraData.departed_at) updatePayload.departed_at = extraData.departed_at;
      if (extraData.checklist) updatePayload.checklist = extraData.checklist;

      const { error: updateError } = await supabase.from('bookings').update(updatePayload).eq('id', bookingId);

      if (updateError) {
        // Check if it's a server-side transition validation error
        if (updateError.message.includes('Cannot transition from')) {
          showError(updateError.message);
        } else {
          throw updateError;
        }
        return;
      }

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

        // Mark review prompt as sent on completion
        if (status === 'completed') {
          supabase.rpc('mark_review_prompt_sent', { p_booking_id: bookingId }).then(() => {}).catch(() => {});
        }
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

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    if (!e.target.files || !e.target.files[0] || !taskerProfile?.id) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      showError("File too large. Max size 5MB.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${docId}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage.from('documents').upload(fileName, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const updatedDocs = {
        ...(taskerProfile.documents || {}),
        [docId]: publicUrl
      };

      const { error: updateErr } = await supabase.from('taskers').update({ documents: updatedDocs }).eq('id', taskerProfile.id);
      if (updateErr) throw updateErr;

      const { data: existingKyc } = await supabase
        .from('tasker_kyc')
        .select('*')
        .eq('tasker_id', taskerProfile.id)
        .maybeSingle();

      const kycFields: Record<string, any> = {
        tasker_id: taskerProfile.id,
        document_type: existingKyc?.document_type || (docId === 'license' ? 'driving_license' : 'nagarikta'),
        document_front_url: existingKyc?.document_front_url || 'pending_upload',
        document_back_url: existingKyc?.document_back_url || null,
        selfie_url: existingKyc?.selfie_url || null,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };

      if (docId === 'citizenship') {
        kycFields.document_front_url = publicUrl;
        kycFields.document_type = 'nagarikta';
      } else if (docId === 'license') {
        kycFields.document_back_url = publicUrl;
        kycFields.document_type = existingKyc?.document_type || 'driving_license';
      } else if (docId === 'other') {
        kycFields.selfie_url = publicUrl;
      }

      const { error: kycErr } = await supabase.from('tasker_kyc').upsert(kycFields, { onConflict: 'tasker_id' });
      if (kycErr) throw kycErr;

      showSuccess(`${docId.toUpperCase()} document uploaded successfully!`);
      fetchData();
    } catch (err: any) {
      showError("Failed to upload document: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (!taskerProfile?.id || !taskerProfile?.documents?.[docId]) return;
    setConfirmDeleteDoc(docId);
  };

  const executeDeleteDocument = async () => {
    const docId = confirmDeleteDoc;
    if (!docId || !taskerProfile?.id || !taskerProfile?.documents?.[docId]) {
      setConfirmDeleteDoc(null);
      return;
    }
    setConfirmDeleteDoc(null);
    setIsSubmitting(true);
    try {
      const docUrl = taskerProfile.documents[docId];

      let filePath = "";
      const matchStr = `/storage/v1/object/public/documents/`;
      if (docUrl.includes(matchStr)) {
        filePath = docUrl.split(matchStr)[1];
      }

      if (filePath) {
        await supabase.storage.from('documents').remove([filePath]);
      }

      const updatedDocs = { ...(taskerProfile.documents || {}) };
      delete updatedDocs[docId];

      const { error: updateErr } = await supabase.from('taskers').update({ documents: updatedDocs }).eq('id', taskerProfile.id);
      if (updateErr) throw updateErr;

      const kycUpdates: Record<string, any> = {};
      if (docId === 'citizenship') kycUpdates.document_front_url = null;
      if (docId === 'license') kycUpdates.document_back_url = null;
      if (docId === 'other') kycUpdates.selfie_url = null;

      await supabase.from('tasker_kyc').update(kycUpdates).eq('tasker_id', taskerProfile.id);

      showSuccess(`${docId.toUpperCase()} document deleted successfully.`);
      fetchData();
    } catch (err: any) {
      showError("Failed to delete document: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user?.id) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      showError("File too large. Max size 5MB.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updateErr } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateErr) throw updateErr;

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setProfileForm(prev => ({
        ...prev,
        avatarUrl: publicUrl
      }));

      showSuccess("Profile picture updated successfully!");
      fetchData();
    } catch (err: any) {
      showError("Failed to update profile picture: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim()) return;

    setOnboardingSubmitting(true);
    try {
      await supabase.from("users").update({
        full_name: onboardingName.trim(),
        phone: onboardingPhone.trim(),
        onboarded: true
      }).eq("id", user?.id);

      setNeedsOnboarding(false);
      showSuccess("Profile completed! Welcome to SewaKhoj 🎉");
    } catch (err: any) {
      showError("Failed to save: " + err.message);
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  const handleOnboardingSkip = () => {
    setNeedsOnboarding(false);
  };

  const handleDeleteTaskerProfile = () => {
    setConfirmDeleteTasker(true);
  };

  const executeDeleteTaskerProfile = async () => {
    setConfirmDeleteTasker(false);
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

  const handleDeactivateAccount = () => {
    setConfirmDeactivate(true);
  };

  const executeDeactivateAccount = async () => {
    setConfirmDeactivate(false);
    setIsSubmitting(true);
    try {
      // 1. Check for active bookings
      const { data: activeBookings, error: bError } = await supabase
        .from('bookings')
        .select('id')
        .or(`customer_id.eq.${user?.id},tasker_id.eq.${user?.id}`)
        .in('status', ['pending_acceptance', 'pending', 'confirmed', 'accepted', 'on-the-way', 'arrived', 'in-progress']);

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

  const handleDeleteMyData = () => {
    setConfirmDeleteData(true);
  };

  const executeDeleteMyData = async () => {
    setConfirmDeleteData(false);
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("tasker_kyc")
        .update({ deletion_requested_at: new Date().toISOString() })
        .eq("tasker_id", taskerProfile?.id);
      if (error) throw error;
      showSuccess("KYC deletion requested. Your documents will be permanently deleted within 30 days.");
    } catch (err: any) {
      showError("Failed to request deletion: " + err.message);
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

  const handleAcceptBid = (task: any, bid: any) => {
    setConfirmAcceptBid({ task, bid });
  };

  const executeAcceptBid = async () => {
    if (!confirmAcceptBid) return;
    const { task, bid } = confirmAcceptBid;
    setConfirmAcceptBid(null);
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
      const taskerUserId = bid.tasker.user_id || (await supabase.from('taskers').select('user_id').eq('id', bid.tasker_id).single()).data?.user_id;
      await supabase.from('notifications').insert({
        user_id: taskerUserId,
        title: "Bid Accepted! 🎉",
        message: `Your bid of Rs ${bid.bid_amount} for "${task.title}" was accepted. Check your active tasks!`,
        type: 'success'
      });

      // SMS to tasker — fire-and-forget
      if (taskerUserId) {
        const { data: taskerUser } = await supabase.from('users').select('phone').eq('id', taskerUserId).single();
        if (taskerUser?.phone) {
          sendTaskerAlert(
            taskerUser.phone,
            user?.user_metadata?.full_name || user?.email || "Customer",
            task.category_id || "service",
            task.location_name || "your area"
          ).catch(() => {});
        }
      }

      showSuccess("Specialist hired! Booking created.");
      fetchData();
    } catch (err: any) {
      showError("Failed to hire: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setConfirmDeletePost(postId);
  };

  const executeDeletePost = async () => {
    if (!confirmDeletePost) return;
    const postId = confirmDeletePost;
    setConfirmDeletePost(null);
    try {
      await supabase.from('market_tasks').delete().eq('id', postId);
      showSuccess("Task withdrawn.");
      fetchData();
    } catch (err: any) {
      showError("Failed to withdraw: " + err.message);
    }
  };

  const executeDeclineBooking = async () => {
    const booking = confirmDeclineBooking;
    if (!booking) {
      setConfirmDeclineBooking(null);
      return;
    }
    setConfirmDeclineBooking(null);
    try {
      const res = await fetch('/api/bookings/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDetailModalOpen(false);
        showSuccess("Booking declined.");
      } else {
        showError("Failed to decline booking.");
      }
    } catch (err: any) {
      showError("Failed to decline booking: " + err.message);
    }
  };

  const executeAcceptWithConflict = async () => {
    const item = confirmAcceptWithConflict;
    if (!item) {
      setConfirmAcceptWithConflict(null);
      return;
    }
    const { booking, conflicts, mode } = item;
    setConfirmAcceptWithConflict(null);
    try {
      if (mode === 'accept') {
        const res = await fetch('/api/bookings/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id }),
        });
        const data = await res.json();
        if (data.success) {
          setIsDetailModalOpen(false);
          fetchData();
        } else {
          showError("Failed to accept booking.");
        }
      } else if (mode === 'accept_task') {
        updateStatus(booking.id, 'accepted');
      }
    } catch (err: any) {
      showError("Failed: " + err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <LoadingSpinner size="lg" variant="brand" />
        <p className="font-black text-gray-900 uppercase tracking-widest text-xs animate-pulse">{tdash("initializing")}</p>
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
              {accountStatus === 'suspended' ? tdash("accountSuspended") : tdash("accountDeactivated")}
            </h2>
            <p className="text-gray-500 font-bold text-sm leading-relaxed">
              {accountStatus === 'suspended'
                ? tdash("suspendedMsg")
                : tdash("deactivatedMsg")}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRequestReactivation}
              disabled={isSubmitting}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all disabled:opacity-50"
            >
              {isSubmitting ? tdash("sending") : tdash("requestReactivation")}
            </button>

            <button
              onClick={handleExportData}
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-50 text-blue-700 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {tdash("downloadData")}
            </button>

            <button
              onClick={() => { supabase.auth.signOut(); router.push('/'); }}
              className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-900 transition-colors"
            >
              {tdash("logout")}
            </button>
          </div>

          <p className="text-[10px] text-gray-400 font-bold">
            {tdash("needHelp")}
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
          <div className="flex items-center gap-3 mb-6 px-2">
            <Link href="/" className="flex items-center gap-3">
              <div className={`w-10 h-10 ${isTaskerView ? "bg-blue-600" : "bg-sewakhoj-red"} rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg`}>S</div>
              <div>
                <h1 className={`font-black ${isTaskerView ? "text-white" : "text-gray-900"} text-lg leading-tight`}>SewaKhoj</h1>
                <p className={`text-[10px] ${isTaskerView ? "text-slate-400" : "text-gray-500"} uppercase font-black tracking-widest`}>Portal HQ</p>
              </div>
            </Link>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-auto p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 space-y-1.5">
            <Link
              href="/"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${isTaskerView ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <ArrowLeft className="w-4 h-4" /> {tdash("backToHome")}
            </Link>
            <SidebarItem isTasker={isTaskerView} icon={<LayoutDashboard />} label={tdash("overview")} active={activeSection === 'overview'} onClick={() => { setActiveSection('overview'); setIsSidebarOpen(false); }} />
            <SidebarItem isTasker={isTaskerView} icon={<Briefcase />} label={tdash("myTasks")} active={activeSection === 'tasks'} onClick={() => { setActiveSection('tasks'); setIsSidebarOpen(false); }} badge={bookings.filter(b => b.status === 'pending').length} />
            {!isTaskerView && <SidebarItem isTasker={isTaskerView} icon={<Search className="w-5 h-5" />} label={tdash("browsePros")} active={false} onClick={() => { router.push('/browse'); setIsSidebarOpen(false); }} />}
            {!isTaskerView && <SidebarItem isTasker={isTaskerView} icon={<Heart className="w-5 h-5" />} label={tdash("savedTaskers")} active={activeSection === 'favorites'} onClick={() => { setActiveSection('favorites'); setIsSidebarOpen(false); }} />}
            {isTaskerView && <SidebarItem isTasker={isTaskerView} icon={<Wallet />} label={tdash("earnings")} active={activeSection === 'finance'} onClick={() => { setActiveSection('finance'); setIsSidebarOpen(false); }} />}
            {isTaskerView && <SidebarItem isTasker={isTaskerView} icon={<Star />} label={tdash("reviews")} active={activeSection === 'reviews'} onClick={() => { setActiveSection('reviews'); setIsSidebarOpen(false); }} />}
            <SidebarItem isTasker={isTaskerView} icon={<UserCircle />} label={tdash("profileSettings")} active={activeSection === 'profile' || activeSection === 'security'} onClick={() => { setActiveSection('profile'); setIsSidebarOpen(false); }} />
            <SidebarItem isTasker={isTaskerView} icon={<History />} label={tdash("activityLogs")} active={activeSection === 'logs'} onClick={() => { setActiveSection('logs'); setIsSidebarOpen(false); }} />

            {/* Marketplace Bidding Entry Points */}
            {isTaskerView ? (
              <SidebarItem isTasker={isTaskerView} icon={<Search className="w-5 h-5" />} label={tdash("availableJobs")} active={activeSection === 'market_jobs'} onClick={() => { setActiveSection('market_jobs'); setIsSidebarOpen(false); }} />
            ) : (
              <SidebarItem isTasker={isTaskerView} icon={<Plus className="w-5 h-5" />} label={tdash("postTask")} onClick={() => router.push('/post-task')} />
            )}
            {!isTaskerView && <SidebarItem isTasker={isTaskerView} icon={<FileText className="w-5 h-5" />} label={tdash("myPostedTasks")} active={activeSection === 'my_posts'} onClick={() => { setActiveSection('my_posts'); setIsSidebarOpen(false); }} />}

            {/* Admin Portal Link for privileged users */}
            {(isAdmin || user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'super_admin') && (
              <div className="pt-4 mt-4 border-t border-gray-100/10">
                <Link
                  href="/admin"
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${isTaskerView ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                  <ShieldCheck className="w-4 h-4 text-sewakhoj-red" /> {tdash("adminPortalHub")}
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
                  <ArrowUpRight className="w-4 h-4" /> {isTaskerView ? tdash("switchToCustomer") : tdash("switchToTasker")}
                </button>
              </div>
            )}
          </div>

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
              <LogOut className="w-5 h-5" /> {tdash("logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className={`sticky top-0 z-30 ${isTaskerView ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-gray-100"} backdrop-blur-md border-b px-6 py-4 flex items-center justify-between`}>
          <PageHeader
            title={isTaskerView ? tdash("taskerDashboard") : tdash("customerDashboard")}
            className={`mb-0 [&_.title-wrapper]:hidden p-0 bg-transparent ${isTaskerView ? "[&_.breadcrumbs]:text-slate-300 [&_.breadcrumbs_active]:text-white [&_.breadcrumbs_separator]:text-slate-500" : ""}`}
          />
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
            <Menu className={`w-6 h-6 ${isTaskerView ? "text-white" : "text-gray-700"}`} />
          </button>
          <h2 className={`text-sm font-black ${isTaskerView ? "text-white" : "text-gray-900"} uppercase tracking-widest hidden md:block`}>
            {activeSection} / {isTaskerView ? tdash("taskerDashboard") : tdash("customerArea")}
          </h2>
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-gray-100 hidden md:block"></div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-black uppercase leading-none mb-1">{tdash("localTime")}</p>
              <p className="text-xs font-black text-gray-900">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>

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

          {/* Profile Completion Banner — shown when onboarded === false */}
          {needsOnboarding && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-[32px] p-6 md:p-8 mb-8 animate-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-black text-gray-900 mb-2">{tdash("welcomeOnboarding")}</h3>
                  <p className="text-sm font-bold text-gray-600">{tdash("onboardingDesc")}</p>
                </div>
                <form onSubmit={handleOnboardingSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder={tdash("fullNamePlaceholder")}
                    value={onboardingName}
                    onChange={(e) => setOnboardingName(e.target.value)}
                    required
                    className="bg-white border-2 border-blue-200 focus:border-blue-500 rounded-2xl px-4 py-3 font-bold text-sm outline-none transition-all min-w-[180px]"
                  />
                  <input
                    type="tel"
                    placeholder={tdash("phonePlaceholder")}
                    value={onboardingPhone}
                    onChange={(e) => setOnboardingPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="bg-white border-2 border-blue-200 focus:border-blue-500 rounded-2xl px-4 py-3 font-bold text-sm outline-none transition-all min-w-[180px]"
                  />
                  <button
                    type="submit"
                    disabled={onboardingSubmitting}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {onboardingSubmitting ? tdash("saving") : tcommon("save")}
                  </button>
                  <button
                    type="button"
                    onClick={handleOnboardingSkip}
                    className="text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest px-3 py-3 transition-colors whitespace-nowrap"
                  >
                    {tdash("skipForNow")}
                  </button>
                </form>
              </div>
            </div>
          )}
          {activeSection === 'overview' && <OverviewSection isTasker={isTaskerView} stats={stats} bookings={bookings} setSelectedBooking={setSelectedBooking} setIsDetailModalOpen={setIsDetailModalOpen} taskerProfile={taskerProfile} setActiveSection={setActiveSection} loyalty={loyalty} />}
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
              onDeleteMyData={handleDeleteMyData}
              handleUploadDocument={handleUploadDocument}
              handleDeleteDocument={handleDeleteDocument}
              handleUploadAvatar={handleUploadAvatar}
            />
          )}
          {activeSection === 'market_jobs' && <MarketJobsSection tasks={marketTasks} myBids={myBids} onBid={handleBid} />}
          {activeSection === 'my_posts' && <MyPostsSection tasks={marketTasks} onAcceptBid={handleAcceptBid} onDeletePost={handleDeletePost} />}
          {activeSection === 'reviews' && isTaskerView && taskerProfile?.id && <ReviewsSection taskerId={taskerProfile!.id} />}
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
          confirmDeclineBooking={setConfirmDeclineBooking}
          confirmAcceptWithConflict={setConfirmAcceptWithConflict}
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

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmDeleteTasker}
        onConfirm={executeDeleteTaskerProfile}
        onCancel={() => setConfirmDeleteTasker(false)}
        title={tdash("closeTaskerProfile")}
        message={tdash("closeTaskerMsg")}
        variant="danger"
        confirmLabel={tdash("closeProfile")}
        loading={isSubmitting}
      />
      <ConfirmDialog
        open={confirmDeactivate}
        onConfirm={executeDeactivateAccount}
        onCancel={() => setConfirmDeactivate(false)}
        title={tdash("deactivateAccount")}
        message={tdash("deactivateMsg")}
        variant="danger"
        confirmLabel={tdash("deactivate")}
        loading={isSubmitting}
      />
      <ConfirmDialog
        open={confirmDeleteData}
        onConfirm={executeDeleteMyData}
        onCancel={() => setConfirmDeleteData(false)}
        title={tdash("deleteAllData")}
        message={tdash("deleteAllDataMsg")}
        variant="danger"
        confirmLabel={tdash("deleteEverything")}
        loading={isSubmitting}
      />
      <ConfirmDialog
        open={confirmAcceptBid !== null}
        onConfirm={executeAcceptBid}
        onCancel={() => setConfirmAcceptBid(null)}
        title={tdash("hireTasker")}
        message={confirmAcceptBid ? `Are you sure you want to hire this tasker for NRs ${confirmAcceptBid.bid.bid_amount}? They will be notified immediately.` : ''}
        variant="default"
        confirmLabel={tdash("confirmHire")}
        loading={isSubmitting}
      />
      <ConfirmDialog
        open={confirmDeletePost !== null}
        onConfirm={executeDeletePost}
        onCancel={() => setConfirmDeletePost(null)}
        title={tdash("withdrawTask")}
        message="Are you sure you want to withdraw this task posting? All associated bids will be lost."
        variant="danger"
        confirmLabel={tdash("withdrawTask")}
      />
      <ConfirmDialog
        open={confirmDeleteDoc !== null}
        onConfirm={executeDeleteDocument}
        onCancel={() => setConfirmDeleteDoc(null)}
        title={tdash("deleteDocument")}
        message={confirmDeleteDoc ? `Are you sure you want to delete your ${confirmDeleteDoc.toUpperCase()} document?` : ''}
        variant="danger"
        confirmLabel={tcommon("delete")}
        loading={isSubmitting}
      />
      <ConfirmDialog
        open={confirmDeclineBooking !== null}
        onConfirm={executeDeclineBooking}
        onCancel={() => setConfirmDeclineBooking(null)}
        title={tdash("declineBooking")}
        message="Are you sure you want to decline this booking? It will be offered to another tasker."
        variant="danger"
        confirmLabel={tdash("decline")}
      />
      <ConfirmDialog
        open={confirmAcceptWithConflict !== null}
        onConfirm={executeAcceptWithConflict}
        onCancel={() => setConfirmAcceptWithConflict(null)}
        title={tdash("schedulingConflict")}
        message={confirmAcceptWithConflict ? `⚠️ You have ${confirmAcceptWithConflict.conflicts} conflicting booking(s) at this time. Accept anyway?` : ''}
        variant="danger"
        confirmLabel={tdash("acceptAnyway")}
      />
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

function OverviewSection({ isTasker, stats, bookings, setSelectedBooking, setIsDetailModalOpen, taskerProfile, setActiveSection, loyalty }: any) {
  const tdash = useTranslations("dashboard");
  const isPending = isTasker && taskerProfile?.status === 'pending';
  const recentBookings = bookings.slice(0, 3);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">
            {isTasker ? tdash("taskerDashboard") : tdash("welcomeBack")}
          </h3>
          <p className="text-gray-500 font-bold mt-2">
            {isTasker
              ? tdash("taskerHubDesc")
              : tdash("customerHubDesc")}
          </p>
        </div>
        {isPending && (
          <div className="flex items-center gap-3 bg-amber-50 text-amber-700 px-6 py-3 rounded-2xl border border-amber-100 animate-pulse">
            <Clock className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{tdash("profileUnderReview")}</span>
          </div>
        )}
      </div>

      {/* --- Verification Roadmap for Pending Taskers --- */}
      {isPending && (
        <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-xl shadow-slate-200/50 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h4 className="text-xl font-black text-gray-900">{tdash("verificationRoadmap")}</h4>
              <p className="text-sm font-bold text-gray-400">{tdash("roadmapDesc")}</p>
            </div>
            <div className="px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
              {tdash("estApproval")}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Progress Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0" />

            {[
              { step: 1, label: tdash("stepSubmitted"), desc: tdash("submittedDesc"), status: 'complete' },
              { step: 2, label: tdash("stepKycReview"), desc: tdash("kycReviewDesc"), status: 'active' },
              { step: 3, label: tdash("stepQualityAudit"), desc: tdash("qualityAuditDesc"), status: 'pending' },
              { step: 4, label: tdash("stepGoLive"), desc: tdash("goLiveDesc"), status: 'pending' }
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
                <Info className="w-4 h-4" /> {tdash("whyImportant")}
              </h5>
              <p className="text-xs font-bold text-gray-500 leading-relaxed">
                {tdash("whyImportantDesc")}
              </p>
            </div>
            <button
              onClick={() => setActiveSection('profile')}
              className="bg-white text-gray-900 border-2 border-gray-200 px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all whitespace-nowrap"
            >
              {tdash("polishProfile")}
            </button>
          </div>
        </div>
      )}

      {/* 🔔 Pending Acceptance Banner — shows bookings awaiting tasker response */}
      {isTasker && (() => {
        const pendingAcceptanceBookings = bookings.filter((b: any) => b.status === 'pending_acceptance');
        if (pendingAcceptanceBookings.length === 0) return null;
        return (
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 rounded-[40px] text-white shadow-xl shadow-red-200 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black">{tdash("actionRequired")} — {pendingAcceptanceBookings.length} {tdash("pendingRequest")}{pendingAcceptanceBookings.length > 1 ? 's' : ''}</h4>
                <p className="text-red-100 text-xs font-bold">{tdash("respondBy")}</p>
              </div>
            </div>
            <div className="space-y-4">
              {pendingAcceptanceBookings.map((b: any) => {
                const deadline = b.acceptance_deadline ? new Date(b.acceptance_deadline).getTime() : null;
                const now = Date.now();
                const remaining = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : 0;
                const mins = Math.floor(remaining / 60);
                const secs = remaining % 60;
                const isUrgent = remaining < 300; // Less than 5 minutes
                return (
                  <div key={b.id} onClick={() => { setSelectedBooking(b); setIsDetailModalOpen(true); }} className={`bg-white/10 backdrop-blur-sm p-5 rounded-2xl border cursor-pointer transition-all hover:bg-white/20 ${isUrgent ? 'border-red-300 animate-pulse' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                          {serviceData.find(s => s.id === b.service)?.emoji || '🔧'}
                        </div>
                        <div>
                          <h5 className="font-black">{serviceData.find(s => s.id === b.service)?.nameEn || b.service}</h5>
                          <p className="text-xs text-red-100 font-bold">{b.booking_date} • {b.booking_time} • Rs {b.total_amount}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black tabular-nums ${isUrgent ? 'text-yellow-300' : 'text-white'}`}>
                          {mins}:{secs.toString().padStart(2, '0')}
                        </p>
                        <p className="text-[10px] text-red-200 font-bold uppercase">{tdash("remaining")}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Metrics Row (Only for active taskers or all customers) */}
      {(!isTasker || taskerProfile?.status === 'active') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Briefcase />} label={isTasker ? tdash("activeJobs") : tdash("activeTasks")} value={stats.active} color="blue" />
          <StatCard icon={<CheckCircle2 />} label={tdash("completed")} value={stats.completed} color="green" />
          {isTasker ? (
            <>
              <StatCard icon={<Activity />} label={tdash("totalEarnings")} value={`Rs ${stats.totalEarnings}`} color="purple" />
              <StatCard icon={<Wallet />} label={tdash("netWallet")} value={`Rs ${stats.pendingEarnings - stats.commissionOwed}`} color={stats.pendingEarnings >= stats.commissionOwed ? "green" : "red"} />
            </>
          ) : (
            <>
              <StatCard icon={<Star />} label={tdash("averageRating")} value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"} color="purple" />
              <StatCard icon={<Activity />} label={tdash("totalTasks")} value={bookings.length} color="amber" />
            </>
          )}
        </div>
      )}

      {/* Loyalty Tier Badge (Customer View) */}
      {!isTasker && loyalty && (
        <div className="flex justify-end">
          <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border ${
            loyalty.tier === 'platinum' ? 'bg-purple-50 border-purple-200 text-purple-700' :
            loyalty.tier === 'gold' ? 'bg-amber-50 border-amber-200 text-amber-700' :
            loyalty.tier === 'silver' ? 'bg-gray-100 border-gray-200 text-gray-600' :
            'bg-orange-50 border-orange-200 text-orange-700'
          }`}>
            <Award className="w-5 h-5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">{loyalty.tier} {tdash("tier")}</p>
              <p className="text-xs font-bold">{loyalty.points} {tdash("points")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{tdash("recentTasks")}</h4>
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
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{tdash("budget")}</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-gray-400 font-bold p-10 text-center bg-white rounded-3xl border border-dashed">{tdash("noRecentTasks")}</p>}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{tdash("systemStatus")}</h4>
          {isTasker && (
            <div className="bg-gray-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
              <ShieldCheck className="w-8 h-8 text-green-400 mb-4" />
              <h5 className="font-black text-lg mb-1">{tdash("kycVerification")}</h5>
              <p className="text-white/60 text-xs font-bold leading-relaxed mb-6">
                {taskerProfile?.id_verified ? tdash("identityVerified") : tdash("verificationInProgress")}
              </p>
              <div className="h-1.5 w-full bg-white/10 rounded-full mb-6">
                <div className={`h-full bg-green-500 rounded-full transition-all duration-1000 ${taskerProfile?.id_verified ? 'w-full' : 'w-2/3 animate-pulse'}`}></div>
              </div>
              <button onClick={() => setActiveSection('profile')} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all">{tdash("manageDocuments")}</button>
            </div>
          )}
          {isTasker && taskerProfile && (
            <div className="bg-white rounded-[32px] p-6 border border-gray-100">
              <TrustScoreBreakdown taskerId={taskerProfile.id} />
            </div>
          )}
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 space-y-3">
             <SupportLink icon={<MessageCircle className="w-4 h-4" />} label={tdash("liveChat")} href="/chat" color="text-green-600" />
             <SupportLink icon={<FileText className="w-4 h-4" />} label={tdash("helpCenter")} href="/faq" color="text-blue-600" />
             <SupportLink icon={<Phone className="w-4 h-4" />} label={tdash("emergencyHotline")} href="tel:+9770123456" color="text-red-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksSection({ bookings, setSelectedBooking, setIsDetailModalOpen }: any) {
  const tdash = useTranslations("dashboard");
  const [filter, setFilter] = useState('all');
  const filtered = bookings.filter((b: any) => filter === 'all' || b.status === filter);
  const filterLabels: Record<string, string> = {
    all: tdash("filterAll"),
    pending_acceptance: tdash("filterPendingAcceptance"),
    pending: tdash("filterPending"),
    accepted: tdash("filterAccepted"),
    'on-the-way': tdash("filterOnTheWay"),
    arrived: tdash("filterArrived"),
    'in-progress': tdash("filterInProgress"),
    completed: tdash("filterCompleted")
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
        <h3 className="text-3xl font-black text-gray-900">{tdash("myTasks")}</h3>
        <div className="w-full md:w-auto">
          <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
            {['all', 'pending_acceptance', 'pending', 'accepted', 'on-the-way', 'arrived', 'in-progress', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 md:flex-none px-3 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {filterLabels[f] || f}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-gray-100">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h4 className="text-lg font-black text-gray-900 mb-2">{tdash("noTasksFound")}</h4>
            <p className="text-gray-500 text-sm font-bold">{tdash("noTasksFoundDesc")}</p>
          </div>
        ) : filtered.map((b: any) => (
          <div key={b.id} onClick={() => { setSelectedBooking(b); setIsDetailModalOpen(true); }} className="bg-white rounded-[32px] border border-gray-100 p-6 hover:shadow-xl transition-all cursor-pointer group">
            <div className="flex justify-between mb-6">
              <div className="w-14 h-14 bg-[#F8FAFC] rounded-2xl flex items-center justify-center text-3xl group-hover:bg-red-50 transition-colors">{serviceData.find(s => s.id === b.service)?.emoji || '🔧'}</div>
              <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700">{b.status}</span>
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-1 leading-tight">{serviceData.find(s => s.id === b.service)?.nameEn || b.service}</h4>
            <p className="text-xs font-bold text-gray-500 mb-6">{b.booking_date} • {b.booking_time}</p>
            <div className="flex items-center justify-between pt-6 border-t border-gray-50">
              <div><p className="text-[10px] text-gray-400 font-black uppercase">{tdash("budget")}</p><p className="text-sm font-black text-gray-900">Rs {b.total_amount}</p></div>
              <button className="text-xs font-black text-sewakhoj-red flex items-center gap-1 group-hover:translate-x-1 transition-transform">{tdash("details")} <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceSection({ ledger, stats }: any) {
  const tdash = useTranslations("dashboard");
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<any>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showPayoutHistory, setShowPayoutHistory] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [payoutError, setPayoutError] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState("");
  const [balance, setBalance] = useState(0);

  // Fetch payout method and history on mount
  useEffect(() => {
    const fetchPayoutData = async () => {
      // Get the tasker record for this user
      const { data: tData } = await supabase
        .from("taskers")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();
      if (!tData) return;

      // Get payout methods
      const { data: pm } = await supabase
        .from("payout_methods")
        .select("*")
        .eq("tasker_id", tData.id)
        .maybeSingle();
      setPayoutMethods(pm);

      // Get payout history
      const { data: pData } = await supabase
        .from("payouts")
        .select("*")
        .eq("tasker_id", tData.id)
        .order("created_at", { ascending: false });
      if (pData) setPayouts(pData);

      // Get available balance
      const { data: bal } = await supabase.rpc("get_tasker_payout_balance", {
        p_tasker_id: tData.id,
      });
      if (bal !== null) setBalance(Number(bal));
    };
    fetchPayoutData();
  }, []);

  const handleRequestPayout = async () => {
    setRequesting(true);
    setPayoutError("");
    setPayoutSuccess("");

    try {
      const { data: tData } = await supabase
        .from("taskers")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();
      if (!tData) throw new Error("Tasker profile not found");

      // Use the stored payout method or default to bank_transfer if none
      const method = payoutMethods?.method || "bank_transfer";
      const details = payoutMethods ? {
        account_holder: payoutMethods.account_holder,
        account_number: payoutMethods.account_number,
        bank_name: payoutMethods.bank_name,
      } : {};

      const { data: payoutId, error } = await supabase.rpc("request_payout", {
        p_tasker_id: tData.id,
        p_method: method,
        p_details: details,
      });

      if (error) throw error;
      setPayoutSuccess(`Payout requested successfully! Reference: ${payoutId}`);
      setShowPayoutModal(false);

      // Refresh payout list
      const { data: pData } = await supabase
        .from("payouts")
        .select("*")
        .eq("tasker_id", tData.id)
        .order("created_at", { ascending: false });
      if (pData) setPayouts(pData);

      // Refresh balance
      const { data: bal } = await supabase.rpc("get_tasker_payout_balance", {
        p_tasker_id: tData.id,
      });
      if (bal !== null) setBalance(Number(bal));
    } catch (err: any) {
      setPayoutError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const availableBalance = balance > 0 ? balance : stats.totalEarnings;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-black text-gray-900">{tdash("earningsWallet")}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPayoutHistory(!showPayoutHistory)}
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            {showPayoutHistory ? "Hide History" : "Payout History"}
          </button>
        </div>
      </div>

      {payoutSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-bold text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          {payoutSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-sewakhoj-red rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
          <Wallet className="w-12 h-12 mb-6 opacity-20" />
          <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">{tdash("availableBalance")}</p>
          <h4 className="text-4xl font-black">Rs {Number(availableBalance).toLocaleString()}</h4>
          <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
            <div className="flex justify-between">
              <div><p className="text-white/40 text-[10px] uppercase font-black">{tdash("pending")}</p><p className="font-black">Rs {Number(stats.pendingEarnings || 0).toLocaleString()}</p></div>
              <div className="text-right"><p className="text-white/40 text-[10px] uppercase font-black">Payoutable</p><p className="font-black text-emerald-300">Rs {Number(availableBalance).toLocaleString()}</p></div>
            </div>
            <button
              onClick={() => setShowPayoutModal(true)}
              disabled={availableBalance < 500}
              className="w-full bg-white text-sewakhoj-red px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableBalance < 500 ? "Min Rs 500 to withdraw" : tdash("withdraw")}
            </button>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h4 className="font-black uppercase text-sm">{tdash("recentTransactions")}</h4>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {ledger.length === 0 && (
              <div className="p-8 text-center">
                <Wallet className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-400">No transactions yet</p>
                <p className="text-[10px] text-gray-300">Complete bookings to see your earnings here</p>
              </div>
            )}
            {ledger.map((l: any) => (
              <div key={l.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.type === 'payable' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {l.type === 'payable' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-black text-sm">{l.type === 'payable' ? tdash("bookingEarning") : tdash("platformFee")}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-gray-500 font-bold">{new Date(l.created_at).toLocaleDateString()}</p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${l.status === 'settled' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {l.status}
                      </span>
                    </div>
                  </div>
                </div>
                <p className={`font-black ${l.type === 'payable' ? 'text-green-600' : 'text-red-600'}`}>Rs {Number(l.total_amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payout History Section */}
      {showPayoutHistory && (
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h4 className="font-black uppercase text-sm">Payout History</h4>
          </div>
          {payouts.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-400">No payouts yet</p>
              <p className="text-[10px] text-gray-300">Request a withdrawal to see your payout history here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payouts.map((p: any) => (
                <div key={p.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      p.status === 'failed' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {p.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                       p.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                       <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase">{p.payout_method.replace('_', ' ')}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-gray-500 font-bold">{new Date(p.created_at).toLocaleDateString()}</p>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                          p.status === 'failed' ? 'bg-red-50 text-red-600' :
                          p.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      {p.reference_id && (
                        <p className="text-[9px] font-mono text-gray-400 mt-0.5">Ref: {p.reference_id}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">Rs {Number(p.amount).toLocaleString()}</p>
                    {p.processed_at && (
                      <p className="text-[9px] text-gray-400 font-bold">
                        Processed: {new Date(p.processed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPayoutModal(false)}>
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-gray-900 mb-2">Request Payout</h3>
            <p className="text-sm text-gray-500 mb-6">Withdraw your available earnings to your registered payout method.</p>

            {payoutError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold text-xs">
                {payoutError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Available Balance</p>
                <p className="text-3xl font-black text-gray-900">Rs {Number(availableBalance).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Payout Method</p>
                {payoutMethods ? (
                  <div>
                    <p className="font-black text-gray-900 uppercase">{payoutMethods.method.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">{payoutMethods.account_holder} — {payoutMethods.account_number}</p>
                    {payoutMethods.bank_name && (
                      <p className="text-xs text-gray-400">{payoutMethods.bank_name}{payoutMethods.branch ? `, ${payoutMethods.branch}` : ''}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-amber-600">No payout method configured. Will default to bank_transfer.</p>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Minimum payout: <span className="font-bold">Rs 500</span>.
                Payouts are processed manually by the admin team and may take 1-3 business days.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={requesting || availableBalance < 500}
                className="flex-1 px-6 py-3 bg-sewakhoj-red text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {requesting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing</>
                ) : (
                  <>Withdraw Rs {Number(availableBalance).toLocaleString()}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
  onExportData,
  onDeleteMyData,
  handleUploadDocument,
  handleDeleteDocument,
  handleUploadAvatar
}: any) {
  const tdash = useTranslations("dashboard");
  const [activeTab, setActiveTab] = useState<'account' | 'professional' | 'documents' | 'security'>('account');
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
    { id: 'account', label: tdash("accountInfo"), icon: <UserCircle className="w-4 h-4" /> },
    ...(isTasker ? [
      { id: 'professional', label: tdash("professional"), icon: <Briefcase className="w-4 h-4" /> },
      { id: 'documents', label: tdash("kycDocuments"), icon: <FileText className="w-4 h-4" /> }
    ] : []),
    { id: 'security', label: tdash("securityTab"), icon: <Lock className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight uppercase">{tdash("identityHub")}</h3>
          <p className="text-xs md:text-sm text-gray-500 font-bold mt-2">{tdash("identityHubDesc")}</p>
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
                {profileForm.avatarUrl ? (
                   <img
                     src={profileForm.avatarUrl}
                     alt="Avatar"
                     className="w-full h-full object-cover"
                   />
                 ) : (
                   <img
                     src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileForm.fullName || 'User'}&gender=${profileForm.gender || 'male'}`}
                     alt="Avatar"
                     className="w-full h-full object-cover"
                   />
                 )}
                <div
                    onClick={() => document.getElementById('avatar-upload-input')?.click()}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                 >
                   <Camera className="text-white w-8 h-8" />
                 </div>
              </div>
              <input
                 id="avatar-upload-input"
                 type="file"
                 accept="image/*"
                 onChange={handleUploadAvatar}
                 className="hidden"
              />
             <div>
                <h4 className="font-black text-xl text-gray-900">{profileForm.fullName || "User Name"}</h4>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">{isTasker ? tdash("verifiedSpecialist") : tdash("verifiedMember")}</p>
             </div>

             <div className="pt-6 border-t border-gray-50 space-y-3">
                <div className={`p-4 rounded-2xl border flex items-center justify-center gap-3 ${taskerProfile?.id_verified ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                   <ShieldCheck className="w-5 h-5" />
                   <span className="text-[10px] font-black uppercase tracking-widest">{taskerProfile?.id_verified ? tdash("kycVerified") : tdash("kycPending")}</span>
                </div>
                {!taskerProfile?.id_verified && (
                  <Link href="/tasker/kyc" className="block w-full py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sewakhoj-red transition-all">{tdash("completeKyc")}</Link>
                )}
             </div>
          </div>

          {isTasker && (
             <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                <h5 className="font-black text-xs uppercase tracking-widest text-gray-400">{tdash("taskerStatus")}</h5>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500">{tdash("hourlyRateLabel")}</span>
                      <span className="font-black text-gray-900">Rs {profileForm.hourlyRate}/hr</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-500">{tdash("level")}</span>
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase">{profileForm.experience} Exp</span>
                   </div>
                </div>
                <button
                  onClick={onCloseTasker}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all"
                >
                  {tdash("closeProfessional")}
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
                    <h4 className="text-2xl font-black text-gray-900">{tdash("personalInfo")}</h4>
                    <p className="text-sm font-bold text-gray-400">{tdash("personalInfoDesc")}</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">{tdash("fullNameLabel")}</label>
                          <button type="button" onClick={() => document.getElementById('name-input')?.focus()} className="text-[10px] font-black text-blue-600 uppercase hover:underline">{tdash("edit")}</button>
                        </div>
                        <input id="name-input" type="text" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{tdash("emailLocked")}</label>
                        <input type="email" value={profileForm.email} readOnly className="w-full bg-gray-100 border-none rounded-2xl p-4 font-bold text-gray-400 cursor-not-allowed outline-none" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">{tdash("phoneLabel")}</label>
                          <button type="button" onClick={() => document.getElementById('phone-input')?.focus()} className="text-[10px] font-black text-blue-600 uppercase hover:underline">{tdash("edit")}</button>
                        </div>
                        <input id="phone-input" type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="98XXXXXXXX" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">{tdash("dob")}</label>
                          <button type="button" onClick={() => document.getElementById('dob-input')?.focus()} className="text-[10px] font-black text-blue-600 uppercase hover:underline">{tdash("edit")}</button>
                        </div>
                        <input id="dob-input" type="date" value={profileForm.dob} max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]} onChange={e => setProfileForm({...profileForm, dob: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black uppercase text-gray-400">{tdash("gender")}</label>
                          <button type="button" onClick={() => document.getElementById('gender-select')?.focus()} className="text-[10px] font-black text-blue-600 uppercase hover:underline">{tdash("edit")}</button>
                        </div>
                        <select id="gender-select" value={profileForm.gender} onChange={e => setProfileForm({...profileForm, gender: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all">
                          <option value="">{tdash("selectGender")}</option>
                          <option value="male">{tdash("genderMale")}</option>
                          <option value="female">{tdash("genderFemale")}</option>
                          <option value="other">{tdash("genderOther")}</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black uppercase text-gray-400">{tdash("city")}</label>
                            <button type="button" onClick={() => document.getElementById('city-input')?.focus()} className="text-[10px] font-black text-blue-600 uppercase hover:underline">{tdash("edit")}</button>
                          </div>
                          <input id="city-input" type="text" value={profileForm.city} onChange={e => setProfileForm({...profileForm, city: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black uppercase text-gray-400">{tdash("area")}</label>
                            <button type="button" onClick={() => document.getElementById('area-input')?.focus()} className="text-[10px] font-black text-blue-600 uppercase hover:underline">{tdash("edit")}</button>
                          </div>
                          <input id="area-input" type="text" value={profileForm.area} onChange={e => setProfileForm({...profileForm, area: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-4 font-bold outline-none transition-all" />
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="bg-gray-900 text-white px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-xl shadow-gray-900/10">
                       {isSubmitting ? tdash("updating") : tdash("syncChanges")}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'professional' && isTasker && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-gray-900">{tdash("professionalProfile")}</h4>
                    <p className="text-sm font-bold text-gray-400">{tdash("professionalDesc")}</p>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{tdash("hourlyRate")}</label>
                          <div className="relative">
                            <input type="number" value={profileForm.hourlyRate} onChange={e => setProfileForm({...profileForm, hourlyRate: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-6 font-black text-2xl outline-none transition-all pl-12" />
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-300">Rs</span>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{tdash("workExperience")}</label>
                          <select value={profileForm.experience} onChange={e => setProfileForm({...profileForm, experience: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-2xl p-6 font-bold outline-none transition-all h-[76px]">
                             <option>0-1 years</option>
                             <option>1-3 years</option>
                             <option>3-5 years</option>
                             <option>5+ years</option>
                          </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-1">{tdash("professionalBio")}</label>
                      <textarea rows={4} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-red-100 rounded-3xl p-6 font-bold resize-none outline-none transition-all" placeholder={tdash("professionalBioPlaceholder")} />
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <h5 className="font-black uppercase text-xs tracking-widest text-gray-400">{tdash("skillsServices")}</h5>
                          <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase">{profileForm.skills.length} {tdash("selected")}</span>
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
                            <input type="text" placeholder={tdash("addSkillsPlaceholder")} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} className="flex-1 bg-transparent border-none outline-none font-bold text-sm" />
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

                    <button type="submit" disabled={isSubmitting} className="bg-gray-900 text-white px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">{tdash("saveProfessionalDetails")}</button>
                  </form>
                </div>
              )}

              {activeTab === 'documents' && isTasker && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-gray-900">{tdash("kycDocumentsTitle")}</h4>
                    <p className="text-sm font-bold text-gray-400">{tdash("kycDocumentsDesc")}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {[
                       { id: 'citizenship', label: tdash("docCitizenship"), required: true },
                       { id: 'license', label: tdash("docLicense"), required: false },
                       { id: 'other', label: tdash("docOther"), required: false }
                     ].map(doc => {
                       const docUrl = taskerProfile?.documents?.[doc.id];
                       return (
                         <div key={doc.id} className="bg-gray-50 rounded-[32px] p-6 border-2 border-transparent hover:border-gray-200 transition-all flex flex-col space-y-4">
                            <div className="flex justify-between items-start">
                               <div>
                                  <h5 className="font-black text-sm text-gray-900">{doc.label}</h5>
                                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">{doc.required ? tdash("required") : tdash("optional")}</p>
                               </div>
                               {docUrl && (
                                 <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{tdash("uploaded")}</span>
                               )}
                            </div>

                            {docUrl ? (
                              <div className="flex-1 flex flex-col justify-between space-y-4">
                                <div className="aspect-video w-full rounded-2xl bg-white border border-gray-100 overflow-hidden relative group">
                                   {docUrl.toLowerCase().endsWith('.pdf') ? (
                                     <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600">
                                        <FileText className="w-12 h-12" />
                                        <span className="text-[10px] font-black uppercase mt-2">{tdash("pdfDocument")}</span>
                                     </div>
                                   ) : (
                                     <img src={docUrl} alt={doc.label} className="w-full h-full object-cover" />
                                   )}
                                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                                      <a href={docUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-gray-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">{tdash("viewHighRes")}</a>
                                   </div>
                                </div>

                                <div className="flex gap-2">
                                   <button
                                     onClick={() => document.getElementById(`file-input-${doc.id}`)?.click()}
                                     className="flex-1 py-3 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                   >
                                     {tdash("replaceFile")}
                                   </button>
                                   <button
                                     onClick={() => handleDeleteDocument(doc.id)}
                                     className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                                   >
                                     {tdash("delete")}
                                   </button>
                                </div>
                                <input
                                   id={`file-input-${doc.id}`}
                                   type="file"
                                   accept="image/*,application/pdf"
                                   onChange={(e) => handleUploadDocument(e, doc.id)}
                                   className="hidden"
                                 />
                              </div>
                            ) : (
                              <div className="flex-1 bg-white border-2 border-dashed border-gray-200 rounded-[24px] p-8 text-center hover:border-sewakhoj-red hover:bg-red-50/10 transition-all flex flex-col items-center justify-center min-h-[160px] relative">
                                 <input
                                   id={`file-input-${doc.id}`}
                                   type="file"
                                   accept="image/*,application/pdf"
                                   onChange={(e) => handleUploadDocument(e, doc.id)}
                                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                 />
                                 <UploadCloud className="w-10 h-10 text-gray-300 mb-2" />
                                 <span className="text-xs font-black text-gray-900 uppercase">{tdash("uploadFile")}</span>
                                 <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{tdash("uploadFileHint")}</span>
                              </div>
                            )}
                         </div>
                       );
                     })}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div className="space-y-1">
                    <h4 className="text-2xl font-black text-gray-900">{tdash("securitySuite")}</h4>
                    <p className="text-sm font-bold text-gray-400">{tdash("securityDesc")}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <form onSubmit={handleChangePassword} className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                           <Lock className="w-5 h-5 text-gray-900" />
                           <h5 className="font-black text-xs uppercase tracking-widest">{tdash("changePassword")}</h5>
                        </div>
                        <div className="space-y-4">
                           <input type="password" placeholder={tdash("newPassword")} required value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
                           <input type="password" placeholder={tdash("confirmPassword")} required value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-sewakhoj-red transition-all shadow-lg shadow-gray-200">{tdash("updatePassword")}</button>
                     </form>

                     <div className="space-y-8">
                        <div className="bg-blue-50/50 p-8 rounded-[40px] border border-blue-100 space-y-4">
                           <div className="flex items-center gap-3">
                              <Download className="w-5 h-5 text-blue-600" />
                              <h5 className="font-black text-xs uppercase tracking-widest text-blue-600">{tdash("dataPortability")}</h5>
                           </div>
                           <p className="text-xs font-bold text-blue-800/60 leading-relaxed">{tdash("dataPortabilityDesc")}</p>
                           <button onClick={onExportData} className="w-full py-3 bg-white text-blue-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm">{tdash("exportData")}</button>
                        </div>

                        <div className="bg-amber-50/50 p-8 rounded-[40px] border border-amber-100 space-y-4">
                           <div className="flex items-center gap-3">
                              <Activity className="w-5 h-5 text-amber-600" />
                              <h5 className="font-black text-xs uppercase tracking-widest text-amber-600">{tdash("accountControl")}</h5>
                           </div>
                           <p className="text-xs font-bold text-amber-800/60 leading-relaxed">{tdash("deactivateDesc")}</p>
                           <button onClick={onDeactivateAccount} className="w-full py-3 bg-white text-amber-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-amber-100 hover:bg-amber-600 hover:text-white transition-all shadow-sm">{tdash("requestDeactivation")}</button>
                       </div>

                       {isTasker && (
                       <div className="bg-red-50/50 p-8 rounded-[40px] border border-red-100 space-y-4">
                          <div className="flex items-center gap-3">
                             <Trash2 className="w-5 h-5 text-red-600" />
                             <h5 className="font-black text-xs uppercase tracking-widest text-red-600">{tdash("deleteData")}</h5>
                          </div>
                          <p className="text-xs font-bold text-red-800/60 leading-relaxed">{tdash("deleteDataDesc")}</p>
                          <button onClick={onDeleteMyData} className="w-full py-3 bg-white text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm">{tdash("deleteKycData")}</button>
                       </div>
                       )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tdash("systemsOperational")}</p>
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
        {tasks && tasks.length > 0 ? tasks.map((task: any) => {
          const hasBid = myBids && myBids.some((b: any) => b.task_id === task.id);
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
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Budget</p>
                  <p className="text-sm font-black text-gray-900">Rs {task.budget_amount || 'Negotiable'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Location</p>
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
        }) : (
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
        {tasks.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-gray-100">
            <Plus className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h4 className="text-lg font-black text-gray-900 mb-2">No tasks posted yet</h4>
            <p className="text-gray-500 text-sm font-bold mb-8">Post your first task and receive bids from verified professionals.</p>
            <Link href="/post-task" className="inline-block bg-gray-900 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all">Post a Task</Link>
          </div>
        ) : tasks.map((task: any) => (
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
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Pro Specialist</p>
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

function ReviewsSection({ taskerId }: { taskerId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchReviews = async () => {
    if (!taskerId) return;
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("*, users!reviews_customer_id_fkey(full_name, avatar_url)")
      .eq("tasker_id", taskerId)
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [taskerId]);

  const handleRespond = async (reviewId: string) => {
    if (!responseText.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("reviews")
      .update({
        tasker_response: responseText.trim(),
        tasker_response_at: new Date().toISOString()
      })
      .eq("id", reviewId);
    if (!error) {
      setRespondingTo(null);
      setResponseText("");
      fetchReviews();
    }
    setSaving(false);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight uppercase">Your Reviews</h3>
          <p className="text-xs md:text-sm text-gray-500 font-bold mt-2">See what customers say and respond to feedback.</p>
        </div>
        <div className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 border border-gray-100 shadow-sm">
          <div className="text-center">
            <p className="text-3xl font-black text-gray-900">{avgRating}</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-3 h-3 ${s <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
          </div>
          <div className="w-px h-10 bg-gray-100" />
          <div className="text-center">
            <p className="text-3xl font-black text-gray-900">{reviews.length}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Reviews</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="md" variant="brand" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100">
          <Star className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h4 className="text-lg font-black text-gray-900 mb-2">No reviews yet</h4>
          <p className="text-gray-500 text-sm font-bold">Reviews will appear here once customers rate your completed jobs.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-500 shrink-0">
                    {review.users?.avatar_url
                      ? <img src={review.users.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      : (review.users?.full_name?.charAt(0) || 'C')}
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{review.users?.full_name || "Customer"}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                      <span className="text-[10px] text-gray-400 font-bold ml-2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                {review.moderation_status === 'pending' && (
                  <span className="text-[10px] font-black uppercase px-3 py-1 bg-amber-50 text-amber-600 rounded-full">Pending</span>
                )}
              </div>

              {review.comment && (
                <p className="mt-4 text-sm text-gray-600 font-medium leading-relaxed italic">"{review.comment}"</p>
              )}

              {/* Tasker Response */}
              {review.tasker_response && (
                <div className="mt-4 ml-16 bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Your Response</p>
                  <p className="text-sm text-blue-800 font-medium">{review.tasker_response}</p>
                  <p className="text-[10px] text-blue-400 mt-1">
                    {new Date(review.tasker_response_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Respond Form */}
              {!review.tasker_response && respondingTo === review.id ? (
                <div className="mt-4 ml-16 space-y-3">
                  <textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Write your response..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-medium outline-none focus:border-blue-300 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(review.id)}
                      disabled={saving || !responseText.trim()}
                      className="px-6 py-2 bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Submit Response"}
                    </button>
                    <button
                      onClick={() => { setRespondingTo(null); setResponseText(""); }}
                      className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : !review.tasker_response && (
                <button
                  onClick={() => { setRespondingTo(review.id); setResponseText(""); }}
                  className="mt-4 ml-16 text-[10px] font-black uppercase text-blue-500 hover:text-blue-700"
                >
                  + Respond to Review
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingDetailModal({ booking, bookings, onClose, updateStatus, isTasker, onChat, commissionRate, confirmDeclineBooking, confirmAcceptWithConflict }: any) {
  const locale = useLocale();
  const displayUser = isTasker ? booking.users : booking.taskers?.users;
  const displayName = displayUser?.full_name || (isTasker ? "Customer" : "Tasker");
  const { showError } = useNotification();

  const [isPaying, setIsPaying] = useState(false);
  const [expiryCountdown, setExpiryCountdown] = useState<string | null>(null);
  const router = useRouter();
  const [checklistItems, setChecklistItems] = useState<{ item: string; done: boolean }[]>(booking.checklist || []);

  // Calculate expiry countdown for pending/pending_acceptance bookings
  useEffect(() => {
    const deadline = booking.status === 'pending_acceptance'
      ? booking.acceptance_deadline
      : booking.status === 'pending'
        ? booking.expires_at
        : null;

    if (!deadline) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(deadline).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setExpiryCountdown("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (hours > 0) {
        setExpiryCountdown(`${hours}h ${minutes}m`);
      } else {
        setExpiryCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // Update every second for pending_acceptance
    return () => clearInterval(interval);
  }, [booking.status, booking.acceptance_deadline, booking.expires_at]);

  // Detect scheduling conflicts
  const conflicts = bookings.filter((b: any) =>
    b.id !== booking.id &&
    b.booking_date === booking.booking_date &&
    b.booking_time === booking.booking_time &&
    ['accepted', 'on-the-way', 'arrived', 'in-progress'].includes(b.status)
  );

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
      showError(toast(locale, "PAYMENT_INIT_FAILED"));
      setIsPaying(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={serviceData.find(s => s.id === booking.service)?.nameEn || booking.service}
      description={`ID: ${booking.id.slice(0,8)}`}
      size="lg"
    >
      <div className="space-y-10">
          {/* ⏱️ Expiry Warning for pending/pending_acceptance bookings */}
          {(booking.status === 'pending' || booking.status === 'pending_acceptance') && expiryCountdown && (
            <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${expiryCountdown === 'Expired' ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-200'}`}>
              <Clock className={`w-5 h-5 ${expiryCountdown === 'Expired' ? 'text-red-500' : 'text-amber-500'} ${booking.status === 'pending_acceptance' && expiryCountdown !== 'Expired' ? 'animate-pulse' : ''}`} />
              <div className="flex-1">
                <p className={`text-[10px] font-black uppercase tracking-widest ${expiryCountdown === 'Expired' ? 'text-red-600' : 'text-amber-700'}`}>
                  {expiryCountdown === 'Expired'
                    ? (booking.status === 'pending_acceptance' ? 'Response Time Expired' : 'Booking Expired')
                    : (booking.status === 'pending_acceptance' ? 'Tasker Must Respond Within' : 'Expires In')}
                </p>
                <p className={`text-sm font-black ${expiryCountdown === 'Expired' ? 'text-red-700' : 'text-amber-800'}`}>
                  {expiryCountdown === 'Expired'
                    ? (booking.status === 'pending_acceptance' ? 'Finding another tasker...' : 'This booking will be auto-cancelled')
                    : expiryCountdown}
                </p>
              </div>
            </div>
          )}

          {/* ⚠️ Scheduling Conflict Warning */}
          {isTasker && conflicts.length > 0 && (
            <div className="p-4 rounded-2xl border-2 border-red-200 bg-red-50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Scheduling Conflict</p>
                <p className="text-xs font-bold text-red-700 mt-1">
                  You have {conflicts.length} other active booking{conflicts.length > 1 ? 's' : ''} at this time slot.
                  Accepting may cause double-booking.
                </p>
                {conflicts.map((c: any) => (
                  <p key={c.id} className="text-[10px] text-red-500 mt-1 font-bold">
                    • {serviceData.find(s => s.id === c.service)?.nameEn || c.service} — {c.status}
                  </p>
                ))}
              </div>
            </div>
          )}

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
          {/* 🔘 Tasker Action Buttons (with timestamps for arrived/departed) */}
          {isTasker && !['completed', 'cancelled'].includes(booking.status) && (
            <div className="flex gap-3">
              {booking.status === 'pending_acceptance' && <>
                <button
                  onClick={() => {
                    if (conflicts.length > 0) {
                      confirmAcceptWithConflict({ booking, conflicts: conflicts.length, mode: 'accept' });
                    } else {
                      // No conflicts, proceed directly
                      (async () => {
                        try {
                          const res = await fetch('/api/bookings/accept', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bookingId: booking.id }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            onClose();
                          }
                        } catch (_err: any) {
                          // silently handle
                        }
                      })();
                    }
                  }}
                  className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-100 hover:bg-green-600 transition-all"
                >
                  ✅ Accept Booking
                </button>
                <button
                  onClick={() => confirmDeclineBooking(booking)}
                  className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs hover:bg-red-100 transition-all"
                >
                  ❌ Decline
                </button>
              </>}
              {booking.status === 'pending' && <>
                <button
                  onClick={() => {
                    if (conflicts.length > 0) {
                      confirmAcceptWithConflict({ booking, conflicts: conflicts.length, mode: 'accept_task' });
                    } else {
                      updateStatus(booking.id, 'accepted');
                    }
                  }}
                  className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-100 hover:bg-green-600 transition-all"
                >
                  Accept Task
                </button>
                <button onClick={() => updateStatus(booking.id, 'cancelled')} className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs hover:bg-red-100 transition-all">Reject</button>
              </>}
              {booking.status === 'accepted' && <button onClick={() => updateStatus(booking.id, 'on-the-way')} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black uppercase text-xs">Start Journey</button>}
              {booking.status === 'on-the-way' && (
                <button
                  onClick={() => updateStatus(booking.id, 'arrived', { arrived_at: new Date().toISOString() })}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs"
                >
                  I've Arrived
                </button>
              )}
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
                  <button
                    onClick={() => updateStatus(booking.id, 'completed', { departed_at: new Date().toISOString() })}
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs"
                  >
                    Mark Complete
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 📍 Customer: Track Tasker button */}
          {!isTasker && ['on-the-way', 'arrived', 'in-progress'].includes(booking.status) && (
            <button
              onClick={() => router.push(`/booking/${booking.id}/tracking`)}
              className="w-full py-4 bg-sewakhoj-red text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-red-700 transition-all"
            >
              <Navigation className="w-4 h-4" />
              Track Tasker Live
            </button>
          )}

          {/* ✅ Job Checklist / Scope Verification */}
          {isTasker && ['arrived', 'in-progress'].includes(booking.status) && (
            <div className="space-y-4 bg-amber-50/50 border border-amber-100 rounded-[2rem] p-6">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Job Checklist</h5>
              </div>
              <p className="text-xs text-amber-600 font-medium">Define scope items. Customer confirms each on completion.</p>
              <div className="space-y-2">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-amber-100">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => {
                        const updated = checklistItems.map((ci, i) => i === idx ? { ...ci, done: !ci.done } : ci);
                        setChecklistItems(updated);
                      }}
                      className="w-5 h-5 rounded-lg accent-green-600"
                    />
                    <input
                      type="text"
                      value={item.item}
                      onChange={(e) => {
                        const updated = checklistItems.map((ci, i) => i === idx ? { ...ci, item: e.target.value } : ci);
                        setChecklistItems(updated);
                      }}
                      placeholder="Checklist item..."
                      className="flex-1 bg-transparent text-sm font-bold text-gray-700 outline-none"
                    />
                    <button
                      onClick={() => setChecklistItems(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setChecklistItems(prev => [...prev, { item: '', done: false }])}
                  className="flex-1 py-3 bg-white border-2 border-dashed border-amber-200 text-amber-600 rounded-2xl font-black uppercase text-[10px] hover:bg-amber-50 transition-all"
                >
                  + Add Item
                </button>
                <button
                  onClick={() => updateStatus(booking.id, booking.status, { checklist: checklistItems })}
                  className="px-6 py-3 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-amber-600 transition-all"
                >
                  Save Checklist
                </button>
              </div>
            </div>
          )}

          {/* 👁️ Customer: View Checklist (read-only) */}
          {!isTasker && booking.checklist && booking.checklist.length > 0 && ['arrived', 'in-progress', 'completed'].includes(booking.status) && (
            <div className="space-y-4 bg-green-50/50 border border-green-100 rounded-[2rem] p-6">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-green-600" />
                <h5 className="text-[10px] font-black text-green-700 uppercase tracking-widest">Scope Checklist</h5>
              </div>
              <div className="space-y-2">
                {booking.checklist.map((item: { item: string; done: boolean }, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-green-100">
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${item.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {item.done && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`text-sm font-bold ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-green-500 font-bold">
                {booking.checklist.filter((i: { done: boolean }) => i.done).length}/{booking.checklist.length} items completed
              </p>
            </div>
          )}
        </div>
    </Modal>
  );
}
