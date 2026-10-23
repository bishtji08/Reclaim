import React, { useState } from 'react';
import { Star, X, Loader2 } from 'lucide-react';
import { apiService } from '../../lib/api/client';
import { Item } from '../../types';
import { useToast } from '../../context/ToastContext';

interface ReviewModalProps {
  item: Item;
  claimId?: string | number;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ item, claimId, onClose, onSuccess }) => {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wasReturned, setWasReturned] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.submitReview({
        item_id: item.id,
        claim_id: claimId,
        rating,
        comment: comment.trim() || undefined,
        was_returned: wasReturned,
      });

      if (res.success) {
        toast.success('Thank you! Your testimonial has been logged to the campus trust ledger.', 'Review Submitted');
        onSuccess();
        onClose();
      } else {
        const msg = res.message || 'Failed to submit review';
        setError(msg);
        toast.error(msg);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit review';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="p-2 sm:p-2.5 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200 shrink-0">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 text-amber-500" />
            </span>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900">Campus Trust Feedback</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Rate your item recovery experience</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recovered Asset</span>
            <div className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80">
              {item.title}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Overall Service Rating *
            </label>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 sm:p-1 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-black text-slate-800 ml-1 sm:ml-2">
                {rating === 5 ? 'Exceptional' : rating === 4 ? 'Great' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80">
            <input
              type="checkbox"
              id="wasReturnedCheck"
              checked={wasReturned}
              onChange={(e) => setWasReturned(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="wasReturnedCheck" className="text-xs font-bold text-blue-950 cursor-pointer">
              Item was successfully returned to its rightful owner
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Comments & Testimonial (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white"
              placeholder="Share how smoothly the exchange went, helpful security personnel, or recommendations..."
            />
          </div>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-2xl border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Submitting Feedback...' : 'Post Community Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
