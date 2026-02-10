import { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useLanguage } from '../hooks/useLanguage';
import type { AppScreen } from '../types';

interface JoinScreenProps {
  setScreen: (screen: AppScreen) => void;
  joinGame: (code: string, name: string) => void;
  watchGame: (code: string, name: string) => void;
  error: string | null;
  initialCode?: string;
}

export default function JoinScreen({ setScreen, joinGame, watchGame, error, initialCode = '' }: JoinScreenProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');

  const canSubmit = code.trim().length === 4 && !!name.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      joinGame(code.trim().toUpperCase(), name.trim());
    }
  };

  const handleWatch = () => {
    if (canSubmit) {
      watchGame(code.trim().toUpperCase(), name.trim());
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
      <button
        onClick={() => setScreen('home')}
        className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Back"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <h2 className="text-2xl font-bold text-white mb-8">{t('join.title')}</h2>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <Input
          value={code}
          onChange={setCode}
          placeholder={t('join.code')}
          maxLength={4}
          monospace
          uppercase
          autoFocus={!initialCode}
        />
        <Input
          value={name}
          onChange={setName}
          placeholder={t('join.name')}
          maxLength={20}
          autoFocus={!!initialCode}
        />
        {error && (
          <p className="text-rose-400 text-sm text-center">{t(`error.${error}` as any)}</p>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {t('join.button')}
        </Button>
        <Button type="button" variant="secondary" disabled={!canSubmit} onClick={handleWatch}>
          {t('join.watch')}
        </Button>
      </form>
    </div>
  );
}
