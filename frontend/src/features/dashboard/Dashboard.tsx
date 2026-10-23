import React from 'react';
import { 
  Package, 
  Search, 
  CheckCircle, 
  MapPin, 
  AlertTriangle, 
  PlusCircle, 
  Sparkles, 
  ChevronRight,
  Building2,
  Clock,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import { User, Item } from '../../types';

interface DashboardProps {
  user: User;
  items: Item[];
  onNavigate?: (tab: string) => void;
  onSelectItem?: (item: Item) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  items, 
  onNavigate,
  onSelectItem 
}) => {
  const lostItems = items.filter(item => item.type === 'lost');
  const foundItems = items.filter(item => item.type === 'found');
  const matchedItems = items.filter(item => item.status === 'matched');
  const returnedItems = items.filter(item => item.status === 'returned' || item.status === 'claimed');
  const urgentItems = items.filter(item => item.isUrgent);

  const recentItems = [...items]
    .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
    .slice(0, 6);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'matched': return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'claimed': return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'returned': return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const stats = [
    {
      title: 'Active Lost Reports',
      value: lostItems.length,
      icon: Package,
      textColor: 'text-rose-600',
      bgColor: 'bg-rose-500/10 text-rose-600',
      border: 'border-slate-200/80',
      desc: 'Campus missing items',
      accent: 'border-l-4 border-l-rose-500'
    },
    {
      title: 'Found Assets Logged',
      value: foundItems.length,
      icon: Search,
      textColor: 'text-sky-600',
      bgColor: 'bg-sky-500/10 text-sky-600',
      border: 'border-slate-200/80',
      desc: 'Safe at deposit desks',
      accent: 'border-l-4 border-l-sky-500'
    },
    {
      title: 'Automated Matches',
      value: matchedItems.length,
      icon: Sparkles,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-500/10 text-amber-600',
      border: 'border-slate-200/80',
      desc: '≥ 55% similarity score',
      accent: 'border-l-4 border-l-amber-500'
    },
    {
      title: 'Recovered & Reunited',
      value: returnedItems.length,
      icon: CheckCircle,
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10 text-emerald-600',
      border: 'border-slate-200/80',
      desc: 'Handed back to owners',
      accent: 'border-l-4 border-l-emerald-500'
    },
  ];

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* Premium GEU Portal Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4.5 sm:p-8 lg:p-10 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
          <div className="space-y-2 sm:space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-900/90 border border-blue-500/30 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-blue-300">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
              Graphic Era University Portal
              <span className="text-slate-600">•</span>
              <span className="text-amber-300 capitalize">{user.role} workspace</span>
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Welcome back, {user.name}!
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Monitor active lost & found listings across Graphic Era University, inspect multi-criteria matching alerts, and coordinate campus handovers securely.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => onNavigate && onNavigate('report-lost')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-md shadow-rose-900/30 transition-all hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Report Lost Item
            </button>
            <button
              onClick={() => onNavigate && onNavigate('report-found')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-blue-900/30 transition-all hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Report Found Item
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid - 2x2 on Mobile, 4 Columns on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.title} 
              className={`bg-white rounded-2xl shadow-xs border ${stat.border} ${stat.accent} p-3.5 sm:p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between group`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{stat.title}</p>
                <div className={`${stat.bgColor} p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl group-hover:scale-105 transition-transform shrink-0`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.25]" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <p className="text-xl sm:text-3xl font-black text-slate-900">{stat.value}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium truncate">{stat.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Column: Recent Campus Items Feed */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">Recent Campus Discoveries</h3>
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Latest items reported across campus buildings</p>
            </div>
            
            <button 
              onClick={() => onNavigate && onNavigate('search')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:gap-1.5 transition-all cursor-pointer"
            >
              View Directory <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Package className="w-12 h-12 mx-auto stroke-[1.25] text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No recent campus items</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  New reports filed by students or campus security will appear here automatically.
                </p>
              </div>
            ) : (
              recentItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => onSelectItem && onSelectItem(item)}
                  className="p-3 sm:p-5 hover:bg-slate-50/80 active:bg-slate-100 transition-colors flex items-center gap-3 sm:gap-4 cursor-pointer group"
                >
                  {/* Item Image Thumbnail */}
                  <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center border border-slate-200/80 group-hover:border-blue-300 transition-colors">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 stroke-[1.5]" />
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider border ${
                        item.type === 'lost' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {item.type}
                      </span>
                      
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>

                      {item.isUrgent && (
                        <span className="px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md text-[9px] sm:text-[10px] font-extrabold shadow-2xs">
                          Urgent
                        </span>
                      )}

                      {/* Mobile inline status badge */}
                      <span className={`sm:hidden inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold border capitalize ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 font-medium leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-slate-400 font-semibold pt-0.5">
                      <span className="flex items-center gap-1 text-slate-600 truncate max-w-[140px] sm:max-w-none">
                        <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                        {item.location?.name || 'Campus Grounds'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        {new Date(item.reportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Status Badge */}
                  <div className="hidden sm:block shrink-0 pl-2">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Urgent Alerts & Campus Handover Center */}
        <div className="space-y-6">
          
          {/* Urgent Items Spotlight */}
          {urgentItems.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white rounded-3xl shadow-xs border border-amber-200/90 p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-amber-950">Urgent Campus Alerts</h3>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-900 border border-amber-500/30 rounded-full text-[10px] font-extrabold">
                  {urgentItems.length} active
                </span>
              </div>

              <p className="text-xs text-amber-900/80 font-medium">
                High-priority student assets requiring immediate campus attention.
              </p>

              <div className="space-y-2.5 pt-1">
                {urgentItems.slice(0, 3).map(item => (
                  <div 
                    key={item.id}
                    onClick={() => onSelectItem && onSelectItem(item)}
                    className="p-3 bg-white/90 rounded-2xl border border-amber-200 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        {item.location?.name || 'Graphic Era Campus'}
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-amber-600 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campus Handover Control Points */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 sm:p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">Campus Handover Desks</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Official Graphic Era University custody exchange desks:
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <p className="font-extrabold text-slate-800">Central Library - Security Counter</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Ground floor main lobby • 08:00 AM - 08:00 PM</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <p className="font-extrabold text-slate-800">Student Amenities Center</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Cafeteria entrance reception desk</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <p className="font-extrabold text-slate-800">Science & Computing Block</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Lab 3 Administrative Office</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('map')}
              className="w-full py-2.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" /> Open Campus Hotspot Map
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
