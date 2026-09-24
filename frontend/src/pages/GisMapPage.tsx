import React, { useEffect, useState, useCallback } from 'react';
import { TypewriterText } from '../components/ui/typewriter-text';
import { useMineContext } from '../context/MineContext';
import { gisService } from '../services';
import {
  GisMineOverviewItemDTO,
  GisOverviewResponseDTO
} from '../types';
import { MineOverviewMap } from '../components/gis/MineOverviewMap';
import { MineQuickProfile } from '../components/gis/MineQuickProfile';
import { MineTelemetryDrawer } from '../components/gis/MineTelemetryDrawer';
import { DetailedGisView } from '../components/gis/DetailedGisView';
import { RiskBadge } from '../components/gis/MineRiskMarker';
import {
  Search,
  RefreshCw,
  ChevronRight,
  Building2,
  Globe
} from 'lucide-react';
import clsx from 'clsx';

export const GisMapPage: React.FC = () => {
  const { selectedMine, mines, setSelectedMineId } = useMineContext();

  // Navigation Hierarchy: 'OVERVIEW' (Level 1) or 'DETAILED' (Level 3)
  const [viewMode, setViewMode] = useState<'OVERVIEW' | 'DETAILED'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('view') === 'detailed' || !!params.get('mine')) ? 'DETAILED' : 'OVERVIEW';
  });

  // Level 1: Multi-Mine Overview State
  const [overviewData, setOverviewData] = useState<GisOverviewResponseDTO | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState<boolean>(true);
  const [selectedOverviewMine, setSelectedOverviewMine] = useState<GisMineOverviewItemDTO | null>(null);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState<boolean>(false);
  const [overviewRosterSearch, setOverviewRosterSearch] = useState<string>('');
  const [overviewRiskFilter, setOverviewRiskFilter] = useState<string>('ALL');

  // Handle browser Back / Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const isDetailed = params.get('view') === 'detailed' || !!params.get('mine');
      const mineParam = params.get('mine');

      if (isDetailed) {
        setViewMode('DETAILED');
        if (mineParam) {
          const mineId = parseInt(mineParam, 10);
          if (!isNaN(mineId)) {
            setSelectedMineId(mineId);
          }
        }
      } else {
        setViewMode('OVERVIEW');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setSelectedMineId]);

  // Handle initial deep-link parameter for mine ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mineParam = params.get('mine');
    if (mineParam) {
      const mineId = parseInt(mineParam, 10);
      if (!isNaN(mineId) && selectedMine?.id !== mineId) {
        setSelectedMineId(mineId);
      }
    }
  }, [setSelectedMineId]);

  // Fetch Level 1 Overview data
  const fetchOverview = useCallback(async () => {
    setIsOverviewLoading(true);
    try {
      const data = await gisService.getMinesOverview();
      setOverviewData(data);
      if (data.mines.length > 0) {
        setSelectedOverviewMine(prev => {
          if (prev && data.mines.some(m => m.id === prev.id)) {
            return data.mines.find(m => m.id === prev.id) || data.mines[0];
          }
          if (selectedMine && data.mines.some(m => m.id === selectedMine.id)) {
            return data.mines.find(m => m.id === selectedMine.id) || data.mines[0];
          }
          return data.mines[0];
        });
      }
    } catch (err) {
      console.error('Failed to fetch GIS multi-mine overview:', err);
    } finally {
      setIsOverviewLoading(false);
    }
  }, [selectedMine?.id]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Navigate to Level 3 Detailed 2D GIS with selected mine pre-selected
  const handleOpenFullMineProfile = (mineItem: GisMineOverviewItemDTO) => {
    setSelectedMineId(mineItem.id);
    setViewMode('DETAILED');

    // Update URL query parameters for deep linking & history
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'detailed');
    url.searchParams.set('mine', mineItem.id.toString());
    window.history.pushState({ view: 'detailed', mine: mineItem.id }, '', url.toString());
  };

  // Return from Level 3 Detailed GIS to Level 1 Overview
  const handleBackToOverview = () => {
    setViewMode('OVERVIEW');
    fetchOverview();

    // Update URL query parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.delete('mine');
    window.history.pushState({ view: 'overview' }, '', url.toString());
  };

  return (
    <div className="flex flex-col gap-6 font-sans text-slate-100 bg-[#080A09] min-h-[calc(100vh-4.5rem)] p-1">
      {viewMode === 'OVERVIEW' ? (
        /* ========================================================================= */
        /* LEVEL 1: MULTI-MINE SPATIAL COMMAND OVERVIEW                               */
        /* ========================================================================= */
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* 1. Page Header & Fleet KPI Strip */}
          <div className="pb-5 border-b border-[#1B211E] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Globe className="w-4.5 h-4.5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">
                  <TypewriterText text="2D GIS command & multi-mine spatial overview" speed={30} delay={100} />
                </h1>
                <p className="text-[11.5px] text-slate-500 mt-0.5">
                  Authoritative multi-mine spatial foundation, fleet operational risk distribution &amp; live statutory telemetry
                </p>
              </div>
            </div>

            {/* Overview KPI Strip */}
            {overviewData && (
              <div className="border border-[#1B211E] rounded-lg grid grid-cols-2 sm:grid-cols-5 divide-x divide-[#1B211E] overflow-hidden bg-[#0D100F]">
                <div className="px-3 py-2 flex flex-col items-center">
                  <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">Authorized Mines</span>
                  <span className="font-semibold text-xs text-white mt-0.5">{overviewData.total_authorized_mines} Mines</span>
                </div>
                <div className="px-3 py-2 flex flex-col items-center">
                  <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">High / Critical Risk</span>
                  <span className="font-semibold text-rose-400 text-xs mt-0.5">
                    {overviewData.critical_risk_mines + overviewData.high_risk_mines}
                  </span>
                </div>
                <div className="px-3 py-2 flex flex-col items-center">
                  <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">Active Incidents</span>
                  <span className="font-semibold text-rose-400 text-xs mt-0.5">{overviewData.total_active_incidents}</span>
                </div>
                <div className="px-3 py-2 flex flex-col items-center">
                  <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">Open Field Tasks</span>
                  <span className="font-semibold text-sky-400 text-xs mt-0.5">{overviewData.total_open_tasks}</span>
                </div>
                <div className="px-3 py-2 flex flex-col items-center">
                  <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">Telemetry Health</span>
                  <span className="font-semibold text-emerald-400 text-xs mt-0.5">
                    {overviewData.total_sensors_online}/{overviewData.total_sensors_count}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Map canvas + Side panels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Map Canvas (8 Columns) */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <MineOverviewMap
                mines={overviewData?.mines || []}
                selectedMine={selectedOverviewMine}
                onSelectMine={(m) => setSelectedOverviewMine(m)}
                isLoading={isOverviewLoading}
              />
            </div>

            {/* Side Controls & Quick Profile (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Level 2: Mine Quick Profile Card */}
              <MineQuickProfile
                mine={selectedOverviewMine}
                onInspectTelemetry={(m) => {
                  setSelectedOverviewMine(m);
                  setIsTelemetryDrawerOpen(true);
                }}
                onFullProfile={(m) => handleOpenFullMineProfile(m)}
                onClose={() => setSelectedOverviewMine(null)}
              />

              {/* Authorized Mine Fleet Roster Card */}
              <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-4 flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-[#1B211E] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Authorized Fleet Roster ({overviewData?.mines.length || 0})
                    </h3>
                  </div>
                  <button
                    onClick={fetchOverview}
                    className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Refresh Fleet Overview"
                  >
                    <RefreshCw className={clsx('w-3.5 h-3.5', isOverviewLoading && 'animate-spin')} />
                  </button>
                </div>

                {/* Filter & Search */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter fleet by name / state..."
                      value={overviewRosterSearch}
                      onChange={(e) => setOverviewRosterSearch(e.target.value)}
                      className="w-full bg-[#080A09] border border-[#1B211E] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  {/* Risk filter chips */}
                  <div className="flex items-center gap-1 text-[10px] overflow-x-auto pb-1">
                    {(['ALL', 'CRITICAL', 'HIGH', 'MED', 'LOW'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setOverviewRiskFilter(r)}
                        className={clsx(
                          'px-2 py-0.5 rounded font-mono font-semibold transition-colors cursor-pointer shrink-0',
                          overviewRiskFilter === r
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-[#141A17] text-slate-400 hover:text-white'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mine Cards List */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {(overviewData?.mines || [])
                    .filter(m => {
                      const matchSearch = overviewRosterSearch.trim() === '' ||
                        m.name.toLowerCase().includes(overviewRosterSearch.toLowerCase()) ||
                        m.code.toLowerCase().includes(overviewRosterSearch.toLowerCase()) ||
                        m.state.toLowerCase().includes(overviewRosterSearch.toLowerCase()) ||
                        m.district.toLowerCase().includes(overviewRosterSearch.toLowerCase());
                      const matchRisk = overviewRiskFilter === 'ALL' ||
                        m.current_risk_band === overviewRiskFilter ||
                        (overviewRiskFilter === 'MED' && m.current_risk_band === 'MEDIUM');
                      return matchSearch && matchRisk;
                    })
                    .map((m) => {
                      const isSelected = selectedOverviewMine?.id === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedOverviewMine(m)}
                          className={clsx(
                            'p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2',
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                              : 'bg-[#080A09] border-[#1B211E] hover:border-[#27302B] hover:bg-[#121614]'
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-200 truncate">{m.name}</span>
                              {m.is_simulated === 'YES' && (
                                <span className="text-[8px] font-mono px-1 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                                  SIM
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {m.district}, {m.state} · {m.online_sensors}/{m.total_sensors} Live
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <RiskBadge band={m.current_risk_band} score={m.current_risk_score} />
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* LEVEL 3: DETAILED 2D GIS VIEW                                             */
        /* ========================================================================= */
        <DetailedGisView
          onBackToOverview={handleBackToOverview}
          targetMineId={selectedMine?.id}
        />
      )}

      {/* Global Read-Only Mine Telemetry Inspection Drawer */}
      <MineTelemetryDrawer
        mine={selectedOverviewMine}
        isOpen={isTelemetryDrawerOpen}
        onClose={() => setIsTelemetryDrawerOpen(false)}
        onOpenDetailedGis={(m) => {
          handleOpenFullMineProfile(m);
        }}
      />
    </div>
  );
};