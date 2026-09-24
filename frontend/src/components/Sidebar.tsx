import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Pickaxe, 
  Activity, 
  Video, 
  AlertTriangle, 
  FileText, 
  ShieldAlert, 
  Layers3, 
  Bell,
  Users,
  Building2,
  Leaf,
  MessageSquare,
  FileSpreadsheet,
  ShieldCheck,
  BrainCircuit,
  Bot,
  ClipboardCheck,
  Network,
  Radio,
  FileSearch,
  Compass,
  BarChart3,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import clsx from 'clsx';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  roles: string[];
}

interface NavGroup {
  id: 'COMMAND' | 'MONITOR' | 'GOVERN' | 'INTELLIGENCE';
  title: string;
  isAlwaysOpen?: boolean;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { isSystemAdmin, hasRole } = useAuth();
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Group accordion state: COMMAND is always open, other groups can be toggled
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    COMMAND: true,
    MONITOR: true,
    GOVERN: false,
    INTELLIGENCE: false
  });

  const navGroups: NavGroup[] = [
    {
      id: 'COMMAND',
      title: t('navCommand'),
      isAlwaysOpen: true,
      items: [
        {
          id: 'dashboard',
          label: t('liveDashboard'),
          icon: LayoutDashboard,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'CONTRACTOR_MANAGER', 'REGULATOR']
        },
        {
          id: 'gis-map',
          label: t('gisCommandMap'),
          icon: Compass,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'REGULATOR']
        },
        {
          id: 'digital-twin',
          label: t('spatialTwin'),
          icon: Layers3,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'REGULATOR']
        }
      ]
    },
    {
      id: 'MONITOR',
      title: t('navMonitor'),
      items: [
        {
          id: 'sensors',
          label: t('sensorsTelemetry'),
          icon: Activity,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'REGULATOR']
        },
        {
          id: 'alerts',
          label: t('operationalAlerts'),
          icon: Bell,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'REGULATOR']
        },
        {
          id: 'incidents',
          label: t('safetyIncidents'),
          icon: AlertTriangle,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'REGULATOR']
        },
        {
          id: 'field-operations',
          label: t('fieldOperations'),
          icon: ClipboardCheck,
          roles: ['SYSTEM_ADMIN', 'FIELD_INSPECTOR', 'MINE_SAFETY_OFFICER', 'MINE_MANAGER', 'REGULATOR']
        },
        {
          id: 'cameras',
          label: t('cctvMachinery'),
          icon: Video,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'REGULATOR']
        },
        {
          id: 'mines',
          label: t('minesLevels'),
          icon: Layers3,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'REGULATOR']
        }
      ]
    },
    {
      id: 'GOVERN',
      title: t('navGovern'),
      items: [
        {
          id: 'violations',
          label: t('dgmsViolations'),
          icon: FileText,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'REGULATOR']
        },
        {
          id: 'production',
          label: t('productionLogs'),
          icon: Pickaxe,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'FIELD_INSPECTOR', 'REGULATOR']
        },
        {
          id: 'workforce',
          label: t('workforceMuster'),
          icon: Users,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'CONTRACTOR_MANAGER', 'REGULATOR']
        },
        {
          id: 'contractors',
          label: t('contractorsSla'),
          icon: Building2,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'CONTRACTOR_MANAGER', 'REGULATOR']
        },
        {
          id: 'environment',
          label: t('atmosphereEnv'),
          icon: Leaf,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'REGULATOR']
        },
        {
          id: 'grievances',
          label: t('grievanceRedressal'),
          icon: MessageSquare,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'CONTRACTOR_MANAGER', 'REGULATOR']
        },
        {
          id: 'reports',
          label: t('statutoryReports'),
          icon: FileSpreadsheet,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'REGULATOR']
        },
        {
          id: 'approvals',
          label: t('digitalSignoffs'),
          icon: ShieldCheck,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'REGULATOR']
        }
      ]
    },
    {
      id: 'INTELLIGENCE',
      title: t('navIntelligence'),
      items: [
        {
          id: 'predictive-risk',
          label: t('aiRiskIntelligence'),
          icon: BrainCircuit,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'CONTRACTOR_MANAGER', 'REGULATOR']
        },
        {
          id: 'analytics',
          label: t('governanceIntelligence'),
          icon: BarChart3,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'CONTRACTOR_MANAGER', 'REGULATOR']
        },
        {
          id: 'copilot',
          label: t('aiCopilot'),
          icon: Bot,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'CONTRACTOR_MANAGER', 'REGULATOR']
        },
        {
          id: 'documents',
          label: t('documentIntelligence'),
          icon: FileSearch,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'CONTRACTOR_MANAGER', 'REGULATOR']
        },
        {
          id: 'integrations-health',
          label: t('integrationsHealth'),
          icon: Network,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'REGULATOR']
        },
        {
          id: 'risk-audit',
          label: t('riskAuditTrail'),
          icon: ShieldAlert,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'REGULATOR']
        },
        {
          id: 'demo-control',
          label: t('demoControlCenter'),
          icon: Radio,
          roles: ['SYSTEM_ADMIN', 'MINE_MANAGER', 'MINE_SAFETY_OFFICER', 'FIELD_INSPECTOR', 'CONTRACTOR_MANAGER', 'REGULATOR']
        }
      ]
    }
  ];

  // Auto-expand group containing the active page so active item is NEVER hidden
  useEffect(() => {
    const parentGroup = navGroups.find(g => g.items.some(item => item.id === currentTab));
    if (parentGroup && !openGroups[parentGroup.id]) {
      setOpenGroups(prev => ({ ...prev, [parentGroup.id]: true }));
    }
  }, [currentTab]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <aside 
      className={clsx(
        'bg-[#080A09] border-r border-[#1B211E] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none transition-all duration-200 z-30',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* 1. Brand Header */}
      <div>
        <div className="h-16 px-4 border-b border-[#1B211E] flex items-center justify-between bg-[#0D100F]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/10 border border-amber-400/30 shrink-0">
              <span className="font-mono font-black text-[#080A09] text-sm leading-none">त्रिन</span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-xs tracking-wider text-slate-100 uppercase leading-none truncate">TRINETRA</h1>
                <p className="text-[9px] text-amber-400 font-mono tracking-widest uppercase mt-1 truncate">Mine Governance AI</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-[#171B18] transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-amber-400" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. Grouped Accordion Navigation */}
        <nav className="p-2 space-y-3 overflow-y-auto max-h-[calc(100vh-125px)] hide-scrollbar">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => isSystemAdmin || hasRole(item.roles as any));
            if (visibleItems.length === 0) return null;

            const isOpen = group.isAlwaysOpen || !!openGroups[group.id];
            const hasActiveChild = visibleItems.some(i => i.id === currentTab);

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header */}
                {!isCollapsed ? (
                  group.isAlwaysOpen ? (
                    <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
                      <span>{group.title}</span>
                      <span className="text-[9px] text-slate-400 font-mono">3 Views</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={clsx(
                        'w-full px-2.5 py-1.5 text-[10px] font-mono font-bold tracking-wider uppercase flex items-center justify-between rounded transition-colors cursor-pointer text-left',
                        hasActiveChild ? 'text-amber-400 bg-[#121614]' : 'text-slate-400 hover:text-slate-200 hover:bg-[#0D100F]'
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{group.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#171B18] text-slate-400 border border-[#232A26]">
                          {visibleItems.length}
                        </span>
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  )
                ) : (
                  <div className="h-px bg-[#1B211E] my-1.5" />
                )}

                {/* Group Items (Collapsible body) */}
                {(isOpen || isCollapsed) && (
                  <div className="space-y-0.5 transition-all duration-150">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => setCurrentTab(item.id)}
                          title={isCollapsed ? item.label : undefined}
                          className={clsx(
                            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer text-left',
                            isActive
                              ? 'bg-[#171B18] text-amber-400 border border-amber-500/40 font-bold shadow-xs'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-[#0D100F] border border-transparent'
                          )}
                        >
                          <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-amber-400' : 'text-slate-400')} />
                          {!isCollapsed && <span className="truncate text-[11.5px]">{item.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* 3. Footer Info */}
      <div className="p-3 border-t border-[#1B211E] bg-[#0D100F] text-[10px] text-slate-400 font-mono flex items-center justify-between shrink-0">
        {!isCollapsed ? (
          <>
            <div>
              <p className="text-slate-200 font-bold">TRINETRA v2.0</p>
              <p className="text-[9px] text-slate-400">Gov Command & SCADA</p>
            </div>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-500/50" title="Core Engine Active" />
          </>
        ) : (
          <div className="w-full flex justify-center">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-500/50" title="Core Engine Active" />
          </div>
        )}
      </div>
    </aside>
  );
};
