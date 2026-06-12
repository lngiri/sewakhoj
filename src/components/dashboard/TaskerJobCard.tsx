"use client";

import { Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { services as serviceData } from "@/data/services";

interface TaskerJobCardProps {
  booking: any;
  onStatusChange?: (booking: any, status: string) => void;
}

function getStatusBadgeClass(status: string): string {
  if (status === 'completed') return 'bg-green-50 text-green-600';
  if (status === 'declined') return 'bg-red-50 text-red-600';
  if (status === 'cancelled') return 'bg-gray-50 text-gray-600';
  return 'bg-blue-50 text-blue-600';
}

export default function TaskerJobCard({ booking, onStatusChange }: TaskerJobCardProps) {
  const service = serviceData.find(s => s.id === booking.service);

  const getStatusActions = () => {
    switch (booking.status) {
      case 'pending_acceptance':
        return [
          { label: 'Accept', status: 'accepted', color: 'bg-green-600 hover:bg-green-700' },
          { label: 'Decline', status: 'declined', color: 'bg-red-600 hover:bg-red-700' },
        ];
      case 'accepted':
        return [
          { label: 'On the Way', status: 'on-the-way', color: 'bg-blue-600 hover:bg-blue-700' },
        ];
      case 'on-the-way':
        return [
          { label: 'Arrived', status: 'arrived', color: 'bg-purple-600 hover:bg-purple-700' },
        ];
      case 'arrived':
        return [
          { label: 'Start Job', status: 'in-progress', color: 'bg-amber-600 hover:bg-amber-700' },
        ];
      case 'in-progress':
        return [
          { label: 'Complete', status: 'completed', color: 'bg-green-600 hover:bg-green-700' },
        ];
      default:
        return [];
    }
  };

  const badgeClass = 'inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-3 ' + getStatusBadgeClass(booking.status);

  return (<>
    <div className="bg-white rounded-[32px] border border-slate-100 p-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
          {service?.emoji || '🔧'}
        </div>

        <div className="text-right">
          <span className={badgeClass}>
            {booking.status.replace('-', ' ')}
          </span>
          <p className="text-xs font-bold text-slate-400">Rs {booking.total_amount}</p>
        </div>
      </div>

      <h4 className="text-xl font-black text-slate-900 mb-2 truncate">
        {service?.nameEn || booking.service}
      </h4>

      <div className="flex items-center gap-6 mb-6 text-sm text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" /> {booking.booking_date} {booking.booking_time}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-4 h-4" /> {booking.address}
        </span>
      </div>

      <div className="mb-6">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Customer</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center font-black text-slate-600">
            {booking.users?.full_name?.charAt(0) || 'C'}
          </div>
          <span className="font-bold text-sm text-slate-900">{booking.users?.full_name || 'Customer'}</span>
          {booking.users?.phone && (
            <a href={`tel:${booking.users.phone}`} className="ml-auto p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
              <Phone className="w-4 h-4 text-slate-600" />
            </a>
          )}
        </div>
      </div>

      {getStatusActions().length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {getStatusActions().map((action) => (
            <button
              key={action.status}
              onClick={() => onStatusChange && onStatusChange(booking, action.status)}
              className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${action.color} text-white shadow-lg active:scale-95`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  </>
  );
}
