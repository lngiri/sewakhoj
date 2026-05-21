import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'neutral' | 'danger';
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<string, string> = {
  default: 'bg-gray-200 text-gray-800',
  primary: 'bg-blue-500 text-white',
  secondary: 'bg-gray-500 text-white',
  success: 'bg-green-100 text-green-700',
  neutral: 'bg-gray-100 text-gray-600',
  danger: 'bg-red-100 text-red-700',
};

export default function Badge({ children, variant = 'default', icon }: BadgeProps) {
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${variantClass}`}>
      {icon}
      {children}
    </span>
  );
}
