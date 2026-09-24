import React from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';

interface AIChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  welcomeMessage?: string;
}

export const AIChatInput: React.FC<AIChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask TRINETRA Copilot...',
  disabled = false,
  className,
  welcomeMessage = 'Welcome to TRINETRA AI Copilot. Ask a grounded governance or safety question.'
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const isExpanded = isFocused;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!disabled && value.trim()) onSubmit();
  };

  return (
    <motion.div
      animate={{ height: isExpanded ? 84 : 44 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className={clsx('overflow-hidden', className)}
    >
      <form onSubmit={submit} className="flex h-11 items-center gap-3">
        <Sparkles className="h-4 w-4 shrink-0 text-[#D6A243]" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Ask AI Copilot"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#E6E8E3] outline-none placeholder:text-[#626B63]"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send query"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8A817] text-[#0C0E0D] transition-colors hover:bg-[#F2BC32] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="border-t border-[#232923] px-7 pt-1.5 text-[10px] font-mono text-[#8A9189]"
          >
            {welcomeMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
