import React, { useState } from 'react';
import {
  Search,
  PlusCircle,
  FileText,
  MapPin,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Bell,
  ArrowRight,
  ChevronRight,
  Building2,
  Clock,
  LayoutDashboard,
  Lock,
  SlidersHorizontal,
  ChevronDown,
  Navigation,
  Compass,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { Item, User } from '../../types';

interface LandingPageProps {
  user: User | null;
  items: Item[];
  onOpenAuth: (mode?: 'login' | 'register', postAction?: string) => void;
  onNavigateTab: (tab: string) => void;
  onSelectItem: (item: Item) => void;
  onSearch: (query: string) => void;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  items,
  onOpenAuth,
  onNavigateTab,
  onSelectItem,
  onSearch,
  onLogout,
}) => {
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeType, setActiveType] = useState<'all' | 'lost' | 'found'>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [heroImageError, setHeroImageError] = useState(false);

  // Filter items for the live preview section
  const previewItems = items
    .filter((item) => {
      const matchesType = activeType === 'all' || item.type === activeType;
      const matchesCat = activeCategory === 'all' || item.category.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !heroSearchQuery.trim() ||
        item.title.toLowerCase().includes(heroSearchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(heroSearchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(heroSearchQuery.toLowerCase()));
      return matchesType && matchesCat && matchesSearch;
    })
    .slice(0, 6);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearchQuery.trim()) {
      onSearch(heroSearchQuery);
      onNavigateTab('search');
    } else {
      const element = document.getElementById('recent-items');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleReportAction = (type: 'lost' | 'found') => {
    if (user) {
      onNavigateTab(type === 'lost' ? 'report-lost' : 'report-found');
    } else {
      onOpenAuth('login', type === 'lost' ? 'report-lost' : 'report-found');
    }
  };

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'clothing', label: 'Clothing' },
    { id: 'documents', label: 'Documents & IDs' },
    { id: 'books & stationery', label: 'Books & Stationery' },
  ];

  const campusLocations = [
    {
      name: 'Central Library - Main Desk',
      building: 'Library Block',
      desc: 'Ground floor security counter and book return area',
      highlight: 'Primary lost valuables holding desk',
    },
    {
      name: 'Student Center Cafeteria',
      building: 'Student Amenities',
      desc: 'Food court tables, counter lounges, and dining concourse',
      highlight: 'High activity lost & found hub',
    },
    {
      name: 'Science Complex Lab 3',
      building: 'Science & Computing Block',
      desc: 'CS/IT computing labs, hardware centers, and 2nd floor corridors',
      highlight: 'Electronics & calculation devices',
    },
    {
      name: 'Engineering Hallway A',
      building: 'Engineering Block',
      desc: '1st floor lecture halls, seminar rooms, and departmental offices',
      highlight: 'Notebooks, folders, and bags',
    },
    {
      name: 'Campus Sports Complex',
      building: 'Sports & Gymnasium',
      desc: 'Lobby, basketball courts, badminton pavilion, and track area',
      highlight: 'Sportswear, water bottles, and gear',
    },
  ];

  const faqs = [
    {
      question: 'Who can report and claim items on REclaim?',
      answer:
        'All registered students, faculty members, administrative staff, and campus security personnel of Graphic Era University (GEU), Dehradun can report lost or discovered items and submit verification claims using their university credentials.',
    },
    {
      question: 'How do I submit proof of ownership for a found item?',
      answer:
        'When viewing a found item in the directory, click "Submit Claim". You will be asked to supply distinctive verifying details that are not visible in public descriptions, such as serial numbers, unique engraved markings, lockscreen wallpapers, internal bag contents, or photo receipts.',
    },
    {
      question: 'Where do physical item handovers take place on campus?',
      answer:
        'Handovers are officially coordinated at designated campus control points—primarily the Central Library Security Desk, Departmental Administrative Offices, or the Student Center Reception—ensuring safe and transparent exchanges.',
    },
    {
      question: 'How does the automated multi-criteria matching engine work?',
      answer:
        'Our relational matching algorithm continuously analyzes compatibility across 4 weighted factors: item category (45%), primary color (25%), campus facility (20%), and date proximity (10%). Whenever a compatible match reaches or exceeds 55% similarity, both parties receive immediate in-app and email alerts.',
    },
    {
      question: 'Can I browse lost and found items without signing in?',
      answer:
        'Yes! The campus directory is open for public browsing and keyword searching so anyone can quickly check if their lost belonging has been found. Logging in is only required when filing a new report, submitting an ownership claim, or flagging a post.',
    },
    {
      question: 'What happens if a user submits a fake claim or inappropriate report?',
      answer:
        'REclaim enforces community governance. Any student or staff member can flag suspicious listings. University administrators review flagged items, inspect the audit trail, and have the authority to blacklist abusive accounts permanently.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. TOP NAVBAR */}
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 text-white transition-all">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo & University Title */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[13px] sm:rounded-[14px] flex items-center justify-center">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 stroke-[2.5]" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-xl font-black tracking-tight text-white leading-none">
                    RE<span className="text-blue-500">claim</span>
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
                    GEU
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wide truncate max-w-[130px] sm:max-w-none mt-0.5">
                  Graphic Era University
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-7 text-xs font-semibold text-slate-300">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#campus-map" className="hover:text-white transition-colors">Campus Hotspots</a>
              <a href="#recent-items" className="hover:text-white transition-colors">Live Directory</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQs</a>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => onNavigateTab('dashboard')}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Go to Portal
                  </button>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="hidden sm:inline-block px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                    >
                      Sign Out
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800/80 transition-all border border-slate-700/60 cursor-pointer whitespace-nowrap"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => onOpenAuth('register')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Create Account</span>
                    <span className="sm:hidden">Join</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative min-h-[640px] lg:min-h-[720px] flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Background Image with Readability Dark Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          {!heroImageError ? (
            <img
              src="/images/geu-hero.jpg"
              alt="Graphic Era University Campus Grounds"
              className="w-full h-full object-cover object-center transform scale-105 filter brightness-75 contrast-110"
              onError={() => setHeroImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950" />
          )}
          {/* Multi-layered dark gradient overlay for crystal clear contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/80 to-slate-950/95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-600/15 via-transparent to-transparent" />
        </div>

        {/* Hero Content Box */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-8">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-blue-500/30 shadow-xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Graphic Era University, Dehradun
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              Campus Recovery Platform
            </span>
          </div>

          {/* Headings */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
              Lost Something on Campus?{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">
                REclaim It.
              </span>
            </h1>
            <p className="text-base sm:text-xl font-bold text-blue-100/90 max-w-3xl mx-auto tracking-wide">
              The Campus Lost & Found Platform for Graphic Era University.
            </p>
            <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Centralized, database-driven belongings recovery serving students, faculty, and campus security across all academic blocks, libraries, and laboratories at GEU Dehradun.
            </p>
          </div>

          {/* Prominent CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleReportAction('lost')}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/30 transition-all transform hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Report Lost Item
            </button>
            <button
              onClick={() => handleReportAction('found')}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all transform hover:-translate-y-0.5 active:scale-98 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Report Found Item
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('recent-items');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs sm:text-sm font-bold border border-slate-700/80 shadow-md backdrop-blur-md transition-all active:scale-98 cursor-pointer"
            >
              Browse Directory <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Hero Search Input */}
          <div className="max-w-2xl mx-auto pt-4">
            <form
              onSubmit={handleHeroSearchSubmit}
              className="relative flex items-center bg-white/10 hover:bg-white/15 focus-within:bg-white/20 border border-white/20 rounded-2xl p-1.5 backdrop-blur-xl shadow-2xl transition-all"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300 ml-2.5 sm:ml-3.5 flex-shrink-0" />
              <input
                type="text"
                value={heroSearchQuery}
                onChange={(e) => setHeroSearchQuery(e.target.value)}
                placeholder="Search lost items (e.g., ID, Calculator, Wallet)..."
                className="w-full min-w-0 bg-transparent px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex-shrink-0 px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          {/* University Trust Badges */}
          <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 text-left">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm">
              <Building2 className="w-4 h-4 text-blue-400 mb-1" />
              <div className="text-xs sm:text-sm font-bold text-white">Campus Areas</div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Library, Cafeteria, Academic Blocks, Sports, Labs</p>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-400 mb-1" />
              <div className="text-xs sm:text-sm font-bold text-white">Automated Matching</div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">4-factor weighted similarity engine</p>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
              <div className="text-xs sm:text-sm font-bold text-white">Verified Claims</div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Strict ownership proof & anti-fraud rules</p>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-sm">
              <Lock className="w-4 h-4 text-indigo-400 mb-1" />
              <div className="text-xs sm:text-sm font-bold text-white">Strict Protocols</div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">Identity Verification & Claim Authentication</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LIVE CAMPUS ITEMS DIRECTORY PREVIEW */}
      <section id="recent-items" className="py-20 bg-slate-100/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4" /> Live Campus Telemetry
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Recently Reported Items on Campus
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Browse latest lost and discovered belongings reported across Graphic Era University buildings.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-white p-1 rounded-xl shadow-xs border border-slate-200">
                {(['all', 'lost', 'found'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveType(t)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${activeType === t ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onNavigateTab('search')}
                className="px-3.5 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50/50 rounded-xl border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Full Search Directory <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          {previewItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No items match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try selecting a different category or clearing the search query to explore all reports.
              </p>
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setActiveType('all');
                  setHeroSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    {/* Item Image or Category Placeholder */}
                    <div className="relative h-44 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <Building2 className="w-10 h-10 mx-auto mb-1 stroke-[1.25]" />
                          <span className="text-[11px] font-medium text-slate-500">Graphic Era Campus Listing</span>
                        </div>
                      )}

                      {/* Floating Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${item.type === 'lost' ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                            }`}
                        >
                          {item.type}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-700 capitalize backdrop-blur-xs shadow-xs">
                          {item.status}
                        </span>
                      </div>

                      {item.isUrgent && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white flex items-center gap-1 shadow-md">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                        <span>{item.category}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.reportedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{item.location?.name || 'Campus Facility'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <button className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-blue-600 text-slate-700 hover:text-white text-xs font-bold transition-all border border-slate-200 group-hover:border-blue-600 flex items-center justify-center gap-1.5">
                      Inspect Report & Claim <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. COMPREHENSIVE FEATURES SHOWCASE (8 CORE PILLARS) */}
      <section id="features" className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-200">
              System Architecture & Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Designed for Academic & Campus Scale
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
              Built specifically to overcome informal social notices and physical registers through normalized relational database modeling, spatial queries, and multi-tier verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-slate-50 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Guided Item Reporting</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Structured forms to report lost or found articles with up to 5 image attachments, distinctive marks, brand, color, serial numbers, and urgency flags.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-slate-50 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Search className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Campus-Wide Discovery</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Fast multi-criteria search filtering items by category, specific campus facility, date range, tags, or full-text keywords.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-slate-50 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sparkles className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Smart Matching Engine</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automated 4-factor scoring (category 45%, color 25%, facility 20%, timestamp 10%) providing human-readable match explanations.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 bg-slate-50 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Proof-of-Ownership Claims</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Claimants provide distinctive details and photo proofs. Anti-fraud triggers prevent self-claims and enforce review authorization.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 bg-slate-50 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Status Lifecycle Tracking</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transparent progression: <span className="font-mono text-purple-800">Reported ➔ Matched ➔ Claimed ➔ Returned ➔ Closed</span>, retaining historical audit trails.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 bg-slate-50 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Bell className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Dual-Channel Alerts</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Real-time in-app badges alongside automated Nodemailer SMTP email dispatches for report confirmations and match discoveries.
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-6 bg-slate-50 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Navigation className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Campus GIS & Map Pins</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Interactive OpenStreetMap and PostGIS geometry mapping GEU Dehradun facilities with building-level item density counters.
              </p>
            </div>

            {/* Feature 8 */}
            <div className="p-6 bg-slate-50 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-800 flex items-center justify-center">
                <SlidersHorizontal className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Administrative Governance</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Departmental category management, user blacklisting for code-of-conduct violations, and a dedicated queue to review suspicious flags.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VISUAL HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-500/30">
              Clear Recovery Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              How REclaim Works on Campus
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Four streamlined steps from missing belongings to safe verification and handover.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-slate-800/60 border border-slate-700/80 relative space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-blue-500/30">
                1
              </div>
              <h3 className="font-bold text-lg text-white">Submit a Report</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log the article with category, campus location (e.g. Central Library or Cafeteria), date, and optional photos.
              </p>
              <div className="pt-2 text-xs font-semibold text-blue-400 flex items-center gap-1">
                Takes under 2 minutes <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-slate-800/60 border border-slate-700/80 relative space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-indigo-500/30">
                2
              </div>
              <h3 className="font-bold text-lg text-white">Intelligent Matching</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The database compares lost reports with found articles. When high compatibility is detected, automated alerts notify both parties.
              </p>
              <div className="pt-2 text-xs font-semibold text-indigo-400 flex items-center gap-1">
                Instant database triggers <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-slate-800/60 border border-slate-700/80 relative space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white font-black text-base flex items-center justify-center shadow-lg shadow-amber-500/30">
                3
              </div>
              <h3 className="font-bold text-lg text-white">Verify Ownership</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Claimant submits proof of ownership (engraved marks, serials, wallpapers). The reporter or campus staff reviews the claim.
              </p>
              <div className="pt-2 text-xs font-semibold text-amber-400 flex items-center gap-1">
                Fraud-prevention protected <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-slate-800/60 border border-slate-700/80 relative space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-emerald-500/30">
                4
              </div>
              <h3 className="font-bold text-lg text-white">Return & Feedback</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Collect your belongings at designated campus desks, mark status as returned, and leave feedback to strengthen campus trust.
              </p>
              <div className="pt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                Community rating active <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CAMPUS FACILITIES & GIS SPOTLIGHT */}
      <section id="campus-map" className="py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-200">
                Spatial Coverage
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-2">
                Graphic Era University Campus Hotspots
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Integrated PostGIS spatial mapping covering main lecture halls, libraries, dining areas, and sports pavilions.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('map')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              Open Interactive Campus Map <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campus Facilities List */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {campusLocations.map((loc, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white hover:shadow-lg transition-all space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {loc.building}
                      </span>
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{loc.name}</h4>
                    <p className="text-xs text-slate-500">{loc.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] font-semibold text-slate-600">
                    <span className="text-slate-400">Common finds: </span>{loc.highlight}
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Facility Spotlight Card */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-xs font-bold border border-white/10">
                  <Navigation className="w-3.5 h-3.5" /> PostGIS Geographic Engine
                </div>
                <h3 className="text-xl font-bold leading-tight">
                  University Spatial Integration
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lost belongings and discovered items can be filtered within specific building radii (WGS84 PostGIS geometry). Reporters can designate exact lecture rooms, labs, or cafeteria counters.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Campus Center Coordinates:</span>
                  <span className="font-mono font-bold text-amber-300">30.2687° N, 77.9945° E</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Campus Security Station:</span>
                  <span className="font-bold text-emerald-400">Active 24/7</span>
                </div>
                <button
                  onClick={() => onNavigateTab('map')}
                  className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all shadow-md mt-2 cursor-pointer"
                >
                  Explore GEU Map Pins
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-200">
              Campus Support & Guidelines
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-500">
              Everything you need to know about reporting, claiming, and returning items at Graphic Era University.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'transform rotate-180 text-blue-600' : ''
                        }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION BANNER */}
      <section className="py-20 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Lost Something Valuable or Found an Unattended Item?
          </h2>
          <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Join fellow students and staff in maintaining a secure, connected campus. Help return lost belongings to their rightful owners today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleReportAction('lost')}
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-extrabold shadow-xl transition-all cursor-pointer"
            >
              Report a Lost Item
            </button>
            <button
              onClick={() => handleReportAction('found')}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold shadow-xl transition-all cursor-pointer"
            >
              Report a Discovered Item
            </button>
            <button
              onClick={() => onNavigateTab('search')}
              className="px-6 py-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
            >
              Browse All Listings
            </button>
          </div>
        </div>
      </section>

      {/* 9. UNIVERSITY-FOCUSED FOOTER */}
      <footer className="bg-slate-950 text-slate-400 text-xs pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Col 1: Identity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                  <Search className="w-4 h-4" />
                </div>
                <span className="text-base font-black text-white">REclaim</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                The Campus Lost & Found Management Platform for Graphic Era University. Backed by normalized PostgreSQL relational modeling and multi-criteria matching.
              </p>
              <div className="text-[11px] text-slate-400 font-mono">
                Bell Road, Clement Town, Dehradun, Uttarakhand 248002
              </div>
            </div>

            {/* Col 2: Campus Facilities */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Campus Facilities</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><a href="#campus-map" className="hover:text-white transition-colors">Central Library - Main Desk</a></li>
                <li><a href="#campus-map" className="hover:text-white transition-colors">Student Center Cafeteria</a></li>
                <li><a href="#campus-map" className="hover:text-white transition-colors">Science Complex Lab 3</a></li>
                <li><a href="#campus-map" className="hover:text-white transition-colors">Engineering Hallway A</a></li>
                <li><a href="#campus-map" className="hover:text-white transition-colors">Campus Sports Complex</a></li>
              </ul>
            </div>

            {/* Col 3: Quick Navigation */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-1.5 text-[11px]">
                <li><button onClick={() => onNavigateTab('search')} className="hover:text-white transition-colors cursor-pointer">Campus Directory</button></li>
                <li><button onClick={() => handleReportAction('lost')} className="hover:text-white transition-colors cursor-pointer">Report Lost Belonging</button></li>
                <li><button onClick={() => handleReportAction('found')} className="hover:text-white transition-colors cursor-pointer">Report Discovered Item</button></li>
                <li><button onClick={() => onNavigateTab('map')} className="hover:text-white transition-colors cursor-pointer">Campus GIS Map</button></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Frequently Asked Questions</a></li>
              </ul>
            </div>

            {/* Col 4: Academic Attribution & Security */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Academic & Safety</h4>
              <p className="text-[11px] leading-relaxed text-slate-400">
                <strong className="text-slate-200">@SyntaxScholar</strong>
              </p>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Campus Security Policy
                </div>
                <p className="text-slate-400 text-[10px]">
                  Unclaimed valuables after 90 days are remanded to campus security control.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} REclaim — Graphic Era University. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <span>Developed by <a className='text-amber-400 font-bold items-center gap-1' href="https://www.linkedin.com/in/sarthakbisht08/">Sarthak Bisht</a></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
