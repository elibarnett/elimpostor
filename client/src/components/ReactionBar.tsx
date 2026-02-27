import { useLanguage } from '../hooks/useLanguage';

const REACTIONS = [
  { emoji: '🤔', key: 'reaction.suspicious' },
  { emoji: '😂', key: 'reaction.funny' },
  { emoji: '👀', key: 'reaction.watching' },
  { emoji: '🔥', key: 'reaction.hotTake' },
  { emoji: '❄️', key: 'reaction.coldClue' },
  { emoji: '👍', key: 'reaction.agree' },
] as const;

interface ReactionBarProps {
  onReact: (emoji: string) => void;
}

export default function ReactionBar({ onReact }: ReactionBarProps) {
  const { t } = useLanguage();

  return (
    <div className="flex justify-center gap-2">
      {REACTIONS.map(({ emoji, key }) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          title={t(key)}
          className="text-2xl p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 active:scale-110 transition-all cursor-pointer backdrop-blur-sm"
          aria-label={t(key)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
