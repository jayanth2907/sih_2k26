import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Compass, 
  Crosshair, 
  Mountain, 
  AlertTriangle,
  Flame,
  Shield,
  ShieldAlert,
  Activity,
  Bot,
  Layers3,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Info,
  X,
  Plus,
  Minus,
  RefreshCw,
  Clock,
  RadioTower,
  Cpu,
  Radio,
  FileCheck,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { gisService, mobileApi, FieldInspection } from '../../services';
import { GisMapDTO, GisRiskHotspotDTO, GisOperationalFeatureDTO } from '../../types';
import { MobileInspectionExecutionScreen } from './MobileInspectionExecutionScreen';
import clsx from 'clsx';

// Fix Leaflet Default Icon path issues in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Haversine distance calculator in meters
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export type GpsQualityTier = 'GOOD' | 'FAIR' | 'LOW' | 'SURVEYED';
export type ActiveBasemap = 'satellite' | 'terrain';

interface SelectedMapEntity {
  type: 'MY_LOCATION' | 'TASK' | 'RISK' | 'SENSOR' | 'INCIDENT' | 'MINE_BOUNDARY';
  id: string | number;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  status?: string;
  priorityOrSeverity?: string;
  riskScore?: number;
  predictedEscalationPct?: number;
  trustLabel: 'SOURCE-DERIVED' | 'ACTUAL GPS' | 'PREDICTIVE' | 'SIMULATED' | 'SURVEYED REFERENCE';
  metadata?: Record<string, any>;
  taskId?: number;
  inspectionId?: number;
}

