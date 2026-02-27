import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../achievements';
import { useLanguage } from '../hooks/useLanguage';
import type { TranslationKey } from '../translations';

interface AchievementToastProps {
  newIds: string[];
  onDone: () => void;
}

export default function AchievementToast({ newIds, onDone }: AchievementToastProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (newIds.length === 0) return;
    setCurrentIndex(0);
    setVisible(true);
  }, [newIds]);

  useEffect(() => {
    if (newIds.length === 0) return;
    const timeout = setTimeout(() => {
      if (currentIndex < newIds.length - 1) {
        setVisible(false);
        setTimeout(() => {
          setCurrentIndex((i) => i + 1);
          setVisible(true);
        }, 300);
      } else {
        setVisible(false);
        setTimeout(onDone, 300);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [currentIndex, newIds, onDone]);

  if (newIds.length === 0) return null;

  const id = newIds[currentIndex];
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return null;

  return (
    <div
      className={`fixed top-4 left-0 right-0 z-[60] flex justify-center px-4 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="flex items-center gap-3 bg-violet-700/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-lg max-w-xs w-full">
        <span className="text-3xl">{def.emoji}</span>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-widest text-violet-200 font-semibold">
            {t('achievement.unlocked')}
          </span>
          <span className="text-sm font-bold truncate">
            {t(`achievement.${id}.name` as TranslationKey)}
          </span>
          <span className="text-xs text-violet-200 truncate">
            {t(`achievement.${id}.desc` as TranslationKey)}
          </span>
        </div>
      </div>
    </div>
  );
}
