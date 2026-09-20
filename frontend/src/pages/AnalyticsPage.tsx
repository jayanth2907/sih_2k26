import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useMineContext } from '../context/MineContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { analyticsService } from '../services';
import {
  TimeRangeType,
  GovernanceOverviewAnalyticsDTO,
  SafetyAnalyticsDTO,
  ComplianceAnalyticsDTO,
  ProductionAnalyticsDTO,
  WorkforceAnalyticsDTO,
  EnvironmentalAnalyticsDTO,
  ContractorAnalyticsDTO,
  GrievanceAnalyticsDTO,
  FieldOperationsAnalyticsDTO,
  PredictiveRiskAnalyticsDTO,
  CrossMineBenchmarkingDTO,
  DrillDownEntityDTO
} from '../types/analytics';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Activity,
  FileText,
  Pickaxe,
  Users,
  Leaf,
  MessageSquare,
  ClipboardCheck,
  Building2,
  ChevronRight,
  X,
  RefreshCw,
  Eye,
  Bot,
  Compass,
  Layers3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// COMPONENT: Simple Interactive Bar/Line Charts (Zero Heavy External Library)
// ============================================================================

interface MiniBarChartProps {
  data: { label: string; value: number; count?: number }[];
  color?: string;
  unit?: string;
  height?: number;
  onPointClick?: (point: any) => void;
}

