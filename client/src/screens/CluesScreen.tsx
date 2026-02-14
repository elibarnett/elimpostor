import { useState, useEffect } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

const TURN_DURATION = 30; // seconds — must match server CLUE_TURN_MS

interface CluesScreenProps {
  gameState: GameState;
  submitClue: (clue: string) => void;
  nextRound: () => void;
  startVoting: () => void;
}

export default function CluesScreen({
  gameState,
  submitClue,
  nextRound,
  startVoting,
}: CluesScreenProps) {
  const { t } = useLanguage();
  const [clue, setClue] = useState('');

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const activePlayers = gameState.players.filter((p) => !p.isEliminated && !p.isSpectator);
  const currentPlayer = activePlayers[gameState.turnIndex];
  const meEliminated = gameState.players.find((p) => p.id === gameState.playerId)?.isEliminated;
  const isMyTurn = !gameState.isSpectator && !meEliminated && currentPlayer?.id === gameState.playerId;
  const allDone = gameState.turnIndex >= activePlayers.length;

  // Countdown timer based on server turnDeadline
  useEffect(() => {
    if (!gameState.turnDeadline || allDone) {
      setSecondsLeft(null);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((gameState.turnDeadline! - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [gameState.turnDeadline, allDone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clue.trim()) {
      submitClue(clue.trim());
      setClue('');
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  // Clues given so far
  const cluesGiven = activePlayers
    .filter((p) => p.clue)
    .map((p) => ({ name: p.name, avatar: p.avatar, color: p.color, clue: p.clue! }));

  return (
    <div className="min-h-dvh flex flex-col p-6 animate-fade-in">
      <h2 className="text-xl font-bold text-white text-center mb-4">
        {t('clues.round', { n: gameState.round })}
      </h2>

      {meEliminated && (
        <p className="text-center text-slate-500 text-sm mb-2">
          {t('elimination.youAreEliminated')}
        </p>
      )}

      {/* Turn order */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {activePlayers.map((player, i) => (
          <div
            key={player.id}
            className={`shrink-0 flex flex-col items-center gap-1 ${
              i === gameState.turnIndex && !allDone ? 'scale-110' : 'opacity-60'
            } transition-all duration-300`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                i === gameState.turnIndex && !allDone
                  ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950 animate-pulse'
                  : ''
              } ${player.clue ? 'opacity-100' : ''}`}
              style={{ backgroundColor: player.color + '33' }}
            >
              {player.avatar}
            </div>
            <span className="text-xs text-slate-400 truncate max-w-[3.5rem]">{player.name}</span>
          </div>
        ))}
      </div>

      {/* Current turn / input */}
      {!allDone ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Countdown timer */}
          {secondsLeft !== null && (
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke="currentColor" strokeWidth="3"
                    className="text-slate-700"
                  />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    strokeWidth="3" strokeLinecap="round"
                    stroke={secondsLeft > 10 ? '#a78bfa' : secondsLeft > 5 ? '#facc15' : '#f87171'}
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - secondsLeft / TURN_DURATION)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${
                  secondsLeft > 10 ? 'text-violet-400' : secondsLeft > 5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {secondsLeft}
                </span>
              </div>
            </div>
          )}
          {isMyTurn ? (
            <>
              <h3 className="text-2xl font-bold text-violet-400 mb-6">
                {t('clues.yourTurn')}
              </h3>
              <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
                <Input
                  value={clue}
                  onChange={setClue}
                  placeholder={t('clues.placeholder')}
                  maxLength={30}
                  autoFocus
                />
                <Button type="submit" disabled={!clue.trim()}>
                  {t('clues.submit')}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse"
                style={{ backgroundColor: currentPlayer?.color + '33' }}
              >
                {currentPlayer?.avatar}
              </div>
              <p className="text-slate-400 text-lg">
                {t('clues.turnOf', { name: currentPlayer?.name ?? '' })}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Clues list */}
      {cluesGiven.length > 0 && (
        <div className="space-y-2 mb-4">
          {cluesGiven.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-2.5 animate-slide-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: c.color + '33' }}
              >
                {c.avatar}
              </div>
              <span className="text-slate-400 text-sm">{c.name}</span>
              <span className="text-white font-medium ml-auto">"{c.clue}"</span>
            </div>
          ))}
        </div>
      )}

      {/* Host controls when round is done */}
      {allDone && gameState.isHost && !gameState.isSpectator && (
        <div className="space-y-3 pb-safe">
          <Button onClick={startVoting}>{t('clues.goToVoting')}</Button>
          <Button onClick={nextRound} variant="secondary">
            {t('clues.anotherRound')}
          </Button>
        </div>
      )}
    </div>
  );
}
