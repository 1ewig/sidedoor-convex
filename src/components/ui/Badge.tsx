import { ReactNode } from 'react';

export type BadgeVariant = 'score' | 'neutral' | 'stone' | 'outline' | 'subtle';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'neutral', className = '', size = 'sm' }: BadgeProps) {
  const sizeStyles = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  const variantStyles: Record<BadgeVariant, string> = {
    score: 'bg-stone-100 text-stone-900 border border-stone-200 font-mono font-medium',
    neutral: 'bg-white text-stone-700 border border-stone-200',
    stone: 'bg-stone-100 text-stone-600 border border-stone-200',
    outline: 'bg-transparent text-stone-600 border border-stone-200',
    subtle: 'bg-stone-50 text-stone-500 border border-stone-200/60',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium tracking-tight ${sizeStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
