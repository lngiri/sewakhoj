"use client";

import { Phone, MessageCircle, MapPin, Clock } from "lucide-react";
import { services as serviceData } from "@/data/services";

interface CustomerBookingCardProps {
  booking: any;
  onCall?: (booking: any) => void;
  onChat?: (booking: any) => void;
}

function getStatusBadgeClass(status: string): string {
  if (status === 'completed') return 'bg-green-50 text-green-600';
  if (status === 'cancelled') return 'bg-red-50 text-red-600';
  return 'bg-blue-50 text-blue-600';
}

export default function CustomerBookingCard({ booking, onCall, onChat }: CustomerBookingCardProps) {
  const service = serviceData.find(s => s.id === booking.service);

  const badgeClass = 'px-3 py-1 rounded-full text-[10px] font-black uppercase ' + getStatusBadgeClass(booking.status);

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 p-8 hover:shadow-xl transition-all cursor-pointer group">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
          {service?.emoji || '🔧'}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xl font-black text-gray-900 truncate mb-2">
            {service?.nameEn || booking.service}
          </h4>
          <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {booking.booking_date} {booking.booking_time}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {booking.address}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className={badgeClass}>
              {booking.status}
            </span>
            <span className="text-xs font-bold text-gray-400">Rs {booking.total_amount}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {booking.taskers?.users?.phone && (
            <button
              onClick={() => onCall && onCall(booking)}
              className="w-12 h-12 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
              title="Call Tasker"
            >
              <Phone className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <button
            onClick={() => onChat && onChat(booking)}
            className="w-12 h-12 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
            title="Chat with Tasker"
          >
            <MessageCircle className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
