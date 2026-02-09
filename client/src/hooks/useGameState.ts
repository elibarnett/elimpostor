import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, GameMode, AppScreen } from '../types';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

/** Generate or retrieve a persistent playerId */
function getPlayerId(): string {
  let id = sessionStorage.getItem('impostor_player_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('impostor_player_id', id);
  }
  return id;
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<AppScreen>('home');
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
    emit('game:create', { playerName });
  }, [emit]);

  const joinGame = useCallback((code: string, playerName: string) => {
    emit('game:join', { code, playerName });
  }, [emit]);

  const setMode = useCallback((mode: GameMode) => {
    emit('game:setMode', { mode });
  }, [emit]);

  const startGame = useCallback(() => {
    emit('game:start');
  }, [emit]);

  const setWord = useCallback((word: string) => {
    emit('game:setWord', { word });
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

  const revealImpostor = useCallback(() => {
    emit('game:revealImpostor');
  }, [emit]);

  const transferHost = useCallback((newHostId: string) => {
    emit('game:transferHost', { newHostId });
  }, [emit]);

  const playAgain = useCallback(() => {
    emit('game:playAgain');
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
    setMode,
    startGame,
    setWord,
    markRoleReady,
    submitClue,
    nextRound,
    startVoting,
    vote,
    revealImpostor,
    transferHost,
    playAgain,
    endGame,
  };
}
