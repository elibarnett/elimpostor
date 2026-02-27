import type { ThemeId } from './types';

export interface ThemeDef {
  id: ThemeId;
  emoji: string;
  /** Background image filename (from assets/backgrounds/) */
  bgIndex: number; // 1–5
  /** Tailwind accent color token for CSS variable */
  accentColor: string; // hex or hsl
  accentHover: string;
  accentBorder: string;
  accentText: string;
  /** Used in SettingsPanel summary overlay tint */
  cssClass: string; // applied to [data-theme]
}

export const THEMES: ThemeDef[] = [
  {
    id: 'space',
    emoji: '🚀',
    bgIndex: 1,
    accentColor: '#7c3aed',
    accentHover: '#6d28d9',
    accentBorder: '#8b5cf6',
    accentText: '#a78bfa',
    cssClass: 'theme-space',
  },
  {
    id: 'medieval',
    emoji: '🏰',
    bgIndex: 4,
    accentColor: '#b45309',
    accentHover: '#92400e',
    accentBorder: '#d97706',
    accentText: '#fbbf24',
    cssClass: 'theme-medieval',
  },
  {
    id: 'pirate',
    emoji: '🏴‍☠️',
    bgIndex: 2,
    accentColor: '#0369a1',
    accentHover: '#075985',
    accentBorder: '#0ea5e9',
    accentText: '#38bdf8',
    cssClass: 'theme-pirate',
  },
  {
    id: 'haunted',
    emoji: '👻',
    bgIndex: 3,
    accentColor: '#15803d',
    accentHover: '#166534',
    accentBorder: '#16a34a',
    accentText: '#4ade80',
    cssClass: 'theme-haunted',
  },
  {
    id: 'office',
    emoji: '💼',
    bgIndex: 5,
    accentColor: '#1d4ed8',
    accentHover: '#1e40af',
    accentBorder: '#3b82f6',
    accentText: '#60a5fa',
    cssClass: 'theme-office',
  },
];

export const THEME_MAP: Record<ThemeId, ThemeDef> = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
) as Record<ThemeId, ThemeDef>;

export function getTheme(id: ThemeId | undefined): ThemeDef {
  return THEME_MAP[id ?? 'space'] ?? THEME_MAP.space;
}
