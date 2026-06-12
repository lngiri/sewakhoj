import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | SewaKhoj',
  description: 'Manage your account settings and preferences securely on SewaKhoj.',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-inter">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center">
          <h1 className="text-2xl font-black text-gray-900">Account Settings</h1>
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="bg-white rounded-[32px] border border-gray-100 p-8">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-6">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-sm text-gray-900 outline-none"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full bg-gray-100 border border-gray-200 rounded-2xl p-4 font-bold text-sm text-gray-400 cursor-not-allowed outline-none"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Phone</label>
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-sm text-gray-900 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Date of Birth</label>
                  <input
                    type="date"
                    defaultValue=""
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold text-sm text-gray-900 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900 mb-6">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-sm text-gray-900">Email Notifications</p>
                    <p className="text-[10px] text-gray-500 font-medium">Receive email updates about your bookings</p>
                  </div>
                  <button className="w-12 h-6 bg-gray-300 rounded-full relative transition-colors">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 transition-transform"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="font-bold text-sm text-gray-900">Push Notifications</p>
                    <p className="text-[10px] text-gray-500 font-medium">Get real-time updates on your bookings</p>
                  </div>
                  <button className="w-12 h-6 bg-sewakhoj-red rounded-full relative transition-colors">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 transition-transform"></div>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900 mb-6">Security</h3>
              <div className="space-y-4">
                <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-sewakhoj-red transition-all shadow-lg">
                  Change Password
                </button>
                <button className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100">
                  Delete Account
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button className="w-full py-4 bg-sewakhoj-red text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-lg">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
