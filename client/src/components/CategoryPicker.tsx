import { useState, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';

type Difficulty = 'easy' | 'medium' | 'hard';

interface WordPack {
  id: string;
  emoji: string;
  words: {
    easy: string[];
    medium: string[];
    hard: string[];
  };
}

interface CategoryPickerProps {
  onWordSelected: (word: string, category: string) => void;
  language: 'es' | 'en';
}

export default function CategoryPicker({ onWordSelected, language }: CategoryPickerProps) {
  const { t } = useLanguage();
  const [packs, setPacks] = useState<WordPack[]>([]);
  const [selectedPack, setSelectedPack] = useState<WordPack | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/wordpacks?lang=${language}`)
      .then((r) => r.json())
      .then((data: WordPack[]) => setPacks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  const handleRandom = () => {
    if (!selectedPack) return;
    const words = selectedPack.words[difficulty];
    if (!words || words.length === 0) return;
    const word = words[Math.floor(Math.random() * words.length)];
    const categoryName = t(`category.${selectedPack.id}` as Parameters<typeof t>[0]);
    onWordSelected(word, categoryName);
  };

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  const diffKeys = {
    easy: 'setup.diffEasy',
    medium: 'setup.diffMedium',
    hard: 'setup.diffHard',
  } as const;

  if (loading) return null;

  return (
    <div className="w-full max-w-sm mx-auto mt-4">
      <p className="text-slate-400 text-xs text-center uppercase tracking-wide mb-3">
        {t('setup.orPickCategory')}
      </p>

      {/* Category grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => setSelectedPack(selectedPack?.id === pack.id ? null : pack)}
            className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all text-xs font-medium cursor-pointer ${
              selectedPack?.id === pack.id
                ? 'border-violet-500 bg-violet-600/20 text-white'
                : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            <span className="text-xl">{pack.emoji}</span>
            <span className="leading-tight text-center">
              {t(`category.${pack.id}` as Parameters<typeof t>[0])}
            </span>
          </button>
        ))}
      </div>

      {selectedPack && (
        <>
          {/* Difficulty toggle */}
          <div className="flex bg-slate-800/60 rounded-xl p-1 gap-1 mb-3">
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  difficulty === d
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t(diffKeys[d])}
              </button>
            ))}
          </div>

          {/* Random Word button */}
          <button
            type="button"
            onClick={handleRandom}
            className="w-full h-12 rounded-xl border-2 border-violet-500 text-violet-400 hover:bg-violet-500/10 font-bold text-sm transition-all cursor-pointer active:scale-[0.97]"
          >
            🎲 {t('setup.randomWord')}
          </button>
        </>
      )}
    </div>
  );
}
