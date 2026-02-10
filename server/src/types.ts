export type GamePhase =
  | 'lobby'
  | 'setup'
  | 'reveal'
  | 'clues'
  | 'voting'
  | 'playing'
  | 'results';

export type GameMode = 'online' | 'local';

export interface Player {
  id: string; // persistent playerId (not socket.id)
  socketId: string | null; // current socket connection (null = disconnected)
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
  isSpectator: boolean;
  hasSeenRole: boolean;
  clue: string | null;
  isEliminated: boolean;
  disconnectedAt: number | null; // timestamp when disconnected, null = connected
}

export interface Game {
  code: string;
  hostId: string;
  phase: GamePhase;
  mode: GameMode;
  players: Player[];
  secretWord: string | null;
  impostorId: string | null;
  votes: Record<string, string>;
  round: number;
  turnIndex: number;
  turnDeadline: number | null;
  settings: {
    language: 'es' | 'en';
  };
}

export interface PersonalizedGameState {
  code: string;
  phase: GamePhase;
  mode: GameMode;
  players: Array<{
    id: string;
    name: string;
    avatar: string;
    color: string;
    isHost: boolean;
    isSpectator: boolean;
    hasSeenRole: boolean;
    clue: string | null;
    isEliminated: boolean;
    isConnected: boolean;
  }>;
  spectatorCount: number;
  secretWord: string | null;
  isImpostor: boolean;
  isSpectator: boolean;
  impostorId: string | null;
  votes: Record<string, string>;
  round: number;
  turnIndex: number;
  turnDeadline: number | null;
  playerId: string;
  isHost: boolean;
  hostName: string;
  settings: {
    language: 'es' | 'en';
  };
}
