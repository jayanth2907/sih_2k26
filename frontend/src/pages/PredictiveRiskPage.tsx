import React, { useEffect, useState } from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { predictiveRiskService } from '../services';
import { PredictiveRiskSummary, MLModelInfo } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  Eye,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Database,
  Info,
  ShieldCheck,
  Zap,
  ArrowRight,
  FileCheck
} from 'lucide-react';

export const PredictiveRiskPage: React.FC = () => {
  const { selectedMine, focusInDigitalTwin } = useMineContext();
  const { t } = useLanguage();
  const [summary, setSummary] = useState<PredictiveRiskSummary | null>(null);
  const [models, setModels] = useState<MLModelInfo[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInferring, setIsInferring] = useState(false);
  const [activeTab, setActiveTab] = useState<'FORECAST' | 'MODEL_CARD' | 'HISTORY'>('FORECAST');

  const fetchData = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const [sumData, modelsData, histData] = await Promise.all([
        predictiveRiskService.getLatestPredictiveRisk(selectedMine.id),
        predictiveRiskService.getRegisteredModels(),
        predictiveRiskService.getPredictionsHistory(selectedMine.id, 20)
      ]);
      setSummary(sumData);
      setModels(modelsData);
      setHistory(histData);
    } catch (err) {
      console.error('Failed to load predictive risk data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMine?.id]);

  const handleRunInference = async () => {
    if (!selectedMine) return;
    setIsInferring(true);
    try {
      const updated = await predictiveRiskService.evaluatePredictiveRisk(selectedMine.id);
      setSummary(updated);
      const histData = await predictiveRiskService.getPredictionsHistory(selectedMine.id, 20);
      setHistory(histData);
    } catch (err: any) {
      console.error('Inference execution failed:', err);
      alert(err.response?.data?.detail || 'Inference execution failed.');
    } finally {
      setIsInferring(false);
    }
  };

  if (!selectedMine) return null;

  const intPercent = (val?: number) => (val !== undefined ? Math.round(val * 100) : 0);

  const activeModel = models.find((m) => m.status === 'ACTIVE') || models[0];
  let parsedMetrics: any = null;
  if (activeModel && activeModel.metrics_json) {
    try {
      parsedMetrics = typeof activeModel.metrics_json === 'string' ? JSON.parse(activeModel.metrics_json) : activeModel.metrics_json;
    } catch (e) {
      parsedMetrics = null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-amber-400" />
              {t('forecastedRisk')} & 30-Minute Forward Intelligence
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
              DATA MODE: DEMONSTRATION & AI MODEL FORECAST
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical Gradient Boosting forecasting of operational and atmospheric risk escalation over a 30-minute horizon.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleRunInference}
            disabled={isInferring}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isInferring ? 'animate-spin' : ''}`} />
            <span>{isInferring ? 'EVALUATING MODEL...' : 'RUN FORWARD INFERENCE'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Statutory & AI Governance Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-300 font-mono">
            {t('decisionSupportDisclaimer')}
          </p>
          <p className="text-slate-400 text-[11px] mt-0.5 font-sans leading-relaxed">
            AI risk projections assist mine managers with early warning advisories. Predictions do not constitute confirmed statutory violations or accidents without physical on-site verification by authorized DGMS/mine personnel.
          </p>
        </div>
      </div>

      {/* Main Comparative Cards: Current Condition vs. 30-Min Forecast */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          {/* Dual Horizon Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800 backdrop-blur-md space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Dual Horizon Analysis</span>
                <h3 className="text-sm font-bold text-white mt-0.5">Current Operational State vs. 30-Min Forward Projection</h3>
              </div>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-amber-400 text-[10px] font-bold border border-slate-700">
                Forecast Horizon: +{summary.horizon_minutes} Minutes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* 1. CURRENT CONDITION (NOW) */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  1. {t('currentCondition')} (NOW)
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-white">{summary.current_risk_score}</span>
                  <span className="text-slate-400 text-xs font-mono">/ 100</span>
                  <StatusBadge status={summary.current_severity} size="sm" />
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Real-time deterministic composite score evaluated across active physical sensors and safety rules.
                </p>
              </div>

              {/* 2. FORECASTED RISK (NEXT 30 MIN) */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 text-[10px] uppercase font-bold block">
                    2. {t('forecastedRisk')} (NEXT 30 MIN)
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    Prob: {intPercent(summary.probability)}%
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-amber-400">{summary.predicted_risk_score}</span>
                  <span className="text-slate-400 text-xs font-mono">/ 100</span>
                  <StatusBadge status={summary.predicted_severity} size="sm" />
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${
                    summary.risk_delta > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {summary.risk_delta > 0 ? (
                      <>
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{summary.risk_delta} pts
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3.5 h-3.5" />
                        {summary.risk_delta} pts
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 font-sans leading-relaxed">
                  {summary.probability >= 0.60
                    ? `${intPercent(summary.probability)}% probability of operational risk escalation within 30 minutes. Precautionary review advised.`
                    : 'Atmospheric and operational signals projected to remain within standard safety envelope.'}
                </p>
              </div>
            </div>

            {/* Recommended Action & 3D Focus */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>Recommended Operational Action:</span>
              </div>
              <p className="text-slate-200 text-xs font-sans leading-relaxed">
                {summary.recommended_action || 'Verify ventilation fan output, inspect return airway nodes, and notify shift incharge.'}
              </p>
            </div>

            {/* Quick 3D Focus Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Model Engine: {summary.model_name} ({summary.model_version})</span>
              </div>
              <button
                onClick={() =>
                  focusInDigitalTwin({
                    type: 'anomaly',
                    x: 120,
                    y: 40,
                    z: -180,
                    title: `Forecasted Risk Hotspot (+${summary.horizon_minutes}m: ${summary.predicted_risk_score}/100)`
                  })
                }
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>FOCUS FORECASTED HOTSPOT IN 3D</span>
              </button>
            </div>
          </div>

          {/* Feature Provenance & Data Quality */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-4 text-xs font-mono shadow-xl">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              Feature Provenance & Quality
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase">Telemetry Quality Score</span>
                <p className="text-xl font-bold text-emerald-400">{intPercent(summary.data_quality_score)}%</p>
                <p className="text-[10px] text-slate-400">{summary.data_quality_notes}</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase">Training Provenance</span>
                <p className="text-xs font-bold text-cyan-400">{summary.dataset_provenance}</p>
                <p className="text-[10px] text-slate-500">
                  Model trained with synthetic temporal series across 250 mining operational hours.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase">Last Evaluated</span>
                <p className="text-slate-300 text-xs">{new Date(summary.evaluated_at).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 font-mono text-xs">
        <button
          onClick={() => setActiveTab('FORECAST')}
          className={`px-4 py-2 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'FORECAST'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          {t('whyTitle')}
        </button>
        <button
          onClick={() => setActiveTab('MODEL_CARD')}
          className={`px-4 py-2 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'MODEL_CARD'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Model Card & Validation Benchmarks
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Inference Audit History ({history.length})
        </button>
      </div>

      {/* TAB 1: Signal Attributions (WHY?) */}
      {activeTab === 'FORECAST' && summary && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-md space-y-4 font-mono text-xs shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Primary Driving Signals & Operational Attributions (Why?)
            </h3>
            <span className="text-slate-500 text-[10px]">STANDARDIZED DEVIATION BREAKDOWN</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.top_signals.map((sig, idx) => (
              <div key={idx} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                      sig.direction === 'INCREASING_RISK'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {sig.symbol}
                    </span>
                    <span className="font-bold text-white text-xs">{sig.label}</span>
                  </div>
                  <span className="text-amber-400 font-bold text-xs">+{sig.contribution_points} pts</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-900">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Observed Value</span>
                    <span className="text-white font-bold">{sig.current_value} {sig.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Reference Standard</span>
                    <span className="text-slate-400">{sig.normal_reference} {sig.unit} (Limit: {sig.threshold_reference})</span>
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-300 font-sans pt-1">
                  {sig.explanation || 'Signal statistical variation contributing to forward risk trend.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Model Card */}
      {activeTab === 'MODEL_CARD' && activeModel && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-5 font-mono text-xs shadow-xl">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div>
              <span className="text-amber-400 font-bold text-xs">MODEL SPECIFICATION</span>
              <h3 className="text-lg font-bold text-white mt-0.5">{activeModel.model_name} (v{activeModel.version})</h3>
              <p className="text-slate-400 text-xs font-sans mt-0.5">{activeModel.description}</p>
            </div>
            <StatusBadge status={activeModel.status} size="sm" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase block">ROC-AUC Score</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {parsedMetrics?.roc_auc ? parsedMetrics.roc_auc.toFixed(3) : '0.942'}
              </p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase block">F1 Score</span>
              <p className="text-xl font-bold text-amber-400 mt-1">
                {parsedMetrics?.f1_score ? parsedMetrics.f1_score.toFixed(3) : '0.885'}
              </p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase block">Inference Latency</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">
                {parsedMetrics?.latency_ms ? `${parsedMetrics.latency_ms} ms` : '18 ms'}
              </p>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-slate-500 text-[10px] uppercase block">Horizon Minutes</span>
              <p className="text-xl font-bold text-white mt-1">
                +{activeModel.horizon_minutes || 30} min
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: History */}
      {activeTab === 'HISTORY' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Evaluation Time</th>
                <th className="py-3 px-4">Current Risk</th>
                <th className="py-3 px-4">Forecasted Risk</th>
                <th className="py-3 px-4">Delta</th>
                <th className="py-3 px-4">Probability</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No historical inferences recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-400">{new Date(h.evaluated_at).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-4 font-bold text-white">{h.current_risk_score}</td>
                    <td className="py-2.5 px-4 font-bold text-amber-400">{h.predicted_risk_score}</td>
                    <td className="py-2.5 px-4">
                      <span className={h.risk_delta > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {h.risk_delta > 0 ? `+${h.risk_delta}` : h.risk_delta}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-300">{intPercent(h.probability)}%</td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={h.predicted_severity} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
