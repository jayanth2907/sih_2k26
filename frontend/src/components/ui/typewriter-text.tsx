import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import clsx from 'clsx';

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per character
  delay?: number; // ms initial delay
  className?: string;
  cursorClassName?: string;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 35,
  delay = 100,
  className,
  cursorClassName,
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsTyping(false);
      onComplete?.();
      return;
    }

    let charIndex = 0;
    let timer: ReturnType<typeof setInterval>;

    const startDelayTimer = setTimeout(() => {
      timer = setInterval(() => {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(timer);
          setIsTyping(false);
          onComplete?.();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(startDelayTimer);
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <span className={clsx('inline-flex items-center', className)}>
      <span>{displayedText}</span>
      {isTyping && (
        <span
          className={clsx(
            'inline-block w-[2px] h-[0.9em] bg-amber-400 ml-0.5 animate-pulse shrink-0',
            cursorClassName
          )}
          aria-hidden="true"
        />
      )}
    </span>
  );
};
