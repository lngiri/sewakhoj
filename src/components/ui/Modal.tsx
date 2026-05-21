import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
}: ModalProps) {
  if (!open) return null;
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div className={`bg-white p-6 rounded-lg shadow-lg ${sizeClass} w-full max-h-[90vh] overflow-y-auto`}>
        {title && <h2 className="text-xl font-bold mb-1">{title}</h2>}
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
        <div className="mb-4">{children}</div>
        {footer ? (
          <div className="mt-4">{footer}</div>
        ) : (
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Close
          </button>
        )}
      </div>
    </div>
  );
}
