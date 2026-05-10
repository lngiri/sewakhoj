'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationProps {
  id: string;
  message: string;
  type: NotificationType;
  onClose: (id: string) => void;
  duration?: number;
}

const typeStyles: Record<NotificationType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    icon: '✕',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: '⚠',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'ℹ',
  },
};

export function Notification({ id, message, type, onClose, duration = 5000 }: NotificationProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match exit animation duration
  }, [id, onClose]);

  useEffect(() => {
    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  const styles = typeStyles[type];

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300 ease-out',
        styles.bg,
        styles.border,
        'min-w-[320px] max-w-md',
        isExiting && 'animate-out slide-out-to-right-full duration-300 ease-in'
      )}
      role="alert"
      aria-live="polite"
    >
      {/* App Logo */}
      <div className="flex-shrink-0">
        <img
          src="/logo.png"
          alt="SewaKhoj Logo"
          className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
        />
      </div>

      {/* Notification Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-semibold" aria-hidden="true">
            {styles.icon}
          </span>
          <span className="text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">
            {type}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
          {message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
}
