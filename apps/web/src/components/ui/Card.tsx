import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`paper-card p-[16px] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
