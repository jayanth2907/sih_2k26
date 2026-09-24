import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { alertService } from '../services';
import type { Alert } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { AnomalySpatialModal } from '../components/AnomalySpatialModal';
import { Bell, Crosshair, MapPin, Clock, Eye } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { selectedMine, focusInDigitalTwin } = useMineContext();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [inspectAnomalyId, setInspectAnomalyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAlerts = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const data = await alertService.getAlerts(
        selectedMine.id,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedMine?.id, statusFilter]);

  const handleUpdateStatus = async (alertId: number, newStatus: string) => {
    try {
      await alertService.updateAlertStatus(alertId, newStatus);
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert status:', err);
    }
  };

  if (!selectedMine) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1B211E] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Operational Alarm & Alert Dispatch
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time hazard notifications, threshold alerts, and incident links with deduplication.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-[#0D100F] border border-[#1B211E] rounded-lg text-xs font-mono">
          {['ALL', 'UNREAD', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 rounded-xl bg-[#0D100F] border border-[#1B211E] text-center text-slate-400 font-mono text-xs animate-pulse">
            Loading operational alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0D100F] border border-[#1B211E] text-center text-slate-400 font-mono text-xs">
            No active alerts matching filter.
          </div>
        ) : (
          alerts.map((a) => {
            const isCritical = a.severity === 'CRITICAL';
            const isWarning = a.severity === 'HIGH';
            const isUnread = a.status === 'UNREAD';

            return (
              <div
                key={a.id}
                className="p-5 rounded-xl border border-[#1B211E] hover:border-[#27302B] bg-[#0D100F] space-y-3 transition-all duration-150"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-amber-400">ALERT #{a.id}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#080A09] text-slate-400 border border-[#1B211E]">
                        {a.source}
                      </span>
                      <StatusBadge status={a.severity} size="sm" />
                      <StatusBadge status={a.status} size="sm" />
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1.5">{a.title}</h3>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
                    {a.sensor_id && (
                      <button
                        onClick={() =>
                          focusInDigitalTwin({
                            type: 'sensor',
                            id: a.sensor_id,
                            x: 145.0, // Defaults to seam coords if exact not on alert
                            y: 470.0,
                            z: -318.0,
                            title: a.title
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        3D Focus
                      </button>
                    )}
                    {a.anomaly_id && (
                      <button
                        onClick={() => setInspectAnomalyId(a.anomaly_id || null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#121614] hover:bg-[#1B211E] text-cyan-300 border border-[#27302B] text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        Inspect Proximity
                      </button>
                    )}
                    {a.status === 'UNREAD' && (
                      <button
                        onClick={() => handleUpdateStatus(a.id, 'ACKNOWLEDGED')}
                        className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                      >
                        Acknowledge
                      </button>
                    )}
                    {a.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleUpdateStatus(a.id, 'RESOLVED')}
                        className="px-3 py-1.5 rounded-md bg-[#121614] hover:bg-[#1B211E] text-slate-300 hover:text-white border border-[#27302B] text-[11px] transition-all cursor-pointer"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">{a.message}</p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2.5 border-t border-[#1B211E]">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {a.location_context || 'Location N/A'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Spatial Inspector Modal */}
      <AnomalySpatialModal
        anomalyId={inspectAnomalyId}
        onClose={() => setInspectAnomalyId(null)}
      />
    </motion.div>
  );
};
