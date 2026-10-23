import React, { useState, useEffect } from 'react';
import { apiService, PotentialMatch } from '../../lib/api/client';
import {
  X,
  AlertTriangle,
  Package,
  Sparkles,
  CheckCircle2,
  Flag,
  Star,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Item, Review, User } from '../../types';
import { ReviewModal } from '../reviews/ReviewModal';
import { useToast } from '../../context/ToastContext';

interface ItemModalProps {
  item: Item;
  onClose: () => void;
  onClaimSuccess?: () => void;
  user?: User | null;
  onOpenAuth?: (mode?: 'login' | 'register', postAction?: string) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ item, onClose, onClaimSuccess, user, onOpenAuth }) => {
  const toast = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    description: ''
  });
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [claimLoading, setClaimLoading] = useState(false);
  const [matches, setMatches] = useState<PotentialMatch[]>([]);

  // Flag state
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagLoading, setFlagLoading] = useState(false);

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [itemReviews, setItemReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await apiService.getItemMatches(item.id);
        if (res.success && res.data) {
          setMatches(res.data.matches || []);
        }
      } catch {
        // silent
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await apiService.getItemReviews(item.id);
        if (res.success && res.data) {
          setItemReviews((res.data.reviews || []) as unknown as Review[]);
        }
      } catch {
        // silent
      }
    };

    fetchMatches();
    fetchReviews();
  }, [item.id]);

  const images = item.images && item.images.length > 0 ? item.images : [];

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.name.trim() || !claimForm.email.trim() || !claimForm.description.trim()) {
      toast.error('Please fill out all required fields');
      return;
    }

    if (claimForm.description.trim().length < 20) {
      toast.error('Please provide a more detailed proof of ownership (at least 20 characters required).');
      return;
    }

    try {
      setClaimLoading(true);
      const formData = new FormData();
      formData.append('item_id', item.id);
      formData.append('claimer_name', claimForm.name.trim());
      formData.append('claimer_email', claimForm.email.trim());
      formData.append('claimer_phone', claimForm.phone.trim());
      formData.append('description', claimForm.description.trim());

      proofFiles.forEach((file) => {
        formData.append('proof_images', file);
      });

      const response = await apiService.createClaim(formData);
      if (response.success) {
        toast.success('Claim submitted successfully! Campus administrators will review your verification details.', 'Claim Submitted');
        setShowClaimForm(false);
        if (onClaimSuccess) onClaimSuccess();
        onClose();
      } else {
        toast.error(response.message || 'Failed to submit claim');
      }
    } catch (error: unknown) {
      console.error('Failed to submit claim:', error);
      const apiErr = error as { response?: { data?: { message?: string; errors?: Array<{ msg?: string }> } }; message?: string };
      const validationMsg = apiErr.response?.data?.errors?.[0]?.msg;
      const message = validationMsg || apiErr.response?.data?.message || apiErr.message || 'Failed to submit claim. Please try again.';
      toast.error(message);
    } finally {
      setClaimLoading(false);
    }
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagReason.trim()) return;

    try {
      setFlagLoading(true);
      await apiService.flagItem(item.id, flagReason.trim());
      toast.success('Item report has been flagged for campus moderation review.', 'Flag Submitted');
      setShowFlagModal(false);
      setFlagReason('');
    } catch {
      toast.error('Failed to submit report flag.');
    } finally {
      setFlagLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">

        {/* Header Bar */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${item.type === 'lost'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}>
                {item.type} Item
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                Status: {item.status}
              </span>

              {item.isUrgent && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1 shadow-xs">
                  <AlertTriangle className="w-3 h-3" /> Urgent Priority
                </span>
              )}

              {item.is_suspicious && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white flex items-center gap-1 shadow-xs">
                  <Flag className="w-3 h-3" /> Under Moderation
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{item.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!user) {
                  onOpenAuth?.('login');
                  return;
                }
                setShowFlagModal(true);
              }}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors cursor-pointer"
              title="Flag as Suspicious / Inappropriate"
            >
              <Flag className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Suspicious Listing Banner */}
        {item.is_suspicious && (
          <div className="mx-6 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-medium">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <div>
              <strong>Campus Safety Notice:</strong> This listing has been flagged by community members as potentially suspicious or inaccurate and is currently undergoing administrative moderation.
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Gallery Column */}
            <div className="space-y-3">
              <div className="relative h-72 sm:h-80 bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 flex items-center justify-center">
                {images.length > 0 ? (
                  <img
                    src={images[currentImageIndex]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-400 space-y-2">
                    <Package className="w-14 h-14 mx-auto stroke-[1.25] text-slate-500" />
                    <p className="text-xs font-semibold">No photographic evidence attached</p>
                  </div>
                )}

                {images.length > 1 && (
                  <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between">
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                      className="w-9 h-9 rounded-2xl bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-slate-800 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                      className="w-9 h-9 rounded-2xl bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-slate-800 transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-14 h-14 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${idx === currentImageIndex ? 'border-blue-600 scale-95 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Information Column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Item Description
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80 font-medium">
                  {item.description}
                </p>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Category</span>
                  <span className="font-extrabold text-slate-900">{item.category}</span>
                  {item.subcategory && <span className="text-[11px] text-slate-500 block truncate">/ {item.subcategory}</span>}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Location</span>
                  <span className="font-extrabold text-slate-900">{item.location?.name || 'Graphic Era Campus'}</span>
                  {item.specific_location && <span className="text-[11px] text-slate-500 block truncate">({item.specific_location})</span>}
                </div>

                {item.color && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Primary Color</span>
                    <span className="font-extrabold text-slate-900">{item.color}</span>
                  </div>
                )}

                {(item.brand || item.model) && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Brand / Model</span>
                    <span className="font-extrabold text-slate-900">{[item.brand, item.model].filter(Boolean).join(' ')}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Logged Date</span>
                  <span className="font-extrabold text-slate-900">
                    {new Date(item.reportedAt).toLocaleDateString()}
                  </span>
                </div>

                {item.rewardOffered && item.rewardOffered > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950">
                    <span className="text-[10px] font-extrabold uppercase text-emerald-700 block mb-0.5">Reward Offered</span>
                    <span className="font-black text-sm text-emerald-800">${item.rewardOffered}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map(t => (
                      <span key={t} className="px-2.5 py-1 rounded-xl text-xs bg-slate-100 text-slate-700 font-bold border border-slate-200/60">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Actions */}
              {item.type === 'found' && item.status === 'reported' && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (!user) {
                        onOpenAuth?.('login', 'claim');
                        return;
                      }
                      setShowClaimForm(true);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> This Belongs to Me — File Ownership Claim
                  </button>
                </div>
              )}

              {(item.status === 'returned' || item.status === 'claimed') && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (!user) {
                        onOpenAuth?.('login');
                        return;
                      }
                      setShowReviewModal(true);
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Star className="w-4 h-4 fill-white" /> Leave Community Recovery Review
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Automated Multi-Criteria Intelligent Matches Section */}
          {matches.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900">
                  Potential Relational Matches ({matches.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Matches calculated by the GEU multi-criteria matching engine:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches.map((m) => (
                  <div key={m.match_id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[70%]">{m.match_title}</span>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-900 border border-amber-500/30 text-[10px] font-black rounded-full">
                        {Math.round((m.match_score || 0) * 100)}% Match
                      </span>
                    </div>
                    {m.match_reasons && (
                      <p className="text-[11px] text-slate-500">
                        Compatible on: {m.match_reasons.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Community Reviews List */}
          {itemReviews.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">Community Recovery Reviews</h3>
              </div>

              <div className="space-y-2.5">
                {itemReviews.map(r => (
                  <div key={r.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{r.reviewer_name || 'GEU Student'}</span>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current' : 'text-slate-300'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-slate-600 italic">"{r.comment}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Claim Drawer / Form Modal */}
      {showClaimForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Submit Ownership Claim</h3>
                <p className="text-xs text-slate-500 mt-0.5">Verification for: <span className="font-bold text-slate-800">{item.title}</span></p>
              </div>
              <button onClick={() => setShowClaimForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={claimForm.name}
                  onChange={(e) => setClaimForm({ ...claimForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  placeholder="e.g. Sarthak Bisht"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email </label>
                <input
                  type="email"
                  required
                  value={claimForm.email}
                  onChange={(e) => setClaimForm({ ...claimForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={claimForm.phone}
                  onChange={(e) => setClaimForm({ ...claimForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-700">Detailed Proof of Ownership *</label>
                  <span className={`text-[10px] font-bold ${claimForm.description.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {claimForm.description.trim().length}/20 chars min
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={claimForm.description}
                  onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  placeholder="State private distinctive marks, lock screen wallpapers, unique serials, or contents not shown in photos..."
                />
              </div>

              {/* Private Proof Documents Attachment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Supporting Proof Documents (Optional)</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArray = Array.from(e.target.files);
                      const valid = filesArray.filter(f => f.size <= 10 * 1024 * 1024);
                      setProofFiles(valid.slice(0, 3));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">Receipts, ID cards, or purchase invoices. Max 10MB per file (Private cloud storage).</p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowClaimForm(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {claimLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag Report Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-600" /> Flag Item for Review
              </h3>
              <button onClick={() => setShowFlagModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFlagSubmit} className="space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed font-medium">
                Why are you reporting this listing? University security and administrators will investigate.
              </p>
              <textarea
                required
                rows={3}
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                placeholder="e.g. Inappropriate photo, spam post, deceptive claim, duplicate listing..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFlagModal(false)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flagLoading}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {flagLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Flag Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Community Review Modal */}
      {showReviewModal && (
        <ReviewModal
          item={item}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            setShowReviewModal(false);
            toast.success('Your feedback has been published to the campus trust ledger!');
          }}
        />
      )}
    </div>
  );
};
