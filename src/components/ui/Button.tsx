import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'glow';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-xs px-3.5 py-2 rounded-lg gap-2 font-medium',
    lg: 'text-sm px-4 py-2.5 rounded-lg gap-2 font-medium',
  }[size];

  const variantStyles = {
    primary:
      'bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors shadow-none active:scale-[0.99]',
    secondary:
      'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors active:scale-[0.99]',
    outline:
      'bg-transparent text-stone-700 border border-stone-300 hover:bg-stone-50 transition-colors active:scale-[0.99]',
    ghost:
      'bg-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors',
    glow:
      'bg-stone-900 text-white font-medium hover:bg-stone-800 border border-stone-900 transition-colors active:scale-[0.99]',
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
