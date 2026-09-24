import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { NetworkStatusType } from '../types/mobile';
import { useLanguage } from '../context/LanguageContext';
import clsx from 'clsx';

interface NetworkStatusBadgeProps {
  status?: NetworkStatusType;
  pendingCount?: number;
  onSyncRequest?: () => void;
}

export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({
  status: propStatus,
  pendingCount = 0,
  onSyncRequest,
}) => {
  const { t } = useLanguage();
  const [internalStatus, setInternalStatus] = useState<NetworkStatusType>(
    navigator.onLine ? 'ONLINE' : 'OFFLINE'
  );
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleOnline = () => setInternalStatus('ONLINE');
    const handleOffline = () => setInternalStatus('OFFLINE');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentStatus = propStatus || internalStatus;

  const config = {
    ONLINE: {
      label: 'ONLINE',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400',
      icon: <Wifi className="w-3.5 h-3.5" />,
      desc: t('networkOnlineNotice'),
    },
    OFFLINE: {
      label: 'OFFLINE',
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      dot: 'bg-amber-400 animate-pulse',
      icon: <WifiOff className="w-3.5 h-3.5" />,
      desc: t('networkOfflineNotice'),
    },
    SYNCING: {
      label: 'SYNCING',
      bg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
      dot: 'bg-cyan-400 animate-ping',
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
      desc: t('networkSyncingNotice'),
    },
    SYNC_COMPLETE: {
      label: 'SYNCED',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      dot: 'bg-emerald-400',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      desc: t('networkSyncCompleteNotice'),
    },
    SYNC_ERROR: {
      label: 'SYNC ERROR',
      bg: 'bg-red-500/15 border-red-500/40 text-red-300',
      dot: 'bg-red-400',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      desc: t('networkSyncErrorNotice'),
    },
  }[currentStatus];

  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium transition-all active:scale-95',
          config.bg
        )}
        aria-label={`Network status: ${config.label}`}
      >
        <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
        {config.icon}
        <span>{config.label}</span>
        {pendingCount > 0 && (
          <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[9px]">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Network Diagnostics Modal */}
      {showDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {config.icon}
                <span className="font-semibold text-sm text-slate-100 font-mono uppercase tracking-wider">
                  Network Diagnostics
                </span>
              </div>
              <span className={clsx('px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase', config.bg)}>
                {config.label}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {config.desc}
            </p>

            <div className="bg-slate-950/80 rounded-xl p-3 space-y-2 border border-slate-800/80 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Local Queue:</span>
                <span className="text-slate-200 font-semibold">{pendingCount} records</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Offline Store:</span>
                <span className="text-emerald-400 font-semibold">IndexedDB/Storage Ready</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Core Protocol:</span>
                <span className="text-cyan-400">HTTP/2 TLS 1.3</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowDetails(false);
                  if (onSyncRequest) {
                    onSyncRequest();
                  } else {
                    window.location.pathname = '/mobile/sync';
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider transition-all min-h-[44px]"
              >
                Open Sync Center
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-all min-h-[44px]"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
