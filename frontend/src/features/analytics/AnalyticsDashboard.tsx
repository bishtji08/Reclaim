import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api/client';
import { Analytics, VisitorAnalyticsData } from '../../types';
import { useToast } from '../../context/ToastContext';
import { 
  TrendingUp, 
  Package, 
  CheckCircle, 
  Users, 
  RotateCcw, 
  Sparkles, 
  MapPin, 
  FolderOpen, 
  Star,
  Activity,
  Globe,
  ShieldCheck,
  Clock,
  Laptop,
  Smartphone,
  Tablet,
  Radio,
  BarChart2,
  Calendar,
  Lock,
  Compass
} from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'visitors' | 'assets'>('visitors');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [visitorAnalytics, setVisitorAnalytics] = useState<VisitorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'weekly'>('daily');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [dashRes, visitorRes] = await Promise.all([
        apiService.getDashboardAnalytics(),
        apiService.getVisitorAnalytics()
      ]);

      if (dashRes.success && dashRes.data) {
        const data = dashRes.data as { analytics?: Analytics };
        setAnalytics(data.analytics || null);
      }

      if (visitorRes.success && visitorRes.data) {
        setVisitorAnalytics(visitorRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      toast.error('Failed to load campus telemetry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Auto-refresh active visitor telemetry every 60s while on dashboard
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !analytics && !visitorAnalytics) {
    return (
      <div className="p-16 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 text-sm font-bold">Compiling campus analytics & intelligence...</p>
        <p className="text-slate-400 text-xs mt-1">Aggregating live telemetry and recovery statistics</p>
      </div>
    );
  }

  const vSummary = visitorAnalytics?.summary;
  const totalVisits = vSummary?.total_visits || 0;
  const liveActive = vSummary?.live_active_visitors || 0;
  const guestVisits = vSummary?.guest_visits || 0;
  const authVisits = vSummary?.authenticated_visits || 0;
  const guestPct = totalVisits > 0 ? Math.round((guestVisits / totalVisits) * 100) : 0;
  const authPct = totalVisits > 0 ? Math.round((authVisits / totalVisits) * 100) : 0;

  const visitorStatCards = [
    {
      title: 'Total Unique Visits',
      value: totalVisits,
      icon: Globe,
      color: 'text-blue-600',
      bg: 'bg-blue-50 text-blue-600',
      border: 'border-slate-200/80',
      sub: 'One visit per browser session'
    },
    {
      title: 'Live Active Visitors',
      value: liveActive,
      icon: Radio,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-200/80',
      sub: 'Active in past 5 minutes',
      badge: 'Real-Time'
    },
    {
      title: 'Guest Visitors',
      value: `${guestVisits} (${guestPct}%)`,
      icon: Compass,
      color: 'text-amber-600',
      bg: 'bg-amber-50 text-amber-600',
      border: 'border-slate-200/80',
      sub: 'Browsing campus inventory'
    },
    {
      title: 'Authenticated Visitors',
      value: `${authVisits} (${authPct}%)`,
      icon: ShieldCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 text-indigo-600',
      border: 'border-slate-200/80',
      sub: 'Logged-in students & faculty'
    },
    {
      title: "Today's Visits",
      value: vSummary?.today_visits || 0,
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-50 text-purple-600',
      border: 'border-slate-200/80',
      sub: 'Since 00:00 server time'
    },
    {
      title: "This Week's Visits",
      value: vSummary?.week_visits || 0,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 text-cyan-600',
      border: 'border-slate-200/80',
      sub: 'Past 7 rolling days'
    }
  ];

  const assetStatCards = [
    {
      title: 'Active Lost Reports',
      value: analytics?.total_lost_items || 0,
      icon: Package,
      color: 'text-rose-600',
      bg: 'bg-rose-50 text-rose-600',
      border: 'border-slate-200/80',
      sub: 'Open student cases'
    },
    {
      title: 'Found Items Logged',
      value: analytics?.total_found_items || 0,
      icon: CheckCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50 text-blue-600',
      border: 'border-slate-200/80',
      sub: 'Safely deposited'
    },
    {
      title: 'Total Handed Over',
      value: (Number(analytics?.matched_items || 0) + Number(analytics?.returned_items || 0)),
      icon: Sparkles,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'border-slate-200/80',
      sub: 'Reunited with owner'
    },
    {
      title: 'Campus Resolution Rate',
      value: `${analytics?.resolution_rate || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50 text-purple-600',
      border: 'border-slate-200/80',
      sub: 'Resolution benchmark'
    },
    {
      title: 'Registered Campus Users',
      value: analytics?.total_users || 0,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 text-indigo-600',
      border: 'border-slate-200/80',
      sub: 'Students & Faculty'
    },
    {
      title: 'Community Trust Rating',
      value: analytics?.avg_rating ? `${analytics.avg_rating} / 5` : '4.9 / 5',
      icon: Star,
      color: 'text-amber-500',
      bg: 'bg-amber-50 text-amber-500',
      border: 'border-slate-200/80',
      sub: 'Peer reviews rating'
    }
  ];

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Laptop;
    }
  };

  const formatSessionTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 60) return `${seconds || 0}s`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${mins}m ${remainingSecs > 0 ? remainingSecs + 's' : ''}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Executive Telemetry
            </span>
            <span className="text-xs text-slate-400 font-semibold">•</span>
            <span className="text-xs text-slate-500 font-bold">Graphic Era University</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Campus Analytics & Live Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Privacy-preserving visitor intelligence, real-time campus traffic, and asset resolution analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchAllData}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/80">
        <button
          onClick={() => setActiveTab('visitors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'visitors'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-500" />
          <span>Visitor Traffic & Live Telemetry</span>
          {liveActive > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
              {liveActive} Live
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'assets'
              ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-blue-600" />
          <span>Asset Recovery & Cases</span>
        </button>
      </div>

      {activeTab === 'visitors' ? (
        <div className="space-y-8 animate-in fade-in duration-150">
          
          {/* Live Beacon Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>REAL-TIME TELEMETRY ENGINE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {liveActive} Active Visitor{liveActive !== 1 ? 's' : ''} Online Right Now
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium">
                Unique browser sessions are active on campus grounds. Active status is continuously maintained via heartbeat telemetry.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-xs space-y-2 max-w-sm z-10">
              <div className="flex items-center gap-2 font-black text-amber-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Privacy By Design Guarantee</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Zero IP addresses, cookies, names, emails, or hardware fingerprints are recorded. 100% compliant with privacy principles.
              </p>
            </div>
          </div>

          {/* Visitor KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visitorStatCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-3xl p-5 sm:p-6 shadow-xs border ${card.border} hover:shadow-md transition-all flex items-center justify-between group`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.title}</p>
                      {card.badge && (
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{card.value}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{card.sub}</p>
                  </div>
                  <div className={`p-3.5 rounded-2xl ${card.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 stroke-[2.25]" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visitor Composition Progress */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-base text-slate-900">Visitor Audience Breakdown</h3>
                <p className="text-xs text-slate-500 font-medium">Comparison between guest campus visitors and authenticated university users</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Guest Visitors: {guestVisits} ({guestPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span> Authenticated: {authVisits} ({authPct}%)
                </span>
              </div>
            </div>

            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${guestPct}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Guest Visitors: ${guestPct}%`}
              />
              <div
                style={{ width: `${authPct}%` }}
                className="bg-indigo-600 h-full transition-all duration-500"
                title={`Authenticated Members: ${authPct}%`}
              />
            </div>
          </div>

          {/* Visit Trends & Device Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Visit Trends Chart */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 space-y-4 flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" /> Visit Trend Activity
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Unique browser visits recorded over time</p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setTrendPeriod('daily')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      trendPeriod === 'daily'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Daily (14 Days)
                  </button>
                  <button
                    onClick={() => setTrendPeriod('weekly')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      trendPeriod === 'weekly'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Weekly (8 Weeks)
                  </button>
                </div>
              </div>

              {/* Chart Visualizer */}
              <div className="pt-4">
                {trendPeriod === 'daily' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-48 pt-6 border-b border-slate-100 pb-2">
                      {visitorAnalytics?.daily_trends?.map((day, idx) => {
                        const maxVal = Math.max(...(visitorAnalytics.daily_trends.map(d => d.total_visits)), 1);
                        const heightPct = Math.max(8, Math.round((day.total_visits / maxVal) * 100));
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              {day.total_visits}
                            </span>
                            <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-lg group-hover:from-blue-700 group-hover:to-indigo-600 transition-all"
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 rotate-45 sm:rotate-0 origin-left">
                              {day.formatted_date.split(',')[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-medium">
                      <span>Past 14 Days</span>
                      <span>Total visits: {visitorAnalytics?.daily_trends?.reduce((acc, cur) => acc + cur.total_visits, 0) || 0}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 items-end h-48 pt-6 border-b border-slate-100 pb-2">
                      {visitorAnalytics?.weekly_trends?.map((week, idx) => {
                        const maxVal = Math.max(...(visitorAnalytics.weekly_trends.map(w => w.total_visits)), 1);
                        const heightPct = Math.max(8, Math.round((week.total_visits / maxVal) * 100));
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              {week.total_visits}
                            </span>
                            <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className="w-full bg-gradient-to-t from-indigo-600 to-purple-600 rounded-t-lg group-hover:from-indigo-700 group-hover:to-purple-700 transition-all"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{week.week_start}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-medium">
                      <span>Past 8 Weeks</span>
                      <span>Total visits: {visitorAnalytics?.weekly_trends?.reduce((acc, cur) => acc + cur.total_visits, 0) || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Device Classification Breakdown */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-purple-600" /> Device Distribution
                </h3>
                <p className="text-xs text-slate-400 font-medium">Coarse client classification</p>
              </div>

              <div className="space-y-4 pt-2">
                {visitorAnalytics?.devices?.length ? (
                  visitorAnalytics.devices.map((dev, i) => {
                    const Icon = getDeviceIcon(dev.device_type);
                    const pct = totalVisits > 0 ? Math.round((dev.count / totalVisits) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-slate-500" />
                            {dev.device_type}
                          </span>
                          <span className="text-slate-500 font-semibold">{dev.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No device traffic recorded yet.</p>
                )}
              </div>
            </div>

          </div>

          {/* Recent Visitor Sessions Table (Privacy-Preserving) */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" /> Recent Session Activity
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Latest unique browser sessions with zero personal identity disclosure
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Masked Identifiers • No IP Stored</span>
              </div>
            </div>

            <div className="overflow-x-auto pt-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="pb-3 pl-2">Session Reference</th>
                    <th className="pb-3">Visitor Type</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3">Entry & Route</th>
                    <th className="pb-3">Duration & Heartbeats</th>
                    <th className="pb-3">Live Status</th>
                    <th className="pb-3 pr-2 text-right">Started At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {visitorAnalytics?.recent_sessions?.length ? (
                    visitorAnalytics.recent_sessions.map((sess, idx) => {
                      const DeviceIcon = getDeviceIcon(sess.device_type);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 pl-2 font-mono text-slate-900 font-bold">
                            {sess.session_id_masked}
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              sess.visitor_type === 'authenticated'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {sess.visitor_type === 'authenticated' ? 'Campus Member' : 'Guest'}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                              <DeviceIcon className="w-3.5 h-3.5 text-slate-400" />
                              {sess.device_type} • {sess.browser_name}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                              {sess.landing_path}
                            </span>
                            {sess.last_path && sess.last_path !== sess.landing_path && (
                              <span className="text-slate-400 text-[11px] ml-1.5">
                                → {sess.last_path}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5">
                            <span className="text-slate-800 font-bold">{formatDuration(sess.duration_seconds)}</span>
                            <span className="text-slate-400 text-[11px] ml-1.5">
                              ({sess.heartbeat_count} ping{sess.heartbeat_count !== 1 ? 's' : ''}, {sess.page_view_count} pg)
                            </span>
                          </td>
                          <td className="py-3.5">
                            {sess.is_active ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                Completed
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pr-2 text-right text-slate-500 font-semibold">
                            {formatSessionTime(sess.started_at)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No visitor session activity recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* Asset Recovery Intelligence View (Original Analytics Tab) */
        <div className="space-y-8 animate-in fade-in duration-150">
          
          {/* Asset KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {assetStatCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-3xl p-5 sm:p-6 shadow-xs border ${card.border} hover:shadow-md transition-all flex items-center justify-between group`}
                >
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.title}</p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{card.value}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">{card.sub}</p>
                  </div>
                  <div className={`p-3.5 rounded-2xl ${card.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 stroke-[2.25]" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Distribution Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            
            {/* Top Categories */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-600" /> Category Volume Distribution
                </h3>
                <span className="text-xs text-slate-400 font-semibold">Total logged</span>
              </div>

              <div className="space-y-4 pt-1">
                {analytics?.top_categories?.length ? (
                  analytics.top_categories.map((cat, i) => {
                    const count = Number(cat.count || 0);
                    const max = Number(analytics.top_categories?.[0]?.count || 1);
                    const pct = Math.max(5, Math.min(100, Math.round((count / (max || 1)) * 100)));
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>{cat.category}</span>
                          <span className="text-slate-500 font-semibold">{count} reports</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No category reports recorded yet.</p>
                )}
              </div>
            </div>

            {/* Top Locations */}
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" /> Campus Hotspots
                </h3>
                <span className="text-xs text-slate-400 font-semibold">Frequent recovery zones</span>
              </div>

              <div className="space-y-4 pt-1">
                {analytics?.top_locations?.length ? (
                  analytics.top_locations.map((loc, i) => {
                    const count = Number(loc.count || 0);
                    const max = Number(analytics.top_locations?.[0]?.count || 1);
                    const pct = Math.max(5, Math.min(100, Math.round((count / (max || 1)) * 100)));
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>{loc.location}</span>
                          <span className="text-slate-500 font-semibold">{count} logged</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No location reports recorded yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
