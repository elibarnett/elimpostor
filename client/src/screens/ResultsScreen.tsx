import { useState, useEffect } from 'react';
import Button from '../components/Button';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

interface ResultsScreenProps {
  gameState: GameState;
  playAgain: () => void;
  endGame: () => void;
  transferHost: (newHostId: string) => void;
}

export default function ResultsScreen({ gameState, playAgain, endGame, transferHost }: ResultsScreenProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'suspense' | 'reveal'>('suspense');
  const [pickingHost, setPickingHost] = useState(false);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);

  const isLocal = gameState.mode === 'local';

  useEffect(() => {
    const timer = setTimeout(() => setPhase('reveal'), 1800);
    return () => clearTimeout(timer);
  }, []);

  const impostor = gameState.players.find((p) => p.id === gameState.impostorId);
  const activePlayers = gameState.players.filter((p) => !p.isEliminated);

  // Count votes per player (only relevant for online mode)
  const voteCounts: Record<string, number> = {};
  for (const votedFor of Object.values(gameState.votes)) {
    voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
  }

  // Did impostor get most votes?
  const impostorVotes = voteCounts[gameState.impostorId ?? ''] ?? 0;
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const impostorCaught = impostorVotes > 0 && impostorVotes >= maxVotes;

  if (phase === 'suspense') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-4">{t('results.impostorWas')}</h2>
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-3 h-3 rounded-full bg-violet-400 animate-bounce [animation-delay:200ms]" />
          <span className="w-3 h-3 rounded-full bg-violet-400 animate-bounce [animation-delay:400ms]" />
        </div>
      </div>
    );
  }

  // Pick next host view (local mode only)
  if (pickingHost && gameState.isHost) {
    return (
      <div className="min-h-dvh flex flex-col p-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {t('results.pickHost')}
        </h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          {t('results.pickHostHint')}
        </p>

        <div className="flex-1 space-y-3 overflow-y-auto mb-6">
          {gameState.players
            .filter((p) => p.id !== gameState.playerId && p.isConnected)
            .map((player) => (
              <div
                key={player.id}
                onClick={() => setSelectedHost(player.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl bg-slate-800 border-2 transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                  selectedHost === player.id
                    ? 'border-violet-500 scale-[1.02]'
                    : 'border-slate-700'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: player.color + '33' }}
                >
                  {player.avatar}
                </div>
                <span className="font-semibold text-white">{player.name}</span>
              </div>
            ))}
        </div>

        <div className="pb-safe">
          <Button
            onClick={() => {
              if (selectedHost) transferHost(selectedHost);
            }}
            disabled={!selectedHost}
          >
            {t('results.confirm')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col p-6 animate-fade-in">
      {/* Impostor reveal */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-scale-in text-center mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-4"
            style={{ backgroundColor: impostor?.color + '33' }}
          >
            {impostor?.avatar}
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">{impostor?.name}</h2>
          <p className="text-rose-400 text-sm font-medium">🕵️ Impostor</p>
        </div>

        {/* Word */}
        <div className="text-center mb-6">
          <p className="text-slate-400 text-sm">{t('results.wordWas')}</p>
          <p className="text-2xl font-bold text-emerald-400">{gameState.secretWord}</p>
        </div>

        {/* Outcome (online mode only — local mode outcome is determined in person) */}
        {!isLocal && (
          <div
            className={`text-center text-xl font-bold mb-8 ${
              impostorCaught ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {impostorCaught ? t('results.caught') : t('results.won')}
          </div>
        )}

        {/* Vote breakdown (online mode only) */}
        {!isLocal && (
          <div className="w-full max-w-sm space-y-2 mb-6">
            {activePlayers.map((player) => {
              const votedForId = gameState.votes[player.id];
              const votedFor = gameState.players.find((p) => p.id === votedForId);
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-2 text-sm bg-slate-800/50 rounded-xl px-3 py-2"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                    style={{ backgroundColor: player.color + '33' }}
                  >
                    {player.avatar}
                  </div>
                  <span className="text-slate-300">{player.name}</span>
                  <span className="text-slate-500 mx-1">{t('results.votedFor')}</span>
                  {votedFor && (
                    <>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: votedFor.color + '33' }}
                      >
                        {votedFor.avatar}
                      </div>
                      <span className="text-slate-300">{votedFor.name}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Host controls */}
      {gameState.isHost && (
        <div className="space-y-3 pb-safe">
          {isLocal ? (
            <>
              <Button onClick={() => setPickingHost(true)}>
                {t('results.pickHost')}
              </Button>
              <Button onClick={endGame} variant="secondary">
                {t('results.backHome')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={playAgain}>{t('results.playAgain')}</Button>
              <Button onClick={endGame} variant="secondary">
                {t('results.backHome')}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
