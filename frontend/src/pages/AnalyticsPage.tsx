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
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Eye,
  Bot,
  Compass,
  Layers3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// HELPER: Format Indian Standard Time
// ============================================================================
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
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};

// ============================================================================
// COMPONENT 1: Interactive High-Precision SVG Time-Series Chart (Industrial Center)
// ============================================================================

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  count?: number;
  forecastValue?: number | null;
  targetValue?: number | null;
  observedValue?: number | null;
  label?: string | null;
  entity_ids?: number[];
  severity?: string | null;
  probability?: number | null;
}

export interface ChartEventMarker {
  date: string;
  type: 'INCIDENT' | 'INSPECTION' | 'ACTION' | 'ANOMALY';
  label: string;
  severity?: string | null;
  entityId?: number;
}

export interface ThresholdLine {
  value: number;
  label: string;
  color: string;
  dashed?: boolean;
}

export interface InteractiveTimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  color?: string;
  unit?: string;
  height?: number;
  thresholds?: ThresholdLine[];
  showTargetLine?: boolean;
  targetValue?: number;
  targetLabel?: string;
  isPredictive?: boolean;
  predictionHorizonMin?: number;
  // Multi-series support
  secondaryData?: TimeSeriesDataPoint[];
  secondaryColor?: string;
  secondaryLabel?: string;
  secondaryDashed?: boolean;
  tertiaryData?: TimeSeriesDataPoint[];
  tertiaryColor?: string;
  tertiaryLabel?: string;
  // Event markers
  eventMarkers?: ChartEventMarker[];
  onMarkerClick?: (marker: ChartEventMarker) => void;
  onPointClick?: (point: TimeSeriesDataPoint) => void;
  emptyMessage?: string;
}

