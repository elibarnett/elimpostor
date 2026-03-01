import type { Game, GameMode, GameSettings, Player, PersonalizedGameState, GamePhase, SessionScore, RoundScoreDelta } from './types.js';

import { AVATARS, AVATAR_COLORS as COLORS } from './constants.js';
import { persistGameResult } from './db/persistGameResult.js';
import { createSession, persistSessionScores, endSession } from './db/persistSessionScore.js';

// Scoring constants
const SCORE_CITIZENS_WIN_CORRECT_VOTE = 2;  // voted for impostor + citizens win
const SCORE_CITIZENS_WIN_WRONG_VOTE   = 1;  // didn't vote for impostor + citizens win
const SCORE_VOTED_CORRECTLY_BONUS     = 1;  // always given when voted for impostor (stacks)
const SCORE_IMPOSTOR_WIN              = 3;  // impostor survived or guessed correctly

// Consonants and vowels for pronounceable codes
const CONSONANTS = 'BCDFGHJKLMNPRSTV';
const VOWELS = 'AEIOU';

// Grace period before actually removing a disconnected player
const DISCONNECT_GRACE_MS = 120_000; // 2 minutes — phones lock in ~30-60s, give ample time to rejoin
// Time limit for impostor's word guess
const GUESS_TURN_MS = 15_000; // 15 seconds

const DEFAULT_SETTINGS: GameSettings = {
  language: 'es',
  elimination: false,
  clueTimer: 30,
  votingStyle: 'anonymous',
  maxRounds: 1,
  allowSkip: true,
  discussionTimer: 60,
  theme: 'space',
};

const VALID_THEMES = ['space', 'medieval', 'pirate', 'haunted', 'office'] as const;

const MESSAGE_RATE_LIMIT_MS = 2_000; // min ms between messages per player

export class GameManager {
  private games: Map<string, Game> = new Map();
  // Reverse lookup: playerId -> game code (for O(1) game finding)
  private playerGameMap: Map<string, string> = new Map();
  // Disconnect timers: playerId -> timeout handle
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Clue turn timers: game code -> timeout handle
  private turnTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Impostor guess timers: game code -> timeout handle
  private guessTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Discussion timers: game code -> timeout handle
  private discussionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /** Capture current-round clues into clueHistory before they are cleared. */
  private _snapshotClues(game: Game): void {
    for (const p of game.players) {
      if (p.isSpectator || p.isEliminated) continue;
      if (p.clue !== null) {
        if (!game.clueHistory[p.id]) game.clueHistory[p.id] = [];
        game.clueHistory[p.id].push(p.clue);
      }
    }
  }

  /** Capture current-round votes into voteHistory before they are cleared. */
  private _snapshotVotes(game: Game): void {
    if (Object.keys(game.votes).length > 0) {
      game.voteHistory.push({ ...game.votes });
    }
  }

  /** Determine which team won the game. */
  private _determineWinningTeam(game: Game): 'impostor' | 'citizens' {
    // Impostor guessed the word correctly
    if (game.impostorGuessCorrect === true) return 'impostor';

    // Impostor was caught and failed to guess (or timed out)
    if (game.impostorGuessCorrect === false) return 'citizens';

    // impostorGuessCorrect is null — no guess phase happened

    // Impostor left the game → citizens win by forfeit
    const impostorPresent = game.players.some((p) => p.id === game.impostorId);
    if (!impostorPresent) return 'citizens';

    // Elimination mode: impostor survived (not eliminated)
    if (game.settings.elimination) {
      const impostor = game.players.find((p) => p.id === game.impostorId);
      if (impostor && !impostor.isEliminated) return 'impostor';
    }

    // Standard mode: impostor not caught → impostor wins
    return 'impostor';
  }

