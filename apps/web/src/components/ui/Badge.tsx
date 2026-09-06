import React from 'react';

interface BadgeProps {
  variant: 'official' | 'community' | 'pending' | 'rejected';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center px-2 py-0.5 text-[11px] font-data tracking-wide rounded-[4px] uppercase select-none';

  const variants = {
    official: 'bg-[#B83214] text-chalk',
    community: 'border border-contour-tan text-ink bg-transparent',
    pending: 'border border-moss text-moss bg-transparent',
    rejected: 'border border-error text-error bg-transparent',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
