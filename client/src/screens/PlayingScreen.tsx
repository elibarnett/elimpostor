import Button from '../components/Button';
import WaitingDots from '../components/WaitingDots';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

interface PlayingScreenProps {
  gameState: GameState;
  revealImpostor: () => void;
}

export default function PlayingScreen({ gameState, revealImpostor }: PlayingScreenProps) {
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="text-6xl mb-6">🎭</div>
      <h2 className="text-3xl font-bold text-white mb-3">{t('playing.title')}</h2>
      <p className="text-slate-400 text-center mb-8 max-w-xs">{t('playing.hint')}</p>

      {/* Player avatars in a circle-like arrangement */}
      <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-xs">
        {gameState.players.map((player) => (
          <div key={player.id} className="flex flex-col items-center gap-1">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl animate-pulse"
              style={{ backgroundColor: player.color + '33' }}
            >
              {player.avatar}
            </div>
            <span className="text-xs text-slate-500 truncate max-w-[3rem]">{player.name}</span>
          </div>
        ))}
      </div>

      {gameState.isHost ? (
        <div className="w-full max-w-sm">
          <Button onClick={revealImpostor} variant="danger">
            🕵️ {t('playing.reveal')}
          </Button>
        </div>
      ) : (
        <div className="text-center text-slate-500">
          <p className="text-sm">{t('playing.waiting')}</p>
          <div className="mt-2">
            <WaitingDots />
          </div>
        </div>
      )}
    </div>
  );
}
