import { useState } from 'react';
import Button from '../components/Button';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState } from '../types';

interface RevealScreenProps {
  gameState: GameState;
  markRoleReady: () => void;
}

export default function RevealScreen({ gameState, markRoleReady }: RevealScreenProps) {
  const { t } = useLanguage();
  const [revealed, setRevealed] = useState(false);

  const me = gameState.players.find((p) => p.id === gameState.playerId);
  const readyCount = gameState.players.filter((p) => p.hasSeenRole).length;
  const totalCount = gameState.players.length;
  const allReady = readyCount === totalCount;

  const handleTap = () => {
    setRevealed(!revealed);
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleReady = () => {
    markRoleReady();
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
      {/* Card */}
      <div
        onClick={handleTap}
        className="w-full max-w-sm aspect-[3/4] rounded-2xl cursor-pointer perspective-1000 mb-6"
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
            revealed ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front (face down) */}
          <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 border-2 border-slate-600 flex flex-col items-center justify-center p-6">
            <div className="text-6xl mb-4">🃏</div>
            <p className="text-slate-300 text-lg text-center font-medium">
              {t('reveal.tapToSee')}
            </p>
          </div>

          {/* Back (revealed) */}
          <div
            className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-2 flex flex-col items-center justify-center p-6 ${
              gameState.isImpostor
                ? 'bg-gradient-to-br from-rose-950 to-slate-900 border-rose-800'
                : 'bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-800'
            }`}
          >
            {gameState.isImpostor ? (
              <>
                <div className="text-6xl mb-4">🕵️</div>
                <h2 className="text-2xl font-bold text-rose-400 mb-4 text-center">
                  {t('reveal.impostor')}
                </h2>
                <p className="text-slate-300 text-center text-sm">
                  {t('reveal.impostorHint')}
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-sm mb-2">La palabra es:</p>
                <h2 className="text-4xl font-bold text-emerald-400 mb-4 text-center">
                  {gameState.secretWord}
                </h2>
                <p className="text-slate-300 text-center text-sm">
                  {t('reveal.wordHint')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tap to hide hint */}
      {revealed && (
        <p className="text-slate-500 text-sm mb-4 animate-fade-in">
          {t('reveal.tapToHide')}
        </p>
      )}

      {/* Progress + Ready button */}
      <div className="w-full max-w-sm space-y-3">
        <p className="text-center text-slate-400 text-sm">
          {t('reveal.playersReady', { count: readyCount, total: totalCount })}
        </p>
        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${(readyCount / totalCount) * 100}%` }}
          />
        </div>
        {!me?.hasSeenRole ? (
          <Button onClick={handleReady}>{t('reveal.ready')}</Button>
        ) : allReady && gameState.isHost ? (
          <Button onClick={() => {}}>{t('reveal.allReady')}</Button>
        ) : (
          <div className="h-14 flex items-center justify-center text-slate-500 text-sm">
            ✓ {t('reveal.ready')}
          </div>
        )}
      </div>
    </div>
  );
}
