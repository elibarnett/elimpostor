import { useState } from 'react';
import Button from '../components/Button';
import CategoryPicker from '../components/CategoryPicker';
import Input from '../components/Input';
import WaitingDots from '../components/WaitingDots';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

interface SetupScreenProps {
  gameState: GameState;
  setWord: (word: string, category?: string) => void;
}

export default function SetupScreen({ gameState, setWord }: SetupScreenProps) {
  const { t } = useLanguage();
  const [word, setWordInput] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (word.trim()) setWord(word.trim(), category);
  };

  const handleWordSelected = (selectedWord: string, selectedCategory: string) => {
    setWordInput(selectedWord);
    setCategory(selectedCategory);
  };

  if (!gameState.isHost) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="text-6xl mb-6 animate-pulse">🔍</div>
        <p className="text-slate-400 text-lg text-center">
          {t('setup.waiting', { host: gameState.hostName })}
        </p>
        <div className="mt-4">
          <WaitingDots />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-start p-6 pt-12 animate-fade-in overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-2 text-center">
        {t('setup.title')}
      </h2>
      <p className="text-slate-400 text-sm mb-6 text-center">{t('setup.helper')}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <Input
          value={word}
          onChange={(val) => {
            setWordInput(val);
            if (val !== word) setCategory(undefined);
          }}
          placeholder={t('setup.placeholder')}
          maxLength={40}
          autoFocus
        />
        {category && (
          <p className="text-xs text-violet-400 text-center">
            {t('setup.categoryHint', { category })}
          </p>
        )}
        <Button type="submit" disabled={!word.trim()}>
          {t('setup.button')}
        </Button>
      </form>

      <CategoryPicker
        onWordSelected={handleWordSelected}
        language={gameState.settings.language}
      />
    </div>
  );
}
