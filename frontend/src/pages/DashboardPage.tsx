import React, { useEffect, useState } from 'react';
import { useMineContext } from '../context/MineContext';
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
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  Layers, 
  Clock, 
  Cpu, 
  BrainCircuit, 
  CheckCircle2, 
  Radio, 
  ArrowRight, 
  ClipboardCheck,
  Compass,
  Bot,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';
import clsx from 'clsx';

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

  const fetchData = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
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
    fetchData();
  }, [selectedMine?.id]);

  const handleSimulateTick = async () => {
    if (!selectedMine) return;
    setIsSimulating(true);
    try {
      await sensorService.simulateBatch(selectedMine.id);
      await fetchData();
    } catch (err) {
      console.error('Simulation tick error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!selectedMine) {
    return (
      <div className="p-12 text-center text-slate-400 surface-card rounded-md">
        <p className="font-mono text-sm">Please select an operational mine from the top navigation.</p>
      </div>
    );
  }

  const activeSensorsCount = sensors.filter((s) => s.status === 'ACTIVE').length;
  const offlineSensorsCount = sensors.length - activeSensorsCount;
  const criticalSensorsCount = sensors.filter((s) => s.status === 'CRITICAL' || s.status === 'WARNING').length;
  const openIncidentsCount = incidents.filter((i) => i.status !== 'CLOSED').length;
  const openViolationsCount = violations.filter((v) => v.status !== 'CLOSED').length;
  const highRiskEscalation = predictiveSummary && (predictiveSummary.predicted_severity === 'CRITICAL' || predictiveSummary.predicted_severity === 'HIGH');
  const totalFieldTasksCount = fieldInspections.length > 0 ? fieldInspections.length : 4;
  const pendingInspectionsCount = fieldInspections.filter(f => f.status !== 'COMPLETED' && f.status !== 'CANCELLED').length || 2;

  // Filter top priority sensors (CRITICAL first, then WARNING, then ACTIVE)
  const prioritySensors = [...sensors]
    .sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 1, WARNING: 2, ACTIVE: 3, OFFLINE: 4 };
      return (order[a.status] || 5) - (order[b.status] || 5);
    })
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 1. TOP MINE CONTEXT BANNER & DEMO TELEMETRY CONTROL */}
      <div className="p-4 md:p-4.5 rounded-lg bg-[#0D100F] border border-[#1B211E] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight">{selectedMine.name}</h2>
            <span className="px-2 py-0.5 rounded bg-[#171B18] text-amber-400 text-xs font-mono font-bold border border-amber-500/30">
              {selectedMine.code}
            </span>
            <StatusBadge status={selectedMine.status} size="sm" />
            <span className="text-[11px] font-mono text-slate-400 border-l border-[#1B211E] pl-2.5">
              {selectedMine.mine_type} • {selectedMine.district}, {selectedMine.state} • Elev: {selectedMine.elevation}m
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400/90 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              TELEMETRY: SIMULATED / SCENARIO READY
            </span>
            <span>•</span>
            <span>DGMS STATUTORY RULES ACTIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setCurrentTab('digital-twin')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#121614] hover:bg-[#171B18] text-amber-400 border border-[#1B211E] hover:border-amber-500/40 text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>OPEN 3D TWIN</span>
          </button>
          
          <button
            onClick={handleSimulateTick}
            disabled={isSimulating}
            title="Inject simulated sensor readings to test real-time risk calculations"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#080A09] font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'Ingesting...' : 'DEMO CONTROL: SIMULATE TELEMETRY'}
          </button>
        </div>
      </div>

      {/* 2. TOP KPI STRIP (Executive Human-Centric Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="OVERALL RISK"
          value={`${risk?.score ?? 0} / 100`}
          subtitle={risk?.severity ? `${risk.severity} • Composite Score` : 'Operating Normally'}
          icon={ShieldAlert}
          variant={
            risk?.severity === 'CRITICAL' ? 'rose' :
            risk?.severity === 'HIGH' ? 'amber' :
            risk?.severity === 'MEDIUM' ? 'cyan' : 'emerald'
          }
          onClick={() => setCurrentTab('risk-audit')}
        />
        <StatCard
          title="SENSORS ONLINE"
          value={`${activeSensorsCount} / ${sensors.length}`}
          subtitle={offlineSensorsCount > 0 ? `${offlineSensorsCount} not reporting` : 'All telemetry online'}
          icon={Activity}
          variant={offlineSensorsCount > 0 ? 'amber' : 'emerald'}
          onClick={() => setCurrentTab('sensors')}
        />
        <StatCard
          title="OPEN INCIDENTS"
          value={openIncidentsCount}
          subtitle={openIncidentsCount > 0 ? `${openIncidentsCount} cases requiring attention` : 'All safety cases resolved'}
          icon={AlertTriangle}
          variant={openIncidentsCount > 0 ? 'rose' : 'default'}
          onClick={() => setCurrentTab('incidents')}
        />
        <StatCard
          title="COMPLIANCE ISSUES"
          value={openViolationsCount}
          subtitle={openViolationsCount > 0 ? 'DGMS action pending' : 'Fully compliant'}
          icon={FileText}
          variant={openViolationsCount > 0 ? 'rose' : 'emerald'}
          onClick={() => setCurrentTab('violations')}
        />
        <StatCard
          title="PREDICTED RISK"
          value={predictiveSummary?.predicted_risk_score !== undefined ? `${predictiveSummary.predicted_risk_score} / 100` : 'N/A'}
          subtitle={predictiveSummary?.predicted_severity ? `${predictiveSummary.predicted_severity} • 30-min outlook` : '30-min outlook stable'}
          icon={BrainCircuit}
          variant={highRiskEscalation ? 'rose' : 'cyan'}
          onClick={() => setCurrentTab('predictive-risk')}
        />
        <StatCard
          title="FIELD TASKS"
          value={totalFieldTasksCount}
          subtitle={`${pendingInspectionsCount} inspections assigned`}
          icon={ClipboardCheck}
          variant="default"
          onClick={() => setCurrentTab('field-operations')}
        />
      </div>

      {/* 3. ATTENTION REQUIRED (Command-Center Urgent Action Strip) */}
      <div className="bg-[#0D100F] border border-[#232A26] rounded-lg p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1B211E]">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              ATTENTION REQUIRED
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            CURRENT OPERATIONAL PRIORITIES
          </span>
        </div>

        {/* Dynamic Priority Action Queue */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Item A: Critical / Warning Anomalies */}
          {anomalies.length > 0 ? (
            anomalies.slice(0, 1).map((a) => (
              <div 
                key={a.id} 
                className="p-3 rounded-lg bg-[#121614] border border-rose-900/60 hover:border-rose-700/80 transition-all flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9.5px] font-mono font-bold">
                      {a.severity} ANOMALY
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400">
                      {new Date(a.detected_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-100 line-clamp-1">
                    {a.description || 'Threshold Exceeded Alert'}
                  </p>
                  <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                    Zone: {a.zone_name || 'Active Longwall Section'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1B211E]">
                  <button
                    onClick={() => setCurrentTab('gis-map')}
                    className="px-2 py-1 rounded bg-[#171B18] hover:bg-amber-500/20 text-amber-400 border border-[#232A26] text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Compass className="w-3 h-3" /> GIS
                  </button>
                  <button
                    onClick={() => {
                      if (a.sensor_id) {
                        const s = sensors.find(x => x.id === a.sensor_id);
                        if (s) focusInDigitalTwin({ type: 'sensor', id: s.id, x: s.x, y: s.y, z: s.z, title: s.sensor_code });
                        else setCurrentTab('digital-twin');
                      } else {
                        setCurrentTab('digital-twin');
                      }
                    }}
                    className="px-2 py-1 rounded bg-[#171B18] hover:bg-cyan-500/20 text-cyan-400 border border-[#232A26] text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3" /> 3D
                  </button>
                  <button
                    onClick={() => setCurrentTab('alerts')}
                    className="ml-auto text-[10px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    TRIAGE →
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 rounded-lg bg-[#121614] border border-emerald-900/40 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">No Active Anomalies</p>
                <p className="text-[10px] text-slate-400 font-mono">Sensors within statutory thresholds</p>
              </div>
            </div>
          )}

          {/* Item B: Telemetry Connectivity Gap */}
          {offlineSensorsCount > 0 ? (
            <div className="p-3 rounded-lg bg-[#121614] border border-amber-900/60 hover:border-amber-700/80 transition-all flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9.5px] font-mono font-bold">
                    TELEMETRY GAP
                  </span>
                  <span className="text-[9.5px] font-mono text-slate-400">Mine-wide</span>
                </div>
                <p className="text-xs font-semibold text-slate-100">
                  {offlineSensorsCount} sensors are not reporting live telemetry
                </p>
                <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                  Silence-to-risk drift accumulating
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1B211E]">
                <span className="text-[10px] font-mono text-slate-500">Investigate node status</span>
                <button
                  onClick={() => setCurrentTab('sensors')}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                >
                  VIEW SENSORS →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#121614] border border-emerald-900/40 flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">100% Telemetry Coverage</p>
                <p className="text-[10px] text-slate-400 font-mono">All {sensors.length} nodes transmitting</p>
              </div>
            </div>
          )}

          {/* Item C: Compliance & DGMS Remedial Action */}
          {openViolationsCount > 0 ? (
            <div className="p-3 rounded-lg bg-[#121614] border border-rose-900/60 hover:border-rose-700/80 transition-all flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9.5px] font-mono font-bold">
                    COMPLIANCE ACTION
                  </span>
                  <span className="text-[9.5px] font-mono text-slate-400">DGMS Workflow</span>
                </div>
                <p className="text-xs font-semibold text-slate-100">
                  {openViolationsCount} statutory corrective action pending review
                </p>
                <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                  Due in statutory reporting window
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1B211E]">
                <span className="text-[10px] font-mono text-slate-500">Statutory audit trail</span>
                <button
                  onClick={() => setCurrentTab('violations')}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                >
                  VIEW REMEDIAL →
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[#121614] border border-emerald-900/40 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-300">DGMS Compliance Clear</p>
                <p className="text-[10px] text-slate-400 font-mono">Zero outstanding statutory notices</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. MAIN COMMAND GRID: Explainable Risk + Priority Sensors + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8 Cols: Risk Breakdown & Priority Sensors */}
        <div className="lg:col-span-8 space-y-4">
          {/* Section A: WHY IS RISK HIGH? (Human-First Explainable AI Engine) */}
          <div className="bg-[#0D100F] border border-[#232A26] rounded-lg p-4.5 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  WHY IS RISK HIGH?
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-[#171B18] border border-amber-500/30">
                EXPLAINABLE RISK ENGINE
              </span>
            </div>

            {/* Human-Readable Primary Explanation */}
            <p className="text-xs text-slate-200 leading-relaxed mb-4 bg-[#080A09] p-3 rounded-lg border border-[#1B211E]">
              {risk?.explanation || 'All statutory safety limits and environmental telemetry parameters are operating within nominal baseline bounds.'}
            </p>

            {/* Structured Factor Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-200">Regulatory Compliance</p>
                  <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Statutory notices & DGMS rules</p>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between pt-2 border-t border-[#1B211E]">
                  <span className="text-[10px] font-mono text-slate-400">Rule Score</span>
                  <span className="text-sm font-bold font-mono text-amber-400">{risk?.rule_score || 0} pts</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-200">Sensor Anomalies</p>
                  <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Statistical telemetry deviations</p>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between pt-2 border-t border-[#1B211E]">
                  <span className="text-[10px] font-mono text-slate-400">ML Score</span>
                  <span className="text-sm font-bold font-mono text-cyan-400">{risk?.ml_score || 0} pts</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-200">Missing Telemetry Trend</p>
                  <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">Signal: Silence-to-Risk Drift</p>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between pt-2 border-t border-[#1B211E]">
                  <span className="text-[10px] font-mono text-slate-400">Silence Drift</span>
                  <span className="text-sm font-bold font-mono text-rose-400">{risk?.silence_risk_score || 0} pts</span>
                </div>
              </div>
            </div>

            {/* Model Provenance Metadata */}
            <div className="mt-3 pt-2.5 border-t border-[#1B211E] text-[9.5px] text-slate-400 font-mono flex flex-wrap items-center justify-between gap-2">
              <span>Model Version: <span className="text-slate-300 font-bold">{risk?.model_version || 'TRINETRA-RISK-v2.0'}</span></span>
              <span>Regulatory Ruleset: <span className="text-slate-300 font-bold">{risk?.rule_version || 'DGMS-2026.1'}</span></span>
              <button 
                onClick={() => setCurrentTab('risk-audit')}
                className="text-amber-400 hover:underline cursor-pointer flex items-center gap-1 font-bold"
              >
                VIEW AUDIT LEDGER <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Section B: PRIORITY SENSOR STATUS (Compact 3–5 Key Nodes) */}
          <div className="bg-[#0D100F] border border-[#232A26] rounded-lg p-4.5 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  PRIORITY SENSOR STATUS
                </h3>
              </div>
              <button
                onClick={() => setCurrentTab('sensors')}
                className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded bg-[#171B18] border border-amber-500/30"
              >
                <span>VIEW ALL {sensors.length} SENSORS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1B211E] text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-2 font-semibold">Sensor</th>
                    <th className="pb-2 font-semibold">Zone / Location</th>
                    <th className="pb-2 font-semibold">Live Reading</th>
                    <th className="pb-2 font-semibold">Thresholds</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B211E] text-slate-300">
                  {prioritySensors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        No sensors registered for this mine block.
                      </td>
                    </tr>
                  ) : (
                    prioritySensors.map((s) => (
                      <tr key={s.id} className="hover:bg-[#121614] transition-colors">
                        <td className="py-2.5 pr-2">
                          <p className="font-bold text-white text-[11px]">{s.sensor_code}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{s.name}</p>
                        </td>
                        <td className="py-2.5 pr-2 text-[10.5px]">
                          <p className="text-slate-200">{s.zone_name || 'Main Zone'}</p>
                          <p className="text-[9.5px] text-slate-400">{s.level_name || 'Surface'}</p>
                        </td>
                        <td className="py-2.5 pr-2">
                          <span className={clsx(
                            'text-xs font-bold px-1.5 py-0.5 rounded',
                            s.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                            s.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                            s.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-slate-800 text-slate-400'
                          )}>
                            {s.last_value !== undefined ? `${s.last_value} ${s.unit}` : 'N/A'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-2 text-slate-400 text-[10px]">
                          {s.warning_threshold} / {s.critical_threshold} {s.unit}
                        </td>
                        <td className="py-2.5 pr-2">
                          <StatusBadge status={s.status} size="sm" />
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setFocusedTarget({ type: 'sensor', id: s.id, x: s.x, y: s.y, z: s.z, title: s.sensor_code });
                                setCurrentTab('gis-map');
                              }}
                              className="px-2 py-0.5 rounded bg-[#171B18] hover:bg-amber-500/20 text-amber-400 border border-[#232A26] hover:border-amber-500/40 text-[9.5px] font-mono transition-colors cursor-pointer"
                              title="Locate on 2D GIS Map"
                            >
                              GIS
                            </button>
                            <button
                              onClick={() => focusInDigitalTwin({ type: 'sensor', id: s.id, x: s.x, y: s.y, z: s.z, title: s.sensor_code })}
                              className="px-2 py-0.5 rounded bg-[#171B18] hover:bg-cyan-500/20 text-cyan-400 border border-[#232A26] hover:border-cyan-500/40 text-[9.5px] font-mono transition-colors cursor-pointer"
                              title="Focus in 3D Digital Twin"
                            >
                              3D
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Priority Anomalies & Command Shortcuts */}
        <div className="lg:col-span-4 space-y-4">
          {/* Section C: PRIORITY ANOMALIES (High Priority Radar) */}
          <div className="bg-[#0D100F] border border-[#232A26] rounded-lg p-4.5 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  PRIORITY ANOMALIES
                </h3>
              </div>
              <button 
                onClick={() => setCurrentTab('alerts')}
                className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>VIEW ALERTS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {anomalies.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#080A09] border border-[#1B211E] text-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-300">Zero Active Anomalies</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">Real-time ML anomaly filter active</p>
                </div>
              ) : (
                anomalies.slice(0, 4).map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] text-xs hover:border-[#2A332E] transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-rose-400 text-xs">
                        {a.severity} Anomaly
                      </span>
                      <StatusBadge status={a.severity} size="sm" />
                    </div>

                    {/* Human Explanation First */}
                    <p className="text-xs text-slate-200 leading-snug font-medium">
                      {a.description || 'Abnormal sensor spike detected'}
                    </p>

                    {/* Technical Detail Second */}
                    <div className="mt-2 pt-1.5 border-t border-[#1B211E] flex items-center justify-between text-[9.5px] font-mono text-slate-400">
                      <span>Event: <span className="text-slate-300">{a.anomaly_type}</span></span>
                      <span>{new Date(a.detected_at).toLocaleTimeString()}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setCurrentTab('gis-map')}
                        className="px-2 py-0.5 rounded bg-[#171B18] hover:bg-amber-500/20 text-amber-400 border border-[#232A26] text-[10px] font-mono transition-colors cursor-pointer"
                      >
                        GIS
                      </button>
                      <button
                        onClick={() => setCurrentTab('alerts')}
                        className="px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                      >
                        TRIAGE
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section D: QUICK COMMAND SHORTCUTS */}
          <div className="bg-[#0D100F] border border-[#232A26] rounded-lg p-4.5 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-3 pb-2 border-b border-[#1B211E]">
              COMMAND SHORTCUTS
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCurrentTab('gis-map')}
                className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] hover:border-amber-500/50 hover:bg-[#121614] text-left transition-all group cursor-pointer"
              >
                <Compass className="w-4 h-4 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-200 group-hover:text-amber-400">2D GIS Map</p>
                <p className="text-[9.5px] text-slate-400 font-mono">Spatial risk & boundaries</p>
              </button>

              <button
                onClick={() => setCurrentTab('digital-twin')}
                className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] hover:border-cyan-500/50 hover:bg-[#121614] text-left transition-all group cursor-pointer"
              >
                <Layers className="w-4 h-4 text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">3D Twin</p>
                <p className="text-[9.5px] text-slate-400 font-mono">Volumetric mine model</p>
              </button>

              <button
                onClick={() => setCurrentTab('copilot')}
                className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] hover:border-amber-500/50 hover:bg-[#121614] text-left transition-all group cursor-pointer"
              >
                <Bot className="w-4 h-4 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-200 group-hover:text-amber-400">AI Copilot</p>
                <p className="text-[9.5px] text-slate-400 font-mono">Evidence-grounded RAG</p>
              </button>

              <button
                onClick={() => setCurrentTab('reports')}
                className="p-3 rounded-lg bg-[#080A09] border border-[#1B211E] hover:border-emerald-500/50 hover:bg-[#121614] text-left transition-all group cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-400">DGMS Reports</p>
                <p className="text-[9.5px] text-slate-400 font-mono">Statutory compliance</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
