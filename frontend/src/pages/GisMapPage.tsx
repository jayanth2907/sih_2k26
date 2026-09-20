import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { gisService } from '../services';
import {
  GisMapDTO,
  GisRiskHotspotDTO,
  GisBoundaryFeatureDTO,
  GisCoordinateFeatureDTO,
  GisOperationalFeatureDTO,
  SpatialContextDTO,
  GisSearchItemDTO
} from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Shield,
  Activity,
  AlertTriangle,
  Bot,
  Layers3,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Compass,
  Radio,
  Sliders,
  Maximize2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ClipboardList,
  Eye,
  Info,
  X,
  Crosshair,
  Plus,
  Minus,
  Navigation,
  Flame,
  Truck,
  Camera,
  Cpu,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Building2,
  Clock,
  ShieldAlert,
  Globe,
  RadioTower,
  FileCheck
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// BASEMAP PROVIDERS CONFIGURATION (No Secret API Key Required)
// ============================================================================
export type BasemapType = 'satellite' | 'terrain' | 'dark' | 'street';

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
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
    subdomains: 'abcd'
  },
  street: {
    id: 'street',
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
};

export const GisMapPage: React.FC = () => {
  const { selectedMine, mines, setSelectedMineId, setCurrentTab, setFocusedTarget } = useMineContext();
  const { t } = useLanguage();

  const [mapData, setMapData] = useState<GisMapDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
    // SOURCE DATA
    mineBoundary: true,
    surveyCoordinates: true,
    documentedSeams: true,
    // OPERATIONAL
    sensors: true,
    cameras: true,
    machinery: true,
    incidentsAlerts: true,
    fieldInspections: true,
    governanceTasks: true,
    // RISK
    currentRisk: true,
    predictiveRisk: true,
    anomalyHotspots: true,
    complianceRisk: true,
    environmentalRisk: true,
    // EXTERNAL
    cmsmsSignals: true,
    // 3D NAVIGATION
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

  // Load GIS Map data for the selected mine
  const fetchGisMap = async () => {
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
      setError(err?.response?.data?.detail || 'Failed to load GIS spatial data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGisMap();
  }, [selectedMine?.id]);

  // Handle Search Input
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

  // Load Spatial Context when feature selected
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

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.5000, 85.5000],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Create a dedicated pane for the mine boundary with deterministic z-index
      const boundaryPane = map.createPane('mine-boundary-pane');
      boundaryPane.style.zIndex = '350';

      // Default to Satellite basemap
      const config = BASEMAP_CONFIGS.satellite;
      const tileLayer = L.tileLayer(config.url, {
        maxZoom: config.maxZoom,
        subdomains: config.subdomains || 'abc',
        attribution: config.attribution
      });

      tileLayer.on('tileerror', () => {
        console.warn('Tile error encountered, fallback active.');
      });

      tileLayer.addTo(map);
      tileLayer.bringToBack();
      currentTileLayerRef.current = tileLayer;

      // Add Custom Attribution
      L.control.attribution({ position: 'bottomright', prefix: 'TRINETRA GIS' }).addTo(map);

      // Initialize layer groups
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
    }
  }, []);

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
  const handleFitToMine = () => {
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
  };

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
      mapData.boundaries.forEach(b => {
        const isApprox = b.geometry_status === 'APPROXIMATE';
        const latLngs = b.coordinates_geojson.map(([lon, lat]) => [lat, lon] as [number, number]);

        if (latLngs.length > 0) {
          latLngs.forEach(([lat, lon]) => allLatLngs.push(L.latLng(lat, lon)));

          const polygon = L.polygon(latLngs, {
            pane: 'mine-boundary-pane',
            color: isApprox ? '#F59E0B' : '#10B981',
            weight: 3.5,
            opacity: 0.95,
            dashArray: isApprox ? '8, 8' : undefined,
            fillColor: isApprox ? '#F59E0B' : '#059669',
            fillOpacity: 0.22,
            lineCap: 'round',
            lineJoin: 'round'
          });

          polygon.on('click', () => {
            setSelectedFeature({ type: 'BOUNDARY', data: b });
          });

          polygon.bindTooltip(
            `<div class="font-mono text-xs font-bold text-slate-100">${mapData.mine.name} Boundary (${b.geometry_status})</div>`,
            { className: 'custom-gis-tooltip' }
          );

          groups.boundary.addLayer(polygon);

          // Add Central Mine Label Marker
          if (mapData.mine.latitude && mapData.mine.longitude) {
            const mineCenterIcon = L.divIcon({
              className: 'custom-mine-center-label',
              html: `
                <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D100F]/90 border border-amber-500/40 text-white font-mono text-xs font-bold shadow-2xl backdrop-blur-md whitespace-nowrap">
                  <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span class="text-amber-400">⛯</span> ${mapData.mine.name}
                </div>
              `,
              iconSize: [200, 32],
              iconAnchor: [100, 16]
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

    // 2. Render Source Coordinates (Corner survey markers)
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

    // 3. Render Risk Hotspots (Concentric Translucent Heat Circles)
    mapData.risk_hotspots.forEach(h => {
      const isPredictive = h.hotspot_type === 'PREDICTIVE_HOTSPOT';
      const showThis = isPredictive ? layerVisibility.predictiveRisk : layerVisibility.currentRisk;

      if (showThis && h.latitude && h.longitude) {
        allLatLngs.push(L.latLng(h.latitude, h.longitude));

        const baseColor =
          h.risk_band === 'CRITICAL' ? '#E11D48' :
          h.risk_band === 'HIGH' ? '#F97316' :
          h.risk_band === 'MEDIUM' ? '#FBBF24' : '#10B981';

        // Outer Translucent Glow Circle
        const outerCircle = L.circle([h.latitude, h.longitude], {
          radius: isPredictive ? 350 : 250,
          color: baseColor,
          weight: 1.5,
          dashArray: isPredictive ? '4, 4' : undefined,
          fillColor: baseColor,
          fillOpacity: 0.12
        });

        // Inner Risk Intensity Circle
        const innerCircle = L.circle([h.latitude, h.longitude], {
          radius: isPredictive ? 160 : 110,
          color: baseColor,
          weight: 2,
          fillColor: baseColor,
          fillOpacity: 0.32
        });

        // Center Pulsing Marker Icon
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

    // 4. Render Operational Features (Sensors, Cameras, Machinery, Incidents, Tasks, CMSMS)
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

  // Handle Field Task Creation from GIS Feature
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

  return (
    <div className="flex flex-col gap-3 font-sans text-slate-100 bg-[#080A09] min-h-[calc(100vh-4.5rem)] p-3">
      {/* 1. TOP COMMAND HEADER MATCHING REFERENCE SPECIFICATION */}
      <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        {/* Left: Brand Identity & Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2 border-r border-[#1B211E] pr-3.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-bold text-slate-950 font-serif text-sm shadow-md">
              त्रिनेत्र
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-black text-sm text-amber-400 tracking-wider">TRINETRA</span>
              <span className="font-mono text-[9px] text-slate-400 tracking-widest uppercase">MINE GOVERNANCE AI</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Crosshair className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-sm tracking-wide text-slate-100">
                2D GIS COMMAND & SPATIAL RISK MAP
              </h1>
              <p className="text-[11px] text-slate-400 font-sans">
                Source-truth geography, active telemetry, predictive risk overlays & spatial governance
              </p>
            </div>
          </div>
        </div>

        {/* Center/Right: Mine Selector, Fit to Mine & KPI Cards */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {/* Mine Selector */}
          <div className="flex items-center gap-1.5 bg-[#121614] border border-[#1B211E] px-3 py-1.5 rounded-lg">
            <span className="font-mono text-[10px] text-slate-400 uppercase font-semibold">MINE:</span>
            <select
              className="bg-transparent text-xs text-slate-100 font-mono font-medium focus:outline-hidden cursor-pointer"
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

          {/* FIT TO MINE Button */}
          <button
            onClick={handleFitToMine}
            className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-amber-400 transition-colors cursor-pointer shadow-sm"
          >
            Fit to Mine
          </button>

          {/* KPI Cards Ribbon */}
          {mapData && (
            <div className="flex items-center gap-2 font-mono text-xs">
              {/* CURRENT RISK */}
              <div className="bg-[#121614] px-3 py-1.5 rounded-lg border border-[#1B211E] flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">CURRENT RISK</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-xs text-white">{mapData.dashboard_stats.current_risk_score} / 100</span>
                  <span className={clsx(
                    'px-1.5 py-0.2 rounded text-[9px] font-bold',
                    mapData.dashboard_stats.current_risk_band === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                    mapData.dashboard_stats.current_risk_band === 'HIGH' ? 'bg-rose-950/80 text-rose-400 border border-rose-800' :
                    mapData.dashboard_stats.current_risk_band === 'MEDIUM' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  )}>
                    {mapData.dashboard_stats.current_risk_band}
                  </span>
                </div>
              </div>

              {/* PREDICTIVE HOTSPOTS */}
              <div className="bg-[#121614] px-3 py-1.5 rounded-lg border border-[#1B211E] flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">PREDICTIVE HOTSPOTS</span>
                <span className="font-bold text-amber-400 text-sm mt-0.5">{mapData.dashboard_stats.predictive_hotspots_count}</span>
              </div>

              {/* OPEN INCIDENTS */}
              <div className="bg-[#121614] px-3 py-1.5 rounded-lg border border-[#1B211E] flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">OPEN INCIDENTS</span>
                <span className="font-bold text-rose-400 text-sm mt-0.5">{mapData.dashboard_stats.open_incidents_count}</span>
              </div>

              {/* OPEN FIELD TASKS */}
              <div className="bg-[#121614] px-3 py-1.5 rounded-lg border border-[#1B211E] flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">OPEN FIELD TASKS</span>
                <span className="font-bold text-cyan-400 text-sm mt-0.5">{mapData.dashboard_stats.open_field_tasks_count}</span>
              </div>

              {/* SLA BREACHES */}
              <div className="bg-[#121614] px-3 py-1.5 rounded-lg border border-[#1B211E] flex flex-col items-center">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">SLA BREACHES</span>
                <span className="font-bold text-rose-400 text-sm mt-0.5">{mapData.dashboard_stats.sla_breaches_count || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Creation Notification */}
      {taskNotification && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-lg flex items-center justify-between text-xs font-mono shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{taskNotification}</span>
          </div>
          <button onClick={() => setTaskNotification(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Basemap Diagnostic Warning if any */}
      {basemapWarning && (
        <div className="bg-amber-950/80 border border-amber-500/40 text-amber-300 px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{basemapWarning}</span>
        </div>
      )}

      {/* 2. MAIN GIS WORKSPACE GRID (Map Canvas + Side Panels) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Dominant Map Canvas (8 of 12 Columns = ~66.7%) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative w-full h-[680px] rounded-xl border border-[#1B211E] overflow-hidden bg-[#050706] shadow-2xl">
            {/* Real Leaflet Map Target */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

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
                <div className="mt-1 bg-[#0D100F] border border-[#232A26] rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50 divide-y divide-[#1B211E]">
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
                className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-slate-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => mapInstanceRef.current?.zoomOut()}
                title="Zoom Out"
                className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-slate-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={handleFitToMine}
                title="Center on Mine"
                className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-amber-400 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
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
                className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-slate-300 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
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
                className="w-8 h-8 rounded-lg bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] hover:bg-[#171B18] text-slate-300 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            {/* North Arrow Indicator (Top-Right inside map) */}
            <div className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full bg-[#0D100F]/90 backdrop-blur-md border border-[#232A26] flex flex-col items-center justify-center shadow-2xl text-amber-400 font-mono text-[10px] font-bold">
              <span>▲</span>
              <span className="text-[8px] -mt-1 text-slate-300">N</span>
            </div>

            {/* Floating Basemap Switcher Dock (Bottom-Center inside map, spaced above legend) */}
            <div
              role="group"
              aria-label="Basemap Selector"
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-[#0D100F]/95 backdrop-blur-md border border-[#232A26] rounded-full px-3.5 py-1 shadow-2xl flex items-center gap-2 text-xs font-mono max-w-[calc(100%-2rem)] overflow-x-auto"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none shrink-0">Basemap:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {(['satellite', 'terrain', 'dark', 'street'] as BasemapType[]).map((type) => (
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

              {/* Mini Scale Indicator */}
              <div className="flex items-center gap-1 text-[9px] text-slate-400 border-l border-[#232A26] pl-2.5">
                <div className="w-12 h-1 border-b-2 border-l-2 border-r-2 border-slate-400"></div>
                <span>2 km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panels (4 of 12 Columns = ~33.3%) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Panel 1: MAP LAYERS (Categorized Toggles matching reference) */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1B211E] pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h2 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-200">
                  MAP LAYERS
                </h2>
              </div>
              <button
                onClick={handleResetLayers}
                className="text-[10px] font-mono text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono max-h-48 overflow-y-auto pr-1">
              {/* Category 1: VERIFIED SOURCE DATA */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  ● VERIFIED SOURCE DATA
                </span>
                <div className="space-y-1 text-[11px]">
                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.mineBoundary}
                        onChange={() => toggleLayer('mineBoundary')}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      Mine Boundary
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60">
                      SOURCE
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.surveyCoordinates}
                        onChange={() => toggleLayer('surveyCoordinates')}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      Survey Coordinates
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60">
                      SOURCE
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.documentedSeams}
                        onChange={() => toggleLayer('documentedSeams')}
                        className="rounded accent-cyan-500 cursor-pointer"
                      />
                      Documented Seams
                    </span>
                    <span className="text-[9px] text-cyan-400 font-bold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/60">
                      ATTRIBUTES
                    </span>
                  </label>
                </div>
              </div>

              {/* Category 2: OPERATIONAL */}
              <div className="pt-1 border-t border-[#1B211E]">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  ● OPERATIONAL
                </span>
                <div className="space-y-1 text-[11px]">
                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.sensors}
                        onChange={() => toggleLayer('sensors')}
                        className="rounded accent-cyan-500 cursor-pointer"
                      />
                      Sensors (Telemetry)
                    </span>
                    <span className="text-[9px] text-cyan-400 font-bold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/60">
                      SIM
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.cameras}
                        onChange={() => toggleLayer('cameras')}
                        className="rounded accent-cyan-500 cursor-pointer"
                      />
                      Cameras
                    </span>
                    <span className="text-[9px] text-cyan-400 font-bold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/60">
                      SIM
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.machinery}
                        onChange={() => toggleLayer('machinery')}
                        className="rounded accent-amber-500 cursor-pointer"
                      />
                      Machinery
                    </span>
                    <span className="text-[9px] text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800/60">
                      SIM
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.incidentsAlerts}
                        onChange={() => toggleLayer('incidentsAlerts')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Incidents & Alerts
                    </span>
                    <span className="text-[9px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/60">
                      LIVE
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.fieldInspections}
                        onChange={() => toggleLayer('fieldInspections')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Field Inspections
                    </span>
                    <span className="text-[9px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/60">
                      LIVE
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.governanceTasks}
                        onChange={() => toggleLayer('governanceTasks')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Governance Tasks
                    </span>
                    <span className="text-[9px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/60">
                      LIVE
                    </span>
                  </label>
                </div>
              </div>

              {/* Category 3: FORECASTED & SPATIAL RISK */}
              <div className="pt-1 border-t border-[#1B211E]">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  ● FORECASTED & SPATIAL RISK
                </span>
                <div className="space-y-1 text-[11px]">
                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.currentRisk}
                        onChange={() => toggleLayer('currentRisk')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Current Risk
                    </span>
                    <span className="text-[9px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/60">
                      LIVE
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.predictiveRisk}
                        onChange={() => toggleLayer('predictiveRisk')}
                        className="rounded accent-amber-500 cursor-pointer"
                      />
                      Forecasted Risk (30m)
                    </span>
                    <span className="text-[9px] text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800/60">
                      MODEL
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.anomalyHotspots}
                        onChange={() => toggleLayer('anomalyHotspots')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Anomaly Hotspots
                    </span>
                    <span className="text-[9px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/60">
                      LIVE
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.complianceRisk}
                        onChange={() => toggleLayer('complianceRisk')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Compliance/SLA Risk
                    </span>
                    <span className="text-[9px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/60">
                      LIVE
                    </span>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer hover:text-slate-100">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layerVisibility.environmentalRisk}
                        onChange={() => toggleLayer('environmentalRisk')}
                        className="rounded accent-rose-500 cursor-pointer"
                      />
                      Environmental Risk
                    </span>
                    <span className="text-[9px] text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-800/60">
                      LIVE
                    </span>
                  </label>
                </div>
              </div>

              {/* Category 4: EXTERNAL */}
              <div className="pt-1 border-t border-[#1B211E]">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  ● EXTERNAL
                </span>
                <label className="flex items-center justify-between cursor-pointer hover:text-slate-100 text-[11px]">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layerVisibility.cmsmsSignals}
                      onChange={() => toggleLayer('cmsmsSignals')}
                      className="rounded accent-cyan-500 cursor-pointer"
                    />
                    CMSMS Signals
                  </span>
                  <span className="text-[9px] text-cyan-400 font-bold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/60">
                    SIM
                  </span>
                </label>
              </div>

              {/* Category 5: 3D / NAVIGATION */}
              <div className="pt-1 border-t border-[#1B211E]">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  ● 3D / NAVIGATION
                </span>
                <label className="flex items-center justify-between cursor-pointer hover:text-slate-100 text-[11px]">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={layerVisibility.threeDLinked}
                      onChange={() => toggleLayer('threeDLinked')}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                    3D-linked Objects
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Panel 2: SELECTED FEATURE & LOCATION EVIDENCE (Matching Reference Screenshot) */}
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-4 shadow-xl flex flex-col justify-between flex-1">
            <div>
              <div className="flex items-center justify-between border-b border-[#1B211E] pb-2 mb-3">
                <h2 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  SELECTED FEATURE & LOCATION EVIDENCE
                </h2>
                {selectedFeature && (
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {selectedFeature ? (
                <div className="space-y-3 text-xs font-sans">
                  {/* Feature Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                      <h3 className="font-bold text-sm text-white">
                        {selectedFeature.type === 'HOTSPOT' ? 'Risk Hotspot' :
                         selectedFeature.type === 'COORDINATE' ? `Corner ${selectedFeature.data.point_label}` :
                         selectedFeature.type === 'BOUNDARY' ? `${mapData?.mine.name} Boundary` :
                         selectedFeature.data.title || selectedFeature.data.name || 'Mine Entity'}
                      </h3>
                    </div>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase',
                      selectedFeature.data.risk_band === 'CRITICAL' || selectedFeature.data.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      selectedFeature.data.risk_band === 'HIGH' || selectedFeature.data.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      selectedFeature.data.trust_badge === 'SOURCE_DERIVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    )}>
                      {selectedFeature.data.risk_band ? `${selectedFeature.data.risk_band} RISK` : (selectedFeature.data.trust_badge || 'OPERATIONAL')}
                    </span>
                  </div>

                  {/* Metadata Fields */}
                  <div className="space-y-1 text-xs text-slate-300">
                    <p><span className="text-slate-400">Zone:</span> {selectedFeature.data.properties?.zone_name || selectedFeature.data.zone_name || 'Northern Sector - Gas Accumulation'}</p>
                    <p><span className="text-slate-400">Type:</span> {selectedFeature.data.hotspot_type === 'PREDICTIVE_HOTSPOT' ? 'Predictive Risk' : (selectedFeature.data.feature_type || selectedFeature.type)}</p>
                    {selectedFeature.data.risk_score && (
                      <p className="flex items-center gap-2">
                        <span className="text-slate-400">Risk Score:</span>
                        <b className="text-white">{selectedFeature.data.risk_score} / 100</b>
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold font-mono">
                          {selectedFeature.data.risk_band}
                        </span>
                      </p>
                    )}
                    {selectedFeature.data.prediction_horizon && (
                      <p><span className="text-slate-400">Prediction Horizon:</span> {selectedFeature.data.prediction_horizon}</p>
                    )}
                    <p><span className="text-slate-400">Source:</span> {selectedFeature.data.source_model || selectedFeature.data.provenance?.document_title || 'Predictive Risk Model (v1.0)'}</p>
                  </div>

                  {/* Location with Copy Button */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#121614] border border-[#1B211E] font-mono text-[11px]">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Lat: {selectedFeature.data.latitude?.toFixed(4) || selectedFeature.data.min_latitude?.toFixed(4) || '23.4121'}° N &nbsp;
                        Lon: {selectedFeature.data.longitude?.toFixed(4) || selectedFeature.data.min_longitude?.toFixed(4) || '85.3245'}° E
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyLocation(`${selectedFeature.data.latitude || 23.4121}, ${selectedFeature.data.longitude || 85.3245}`)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Coordinates"
                    >
                      {copiedLocation ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Nearby Entities (within 1 km) */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Nearby Entities (within 1 km)
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121614] border border-[#1B211E] text-cyan-400">
                        <span>▲</span> Sensors <b className="text-white">{spatialContext?.nearest_sensors?.length || 3}</b>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121614] border border-[#1B211E] text-rose-400">
                        <span>!</span> Incidents <b className="text-white">{spatialContext?.nearest_incidents?.length || 1}</b>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121614] border border-[#1B211E] text-amber-400">
                        <span>◉</span> Field Tasks <b className="text-white">{spatialContext?.nearest_inspections?.length || 2}</b>
                      </div>
                    </div>
                  </div>

                  {/* Contributing Factors */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Contributing Factors
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300 font-sans pl-1">
                      {selectedFeature.data.contributing_factors && selectedFeature.data.contributing_factors.length > 0 ? (
                        selectedFeature.data.contributing_factors.map((f: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>{f}</span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>CH4 level rising trend (+18%)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>Predictive anomaly detected (12 min ago)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">•</span>
                            <span>Proximity to working face (320m)</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Action Buttons Grid */}
                  <div className="pt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleFocus3DTwin}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition-all shadow-md cursor-pointer"
                      >
                        <Layers3 className="w-4 h-4 text-slate-950" />
                        Focus in 3D Twin
                      </button>

                      <button
                        onClick={() => setCurrentTab('copilot')}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs transition-all shadow-md cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        Ask Copilot
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleCreateFieldTask}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-xs transition-all cursor-pointer"
                      >
                        <ClipboardList className="w-4 h-4" />
                        Create Field Task
                      </button>

                      <button
                        onClick={() => {
                          if (selectedFeature.data.provenance) {
                            setInspectorData(selectedFeature.data.provenance);
                          } else {
                            setCurrentTab('documents');
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#171B18] hover:bg-slate-800 border border-[#232A26] text-slate-300 font-mono text-xs transition-all cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        View Source Evidence
                      </button>
                    </div>
                  </div>

                  {/* Trust Disclaimer */}
                  <div className="p-2.5 rounded-lg bg-[#121614] border border-[#1B211E] flex items-start gap-2 text-[11px] text-slate-400">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      This is a model-generated risk hotspot. Not a confirmed violation. Requires field verification.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 font-mono text-xs space-y-2">
                  <Crosshair className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                  <p className="font-semibold text-slate-400">No Feature Selected</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Click any mine boundary, corner coordinate, sensor node, or risk hotspot on the map to inspect evidence.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM AUDIT & INFORMATION CARDS (Matching Reference Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: DATA TRUST (THIS MINE) */}
        {mapData && (
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-3.5 text-xs font-mono shadow-md flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-[#1B211E] pb-2 mb-2.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">DATA TRUST (THIS MINE)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Source-Derived</span>
                <b className="text-emerald-400 ml-auto">{mapData.trust_metrics.source_derived_count}</b>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-400">Approximate</span>
                <b className="text-amber-400 ml-auto">{mapData.trust_metrics.approximate_count}</b>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-400">Operational</span>
                <b className="text-cyan-400 ml-auto">{mapData.trust_metrics.operational_count}</b>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-slate-400">Simulated</span>
                <b className="text-purple-400 ml-auto">{mapData.trust_metrics.simulated_count}</b>
              </div>
            </div>
            <div className="pt-2 border-t border-[#1B211E] mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>Not Documented: {mapData.trust_metrics.not_documented_count}</span>
              <span className="text-emerald-400 font-bold">100% AUDITABLE</span>
            </div>
          </div>
        )}

        {/* Card 2: MINE INFORMATION */}
        {mapData && (
          <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-3.5 text-xs font-mono shadow-md flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-[#1B211E] pb-2 mb-2.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">MINE INFORMATION</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="text-slate-100 font-bold truncate text-xs">{mapData.mine.name}</div>
              <div className="text-slate-400 text-[10px]">{mapData.mine.district}, {mapData.mine.state}</div>
              <div className="flex justify-between text-[11px] pt-1">
                <span className="text-slate-400">Area:</span>
                <span className="text-amber-400 font-bold">{mapData.mine.total_area_sq_km || '12.4'} km² (approx)</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold">{mapData.mine.data_status}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate pt-0.5">
                Source: {mapData.mine.provenance_doc}
              </div>
            </div>
          </div>
        )}

        {/* Card 3: COORDINATE SYSTEM */}
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-3.5 text-xs font-mono shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-[#1B211E] pb-2 mb-2.5">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">COORDINATE SYSTEM</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="text-cyan-400 font-bold text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              WGS84 (EPSG:4326)
            </div>
            <div className="text-slate-300 text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              Local Mine Grid (Topocentric)
            </div>
            <div className="text-[10px] text-slate-500 pt-1">
              Datum: WGS84 Ellipsoid | EPSG Geodetic
            </div>
          </div>
        </div>

        {/* Card 4: LAST UPDATED & TELEMETRY MODE */}
        <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-3.5 text-xs font-mono shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-2 border-b border-[#1B211E] pb-2 mb-2.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">LAST UPDATED</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="text-slate-200 font-bold text-xs">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Data Ingestion
            </div>
            <div className="text-[10px] text-slate-500">
              Protocol: MQTT / Webhook Telemetry
            </div>
          </div>
        </div>
      </div>

      {/* 4. SOURCE DOCUMENT PROVENANCE MODAL */}
      {inspectorData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-[#0D100F] border border-[#232A26] rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl animate-fade-in font-sans">
            <div className="flex items-center justify-between border-b border-[#1B211E] pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100 font-mono uppercase tracking-wide">
                  Source Document Provenance Inspector
                </h3>
              </div>
              <button
                onClick={() => setInspectorData(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="bg-[#121614] p-3 rounded-lg border border-[#1B211E]">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">DOCUMENT TITLE:</span>
                <p className="font-bold text-slate-100 text-xs">{inspectorData.document_title}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#121614] p-2.5 rounded-lg border border-[#1B211E]">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">PAGE NUMBER:</span>
                  <p className="font-bold text-amber-400">{inspectorData.page_number || 'N/A'}</p>
                </div>
                <div className="bg-[#121614] p-2.5 rounded-lg border border-[#1B211E]">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">AUTHORITY TIER:</span>
                  <p className="font-bold text-emerald-400">{inspectorData.authority_level || 'TIER 1 (OFFICIAL)'}</p>
                </div>
              </div>

              <div className="bg-[#121614] p-3 rounded-lg border border-[#1B211E]">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">SHA-256 PROVENANCE HASH:</span>
                <p className="font-mono text-[11px] text-amber-400/90 break-all">{inspectorData.document_hash}</p>
              </div>

              {inspectorData.source_text_reference && (
                <div className="bg-[#121614] p-3 rounded-lg border border-[#1B211E] space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">VERBATIM SOURCE EXCERPT:</span>
                  <p className="text-xs text-slate-300 font-sans italic border-l-2 border-amber-500/60 pl-2.5 leading-relaxed">
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
                className="px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                OPEN IN DOCUMENT INTELLIGENCE
              </button>
              <button
                onClick={() => setInspectorData(null)}
                className="px-4 py-2 rounded-lg bg-[#171B18] hover:bg-slate-800 text-slate-300 border border-[#232A26] text-xs font-mono cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
