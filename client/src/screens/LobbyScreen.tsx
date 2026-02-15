import Button from '../components/Button';
import PlayerCard from '../components/PlayerCard';
import RoomCode from '../components/RoomCode';
import SettingsPanel from '../components/SettingsPanel';
import WaitingDots from '../components/WaitingDots';
import { useLanguage } from '../hooks/useLanguage';
import type { GameState, GameMode, GameSettings } from '../types';

interface LobbyScreenProps {
  gameState: GameState;
  startGame: () => void;
  setMode: (mode: GameMode) => void;
  setElimination: (enabled: boolean) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  convertToPlayer: () => void;
}

export default function LobbyScreen({ gameState, startGame, setMode, setElimination, updateSettings, convertToPlayer }: LobbyScreenProps) {
  const { t } = useLanguage();
  const actualPlayers = gameState.players.filter((p) => !p.isSpectator);
  const canStart = actualPlayers.length >= 3;

  return (
    <div className={`min-h-dvh flex flex-col p-6 animate-fade-in ${gameState.isSpectator ? 'pt-12' : ''}`}>
      <div className="pt-4 mb-6">
        <RoomCode code={gameState.code} />
      </div>

      <div className="text-center text-slate-400 text-sm mb-4">
        {actualPlayers.length} {t('lobby.players')}
        {gameState.spectatorCount > 0 && (
          <span className="ml-2 text-amber-400">
            · {t('lobby.spectators', { count: gameState.spectatorCount })}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto mb-6">
        {gameState.players.map((player, i) => (
          <PlayerCard key={player.id} player={player} animationDelay={i * 80} />
        ))}
      </div>

      <div className="pb-safe">
        {/* Mode toggle */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs text-center mb-2 uppercase tracking-wide">
            {t('lobby.mode')}
          </p>
          {gameState.isHost ? (
            <div className="flex max-w-sm mx-auto bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 gap-1">
              <button
                onClick={() => setMode('online')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  gameState.mode === 'online'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌐 {t('lobby.modeOnline')}
              </button>
              <button
                onClick={() => setMode('local')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  gameState.mode === 'local'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏠 {t('lobby.modeLocal')}
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-slate-300">
              {gameState.mode === 'online' ? '🌐' : '🏠'}{' '}
              {gameState.mode === 'online' ? t('lobby.modeOnline') : t('lobby.modeLocal')}
            </div>
          )}
        </div>

        {/* Elimination toggle — only in online mode */}
        {gameState.mode === 'online' && (
          <>
            <div className="mb-4">
              <p className="text-slate-400 text-xs text-center mb-2 uppercase tracking-wide">
                {t('lobby.variant')}
              </p>
              {gameState.isHost ? (
                <div className="flex max-w-sm mx-auto bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setElimination(false)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      !gameState.settings.elimination
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('lobby.variantClassic')}
                  </button>
                  <button
                    onClick={() => setElimination(true)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                      gameState.settings.elimination
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('lobby.variantElimination')}
                  </button>
                </div>
              ) : (
                <div className="text-center text-sm text-slate-300">
                  {gameState.settings.elimination ? t('lobby.variantElimination') : t('lobby.variantClassic')}
                </div>
              )}
            </div>

            {/* Game settings panel */}
            <div className="mb-4">
              <SettingsPanel
                settings={gameState.settings}
                isHost={gameState.isHost}
                onUpdateSettings={updateSettings}
              />
            </div>
          </>
        )}

        {gameState.isSpectator ? (
          <div className="space-y-2">
            <Button onClick={convertToPlayer}>
              {t('spectator.joinAsPlayer')}
            </Button>
            <div className="text-center text-slate-400">
              <p>{t('lobby.waiting', { host: gameState.hostName })}</p>
              <div className="mt-2">
                <WaitingDots />
              </div>
            </div>
          </div>
        ) : gameState.isHost ? (
          <div className="space-y-2">
            <Button onClick={startGame} disabled={!canStart}>
              {t('lobby.start')}
            </Button>
            {!canStart && (
              <p className="text-slate-500 text-sm text-center">{t('lobby.minPlayers')}</p>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <p>{t('lobby.waiting', { host: gameState.hostName })}</p>
            <div className="mt-2">
              <WaitingDots />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
