import type { FloatingReactionEvent } from '../types';

interface FloatingReactionProps {
  reactions: FloatingReactionEvent[];
}

export default function FloatingReaction({ reactions }: FloatingReactionProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {reactions.map((r) => {
        // Spread reactions horizontally by hashing the ID
        const hash = r.id.charCodeAt(0) + r.id.charCodeAt(1);
        const leftPct = 10 + (hash % 80); // 10–90%
        return (
          <div
            key={r.id}
            className="absolute bottom-24 flex flex-col items-center gap-1"
            style={{
              left: `${leftPct}%`,
              animation: 'float-up 2s ease-out forwards',
            }}
          >
            <span className="text-3xl drop-shadow-lg">{r.emoji}</span>
            <span className="text-xs text-white/70 font-medium bg-black/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {r.playerName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
