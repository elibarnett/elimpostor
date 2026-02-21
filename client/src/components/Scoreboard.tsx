import { useLanguage } from '../hooks/useLanguage';
import type { SessionScoreView, RoundScoreDelta } from '../types';

interface ScoreboardProps {
  scores: SessionScoreView[];
  currentPlayerId: string;
  deltas?: RoundScoreDelta[];
  compact?: boolean;
}

export default function Scoreboard({ scores, currentPlayerId, deltas = [], compact = false }: ScoreboardProps) {
  const { t } = useLanguage();

  if (scores.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-4">
        {t('scores.noScores')}
      </p>
    );
  }

  // Build a delta sum per player for the round breakdown
  const deltaByPlayer: Record<string, number> = {};
  for (const d of deltas) {
    deltaByPlayer[d.playerId] = (deltaByPlayer[d.playerId] ?? 0) + d.delta;
  }

  return (
    <div className="space-y-1.5">
      {scores.map((s, i) => {
        const isMe = s.playerId === currentPlayerId;
        const isLeader = i === 0;
        const roundDelta = deltaByPlayer[s.playerId];

        return (
          <div
            key={s.playerId}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
              isMe
                ? 'bg-violet-600/20 border border-violet-500/40'
                : 'bg-slate-800/50'
            }`}
          >
            {/* Rank */}
            <span className="text-slate-500 text-xs w-5 text-center shrink-0">
              {isLeader ? '👑' : `${i + 1}`}
            </span>

            {/* Avatar */}
            <span className="text-lg shrink-0">{s.avatar || '👤'}</span>

            {/* Name */}
            <span className={`flex-1 text-sm font-medium truncate ${isMe ? 'text-white' : 'text-slate-200'}`}>
              {s.playerName}
            </span>

            {/* Round delta */}
            {roundDelta !== undefined && roundDelta > 0 && !compact && (
              <span className="text-emerald-400 text-xs font-semibold shrink-0">
                +{roundDelta}
              </span>
            )}

            {/* Total score */}
            <span className={`text-sm font-bold shrink-0 ${isLeader ? 'text-yellow-400' : 'text-white'}`}>
              {s.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
