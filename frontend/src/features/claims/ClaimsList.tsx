import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../lib/api/client';
import { API_BASE_URL } from '../../lib/api/config';
import { Claim, User } from '../../types';
import { useToast } from '../../context/ToastContext';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ShieldCheck, 
  Search, 
  ExternalLink, 
  FileCheck, 
  Eye 
} from 'lucide-react';

interface ClaimsListProps {
  user: User;
  onViewItem?: (itemId: string) => void;
}

export const ClaimsList: React.FC<ClaimsListProps> = ({ user, onViewItem }) => {
  const toast = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'withdrawn'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user.role === 'admin';
  const canReview = isAdmin;
  const canViewAll = isAdmin;

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      if (canViewAll) {
        const res = await apiService.getClaims();
        if (res.success && res.data) {
          setClaims(res.data.claims || []);
        }
      } else {
        const res = await apiService.getMyClaims();
        if (res.success && res.data) {
          setClaims(res.data.claims || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  }, [canViewAll]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleWithdraw = async (claimId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this ownership claim?')) return;
    try {
      setActionLoading(true);
      const res = await apiService.withdrawClaim(claimId);
      if (res.success) {
        toast.info('Claim has been withdrawn successfully.');
        fetchClaims();
        if (selectedClaim?.id === claimId) setSelectedClaim(null);
      }
    } catch {
      toast.error('Failed to withdraw claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (claimId: string, status: 'approved' | 'rejected') => {
    try {
      setActionLoading(true);
      const res = await apiService.reviewClaim(claimId, status, reviewNotes);
      if (res.success) {
        toast.success(`Claim has been ${status} successfully!`);
        setReviewNotes('');
        setSelectedClaim(null);
        fetchClaims();
      }
    } catch {
      toast.error(`Failed to update claim to ${status}.`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            <RotateCcw className="w-3 h-3 mr-1" /> Withdrawn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1" /> Pending Review
          </span>
        );
    }
  };

  const filteredClaims = claims.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (c.item_title || '').toLowerCase().includes(q);
      const nameMatch = (c.claimer_name || c.claimerName || '').toLowerCase().includes(q);
      const emailMatch = (c.claimer_email || c.claimerEmail || '').toLowerCase().includes(q);
      return titleMatch || nameMatch || emailMatch;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              GEU Custody Ledger
            </span>
            <span className="text-xs text-slate-400 font-semibold">•</span>
            <span className="text-xs text-slate-500 font-bold">{filteredClaims.length} records</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {canViewAll ? 'Claims Management & Verification' : 'My Ownership Claims'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {isAdmin
              ? 'Review submitted proof of ownership, inspect verification documents, and approve or reject handovers.'
              : canViewAll
              ? 'View submitted claims. Only administrators can approve or reject claims.'
              : 'Track the status and administration review notes for items you have claimed on campus.'}
          </p>
        </div>

        <button
          onClick={fetchClaims}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Claims
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by campus item title, claimer name, or student email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          {(['all', 'pending', 'approved', 'rejected', 'withdrawn'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Claims Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-xs font-bold">Synchronizing claims registry...</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xs border border-slate-200/80 space-y-3">
          <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto text-blue-600 border border-blue-100">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">No Claims Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
            {searchQuery || statusFilter !== 'all'
              ? 'No claims match your active search or status filters.'
              : canReview
              ? 'There are currently no item claims pending administrative review.'
              : 'You have not submitted any claims yet. Find your missing belongings in the campus directory and file an ownership claim.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white rounded-3xl shadow-xs border border-slate-200/90 hover:shadow-lg hover:border-slate-300 transition-all p-5 sm:p-6 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {claim.item_title || 'Campus Asset'}
                  </h3>
                  {getStatusBadge(claim.status)}
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 font-medium">
                  "{claim.description}"
                </p>

                <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">Claimer:</span>
                    <span className="font-medium text-slate-900">{claim.claimer_name || claim.claimerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">Email:</span>
                    <span className="text-slate-600 truncate max-w-[160px]">{claim.claimer_email || claim.claimerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">Submitted:</span>
                    <span className="font-medium text-slate-700">
                      {new Date(claim.submitted_at || claim.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {claim.review_notes && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="font-bold text-slate-800">Admin Note:</span>{' '}
                      <span className="text-slate-600 italic">{claim.review_notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedClaim(claim)}
                  className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                </button>

                {claim.status === 'pending' && !canViewAll && (
                  <button
                    onClick={() => handleWithdraw(claim.id)}
                    disabled={actionLoading}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Withdraw Claim
                  </button>
                )}

                {isAdmin && claim.status === 'pending' && (
                  <button
                    onClick={() => setSelectedClaim(claim)}
                    className="inline-flex items-center text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Review Claim
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Details Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedClaim.item_title || 'Claim Details'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Verification Record ID #{selectedClaim.id}</p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Verification Status:</span>
                {getStatusBadge(selectedClaim.status)}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Claimer Statement & Identifying Marks:</label>
                <p className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-slate-800 font-medium leading-relaxed">
                  {selectedClaim.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Claimer Name</span>
                  <span className="font-bold text-slate-900">{selectedClaim.claimer_name || selectedClaim.claimerName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Contact Email</span>
                  <span className="font-bold text-slate-900 truncate block">{selectedClaim.claimer_email || selectedClaim.claimerEmail}</span>
                </div>
              </div>

              {/* Attached Proof Documents (Cloudinary Cloud Storage) */}
              {((selectedClaim.proof_images && selectedClaim.proof_images.length > 0) || (selectedClaim.proofImages && selectedClaim.proofImages.length > 0)) && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Attached Ownership Documents:</label>
                  <div className="flex gap-2 flex-wrap">
                    {((selectedClaim.proof_images || selectedClaim.proofImages || []) as Array<string | { id?: number; url: string }>).map((proofDoc, i) => {
                      const rawUrl = typeof proofDoc === 'string' ? proofDoc : proofDoc.url;
                      const backendBase = API_BASE_URL.replace(/\/api$/, '');
                      const docUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') 
                        ? rawUrl 
                        : `${backendBase}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

                      return (
                        <a
                          key={i}
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold hover:bg-blue-100 transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5" /> Proof Document #{i + 1}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Administrative Review Controls — Admin Only */}
              {isAdmin && selectedClaim.status === 'pending' && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                      Admin Decision
                    </label>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Decision Notes (optional):
                    </label>
                    <textarea
                      rows={2}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add handover instructions, security desk pickup code, or rejection reasons..."
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReview(selectedClaim.id, 'approved')}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Claim
                    </button>
                    <button
                      onClick={() => handleReview(selectedClaim.id, 'rejected')}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" /> Reject Claim
                    </button>
                  </div>
                </div>
              )}

              {/* Finder-only info notice */}
              {!isAdmin && canViewAll && selectedClaim.status === 'pending' && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span><strong>Admin action required.</strong> Only administrators can approve or reject claims. Please escalate this claim to an admin for final decision.</span>
                  </div>
                </div>
              )}

              {onViewItem && selectedClaim.item_id && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const id = selectedClaim.item_id;
                      setSelectedClaim(null);
                      onViewItem(String(id));
                    }}
                    className="w-full py-2 px-3 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    View Original Listing in Campus Directory <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
