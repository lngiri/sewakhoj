import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  backHref?: string;
  showBack?: boolean;
  relatedLinks?: { href: string; label: string; description?: string }[];
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  className = '',
  backHref,
  showBack,
  relatedLinks = [],
  children,
}: PageHeaderProps) {
  return (
    <header className={`mb-6 ${className}`.trim()}>
      {showBack && backHref && (
        <Link
          href={backHref}
          className="back-btn inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      )}
      <div className="title-wrapper">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      {relatedLinks.length > 0 && (
        <nav className="mt-3 flex flex-wrap gap-3">
          {relatedLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex flex-col items-start px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors no-underline"
            >
              <span className="font-semibold text-sm">{link.label}</span>
              {link.description && (
                <span className="text-xs opacity-70">{link.description}</span>
              )}
            </a>
          ))}
        </nav>
      )}
      {children}
    </header>
  );
}
