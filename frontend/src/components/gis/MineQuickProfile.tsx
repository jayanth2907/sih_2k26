import React from 'react';
import { GisMineOverviewItemDTO } from '../../types';
import { RiskBadge } from './MineRiskMarker';
import {
  MapPin,
  Activity,
  ArrowRight,
  Radio,
  ClipboardList,
  X,
  Building2,
  Layers,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';

interface MineQuickProfileProps {
  mine: GisMineOverviewItemDTO | null;
  onInspectTelemetry: (mine: GisMineOverviewItemDTO) => void;
  onFullProfile: (mine: GisMineOverviewItemDTO) => void;
  onClose?: () => void;
  className?: string;
}

export const MineQuickProfile: React.FC<MineQuickProfileProps> = ({
  mine,
  onInspectTelemetry,
  onFullProfile,
  onClose,
  className
}) => {
  if (!mine) {
    return (
      <div className={clsx("bg-[#0D100F] border border-[#1B211E] rounded-xl p-6 text-center space-y-3", className)}>
        <div className="w-10 h-10 rounded-full bg-[#141A17] border border-[#232A26] flex items-center justify-center mx-auto text-amber-400/80">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">No Mine Selected</h3>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
            Click any spatial risk marker on the command map or search above to inspect live telemetry &amp; operational metrics.
          </p>
        </div>
      </div>
    );
  }

  const isSimulated = mine.is_simulated === 'YES' || mine.data_status === 'SIMULATED';
  const hasRiskData = mine.current_risk_score !== undefined && mine.current_risk_score !== null;

  return (
    <div className={clsx(
      "bg-[#0D100F]/95 backdrop-blur-md border border-[#232A26] rounded-xl p-4.5 shadow-2xl relative space-y-3.5 animate-in fade-in duration-150",
      className
    )}>
      {/* ROW 1: Mine ID, Provenance Badge, Mine Type, Close Button */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1B211E] pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
            {mine.code}
          </span>
          <span
            className={clsx(
              'text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium',
              isSimulated
                ? 'bg-purple-950/50 text-purple-300 border-purple-500/30'
                : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
            )}
          >
            {isSimulated ? 'Simulated Demo' : 'Source-Derived'}
          </span>
          {mine.mine_type && (
            <span className="text-[9.5px] text-slate-400 font-mono">
              {mine.mine_type}
            </span>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Close Quick Profile"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ROW 2 & 3: Mine Name, Operator, District / State */}
      <div>
        <h2 className="text-base font-bold text-white tracking-tight truncate">
          {mine.name}
        </h2>
        {mine.official_name && mine.official_name !== mine.name && (
          <p className="text-[10px] text-slate-400 truncate">
            {mine.official_name}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
          <span className="text-slate-300 font-medium truncate max-w-[150px]">
            {mine.operator || (isSimulated ? 'TRINETRA Simulated Fleet' : 'Ministry of Coal / CMPDI')}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 truncate text-slate-400">
            <MapPin className="w-3 h-3 text-amber-400/80 shrink-0" />
            {mine.district}, {mine.state}
          </span>
        </div>
      </div>

      {/* ROW 4 & 5: Primary 2-Column KPI Cards (Operational Risk & Active Incidents) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* OPERATIONAL RISK */}
        <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono font-semibold text-slate-500 tracking-wider block">
            Operational Risk
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            {hasRiskData ? (
              <>
                <span className="text-xl font-mono font-bold text-white">
                  {mine.current_risk_score.toFixed(1)}
                  <span className="text-[10.5px] font-normal text-slate-500 ml-0.5">/100</span>
                </span>
                <RiskBadge band={mine.current_risk_band} />
              </>
            ) : (
              <span className="text-[10px] font-mono text-slate-500">Risk Data Unavailable</span>
            )}
          </div>
        </div>

        {/* ACTIVE INCIDENTS */}
        <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono font-semibold text-slate-500 tracking-wider block">
            Active Incidents
          </span>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className={clsx(
              'text-xl font-mono font-bold',
              mine.open_incidents_count > 0 ? 'text-rose-400' : 'text-slate-300'
            )}>
              {mine.open_incidents_count}
            </span>
            <span className={clsx(
              'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border uppercase',
              mine.open_incidents_count > 0
                ? 'bg-rose-950/50 text-rose-400 border-rose-500/30'
                : 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
            )}>
              {mine.open_incidents_count > 0 ? 'Action Req' : 'Zero Active'}
            </span>
          </div>
        </div>
      </div>

      {/* ROW 6 & 7: Secondary Telemetry & Field Tasks Status */}
      <div className="rounded-lg bg-[#080A09] border border-[#1B211E] p-2.5 space-y-2 text-xs">
        {/* ROW 6: Telemetry */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium text-slate-300">Telemetry</span>
          </div>
          <div className="text-right font-mono text-[11px]">
            {mine.total_sensors > 0 ? (
              <>
                <span className="text-white font-semibold">{mine.total_sensors} streams</span>
                <span className="text-slate-500"> · </span>
                <span className="text-emerald-400 font-semibold">{mine.online_sensors} live</span>
                <span className="text-slate-500 text-[10px]"> ({mine.reporting_rate_percent}%)</span>
              </>
            ) : (
              <span className="text-slate-500">Telemetry unavailable</span>
            )}
          </div>
        </div>

        {/* ROW 7: Field Tasks */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1B211E]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-slate-300">Field Tasks</span>
          </div>
          <div className="text-right font-mono text-[11px]">
            <span className="text-white font-semibold">{mine.open_field_tasks_count} open</span>
            <span className="text-slate-500"> · </span>
            <span className={clsx(
              'font-semibold',
              mine.sla_breaches_count > 0 ? 'text-rose-400' : 'text-emerald-400'
            )}>
              {mine.sla_breaches_count > 0 ? `${mine.sla_breaches_count} overdue` : 'SLA on track'}
            </span>
          </div>
        </div>
      </div>

      {/* ROW 8: Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => onInspectTelemetry(mine)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#141A17] hover:bg-[#1E2522] border border-[#27302B] text-slate-200 text-xs font-semibold transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Activity className="w-4 h-4 text-sky-400" />
          <span>Inspect Telemetry</span>
        </button>

        <button
          onClick={() => onFullProfile(mine)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
        >
          <span>Full Mine Profile</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
