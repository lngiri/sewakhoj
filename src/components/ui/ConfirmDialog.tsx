import React from 'react';

interface ConfirmDialogProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  open?: boolean;
  isOpen?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  default: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
  onClose,
  open,
  isOpen,
  children,
}: ConfirmDialogProps) {
  const isVisible = open ?? isOpen ?? false;
  const handleClose = onCancel ?? onClose ?? (() => {});
  const label = confirmText ?? confirmLabel ?? 'Confirm';

  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        {children ? (
          <div className="mb-4">{children}</div>
        ) : (
          message && <p className="mb-4">{message}</p>
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded disabled:opacity-50 ${variantStyles[variant] ?? variantStyles.default}`}
          >
            {loading ? 'Processing...' : label}
          </button>
        </div>
      </div>
    </div>
  );
}
