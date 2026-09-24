import React, { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import clsx from 'clsx';

interface NumberTickerProps {
  value: number | string;
  direction?: 'up' | 'down';
  delay?: number;
  className?: string;
  decimalPlaces?: number;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const isNaNValue = isNaN(numericValue);

  const motionValue = useMotionValue(direction === 'down' ? numericValue : 0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 220
  });

  const isInView = useInView(ref, { once: true, margin: '0px' });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isNaNValue) return;

    if (prefersReducedMotion) {
      motionValue.set(numericValue);
      if (ref.current) {
        ref.current.textContent = numericValue.toFixed(decimalPlaces);
      }
      return;
    }

    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(numericValue);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [motionValue, numericValue, isNaNValue, isInView, delay, prefersReducedMotion, decimalPlaces]);

  useEffect(() => {
    if (isNaNValue) return;
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = Number(latest.toFixed(decimalPlaces)).toLocaleString('en-US', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces
        });
      }
    });
  }, [springValue, decimalPlaces, isNaNValue]);

  if (isNaNValue) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span
      ref={ref}
      className={clsx('inline-block tabular-nums tracking-tight', className)}
    >
      {prefersReducedMotion ? numericValue.toFixed(decimalPlaces) : '0'}
    </span>
  );
};
