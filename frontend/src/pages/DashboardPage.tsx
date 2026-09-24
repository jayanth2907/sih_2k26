import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, animate, useReducedMotion, useInView } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { NumberTicker } from '../components/ui/number-ticker';
import {
  sensorService,
  incidentService,
  riskService,
  predictiveRiskService,
  mobileService,
  governanceService
} from '../services';
import {
  Sensor,
  Incident,
  Violation,
  RiskScore,
  AnomalyEvent,
  PredictiveRiskSummary,
  FieldInspection,
  GovernanceTask
} from '../types';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  FileText,
  RefreshCw,
  Layers,
  BrainCircuit,
  ArrowRight,
  ClipboardCheck,
  Compass,
  Bot,
  Cpu,
  AlertOctagon,
  CheckCircle2,
  Check,
  MapPin,
  Box
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Local presentation helpers (visual-only — no data/logic here)
// ---------------------------------------------------------------------------

type Tone = 'rose' | 'amber' | 'sky' | 'emerald' | 'slate';

const TONE_TEXT: Record<Tone, string> = {
  rose: 'text-rose-400',
  amber: 'text-amber-400',
  sky: 'text-sky-400',
  emerald: 'text-emerald-400',
  slate: 'text-slate-300'
};

const TONE_DOT: Record<Tone, string> = {
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-500'
};

const SEVERITY_PILL: Record<string, string> = {
  CRITICAL: 'pill-critical',
  HIGH: 'pill-high',
  WARNING: 'pill-medium',
  MEDIUM: 'pill-medium',
  ACTIVE: 'pill-low',
  LOW: 'pill-low',
  OFFLINE: 'pill-info',
  INFO: 'pill-info'
};

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-rose-500',
  HIGH: 'bg-orange-500',
  WARNING: 'bg-amber-500',
  MEDIUM: 'bg-amber-500',
  ACTIVE: 'bg-emerald-500',
  LOW: 'bg-emerald-500',
  OFFLINE: 'bg-slate-500',
  INFO: 'bg-sky-500'
};

const SEVERITY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-rose-500/10 border-rose-500/25', text: 'text-rose-400', dot: 'bg-rose-400' },
  HIGH: { bg: 'bg-orange-500/10 border-orange-500/25', text: 'text-orange-400', dot: 'bg-orange-400' },
  WARNING: { bg: 'bg-amber-500/10 border-amber-500/25', text: 'text-amber-400', dot: 'bg-amber-400' },
  MEDIUM: { bg: 'bg-amber-500/10 border-amber-500/25', text: 'text-amber-400', dot: 'bg-amber-400' },
  ACTIVE: { bg: 'bg-emerald-500/10 border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  LOW: { bg: 'bg-emerald-500/10 border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  OFFLINE: { bg: 'bg-slate-500/10 border-slate-500/25', text: 'text-slate-400', dot: 'bg-slate-400' },
  INFO: { bg: 'bg-sky-500/10 border-sky-500/25', text: 'text-sky-400', dot: 'bg-sky-400' }
};

const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
  const key = (status || 'OFFLINE').toUpperCase();
  const style = SEVERITY_STYLE[key] || SEVERITY_STYLE.OFFLINE;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10.5px] font-mono font-medium tracking-wide uppercase',
        style.bg,
        style.text
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
      {(status || 'Unknown').replace(/_/g, ' ')}
    </span>
  );
};

const tableContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05
    }
  }
};

const tableRowVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
};

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('animate-pulse bg-[#1D2520] rounded-xs', className)} />
);

