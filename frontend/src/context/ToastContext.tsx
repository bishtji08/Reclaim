import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 5000 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', title: title || 'Success', message });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', title: title || 'Error', message });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', title: title || 'Notice', message });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', title: title || 'Warning', message });
  }, [showToast]);

  const value = React.useMemo(() => ({
    toasts, showToast, success, error, info, warning, removeToast
  }), [toasts, showToast, success, error, info, warning, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => {
          let bgClass = 'bg-slate-900 text-white border-slate-800';
          let iconColor = 'text-blue-400';
          let Icon = Info;

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-950/95 text-emerald-50 border-emerald-800/80 shadow-emerald-950/20';
            iconColor = 'text-emerald-400';
            Icon = CheckCircle2;
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-950/95 text-rose-50 border-rose-800/80 shadow-rose-950/20';
            iconColor = 'text-rose-400';
            Icon = AlertCircle;
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-950/95 text-amber-50 border-amber-800/80 shadow-amber-950/20';
            iconColor = 'text-amber-400';
            Icon = AlertTriangle;
          } else {
            bgClass = 'bg-slate-950/95 text-slate-100 border-slate-800/80 shadow-slate-950/20';
            iconColor = 'text-blue-400';
            Icon = Info;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${bgClass}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && <h5 className="text-xs font-bold tracking-tight mb-0.5">{toast.title}</h5>}
                <p className="text-xs font-medium leading-relaxed opacity-90 break-words">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/60 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
