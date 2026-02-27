export type GamePhase =
  | 'lobby'
  | 'setup'
  | 'reveal'
  | 'clues'
  | 'discussion'
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
  discussionTimer: 0 | 30 | 60 | 90; // seconds; 0 = skip discussion phase
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  avatar: string;
  text: string;
  timestamp: number;
}

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

export interface SessionScoreView {
  playerId: string;
  playerName: string;
  avatar: string;
  score: number;
  roundsWon: number;
  roundsPlayed: number;
}

export interface RoundScoreDelta {
  playerId: string;
  delta: number;
  reason: 'citizensWin' | 'votedCorrectly' | 'impostorWin' | 'impostorGuess';
}

export interface GameState {
  code: string;
  phase: GamePhase;
  mode: GameMode;
  players: PlayerView[];
  spectatorCount: number;
  secretWord: string | null;
  wordCategory: string | null;
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
  messages: ChatMessage[];
  discussionDeadline: number | null;
  sessionScores: SessionScoreView[];
  lastRoundDeltas: RoundScoreDelta[];
}

export type AppScreen = 'home' | 'create' | 'join' | 'game' | 'profile';
