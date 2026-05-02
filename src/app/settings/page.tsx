"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/layout/Navbar";
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

type SettingsTab = 'profile' | 'tasker' | 'finance' | 'kyc' | 'support' | 'referral';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [taskerData, setTaskerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?redirect=/settings");
    if (user) fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
    const { data: tData } = await supabase.from('taskers').select('*').eq('user_id', user.id).single();
    
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
    fetchData();
    setSaving(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      
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

              <nav className="space-y-1">
                <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User className="w-4 h-4"/>} label="Personal Profile" />
                {taskerData && (
                    <NavButton active={activeTab === 'tasker'} onClick={() => setActiveTab('tasker')} icon={<Settings className="w-4 h-4"/>} label="Tasker Controls" />
                )}
                <NavButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<CreditCard className="w-4 h-4"/>} label="Finances & Earnings" />
                <NavButton active={activeTab === 'kyc'} onClick={() => setActiveTab('kyc')} icon={<ShieldCheck className="w-4 h-4"/>} label="ID & Verification" />
                <NavButton active={activeTab === 'referral'} onClick={() => setActiveTab('referral')} icon={<Share2 className="w-4 h-4"/>} label="Refer & Earn" />
                <NavButton active={activeTab === 'support'} onClick={() => setActiveTab('support')} icon={<MessageSquare className="w-4 h-4"/>} label="Message Support" />
              </nav>
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-2xl font-black text-slate-900 mb-2">Personal Profile</h3>
      <p className="text-slate-500 text-sm mb-12">Manage your basic contact information and identity.</p>

      <div className="space-y-8 max-w-xl">
        <div className="flex items-center gap-6 mb-12">
            <div className="relative group">
                <div className="w-24 h-24 bg-slate-100 rounded-[32px] flex items-center justify-center text-slate-400">
                    <User className="w-8 h-8" />
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

        <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all" 
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                <input 
                    type="text" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-sewakhoj-red transition-all" 
                />
            </div>
        </div>

        <button 
            onClick={() => onSave({ full_name: name, phone: phone })}
            disabled={saving}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
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

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
        setSkills([...skills, newSkill]);
        setNewSkill("");
    }
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

        <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Weekly Availability</label>
            <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase">{day}</span>
                        <button 
                            className="w-full aspect-square rounded-xl bg-slate-100 flex items-center justify-center hover:bg-sewakhoj-red/10 transition-colors group"
                            title={`Edit ${day} availability`}
                        >
                            <Clock className="w-4 h-4 text-slate-400 group-hover:text-sewakhoj-red" />
                        </button>
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic">Tip: Setting consistent hours helps you rank higher in searches.</p>
        </div>

        <button 
            onClick={() => onSave({ hourly_rate: rate, service_radius: radius, skills: skills })}
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
    const link = `https://sewakhoj.com/signup?ref=${profile?.referral_code}`;
    return (
        <div className="animate-in fade-in duration-500 text-center py-12">
            <div className="w-24 h-24 bg-red-50 text-sewakhoj-red rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-red-500/10">
                <Share2 className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight uppercase">Refer & Earn Together</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-12">
                Share your code with friends. When they complete their first task, both of you get Rs 500 in your SewaKhoj wallet!
            </p>

            <div className="max-w-md mx-auto bg-slate-50 p-2 rounded-[28px] border border-slate-200 flex items-center gap-2 mb-8 shadow-inner">
                <div className="flex-1 text-slate-700 font-mono text-sm px-4 truncate">{link}</div>
                <button 
                    onClick={() => {navigator.clipboard.writeText(link); alert("Copied!")}}
                    className="bg-slate-900 text-white px-8 py-4 rounded-[22px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                >
                    Copy Link
                </button>
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
