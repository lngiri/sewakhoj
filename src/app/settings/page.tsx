"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { supabase } from "@/lib/supabase";
import {
  User,
  Settings,
  ShieldCheck,
  CreditCard,
  History,
  MessageSquare,
  Share2,
  MapPin,
  Clock,
  IndianRupee,
  TrendingUp,
  Award,
  ChevronRight,
  Camera,
  Plus,
  X,
  AlertTriangle
} from "lucide-react";
import WeeklyScheduleEditor from "@/components/tasker/WeeklyScheduleEditor";

type SettingsTab = 'profile' | 'tasker' | 'finance' | 'kyc' | 'support' | 'referral';

export default function SettingsPage() {
   const router = useRouter();
   const { user, loading: authLoading } = useAuth();
   const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
   const [profile, setProfile] = useState<any>(null);
   const [taskerData, setTaskerData] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const { showSuccess, showError } = useNotification();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?redirect=/settings");
    if (user) fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
    const { data: tData } = await supabase.from('taskers').select('*').eq('user_id', user.id).maybeSingle();
    
    setProfile(userData);
    setTaskerData(tData);
    setLoading(false);
  };

  const updateProfile = async (updates: any) => {
    if (!user) return;
    setSaving(true);
    await supabase.from('users').update(updates).eq('id', user.id);
    fetchData();
    setSaving(false);
  };

  const updateTasker = async (updates: any) => {
    if (!user) return;
    setSaving(true);
    await supabase.from('taskers').update(updates).eq('user_id', user.id);

    // Sync tasker_skills junction table if skills were updated
    if (updates.skills && taskerData?.id) {
      await supabase.from("tasker_skills").delete().eq("tasker_id", taskerData.id);
      if (updates.skills.length > 0) {
        const skillRows = updates.skills.map((skillId: string) => ({
          tasker_id: taskerData.id,
          service_id: skillId,
          skill_level: 'Intermediate'
        }));
        await supabase.from("tasker_skills").insert(skillRows);
      }
    }

    fetchData();
    setSaving(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 bg-gradient-to-br from-sewakhoj-red to-red-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
                  {profile?.full_name?.charAt(0) || "U"}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 leading-tight">{profile?.full_name}</h2>
                  <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">{taskerData ? taskerData.tier : 'User'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User className="w-4 h-4"/>} label="Personal Profile" />
                {taskerData && (
                    <NavButton active={activeTab === 'tasker'} onClick={() => setActiveTab('tasker')} icon={<Settings className="w-4 h-4"/>} label="Tasker Controls" />
                )}
                <NavButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<CreditCard className="w-4 h-4"/>} label="Finances & Earnings" />
                <NavButton active={activeTab === 'kyc'} onClick={() => setActiveTab('kyc')} icon={<ShieldCheck className="w-4 h-4"/>} label="ID & Verification" />
                <NavButton active={activeTab === 'referral'} onClick={() => setActiveTab('referral')} icon={<Share2 className="w-4 h-4"/>} label="Refer & Earn" />
                <NavButton active={activeTab === 'support'} onClick={() => setActiveTab('support')} icon={<MessageSquare className="w-4 h-4"/>} label="Message Support" />
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 min-h-[600px]">
                {activeTab === 'profile' && <ProfileTab profile={profile} onSave={updateProfile} saving={saving} />}
                {activeTab === 'tasker' && <TaskerTab tasker={taskerData} onSave={updateTasker} saving={saving} />}
                {activeTab === 'finance' && <FinanceTab user={user} isTasker={!!taskerData} tasker={taskerData} />}
                {activeTab === 'kyc' && <KYCTab tasker={taskerData} />}
                {activeTab === 'referral' && <ReferralTab profile={profile} />}
                {activeTab === 'support' && <SupportTab />}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${active ? 'bg-sewakhoj-red/5 text-sewakhoj-red font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      {active && <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

/* --- TABS --- */

function ProfileTab({ profile, onSave, saving }: any) {
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dob, setDob] = useState(profile?.dob || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [isNameEditable, setIsNameEditable] = useState(false);
  const [isPhoneEditable, setIsPhoneEditable] = useState(false);
  const [isDobEditable, setIsDobEditable] = useState(false);
  const [isGenderEditable, setIsGenderEditable] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const phoneRegex = /^9[678]\d{8}$/;
    
    if (!name) newErrors.name = "Name is required";
    if (!phone) {
        newErrors.phone = "Phone is required";
    } else if (!phoneRegex.test(phone)) {
        newErrors.phone = "Invalid Nepal number (98XXXXXXXX, 97XXXXXXXX, or 96XXXXXXXX)";
    }
    
    if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        if (age < 18) newErrors.dob = "Must be at least 18 years old";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
        onSave({ 
            full_name: name, 
            phone: phone, 
            dob: dob, 
            gender: gender 
        });
        setIsNameEditable(false);
        setIsPhoneEditable(false);
        setIsDobEditable(false);
        setIsGenderEditable(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate18YearsAgo = new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-black text-slate-900 mb-2">Personal Profile</h3>
      <p className="text-slate-500 text-sm mb-12">Manage your basic contact information and identity.</p>

      <div className="space-y-8 max-w-xl">
        <div className="flex items-center gap-6 mb-12">
            <div className="relative group">
                <div className="w-24 h-24 bg-slate-100 rounded-[32px] flex items-center justify-center text-slate-400 overflow-hidden">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : gender === 'female' ? (
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&gender=female" alt="Default Female" className="w-full h-full object-cover opacity-50" />
                    ) : gender === 'male' ? (
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&gender=male" alt="Default Male" className="w-full h-full object-cover opacity-50" />
                    ) : (
                        <User className="w-8 h-8" />
                    )}
                </div>
                <button className="absolute -bottom-2 -right-2 bg-white shadow-xl border border-slate-100 p-2.5 rounded-2xl text-sewakhoj-red hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                </button>
            </div>
            <div>
                <h4 className="font-bold text-slate-900">Profile Picture</h4>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                    <button onClick={() => setIsNameEditable(true)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Edit</button>
                </div>
                <input 
                    type="text" 
                    value={name}
                    disabled={!isNameEditable}
                    onChange={e => setName(e.target.value)}
                    className={`w-full bg-slate-50 border ${errors.name ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all ${!isNameEditable ? 'opacity-70 cursor-not-allowed' : ''}`} 
                />
                {errors.name && <p className="text-[10px] font-bold text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                    <button onClick={() => setIsPhoneEditable(true)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Edit</button>
                </div>
                <input 
                    type="text" 
                    value={phone}
                    disabled={!isPhoneEditable}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98XXXXXXXX"
                    className={`w-full bg-slate-50 border ${errors.phone ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all ${!isPhoneEditable ? 'opacity-70 cursor-not-allowed' : ''}`} 
                />
                {errors.phone && <p className="text-[10px] font-bold text-red-500">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Date of Birth</label>
                    <button onClick={() => setIsDobEditable(true)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Edit</button>
                </div>
                <input 
                    type="date" 
                    value={dob}
                    max={maxDate18YearsAgo}
                    disabled={!isDobEditable}
                    onChange={e => setDob(e.target.value)}
                    className={`w-full bg-slate-50 border ${errors.dob ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all ${!isDobEditable ? 'opacity-70 cursor-not-allowed' : ''}`} 
                />
                {errors.dob && <p className="text-[10px] font-bold text-red-500">{errors.dob}</p>}
            </div>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Gender</label>
                    <button onClick={() => setIsGenderEditable(true)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Edit</button>
                </div>
                <div className="flex gap-2">
                    {['male', 'female', 'other'].map(g => (
                        <button
                            key={g}
                            disabled={!isGenderEditable}
                            onClick={() => setGender(g)}
                            className={`flex-1 py-3.5 rounded-2xl border text-xs font-bold capitalize transition-all ${gender === g ? 'bg-sewakhoj-red text-white border-sewakhoj-red' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'} ${!isGenderEditable ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
        >
            {saving ? "Saving Changes..." : "Update Profile"}
        </button>
      </div>
    </div>
  );
}

function TaskerTab({ tasker, onSave, saving }: any) {
  const [rate, setRate] = useState(tasker?.hourly_rate || 500);
  const [radius, setRadius] = useState(tasker?.service_radius || 10);
  const [skills, setSkills] = useState<string[]>(tasker?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [weeklySchedule, setWeeklySchedule] = useState<any>(null);
  const [blockedDays, setBlockedDays] = useState<any[]>([]);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [draftSchedule, setDraftSchedule] = useState<any>(null);
  const [draftBlockedDays, setDraftBlockedDays] = useState<any[]>([]);

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
        setSkills([...skills, newSkill]);
        setNewSkill("");
    }
  };

  // Fetch weekly schedule & blocked days
  useEffect(() => {
    async function fetchSchedule() {
      setScheduleLoading(true);
      const [schedRes, blockRes] = await Promise.all([
        fetch("/api/tasker/schedule"),
        fetch("/api/tasker/block-day"),
      ]);
      if (schedRes.ok) {
        const sData = await schedRes.json();
        setWeeklySchedule(sData.schedule);
        setDraftSchedule(sData.schedule);
      }
      if (blockRes.ok) {
        const bData = await blockRes.json();
        setBlockedDays(bData.blockedDays || []);
        setDraftBlockedDays(bData.blockedDays || []);
      }
      setScheduleLoading(false);
    }
    fetchSchedule();
  }, []);

  // Save all settings including weekly schedule
  const handleSaveAll = async () => {
    // Save basic tasker settings
    await onSave({ hourly_rate: rate, service_radius: radius, skills: skills });

    // Save weekly schedule if changed
    if (scheduleDirty && draftSchedule) {
      await fetch("/api/tasker/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: draftSchedule }),
      });
    }

    // Sync blocked days (add new, remove deleted)
    const newBlocks = draftBlockedDays.filter(
      (d: any) => !blockedDays.some((b: any) => b.blocked_date === d.blocked_date)
    );
    const removedBlocks = blockedDays.filter(
      (b: any) => !draftBlockedDays.some((d: any) => d.blocked_date === b.blocked_date)
    );

    for (const block of newBlocks) {
      if (block.id && block.id.startsWith("temp-")) {
        await fetch("/api/tasker/block-day", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: block.blocked_date, reason: block.reason }),
        });
      }
    }
    for (const block of removedBlocks) {
      if (block.id && !block.id.startsWith("temp-")) {
        await fetch("/api/tasker/block-day", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: block.blocked_date }),
        });
      }
    }

    setBlockedDays(draftBlockedDays);
    setWeeklySchedule(draftSchedule);
    setScheduleDirty(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start mb-12">
        <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Tasker Controls</h3>
            <p className="text-slate-500 text-sm">Configure your availability, rates, and operational range.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-amber-700 text-xs font-bold flex items-center gap-2">
            <Award className="w-4 h-4" /> {tasker?.tier?.toUpperCase()} LEVEL
        </div>
      </div>

      <div className="space-y-10 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Hourly Rate (Rs)</label>
                <input
                    type="number"
                    value={rate}
                    onChange={e => setRate(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sewakhoj-red"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Service Radius (km)</label>
                <input
                    type="number"
                    value={radius}
                    onChange={e => setRadius(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sewakhoj-red"
                />
            </div>
        </div>

        <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Managed Skills</label>
            <div className="flex flex-wrap gap-2 mb-4">
                {skills.map(s => (
                    <span key={s} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                        {s} <button onClick={() => setSkills(skills.filter(i => i !== s))}><X className="w-3 h-3"/></button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    placeholder="Add a new skill..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 outline-none"
                />
                <button onClick={addSkill} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800"><Plus className="w-5 h-5"/></button>
            </div>
        </div>

        {/* --- Weekly Schedule Editor --- */}
        <WeeklyScheduleEditor
          initialSchedule={weeklySchedule}
          initialBlockedDays={blockedDays}
          loading={scheduleLoading}
          onScheduleChange={(s) => { setDraftSchedule(s); setScheduleDirty(true); }}
          onBlockedDaysChange={(d) => { setDraftBlockedDays(d); setScheduleDirty(true); }}
        />

        <button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-sewakhoj-red text-white px-8 py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
        >
            {saving ? "Updating..." : "Save Professional Settings"}
        </button>
      </div>
    </div>
  );
}

function FinanceTab({ isTasker, tasker }: any) {
  return (
    <div className="animate-in fade-in duration-500">
      <h3 className="text-2xl font-black text-slate-900 mb-8">Finances & Earnings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900 rounded-[32px] p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Total Earnings</p>
                <h4 className="text-3xl font-black mb-1">Rs 42,500</h4>
                <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                    <TrendingUp className="w-3 h-3" /> +12% this month
                </div>
            </div>
            <IndianRupee className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5" />
        </div>
        <div className="bg-white border border-slate-200 rounded-[32px] p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payable Commission</p>
            <h4 className="text-3xl font-black text-red-600 mb-1">Rs 1,240</h4>
            <p className="text-xs text-slate-400 font-medium">Due in 4 days</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-[32px] p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Forecasted Income</p>
            <h4 className="text-3xl font-black text-indigo-700 mb-1">Rs 18,000</h4>
            <p className="text-xs text-indigo-400 font-medium">Based on pending tasks</p>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" /> Transaction History
        </h4>
        <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
            <table className="w-full text-left">
                <thead className="bg-slate-100/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                        <th className="px-6 py-4">Ref</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {[1,2,3].map(i => (
                        <tr key={i} className="text-sm">
                            <td className="px-6 py-4 font-mono text-xs text-slate-400">#TRX-942{i}</td>
                            <td className="px-6 py-4 font-bold text-slate-700">Cleaning Service Commission</td>
                            <td className="px-6 py-4 font-black text-red-500">- Rs 150</td>
                            <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-black uppercase">Settled</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

function KYCTab({ tasker }: any) {
    return (
        <div className="animate-in fade-in duration-500">
            <h3 className="text-2xl font-black text-slate-900 mb-2">ID & Verification</h3>
            <p className="text-slate-500 text-sm mb-12">Maintain your KYC status to continue providing services.</p>

            <div className="bg-blue-50 border border-blue-100 p-8 rounded-[32px] mb-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Verified Professional Status</h4>
                    <p className="text-slate-500 text-sm">Your identity has been verified against your Citizenship ID.</p>
                </div>
                <div className="bg-green-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/20">
                    Active
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KYCCard label="Citizenship ID Front" status="verified" />
                <KYCCard label="Citizenship ID Back" status="verified" />
                <KYCCard label="Selfie with ID" status="verified" />
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold uppercase tracking-widest text-[10px]">Add New Document</span>
                </div>
            </div>
        </div>
    );
}

function KYCCard({ label, status }: any) {
    return (
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 flex items-center justify-between shadow-sm">
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-slate-900">Document_2026_ID.jpg</p>
            </div>
            <span className="text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1.5 rounded-full">Verified</span>
        </div>
    );
}

function ReferralTab({ profile }: any) {
    const { showSuccess, showError } = useNotification();
    const [referralStats, setReferralStats] = useState({ total: 0, rewarded: 0, earned: 0 });
    const [loading, setLoading] = useState(true);
    const link = `https://sewakhoj.com/signup?ref=${profile?.referral_code || 'loading'}`;
    
    useEffect(() => {
        if (profile?.id) fetchStats();
    }, [profile]);
    
    const fetchStats = async () => {
        try {
            const { data: stats } = await supabase
                .from('referrals')
                .select('status, reward_amount')
                .eq('referrer_id', profile.id);
            
            if (stats) {
                const total = stats.length;
                const rewarded = stats.filter((r: any) => r.status === 'rewarded').length;
                const earned = stats.filter((r: any) => r.status === 'rewarded').reduce((sum: number, r: any) => sum + (r.reward_amount || 500), 0);
                setReferralStats({ total, rewarded, earned });
            }
        } catch (err) {
            console.error('Failed to fetch referral stats', err);
        } finally {
            setLoading(false);
        }
    };
    
    const shareViaWhatsApp = () => {
        const text = encodeURIComponent(`Join SewaKhoj - Nepal's service marketplace! Use my code ${profile?.referral_code} and we both get Rs 500. ${link}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };
    
    return (
        <div className="animate-in fade-in duration-500">
            <div className="text-center py-8">
                <div className="w-24 h-24 bg-red-50 text-sewakhoj-red rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-500/10">
                    <Share2 className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Refer & Earn Together</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-12">
                    Share your code with friends. When they complete their first task, both of you get Rs 500 in your SewaKhoj wallet!
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900 rounded-[28px] p-6 text-center text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Total Shares</p>
                    <p className="text-3xl font-black">{loading ? '-' : referralStats.total}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-[28px] p-6 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">Rewarded</p>
                    <p className="text-3xl font-black text-green-700">{loading ? '-' : referralStats.rewarded}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-[28px] p-6 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Earned (Rs)</p>
                    <p className="text-3xl font-black text-amber-700">{loading ? '-' : referralStats.earned.toLocaleString()}</p>
                </div>
            </div>

            <div className="max-w-md mx-auto bg-slate-50 p-2 rounded-[28px] border border-slate-200 flex items-center gap-2 mb-8 shadow-inner">
                <div className="flex-1 text-slate-700 font-mono text-sm px-4 truncate">{link}</div>
                <button
                    onClick={() => {navigator.clipboard.writeText(link); showSuccess("Copied!");}}
                    className="bg-slate-900 text-white px-6 py-3.5 rounded-[22px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                >
                    Copy
                </button>
            </div>

            <div className="flex gap-3 justify-center">
                <button
                    onClick={shareViaWhatsApp}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all"
                >
                    Share via WhatsApp
                </button>
                <button
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: 'Join SewaKhoj',
                                text: `Join me on SewaKhoj! Use code ${profile?.referral_code} - both get Rs 500!`,
                                url: link
                            });
                        }
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all"
                >
                    Share
                </button>
            </div>
            
            <div className="mt-12 p-6 bg-blue-50/50 rounded-[28px] border border-blue-100">
                <h4 className="font-black text-slate-900 mb-3 uppercase tracking-tight">How It Works</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex gap-3">
                        <span className="w-6 h-6 bg-sewakhoj-red text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
                        <span className="text-slate-700">Share your unique referral code</span>
                    </div>
                    <div className="flex gap-3">
                        <span className="w-6 h-6 bg-sewakhoj-red text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
                        <span className="text-slate-700">Friend signs up and completes first task</span>
                    </div>
                    <div className="flex gap-3">
                        <span className="w-6 h-6 bg-sewakhoj-red text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
                        <span className="text-slate-700">Both receive Rs 500 in wallet</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SupportTab() {
    return (
        <div className="animate-in fade-in duration-500">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Message Management</h3>
            <p className="text-slate-500 text-sm mb-12">Report issues, suggest improvements, or ask for help.</p>

            <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 min-h-[300px] flex items-center justify-center text-slate-400">
                    <div className="text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest text-[10px]">No active tickets</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">New Message to Support</label>
                    <textarea 
                        className="w-full bg-slate-50 border border-slate-200 rounded-[32px] p-8 outline-none focus:ring-2 focus:ring-sewakhoj-red min-h-[150px]"
                        placeholder="Describe your issue or suggestion here..."
                    ></textarea>
                    <button className="w-full bg-slate-900 text-white py-5 rounded-[32px] font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
                        Send Secure Message
                    </button>
                </div>
            </div>
        </div>
    );
}
