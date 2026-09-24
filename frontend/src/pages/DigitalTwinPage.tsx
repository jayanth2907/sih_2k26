import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TypewriterText } from '../components/ui/typewriter-text';
import { useMineContext } from '../context/MineContext';
import { mineService, sensorService } from '../services';
import { DigitalTwinState, Sensor, Camera, Equipment, Incident, MineLevel, RealMineCoordinate, RealMineSeam } from '../types';
import { MineCanvas3D } from '../components/digital-twin/MineCanvas3D';
import { LayerControls } from '../components/digital-twin/LayerControls';
import { ScenePresetControls } from '../components/digital-twin/ScenePresetControls';
import { ObjectInspector } from '../components/digital-twin/ObjectInspector';
import { ReplayTimeline } from '../components/digital-twin/ReplayTimeline';
import { LayerVisibility, ViewMode, SelectedObject, CameraFocusTarget, ReplayState, ReplayKeyframe } from '../components/digital-twin/types';
import { StatusBadge } from '../components/StatusBadge';
import { Layers3, Box, Activity, Video, Cpu, AlertTriangle, Sparkles, ShieldAlert, Radio, Table, Globe, Shield, CheckCircle2, AlertCircle, Compass, Layers, FileText, Info } from 'lucide-react';
import clsx from 'clsx';

const INITIAL_LAYERS: LayerVisibility = {
  sourceBoundary: true,
  cardinalPoints: true,
  coalSeamsStratigraphy: true,
  sensors: true,
  cameras: true,
  cameraFov: true,
  equipment: true,
  ventilation: true,
  mineStructure: true,
  shaftsAndTunnels: true,
  zones: true,
  labels: true,
  proximityLines: true,
  surfaceYard: true
};

