import type { AchievementDef } from '../achievements';
import { useLanguage } from '../hooks/useLanguage';
import type { TranslationKey } from '../translations';

interface AchievementBadgeProps {
  def: AchievementDef;
  unlocked: boolean;
}

export default function AchievementBadge({ def, unlocked }: AchievementBadgeProps) {
  const { t } = useLanguage();

  return (
    <div
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
        unlocked
          ? 'bg-violet-600/20 border border-violet-500/40'
          : 'bg-slate-800/40 border border-slate-700/40 opacity-40'
      }`}
      title={t(`achievement.${def.id}.desc` as TranslationKey)}
    >
      <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{def.emoji}</span>
      <span className="text-[11px] font-medium text-center leading-tight text-slate-200">
        {t(`achievement.${def.id}.name` as TranslationKey)}
      </span>
    </div>
  );
}
