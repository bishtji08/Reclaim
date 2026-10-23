import React, { useState } from 'react';
import { apiService } from '../../lib/api/client';
import { User } from '../../types';
import { 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  KeyRound,
  Loader2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface UserSettingsProps {
  user: User;
  onProfileUpdated: (user: User) => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ user, onProfileUpdated }) => {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');

    if (name.trim().length < 2) {
      setProfileError('Name must be at least 2 characters');
      toast.error('Name must be at least 2 characters');
      return;
    }

    try {
      setProfileSaving(true);
      const response = await apiService.updateProfile({ name: name.trim(), phone: phone.trim() || undefined });
      if (response.success && response.data) {
        setProfileSuccess('Profile details updated successfully!');
        toast.success('Your profile details have been saved securely!');
        onProfileUpdated(response.data.user);
      } else {
        const msg = response.message || 'Failed to update profile';
        setProfileError(msg);
        toast.error(msg);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to update profile';
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 10 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      const msg = 'Password must be at least 10 characters with uppercase, lowercase, and a number';
      setPasswordError(msg);
      toast.error(msg);
      return;
    }
    if (newPassword !== confirmPassword) {
      const msg = 'New passwords do not match';
      setPasswordError(msg);
      toast.error(msg);
      return;
    }

    try {
      setPasswordSaving(true);
      const response = await apiService.changePassword(currentPassword, newPassword);
      if (response.success) {
        setPasswordSuccess('Password changed successfully!');
        toast.success('Your password has been changed securely!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const msg = response.message || 'Failed to change password';
        setPasswordError(msg);
        toast.error(msg);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to change password';
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            Account Management
          </span>
          <span className="text-xs text-slate-400 font-semibold">•</span>
          <span className="text-xs text-slate-500 font-bold capitalize">{user.role} Profile</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
          Account & Security Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          Manage your Graphic Era University contact details and authentication credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
        
        {/* Profile Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/90 p-4.5 sm:p-8 flex flex-col justify-between space-y-5 sm:space-y-6">
          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs sm:text-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Personal Profile</h3>
                <p className="text-xs text-slate-500">Contact and identification details</p>
              </div>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-center gap-2 border border-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {profileError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GEU Email Address</label>
              <div className="flex items-center px-3.5 py-2.5 bg-slate-100/80 rounded-xl text-xs text-slate-600 border border-slate-200">
                <Mail className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
                <span className="ml-auto text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Security / Password Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/90 p-4.5 sm:p-8 flex flex-col justify-between space-y-5 sm:space-y-6">
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs sm:text-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Security Credentials</h3>
                <p className="text-xs text-slate-500">Update your account authentication password</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-center gap-2 border border-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {passwordError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500"
                placeholder="10+ chars, uppercase, lowercase & number"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500"
                placeholder="Re-enter new password"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {passwordSaving ? 'Updating Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
