'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification, NotificationType, NotificationAction } from '@/components/ui/Notification';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
  action?: NotificationAction;
}

interface NotificationContextType {
  showNotification: (
    message: string,
    type?: NotificationType,
    duration?: number,
    action?: NotificationAction,
  ) => void;
  showSuccess: (message: string, duration?: number, action?: NotificationAction) => void;
  showError: (message: string, duration?: number, action?: NotificationAction) => void;
  showWarning: (message: string, duration?: number, action?: NotificationAction) => void;
  showInfo: (message: string, duration?: number, action?: NotificationAction) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (
      message: string,
      type: NotificationType = 'info',
      duration?: number,
      action?: NotificationAction,
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setNotifications((prev) => [...prev, { id, message, type, duration, action }]);

      // Auto-remove from state after duration + exit animation buffer
      const effectiveDuration = duration ?? (type === 'error' ? 6000 : 5000);
      setTimeout(() => {
        removeNotification(id);
      }, effectiveDuration + 500);
    },
    [removeNotification],
  );

  const showSuccess = useCallback(
    (message: string, duration?: number, action?: NotificationAction) => {
      showNotification(message, 'success', duration, action);
    },
    [showNotification],
  );

  const showError = useCallback(
    (message: string, duration?: number, action?: NotificationAction) => {
      showNotification(message, 'error', duration, action);
    },
    [showNotification],
  );

  const showWarning = useCallback(
    (message: string, duration?: number, action?: NotificationAction) => {
      showNotification(message, 'warning', duration, action);
    },
    [showNotification],
  );

  const showInfo = useCallback(
    (message: string, duration?: number, action?: NotificationAction) => {
      showNotification(message, 'info', duration, action);
    },
    [showNotification],
  );

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      {/* Toast stack */}
      <div className="toast-container">
        {notifications.map((notification) => (
          <div key={notification.id}>
            <Notification
              id={notification.id}
              message={notification.message}
              type={notification.type}
              duration={notification.duration}
              action={notification.action}
              onClose={removeNotification}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
