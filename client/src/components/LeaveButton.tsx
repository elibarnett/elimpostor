import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface LeaveButtonProps {
  isHost: boolean;
  onLeave: () => void;
}

export default function LeaveButton({ isHost, onLeave }: LeaveButtonProps) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70"
          onClick={() => setConfirming(false)}
        />
        {/* Modal */}
        <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
          <h3 className="text-xl font-bold text-white text-center mb-2">
            {t('leave.confirm')}
          </h3>
          <p className="text-slate-400 text-sm text-center mb-6">
            {isHost ? t('leave.hostWarning') : t('leave.playerWarning')}
          </p>
          <div className="space-y-2">
            <button
              onClick={onLeave}
              className="w-full h-12 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer active:scale-[0.97]"
            >
              {t('leave.yes')}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="w-full h-12 rounded-xl font-bold text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer active:scale-[0.97]"
            >
              {t('leave.cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="absolute top-4 left-4 z-10 text-slate-400 hover:text-white transition-colors cursor-pointer"
      aria-label="Leave game"
    >
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
}
