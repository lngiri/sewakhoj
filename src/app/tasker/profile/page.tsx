import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tasker Profile | SewaKhoj',
  description: 'Manage your professional profile, skills, and availability as a tasker on SewaKhoj.',
};

export default function TaskerProfilePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center">
          <h1 className="text-2xl font-black text-white">Tasker Profile</h1>
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="bg-white rounded-[32px] border border-slate-100 p-8 mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center font-black text-slate-600 text-2xl">
              ?
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Your Name</h2>
              <p className="text-sm text-slate-500 font-medium">ID Verified ✓</p>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Status: Active</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Professional Information</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-sm font-bold text-slate-400">Hourly Rate</span>
                    <span className="font-black text-slate-900">--</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-sm font-bold text-slate-400">Experience</span>
                    <span className="font-black text-slate-900">--</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-slate-50">
                    <span className="text-sm font-bold text-slate-400">City</span>
                    <span className="font-black text-slate-900">--</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">Plumbing</span>
                  <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase">Cleaning</span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-black uppercase">Electrical</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 p-8">
          <h3 className="text-lg font-black text-slate-900 mb-6">Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <h4 className="font-black text-sm text-slate-900 mb-2">Citizenship ID</h4>
              <div className="aspect-video bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                <span className="text-xs text-slate-400 font-bold">Document Preview</span>
              </div>
              <button className="w-full mt-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sewakhoj-red transition-all">
                Upload New Document
              </button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <h4 className="font-black text-sm text-slate-900 mb-2">License</h4>
              <div className="aspect-video bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                <span className="text-xs text-slate-400 font-bold">Document Preview</span>
              </div>
              <button className="w-full mt-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sewakhoj-red transition-all">
                Upload New Document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
