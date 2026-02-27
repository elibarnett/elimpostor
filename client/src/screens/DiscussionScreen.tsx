import { useEffect, useState } from 'react';
import Button from '../components/Button';
import WaitingDots from '../components/WaitingDots';
import ChatBox from '../components/ChatBox';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

interface DiscussionScreenProps {
  gameState: GameState;
  sendMessage: (text: string) => void;
  startDiscussionVoting: () => void;
}

function useCountdown(deadline: number | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setRemaining(null);
      return;
    }
    const update = () => {
      const secs = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(secs);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [deadline]);

  return remaining;
}

export default function DiscussionScreen({ gameState, sendMessage, startDiscussionVoting }: DiscussionScreenProps) {
  const { t } = useLanguage();
  const remaining = useCountdown(gameState.discussionDeadline);

  const isSpectator = gameState.isSpectator;
  const meEliminated = gameState.players.find((p) => p.id === gameState.playerId)?.isEliminated ?? false;
  const isHost = gameState.isHost;

  return (
    <div className="min-h-dvh flex flex-col p-6 pt-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">
          {t('discussion.title')}
        </h2>
        {remaining !== null && (
          <span
            className={`text-sm font-semibold tabular-nums px-3 py-1 rounded-full ${
              remaining <= 10
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-slate-700/60 text-slate-300'
            }`}
          >
            {t('discussion.timeLeft', { n: remaining })}
          </span>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1">
        <ChatBox
          messages={gameState.messages}
          playerId={gameState.playerId}
          isSpectator={isSpectator}
          isEliminated={meEliminated}
          onSend={sendMessage}
          players={gameState.players}
        />
      </div>

      {/* Footer */}
      <div className="pb-safe mt-4">
        {isHost ? (
          <Button onClick={startDiscussionVoting}>
            {t('discussion.startVoting')}
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <WaitingDots />
            <p className="text-slate-500 text-sm">{t('discussion.waiting')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
