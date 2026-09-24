import React from 'react';
import clsx from 'clsx';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  variant?: 'default' | 'amber' | 'critical' | 'cyan' | 'slate';
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className,
  onClick,
  interactive = false,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-slate-900/90 border-slate-800/90 shadow-sm',
    amber: 'bg-amber-950/20 border-amber-500/30 shadow-amber-950/20',
    critical: 'bg-red-950/20 border-red-500/30 shadow-red-950/20',
    cyan: 'bg-cyan-950/20 border-cyan-500/30 shadow-cyan-950/20',
    slate: 'bg-slate-850 border-slate-750',
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl border p-4 transition-all duration-150',
        variantStyles[variant],
        interactive && 'cursor-pointer active:scale-[0.99] active:bg-slate-800/80 hover:border-slate-700',
        className
      )}
    >
      {children}
    </div>
  );
};
