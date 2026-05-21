import React from 'react';

interface LoadingSpinnerProps {
  size?: string;
  variant?: string;
  className?: string;
  fullPage?: boolean;
}

const SIZE_CLASSES: Record<string, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[3px]',
};

const VARIANT_COLORS: Record<string, string> = {
  brand: 'border-sewakhoj-red',
  white: 'border-white',
  neutral: 'border-gray-400',
};

export default function LoadingSpinner({
  size = 'md',
  variant = 'brand',
  className = '',
  fullPage = false,
}: LoadingSpinnerProps) {
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const variantClass = VARIANT_COLORS[variant] ?? 'border-gray-400';

  const spinner = (
    <div
      className={`animate-spin rounded-full border-t-transparent ${sizeClass} ${variantClass} ${className}`}
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {spinner}
      </div>
    );
  }

  return spinner;
}
