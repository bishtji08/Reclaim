import React from 'react';
import {
  Globe,
  LayoutDashboard,
  Package,
  FileText,
  BarChart3,
  Settings,
  Search,
  PlusCircle,
  MapPin,
  Bell,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  PhoneCall
} from 'lucide-react';
import { User, Item } from '../../types';

interface SidebarMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
}

interface SidebarMenuSection {
  title: string;
  items: SidebarMenuItem[];
}

interface SidebarProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  items?: Item[];
  unreadNotifsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  items = [],
  unreadNotifsCount = 0
}) => {
  const lostCount = items.filter(i => i.type === 'lost').length;
  const foundCount = items.filter(i => i.type === 'found').length;
  const returnedCount = items.filter(i => i.status === 'returned' || i.status === 'claimed').length;
  const myItemsCount = items.filter(i => String(i.reportedBy) === String(user.id)).length;
  const recoveryRate = items.length > 0 ? Math.round((returnedCount / items.length) * 100) : 0;

  const menuSections: SidebarMenuSection[] = [
    {
      title: 'Portal Overview',
      items: [
        { id: 'landing', label: 'Campus Home', icon: Globe, roles: ['admin', 'finder', 'user'], iconColor: 'text-indigo-600' },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'finder', 'user'], iconColor: 'text-blue-600' },
        { id: 'search', label: 'Search Directory', icon: Search, roles: ['admin', 'finder', 'user'], iconColor: 'text-cyan-600', badge: items.length ? String(items.length) : undefined },
      ]
    },
    {
      title: 'Item Operations',
      items: [
        { id: 'report-lost', label: 'Report Lost Item', icon: FileText, roles: ['admin', 'finder', 'user'], iconColor: 'text-rose-600' },
        { id: 'report-found', label: 'Report Found Item', icon: PlusCircle, roles: ['admin', 'finder', 'user'], iconColor: 'text-emerald-600' },
        { id: 'my-items', label: 'My Reported Items', icon: Package, roles: ['admin', 'finder', 'user'], iconColor: 'text-blue-600', badge: myItemsCount > 0 ? String(myItemsCount) : undefined },
        { id: 'claims', label: 'Claims Center', icon: CheckCircle2, roles: ['admin', 'finder', 'user'], iconColor: 'text-purple-600' },
      ]
    },
    {
      title: 'Campus Intelligence',
      items: [
        { id: 'map', label: 'Campus Map', icon: MapPin, roles: ['admin', 'finder', 'user'], iconColor: 'text-amber-600' },
        { id: 'analytics', label: 'Campus Analytics', icon: BarChart3, roles: ['admin'], iconColor: 'text-indigo-600' },
        { id: 'admin', label: 'Moderation Hub', icon: ShieldAlert, roles: ['admin'], iconColor: 'text-rose-600' },
        { id: 'notifications', label: 'Notification Center', icon: Bell, roles: ['admin', 'finder', 'user'], iconColor: 'text-blue-600', badge: unreadNotifsCount > 0 ? String(unreadNotifsCount) : undefined, badgeColor: 'bg-red-500' },
        { id: 'settings', label: 'Account Settings', icon: Settings, roles: ['admin', 'finder', 'user'], iconColor: 'text-slate-600' },
      ]
    },
    {
      title: 'Visitor Tracking',
      items: [
        { id: 'analytics', label: 'Visitor Analytics', icon: BarChart3, roles: ['admin'], iconColor: 'text-indigo-600' },
      ]
    }
  ];

  return (
    <aside className="w-68 bg-white border-r border-slate-200/80 min-h-[calc(100vh-5rem)] p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter(item => item.roles.includes(user.role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 cursor-pointer ${isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-extrabold translate-x-0.5'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : item.iconColor}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive
                          ? 'bg-white/25 text-white'
                          : item.badgeColor
                            ? `${item.badgeColor} text-white`
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Live Campus Telemetry Card & Help Desk */}
      <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> GEU Telemetry
            </h4>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between items-center text-slate-300">
              <span>Lost Reports:</span>
              <span className="font-extrabold text-rose-400">{lostCount}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Found Deposited:</span>
              <span className="font-extrabold text-sky-400">{foundCount}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Returned to Owner:</span>
              <span className="font-extrabold text-emerald-400">{returnedCount}</span>
            </div>

            {/* Recovery Rate Progress Bar */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-[10px] mb-1 font-bold">
                <span className="text-slate-400">Campus Resolution Rate</span>
                <span className="text-amber-300">{recoveryRate}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, recoveryRate))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security Help Desk Hotline */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700">Central Library Desk</p>
            <p className="text-[10px] text-slate-500 font-medium">Ext. 204 • Ground Floor</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
