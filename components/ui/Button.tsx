import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-[6px] font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)] focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'primary' && 'bg-[var(--color-text-primary)] text-[var(--color-bg)] hover:opacity-90',
          variant === 'secondary' && 'bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]',
          variant === 'danger' && 'bg-[var(--color-brand-red)] text-white hover:opacity-90',
          size === 'sm' && 'px-3 py-1.5 text-[12px]',
          size === 'md' && 'px-4 py-2 text-[13px]',
          size === 'lg' && 'px-6 py-3 text-[14px]',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
