export type GamePhase =
  | 'lobby'
  | 'setup'
  | 'reveal'
  | 'clues'
  | 'voting'
  | 'playing'
  | 'impostor-guess'
  | 'elimination-results'
  | 'results';

export type GameMode = 'online' | 'local';

export interface GameSettings {
  language: 'es' | 'en';
  elimination: boolean;
  clueTimer: 15 | 30 | 45 | 60 | 0; // seconds; 0 = unlimited
  votingStyle: 'anonymous' | 'public';
  maxRounds: 1 | 2 | 3;
  allowSkip: boolean;
}

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
  impostorGuess: string | null;
  impostorGuessCorrect: boolean | null;
  guessDeadline: number | null;
  settings: GameSettings;
  eliminationHistory: Array<{ round: number; playerId: string }>;
  lastEliminatedId: string | null;
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
  impostorGuess: string | null;
  impostorGuessCorrect: boolean | null;
  guessDeadline: number | null;
  playerId: string;
  isHost: boolean;
  hostName: string;
  settings: GameSettings;
  eliminationHistory: Array<{ round: number; playerName: string; playerId: string }>;
  lastEliminatedId: string | null;
}
