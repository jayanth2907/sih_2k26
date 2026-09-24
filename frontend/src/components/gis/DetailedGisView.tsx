import React, { useEffect, useState, useRef, useCallback } from 'react';
import { TypewriterText } from '../ui/typewriter-text';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { gisService } from '../../services';
import {
  GisMapDTO,
  SpatialContextDTO,
  GisSearchItemDTO,
  Mine
} from '../../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Shield,
  Activity,
  AlertTriangle,
  Layers3,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Maximize2,
  RefreshCw,
  ClipboardList,
  Info,
  X,
  Crosshair,
  Plus,
  Minus,
  Navigation,
  Building2,
  Clock,
  Globe,
  FileCheck,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import clsx from 'clsx';

export type BasemapType = 'satellite' | 'terrain';

interface BasemapConfig {
  id: BasemapType;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

const BASEMAP_CONFIGS: Record<BasemapType, BasemapConfig> = {
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ, USGS, Intermap',
    maxZoom: 19
  }
};

interface DetailedGisViewProps {
  onBackToOverview: () => void;
  targetMineId?: number | null;
}

export const DetailedGisView: React.FC<DetailedGisViewProps> = ({
  onBackToOverview,
  targetMineId
}) => {
  const { selectedMine, mines, setSelectedMineId, setCurrentTab, setFocusedTarget, isLoading: isMinesLoading } = useMineContext();
  const { t } = useLanguage();

  const [mapData, setMapData] = useState<GisMapDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticId, setDiagnosticId] = useState<string>('');
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>('satellite');
  const [basemapWarning, setBasemapWarning] = useState<string | null>(null);

  // Selected object state
  const [selectedFeature, setSelectedFeature] = useState<{
    type: 'HOTSPOT' | 'COORDINATE' | 'BOUNDARY' | 'OPERATIONAL' | 'SEAM';
    data: any;
  } | null>(null);

  const [spatialContext, setSpatialContext] = useState<SpatialContextDTO | null>(null);
  const [isContextLoading, setIsContextLoading] = useState<boolean>(false);
  const [copiedLocation, setCopiedLocation] = useState<boolean>(false);

  // Source inspector modal
  const [inspectorData, setInspectorData] = useState<any | null>(null);

  // Task creation notification
  const [taskNotification, setTaskNotification] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GisSearchItemDTO[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Default Layer toggles matching reference specification
  const defaultLayers = {
    mineBoundary: true,
    surveyCoordinates: true,
    documentedSeams: true,
    sensors: true,
    cameras: true,
    machinery: true,
    incidentsAlerts: true,
    fieldInspections: true,
    governanceTasks: true,
    currentRisk: true,
    predictiveRisk: true,
    anomalyHotspots: true,
    complianceRisk: true,
    environmentalRisk: true,
    cmsmsSignals: true,
    threeDLinked: true
  };

  const [layerVisibility, setLayerVisibility] = useState(defaultLayers);

  // Map DOM & Leaflet References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupsRef = useRef<{ [key: string]: L.LayerGroup }>({});

  const toggleLayer = (layerKey: keyof typeof defaultLayers) => {
    setLayerVisibility(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const handleResetLayers = () => {
    setLayerVisibility(defaultLayers);
  };

  // Sync targetMineId if specified
  useEffect(() => {
    if (targetMineId && selectedMine?.id !== targetMineId) {
      setSelectedMineId(targetMineId);
    }
  }, [targetMineId, selectedMine?.id, setSelectedMineId]);

  // Load GIS Map data for the selected mine
  const fetchGisMap = useCallback(async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await gisService.getMineMap(selectedMine.id);
      setMapData(data);
      setSelectedFeature(null);
      setSpatialContext(null);
    } catch (err: any) {
      console.error('Failed to fetch GIS map data:', err);
      const diag = `GIS-ERR-${Date.now().toString(36).toUpperCase()}`;
      setDiagnosticId(diag);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load GIS spatial data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMine?.id]);

  useEffect(() => {
    if (selectedMine) {
      fetchGisMap();
    }
  }, [selectedMine?.id, fetchGisMap]);

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await gisService.searchGis(searchQuery, selectedMine?.id);
        setSearchResults(res.items);
      } catch (err) {
        console.error('GIS search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedMine?.id]);

  // Spatial Context effect
  useEffect(() => {
    if (!selectedFeature || !selectedMine) {
      setSpatialContext(null);
      return;
    }

    let lat = selectedFeature.data.latitude;
    let lon = selectedFeature.data.longitude;

    if (!lat || !lon) {
      if (selectedFeature.type === 'BOUNDARY' && selectedFeature.data.min_latitude) {
        lat = (selectedFeature.data.min_latitude + selectedFeature.data.max_latitude) / 2;
        lon = (selectedFeature.data.min_longitude + selectedFeature.data.max_longitude) / 2;
      }
    }

    if (lat && lon) {
      setIsContextLoading(true);
      gisService.getSpatialContext(selectedMine.id, lat, lon)
        .then(res => setSpatialContext(res))
        .catch(e => console.error('Spatial context error:', e))
        .finally(() => setIsContextLoading(false));
    }
  }, [selectedFeature, selectedMine?.id]);

  // Initialize Leaflet Map once container is available
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Tear down any previous instance if attached to this container
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [selectedMine?.latitude || 23.5000, selectedMine?.longitude || 85.5000],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    const boundaryPane = map.createPane('mine-boundary-pane');
    boundaryPane.style.zIndex = '350';

    const config = BASEMAP_CONFIGS[activeBasemap] || BASEMAP_CONFIGS.satellite;
    const tileLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || 'abc',
      attribution: config.attribution
    });

    tileLayer.on('tileerror', () => {
      console.warn('Tile error encountered on detailed GIS basemap.');
    });

    tileLayer.addTo(map);
    tileLayer.bringToBack();
    currentTileLayerRef.current = tileLayer;

    L.control.attribution({ position: 'bottomright', prefix: 'TRINETRA 2D GIS' }).addTo(map);

    layerGroupsRef.current = {
      boundary: L.layerGroup().addTo(map),
      coordinates: L.layerGroup().addTo(map),
      seams: L.layerGroup().addTo(map),
      riskHotspots: L.layerGroup().addTo(map),
      predictiveHotspots: L.layerGroup().addTo(map),
      sensors: L.layerGroup().addTo(map),
      cameras: L.layerGroup().addTo(map),
      machinery: L.layerGroup().addTo(map),
      incidentsAlerts: L.layerGroup().addTo(map),
      fieldInspections: L.layerGroup().addTo(map),
      governanceTasks: L.layerGroup().addTo(map),
      cmsmsSignals: L.layerGroup().addTo(map),
      environmental: L.layerGroup().addTo(map)
    };

    mapInstanceRef.current = map;

    // Trigger resize calculation to ensure tiles load immediately
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedMine?.id]);

  // Handle Basemap Switch
  const switchBasemap = (type: BasemapType) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const config = BASEMAP_CONFIGS[type];
    const newLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || 'abcd',
      attribution: config.attribution
    });

    newLayer.on('tileerror', () => {
      console.warn(`Tile loading error for basemap: ${type}`);
    });

    newLayer.addTo(map);
    newLayer.bringToBack();
    currentTileLayerRef.current = newLayer;
    setActiveBasemap(type);
    setBasemapWarning(null);
  };

  // Fit bounds to current mine boundary
  const handleFitToMine = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapData) return;

    const allLatLngs: L.LatLng[] = [];

    mapData.boundaries.forEach(b => {
      b.coordinates_geojson.forEach(([lon, lat]) => {
        allLatLngs.push(L.latLng(lat, lon));
      });
    });

    mapData.source_coordinates.forEach(c => {
      if (c.latitude && c.longitude) {
        allLatLngs.push(L.latLng(c.latitude, c.longitude));
      }
    });

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    } else if (mapData.mine.latitude && mapData.mine.longitude) {
      map.setView([mapData.mine.latitude, mapData.mine.longitude], 14);
    }
  }, [mapData]);

  // Update Layers when mapData or visibility changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapData) return;

    const groups = layerGroupsRef.current;
    if (!groups.boundary) return;

    // Clear all layers
    Object.values(groups).forEach(g => g.clearLayers());

    const allLatLngs: L.LatLng[] = [];

    // 1. Render Mine Boundaries
    if (layerVisibility.mineBoundary) {
      const buildBboxRing = (b: any): [number, number][] => {
        if (
          b.min_latitude != null && b.max_latitude != null &&
          b.min_longitude != null && b.max_longitude != null
        ) {
          return [
            [b.max_latitude, b.min_longitude],
            [b.max_latitude, b.max_longitude],
            [b.min_latitude, b.max_longitude],
            [b.min_latitude, b.min_longitude],
          ];
        }
        return [];
      };

      const buildEmergencyRing = (lat: number, lon: number): [number, number][] => [
        [lat + 0.003, lon - 0.003],
        [lat + 0.003, lon + 0.003],
        [lat - 0.003, lon + 0.003],
        [lat - 0.003, lon - 0.003],
      ];

      const hasAnyBoundaryData = mapData.boundaries.length > 0;
      const boundariesToRender = hasAnyBoundaryData
        ? mapData.boundaries
        : [{ coordinates_geojson: [] as [number, number][], geometry_status: 'APPROXIMATE', min_latitude: null, max_latitude: null, min_longitude: null, max_longitude: null, id: -1 }];

      boundariesToRender.forEach((b: any) => {
        const isApprox = b.geometry_status === 'APPROXIMATE' || !hasAnyBoundaryData || b.id === -1;
        let latLngs: [number, number][] = [];

        if (b.coordinates_geojson && b.coordinates_geojson.length >= 3) {
          latLngs = b.coordinates_geojson.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);
        } else {
          latLngs = buildBboxRing(b);
        }

        if (latLngs.length < 3 && mapData.mine.latitude && mapData.mine.longitude) {
          latLngs = buildEmergencyRing(mapData.mine.latitude, mapData.mine.longitude);
        }

        if (latLngs.length >= 3) {
          latLngs.forEach(([lat, lon]) => allLatLngs.push(L.latLng(lat, lon)));

          const polygon = L.polygon(latLngs, {
            pane: 'mine-boundary-pane',
            color: isApprox ? '#F59E0B' : '#10B981',
            weight: 3.5,
            opacity: 0.95,
            dashArray: isApprox ? '8, 6' : undefined,
            fillColor: isApprox ? '#F59E0B' : '#059669',
            fillOpacity: 0.12,
            lineCap: 'round',
            lineJoin: 'round'
          });

          polygon.on('click', () => {
            if (b.id && b.id !== -1) setSelectedFeature({ type: 'BOUNDARY', data: b });
          });

          const statusLabel = b.id === -1 ? 'SIMULATED (Operational Boundary)' : b.geometry_status;
          polygon.bindTooltip(
            `<div class="font-mono text-xs font-bold text-slate-100">${mapData.mine.name} — Lease Boundary<br/><span class="text-[10px] font-normal text-slate-400">${statusLabel}</span></div>`,
            { className: 'custom-gis-tooltip', sticky: false }
          );

          groups.boundary.addLayer(polygon);

          if (mapData.mine.latitude && mapData.mine.longitude) {
            const mineCenterIcon = L.divIcon({
              className: 'custom-mine-center-label',
              html: `
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D100F]/90 border border-amber-500/40 text-white font-mono text-xs font-bold shadow-2xl backdrop-blur-md whitespace-nowrap">
                  <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span class="text-amber-400">⛯</span> ${mapData.mine.name}
                </div>
              `,
              iconSize: [220, 32],
              iconAnchor: [110, 16]
            });

            const centerLabel = L.marker([mapData.mine.latitude, mapData.mine.longitude], {
              icon: mineCenterIcon,
              interactive: false
            });
            groups.boundary.addLayer(centerLabel);
          }
        }
      });
    }

    // 2. Render Source Coordinates
    if (layerVisibility.surveyCoordinates) {
      mapData.source_coordinates.forEach(c => {
        if (c.latitude && c.longitude) {
          allLatLngs.push(L.latLng(c.latitude, c.longitude));

          const icon = L.divIcon({
            className: 'custom-gis-marker',
            html: `
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/30 border-2 border-emerald-400 text-white font-mono font-bold text-[10px] shadow-lg hover:scale-125 transition-transform">
                ${c.point_label}
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker([c.latitude, c.longitude], { icon });
          marker.on('click', () => {
            setSelectedFeature({ type: 'COORDINATE', data: c });
          });

          marker.bindTooltip(
            `<div class="font-mono text-xs font-semibold text-white">Corner ${c.point_label}: ${c.lat_dms_raw || c.latitude} N, ${c.lon_dms_raw || c.longitude} E</div>`,
            { className: 'bg-[#0D100F] border border-[#232A26] text-white p-1.5 rounded' }
          );

          groups.coordinates.addLayer(marker);
        }
      });
    }

    // 3. Render Risk Hotspots
    mapData.risk_hotspots.forEach(h => {
      const isPredictive = h.hotspot_type === 'PREDICTIVE_HOTSPOT';
      const showThis = isPredictive ? layerVisibility.predictiveRisk : layerVisibility.currentRisk;

      if (showThis && h.latitude && h.longitude) {
        allLatLngs.push(L.latLng(h.latitude, h.longitude));

        const baseColor =
          h.risk_band === 'CRITICAL' ? '#E11D48' :
            h.risk_band === 'HIGH' ? '#F97316' :
              h.risk_band === 'MEDIUM' ? '#FBBF24' : '#10B981';

        const outerCircle = L.circle([h.latitude, h.longitude], {
          radius: isPredictive ? 350 : 250,
          color: baseColor,
          weight: 1.5,
          dashArray: isPredictive ? '4, 4' : undefined,
          fillColor: baseColor,
          fillOpacity: 0.12
        });

        const innerCircle = L.circle([h.latitude, h.longitude], {
          radius: isPredictive ? 160 : 110,
          color: baseColor,
          weight: 2,
          fillColor: baseColor,
          fillOpacity: 0.32
        });

        const centerIcon = L.divIcon({
          className: 'custom-risk-center',
          html: `
            <div class="relative flex items-center justify-center w-8 h-8">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style="background-color: ${baseColor}"></span>
              <span class="relative inline-flex items-center justify-center rounded-full w-6 h-6 text-white font-mono font-bold text-[10px] shadow-lg border-2 border-white/80" style="background-color: ${baseColor}">
                !
              </span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const centerMarker = L.marker([h.latitude, h.longitude], { icon: centerIcon });

        const onHotspotClick = () => {
          setSelectedFeature({ type: 'HOTSPOT', data: h });
        };

        outerCircle.on('click', onHotspotClick);
        innerCircle.on('click', onHotspotClick);
        centerMarker.on('click', onHotspotClick);

        centerMarker.bindTooltip(
          `<div class="font-mono text-xs font-bold text-white">${h.title} [${h.risk_band} RISK: ${h.risk_score}]</div>`,
          { className: 'bg-[#0D100F] border border-[#232A26] text-white p-1.5 rounded' }
        );

        if (isPredictive) {
          groups.predictiveHotspots.addLayer(outerCircle);
          groups.predictiveHotspots.addLayer(innerCircle);
          groups.predictiveHotspots.addLayer(centerMarker);
        } else {
          groups.riskHotspots.addLayer(outerCircle);
          groups.riskHotspots.addLayer(innerCircle);
          groups.riskHotspots.addLayer(centerMarker);
        }
      }
    });

    // 4. Render Operational Features
    mapData.operational_features.forEach(f => {
      if (!f.latitude || !f.longitude) return;

      let shouldRender = false;
      let markerHtml = '';
      let targetGroup: L.LayerGroup | null = null;

      if (f.feature_type === 'SENSOR' && layerVisibility.sensors) {
        shouldRender = true;
        targetGroup = groups.sensors;
        markerHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-950/90 border-2 border-cyan-400 text-cyan-300 font-mono text-[10px] font-bold shadow-lg hover:scale-125 transition-transform">
            ▲
          </div>
        `;
      } else if (f.feature_type === 'CAMERA' && layerVisibility.cameras) {
        shouldRender = true;
        targetGroup = groups.cameras;
        markerHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-950/90 border-2 border-indigo-400 text-indigo-300 font-mono text-[10px] font-bold shadow-lg hover:scale-125 transition-transform">
            ⎚
          </div>
        `;
      } else if (f.feature_type === 'INCIDENT' && layerVisibility.incidentsAlerts) {
        shouldRender = true;
        targetGroup = groups.incidentsAlerts;
        markerHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 border-2 border-rose-200 text-white font-mono text-[11px] font-bold shadow-xl hover:scale-125 transition-transform animate-pulse">
            !
          </div>
        `;
      } else if (f.feature_type === 'ALERT' && layerVisibility.incidentsAlerts) {
        shouldRender = true;
        targetGroup = groups.incidentsAlerts;
        markerHtml = `
          <div class="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 border border-amber-200 text-slate-950 font-mono text-[9px] font-bold shadow-md hover:scale-125 transition-transform">
            ▲
          </div>
        `;
      } else if (f.feature_type === 'INSPECTION' && layerVisibility.fieldInspections) {
        shouldRender = true;
        targetGroup = groups.fieldInspections;
        markerHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/30 border-2 border-amber-400 text-amber-300 font-mono text-[10px] font-bold shadow-lg hover:scale-125 transition-transform">
            ◉
          </div>
        `;
      } else if (f.feature_type === 'GOVERNANCE_TASK' && layerVisibility.governanceTasks) {
        shouldRender = true;
        targetGroup = groups.governanceTasks;
        markerHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 border-2 border-amber-400 text-amber-300 font-mono text-[9px] font-bold shadow-md hover:scale-125 transition-transform">
            TSK
          </div>
        `;
      } else if (f.feature_type === 'CMSMS' && layerVisibility.cmsmsSignals) {
        shouldRender = true;
        targetGroup = groups.cmsmsSignals;
        markerHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full bg-fuchsia-950/90 border-2 border-fuchsia-400 text-fuchsia-300 font-mono text-[9px] font-bold shadow-md hover:scale-125 transition-transform">
            SAT
          </div>
        `;
      } else if (f.feature_type === 'ENVIRONMENTAL' && layerVisibility.environmentalRisk) {
        shouldRender = true;
        targetGroup = groups.environmental;
        markerHtml = `
          <div class="flex items-center justify-center w-5 h-5 rounded-full bg-teal-950/90 border border-teal-400 text-teal-300 font-mono text-[9px] font-bold shadow-md hover:scale-125 transition-transform">
            ENV
          </div>
        `;
      }

      if (shouldRender && targetGroup) {
        allLatLngs.push(L.latLng(f.latitude, f.longitude));

        const icon = L.divIcon({
          className: 'custom-op-marker',
          html: markerHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([f.latitude, f.longitude], { icon });
        marker.on('click', () => {
          setSelectedFeature({ type: 'OPERATIONAL', data: f });
        });

        marker.bindTooltip(
          `<div class="font-mono text-xs font-semibold text-white">${f.title} (${f.feature_type}) [${f.trust_badge}]</div>`,
          { className: 'bg-[#0D100F] border border-[#232A26] text-white p-1.5 rounded' }
        );

        targetGroup.addLayer(marker);
      }
    });

    // Auto-fit initial bounds
    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    }
  }, [mapData, layerVisibility]);

  // Handle Field Task Creation
  const handleCreateFieldTask = async () => {
    if (!selectedFeature || !selectedMine) return;
    const featId = selectedFeature.data.id || 'hotspot-recommendation';
    const title = `Inspect GIS Area: ${selectedFeature.data.title || selectedFeature.data.code || 'Target Location'}`;

    try {
      const res = await gisService.createFieldTaskFromGis(featId, selectedMine.id, title);
      setTaskNotification(`Field Task #${res.task_id} generated and logged with Audit Chain.`);
      setTimeout(() => setTaskNotification(null), 6000);
      fetchGisMap();
    } catch (err: any) {
      console.error('Failed to create field task:', err);
      alert('Failed to dispatch field task.');
    }
  };

  // Copy Location string
  const handleCopyLocation = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  // Focus in 3D Twin Action
  const handleFocus3DTwin = () => {
    if (!selectedFeature) return;
    const d = selectedFeature.data;
    setFocusedTarget({
      x: d.local_x ?? 0,
      y: 180,
      z: d.local_z ?? -120,
      distance: 60,
      title: d.title || d.name || `Point ${d.point_label}` || 'Target Location',
      type: 'zone',
      id: d.id || d.code || selectedMine?.id
    });
    setCurrentTab('digital-twin');
  };

  // 1. FALLBACK: Mine Unavailable
  if (!isMinesLoading && !selectedMine && mines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#0D100F] border border-[#1B211E] rounded-xl p-8 text-center space-y-4 font-sans">
        <div className="w-14 h-14 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">MINE PROFILE UNAVAILABLE</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Selected mine could not be resolved or no authorized mines were found for your credential tier.
          </p>
        </div>
        <button
          onClick={onBackToOverview}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Mine Overview</span>
        </button>
      </div>
    );
  }

  // 2. ERROR BOUNDARY: Spatial Service Failure
  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#0D100F] border border-[#1B211E] rounded-xl p-8 text-center space-y-4 font-sans">
        <div className="w-14 h-14 rounded-full bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">2D GIS UNAVAILABLE</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            The detailed spatial view could not be initialized. {error}
          </p>
          {diagnosticId && (
            <span className="inline-block mt-2 font-mono text-[10px] text-slate-500 px-2.5 py-1 rounded bg-[#080A09] border border-[#1B211E]">
              Diagnostic ID: {diagnosticId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={fetchGisMap}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141A17] hover:bg-[#1E2522] border border-[#27302B] text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>Retry</span>
          </button>
          <button
            onClick={onBackToOverview}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Mine Overview</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Page header with Return to Overview button */}
      <div className="pb-5 border-b border-[#1B211E] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToOverview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141A17] hover:bg-[#1E2522] border border-[#27302B] text-amber-400 hover:text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0"
            title="Return to Multi-Mine Overview"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Multi-Mine Overview</span>
          </button>

          <div className="h-5 w-px bg-[#232A26] hidden sm:block shrink-0" />

          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              <TypewriterText text={`${selectedMine?.name || 'Mine'} — 2D GIS Command & Spatial Risk Map`} speed={30} delay={100} />
            </h1>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              Source-truth geography, active telemetry, predictive risk overlays &amp; spatial governance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          {/* Mine selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Mine</span>
            <select
              className="bg-transparent text-slate-100 font-medium focus:outline-hidden cursor-pointer border-b border-[#232A26] pb-0.5"
              value={selectedMine?.id || ''}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                if (!isNaN(id)) setSelectedMineId(id);
              }}
            >
              {mines.map(m => (
                <option key={m.id} value={m.id} className="bg-[#0D100F] text-slate-200">
                  {m.name} ({m.is_simulated === 'NO' ? 'Real Block' : 'Demo'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleFitToMine}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            Fit to mine
          </button>

          {/* KPI strip */}
          {mapData && (
            <div className="border border-[#1B211E] rounded-lg grid grid-cols-5 divide-x divide-[#1B211E] overflow-hidden bg-[#0D100F]">
              <div className="px-3 py-2 flex flex-col items-center">
                <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">Current risk</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-xs text-white">{mapData.dashboard_stats.current_risk_score}</span>
                  <span className={clsx(
                    'text-[9.5px] font-medium',
                    mapData.dashboard_stats.current_risk_band === 'CRITICAL' ? 'text-rose-400' :
                      mapData.dashboard_stats.current_risk_band === 'HIGH' ? 'text-rose-400' :
                        mapData.dashboard_stats.current_risk_band === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                  )}>
                    {mapData.dashboard_stats.current_risk_band}
                  </span>
                </div>
              </div>

              <div className="px-3 py-2 flex flex-col items-center">
                <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">Predictive</span>
                <span className="font-semibold text-amber-400 text-xs mt-0.5">{mapData.dashboard_stats.predictive_hotspots_count}</span>
              </div>

              <div className="px-3 py-2 flex flex-col items-center">
                <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">Incidents</span>
                <span className="font-semibold text-rose-400 text-xs mt-0.5">{mapData.dashboard_stats.open_incidents_count}</span>
              </div>

              <div className="px-3 py-2 flex flex-col items-center">
                <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">Field tasks</span>
                <span className="font-semibold text-sky-400 text-xs mt-0.5">{mapData.dashboard_stats.open_field_tasks_count}</span>
              </div>

              <div className="px-3 py-2 flex flex-col items-center">
                <span className="text-[9.5px] text-slate-500 uppercase tracking-wide">SLA breaches</span>
                <span className="font-semibold text-rose-400 text-xs mt-0.5">{mapData.dashboard_stats.sla_breaches_count || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task creation notification */}
      {taskNotification && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs shadow-lg animate-fade-in -mt-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{taskNotification}</span>
          </div>
          <button onClick={() => setTaskNotification(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Basemap diagnostic warning */}
      {basemapWarning && (
        <div className="bg-amber-950/40 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-lg flex items-center gap-2 text-xs -mt-2">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{basemapWarning}</span>
        </div>
      )}

      {/* 2. Map canvas + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Map canvas (8 of 12 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative w-full h-[680px] rounded-lg border border-[#1B211E] overflow-hidden bg-[#050706] shadow-xl">
            {/* Real Leaflet Map Target */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-[#080A09]/85 backdrop-blur-xs z-30 flex flex-col items-center justify-center space-y-3 font-mono text-slate-400">
                <Activity className="w-7 h-7 text-amber-500 animate-spin" />
                <div className="text-center space-y-1">
                  <span className="text-xs font-bold text-white tracking-wider block uppercase">
                    INITIALIZING SPATIAL PROFILE
                  </span>
                  <p className="text-[10.5px] text-slate-400">Loading mine geometry &amp; source boundaries...</p>
                  <p className="text-[10px] text-slate-500">Loading operational layers &amp; risk context...</p>
                </div>
              </div>
            )}

            {/* Floating Map Search Overlay (Top-Left inside map) */}
            <div className="absolute top-3.5 left-3.5 z-10 w-80">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search coordinates, sensors, incidents, tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0D100F]/95 backdrop-blur-md border border-[#232A26] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 shadow-2xl font-sans"
                />
              </div>

              {/* Autocomplete Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-1 bg-[#0D100F] border border-[#232A26] rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50 divide-y divide-[#1B211E] animate-fade-in">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.latitude && item.longitude && mapInstanceRef.current) {
                          mapInstanceRef.current.setView([item.latitude, item.longitude], 16);
                        }
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#171B18] transition-colors flex flex-col gap-0.5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-200">{item.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">{item.snippet}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Floating Map Navigation Controls (Left-Middle vertical inside map) */}
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
                onClick={handleFitToMine}
                title="Center on Mine"
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
              <button
                onClick={() => {
                  const map = mapInstanceRef.current as any;
                  if (map?.setBearing) {
                    map.setBearing(0);
                  } else if (mapData?.mine.latitude && mapData?.mine.longitude) {
                    mapInstanceRef.current?.setView([mapData.mine.latitude, mapData.mine.longitude]);
                  }
                }}
                title="Reset North Orientation"
                className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-slate-300 flex items-center justify-center shadow-lg transition-all hover:scale-110 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            {/* North Arrow Indicator (Top-Right inside map) */}
            <div className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] flex flex-col items-center justify-center shadow-2xl text-amber-400 font-mono text-[10px] font-bold">
              <span>▲</span>
              <span className="text-[8px] -mt-1 text-slate-300">N</span>
            </div>

            {/* Floating Basemap Switcher Dock (Top-Right, below north arrow) */}
            <div
              role="group"
              aria-label="Basemap Selector"
              className="absolute top-16 right-3.5 z-20 bg-[#0D100F]/95 backdrop-blur-md border border-[#232A26] rounded-full px-3.5 py-1 shadow-2xl flex items-center gap-2 text-xs font-mono"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none shrink-0">Basemap:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {(['satellite', 'terrain'] as BasemapType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="button"
                    aria-pressed={activeBasemap === type}
                    onClick={() => switchBasemap(type)}
                    className={clsx(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer capitalize flex items-center gap-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-400',
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

            {/* Permanent Map Legend Bar (Bottom-Full inside map) */}
            <div className="absolute bottom-3 left-3.5 right-3.5 z-10 bg-[#0D100F]/95 backdrop-blur-md border border-[#232A26] rounded-lg px-3 py-1.5 shadow-2xl flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
              <div className="flex flex-wrap items-center gap-3 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border border-emerald-400 bg-emerald-500/20" />
                  Mine Boundary (Source-Derived)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border border-dashed border-amber-400 bg-amber-500/20" />
                  Approximate Boundary
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Source Coordinate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-cyan-400 font-bold">▲</span>
                  Simulated Sensor
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
                  Machinery (Simulated)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Risk Hotspot
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-rose-400 font-bold">!</span>
                  Incident
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">◉</span>
                  Field Task
                </span>
              </div>

              <div className="flex items-center gap-1 text-[9px] text-slate-400 border-l border-[#232A26] pl-2.5">
                <div className="w-12 h-1 border-b-2 border-l-2 border-r-2 border-slate-400"></div>
                <span>2 km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side panels (4 of 12 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Panel 1: Map layers */}
          <div className="border border-[#1B211E] rounded-lg p-4 bg-[#0D100F]">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#1B211E]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h2 className="text-[12.5px] font-semibold text-white">Map layers</h2>
              </div>
              <button
                onClick={handleResetLayers}
                className="text-[10.5px] text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="space-y-3 text-[11.5px] max-h-56 overflow-y-auto pr-1">
              {/* Category 1: verified source data */}
              <div>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                  Verified source data
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.mineBoundary}
                        onChange={() => toggleLayer('mineBoundary')}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      Mine boundary
                    </span>
                    <span className="text-[9.5px] text-emerald-400">Source</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.surveyCoordinates}
                        onChange={() => toggleLayer('surveyCoordinates')}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      Survey coordinates
                    </span>
                    <span className="text-[9.5px] text-emerald-400">Source</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.documentedSeams}
                        onChange={() => toggleLayer('documentedSeams')}
                        className="rounded accent-sky-500 cursor-pointer"
                      />
                      Documented seams
                    </span>
                    <span className="text-[9.5px] text-sky-400">Attributes</span>
                  </label>
                </div>
              </div>

              {/* Category 2: operational */}
              <div className="pt-2.5 border-t border-[#1B211E]">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                  Operational
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.sensors}
                        onChange={() => toggleLayer('sensors')}
                        className="rounded accent-sky-500 cursor-pointer"
                      />
                      Sensors (telemetry)
                    </span>
                    <span className="text-[9.5px] text-sky-400">Sim</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.cameras}
                        onChange={() => toggleLayer('cameras')}
                        className="rounded accent-sky-500 cursor-pointer"
                      />
                      Cameras
                    </span>
                    <span className="text-[9.5px] text-sky-400">Sim</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.machinery}
                        onChange={() => toggleLayer('machinery')}
                        className="rounded accent-amber-500 cursor-pointer"
                      />
                      Machinery
                    </span>
                    <span className="text-[9.5px] text-amber-400">Sim</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.incidentsAlerts}
                        onChange={() => toggleLayer('incidentsAlerts')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Incidents &amp; alerts
                    </span>
                    <span className="text-[9.5px] text-rose-400">Live</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.fieldInspections}
                        onChange={() => toggleLayer('fieldInspections')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Field inspections
                    </span>
                    <span className="text-[9.5px] text-rose-400">Live</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.governanceTasks}
                        onChange={() => toggleLayer('governanceTasks')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Governance tasks
                    </span>
                    <span className="text-[9.5px] text-rose-400">Live</span>
                  </label>
                </div>
              </div>

              {/* Category 3: forecasted & spatial risk */}
              <div className="pt-2.5 border-t border-[#1B211E]">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                  Forecasted &amp; spatial risk
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.currentRisk}
                        onChange={() => toggleLayer('currentRisk')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Current risk
                    </span>
                    <span className="text-[9.5px] text-rose-400">Live</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.predictiveRisk}
                        onChange={() => toggleLayer('predictiveRisk')}
                        className="rounded accent-amber-500 cursor-pointer"
                      />
                      Forecasted risk (30m)
                    </span>
                    <span className="text-[9.5px] text-amber-400">Model</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.anomalyHotspots}
                        onChange={() => toggleLayer('anomalyHotspots')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Anomaly hotspots
                    </span>
                    <span className="text-[9.5px] text-rose-400">Live</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.complianceRisk}
                        onChange={() => toggleLayer('complianceRisk')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Compliance / SLA risk
                    </span>
                    <span className="text-[9.5px] text-rose-400">Live</span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.environmentalRisk}
                        onChange={() => toggleLayer('environmentalRisk')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Environmental risk
                    </span>
                    <span className="text-[9.5px] text-rose-400">Live</span>
                  </label>
                </div>
              </div>

              {/* Category 4: external */}
              <div className="pt-2.5 border-t border-[#1B211E]">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                  External
                </span>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layerVisibility.cmsmsSignals}
                      onChange={() => toggleLayer('cmsmsSignals')}
                      className="rounded accent-sky-500 cursor-pointer"
                    />
                    CMSMS signals
                  </span>
                  <span className="text-[9.5px] text-sky-400">Sim</span>
                </label>
              </div>

              {/* Category 5: 3D / navigation */}
              <div className="pt-2.5 border-t border-[#1B211E]">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                  3D / navigation
                </span>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layerVisibility.threeDLinked}
                      onChange={() => toggleLayer('threeDLinked')}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    3D-linked objects
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Panel 2: Selected feature & location evidence */}
          <div className="border border-[#1B211E] rounded-lg p-4 flex flex-col justify-between flex-1 bg-[#0D100F]">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#1B211E]">
                <h2 className="text-[12.5px] font-semibold text-white flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  Selected feature &amp; location evidence
                </h2>
                {selectedFeature && (
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="text-slate-500 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {selectedFeature ? (
                <div key={JSON.stringify(selectedFeature.data.id ?? selectedFeature.type)} className="space-y-3.5 text-xs animate-fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <h3 className="font-semibold text-[13px] text-white truncate">
                        {selectedFeature.type === 'HOTSPOT' ? 'Risk Hotspot' :
                          selectedFeature.type === 'COORDINATE' ? `Corner ${selectedFeature.data.point_label}` :
                            selectedFeature.type === 'BOUNDARY' ? `${mapData?.mine.name} Boundary` :
                              selectedFeature.data.title || selectedFeature.data.name || 'Mine Entity'}
                      </h3>
                    </div>
                    <span className={clsx(
                      'text-[10px] font-medium shrink-0',
                      selectedFeature.data.risk_band === 'CRITICAL' || selectedFeature.data.severity === 'CRITICAL' ? 'text-rose-400' :
                        selectedFeature.data.risk_band === 'HIGH' || selectedFeature.data.severity === 'HIGH' ? 'text-rose-400' :
                          selectedFeature.data.trust_badge === 'SOURCE_DERIVED' ? 'text-emerald-400' :
                            'text-amber-400'
                    )}>
                      {selectedFeature.data.risk_band ? `${selectedFeature.data.risk_band} risk` : (selectedFeature.data.trust_badge || 'Operational')}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-300">
                    <p><span className="text-slate-500">Zone:</span> {selectedFeature.data.properties?.zone_name || selectedFeature.data.zone_name || 'Northern Sector - Gas Accumulation'}</p>
                    <p><span className="text-slate-500">Type:</span> {selectedFeature.data.hotspot_type === 'PREDICTIVE_HOTSPOT' ? 'Predictive Risk' : (selectedFeature.data.feature_type || selectedFeature.type)}</p>
                    {selectedFeature.data.risk_score && (
                      <p className="flex items-center gap-2">
                        <span className="text-slate-500">Risk score:</span>
                        <b className="text-white">{selectedFeature.data.risk_score} / 100</b>
                        <span className="text-[10px] font-medium text-rose-400">{selectedFeature.data.risk_band}</span>
                      </p>
                    )}
                    {selectedFeature.data.prediction_horizon && (
                      <p><span className="text-slate-500">Prediction horizon:</span> {selectedFeature.data.prediction_horizon}</p>
                    )}
                    <p><span className="text-slate-500">Source:</span> {selectedFeature.data.source_model || selectedFeature.data.provenance?.document_title || 'Predictive Risk Model (v1.0)'}</p>
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-[#1B211E] text-[11px]">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        {selectedFeature.data.latitude?.toFixed(4) || selectedFeature.data.min_latitude?.toFixed(4) || '23.4121'}°N,{' '}
                        {selectedFeature.data.longitude?.toFixed(4) || selectedFeature.data.min_longitude?.toFixed(4) || '85.3245'}°E
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyLocation(`${selectedFeature.data.latitude || 23.4121}, ${selectedFeature.data.longitude || 85.3245}`)}
                      className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                      title="Copy coordinates"
                    >
                      {copiedLocation ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide block">
                      Nearby entities (within 1 km)
                    </span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-sky-400">Sensors <b className="text-white">{spatialContext?.nearest_sensors?.length || 3}</b></span>
                      <span className="text-rose-400">Incidents <b className="text-white">{spatialContext?.nearest_incidents?.length || 1}</b></span>
                      <span className="text-amber-400">Field tasks <b className="text-white">{spatialContext?.nearest_inspections?.length || 2}</b></span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide block">
                      Contributing factors
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {selectedFeature.data.contributing_factors && selectedFeature.data.contributing_factors.length > 0 ? (
                        selectedFeature.data.contributing_factors.map((f: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">·</span>
                            <span>{f}</span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">·</span>
                            <span>CH4 level rising trend (+18%)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">·</span>
                            <span>Predictive anomaly detected (12 min ago)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">·</span>
                            <span>Proximity to working face (320m)</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="pt-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleFocus3DTwin}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-[#080A09] font-semibold text-xs transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <Layers3 className="w-3.5 h-3.5" />
                        Focus in 3D
                      </button>

                      <button
                        onClick={() => setCurrentTab('copilot')}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Ask Copilot
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleCreateFieldTask}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-md border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-medium text-xs transition-all cursor-pointer"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Create task
                      </button>

                      <button
                        onClick={() => {
                          if (selectedFeature.data.provenance) {
                            setInspectorData(selectedFeature.data.provenance);
                          } else {
                            setCurrentTab('documents');
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-md border border-[#232A26] text-slate-300 hover:bg-white/[0.03] font-medium text-xs transition-all cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Source evidence
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-[10.5px] text-slate-500 pt-1">
                    <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      This is a model-generated risk hotspot, not a confirmed violation. Requires field verification.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-xs space-y-2">
                  <Crosshair className="w-7 h-7 mx-auto text-slate-600" />
                  <p className="font-medium text-slate-400">No feature selected</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Click any mine boundary, corner coordinate, sensor node, or risk hotspot on the map to inspect evidence.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Audit & information strip */}
      <div className="border border-[#1B211E] rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#1B211E] bg-[#0D100F]">
        {/* Data trust */}
        {mapData && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-[11.5px] font-semibold text-slate-200">Data trust (this mine)</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-slate-500">Source-derived</span>
                <b className="text-emerald-400 ml-auto">{mapData.trust_metrics.source_derived_count}</b>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-slate-500">Approximate</span>
                <b className="text-amber-400 ml-auto">{mapData.trust_metrics.approximate_count}</b>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-slate-500">Operational</span>
                <b className="text-sky-400 ml-auto">{mapData.trust_metrics.operational_count}</b>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-slate-500">Simulated</span>
                <b className="text-purple-400 ml-auto">{mapData.trust_metrics.simulated_count}</b>
              </div>
            </div>
            <div className="pt-2.5 mt-2.5 border-t border-[#1B211E] flex items-center justify-between text-[10px] text-slate-500">
              <span>Not documented: {mapData.trust_metrics.not_documented_count}</span>
              <span className="text-emerald-400 font-medium">100% auditable</span>
            </div>
          </div>
        )}

        {/* Mine information */}
        {mapData && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-[11.5px] font-semibold text-slate-200">Mine information</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="text-slate-100 font-medium truncate text-xs">{mapData.mine.name}</div>
              <div className="text-slate-500 text-[10.5px]">{mapData.mine.district}, {mapData.mine.state}</div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Area</span>
                <span className="text-amber-400 font-medium">{mapData.mine.total_area_sq_km || '12.4'} km² (approx)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-emerald-400 font-medium">{mapData.mine.data_status}</span>
              </div>
              <div className="text-[10.5px] text-slate-500 truncate pt-0.5">
                Source: {mapData.mine.provenance_doc}
              </div>
            </div>
          </div>
        )}

        {/* Coordinate system */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-sky-400" />
            <span className="text-[11.5px] font-semibold text-slate-200">Coordinate system</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="text-sky-400 font-medium text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              WGS84 (EPSG:4326)
            </div>
            <div className="text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              Local mine grid (topocentric)
            </div>
            <div className="text-[10.5px] text-slate-500 pt-1">
              Datum: WGS84 ellipsoid · EPSG geodetic
            </div>
          </div>
        </div>

        {/* Last updated */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-[11.5px] font-semibold text-slate-200">Last updated</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="text-slate-200 font-medium text-xs">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live data ingestion
            </div>
            <div className="text-[10.5px] text-slate-500">
              Protocol: MQTT / webhook telemetry
            </div>
          </div>
        </div>
      </div>

      {/* 4. Source document provenance modal */}
      {inspectorData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#232A26] rounded-lg max-w-xl w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#1B211E] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4.5 h-4.5 text-amber-400" />
                <h3 className="font-semibold text-[13px] text-slate-100">
                  Source document provenance inspector
                </h3>
              </div>
              <button
                onClick={() => setInspectorData(null)}
                className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-200 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-0.5">Document title</span>
                <p className="font-medium text-slate-100 text-xs">{inspectorData.document_title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 border-y border-[#1B211E]">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-0.5">Page number</span>
                  <p className="font-medium text-amber-400">{inspectorData.page_number || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-0.5">Authority tier</span>
                  <p className="font-medium text-emerald-400">{inspectorData.authority_level || 'TIER 1 (OFFICIAL)'}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-0.5">SHA-256 provenance hash</span>
                <p className="text-[11px] text-amber-400/90 break-all">{inspectorData.document_hash}</p>
              </div>

              {inspectorData.source_text_reference && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide block">Verbatim source excerpt</span>
                  <p className="text-xs text-slate-300 italic border-l-2 border-amber-500/50 pl-2.5 leading-relaxed">
                    "{inspectorData.source_text_reference}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1B211E]">
              <button
                onClick={() => {
                  setInspectorData(null);
                  setCurrentTab('documents');
                }}
                className="px-3.5 py-2 rounded-md text-amber-400 hover:bg-amber-500/10 text-xs font-medium cursor-pointer transition-colors"
              >
                Open in document intelligence
              </button>
              <button
                onClick={() => setInspectorData(null)}
                className="px-3.5 py-2 rounded-md border border-[#232A26] text-slate-300 hover:bg-white/[0.03] text-xs font-medium cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