  /** Fire-and-forget: persist game result to DB. Only persists once per game. */
  private _persistIfNeeded(game: Game): void {
    if (game.resultsPersisted) return;
    if (game.phase !== 'results') return;

    game.resultsPersisted = true;
    const winningTeam = this._determineWinningTeam(game);

    // Compute and apply score deltas before persisting
    this._applyScores(game, winningTeam);

    persistGameResult(game, winningTeam).catch((err) => {
      console.error(`Failed to persist game result for ${game.code}:`, err);
    });

    // Persist session scores fire-and-forget
    if (game.sessionId !== null) {
      const sessionId = game.sessionId;
      persistSessionScores(sessionId, game.sessionScores, game.sessionRound).catch((err) => {
        console.error(`Failed to persist session scores for ${game.code}:`, err);
      });
    }
  }

  /** Compute per-player score deltas for this round and apply to sessionScores. */
  private _applyScores(game: Game, winningTeam: string): void {
    if (game.mode === 'local') return; // no scoring in local/in-person mode

    const impostorId = game.impostorId;
    if (!impostorId) return;

    // Build votedCorrectly map from current votes + vote history
    const finalVoteHistory = [...game.voteHistory];
    if (Object.keys(game.votes).length > 0) finalVoteHistory.push({ ...game.votes });

    const votedCorrectlyMap: Record<string, boolean> = {};
    for (const roundVotes of finalVoteHistory) {
      for (const [voterId, votedForId] of Object.entries(roundVotes)) {
        if (votedForId === impostorId) votedCorrectlyMap[voterId] = true;
        if (!(voterId in votedCorrectlyMap)) votedCorrectlyMap[voterId] = false;
      }
    }

    const citizensWon = winningTeam === 'citizens';
    const impostorWon = winningTeam === 'impostor';
    const impostorGuessedCorrectly = game.impostorGuessCorrect === true;

    const deltas: RoundScoreDelta[] = [];

    for (const entry of game.sessionScores) {
      const isImpostor = entry.playerId === impostorId;
      const votedCorrectly = votedCorrectlyMap[entry.playerId] === true;
      let delta = 0;

      if (isImpostor) {
        if (impostorWon) {
          delta = SCORE_IMPOSTOR_WIN;
          deltas.push({ playerId: entry.playerId, delta, reason: impostorGuessedCorrectly ? 'impostorGuess' : 'impostorWin' });
        }
        entry.impostorCount++;
      } else {
        // voted correctly bonus — always awarded if they voted for impostor
        if (votedCorrectly) {
          delta += SCORE_VOTED_CORRECTLY_BONUS;
          deltas.push({ playerId: entry.playerId, delta: SCORE_VOTED_CORRECTLY_BONUS, reason: 'votedCorrectly' });
        }
        if (citizensWon) {
          const winBonus = votedCorrectly ? SCORE_CITIZENS_WIN_CORRECT_VOTE : SCORE_CITIZENS_WIN_WRONG_VOTE;
          delta += winBonus;
          deltas.push({ playerId: entry.playerId, delta: winBonus, reason: 'citizensWin' });
        }
        if (citizensWon) entry.roundsWon++;
      }

      entry.score += delta;
      entry.roundsPlayed++;
    }

    game.lastRoundDeltas = deltas;
  }

  /** Initialise session scores from current non-spectator players (call on startGame). */
  private _initSessionScores(game: Game): void {
    const existing = new Set(game.sessionScores.map((s) => s.playerId));
    for (const p of game.players) {
      if (p.isSpectator || existing.has(p.id)) continue;
      game.sessionScores.push({
        playerId: p.id,
        playerName: p.name,
        avatar: p.avatar,
        score: 0,
        roundsWon: 0,
        roundsPlayed: 0,
        impostorCount: 0,
      });
    }
    // Update names/avatars for existing entries (player may have renamed)
    for (const entry of game.sessionScores) {
      const p = game.players.find((pl) => pl.id === entry.playerId);
      if (p) { entry.playerName = p.name; entry.avatar = p.avatar; }
    }
  }

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