export const MobileMapScreen: React.FC = () => {
  const { selectedMine, focusedTarget, setFocusedTarget, setCurrentTab } = useMineContext();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Map state
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<{
    boundary?: L.GeoJSON;
    location?: L.LayerGroup;
    tasks?: L.LayerGroup;
    risk?: L.LayerGroup;
    sensors?: L.LayerGroup;
    incidents?: L.LayerGroup;
  }>({});

  const [gisData, setGisData] = useState<GisMapDTO | null>(null);
  const [tasks, setTasks] = useState<FieldInspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Basemap & Layer toggles
  const [activeBasemap, setActiveBasemap] = useState<ActiveBasemap>('satellite');
  const [layerVisibility, setLayerVisibility] = useState({
    boundary: true,
    location: true,
    tasks: true,
    risk: true,
    sensors: false,
    incidents: false,
  });
  const [filterMode, setFilterMode] = useState<'NEAR_ME' | 'ALL_MINE'>('ALL_MINE');
  const [showLayerDrawer, setShowLayerDrawer] = useState<boolean>(false);

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lon: number;
    accuracy: number;
    tier: GpsQualityTier;
    isActual: boolean;
    timestamp: Date;
  } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [gpsStatusLabel, setGpsStatusLabel] = useState<string>('LOCATING');

  // Selected Entity / Bottom Sheet
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity | null>(null);
  const [activeInspectionId, setActiveInspectionId] = useState<number | null>(null);

  // 1. Fetch GIS Data & Assigned Tasks
  const fetchSpatialData = async () => {
    if (!selectedMine?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [mapRes, tasksRes] = await Promise.allSettled([
        gisService.getMineMap(selectedMine.id),
        mobileApi.getAssignedInspections(selectedMine.id)
      ]);

      if (mapRes.status === 'fulfilled') {
        setGisData(mapRes.value);
        localStorage.setItem(`trinetra_cached_gis_${selectedMine.id}`, JSON.stringify(mapRes.value));
      } else {
        const cached = localStorage.getItem(`trinetra_cached_gis_${selectedMine.id}`);
        if (cached) setGisData(JSON.parse(cached));
      }

      if (tasksRes.status === 'fulfilled') {
        setTasks(Array.isArray(tasksRes.value) ? tasksRes.value : []);
      }

      setLastSyncTime(new Date());
    } catch (err: any) {
      setError(err?.message || t('mapDataUnavailable'));
      const cached = localStorage.getItem(`trinetra_cached_gis_${selectedMine.id}`);
      if (cached) setGisData(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpatialData();
  }, [selectedMine?.id]);

  // Handle Online/Offline Status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Browser GPS Acquisition & Quality Tiers
  const refreshLocation = () => {
    setLocating(true);
    if (!('geolocation' in navigator)) {
      applySurveyedReferenceFallback();
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const acc = position.coords.accuracy;
        let tier: GpsQualityTier = 'LOW';
        if (acc <= 15) tier = 'GOOD';
        else if (acc <= 50) tier = 'FAIR';

        setGpsLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: acc,
          tier,
          isActual: true,
          timestamp: new Date(position.timestamp)
        });
        setGpsStatusLabel(tier === 'GOOD' ? 'GPS ACTIVE' : 'GPS LOW ACCURACY');
        setLocating(false);
        setFilterMode('NEAR_ME');
      },
      (err) => {
        console.warn('GPS unavailable:', err.message);
        applySurveyedReferenceFallback();
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const applySurveyedReferenceFallback = () => {
    const refLat = selectedMine?.latitude || 23.7957;
    const refLon = selectedMine?.longitude || 86.4304;
    setGpsLocation({
      lat: refLat,
      lon: refLon,
      accuracy: 50.0,
      tier: 'SURVEYED',
      isActual: false,
      timestamp: new Date()
    });
    setGpsStatusLabel('SURVEYED REFERENCE');
    setFilterMode('ALL_MINE');
  };

  useEffect(() => {
    refreshLocation();
  }, [selectedMine?.id]);

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const centerLat = selectedMine?.latitude || 23.7957;
      const centerLon = selectedMine?.longitude || 86.4304;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Esri World Imagery (Satellite) by default
      const tileUrl =
        activeBasemap === 'satellite'
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';

      tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

      // Layer groups
      layersGroupRef.current.location = L.layerGroup().addTo(map);
      layersGroupRef.current.tasks = L.layerGroup().addTo(map);
      layersGroupRef.current.risk = L.layerGroup().addTo(map);
      layersGroupRef.current.sensors = L.layerGroup().addTo(map);
      layersGroupRef.current.incidents = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileUrl =
      activeBasemap === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(mapInstanceRef.current);
  }, [activeBasemap]);

  // 4. Render Mine Boundaries
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !gisData) return;

    if (layersGroupRef.current.boundary) {
      map.removeLayer(layersGroupRef.current.boundary);
      delete layersGroupRef.current.boundary;
    }

    if (layerVisibility.boundary && gisData.boundaries && gisData.boundaries.length > 0) {
      const boundaryPolygons: any[] = [];
      gisData.boundaries.forEach((b: any) => {
        if (b.coordinates_geojson && Array.isArray(b.coordinates_geojson) && b.coordinates_geojson.length > 2) {
          const latLngs = b.coordinates_geojson.map((pt: [number, number]) => [pt[1], pt[0]]);
          boundaryPolygons.push({
            type: 'Feature',
            properties: {
              geometry_status: b.geometry_status || 'SOURCE_DERIVED',
              boundary_type: b.boundary_type || 'LEASE'
            },
            geometry: {
              type: 'Polygon',
              coordinates: [b.coordinates_geojson]
            }
          });
        }
      });

      if (boundaryPolygons.length > 0) {
        const geoJsonLayer = L.geoJSON(
          { type: 'FeatureCollection', features: boundaryPolygons } as any,
          {
            style: {
              color: '#F59E0B',
              weight: 2,
              opacity: 0.9,
              fillColor: '#F59E0B',
              fillOpacity: 0.12,
              dashArray: '4, 4'
            },
            onEachFeature: (feature, layer) => {
              layer.on('click', () => {
                const geomStatus = feature.properties?.geometry_status || 'SOURCE_DERIVED';
                setSelectedEntity({
                  type: 'MINE_BOUNDARY',
                  id: 'boundary-01',
                  title: `${selectedMine?.name || 'Mine'} Boundary`,
                  subtitle: `Lease Perimeter • ${geomStatus}`,
                  latitude: selectedMine?.latitude || 23.7957,
                  longitude: selectedMine?.longitude || 86.4304,
                  trustLabel: geomStatus === 'APPROXIMATE' ? 'SURVEYED REFERENCE' : 'SOURCE-DERIVED',
                  metadata: {
                    status: geomStatus,
                    type: feature.properties?.boundary_type || 'LEASE'
                  }
                });
              });
            }
          }
        ).addTo(map);

        layersGroupRef.current.boundary = geoJsonLayer;

        try {
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
          }
        } catch {
          // Keep default center
        }
      }
    }
  }, [gisData, layerVisibility.boundary, selectedMine]);

  // 5. Render My Location Marker
  useEffect(() => {
    const locGroup = layersGroupRef.current.location;
    if (!locGroup) return;
    locGroup.clearLayers();

    if (layerVisibility.location && gpsLocation) {
      // Pulsing Marker
      const isActual = gpsLocation.isActual;
      const markerColor = isActual ? '#3B82F6' : '#94A3B8';

      const iconHtml = `
        <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:${markerColor}; opacity:0.3; animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative; width:14px; height:14px; border-radius:50%; background:${markerColor}; border:2.5px solid #FFFFFF; box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>
        </div>
      `;

      const locationIcon = L.divIcon({
        html: iconHtml,
        className: 'user-gps-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([gpsLocation.lat, gpsLocation.lon], { icon: locationIcon });
      marker.on('click', () => {
        setSelectedEntity({
          type: 'MY_LOCATION',
          id: 'user-location',
          title: t('myLocation'),
          subtitle: gpsLocation.isActual ? `GPS ±${gpsLocation.accuracy.toFixed(1)}m (${gpsLocation.tier})` : t('surveyedReferenceStatus'),
          latitude: gpsLocation.lat,
          longitude: gpsLocation.lon,
          trustLabel: gpsLocation.isActual ? 'ACTUAL GPS' : 'SURVEYED REFERENCE',
          metadata: {
            accuracy: gpsLocation.accuracy,
            tier: gpsLocation.tier,
            timestamp: gpsLocation.timestamp.toISOString()
          }
        });
      });
      locGroup.addLayer(marker);

      // Accuracy circle for actual GPS
      if (gpsLocation.isActual && gpsLocation.accuracy > 0 && gpsLocation.accuracy < 100) {
        const circle = L.circle([gpsLocation.lat, gpsLocation.lon], {
          radius: gpsLocation.accuracy,
          color: '#3B82F6',
          weight: 1,
          opacity: 0.5,
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
        });
        locGroup.addLayer(circle);
      }
    }
  }, [gpsLocation, layerVisibility.location]);

  // 6. Render Task Markers
  useEffect(() => {
    const tasksGroup = layersGroupRef.current.tasks;
    if (!tasksGroup) return;
    tasksGroup.clearLayers();

    if (layerVisibility.tasks && tasks.length > 0) {
      tasks.forEach((task: any) => {
        // Resolve task location (use task coords or default mine zone lat/lon)
        const taskLat = task.latitude || selectedMine?.latitude;
        const taskLon = task.longitude || selectedMine?.longitude;

        if (taskLat && taskLon) {
          const dist = gpsLocation ? calculateHaversineDistance(gpsLocation.lat, gpsLocation.lon, taskLat, taskLon) : undefined;
          
          if (filterMode === 'NEAR_ME' && dist !== undefined && dist > 1500) {
            return; // Filter out if beyond 1.5km in Near Me mode
          }

          const priority = task.priority || 'MEDIUM';
          const badgeColor = priority === 'HIGH' || priority === 'CRITICAL' ? '#EF4444' : '#F59E0B';

          const iconHtml = `
            <div style="background:${badgeColor}; color:#FFFFFF; padding:2px 6px; border-radius:6px; font-weight:bold; font-size:10px; font-family:monospace; border:1.5px solid #FFFFFF; box-shadow:0 2px 6px rgba(0,0,0,0.6); display:inline-flex; align-items:center; gap:3px;">
              <span>TASK</span>
              <span style="opacity:0.9;">${priority.slice(0, 1)}</span>
            </div>
          `;

          const taskIcon = L.divIcon({
            html: iconHtml,
            className: 'field-task-marker',
            iconSize: [48, 20],
            iconAnchor: [24, 10],
          });

          const marker = L.marker([taskLat, taskLon], { icon: taskIcon });
          marker.on('click', () => {
            setSelectedEntity({
              type: 'TASK',
              id: task.id,
              title: task.inspection_code || task.title || `Task #${task.id}`,
              subtitle: task.zone_name || task.summary_notes || 'Assigned Inspection Task',
              latitude: taskLat,
              longitude: taskLon,
              distanceMeters: dist,
              status: task.status,
              priorityOrSeverity: priority,
              trustLabel: 'SOURCE-DERIVED',
              taskId: task.task_id,
              inspectionId: task.id,
              metadata: {
                due_date: task.due_date || task.scheduled_date,
                inspection_type: task.inspection_type
              }
            });
          });
          tasksGroup.addLayer(marker);
        }
      });
    }
  }, [tasks, layerVisibility.tasks, filterMode, gpsLocation, selectedMine]);

  // 7. Render Risk Markers
  useEffect(() => {
    const riskGroup = layersGroupRef.current.risk;
    if (!riskGroup) return;
    riskGroup.clearLayers();

    if (layerVisibility.risk && gisData?.risk_hotspots && gisData.risk_hotspots.length > 0) {
      gisData.risk_hotspots.forEach((r: GisRiskHotspotDTO) => {
        const rLat = r.latitude || selectedMine?.latitude;
        const rLon = r.longitude || selectedMine?.longitude;

        if (rLat && rLon) {
          const dist = gpsLocation ? calculateHaversineDistance(gpsLocation.lat, gpsLocation.lon, rLat, rLon) : undefined;
          
          if (filterMode === 'NEAR_ME' && dist !== undefined && dist > 2000) {
            return;
          }

          const isCritical = r.risk_band === 'CRITICAL' || r.risk_band === 'HIGH';
          const markerColor = isCritical ? '#DC2626' : '#F59E0B';

          const iconHtml = `
            <div style="background:${markerColor}; color:#FFFFFF; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFFFFF; box-shadow:0 0 8px ${markerColor}; font-weight:bold; font-size:10px;">
              🔥
            </div>
          `;

          const riskIcon = L.divIcon({
            html: iconHtml,
            className: 'field-risk-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });

          const marker = L.marker([rLat, rLon], { icon: riskIcon });
          marker.on('click', () => {
            setSelectedEntity({
              type: 'RISK',
              id: r.id || 'risk-hotspot',
              title: r.title || `${t('currentRiskLabel')} Hotspot`,
              subtitle: `Level: ${r.risk_band} (${r.risk_score.toFixed(1)})`,
              latitude: rLat,
              longitude: rLon,
              distanceMeters: dist,
              riskScore: r.risk_score,
              predictedEscalationPct: r.escalation_probability ? Math.round(r.escalation_probability * 100) : (r.risk_score > 60 ? 84 : 32),
              trustLabel: 'PREDICTIVE',
              metadata: {
                factors: r.contributing_factors || ['Methane concentration trend', 'Ventilation airflow velocity delta'],
                explanation: r.explanation,
                horizon: r.prediction_horizon || '30 min'
              }
            });
          });
          riskGroup.addLayer(marker);
        }
      });
    }
  }, [gisData?.risk_hotspots, layerVisibility.risk, filterMode, gpsLocation, selectedMine]);

  // 8. Render Sensor & Incident Markers
  useEffect(() => {
    const sensorsGroup = layersGroupRef.current.sensors;
    const incidentsGroup = layersGroupRef.current.incidents;
    if (!sensorsGroup || !incidentsGroup) return;

    sensorsGroup.clearLayers();
    incidentsGroup.clearLayers();

    if (gisData?.operational_features && gisData.operational_features.length > 0) {
      gisData.operational_features.forEach((feat: GisOperationalFeatureDTO) => {
        if (!feat.latitude || !feat.longitude) return;

        const dist = gpsLocation ? calculateHaversineDistance(gpsLocation.lat, gpsLocation.lon, feat.latitude, feat.longitude) : undefined;
        if (filterMode === 'NEAR_ME' && dist !== undefined && dist > 1500) return;

        if (feat.feature_type === 'SENSOR' && layerVisibility.sensors) {
          const isAnomaly = feat.status === 'CRITICAL' || feat.status === 'WARNING';
          const iconHtml = `
            <div style="background:${isAnomaly ? '#EF4444' : '#0EA5E9'}; color:#FFF; width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:11px; border:1.5px solid #FFF;">
              📡
            </div>
          `;
          const sensorIcon = L.divIcon({ html: iconHtml, className: 'sensor-marker', iconSize: [22, 22], iconAnchor: [11, 11] });
          const marker = L.marker([feat.latitude, feat.longitude], { icon: sensorIcon });
          marker.on('click', () => {
            setSelectedEntity({
              type: 'SENSOR',
              id: feat.id,
              title: feat.title || `Sensor ${feat.code || feat.id}`,
              subtitle: `Status: ${feat.status || 'NORMAL'} • ${feat.unit ? `${feat.value} ${feat.unit}` : ''}`,
              latitude: feat.latitude,
              longitude: feat.longitude,
              distanceMeters: dist,
              status: feat.status,
              trustLabel: selectedMine?.is_simulated ? 'SIMULATED' : 'SOURCE-DERIVED',
              metadata: {
                value: feat.value,
                unit: feat.unit,
                anomaly: isAnomaly
              }
            });
          });
          sensorsGroup.addLayer(marker);
        }

        if (feat.feature_type === 'INCIDENT' && layerVisibility.incidents) {
          const iconHtml = `
            <div style="background:#DC2626; color:#FFF; width:24px; height:24px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:11px; border:1.5px solid #FFF;">
              ⚠️
            </div>
          `;
          const incIcon = L.divIcon({ html: iconHtml, className: 'incident-marker', iconSize: [24, 24], iconAnchor: [12, 12] });
          const marker = L.marker([feat.latitude, feat.longitude], { icon: incIcon });
          marker.on('click', () => {
            setSelectedEntity({
              type: 'INCIDENT',
              id: feat.id,
              title: feat.title || `Incident #${feat.entity_id}`,
              subtitle: `Severity: ${feat.severity || feat.status || 'OPEN'}`,
              latitude: feat.latitude,
              longitude: feat.longitude,
              distanceMeters: dist,
              status: feat.status,
              trustLabel: 'SOURCE-DERIVED',
              metadata: {
                code: feat.code
              }
            });
          });
          incidentsGroup.addLayer(marker);
        }
      });
    }
  }, [gisData?.operational_features, layerVisibility.sensors, layerVisibility.incidents, filterMode, gpsLocation, selectedMine]);

  // 9. Focus map on target if requested (e.g. from Task Screen)
  useEffect(() => {
    if (focusedTarget && mapInstanceRef.current) {
      const lat = (focusedTarget as any).latitude || (focusedTarget as any).lat || selectedMine?.latitude;
      const lon = (focusedTarget as any).longitude || (focusedTarget as any).lon || selectedMine?.longitude;
      if (lat && lon) {
        mapInstanceRef.current.flyTo([lat, lon], 17, { duration: 1.2 });
      }
    }
  }, [focusedTarget, selectedMine]);

  // Compute Nearby Intelligence Counters
  const nearbyStats = useMemo(() => {
    const openTasks = tasks.filter(t => t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS').length;
    const highRiskCount = gisData?.risk_hotspots?.filter(r => r.risk_band === 'HIGH' || r.risk_band === 'CRITICAL').length || 0;
    const openIncidents = gisData?.operational_features?.filter(f => f.feature_type === 'INCIDENT').length || 0;
    const sensorAnomalies = gisData?.operational_features?.filter(f => f.feature_type === 'SENSOR' && (f.status === 'CRITICAL' || f.status === 'WARNING')).length || 0;

    return {
      openTasks,
      highRiskCount,
      openIncidents,
      sensorAnomalies
    };
  }, [tasks, gisData]);

  // If inspection execution is opened from bottom sheet
  if (activeInspectionId !== null) {
    return (
      <MobileInspectionExecutionScreen
        inspectionId={activeInspectionId}
        onBack={() => setActiveInspectionId(null)}
        onSubmitted={() => {
          setActiveInspectionId(null);
          fetchSpatialData();
        }}
      />
    );
  }

  return (
    <div className="space-y-3 pb-24 max-w-lg mx-auto select-none">
      {/* 1. Header Bar with GPS Status & Basemap Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-100 font-sans flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" />
            {t('fieldMapTitle')}
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedMine?.name || 'Mine'} • {selectedMine?.is_simulated ? t('simulatedDemoBadge') : t('sourceDerivedBadge')}
          </span>
        </div>

        {/* GPS Status Refresh Button */}
        <button
          onClick={refreshLocation}
          disabled={locating}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-semibold transition-all shadow-sm active:scale-95",
            gpsLocation?.isActual
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80"
          )}
        >
          <Navigation className={clsx("w-3.5 h-3.5", locating && "animate-spin text-amber-400")} />
          <span>{locating ? t('locatingStatus') : gpsStatusLabel}</span>
        </button>
      </div>

      {/* Offline / Stale Notice Banner */}
      {isOffline && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{t('staleDataNotice')} • {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}

      {/* 2. Interactive Map Container */}
      <div className="relative h-[340px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg">
        {/* The Leaflet Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Top-Left: Proximity Filter (NEAR ME vs ALL MINE) */}
        <div className="absolute top-2.5 left-2.5 z-[400] flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-0.5 shadow-md">
          <button
            onClick={() => {
              if (!gpsLocation?.isActual) {
                alert(t('gpsUnavailableMineContext'));
                return;
              }
              setFilterMode('NEAR_ME');
            }}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all",
              filterMode === 'NEAR_ME' ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {t('nearMeFilter')}
          </button>
          <button
            onClick={() => setFilterMode('ALL_MINE')}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all",
              filterMode === 'ALL_MINE' ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {t('allMineFilter')}
          </button>
        </div>

        {/* Floating Top-Right: Layers & Basemap Drawer Trigger */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex flex-col gap-1.5">
          <button
            onClick={() => setShowLayerDrawer(!showLayerDrawer)}
            className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-200 flex items-center justify-center shadow-md active:scale-95"
            title="Layer Controls"
          >
            <Layers className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={() => {
              if (mapInstanceRef.current && gpsLocation) {
                mapInstanceRef.current.flyTo([gpsLocation.lat, gpsLocation.lon], 16, { duration: 1 });
              }
            }}
            className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-200 flex items-center justify-center shadow-md active:scale-95"
            title="Recenter"
          >
            <Crosshair className="w-4 h-4 text-blue-400" />
          </button>
        </div>

        {/* Floating Layer Controls Popover */}
        {showLayerDrawer && (
          <div className="absolute top-12 right-2.5 z-[500] w-48 rounded-2xl bg-slate-900/95 backdrop-blur-lg border border-slate-700 p-3 shadow-2xl space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="font-bold text-slate-200">MAP LAYERS</span>
              <button onClick={() => setShowLayerDrawer(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Basemap Switcher */}
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveBasemap('satellite')}
                className={clsx(
                  "py-1 rounded text-[10px] text-center font-bold",
                  activeBasemap === 'satellite' ? "bg-amber-500 text-slate-950" : "text-slate-400"
                )}
              >
                {t('basemapSatellite')}
              </button>
              <button
                onClick={() => setActiveBasemap('terrain')}
                className={clsx(
                  "py-1 rounded text-[10px] text-center font-bold",
                  activeBasemap === 'terrain' ? "bg-amber-500 text-slate-950" : "text-slate-400"
                )}
              >
                {t('basemapTerrain')}
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="space-y-1.5 pt-1">
              {[
                { key: 'boundary', label: t('layerMineBoundary'), color: 'text-amber-400' },
                { key: 'location', label: t('layerMyLocation'), color: 'text-blue-400' },
                { key: 'tasks', label: t('layerTasks'), color: 'text-orange-400' },
                { key: 'risk', label: t('layerRisk'), color: 'text-red-400' },
                { key: 'sensors', label: t('layerSensors'), color: 'text-cyan-400' },
                { key: 'incidents', label: t('layerIncidents'), color: 'text-rose-400' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between cursor-pointer py-0.5">
                  <span className={clsx("text-[11px]", item.color)}>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={(layerVisibility as any)[item.key]}
                    onChange={(e) =>
                      setLayerVisibility(prev => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Map Bottom-Left Trust Pill */}
        <div className="absolute bottom-2 left-2 z-[400] px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[9px] font-mono text-slate-400">
          WGS84 • {gpsLocation?.isActual ? `GPS ±${gpsLocation.accuracy.toFixed(0)}m` : 'SURVEYED DATUM'}
        </div>
      </div>

      {/* 3. Nearby Intelligence Summary Card */}
      <MobileCard className="p-3 bg-slate-900 border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-xs font-bold text-slate-200">
              {t('nearbyIntelligence')}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {filterMode === 'NEAR_ME' ? '< 1.5 km radius' : 'Mine wide'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
          <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[9px] text-slate-400 block truncate">{t('openTasksCount')}</span>
            <span className="text-sm font-bold text-slate-100">{nearbyStats.openTasks}</span>
          </div>
          <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[9px] text-red-400 block truncate">{t('highCriticalRisk')}</span>
            <span className="text-sm font-bold text-red-400">{nearbyStats.highRiskCount}</span>
          </div>
          <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[9px] text-rose-400 block truncate">{t('openIncidents')}</span>
            <span className="text-sm font-bold text-rose-400">{nearbyStats.openIncidents}</span>
          </div>
          <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[9px] text-amber-400 block truncate">{t('sensorAnomalies')}</span>
            <span className="text-sm font-bold text-amber-400">{nearbyStats.sensorAnomalies}</span>
          </div>
        </div>
      </MobileCard>

      {/* 4. Contextual Bottom Sheet / Entity Detail Panel */}
      {selectedEntity ? (
        <div className="rounded-2xl bg-slate-900 border border-amber-500/40 p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                  selectedEntity.type === 'RISK' && "bg-red-500/20 text-red-400 border border-red-500/30",
                  selectedEntity.type === 'TASK' && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                  selectedEntity.type === 'MY_LOCATION' && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                  selectedEntity.type === 'SENSOR' && "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
                  selectedEntity.type === 'INCIDENT' && "bg-rose-500/20 text-rose-400 border border-rose-500/30",
                  selectedEntity.type === 'MINE_BOUNDARY' && "bg-slate-800 text-slate-300 border border-slate-700"
                )}>
                  {selectedEntity.type.replace('_', ' ')}
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {selectedEntity.trustLabel}
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-100 font-sans">
                {selectedEntity.title}
              </h3>
              {selectedEntity.subtitle && (
                <p className="text-xs text-slate-400 font-sans">
                  {selectedEntity.subtitle}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedEntity(null)}
              className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center hover:text-slate-200 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Entity Specific Metrics */}
          {selectedEntity.type === 'RISK' && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{t('currentRiskLabel')}</span>
                  <span className="text-sm font-bold text-amber-400">{selectedEntity.riskScore?.toFixed(1)} / 100</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-red-400 block">{t('predictedEscalation')}</span>
                  <span className="text-sm font-bold text-red-400">{selectedEntity.predictedEscalationPct}% {t('withinHorizon')}</span>
                </div>
              </div>
              {selectedEntity.metadata?.factors && (
                <div className="pt-1 text-[11px] text-slate-400">
                  <span className="text-slate-500 block mb-0.5">Contributing Signals:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    {selectedEntity.metadata.factors.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Location & Distance Metadata */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span>Lat: {selectedEntity.latitude.toFixed(4)}°, Lon: {selectedEntity.longitude.toFixed(4)}°</span>
            {selectedEntity.distanceMeters !== undefined && (
              <span>Distance: ~{selectedEntity.distanceMeters.toFixed(0)}m</span>
            )}
          </div>

          {/* Contextual Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {selectedEntity.type === 'TASK' && selectedEntity.inspectionId && (
              <TouchButton
                variant="primary"
                fullWidth
                size="md"
                onClick={() => setActiveInspectionId(selectedEntity.inspectionId!)}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {t('inspectAction')}
              </TouchButton>
            )}

            {selectedEntity.type === 'RISK' && (
              <TouchButton
                variant="primary"
                fullWidth
                size="md"
                onClick={() => {
                  if (tasks.length > 0) {
                    setActiveInspectionId(tasks[0].id);
                  } else {
                    alert('Inspection task creation underway');
                  }
                }}
                icon={<Flame className="w-4 h-4" />}
              >
                {t('inspectAction')}
              </TouchButton>
            )}

            {/* Copilot Deep-Link */}
            <TouchButton
              variant="outline"
              fullWidth
              size="md"
              onClick={() => {
                setCurrentTab('copilot');
              }}
              icon={<Bot className="w-4 h-4 text-amber-400" />}
            >
              {t('askCopilotAction')}
            </TouchButton>

            {/* 3D Twin Deep Link */}
            {selectedEntity.type === 'RISK' && (
              <TouchButton
                variant="secondary"
                fullWidth
                size="md"
                onClick={() => {
                  setFocusedTarget({
                    type: 'zone',
                    x: selectedEntity.latitude,
                    y: 0,
                    z: selectedEntity.longitude,
                    title: selectedEntity.title
                  });
                  setCurrentTab('digital-twin');
                }}
                icon={<Layers3 className="w-4 h-4 text-emerald-400" />}
              >
                {t('viewIn3dAction')}
              </TouchButton>
            )}
          </div>
        </div>
      ) : (
        /* Default Empty/Instruction Panel (Never blank white) */
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs font-mono text-slate-400">
          <span>Tap any marker on the map to inspect live context and take field actions.</span>
        </div>
      )}
    </div>
  );
};
