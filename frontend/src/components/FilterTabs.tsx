import React from 'react';
import { humanize } from './StatusIndicator';

/**
 * Text tabs with an underline on the active option.
 * Place inside a container that has a bottom border so the active
 * underline sits on that line (the buttons use -mb-px to overlap it).
 */
interface FilterTabsProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  /** Turns a raw option ("IN_PROGRESS") into display text. Defaults to sentence case. */
  format?: (value: string) => string;
  disabled?: boolean;
  label?: string;
}

export const FilterTabs: React.FC<FilterTabsProps> = ({
  options,
  value,
  onChange,
  format = humanize,
  disabled = false,
  label,
}) => (
  <div role="group" aria-label={label} className="hide-scrollbar flex items-center gap-5 overflow-x-auto whitespace-nowrap">
    {options.map((option) => {
      const active = option === value;
      return (
        <button
          key={option}
          type="button"
          aria-pressed={active}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={`-mb-px cursor-pointer rounded-sm border-b pb-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60 disabled:cursor-not-allowed disabled:opacity-60 ${active
              ? 'border-amber-400 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-200'
            }`}
        >
          {format(option)}
        </button>
      );
    })}
  </div>
);

export default FilterTabs;
