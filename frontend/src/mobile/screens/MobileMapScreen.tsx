import React, { useState, useEffect } from 'react';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Compass, 
  Crosshair, 
  Mountain, 
  Map as MapIcon,
  Sparkles,
  Info
} from 'lucide-react';

export const MobileMapScreen: React.FC = () => {
  const { selectedMine } = useMineContext();
  const { t } = useLanguage();

  const [gpsStatus, setGpsStatus] = useState({
    lat: selectedMine?.latitude || 23.7957,
    lon: selectedMine?.longitude || 86.4304,
    elevation: selectedMine?.elevation || -320.0,
    accuracy: 6.2,
    status: 'GPS Fixed (DGMS Geofenced)',
  });

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 font-sans">
            {t('mobileMap')}
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Spatial Field Orientation • {selectedMine?.name || 'Mine'}
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          MOBILE-01
        </span>
      </div>

      {/* GPS Geo-Fix Card */}
      <MobileCard className="p-4 bg-slate-900 border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-bold text-slate-200">
              FIELD LOCATION FIX
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            {gpsStatus.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">LATITUDE</span>
            <span className="text-xs font-bold text-slate-200">{gpsStatus.lat.toFixed(4)}°N</span>
          </div>
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">LONGITUDE</span>
            <span className="text-xs font-bold text-slate-200">{gpsStatus.lon.toFixed(4)}°E</span>
          </div>
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-500 block">ELEVATION</span>
            <span className="text-xs font-bold text-amber-400">{gpsStatus.elevation}m</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <span>Accuracy: ±{gpsStatus.accuracy}m</span>
          <span>Datum: WGS84 / EPSG:4326</span>
        </div>
      </MobileCard>

      {/* Map Canvas Placeholder */}
      <div className="relative h-64 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-inner">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative z-10 space-y-3 max-w-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-md">
            <MapIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-slate-200">
              Mobile Sub-Surface GIS Map
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Interactive 2D/3D geofenced asset tracking and heading navigation activates in <strong>MOBILE-07</strong>.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 font-mono text-[10px] text-slate-300">
            <Mountain className="w-3 h-3 text-amber-400" />
            <span>{selectedMine?.mine_type || 'UNDERGROUND'} LEASE BOUNDARY</span>
          </div>
        </div>
      </div>

      {/* Mine Spatial Summary */}
      <MobileCard className="p-4 space-y-2.5">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-300">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>SPATIAL CONTEXT</span>
        </div>

        <div className="space-y-1.5 text-xs text-slate-300 font-sans">
          <div className="flex justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Mine Name:</span>
            <span className="font-semibold text-slate-200">{selectedMine?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">State / District:</span>
            <span>{selectedMine?.district || selectedMine?.state}, {selectedMine?.state}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Operational Type:</span>
            <span className="font-mono text-amber-400">{selectedMine?.mine_type || 'UNDERGROUND'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">DGMS Code:</span>
            <span className="font-mono">{selectedMine?.code || 'N/A'}</span>
          </div>
        </div>
      </MobileCard>
    </div>
  );
};
