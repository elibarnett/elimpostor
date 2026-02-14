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

export interface PlayerView {
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
}

export interface GameState {
  code: string;
  phase: GamePhase;
  mode: GameMode;
  players: PlayerView[];
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
  settings: {
    language: 'es' | 'en';
    elimination: boolean;
  };
  eliminationHistory: Array<{ round: number; playerName: string; playerId: string }>;
  lastEliminatedId: string | null;
}

export type AppScreen = 'home' | 'create' | 'join' | 'game';
