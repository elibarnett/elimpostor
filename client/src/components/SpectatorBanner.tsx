import { useLanguage } from '../hooks/useLanguage';

interface SpectatorBannerProps {
  canConvert: boolean;
  onConvert: () => void;
  isEliminated?: boolean;
}

export default function SpectatorBanner({ canConvert, onConvert, isEliminated = false }: SpectatorBannerProps) {
  const { t } = useLanguage();

  return (
    <div className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-sm text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-3 ${
      isEliminated ? 'bg-slate-600/90' : 'bg-amber-600/90'
    }`}>
      <span>{isEliminated ? t('elimination.banner') : t('spectator.banner')}</span>
      {canConvert && !isEliminated && (
        <button
          onClick={onConvert}
          className="text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 transition-colors cursor-pointer"
        >
          {t('spectator.joinAsPlayer')}
        </button>
      )}
    </div>
  );
}
