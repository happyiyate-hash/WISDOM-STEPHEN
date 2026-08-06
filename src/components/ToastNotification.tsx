import React, { useEffect } from 'react';
import { Sparkles, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  onAction?: () => void;
  actionText?: string;
  duration?: number;
}

export const ToastNotification: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  onAction,
  actionText,
  duration = 5000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92vw] sm:w-96 animate-in slide-in-from-top-6 fade-in duration-300 pointer-events-auto shadow-2xl">
      <div className="bg-[#0B0F19]/95 border border-emerald-500/40 backdrop-blur-xl shadow-[0_12px_40px_rgba(16,185,129,0.25)] rounded-2xl p-3.5 text-white flex items-start space-x-3 relative overflow-hidden">
        {/* Glow ambient circle */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Icon */}
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
          {type === 'success' ? (
            <Sparkles className="w-4 h-4 fill-emerald-400/20" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
        </div>

        {/* Text Body */}
        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
            {type === 'success' ? 'Token Saved' : 'Notification'}
          </h4>
          <p className="text-xs text-zinc-200 mt-0.5 leading-snug font-medium">
            {message}
          </p>

          {onAction && actionText && (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="mt-2 text-[10px] bg-emerald-500 hover:bg-emerald-400 text-black px-2.5 py-1 rounded-lg font-bold transition-all shadow-md cursor-pointer inline-flex items-center space-x-1"
            >
              <span>{actionText}</span>
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
