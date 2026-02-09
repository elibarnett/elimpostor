import type { Game, GameMode, Player, PersonalizedGameState, GamePhase } from './types.js';

const AVATARS = ['🦊', '🐸', '🦁', '🐼', '🐙', '🦄', '🐲', '🦜', '🐺', '🦈', '🎃', '🤖', '🛸', '🌵', '🍄'];
const COLORS = [
  '#a78bfa', '#f472b6', '#fb923c', '#34d399', '#60a5fa',
  '#facc15', '#f87171', '#2dd4bf', '#a3e635', '#c084fc',
  '#fb7185', '#38bdf8', '#fbbf24', '#4ade80', '#e879f9',
];

// Consonants and vowels for pronounceable codes
const CONSONANTS = 'BCDFGHJKLMNPRSTV';
const VOWELS = 'AEIOU';

// Grace period before actually removing a disconnected player
const DISCONNECT_GRACE_MS = 30_000; // 30 seconds
// Time limit per clue turn in online mode
const CLUE_TURN_MS = 30_000; // 30 seconds

export class GameManager {
  private games: Map<string, Game> = new Map();
  // Reverse lookup: playerId -> game code (for O(1) game finding)
  private playerGameMap: Map<string, string> = new Map();
  // Disconnect timers: playerId -> timeout handle
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Clue turn timers: game code -> timeout handle
  private turnTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  generateCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        const chars = i % 2 === 0 ? CONSONANTS : VOWELS;
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      attempts++;
    } while (this.games.has(code) && attempts < 100);
    return code;
  }

  createGame(playerId: string, socketId: string, hostName: string): Game {
    const code = this.generateCode();
    const game: Game = {
      code,
      hostId: playerId,
      phase: 'lobby',
      mode: 'online',
      players: [
        {
          id: playerId,
          socketId,
          name: hostName,
          avatar: AVATARS[0],
          color: COLORS[0],
          isHost: true,
          hasSeenRole: false,
          clue: null,
          isEliminated: false,
          disconnectedAt: null,
        },
      ],
      secretWord: null,
      impostorId: null,
      votes: {},
      round: 1,
      turnIndex: 0,
      turnDeadline: null,
      settings: { language: 'es' },
    };
    this.games.set(code, game);
    this.playerGameMap.set(playerId, code);
    return game;
  }

  getGame(code: string): Game | undefined {
    return this.games.get(code.toUpperCase());
  }

  setMode(playerId: string, code: string, mode: GameMode): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    if (game.phase !== 'lobby') return { error: 'wrong_phase' };

    game.mode = mode;
    return { game };
  }

  addPlayer(code: string, playerId: string, socketId: string, playerName: string): { game?: Game; error?: string } {
    const game = this.games.get(code.toUpperCase());
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'lobby') return { error: 'game_in_progress' };
    if (game.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
      return { error: 'name_taken' };
    }
    if (game.players.length >= 15) return { error: 'room_full' };

    const usedAvatars = new Set(game.players.map((p) => p.avatar));
    const availableAvatar = AVATARS.find((a) => !usedAvatars.has(a)) || AVATARS[game.players.length % AVATARS.length];

    const player: Player = {
      id: playerId,
      socketId,
      name: playerName,
      avatar: availableAvatar,
      color: COLORS[game.players.length % COLORS.length],
      isHost: false,
      hasSeenRole: false,
      clue: null,
      isEliminated: false,
      disconnectedAt: null,
    };
    game.players.push(player);
    this.playerGameMap.set(playerId, code.toUpperCase());
    return { game };
  }

  /** Mark player as disconnected (start grace period). Returns the game code if found. */
  markDisconnected(socketId: string): { playerId?: string; code?: string } {
    // Find player by socketId
    for (const game of this.games.values()) {
      const player = game.players.find((p) => p.socketId === socketId);
      if (player) {
        player.socketId = null;
        player.disconnectedAt = Date.now();
        return { playerId: player.id, code: game.code };
      }
    }
    return {};
  }

  /** Reconnect a player: update their socketId and clear disconnect state */
  reconnectPlayer(playerId: string, socketId: string): { game?: Game; code?: string } {
    const code = this.playerGameMap.get(playerId);
    if (!code) return {};

    const game = this.games.get(code);
    if (!game) return {};

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return {};

    player.socketId = socketId;
    player.disconnectedAt = null;

    // Cancel any pending removal timer
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    return { game, code };
  }

  /** Set a disconnect timer for a player. Calls onRemove when grace period expires. */
  setDisconnectTimer(playerId: string, onExpire: () => void): void {
    // Clear any existing timer
    const existing = this.disconnectTimers.get(playerId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      onExpire();
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(playerId, timer);
  }

  /** Set a turn timer for the clues phase. Calls onExpire when time runs out. */
  setTurnTimer(code: string, onExpire: () => void): void {
    this.clearTurnTimer(code);
    const game = this.games.get(code);
    if (!game) return;
    game.turnDeadline = Date.now() + CLUE_TURN_MS;
    const timer = setTimeout(() => {
      this.turnTimers.delete(code);
      onExpire();
    }, CLUE_TURN_MS);
    this.turnTimers.set(code, timer);
  }

  /** Clear any active turn timer for a game */
  clearTurnTimer(code: string): void {
    const timer = this.turnTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(code);
    }
    const game = this.games.get(code);
    if (game) game.turnDeadline = null;
  }

  /** Skip the current player's turn (timer expired) */
  skipTurn(code: string): { game?: Game } {
    const game = this.games.get(code);
    if (!game || game.phase !== 'clues') return {};
    const activePlayers = game.players.filter((p) => !p.isEliminated);
    if (game.turnIndex < activePlayers.length) {
      game.turnIndex++;
    }
    game.turnDeadline = null;
    return { game };
  }

  removePlayer(playerId: string): { game?: Game; hostChanged?: boolean; gameEnded?: boolean; code?: string } {
    const code = this.playerGameMap.get(playerId);
    if (!code) {
      // Fallback: search all games
      for (const [c, game] of this.games) {
        const idx = game.players.findIndex((p) => p.id === playerId);
        if (idx !== -1) {
          return this._removePlayerFromGame(c, game, idx, playerId);
        }
      }
      return {};
    }

    const game = this.games.get(code);
    if (!game) {
      this.playerGameMap.delete(playerId);
      return {};
    }

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      this.playerGameMap.delete(playerId);
      return {};
    }

    return this._removePlayerFromGame(code, game, playerIndex, playerId);
  }

  private _removePlayerFromGame(code: string, game: Game, playerIndex: number, playerId: string): { game?: Game; hostChanged?: boolean; gameEnded?: boolean; code?: string } {
    const wasHost = game.players[playerIndex].isHost;
    const wasImpostor = game.players[playerIndex].id === game.impostorId;
    game.players.splice(playerIndex, 1);
    this.playerGameMap.delete(playerId);

    // Cancel any disconnect timer
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    // If no players left, delete the game
    if (game.players.length === 0) {
      this.games.delete(code);
      return { gameEnded: true, code };
    }

    // If impostor left during active game, end the game
    if (wasImpostor && game.phase !== 'lobby' && game.phase !== 'results') {
      this.clearTurnTimer(code);
      game.phase = 'results';
      return { game, gameEnded: true, code };
    }

    // Too few players during active game
    if (game.players.length < 3 && game.phase !== 'lobby' && game.phase !== 'results') {
      this.clearTurnTimer(code);
      game.phase = 'results';
      return { game, gameEnded: true, code };
    }

    let hostChanged = false;
    if (wasHost && game.players.length > 0) {
      game.players[0].isHost = true;
      game.hostId = game.players[0].id;
      hostChanged = true;
    }

    // Fix turnIndex if needed during clues
    if (game.phase === 'clues') {
      const activePlayers = game.players.filter((p) => !p.isEliminated);
      if (game.turnIndex >= activePlayers.length) {
        game.turnIndex = 0;
      }
    }

    return { game, hostChanged, code };
  }

  startGame(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    if (game.players.length < 3) return { error: 'not_enough_players' };

    game.phase = 'setup';
    return { game };
  }

  setWord(playerId: string, code: string, word: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    if (!word.trim()) return { error: 'empty_word' };

    game.secretWord = word.trim();

    // Randomly pick impostor (exclude the host — they chose the word)
    const nonHostPlayers = game.players.filter((p) => p.id !== playerId);
    const randomIndex = Math.floor(Math.random() * nonHostPlayers.length);
    game.impostorId = nonHostPlayers[randomIndex].id;

    // Reset reveal state
    game.players.forEach((p) => {
      p.hasSeenRole = false;
      p.clue = null;
    });
    game.votes = {};
    game.round = 1;
    game.turnIndex = 0;
    game.turnDeadline = null;

    game.phase = 'reveal';
    return { game };
  }

  markRoleReady(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'player_not_found' };

    player.hasSeenRole = true;

    // Check if all players have seen their role
    const allReady = game.players.every((p) => p.hasSeenRole);
    if (allReady) {
      // Local mode goes to 'playing' (in-person), online goes to 'clues'
      game.phase = game.mode === 'local' ? 'playing' : 'clues';
    }

    return { game };
  }

  revealImpostor(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    if (game.phase !== 'playing') return { error: 'wrong_phase' };

    game.phase = 'results';
    return { game };
  }

  transferHost(playerId: string, code: string, newHostId: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };

    const newHost = game.players.find((p) => p.id === newHostId);
    if (!newHost) return { error: 'player_not_found' };

    this.clearTurnTimer(code);
    // Transfer host
    game.players.forEach((p) => { p.isHost = false; });
    newHost.isHost = true;
    game.hostId = newHostId;

    // Reset for new round
    game.phase = 'setup';
    game.secretWord = null;
    game.impostorId = null;
    game.votes = {};
    game.round = 1;
    game.turnIndex = 0;
    game.players.forEach((p) => {
      p.hasSeenRole = false;
      p.clue = null;
      p.isEliminated = false;
    });

    return { game };
  }

  submitClue(playerId: string, code: string, clue: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'clues') return { error: 'wrong_phase' };

    const activePlayers = game.players.filter((p) => !p.isEliminated);
    const currentPlayer = activePlayers[game.turnIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) return { error: 'not_your_turn' };
    if (!clue.trim()) return { error: 'empty_clue' };

    currentPlayer.clue = clue.trim();

    // Advance turn
    game.turnIndex++;
    game.turnDeadline = null;

    return { game };
  }

  nextRound(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };

    game.round++;
    game.turnIndex = 0;
    game.turnDeadline = null;
    game.players.forEach((p) => {
      if (!p.isEliminated) p.clue = null;
    });

    return { game };
  }

  startVoting(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };

    this.clearTurnTimer(code);
    game.phase = 'voting';
    game.votes = {};
    return { game };
  }

  vote(playerId: string, code: string, votedForId: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'voting') return { error: 'wrong_phase' };
    if (playerId === votedForId) return { error: 'cannot_vote_self' };

    const voter = game.players.find((p) => p.id === playerId);
    if (!voter) return { error: 'player_not_found' };

    const target = game.players.find((p) => p.id === votedForId);
    if (!target) return { error: 'target_not_found' };

    game.votes[playerId] = votedForId;

    // Check if all active players have voted
    const activePlayers = game.players.filter((p) => !p.isEliminated);
    const allVoted = activePlayers.every((p) => game.votes[p.id]);

    if (allVoted) {
      game.phase = 'results';
    }

    return { game };
  }

  playAgain(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };

    game.phase = 'setup';
    game.secretWord = null;
    game.impostorId = null;
    game.votes = {};
    game.round = 1;
    game.turnIndex = 0;
    game.turnDeadline = null;
    game.players.forEach((p) => {
      p.hasSeenRole = false;
      p.clue = null;
      p.isEliminated = false;
    });

    return { game };
  }

  endGame(code: string): void {
    this.clearTurnTimer(code);
    const game = this.games.get(code);
    if (game) {
      // Clean up player-game mappings and timers
      for (const player of game.players) {
        this.playerGameMap.delete(player.id);
        const timer = this.disconnectTimers.get(player.id);
        if (timer) {
          clearTimeout(timer);
          this.disconnectTimers.delete(player.id);
        }
      }
    }
    this.games.delete(code);
  }

  getPersonalizedState(game: Game, playerId: string): PersonalizedGameState {
    const player = game.players.find((p) => p.id === playerId);
    const isHost = player?.isHost ?? false;
    const isImpostor = game.impostorId === playerId;
    const host = game.players.find((p) => p.isHost);

    return {
      code: game.code,
      phase: game.phase,
      mode: game.mode,
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        isHost: p.isHost,
        hasSeenRole: p.hasSeenRole,
        clue: p.clue,
        isEliminated: p.isEliminated,
        isConnected: p.disconnectedAt === null,
      })),
      // Only show word to non-impostors during reveal/clues/voting/playing
      secretWord:
        game.phase === 'results'
          ? game.secretWord
          : isImpostor
            ? null
            : game.secretWord,
      isImpostor,
      // Only reveal impostor during results
      impostorId: game.phase === 'results' ? game.impostorId : null,
      votes: game.phase === 'results' ? game.votes : this.getVoteProgress(game, playerId),
      round: game.round,
      turnIndex: game.turnIndex,
      turnDeadline: game.turnDeadline,
      playerId,
      isHost,
      hostName: host?.name ?? '',
      settings: game.settings,
    };
  }

  private getVoteProgress(game: Game, playerId: string): Record<string, string> {
    // During voting, only show that a player HAS voted (not who for)
    // by mapping voter -> '' for everyone except the current player
    const progress: Record<string, string> = {};
    for (const [voterId, votedFor] of Object.entries(game.votes)) {
      if (voterId === playerId) {
        progress[voterId] = votedFor;
      } else {
        progress[voterId] = '__voted__';
      }
    }
    return progress;
  }

  findGameByPlayerId(playerId: string): Game | undefined {
    const code = this.playerGameMap.get(playerId);
    if (code) {
      return this.games.get(code);
    }
    // Fallback: scan all games
    for (const game of this.games.values()) {
      if (game.players.some((p) => p.id === playerId)) {
        return game;
      }
    }
    return undefined;
  }

  /** Get the socketId for a player (needed to send them messages) */
  getSocketId(playerId: string): string | null {
    const code = this.playerGameMap.get(playerId);
    if (!code) return null;
    const game = this.games.get(code);
    if (!game) return null;
    const player = game.players.find((p) => p.id === playerId);
    return player?.socketId ?? null;
  }
}
