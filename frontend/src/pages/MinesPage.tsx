import React, { useEffect, useState } from 'react';
import { useMineContext } from '../context/MineContext';
import { mineService, realMineDataService } from '../services';
import { MineDetail, RealMineSummaryDTO, RealMineDetailDTO } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  MapPin,
  Layers,
  FileText,
  ShieldCheck,
  Compass,
  Database,
  Building,
  Hash,
  BookOpen,
  Info,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const MinesPage: React.FC = () => {
  const { mines, setSelectedMineId, selectedMineId } = useMineContext();
  const [activeTab, setActiveTab] = useState<'SIMULATED' | 'REAL_BLOCKS'>('REAL_BLOCKS');
  const [selectedMineDetail, setSelectedMineDetail] = useState<MineDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Real Mine Data state
  const [realMines, setRealMines] = useState<RealMineSummaryDTO[]>([]);
  const [selectedRealMineId, setSelectedRealMineId] = useState<number | null>(null);
  const [realMineDetail, setRealMineDetail] = useState<RealMineDetailDTO | null>(null);
  const [isLoadingReal, setIsLoadingReal] = useState<boolean>(false);

  useEffect(() => {
    realMineDataService.getRealMines()
      .then((data) => {
        setRealMines(data);
        if (data.length > 0 && !selectedRealMineId) {
          setSelectedRealMineId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedRealMineId && activeTab === 'REAL_BLOCKS') {
      setIsLoadingReal(true);
      realMineDataService.getRealMineDetail(selectedRealMineId)
        .then(setRealMineDetail)
        .catch(console.error)
        .finally(() => setIsLoadingReal(false));
    }
  }, [selectedRealMineId, activeTab]);

  useEffect(() => {
    if (selectedMineId && activeTab === 'SIMULATED') {
      setIsLoadingDetail(true);
      mineService.getMineDetail(selectedMineId)
        .then(setSelectedMineDetail)
        .catch(console.error)
        .finally(() => setIsLoadingDetail(false));
    }
  }, [selectedMineId, activeTab]);

  return (
    <div className="space-y-6">
      {/* Page Header & Directory Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            Coal Asset Knowledge & Spatial Foundation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative coal block profiles, geological stratigraphy, statutory clearances & page-level provenance.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('REAL_BLOCKS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'REAL_BLOCKS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Real Coal Blocks (6)
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
              Source Verified
            </span>
          </button>
          <button
            onClick={() => setActiveTab('SIMULATED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'SIMULATED'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Demo Operational Mines (3)
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800">
              Simulated
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: REAL COAL BLOCKS & PROVENANCE */}
      {activeTab === 'REAL_BLOCKS' && (
        <div className="space-y-6">
          {/* Real Blocks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {realMines.map((m) => {
              const isSelected = m.id === selectedRealMineId;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedRealMineId(m.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer backdrop-blur-md ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 text-[10px] font-mono font-bold border border-amber-800/60">
                        {m.code}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">{m.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{m.coalfield}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      m.geometry_status === 'APPROXIMATE'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                    }`}>
                      {m.geometry_status}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {m.district}, {m.state}
                    </span>
                    <span className="text-slate-300 font-semibold">
                      {m.total_area_sq_km ? `${m.total_area_sq_km} sq.km` : 'Area in Summary'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Real Mine Drilldown */}
          {realMineDetail && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-6">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {realMineDetail.profile?.official_name || realMineDetail.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-800">
                      SOURCE-DERIVED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Coalfield: {realMineDetail.profile?.coalfield} • Topo Sheet: {realMineDetail.profile?.topo_sheet_no || 'NA'} • Exploration: {realMineDetail.profile?.exploration_agency || 'CMPDI / GSI'}
                  </p>
                </div>

                {/* Primary Provenance Card */}
                {realMineDetail.profile?.provenance && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono flex items-center gap-3">
                    <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="text-slate-200 font-bold block">
                        {realMineDetail.profile.provenance.document_title}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Page {realMineDetail.profile.provenance.page_number} • SHA256: {realMineDetail.profile.provenance.document_hash.substring(0, 12)}...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Core Geological & Allocation Attributes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Geological Block Area</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">
                    {realMineDetail.profile?.geological_block_area_sq_km ? `${realMineDetail.profile.geological_block_area_sq_km} sq.km` : 'NA'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">Mining Lease: {realMineDetail.profile?.mining_lease_area_ha ? `${realMineDetail.profile.mining_lease_area_ha} Ha` : 'NA'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Total Geological Reserve</span>
                  <p className="text-sm font-bold text-amber-400 mt-1">
                    {realMineDetail.profile?.total_geological_reserve_mt ? `${realMineDetail.profile.total_geological_reserve_mt} MT` : 'NA'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">Extractable: {realMineDetail.profile?.total_extractable_reserve_mt ? `${realMineDetail.profile.total_extractable_reserve_mt} MT` : 'NA'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Target Capacity</span>
                  <p className="text-sm font-bold text-slate-200 mt-1">
                    {realMineDetail.profile?.target_capacity_raw || 'NA'}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">Method: {realMineDetail.profile?.mining_method_documented || 'NA'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Allocatee / Prior Holder</span>
                  <p className="text-xs font-medium text-slate-300 mt-1 line-clamp-2">
                    {realMineDetail.profile?.prior_allocatee_name || 'Unallocated / In-Principle'}
                  </p>
                </div>
              </div>

              {/* Seams Stratigraphic Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Documented Coal Seams & Stratigraphy ({realMineDetail.seams.length} Seams)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Seam Name</th>
                        <th className="p-2.5">Thickness (m)</th>
                        <th className="p-2.5">Geological Reserve</th>
                        <th className="p-2.5">Extractable Reserve</th>
                        <th className="p-2.5">Grade</th>
                        <th className="p-2.5">Method</th>
                        <th className="p-2.5">Source Page</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {realMineDetail.seams.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-bold text-slate-200">{s.seam_name}</td>
                          <td className="p-2.5 text-slate-300">{s.thickness_raw || (s.thickness_min_m ? `${s.thickness_min_m}-${s.thickness_max_m}` : 'NA')}</td>
                          <td className="p-2.5 text-amber-300">{s.geological_reserve_raw || (s.geological_reserve_mt ? `${s.geological_reserve_mt} MT` : 'NA')}</td>
                          <td className="p-2.5 text-slate-400">{s.extractable_reserve_raw || (s.extractable_reserve_mt ? `${s.extractable_reserve_mt} MT` : 'NA')}</td>
                          <td className="p-2.5 text-slate-300">{s.grade || 'NA'}</td>
                          <td className="p-2.5 text-slate-400">{s.mining_method || 'NA'}</td>
                          <td className="p-2.5 text-[10px] text-slate-500">Page {s.provenance?.page_number || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Coordinates / Cardinal Points Table */}
              {realMineDetail.coordinates.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    Boundary Cardinal Points & Datum Reference ({realMineDetail.coordinates.length} Points)
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Point</th>
                          <th className="p-2.5">WGS84 Latitude</th>
                          <th className="p-2.5">WGS84 Longitude</th>
                          <th className="p-2.5">CoalGrid X</th>
                          <th className="p-2.5">CoalGrid Y</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Citation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                        {realMineDetail.coordinates.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-800/30">
                            <td className="p-2.5 font-bold text-amber-400">{c.point_label}</td>
                            <td className="p-2.5 text-slate-300">{c.lat_dms_raw || c.latitude}</td>
                            <td className="p-2.5 text-slate-300">{c.lon_dms_raw || c.longitude}</td>
                            <td className="p-2.5 text-slate-400">{c.x_proj_raw || (c.x_proj ? c.x_proj.toLocaleString() : 'NA')}</td>
                            <td className="p-2.5 text-slate-400">{c.y_proj_raw || (c.y_proj ? c.y_proj.toLocaleString() : 'NA')}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">
                                {c.geometry_status}
                              </span>
                            </td>
                            <td className="p-2.5 text-[10px] text-slate-500">Page {c.provenance?.page_number || '10'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Statutory Clearances Status */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Statutory Clearances & Regulatory Approvals
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {realMineDetail.clearances.map((cl) => (
                    <div key={cl.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between text-xs font-mono">
                      <div>
                        <span className="text-slate-200 font-bold block">{cl.clearance_type.replace(/_/g, ' ')}</span>
                        <p className="text-[11px] text-slate-400 mt-1">{cl.status_raw || cl.status}</p>
                        {cl.reference_number && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">Ref: {cl.reference_number}</span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        cl.status === 'APPROVED' || cl.status === 'ACQUIRED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : cl.status === 'NOT_REQUIRED' || cl.status === 'IN_PRINCIPAL_APPROVED'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {cl.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SIMULATED OPERATIONAL DEMO MINES (PHASES 1-10) */}
      {activeTab === 'SIMULATED' && (
        <div className="space-y-6">
          {/* Mines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {mines.map((mine) => {
              const isCurrent = mine.id === selectedMineId;
              return (
                <div
                  key={mine.id}
                  onClick={() => setSelectedMineId(mine.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                    isCurrent
                      ? 'bg-slate-900 border-amber-500/70 shadow-xl shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 text-[10px] font-mono font-bold border border-amber-800/60">
                        {mine.code}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2">{mine.name}</h3>
                    </div>
                    <StatusBadge status={mine.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{mine.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {mine.district}, {mine.state}
                    </span>
                    <span className="text-slate-300 font-bold">{mine.mine_type}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Deep Drilldown: Selected Mine Levels & Zones */}
          {selectedMineDetail && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Underground Seams & Levels: {selectedMineDetail.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Spatial breakdown of extraction levels, ventilation galleries, and working faces.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">Total Sensors: <b className="text-white">{selectedMineDetail.total_sensors}</b></span>
                  <span className="text-slate-400">Cameras: <b className="text-white">{selectedMineDetail.total_cameras}</b></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedMineDetail.levels.map((lvl) => (
                  <div key={lvl.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800">
                          {lvl.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-200 mt-1">{lvl.name}</h4>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        Depth: <b className="text-white">{lvl.depth_meters}m</b>
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-900">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Spatial Zones:</p>
                      {lvl.zones.length === 0 ? (
                        <p className="text-xs text-slate-600 font-mono">No zones defined</p>
                      ) : (
                        lvl.zones.map((z) => (
                          <div key={z.id} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                            <div>
                              <span className="text-slate-300 font-medium">{z.name}</span>
                              <span className="text-[10px] text-slate-500 block">
                                Origin: ({z.origin_x}, {z.origin_y}, {z.origin_z}) • Dim: {z.width}x{z.length}m
                              </span>
                            </div>
                            <StatusBadge status={z.risk_category} size="sm" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
