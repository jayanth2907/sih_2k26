import React, { useEffect, useRef, useState } from 'react';
import { GisMineOverviewItemDTO } from '../../types';
import { createMineMarkerHtml, getRiskVisualTokens } from './MineRiskMarker';
import { MineOverviewLegend } from './MineOverviewLegend';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  Plus,
  Minus,
  Maximize2,
  Search,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

export type OverviewBasemapType = 'satellite' | 'terrain';

interface BasemapConfig {
  id: OverviewBasemapType;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

const OVERVIEW_BASEMAPS: Record<OverviewBasemapType, BasemapConfig> = {
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; USGS, Intermap',
    maxZoom: 19
  }
};

interface MineOverviewMapProps {
  mines: GisMineOverviewItemDTO[];
  selectedMine: GisMineOverviewItemDTO | null;
  onSelectMine: (mine: GisMineOverviewItemDTO | null) => void;
  isLoading?: boolean;
}

export const MineOverviewMap: React.FC<MineOverviewMapProps> = ({
  mines,
  selectedMine,
  onSelectMine,
  isLoading = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeBasemap, setActiveBasemap] = useState<OverviewBasemapType>('satellite');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Initialize Map instance & listeners
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.5000, 84.5000],
        zoom: 6,
        zoomControl: false,
        attributionControl: false
      });

      // Default Basemap
      const config = OVERVIEW_BASEMAPS.satellite;
      const tileLayer = L.tileLayer(config.url, {
        maxZoom: config.maxZoom,
        attribution: config.attribution
      });
      tileLayer.addTo(map);
      currentTileLayerRef.current = tileLayer;

      L.control.attribution({ position: 'bottomright', prefix: 'TRINETRA MULTI-MINE GIS' }).addTo(map);

      // Layer groups
      boundaryLayerGroupRef.current = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = L.layerGroup().addTo(map);

      // Clicking empty map space deselects the mine and closes the quick profile card
      map.on('click', () => {
        onSelectMine(null);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
    };
  }, [onSelectMine]);

  // 2. Basemap Switcher
  const switchBasemap = (type: OverviewBasemapType) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const config = OVERVIEW_BASEMAPS[type];
    const newLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      attribution: config.attribution
    });

    newLayer.addTo(map);
    newLayer.bringToBack();
    currentTileLayerRef.current = newLayer;
    setActiveBasemap(type);
  };

  // 3. Fit Bounds to all authorized mines
  const handleFitAllMines = () => {
    const map = mapInstanceRef.current;
    if (!map || mines.length === 0) return;

    const latLngs = mines.map(m => L.latLng(m.latitude, m.longitude));
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 12);
    } else if (latLngs.length > 1) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  };

  // 4. Update Markers and Boundaries whenever mines or selectedMine changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerGroupRef.current || !boundaryLayerGroupRef.current) return;

    markersLayerGroupRef.current.clearLayers();
    boundaryLayerGroupRef.current.clearLayers();

    if (mines.length === 0) return;

    const allLatLngs: L.LatLng[] = [];

    // Render Compact Industrial Spatial Risk Markers
    mines.forEach((m) => {
      const isSelected = selectedMine?.id === m.id;
      const markerHtml = createMineMarkerHtml(m.current_risk_band, isSelected);

      const icon = L.divIcon({
        className: 'custom-mine-spatial-marker',
        html: markerHtml,
        iconSize: isSelected ? [36, 36] : [26, 26],
        iconAnchor: isSelected ? [18, 18] : [13, 13]
      });

      const marker = L.marker([m.latitude, m.longitude], { icon });

      // Click on marker selects mine and stops event propagation
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectMine(m);
      });

      // Lightweight hover tooltip only
      const tokens = getRiskVisualTokens(m.current_risk_band);
      marker.bindTooltip(
        `
        <div class="font-sans text-xs p-1">
          <div class="font-bold text-white flex items-center justify-between gap-3">
            <span>${m.name}</span>
            <span class="font-mono text-[10px] px-1.5 py-0.2 rounded" style="background-color: ${tokens.bgRgba}; color: white;">
              ${m.current_risk_band} (${m.current_risk_score.toFixed(1)})
            </span>
          </div>
          <div class="text-[10px] text-slate-400 mt-1">
            ${m.operator || 'Ministry of Coal / CMPDI'} · ${m.district}, ${m.state}
          </div>
          <div class="text-[9.5px] text-slate-400 mt-0.5 font-mono">
            ${m.online_sensors}/${m.total_sensors} Sensors Online · ${m.open_incidents_count} Incidents
          </div>
        </div>
        `,
        { className: 'bg-[#0D100F] border border-[#232A26] text-white rounded-lg shadow-2xl p-1', sticky: false }
      );

      markersLayerGroupRef.current?.addLayer(marker);
      allLatLngs.push(L.latLng(m.latitude, m.longitude));
    });

    // Render Selected Mine Boundary Polygon Preview
    if (selectedMine && selectedMine.simplified_boundary && selectedMine.simplified_boundary.length >= 3) {
      const ring = selectedMine.simplified_boundary.map(([lon, lat]) => [lat, lon] as [number, number]);
      const tokens = getRiskVisualTokens(selectedMine.current_risk_band);

      const polygon = L.polygon(ring, {
        color: tokens.baseColor,
        weight: 3,
        opacity: 0.9,
        fillColor: tokens.baseColor,
        fillOpacity: 0.15,
        dashArray: selectedMine.is_simulated === 'YES' ? '6, 6' : undefined
      });

      boundaryLayerGroupRef.current.addLayer(polygon);
    }

    // Auto-fit on initial load if no selected mine
    if (!selectedMine && allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [mines, selectedMine?.id, onSelectMine]);

  // 5. When selectedMine changes externally, pan to it smoothly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedMine) return;

    map.flyTo([selectedMine.latitude, selectedMine.longitude], 12, {
      duration: 1.2
    });
  }, [selectedMine?.id]);

  // Filtered search list
  const filteredMines = searchQuery.trim()
    ? mines.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.current_risk_band.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="relative w-full h-[620px] rounded-xl border border-[#1B211E] overflow-hidden bg-[#050706] shadow-2xl">
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Search Overlay (Top-Left) */}
      <div className="absolute top-3.5 left-3.5 z-10 w-72">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search authorized mines, state, risk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0D100F]/95 backdrop-blur-md border border-[#232A26] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 shadow-2xl font-sans"
          />
        </div>

        {/* Autocomplete Search Dropdown */}
        {filteredMines.length > 0 && searchQuery.trim().length > 0 && (
          <div className="mt-1 bg-[#0D100F] border border-[#232A26] rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-[#1B211E] animate-in fade-in duration-150">
            {filteredMines.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onSelectMine(m);
                  setSearchQuery('');
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#171B18] transition-colors flex flex-col gap-0.5 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200">{m.name}</span>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {m.current_risk_band} ({m.current_risk_score.toFixed(1)})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate">{m.district}, {m.state}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Navigation Controls (Left-Middle) */}
      <div className="absolute top-16 left-3.5 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          title="Zoom In"
          className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-slate-200 flex items-center justify-center shadow-lg transition-all hover:scale-110 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          title="Zoom Out"
          className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-slate-200 flex items-center justify-center shadow-lg transition-all hover:scale-110 cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitAllMines}
          title="Fit All Mines"
          className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-amber-400 flex items-center justify-center shadow-lg transition-all hover:scale-110 cursor-pointer"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              mapContainerRef.current?.requestFullscreen?.();
            } else {
              document.exitFullscreen?.();
            }
          }}
          title="Fullscreen Toggle"
          className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-slate-300 flex items-center justify-center shadow-lg transition-all hover:scale-110 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Basemap Switcher (Top-Right) */}
      <div
        role="group"
        aria-label="Basemap Selector"
        className="absolute top-3.5 right-3.5 z-20 bg-[#0D100F]/95 backdrop-blur-md border border-[#232A26] rounded-full px-3.5 py-1 shadow-2xl flex items-center gap-2 text-xs font-mono"
      >
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none shrink-0">Basemap:</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {(['satellite', 'terrain'] as OverviewBasemapType[]).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={activeBasemap === type}
              onClick={() => switchBasemap(type)}
              className={clsx(
                'px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer capitalize flex items-center gap-1.5 focus:outline-hidden',
                activeBasemap === type
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#1E2522]'
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', activeBasemap === type ? 'bg-slate-950' : 'bg-slate-500')} />
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Permanent Legend Bar (Bottom) */}
      <div className="absolute bottom-3 left-3.5 right-3.5 z-10">
        <MineOverviewLegend />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 font-mono text-xs text-amber-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Ingesting Multi-Mine Spatial Data...</span>
        </div>
      )}
    </div>
  );
};
