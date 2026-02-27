import type { PlayerStats } from './hooks/usePlayerStats';

export interface AchievementDef {
  id: string;
  emoji: string;
  /** translation key suffix — used as achievement.{id}.name and achievement.{id}.desc */
  check: (stats: PlayerStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'firstSteps',
    emoji: '🎮',
    check: (s) => s.gamesPlayed >= 1,
  },
  {
    id: 'masterOfDisguise',
    emoji: '🕵️',
    check: (s) => s.asImpostor.won >= 5,
  },
  {
    id: 'socialButterfly',
    emoji: '🦋',
    check: (s) => s.gamesPlayed >= 50,
  },
  {
    id: 'untouchable',
    emoji: '🔥',
    check: (s) => (s.currentStreak?.type === 'win' && s.currentStreak.count >= 3) || false,
  },
  {
    id: 'sherlock',
    emoji: '🔍',
    check: (s) => s.asPlayer.played >= 10 && s.asPlayer.voteAccuracy >= 0.75,
  },
  {
    id: 'wordsmith',
    emoji: '💬',
    check: (s) => s.totalCluesGiven >= 50,
  },
  {
    id: 'veteran',
    emoji: '🌟',
    check: (s) => s.gamesPlayed >= 100,
  },
  {
    id: 'impostorKing',
    emoji: '👑',
    check: (s) => s.asImpostor.won >= 10,
  },
  {
    id: 'teamPlayer',
    emoji: '🏅',
    check: (s) => s.asPlayer.won >= 20,
  },
  {
    id: 'survivor',
    emoji: '💪',
    check: (s) => s.asImpostor.played >= 10,
  },
];

const STORAGE_KEY = 'impostor_achievements';

export function getUnlockedAchievements(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function markAchievementsUnlocked(ids: string[]): void {
  const existing = getUnlockedAchievements();
  const now = Date.now();
  for (const id of ids) {
    if (!existing[id]) existing[id] = now;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/** Returns IDs of achievements newly unlocked (not previously stored) */
export function checkNewAchievements(stats: PlayerStats): string[] {
  const unlocked = getUnlockedAchievements();
  const newOnes: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (!unlocked[def.id] && def.check(stats)) {
      newOnes.push(def.id);
    }
  }
  if (newOnes.length > 0) {
    markAchievementsUnlocked(newOnes);
  }
  return newOnes;
}
