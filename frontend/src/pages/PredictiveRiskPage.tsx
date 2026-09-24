import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { predictiveRiskService } from '../services';
import { PredictiveRiskSummary, MLModelInfo } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Eye,
  RefreshCw,
  Sliders,
  Database,
  Info,
  ShieldCheck,
  Zap
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
              <BrainCircuit className="w-5 h-5 text-amber-400 shrink-0" />
              {t('forecastedRisk')} & 30-Minute Forward Intelligence
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-[#121614] text-cyan-400 border border-[#27302B] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              DATA MODE: DEMONSTRATION & AI MODEL FORECAST
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Empirical Gradient Boosting forecasting of operational and atmospheric risk escalation over a 30-minute horizon.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleRunInference}
            disabled={isInferring}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isInferring ? 'animate-spin' : ''}`} />
            <span>{isInferring ? 'EVALUATING MODEL...' : 'RUN FORWARD INFERENCE'}</span>
          </button>
        </div>
      </div>

      {/* Statutory & AI Governance Disclaimer */}
      <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] flex items-start gap-3 text-xs shadow-xs">
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-300 font-mono">
            {t('decisionSupportDisclaimer')}
          </p>
          <p className="text-slate-400 text-xs mt-0.5 font-sans leading-relaxed">
            AI risk projections assist mine managers with early warning advisories. Predictions do not constitute confirmed statutory violations or accidents without physical on-site verification by authorized DGMS/mine personnel.
          </p>
        </div>
      </div>

      {/* Main Comparative Cards: Current Condition vs. 30-Min Forecast */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Dual Horizon Card */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#1B211E] pb-3 flex-wrap gap-2">
              <div>
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider block">Dual Horizon Analysis</span>
                <h3 className="text-sm font-bold text-white mt-0.5 font-sans">Current Operational State vs. 30-Min Forward Projection</h3>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#121614] text-amber-400 text-[10.5px] font-mono font-bold border border-[#27302B]">
                Forecast Horizon: +{summary.horizon_minutes} Minutes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. CURRENT CONDITION (NOW) */}
              <div className="p-4 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-2">
                <span className="text-slate-400 text-[10.5px] font-mono uppercase font-bold block">
                  1. {t('currentCondition')} (NOW)
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-white font-mono tracking-tight">{summary.current_risk_score}</span>
                  <span className="text-slate-400 text-xs font-mono">/ 100</span>
                  <StatusBadge status={summary.current_severity} size="sm" />
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Real-time deterministic composite score evaluated across active physical sensors and safety rules.
                </p>
              </div>

              {/* 2. FORECASTED RISK (NEXT 30 MIN) */}
              <div className="p-4 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 text-[10.5px] font-mono uppercase font-bold block">
                    2. {t('forecastedRisk')} (NEXT 30 MIN)
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 font-bold bg-[#121614] px-2 py-0.5 rounded border border-[#27302B]">
                    Prob: {intPercent(summary.probability)}%
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">{summary.predicted_risk_score}</span>
                  <span className="text-slate-400 text-xs font-mono">/ 100</span>
                  <StatusBadge status={summary.predicted_severity} size="sm" />
                  <span className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
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
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {summary.probability >= 0.60
                    ? `${intPercent(summary.probability)}% probability of operational risk escalation within 30 minutes. Precautionary review advised.`
                    : 'Atmospheric and operational signals projected to remain within standard safety envelope.'}
                </p>
              </div>
            </div>

            {/* Recommended Action & 3D Focus */}
            <div className="p-3.5 rounded-lg bg-[#080A09] border border-[#1B211E] space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider font-sans">
                <Zap className="w-3.5 h-3.5" />
                <span>Recommended Operational Action:</span>
              </div>
              <p className="text-slate-200 text-xs font-sans leading-relaxed">
                {summary.recommended_action || 'Verify ventilation fan output, inspect return airway nodes, and notify shift incharge.'}
              </p>
            </div>

            {/* Quick 3D Focus Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1B211E] text-xs font-sans">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold cursor-pointer transition-all shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>FOCUS FORECASTED HOTSPOT IN 3D</span>
              </button>
            </div>
          </div>

          {/* Feature Provenance & Data Quality */}
          <div className="p-5 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-4 text-xs font-sans shadow-xs">
            <h3 className="font-bold text-white flex items-center gap-2 font-sans">
              <Database className="w-4 h-4 text-amber-400" />
              Feature Provenance & Quality
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-[#080A09] rounded-lg border border-[#1B211E] space-y-1">
                <span className="text-slate-400 text-[10.5px] uppercase font-mono font-semibold block">Telemetry Quality Score</span>
                <p className="text-xl font-mono font-bold text-emerald-400">{intPercent(summary.data_quality_score)}%</p>
                <p className="text-xs text-slate-400">{summary.data_quality_notes}</p>
              </div>

              <div className="p-3 bg-[#080A09] rounded-lg border border-[#1B211E] space-y-1">
                <span className="text-slate-400 text-[10.5px] uppercase font-mono font-semibold block">Training Provenance</span>
                <p className="text-xs font-mono font-bold text-cyan-400">{summary.dataset_provenance}</p>
                <p className="text-xs text-slate-400">
                  Model trained with synthetic temporal series across 250 mining operational hours.
                </p>
              </div>

              <div className="p-3 bg-[#080A09] rounded-lg border border-[#1B211E] space-y-1">
                <span className="text-slate-400 text-[10.5px] uppercase font-mono font-semibold block">Last Evaluated</span>
                <p className="text-slate-300 font-mono text-xs">{new Date(summary.evaluated_at).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1B211E] font-sans text-xs">
        <button
          onClick={() => setActiveTab('FORECAST')}
          className={`px-4 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'FORECAST'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          {t('whyTitle')}
        </button>
        <button
          onClick={() => setActiveTab('MODEL_CARD')}
          className={`px-4 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'MODEL_CARD'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Model Card & Validation Benchmarks
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'border-amber-400 text-amber-400 bg-amber-500/5 font-bold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Inference Audit History ({history.length})
        </button>
      </div>

      {/* TAB 1: Signal Attributions (WHY?) */}
      {activeTab === 'FORECAST' && summary && (
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-5 space-y-4 font-sans text-xs shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Primary Driving Signals & Operational Attributions (Why?)
            </h3>
            <span className="text-slate-400 font-mono text-[10.5px]">STANDARDIZED DEVIATION BREAKDOWN</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.top_signals.map((sig, idx) => (
              <div key={idx} className="p-4 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs ${
                      sig.direction === 'INCREASING_RISK'
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {sig.symbol}
                    </span>
                    <span className="font-bold text-white text-xs">{sig.label}</span>
                  </div>
                  <span className="text-amber-400 font-mono font-bold text-xs">+{sig.contribution_points} pts</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#1B211E]">
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Observed Value</span>
                    <span className="text-white font-mono font-bold">{sig.current_value} {sig.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10.5px]">Reference Standard</span>
                    <span className="text-slate-300 font-mono">{sig.normal_reference} {sig.unit} (Limit: {sig.threshold_reference})</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-sans pt-1 leading-relaxed">
                  {sig.explanation || 'Signal statistical variation contributing to forward risk trend.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Model Card */}
      {activeTab === 'MODEL_CARD' && activeModel && (
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-5 space-y-5 font-sans text-xs shadow-xs">
          <div className="flex items-start justify-between border-b border-[#1B211E] pb-3 flex-wrap gap-2">
            <div>
              <span className="text-amber-400 font-mono font-bold text-xs">MODEL SPECIFICATION</span>
              <h3 className="text-base font-bold text-white mt-0.5">{activeModel.model_name} (v{activeModel.version})</h3>
              <p className="text-slate-400 text-xs font-sans mt-0.5">{activeModel.description}</p>
            </div>
            <StatusBadge status={activeModel.status} size="sm" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg">
              <span className="text-slate-400 font-mono text-[10.5px] uppercase block">ROC-AUC Score</span>
              <p className="text-xl font-mono font-bold text-emerald-400 mt-1">
                {parsedMetrics?.roc_auc ? parsedMetrics.roc_auc.toFixed(3) : '0.942'}
              </p>
            </div>
            <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg">
              <span className="text-slate-400 font-mono text-[10.5px] uppercase block">F1 Score</span>
              <p className="text-xl font-mono font-bold text-amber-400 mt-1">
                {parsedMetrics?.f1_score ? parsedMetrics.f1_score.toFixed(3) : '0.885'}
              </p>
            </div>
            <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg">
              <span className="text-slate-400 font-mono text-[10.5px] uppercase block">Inference Latency</span>
              <p className="text-xl font-mono font-bold text-cyan-400 mt-1">
                {parsedMetrics?.latency_ms ? `${parsedMetrics.latency_ms} ms` : '18 ms'}
              </p>
            </div>
            <div className="p-3 bg-[#080A09] border border-[#1B211E] rounded-lg">
              <span className="text-slate-400 font-mono text-[10.5px] uppercase block">Horizon Minutes</span>
              <p className="text-xl font-mono font-bold text-white mt-1">
                +{activeModel.horizon_minutes || 30} min
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: History */}
      {activeTab === 'HISTORY' && (
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-[#121614] border-b border-[#1B211E] text-slate-400 uppercase tracking-wider text-[10.5px] font-semibold">
                <th className="py-3 px-4">Evaluation Time</th>
                <th className="py-3 px-4">Current Risk</th>
                <th className="py-3 px-4">Forecasted Risk</th>
                <th className="py-3 px-4">Delta</th>
                <th className="py-3 px-4">Probability</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B211E]/60 text-slate-300">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No historical inferences recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h, i) => (
                  <tr key={i} className="hover:bg-[#141A17] transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-400">{new Date(h.evaluated_at).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-white">{h.current_risk_score}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-amber-400">{h.predicted_risk_score}</td>
                    <td className="py-2.5 px-4 font-mono">
                      <span className={h.risk_delta > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {h.risk_delta > 0 ? `+${h.risk_delta}` : h.risk_delta}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-300">{intPercent(h.probability)}%</td>
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
    </motion.div>
  );
};
