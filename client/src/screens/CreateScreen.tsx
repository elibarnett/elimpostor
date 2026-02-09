import { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useLanguage } from '../hooks/useLanguage';
import type { AppScreen } from '../types';

interface CreateScreenProps {
  setScreen: (screen: AppScreen) => void;
  createGame: (name: string) => void;
  error: string | null;
}

export default function CreateScreen({ setScreen, createGame, error }: CreateScreenProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) createGame(name.trim());
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

      <h2 className="text-2xl font-bold text-white mb-8">{t('create.title')}</h2>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <Input
          value={name}
          onChange={setName}
          placeholder={t('create.name')}
          maxLength={20}
          autoFocus
        />
        {error && (
          <p className="text-rose-400 text-sm text-center">{t(`error.${error}` as any)}</p>
        )}
        <Button type="submit" disabled={!name.trim()}>
          {t('create.button')}
        </Button>
      </form>
    </div>
  );
}
