import React, { useState, useEffect, useMemo } from 'react';
import { useMineContext } from '../../context/MineContext';
import { useLanguage } from '../../context/LanguageContext';
import { MobileCard } from '../components/MobileCard';
import { TouchButton } from '../components/TouchButton';
import { 
  Bell, 
  CheckCheck, 
  Check, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  ClipboardCheck, 
  MapPin, 
  Clock, 
  Bot, 
  Search, 
  X, 
  ChevronRight, 
  Filter, 
  Info,
  RotateCcw,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import { mobileApi, OperationalNotification, NotificationUnreadCounts } from '../../services';
import { MobileTab } from '../types/mobile';
import clsx from 'clsx';

interface MobileNotificationsScreenProps {
  onNavigateTab?: (tab: MobileTab) => void;
}

type TabType = 'ALL' | 'UNREAD' | 'CRITICAL' | 'TASKS' | 'INCIDENTS' | 'VERIFICATION';
type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const MobileNotificationsScreen: React.FC<MobileNotificationsScreenProps> = ({ onNavigateTab }) => {
  const { selectedMine, setFocusedTarget, setCurrentTab } = useMineContext();
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<OperationalNotification[]>([]);
  const [counts, setCounts] = useState<NotificationUnreadCounts | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      if (selectedMine?.id) {
        const res = await mobileApi.getNotifications(selectedMine.id);
        if (res && Array.isArray(res.notifications)) {
          setNotifications(res.notifications);
          setCounts(res.counts || null);
        } else {
          setNotifications([]);
          setCounts(null);
        }
      } else {
        const res = await mobileApi.getNotifications();
        if (res && Array.isArray(res.notifications)) {
          setNotifications(res.notifications);
          setCounts(res.counts || null);
        } else {
          setNotifications([]);
          setCounts(null);
        }
      }
    } catch {
      setNotifications([]);
      setCounts(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [selectedMine?.id]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await mobileApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      // Refresh count
      const updatedCounts = await mobileApi.getUnreadCounts(selectedMine?.id);
      setCounts(updatedCounts);
    } catch {
      // quiet fallback
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await mobileApi.markAllNotificationsRead(selectedMine?.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      const updatedCounts = await mobileApi.getUnreadCounts(selectedMine?.id);
      setCounts(updatedCounts);
      setActionNotice(t('allNotificationsRead'));
      setTimeout(() => setActionNotice(null), 3000);
    } catch {
      // quiet fallback
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNavigate = (targetTab: MobileTab) => {
    if (onNavigateTab) {
      onNavigateTab(targetTab);
    } else {
      setCurrentTab(targetTab);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      // 1. Tab filter
      if (activeTab === 'UNREAD' && item.is_read) return false;
      if (activeTab === 'CRITICAL' && item.severity !== 'CRITICAL') return false;
      if (activeTab === 'TASKS' && !item.category?.includes('TASK') && item.deep_link?.destination_tab !== 'tasks') return false;
      if (activeTab === 'INCIDENTS' && !item.category?.includes('INCIDENT') && item.deep_link?.destination_tab !== 'incidents') return false;
      if (activeTab === 'VERIFICATION' && !item.category?.includes('VERIF')) return false;

      // 2. Severity filter
      if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchMessage = (item.message || '').toLowerCase().includes(q);
        const matchCategory = (item.category || '').toLowerCase().includes(q);
        const matchZone = (item.zone_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchMessage && !matchCategory && !matchZone) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notifications, activeTab, severityFilter, search]);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'ALL', label: t('allNotificationsTab'), count: counts?.total_unread ? undefined : notifications.length },
    { key: 'UNREAD', label: t('unreadTab'), count: counts?.total_unread },
    { key: 'CRITICAL', label: t('criticalTab'), count: counts?.critical_unread },
    { key: 'TASKS', label: t('tasksTab'), count: counts?.tasks_unread },
    { key: 'INCIDENTS', label: t('incidentsTab'), count: counts?.incidents_unread },
    { key: 'VERIFICATION', label: t('verificationTab'), count: counts?.verification_unread },
  ];

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'LOW':
      case 'INFO':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 font-sans flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            {t('notificationsCenterTitle')}
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedMine?.name || 'Mine'} • {counts?.total_unread || 0} {t('unreadTab').toLowerCase()}
          </span>
        </div>

        {/* Mark All Read Action */}
        <TouchButton
          variant="outline"
          size="sm"
          disabled={!counts?.total_unread || isMarkingAll}
          loading={isMarkingAll}
          onClick={handleMarkAllAsRead}
          icon={<CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
        >
          {t('markAllReadBtn')}
        </TouchButton>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Tabs scroll area */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border',
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-slate-200'
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={clsx(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-extrabold',
                    isSelected ? 'bg-slate-950 text-amber-400' : 'bg-red-500 text-white'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Severity quick-filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications by title, zone, category..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
          <span className="text-slate-500 flex items-center gap-1 px-1">
            <Filter className="w-3 h-3" />
            Severity:
          </span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SeverityFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={clsx(
                'px-2 py-0.5 rounded-lg font-bold border transition-colors',
                severityFilter === s
                  ? 'bg-slate-800 text-amber-400 border-amber-500/50'
                  : 'bg-slate-950/60 text-slate-500 border-slate-800/80 hover:text-slate-300'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Cards Feed */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs space-y-2">
          <Clock className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
          <p>{t('loadingNotifications')}</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mx-auto" />
          <p>{activeTab === 'UNREAD' ? t('noUnreadNotifications') : t('noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const isCritical = notif.severity === 'CRITICAL';
            const isHigh = notif.severity === 'HIGH';

            return (
              <MobileCard
                key={notif.id}
                className={clsx(
                  'p-3.5 space-y-3 bg-slate-900 border transition-all relative overflow-hidden',
                  !notif.is_read ? 'border-amber-500/40 bg-slate-900/95' : 'border-slate-800 opacity-90',
                  isCritical && !notif.is_read ? 'border-red-500/60 bg-red-950/10' : ''
                )}
              >
                {/* Header row: Category / Source, Priority Badge, Unread Dot */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={clsx('font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border', getSeverityBadge(notif.severity))}>
                        {notif.severity}
                      </span>
                      {notif.category && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {notif.category}
                        </span>
                      )}
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100 font-sans leading-tight">
                      {notif.title}
                    </h4>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {formatRelativeTime(notif.created_at)}
                  </span>
                </div>

                {/* Message Body */}
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {notif.message}
                </p>

                {/* Stale resource indicator */}
                {notif.is_stale && (
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-amber-500/30 text-[11px] font-mono text-amber-300/90 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>{notif.stale_reason || t('staleResourceNotice')}</span>
                  </div>
                )}

                {/* Context: Mine and Zone */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{notif.zone_name || notif.mine_name || selectedMine?.name || 'Mine Zone'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Actionable Deep Links Toolbar */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {/* Mark Read Button */}
                  {!notif.is_read ? (
                    <TouchButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsRead(notif.id)}
                      icon={<Check className="w-3.5 h-3.5 text-slate-400" />}
                    >
                      {t('markReadBtn')}
                    </TouchButton>
                  ) : (
                    <div className="flex items-center justify-center text-[10px] font-mono text-slate-500 gap-1 border border-slate-800/50 rounded-xl px-2 py-1">
                      <CheckCheck className="w-3 h-3 text-emerald-500" />
                      <span>Read</span>
                    </div>
                  )}

                  {/* Primary Action Button based on Deep Link */}
                  {notif.is_stale ? (
                    <TouchButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigate('tasks')}
                      icon={<ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />}
                    >
                      {t('viewWorkQueueBtn')}
                    </TouchButton>
                  ) : notif.deep_link?.destination_tab === 'incidents' ? (
                    <TouchButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        handleNavigate('incidents');
                      }}
                      icon={<ShieldAlert className="w-3.5 h-3.5" />}
                    >
                      {t('openIncidentBtn')}
                    </TouchButton>
                  ) : notif.deep_link?.destination_tab === 'tasks' ? (
                    <TouchButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        handleNavigate('tasks');
                      }}
                      icon={<ClipboardCheck className="w-3.5 h-3.5" />}
                    >
                      Open Task
                    </TouchButton>
                  ) : notif.deep_link?.destination_tab === 'map' ? (
                    <TouchButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        if (notif.latitude && notif.longitude) {
                          setFocusedTarget({
                            type: 'zone',
                            id: notif.raw_id,
                            x: notif.latitude,
                            y: 0,
                            z: notif.longitude,
                            title: notif.title
                          });
                        }
                        handleNavigate('map');
                      }}
                      icon={<MapPin className="w-3.5 h-3.5" />}
                    >
                      {t('viewOnMap')}
                    </TouchButton>
                  ) : (
                    <TouchButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        handleNavigate('copilot');
                      }}
                      icon={<Bot className="w-3.5 h-3.5" />}
                    >
                      {t('askCopilotBtn')}
                    </TouchButton>
                  )}

                  {/* Secondary Map / Copilot Action */}
                  {notif.latitude && notif.longitude ? (
                    <TouchButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFocusedTarget({
                          type: 'zone',
                          id: notif.raw_id,
                          x: notif.latitude!,
                          y: 0,
                          z: notif.longitude!,
                          title: notif.title
                        });
                        handleNavigate('map');
                      }}
                      icon={<MapPin className="w-3.5 h-3.5 text-amber-400" />}
                    >
                      Map
                    </TouchButton>
                  ) : (
                    <TouchButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleNavigate('copilot')}
                      icon={<Bot className="w-3.5 h-3.5 text-cyan-400" />}
                    >
                      Copilot
                    </TouchButton>
                  )}
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
