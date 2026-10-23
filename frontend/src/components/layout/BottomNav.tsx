import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Plus, 
  CheckCircle2, 
  Menu, 
  FileText, 
  PlusCircle, 
  X 
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenMobileMenu: () => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenMobileMenu,
  unreadCount = 0,
}) => {
  const [showReportSheet, setShowReportSheet] = useState(false);

  const handleSelectTab = (tab: string) => {
    onTabChange(tab);
    setShowReportSheet(false);
  };

  return (
    <>
      {/* Quick Report Bottom Sheet */}
      {showReportSheet && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end justify-center md:hidden animate-in fade-in duration-150"
          onClick={() => setShowReportSheet(false)}
        >
          <div 
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 space-y-4 animate-in slide-in-from-bottom duration-200 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  GEU
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Report Campus Item</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Choose report filing category</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReportSheet(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSelectTab('report-lost')}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200/90 text-center transition-all cursor-pointer group active:scale-98"
              >
                <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center mb-2 shadow-md shadow-rose-600/30 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-rose-950">Report Lost</span>
                <span className="text-[10px] text-rose-700/80 font-medium mt-0.5">Missing property</span>
              </button>

              <button
                onClick={() => handleSelectTab('report-found')}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200/90 text-center transition-all cursor-pointer group active:scale-98"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-black text-blue-950">Report Found</span>
                <span className="text-[10px] text-blue-700/80 font-medium mt-0.5">Discovered asset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Fixed Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around pb-safe"
      >
        {/* 1. Dashboard Tab */}
        <button
          type="button"
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50' : ''}`}>
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
        </button>

        {/* 2. Search Directory Tab */}
        <button
          type="button"
          onClick={() => handleSelectTab('search')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'search'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'search' ? 'bg-blue-50' : ''}`}>
            <Search className={`w-5 h-5 ${activeTab === 'search' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Search</span>
        </button>

        {/* 3. Center Action Floating Button: Quick Report */}
        <div className="relative -top-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowReportSheet(true)}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/35 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Report lost or found item"
          >
            <Plus className="w-6 h-6 stroke-[2.75]" />
          </button>
          <span className="text-[10px] font-black text-slate-800 tracking-tight mt-0.5">Report</span>
        </div>

        {/* 4. Claims Tab */}
        <button
          type="button"
          onClick={() => handleSelectTab('claims')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'claims'
              ? 'text-blue-600 font-extrabold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${activeTab === 'claims' ? 'bg-blue-50' : ''}`}>
            <CheckCircle2 className={`w-5 h-5 ${activeTab === 'claims' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Claims</span>
        </button>

        {/* 5. Menu / Extended Hub Tab */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer font-medium"
        >
          <div className="p-1 rounded-xl relative">
            <Menu className="w-5 h-5 stroke-[1.75]" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </nav>
    </>
  );
};
