import React, { useState, useEffect } from 'react';
import { Search, Eye, EyeOff, Loader2, AlertCircle, X, Mail, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { apiService } from '../../lib/api/client';
import { AuthError } from '../../hooks/useAuth';

export type AuthMode = 'login' | 'register' | 'verify-notice' | 'forgot-password' | 'reset-password';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<unknown>;
  onRegister: (userData: { email: string; password: string; name: string; phone?: string }) => Promise<unknown>;
  loading: boolean;
  postAuthAction?: string | null;
  onSuccess?: (action?: string | null) => void;
  initialEmail?: string;
  resetToken?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onLogin,
  onRegister,
  loading: externalLoading,
  postAuthAction,
  onSuccess,
  initialEmail = '',
  resetToken = '',
}) => {
  const toast = useToast();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string; general?: string }>({});

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyNoticeEmail, setVerifyNoticeEmail] = useState(initialEmail);

  useEffect(() => {
    setMode(initialMode);
    if (initialEmail) {
      setEmail(initialEmail);
      setVerifyNoticeEmail(initialEmail);
    }
  }, [initialMode, initialEmail, isOpen]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: { name?: string; email?: string; password?: string; confirmPassword?: string; general?: string } = {};

    if (mode === 'register') {
      if (name.trim().length < 2) {
        newErrors.name = 'Full name must be at least 2 characters';
      }
    }

    if (mode === 'login' || mode === 'register' || mode === 'forgot-password') {
      if (!email.trim()) {
        newErrors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newErrors.email = 'Please provide a valid university email address';
      }
    }

    if (mode === 'login' || mode === 'register') {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (
        mode === 'register' &&
        (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))
      ) {
        newErrors.password = 'Password must be at least 10 characters with uppercase, lowercase, and a number';
      }
    }

    if (mode === 'reset-password') {
      if (
        !password ||
        password.length < 10 ||
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/\d/.test(password)
      ) {
        newErrors.password = 'Password must be at least 10 characters with uppercase, lowercase, and a number';
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) return;

    if (mode === 'login') {
      try {
        await onLogin(email.trim(), password);
        toast.success('Welcome back to REclaim!');
        onSuccess?.(postAuthAction);
        onClose();
      } catch (err: unknown) {
        const authErr = err as AuthError;
        if (authErr.requiresVerification) {
          setVerifyNoticeEmail(authErr.email || email.trim());
          setMode('verify-notice');
          toast.warning('Please confirm your email address before logging in.', 'Email Unverified');
        } else {
          setErrors({ general: authErr.message || 'Invalid credentials' });
          toast.error(authErr.message || 'Invalid credentials. Please check your details.');
        }
      }
    } else if (mode === 'register') {
      try {
        await onRegister({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim() || undefined
        });
        setVerifyNoticeEmail(email.trim());
        setMode('verify-notice');
        toast.success('Registration successful! Please check your email for the verification link.', 'Account Created');
      } catch (err: unknown) {
        const authErr = err as AuthError;
        if (authErr.requiresVerification) {
          setVerifyNoticeEmail(email.trim());
          setMode('verify-notice');
          toast.info('An unconfirmed account exists with this email. Please verify your address.');
        } else {
          setErrors({ general: authErr.message || 'Registration failed' });
          toast.error(authErr.message || 'Registration failed');
        }
      }
    } else if (mode === 'forgot-password') {
      try {
        setActionLoading(true);
        const res = await apiService.forgotPassword(email.trim());
        setActionLoading(false);
        toast.success(res.message || 'If an account exists, a reset link was sent.', 'Reset Link Sent');
        setMode('login');
      } catch (err: unknown) {
        setActionLoading(false);
        const msg = (err as Error).message || 'Failed to send reset link';
        setErrors({ general: msg });
        toast.error(msg);
      }
    } else if (mode === 'reset-password') {
      try {
        setActionLoading(true);
        const res = await apiService.resetPassword({
          token: resetToken,
          email: email.trim(),
          newPassword: password
        });
        setActionLoading(false);
        toast.success(res.message || 'Password has been reset! Please sign in.', 'Password Reset');
        setMode('login');
      } catch (err: unknown) {
        setActionLoading(false);
        const msg = (err as Error).message || 'Failed to reset password';
        setErrors({ general: msg });
        toast.error(msg);
      }
    }
  };

  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || !verifyNoticeEmail) return;

    try {
      setActionLoading(true);
      const res = await apiService.resendConfirmation(verifyNoticeEmail);
      setActionLoading(false);
      setResendCooldown(45); // 45s cooldown
      if (res.alreadyVerified) {
        toast.info('Your email is already confirmed! Please sign in.');
        setMode('login');
      } else {
        toast.success('A fresh verification link has been dispatched to your email.');
      }
    } catch (err: unknown) {
      setActionLoading(false);
      const msg = (err as Error).message || 'Failed to resend confirmation email';
      toast.error(msg);
    }
  };

  const isSubmitting = externalLoading || actionLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. VERIFY EMAIL NOTICE SCREEN */}
        {mode === 'verify-notice' ? (
          <div className="text-center py-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl border border-blue-100 shadow-sm mx-auto">
              <Mail className="w-8 h-8 stroke-[2]" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Verify Your Email Address</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                We sent a secure confirmation link to <span className="font-bold text-slate-800 break-all">{verifyNoticeEmail}</span>.
              </p>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-left text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" /> Campus Security Policy
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800/90">
                Unverified accounts are prevented from accessing campus dashboards or filing claims. Please click the verification link in your inbox.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendCooldown > 0 || isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 transition-all disabled:opacity-60 cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? '' : 'hover:rotate-180 transition-transform'}`} />
                )}
                {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Verification Email'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : mode === 'forgot-password' ? (
          /* 2. FORGOT PASSWORD SCREEN */
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center pt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm mb-3">
                <KeyRound className="w-6 h-6 stroke-[2]" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Reset Account Password</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your university email to receive a secure password reset link.
              </p>
            </div>

            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${errors.email ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/40 hover:bg-white'
                    }`}
                  placeholder="student@geu.ac.in"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          </div>
        ) : mode === 'reset-password' ? (
          /* 3. RESET PASSWORD SCREEN */
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center pt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm mb-3">
                <KeyRound className="w-6 h-6 stroke-[2]" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Set New Password</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your new account password below.
              </p>
            </div>

            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${errors.password ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/40 hover:bg-white'
                      }`}
                    placeholder="10+ chars, uppercase, lowercase & number"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${errors.confirmPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/40 hover:bg-white'
                    }`}
                  placeholder="Re-enter new password"
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </form>
          </div>
        ) : (
          /* 4. SIGN IN & REGISTER SCREENS */
          <>
            <div className="text-center pt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 mb-3 text-white">
                <Search className="w-6 h-6 stroke-[2.25]" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {mode === 'register' ? 'Create ReClaim Account' : 'Sign In to ReClaim'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Campus Asset Recovery
              </p>

              {postAuthAction && (
                <div className="mt-2.5 inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                  Authenticate to: <span className="capitalize">{postAuthAction.replace('-', ' ')}</span>
                </div>
              )}
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${mode === 'login' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrors({});
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${mode === 'register' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {errors.general && (
              <div className="p-3.5 bg-red-50/80 border border-red-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors({ ...errors, name: undefined });
                      }}
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${errors.name ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/40 hover:bg-white'
                        }`}
                      placeholder="Geetanjali"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-slate-50/40 hover:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${errors.email ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/40 hover:bg-white'
                    }`}
                  placeholder="geetanjali@geu.ac.in"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot-password');
                        setErrors({});
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 transition-all ${errors.password ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/40 hover:bg-white'
                      }`}
                    placeholder={mode === 'register' ? '*************' : 'Enter password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'register' ? (
                  'Create Account'
                ) : (
                  'Sign In to Portal'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
