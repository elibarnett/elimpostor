import { useState, useEffect, useCallback } from 'react';

const PLAYER_ID_KEY = 'impostor_player_id';
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';
const HISTORY_PAGE_SIZE = 20;

function getPlayerId(): string | null {
  return localStorage.getItem(PLAYER_ID_KEY);
}

export interface PlayerStats {
  gamesPlayed: number;
  memberSince: string;
  lastPlayedAt: string | null;
  asImpostor: {
    played: number;
    won: number;
    winRate: number;
  };
  asPlayer: {
    played: number;
    won: number;
    winRate: number;
    voteAccuracy: number;
    timesEliminated: number;
  };
  totalCluesGiven: number;
  currentStreak: { type: 'win' | 'loss'; count: number } | null;
}

export interface GameHistoryEntry {
  gameId: number;
  code: string;
  mode: string;
  endedAt: string;
  secretWord: string | null;
  winningTeam: string | null;
  roundsPlayed: number;
  wasImpostor: boolean;
  won: boolean;
  wasEliminated: boolean;
  finalClues: string[];
  votedCorrectly: boolean | null;
  playerCount: number;
}

export function usePlayerStats() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [totalHistory, setTotalHistory] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const playerId = getPlayerId();

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    Promise.all([
      fetch(`${API_BASE}/api/players/${playerId}/stats`).then((r) =>
        r.ok ? r.json() : Promise.reject(r.status)
      ),
      fetch(
        `${API_BASE}/api/players/${playerId}/history?limit=${HISTORY_PAGE_SIZE}&offset=0`
      ).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([statsData, historyData]) => {
        setStats(statsData);
        setHistory(historyData.games);
        setTotalHistory(historyData.total);
        setHistoryOffset(HISTORY_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [playerId, retryCount]);

  const loadMoreHistory = useCallback(async () => {
    if (!playerId || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/players/${playerId}/history?limit=${HISTORY_PAGE_SIZE}&offset=${historyOffset}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setHistory((prev) => [...prev, ...data.games]);
      setHistoryOffset((prev) => prev + HISTORY_PAGE_SIZE);
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false);
    }
  }, [playerId, historyOffset, loadingMore]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return { stats, history, totalHistory, loading, error, loadingMore, loadMoreHistory, retry };
}
