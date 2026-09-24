import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { sensorService } from '../services';
import type { Sensor, SensorReading } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Activity,
  RefreshCw,
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
  Info,
  MapPin,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

export const SensorsPage: React.FC = () => {
  const { selectedMine, focusInDigitalTwin } = useMineContext();
  const { t } = useLanguage();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedSensorReadings, setSelectedSensorReadings] = useState<{ sensor: Sensor; readings: SensorReading[] } | null>(null);
  const [activeTechnicalSensor, setActiveTechnicalSensor] = useState<Sensor | null>(null);
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

  // Helper for human-readable sensor meaning & recommendation
  const getSensorInterpretation = (s: Sensor) => {
    const isCritical = s.status === 'CRITICAL';
    const isWarning = s.status === 'WARNING';
    const isOffline = s.status === 'OFFLINE';

    if (s.sensor_type_code === 'CH4') {
      if (isCritical) {
        return {
          meaning: 'Methane level exceeded the permitted critical safety limit (1.25%). Risk of explosive gas mixture in airway.',
          action: 'Inspect affected longwall face immediately, verify auxiliary ventilation fans, and restrict machinery operation.'
        };
      }
      if (isWarning) {
        return {
          meaning: 'Methane concentration approaching statutory caution threshold (0.75%).',
          action: 'Increase air circulation and monitor continuous trend.'
        };
      }
      if (isOffline) {
        return {
          meaning: 'Methane sensor has stopped transmitting telemetry heartbeat.',
          action: 'Dispatch field electrical technician to inspect power supply and wireless transceiver.'
        };
      }
      return {
        meaning: 'Methane levels well within statutory DGMS safe atmospheric limits.',
        action: 'Routine continuous monitoring active.'
      };
    }

    if (s.sensor_type_code === 'CO') {
      if (isCritical) {
        return {
          meaning: 'Carbon monoxide surge detected. Indicates potential spontaneous heating or combustion in strata.',
          action: 'Check sealing of old workings, deploy fire officers for thermographic verification.'
        };
      }
      if (isWarning) {
        return {
          meaning: 'CO reading slightly elevated above baseline threshold.',
          action: 'Check for auxiliary equipment exhaust accumulation and inspect intake airways.'
        };
      }
      return {
        meaning: 'Carbon monoxide concentration within safe limits.',
        action: 'Normal monitoring operating.'
      };
    }

    if (s.sensor_type_code === 'VEL') {
      if (isCritical || isWarning) {
        return {
          meaning: 'Airflow velocity has dropped below statutory minimum required for adequate ventilation.',
          action: 'Check main surface fan operating status and verify airway regulators are open.'
        };
      }
      return {
        meaning: 'Ventilation airflow velocity nominal and maintaining compliant gas dilution.',
        action: 'Normal operating status.'
      };
    }

    if (isCritical) {
      return {
        meaning: 'Sensor parameter reading has exceeded critical threshold limit.',
        action: 'Immediate field inspection and area review required.'
      };
    }
    if (isWarning) {
      return {
        meaning: 'Parameter is currently in caution state.',
        action: 'Review telemetry trends and schedule inspection.'
      };
    }
    if (isOffline) {
      return {
        meaning: 'Node is offline and not reporting live monitoring data.',
        action: 'Check physical node power and signal continuity.'
      };
    }

    return {
      meaning: 'Operating normally within designated safety thresholds.',
      action: 'Continuous monitoring active.'
    };
  };

  const criticalSensors = sensors.filter((s) => s.status === 'CRITICAL');
  const warningSensors = sensors.filter((s) => s.status === 'WARNING');
  const offlineSensors = sensors.filter((s) => s.status === 'OFFLINE');

  const summaryCards = [
    {
      label: criticalSensors.length > 0 ? 'CRITICAL ANOMALY' : warningSensors.length > 0 ? 'WARNING ANOMALY' : 'ATMOSPHERIC SAFETY',
      tone: criticalSensors.length > 0 ? 'rose' : warningSensors.length > 0 ? 'amber' : 'emerald',
      dotClass: criticalSensors.length > 0 ? 'bg-rose-500' : warningSensors.length > 0 ? 'bg-amber-400' : 'bg-emerald-400',
      title: criticalSensors.length > 0
        ? `${criticalSensors[0].name} (${criticalSensors[0].sensor_code})`
        : activeScenario !== 'NORMAL'
          ? `${scenarioInfo.title}`
          : 'All Environmental Sensors Normal',
      detail: criticalSensors.length > 0
        ? `exceeded critical threshold: ${criticalSensors[0].last_value} ${criticalSensors[0].unit} >= ${criticalSensors[0].critical_threshold} ${criticalSensors[0].unit}.`
        : activeScenario !== 'NORMAL'
          ? scenarioInfo.injectedValue
          : 'Operating normally within designated statutory limits.',
      meta: criticalSensors.length > 0
        ? `${criticalSensors[0].zone_name || 'East Longwall Face 102'} · ${lastScenarioTime || 'Just now'}`
        : 'Continuous monitoring active',
      action: {
        label: 'Triage',
        onClick: () => setStatusFilter(criticalSensors.length > 0 ? 'CRITICAL' : 'ALL')
      }
    },
    {
      label: 'TELEMETRY GAP',
      tone: offlineSensors.length > 0 ? 'amber' : 'emerald',
      dotClass: offlineSensors.length > 0 ? 'bg-amber-400' : 'bg-emerald-400',
      title: offlineSensors.length > 0
        ? `${offlineSensors[0].name} (${offlineSensors[0].sensor_code})`
        : '100% Telemetry Coverage',
      detail: offlineSensors.length > 0
        ? 'Sensor node silent: telemetry timeout > 180s without heartbeat.'
        : `All ${sensors.length} sensor nodes transmitting continuously.`,
      meta: offlineSensors.length > 0
        ? `${offlineSensors[0].zone_name || 'Seam Level Intake'} · ${lastScenarioTime || 'Just now'}`
        : 'Continuous telemetry logging',
      action: {
        label: 'Inspect Nodes',
        onClick: () => setStatusFilter(offlineSensors.length > 0 ? 'OFFLINE' : 'ALL')
      }
    },
    {
      label: 'COMPLIANCE ACTION',
      tone: 'amber',
      dotClass: 'bg-amber-400',
      title: 'Statutory Safety Compliance Audit',
      detail: 'Automated DGMS Reg 153 / Reg 169 statutory safety rule verification.',
      meta: 'Governed under CMR 2017 & DGMS Technical Guidelines',
      action: {
        label: 'View Remedial',
        onClick: () => setStatusFilter('ALL')
      }
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 font-sans text-slate-100"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1B211E] pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-sans">
              <Activity className="w-5 h-5 text-amber-400 shrink-0" />
              {t('liveMonitoring')} & {t('sensorsTelemetry')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-[#121614] text-cyan-400 border border-[#27302B] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {t('sourceAndEvidence')}: {t('demonstrationData')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Human-readable atmospheric safety monitoring with real-time statutory limit tracking and on-demand technical depth.
          </p>
        </div>

        {/* View Toggle & Status Filter */}
        <div className="flex items-center gap-3 flex-wrap font-sans">
          <div className="flex items-center bg-[#0D100F] border border-[#1B211E] rounded-lg p-1 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer font-semibold ${viewMode === 'cards' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              title="Human-Centric Card Summary View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer font-semibold ${viewMode === 'table' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              title="Command Matrix Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#0D100F] border border-[#1B211E] rounded-lg text-xs font-mono">
            {['ALL', 'ACTIVE', 'WARNING', 'CRITICAL', 'OFFLINE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Highlight Cards (Design matching user screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            onClick={card.action.onClick}
            className="rounded-xl border border-[#1B211E] bg-[#0D100F] hover:border-[#27302B] transition-colors p-5 flex flex-col justify-between h-full cursor-pointer group"
          >
            <div>
              {/* Category label + status dot */}
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider font-sans ${
                    card.tone === 'rose'
                      ? 'text-rose-400'
                      : card.tone === 'amber'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                  }`}
                >
                  {card.label}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${card.dotClass}`} />
              </div>

              {/* Title, Detail, Meta */}
              <h3 className="text-sm font-bold text-white leading-snug font-sans">
                {card.title}
              </h3>
              <p className="text-xs font-semibold text-slate-200 mt-1 leading-relaxed font-sans">
                {card.detail}
              </p>
              <p className="text-xs text-slate-400 mt-2 font-sans">
                {card.meta}
              </p>
            </div>

            {/* Divider + Footer Action */}
            <div className="border-t border-[#1B211E] mt-4 pt-3 flex items-center justify-between font-sans">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  card.action.onClick();
                }}
                className="text-amber-400 hover:text-amber-300 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{card.action.label}</span>
                <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Scenario Control Center */}
      <div className="p-5 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-sans">
              {t('scenarioControlsTitle')}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isSimulating && (
              <span className="flex items-center gap-1 text-[10.5px] font-mono text-amber-400 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Ingesting Telemetry...
              </span>
            )}
            <span className="text-[10px] font-mono text-cyan-400 bg-[#121614] px-2.5 py-1 rounded border border-[#27302B]">
              Data Mode: SIMULATED (MQTT Ingestion Ready)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 text-xs font-sans">
          <button
            onClick={() => handleTriggerScenario('NORMAL')}
            disabled={isSimulating}
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${activeScenario === 'NORMAL'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-bold'
                : 'bg-[#121614] hover:bg-[#171C19] border-[#1B211E] text-slate-400 hover:text-slate-200'
              }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[11.5px]">{t('normalBaseline')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('METHANE_SPIKE')}
            disabled={isSimulating}
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${activeScenario === 'METHANE_SPIKE'
                ? 'bg-rose-500/10 border-rose-500/50 text-rose-300 font-bold'
                : 'bg-[#121614] hover:bg-[#171C19] border-[#1B211E] text-slate-400 hover:text-slate-200'
              }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span className="text-[11.5px]">{t('methaneSpike')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('CO_SPIKE')}
            disabled={isSimulating}
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${activeScenario === 'CO_SPIKE'
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-[#121614] hover:bg-[#171C19] border-[#1B211E] text-slate-400 hover:text-slate-200'
              }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-[11.5px]">{t('coSurge')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('VENTILATION_DROP')}
            disabled={isSimulating}
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${activeScenario === 'VENTILATION_DROP'
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 font-bold'
                : 'bg-[#121614] hover:bg-[#171C19] border-[#1B211E] text-slate-400 hover:text-slate-200'
              }`}
          >
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className="text-[11.5px]">{t('ventilationDrop')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('SENSOR_OFFLINE')}
            disabled={isSimulating}
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${activeScenario === 'SENSOR_OFFLINE'
                ? 'bg-purple-500/10 border-purple-500/50 text-purple-300 font-bold'
                : 'bg-[#121614] hover:bg-[#171C19] border-[#1B211E] text-slate-400 hover:text-slate-200'
              }`}
          >
            <WifiOff className="w-4 h-4 text-purple-400" />
            <span className="text-[11.5px]">{t('sensorSilence')}</span>
          </button>

          <button
            onClick={() => handleTriggerScenario('MULTI_SENSOR_ANOMALY')}
            disabled={isSimulating}
            className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer ${activeScenario === 'MULTI_SENSOR_ANOMALY'
                ? 'bg-rose-500/15 border-rose-500/60 text-rose-300 font-bold'
                : 'bg-[#121614] hover:bg-[#171C19] border-[#1B211E] text-slate-400 hover:text-slate-200'
              }`}
          >
            <TrendingUp className="w-4 h-4 text-rose-400" />
            <span className="text-[11.5px]">{t('multiHazardSpike')}</span>
          </button>
        </div>

        {/* Dynamic Scenario Response Banner (Clean flat design with simple dividers) */}
        <div className="p-4 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1B211E] pb-2.5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-sans font-bold text-slate-200 text-xs uppercase tracking-wider">{t('scenarioImpactTitle')}:</span>
              <span className="font-sans text-xs text-amber-400 font-semibold">{scenarioInfo.title}</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={scenarioInfo.severity} size="sm" />
              {lastScenarioTime && (
                <span className="font-mono text-[10px] text-slate-500">Triggered: {lastScenarioTime}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 font-sans">
            <div>
              <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">
                Target Telemetry Channel
              </span>
              <p className="text-xs text-amber-300 font-semibold mt-1">{scenarioInfo.channel}</p>
              <p className="font-mono text-[11px] text-slate-400 mt-0.5">{scenarioInfo.injectedValue}</p>
            </div>
            <div className="md:border-l md:border-[#1B211E] md:pl-4">
              <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">
                Statutory Threshold Applied
              </span>
              <p className="text-xs text-rose-300 font-semibold mt-1">{scenarioInfo.threshold}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">CMR 2017 / DGMS Guidelines</p>
            </div>
            <div className="md:border-l md:border-[#1B211E] md:pl-4">
              <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">
                Automated Governance Action
              </span>
              <p className="text-xs text-cyan-300 font-semibold mt-1">{scenarioInfo.pipelineAction}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Presentation View */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sensors.map((s) => {
            const interp = getSensorInterpretation(s);
            const isCritical = s.status === 'CRITICAL';
            const isWarning = s.status === 'WARNING';
            const isOffline = s.status === 'OFFLINE';

            return (
              <div
                key={s.id}
                className="bg-[#0D100F] border border-[#1B211E] hover:border-[#27302B] rounded-xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200"
              >
                {/* 1. HEADER: Sensor Name, Code, Location & Operating Status */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1B211E]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-amber-400 tracking-wider uppercase">
                        {s.sensor_code}
                      </span>
                      <h3 className="font-sans text-base font-bold text-white tracking-tight">
                        {s.name}
                      </h3>
                    </div>
                    <p className="font-sans text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {s.zone_name || 'Working Zone'} • {s.level_name || 'Level 1'}
                    </p>
                  </div>
                  <StatusBadge status={s.status} size="sm" />
                </div>

                {/* 2. PRIMARY METRIC: Focal Point Display with Permitted Limits beside it */}
                <div className="flex items-baseline justify-between py-1">
                  <div>
                    <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
                      Current Telemetry
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className={`font-mono text-3xl font-black tracking-tight ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : isOffline ? 'text-purple-400' : 'text-emerald-400'
                        }`}>
                        {s.last_value !== undefined ? s.last_value : 'OFFLINE'}
                      </span>
                      {s.last_value !== undefined && (
                        <span className="font-mono text-sm font-semibold text-slate-400">{s.unit}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
                      Statutory Limits
                    </span>
                    <p className="font-mono text-xs text-slate-300">
                      Warn: <span className="text-amber-400 font-bold">{s.warning_threshold}</span> / Crit: <span className="text-rose-400 font-bold">{s.critical_threshold}</span> {s.unit}
                    </p>
                  </div>
                </div>

                {/* 3. SUPPORTING INFORMATION & RECOMMENDED ACTION (Clean typography - No nested boxes!) */}
                <div className="space-y-2.5 pt-3 border-t border-[#1B211E]">
                  <p className="font-sans text-xs text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-200">{t('whatItMeans')}: </span>
                    {interp.meaning}
                  </p>

                  <div className="pl-2.5 border-l-2 border-amber-500/70 text-xs py-0.5">
                    <p className="font-sans text-amber-200/95 leading-relaxed">
                      <span className="font-semibold text-amber-400">Recommended Action: </span>
                      {interp.action}
                    </p>
                  </div>
                </div>

                {/* 4. FOOTER ACTIONS */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1B211E] font-sans text-xs">
                  <button
                    onClick={() => setActiveTechnicalSensor(s)}
                    className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Details</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReadings(s)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#121614] hover:bg-[#171C19] border border-[#232A26] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                      title={t('viewReadingHistory')}
                    >
                      <History className="w-3.5 h-3.5 text-amber-400" />
                      <span>History</span>
                    </button>
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-semibold text-xs transition-all cursor-pointer shadow-xs"
                      title={t('centerInTwin')}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Focus in 3D</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Matrix Table View */
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-[#121614] border-b border-[#1B211E] text-slate-400 uppercase tracking-wider text-[10.5px] font-semibold">
                <th className="py-3.5 px-4">{t('sensorCode')}</th>
                <th className="py-3.5 px-4">{t('sensorNameType')}</th>
                <th className="py-3.5 px-4">{t('zoneLevel')}</th>
                <th className="py-3.5 px-4">{t('liveTelemetry')}</th>
                <th className="py-3.5 px-4">{t('thresholds')}</th>
                <th className="py-3.5 px-4">{t('coords3d')}</th>
                <th className="py-3.5 px-4">{t('status')}</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B211E]/60 text-slate-300">
              {sensors.map((s) => (
                <tr key={s.id} className="hover:bg-[#141A17] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">{s.sensor_code}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-white">{s.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">{s.sensor_type_code}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-200">{s.zone_name || 'Mine Zone'}</p>
                    <p className="text-[10.5px] text-slate-400">{s.level_name || 'Level'}</p>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className={`text-sm font-bold ${s.status === 'CRITICAL' ? 'text-rose-400' :
                        s.status === 'WARNING' ? 'text-amber-400' :
                          s.status === 'OFFLINE' ? 'text-purple-400' : 'text-emerald-400'
                      }`}>
                      {s.last_value !== undefined ? `${s.last_value} ${s.unit}` : 'OFFLINE'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                    <span className="text-amber-300">{s.warning_threshold}</span> / <span className="text-rose-400">{s.critical_threshold}</span> {s.unit}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[10.5px]">
                    ({s.x}, {s.y}, {s.z})
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={s.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 font-sans">
                      <button
                        onClick={() => setActiveTechnicalSensor(s)}
                        className="p-1.5 rounded bg-[#121614] hover:bg-[#1B211E] text-cyan-400 border border-[#27302B] transition-colors cursor-pointer"
                        title="View Technical Details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
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
                        className="p-1.5 rounded bg-[#121614] hover:bg-[#1B211E] text-slate-300 hover:text-white border border-[#27302B] transition-colors cursor-pointer"
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
      )}

      {/* Technical Details Modal */}
      {activeTechnicalSensor && (
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {activeTechnicalSensor.sensor_code}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {activeTechnicalSensor.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveTechnicalSensor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#121614] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Technical Specifications Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-1">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Sensor ID / Code</span>
                <p className="font-mono text-amber-400 font-bold">{activeTechnicalSensor.sensor_code}</p>
                <p className="font-mono text-[10px] text-slate-400">Type: {activeTechnicalSensor.sensor_type_code}</p>
              </div>

              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-1">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Operational Status</span>
                <StatusBadge status={activeTechnicalSensor.status} size="sm" showTechnical />
              </div>

              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-1">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Data Provenance</span>
                <span className="font-mono text-cyan-400 font-bold text-[11px]">SIMULATED (MQTT)</span>
                <p className="text-[10px] text-slate-400">Continuous Ingestion</p>
              </div>

              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-1">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Warning Threshold</span>
                <p className="font-mono text-amber-400 font-bold">{activeTechnicalSensor.warning_threshold} {activeTechnicalSensor.unit}</p>
                <p className="text-[10px] text-slate-400">DGMS Standard Enforced</p>
              </div>

              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-1">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Critical Threshold</span>
                <p className="font-mono text-rose-400 font-bold">{activeTechnicalSensor.critical_threshold} {activeTechnicalSensor.unit}</p>
                <p className="text-[10px] text-slate-400">Immediate Auto-Trigger</p>
              </div>

              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-1">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">3D Coordinates (X, Y, Z)</span>
                <p className="font-mono text-slate-200 font-bold">({activeTechnicalSensor.x}, {activeTechnicalSensor.y}, {activeTechnicalSensor.z})</p>
                <p className="text-[10px] text-slate-400">{activeTechnicalSensor.zone_name || 'Mine Zone'}</p>
              </div>
            </div>

            {/* Statutory Regulation Reference */}
            <div className="p-3.5 rounded-lg bg-[#080A09] border border-[#1B211E] text-xs space-y-1.5">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">Statutory Reference & Anomaly Context</span>
              <p className="text-slate-200 leading-relaxed font-sans">
                Governed under Coal Mines Regulations 2017 (CMR 2017 Reg 153 / Reg 169) and DGMS Technical Safety Circulars. Automatic threshold exceedance events trigger priority incident dispatch and spatial hot-spot mapping in the 3D Digital Twin.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B211E]">
              <button
                onClick={() => {
                  focusInDigitalTwin({
                    type: 'sensor',
                    id: activeTechnicalSensor.id,
                    x: activeTechnicalSensor.x,
                    y: activeTechnicalSensor.y,
                    z: activeTechnicalSensor.z,
                    title: `${activeTechnicalSensor.sensor_code}: ${activeTechnicalSensor.name}`
                  });
                  setActiveTechnicalSensor(null);
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Crosshair className="w-4 h-4" />
                <span>{t('focusIn3D')}</span>
              </button>
              <button
                onClick={() => setActiveTechnicalSensor(null)}
                className="px-4 py-2 rounded-lg bg-[#121614] hover:bg-[#1B211E] text-slate-300 border border-[#27302B] text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reading History Drawer */}
      {selectedSensorReadings && (
        <div className="fixed inset-0 bg-[#080A09]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#27302B] rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#1B211E] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {selectedSensorReadings.sensor.sensor_code}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedSensorReadings.sensor.name} — Reading History
                </h3>
              </div>
              <button
                onClick={() => setSelectedSensorReadings(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] flex items-center justify-between text-xs">
              <span>Thresholds: <b className="font-mono text-amber-300">{selectedSensorReadings.sensor.warning_threshold}</b> (Warn) / <b className="font-mono text-rose-400">{selectedSensorReadings.sensor.critical_threshold}</b> (Crit) {selectedSensorReadings.sensor.unit}</span>
              <StatusBadge status={selectedSensorReadings.sensor.status} size="sm" />
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 hide-scrollbar">
              {selectedSensorReadings.readings.map((r) => (
                <div key={r.id} className="p-2.5 rounded-lg bg-[#080A09] border border-[#1B211E] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-white text-sm">{r.value} {r.unit}</span>
                    <span className="text-[10.5px] text-slate-400 ml-2">Source: {r.source}</span>
                  </div>
                  <span className="font-mono text-[10.5px] text-slate-400">{new Date(r.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};