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
    <div className="fixed top-0 inset-x-0 z-50 w-full animate-in slide-in-from-top-full duration-300 pointer-events-auto shadow-2xl">
      <div className="bg-[#090C12]/98 border-b border-emerald-500/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] px-4 py-3 text-white flex items-center justify-between w-full relative overflow-hidden">
        {/* Subtle ambient accent background glow */}
        <div className="absolute inset-y-0 left-0 w-2 bg-[#22C55E]" />

        {/* Content Container */}
        <div className="flex items-center space-x-3 min-w-0 flex-1 pl-2 pr-4">
          {/* Icon */}
          <div className="w-7 h-7 rounded-lg bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center text-[#4ADE80] shrink-0">
            {type === 'success' ? (
              <Sparkles className="w-3.5 h-3.5 text-[#4ADE80]" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>

          {/* Text message */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-100 truncate">
              {message}
            </p>
          </div>

          {/* Action button if provided */}
          {onAction && actionText && (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="text-[10px] bg-[#22C55E] hover:bg-emerald-400 text-black px-2.5 py-1 rounded-lg font-extrabold transition-all cursor-pointer shrink-0 uppercase tracking-wider"
            >
              {actionText}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
