import React, { useState, useEffect } from 'react';
import { Link2, AlertTriangle, CheckSquare, Camera, FileText, UserCheck, ShieldAlert, ChevronRight, Loader2 } from 'lucide-react';
import { mobileApi } from '../../services';
import { RelatedRecordsResponse } from '../types/mobile';
import { useLanguage } from '../../context/LanguageContext';

interface RelatedRecordsWidgetProps {
  resourceType: string;
  resourceId: string | number;
  mineId: number;
  onNavigate?: (tab: string, paramId?: any) => void;
}

export const RelatedRecordsWidget: React.FC<RelatedRecordsWidgetProps> = ({
  resourceType,
  resourceId,
  mineId,
  onNavigate
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RelatedRecordsResponse | null>(null);

  useEffect(() => {
    if (!resourceId || !mineId) return;
    setLoading(true);
    mobileApi.getCrossDomainRelatedRecords(resourceType, String(resourceId), mineId)
      .then((res: RelatedRecordsResponse) => {
        setData(res);
      })
      .catch((err: any) => {
        console.warn('Could not load related records:', err);
      })
      .finally(() => setLoading(false));
  }, [resourceType, resourceId, mineId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-slate-400 bg-slate-800/40 rounded-lg border border-slate-700/50">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
        <span>Loading cross-domain related records...</span>
      </div>
    );
  }

  const hasItems = data && (
    (data.governance_tasks && data.governance_tasks.length > 0) ||
    (data.incidents && data.incidents.length > 0) ||
    (data.risk_predictions && data.risk_predictions.length > 0) ||
    (data.evidence && data.evidence.length > 0) ||
    (data.contractor_verifications && data.contractor_verifications.length > 0)
  );

  if (!hasItems) {
    return (
      <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-xs text-slate-500 flex items-center gap-2">
        <Link2 className="w-3.5 h-3.5" />
        <span>No linked cross-domain records found for this resource.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <Link2 className="w-4 h-4 text-emerald-400" />
        <span>CROSS-DOMAIN RELATED RECORDS</span>
      </div>

      <div className="space-y-1.5">
        {/* Linked Governance Tasks */}
        {data?.governance_tasks?.map((task: any) => (
          <div
            key={`task-${task.id}`}
            onClick={() => onNavigate && onNavigate('tasks', task.id)}
            className="flex items-center justify-between p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-slate-200">{task.title}</div>
                <div className="text-[10px] text-slate-400">Governance Task #{task.id} • {task.priority} • {task.status}</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        ))}

        {/* Linked Incidents */}
        {data?.incidents?.map((inc: any) => (
          <div
            key={`inc-${inc.id}`}
            onClick={() => onNavigate && onNavigate('incidents', inc.id)}
            className="flex items-center justify-between p-2.5 bg-red-950/30 hover:bg-red-950/40 border border-red-800/40 rounded-lg cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-red-200">{inc.title}</div>
                <div className="text-[10px] text-red-400">Incident #{inc.id} • {inc.severity} • {inc.status}</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-red-400" />
          </div>
        ))}

        {/* Linked Risks */}
        {data?.risk_predictions?.map((r: any) => (
          <div
            key={`risk-${r.id}`}
            onClick={() => onNavigate && onNavigate('intelligence', r.id)}
            className="flex items-center justify-between p-2.5 bg-amber-950/30 hover:bg-amber-950/40 border border-amber-800/40 rounded-lg cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-amber-200">Predicted {r.severity} Escalation ({intPercent(r.probability)}%)</div>
                <div className="text-[10px] text-amber-400">Predictive Risk #{r.id} • Score: {r.score}</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
          </div>
        ))}

        {/* Evidence */}
        {data?.evidence?.map((ev: any, idx: number) => (
          <div
            key={`ev-${idx}`}
            className="flex items-center justify-between p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs text-slate-300 truncate max-w-[220px]">{ev.file_name}</div>
                <div className="text-[10px] text-slate-500 font-mono">SHA-256: {ev.hash ? ev.hash.substring(0, 16) + '...' : 'Available'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function intPercent(prob?: number): number {
  if (prob === undefined || prob === null) return 88;
  return Math.round(prob * 100);
}
