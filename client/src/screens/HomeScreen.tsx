import Button from '../components/Button';
import { useLanguage } from '../hooks/useLanguage';
import type { AppScreen } from '../types';

interface HomeScreenProps {
  setScreen: (screen: AppScreen) => void;
}

export default function HomeScreen({ setScreen }: HomeScreenProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden animate-fade-in">
      {/* Subtle bottom fade only — for button readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Language toggle */}
      <button
        onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
        className="absolute top-4 right-4 z-10 text-2xl cursor-pointer hover:scale-110 transition-transform active:scale-95 drop-shadow-lg"
        aria-label="Toggle language"
      >
        {language === 'es' ? '🇬🇧' : '🇪🇸'}
      </button>

      {/* Buttons — positioned to match image layout (lower third) */}
      <div className="relative z-10 flex flex-col flex-1 justify-end p-6 pb-[12%]">
        <div className="w-full max-w-sm mx-auto space-y-3">
          <button
            onClick={() => setScreen('create')}
            className="home-btn w-full h-14 rounded-lg font-bold text-lg tracking-wider uppercase text-white cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            {t('home.create')}
          </button>
          <button
            onClick={() => setScreen('join')}
            className="home-btn w-full h-14 rounded-lg font-bold text-lg tracking-wider uppercase text-white cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            {t('home.join')}
          </button>
        </div>
      </div>
    </div>
  );
}
