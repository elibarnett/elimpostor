import type { PlayerView } from '../types';

interface PlayerCardProps {
  player: PlayerView;
  selected?: boolean;
  onClick?: () => void;
  showClue?: boolean;
  disabled?: boolean;
  animationDelay?: number;
}

export default function PlayerCard({
  player,
  selected = false,
  onClick,
  showClue = false,
  disabled = false,
  animationDelay = 0,
}: PlayerCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={`flex items-center gap-3 p-3 rounded-2xl bg-slate-800/60 backdrop-blur-sm border-2 transition-all duration-200 animate-slide-in ${
        selected
          ? 'border-violet-500 scale-[1.02] bg-slate-700/60'
          : 'border-slate-700/60'
      } ${onClick && !disabled ? 'cursor-pointer active:scale-[0.97]' : ''} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: player.color + '33' }}
      >
        {player.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white truncate flex items-center gap-2">
          {player.name}
          {player.isHost && (
            <span className="text-xs bg-violet-600/30 text-violet-400 px-2 py-0.5 rounded-full">
              Host
            </span>
          )}
          {!player.isConnected && (
            <span className="text-xs bg-rose-600/30 text-rose-400 px-2 py-0.5 rounded-full">
              ⚡ offline
            </span>
          )}
        </div>
        {showClue && player.clue && (
          <div className="text-slate-400 text-sm truncate">"{player.clue}"</div>
        )}
      </div>
    </div>
  );
}