const DEFAULT_KEYFRAMES: ReplayKeyframe[] = [
  {
    timestamp: '10:30:00',
    timeOffsetSeconds: 0,
    label: 'Normal Baseline',
    stage: 'NORMAL',
    sensorValues: { 'SN-BDS04-CH4-101': 0.35, 'SN-BDS04-CO-101': 9.2, 'SN-BDS04-VEL-101': 3.2 },
    activeIncident: false,
    riskScore: 24.5,
    zoneRisks: { 'ZN-EAST-LW-102': 'LOW', 'ZN-WEST-DEV-201': 'LOW' },
    description: 'All atmospheric and ventilation parameters within normal DGMS statutory baseline.'
  },
  {
    timestamp: '10:31:15',
    timeOffsetSeconds: 15,
    label: 'Seam Gas Trending Up',
    stage: 'TRENDING_UP',
    sensorValues: { 'SN-BDS04-CH4-101': 0.65, 'SN-BDS04-CO-101': 14.5, 'SN-BDS04-VEL-101': 2.8 },
    activeIncident: false,
    riskScore: 38.0,
    zoneRisks: { 'ZN-EAST-LW-102': 'MEDIUM', 'ZN-WEST-DEV-201': 'LOW' },
    description: 'East Longwall return CH4 concentration rising continuously (+0.30% in 5 min).'
  },
  {
    timestamp: '10:32:30',
    timeOffsetSeconds: 30,
    label: 'Warning Limit Breached',
    stage: 'WARNING',
    sensorValues: { 'SN-BDS04-CH4-101': 0.88, 'SN-BDS04-CO-101': 22.0, 'SN-BDS04-VEL-101': 2.1 },
    activeIncident: false,
    riskScore: 58.5,
    zoneRisks: { 'ZN-EAST-LW-102': 'HIGH', 'ZN-WEST-DEV-201': 'MEDIUM' },
    description: 'Methane crossed warning threshold (0.88% >= 0.75%). Warning alert generated.'
  },
  {
    timestamp: '10:33:45',
    timeOffsetSeconds: 45,
    label: 'Critical Surge (1.82%)',
    stage: 'CRITICAL',
    sensorValues: { 'SN-BDS04-CH4-101': 1.82, 'SN-BDS04-CO-101': 38.0, 'SN-BDS04-VEL-101': 1.1 },
    activeIncident: true,
    riskScore: 91.0,
    zoneRisks: { 'ZN-EAST-LW-102': 'CRITICAL', 'ZN-WEST-DEV-201': 'HIGH' },
    description: 'Critical threshold crossed (1.82% >= 1.25%). Immediate auto-incident dispatched.'
  },
  {
    timestamp: '10:34:30',
    timeOffsetSeconds: 60,
    label: 'Alert & Incident Dispatched',
    stage: 'INCIDENT_CREATED',
    sensorValues: { 'SN-BDS04-CH4-101': 1.88, 'SN-BDS04-CO-101': 42.0, 'SN-BDS04-VEL-101': 0.9 },
    activeIncident: true,
    riskScore: 92.5,
    zoneRisks: { 'ZN-EAST-LW-102': 'CRITICAL', 'ZN-WEST-DEV-201': 'HIGH' },
    description: 'Governance incident INC-BDS04-001 created. Spatial cameras C-02 & C-03 locked.'
  },
  {
    timestamp: '10:36:00',
    timeOffsetSeconds: 75,
    label: 'Auxiliary Vent Ramp-up',
    stage: 'RECOVERING',
    sensorValues: { 'SN-BDS04-CH4-101': 1.05, 'SN-BDS04-CO-101': 24.0, 'SN-BDS04-VEL-101': 2.6 },
    activeIncident: true,
    riskScore: 62.0,
    zoneRisks: { 'ZN-EAST-LW-102': 'HIGH', 'ZN-WEST-DEV-201': 'LOW' },
    description: 'Surface fan airflow increased to 2.6 m/s. Seam methane retreating.'
  },
  {
    timestamp: '10:38:00',
    timeOffsetSeconds: 90,
    label: 'Restabilized Baseline',
    stage: 'RESOLVED',
    sensorValues: { 'SN-BDS04-CH4-101': 0.42, 'SN-BDS04-CO-101': 11.0, 'SN-BDS04-VEL-101': 3.1 },
    activeIncident: false,
    riskScore: 28.0,
    zoneRisks: { 'ZN-EAST-LW-102': 'LOW', 'ZN-WEST-DEV-201': 'LOW' },
    description: 'All sensor nodes returned to statutory safe limits. Ventilation stabilized.'
  }
];

