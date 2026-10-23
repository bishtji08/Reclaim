import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  FolderPlus, 
  Users, 
  Flag, 
  Trash2, 
  Edit3, 
  Ban, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  RefreshCw,
  Folder,
  Check
} from 'lucide-react';
import { apiService } from '../../lib/api/client';
import { User, ItemFlag, CategoryItem } from '../../types';

interface AdminHubProps {
  currentUser: User;
  onNavigateItem?: (itemId: string | number) => void;
}

export const AdminHub: React.FC<AdminHubProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'users' | 'flags'>('categories');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);

  // Categories state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', icon: 'box' });

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [selectedUserForBlacklist, setSelectedUserForBlacklist] = useState<User | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  // Flags state
  const [flags, setFlags] = useState<ItemFlag[]>([]);
  const [flagStatusFilter, setFlagStatusFilter] = useState('all');
  const [selectedFlagForReview, setSelectedFlagForReview] = useState<ItemFlag | null>(null);
  const [flagAdminNotes, setFlagAdminNotes] = useState('');

  useEffect(() => {
    if (activeTab === 'categories') fetchCategories();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'flags') fetchFlags();
  }, [activeTab]);

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Categories Handlers
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiService.getCategories();
      if (res.success && res.data) {
        setCategories((res.data.categories || []) as CategoryItem[]);
      }
    } catch {
      showNotification('error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    try {
      setActionLoading(true);
      if (editingCat) {
        await apiService.updateCategory(editingCat.id, catForm);
        showNotification('success', 'Category updated successfully');
      } else {
        await apiService.createCategory(catForm);
        showNotification('success', 'New category created successfully');
      }
      setShowCatModal(false);
      setEditingCat(null);
      setCatForm({ name: '', description: '', icon: 'box' });
      fetchCategories();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save category';
      showNotification('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      setActionLoading(true);
      const res = await apiService.deleteCategory(id);
      if (res.success) {
        showNotification('success', 'Category deleted successfully');
        fetchCategories();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete category';
      showNotification('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Users Handlers
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiService.getUsers({ limit: 100 });
      if (res.success && res.data) {
        setUsers(res.data.users || []);
      }
    } catch {
      showNotification('error', 'Failed to load user records');
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklistUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForBlacklist || !blacklistReason.trim()) return;

    try {
      setActionLoading(true);
      await apiService.blacklistUser(selectedUserForBlacklist.id, blacklistReason.trim());
      showNotification('success', `User ${selectedUserForBlacklist.name} has been blacklisted`);
      setSelectedUserForBlacklist(null);
      setBlacklistReason('');
      fetchUsers();
    } catch {
      showNotification('error', 'Failed to blacklist user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblacklistUser = async (user: User) => {
    if (!window.confirm(`Remove ${user.name} from the moderation blacklist?`)) return;
    try {
      setActionLoading(true);
      await apiService.unblacklistUser(user.id);
      showNotification('success', `User ${user.name} unblacklisted and restored`);
      fetchUsers();
    } catch {
      showNotification('error', 'Failed to unblacklist user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      setActionLoading(true);
      if (user.is_active) {
        await apiService.deactivateUser(user.id);
        showNotification('success', `Account deactivated for ${user.name}`);
      } else {
        await apiService.activateUser(user.id);
        showNotification('success', `Account activated for ${user.name}`);
      }
      fetchUsers();
    } catch {
      showNotification('error', 'Failed to update account activation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (user: User, newRole: 'admin' | 'finder' | 'user') => {
    if (user.id === currentUser.id) {
      showNotification('warning', 'You cannot change your own role.');
      return;
    }
    try {
      setActionLoading(true);
      await apiService.updateUserRole(user.id, newRole);
      showNotification('success', `Role for ${user.name} changed to ${newRole}`);
      fetchUsers();
    } catch {
      showNotification('error', 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  // Flags Handlers
  const fetchFlags = async () => {
    try {
      setLoading(true);
      const res = await apiService.getFlags({ status: flagStatusFilter });
      if (res.success && res.data) {
        setFlags((res.data.flags || []) as unknown as ItemFlag[]);
      }
    } catch {
      showNotification('error', 'Failed to load report flags');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewFlag = async (status: 'reviewed' | 'dismissed' | 'resolved') => {
    if (!selectedFlagForReview) return;
    try {
      setActionLoading(true);
      await apiService.reviewFlag(selectedFlagForReview.id, {
        status,
        admin_notes: flagAdminNotes.trim(),
        clear_suspicion: status === 'dismissed',
      });
      showNotification('success', `Flag updated to ${status}`);
      setSelectedFlagForReview(null);
      setFlagAdminNotes('');
      fetchFlags();
    } catch {
      showNotification('error', 'Failed to update flag');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchQuery =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchQuery && matchRole;
  });

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-4.5 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Administrative Controls
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Moderation & System Governance
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Manage controlled categories, enforce user conduct rules, blacklist offending accounts, and review suspicious item flags.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              if (activeTab === 'categories') fetchCategories();
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'flags') fetchFlags();
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-all backdrop-blur-xs border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between border ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : feedbackMsg.type === 'warning'
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : feedbackMsg.type === 'info'
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold uppercase underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar space-x-4 sm:space-x-8 whitespace-nowrap pb-1">
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FolderPlus className="w-4 h-4" /> Category Management ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" /> User Management & Blacklisting ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'flags'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Flag className="w-4 h-4" /> Suspicious Item Flags ({flags.length})
        </button>
      </div>

      {/* TAB 1: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Campus Item Categories</h3>
              <p className="text-xs text-gray-500">Add or edit classifications used for lost and found reports.</p>
            </div>
            <button
              onClick={() => {
                setEditingCat(null);
                setCatForm({ name: '', description: '', icon: 'box' });
                setShowCatModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <FolderPlus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 inline-block">
                      <Folder className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-mono text-gray-400">ID: {cat.id}</span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900">{cat.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.description || 'No description provided'}</p>

                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {cat.subcategories.map((sub) => (
                        <span key={sub.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingCat(cat);
                      setCatForm({
                        name: cat.name,
                        description: cat.description || '',
                        icon: cat.icon || 'box',
                      });
                      setShowCatModal(true);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: USERS & BLACKLISTING */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">User Moderation & Access Control</h3>
              <p className="text-xs text-gray-500">Search users, update permissions, or blacklist abusive accounts.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="finder">Finders</option>
                <option value="user">Students/Users</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Moderation Flag</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div>{u.name}</div>
                        <div className="text-gray-400 text-[11px] font-mono">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value as 'admin' | 'finder' | 'user')}
                          disabled={u.id === currentUser.id}
                          className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-gray-50 font-semibold"
                        >
                          <option value="user">User</option>
                          <option value="finder">Finder</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_blacklisted ? (
                          <div className="text-rose-600 font-semibold flex items-center gap-1">
                            <Ban className="w-3.5 h-3.5" />
                            <span>Blacklisted: {u.blacklist_reason || 'Violated rules'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Clear</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {u.id !== currentUser.id && (
                          <>
                            {u.is_blacklisted ? (
                              <button
                                onClick={() => handleUnblacklistUser(u)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedUserForBlacklist(u)}
                                className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                              >
                                Blacklist
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleActive(u)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{u.name}</p>
                      <p className="text-[11px] text-gray-400 font-mono truncate max-w-[200px]">{u.email}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase text-[9px] shrink-0 ${
                      u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.is_active ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Role:</span>
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u, e.target.value as 'admin' | 'finder' | 'user')}
                        disabled={u.id === currentUser.id}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-gray-50 font-semibold"
                      >
                        <option value="user">User</option>
                        <option value="finder">Finder</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {u.is_blacklisted && (
                      <span className="text-rose-600 text-[10px] font-bold">Blacklisted</span>
                    )}
                  </div>

                  {u.id !== currentUser.id && (
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-50">
                      {u.is_blacklisted ? (
                        <button
                          onClick={() => handleUnblacklistUser(u)}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedUserForBlacklist(u)}
                          className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 rounded-lg border border-rose-200"
                        >
                          Blacklist
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(u)}
                        className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FLAGS */}
      {activeTab === 'flags' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Suspicious Item Moderation Queue</h3>
              <p className="text-xs text-gray-500">Review suspicious or fraudulent items reported by campus members.</p>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl">
              {(['all', 'pending', 'reviewed', 'dismissed', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFlagStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    flagStatusFilter === st ? 'bg-white shadow-xs text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {flags.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
              <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-bold text-gray-800 text-sm">No Flags Pending</h4>
              <p className="text-xs text-gray-500 mt-1">All reports in the campus lost & found directory are currently in good standing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => (
                <div key={flag.id} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        flag.status === 'pending' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {flag.status}
                      </span>
                      <span className="font-bold text-sm text-gray-900">{flag.item_title || `Item #${flag.item_id}`}</span>
                      <span className="text-xs text-gray-400 capitalize">({flag.item_type || 'item'})</span>
                    </div>

                    <div className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="font-semibold text-gray-900">Reporter Reason: </span>
                      {flag.reason}
                    </div>

                    <div className="text-[11px] text-gray-400 flex items-center gap-2">
                      <span>Flagged by {flag.flagger_name || 'Campus Student'}</span>
                      <span>•</span>
                      <span>{new Date(flag.created_at).toLocaleString()}</span>
                      {flag.admin_notes && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 font-medium">Notes: {flag.admin_notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFlagForReview(flag);
                        setFlagAdminNotes(flag.admin_notes || '');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                    >
                      Take Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {editingCat ? 'Edit Category' : 'Create New Category'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Controlled categories structure lost and found searches across departments.
            </p>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  placeholder="e.g. Laboratory Equipment"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  placeholder="Items that fall into this group..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Icon Identifier</label>
                <input
                  type="text"
                  value={catForm.icon}
                  onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-mono"
                  placeholder="box, laptop, shirt, book..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-xs transition-colors shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BLACKLIST USER */}
      {selectedUserForBlacklist && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-2 text-rose-600 font-bold mb-1">
              <AlertTriangle className="w-5 h-5" /> Moderation Action: Blacklist User
            </div>
            <p className="text-xs text-gray-600 mb-4">
              You are about to blacklist <strong>{selectedUserForBlacklist.name}</strong> ({selectedUserForBlacklist.email}). This will immediately terminate their active session and prohibit login.
            </p>

            <form onSubmit={handleBlacklistUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Blacklist Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={blacklistReason}
                  onChange={(e) => setBlacklistReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-rose-300 rounded-xl focus:ring-rose-500"
                  placeholder="State the violation (e.g. repeated fraudulent claims, offensive reports)..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 rounded-xl text-xs transition-colors shadow-xs"
                >
                  {actionLoading ? 'Applying...' : 'Enforce Blacklist'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserForBlacklist(null);
                    setBlacklistReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW FLAG */}
      {selectedFlagForReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Moderate Flagged Report</h3>
            <p className="text-xs text-gray-500 mb-3">Item: {selectedFlagForReview.item_title}</p>

            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 mb-4">
              <strong>Reported Reason: </strong>{selectedFlagForReview.reason}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Moderator Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={flagAdminNotes}
                  onChange={(e) => setFlagAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
                  placeholder="Notes explaining outcome..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleReviewFlag('resolved')}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs"
                >
                  Resolve Flag
                </button>
                <button
                  onClick={() => handleReviewFlag('dismissed')}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl text-xs shadow-xs"
                >
                  Dismiss Flag
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFlagForReview(null)}
                className="w-full py-2 text-center text-xs font-medium text-gray-500 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
