import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  className,
  size = 80,
  duration = 7,
  colorFrom = '#E8A817',
  colorTo = '#F2BC32',
  delay = 0
}) => (
  <motion.span
    aria-hidden="true"
    className={clsx('pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden', className)}
    style={{ padding: 1 }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4, delay }}
  >
    <motion.span
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${colorFrom}, ${colorTo}, transparent 70%)`,
        offsetPath: 'rect(0 auto auto 0 round 999px)'
      }}
      animate={{
        left: ['-10%', '100%', '100%', '-10%'],
        top: ['-10%', '-10%', '100%', '100%']
      }}
      transition={{ duration, repeat: Infinity, ease: 'linear', delay }}
    />
  </motion.span>
);
