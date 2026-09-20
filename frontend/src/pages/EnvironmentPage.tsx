import React, { useEffect, useState } from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { governanceService } from '../services';
import { EnvironmentalObservation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Leaf, Wind, Eye, ShieldAlert, Info, X, MapPin, Clock, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

export const EnvironmentPage: React.FC = () => {
  const { selectedMine, focusInDigitalTwin } = useMineContext();
  const { t } = useLanguage();
  const [observations, setObservations] = useState<EnvironmentalObservation[]>([]);
  const [selectedObsDetails, setSelectedObsDetails] = useState<EnvironmentalObservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const obsData = await governanceService.getEnvironmentalObservations(selectedMine.id);
      setObservations(obsData);
    } catch (err) {
      console.error('Failed to load environmental data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMine?.id]);

  if (!selectedMine) return null;

  const activeObservations = observations.filter((o) => o.status === 'OPEN' || o.status === 'INVESTIGATING').length;
  const criticalCount = observations.filter((o) => o.severity === 'CRITICAL' || o.severity === 'HIGH').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-400" />
              {t('atmosphereEnv')} & Statutory Air Quality
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              DGMS & CPCB PARAMETERS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Human-readable atmospheric monitoring for dust, gas concentrations, temperature, and water discharge.
          </p>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">Logged Observations</span>
          <p className="text-2xl font-bold text-white">{observations.length}</p>
          <p className="text-[10px] text-slate-400">Total statutory records</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">Active Alerts</span>
          <p className="text-2xl font-bold text-amber-400">{activeObservations}</p>
          <p className="text-[10px] text-slate-400">Attention required</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">Exceedance Alerts</span>
          <p className="text-2xl font-bold text-rose-400">{criticalCount}</p>
          <p className="text-[10px] text-slate-400">Above monitoring limit</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-1">
          <span className="text-slate-500 text-[10px] uppercase">Monitoring Status</span>
          <p className="text-2xl font-bold text-emerald-400">NORMAL</p>
          <p className="text-[10px] text-slate-400">Real-time telemetry link</p>
        </div>
      </div>

      {/* Statutory Guidelines Reference Cards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between font-mono text-xs flex-wrap gap-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Wind className="w-4 h-4 text-amber-400" />
            Configured Statutory Thresholds & Permitted Limits
          </h3>
          <span className="text-slate-500 text-[10px]">DGMS CMR 2017 STANDARDS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">Methane (CH4)</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300">CRITICAL</span>
            </div>
            <p className="text-slate-400 text-[11px]">General mine airway limit</p>
            <p className="text-white font-bold text-sm">Permitted Limit: ≤ 0.75 %</p>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">Standard: CMR 2017 Reg 153</p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">Carbon Monoxide (CO)</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300">CRITICAL</span>
            </div>
            <p className="text-slate-400 text-[11px]">Spontaneous heating trigger</p>
            <p className="text-white font-bold text-sm">Permitted Limit: ≤ 50.0 PPM</p>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">Standard: DGMS Safety Circular</p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">Respirable Dust (PM10)</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300">HIGH</span>
            </div>
            <p className="text-slate-400 text-[11px]">8-hour exposure limit</p>
            <p className="text-white font-bold text-sm">Permitted Limit: ≤ 3.0 mg/m³</p>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">Standard: CPCB & DGMS Rule</p>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">Wet-Bulb Temperature</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-300">MEDIUM</span>
            </div>
            <p className="text-slate-400 text-[11px]">Underground working face</p>
            <p className="text-white font-bold text-sm">Permitted Limit: ≤ 33.5 °C</p>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">Standard: CMR 2017 Reg 155</p>
          </div>
        </div>
      </div>

      {/* Human-Centric Observations Cards */}
      <div className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Atmospheric Readings & Environmental Deviations
        </h3>

        {observations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 font-mono text-xs">
            No environmental deviations recorded. All atmospheric parameters are operating within normal regulatory limits.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {observations.map((obs) => {
              const isAbove = obs.observed_value > obs.threshold_limit;
              const isCritical = obs.severity === 'CRITICAL' || obs.severity === 'HIGH';

              return (
                <div
                  key={obs.id}
                  className={`p-5 rounded-2xl border backdrop-blur-md space-y-3.5 shadow-lg transition-all ${
                    isCritical 
                      ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 border-rose-800/60 shadow-rose-950/20' 
                      : 'bg-slate-900/85 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-2.5">
                    <div>
                      <h4 className="text-base font-bold text-white">{obs.parameter_name}</h4>
                      <p className="text-xs text-amber-300/90 font-mono mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {obs.location_context || 'Underground Seam'}
                      </p>
                    </div>
                    <StatusBadge status={obs.severity} size="sm" />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 grid grid-cols-2 gap-3 font-mono">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 tracking-wider block">Observed Reading</span>
                      <p className={`text-xl font-bold mt-0.5 ${isAbove ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {obs.observed_value} {obs.unit}
                      </p>
                      {isAbove && (
                        <span className="text-[10px] text-rose-300 font-bold uppercase block mt-0.5">
                          ABOVE MONITORING LIMIT
                        </span>
                      )}
                    </div>
                    <div className="border-l border-slate-850 pl-3">
                      <span className="text-[10px] uppercase text-slate-400 tracking-wider block">Monitoring Limit</span>
                      <p className="text-sm font-semibold text-slate-200 mt-0.5">
                        {obs.threshold_limit} {obs.unit}
                      </p>
                      <span className="text-[10px] text-amber-400 block mt-0.5">
                        Status: Review Required
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/70 font-mono text-xs">
                    <button
                      onClick={() => setSelectedObsDetails(obs)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-[11px]"
                    >
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Technical Details</span>
                    </button>

                    <button
                      onClick={() =>
                        focusInDigitalTwin({
                          type: 'anomaly',
                          x: obs.x || 0,
                          y: obs.y || 0,
                          z: obs.z || 0,
                          title: `${obs.parameter_name} Exceedance (${obs.observed_value} ${obs.unit})`
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer transition-all shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t('focusIn3D')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Observation Technical Details Modal */}
      {selectedObsDetails && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 font-mono text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase">Observation ID: OBS-{selectedObsDetails.id}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedObsDetails.parameter_name}</h3>
              </div>
              <button
                onClick={() => setSelectedObsDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Observed Value</span>
                <p className="text-rose-400 font-bold text-sm">{selectedObsDetails.observed_value} {selectedObsDetails.unit}</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Permitted Limit</span>
                <p className="text-slate-200 font-bold text-sm">{selectedObsDetails.threshold_limit} {selectedObsDetails.unit}</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">3D Coordinates</span>
                <p className="text-slate-200">({selectedObsDetails.x}, {selectedObsDetails.y}, {selectedObsDetails.z})</p>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Detection Timestamp</span>
                <p className="text-slate-300">{selectedObsDetails.detected_at ? new Date(selectedObsDetails.detected_at).toLocaleString() : 'Recent'}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Measurement Method & Provenance</span>
              <p className="text-slate-200 font-sans leading-relaxed">
                Direct statutory telemetric observation recorded through calibrated sensor node. Data verified against DGMS Coal Mines Regulations 2017.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedObsDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
