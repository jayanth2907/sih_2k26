import React from 'react';

/**
 * Quiet status marker: a small dot plus a plain-text label.
 * Colour is carried by the dot only (and the label for "critical"),
 * so a page full of statuses stays calm and the real problems stand out.
 */

export type StatusTone = 'critical' | 'warning' | 'neutral' | 'good' | 'muted';

const TONE_BY_STATUS: Record<string, StatusTone> = {
  // severity
  CRITICAL: 'critical',
  HIGH: 'warning',
  WARNING: 'warning',
  MEDIUM: 'neutral',
  LOW: 'muted',
  INFO: 'muted',
  // sensor
  ACTIVE: 'good',
  NORMAL: 'good',
  OFFLINE: 'muted',
  // alert
  UNREAD: 'warning',
  ACKNOWLEDGED: 'neutral',
  // incident lifecycle
  OPEN: 'warning',
  TRIAGED: 'neutral',
  ASSIGNED: 'neutral',
  IN_PROGRESS: 'neutral',
  ESCALATED: 'critical',
  RESOLVED: 'good',
  VERIFIED: 'good',
  CLOSED: 'muted',
};

const DOT_CLASS: Record<StatusTone, string> = {
  critical: 'bg-rose-400',
  warning: 'bg-amber-400',
  neutral: 'bg-slate-300',
  good: 'bg-emerald-400/80',
  muted: 'bg-slate-600',
};

const LABEL_CLASS: Record<StatusTone, string> = {
  critical: 'text-rose-300',
  warning: 'text-slate-300',
  neutral: 'text-slate-300',
  good: 'text-slate-300',
  muted: 'text-slate-500',
};

const VALUE_CLASS: Record<StatusTone, string> = {
  critical: 'text-rose-300',
  warning: 'text-amber-300',
  neutral: 'text-white',
  good: 'text-white',
  muted: 'text-slate-500',
};

/** "IN_PROGRESS" -> "In progress" */
export const humanize = (value: string): string => {
  const text = value.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const statusTone = (status?: string | null): StatusTone =>
  (status && TONE_BY_STATUS[status.toUpperCase()]) || 'neutral';

/** Text colour for a big numeric reading, driven by status. */
export const toneValueClass = (status?: string | null): string => VALUE_CLASS[statusTone(status)];

interface StatusIndicatorProps {
  status: string;
  /** Override the auto-generated label (e.g. for translations). */
  label?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label, className = '' }) => {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center gap-2 text-xs ${LABEL_CLASS[tone]} ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[tone]}`} />
      {label ?? humanize(status)}
    </span>
  );
};


export default StatusIndicator;
