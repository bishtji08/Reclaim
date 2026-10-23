import React, { useState } from 'react';
import { 
  MapPin, 
  Tag, 
  AlertTriangle, 
  Eye, 
  Package, 
  CheckCircle2 
} from 'lucide-react';
import { Item } from '../../types';

interface ItemCardProps {
  item: Item;
  onViewDetails: (item: Item) => void;
  onClaim?: (item: Item) => void;
  showActions?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ 
  item, 
  onViewDetails, 
  onClaim,
  showActions = true 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reported': 
        return { label: 'Active Report', classes: 'bg-blue-50 text-blue-700 border-blue-200/90' };
      case 'matched': 
        return { label: 'Match Found', classes: 'bg-amber-50 text-amber-700 border-amber-200/90' };
      case 'claimed': 
        return { label: 'Claim in Review', classes: 'bg-purple-50 text-purple-700 border-purple-200/90' };
      case 'returned': 
        return { label: 'Reunited', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/90' };
      case 'closed': 
        return { label: 'Archived', classes: 'bg-slate-100 text-slate-600 border-slate-200' };
      default: 
        return { label: status, classes: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  const primaryImage = item.images && item.images.length > 0 ? item.images[0] : null;
  const statusInfo = getStatusBadge(item.status);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/90 hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col justify-between group">
      
      {/* Top Media & Visual Badges */}
      <div>
        <div className="relative h-44 sm:h-52 bg-slate-900 overflow-hidden">
          {primaryImage && !imageError ? (
            <img
              src={primaryImage}
              alt={item.title}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover group-hover:scale-108 transition-all duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-400 p-4 text-center">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 stroke-[1.25] text-slate-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verified Campus Asset</span>
            </div>
          )}
          
          {/* Subtle Bottom Gradient for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-md ${
              item.type === 'lost'
                ? 'bg-rose-600/90 text-white'
                : 'bg-blue-600/90 text-white'
            }`}>
              {item.type}
            </span>

            {item.isUrgent && (
              <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Urgent
              </span>
            )}
          </div>

          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
            <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shadow-sm backdrop-blur-md ${statusInfo.classes}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Location Bar Pill Overlaid at Bottom of Image */}
          <div className="absolute bottom-2 left-2.5 right-2.5 sm:bottom-2.5 sm:left-3 sm:right-3 flex items-center justify-between text-white text-[10px] sm:text-[11px] font-semibold drop-shadow-sm">
            <span className="flex items-center gap-1 bg-slate-950/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl backdrop-blur-md truncate max-w-[70%]">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">{item.location?.name || 'Graphic Era Campus'}</span>
            </span>
            <span className="bg-slate-950/80 px-2 py-0.5 sm:py-1 rounded-xl backdrop-blur-md text-[9px] sm:text-[10px] text-slate-300">
              {formatDate(item.reportedAt)}
            </span>
          </div>
        </div>

        {/* Card Content Details */}
        <div className="p-4 sm:p-5 space-y-2 sm:space-y-3">
          
          {/* Category Breadcrumb */}
          <div className="flex items-center justify-between text-xs font-bold text-blue-600">
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200/60 uppercase tracking-wider text-[9px] sm:text-[10px]">
              {item.category}
            </span>
            {item.subcategory && (
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                {item.subcategory}
              </span>
            )}
          </div>

          {/* Item Title */}
          <h3 
            onClick={() => onViewDetails(item)}
            className="text-sm sm:text-base font-extrabold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer"
          >
            {item.title}
          </h3>

          {/* Item Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {item.description}
          </p>

          {/* Tag Badges */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100/90 text-slate-600 rounded-md text-[10px] font-semibold">
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-[10px] text-slate-400 font-bold self-center">
                  +{item.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Action Buttons */}
      {showActions && (
        <div className="px-4 pb-4 pt-2 sm:px-5 sm:pb-5 sm:pt-2 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewDetails(item)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100/90 hover:bg-slate-200 active:scale-98 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px]"
          >
            <Eye className="w-3.5 h-3.5" /> View Details
          </button>

          {item.type === 'found' && item.status !== 'returned' && onClaim && (
            <button
              type="button"
              onClick={() => onClaim(item)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all cursor-pointer min-h-[40px]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Claim Item
            </button>
          )}
        </div>
      )}
    </div>
  );
};
