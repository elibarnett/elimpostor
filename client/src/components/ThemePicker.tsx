import { THEMES } from '../themes';
import { useLanguage } from '../hooks/useLanguage';
import type { ThemeId } from '../types';

interface ThemePickerProps {
  value: ThemeId;
  isHost: boolean;
  onChange: (theme: ThemeId) => void;
}

export default function ThemePicker({ value, isHost, onChange }: ThemePickerProps) {
  const { t } = useLanguage();

  return (
    <div>
      <p className="text-slate-400 text-xs mb-1.5">{t('settings.theme')}</p>
      <div className="flex gap-2 flex-wrap">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => isHost && onChange(theme.id)}
            title={t(`theme.${theme.id}` as Parameters<typeof t>[0])}
            disabled={!isHost}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all text-xs font-medium min-w-[3.5rem] ${
              isHost ? 'cursor-pointer' : 'cursor-default'
            } ${
              value === theme.id
                ? 'border-[var(--accent-border)] bg-slate-700/60 scale-105'
                : isHost
                  ? 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-700/40'
                  : 'border-slate-700/60 bg-slate-800/40 opacity-70'
            }`}
            style={value === theme.id ? { borderColor: theme.accentBorder } : undefined}
          >
            <span className="text-xl">{theme.emoji}</span>
            <span className="text-slate-300 text-[10px]">{t(`theme.${theme.id}` as Parameters<typeof t>[0])}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
