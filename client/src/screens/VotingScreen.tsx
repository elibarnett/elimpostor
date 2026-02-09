import { useState } from 'react';
import Button from '../components/Button';
import WaitingDots from '../components/WaitingDots';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

interface VotingScreenProps {
  gameState: GameState;
  vote: (votedForId: string) => void;
}

export default function VotingScreen({ gameState, vote }: VotingScreenProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);

  const activePlayers = gameState.players.filter((p) => !p.isEliminated);
  const myVote = gameState.votes[gameState.playerId];
  const hasVoted = !!myVote;

  const votedCount = Object.keys(gameState.votes).length;
  const totalCount = activePlayers.length;

  const handleVote = () => {
    if (selected) {
      vote(selected);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    }
  };

  if (hasVoted) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
        <p className="text-slate-400 text-lg mb-4">{t('voting.waiting')}</p>
        <WaitingDots />
        <p className="text-slate-500 text-sm mt-6">
          {t('voting.voted', { count: votedCount, total: totalCount })}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col p-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-white text-center mb-6">
        {t('voting.title')}
      </h2>

      <div className="flex-1 grid grid-cols-2 gap-3 content-start mb-4">
        {activePlayers.map((player) => {
          const isSelf = player.id === gameState.playerId;
          const isSelected = selected === player.id;

          return (
            <div
              key={player.id}
              onClick={isSelf ? undefined : () => setSelected(player.id)}
              className={`rounded-2xl p-4 border-2 transition-all duration-200 flex flex-col items-center gap-2 backdrop-blur-sm ${
                isSelf
                  ? 'opacity-40 border-slate-700/60 bg-slate-800/50'
                  : isSelected
                    ? 'border-violet-500 bg-slate-800/60 scale-[1.03] cursor-pointer'
                    : 'border-slate-700/60 bg-slate-800/60 cursor-pointer active:scale-[0.97]'
              }`}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: player.color + '33' }}
              >
                {player.avatar}
              </div>
              <span className="font-medium text-white text-sm truncate w-full text-center">
                {player.name}
              </span>
              {player.clue && (
                <span className="text-slate-400 text-xs truncate w-full text-center">
                  "{player.clue}"
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="pb-safe space-y-3">
        <p className="text-center text-slate-500 text-sm">
          {t('voting.voted', { count: votedCount, total: totalCount })}
        </p>
        <Button onClick={handleVote} disabled={!selected}>
          {t('voting.vote')}
        </Button>
      </div>
    </div>
  );
}
