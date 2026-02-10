import { useState, useEffect } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import WaitingDots from '../components/WaitingDots';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

const GUESS_DURATION = 15; // seconds — must match server GUESS_TURN_MS

interface ImpostorGuessScreenProps {
  gameState: GameState;
  guessWord: (guess: string) => void;
}

export default function ImpostorGuessScreen({ gameState, guessWord }: ImpostorGuessScreenProps) {
  const { t } = useLanguage();
  const [guess, setGuess] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const impostor = gameState.players.find((p) => p.id === gameState.impostorId);
  const isImpostor = gameState.isImpostor;

  // Countdown timer based on server guessDeadline
  useEffect(() => {
    if (!gameState.guessDeadline) {
      setSecondsLeft(null);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((gameState.guessDeadline! - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [gameState.guessDeadline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      guessWord(guess.trim());
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    }
  };

  // Impostor's view — they get to guess the word
  if (isImpostor) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-rose-400 mb-2">
          {t('guess.caught')}
        </h2>
        <p className="text-slate-400 text-sm mb-6 text-center">
          {t('guess.lastChance')}
        </p>

        {/* Countdown timer */}
        {secondsLeft !== null && (
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke="currentColor" strokeWidth="3"
                  className="text-slate-700"
                />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  strokeWidth="3" strokeLinecap="round"
                  stroke={secondsLeft > 7 ? '#a78bfa' : secondsLeft > 3 ? '#facc15' : '#f87171'}
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - secondsLeft / GUESS_DURATION)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${
                secondsLeft > 7 ? 'text-violet-400' : secondsLeft > 3 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {secondsLeft}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <Input
            value={guess}
            onChange={setGuess}
            placeholder={t('guess.placeholder')}
            maxLength={50}
            autoFocus
          />
          <Button type="submit" disabled={!guess.trim()}>
            {t('guess.submit')}
          </Button>
        </form>
      </div>
    );
  }

  // Other players' view — waiting for impostor to guess
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="text-center mb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"
          style={{ backgroundColor: impostor?.color + '33' }}
        >
          {impostor?.avatar}
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">{impostor?.name}</h2>
        <p className="text-rose-400 text-sm font-medium mb-4">
          {t('guess.revealedImpostor')}
        </p>
      </div>

      <p className="text-slate-400 text-lg mb-4">{t('guess.waiting')}</p>
      <WaitingDots />

      {/* Countdown timer for spectators */}
      {secondsLeft !== null && (
        <div className="mt-6">
          <span className={`text-lg font-bold ${
            secondsLeft > 7 ? 'text-violet-400' : secondsLeft > 3 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {secondsLeft}s
          </span>
        </div>
      )}
    </div>
  );
}
