'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface NotificationProps {
  id: string;
  message: string;
  type: NotificationType;
  onClose: (id: string) => void;
  duration?: number;
  action?: NotificationAction;
}

const variantConfig: Record<
  NotificationType,
  {
    Icon: typeof CheckCircle2;
    iconColor: string;
    borderColor: string;
    bgAccent: string;
    progressColor: string;
    label: string;
  }
> = {
  success: {
    Icon: CheckCircle2,
    iconColor: 'text-sewakhoj-green',
    borderColor: 'border-l-sewakhoj-green',
    bgAccent: 'bg-green-50/60',
    progressColor: 'bg-sewakhoj-green',
    label: 'Success',
  },
  error: {
    Icon: XCircle,
    iconColor: 'text-sewakhoj-red',
    borderColor: 'border-l-sewakhoj-red',
    bgAccent: 'bg-red-50/60',
    progressColor: 'bg-sewakhoj-red',
    label: 'Error',
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: 'text-amber-500',
    borderColor: 'border-l-amber-500',
    bgAccent: 'bg-amber-50/60',
    progressColor: 'bg-amber-500',
    label: 'Warning',
  },
  info: {
    Icon: Info,
    iconColor: 'text-trust-blue',
    borderColor: 'border-l-trust-blue',
    bgAccent: 'bg-blue-50/60',
    progressColor: 'bg-trust-blue',
    label: 'Info',
  },
};

export function Notification({
  id,
  message,
  type,
  onClose,
  duration = 5000,
  action,
}: NotificationProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  }, [id, onClose]);

  // Auto-dismiss with pause-on-hover support
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      remainingRef.current -= Date.now() - startTimeRef.current;
      return;
    }

    startTimeRef.current = Date.now();
    const remaining = Math.max(remainingRef.current, 500);
    timerRef.current = setTimeout(() => {
      handleClose();
    }, remaining);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, handleClose]);

  // Animate progress bar via CSS custom property
  useEffect(() => {
    const bar = progressBarRef.current;
    if (!bar) return;

    if (isPaused) {
      // Freeze the animation at current position
      const computed = getComputedStyle(bar);
      const currentWidth = parseFloat(computed.width) / parseFloat((bar.parentElement as HTMLElement)?.offsetWidth?.toString() || '1') * 100;
      bar.style.animation = 'none';
      bar.style.width = `${currentWidth}%`;
    } else {
      bar.style.animation = '';
      bar.style.animation = `sewakhoj-toast-progress ${remainingRef.current}ms linear forwards`;
      bar.style.width = '';
    }
  }, [isPaused]);

  const config = variantConfig[type];
  const { Icon } = config;

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-900/5',
        'w-[calc(100vw-2rem)] max-w-[380px]',
        'border-l-[3px]',
        config.borderColor,
        // Enter animation
        !isExiting && 'animate-in slide-in-from-right-full fade-in duration-300 ease-out',
        // Exit animation
        isExiting && 'animate-out slide-out-to-right-full fade-out duration-300 ease-in',
      )}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
          config.bgAccent,
        )}
      >
        <Icon className={cn('w-5 h-5', config.iconColor)} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">
          SewaKhoj · {config.label}
        </p>
        <p className="text-sm font-semibold text-gray-900 leading-snug break-words">
          {message}
        </p>

        {/* Optional action button */}
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
              handleClose();
            }}
            className="mt-2 text-xs font-black uppercase tracking-widest text-sewakhoj-red hover:text-red-700 transition-colors"
          >
            {action.label} →
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full overflow-hidden bg-gray-100">
        <div
          ref={progressBarRef}
          className={cn('h-full rounded-full origin-left', config.progressColor)}
          style={{ animation: `sewakhoj-toast-progress ${duration}ms linear forwards` }}
        />
      </div>
    </div>
  );
}
