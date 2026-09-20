import React, { useEffect, useState, useRef, useCallback } from 'react';
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

  return (
    <div className="space-y-4">
      {/* Top Banner & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers3 className="w-5 h-5 text-amber-400" />
              3D Digital Mine Operational Twin
            </h2>
            {isRealBlock ? (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                isApproximate
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}>
                {isApproximate ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {isApproximate ? 'APPROXIMATE GEOMETRY' : 'SOURCE-DERIVED GEOMETRY'}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-purple-950/80 text-purple-300 border-purple-800">
                SIMULATED OPERATIONAL TWIN
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time WebGL spatial twin for {selectedMine.name} ({selectedMine.code}) • {selectedMine.state || 'India'}
          </p>
        </div>

        {/* View Tab Switcher: 3D Twin vs Data Matrix */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setActiveViewTab('3d')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewTab === '3d'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3D TWIN CANVAS</span>
            </button>
            <button
              onClick={() => setActiveViewTab('matrix')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeViewTab === 'matrix'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>SPATIAL MATRIX</span>
            </button>
            <button
              onClick={() => setCurrentTab('gis-map')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all text-amber-400 hover:bg-amber-500/10 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>2D GIS MAP</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-900/40 text-xs font-mono text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>WebGL Three.js Engine</span>
          </div>
        </div>
      </div>

      {/* 3D Trust & Source Classification Legend + Data Completeness Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-xl font-mono text-xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              TRINETRA 3D Trust & Provenance Classification
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              SOURCE_DERIVED: Govt Doc Extract
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              APPROXIMATE: Atlas / Tender Recon
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              SCHEMATIC: Stratigraphic Stack
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              SIMULATED: Live Telemetry
            </span>
          </div>
        </div>

        {/* Data Completeness Grid */}
        {twinData?.data_completeness && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px]">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-500 uppercase">Boundary Polygon</span>
              <p className="font-bold text-cyan-400 mt-0.5">{twinData.data_completeness.boundary}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-500 uppercase">Cardinal Coordinates</span>
              <p className="font-bold text-amber-400 mt-0.5">{twinData.data_completeness.coordinates}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-500 uppercase">Coal Seam Stratigraphy</span>
              <p className="font-bold text-emerald-400 mt-0.5">{twinData.data_completeness.seams}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-500 uppercase">Underground Workings</span>
              <p className="font-bold text-slate-400 mt-0.5 truncate" title={twinData.data_completeness.underground_workings}>
                {twinData.data_completeness.underground_workings}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 col-span-2 md:col-span-1">
              <span className="text-slate-500 uppercase">Data Completeness</span>
              <p className="font-bold text-amber-300 mt-0.5">{twinData.data_completeness.geometry_status || 'DOCUMENTED'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Spatial Foundation Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center font-mono text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-500 text-[10px] uppercase">Cardinal Vertices</span>
          <p className="text-base font-bold text-cyan-400 mt-0.5">{twinData?.coordinates?.length || twinData?.boundary?.vertices_3d?.length || 0} Points</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-500 text-[10px] uppercase">Coal Seams</span>
          <p className="text-base font-bold text-emerald-400 mt-0.5">{twinData?.seams?.length || 0} Layers</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-500 text-[10px] uppercase">Total Area</span>
          <p className="text-base font-bold text-white mt-0.5">{twinData?.boundary?.area_sq_km || twinData?.profile?.geological_block_area_sq_km ? `${twinData?.boundary?.area_sq_km || twinData?.profile?.geological_block_area_sq_km} km²` : 'N/A'}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-500 text-[10px] uppercase">IoT Sensors</span>
          <p className="text-base font-bold text-cyan-400 mt-0.5">{twinData?.sensors?.length || 0} Nodes</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-500 text-[10px] uppercase">CCTV Feeds</span>
          <p className="text-base font-bold text-emerald-400 mt-0.5">{twinData?.cameras?.length || 0} Cameras</p>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-slate-500 text-[10px] uppercase">Geol. Reserves</span>
          <p className="text-base font-bold text-amber-400 mt-0.5">
            {twinData?.profile?.total_geological_reserve_mt || twinData?.profile?.geological_reserves_mt ? `${twinData.profile.total_geological_reserve_mt || twinData.profile.geological_reserves_mt} MT` : 'Documented'}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {activeViewTab === '3d' ? (
        <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
          {/* 3D WebGL Canvas */}
          <MineCanvas3D
            twinData={twinData}
            layers={layers}
            viewMode={viewMode}
            selectedObject={selectedObject}
            onSelectObject={setSelectedObject}
            focusTarget={focusTarget}
            onFocusComplete={() => setFocusTarget(null)}
          />

          {/* Floating Layer Controls (Top Left) */}
          <LayerControls
            layers={layers}
            onChange={setLayers}
            isOpen={isLayerPanelOpen}
            onToggleOpen={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          />

          {/* Floating Scene Presets & Scenarios Toolbar (Top Right) */}
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

          {/* Contextual Object Inspector (Top Right Drawer) */}
          <ObjectInspector
            selectedObject={selectedObject}
            onClose={() => setSelectedObject(null)}
            twinData={twinData}
            onFocusTarget={setFocusTarget}
          />

          {/* Replay Timeline Controller (Bottom Bar) */}
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
        /* Spatial Matrix Tabular View */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
            {[
              { id: 'coordinates', label: 'Cardinal Points (A–I)', icon: Compass, count: twinData?.coordinates?.length || twinData?.boundary?.vertices_3d?.length },
              { id: 'seams', label: 'Coal Seams Stratigraphy', icon: Layers, count: twinData?.seams?.length },
              { id: 'provenance', label: 'Document Provenance', icon: FileText, count: twinData?.quality_record ? 1 : 0 },
              { id: 'sensors', label: 'IoT Sensors', icon: Activity, count: twinData?.sensors?.length },
              { id: 'cameras', label: 'Camera Feeds', icon: Video, count: twinData?.cameras?.length },
              { id: 'machinery', label: 'Machinery', icon: Cpu, count: twinData?.equipment?.length },
              { id: 'incidents', label: 'Hazards', icon: AlertTriangle, count: twinData?.active_incidents?.length }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = matrixTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMatrixTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className="px-1.5 py-0.2 bg-slate-800 rounded text-[10px]">{tab.count || 0}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  {matrixTab === 'coordinates' && (
                    <>
                      <th className="py-3 px-4">Point</th>
                      <th className="py-3 px-4">Latitude (DMS)</th>
                      <th className="py-3 px-4">Longitude (DMS)</th>
                      <th className="py-3 px-4">3D Local X (m)</th>
                      <th className="py-3 px-4">3D Local Z (m)</th>
                      <th className="py-3 px-4">Trust Status</th>
                      <th className="py-3 px-4">Source Provenance</th>
                    </>
                  )}
                  {matrixTab === 'seams' && (
                    <>
                      <th className="py-3 px-4">Seam Name</th>
                      <th className="py-3 px-4">Depth Range</th>
                      <th className="py-3 px-4">Thickness</th>
                      <th className="py-3 px-4">Coal Grade</th>
                      <th className="py-3 px-4">Stratigraphic Order</th>
                      <th className="py-3 px-4">Trust</th>
                      <th className="py-3 px-4">Provenance</th>
                    </>
                  )}
                  {matrixTab === 'provenance' && (
                    <>
                      <th className="py-3 px-4">Source Document</th>
                      <th className="py-3 px-4">Document Hash (SHA-256)</th>
                      <th className="py-3 px-4">Page</th>
                      <th className="py-3 px-4">Authority / Issuer</th>
                      <th className="py-3 px-4">Quality Score</th>
                    </>
                  )}
                  {matrixTab === 'sensors' && (
                    <>
                      <th className="py-3 px-4">Identifier</th>
                      <th className="py-3 px-4">Sensor Name</th>
                      <th className="py-3 px-4">Coordinate X</th>
                      <th className="py-3 px-4">Coordinate Y</th>
                      <th className="py-3 px-4">Depth Z</th>
                      <th className="py-3 px-4">Thresholds</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  {matrixTab === 'cameras' && (
                    <>
                      <th className="py-3 px-4">Identifier</th>
                      <th className="py-3 px-4">Camera Name</th>
                      <th className="py-3 px-4">Coordinate X</th>
                      <th className="py-3 px-4">Coordinate Y</th>
                      <th className="py-3 px-4">Depth Z</th>
                      <th className="py-3 px-4">Orientation</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  {matrixTab === 'machinery' && (
                    <>
                      <th className="py-3 px-4">Identifier</th>
                      <th className="py-3 px-4">Equipment Name</th>
                      <th className="py-3 px-4">Coordinate X</th>
                      <th className="py-3 px-4">Coordinate Y</th>
                      <th className="py-3 px-4">Depth Z</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  {matrixTab === 'incidents' && (
                    <>
                      <th className="py-3 px-4">Identifier</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Coordinate X</th>
                      <th className="py-3 px-4">Coordinate Y</th>
                      <th className="py-3 px-4">Depth Z</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {matrixTab === 'coordinates' &&
                  (twinData?.coordinates && twinData.coordinates.length > 0
                    ? twinData.coordinates.map((c) => (
                        <tr key={c.point_label} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold text-amber-400">Point {c.point_label}</td>
                          <td className="py-2.5 px-4 text-cyan-400">{c.lat_dms_raw || c.latitude_dms || `${c.latitude?.toFixed(6)}°`}</td>
                          <td className="py-2.5 px-4 text-cyan-400">{c.lon_dms_raw || c.longitude_dms || `${c.longitude?.toFixed(6)}°`}</td>
                          <td className="py-2.5 px-4 text-slate-300">{(c.x ?? c.local_x ?? 0).toFixed(1)} m</td>
                          <td className="py-2.5 px-4 text-slate-300">{(c.z ?? c.local_z ?? 0).toFixed(1)} m</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                              {c.geometry_status || 'SOURCE_DERIVED'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[200px]">
                            {c.prov_doc_title || c.provenance?.document_title || 'Tender Notice'} (P.{c.prov_page_number || c.provenance?.page_number || 1})
                          </td>
                        </tr>
                      ))
                    : twinData?.boundary?.vertices_3d?.map((v) => (
                        <tr key={v.point_label || v.label} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold text-amber-400">Point {v.point_label || v.label}</td>
                          <td className="py-2.5 px-4 text-cyan-400">{v.latitude?.toFixed(6)}° N</td>
                          <td className="py-2.5 px-4 text-cyan-400">{v.longitude?.toFixed(6)}° E</td>
                          <td className="py-2.5 px-4 text-slate-300">{v.x.toFixed(1)} m</td>
                          <td className="py-2.5 px-4 text-slate-300">{v.z.toFixed(1)} m</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">
                              {twinData?.boundary?.geometry_status || 'APPROXIMATE'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                            {twinData?.boundary?.prov_doc_title || twinData?.boundary?.provenance?.document_title || 'Atlas Reconnaissance'}
                          </td>
                        </tr>
                      )))}

                {matrixTab === 'seams' &&
                  twinData?.seams?.map((s) => (
                    <tr key={s.seam_name} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-emerald-400">{s.seam_name}</td>
                      <td className="py-2.5 px-4 text-cyan-400">
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
                      <td className="py-2.5 px-4 text-slate-400">#{s.stratigraphic_order || s.sequence_order || 1}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                          {s.geometry_status || 'SOURCE_DERIVED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px] truncate max-w-[200px]">
                        {s.prov_doc_title || s.provenance?.document_title || 'Project Report'} (P.{s.prov_page_number || s.provenance?.page_number || 1})
                      </td>
                    </tr>
                  ))}

                {matrixTab === 'provenance' && twinData?.quality_record && (
                  <tr className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-white">{twinData.quality_record.source_title || 'Ministry of Coal Document'}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-[10px] font-mono break-all max-w-[180px]">
                      {twinData.quality_record.source_sha256 || 'SHA-256 Validated'}
                    </td>
                    <td className="py-2.5 px-4 text-cyan-400">Page {twinData.quality_record.source_page_number || 1}</td>
                    <td className="py-2.5 px-4 text-amber-300">{twinData.quality_record.source_authority || 'Ministry of Coal, Govt of India'}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">
                        Score: {twinData.quality_record.overall_score || 95}/100
                      </span>
                    </td>
                  </tr>
                )}

                {matrixTab === 'sensors' &&
                  twinData?.sensors?.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-amber-400">{s.sensor_code}</td>
                      <td className="py-2.5 px-4">{s.name}</td>
                      <td className="py-2.5 px-4 text-cyan-400">{s.x.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-cyan-400">{s.y.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-rose-400">{s.z.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-slate-400">{s.unit} ({s.warning_threshold}/{s.critical_threshold})</td>
                      <td className="py-2.5 px-4"><StatusBadge status={s.status} size="sm" /></td>
                    </tr>
                  ))}

                {matrixTab === 'cameras' &&
                  twinData?.cameras?.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-amber-400">{c.camera_code}</td>
                      <td className="py-2.5 px-4">{c.name}</td>
                      <td className="py-2.5 px-4 text-cyan-400">{c.x.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-cyan-400">{c.y.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-rose-400">{c.z.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-slate-400">Yaw: {c.yaw}° | Pitch: {c.pitch}° | FOV: {c.fov}°</td>
                      <td className="py-2.5 px-4"><StatusBadge status={c.status} size="sm" /></td>
                    </tr>
                  ))}

                {matrixTab === 'machinery' &&
                  twinData?.equipment?.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-amber-400">{eq.equipment_code}</td>
                      <td className="py-2.5 px-4">{eq.name}</td>
                      <td className="py-2.5 px-4 text-cyan-400">{eq.x.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-cyan-400">{eq.y.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-rose-400">{eq.z.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-slate-400">{eq.category}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={eq.status} size="sm" /></td>
                    </tr>
                  ))}

                {matrixTab === 'incidents' &&
                  twinData?.active_incidents?.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-amber-400">{inc.incident_code}</td>
                      <td className="py-2.5 px-4">{inc.title}</td>
                      <td className="py-2.5 px-4 text-cyan-400">{inc.x.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-cyan-400">{inc.y.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-rose-400">{inc.z.toFixed(1)}m</td>
                      <td className="py-2.5 px-4 text-slate-400">{inc.category}</td>
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
