import { useState, useCallback, useEffect } from 'react';

const PROFILE_KEY = 'impostor_profile';
const PLAYER_ID_KEY = 'impostor_player_id';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

export interface PlayerProfile {
  displayName: string;
  avatar: string;
}

function getPlayerId(): string | null {
  return localStorage.getItem(PLAYER_ID_KEY);
}

function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
        avatar: typeof parsed.avatar === 'string' ? parsed.avatar : '',
      };
    }
  } catch { /* corrupted data, ignore */ }
  return { displayName: '', avatar: '' };
}

function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function usePlayerProfile() {
  const [profile, setProfileState] = useState<PlayerProfile>(loadProfile);
  const [loading, setLoading] = useState(false);

  // On mount, try to fetch profile from server and merge
  useEffect(() => {
    const playerId = getPlayerId();
    if (!playerId) return;

    fetch(`${API_BASE}/api/players/${playerId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && (data.displayName || data.avatar)) {
          const local = loadProfile();
          const merged: PlayerProfile = {
            displayName: data.displayName || local.displayName,
            avatar: data.avatar || local.avatar,
          };
          setProfileState(merged);
          saveProfile(merged);
        }
      })
      .catch(() => {
        // Server unavailable, use local profile
      });
  }, []);

  const updateProfile = useCallback(async (updates: Partial<PlayerProfile>) => {
    const current = loadProfile();
    const newProfile = { ...current, ...updates };

    // Save locally immediately
    setProfileState(newProfile);
    saveProfile(newProfile);

    // Sync to server
    const playerId = getPlayerId();
    if (!playerId) return;

    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/players/${playerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-player-id': playerId,
        },
        body: JSON.stringify({
          displayName: newProfile.displayName || undefined,
          avatar: newProfile.avatar || undefined,
        }),
      });
    } catch {
      // Server unavailable, local save is sufficient
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, updateProfile, loading };
}
