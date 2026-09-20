import React, { useEffect, useState } from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { sensorService } from '../services';
import type { Sensor, SensorReading } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Activity, 
  RefreshCw, 
  Radio, 
  Flame, 
  Wind, 
  WifiOff, 
  TrendingUp, 
  History, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Crosshair,
  Zap,
  ShieldAlert,
  Gauge
} from 'lucide-react';

export const SensorsPage: React.FC = () => {
  const { selectedMine, focusInDigitalTwin } = useMineContext();
  const { t } = useLanguage();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedSensorReadings, setSelectedSensorReadings] = useState<{ sensor: Sensor; readings: SensorReading[] } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string>('NORMAL');
  const [lastScenarioTime, setLastScenarioTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSensors = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const data = await sensorService.getSensors(
        selectedMine.id,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setSensors(data);
    } catch (err) {
      console.error('Failed to load sensors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, [selectedMine?.id, statusFilter]);

  const handleTriggerScenario = async (scenario: string) => {
    if (!selectedMine) return;
    setIsSimulating(true);
    setActiveScenario(scenario);
    try {
      await sensorService.simulateScenario(selectedMine.id, scenario);
      setLastScenarioTime(new Date().toLocaleTimeString());
      await fetchSensors();
    } catch (err) {
      console.error('Scenario simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleOpenReadings = async (sensor: Sensor) => {
    try {
      const readings = await sensorService.getSensorReadings(sensor.id, 20);
      setSelectedSensorReadings({ sensor, readings });
    } catch (err) {
      console.error('Failed to load sensor readings:', err);
    }
  };

  const getScenarioDetails = () => {
    switch (activeScenario) {
      case 'METHANE_SPIKE':
        return {
          title: t('methaneSpike'),
          severity: 'CRITICAL',
          channel: 'CH4 Methane Concentration',
          injectedValue: '2.45% CH4 (Return Airway Node)',
          threshold: '1.25% (DGMS Reg 169 Critical)',
          pipelineAction: 'Auto-Triggered Priority 1 Safety Incident & 3D Spatial Twin Red Hotspot',
          statusColor: 'rose'
        };
      case 'CO_SPIKE':
        return {
          title: t('coSurge'),
          severity: 'WARNING',
          channel: 'CO Carbon Monoxide Level',
          injectedValue: '58.0 PPM (Seam Level Intake)',
          threshold: '50.0 PPM (DGMS Warning Limit)',
          pipelineAction: 'Dispatched Gas Warning Alert & Automated Ventilation Fan Recalibration Notice',
          statusColor: 'amber'
        };
      case 'VENTILATION_DROP':
        return {
          title: t('ventilationDrop'),
          severity: 'WARNING',
          channel: 'Air Velocity Sensor (VEL)',
          injectedValue: '0.18 m/s (Main Trunk Airway)',
          threshold: '< 0.50 m/s (DGMS Minimum Ventilation)',
          pipelineAction: 'Dispatched Ventilation Failure Alert & Substation Telemetry Verification',
          statusColor: 'cyan'
        };
      case 'SENSOR_OFFLINE':
        return {
          title: t('sensorSilence'),
          severity: 'OFFLINE',
          channel: 'Telemetry Heartbeat Protocol',
          injectedValue: '0 Packets / 180s Silence Timeout',
          threshold: 'Silence Threshold Exceeded (> 120s)',
          pipelineAction: 'Marked Node Status as OFFLINE & Dispatched Maintenance Field Task',
          statusColor: 'purple'
        };
      case 'MULTI_SENSOR_ANOMALY':
        return {
          title: t('multiHazardSpike'),
          severity: 'CRITICAL',
          channel: 'CH4 + CO + Strata Vibration Multi-Channel',
          injectedValue: 'CH4: 2.85%, CO: 65 PPM, Vib: 4.2 mm/s',
          threshold: 'Compound Multi-Hazard Threshold Exceeded',
          pipelineAction: 'Generated Compound Critical Emergency & Evacuation Advisory',
          statusColor: 'rose'
        };
      default:
        return {
          title: t('normalBaseline'),
          severity: 'NORMAL',
          channel: 'All Environmental Channels',
          injectedValue: 'CH4: 0.12%, CO: 4.5 PPM, Vel: 1.85 m/s, Dust: 1.4 mg/m³',
          threshold: 'All Parameters within Normal DGMS Envelope',
          pipelineAction: 'Normal Steady-State Telemetry Continuous Logging',
          statusColor: 'emerald'
        };
    }
  };

  const scenarioInfo = getScenarioDetails();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{t('sensorTelemetryNodes')}</h2>
          <p className="text-xs text-slate-400 mt-1">
            {t('sensorTelemetrySubtitle')}
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
          {['ALL', 'ACTIVE', 'WARNING', 'CRITICAL', 'OFFLINE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded transition-colors ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Deterministic Simulation Scenario Control Center */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              {t('scenarioControlsTitle')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isSimulating && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Ingesting Telemetry...
              </span>
            )}
            <span className="text-[10px] font-mono text-cyan-400">Source: SIMULATED (MQTT Ingestion Ready)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 font-mono text-xs">
          <button
            onClick={() => handleTriggerScenario('NORMAL')}
            disabled={isSimulating}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
              activeScenario === 'NORMAL'
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-bold shadow-lg shadow-emerald-900/20'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px]">{t('normalBaseline')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('METHANE_SPIKE')}
            disabled={isSimulating}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
              activeScenario === 'METHANE_SPIKE'
                ? 'bg-rose-950/80 border-rose-600 text-rose-300 font-bold shadow-lg shadow-rose-900/20'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span className="text-[11px]">{t('methaneSpike')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('CO_SPIKE')}
            disabled={isSimulating}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
              activeScenario === 'CO_SPIKE'
                ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-bold shadow-lg shadow-amber-900/20'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-[11px]">{t('coSurge')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('VENTILATION_DROP')}
            disabled={isSimulating}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
              activeScenario === 'VENTILATION_DROP'
                ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300 font-bold shadow-lg shadow-cyan-900/20'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px]">{t('ventilationDrop')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('SENSOR_OFFLINE')}
            disabled={isSimulating}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
              activeScenario === 'SENSOR_OFFLINE'
                ? 'bg-purple-950/80 border-purple-600 text-purple-300 font-bold shadow-lg shadow-purple-900/20'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <WifiOff className="w-4 h-4 text-purple-400" />
            <span className="text-[11px]">{t('sensorSilence')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('MULTI_SENSOR_ANOMALY')}
            disabled={isSimulating}
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
              activeScenario === 'MULTI_SENSOR_ANOMALY'
                ? 'bg-rose-950/80 border-rose-600 text-rose-300 font-bold shadow-lg shadow-rose-900/20'
                : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-rose-400" />
            <span className="text-[11px]">{t('multiHazardSpike')}</span>
          </button>
        </div>

        {/* Dynamic Scenario Impact Panel */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs font-mono space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200 uppercase tracking-wider">{t('scenarioImpactTitle')}:</span>
              <span className="text-amber-400 font-semibold">{scenarioInfo.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                scenarioInfo.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                scenarioInfo.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                scenarioInfo.severity === 'OFFLINE' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {scenarioInfo.severity}
              </span>
              {lastScenarioTime && (
                <span className="text-[10px] text-slate-400">Triggered: {lastScenarioTime}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Telemetry Channel</span>
              <span className="text-slate-200 font-semibold">{scenarioInfo.channel}</span>
              <span className="text-[11px] text-amber-400/90 block">{scenarioInfo.injectedValue}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Statutory Threshold Evaluation</span>
              <span className="text-slate-300">{scenarioInfo.threshold}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Safety Pipeline Action</span>
              <span className="text-emerald-400 font-medium">{scenarioInfo.pipelineAction}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-4 font-semibold">{t('sensorCode')}</th>
              <th className="py-3.5 px-4 font-semibold">{t('sensorNameType')}</th>
              <th className="py-3.5 px-4 font-semibold">{t('zoneLevel')}</th>
              <th className="py-3.5 px-4 font-semibold">{t('liveTelemetry')}</th>
              <th className="py-3.5 px-4 font-semibold">{t('thresholds')}</th>
              <th className="py-3.5 px-4 font-semibold">{t('coords3d')}</th>
              <th className="py-3.5 px-4 font-semibold">{t('status')}</th>
              <th className="py-3.5 px-4 font-semibold">{t('history')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {sensors.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-bold text-amber-400">{s.sensor_code}</td>
                <td className="py-3 px-4">
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="text-[10px] text-slate-500">{s.sensor_type_code}</p>
                </td>
                <td className="py-3 px-4">
                  <p className="text-slate-200">{s.zone_name || 'Mine Zone'}</p>
                  <p className="text-[10px] text-slate-500">{s.level_name || 'Level'}</p>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-sm font-bold ${
                    s.status === 'CRITICAL' ? 'text-rose-400' :
                    s.status === 'WARNING' ? 'text-amber-400' :
                    s.status === 'OFFLINE' ? 'text-purple-400' : 'text-emerald-400'
                  }`}>
                    {s.last_value !== undefined ? `${s.last_value} ${s.unit}` : 'OFFLINE'}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">
                  <span className="text-amber-300">{s.warning_threshold}</span> / <span className="text-rose-400">{s.critical_threshold}</span> {s.unit}
                </td>
                <td className="py-3 px-4 text-slate-500 text-[10px]">
                  ({s.x}, {s.y}, {s.z})
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={s.status} size="sm" />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        focusInDigitalTwin({
                          type: 'sensor',
                          id: s.id,
                          x: s.x,
                          y: s.y,
                          z: s.z,
                          title: `${s.sensor_code}: ${s.name}`
                        })
                      }
                      className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/30 cursor-pointer"
                      title={t('centerInTwin')}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenReadings(s)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title={t('viewReadingHistory')}
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reading History Drawer */}
      {selectedSensorReadings && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {selectedSensorReadings.sensor.sensor_code}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedSensorReadings.sensor.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSensorReadings(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span>Thresholds: <b className="text-amber-300">{selectedSensorReadings.sensor.warning_threshold}</b> (Warn) / <b className="text-rose-400">{selectedSensorReadings.sensor.critical_threshold}</b> (Crit) {selectedSensorReadings.sensor.unit}</span>
              <StatusBadge status={selectedSensorReadings.sensor.status} size="sm" />
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {selectedSensorReadings.readings.map((r) => (
                <div key={r.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">{r.value} {r.unit}</span>
                    <span className="text-[10px] text-slate-500 ml-2">Source: {r.source}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(r.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