export const InteractiveTimeSeriesChart: React.FC<InteractiveTimeSeriesChartProps> = ({
  data,
  color = '#f59e0b',
  unit = '',
  height = 260,
  thresholds = [],
  showTargetLine = false,
  targetValue,
  targetLabel = 'TARGET',
  isPredictive = false,
  predictionHorizonMin = 30,
  secondaryData,
  secondaryColor = '#38bdf8',
  secondaryLabel = 'SECONDARY',
  secondaryDashed = false,
  tertiaryData,
  tertiaryColor = '#10b981',
  tertiaryLabel = 'TERTIARY',
  eventMarkers = [],
  onMarkerClick,
  onPointClick,
  emptyMessage = 'INSUFFICIENT HISTORICAL OBSERVATIONS IN WINDOW'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Trend analysis calculation
  const trendAnalysis = useMemo(() => {
    if (!data || data.length < 2) return { text: 'Single observation baseline', direction: 'STABLE', deltaPct: 0 };
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const delta = last - first;
    const deltaPct = first !== 0 ? Math.round((delta / first) * 100) : delta > 0 ? 100 : 0;

    if (delta > 0) return { text: `Trending Up (+${deltaPct}%)`, direction: 'UP', deltaPct };
    if (delta < 0) return { text: `Trending Down (${deltaPct}%)`, direction: 'DOWN', deltaPct };
    return { text: 'Activity Stable (0% delta)', direction: 'STABLE', deltaPct: 0 };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center border border-dashed border-[#232A26] rounded-lg bg-[#0D100F]/60 text-slate-500 font-mono text-xs p-6 text-center space-y-2"
      >
        <AlertCircle className="w-5 h-5 text-slate-600" />
        <span className="font-semibold text-slate-400">{emptyMessage}</span>
        <span className="text-[10.5px] text-slate-600 max-w-sm">
          Simulated operational observations chart automatically when generated across analytical windows.
        </span>
      </div>
    );
  }

  // Calculate scales across all series
  const allValues = data.map((d) => d.value);
  data.forEach((d) => {
    if (d.observedValue !== undefined && d.observedValue !== null) allValues.push(d.observedValue);
    if (d.forecastValue !== undefined && d.forecastValue !== null) allValues.push(d.forecastValue);
  });
  if (secondaryData) secondaryData.forEach((d) => allValues.push(d.value));
  if (tertiaryData) tertiaryData.forEach((d) => allValues.push(d.value));
  if (showTargetLine && targetValue !== undefined) allValues.push(targetValue);
  thresholds.forEach((t) => allValues.push(t.value));

  const rawMax = Math.max(...allValues, 1);
  const rawMin = Math.min(...allValues, 0);
  const padding = (rawMax - rawMin) * 0.15 || 1;
  const yMax = Math.ceil(rawMax + padding);
  const yMin = Math.max(0, Math.floor(rawMin - padding * 0.3));
  const yRange = yMax - yMin || 1;

  const svgWidth = 600;
  const svgHeight = height - 42; // Leave space for X-axis labels
  const leftPadding = 44;
  const rightPadding = 28;
  const topPadding = 20;
  const bottomPadding = 16;
  const plotWidth = svgWidth - leftPadding - rightPadding;
  const plotHeight = svgHeight - topPadding - bottomPadding;

  const getX = (idx: number, totalCount: number) => {
    if (totalCount <= 1) return leftPadding + plotWidth / 2;
    return leftPadding + (idx / (totalCount - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return topPadding + plotHeight - ((clamped - yMin) / yRange) * plotHeight;
  };

  // Primary Path
  const points = data.map((d, idx) => ({
    x: getX(idx, data.length),
    y: getY(d.value),
    raw: d,
    idx
  }));

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${topPadding + plotHeight} L ${points[0].x} ${topPadding + plotHeight} Z`
    : '';

  // Secondary Series Path
  let secondaryPoints: Array<{ x: number; y: number; raw: TimeSeriesDataPoint }> = [];
  let secondaryPathD = '';
  if (secondaryData && secondaryData.length > 0) {
    secondaryPoints = secondaryData.map((d, idx) => ({
      x: getX(idx, secondaryData.length),
      y: getY(d.value),
      raw: d
    }));
    secondaryPathD = secondaryPoints.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  }

  // Tertiary Series Path
  let tertiaryPoints: Array<{ x: number; y: number; raw: TimeSeriesDataPoint }> = [];
  let tertiaryPathD = '';
  if (tertiaryData && tertiaryData.length > 0) {
    tertiaryPoints = tertiaryData.map((d, idx) => ({
      x: getX(idx, tertiaryData.length),
      y: getY(d.value),
      raw: d
    }));
    tertiaryPathD = tertiaryPoints.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  }

  // Find matching event markers for hovered point or date
  const hoveredPoint = hoveredIdx !== null ? data[hoveredIdx] : null;
  const hoveredDate = hoveredPoint?.date?.split(' ')[0] || '';
  const matchingMarkers = eventMarkers.filter((m) => m.date.startsWith(hoveredDate));

  return (
    <div className="relative w-full select-none" style={{ height }}>
      {/* Top Header Strip: Legend & Trend Interpretation */}
      <div className="flex flex-wrap items-center justify-between text-[10.5px] font-mono mb-2 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: color }}></span>
            <span className="text-slate-300 font-semibold">{isPredictive ? 'OBSERVED RISK' : 'PRIMARY'}</span>
          </div>
          {secondaryData && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: secondaryColor }}></span>
              <span className="text-slate-400">{secondaryLabel}</span>
            </div>
          )}
          {tertiaryData && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: tertiaryColor }}></span>
              <span className="text-slate-400">{tertiaryLabel}</span>
            </div>
          )}
          {showTargetLine && targetValue !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-b border-dashed border-emerald-400"></span>
              <span className="text-emerald-400">{targetLabel} ({targetValue})</span>
            </div>
          )}
          {isPredictive && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-b border-dashed border-cyan-400"></span>
              <span className="text-cyan-400">30-MIN PREDICTED</span>
            </div>
          )}
        </div>

        <span
          className={clsx(
            'px-2 py-0.5 rounded text-[9.5px] font-bold border flex items-center gap-1 shrink-0',
            trendAnalysis.direction === 'UP'
              ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
              : trendAnalysis.direction === 'DOWN'
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
              : 'bg-[#121614] text-slate-400 border-[#232A26]'
          )}
        >
          {trendAnalysis.direction === 'UP' && <ArrowUpRight className="w-2.5 h-2.5 inline" />}
          {trendAnalysis.direction === 'DOWN' && <ArrowDownRight className="w-2.5 h-2.5 inline" />}
          {trendAnalysis.text}
        </span>
      </div>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute z-30 pointer-events-none bg-[#0D100F] border border-amber-500/60 rounded-lg p-2.5 shadow-2xl text-[10.5px] font-mono text-slate-200 transition-all duration-75 min-w-[190px]"
          style={{
            left: `${Math.min(Math.max((points[hoveredIdx].x / svgWidth) * 100, 18), 82)}%`,
            top: '8px',
            transform: 'translate(-50%, 0)'
          }}
        >
          <div className="text-amber-400 font-bold border-b border-[#232A26] pb-1 mb-1.5 flex items-center justify-between">
            <span>{data[hoveredIdx].date}</span>
            {data[hoveredIdx].severity && (
              <span
                className={clsx(
                  'text-[9px] px-1 py-0.2 rounded font-bold uppercase border',
                  data[hoveredIdx].severity === 'CRITICAL'
                    ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                    : data[hoveredIdx].severity === 'HIGH' || data[hoveredIdx].severity === 'WARNING'
                    ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                    : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                )}
              >
                {data[hoveredIdx].severity}
              </span>
            )}
          </div>

          <div className="space-y-1 text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">{isPredictive ? 'Observed Risk:' : 'Value:'}</span>
              <span className="font-bold text-white">
                {data[hoveredIdx].observedValue !== undefined && data[hoveredIdx].observedValue !== null
                  ? data[hoveredIdx].observedValue
                  : data[hoveredIdx].value}{' '}
                {unit}
              </span>
            </div>

            {isPredictive && (
              <div className="flex items-center justify-between gap-3 text-cyan-300">
                <span>Predicted Outlook:</span>
                <span className="font-bold">
                  {data[hoveredIdx].forecastValue ?? data[hoveredIdx].value} pts
                </span>
              </div>
            )}

            {data[hoveredIdx].probability !== undefined && data[hoveredIdx].probability !== null && (
              <div className="flex items-center justify-between gap-3 text-slate-400 text-[9.5px]">
                <span>Escalation Probability:</span>
                <span className="font-bold text-amber-300">{Math.round((data[hoveredIdx].probability || 0) * 100)}%</span>
              </div>
            )}

            {secondaryData && secondaryData[hoveredIdx] && (
              <div className="flex items-center justify-between gap-3 text-slate-400 text-[9.5px]">
                <span>{secondaryLabel}:</span>
                <span className="font-bold text-sky-300">
                  {secondaryData[hoveredIdx].value} {unit}
                </span>
              </div>
            )}

            {tertiaryData && tertiaryData[hoveredIdx] && (
              <div className="flex items-center justify-between gap-3 text-slate-400 text-[9.5px]">
                <span>{tertiaryLabel}:</span>
                <span className="font-bold text-emerald-300">
                  {tertiaryData[hoveredIdx].value} {unit}
                </span>
              </div>
            )}

            {targetValue !== undefined && (
              <div className="flex items-center justify-between gap-3 text-slate-400 text-[9.5px]">
                <span>Target Baseline:</span>
                <span className="font-bold text-emerald-400">{targetValue} {unit}</span>
              </div>
            )}

            {data[hoveredIdx].count !== undefined && data[hoveredIdx].count > 0 && (
              <div className="flex items-center justify-between gap-3 text-slate-400 text-[9.5px]">
                <span>Event Count:</span>
                <span className="font-bold text-amber-300">{data[hoveredIdx].count}</span>
              </div>
            )}

            {matchingMarkers.length > 0 && (
              <div className="pt-1 mt-1 border-t border-[#232A26] space-y-0.5">
                <span className="text-[9px] text-amber-400 font-bold uppercase">Operational Event:</span>
                {matchingMarkers.map((m, mIdx) => (
                  <div key={mIdx} className="text-[9.5px] text-slate-300 truncate">
                    • {m.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full overflow-visible"
        style={{ height: svgHeight }}
      >
        <defs>
          <linearGradient id={`chart-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id={`sec-grad-${secondaryColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {[0, 0.33, 0.66, 1].map((ratio) => {
          const val = Math.round(yMin + ratio * yRange);
          const yPos = getY(val);
          return (
            <g key={ratio}>
              <line
                x1={leftPadding}
                y1={yPos}
                x2={svgWidth - rightPadding}
                y2={yPos}
                stroke="#1B211E"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={leftPadding - 6}
                y={yPos + 3}
                fill="#64748b"
                fontSize="9"
                textAnchor="end"
                fontFamily="monospace"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Target Reference Line */}
        {showTargetLine && targetValue !== undefined && (
          <g>
            <line
              x1={leftPadding}
              y1={getY(targetValue)}
              x2={svgWidth - rightPadding}
              y2={getY(targetValue)}
              stroke="#10b981"
              strokeDasharray="5 4"
              strokeWidth="1.5"
            />
            <text
              x={svgWidth - rightPadding + 4}
              y={getY(targetValue) + 3}
              fill="#10b981"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {targetLabel} ({targetValue})
            </text>
          </g>
        )}

        {/* Configured Threshold Reference Lines */}
        {thresholds.map((t, idx) => {
          const yPos = getY(t.value);
          return (
            <g key={idx}>
              <line
                x1={leftPadding}
                y1={yPos}
                x2={svgWidth - rightPadding}
                y2={yPos}
                stroke={t.color}
                strokeDasharray={t.dashed ? '4 3' : undefined}
                strokeWidth="1.2"
                opacity="0.85"
              />
              <text
                x={svgWidth - rightPadding + 4}
                y={yPos + 3}
                fill={t.color}
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {/* Primary Area Fill */}
        {areaD && (
          <path d={areaD} fill={`url(#chart-grad-${color.replace('#', '')})`} />
        )}

        {/* Tertiary Polyline */}
        {tertiaryPathD && (
          <path
            d={tertiaryPathD}
            fill="none"
            stroke={tertiaryColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Secondary Polyline */}
        {secondaryPathD && (
          <path
            d={secondaryPathD}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="2.0"
            strokeDasharray={secondaryDashed ? '4 3' : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Main Connected Polyline */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Predictive Horizon Extender (Dashed to Endpoint) */}
        {isPredictive && points.length > 1 && (
          <g>
            <line
              x1={points[points.length - 2].x}
              y1={points[points.length - 2].y}
              x2={points[points.length - 1].x}
              y2={points[points.length - 1].y}
              stroke="#38bdf8"
              strokeWidth="2.8"
              strokeDasharray="5 3"
            />
            {/* Distinct Predicted Endpoint Halo */}
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={7}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="2 2"
              className="animate-spin"
            />
          </g>
        )}

        {/* Operational Event Markers on Timeline */}
        {eventMarkers.map((marker, mIdx) => {
          // Find matching X coordinate based on date string
          const pIdx = data.findIndex((d) => d.date.startsWith(marker.date.split(' ')[0]));
          if (pIdx === -1) return null;
          const xPos = points[pIdx].x;
          const yPos = points[pIdx].y;

          const getMarkerGlyph = () => {
            switch (marker.type) {
              case 'INCIDENT':
                return { fill: '#f43f5e', shape: 'circle' };
              case 'INSPECTION':
                return { fill: '#38bdf8', shape: 'triangle' };
              case 'ACTION':
                return { fill: '#10b981', shape: 'diamond' };
              default:
                return { fill: '#f59e0b', shape: 'warning' };
            }
          };

          const { fill, shape } = getMarkerGlyph();

          return (
            <g
              key={mIdx}
              className="cursor-pointer group"
              onClick={() => onMarkerClick && onMarkerClick(marker)}
            >
              <line
                x1={xPos}
                y1={topPadding}
                x2={xPos}
                y2={topPadding + plotHeight}
                stroke={fill}
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              {shape === 'circle' && (
                <circle cx={xPos} cy={yPos - 12} r={5} fill={fill} stroke="#080A09" strokeWidth="1.5" />
              )}
              {shape === 'diamond' && (
                <polygon
                  points={`${xPos},${yPos - 17} ${xPos + 5},${yPos - 12} ${xPos},${yPos - 7} ${xPos - 5},${yPos - 12}`}
                  fill={fill}
                  stroke="#080A09"
                  strokeWidth="1.5"
                />
              )}
              {shape === 'triangle' && (
                <polygon
                  points={`${xPos},${yPos - 17} ${xPos + 5},${yPos - 7} ${xPos - 5},${yPos - 7}`}
                  fill={fill}
                  stroke="#080A09"
                  strokeWidth="1.5"
                />
              )}
              {shape === 'warning' && (
                <circle cx={xPos} cy={yPos - 12} r={4.5} fill={fill} stroke="#080A09" strokeWidth="1.5" />
              )}
            </g>
          );
        })}

        {/* Interactive Data Points */}
        {points.map((p) => {
          const isHovered = hoveredIdx === p.idx;
          return (
            <g
              key={p.idx}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(p.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onPointClick && onPointClick(p.raw)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 3.5}
                fill={isHovered ? '#ffffff' : color}
                stroke="#080A09"
                strokeWidth="1.5"
                className="transition-all duration-100"
              />
              {/* Invisible large hit target for touch/mouse */}
              <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
            </g>
          );
        })}
      </svg>

      {/* X-Axis Date/Time Labels */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-5 mt-1">
        <span>{data[0]?.date}</span>
        {data.length > 4 && <span>{data[Math.floor(data.length * 0.33)]?.date}</span>}
        {data.length > 4 && <span>{data[Math.floor(data.length * 0.66)]?.date}</span>}
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT 2: Proportional Horizontal Bar Breakdown
// ============================================================================

interface BarBreakdownItem {
  category: string;
  count: number;
  percentage?: number;
  severity?: string | null;
}

interface ProportionalBarDistributionProps {
  items: BarBreakdownItem[];
  colorMap?: Record<string, string>;
  defaultColor?: string;
  unit?: string;
  emptyLabel?: string;
  onItemClick?: (item: BarBreakdownItem) => void;
}

const ProportionalBarDistribution: React.FC<ProportionalBarDistributionProps> = ({
  items,
  colorMap = {
    CRITICAL: '#f43f5e',
    HIGH: '#fb923c',
    MEDIUM: '#facc15',
    LOW: '#34d399',
    OPEN: '#fb923c',
    RESOLVED: '#10b981',
    PENDING: '#f59e0b'
  },
  defaultColor = '#f59e0b',
  unit = '',
  emptyLabel = 'NO CATEGORICAL RECORDS IN PERIOD',
  onItemClick
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-3 text-slate-500 font-mono text-xs border border-dashed border-[#232A26] rounded">
        {emptyLabel}
      </div>
    );
  }

  const maxVal = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-2 select-none">
      {items.map((item, idx) => {
        const barWidthPct = Math.max((item.count / maxVal) * 100, 5);
        const itemColor =
          colorMap[item.severity || item.category] ||
          colorMap[item.category.toUpperCase()] ||
          defaultColor;

        return (
          <div
            key={idx}
            onClick={() => onItemClick && onItemClick(item)}
            className="p-2 rounded bg-[#121614] border border-[#1B211E] hover:border-[#2C3630] transition-colors cursor-pointer space-y-1"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-medium truncate max-w-[220px]">
                {item.category}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100">
                  {item.count.toLocaleString()} {unit}
                </span>
                {item.percentage !== undefined && (
                  <span className="text-[10px] text-slate-500">({item.percentage}%)</span>
                )}
              </div>
            </div>

            {/* Proportional bar */}
            <div className="w-full bg-[#1A201D] h-1.5 rounded-full overflow-hidden">
              <div
                style={{ width: `${barWidthPct}%`, backgroundColor: itemColor }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// COMPONENT 3: Traceable Governance Pipeline Flow
// ============================================================================

interface GovernanceStage {
  label: string;
  count: number;
  status: 'NORMAL' | 'ATTENTION' | 'CRITICAL';
  subtext: string;
}

interface GovernancePipelineProps {
  stages: GovernanceStage[];
  onStageClick?: (index: number) => void;
}

const TraceableGovernancePipeline: React.FC<GovernancePipelineProps> = ({ stages, onStageClick }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 my-3 select-none">
      {stages.map((stage, idx) => {
        const getStatusStyles = () => {
          switch (stage.status) {
            case 'CRITICAL':
              return 'bg-rose-950/20 border-rose-900/60 text-rose-400';
            case 'ATTENTION':
              return 'bg-amber-950/20 border-amber-900/60 text-amber-400';
            default:
              return 'bg-emerald-950/20 border-emerald-900/60 text-emerald-400';
          }
        };

        return (
          <div
            key={idx}
            onClick={() => onStageClick && onStageClick(idx)}
            className={clsx(
              'p-3 rounded-lg border flex flex-col justify-between transition-all duration-150 cursor-pointer relative overflow-hidden',
              getStatusStyles()
            )}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
              <span>{stage.label}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#171B18] border border-[#242C27] text-slate-300">
                STAGE {idx + 1}
              </span>
            </div>

            <div className="my-2">
              <span className="text-xl font-mono font-bold">{stage.count}</span>
            </div>

            <div className="text-[9.5px] font-mono text-slate-400 truncate">
              {stage.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// COMPONENT 4: Environmental Parameter Measurement Gauge
// ============================================================================

interface EnvironmentalGaugeProps {
  param: {
    parameter_name: string;
    observation_count: number;
    latest_value?: number | null;
    threshold_limit?: number | null;
    unit: string;
    deviation_count: number;
    status: 'NORMAL' | 'DEVIATION' | 'NO_DATA';
  };
}

const EnvironmentalGauge: React.FC<EnvironmentalGaugeProps> = ({ param }) => {
  const isNoData =
    param.status === 'NO_DATA' ||
    param.observation_count === 0 ||
    param.latest_value === null ||
    param.latest_value === undefined;

  const isDeviation = param.status === 'DEVIATION' || param.deviation_count > 0;
  const maxScale = (param.threshold_limit ? param.threshold_limit * 1.8 : 200) || 100;
  const currentVal = param.latest_value ?? 0;
  const needlePct = Math.min(Math.max((currentVal / maxScale) * 100, 2), 98);
  const thresholdPct = param.threshold_limit
    ? Math.min(Math.max((param.threshold_limit / maxScale) * 100, 5), 95)
    : null;

  return (
    <div
      className={clsx(
        'p-3 rounded-lg border space-y-2 select-none transition-colors font-mono',
        isNoData
          ? 'bg-[#0D100F]/60 border-dashed border-[#232A26]'
          : isDeviation
          ? 'bg-rose-950/15 border-rose-900/60'
          : 'bg-[#121614] border-[#1B211E]'
      )}
    >
      {/* Top row: Parameter name and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-200 text-xs">{param.parameter_name}</span>
          {param.threshold_limit && (
            <span className="text-[10px] text-slate-500">
              (Statutory Limit: {param.threshold_limit} {param.unit})
            </span>
          )}
        </div>

        {isNoData ? (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#171B18] text-slate-500 border border-[#242C27]">
            NO DATA
          </span>
        ) : (
          <span
            className={clsx(
              'px-2 py-0.5 rounded text-[9.5px] font-bold uppercase border',
              isDeviation
                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
            )}
          >
            {isDeviation ? 'LIMIT DEVIATION' : 'STATUTORY NORMAL'}
          </span>
        )}
      </div>

      {/* Measurement value */}
      <div>
        {isNoData ? (
          <p className="text-xs text-slate-500 italic">No observation recorded in selected time window.</p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className={clsx('text-xl font-bold', isDeviation ? 'text-rose-400' : 'text-slate-100')}>
              {param.latest_value}
            </span>
            <span className="text-xs text-slate-400">{param.unit}</span>
            {isDeviation && (
              <span className="text-[10.5px] text-rose-400 font-semibold">
                (+{((currentVal - (param.threshold_limit || 0))).toFixed(1)} {param.unit} above threshold)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Visual Linear Scale Gauge */}
      {!isNoData && (
        <div className="space-y-1 pt-1">
          <div className="relative w-full bg-[#1A201D] h-2 rounded-full overflow-hidden">
            {/* Safe vs Danger zone background */}
            {thresholdPct && (
              <div
                style={{ width: `${thresholdPct}%` }}
                className="absolute left-0 top-0 h-full bg-emerald-900/40"
              />
            )}
            {/* Active filled bar */}
            <div
              style={{
                width: `${needlePct}%`,
                backgroundColor: isDeviation ? '#f43f5e' : '#10b981'
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>

          {/* Scale labels */}
          <div className="flex justify-between text-[8.5px] text-slate-500">
            <span>0</span>
            {param.threshold_limit && (
              <span className="text-amber-400 font-semibold">
                Threshold: {param.threshold_limit} {param.unit}
              </span>
            )}
            <span>{maxScale} {param.unit}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENT 5: KPI Card
// ============================================================================

interface KpiCardProps {
  label: string;
  value: number | string | null;
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
        return 'border-[#1B211E] hover:border-rose-500/50 bg-[#0D100F]';
      case 'WARNING':
        return 'border-[#1B211E] hover:border-amber-500/50 bg-[#0D100F]';
      case 'NORMAL':
        return 'border-[#1B211E] hover:border-emerald-500/50 bg-[#0D100F]';
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
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase truncate">
          {label}
        </span>
        <Icon className={clsx('w-3.5 h-3.5 shrink-0', getStatusColor())} />
      </div>

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
// HELPER: Human-Friendly Feature Names for Predictive Risk
// ============================================================================
const formatHumanRiskFactor = (featureKey: string): string => {
  const map: Record<string, string> = {
    sensor_critical_anomaly_count_24h: 'Critical sensor anomalies in the last 24 hours',
    sensor_anomaly_count_24h: 'Recent sensor anomaly activity',
    methane_ch4_max_1h: 'Elevated methane concentration (CH4)',
    co_ppm_max_1h: 'Carbon monoxide gas surge (CO)',
    air_velocity_min_1h: 'Ventilation velocity drop below statutory threshold',
    silence_to_risk_drift: 'Telemetry silence & sensor communication gap drift',
    dgms_violation_count_active: 'Active statutory DGMS violation backlog',
    incident_escalation_history: 'Historical incident escalation pattern',
    seismic_vibration_max: 'Strata seismic vibration micro-tremor'
  };

  if (map[featureKey]) return map[featureKey];
  return featureKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// ============================================================================
// MAIN PAGE COMPONENT: Governance Intelligence Center
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

  // State: Expand technical feature details
  const [showTechnicalFeatures, setShowTechnicalFeatures] = useState<boolean>(false);
  const [selectedEnvMetric, setSelectedEnvMetric] = useState<string>('PM10');

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

  // Event Markers for Safety
  const safetyEventMarkers = useMemo<ChartEventMarker[]>(() => {
    const markers: ChartEventMarker[] = [];
    (safety?.drilldown_entities || []).forEach((e) => {
      if (e.timestamp) {
        markers.push({
          date: e.timestamp.split('T')[0],
          type: e.entity_type === 'TELEMETRY_ANOMALY' ? 'ANOMALY' : 'INCIDENT',
          label: `${e.code}: ${e.title}`,
          severity: e.severity,
          entityId: e.id
        });
      }
    });
    return markers;
  }, [safety]);

  // Event Markers for Compliance
  const complianceEventMarkers = useMemo<ChartEventMarker[]>(() => {
    const markers: ChartEventMarker[] = [];
    (compliance?.drilldown_entities || []).forEach((e) => {
      if (e.timestamp) {
        markers.push({
          date: e.timestamp.split('T')[0],
          type: e.entity_type === 'FIELD_INSPECTION' ? 'INSPECTION' : e.entity_type === 'CORRECTIVE_ACTION' ? 'ACTION' : 'ANOMALY',
          label: `${e.code}: ${e.title}`,
          severity: e.severity,
          entityId: e.id
        });
      }
    });
    return markers;
  }, [compliance]);

  // Fetch all domain datasets
  const fetchAllAnalytics = useCallback(async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    const errors: Record<string, string | null> = {};

    const sDate = timeRange === 'CUSTOM' ? customStart : undefined;
    const eDate = timeRange === 'CUSTOM' ? customEnd : undefined;

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

  const openDrillDown = (title: string, entities: DrillDownEntityDTO[]) => {
    setDrillDownTitle(title);
    setDrillDownEntities(entities);
    setDrillDownDrawerOpen(true);
  };

  const handleAskCopilot = (_contextPrompt: string) => {
    setCurrentTab('copilot');
  };

  if (!selectedMine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-mono text-sm space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <span>SELECT AN AUTHORIZED MINE TO ACCESS GOVERNANCE INTELLIGENCE</span>
      </div>
    );
  }

  const isDataSimulated =
    overview?.data_quality.is_simulated === 'YES' ||
    overview?.data_quality.data_mode === 'SIMULATED' ||
    overview?.data_quality.data_mode === 'DEMO';

  // Dynamic "What Changed" Items derived strictly from real API metrics & deltas
  const whatChangedItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: any;
      severity: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'INFO';
      title: string;
      description: string;
      actionText: string;
      action: () => void;
    }> = [];

    // 1. Backend-computed "what_changed" narrative items
    if (overview?.what_changed && overview.what_changed.length > 0) {
      overview.what_changed.forEach((wc, idx) => {
        let Icon = Info;
        let action = () => setCurrentTab('reports');
        let actionText = 'VIEW AUDIT →';
        if (wc.domain === 'SAFETY') {
          Icon = ShieldAlert;
          action = () => {
            if (safety?.drilldown_entities) openDrillDown('SAFETY EVIDENCE & AUDIT', safety.drilldown_entities);
            else setCurrentTab('incidents');
          };
          actionText = 'VIEW EVIDENCE →';
        } else if (wc.domain === 'COMPLIANCE') {
          Icon = FileText;
          action = () => setCurrentTab('violations');
          actionText = 'VIEW VIOLATIONS →';
        } else if (wc.domain === 'PREDICTIVE_RISK') {
          Icon = Activity;
          action = () => setCurrentTab('predictive-risk');
          actionText = 'VIEW 3D HOTSPOT →';
        } else if (wc.domain === 'PRODUCTION') {
          Icon = Pickaxe;
          action = () => setCurrentTab('production');
          actionText = 'VIEW REPORT →';
        } else if (wc.domain === 'ENVIRONMENT') {
          Icon = Leaf;
          action = () => setCurrentTab('environment');
          actionText = 'VIEW SENSORS →';
        }

        items.push({
          id: `be-${idx}`,
          icon: Icon,
          severity: (wc.severity as any) || 'INFO',
          title: wc.title,
          description: wc.description || wc.detail || '',
          actionText,
          action
        });
      });
      return items;
    }

    // 2. Client-side fallback computation if overview.what_changed is empty
    if (overview?.total_incidents) {
      const pct = overview.total_incidents.percentage_delta;
      if (pct && pct > 0) {
        items.push({
          id: 'safety-incidents-up',
          icon: ShieldAlert,
          severity: 'CRITICAL',
          title: 'Incident Frequency Increased',
          description: `Safety incidents increased by +${pct}% compared to the previous comparison window.`,
          actionText: 'VIEW EVIDENCE →',
          action: () => {
            if (safety?.drilldown_entities) openDrillDown('SAFETY INCIDENTS EVIDENCE', safety.drilldown_entities);
            else setCurrentTab('incidents');
          }
        });
      } else if (overview.open_incidents.current_value > 0) {
        items.push({
          id: 'safety-open',
          icon: AlertTriangle,
          severity: 'WARNING',
          title: `${overview.open_incidents.current_value} Safety Incidents Open`,
          description: `Active incidents requiring triage in ${selectedMine.name}.`,
          actionText: 'OPEN RECORD →',
          action: () => setCurrentTab('incidents')
        });
      }
    }

    if (compliance?.corrective_actions_overdue && compliance.corrective_actions_overdue > 0) {
      items.push({
        id: 'compliance-overdue',
        icon: FileText,
        severity: 'CRITICAL',
        title: `${compliance.corrective_actions_overdue} Overdue Statutory Remedial Actions`,
        description: 'DGMS statutory response window expired for assigned corrective actions.',
        actionText: 'VIEW VIOLATIONS →',
        action: () => setCurrentTab('violations')
      });
    } else if (compliance?.open_violations && compliance.open_violations > 0) {
      items.push({
        id: 'compliance-open',
        icon: FileText,
        severity: 'WARNING',
        title: `${compliance.open_violations} Open DGMS Violations`,
        description: `${compliance.corrective_actions_pending} remedial actions pending resolution.`,
        actionText: 'OPEN RECORD →',
        action: () => setCurrentTab('violations')
      });
    }

    if (environment?.active_deviations && environment.active_deviations > 0) {
      const devParams = (environment.parameters || []).filter((p) => p.status === 'DEVIATION');
      const paramNames = devParams.map((p) => p.parameter_name).join(', ') || 'Atmospheric sensors';
      items.push({
        id: 'env-deviations',
        icon: Leaf,
        severity: 'WARNING',
        title: `${environment.active_deviations} Environmental Parameters Exceed Limit`,
        description: `Threshold breaches detected on: ${paramNames}.`,
        actionText: 'VIEW SENSORS →',
        action: () => setCurrentTab('environment')
      });
    }

    if (predictiveRisk?.latest_prediction_score && predictiveRisk.latest_prediction_score >= 60) {
      items.push({
        id: 'predictive-risk-alert',
        icon: Activity,
        severity: predictiveRisk.latest_prediction_score >= 80 ? 'CRITICAL' : 'WARNING',
        title: `Predictive Risk Escalation: ${predictiveRisk.latest_prediction_score.toFixed(1)}/100`,
        description: `30-minute machine learning outlook forecasts ${predictiveRisk.latest_severity} risk state.`,
        actionText: 'VIEW 3D HOTSPOT →',
        action: () => focusInDigitalTwin({ type: 'zone', x: 0, y: 0, z: 0, title: `${selectedMine.name} Hotspot` })
      });
    }

    if (production?.variance_percentage !== undefined) {
      const v = production.variance_percentage;
      if (Math.abs(v) >= 10) {
        items.push({
          id: 'prod-variance',
          icon: Pickaxe,
          severity: v < 0 ? 'WARNING' : 'NORMAL',
          title: `Production Output Variance: ${v > 0 ? '+' : ''}${v}%`,
          description: `Actual: ${production.actual_quantity_total?.toLocaleString()} ${production.unit} vs Target: ${production.planned_quantity_total?.toLocaleString()} ${production.unit}.`,
          actionText: 'VIEW REPORT →',
          action: () => setCurrentTab('production')
        });
      }
    }

    if (items.length === 0) {
      items.push({
        id: 'system-nominal',
        icon: CheckCircle2,
        severity: 'NORMAL',
        title: 'All Governance Domains Within Nominal Limits',
        description: 'No critical escalations, SLA breaches, or statutory deviations recorded in this analytical window.',
        actionText: 'VIEW AUDIT →',
        action: () => setCurrentTab('reports')
      });
    }

    return items;
  }, [overview, safety, compliance, environment, predictiveRisk, production, selectedMine]);

  // Selected environmental parameter helper
  const currentEnvParam = useMemo(() => {
    return (environment?.parameters || []).find((p) => p.parameter_name === selectedEnvMetric);
  }, [environment, selectedEnvMetric]);

  const currentEnvTrend = useMemo(() => {
    if (environment?.parameter_trends && environment.parameter_trends[selectedEnvMetric]) {
      return environment.parameter_trends[selectedEnvMetric];
    }
    return (environment?.readings_over_time || []).filter((r) =>
      r.label?.startsWith(selectedEnvMetric)
    );
  }, [environment, selectedEnvMetric]);

  return (
    <div className="space-y-5 pb-12">
      {/* ==================================================================== */}
      {/* 1. COMMAND HEADER & CONTROLS */}
      {/* ==================================================================== */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 md:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm">
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
        <KpiCard
          label="GOVERNANCE RISK"
          value={overview?.critical_incidents?.current_value ?? 0}
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

        <KpiCard
          label="OPEN INCIDENTS"
          value={overview?.open_incidents?.current_value ?? 0}
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

        <KpiCard
          label="OPEN VIOLATIONS"
          value={overview?.open_violations?.current_value ?? 0}
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

        <KpiCard
          label="SLA BREACHES"
          value={overview?.sla_breaches?.current_value ?? 0}
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

        <KpiCard
          label="PREDICTIVE HOTSPOTS"
          value={overview?.predictive_high_hotspots?.current_value ?? 0}
          percentageDelta={overview?.predictive_high_hotspots?.percentage_delta}
          status={(overview?.predictive_high_hotspots?.current_value ?? 0) > 0 ? 'CRITICAL' : 'NORMAL'}
          dataMode="MODEL"
          icon={Activity}
          isLoading={isLoading}
          onClick={() => setCurrentTab('predictive-risk')}
        />

        <KpiCard
          label="OPEN FIELD TASKS"
          value={overview?.field_inspections_pending?.current_value ?? 0}
          percentageDelta={overview?.field_inspections_pending?.percentage_delta}
          status="INFO"
          dataMode={overview?.field_inspections_pending?.data_mode || 'OPERATIONAL'}
          icon={ClipboardCheck}
          isLoading={isLoading}
          onClick={() => setCurrentTab('field-operations')}
        />

        <KpiCard
          label="ENV DEVIATIONS"
          value={overview?.environmental_deviations?.current_value ?? 0}
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

        <KpiCard
          label="OPEN GRIEVANCES"
          value={overview?.open_grievances?.current_value ?? 0}
          percentageDelta={overview?.open_grievances?.percentage_delta}
          status="INFO"
          dataMode={overview?.open_grievances?.data_mode || 'OPERATIONAL'}
          icon={MessageSquare}
          isLoading={isLoading}
          onClick={() => setCurrentTab('grievances')}
        />
      </div>

      {/* ==================================================================== */}
      {/* 3. "WHAT CHANGED" OPERATIONAL DELTA PANEL */}
      {/* ==================================================================== */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#1B211E]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-mono font-bold text-slate-200 tracking-wider uppercase">
              {t('whatChangedLabel')}
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            COMPARED AGAINST PREVIOUS {timeRange.replace(/_/g, ' ')} PERIOD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {whatChangedItems.map((item) => {
            const Icon = item.icon;
            const getBorder = () => {
              if (item.severity === 'CRITICAL') return 'border-rose-900/60 bg-rose-950/10';
              if (item.severity === 'WARNING') return 'border-amber-900/60 bg-amber-950/10';
              if (item.severity === 'NORMAL') return 'border-emerald-900/60 bg-emerald-950/10';
              return 'border-[#1B211E] bg-[#121614]';
            };

            const getIconColor = () => {
              if (item.severity === 'CRITICAL') return 'text-rose-400';
              if (item.severity === 'WARNING') return 'text-amber-400';
              if (item.severity === 'NORMAL') return 'text-emerald-400';
              return 'text-slate-400';
            };

            return (
              <div
                key={item.id}
                className={clsx('p-3 rounded-md border flex flex-col justify-between space-y-2', getBorder())}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={clsx('w-4 h-4 shrink-0 mt-0.5', getIconColor())} />
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold font-mono text-slate-200 truncate">{item.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.description}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1B211E] flex justify-end">
                  <button
                    onClick={item.action}
                    className="text-[10.5px] font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    {item.actionText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. CROSS-DOMAIN ALERT STRIP (ATTENTION REQUIRED) */}
      {/* ==================================================================== */}
      <div className="bg-[#101311] border border-[#1E2521] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-xs font-mono font-bold text-amber-400 tracking-wider uppercase">
            {t('attentionRequiredLabel')}:
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setCurrentTab('incidents')}
              className="px-2.5 py-1 rounded bg-[#171B18] hover:bg-[#202622] border border-[#242C27] text-rose-400 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🔴</span>
              <span>{overview?.critical_incidents?.current_value ?? 0} Critical Incidents</span>
            </button>
            <button
              onClick={() => setCurrentTab('environment')}
              className="px-2.5 py-1 rounded bg-[#171B18] hover:bg-[#202622] border border-[#242C27] text-amber-400 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🟠</span>
              <span>{overview?.environmental_deviations?.current_value ?? 0} Env Deviations</span>
            </button>
            <button
              onClick={() => setCurrentTab('field-operations')}
              className="px-2.5 py-1 rounded bg-[#171B18] hover:bg-[#202622] border border-[#242C27] text-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🟠</span>
              <span>{overview?.field_inspections_pending?.current_value ?? 0} Pending Tasks</span>
            </button>
            <button
              onClick={() => setCurrentTab('violations')}
              className="px-2.5 py-1 rounded bg-[#171B18] hover:bg-[#202622] border border-[#242C27] text-emerald-400 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>🟢</span>
              <span>{overview?.overdue_corrective_actions?.current_value ?? 0} Overdue Actions</span>
            </button>
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
      {/* 5. MAIN ANALYTICAL GRID */}
      {/* ==================================================================== */}
      {activeViewMode === 'MINE' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ---------------------------------------------------------------- */}
          {/* PANEL 1: SAFETY INTELLIGENCE (DUAL LINE + ANOMALY OVERLAY) */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('safetyIntelligenceLabel')} — INCIDENT ACTIVITY
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentTab('incidents')}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('viewIncidents')}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
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
                  <p className="text-lg font-bold font-mono text-amber-400">{safety?.anomalies_count ?? 0}</p>
                </div>
              </div>

              {/* Time-Series Multi-Line Chart: Incidents + Anomalies */}
              <div className="space-y-1 bg-[#121614] p-3 rounded-lg border border-[#1B211E]">
                <InteractiveTimeSeriesChart
                  data={(safety?.incidents_by_day || []).map((p) => ({
                    date: p.date,
                    value: p.count || p.value,
                    count: p.count,
                    severity: p.severity
                  }))}
                  color="#f43f5e"
                  unit="events"
                  height={260}
                  secondaryData={(safety?.anomalies_by_day || []).map((p) => ({
                    date: p.date,
                    value: p.count || p.value,
                    count: p.count
                  }))}
                  secondaryColor="#f59e0b"
                  secondaryLabel="ANOMALIES"
                  eventMarkers={safetyEventMarkers}
                  onMarkerClick={(marker) => {
                    if (safety?.drilldown_entities) {
                      openDrillDown(`SAFETY EVENT: ${marker.label}`, safety.drilldown_entities);
                    }
                  }}
                  onPointClick={(point) => {
                    if (safety?.drilldown_entities) {
                      openDrillDown(`SAFETY EVIDENCE (${point.date})`, safety.drilldown_entities);
                    }
                  }}
                  emptyMessage="NO SAFETY INCIDENT OBSERVATIONS IN RANGE"
                />
              </div>

              {/* Proportional Incident Severity Horizontal Breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Incidents by Severity Breakdown</p>
                <ProportionalBarDistribution
                  items={(safety?.incidents_by_severity || []).map((s) => ({
                    category: s.category,
                    count: s.count,
                    percentage: s.percentage,
                    severity: s.category
                  }))}
                  unit="records"
                  emptyLabel="NO SEVERITY RECORDS IN PERIOD"
                  onItemClick={(item) => {
                    if (safety?.drilldown_entities) {
                      openDrillDown(`SAFETY SEVERITY: ${item.category}`, safety.drilldown_entities);
                    }
                  }}
                />
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
          {/* PANEL 2: COMPLIANCE INTELLIGENCE (MULTI-LINE ACTIVITY) */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('complianceIntelligenceLabel')} — STATUTORY WORKFLOW
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentTab('violations')}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('viewViolations')}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
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

              {/* Multi-Line Chart: Violations vs Actions vs Resolved */}
              <div className="space-y-1 bg-[#121614] p-3 rounded-lg border border-[#1B211E]">
                <InteractiveTimeSeriesChart
                  data={(compliance?.violations_by_day || []).map((p) => ({
                    date: p.date,
                    value: p.count || p.value,
                    count: p.count
                  }))}
                  color="#f43f5e"
                  unit="events"
                  height={260}
                  secondaryData={(compliance?.actions_by_day || []).map((p) => ({
                    date: p.date,
                    value: p.count || p.value,
                    count: p.count
                  }))}
                  secondaryColor="#f59e0b"
                  secondaryLabel="ACTIONS ISSUED"
                  tertiaryData={(compliance?.resolved_by_day || []).map((p) => ({
                    date: p.date,
                    value: p.count || p.value,
                    count: p.count
                  }))}
                  tertiaryColor="#10b981"
                  tertiaryLabel="ACTIONS RESOLVED"
                  eventMarkers={complianceEventMarkers}
                  onMarkerClick={(marker) => {
                    if (compliance?.drilldown_entities) {
                      openDrillDown(`COMPLIANCE EVENT: ${marker.label}`, compliance.drilldown_entities);
                    }
                  }}
                  emptyMessage="NO COMPLIANCE ACTIVITY IN RANGE"
                />
              </div>

              {/* Governance Pipeline Flow */}
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Governance Remedial Pipeline</p>
                <TraceableGovernancePipeline
                  stages={[
                    {
                      label: 'VIOLATIONS',
                      count: compliance?.total_violations ?? 0,
                      status: (compliance?.total_violations ?? 0) > 0 ? 'ATTENTION' : 'NORMAL',
                      subtext: `${compliance?.open_violations ?? 0} active`
                    },
                    {
                      label: 'ACTIONS',
                      count: compliance?.corrective_actions_total ?? 0,
                      status: (compliance?.corrective_actions_pending ?? 0) > 0 ? 'ATTENTION' : 'NORMAL',
                      subtext: `${compliance?.corrective_actions_pending ?? 0} in progress`
                    },
                    {
                      label: 'OVERDUE SLA',
                      count: compliance?.corrective_actions_overdue ?? 0,
                      status: (compliance?.corrective_actions_overdue ?? 0) > 0 ? 'CRITICAL' : 'NORMAL',
                      subtext: (compliance?.corrective_actions_overdue ?? 0) > 0 ? 'Breached' : 'Within window'
                    },
                    {
                      label: 'ESCALATIONS',
                      count: compliance?.escalations_count ?? 0,
                      status: (compliance?.escalations_count ?? 0) > 0 ? 'CRITICAL' : 'NORMAL',
                      subtext: 'To DGMS'
                    }
                  ]}
                  onStageClick={() => setCurrentTab('violations')}
                />
              </div>

              {/* Violations by Statute */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Violations by Statute Category</p>
                <ProportionalBarDistribution
                  items={(compliance?.violations_by_statute || []).map((v) => ({
                    category: v.category,
                    count: v.count,
                    percentage: v.percentage
                  }))}
                  defaultColor="#fb923c"
                  unit="notices"
                  emptyLabel="NO STATUTORY VIOLATIONS IN PERIOD"
                  onItemClick={() => setCurrentTab('violations')}
                />
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
          {/* PANEL 3: PRODUCTION PERFORMANCE (ACTUAL VS TARGET REFERENCE) */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <Pickaxe className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('productionPerformanceLabel')} — ACTUAL VS TARGET
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentTab('production')}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>{t('productionLogs')}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Stats: Actual vs Planned Target */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Configured Target</p>
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
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Variance vs Target</p>
                  <p
                    className={clsx(
                      'text-lg font-bold font-mono',
                      (production?.variance_percentage ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {production?.variance_percentage !== undefined
                      ? `${production.variance_percentage > 0 ? '+' : ''}${production.variance_percentage}%`
                      : '—'}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">
                    {production?.variance_percentage !== undefined
                      ? production.variance_percentage >= 0
                        ? 'Above configured target'
                        : 'Below configured target'
                      : 'Target variance'}
                  </span>
                </div>
              </div>

              {/* Production Time-Series Line Chart with Reference Target Line */}
              <div className="space-y-1 bg-[#121614] p-3 rounded-lg border border-[#1B211E]">
                <InteractiveTimeSeriesChart
                  data={(production?.production_trend || []).map((p) => ({
                    date: p.date,
                    value: p.value,
                    observedValue: p.observed_value !== undefined ? p.observed_value : p.value,
                    targetValue: p.target_value,
                    count: p.count
                  }))}
                  color="#10b981"
                  unit={production?.unit || 'TONNES'}
                  height={260}
                  showTargetLine={production?.planned_quantity_total !== undefined && (production?.production_trend || []).length > 0}
                  targetValue={
                    production?.planned_quantity_total && (production?.production_trend || []).length > 0
                      ? Math.round(production.planned_quantity_total / production.production_trend.length)
                      : undefined
                  }
                  targetLabel="TARGET"
                  emptyMessage="NO PRODUCTION LOG RECORDS IN WINDOW"
                />
              </div>

              {/* Shift Breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Production Output by Shift</p>
                <ProportionalBarDistribution
                  items={(production?.production_by_shift || []).map((s) => ({
                    category: s.category,
                    count: s.count,
                    percentage: s.percentage
                  }))}
                  defaultColor="#10b981"
                  unit="TONNES"
                  emptyLabel="NO SHIFT RECORDS IN PERIOD"
                  onItemClick={() => setCurrentTab('production')}
                />
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
          {/* PANEL 4: PREDICTIVE RISK — 30 MIN HORIZON (DUAL OBSERVED/PREDICTED) */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
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
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Predicted Risk</p>
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
                  <span className="text-[9px] font-mono text-slate-500">{predictiveRisk?.horizon_minutes || 30} MIN OUTLOOK</span>
                </div>
                <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E]">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Spatial Hotspots</p>
                  <p className={clsx('text-lg font-bold font-mono', (predictiveRisk?.active_hotspots_count ?? 0) > 0 ? 'text-rose-400' : 'text-slate-100')}>
                    {predictiveRisk?.active_hotspots_count ?? 0}
                  </p>
                  <span className="text-[9px] font-mono text-slate-500">MINE ZONES</span>
                </div>
              </div>

              {/* Predictive Risk Timeline with Configured Thresholds & Dual Line */}
              <div className="space-y-1 bg-[#121614] p-3 rounded-lg border border-[#1B211E]">
                <InteractiveTimeSeriesChart
                  data={(predictiveRisk?.risk_trend || []).map((p) => ({
                    date: p.date,
                    value: p.value,
                    observedValue: p.observed_value !== undefined ? p.observed_value : p.value,
                    forecastValue: p.forecast_value !== undefined ? p.forecast_value : p.value,
                    probability: p.probability,
                    severity: p.severity,
                    count: p.count
                  }))}
                  color="#a855f7"
                  unit="risk pts"
                  height={260}
                  isPredictive={true}
                  predictionHorizonMin={30}
                  thresholds={[
                    { value: 80, label: 'CRIT (80)', color: '#f43f5e', dashed: true },
                    { value: 60, label: 'WARN (60)', color: '#fb923c', dashed: true }
                  ]}
                  emptyMessage="NO PREDICTIVE RISK TIMELINE IN RANGE"
                />
              </div>

              {/* Human-Centric Risk Contributing Factors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>KEY CONTRIBUTING RISK FACTORS</span>
                  <button
                    onClick={() => setShowTechnicalFeatures(!showTechnicalFeatures)}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showTechnicalFeatures ? 'HIDE TECHNICAL KEYS' : 'VIEW TECHNICAL KEYS'}</span>
                    {showTechnicalFeatures ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(predictiveRisk?.top_contributing_features || []).slice(0, 3).map((f, idx) => {
                    const featureKey = f.feature_name || f.feature || 'atmospheric_telemetry_delta';
                    const humanLabel = formatHumanRiskFactor(featureKey);

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-[#121614] border border-[#1B211E] flex flex-col justify-between text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-medium">{humanLabel}</span>
                          <span
                            className={clsx(
                              'font-bold text-[10px] px-1.5 py-0.5 rounded border uppercase',
                              f.importance === 'HIGH' || f.impact === 'HIGH'
                                ? 'text-rose-400 bg-rose-950/40 border-rose-900/60'
                                : 'text-amber-400 bg-amber-950/40 border-amber-900/60'
                            )}
                          >
                            {f.importance || f.impact || 'MEDIUM'} IMPACT
                          </span>
                        </div>
                        {showTechnicalFeatures && (
                          <div className="text-[9.5px] text-slate-500 font-mono pt-1 border-t border-[#1B211E]">
                            Feature Identifier: <span className="text-slate-400">{featureKey}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(!predictiveRisk?.top_contributing_features || predictiveRisk.top_contributing_features.length === 0) && (
                    <div className="text-center py-2 text-slate-500 text-[11px] font-mono border border-dashed border-[#232A26] rounded">
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
          {/* PANEL 5: ENVIRONMENTAL MONITORING (METRIC SWITCHER + CHART) */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              {/* Header with Metric Selector Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1B211E] gap-2">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('environmentalMonitoringLabel')}
                  </h2>
                </div>
                {/* Metric Selector Pills */}
                <div className="flex items-center bg-[#121614] border border-[#1B211E] rounded-md p-0.5 text-xs font-mono">
                  {['PM10', 'PM2.5', 'NOISE_DB', 'WATER_PH'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedEnvMetric(m)}
                      className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer',
                        selectedEnvMetric === m
                          ? 'bg-amber-500 text-[#080A09] font-bold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      {m.replace('_DB', '').replace('_PH', ' pH')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Environmental Telemetry Time-Series with Threshold Line */}
              <div className="space-y-1 bg-[#121614] p-3 rounded-lg border border-[#1B211E]">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pb-1">
                  <span>{selectedEnvMetric} HISTORICAL TELEMETRY</span>
                  {currentEnvParam?.threshold_limit && (
                    <span className="text-amber-400">
                      STATUTORY LIMIT: {currentEnvParam.threshold_limit} {currentEnvParam.unit}
                    </span>
                  )}
                </div>
                <InteractiveTimeSeriesChart
                  data={currentEnvTrend.map((p) => ({
                    date: p.date,
                    value: p.value,
                    count: p.count,
                    severity: p.severity
                  }))}
                  color="#06b6d4"
                  unit={currentEnvParam?.unit || ''}
                  height={260}
                  thresholds={
                    currentEnvParam?.threshold_limit
                      ? [
                          {
                            value: currentEnvParam.threshold_limit,
                            label: `LIMIT (${currentEnvParam.threshold_limit} ${currentEnvParam.unit})`,
                            color: '#f43f5e',
                            dashed: true
                          }
                        ]
                      : []
                  }
                  emptyMessage={`NO ${selectedEnvMetric} OBSERVATIONS IN WINDOW`}
                />
              </div>

              {/* Environmental Gauges Breakdown */}
              <div className="space-y-2.5">
                {(environment?.parameters || []).map((param) => (
                  <EnvironmentalGauge key={param.parameter_name} param={param} />
                ))}

                {(!environment?.parameters || environment.parameters.length === 0) && (
                  <div className="text-center py-4 text-slate-500 text-xs font-mono border border-dashed border-[#232A26] rounded">
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
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                    {t('workforceMuster')} — ATTENDANCE TREND
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentTab('workforce')}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>VIEW MUSTER</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
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

              {/* Attendance Time-Series Line Chart */}
              <div className="space-y-1 bg-[#121614] p-3 rounded-lg border border-[#1B211E]">
                <InteractiveTimeSeriesChart
                  data={(workforce?.attendance_trend || []).map((p) => ({
                    date: p.date,
                    value: p.value,
                    count: p.count
                  }))}
                  color="#3b82f6"
                  unit="%"
                  height={260}
                  thresholds={[
                    { value: 90, label: 'TARGET (90%)', color: '#10b981', dashed: true }
                  ]}
                  emptyMessage="NO HISTORICAL ATTENDANCE RECORDS IN WINDOW"
                />
              </div>

              {/* Trade Breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Worker Distribution by Trade</p>
                <ProportionalBarDistribution
                  items={(workforce?.workers_by_trade || []).slice(0, 3).map((tr) => ({
                    category: tr.category,
                    count: tr.count,
                    percentage: tr.percentage
                  }))}
                  defaultColor="#3b82f6"
                  unit="workers"
                  emptyLabel="NO TRADE CLASSIFICATIONS"
                  onItemClick={() => setCurrentTab('workforce')}
                />
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
      {/* 6. LOWER OPERATIONAL PANELS: FIELD OPS, CONTRACTORS, GRIEVANCES */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Field Operations */}
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                  {t('fieldOperations')}
                </h3>
              </div>
            </div>

            {/* Workflow Sequence */}
            <div className="p-2.5 rounded bg-[#121614] border border-[#1B211E] space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase">
                <span>INSPECTION WORKFLOW STATUS</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="text-center">
                  <span className="text-[9.5px] text-slate-500">ASSIGNED</span>
                  <p className="font-bold text-slate-200">{fieldOps?.scheduled_inspections ?? 0}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <div className="text-center">
                  <span className="text-[9.5px] text-slate-500">IN PROGRESS</span>
                  <p className="font-bold text-amber-400">{fieldOps?.in_progress_inspections ?? 0}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <div className="text-center">
                  <span className="text-[9.5px] text-slate-500">COMPLETED</span>
                  <p className="font-bold text-emerald-400">{fieldOps?.completed_inspections ?? 0}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-600" />
                <div className="text-center">
                  <span className="text-[9.5px] text-slate-500">SYNCED</span>
                  <p className="font-bold text-emerald-400">{fieldOps?.sync_accepted_count ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Evidence Hashes</p>
                <p className="font-bold text-slate-200">{fieldOps?.total_evidence_count ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Sync Status</p>
                <p className="font-bold text-emerald-400">ONLINE (SYNCED)</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentTab('field-operations')}
            className="w-full mt-3 py-2 rounded bg-[#121614] hover:bg-[#1A201D] text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{t('openFieldOperationsLabel')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Contractor Governance */}
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                  {t('contractorsSla')}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
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
            className="w-full mt-3 py-2 rounded bg-[#121614] hover:bg-[#1A201D] text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{t('viewContractorsLabel')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* PGRM Grievance Redressal */}
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-lg p-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                  {t('grievanceRedressal')} (PGRM)
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Total Filed</p>
                <p className="font-bold text-slate-200">{grievances?.total_grievances ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Resolved</p>
                <p className="font-bold text-emerald-400">{grievances?.resolved_grievances ?? 0}</p>
              </div>
              <div className="p-2 rounded bg-[#121614] border border-[#1B211E]">
                <p className="text-[10px] text-slate-500 uppercase">Open / Pending</p>
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
            className="w-full mt-3 py-2 rounded bg-[#121614] hover:bg-[#1A201D] text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{t('openPgrmWorkflowLabel')}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 7. DATA TRUST FOOTER STRIP */}
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
      {/* 8. DRILL-DOWN DRAWER (RIGHT SLIDE-OUT) */}
      {/* ==================================================================== */}
      {drillDownDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-[#0D100F] border-l border-[#1B211E] h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1B211E]">
                <div>
                  <h3 className="text-sm font-bold font-mono text-slate-100 uppercase">{drillDownTitle}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Found {drillDownEntities.length} evidence records in time window
                  </p>
                </div>
                <button
                  onClick={() => setDrillDownDrawerOpen(false)}
                  className="p-1.5 rounded hover:bg-[#1A201D] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                  <div className="text-center py-10 text-slate-500 font-mono text-xs border border-dashed border-[#232A26] rounded">
                    NO DRILL-DOWN EVIDENCE RECORDS AVAILABLE
                  </div>
                )}
              </div>
            </div>

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
      {/* 9. CUSTOM DATE RANGE MODAL */}
      {/* ==================================================================== */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#0D100F] border border-[#1B211E] rounded-lg p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1B211E]">
              <h3 className="font-bold text-slate-100 uppercase">SET CUSTOM ANALYTICAL WINDOW</h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
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
                className="px-3 py-1.5 rounded bg-[#121614] hover:bg-[#1A201D] text-slate-400 transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setTimeRange('CUSTOM');
                  setShowCustomModal(false);
                }}
                className="px-3 py-1.5 rounded bg-amber-500 text-[#080A09] font-bold hover:bg-amber-400 transition-colors cursor-pointer"
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
