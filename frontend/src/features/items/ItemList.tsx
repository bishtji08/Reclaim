import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Grid, 
  List as ListIcon, 
  RotateCcw, 
  Package
} from 'lucide-react';
import { Item } from '../../types';
import { ItemCard } from './ItemCard';
import { ItemModal } from './ItemModal';

interface ItemListProps {
  items: Item[];
  title: string;
  emptyMessage?: string;
  showFilters?: boolean;
  initialSearchTerm?: string;
}

export const ItemList: React.FC<ItemListProps> = ({ 
  items, 
  title, 
  emptyMessage = "No items match your campus search criteria.",
  showFilters = true,
  initialSearchTerm = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  // Extract distinct categories from dataset
  const uniqueCategories = Array.from(new Set(items.map(item => item.category))).filter(Boolean);
  const categories = ['all', ...uniqueCategories];

  // Filter and sort items
  const filteredItems = items
    .filter(item => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(q))) ||
        (item.location?.name && item.location.name.toLowerCase().includes(q));

      const matchesCategory = categoryFilter === 'all' || item.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
        case 'oldest':
          return new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
        case 'urgent':
          return (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm !== '' || categoryFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Directory Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              GEU Campus Directory
            </span>
            <span className="text-xs text-slate-400 font-semibold">•</span>
            <span className="text-xs text-slate-500 font-bold">{filteredItems.length} items logged</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">{title}</h1>
        </div>

        {/* View Mode & Reset Controls */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      {showFilters && (
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 p-5 sm:p-6 space-y-4">
          
          {/* Top Search & Type Filter Tabs */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by keywords, serial number, item tags, or campus building..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Lost / Found Type Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start md:self-auto shrink-0">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === 'all' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setTypeFilter('lost')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === 'lost' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                Lost Only
              </button>
              <button
                onClick={() => setTypeFilter('found')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === 'found' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-blue-700 hover:bg-blue-50'
                }`}
              >
                Found Only
              </button>
            </div>
          </div>

          {/* Secondary Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
            
            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="all">All Categories</option>
                {categories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Lifecycle Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="all">All Statuses</option>
                <option value="reported">Reported / Active</option>
                <option value="matched">Potential Match Found</option>
                <option value="claimed">Claim Under Review</option>
                <option value="returned">Resolved / Returned</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="urgent">Urgent Priority First</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Item Display Grid / List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <Package className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-black text-slate-900">No Matching Items Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              {emptyMessage}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onViewDetails={setSelectedItem}
              onClaim={setSelectedItem}
            />
          ))}
        </div>
      ) : (
        /* List Mode View */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredItems.map(item => (
            <div 
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex items-center gap-4 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                {item.images && item.images.length > 0 ? (
                  <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Package className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    item.type === 'lost' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                  }`}>
                    {item.type}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">{item.title}</h4>
                  {item.isUrgent && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-black">Urgent</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
                  <span>{item.category}</span>
                  <span>•</span>
                  <span>{item.location?.name || 'Campus'}</span>
                  <span>•</span>
                  <span>{new Date(item.reportedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold capitalize">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          user={null}
          onClose={() => setSelectedItem(null)}
          onClaimSuccess={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};
