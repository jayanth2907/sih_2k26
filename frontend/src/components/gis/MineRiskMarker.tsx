import React from 'react';
import clsx from 'clsx';

export type RiskBandType = 'CRITICAL' | 'HIGH' | 'MED' | 'MEDIUM' | 'LOW';

export interface RiskVisualTokens {
  baseColor: string;
  bgRgba: string;
  glowRgba: string;
  ringRgba: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  label: string;
}

export const getRiskVisualTokens = (band: RiskBandType | string): RiskVisualTokens => {
  const normalized = (band || 'LOW').toUpperCase();
  if (normalized === 'CRITICAL') {
    return {
      baseColor: '#E11D48',
      bgRgba: 'rgba(225, 29, 72, 0.95)',
      glowRgba: 'rgba(225, 29, 72, 0.35)',
      ringRgba: 'rgba(225, 29, 72, 0.55)',
      badgeBg: 'bg-rose-950/60',
      badgeBorder: 'border-rose-500/40',
      badgeText: 'text-rose-400',
      label: 'CRITICAL'
    };
  }
  if (normalized === 'HIGH') {
    return {
      baseColor: '#F97316',
      bgRgba: 'rgba(249, 115, 22, 0.95)',
      glowRgba: 'rgba(249, 115, 22, 0.30)',
      ringRgba: 'rgba(249, 115, 22, 0.50)',
      badgeBg: 'bg-orange-950/60',
      badgeBorder: 'border-orange-500/40',
      badgeText: 'text-orange-400',
      label: 'HIGH'
    };
  }
  if (normalized === 'MED' || normalized === 'MEDIUM') {
    return {
      baseColor: '#F59E0B',
      bgRgba: 'rgba(245, 158, 11, 0.95)',
      glowRgba: 'rgba(245, 158, 11, 0.25)',
      ringRgba: 'rgba(245, 158, 11, 0.40)',
      badgeBg: 'bg-amber-950/60',
      badgeBorder: 'border-amber-500/40',
      badgeText: 'text-amber-400',
      label: 'MED'
    };
  }
  return {
    baseColor: '#10B981',
    bgRgba: 'rgba(16, 185, 129, 0.95)',
    glowRgba: 'rgba(16, 185, 129, 0.20)',
    ringRgba: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'bg-emerald-950/60',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-400',
    label: 'LOW'
  };
};

/**
 * Creates refined TRINETRA industrial spatial risk marker HTML:
 * - Outer subtle halo (28-36px)
 * - Thin risk-colored ring (18-24px)
 * - Small central solid core (10-14px)
 * - Selected state: 1.4x enlarged with distinct double ring and crisp halo.
 */
export const createMineMarkerHtml = (
  riskBand: RiskBandType | string,
  isSelected: boolean = false
): string => {
  const tokens = getRiskVisualTokens(riskBand);
  const normalized = (riskBand || 'LOW').toUpperCase();
  const isCritical = normalized === 'CRITICAL';
  const isHigh = normalized === 'HIGH';

  if (isSelected) {
    // Selected marker: ~36px outer boundary, ~22px inner ring, 10px core
    return `
      <div class="relative flex items-center justify-center cursor-pointer select-none">
        <!-- Outer Glowing Halo -->
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full opacity-40" style="background-color: ${tokens.baseColor};"></span>
        <span class="absolute inline-flex h-7 w-7 rounded-full opacity-30" style="background-color: ${tokens.baseColor};"></span>
        <!-- Outer Bright Ring -->
        <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#080A09] border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.6)]">
          <!-- Inner Ring -->
          <div class="flex items-center justify-center w-4 h-4 rounded-full border border-[${tokens.baseColor}]" style="border-color: ${tokens.baseColor};">
            <!-- Center Core -->
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${tokens.baseColor}; box-shadow: 0 0 6px ${tokens.baseColor};"></span>
          </div>
        </div>
      </div>
    `;
  }

  // Default marker: 3-tier concentric design (halo, ring, core)
  const pulseHtml = isCritical
    ? `<span class="animate-ping absolute inline-flex h-6 w-6 rounded-full opacity-35" style="background-color: ${tokens.baseColor};"></span>`
    : (isHigh ? `<span class="animate-pulse absolute inline-flex h-5 w-5 rounded-full opacity-25" style="background-color: ${tokens.baseColor};"></span>` : '');

  return `
    <div class="relative flex items-center justify-center cursor-pointer select-none transition-transform duration-150 hover:scale-125 group">
      <!-- 1. Outer Halo -->
      ${pulseHtml}
      <div class="absolute w-6 h-6 rounded-full opacity-30" style="background-color: ${tokens.glowRgba};"></div>
      
      <!-- 2. Thin Risk Ring -->
      <div class="relative flex items-center justify-center w-4 h-4 rounded-full bg-[#080A09]/90 border shadow-md" style="border-color: ${tokens.ringRgba};">
        <!-- 3. Central Solid Core -->
        <span class="w-2 h-2 rounded-full" style="background-color: ${tokens.baseColor}; box-shadow: 0 0 4px ${tokens.baseColor};"></span>
      </div>
    </div>
  `;
};

export const RiskBadge: React.FC<{ band: RiskBandType | string; score?: number; className?: string }> = ({
  band,
  score,
  className
}) => {
  const tokens = getRiskVisualTokens(band);
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border',
        tokens.badgeBg,
        tokens.badgeBorder,
        tokens.badgeText,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tokens.baseColor }} />
      <span>{tokens.label}</span>
      {score !== undefined && score !== null && (
        <span className="font-mono font-bold opacity-90 text-[10px]">({score.toFixed(1)})</span>
      )}
    </span>
  );
};
