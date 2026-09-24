import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  ArrowLeft, 
  Trash2, 
  Clock, 
  ShieldAlert, 
  Server, 
  FileText, 
  Camera, 
  CheckSquare, 
  AlertOctagon, 
  Activity, 
  Layers, 
  Bell, 
  Info,
  ChevronRight,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useMineContext } from '../../context/MineContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { MobileTab, NetworkStatusType } from '../types/mobile';
import { QueuedSyncOperation, SyncBatchRequest, SyncStatusResponse } from '../../types';
import { mobileApi } from '../../services';
import clsx from 'clsx';

const QUEUE_STORAGE_KEY = 'trinetra_field_sync_queue';
const LAST_SYNC_STORAGE_KEY = 'trinetra_last_server_sync';
const GIS_CACHE_KEY = 'trinetra_gis_last_fetched';
const NOTIF_CACHE_KEY = 'trinetra_notif_last_fetched';

interface MobileSyncCenterScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: MobileTab) => void;
}

export const MobileSyncCenterScreen: React.FC<MobileSyncCenterScreenProps> = ({
  onBack,
  onNavigateTab
}) => {
  const { t } = useLanguage();
  const { selectedMine } = useMineContext();

  // Network and Server Connectivity State
  const [deviceOnline, setDeviceOnline] = useState<boolean>(navigator.onLine);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastServerSyncTime, setLastServerSyncTime] = useState<string | null>(() => {
    return localStorage.getItem(LAST_SYNC_STORAGE_KEY);
  });

  // Local Queue State
  const [queue, setQueue] = useState<QueuedSyncOperation[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<QueuedSyncOperation | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'FAILED' | 'CONFLICT' | 'SYNCED'>('ALL');

  // Stale Cache Metadata
  const [gisLastUpdated, setGisLastUpdated] = useState<string | null>(() => {
    return localStorage.getItem(GIS_CACHE_KEY);
  });
  const [notifLastUpdated, setNotifLastUpdated] = useState<string | null>(() => {
    return localStorage.getItem(NOTIF_CACHE_KEY);
  });

  // Load Queue from Local Storage
  const loadLocalQueue = useCallback(() => {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed: QueuedSyncOperation[] = JSON.parse(raw);
        setQueue(parsed);
      } else {
        setQueue([]);
      }
    } catch (e) {
      console.error('Failed to parse local sync queue', e);
      setQueue([]);
    }
  }, []);

  // Save Queue to Local Storage
  const persistQueue = (updated: QueuedSyncOperation[]) => {
    setQueue(updated);
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist sync queue', e);
    }
  };

  // Test Server Reachability
  const checkServerReachability = useCallback(async () => {
    if (!navigator.onLine) {
      setServerReachable(false);
      return;
    }
    try {
      const res = await mobileApi.getSyncStatus(selectedMine?.id);
      setServerReachable(true);
      if (res?.last_server_sync_timestamp) {
        setLastServerSyncTime(res.last_server_sync_timestamp);
        localStorage.setItem(LAST_SYNC_STORAGE_KEY, res.last_server_sync_timestamp);
      }
    } catch {
      setServerReachable(false);
    }
  }, [selectedMine?.id]);

  // Initial Mount & Listeners
  useEffect(() => {
    loadLocalQueue();
    checkServerReachability();

    const handleOnline = () => {
      setDeviceOnline(true);
      checkServerReachability();
    };

    const handleOffline = () => {
      setDeviceOnline(false);
      setServerReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadLocalQueue, checkServerReachability]);

  // Derived Counts
  const counts = {
    pending: queue.filter(op => op.sync_status === 'QUEUED' || op.sync_status === 'LOCAL' || (op as any).sync_status === 'PENDING').length,
    syncing: queue.filter(op => op.sync_status === 'SYNCING').length,
    failed: queue.filter(op => op.sync_status === 'FAILED').length,
    conflicts: queue.filter(op => op.sync_status === 'CONFLICT').length,
    synced: queue.filter(op => op.sync_status === 'SYNCED').length
  };

  // Execute Batch Synchronization
  const executeSync = async (operationsToSync?: QueuedSyncOperation[]) => {
    if (!selectedMine?.id) {
      setStatusNotice('Select an active mine before syncing.');
      return;
    }

    const targetOps = operationsToSync || queue.filter(op => 
      op.sync_status === 'QUEUED' || op.sync_status === 'LOCAL' || (op as any).sync_status === 'PENDING' || op.sync_status === 'FAILED'
    );

    if (targetOps.length === 0) {
      setStatusNotice(t('noPendingOperationsMsg'));
      setTimeout(() => setStatusNotice(null), 3000);
      return;
    }

    setIsSyncing(true);
    setStatusNotice(t('syncingStatusText'));

    // Mark in-flight operations as SYNCING locally
    const opIds = new Set(targetOps.map(op => op.operation_id));
    const inFlightQueue = queue.map(op => {
      if (opIds.has(op.operation_id)) {
        return { ...op, sync_status: 'SYNCING' as const, last_attempt_timestamp: new Date().toISOString() };
      }
      return op;
    });
    persistQueue(inFlightQueue);

    try {
      // Package request with dependency ordering
      const batchRequest: SyncBatchRequest = {
        mine_id: selectedMine.id,
        operations: targetOps.map(op => ({
          operation_id: op.operation_id,
          entity_type: op.entity_type,
          entity_id: op.entity_id,
          operation_type: (op.operation_type === 'TRANSITION' ? 'UPDATE' : op.operation_type) || 'CREATE',
          payload: op.payload || {},
          client_timestamp: op.client_timestamp || new Date().toISOString()
        }))
      };

      const response = await mobileApi.syncBatch(batchRequest);

      // Map server response results back to local queue
      const resultMap = new Map<string, typeof response.results[0]>();
      response.results.forEach(res => {
        resultMap.set(res.operation_id, res);
      });

      const updatedQueue = queue.map(op => {
        const res = resultMap.get(op.operation_id);
        if (!res) return op;

        if (res.status === 'ACCEPTED' || res.status === 'ALREADY_PROCESSED') {
          return {
            ...op,
            sync_status: 'SYNCED' as const,
            server_id: res.server_id,
            last_error: undefined,
            last_attempt_timestamp: new Date().toISOString()
          };
        } else if (res.status === 'CONFLICT') {
          return {
            ...op,
            sync_status: 'CONFLICT' as const,
            last_error: res.error_message || 'Conflicting server state detected.',
            last_attempt_timestamp: new Date().toISOString(),
            conflict_data: {
              local_state: op.payload,
              server_state: null,
              reason: res.error_message || 'Resource was modified on server.'
            }
          };
        } else {
          return {
            ...op,
            sync_status: 'FAILED' as const,
            retry_count: (op.retry_count || 0) + 1,
            last_error: res.error_message || 'Server rejected operation.',
            last_attempt_timestamp: new Date().toISOString()
          };
        }
      });

      persistQueue(updatedQueue);

      // Record authoritative last successful server sync timestamp
      const nowIso = new Date().toISOString();
      setLastServerSyncTime(nowIso);
      localStorage.setItem(LAST_SYNC_STORAGE_KEY, nowIso);
      setServerReachable(true);

      setStatusNotice(`Sync complete: ${response.accepted_count || 0} accepted, ${response.conflict_count || 0} conflicts, ${response.rejected_count || 0} rejected.`);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      console.error('Batch sync network/server failure', err);
      // Mark failed operations
      const failedQueue = queue.map(op => {
        if (opIds.has(op.operation_id)) {
          return {
            ...op,
            sync_status: 'FAILED' as const,
            retry_count: (op.retry_count || 0) + 1,
            last_error: err?.message || 'Network timeout or unreachable backend server.'
          };
        }
        return op;
      });
      persistQueue(failedQueue);
      setServerReachable(false);
      setStatusNotice('Sync failed: Network or server error. Work remains safely stored locally.');
      setTimeout(() => setStatusNotice(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Retry individual operation
  const retrySingleOperation = (op: QueuedSyncOperation) => {
    executeSync([op]);
  };

  // Clear Acknowledged (safe prune)
  const clearAcknowledged = () => {
    const unacknowledged = queue.filter(op => op.sync_status !== 'SYNCED');
    persistQueue(unacknowledged);
    setStatusNotice('Cleared acknowledged items from local storage.');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Resolve Conflict modal action
  const resolveConflict = (action: 'KEEP_LOCAL' | 'ACCEPT_SERVER') => {
    if (!selectedConflict) return;

    if (action === 'KEEP_LOCAL') {
      // Re-queue for sync
      const updated = queue.map(op => {
        if (op.operation_id === selectedConflict.operation_id) {
          return { ...op, sync_status: 'QUEUED' as const, last_error: undefined };
        }
        return op;
      });
      persistQueue(updated);
      setSelectedConflict(null);
      setStatusNotice('Re-queued local version for retry.');
    } else {
      // Drop local version
      const filtered = queue.filter(op => op.operation_id !== selectedConflict.operation_id);
      persistQueue(filtered);
      setSelectedConflict(null);
      setStatusNotice('Local version discarded in favor of server state.');
    }
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Filtered operations list
  const filteredQueue = queue.filter(op => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') return op.sync_status === 'QUEUED' || op.sync_status === 'LOCAL' || (op as any).sync_status === 'PENDING';
    if (activeFilter === 'FAILED') return op.sync_status === 'FAILED';
    if (activeFilter === 'CONFLICT') return op.sync_status === 'CONFLICT';
    if (activeFilter === 'SYNCED') return op.sync_status === 'SYNCED';
    return true;
  });

  // Calculate estimated storage size
  const queueJsonString = JSON.stringify(queue);
  const queueSizeBytes = new Blob([queueJsonString]).size;
  const queueSizeKb = (queueSizeBytes / 1024).toFixed(1);

  // Icon helper for entity types
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'INSPECTION': return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'EVIDENCE': return <Camera className="w-4 h-4 text-purple-400" />;
      case 'TASK': return <CheckSquare className="w-4 h-4 text-amber-400" />;
      case 'INCIDENT': return <AlertOctagon className="w-4 h-4 text-red-400" />;
      case 'OBSERVATION': return <Activity className="w-4 h-4 text-emerald-400" />;
      default: return <Database className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">
              {t('syncCenterTitle')}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              {selectedMine?.name || 'Active Mine Scope'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            loadLocalQueue();
            checkServerReachability();
          }}
          className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
          title="Refresh Queue & Reachability"
        >
          <RefreshCw className={clsx("w-4 h-4", isSyncing && "animate-spin text-cyan-400")} />
        </button>
      </div>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <Info className="w-4 h-4 flex-shrink-0 text-cyan-400" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* 1. Truthful Network & Server Health Panel */}
      <MobileCard className="p-4 bg-slate-900 border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">
            Connectivity State
          </span>
          <div className="flex items-center gap-2">
            {/* Device Online Indicator */}
            <div className={clsx(
              "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border",
              deviceOnline 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/15 border-amber-500/40 text-amber-300"
            )}>
              <span className={clsx("w-1.5 h-1.5 rounded-full", deviceOnline ? "bg-emerald-400" : "bg-amber-400 animate-pulse")} />
              {deviceOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{deviceOnline ? t('deviceOnlineStatus') : 'DEVICE OFFLINE'}</span>
            </div>

            {/* Server Reachable Indicator */}
            {deviceOnline && (
              <div className={clsx(
                "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border",
                serverReachable === true 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                  : serverReachable === false
                  ? "bg-red-500/15 border-red-500/40 text-red-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              )}>
                <Server className="w-3 h-3" />
                <span>
                  {serverReachable === true 
                    ? t('serverReachableStatus') 
                    : serverReachable === false 
                    ? t('serverUnreachableStatus') 
                    : 'CHECKING...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Last Successful Server Sync */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">{t('lastSuccessfulServerSync')}:</span>
          <span className="text-slate-200 font-bold text-right">
            {lastServerSyncTime ? new Date(lastServerSyncTime).toLocaleString() : t('noServerSyncRecorded')}
          </span>
        </div>
      </MobileCard>

      {/* 3. Sync Summary Breakdown Metrics */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-mono uppercase text-[10px]">Pending</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">{counts.pending}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-mono uppercase text-[10px]">Syncing</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">{counts.syncing}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-mono uppercase text-[10px]">Failed</div>
          <div className={clsx("text-lg font-bold font-mono mt-0.5", counts.failed > 0 ? "text-red-400" : "text-slate-500")}>
            {counts.failed}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-mono uppercase text-[10px]">Conflicts</div>
          <div className={clsx("text-lg font-bold font-mono mt-0.5", counts.conflicts > 0 ? "text-amber-400 font-extrabold" : "text-slate-500")}>
            {counts.conflicts}
          </div>
        </div>
      </div>

      {/* 4. Action Controls */}
      <div className="grid grid-cols-2 gap-2">
        <TouchButton
          variant="primary"
          onClick={() => executeSync()}
          loading={isSyncing}
          disabled={isSyncing || (!deviceOnline && counts.pending === 0)}
          icon={<RefreshCw className={clsx("w-4 h-4", isSyncing && "animate-spin")} />}
        >
          {t('syncNowBtn')}
        </TouchButton>

        {counts.failed > 0 && (
          <TouchButton
            variant="outline"
            onClick={() => executeSync(queue.filter(op => op.sync_status === 'FAILED'))}
            disabled={isSyncing || !deviceOnline}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {t('retrySafeAllBtn')}
          </TouchButton>
        )}

        {counts.synced > 0 && counts.failed === 0 && (
          <TouchButton
            variant="secondary"
            onClick={clearAcknowledged}
            icon={<Trash2 className="w-4 h-4" />}
          >
            {t('clearSyncedBtn')}
          </TouchButton>
        )}
      </div>

      {/* 5. Stale Data Warning & Cache Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span className="font-bold uppercase tracking-wider">Spatial & Context Caches</span>
          <span className="text-[10px] text-amber-400/80">{t('mayBeStaleNotice')}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <MobileCard className="p-2.5 bg-slate-950/60 border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Layers className="w-3.5 h-3.5" />
              <span className="font-bold text-[11px]">{t('gisFreshnessTitle')}</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {gisLastUpdated ? new Date(gisLastUpdated).toLocaleTimeString() : 'Default offline map'}
            </div>
          </MobileCard>

          <MobileCard className="p-2.5 bg-slate-950/60 border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Bell className="w-3.5 h-3.5" />
              <span className="font-bold text-[11px]">{t('notificationsFreshnessTitle')}</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {notifLastUpdated ? new Date(notifLastUpdated).toLocaleTimeString() : 'Local cached alerts'}
            </div>
          </MobileCard>
        </div>
      </div>

      {/* 6. Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
        {(['ALL', 'PENDING', 'FAILED', 'CONFLICT', 'SYNCED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={clsx(
              "px-3 py-1.5 rounded-lg border font-bold uppercase transition-colors whitespace-nowrap",
              activeFilter === tab
                ? "bg-amber-500/15 border-amber-500 text-amber-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
            )}
          >
            {tab}
            {tab === 'PENDING' && counts.pending > 0 && ` (${counts.pending})`}
            {tab === 'FAILED' && counts.failed > 0 && ` (${counts.failed})`}
            {tab === 'CONFLICT' && counts.conflicts > 0 && ` (${counts.conflicts})`}
          </button>
        ))}
      </div>

      {/* 7. Operations Queue List */}
      <div className="space-y-2">
        {filteredQueue.length === 0 ? (
          <MobileCard className="p-8 text-center bg-slate-900/60 border-slate-800 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto" />
            <p className="text-xs font-mono text-slate-300 font-semibold">
              {activeFilter === 'ALL' ? t('noPendingOperationsMsg') : `No ${activeFilter.toLowerCase()} operations found.`}
            </p>
            <p className="text-[11px] font-mono text-slate-500">
              All client operations match authoritative server state.
            </p>
          </MobileCard>
        ) : (
          filteredQueue.map(op => {
            const isPending = op.sync_status === 'QUEUED' || op.sync_status === 'LOCAL' || (op as any).sync_status === 'PENDING';
            const isFailed = op.sync_status === 'FAILED';
            const isConflict = op.sync_status === 'CONFLICT';
            const isSynced = op.sync_status === 'SYNCED';

            return (
              <MobileCard
                key={op.operation_id}
                className={clsx(
                  "p-3.5 space-y-2 border transition-all",
                  isConflict ? "bg-amber-950/20 border-amber-500/40" :
                  isFailed ? "bg-red-950/20 border-red-500/30" :
                  isSynced ? "bg-slate-900/40 border-slate-800/80" :
                  "bg-slate-900 border-slate-800"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                      {getEntityIcon(op.entity_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 font-mono">
                          {op.entity_type} {op.operation_type ? `• ${op.operation_type}` : ''}
                        </span>
                        {op.server_id && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            ID #{op.server_id}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        UUID: {op.operation_id.substring(0, 18)}...
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border whitespace-nowrap",
                    isSynced ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                    isConflict ? "bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse" :
                    isFailed ? "bg-red-500/15 border-red-500/40 text-red-400" :
                    op.sync_status === 'SYNCING' ? "bg-cyan-500/15 border-cyan-500 text-cyan-300" :
                    "bg-slate-800 border-slate-700 text-amber-400"
                  )}>
                    {isSynced ? t('serverAcknowledged') :
                     isConflict ? t('syncConflictText') :
                     isFailed ? t('syncFailedText') :
                     op.sync_status === 'SYNCING' ? t('syncingStatusText') :
                     t('savedLocally')}
                  </span>
                </div>

                {/* Operation Summary */}
                <div className="bg-slate-950/70 rounded-lg p-2 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800/80">
                  <div className="flex justify-between text-slate-400">
                    <span>Captured:</span>
                    <span className="text-slate-200">
                      {op.client_timestamp ? new Date(op.client_timestamp).toLocaleTimeString() : 'Recently'}
                    </span>
                  </div>
                  {op.payload?.title && (
                    <div className="text-slate-200 truncate font-semibold">
                      {op.payload.title}
                    </div>
                  )}
                  {op.payload?.summary_notes && (
                    <div className="text-slate-400 truncate">
                      Notes: {op.payload.summary_notes}
                    </div>
                  )}
                  {op.payload?.status && (
                    <div className="text-slate-400 truncate">
                      Target Status: <span className="text-amber-400 font-bold">{op.payload.status}</span>
                    </div>
                  )}
                </div>

                {/* Error Notice (if failed or conflict) */}
                {op.last_error && (
                  <div className="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] font-mono flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-400 mt-0.5" />
                    <span className="leading-tight">{op.last_error}</span>
                  </div>
                )}

                {/* Individual Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                  {isConflict && (
                    <TouchButton
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedConflict(op)}
                      icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
                    >
                      {t('reviewConflictBtn')}
                    </TouchButton>
                  )}

                  {isFailed && (
                    <TouchButton
                      size="sm"
                      variant="secondary"
                      onClick={() => retrySingleOperation(op)}
                      disabled={isSyncing || !deviceOnline}
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                    >
                      {t('retryOpBtn')}
                    </TouchButton>
                  )}
                </div>
              </MobileCard>
            );
          })
        )}
      </div>

      {/* 8. Storage Footprint Card */}
      <MobileCard className="p-3.5 bg-slate-900 border-slate-800 space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between text-slate-300 font-bold">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Database className="w-4 h-4" />
            <span>{t('storageUsageTitle')}</span>
          </div>
          <span className="text-slate-400">{queueSizeKb} KB ({queue.length} records)</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
          TRINETRA FIELD utilizes browser local store for offline queueing. Un-synchronized operations are permanently protected from automatic deletion.
        </p>
      </MobileCard>

      {/* 9. Conflict Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm text-slate-100 font-mono uppercase">
                  {t('conflictResolutionModalTitle')}
                </span>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                {selectedConflict.last_error || 'Server state differs from local state.'}
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">{t('localVersionLabel')}</span>
                <pre className="p-2 rounded bg-slate-950 text-slate-300 text-[10px] overflow-x-auto max-h-32 border border-slate-800">
                  {JSON.stringify(selectedConflict.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <TouchButton
                variant="outline"
                onClick={() => resolveConflict('KEEP_LOCAL')}
              >
                {t('keepLocalBtn')}
              </TouchButton>

              <TouchButton
                variant="primary"
                onClick={() => resolveConflict('ACCEPT_SERVER')}
              >
                {t('acceptServerBtn')}
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
