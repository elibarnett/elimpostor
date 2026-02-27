import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, GameMode, GameSettings, AppScreen } from '../types';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

const PLAYER_ID_KEY = 'impostor_player_id';
const PROFILE_KEY = 'impostor_profile';

/** Generate or retrieve a persistent playerId, migrating from sessionStorage if needed */
function getPlayerId(): string {
  // Check localStorage first (new persistent location)
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (id) return id;

  // Migrate from sessionStorage if present (one-time migration)
  id = sessionStorage.getItem(PLAYER_ID_KEY);
  if (id) {
    localStorage.setItem(PLAYER_ID_KEY, id);
    sessionStorage.removeItem(PLAYER_ID_KEY);
    return id;
  }

  // Generate new UUID
  id = crypto.randomUUID();
  localStorage.setItem(PLAYER_ID_KEY, id);
  return id;
}

/** Read preferred avatar from saved profile */
function getPreferredAvatar(): string | undefined {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return typeof parsed.avatar === 'string' ? parsed.avatar : undefined;
    }
  } catch { /* corrupted data, ignore */ }
  return undefined;
}

export function useGameState(initialScreen?: AppScreen) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<AppScreen>(initialScreen ?? 'home');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const playerId = getPlayerId();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Authenticate with persistent playerId
      socket.emit('auth', { playerId });
    });

    socket.on('game:state', (state: GameState) => {
      setGameState(state);
      setScreen('game');
      setError(null);
    });

    socket.on('game:error', ({ message }: { message: string }) => {
      setError(message);
    });

    socket.on('game:ended', () => {
      setGameState(null);
      setScreen('home');
      setError('disconnected');
    });

    socket.on('game:left', () => {
      setGameState(null);
      setScreen('home');
      setError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emit = useCallback((event: string, data?: Record<string, unknown>) => {
    socketRef.current?.emit(event, data);
  }, []);

  const createGame = useCallback((playerName: string) => {
    emit('game:create', { playerName, preferredAvatar: getPreferredAvatar() });
  }, [emit]);

  const joinGame = useCallback((code: string, playerName: string) => {
    emit('game:join', { code, playerName, preferredAvatar: getPreferredAvatar() });
  }, [emit]);

  const watchGame = useCallback((code: string, playerName: string) => {
    emit('game:watch', { code, playerName, preferredAvatar: getPreferredAvatar() });
  }, [emit]);

  const convertToPlayer = useCallback(() => {
    emit('game:convertToPlayer');
  }, [emit]);

  const setMode = useCallback((mode: GameMode) => {
    emit('game:setMode', { mode });
  }, [emit]);

  const setElimination = useCallback((enabled: boolean) => {
    emit('game:setElimination', { enabled });
  }, [emit]);

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    emit('game:updateSettings', { settings });
  }, [emit]);

  const skipMyTurn = useCallback(() => {
    emit('game:skipMyTurn');
  }, [emit]);

  const continueAfterElimination = useCallback(() => {
    emit('game:continueAfterElimination');
  }, [emit]);

  const startGame = useCallback(() => {
    emit('game:start');
  }, [emit]);

  const setWord = useCallback((word: string, category?: string) => {
    emit('game:setWord', { word, category });
  }, [emit]);

  const markRoleReady = useCallback(() => {
    emit('game:roleReady');
  }, [emit]);

  const submitClue = useCallback((clue: string) => {
    emit('game:submitClue', { clue });
  }, [emit]);

  const nextRound = useCallback(() => {
    emit('game:nextRound');
  }, [emit]);

  const startVoting = useCallback(() => {
    emit('game:startVoting');
  }, [emit]);

  const vote = useCallback((votedForId: string) => {
    emit('game:vote', { votedForId });
  }, [emit]);

  const guessWord = useCallback((guess: string) => {
    emit('game:guessWord', { guess });
  }, [emit]);

  const revealImpostor = useCallback(() => {
    emit('game:revealImpostor');
  }, [emit]);

  const transferHost = useCallback((newHostId: string) => {
    emit('game:transferHost', { newHostId });
  }, [emit]);

  const playAgain = useCallback(() => {
    emit('game:playAgain');
  }, [emit]);

  const leaveGame = useCallback(() => {
    emit('game:leave');
    // Optimistically reset client state — don't wait for server response
    // (if the server is unreachable, game:left would never arrive)
    setGameState(null);
    setScreen('home');
    setError(null);
  }, [emit]);

  const endGame = useCallback(() => {
    emit('game:end');
    setGameState(null);
    setScreen('home');
  }, [emit]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    gameState,
    screen,
    setScreen,
    error,
    clearError,
    connected,
    createGame,
    joinGame,
    watchGame,
    convertToPlayer,
    setMode,
    setElimination,
    updateSettings,
    skipMyTurn,
    continueAfterElimination,
    startGame,
    setWord,
    markRoleReady,
    submitClue,
    nextRound,
    startVoting,
    vote,
    guessWord,
    revealImpostor,
    transferHost,
    playAgain,
    leaveGame,
    endGame,
  };
}
