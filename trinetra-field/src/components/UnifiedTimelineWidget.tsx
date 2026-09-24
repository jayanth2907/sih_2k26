import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, User, Clock, CheckCircle2, AlertCircle, FileCheck, Loader2 } from 'lucide-react';
import { mobileApi } from '../services';
import { UnifiedTimelineEvent } from '../types/mobile';

interface UnifiedTimelineWidgetProps {
  resourceType: string;
  resourceId: string | number;
  mineId: number;
}

export const UnifiedTimelineWidget: React.FC<UnifiedTimelineWidgetProps> = ({
  resourceType,
  resourceId,
  mineId
}) => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<UnifiedTimelineEvent[]>([]);

  useEffect(() => {
    if (!resourceId || !mineId) return;
    setLoading(true);
    mobileApi.getUnifiedResourceTimeline(resourceType, String(resourceId), mineId)
      .then((res: UnifiedTimelineEvent[]) => {
        setEvents(res || []);
      })
      .catch((err: any) => {
        console.warn('Could not load unified timeline:', err);
      })
      .finally(() => setLoading(false));
  }, [resourceType, resourceId, mineId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-slate-400 bg-slate-800/40 rounded-lg border border-slate-700/50">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
        <span>Loading cryptographic lifecycle audit trace...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-xs text-slate-500 flex items-center gap-2">
        <History className="w-3.5 h-3.5" />
        <span>Lifecycle initiated. No further audit transitions recorded yet.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span>CRYPTOGRAPHIC AUDIT & GOVERNANCE TIMELINE</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          SHA-256 CHAINED
        </span>
      </div>

      <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
        {events.map((ev, index) => {
          const categoryColor = getCategoryColor(ev.category);
          return (
            <div key={`tl-${ev.id || index}`} className="relative group">
              <div className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${categoryColor.dot}`} />
              <div className="p-2.5 bg-slate-800/70 border border-slate-700/60 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${categoryColor.badge}`}>
                    {ev.category}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(ev.timestamp)}
                  </span>
                </div>

                <div className="text-xs font-medium text-slate-200">
                  {ev.description || ev.action}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    {ev.actor_name} ({ev.actor_role})
                  </span>
                  {ev.metadata?.hash && (
                    <span className="font-mono text-slate-500 truncate max-w-[120px]" title={ev.metadata.hash}>
                      #{ev.metadata.hash.substring(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getCategoryColor(cat?: string): { dot: string; badge: string } {
  switch (cat) {
    case 'RISK':
      return { dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
    case 'VERIFICATION':
      return { dot: 'bg-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' };
    case 'EVIDENCE':
      return { dot: 'bg-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' };
    case 'GOVERNANCE':
      return { dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' };
    case 'REVIEW':
      return { dot: 'bg-purple-400', badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' };
    case 'SIGN_OFF':
      return { dot: 'bg-blue-400', badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
    default:
      return { dot: 'bg-slate-400', badge: 'bg-slate-700 text-slate-300' };
  }
}

function formatTimestamp(ts?: string): string {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}