  createGame(playerId: string, socketId: string, hostName: string, preferredAvatar?: string): Game {
    const code = this.generateCode();
    const resolvedAvatar = (preferredAvatar && (AVATARS as readonly string[]).includes(preferredAvatar))
      ? preferredAvatar
      : AVATARS[0];
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
          avatar: resolvedAvatar,
          color: COLORS[0],
          isHost: true,
          isSpectator: false,
          hasSeenRole: false,
          clue: null,
          isEliminated: false,
          disconnectedAt: null,
          lastMessageAt: null,
        },
      ],
      secretWord: null,
      impostorId: null,
      votes: {},
      round: 1,
      turnIndex: 0,
      turnDeadline: null,
      impostorGuess: null,
      impostorGuessCorrect: null,
      guessDeadline: null,
      settings: { ...DEFAULT_SETTINGS },
      eliminationHistory: [],
      lastEliminatedId: null,
      clueHistory: {},
      voteHistory: [],
      createdAt: Date.now(),
      resultsPersisted: false,
      messages: [],
      discussionDeadline: null,
      sessionId: null,
      sessionRound: 0,
      sessionScores: [],
      lastRoundDeltas: [],
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

  setElimination(playerId: string, code: string, enabled: boolean): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    if (game.phase !== 'lobby') return { error: 'wrong_phase' };

    game.settings.elimination = enabled;
    return { game };
  }

  updateSettings(playerId: string, code: string, partial: Partial<GameSettings>): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    if (game.phase !== 'lobby') return { error: 'wrong_phase' };

    // Validate each provided field
    if (partial.clueTimer !== undefined) {
      if (![0, 15, 30, 45, 60].includes(partial.clueTimer)) return { error: 'invalid_setting' };
    }
    if (partial.votingStyle !== undefined) {
      if (!['anonymous', 'public'].includes(partial.votingStyle)) return { error: 'invalid_setting' };
    }
    if (partial.maxRounds !== undefined) {
      if (![1, 2, 3].includes(partial.maxRounds)) return { error: 'invalid_setting' };
    }
    if (partial.allowSkip !== undefined) {
      if (typeof partial.allowSkip !== 'boolean') return { error: 'invalid_setting' };
    }
    if (partial.elimination !== undefined) {
      if (typeof partial.elimination !== 'boolean') return { error: 'invalid_setting' };
    }
    if (partial.language !== undefined) {
      if (!['es', 'en'].includes(partial.language)) return { error: 'invalid_setting' };
    }
    if (partial.discussionTimer !== undefined) {
      if (![0, 30, 60, 90].includes(partial.discussionTimer)) return { error: 'invalid_setting' };
    }
    if (partial.theme !== undefined) {
      if (!(VALID_THEMES as readonly string[]).includes(partial.theme)) return { error: 'invalid_setting' };
    }

    // Only merge known keys
    const allowed: (keyof GameSettings)[] = ['language', 'elimination', 'clueTimer', 'votingStyle', 'maxRounds', 'allowSkip', 'discussionTimer', 'theme'];
    for (const key of allowed) {
      if (key in partial) {
        (game.settings as unknown as Record<string, unknown>)[key] = partial[key];
      }
    }

    return { game };
  }

  addPlayer(code: string, playerId: string, socketId: string, playerName: string, preferredAvatar?: string): { game?: Game; error?: string } {
    const game = this.games.get(code.toUpperCase());
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'lobby') return { error: 'game_in_progress' };
    if (game.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
      return { error: 'name_taken' };
    }
    if (game.players.length >= 15) return { error: 'room_full' };

    const usedAvatars = new Set(game.players.map((p) => p.avatar));
    const resolvedAvatar = (preferredAvatar && (AVATARS as readonly string[]).includes(preferredAvatar) && !usedAvatars.has(preferredAvatar))
      ? preferredAvatar
      : AVATARS.find((a) => !usedAvatars.has(a)) || AVATARS[game.players.length % AVATARS.length];

    const player: Player = {
      id: playerId,
      socketId,
      name: playerName,
      avatar: resolvedAvatar,
      color: COLORS[game.players.length % COLORS.length],
      isHost: false,
      isSpectator: false,
      hasSeenRole: false,
      clue: null,
      isEliminated: false,
      disconnectedAt: null,
      lastMessageAt: null,
    };
    game.players.push(player);
    this.playerGameMap.set(playerId, code.toUpperCase());
    return { game };
  }

  addSpectator(code: string, playerId: string, socketId: string, playerName: string, preferredAvatar?: string): { game?: Game; error?: string } {
    const game = this.games.get(code.toUpperCase());
    if (!game) return { error: 'room_not_found' };
    if (game.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
      return { error: 'name_taken' };
    }
    if (game.players.length >= 15) return { error: 'room_full' };

    const usedAvatars = new Set(game.players.map((p) => p.avatar));
    const resolvedAvatar = (preferredAvatar && (AVATARS as readonly string[]).includes(preferredAvatar) && !usedAvatars.has(preferredAvatar))
      ? preferredAvatar
      : AVATARS.find((a) => !usedAvatars.has(a)) || AVATARS[game.players.length % AVATARS.length];

    const spectator: Player = {
      id: playerId,
      socketId,
      name: playerName,
      avatar: resolvedAvatar,
      color: COLORS[game.players.length % COLORS.length],
      isHost: false,
      isSpectator: true,
      hasSeenRole: false,
      clue: null,
      isEliminated: false,
      disconnectedAt: null,
      lastMessageAt: null,
    };
    game.players.push(spectator);
    this.playerGameMap.set(playerId, code.toUpperCase());
    return { game };
  }

  convertToPlayer(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'lobby') return { error: 'wrong_phase' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'player_not_found' };
    if (!player.isSpectator) return { error: 'already_player' };

    const nonSpectatorCount = game.players.filter((p) => !p.isSpectator).length;
    if (nonSpectatorCount >= 15) return { error: 'room_full' };

    player.isSpectator = false;
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

    const timerMs = game.settings.clueTimer * 1000;
    if (timerMs === 0) {
      // Unlimited: no timer, no deadline
      return;
    }

    game.turnDeadline = Date.now() + timerMs;
    const timer = setTimeout(() => {
      this.turnTimers.delete(code);
      onExpire();
    }, timerMs);
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
    const activePlayers = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
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
    const wasSpectator = game.players[playerIndex].isSpectator;
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

    // Spectator leaving doesn't affect game state
    if (wasSpectator) {
      return { game, code };
    }

    // If impostor left during active game, end the game
    if (wasImpostor && game.phase !== 'lobby' && game.phase !== 'results') {
      this.clearTurnTimer(code);
      this.clearGuessTimer(code);
      game.phase = 'results';
      this._persistIfNeeded(game);
      return { game, gameEnded: true, code };
    }

    // Too few actual players during active game
    const actualPlayers = game.players.filter((p) => !p.isSpectator);
    const playablePlayers = game.settings.elimination
      ? actualPlayers.filter((p) => !p.isEliminated)
      : actualPlayers;
    if (playablePlayers.length < 3 && game.phase !== 'lobby' && game.phase !== 'results') {
      this.clearTurnTimer(code);
      this.clearGuessTimer(code);
      game.phase = 'results';
      this._persistIfNeeded(game);
      return { game, gameEnded: true, code };
    }

    let hostChanged = false;
    if (wasHost && game.players.length > 0) {
      // Transfer host to first non-spectator player, or first player if all are spectators
      const nextHost = game.players.find((p) => !p.isSpectator) || game.players[0];
      nextHost.isHost = true;
      game.hostId = nextHost.id;
      hostChanged = true;
    }

    // Fix turnIndex if needed during clues
    if (game.phase === 'clues') {
      const activePlayers = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
      if (game.turnIndex >= activePlayers.length) {
        game.turnIndex = 0;
      }
    }

    return { game, hostChanged, code };
  }

  startGame(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'lobby') return { error: 'wrong_phase' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    const actualPlayers = game.players.filter((p) => !p.isSpectator);
    if (actualPlayers.length < 3) return { error: 'not_enough_players' };

    game.phase = 'setup';

    // Start a new session only on the very first game (sessionId null)
    if (game.sessionId === null) {
      createSession(game.code).then((id) => {
        if (id !== null) game.sessionId = id;
      }).catch(() => { /* DB unavailable, scoring continues in-memory */ });
    }

    this._initSessionScores(game);
    return { game };
  }

  setWord(playerId: string, code: string, word: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'setup') return { error: 'wrong_phase' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    if (!word.trim()) return { error: 'empty_word' };

    game.secretWord = word.trim();

    // Randomly pick impostor (exclude the host and spectators — host chose the word)
    const nonHostPlayers = game.players.filter((p) => p.id !== playerId && !p.isSpectator);
    if (nonHostPlayers.length === 0) return { error: 'not_enough_players' };
    const randomIndex = Math.floor(Math.random() * nonHostPlayers.length);
    game.impostorId = nonHostPlayers[randomIndex].id;

    // Reset reveal state (only for actual players, not spectators)
    game.players.forEach((p) => {
      if (!p.isSpectator) {
        p.hasSeenRole = false;
        p.clue = null;
      }
    });
    game.votes = {};
    game.round = 1;
    game.sessionRound++;
    game.turnIndex = 0;
    game.turnDeadline = null;
    game.impostorGuess = null;
    game.impostorGuessCorrect = null;
    game.guessDeadline = null;
    game.eliminationHistory = [];
    game.lastEliminatedId = null;
    game.clueHistory = {};
    game.voteHistory = [];
    game.resultsPersisted = false;

    game.phase = 'reveal';
    return { game };
  }

  markRoleReady(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'reveal') return { error: 'wrong_phase' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'player_not_found' };
    if (player.isSpectator) return { error: 'spectator_cannot_act' };

    player.hasSeenRole = true;

    // Check if all actual players have seen their role (spectators excluded)
    const actualPlayers = game.players.filter((p) => !p.isSpectator);
    const allReady = actualPlayers.every((p) => p.hasSeenRole);
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
    this._persistIfNeeded(game);
    return { game };
  }

  transferHost(playerId: string, code: string, newHostId: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };

    const newHost = game.players.find((p) => p.id === newHostId);
    if (!newHost) return { error: 'player_not_found' };
    if (newHost.isSpectator) return { error: 'cannot_transfer_to_spectator' };

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
    game.impostorGuess = null;
    game.impostorGuessCorrect = null;
    game.guessDeadline = null;
    game.eliminationHistory = [];
    game.lastEliminatedId = null;
    game.clueHistory = {};
    game.voteHistory = [];
    game.resultsPersisted = false;
    game.players.forEach((p) => {
      if (!p.isSpectator) {
        p.hasSeenRole = false;
        p.clue = null;
        p.isEliminated = false;
      }
    });

    return { game };
  }

  submitClue(playerId: string, code: string, clue: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'clues') return { error: 'wrong_phase' };

    const activePlayers = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
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
    if (game.phase !== 'clues') return { error: 'wrong_phase' };
    if (game.hostId !== playerId) return { error: 'not_host' };

    this._snapshotClues(game);
    game.round++;
    game.turnIndex = 0;
    game.turnDeadline = null;
    game.players.forEach((p) => {
      if (!p.isEliminated && !p.isSpectator) p.clue = null;
    });

    return { game };
  }

  startVoting(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'clues') return { error: 'wrong_phase' };
    if (game.hostId !== playerId) return { error: 'not_host' };

    this.clearTurnTimer(code);
    this._snapshotClues(game);

    if (game.mode === 'online' && game.settings.discussionTimer > 0) {
      game.phase = 'discussion';
      game.messages = [];
      game.discussionDeadline = Date.now() + game.settings.discussionTimer * 1000;
    } else {
      game.phase = 'voting';
      game.votes = {};
    }
    return { game };
  }

  /** Transition from discussion to voting (host-initiated or timer expiry). */
  startDiscussionVoting(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'discussion') return { error: 'wrong_phase' };
    if (game.hostId !== playerId) return { error: 'not_host' };

    this.clearDiscussionTimer(code);
    game.phase = 'voting';
    game.votes = {};
    game.discussionDeadline = null;
    return { game };
  }

  /** Auto-end discussion (timer expiry — no host check). */
  autoEndDiscussion(code: string): { game?: Game } {
    const game = this.games.get(code);
    if (!game || game.phase !== 'discussion') return {};
    game.phase = 'voting';
    game.votes = {};
    game.discussionDeadline = null;
    return { game };
  }

  /** Send a chat message during the discussion phase. */
  sendMessage(playerId: string, code: string, text: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'discussion') return { error: 'wrong_phase' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { error: 'player_not_found' };
    if (player.isSpectator) return { error: 'spectator_cannot_act' };

    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return { error: 'empty_message' };

    // Rate limiting: 1 message per 2 seconds
    const now = Date.now();
    if (player.lastMessageAt !== null && now - player.lastMessageAt < MESSAGE_RATE_LIMIT_MS) {
      return { error: 'rate_limited' };
    }
    player.lastMessageAt = now;

    game.messages.push({
      playerId,
      playerName: player.name,
      avatar: player.avatar,
      text: trimmed,
      timestamp: now,
    });

    return { game };
  }

  setDiscussionTimer(code: string, callback: () => void): void {
    this.clearDiscussionTimer(code);
    const game = this.games.get(code);
    if (!game || game.phase !== 'discussion') return;
    const ms = game.settings.discussionTimer * 1000;
    const handle = setTimeout(callback, ms);
    this.discussionTimers.set(code, handle);
  }

  clearDiscussionTimer(code: string): void {
    const handle = this.discussionTimers.get(code);
    if (handle) {
      clearTimeout(handle);
      this.discussionTimers.delete(code);
    }
  }

  /** Auto-advance to next round (server-internal, no host check) */
  autoNextRound(code: string): { game?: Game } {
    const game = this.games.get(code);
    if (!game) return {};
    this._snapshotClues(game);
    game.round++;
    game.turnIndex = 0;
    game.turnDeadline = null;
    game.players.forEach((p) => {
      if (!p.isEliminated && !p.isSpectator) p.clue = null;
    });
    return { game };
  }

  /** Auto-start voting (server-internal, no host check) */
  autoStartVoting(code: string): { game?: Game } {
    const game = this.games.get(code);
    if (!game) return {};
    this.clearTurnTimer(code);
    this._snapshotClues(game);

    if (game.mode === 'online' && game.settings.discussionTimer > 0) {
      game.phase = 'discussion';
      game.messages = [];
      game.discussionDeadline = Date.now() + game.settings.discussionTimer * 1000;
    } else {
      game.phase = 'voting';
      game.votes = {};
    }
    return { game };
  }

  vote(playerId: string, code: string, votedForId: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'voting') return { error: 'wrong_phase' };
    if (playerId === votedForId) return { error: 'cannot_vote_self' };

    const voter = game.players.find((p) => p.id === playerId);
    if (!voter) return { error: 'player_not_found' };
    if (voter.isSpectator) return { error: 'spectator_cannot_act' };
    if (voter.isEliminated) return { error: 'eliminated_cannot_act' };

    const target = game.players.find((p) => p.id === votedForId);
    if (!target) return { error: 'target_not_found' };
    if (target.isSpectator) return { error: 'cannot_vote_spectator' };
    if (target.isEliminated) return { error: 'cannot_vote_eliminated' };

    game.votes[playerId] = votedForId;

    // Check if all active players have voted (spectators and eliminated excluded)
    const activePlayers = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
    const allVoted = activePlayers.every((p) => game.votes[p.id]);

    if (allVoted) {
      const voteCounts: Record<string, number> = {};
      for (const v of Object.values(game.votes)) {
        voteCounts[v] = (voteCounts[v] || 0) + 1;
      }
      const maxVotes = Math.max(...Object.values(voteCounts), 0);

      if (game.settings.elimination && game.mode === 'online') {
        // --- ELIMINATION MODE ---
        const topVoted = Object.entries(voteCounts)
          .filter(([, count]) => count === maxVotes)
          .map(([id]) => id);

        if (topVoted.length === 1) {
          // Single top-voted player — eliminate them
          const eliminatedId = topVoted[0];
          const eliminatedPlayer = game.players.find((p) => p.id === eliminatedId);
          if (eliminatedPlayer) {
            eliminatedPlayer.isEliminated = true;
            game.lastEliminatedId = eliminatedId;
            game.eliminationHistory.push({ round: game.round, playerId: eliminatedId });
          }

          if (eliminatedId === game.impostorId) {
            // Impostor caught — give last-chance guess
            game.phase = 'impostor-guess';
            game.impostorGuess = null;
            game.impostorGuessCorrect = null;
          } else {
            // Non-impostor eliminated — check if game should end
            const remaining = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
            if (remaining.length <= 2) {
              // Impostor wins by survival
              game.phase = 'results';
              this._persistIfNeeded(game);
            } else {
              // Continue — show elimination results then loop back
              game.phase = 'elimination-results';
            }
          }
        } else {
          // Tie — no elimination, show brief results then continue
          game.lastEliminatedId = null;
          const remaining = game.players.filter((p) => !p.isEliminated && !p.isSpectator);
          if (remaining.length <= 2) {
            game.phase = 'results';
            this._persistIfNeeded(game);
          } else {
            game.phase = 'elimination-results';
          }
        }
      } else {
        // --- STANDARD MODE ---
        const impostorVotes = voteCounts[game.impostorId ?? ''] ?? 0;
        const impostorCaught = impostorVotes > 0 && impostorVotes >= maxVotes;

        if (impostorCaught && game.mode === 'online') {
          game.phase = 'impostor-guess';
          game.impostorGuess = null;
          game.impostorGuessCorrect = null;
        } else {
          game.phase = 'results';
          this._persistIfNeeded(game);
        }
      }
    }

    return { game };
  }

  /** Set a timer for the impostor guess phase. Calls onExpire when time runs out. */
  setGuessTimer(code: string, onExpire: () => void): void {
    this.clearGuessTimer(code);
    const game = this.games.get(code);
    if (!game) return;
    game.guessDeadline = Date.now() + GUESS_TURN_MS;
    const timer = setTimeout(() => {
      this.guessTimers.delete(code);
      onExpire();
    }, GUESS_TURN_MS);
    this.guessTimers.set(code, timer);
  }

  /** Clear any active guess timer for a game */
  clearGuessTimer(code: string): void {
    const timer = this.guessTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.guessTimers.delete(code);
    }
    const game = this.games.get(code);
    if (game) game.guessDeadline = null;
  }

  /** Impostor submits a word guess */
  guessWord(playerId: string, code: string, guess: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.phase !== 'impostor-guess') return { error: 'wrong_phase' };
    if (game.impostorId !== playerId) return { error: 'not_impostor' };

    this.clearGuessTimer(code);
    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = (game.secretWord ?? '').trim().toLowerCase();
    game.impostorGuess = guess.trim();
    game.impostorGuessCorrect = normalizedGuess === normalizedWord;
    game.phase = 'results';
    this._persistIfNeeded(game);
    return { game };
  }

  /** Impostor ran out of time — skip to results with no guess */
  expireGuess(code: string): { game?: Game } {
    const game = this.games.get(code);
    if (!game || game.phase !== 'impostor-guess') return {};
    game.guessDeadline = null;
    game.impostorGuess = null;
    game.impostorGuessCorrect = false;
    game.phase = 'results';
    this._persistIfNeeded(game);
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
    game.impostorGuess = null;
    game.impostorGuessCorrect = null;
    game.guessDeadline = null;
    game.eliminationHistory = [];
    game.lastEliminatedId = null;
    game.clueHistory = {};
    game.voteHistory = [];
    game.resultsPersisted = false;
    game.messages = [];
    game.discussionDeadline = null;
    game.lastRoundDeltas = [];
    this.clearDiscussionTimer(game.code);
    game.players.forEach((p) => {
      if (!p.isSpectator) {
        p.hasSeenRole = false;
        p.clue = null;
        p.isEliminated = false;
        p.lastMessageAt = null;
      }
    });

    // Session continues — add any new players who joined since last round
    this._initSessionScores(game);

    return { game };
  }

  continueAfterElimination(playerId: string, code: string): { game?: Game; error?: string } {
    const game = this.games.get(code);
    if (!game) return { error: 'room_not_found' };
    if (game.hostId !== playerId) return { error: 'not_host' };
    if (game.phase !== 'elimination-results') return { error: 'wrong_phase' };

    // Snapshot clues and votes before resetting for next round
    this._snapshotClues(game);
    this._snapshotVotes(game);

    // Advance to next round of clues
    game.round++;
    game.turnIndex = 0;
    game.turnDeadline = null;
    game.votes = {};
    game.lastEliminatedId = null;
    game.players.forEach((p) => {
      if (!p.isEliminated && !p.isSpectator) {
        p.clue = null;
      }
    });
    game.phase = 'clues';
    return { game };
  }

  endGame(code: string): void {
    this.clearTurnTimer(code);
    this.clearGuessTimer(code);
    this.clearDiscussionTimer(code);
    const game = this.games.get(code);
    if (game) {
      // Mark session as ended in DB
      if (game.sessionId !== null) {
        endSession(game.sessionId, game.sessionRound).catch(() => {});
      }
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
    const isSpectator = player?.isSpectator ?? false;
    const isImpostor = !isSpectator && game.impostorId === playerId;
    const host = game.players.find((p) => p.isHost);
    const spectatorCount = game.players.filter((p) => p.isSpectator).length;

    // Spectators: hide secret word and impostor identity until results
    const showSecretWord = game.phase === 'results'
      ? game.secretWord
      : (isSpectator || isImpostor)
        ? null
        : game.secretWord;

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
        isSpectator: p.isSpectator,
        hasSeenRole: p.hasSeenRole,
        clue: p.clue,
        isEliminated: p.isEliminated,
        isConnected: p.disconnectedAt === null,
      })),
      spectatorCount,
      secretWord: showSecretWord,
      isImpostor,
      isSpectator,
      // Reveal impostor during impostor-guess and results
      impostorId: (game.phase === 'results' || game.phase === 'impostor-guess') ? game.impostorId : null,
      votes: (game.phase === 'results' || game.phase === 'impostor-guess' || game.phase === 'elimination-results')
        ? game.votes
        : (game.phase === 'voting' && game.settings.votingStyle === 'public')
          ? game.votes
          : this.getVoteProgress(game, playerId),
      round: game.round,
      turnIndex: game.turnIndex,
      turnDeadline: game.turnDeadline,
      // Only show guess info during results
      impostorGuess: game.phase === 'results' ? game.impostorGuess : null,
      impostorGuessCorrect: game.phase === 'results' ? game.impostorGuessCorrect : null,
      guessDeadline: game.guessDeadline,
      playerId,
      isHost,
      hostName: host?.name ?? '',
      settings: game.settings,
      eliminationHistory: game.eliminationHistory.map((e) => {
        const p = game.players.find((pl) => pl.id === e.playerId);
        return { round: e.round, playerName: p?.name ?? '?', playerId: e.playerId };
      }),
      lastEliminatedId: game.lastEliminatedId,
      messages: game.phase === 'discussion' ? game.messages : [],
      discussionDeadline: game.phase === 'discussion' ? game.discussionDeadline : null,
      sessionScores: [...game.sessionScores]
        .sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName))
        .map(({ playerId, playerName, avatar, score, roundsWon, roundsPlayed }) => ({
          playerId, playerName, avatar, score, roundsWon, roundsPlayed,
        })),
      lastRoundDeltas: game.lastRoundDeltas,
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
