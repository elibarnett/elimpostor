import Button from '../components/Button';
import { useLanguage } from '../hooks/useLanguage';
import type { AppScreen } from '../types';

interface HomeScreenProps {
  setScreen: (screen: AppScreen) => void;
}

export default function HomeScreen({ setScreen }: HomeScreenProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-in">
      <button
        onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
        className="absolute top-4 right-4 text-2xl cursor-pointer hover:scale-110 transition-transform active:scale-95"
        aria-label="Toggle language"
      >
        {language === 'es' ? '🇬🇧' : '🇪🇸'}
      </button>

      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🕵️</div>
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          {t('app.title')}
        </h1>
        <p className="text-slate-400 text-lg mt-2">{t('app.subtitle')}</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Button onClick={() => setScreen('create')}>{t('home.create')}</Button>
        <Button onClick={() => setScreen('join')} variant="secondary">
          {t('home.join')}
        </Button>
      </div>
    </div>
  );
}
