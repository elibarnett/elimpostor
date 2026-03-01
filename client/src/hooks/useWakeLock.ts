import { useEffect } from 'react';
import type { GamePhase } from '../types';

// Keep screen awake during active gameplay so the host's phone doesn't sleep
const ACTIVE_PHASES: GamePhase[] = [
  'reveal',
  'clues',
  'voting',
  'playing',
  'discussion',
  'impostor-guess',
  'elimination-results',
];

export function useWakeLock(phase: GamePhase | undefined) {
  useEffect(() => {
    if (!phase || !ACTIVE_PHASES.includes(phase)) return;
    if (!('wakeLock' in navigator)) return;

    let lock: WakeLockSentinel | null = null;

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock not granted — not critical, ignore silently
      }
    };

    // Re-request after the page becomes visible again (browser releases the
    // lock automatically when the tab goes into the background)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lock?.release();
    };
  }, [phase]);
}
