import React from 'react';
import clsx from 'clsx';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] select-none rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[44px] touch-manipulation';

  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-lg shadow-amber-500/20 active:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none',
    secondary: 'bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700/80 active:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-800',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500',
    warning: 'bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 active:bg-amber-600/40',
    ghost: 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/60 active:bg-slate-800',
    outline: 'bg-transparent border border-slate-700 text-slate-200 hover:bg-slate-800 active:bg-slate-700/80',
  };

  const sizes = {
    sm: 'px-3 py-2 text-xs gap-1.5 min-h-[40px]',
    md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]',
    lg: 'px-5 py-3.5 text-base gap-2.5 min-h-[52px]',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-60 cursor-not-allowed active:scale-100',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
