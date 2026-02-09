import { createContext, useContext, useState, useCallback } from 'react';
import translations, { type Language, type TranslationKey } from '../translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: (key) => key,
});

export function useLanguageProvider() {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('impostor-lang');
    return (saved === 'en' || saved === 'es') ? saved : 'es';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('impostor-lang', lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      let text: string = translations[language][key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [language]
  );

  return { language, setLanguage, t };
}

export function useLanguage() {
  return useContext(LanguageContext);
}
