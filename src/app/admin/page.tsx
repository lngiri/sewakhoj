"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BarChart3, Users, Settings, Wrench, Calendar, MapPin, CreditCard, 
  User, Search, Plus, Check, X, Edit, Trash2, Eye, Ban,
  ArrowUp, ArrowDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type PageType = 'overview' | 'taskers' | 'services' | 'bookings' | 'location' | 'users' | 'payments' | 'settings';
type TabType = 'all' | 'pending' | 'active' | 'suspended';

export default function AdminPage() {
  const [currentPage, setCurrentPage] = useState<PageType>('overview');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showModal, setShowModal] = useState(false);

  // Stats data
  const stats = {
    totalTaskers: "2,418",
    activeBookings: "184",
    revenue: "4.2L",
    pendingApprovals: 3
  };

  // Taskers data
  const taskers = [
    { id: 1, name: "Ramesh Adhikari", initials: "रा", color: "bg-sewakhoj-red", city: "Kathmandu", skills: "Plumbing, Electrical", rating: 5.0, tasks: 134, status: "active" },
    { id: 2, name: "Sunita Tamang", initials: "सु", color: "bg-green-600", city: "Lalitpur", skills: "Cleaning, Cooking", rating: 4.9, tasks: 87, status: "active" },
    { id: 3, name: "Bikash Shrestha", initials: "बि", color: "bg-blue-600", city: "Pokhara", skills: "Moving, Painting", rating: 4.8, tasks: 210, status: "active" },
    { id: 4, name: "Priya Gurung", initials: "प्र", color: "bg-purple-600", city: "Bhaktapur", skills: "Tutoring, Tech", rating: 4.9, tasks: 56, status: "active" },
    { id: 5, name: "Bikram Rai", initials: "बि", color: "bg-amber-600", city: "Kathmandu", skills: "Electrical", rating: 0, tasks: 0, status: "pending" },
    { id: 6, name: "Sita Lama", initials: "सि", color: "bg-cyan-600", city: "Chitwan", skills: "Cleaning", rating: 0, tasks: 0, status: "pending" },
    { id: 7, name: "Anuj Thapa", initials: "अ", color: "bg-pink-600", city: "Butwal", skills: "Plumbing", rating: 0, tasks: 0, status: "pending" },
  ];

  // Services data
  const services = [
    { icon: "🔧", nameEn: "Plumbing", nameNp: "प्लम्बिङ", price: 800, taskers: 42, bookings: 1230, status: "active" },
    { icon: "🧹", nameEn: "Cleaning", nameNp: "सफाई", price: 600, taskers: 78, bookings: 2410, status: "active" },
    { icon: "⚡", nameEn: "Electrical", nameNp: "विद्युत", price: 900, taskers: 35, bookings: 890, status: "active" },
    { icon: "📦", nameEn: "Moving", nameNp: "सरसामान सार्ने", price: 1200, taskers: 22, bookings: 540, status: "active" },
    { icon: "📚", nameEn: "Tutoring", nameNp: "ट्युसन", price: 700, taskers: 60, bookings: 1100, status: "active" },
    { icon: "🍳", nameEn: "Cooking", nameNp: "खाना पकाउने", price: 650, taskers: 18, bookings: 320, status: "inactive" },
  ];

  const navItems = [
    { id: 'overview' as PageType, icon: BarChart3, label: 'Overview', labelNp: 'सिंहावलोकन' },
    { id: 'taskers' as PageType, icon: Users, label: 'Taskers', labelNp: 'साथीहरू', badge: stats.pendingApprovals },
    { id: 'services' as PageType, icon: Wrench, label: 'Services', labelNp: 'सेवाहरू' },
    { id: 'bookings' as PageType, icon: Calendar, label: 'Bookings', labelNp: 'बुकिङ' },
    { id: 'location' as PageType, icon: MapPin, label: 'Location Map', labelNp: 'नक्शा' },
    { id: 'users' as PageType, icon: User, label: 'Users', labelNp: 'प्रयोगकर्ता' },
    { id: 'payments' as PageType, icon: CreditCard, label: 'Payments', labelNp: 'भुक्तानी' },
    { id: 'settings' as PageType, icon: Settings, label: 'Settings', labelNp: 'सेटिङ' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'active': 'bg-green-100 text-green-700',
      'pending': 'bg-amber-100 text-amber-700',
      'inactive': 'bg-red-100 text-red-700',
      'suspended': 'bg-red-100 text-red-700',
      'completed': 'bg-green-100 text-green-700',
      'in progress': 'bg-blue-100 text-blue-700',
      'matching': 'bg-amber-100 text-amber-700',
      'cancelled': 'bg-red-100 text-red-700',
      'paid': 'bg-green-100 text-green-700',
    };
    return styles[status.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a2e] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">⚡ SewaKhoj</span>
            <span className="text-xs bg-sewakhoj-red px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">सेवा साथी Management</p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 mb-2 text-[10px] text-gray-500 uppercase tracking-wider font-bold">Main</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                currentPage === item.id
                  ? 'bg-sewakhoj-red/20 text-white border-l-3 border-sewakhoj-red'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-3 border-transparent'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-sewakhoj-red text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 text-xs text-gray-500">
          v1.0 · Admin Panel
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b px-6 h-16 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900">
            {navItems.find(n => n.id === currentPage)?.label} / {navItems.find(n => n.id === currentPage)?.labelNp}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search anything..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sewakhoj-red w-48"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors"
            >
              + Add New
            </button>
            <div className="w-9 h-9 bg-sewakhoj-red rounded-full flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* ===== OVERVIEW ===== */}
          {currentPage === 'overview' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Total Taskers / साथीहरू</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalTaskers}</div>
                  <div className="text-sm text-sewakhoj-green mt-1">↑ 12% this month</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Active Bookings / बुकिङ</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.activeBookings}</div>
                  <div className="text-sm text-sewakhoj-green mt-1">↑ 8% today</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Revenue (Rs) / आम्दानी</div>
                  <div className="text-3xl font-bold text-gray-900">{stats.revenue}</div>
                  <div className="text-sm text-sewakhoj-green mt-1">↑ 22% this month</div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Pending Approvals</div>
                  <div className="text-3xl font-bold text-amber-600">{stats.pendingApprovals}</div>
                  <div className="text-sm text-amber-600 mt-1">⚠ Needs review</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
                  <div className="p-5 border-b flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Recent Bookings / हालका बुकिङ</h3>
                    <button
                      onClick={() => setCurrentPage('bookings')}
                      className="text-sm text-sewakhoj-red hover:text-sewakhoj-red-light font-medium"
                    >
                      View All
                    </button>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase tracking-wider">
                        <th className="text-left p-4">Customer</th>
                        <th className="text-left p-4">Service</th>
                        <th className="text-left p-4">Tasker</th>
                        <th className="text-left p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {[
                        { customer: 'Aarav K.', service: '🔧 Plumbing', tasker: 'Ramesh A.', status: 'completed' },
                        { customer: 'Nisha T.', service: '🧹 Cleaning', tasker: 'Sunita T.', status: 'in progress' },
                        { customer: 'Rohan S.', service: '⚡ Electrical', tasker: '—', status: 'matching' },
                        { customer: 'Priya G.', service: '📚 Tutoring', tasker: 'Bikash S.', status: 'completed' },
                      ].map((booking, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="p-4">{booking.customer}</td>
                          <td className="p-4">{booking.service}</td>
                          <td className="p-4">{booking.tasker}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-5 border-b">
                    <h3 className="font-bold text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <button className="w-full bg-sewakhoj-red text-white py-3 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors">
                      + Add New Service
                    </button>
                    <button
                      onClick={() => setCurrentPage('taskers')}
                      className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      👷 Review Pending Taskers (3)
                    </button>
                    <button
                      onClick={() => setCurrentPage('payments')}
                      className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      💰 View Payments
                    </button>
                    <button
                      onClick={() => setCurrentPage('location')}
                      className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      📍 View Tasker Map
                    </button>
                  </div>
                  <div className="p-5 pt-0">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
                      <strong>⚠ 3 taskers awaiting approval</strong>
                      <br />
                      Bikram Rai, Sita Lama, Anuj Thapa are pending background check review.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== TASKERS ===== */}
          {currentPage === 'taskers' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Taskers Management / साथीहरू व्यवस्थापन</h3>
                  <button className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors">
                    + Invite Tasker
                  </button>
                </div>
                <div className="flex gap-4 text-sm">
                  {(['all', 'pending', 'active', 'suspended'] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg font-medium capitalize ${
                        activeTab === tab
                          ? 'bg-sewakhoj-red text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab} {tab === 'all' ? '(24)' : tab === 'pending' ? '(3)' : ''}
                    </button>
                  ))}
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b">
                    <th className="text-left p-4">Tasker</th>
                    <th className="text-left p-4">City</th>
                    <th className="text-left p-4">Skills</th>
                    <th className="text-left p-4">Rating</th>
                    <th className="text-left p-4">Tasks Done</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {taskers
                    .filter(t => activeTab === 'all' || t.status === activeTab)
                    .map((tasker) => (
                    <tr key={tasker.id} className="border-t hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${tasker.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                            {tasker.initials}
                          </div>
                          {tasker.name}
                        </div>
                      </td>
                      <td className="p-4">{tasker.city}</td>
                      <td className="p-4">{tasker.skills}</td>
                      <td className="p-4">
                        {tasker.rating > 0 ? (
                          <span className="flex items-center gap-1">
                            ⭐ {tasker.rating.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-4">{tasker.tasks}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(tasker.status)}`}>
                          {tasker.status.charAt(0).toUpperCase() + tasker.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-4">
                        {tasker.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-medium hover:bg-green-200 transition-colors">
                              Approve
                            </button>
                            <button className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-medium hover:bg-red-200 transition-colors">
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-medium hover:bg-blue-200 transition-colors">
                              <Eye className="w-3 h-3 inline mr-1" /> View
                            </button>
                            <button className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-medium hover:bg-red-200 transition-colors">
                              Suspend
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== SERVICES ===== */}
          {currentPage === 'services' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Services Management / सेवा व्यवस्थापन</h3>
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-sewakhoj-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors"
                >
                  + Add Service
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b">
                    <th className="text-left p-4">Icon</th>
                    <th className="text-left p-4">Service (EN / NP)</th>
                    <th className="text-left p-4">Base Price</th>
                    <th className="text-left p-4">Active Taskers</th>
                    <th className="text-left p-4">Bookings</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {services.map((service, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="p-4 text-2xl">{service.icon}</td>
                      <td className="p-4">
                        <strong>{service.nameEn}</strong>
                        <br />
                        <span className="text-xs text-gray-500">{service.nameNp}</span>
                      </td>
                      <td className="p-4">Rs {service.price}/hr</td>
                      <td className="p-4">{service.taskers}</td>
                      <td className="p-4">{service.bookings.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(service.status)}`}>
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-medium hover:bg-blue-200 transition-colors">
                            <Edit className="w-3 h-3 inline mr-1" /> Edit
                          </button>
                          <button className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-medium hover:bg-red-200 transition-colors">
                            <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== BOOKINGS ===== */}
          {currentPage === 'bookings' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Today's Bookings", value: "28", color: "text-gray-900" },
                  { label: "In Progress", value: "11", color: "text-blue-600" },
                  { label: "Completed Today", value: "14", color: "text-green-600" },
                  { label: "Cancelled", value: "3", color: "text-red-600" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
                    <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-5 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">All Bookings / सबै बुकिङ</h3>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sewakhoj-red">
                    <option>All Status</option>
                    <option>Completed</option>
                    <option>In Progress</option>
                    <option>Matching</option>
                    <option>Cancelled</option>
                  </select>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b">
                      <th className="text-left p-4">Booking ID</th>
                      <th className="text-left p-4">Customer</th>
                      <th className="text-left p-4">Service</th>
                      <th className="text-left p-4">Tasker</th>
                      <th className="text-left p-4">City</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Amount</th>
                      <th className="text-left p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      { id: "#BK-1041", customer: "Aarav K.", service: "🔧 Plumbing", tasker: "Ramesh A.", city: "Kathmandu", date: "Apr 19", amount: "Rs 2,400", status: "completed" },
                      { id: "#BK-1042", customer: "Nisha T.", service: "🧹 Cleaning", tasker: "Sunita T.", city: "Lalitpur", date: "Apr 19", amount: "Rs 1,800", status: "in progress" },
                      { id: "#BK-1043", customer: "Rohan S.", service: "⚡ Electrical", tasker: "—", city: "Kathmandu", date: "Apr 19", amount: "Rs 900", status: "matching" },
                      { id: "#BK-1044", customer: "Priya G.", service: "📚 Tutoring", tasker: "Bikash S.", city: "Pokhara", date: "Apr 18", amount: "Rs 2,100", status: "completed" },
                      { id: "#BK-1045", customer: "Sanjay M.", service: "📦 Moving", tasker: "—", city: "Bhaktapur", date: "Apr 18", amount: "Rs 3,600", status: "cancelled" },
                    ].map((booking, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="p-4 font-medium">{booking.id}</td>
                        <td className="p-4">{booking.customer}</td>
                        <td className="p-4">{booking.service}</td>
                        <td className="p-4">{booking.tasker}</td>
                        <td className="p-4">{booking.city}</td>
                        <td className="p-4">{booking.date}</td>
                        <td className="p-4 font-medium">{booking.amount}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(booking.status)}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== LOCATION MAP ===== */}
          {currentPage === 'location' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Kathmandu Taskers", value: "1,240" },
                  { label: "Pokhara Taskers", value: "380" },
                  { label: "Other Cities", value: "798" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-5 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">📍 Tasker Location Map — Nepal</h3>
                  <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sewakhoj-red">
                    <option>All Services</option>
                    <option>Plumbing</option>
                    <option>Cleaning</option>
                    <option>Electrical</option>
                    <option>Tutoring</option>
                  </select>
                </div>
                <div className="p-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl h-80 flex flex-col items-center justify-center text-blue-600 relative">
                    <div className="text-lg font-semibold mb-2">Nepal — Tasker Density Map</div>
                    <div className="text-sm text-gray-600 mb-4">Hover over dots to see tasker info</div>
                    
                    {/* Map dots */}
                    <div className="absolute top-[42%] left-[52%] w-4 h-4 bg-sewakhoj-red rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform" title="Kathmandu — 1,240 taskers"></div>
                    <div className="absolute top-[38%] left-[53%] text-xs bg-white px-2 py-1 rounded border border-gray-300">Kathmandu</div>
                    
                    <div className="absolute top-[38%] left-[38%] w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform" title="Pokhara — 380 taskers"></div>
                    <div className="absolute top-[34%] left-[34%] text-xs bg-white px-2 py-1 rounded border border-gray-300">Pokhara</div>
                    
                    <div className="absolute top-[55%] left-[46%] w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform" title="Chitwan — 210 taskers"></div>
                    <div className="absolute top-[57%] left-[47%] text-xs bg-white px-2 py-1 rounded border border-gray-300">Chitwan</div>
                    
                    <div className="absolute top-[44%] left-[74%] w-4 h-4 bg-amber-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-125 transition-transform" title="Biratnagar — 198 taskers"></div>
                    <div className="absolute top-[40%] left-[72%] text-xs bg-white px-2 py-1 rounded border border-gray-300">Biratnagar</div>

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 text-xs border border-gray-300">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-sewakhoj-red rounded-full"></div>
                        <span>Kathmandu Valley</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span>Pokhara</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                        <span>Chitwan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
                        <span>Eastern Nepal</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    ⚡ To enable real GPS tracking, connect Google Maps API in Settings. Taskers share live location via the SewaKhoj mobile app.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== USERS ===== */}
          {currentPage === 'users' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Users / प्रयोगकर्ताहरू</h3>
                <button className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  Export CSV
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b">
                    <th className="text-left p-4">User</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">City</th>
                    <th className="text-left p-4">Bookings</th>
                    <th className="text-left p-4">Joined</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { name: "Aarav Khatri", email: "aarav@gmail.com", city: "Kathmandu", bookings: 12, joined: "Jan 2025" },
                    { name: "Nisha Thapa", email: "nisha@gmail.com", city: "Pokhara", bookings: 4, joined: "Feb 2025" },
                    { name: "Rohan Shrestha", email: "rohan@gmail.com", city: "Lalitpur", bookings: 7, joined: "Mar 2025" },
                  ].map((user, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50">
                      <td className="p-4 font-medium">{user.name}</td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">{user.city}</td>
                      <td className="p-4">{user.bookings}</td>
                      <td className="p-4">{user.joined}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-medium hover:bg-blue-200 transition-colors">
                            <Eye className="w-3 h-3 inline mr-1" /> View
                          </button>
                          <button className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-medium hover:bg-red-200 transition-colors">
                            <Ban className="w-3 h-3 inline mr-1" /> Ban
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== PAYMENTS ===== */}
          {currentPage === 'payments' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total Revenue", value: "Rs 4.2L", change: "↑ 22%", changeColor: "text-sewakhoj-green" },
                  { label: "This Month", value: "Rs 68,400", change: "", changeColor: "" },
                  { label: "Pending Payouts", value: "Rs 12,300", change: "⚠ Pending", changeColor: "text-amber-600" },
                  { label: "Platform Commission", value: "Rs 8,200", change: "", changeColor: "" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    {stat.change && <div className={`text-sm mt-1 ${stat.changeColor}`}>{stat.change}</div>}
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-5 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Payment Transactions</h3>
                  <button className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    Export
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b">
                      <th className="text-left p-4">Booking</th>
                      <th className="text-left p-4">Customer</th>
                      <th className="text-left p-4">Tasker</th>
                      <th className="text-left p-4">Amount</th>
                      <th className="text-left p-4">Method</th>
                      <th className="text-left p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      { booking: "#BK-1041", customer: "Aarav K.", tasker: "Ramesh A.", amount: "Rs 2,400", method: "eSewa", status: "paid" },
                      { booking: "#BK-1042", customer: "Nisha T.", tasker: "Sunita T.", amount: "Rs 1,800", method: "Khalti", status: "pending" },
                      { booking: "#BK-1044", customer: "Priya G.", tasker: "Bikash S.", amount: "Rs 2,100", method: "Bank Transfer", status: "paid" },
                    ].map((payment, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="p-4 font-medium">{payment.booking}</td>
                        <td className="p-4">{payment.customer}</td>
                        <td className="p-4">{payment.tasker}</td>
                        <td className="p-4 font-medium">{payment.amount}</td>
                        <td className="p-4">{payment.method}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(payment.status)}`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== SETTINGS ===== */}
          {currentPage === 'settings' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b">
                <h3 className="font-bold text-gray-900">Platform Settings / सेटिङ</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
                    <input type="text" defaultValue="SewaKhoj" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Language</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red">
                      <option>English + Nepali</option>
                      <option>Nepali Only</option>
                      <option>English Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                    <input type="number" defaultValue="12" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default City</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red">
                      <option>Kathmandu</option>
                      <option>Pokhara</option>
                      <option>Chitwan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">eSewa Merchant ID</label>
                    <input type="text" placeholder="EPY..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Khalti Secret Key</label>
                    <input type="password" placeholder="••••••••••••" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Google Maps API Key</label>
                    <input type="text" placeholder="AIza..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SMS Gateway (Sparrow)</label>
                    <input type="text" placeholder="API key..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform Description (SEO)</label>
                    <textarea rows={3} defaultValue="Nepal's #1 trusted platform for local home services." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"></textarea>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="bg-gray-100 text-gray-800 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    Reset
                  </button>
                  <button className="bg-sewakhoj-red text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Service</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Name (English)</label>
                <input type="text" placeholder="e.g. Plumbing" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Name (Nepali)</label>
                <input type="text" placeholder="e.g. प्लम्बिङ" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon (emoji)</label>
                <input type="text" placeholder="🔧" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Price (Rs/hr)</label>
                <input type="number" placeholder="500" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea placeholder="Short description of this service..." rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red"></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sewakhoj-red">
                  <option>Home</option>
                  <option>Education</option>
                  <option>Tech</option>
                  <option>Transport</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-100 text-gray-800 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-sewakhoj-red text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-sewakhoj-red-light transition-colors"
              >
                Save Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
