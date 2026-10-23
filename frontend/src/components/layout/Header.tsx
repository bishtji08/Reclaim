import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../lib/api/client';
import { 
  Bell, 
  Search, 
  Menu, 
  X, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Package, 
  MapPin, 
  CheckCircle2, 
  BarChart3, 
  Globe,
  Sparkles,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { User as UserType, Notification } from '../../types';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onNavigateTab?: (tab: string) => void;
  onSearch?: (query: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  user, 
  onLogout, 
  onNavigateTab,
  onSearch,
  onUnreadCountChange,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchVal, setSearchVal] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const response = await apiService.getNotifications({ limit: 5 });
        if (response.success && response.data) {
          setNotifications(response.data.notifications || []);
          const count = response.data.unread_count || 0;
          setUnreadCount(count);
          onUnreadCountChange?.(count);
        }
      } catch {
        // silent
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [onUnreadCountChange]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPopover(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchVal);
    if (onNavigateTab) onNavigateTab('search');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-500/30">
            <ShieldCheck className="w-3 h-3 text-amber-600" /> Admin
          </span>
        );
      case 'finder':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/15 text-blue-800 border border-blue-500/30">
            Finder
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
            Student
          </span>
        );
    }
  };

  const mobileNavigation = [
    { id: 'landing', label: 'Campus Home', icon: Globe },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search', label: 'Search Directory', icon: Search },
    { id: 'report-lost', label: 'Report Lost Item', icon: FileText, accent: 'text-rose-600' },
    { id: 'report-found', label: 'Report Found Item', icon: PlusCircle, accent: 'text-sky-600' },
    { id: 'my-items', label: 'My Reported Items', icon: Package },
    { id: 'claims', label: 'Claims Center', icon: CheckCircle2 },
    { id: 'map', label: 'Campus Map', icon: MapPin },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'settings', label: 'Account Settings', icon: Settings },
    ...(user.role === 'admin' ? [{ id: 'analytics', label: 'Campus Analytics', icon: BarChart3 }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          
          {/* GEU REclaim Brand Identity */}
          <div 
            className="flex items-center gap-3.5 cursor-pointer group"
            onClick={() => onNavigateTab && onNavigateTab('dashboard')}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-400 p-0.5 shadow-md shadow-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-400 stroke-[2.5]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  RE<span className="text-blue-600">claim</span>
                </span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full shadow-2xs">
                  GEU
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold tracking-wide">
                Graphic Era University • Dehradun
              </p>
            </div>
          </div>

          {/* Desktop Search & Navigation Controls */}
          <div className="hidden md:flex items-center space-x-3.5">
            {/* Campus Home Link */}
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('landing')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100/90 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
              title="Graphic Era University Campus Homepage"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Campus Home</span>
            </button>

            {/* Quick Report Actions */}
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('report-lost')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200/80 transition-all cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Report Lost</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('report-found')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 transition-all cursor-pointer shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Report Found</span>
            </button>

            {/* Global Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search campus directory..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="pl-9 pr-3.5 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-52 lg:w-64 bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 placeholder-slate-400"
              />
            </form>
            
            {/* Notification Bell with Rich Popover */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer"
                title="Campus Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-full flex items-center justify-center text-[10px] text-white font-extrabold shadow-sm animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifPopover && (
                <div className="absolute right-0 mt-3 w-84 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">Notifications</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    </div>
                    {unreadCount > 0 ? (
                      <span className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                        {unreadCount} unread
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">All caught up</span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 py-1">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 space-y-1">
                        <Sparkles className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                        <p className="text-xs font-semibold">No recent alerts</p>
                        <p className="text-[11px] text-slate-400">Match notifications will appear here</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            setShowNotifPopover(false);
                            if (onNavigateTab) onNavigateTab('notifications');
                          }}
                          className="p-3.5 hover:bg-slate-50/80 rounded-2xl transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] font-semibold text-slate-400 mt-1.5 block">
                            {new Date(n.created_at || n.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100 text-center">
                    <button
                      onClick={() => {
                        setShowNotifPopover(false);
                        if (onNavigateTab) onNavigateTab('notifications');
                      }}
                      className="w-full text-xs font-bold text-blue-600 hover:text-blue-800 py-2 hover:bg-blue-50/60 rounded-xl transition-colors cursor-pointer"
                    >
                      View All Alerts in Notification Center →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-slate-100 border border-slate-200/80 transition-all text-left cursor-pointer shadow-2xs"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-extrabold text-slate-900 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">{user.email}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-black text-slate-900">{user.name}</p>
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  
                  <div className="py-1 space-y-1">
                    <button 
                      onClick={() => {
                        setShowProfileMenu(false);
                        if (onNavigateTab) onNavigateTab('settings');
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Account Settings
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Sign Out of REclaim
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Hamburger Toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => {
                if (onNavigateTab) onNavigateTab('notifications');
              }}
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-slate-100 py-4 space-y-3 animate-in fade-in duration-200">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search campus directory..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
              />
            </form>

            <div className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-900">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-xs text-red-600 font-bold px-3 py-1.5 bg-white border border-red-200 rounded-xl hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {mobileNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigateTab?.(item.id);
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 text-left text-xs font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50/80 hover:text-blue-700 shadow-2xs"
                  >
                    <Icon className={`h-4 w-4 ${item.accent || 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
