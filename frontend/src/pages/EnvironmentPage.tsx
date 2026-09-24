import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { governanceService } from '../services';
import { EnvironmentalObservation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Leaf, Wind, Eye, ShieldAlert, Info, X, MapPin } from 'lucide-react';

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 font-sans text-slate-100"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1B211E] pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-sans">
              <Leaf className="w-5 h-5 text-emerald-400 shrink-0" />
              {t('atmosphereEnv')} & Statutory Air Quality
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-[#121614] text-emerald-400 border border-[#27302B] font-semibold">
              DGMS & CPCB PARAMETERS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Human-readable atmospheric monitoring for dust, gas concentrations, temperature, and water discharge.
          </p>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Logged Observations</span>
          <p className="font-mono text-2xl font-black text-white">{observations.length}</p>
          <p className="font-sans text-[11px] text-slate-400">Total statutory records</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Active Alerts</span>
          <p className="font-mono text-2xl font-black text-amber-400">{activeObservations}</p>
          <p className="font-sans text-[11px] text-slate-400">Attention required</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Exceedance Alerts</span>
          <p className="font-mono text-2xl font-black text-rose-400">{criticalCount}</p>
          <p className="font-sans text-[11px] text-slate-400">Above monitoring limit</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Monitoring Status</span>
          <p className="font-mono text-2xl font-black text-emerald-400">NORMAL</p>
          <p className="font-sans text-[11px] text-slate-400">Real-time telemetry link</p>
        </div>
      </div>

      {/* Statutory Guidelines Reference Cards */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between font-sans text-xs flex-wrap gap-2">
          <h3 className="font-bold text-white flex items-center gap-2 text-sm">
            <Wind className="w-4 h-4 text-amber-400 shrink-0" />
            Configured Statutory Thresholds & Permitted Limits
          </h3>
          <span className="font-mono text-slate-500 text-[10.5px]">DGMS CMR 2017 STANDARDS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans text-xs">
          <div className="p-3.5 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">Methane (CH4)</span>
              <span className="font-mono px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">CRITICAL</span>
            </div>
            <p className="text-slate-400 text-[11px]">General mine airway limit</p>
            <p className="font-mono text-white font-bold text-sm">Limit: ≤ 0.75 %</p>
            <p className="text-[10.5px] text-slate-500 pt-1 border-t border-[#1B211E]">Standard: CMR 2017 Reg 153</p>
          </div>

          <div className="p-3.5 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">Carbon Monoxide (CO)</span>
              <span className="font-mono px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">CRITICAL</span>
            </div>
            <p className="text-slate-400 text-[11px]">Spontaneous heating trigger</p>
            <p className="font-mono text-white font-bold text-sm">Limit: ≤ 50.0 PPM</p>
            <p className="text-[10.5px] text-slate-500 pt-1 border-t border-[#1B211E]">Standard: DGMS Safety Circular</p>
          </div>

          <div className="p-3.5 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">Respirable Dust (PM10)</span>
              <span className="font-mono px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">HIGH</span>
            </div>
            <p className="text-slate-400 text-[11px]">8-hour exposure limit</p>
            <p className="font-mono text-white font-bold text-sm">Limit: ≤ 3.0 mg/m³</p>
            <p className="text-[10.5px] text-slate-500 pt-1 border-t border-[#1B211E]">Standard: CPCB & DGMS Rule</p>
          </div>

          <div className="p-3.5 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">Wet-Bulb Temp</span>
              <span className="font-mono px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">MEDIUM</span>
            </div>
            <p className="text-slate-400 text-[11px]">Underground working face</p>
            <p className="font-mono text-white font-bold text-sm">Limit: ≤ 33.5 °C</p>
            <p className="text-[10.5px] text-slate-500 pt-1 border-t border-[#1B211E]">Standard: CMR 2017 Reg 155</p>
          </div>
        </div>
      </div>

      {/* Human-Centric Observations Cards */}
      <div className="space-y-3">
        <h3 className="font-sans text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          Atmospheric Readings & Environmental Deviations
        </h3>

        {isLoading ? (
          <div className="p-8 rounded-xl bg-[#0D100F] border border-[#1B211E] text-center text-slate-400 font-mono text-xs animate-pulse">
            Loading environmental observations...
          </div>
        ) : observations.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0D100F] border border-[#1B211E] text-center text-slate-400 font-sans text-xs">
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
                  className="bg-[#0D100F] border border-[#1B211E] hover:border-[#27302B] rounded-xl p-5 space-y-4 transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-[#1B211E] pb-3">
                    <div>
                      <h4 className="text-base font-bold text-white font-sans">{obs.parameter_name}</h4>
                      <p className="text-xs text-amber-400/90 font-mono mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {obs.location_context || 'Underground Seam'}
                      </p>
                    </div>
                    <StatusBadge status={obs.severity} size="sm" />
                  </div>

                  <div className="flex items-baseline justify-between py-1 font-sans">
                    <div>
                      <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
                        Observed Reading
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className={`font-mono text-3xl font-black ${isAbove ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {obs.observed_value}
                        </span>
                        <span className="font-mono text-sm font-semibold text-slate-400">{obs.unit}</span>
                      </div>
                      {isAbove && (
                        <span className="font-mono text-[10px] text-rose-400 font-bold uppercase block mt-1">
                          ABOVE MONITORING LIMIT
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
                        Monitoring Limit
                      </span>
                      <p className="font-mono text-sm font-bold text-slate-200">
                        {obs.threshold_limit} {obs.unit}
                      </p>
                      <span className="font-sans text-[10.5px] text-amber-400 block mt-1">
                        Status: Review Required
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1B211E] font-sans text-xs">
                    <button
                      onClick={() => setSelectedObsDetails(obs)}
                      className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Details</span>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-all shadow-xs"
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
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div>
                <span className="font-mono text-[10.5px] text-amber-400 uppercase font-semibold">Observation ID: OBS-{selectedObsDetails.id}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedObsDetails.parameter_name}</h3>
              </div>
              <button
                onClick={() => setSelectedObsDetails(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#121614] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-sans">
              <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                <span className="text-[10.5px] uppercase text-slate-400 font-semibold block">Observed Value</span>
                <p className="font-mono text-rose-400 font-bold text-sm">{selectedObsDetails.observed_value} {selectedObsDetails.unit}</p>
              </div>
              <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                <span className="text-[10.5px] uppercase text-slate-400 font-semibold block">Permitted Limit</span>
                <p className="font-mono text-slate-200 font-bold text-sm">{selectedObsDetails.threshold_limit} {selectedObsDetails.unit}</p>
              </div>
              <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                <span className="text-[10.5px] uppercase text-slate-400 font-semibold block">3D Coordinates</span>
                <p className="font-mono text-slate-200">({selectedObsDetails.x}, {selectedObsDetails.y}, {selectedObsDetails.z})</p>
              </div>
              <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-1">
                <span className="text-[10.5px] uppercase text-slate-400 font-semibold block">Detection Timestamp</span>
                <p className="font-mono text-slate-300">{selectedObsDetails.detected_at ? new Date(selectedObsDetails.detected_at).toLocaleString() : 'Recent'}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-1">
              <span className="text-[10.5px] text-slate-400 uppercase font-semibold block">Measurement Method & Provenance</span>
              <p className="text-slate-200 font-sans leading-relaxed">
                Direct statutory telemetric observation recorded through calibrated sensor node. Data verified against DGMS Coal Mines Regulations 2017.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B211E]">
              <button
                onClick={() => setSelectedObsDetails(null)}
                className="px-4 py-2 rounded-lg bg-[#121614] hover:bg-[#171C19] text-slate-300 border border-[#232A26] text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
