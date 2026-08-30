import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = 'secondary',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-display tracking-wider uppercase text-xs px-4 py-2.5 transition-colors cursor-pointer select-none rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-trail-orange text-chalk hover:bg-[#d44820] active:bg-[#bd3f1c] border-none shadow-none',
    secondary:
      'bg-transparent text-ink border border-contour-tan hover:border-ink active:bg-paper/40 shadow-none',
    ghost:
      'bg-transparent text-ink hover:bg-paper/40 border-none shadow-none',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