export const DigitalTwinPage: React.FC = () => {
  const { selectedMine, setCurrentTab } = useMineContext();

  const [twinData, setTwinData] = useState<DigitalTwinState | null>(null);
  const [layers, setLayers] = useState<LayerVisibility>(INITIAL_LAYERS);
  const [viewMode, setViewMode] = useState<ViewMode>('OPERATIONAL');
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  const [focusTarget, setFocusTarget] = useState<CameraFocusTarget | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'3d' | 'matrix'>('3d');
  const [matrixTab, setMatrixTab] = useState<'coordinates' | 'seams' | 'provenance' | 'sensors' | 'cameras' | 'machinery' | 'incidents'>('coordinates');
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Replay State
  const [replayState, setReplayState] = useState<ReplayState>({
    isPlaying: false,
    currentSecond: 0,
    totalSeconds: 90,
    playbackSpeed: 1,
    activeKeyframeIndex: 0
  });

  const pollIntervalRef = useRef<any>(null);

  // Fetch Digital Twin State
  const fetchDigitalTwin = useCallback(async () => {
    if (!selectedMine) return;
    try {
      const data = await mineService.getDigitalTwin(selectedMine.id);
      setTwinData(data);
    } catch (err) {
      console.error('Failed to load digital twin state:', err);
    }
  }, [selectedMine]);

  useEffect(() => {
    fetchDigitalTwin();
    pollIntervalRef.current = setInterval(fetchDigitalTwin, 5000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchDigitalTwin]);

  // Handle Preset Views
  const handleFocusLevel = (lvl: MineLevel) => {
    setFocusTarget({
      x: 0,
      y: lvl.elevation || -lvl.depth_meters || -300,
      z: 150,
      distance: 80,
      title: `Level ${lvl.name || lvl.code}`
    });
  };

  const handleResetView = () => {
    setFocusTarget({
      x: 0,
      y: 0,
      z: 0,
      distance: 350,
      title: 'Isometric View'
    });
  };

  const handleFitOverview = () => {
    setFocusTarget({
      x: 0,
      y: 200,
      z: 0,
      distance: 700,
      title: 'Top Down Overview'
    });
  };

  // Handle Scenario Injection
  const handleTriggerScenario = async (scenario: string) => {
    if (!selectedMine || !twinData) return;
    setIsSimulating(true);
    try {
      await sensorService.simulateScenario(selectedMine.id, scenario);
      await fetchDigitalTwin();
    } catch (err) {
      console.error('Simulation trigger failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Replay Keyframe Selector
  const handleReplayKeyframe = (index: number) => {
    const kf = DEFAULT_KEYFRAMES[index];
    if (kf) {
      setReplayState((prev) => ({
        ...prev,
        activeKeyframeIndex: index,
        currentSecond: kf.timeOffsetSeconds
      }));
    }
  };

  if (!selectedMine) return null;

  const isRealBlock = selectedMine.code.startsWith('BLOCK-') || !!twinData?.profile;
  const isApproximate = twinData?.boundary?.geometry_status === 'APPROXIMATE';

  // Overview metric strip — same divided-row pattern used on the dashboard
  const overviewStats = [
    { label: 'Cardinal vertices', value: `${twinData?.coordinates?.length || twinData?.boundary?.vertices_3d?.length || 0}`, tone: 'sky' as const },
    { label: 'Coal seams', value: `${twinData?.seams?.length || 0}`, tone: 'emerald' as const },
    { label: 'Total area', value: twinData?.boundary?.area_sq_km || twinData?.profile?.geological_block_area_sq_km ? `${twinData?.boundary?.area_sq_km || twinData?.profile?.geological_block_area_sq_km} km²` : 'N/A', tone: 'slate' as const },
    { label: 'IoT sensors', value: `${twinData?.sensors?.length || 0}`, tone: 'sky' as const },
    { label: 'CCTV feeds', value: `${twinData?.cameras?.length || 0}`, tone: 'emerald' as const },
    { label: 'Geol. reserves', value: twinData?.profile?.total_geological_reserve_mt || twinData?.profile?.geological_reserves_mt ? `${twinData.profile.total_geological_reserve_mt || twinData.profile.geological_reserves_mt} MT` : 'Documented', tone: 'amber' as const }
  ];

  const toneText: Record<string, string> = {
    sky: 'text-sky-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    slate: 'text-slate-200'
  };

  const matrixTabs = [
    { id: 'coordinates', label: 'Cardinal points', icon: Compass, count: twinData?.coordinates?.length || twinData?.boundary?.vertices_3d?.length },
    { id: 'seams', label: 'Coal seams', icon: Layers, count: twinData?.seams?.length },
    { id: 'provenance', label: 'Document provenance', icon: FileText, count: twinData?.quality_record ? 1 : 0 },
    { id: 'sensors', label: 'IoT sensors', icon: Activity, count: twinData?.sensors?.length },
    { id: 'cameras', label: 'Camera feeds', icon: Video, count: twinData?.cameras?.length },
    { id: 'machinery', label: 'Machinery', icon: Cpu, count: twinData?.equipment?.length },
    { id: 'incidents', label: 'Hazards', icon: AlertTriangle, count: twinData?.active_incidents?.length }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pb-5 border-b border-[#1B211E] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <Layers3 className="w-5 h-5 text-amber-400" />
              <TypewriterText text="3D digital mine twin" speed={30} delay={150} />
            </h1>
            {isRealBlock ? (
              <span
                className={clsx(
                  'text-[10.5px] font-medium px-2 py-0.5 rounded border flex items-center gap-1',
                  isApproximate
                    ? 'text-amber-400 border-amber-500/30'
                    : 'text-emerald-400 border-emerald-500/30'
                )}
              >
                {isApproximate ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {isApproximate ? 'Approximate geometry' : 'Source-derived geometry'}
              </span>
            ) : (
              <span className="text-[10.5px] font-medium px-2 py-0.5 rounded border border-purple-500/30 text-purple-300">
                Simulated operational twin
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1.5">
            Real-time spatial twin for {selectedMine.name} ({selectedMine.code}) · {selectedMine.state || 'India'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#121614] rounded-full p-0.5 text-xs">
            <button
              onClick={() => setActiveViewTab('3d')}
              className={clsx(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer',
                activeViewTab === '3d' ? 'bg-amber-500 text-[#080A09]' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              3D canvas
            </button>
            <button
              onClick={() => setActiveViewTab('matrix')}
              className={clsx(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer',
                activeViewTab === 'matrix' ? 'bg-[#232A26] text-white' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Table className="w-3.5 h-3.5" />
              Spatial matrix
            </button>
          </div>

          <button
            onClick={() => setCurrentTab('gis-map')}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            2D GIS map
          </button>
        </div>
      </div>

      {/* Trust & provenance legend + data completeness */}
      <div className="border border-[#1B211E] rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1B211E]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="text-[12px] font-semibold text-white">Trust &amp; provenance classification</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Source-derived · govt. document extract
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Approximate · atlas / tender recon
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Schematic · stratigraphic stack
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Simulated · live telemetry
            </span>
          </div>
        </div>

        {twinData?.data_completeness && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-3 pt-3 text-[11px]">
            <div>
              <span className="text-slate-500">Boundary polygon</span>
              <p className="font-medium text-sky-400 mt-0.5">{twinData.data_completeness.boundary}</p>
            </div>
            <div>
              <span className="text-slate-500">Cardinal coordinates</span>
              <p className="font-medium text-amber-400 mt-0.5">{twinData.data_completeness.coordinates}</p>
            </div>
            <div>
              <span className="text-slate-500">Coal seam stratigraphy</span>
              <p className="font-medium text-emerald-400 mt-0.5">{twinData.data_completeness.seams}</p>
            </div>
            <div className="min-w-0">
              <span className="text-slate-500">Underground workings</span>
              <p className="font-medium text-slate-300 mt-0.5 truncate" title={twinData.data_completeness.underground_workings}>
                {twinData.data_completeness.underground_workings}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-slate-500">Data completeness</span>
              <p className="font-medium text-amber-300 mt-0.5">{twinData.data_completeness.geometry_status || 'Documented'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Spatial overview — single divided strip */}
      <div className="border border-[#1B211E] rounded-lg grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-[#1B211E] overflow-hidden">
        {overviewStats.map((s) => (
          <div key={s.label} className="p-3.5 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={clsx('text-base font-semibold', toneText[s.tone])}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      {activeViewTab === '3d' ? (
        <div className="relative w-full h-[620px] rounded-lg overflow-hidden border border-[#1B211E] bg-[#080A09] shadow-xl">
          {/* 3D WebGL Canvas — untouched */}
          <MineCanvas3D
            twinData={twinData}
            layers={layers}
            viewMode={viewMode}
            selectedObject={selectedObject}
            onSelectObject={setSelectedObject}
            focusTarget={focusTarget}
            onFocusComplete={() => setFocusTarget(null)}
          />

          <LayerControls
            layers={layers}
            onChange={setLayers}
            isOpen={isLayerPanelOpen}
            onToggleOpen={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          />

          <ScenePresetControls
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
            levels={twinData?.levels || []}
            onFocusLevel={handleFocusLevel}
            onResetView={handleResetView}
            onFitOverview={handleFitOverview}
            onTriggerScenario={handleTriggerScenario}
            isSimulating={isSimulating}
          />

          <ObjectInspector
            selectedObject={selectedObject}
            onClose={() => setSelectedObject(null)}
            twinData={twinData}
            onFocusTarget={setFocusTarget}
          />

          <ReplayTimeline
            replayState={replayState}
            keyframes={DEFAULT_KEYFRAMES}
            onTogglePlay={() => setReplayState((p) => ({ ...p, isPlaying: !p.isPlaying }))}
            onSeekSecond={(sec) => setReplayState((p) => ({ ...p, currentSecond: sec }))}
            onSeekKeyframe={handleReplayKeyframe}
            onChangeSpeed={(spd) => setReplayState((p) => ({ ...p, playbackSpeed: spd }))}
            onReset={() => handleReplayKeyframe(0)}
            isOpen={isReplayOpen}
            onToggleOpen={() => setIsReplayOpen(!isReplayOpen)}
          />
        </div>
      ) : (
        /* Spatial matrix tabular view */
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center gap-1 border-b border-[#1B211E] pb-3 text-xs">
            {matrixTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = matrixTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMatrixTab(tab.id as any)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer',
                    isActive ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={clsx('text-[10px]', isActive ? 'text-amber-400/70' : 'text-slate-600')}>{tab.count || 0}</span>
                </button>
              );
            })}
          </div>

          <div className="border border-[#1B211E] rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1B211E] text-slate-500 text-[10.5px]">
                  {matrixTab === 'coordinates' && (
                    <>
                      <th className="py-3 px-4 font-medium">Point</th>
                      <th className="py-3 px-4 font-medium">Latitude (DMS)</th>
                      <th className="py-3 px-4 font-medium">Longitude (DMS)</th>
                      <th className="py-3 px-4 font-medium">3D local X (m)</th>
                      <th className="py-3 px-4 font-medium">3D local Z (m)</th>
                      <th className="py-3 px-4 font-medium">Trust status</th>
                      <th className="py-3 px-4 font-medium">Source provenance</th>
                    </>
                  )}
                  {matrixTab === 'seams' && (
                    <>
                      <th className="py-3 px-4 font-medium">Seam name</th>
                      <th className="py-3 px-4 font-medium">Depth range</th>
                      <th className="py-3 px-4 font-medium">Thickness</th>
                      <th className="py-3 px-4 font-medium">Coal grade</th>
                      <th className="py-3 px-4 font-medium">Stratigraphic order</th>
                      <th className="py-3 px-4 font-medium">Trust</th>
                      <th className="py-3 px-4 font-medium">Provenance</th>
                    </>
                  )}
                  {matrixTab === 'provenance' && (
                    <>
                      <th className="py-3 px-4 font-medium">Source document</th>
                      <th className="py-3 px-4 font-medium">Document hash (SHA-256)</th>
                      <th className="py-3 px-4 font-medium">Page</th>
                      <th className="py-3 px-4 font-medium">Authority / issuer</th>
                      <th className="py-3 px-4 font-medium">Quality score</th>
                    </>
                  )}
                  {matrixTab === 'sensors' && (
                    <>
                      <th className="py-3 px-4 font-medium">Identifier</th>
                      <th className="py-3 px-4 font-medium">Sensor name</th>
                      <th className="py-3 px-4 font-medium">Coordinate X</th>
                      <th className="py-3 px-4 font-medium">Coordinate Y</th>
                      <th className="py-3 px-4 font-medium">Depth Z</th>
                      <th className="py-3 px-4 font-medium">Thresholds</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </>
                  )}
                  {matrixTab === 'cameras' && (
                    <>
                      <th className="py-3 px-4 font-medium">Identifier</th>
                      <th className="py-3 px-4 font-medium">Camera name</th>
                      <th className="py-3 px-4 font-medium">Coordinate X</th>
                      <th className="py-3 px-4 font-medium">Coordinate Y</th>
                      <th className="py-3 px-4 font-medium">Depth Z</th>
                      <th className="py-3 px-4 font-medium">Orientation</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </>
                  )}
                  {matrixTab === 'machinery' && (
                    <>
                      <th className="py-3 px-4 font-medium">Identifier</th>
                      <th className="py-3 px-4 font-medium">Equipment name</th>
                      <th className="py-3 px-4 font-medium">Coordinate X</th>
                      <th className="py-3 px-4 font-medium">Coordinate Y</th>
                      <th className="py-3 px-4 font-medium">Depth Z</th>
                      <th className="py-3 px-4 font-medium">Category</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </>
                  )}
                  {matrixTab === 'incidents' && (
                    <>
                      <th className="py-3 px-4 font-medium">Identifier</th>
                      <th className="py-3 px-4 font-medium">Title</th>
                      <th className="py-3 px-4 font-medium">Coordinate X</th>
                      <th className="py-3 px-4 font-medium">Coordinate Y</th>
                      <th className="py-3 px-4 font-medium">Depth Z</th>
                      <th className="py-3 px-4 font-medium">Category</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B211E] text-slate-300">
                {matrixTab === 'coordinates' &&
                  (twinData?.coordinates && twinData.coordinates.length > 0
                    ? twinData.coordinates.map((c) => (
                      <tr key={c.point_label} className="hover:bg-[#0D100F] transition-colors">
                        <td className="py-2.5 px-4 font-medium text-amber-400">Point {c.point_label}</td>
                        <td className="py-2.5 px-4 text-sky-400">{c.lat_dms_raw || c.latitude_dms || `${c.latitude?.toFixed(6)}°`}</td>
                        <td className="py-2.5 px-4 text-sky-400">{c.lon_dms_raw || c.longitude_dms || `${c.longitude?.toFixed(6)}°`}</td>
                        <td className="py-2.5 px-4 text-slate-300">{(c.x ?? c.local_x ?? 0).toFixed(1)} m</td>
                        <td className="py-2.5 px-4 text-slate-300">{(c.z ?? c.local_z ?? 0).toFixed(1)} m</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-medium text-emerald-400">
                            {c.geometry_status || 'SOURCE_DERIVED'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px] truncate max-w-[200px]">
                          {c.prov_doc_title || c.provenance?.document_title || 'Tender Notice'} (P.{c.prov_page_number || c.provenance?.page_number || 1})
                        </td>
                      </tr>
                    ))
                    : twinData?.boundary?.vertices_3d?.map((v) => (
                      <tr key={v.point_label || v.label} className="hover:bg-[#0D100F] transition-colors">
                        <td className="py-2.5 px-4 font-medium text-amber-400">Point {v.point_label || v.label}</td>
                        <td className="py-2.5 px-4 text-sky-400">{v.latitude?.toFixed(6)}° N</td>
                        <td className="py-2.5 px-4 text-sky-400">{v.longitude?.toFixed(6)}° E</td>
                        <td className="py-2.5 px-4 text-slate-300">{v.x.toFixed(1)} m</td>
                        <td className="py-2.5 px-4 text-slate-300">{v.z.toFixed(1)} m</td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-medium text-amber-400">
                            {twinData?.boundary?.geometry_status || 'APPROXIMATE'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {twinData?.boundary?.prov_doc_title || twinData?.boundary?.provenance?.document_title || 'Atlas Reconnaissance'}
                        </td>
                      </tr>
                    )))}

                {matrixTab === 'seams' &&
                  twinData?.seams?.map((s) => (
                    <tr key={s.seam_name} className="hover:bg-[#0D100F] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-emerald-400">{s.seam_name}</td>
                      <td className="py-2.5 px-4 text-sky-400">
                        {s.depth_from_m !== undefined && s.depth_to_m !== undefined
                          ? `${s.depth_from_m}m – ${s.depth_to_m}m`
                          : s.depth_min_m !== undefined && s.depth_max_m !== undefined
                            ? `${s.depth_min_m}m – ${s.depth_max_m}m`
                            : 'Documented'}
                      </td>
                      <td className="py-2.5 px-4 text-amber-300">
                        {s.thickness_min_m !== undefined && s.thickness_max_m !== undefined ? `${s.thickness_min_m}m – ${s.thickness_max_m}m` : 'Documented'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">{s.coal_grade || s.grade || 'Non-Coking'}</td>
                      <td className="py-2.5 px-4 text-slate-500">#{s.stratigraphic_order || s.sequence_order || 1}</td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] font-medium text-emerald-400">
                          {s.geometry_status || 'SOURCE_DERIVED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px] truncate max-w-[200px]">
                        {s.prov_doc_title || s.provenance?.document_title || 'Project Report'} (P.{s.prov_page_number || s.provenance?.page_number || 1})
                      </td>
                    </tr>
                  ))}

                {matrixTab === 'provenance' && twinData?.quality_record && (
                  <tr className="hover:bg-[#0D100F] transition-colors">
                    <td className="py-2.5 px-4 font-medium text-white">{twinData.quality_record.source_title || 'Ministry of Coal Document'}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[10px] break-all max-w-[180px]">
                      {twinData.quality_record.source_sha256 || 'SHA-256 Validated'}
                    </td>
                    <td className="py-2.5 px-4 text-sky-400">Page {twinData.quality_record.source_page_number || 1}</td>
                    <td className="py-2.5 px-4 text-amber-300">{twinData.quality_record.source_authority || 'Ministry of Coal, Govt of India'}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] font-medium text-emerald-400">
                        Score: {twinData.quality_record.overall_score || 95}/100
                      </span>
                    </td>
                  </tr>
                )}

                {matrixTab === 'sensors' &&
                  twinData?.sensors?.map((s) => (
                    <tr key={s.id} className="hover:bg-[#0D100F] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-amber-400">{s.sensor_code}</td>
                      <td className="py-2.5 px-4">{s.name}</td>
                      <td className="py-2.5 px-4 text-sky-400">{s.x.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-sky-400">{s.y.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-rose-400">{s.z.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-slate-500">{s.unit} ({s.warning_threshold}/{s.critical_threshold})</td>
                      <td className="py-2.5 px-4"><StatusBadge status={s.status} size="sm" /></td>
                    </tr>
                  ))}

                {matrixTab === 'cameras' &&
                  twinData?.cameras?.map((c) => (
                    <tr key={c.id} className="hover:bg-[#0D100F] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-amber-400">{c.camera_code}</td>
                      <td className="py-2.5 px-4">{c.name}</td>
                      <td className="py-2.5 px-4 text-sky-400">{c.x.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-sky-400">{c.y.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-rose-400">{c.z.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-slate-500">Yaw: {c.yaw}° | Pitch: {c.pitch}° | FOV: {c.fov}°</td>
                      <td className="py-2.5 px-4"><StatusBadge status={c.status} size="sm" /></td>
                    </tr>
                  ))}

                {matrixTab === 'machinery' &&
                  twinData?.equipment?.map((eq) => (
                    <tr key={eq.id} className="hover:bg-[#0D100F] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-amber-400">{eq.equipment_code}</td>
                      <td className="py-2.5 px-4">{eq.name}</td>
                      <td className="py-2.5 px-4 text-sky-400">{eq.x.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-sky-400">{eq.y.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-rose-400">{eq.z.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-slate-500">{eq.category}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={eq.status} size="sm" /></td>
                    </tr>
                  ))}

                {matrixTab === 'incidents' &&
                  twinData?.active_incidents?.map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#0D100F] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-amber-400">{inc.incident_code}</td>
                      <td className="py-2.5 px-4">{inc.title}</td>
                      <td className="py-2.5 px-4 text-sky-400">{inc.x.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-sky-400">{inc.y.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-rose-400">{inc.z.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-slate-500">{inc.category}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={inc.status} size="sm" /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};