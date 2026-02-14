import { useState, useEffect } from 'react';
import Button from '../components/Button';
import WaitingDots from '../components/WaitingDots';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

interface EliminationResultsScreenProps {
  gameState: GameState;
  continueAfterElimination: () => void;
}

export default function EliminationResultsScreen({
  gameState,
  continueAfterElimination,
}: EliminationResultsScreenProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'suspense' | 'reveal'>('suspense');

  useEffect(() => {
    const timer = setTimeout(() => setPhase('reveal'), 1500);
    return () => clearTimeout(timer);
  }, []);

  const eliminatedPlayer = gameState.lastEliminatedId
    ? gameState.players.find((p) => p.id === gameState.lastEliminatedId)
    : null;
  const wasTie = !gameState.lastEliminatedId;
  const activePlayers = gameState.players.filter((p) => !p.isEliminated && !p.isSpectator);

  // Vote breakdown
  const voteCounts: Record<string, number> = {};
  for (const votedFor of Object.values(gameState.votes)) {
    voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
  }

  if (phase === 'suspense') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-4">{t('voting.title')}</h2>
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-3 h-3 rounded-full bg-violet-400 animate-bounce [animation-delay:200ms]" />
          <span className="w-3 h-3 rounded-full bg-violet-400 animate-bounce [animation-delay:400ms]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col p-6 animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Eliminated player reveal or tie */}
        {wasTie ? (
          <div className="animate-scale-in text-center mb-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 bg-slate-700/50">
              🤝
            </div>
            <h2 className="text-2xl font-bold text-amber-400 mb-1">
              {t('elimination.tied')}
            </h2>
          </div>
        ) : eliminatedPlayer ? (
          <div className="animate-scale-in text-center mb-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 opacity-50 grayscale"
              style={{ backgroundColor: eliminatedPlayer.color + '33' }}
            >
              {eliminatedPlayer.avatar}
            </div>
            <h2 className="text-2xl font-bold text-rose-400 mb-1">
              {t('elimination.eliminated', { name: eliminatedPlayer.name })}
            </h2>
          </div>
        ) : null}

        {/* Active player count */}
        <p className="text-slate-400 text-sm mb-6">
          {t('elimination.remaining', { count: activePlayers.length })}
        </p>

        {/* Vote breakdown */}
        <div className="w-full max-w-sm space-y-2 mb-6">
          {gameState.players
            .filter((p) => !p.isSpectator && !p.isEliminated && p.id !== gameState.lastEliminatedId)
            .concat(eliminatedPlayer ? [eliminatedPlayer] : [])
            .filter((p) => gameState.votes[p.id])
            .map((player) => {
              const votedForId = gameState.votes[player.id];
              const votedFor = gameState.players.find((p) => p.id === votedForId);
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-2 text-sm bg-slate-800/50 backdrop-blur-sm rounded-xl px-3 py-2"
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

        {/* Elimination history */}
        {gameState.eliminationHistory.length > 0 && (
          <div className="w-full max-w-sm mb-6">
            <p className="text-slate-400 text-xs text-center mb-2 uppercase tracking-wide">
              {t('elimination.history')}
            </p>
            <div className="space-y-1">
              {gameState.eliminationHistory.map((entry, i) => {
                const player = gameState.players.find((p) => p.id === entry.playerId);
                return (
                  <div key={i} className="flex items-center gap-2 text-sm bg-slate-800/50 rounded-lg px-3 py-1.5">
                    <span className="text-slate-500">{t('clues.round', { n: entry.round })}</span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: player?.color + '33' }}
                    >
                      {player?.avatar}
                    </div>
                    <span className="text-slate-400 line-through">{entry.playerName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Host continue button */}
      <div className="pb-safe">
        {gameState.isHost ? (
          <Button onClick={continueAfterElimination}>
            {t('elimination.continue')}
          </Button>
        ) : (
          <div className="text-center text-slate-400">
            <p>{t('elimination.waitingContinue', { host: gameState.hostName })}</p>
            <div className="mt-2">
              <WaitingDots />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
