import { useLanguage } from '../hooks/useLanguage';

interface SpectatorBannerProps {
  canConvert: boolean;
  onConvert: () => void;
}

export default function SpectatorBanner({ canConvert, onConvert }: SpectatorBannerProps) {
  const { t } = useLanguage();

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-amber-600/90 backdrop-blur-sm text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-3">
      <span>{t('spectator.banner')}</span>
      {canConvert && (
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
