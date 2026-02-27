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
  theme: 'space' | 'medieval' | 'pirate' | 'haunted' | 'office';
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  avatar: string;
  text: string;
  timestamp: number;
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
  lastMessageAt: number | null; // for chat rate limiting
}

export interface SessionScore {
  playerId: string;
  playerName: string;
  avatar: string;
  score: number;
  roundsWon: number;
  roundsPlayed: number;
  impostorCount: number;
}

export interface RoundScoreDelta {
  playerId: string;
  delta: number;
  reason: 'citizensWin' | 'votedCorrectly' | 'impostorWin' | 'impostorGuess';
}

export interface Game {
  code: string;
  hostId: string;
  phase: GamePhase;
  mode: GameMode;
  players: Player[];
  secretWord: string | null;
  wordCategory: string | null; // category hint shown to all players
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
  clueHistory: Record<string, string[]>;
  voteHistory: Array<Record<string, string>>;
  createdAt: number;
  resultsPersisted: boolean;
  // Discussion phase
  messages: ChatMessage[];
  discussionDeadline: number | null;
  // Session scoring
  sessionId: number | null;
  sessionRound: number; // cumulative rounds in this session (never resets on playAgain)
  sessionScores: SessionScore[];
  lastRoundDeltas: RoundScoreDelta[];
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
  sessionScores: Array<{
    playerId: string;
    playerName: string;
    avatar: string;
    score: number;
    roundsWon: number;
    roundsPlayed: number;
  }>;
  lastRoundDeltas: RoundScoreDelta[];
}
