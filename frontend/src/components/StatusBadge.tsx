import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'xs';
  showTechnical?: boolean;
}

const HUMAN_STATUS_MAP: Record<string, string> = {
  CRITICAL: 'Critical — Attention Required',
  HIGH: 'High Risk',
  WARNING: 'Warning — Review Required',
  MEDIUM: 'Moderate Attention',
  LOW: 'Low Risk — Normal',
  OFFLINE: 'Not Reporting',
  ACTIVE: 'Operating Normally',
  OPERATIONAL: 'Operating Normally',
  GOOD: 'Optimal Condition',
  HEALTHY: 'System Healthy',
  OPEN: 'Open — Action Required',
  TRIAGED: 'Triaged for Review',
  ASSIGNED: 'Action Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified & Audited',
  CLOSED: 'Closed',
  PENDING: 'Awaiting Action',
  ESCALATED: 'Escalated for Review',
  NO_DATA: 'No Data Available',
  REVIEW_REQUIRED: 'Review Required',
  PASS: 'Compliant (Pass)',
  FAIL: 'Non-Compliant (Fail)',
  FLAG: 'Flagged for Review',
  SOURCE_DERIVED: 'From Source Document',
  SIMULATED: 'Demonstration Data',
  MODEL_DERIVED: 'AI / Model Forecast',
  APPROXIMATE: 'Approximate Geometry',
  TAMPER_DETECTED: 'Audit Discrepancy'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  className, 
  size = 'md',
  showTechnical = false 
}) => {
  const normalized = (status || '').toUpperCase().trim();

  let colorClasses = 'bg-[#121614] text-slate-300 border-[#1B211E]';

  if (['ACTIVE', 'GOOD', 'OPERATIONAL', 'CLOSED', 'LOW', 'VERIFIED', 'RESOLVED', 'HEALTHY', 'PASS'].includes(normalized)) {
    colorClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60';
  } else if (['WARNING', 'MEDIUM', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING', 'REVIEW_REQUIRED'].includes(normalized)) {
    colorClasses = 'bg-amber-950/60 text-amber-300 border-amber-700/60';
  } else if (['CRITICAL', 'HIGH', 'ESCALATED', 'OFFLINE', 'FAIL', 'TAMPER_DETECTED', 'BREACH'].includes(normalized)) {
    colorClasses = 'bg-rose-950/60 text-rose-300 border-rose-700/60';
  } else if (['SIMULATED', 'DEMO', 'EXTERNAL', 'PREDICTIVE', 'SOURCE_DERIVED', 'MODEL_DERIVED'].includes(normalized)) {
    colorClasses = 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60';
  }

  const displayText = showTechnical
    ? normalized.replace(/_/g, ' ')
    : HUMAN_STATUS_MAP[normalized] || normalized.replace(/_/g, ' ');

  return (
    <span
      title={`System Code: ${normalized}`}
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium border rounded-md font-mono tracking-wide transition-colors',
        size === 'xs' ? 'px-1.5 py-0.2 text-[9.5px]' :
        size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 
        'px-2.5 py-1 text-xs',
        colorClasses,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      <span className="truncate">{displayText}</span>
    </span>
  );
};