// ---------------------------------------------------------------------------
// Compact 100-Dot Animated Risk Gauge (No Box / Container)
// ---------------------------------------------------------------------------
const DottedRiskGauge: React.FC<{ score: number; severity?: string; loading?: boolean }> = ({
  score,
  severity,
  loading
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });

  const totalDots = 100;
  const targetScore = loading ? 0 : Math.min(totalDots, Math.max(0, Math.round(score)));

  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const prevScoreRef = useRef<number>(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (loading || !isInView) {
      if (loading) {
        setAnimatedScore(0);
        prevScoreRef.current = 0;
      }
      return;
    }

    if (prefersReducedMotion) {
      setAnimatedScore(targetScore);
      prevScoreRef.current = targetScore;
      return;
    }

    const fromVal = prevScoreRef.current;
    const toVal = targetScore;

    if (fromVal === toVal && fromVal !== 0) {
      setAnimatedScore(toVal);
      return;
    }

    // Dynamic duration based on delta (min 0.6s, max 1.2s)
    const duration = Math.min(1.2, Math.max(0.6, (Math.abs(toVal - fromVal) / 100) * 1.2));

    const controls = animate(fromVal, toVal, {
      duration,
      ease: [0.16, 1, 0.3, 1], // Deliberate smooth ease-out
      onUpdate: (latest) => {
        setAnimatedScore(Math.round(latest));
      },
      onComplete: () => {
        prevScoreRef.current = toVal;
      }
    });

    return () => controls.stop();
  }, [targetScore, loading, isInView, prefersReducedMotion]);

  const activeColor =
    severity === 'CRITICAL'
      ? '#F43F5E'
      : severity === 'HIGH'
        ? '#F59E0B'
        : severity === 'MEDIUM'
          ? '#38BDF8'
          : '#10B981';

  const inactiveColor = '#1F2722';

  // 240-degree arc: start 150deg, end 390deg (bottom-open arc)
  const cx = 75;
  const cy = 75;
  const radius = 58;
  const startAngle = 150;
  const endAngle = 390;
  const sweepAngle = endAngle - startAngle;

  const dots = Array.from({ length: totalDots }).map((_, i) => {
    const angleDeg = startAngle + (i / (totalDots - 1)) * sweepAngle;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = cx + radius * Math.cos(angleRad);
    const y = cy + radius * Math.sin(angleRad);
    const isActive = i < animatedScore;
    return { x, y, isActive, index: i };
  });

  return (
    <div ref={containerRef} className="relative w-32 h-32 flex items-center justify-center select-none my-1">
      <svg viewBox="0 0 150 150" className="w-full h-full">
        {dots.map((dot) => (
          <circle
            key={dot.index}
            cx={dot.x}
            cy={dot.y}
            r={dot.isActive ? 1.25 : 0.85}
            fill={dot.isActive ? activeColor : inactiveColor}
            className={clsx(
              'transition-all duration-200 ease-out',
              loading && 'animate-pulse opacity-40'
            )}
          />
        ))}
      </svg>
      {/* Centered Score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
        {loading ? (
          <div className="flex flex-col items-center">
            <Skeleton className="h-6 w-10 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center leading-none"
          >
            <span
              className={clsx(
                'text-2xl font-bold font-mono tracking-tight transition-colors duration-300',
                severity === 'CRITICAL'
                  ? 'text-rose-400'
                  : severity === 'HIGH'
                    ? 'text-amber-400'
                    : severity === 'MEDIUM'
                      ? 'text-sky-400'
                      : 'text-emerald-400'
              )}
            >
              {animatedScore}
            </span>
            <span className="text-[9.5px] text-slate-500 font-mono font-medium mt-0.5">/ 100</span>
            {severity && (
              <span
                className={clsx(
                  'mt-1 px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase tracking-wider transition-colors duration-300',
                  severity === 'CRITICAL'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : severity === 'HIGH'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : severity === 'MEDIUM'
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                )}
              >
                {severity}
              </span>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 21st.dev Gravitate 3D Tilt Card Component for Operational Alerts
// ---------------------------------------------------------------------------
const AttentionTiltCard: React.FC<{
  row: {
    tone: Tone;
    label: string;
    title: string;
    meta: string;
    action: { label: string; onClick: () => void } | null;
  };
  idx: number;
}> = ({ row, idx }) => {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const mouseX = useSpring(x, { damping: 25, stiffness: 220 });
  const mouseY = useSpring(y, { damping: 25, stiffness: 220 });

  // Restrained 3.5-degree tilt angle
  const rotateX = useTransform(mouseY, [0, 1], [3.5, -3.5]);
  const rotateY = useTransform(mouseX, [0, 1], [-3.5, 3.5]);

  // Spotlight gradient coordinates
  const spotlightX = useTransform(mouseX, [0, 1], [0, 100]);
  const spotlightY = useTransform(mouseY, [0, 1], [0, 100]);

  const spotlightBg = useMotionTemplate`radial-gradient(320px circle at ${spotlightX}% ${spotlightY}%, rgba(255, 255, 255, 0.05), transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  const handleCardClick = () => {
    if (row.action?.onClick) {
      row.action.onClick();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleCardClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.08 }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      className={clsx(
        'relative text-left p-4 rounded-lg bg-[#0D100F] border border-[#1B211E] transition-colors cursor-pointer flex flex-col justify-between h-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 select-none',
        row.tone === 'rose'
          ? 'hover:border-rose-500/40 hover:bg-[#121011]'
          : row.tone === 'amber'
            ? 'hover:border-amber-500/40 hover:bg-[#121210]'
            : 'hover:border-emerald-500/30 hover:bg-[#101211]'
      )}
      aria-label={`${row.label}: ${row.title}`}
    >
      {/* Dynamic Spotlight Glow Overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: spotlightBg }}
      />

      {/* Card Content */}
      <div className="relative z-10 flex flex-col gap-2.5 w-full">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <span className={clsx('text-[11px] font-semibold tracking-wide uppercase', TONE_TEXT[row.tone])}>
            {row.label}
          </span>

          {row.tone === 'emerald' ? (
            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.35, type: 'spring', stiffness: 280, damping: 18, delay: idx * 0.08 }}
              className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[#080A09] font-bold shadow-xs shadow-emerald-500/40 shrink-0"
              title="Status clear"
            >
              <Check className="w-3.5 h-3.5 stroke-[3] text-[#080A09]" />
            </motion.div>
          ) : (
            <span className={clsx('w-2 h-2 rounded-full animate-pulse', TONE_DOT[row.tone])} />
          )}
        </div>

        {/* Title & Meta */}
        <div>
          <p className="text-[13px] font-medium text-slate-100 leading-snug group-hover:text-white transition-colors">
            {row.title}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{row.meta}</p>
        </div>
      </div>

      {/* Bottom Visual Action Cue */}
      <div className="relative z-10 pt-3 mt-2 flex items-center justify-between border-t border-[#1B211E]/60 text-[11px] font-medium">
        {row.action ? (
          <span className="text-amber-400 group-hover:text-amber-300 transition-colors flex items-center gap-1">
            {row.action.label}
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </span>
        ) : (
          <span className="text-emerald-400/80 text-[10.5px]">All systems optimal</span>
        )}
      </div>
    </motion.button>
  );
};