const MiniBarChart: React.FC<MiniBarChartProps> = ({
  data,
  color = '#f59e0b',
  unit = '',
  height = 80,
  onPointClick
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center border border-dashed border-[#232A26] rounded bg-[#0D100F]/60 text-slate-500 font-mono text-[11px]"
      >
        NO OBSERVATIONS IN RANGE
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#121614] border border-amber-500/40 text-[10px] font-mono px-2 py-0.5 rounded shadow-lg text-amber-300 z-20 pointer-events-none whitespace-nowrap">
          {data[hoveredIndex].label}: <span className="font-bold">{data[hoveredIndex].value}</span> {unit}
        </div>
      )}

      <div className="flex items-end gap-1.5 h-full pt-4 pb-1">
        {data.map((item, idx) => {
          const barHeight = Math.max((item.value / maxValue) * 100, 4);
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onPointClick && onPointClick(item)}
            >
              <div
                style={{ height: `${barHeight}%`, backgroundColor: isHovered ? '#fbbf24' : color }}
                className="w-full rounded-t-xs transition-all duration-150 relative min-h-[4px]"
              />
              <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center mt-1 scale-90">
                {item.label.slice(-5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: KPI Strip Card
// ============================================================================

interface KpiCardProps {
  label: string;
  value: number | string | null;
  previousValue?: number | null;
  delta?: number | null;
  percentageDelta?: number | null;
  unit?: string;
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'INFO';
  dataMode?: string;
  icon: any;
  onClick?: () => void;
  isLoading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  percentageDelta,
  unit,
  status = 'INFO',
  dataMode = 'OPERATIONAL',
  icon: Icon,
  onClick,
  isLoading
}) => {
  const getStatusBorder = () => {
    switch (status) {
      case 'CRITICAL':
        return 'border-rose-500/40 hover:border-rose-500/70 bg-rose-950/10';
      case 'WARNING':
        return 'border-amber-500/40 hover:border-amber-500/70 bg-amber-950/10';
      case 'NORMAL':
        return 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10';
      default:
        return 'border-[#1B211E] hover:border-[#2E3832] bg-[#0D100F]';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'CRITICAL':
        return 'text-rose-400';
      case 'WARNING':
        return 'text-amber-400';
      case 'NORMAL':
        return 'text-emerald-400';
      default:
        return 'text-slate-100';
    }
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-3.5 rounded-md border transition-all duration-150 select-none cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-xs',
        getStatusBorder()
      )}
    >
      {/* Top row: Label & Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase truncate">
          {label}
        </span>
        <Icon className={clsx('w-3.5 h-3.5 shrink-0', getStatusColor())} />
      </div>

      {/* Center: Value */}
      <div className="my-1.5 flex items-baseline gap-1.5">
        {isLoading ? (
          <div className="h-7 w-16 bg-[#171B18] animate-pulse rounded" />
        ) : (
          <>
            <span className={clsx('text-xl font-bold font-mono tracking-tight', getStatusColor())}>
              {value !== null && value !== undefined ? value : '—'}
            </span>
            {unit && <span className="text-[10px] font-mono text-slate-500 uppercase">{unit}</span>}
          </>
        )}
      </div>

      {/* Bottom row: Delta & Mode Tag */}
      <div className="flex items-center justify-between text-[9.5px] font-mono pt-1 border-t border-[#1B211E]/70">
        <div className="flex items-center gap-1">
          {percentageDelta !== null && percentageDelta !== undefined ? (
            <span
              className={clsx(
                'flex items-center font-semibold',
                percentageDelta > 0
                  ? 'text-rose-400'
                  : percentageDelta < 0
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              )}
            >
              {percentageDelta > 0 ? (
                <ArrowUpRight className="w-2.5 h-2.5 inline mr-0.5" />
              ) : percentageDelta < 0 ? (
                <ArrowDownRight className="w-2.5 h-2.5 inline mr-0.5" />
              ) : null}
              {percentageDelta > 0 ? `+${percentageDelta}%` : `${percentageDelta}%`}
            </span>
          ) : (
            <span className="text-slate-500">N/A vs prev</span>
          )}
        </div>

        <span
          className={clsx(
            'px-1 py-0.2 rounded text-[8.5px] tracking-wider uppercase border',
            dataMode === 'SIMULATED' || dataMode === 'DEMO'
              ? 'bg-blue-950/60 text-blue-400 border-blue-900/60'
              : 'bg-emerald-950/60 text-emerald-400 border-emerald-900/60'
          )}
        >
          {dataMode}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE COMPONENT: Executive Governance Intelligence Center
// ============================================================================

export const AnalyticsPage: React.FC = () => {
  const { selectedMine, setSelectedMineId, focusInDigitalTwin, setCurrentTab } = useMineContext();
  const { hasRole, isSystemAdmin } = useAuth();
  const { t } = useLanguage();

  // State: Filter controls
  const [timeRange, setTimeRange] = useState<TimeRangeType>('LAST_30_DAYS');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  // State: Domain Analytics
  const [overview, setOverview] = useState<GovernanceOverviewAnalyticsDTO | null>(null);
  const [safety, setSafety] = useState<SafetyAnalyticsDTO | null>(null);
  const [compliance, setCompliance] = useState<ComplianceAnalyticsDTO | null>(null);
  const [production, setProduction] = useState<ProductionAnalyticsDTO | null>(null);
  const [workforce, setWorkforce] = useState<WorkforceAnalyticsDTO | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentalAnalyticsDTO | null>(null);
  const [contractors, setContractors] = useState<ContractorAnalyticsDTO | null>(null);
  const [grievances, setGrievances] = useState<GrievanceAnalyticsDTO | null>(null);
  const [fieldOps, setFieldOps] = useState<FieldOperationsAnalyticsDTO | null>(null);
  const [predictiveRisk, setPredictiveRisk] = useState<PredictiveRiskAnalyticsDTO | null>(null);
  const [crossMine, setCrossMine] = useState<CrossMineBenchmarkingDTO | null>(null);

  // State: Loading & Error per Domain
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, setDomainErrors] = useState<Record<string, string | null>>({});
  const [activeViewMode, setActiveViewMode] = useState<'MINE' | 'CROSS_MINE'>('MINE');

  // State: Drill-down Drawer
  const [drillDownDrawerOpen, setDrillDownDrawerOpen] = useState<boolean>(false);
  const [drillDownTitle, setDrillDownTitle] = useState<string>('EVIDENCE DETAIL');
  const [drillDownEntities, setDrillDownEntities] = useState<DrillDownEntityDTO[]>([]);

  // RBAC checks for Cross-Mine comparative view
  const canViewCrossMine = useMemo(() => {
    return isSystemAdmin || hasRole(['REGULATOR' as any, 'MINE_MANAGER' as any]);
  }, [isSystemAdmin, hasRole]);

  // Fetch all domain datasets
  const fetchAllAnalytics = useCallback(async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    const errors: Record<string, string | null> = {};

    const sDate = timeRange === 'CUSTOM' ? customStart : undefined;
    const eDate = timeRange === 'CUSTOM' ? customEnd : undefined;

    // Parallel fetch with individual error containment
    await Promise.allSettled([
      analyticsService
        .getOverview(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setOverview(res))
        .catch((err) => {
          errors['overview'] = err.message || 'Failed to load overview';
        }),

      analyticsService
        .getSafety(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setSafety(res))
        .catch((err) => {
          errors['safety'] = err.message || 'Failed to load safety';
        }),

      analyticsService
        .getCompliance(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setCompliance(res))
        .catch((err) => {
          errors['compliance'] = err.message || 'Failed to load compliance';
        }),

      analyticsService
        .getProduction(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setProduction(res))
        .catch((err) => {
          errors['production'] = err.message || 'Failed to load production';
        }),

      analyticsService
        .getWorkforce(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setWorkforce(res))
        .catch((err) => {
          errors['workforce'] = err.message || 'Failed to load workforce';
        }),

      analyticsService
        .getEnvironment(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setEnvironment(res))
        .catch((err) => {
          errors['environment'] = err.message || 'Failed to load environment';
        }),

      analyticsService
        .getContractors(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setContractors(res))
        .catch((err) => {
          errors['contractors'] = err.message || 'Failed to load contractors';
        }),

      analyticsService
        .getGrievances(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setGrievances(res))
        .catch((err) => {
          errors['grievances'] = err.message || 'Failed to load grievances';
        }),

      analyticsService
        .getFieldOperations(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setFieldOps(res))
        .catch((err) => {
          errors['fieldOps'] = err.message || 'Failed to load field operations';
        }),

      analyticsService
        .getPredictiveRisk(selectedMine.id, timeRange, sDate, eDate)
        .then((res) => setPredictiveRisk(res))
        .catch((err) => {
          errors['predictiveRisk'] = err.message || 'Failed to load predictive risk';
        }),

      // Fetch cross-mine if authorized
      canViewCrossMine
        ? analyticsService
            .getCrossMine(timeRange, sDate, eDate)
            .then((res) => setCrossMine(res))
            .catch((err) => {
              errors['crossMine'] = err.message || 'Failed to load cross-mine data';
            })
        : Promise.resolve()
    ]);

    setDomainErrors(errors);
    setIsLoading(false);
  }, [selectedMine, timeRange, customStart, customEnd, canViewCrossMine]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  // Open drilldown drawer helper
  const openDrillDown = (title: string, entities: DrillDownEntityDTO[]) => {
    setDrillDownTitle(title);
    setDrillDownEntities(entities);
    setDrillDownDrawerOpen(true);
  };

  // Ask copilot deep link helper
  const handleAskCopilot = (_contextPrompt: string) => {
    setCurrentTab('copilot');
  };

  // Timestamp formatting helper
  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  if (!selectedMine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-mono text-sm space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <span>SELECT AN AUTHORIZED MINE TO ACCESS GOVERNANCE INTELLIGENCE</span>
      </div>
    );
  }

  // Data mode indicator
  const isDataSimulated =
    overview?.data_quality.is_simulated === 'YES' ||
    overview?.data_quality.data_mode === 'SIMULATED' ||
    overview?.data_quality.data_mode === 'DEMO';

  return (
    <div className="space-y-5 pb-12">
      {/* ==================================================================== */}
      {/* 1. COMMAND HEADER & CONTROLS */}
      {/* ==================================================================== */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 md:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
        {/* Left: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 tracking-wider uppercase">TRINETRA</span>
                <span className="text-slate-600 font-mono text-xs">/</span>
                <h1 className="text-base md:text-lg font-bold text-slate-100 tracking-wide uppercase font-sans">
                  {t('governanceIntelligence')}
                </h1>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1 pl-9">
            {t('governanceSubtitle')} • <span className="text-slate-300 font-semibold">{selectedMine.name}</span> ({selectedMine.district}, {selectedMine.state})
          </p>
        </div>

        {/* Right: Controls Strip */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle: Mine vs Cross-Mine (Authorized only) */}
          {canViewCrossMine && (
            <div className="flex items-center bg-[#121614] border border-[#1B211E] rounded-md p-0.5 text-xs font-mono">
              <button
                onClick={() => setActiveViewMode('MINE')}
                className={clsx(
                  'px-2.5 py-1 rounded transition-colors cursor-pointer',
                  activeViewMode === 'MINE'
                    ? 'bg-amber-500 text-[#080A09] font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                MINE OVERVIEW
              </button>
              <button
                onClick={() => setActiveViewMode('CROSS_MINE')}
                className={clsx(
                  'px-2.5 py-1 rounded transition-colors cursor-pointer',
                  activeViewMode === 'CROSS_MINE'
                    ? 'bg-amber-500 text-[#080A09] font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {t('crossMineViewLabel')}
              </button>
            </div>
          )}

          {/* Time Range Selector */}
          <div className="flex items-center bg-[#121614] border border-[#1B211E] rounded-md p-0.5 text-xs font-mono">
            {(['TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS'] as TimeRangeType[]).map((r) => {
              const labelMap: Record<string, string> = {
                TODAY: '24H',
                LAST_7_DAYS: '7D',
                LAST_30_DAYS: '30D',
                LAST_90_DAYS: '90D'
              };
              const isActive = timeRange === r;
              return (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={clsx(
                    'px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                    isActive
                      ? 'bg-[#1F2522] text-amber-400 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {labelMap[r]}
                </button>
              );
            })}
            <button
              onClick={() => setShowCustomModal(true)}
              className={clsx(
                'px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                timeRange === 'CUSTOM'
                  ? 'bg-[#1F2522] text-amber-400 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              CUSTOM
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAllAnalytics}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#121614] hover:bg-[#1A201D] text-slate-300 border border-[#1B211E] hover:border-[#2A342F] text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Analytics from API"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5 text-amber-400', isLoading && 'animate-spin')} />
            <span>REFRESH</span>
          </button>
        </div>
      </div>

      {/* Persistent Meta / Data Trust Sub-strip */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono bg-[#0A0D0C] border border-[#171B18] px-4 py-2 rounded-md gap-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            {t('dataAsOfLabel')}:{' '}
            <span className="text-slate-300 font-semibold">
              {overview?.data_as_of ? formatTimestamp(overview.data_as_of) : 'FETCHING...'}
            </span>
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-500">
            TIME WINDOW:{' '}
            <span className="text-amber-400 font-medium">
              {timeRange.replace(/_/g, ' ')}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider',
              isDataSimulated
                ? 'bg-blue-950/80 text-blue-400 border-blue-800'
                : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
            )}
          >
            {isDataSimulated ? t('simulatedLabel') : t('operationalLabel')}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP KPI COMMAND STRIP (8 DENSE CARDS) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* 1. Governance Risk / Critical Incidents */}
        <KpiCard
          label="GOVERNANCE RISK"
          value={overview?.critical_incidents?.current_value ?? 0}
          delta={overview?.critical_incidents?.delta}
          percentageDelta={overview?.critical_incidents?.percentage_delta}
          status={(overview?.critical_incidents?.current_value ?? 0) > 0 ? 'CRITICAL' : 'NORMAL'}
          dataMode={overview?.critical_incidents?.data_mode || 'OPERATIONAL'}
          icon={ShieldAlert}
          isLoading={isLoading}
          onClick={() => {
            if (safety?.drilldown_entities) {
              openDrillDown('CRITICAL RISK & SAFETY INCIDENTS', safety.drilldown_entities);
            }
          }}
        />

        {/* 2. Open Incidents */}
        <KpiCard
          label="OPEN INCIDENTS"
          value={overview?.open_incidents?.current_value ?? 0}
          delta={overview?.open_incidents?.delta}
          percentageDelta={overview?.open_incidents?.percentage_delta}
          status={(overview?.open_incidents?.current_value ?? 0) > 0 ? 'WARNING' : 'NORMAL'}
          dataMode={overview?.open_incidents?.data_mode || 'OPERATIONAL'}
          icon={AlertTriangle}
          isLoading={isLoading}
          onClick={() => {
            if (safety?.drilldown_entities) {
              openDrillDown('OPEN SAFETY INCIDENTS', safety.drilldown_entities);
            }
          }}
        />

        {/* 3. Open Violations */}
        <KpiCard
          label="OPEN VIOLATIONS"
          value={overview?.open_violations?.current_value ?? 0}
          delta={overview?.open_violations?.delta}
          percentageDelta={overview?.open_violations?.percentage_delta}
          status={(overview?.open_violations?.current_value ?? 0) > 0 ? 'WARNING' : 'NORMAL'}
          dataMode={overview?.open_violations?.data_mode || 'OPERATIONAL'}
          icon={FileText}
          isLoading={isLoading}
          onClick={() => {
            if (compliance?.drilldown_entities) {
              openDrillDown('STATUTORY DGMS VIOLATIONS', compliance.drilldown_entities);
            }
          }}
        />

        {/* 4. SLA Breaches */}
        <KpiCard
          label="SLA BREACHES"
          value={overview?.sla_breaches?.current_value ?? 0}
          delta={overview?.sla_breaches?.delta}
          percentageDelta={overview?.sla_breaches?.percentage_delta}
          status={(overview?.sla_breaches?.current_value ?? 0) > 0 ? 'CRITICAL' : 'NORMAL'}
          dataMode={overview?.sla_breaches?.data_mode || 'OPERATIONAL'}
          icon={Clock}
          isLoading={isLoading}
          onClick={() => {
            if (compliance?.drilldown_entities) {
              openDrillDown('SLA BREACHES & OVERDUE ACTIONS', compliance.drilldown_entities);
            }
          }}
        />

        {/* 5. Predictive Hotspots */}
        <KpiCard
          label="PREDICTIVE HOTSPOTS"
          value={overview?.predictive_high_hotspots?.current_value ?? 0}
          delta={overview?.predictive_high_hotspots?.delta}
          percentageDelta={overview?.predictive_high_hotspots?.percentage_delta}
          status={(overview?.predictive_high_hotspots?.current_value ?? 0) > 0 ? 'CRITICAL' : 'NORMAL'}
          dataMode="MODEL"
          icon={Activity}
          isLoading={isLoading}
          onClick={() => setCurrentTab('predictive-risk')}
        />

        {/* 6. Open Field Tasks */}
        <KpiCard
          label="OPEN FIELD TASKS"
          value={overview?.field_inspections_pending?.current_value ?? 0}
          delta={overview?.field_inspections_pending?.delta}
          percentageDelta={overview?.field_inspections_pending?.percentage_delta}
          status="INFO"
          dataMode={overview?.field_inspections_pending?.data_mode || 'OPERATIONAL'}
          icon={ClipboardCheck}
          isLoading={isLoading}
          onClick={() => setCurrentTab('field-operations')}
        />

        {/* 7. Environmental Deviations */}
        <KpiCard
          label="ENV DEVIATIONS"
          value={overview?.environmental_deviations?.current_value ?? 0}
          delta={overview?.environmental_deviations?.delta}
          percentageDelta={overview?.environmental_deviations?.percentage_delta}
          status={(overview?.environmental_deviations?.current_value ?? 0) > 0 ? 'WARNING' : 'NORMAL'}
          dataMode={overview?.environmental_deviations?.data_mode || 'OPERATIONAL'}
          icon={Leaf}
          isLoading={isLoading}
          onClick={() => {
            if (environment?.drilldown_entities) {
              openDrillDown('ENVIRONMENTAL DEVIATIONS', environment.drilldown_entities);
            }
          }}
        />

        {/* 8. Open Grievances */}
        <KpiCard
          label="OPEN GRIEVANCES"
          value={overview?.open_grievances?.current_value ?? 0}
          delta={overview?.open_grievances?.delta}
          percentageDelta={overview?.open_grievances?.percentage_delta}
          status="INFO"
          dataMode={overview?.open_grievances?.data_mode || 'OPERATIONAL'}
          icon={MessageSquare}
          isLoading={isLoading}
          onClick={() => setCurrentTab('grievances')}
        />
      </div>

      {/* ==================================================================== */}
      {/* 3. CROSS-DOMAIN ALERT STRIP (ATTENTION REQUIRED) */}
      {/* ==================================================================== */}
      <div className="bg-[#101311] border border-[#1E2521] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-amber-400 tracking-wider uppercase">
            {t('attentionRequiredLabel')}:
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
            <span className="px-2 py-0.5 rounded bg-[#171B18] border border-[#242C27]">
              {overview?.overdue_corrective_actions?.current_value ?? 0} Overdue Actions
            </span>
            <span className="px-2 py-0.5 rounded bg-[#171B18] border border-[#242C27]">
              {overview?.environmental_deviations?.current_value ?? 0} Env Deviations
            </span>
            <span className="px-2 py-0.5 rounded bg-[#171B18] border border-[#242C27]">
              {overview?.critical_incidents?.current_value ?? 0} Critical Incidents
            </span>
            <span className="px-2 py-0.5 rounded bg-[#171B18] border border-[#242C27]">
              {overview?.field_inspections_pending?.current_value ?? 0} Pending Tasks
            </span>
          </div>
        </div>

        <button
          onClick={() => handleAskCopilot('Explain what items require attention during this period.')}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-mono font-semibold transition-colors cursor-pointer self-start md:self-auto"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>ASK COPILOT</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 4. MAIN ANALYTICAL GRID */}
      {/* ==================================================================== */}
      {activeViewMode === 'MINE' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ---------------------------------------------------------------- */}
          {/* PANEL 1: SAFETY INTELLIGENCE */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('safetyIntelligenceLabel')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentTab('incidents')}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{t('viewIncidents')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Top Stats */}
              <div className="grid grid-cols-3 gap-2 my-4">
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Total Incidents</p>
                  <p className="text-lg font-bold font-mono text-slate-100">{safety?.total_incidents ?? 0}</p>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Open Incidents</p>
                  <p className={clsx('text-lg font-bold font-mono', (safety?.open_incidents ?? 0) > 0 ? 'text-amber-400' : 'text-slate-100')}>
                    {safety?.open_incidents ?? 0}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Telemetry Anomalies</p>
                  <p className="text-lg font-bold font-mono text-slate-100">{safety?.anomalies_count ?? 0}</p>
                </div>
              </div>

              {/* Chart: Incident Trend by Day */}
              <div className="space-y-1.5 my-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>INCIDENT TIMELINE</span>
                  <span>DAILY FREQUENCY</span>
                </div>
                <MiniBarChart
                  data={(safety?.incidents_by_day || []).map((p) => ({
                    label: p.date,
                    value: p.count || p.value
                  }))}
                  color="#f59e0b"
                  unit="incidents"
                  height={80}
                  onPointClick={(point) => {
                    if (safety?.drilldown_entities) {
                      openDrillDown(`SAFETY EVIDENCE (${point.label})`, safety.drilldown_entities);
                    }
                  }}
                />
              </div>

              {/* Severity Breakdown */}
              <div className="space-y-2 mt-4">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Incidents by Severity</p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {(safety?.incidents_by_severity || []).map((sev) => (
                    <div key={sev.category} className="p-2 rounded bg-[#121614] border border-[#1B211E] flex items-center justify-between">
                      <span className="text-slate-400 text-[10.5px]">{sev.category}</span>
                      <span className="font-bold text-slate-200">{sev.count}</span>
                    </div>
                  ))}
                  {(!safety?.incidents_by_severity || safety.incidents_by_severity.length === 0) && (
                    <div className="col-span-3 text-center py-2 text-slate-500 text-[11px] font-mono">
                      NO SEVERITY RECORDS IN PERIOD
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1B211E] mt-4">
              <button
                onClick={() => {
                  if (safety?.drilldown_entities) {
                    openDrillDown('SAFETY EVIDENCE & AUDIT LOGS', safety.drilldown_entities);
                  }
                }}
                className="text-xs font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>DRILL-DOWN EVIDENCE</span>
              </button>

              <button
                onClick={() => handleAskCopilot('What changed in safety during this period?')}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>ASK COPILOT</span>
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* PANEL 2: COMPLIANCE INTELLIGENCE */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('complianceIntelligenceLabel')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentTab('violations')}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{t('viewViolations')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Top Stats */}
              <div className="grid grid-cols-3 gap-2 my-4">
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Open Violations</p>
                  <p className={clsx('text-lg font-bold font-mono', (compliance?.open_violations ?? 0) > 0 ? 'text-amber-400' : 'text-slate-100')}>
                    {compliance?.open_violations ?? 0}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Pending Actions</p>
                  <p className="text-lg font-bold font-mono text-slate-100">{compliance?.corrective_actions_pending ?? 0}</p>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">SLA Compliance</p>
                  <p className="text-lg font-bold font-mono text-emerald-400">
                    {compliance?.sla_compliance_rate_percent !== undefined ? `${compliance.sla_compliance_rate_percent}%` : '—'}
                  </p>
                </div>
              </div>

              {/* Traceable Governance Relationship Chain */}
              <div className="space-y-1.5 my-3">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Traceable Governance Chain</p>
                <div className="p-3 rounded bg-[#121614] border border-[#1B211E] flex items-center justify-between text-xs font-mono">
                  <div className="text-center">
                    <p className="text-[9.5px] text-slate-500">VIOLATIONS</p>
                    <p className="font-bold text-amber-400">{compliance?.total_violations ?? 0}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <div className="text-center">
                    <p className="text-[9.5px] text-slate-500">ACTIONS</p>
                    <p className="font-bold text-slate-200">{compliance?.corrective_actions_total ?? 0}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <div className="text-center">
                    <p className="text-[9.5px] text-slate-500">OVERDUE SLA</p>
                    <p className={clsx('font-bold', (compliance?.corrective_actions_overdue ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                      {compliance?.corrective_actions_overdue ?? 0}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <div className="text-center">
                    <p className="text-[9.5px] text-slate-500">ESCALATIONS</p>
                    <p className={clsx('font-bold', (compliance?.escalations_count ?? 0) > 0 ? 'text-rose-400' : 'text-slate-300')}>
                      {compliance?.escalations_count ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statutory Breakdown */}
              <div className="space-y-2 mt-4">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Violations by Statute</p>
                <div className="space-y-1.5">
                  {(compliance?.violations_by_statute || []).slice(0, 3).map((item) => (
                    <div key={item.category} className="p-2 rounded bg-[#121614] border border-[#1B211E] flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 truncate max-w-[280px]">{item.category}</span>
                      <span className="font-bold text-amber-400">{item.count}</span>
                    </div>
                  ))}
                  {(!compliance?.violations_by_statute || compliance.violations_by_statute.length === 0) && (
                    <div className="text-center py-2 text-slate-500 text-[11px] font-mono">
                      NO STATUTORY VIOLATIONS IN PERIOD
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1B211E] mt-4">
              <button
                onClick={() => {
                  if (compliance?.drilldown_entities) {
                    openDrillDown('COMPLIANCE & STATUTORY VIOLATIONS', compliance.drilldown_entities);
                  }
                }}
                className="text-xs font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>DRILL-DOWN VIOLATIONS</span>
              </button>

              <button
                onClick={() => handleAskCopilot('Explain the current compliance situation and corrective actions.')}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>ASK COPILOT</span>
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* PANEL 3: PRODUCTION PERFORMANCE */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <Pickaxe className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('productionPerformanceLabel')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentTab('production')}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{t('productionLogs')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Stats: Planned vs Actual */}
              <div className="grid grid-cols-3 gap-2 my-4">
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Planned Target</p>
                  <p className="text-lg font-bold font-mono text-slate-100">
                    {production?.planned_quantity_total ? `${production.planned_quantity_total.toLocaleString()}` : '—'}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">{production?.unit || 'TONNES'}</span>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Actual Mined</p>
                  <p className="text-lg font-bold font-mono text-slate-100">
                    {production?.actual_quantity_total ? `${production.actual_quantity_total.toLocaleString()}` : '—'}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">{production?.unit || 'TONNES'}</span>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Variance</p>
                  <p
                    className={clsx(
                      'text-lg font-bold font-mono',
                      (production?.variance_percentage ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {production?.variance_percentage !== undefined ? `${production.variance_percentage > 0 ? '+' : ''}${production.variance_percentage}%` : '—'}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">
                    {production?.variance_quantity_total ? `${production.variance_quantity_total.toLocaleString()} ${production.unit}` : '0 TONNES'}
                  </span>
                </div>
              </div>

              {/* Chart: Production Trend */}
              <div className="space-y-1.5 my-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>PRODUCTION OUTPUT TREND</span>
                  <span>{production?.unit || 'TONNES'}</span>
                </div>
                <MiniBarChart
                  data={(production?.production_trend || []).map((p) => ({
                    label: p.date,
                    value: p.value
                  }))}
                  color="#10b981"
                  unit={production?.unit || 'TONNES'}
                  height={80}
                />
              </div>

              {/* Shift Breakdown */}
              <div className="space-y-2 mt-4">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Output by Shift</p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {(production?.production_by_shift || []).map((s) => (
                    <div key={s.category} className="p-2 rounded bg-[#121614] border border-[#1B211E] flex items-center justify-between">
                      <span className="text-slate-400 text-[10.5px]">{s.category}</span>
                      <span className="font-bold text-slate-200">{s.count.toLocaleString()} T</span>
                    </div>
                  ))}
                  {(!production?.production_by_shift || production.production_by_shift.length === 0) && (
                    <div className="col-span-3 text-center py-2 text-slate-500 text-[11px] font-mono">
                      NO SHIFT RECORDS IN PERIOD
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1B211E] mt-4">
              <span className="text-[11px] font-mono text-slate-500">
                DEVIATIONS FLAGGED: <span className="text-amber-400 font-bold">{production?.deviations_flagged_count ?? 0}</span>
              </span>

              <button
                onClick={() => handleAskCopilot('Explain production variance and shift output trends.')}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>ASK COPILOT</span>
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* PANEL 4: PREDICTIVE RISK — 30 MIN */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('predictiveRisk30MinLabel')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800">
                    MODEL: {predictiveRisk?.model_version || 'v1.0'}
                  </span>
                </div>
              </div>

              {/* Main Risk Indicators */}
              <div className="grid grid-cols-3 gap-2 my-4">
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Prediction Score</p>
                  <p className="text-lg font-bold font-mono text-amber-400">
                    {predictiveRisk?.latest_prediction_score !== null && predictiveRisk?.latest_prediction_score !== undefined
                      ? predictiveRisk.latest_prediction_score.toFixed(1)
                      : '—'}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">0 - 100 SCALE</span>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Severity Level</p>
                  <p
                    className={clsx(
                      'text-lg font-bold font-mono',
                      predictiveRisk?.latest_severity === 'CRITICAL'
                        ? 'text-rose-400'
                        : predictiveRisk?.latest_severity === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    )}
                  >
                    {predictiveRisk?.latest_severity || 'LOW'}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">{predictiveRisk?.horizon_minutes || 30} MIN HORIZON</span>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Active Hotspots</p>
                  <p className={clsx('text-lg font-bold font-mono', (predictiveRisk?.active_hotspots_count ?? 0) > 0 ? 'text-rose-400' : 'text-slate-100')}>
                    {predictiveRisk?.active_hotspots_count ?? 0}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">SPATIAL ZONES</span>
                </div>
              </div>

              {/* Top Contributing Factors */}
              <div className="space-y-2 my-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>TOP CONTRIBUTING RISK FACTORS</span>
                  <span>FACTOR IMPACT</span>
                </div>
                <div className="space-y-1.5">
                  {(predictiveRisk?.top_contributing_features || []).slice(0, 3).map((f, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#121614] border border-[#1B211E] flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-300 truncate">{f.feature_name || f.feature || 'Atmospheric Telemetry Delta'}</span>
                      <span
                        className={clsx(
                          'font-bold text-[11px] px-1.5 py-0.5 rounded border',
                          f.importance === 'HIGH' || f.impact === 'HIGH'
                            ? 'text-rose-400 bg-rose-950/40 border-rose-900/60'
                            : 'text-amber-400 bg-amber-950/40 border-amber-900/60'
                        )}
                      >
                        {f.importance || f.impact || 'MEDIUM'}
                      </span>
                    </div>
                  ))}
                  {(!predictiveRisk?.top_contributing_features || predictiveRisk.top_contributing_features.length === 0) && (
                    <div className="text-center py-2 text-slate-500 text-[11px] font-mono">
                      NO ELEVATED RISK FACTORS DETECTED
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions: GIS, 3D, Copilot */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#1B211E] mt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTab('gis-map')}
                  className="px-2.5 py-1 rounded bg-[#121614] hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="View Spatial Hotspots in 2D GIS Map"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{t('viewInGisLabel')}</span>
                </button>

                <button
                  onClick={() =>
                    focusInDigitalTwin({
                      type: 'zone',
                      x: 0,
                      y: 0,
                      z: 0,
                      title: `${selectedMine.name} Spatial Hotspot`
                    })
                  }
                  className="px-2.5 py-1 rounded bg-[#121614] hover:bg-[#1A201D] text-slate-300 border border-[#1B211E] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Focus in 3D Spatial Digital Twin"
                >
                  <Layers3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('focusIn3D')}</span>
                </button>
              </div>

              <button
                onClick={() => handleAskCopilot('Why is predictive risk elevated during this period?')}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>ASK COPILOT</span>
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* PANEL 5: ENVIRONMENTAL MONITORING */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('environmentalMonitoringLabel')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentTab('environment')}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{t('atmosphereEnv')}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Environmental Parameters Grid with strict NO_DATA preservation */}
              <div className="space-y-2.5 my-4">
                {(environment?.parameters || []).map((param) => {
                  const isNoData = param.status === 'NO_DATA' || param.observation_count === 0 || param.latest_value === null || param.latest_value === undefined;
                  const isDeviation = param.status === 'DEVIATION' || param.deviation_count > 0;

                  return (
                    <div
                      key={param.parameter_name}
                      className={clsx(
                        'p-2.5 rounded border flex items-center justify-between text-xs font-mono',
                        isNoData
                          ? 'bg-[#0D100F]/60 border-dashed border-[#232A26]'
                          : isDeviation
                          ? 'bg-rose-950/20 border-rose-900/60'
                          : 'bg-[#121614] border-[#1B211E]'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{param.parameter_name}</span>
                        {param.threshold_limit && (
                          <span className="text-[10px] text-slate-500">
                            (Limit: {param.threshold_limit} {param.unit})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {isNoData ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-[#171B18] text-slate-500 border border-[#242C27]">
                            {t('noDataLabel')}
                          </span>
                        ) : (
                          <>
                            <span className={clsx('font-bold', isDeviation ? 'text-rose-400' : 'text-slate-100')}>
                              {param.latest_value} {param.unit}
                            </span>
                            <span
                              className={clsx(
                                'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border',
                                isDeviation
                                  ? 'bg-rose-950/60 text-rose-400 border-rose-900'
                                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-900'
                              )}
                            >
                              {param.status}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(!environment?.parameters || environment.parameters.length === 0) && (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-[#232A26] rounded">
                    NO ENVIRONMENTAL OBSERVATION RECORDS IN SELECTED WINDOW
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1B211E] mt-4">
              <span className="text-[11px] font-mono text-slate-500">
                ACTIVE DEVIATIONS: <span className="text-amber-400 font-bold">{environment?.active_deviations ?? 0}</span>
              </span>

              <button
                onClick={() => handleAskCopilot('What environmental deviations require attention?')}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>ASK COPILOT</span>
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* PANEL 6: WORKFORCE & ATTENDANCE */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('workforceMuster')}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentTab('workforce')}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>VIEW MUSTER</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 my-4">
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Registered Workers</p>
                  <p className="text-lg font-bold font-mono text-slate-100">{workforce?.total_workers_registered ?? 0}</p>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Attendance Rate</p>
                  <p className="text-lg font-bold font-mono text-emerald-400">
                    {workforce?.attendance_rate_percent !== undefined ? `${workforce.attendance_rate_percent}%` : '—'}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Contractual</p>
                  <p className="text-lg font-bold font-mono text-amber-400">{workforce?.contractual_workers_count ?? 0}</p>
                </div>
              </div>

              {/* Chart: Attendance Trend */}
              <div className="space-y-1.5 my-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>DAILY ATTENDANCE RATE TREND</span>
                  <span>PERCENTAGE (%)</span>
                </div>
                <MiniBarChart
                  data={(workforce?.attendance_trend || []).map((p) => ({
                    label: p.date,
                    value: p.value
                  }))}
                  color="#3b82f6"
                  unit="%"
                  height={80}
                />
              </div>

              {/* Trade Breakdown */}
              <div className="space-y-2 mt-4">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Worker Distribution by Trade</p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {(workforce?.workers_by_trade || []).slice(0, 3).map((tr) => (
                    <div key={tr.category} className="p-2 rounded bg-[#121614] border border-[#1B211E] flex items-center justify-between">
                      <span className="text-slate-400 text-[10.5px] truncate">{tr.category}</span>
                      <span className="font-bold text-slate-200">{tr.count}</span>
                    </div>
                  ))}
                  {(!workforce?.workers_by_trade || workforce.workers_by_trade.length === 0) && (
                    <div className="col-span-3 text-center py-2 text-slate-500 text-[11px] font-mono">
                      NO TRADE CLASSIFICATIONS
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1B211E] mt-4">
              <span className="text-[11px] font-mono text-slate-500">
                REGULAR: <span className="text-slate-200 font-bold">{workforce?.regular_workers_count ?? 0}</span> | CONTRACTUAL:{' '}
                <span className="text-amber-400 font-bold">{workforce?.contractual_workers_count ?? 0}</span>
              </span>

              <button
                onClick={() => handleAskCopilot('Explain workforce attendance patterns and contractual ratios.')}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>ASK COPILOT</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ==================================================================== */
        /* CROSS-MINE COMPARATIVE BENCHMARKING TABLE (AUTHORIZED ONLY) */
        /* ==================================================================== */
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
            <div>
              <h2 className="text-sm font-bold text-slate-200 tracking-wider uppercase font-mono">
                {t('crossMineViewLabel')} — DESCRIPTIVE COMPARISON
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Authorized Mines ({crossMine?.authorized_mines_count ?? 0}) • Strictly descriptive telemetry without subjective ranking.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              RBAC AUTHORIZED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#1B211E] text-slate-500 bg-[#121614]">
                  <th className="p-3 font-semibold">MINE / BLOCK</th>
                  <th className="p-3 font-semibold">STATE / DISTRICT</th>
                  <th className="p-3 font-semibold text-right">INCIDENTS</th>
                  <th className="p-3 font-semibold text-right">OPEN VIOLATIONS</th>
                  <th className="p-3 font-semibold text-right">SLA BREACHES</th>
                  <th className="p-3 font-semibold text-right">PROD VARIANCE</th>
                  <th className="p-3 font-semibold text-right">ATTENDANCE</th>
                  <th className="p-3 font-semibold text-right">ENV DEVIATIONS</th>
                  <th className="p-3 font-semibold text-right">PREDICTIVE SCORE</th>
                  <th className="p-3 font-semibold text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B211E]">
                {(crossMine?.mines || []).map((m) => {
                  const score = m.predictive_risk_score;
                  return (
                    <tr key={m.mine_id} className="hover:bg-[#121614]/80 transition-colors">
                      <td className="p-3 font-bold text-slate-200">
                        {m.mine_name}
                        {m.is_simulated === 'YES' && (
                          <span className="ml-2 text-[9px] px-1 py-0.2 rounded bg-blue-950/60 text-blue-400 border border-blue-900">
                            SIM
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">
                        {m.district}, {m.state}
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-200">{m.open_incidents}</td>
                      <td className="p-3 text-right font-semibold text-amber-400">{m.open_violations}</td>
                      <td className="p-3 text-right font-semibold text-rose-400">{m.sla_breaches}</td>
                      <td className="p-3 text-right text-slate-300">
                        {m.production_variance > 0 ? `+${m.production_variance}%` : `${m.production_variance}%`}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-semibold">{m.attendance_rate_percent}%</td>
                      <td className="p-3 text-right text-slate-300">{m.environmental_deviations}</td>
                      <td className="p-3 text-right font-bold text-amber-400">
                        {score !== null && score !== undefined ? score.toFixed(1) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedMineId(m.mine_id);
                            setActiveViewMode('MINE');
                          }}
                          className="px-2 py-1 rounded bg-[#171B18] hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          FOCUS
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {(!crossMine?.mines || crossMine.mines.length === 0) && (
                  <tr>
                    <td colSpan={10} className="text-center py-6 text-slate-500 font-mono">
                      NO AUTHORIZED MINES COMPARATIVE DATA
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. LOWER OPERATIONAL PANELS: FIELD OPS, CONTRACTORS, GRIEVANCES */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Field Operations */}
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                  {t('fieldOperations')}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Scheduled</p>
                <p className="font-bold text-slate-200">{fieldOps?.scheduled_inspections ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Completed</p>
                <p className="font-bold text-emerald-400">{fieldOps?.completed_inspections ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Evidence SHA-256</p>
                <p className="font-bold text-slate-200">{fieldOps?.total_evidence_count ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Sync Accepted</p>
                <p className="font-bold text-emerald-400">{fieldOps?.sync_accepted_count ?? 0}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentTab('field-operations')}
            className="w-full py-2 rounded bg-[#121614] hover:bg-[#1A201D] text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{t('openFieldOperationsLabel')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Contractor Governance */}
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                  {t('contractorsSla')}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Active Agencies</p>
                <p className="font-bold text-slate-200">{contractors?.active_contractors_count ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Active Contracts</p>
                <p className="font-bold text-slate-200">{contractors?.active_contracts ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Expiring (30d)</p>
                <p className={clsx('font-bold', (contractors?.expiring_soon_contracts ?? 0) > 0 ? 'text-amber-400' : 'text-slate-300')}>
                  {contractors?.expiring_soon_contracts ?? 0}
                </p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Deviations</p>
                <p className={clsx('font-bold', (contractors?.requirement_deviations_count ?? 0) > 0 ? 'text-rose-400' : 'text-slate-300')}>
                  {contractors?.requirement_deviations_count ?? 0}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentTab('contractors')}
            className="w-full py-2 rounded bg-[#121614] hover:bg-[#1A201D] text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{t('viewContractorsLabel')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* PGRM Grievance Redressal */}
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                  {t('grievanceRedressal')} (PGRM)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Total Filed</p>
                <p className="font-bold text-slate-200">{grievances?.total_grievances ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Resolved</p>
                <p className="font-bold text-emerald-400">{grievances?.resolved_grievances ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Open / In-Progress</p>
                <p className="font-bold text-amber-400">{grievances?.open_grievances ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Avg Disposal Time</p>
                <p className="font-bold text-slate-200">
                  {grievances?.avg_disposal_days !== null && grievances?.avg_disposal_days !== undefined
                    ? `${grievances.avg_disposal_days}d`
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentTab('grievances')}
            className="w-full py-2 rounded bg-[#121614] hover:bg-[#1A201D] text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{t('openPgrmWorkflowLabel')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. DATA TRUST FOOTER STRIP */}
      {/* ==================================================================== */}
      <div className="p-4 rounded-lg bg-[#0A0D0C] border border-[#171B18] text-xs font-mono text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300">{t('dataTrustLabel')}:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-300">{t('operationalLabel')}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-300">{t('sourceDerivedLabel')}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-300">{t('modelDerivedLabel')}</span>
          </span>
        </div>

        <span className="text-[11px] text-slate-500">
          Continuous cryptographic audit and DGMS statutory rule verification active.
        </span>
      </div>

      {/* ==================================================================== */}
      {/* 7. DRILL-DOWN DRAWER (RIGHT SLIDE-OUT) */}
      {/* ==================================================================== */}
      {drillDownDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-[#0D100F] border-l border-[#1B211E] h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1B211E]">
                <div>
                  <h3 className="text-sm font-bold font-mono text-slate-100 uppercase">{drillDownTitle}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Found {drillDownEntities.length} evidence records in time window
                  </p>
                </div>
                <button
                  onClick={() => setDrillDownDrawerOpen(false)}
                  className="p-1.5 rounded hover:bg-[#1A201D] text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Entity List */}
              <div className="space-y-3 my-4">
                {drillDownEntities.map((ent) => (
                  <div key={`${ent.entity_type}-${ent.id}`} className="p-3.5 rounded bg-[#121614] border border-[#1B211E] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-400">{ent.code}</span>
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-[#171B18] text-slate-300 border border-[#242C27] uppercase">
                        {ent.entity_type}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-200">{ent.title}</p>

                    <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono text-slate-400 pt-1 border-t border-[#1B211E]">
                      {ent.severity && (
                        <span className={clsx('font-semibold', ent.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400')}>
                          Severity: {ent.severity}
                        </span>
                      )}
                      {ent.status && <span>Status: {ent.status}</span>}
                      {ent.timestamp && <span>Recorded: {formatTimestamp(ent.timestamp)}</span>}
                    </div>

                    {/* Deep link actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {ent.latitude && ent.longitude && (
                        <button
                          onClick={() => {
                            setDrillDownDrawerOpen(false);
                            setCurrentTab('gis-map');
                          }}
                          className="px-2 py-1 rounded bg-[#171B18] hover:bg-[#1F2522] text-amber-400 text-[10.5px] font-mono flex items-center gap-1 border border-amber-500/30 cursor-pointer"
                        >
                          <Compass className="w-3 h-3" />
                          <span>VIEW IN GIS</span>
                        </button>
                      )}

                      {ent.digital_twin_id && (
                        <button
                          onClick={() => {
                            setDrillDownDrawerOpen(false);
                            focusInDigitalTwin({
                              type: 'incident',
                              x: 0,
                              y: 0,
                              z: 0,
                              title: ent.title
                            });
                          }}
                          className="px-2 py-1 rounded bg-[#171B18] hover:bg-[#1F2522] text-slate-300 text-[10.5px] font-mono flex items-center gap-1 border border-[#242C27] cursor-pointer"
                        >
                          <Layers3 className="w-3 h-3 text-amber-400" />
                          <span>FOCUS 3D</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {drillDownEntities.length === 0 && (
                  <div className="text-center py-10 text-slate-500 font-mono text-xs">
                    NO DRILL-DOWN EVIDENCE RECORDS AVAILABLE
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-[#1B211E]">
              <button
                onClick={() => setDrillDownDrawerOpen(false)}
                className="w-full py-2 rounded bg-[#171B18] hover:bg-[#202622] text-slate-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                CLOSE EVIDENCE DRAWER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. CUSTOM DATE RANGE MODAL */}
      {/* ==================================================================== */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#0D100F] border border-[#1B211E] rounded-lg p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
              <h3 className="font-bold text-slate-100 uppercase">SET CUSTOM ANALYTICAL WINDOW</h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">START DATE & TIME (ISO / UTC)</label>
                <input
                  type="datetime-local"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#121614] border border-[#1B211E] text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">END DATE & TIME (ISO / UTC)</label>
                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#121614] border border-[#1B211E] text-slate-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1B211E]">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 rounded bg-[#121614] hover:bg-[#1A201D] text-slate-400 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setTimeRange('CUSTOM');
                  setShowCustomModal(false);
                }}
                className="px-3 py-1.5 rounded bg-amber-500 text-[#080A09] font-bold hover:bg-amber-400 transition-colors"
              >
                APPLY WINDOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
