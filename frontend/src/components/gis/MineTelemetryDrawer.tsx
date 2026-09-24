import React, { useEffect, useState } from 'react';
import { GisMineOverviewItemDTO, Sensor, MineTelemetrySummary } from '../../types';
import { sensorService } from '../../services';
import { StatusBadge } from '../StatusBadge';
import {
  Activity,
  X,
  Radio,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Zap,
  Gauge,
  Wind,
  Flame,
  Thermometer,
  Layers3,
  ExternalLink
} from 'lucide-react';
import clsx from 'clsx';

interface MineTelemetryDrawerProps {
  mine: GisMineOverviewItemDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenDetailedGis: (mine: GisMineOverviewItemDTO) => void;
}

export const MineTelemetryDrawer: React.FC<MineTelemetryDrawerProps> = ({
  mine,
  isOpen,
  onClose,
  onOpenDetailedGis
}) => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [summary, setSummary] = useState<MineTelemetrySummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    if (!mine || !isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      sensorService.getSensors(mine.id),
      sensorService.getMineSummary(mine.id).catch(() => null)
    ])
      .then(([sensorsData, summaryData]) => {
        if (!isMounted) return;
        setSensors(sensorsData || []);
        setSummary(summaryData);
      })
      .catch((err) => {
        console.error('Failed to load telemetry inspection data:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mine?.id, isOpen]);

  if (!isOpen || !mine) return null;

  const filteredSensors = filterType === 'ALL'
    ? sensors
    : sensors.filter(s => s.status === filterType);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0D100F] border-l border-[#27302B] shadow-2xl h-full flex flex-col justify-between font-sans text-slate-100 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#1B211E] bg-[#0A0D0C]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {mine.code}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30">
                    LIVE TELEMETRY STREAM
                  </span>
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {mine.name} — Sensor Telemetry
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick status bar */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-[#1B211E] text-center text-xs">
            <div className="p-2 rounded bg-[#080A09] border border-[#1B211E]">
              <span className="text-[9.5px] text-slate-500 uppercase tracking-wide block">Total Nodes</span>
              <span className="font-mono font-bold text-slate-200 text-sm">{summary?.total_sensors ?? sensors.length}</span>
            </div>
            <div className="p-2 rounded bg-[#080A09] border border-[#1B211E]">
              <span className="text-[9.5px] text-emerald-500 uppercase tracking-wide block">Online</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{summary?.online_sensors ?? sensors.filter(s => s.status !== 'OFFLINE').length}</span>
            </div>
            <div className="p-2 rounded bg-[#080A09] border border-[#1B211E]">
              <span className="text-[9.5px] text-rose-500 uppercase tracking-wide block">Critical</span>
              <span className="font-mono font-bold text-rose-400 text-sm">{summary?.critical_sensors ?? sensors.filter(s => s.status === 'CRITICAL').length}</span>
            </div>
            <div className="p-2 rounded bg-[#080A09] border border-[#1B211E]">
              <span className="text-[9.5px] text-amber-500 uppercase tracking-wide block">Warning</span>
              <span className="font-mono font-bold text-amber-400 text-sm">{summary?.warning_sensors ?? sensors.filter(s => s.status === 'WARNING').length}</span>
            </div>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {/* Statutory Threshold Reference */}
          <div className="p-3.5 rounded-lg bg-[#080A09] border border-[#1B211E] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                DGMS Standard Thresholds
              </span>
              <span className="text-[10px] text-slate-500 font-mono">CMR 2017 Reg 153</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px] font-mono text-slate-300">
              <div className="p-1.5 rounded bg-[#111613] border border-[#1B211E]">
                <span className="text-slate-500 block">CH4 (Methane):</span>
                <span className="text-amber-400">&gt;0.75%</span> / <span className="text-rose-400">&gt;1.25%</span>
              </div>
              <div className="p-1.5 rounded bg-[#111613] border border-[#1B211E]">
                <span className="text-slate-500 block">CO Gas:</span>
                <span className="text-amber-400">&gt;25 ppm</span> / <span className="text-rose-400">&gt;50 ppm</span>
              </div>
              <div className="p-1.5 rounded bg-[#111613] border border-[#1B211E]">
                <span className="text-slate-500 block">Air Velocity:</span>
                <span className="text-rose-400">&lt;0.50 m/s</span>
              </div>
              <div className="p-1.5 rounded bg-[#111613] border border-[#1B211E]">
                <span className="text-slate-500 block">Coal Dust PM:</span>
                <span className="text-rose-400">&gt;3.0 mg/m³</span>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {(['ALL', 'CRITICAL', 'WARNING', 'NORMAL', 'OFFLINE'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={clsx(
                    'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                    filterType === tab
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-[#141A17] text-slate-400 hover:text-white hover:bg-[#1E2522]'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <span className="text-[10.5px] font-mono text-slate-500">
              {filteredSensors.length} Nodes
            </span>
          </div>

          {/* Sensors list */}
          {isLoading ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
              <p className="text-xs text-slate-500 font-mono">Loading telemetry stream...</p>
            </div>
          ) : filteredSensors.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-[#080A09] rounded-lg border border-[#1B211E]">
              No sensor nodes match the selected filter.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSensors.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] hover:border-[#27302B] transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 text-[11.5px]">
                        {s.sensor_code}
                      </span>
                      <span className="text-slate-200 font-semibold truncate">
                        {s.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-1">
                      <span>Type: <b className="text-slate-400">{s.sensor_type_code}</b></span>
                      <span>·</span>
                      <span>Zone: <b className="text-slate-400">{s.zone_name || 'Production Face'}</b></span>
                      <span>·</span>
                      <span className="font-mono text-slate-400">({s.x}, {s.y}, {s.z})</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={s.status} size="sm" />
                    <span className="text-[10px] font-mono text-slate-500">
                      Warn: {s.warning_threshold} {s.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#1B211E] bg-[#0A0D0C] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#141A17] hover:bg-[#1E2522] border border-[#27302B] text-slate-300 text-xs font-medium cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenDetailedGis(mine);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
          >
            <Layers3 className="w-4 h-4" />
            <span>Open in Detailed 2D GIS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