export const DashboardPage: React.FC = () => {
  const { selectedMine, setCurrentTab, focusInDigitalTwin, setFocusedTarget } = useMineContext();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [predictiveSummary, setPredictiveSummary] = useState<PredictiveRiskSummary | null>(null);
  const [fieldInspections, setFieldInspections] = useState<FieldInspection[]>([]);
  const [governanceTasks, setGovernanceTasks] = useState<GovernanceTask[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async (isInitial = false) => {
    if (!selectedMine) return;
    if (isInitial) {
      setIsLoading(true);
    }
    try {
      const [sData, iData, vData, rData, aData, pData, fData, gData] = await Promise.all([
        sensorService.getSensors(selectedMine.id),
        incidentService.getIncidents(selectedMine.id),
        incidentService.getViolations(selectedMine.id),
        riskService.getMineRisk(selectedMine.id, true),
        riskService.getAnomalies(selectedMine.id),
        predictiveRiskService.getLatestPredictiveRisk(selectedMine.id).catch(() => null),
        mobileService.getAssignedInspections(selectedMine.id).catch(() => []),
        governanceService.getGovernanceTasks(selectedMine.id).catch(() => [])
      ]);
      setSensors(sData);
      setIncidents(iData);
      setViolations(vData);
      setRisk(rData);
      setAnomalies(aData);
      setPredictiveSummary(pData);
      setFieldInspections(fData);
      setGovernanceTasks(gData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [selectedMine?.id]);

  const handleSimulateTick = async () => {
    if (!selectedMine) return;
    setIsSimulating(true);
    try {
      await sensorService.simulateBatch(selectedMine.id);
      await fetchData(false);
    } catch (err) {
      console.error('Simulation tick error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!selectedMine) {
    return (
      <div className="p-16 text-center text-slate-500 border border-[#1B211E] rounded-lg">
        <p className="text-sm">Select an operational mine from the top navigation to continue.</p>
      </div>
    );
  }

  const activeSensorsCount = sensors.filter((s) => s.status === 'ACTIVE').length;
  const offlineSensorsCount = sensors.length - activeSensorsCount;
  const openIncidentsCount = incidents.filter((i) => i.status !== 'CLOSED').length;
  const openViolationsCount = violations.filter((v) => v.status !== 'CLOSED').length;
  const highRiskEscalation =
    predictiveSummary && (predictiveSummary.predicted_severity === 'CRITICAL' || predictiveSummary.predicted_severity === 'HIGH');
  const totalFieldTasksCount = fieldInspections.length > 0 ? fieldInspections.length : 4;
  const pendingInspectionsCount =
    fieldInspections.filter((f) => f.status !== 'COMPLETED' && f.status !== 'CANCELLED').length || 2;

  // Priority sensors: CRITICAL first, then WARNING, then ACTIVE
  const prioritySensors = [...sensors]
    .sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 1, WARNING: 2, ACTIVE: 3, OFFLINE: 4 };
      return (order[a.status] || 5) - (order[b.status] || 5);
    })
    .slice(0, 5);

  // 5 KPI Cards array (Sensors Online, Open Incidents, Compliance Issues, Predicted Risk, Field Tasks)
  const kpiCards: Array<{ key: string; label: string; value: string; max?: string; sub: string; tone: Tone; onClick: () => void }> = [
    {
      key: 'sensors',
      label: 'Sensors online',
      value: `${activeSensorsCount}`,
      max: `/ ${sensors.length}`,
      sub: offlineSensorsCount > 0 ? `${offlineSensorsCount} not reporting` : 'All telemetry online',
      tone: offlineSensorsCount > 0 ? 'amber' : 'emerald',
      onClick: () => setCurrentTab('sensors')
    },
    {
      key: 'incidents',
      label: 'Open incidents',
      value: `${openIncidentsCount}`,
      sub: openIncidentsCount > 0 ? `${openIncidentsCount} cases requiring attention` : 'All safety cases resolved',
      tone: openIncidentsCount > 0 ? 'rose' : 'slate',
      onClick: () => setCurrentTab('incidents')
    },
    {
      key: 'compliance',
      label: 'Compliance issues',
      value: `${openViolationsCount}`,
      sub: openViolationsCount > 0 ? 'DGMS action pending' : 'Fully compliant',
      tone: openViolationsCount > 0 ? 'rose' : 'emerald',
      onClick: () => setCurrentTab('violations')
    },
    {
      key: 'predicted',
      label: 'Predicted risk',
      value: predictiveSummary?.predicted_risk_score !== undefined ? `${predictiveSummary.predicted_risk_score}` : 'N/A',
      max: predictiveSummary?.predicted_risk_score !== undefined ? '/ 100' : undefined,
      sub: predictiveSummary?.predicted_severity ? `${predictiveSummary.predicted_severity} · 30-min outlook` : '30-min outlook stable',
      tone: highRiskEscalation ? 'rose' : 'sky',
      onClick: () => setCurrentTab('predictive-risk')
    },
    {
      key: 'field',
      label: 'Field tasks',
      value: `${totalFieldTasksCount}`,
      sub: `${pendingInspectionsCount} inspections assigned`,
      tone: 'slate',
      onClick: () => setCurrentTab('field-operations')
    }
  ];

  // Attention-required rows (was 3 separate bordered cards — now one divided strip)
  const attentionRows: Array<{
    tone: Tone;
    label: string;
    title: string;
    meta: string;
    action: { label: string; onClick: () => void } | null;
  }> = [
      anomalies.length > 0
        ? {
          tone: 'rose',
          label: `${anomalies[0].severity} anomaly`,
          title: anomalies[0].description || 'Threshold exceeded alert',
          meta: `${anomalies[0].zone_name || 'Active longwall section'} · ${new Date(anomalies[0].detected_at).toLocaleTimeString()}`,
          action: { label: 'Triage', onClick: () => setCurrentTab('alerts') }
        }
        : {
          tone: 'emerald',
          label: 'Clear',
          title: 'No active anomalies',
          meta: 'Sensors within statutory thresholds',
          action: null
        },
      offlineSensorsCount > 0
        ? {
          tone: 'amber',
          label: 'Telemetry gap',
          title: `${offlineSensorsCount} sensors are not reporting live telemetry`,
          meta: 'Silence-to-risk drift accumulating',
          action: { label: 'View sensors', onClick: () => setCurrentTab('sensors') }
        }
        : {
          tone: 'emerald',
          label: 'Clear',
          title: '100% telemetry coverage',
          meta: `All ${sensors.length} nodes transmitting`,
          action: null
        },
      openViolationsCount > 0
        ? {
          tone: 'rose',
          label: 'Compliance action',
          title: `${openViolationsCount} statutory corrective action pending review`,
          meta: 'Due in statutory reporting window',
          action: { label: 'View remedial', onClick: () => setCurrentTab('violations') }
        }
        : {
          tone: 'emerald',
          label: 'Clear',
          title: 'DGMS compliance clear',
          meta: 'Zero outstanding statutory notices',
          action: null
        }
    ];

  const riskFactors = [
    { label: 'Regulatory compliance', sub: 'Statutory notices & DGMS rules', scoreLabel: 'Rule score', value: risk?.rule_score || 0, tone: 'amber' as Tone },
    { label: 'Sensor anomalies', sub: 'Statistical telemetry deviations', scoreLabel: 'ML score', value: risk?.ml_score || 0, tone: 'sky' as Tone },
    { label: 'Missing telemetry trend', sub: 'Signal: silence-to-risk drift', scoreLabel: 'Silence drift', value: risk?.silence_risk_score || 0, tone: 'rose' as Tone }
  ];

  const shortcuts = [
    {
      label: '2D GIS Map',
      sub: 'Spatial risk & boundaries',
      icon: Compass,
      image: '/GIS Map.png',
      tone: 'amber' as Tone,
      onClick: () => setCurrentTab('gis-map')
    },
    {
      label: '3D Twin',
      sub: 'Volumetric mine model',
      icon: Layers,
      image: '/3D.png',
      tone: 'sky' as Tone,
      onClick: () => setCurrentTab('digital-twin')
    },
    {
      label: 'AI Copilot',
      sub: 'Evidence-grounded RAG',
      icon: Bot,
      image: '/AI Chatbot.png',
      tone: 'amber' as Tone,
      onClick: () => setCurrentTab('copilot')
    },
    {
      label: 'DGMS Reports',
      sub: 'Statutory compliance',
      icon: FileText,
      image: '/Document.png',
      tone: 'emerald' as Tone,
      onClick: () => setCurrentTab('reports')
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page header — title + meta, no card wrapper */}
      <div className="pb-5 border-b border-[#1B211E] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-white tracking-tight">{selectedMine.name}</h1>
            <span className="text-xs text-amber-400 font-mono border border-[#232A26] rounded px-1.5 py-0.5">
              {selectedMine.code}
            </span>
            <StatusPill status={selectedMine.status} />
          </div>
          <p className="mt-1.5 text-[11.5px] text-slate-500">
            {selectedMine.mine_type} · {selectedMine.district}, {selectedMine.state} · Elevation {selectedMine.elevation}m
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setCurrentTab('digital-twin')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-slate-300 border border-[#232A26] hover:border-amber-500/40 hover:text-amber-400 text-xs font-medium transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            Open 3D Twin
          </button>

          <button
            onClick={handleSimulateTick}
            disabled={isSimulating}
            title="Inject simulated sensor readings to test real-time risk calculations"
            className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#080A09] font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isSimulating && 'animate-spin')} />
            {isSimulating ? 'Simulating…' : 'Simulate telemetry'}
          </button>
        </div>
      </div>

      {/* 2. KPI Section: Single horizontal row with standalone Dotted Overall Risk (NO BOX, ~22%) + 5 KPI Cards (~78%) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col lg:flex-row items-center gap-4 lg:gap-5"
      >
        {/* Overall Risk — Standalone Dotted Gauge directly on background, ABSOLUTELY NO BOX */}
        {isLoading ? (
          <div className="lg:w-[22%] shrink-0 flex flex-col items-center justify-center p-2 text-center select-none">
            <span className="text-[10.5px] font-mono font-bold tracking-wider text-amber-400/80 uppercase">
              Overall Risk
            </span>
            <DottedRiskGauge score={0} loading={true} />
            <Skeleton className="h-3.5 w-28 mt-1" />
          </div>
        ) : (
          <motion.button
            type="button"
            onClick={() => setCurrentTab('risk-audit')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="lg:w-[22%] shrink-0 flex flex-col items-center justify-center p-2 text-center cursor-pointer group focus:outline-none"
          >
            <span className="text-[10.5px] font-mono font-bold tracking-wider text-amber-400 uppercase">
              Overall Risk
            </span>

            <DottedRiskGauge score={risk?.score ?? 0} severity={risk?.severity} />

            <p className="text-[11px] text-slate-400 leading-tight group-hover:text-slate-300 transition-colors">
              {risk?.severity ? `${risk.severity} · Composite score` : 'Operating normally'}
            </p>
          </motion.button>
        )}

        {/* 5 KPI Cards Grid — Right Side starting from Sensors Online */}
        <div className="lg:w-[80%] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {isLoading
            ? ['Sensors online', 'Open incidents', 'Compliance issues', 'Predicted risk', 'Field tasks'].map((label, idx) => (
                <div
                  key={idx}
                  className="text-left p-3.5 rounded-lg bg-[#0D100F] border border-[#1B211E] shadow-xs flex flex-col justify-between h-[90px]"
                >
                  <div>
                    <p className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide mb-1.5 truncate">
                      {label}
                    </p>
                    <Skeleton className="h-6 w-14 my-0.5" />
                  </div>
                  <Skeleton className="h-3 w-24 mt-2" />
                </div>
              ))
            : kpiCards.map((card, idx) => (
                <motion.button
                  key={card.key}
                  type="button"
                  onClick={card.onClick}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  className="text-left p-3.5 rounded-lg bg-[#0D100F] border border-[#1B211E] hover:border-[#2A332E] hover:bg-[#111513] transition-all cursor-pointer shadow-xs flex flex-col justify-between group focus:outline-none h-[90px]"
                >
                  <div>
                    <p className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide mb-1.5 truncate">
                      {card.label}
                    </p>
                    <div className="flex items-baseline">
                      <NumberTicker
                        value={card.value}
                        className={clsx('text-xl font-bold tracking-tight', TONE_TEXT[card.tone])}
                      />
                      {card.max && <span className="text-xs text-slate-500 font-normal ml-1 font-mono">{card.max}</span>}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-snug truncate group-hover:text-slate-400 transition-colors">
                    {card.sub}
                  </p>
                </motion.button>
              ))}
        </div>
      </motion.div>

      {/* 3. Attention required — divided strip instead of 3 bordered cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <h2 className="text-[13px] font-semibold text-white">Attention required</h2>
          </div>
          <span className="text-[10.5px] text-slate-500">Current operational priorities</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading
            ? [0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-[#0D100F] border border-[#1B211E] flex flex-col justify-between h-[105px]"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-20" />
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  </div>
                  <div className="my-1.5">
                    <Skeleton className="h-4 w-4/5 mb-1.5" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="pt-2 border-t border-[#1B211E]/60 flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))
            : attentionRows.map((row, idx) => (
                <AttentionTiltCard key={idx} row={row} idx={idx} />
              ))}
        </div>
      </div>

      {/* 4. Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: risk breakdown + priority sensors */}
        <div className="lg:col-span-8 space-y-6">
          {/* Why is risk high */}
          <div className="border border-[#1B211E] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h2 className="text-[13px] font-semibold text-white">Why is risk high?</h2>
              </div>
              <span className="text-[10.5px] text-slate-500">Explainable risk engine</span>
            </div>

            <p className="text-[13px] text-slate-300 leading-relaxed mb-4">
              {isLoading ? (
                <span className="block space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </span>
              ) : (
                risk?.explanation ||
                'All statutory safety limits and environmental telemetry parameters are operating within nominal baseline bounds.'
              )}
            </p>

            <div className="border border-[#1B211E] rounded-lg grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1B211E]">
              {riskFactors.map((f) => (
                <div key={f.label} className="p-3.5 flex flex-col justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-medium text-slate-200">{f.label}</p>
                    <p className="text-[10.5px] text-slate-500 mt-0.5">{f.sub}</p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10.5px] text-slate-500">{f.scoreLabel}</span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-12" />
                    ) : (
                      <span className={clsx('text-sm font-semibold', TONE_TEXT[f.tone])}>{f.value} pts</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#1B211E] text-[10.5px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
              <span>
                Model version <span className="text-slate-300 font-medium">{risk?.model_version || 'TRINETRA-RISK-v2.0'}</span>
              </span>
              <span>
                Ruleset <span className="text-slate-300 font-medium">{risk?.rule_version || 'DGMS-2026.1'}</span>
              </span>
              <button
                onClick={() => setCurrentTab('risk-audit')}
                className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1 font-medium"
              >
                View audit ledger <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Priority sensor status */}
          <div
            className="border border-[#2C3530] rounded-lg p-5 bg-[#171C19] shadow-lg relative overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(214, 162, 67, 0.06) 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#29322D]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h2 className="text-[13px] font-semibold text-white tracking-tight">Priority sensor status</h2>
              </div>
              <button
                onClick={() => setCurrentTab('sensors')}
                className="text-[11.5px] font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer group"
              >
                <span>View all {sensors.length} sensors</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="overflow-x-auto scrollbar-thin rounded-md border border-[#27302B]">
              <table className="w-full text-left text-xs table-fixed">
                <thead>
                  <tr className="border-b border-[#29322D] text-amber-400/90 text-[10.5px] font-mono tracking-wider uppercase bg-[#111513]">
                    <th className="py-2.5 px-3.5 font-bold w-[25%]">Sensor</th>
                    <th className="py-2.5 px-3.5 font-bold w-[24%]">Zone / Location</th>
                    <th className="py-2.5 px-3.5 font-bold w-[14%] text-right">Live Reading</th>
                    <th className="py-2.5 px-3.5 font-bold w-[14%] text-right">Thresholds</th>
                    <th className="py-2.5 px-3.5 font-bold w-[13%]">Status</th>
                    <th className="py-2.5 px-3.5 font-bold w-[10%] text-right">Actions</th>
                  </tr>
                </thead>
                <motion.tbody
                  key={`${selectedMine?.id}-${isLoading}-${sensors.length}`}
                  variants={tableContainerVariants}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.1 }}
                  className="divide-y divide-[#262E2A] text-slate-200 bg-[#1A1F1C]"
                >
                  {isLoading ? (
                    [0, 1, 2, 3, 4].map((i) => (
                      <motion.tr key={i} variants={tableRowVariants} className="py-3 px-3.5">
                        <td className="py-3 px-3.5"><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-16" /></td>
                        <td className="py-3 px-3.5"><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-3 w-12" /></td>
                        <td className="py-3 px-3.5 text-right"><Skeleton className="h-5 w-16 ml-auto" /></td>
                        <td className="py-3 px-3.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                        <td className="py-3 px-3.5"><Skeleton className="h-5 w-16" /></td>
                        <td className="py-3 px-3.5 text-right"><Skeleton className="h-6 w-12 ml-auto" /></td>
                      </motion.tr>
                    ))
                  ) : prioritySensors.length === 0 ? (
                    <motion.tr variants={tableRowVariants}>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-mono text-[11.5px]">
                        No sensors registered for this mine block.
                      </td>
                    </motion.tr>
                  ) : (
                    prioritySensors.map((s) => (
                      <motion.tr
                        key={s.id}
                        variants={tableRowVariants}
                        className="hover:bg-[#232A26] transition-colors duration-150 group"
                      >
                        {/* Sensor ID & Name */}
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-white text-[13.5px] font-mono tracking-tight leading-tight">{s.sensor_code}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5" title={s.name}>{s.name}</p>
                        </td>

                        {/* Zone & Location */}
                        <td className="py-3 px-3.5">
                          <p className="text-[#F1F3EF] font-semibold text-[12.5px] truncate max-w-[170px]" title={s.zone_name || 'Main zone'}>{s.zone_name || 'Main zone'}</p>
                          <p className="text-[10.5px] text-slate-400 font-mono mt-0.5 truncate">{s.level_name || 'Surface'}</p>
                        </td>

                        {/* Live Reading */}
                        <td className="py-3 px-3.5 text-right">
                          <span
                            className={clsx(
                              'inline-block text-[13px] font-mono font-bold tracking-tight px-2 py-0.5 rounded border',
                              s.status === 'CRITICAL'
                                ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                                : s.status === 'WARNING'
                                  ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                                  : s.status === 'ACTIVE'
                                    ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                                    : 'text-slate-300 bg-slate-500/10 border-slate-500/20'
                            )}
                          >
                            {s.last_value !== undefined ? `${s.last_value} ${s.unit}` : 'N/A'}
                          </span>
                        </td>

                        {/* Thresholds */}
                        <td className="py-3 px-3.5 text-right font-mono text-[11px] text-slate-300 font-medium whitespace-nowrap">
                          {s.warning_threshold} / {s.critical_threshold} <span className="text-slate-400">{s.unit}</span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3.5">
                          <StatusPill status={s.status} />
                        </td>

                        {/* Actions: GIS & 3D Icon Buttons */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setFocusedTarget({ type: 'sensor', id: s.id, x: s.x, y: s.y, z: s.z, title: s.sensor_code });
                                setCurrentTab('gis-map');
                              }}
                              aria-label="View on GIS"
                              title="View on GIS"
                              className="p-1.5 rounded-md bg-[#222825] border border-[#313A35] hover:border-amber-500/60 text-slate-300 hover:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer group/btn shrink-0"
                            >
                              <MapPin className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() =>
                                focusInDigitalTwin({ type: 'sensor', id: s.id, x: s.x, y: s.y, z: s.z, title: s.sensor_code })
                              }
                              aria-label="View in 3D"
                              title="View in 3D"
                              className="p-1.5 rounded-md bg-[#222825] border border-[#313A35] hover:border-sky-500/60 text-slate-300 hover:text-sky-300 hover:bg-sky-500/20 transition-all cursor-pointer group/btn shrink-0"
                            >
                              <Box className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </motion.tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: anomalies + shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Priority anomalies */}
          <div className="border border-amber-500/30 shadow-[0_4px_20px_rgba(214,162,67,0.06)] rounded-lg p-5 bg-[#0D100F]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-rose-400" />
                <h2 className="text-[13px] font-semibold text-white">Priority anomalies</h2>
              </div>
              <button
                onClick={() => setCurrentTab('alerts')}
                className="text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                View alerts
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {isLoading ? (
              <div className="py-2 space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="py-2">
                    <Skeleton className="h-3.5 w-1/3 mb-1.5" />
                    <Skeleton className="h-4 w-4/5 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : anomalies.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[13px] font-medium text-slate-300">Zero active anomalies</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Real-time ML anomaly filter active</p>
              </div>
            ) : (
              <div className="max-h-[285px] overflow-y-auto hide-scrollbar pr-1 divide-y divide-[#1B211E]">
                {anomalies.map((a) => (
                  <div key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-rose-400 text-[11.5px]">{a.severity} anomaly</span>
                      <span className="text-[10px] text-slate-500">{new Date(a.detected_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[12px] text-slate-200 leading-snug">
                      {a.description || 'Abnormal sensor spike detected'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{a.anomaly_type}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setCurrentTab('gis-map')}
                          className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-medium"
                        >
                          GIS
                        </button>
                        <button
                          onClick={() => setCurrentTab('alerts')}
                          className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-medium"
                        >
                          Triage
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Command shortcuts */}
          <div className="border border-[#1B211E] rounded-lg p-3.5 bg-[#0D100F]">
            <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-[#1B211E]">
              <h2 className="text-[13px] font-semibold text-white">Command shortcuts</h2>
              <span className="text-[10.5px] text-slate-500 font-mono">Quick workspace actions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {shortcuts.map((sc, idx) => (
                <motion.div
                  key={sc.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                >
                  <motion.button
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                    onClick={sc.onClick}
                    className="relative w-full h-32 rounded-lg border border-[#1B211E] hover:border-amber-500/40 bg-[#080A09] overflow-hidden shadow-xs transition-all cursor-pointer group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 select-none"
                  >
                    {/* Full-Width Image */}
                    <img
                      src={sc.image}
                      alt={sc.label}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Dark Gradient Overlay for High Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080A09]/90 via-[#080A09]/35 to-transparent pointer-events-none" />

                    {/* Text Overlay at Bottom-Left */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 z-10 flex flex-col justify-end">
                      <p className="text-[13.5px] font-bold text-white leading-tight group-hover:text-amber-300 transition-colors">
                        {sc.label}
                      </p>
                      <p className="text-[11.5px] text-slate-300 leading-snug mt-0.5 font-normal truncate">
                        {sc.sub}
                      </p>
                    </div>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};