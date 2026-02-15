import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import type { GameSettings } from '../types';

interface SettingsPanelProps {
  settings: GameSettings;
  isHost: boolean;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}

function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 gap-1">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => !disabled && onChange(opt.value)}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            disabled ? 'cursor-default' : 'cursor-pointer'
          } ${
            value === opt.value
              ? 'bg-violet-600 text-white'
              : disabled
                ? 'text-slate-500'
                : 'text-slate-400 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const PRESETS = {
  classic: {
    clueTimer: 30 as const,
    votingStyle: 'anonymous' as const,
    maxRounds: 1 as const,
    allowSkip: true,
    elimination: false,
  },
  extended: {
    clueTimer: 45 as const,
    votingStyle: 'public' as const,
    maxRounds: 2 as const,
    allowSkip: true,
    elimination: true,
  },
};

export default function SettingsPanel({ settings, isHost, onUpdateSettings }: SettingsPanelProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const timerLabel = settings.clueTimer === 0 ? t('settings.clueTimerUnlimited') : `${settings.clueTimer}s`;
  const votingLabel = settings.votingStyle === 'public' ? t('settings.votingPublic') : t('settings.votingAnonymous');
  const summary = `${timerLabel} · ${votingLabel} · ${settings.maxRounds} ${settings.maxRounds === 1 ? 'round' : 'rounds'}`;

  return (
    <div className="max-w-sm mx-auto">
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-1 cursor-pointer"
      >
        <p className="text-slate-400 text-xs uppercase tracking-wide">
          {t('settings.title')}
        </p>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="text-slate-500 text-xs">{summary}</span>
          )}
          <span className={`text-slate-400 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded settings */}
      {isOpen && (
        <div className="space-y-4 animate-fade-in mt-1">
          {/* Presets */}
          {isHost && (
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateSettings(PRESETS.classic)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 transition-all cursor-pointer"
              >
                {t('settings.presetClassic')}
              </button>
              <button
                onClick={() => onUpdateSettings(PRESETS.extended)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 transition-all cursor-pointer"
              >
                {t('settings.presetExtended')}
              </button>
            </div>
          )}

          {/* Clue Timer */}
          <div>
            <p className="text-slate-400 text-xs mb-1.5">{t('settings.clueTimer')}</p>
            <SegmentedControl
              options={[
                { value: 15, label: '15s' },
                { value: 30, label: '30s' },
                { value: 45, label: '45s' },
                { value: 60, label: '60s' },
                { value: 0, label: t('settings.clueTimerUnlimited') },
              ]}
              value={settings.clueTimer}
              onChange={(v) => onUpdateSettings({ clueTimer: v as GameSettings['clueTimer'] })}
              disabled={!isHost}
            />
          </div>

          {/* Voting Style */}
          <div>
            <p className="text-slate-400 text-xs mb-1.5">{t('settings.votingStyle')}</p>
            <SegmentedControl
              options={[
                { value: 'anonymous', label: t('settings.votingAnonymous') },
                { value: 'public', label: t('settings.votingPublic') },
              ]}
              value={settings.votingStyle}
              onChange={(v) => onUpdateSettings({ votingStyle: v as GameSettings['votingStyle'] })}
              disabled={!isHost}
            />
          </div>

          {/* Max Rounds */}
          <div>
            <p className="text-slate-400 text-xs mb-1.5">{t('settings.maxRounds')}</p>
            <SegmentedControl
              options={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
              ]}
              value={settings.maxRounds}
              onChange={(v) => onUpdateSettings({ maxRounds: v as GameSettings['maxRounds'] })}
              disabled={!isHost}
            />
          </div>

          {/* Allow Skip */}
          <div>
            <p className="text-slate-400 text-xs mb-1.5">{t('settings.allowSkip')}</p>
            <SegmentedControl
              options={[
                { value: 'on', label: t('settings.on') },
                { value: 'off', label: t('settings.off') },
              ]}
              value={settings.allowSkip ? 'on' : 'off'}
              onChange={(v) => onUpdateSettings({ allowSkip: v === 'on' })}
              disabled={!isHost}
            />
          </div>
        </div>
      )}
    </div>
  );
}
