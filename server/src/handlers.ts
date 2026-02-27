import type { Server, Socket } from 'socket.io';
import type { GameManager } from './gameManager.js';
import type { GameSettings } from './types.js';
import { db } from './db/index.js';
import { players } from './db/schema.js';

export function registerHandlers(io: Server, gm: GameManager) {
  function broadcastState(code: string) {
    const game = gm.getGame(code);
    if (!game) return;
    for (const player of game.players) {
      const socketId = player.socketId;
      if (!socketId) continue; // Skip disconnected players
      const state = gm.getPersonalizedState(game, player.id);
      io.to(socketId).emit('game:state', state);
    }
  }

  /** Start the 15s guess timer for the impostor-guess phase. */
  function startGuessTimer(code: string) {
    gm.setGuessTimer(code, () => {
      const { game } = gm.expireGuess(code);
      if (game) broadcastState(code);
    });
  }

  /** Start the discussion timer, advancing to voting on expiry. */
  function startDiscussionTimerIfNeeded(code: string) {
    const game = gm.getGame(code);
    if (!game || game.phase !== 'discussion') return;
    gm.setDiscussionTimer(code, () => {
      const { game: updated } = gm.autoEndDiscussion(code);
      if (updated) broadcastState(code);
    });
  }

  /** Start (or restart) the turn timer. Chains automatically on expiry. Handles auto-advance for maxRounds > 1. */
  function startTurnTimerIfNeeded(code: string) {
    const game = gm.getGame(code);
    if (!game || game.phase !== 'clues') {
      gm.clearTurnTimer(code);
      return;
    }
    const activePlayers = game.players.filter((p: { isEliminated: boolean; isSpectator: boolean }) => !p.isEliminated && !p.isSpectator);
    if (game.turnIndex >= activePlayers.length) {
      gm.clearTurnTimer(code);
      // Auto-advance if maxRounds > 1
      if (game.settings.maxRounds > 1) {
        if (game.round < game.settings.maxRounds) {
          gm.autoNextRound(code);
          startTurnTimerIfNeeded(code);
          broadcastState(code);
        } else {
          gm.autoStartVoting(code);
          const updatedGame = gm.getGame(code);
          if (updatedGame?.phase === 'discussion') {
            startDiscussionTimerIfNeeded(code);
          }
          broadcastState(code);
        }
      }
      return;
    }
    gm.setTurnTimer(code, () => {
      gm.skipTurn(code);
      startTurnTimerIfNeeded(code);
      broadcastState(code);
    });
  }

  io.on('connection', (socket: Socket) => {
    console.log(`Connected: ${socket.id}`);

    // The persistent playerId sent by the client (survives reconnections)
    let playerId: string | null = null;

    // Client sends its persistent playerId on connection
    socket.on('auth', ({ playerId: pid }: { playerId: string }) => {
      playerId = pid;
      console.log(`Auth: socket ${socket.id} -> player ${playerId}`);

      // Fire-and-forget: upsert player record in DB
      if (db) {
        db.insert(players)
          .values({ id: playerId, lastSeenAt: new Date() })
          .onConflictDoUpdate({
            target: players.id,
            set: { lastSeenAt: new Date() },
          })
          .catch((err: unknown) => console.error('Player upsert failed:', err));
      }

      // Try to reconnect to an existing game
      const { game, code } = gm.reconnectPlayer(playerId, socket.id);
      if (game && code) {
        console.log(`Reconnected player ${playerId} to game ${code}`);
        socket.join(code);
        broadcastState(code);
      }
    });

    socket.on('game:create', ({ playerName, preferredAvatar }: { playerName: string; preferredAvatar?: string }) => {
      if (!playerId) {
        socket.emit('game:error', { message: 'not_authenticated' });
        return;
      }
      if (!playerName?.trim()) {
        socket.emit('game:error', { message: 'name_required' });
        return;
      }
      const game = gm.createGame(playerId, socket.id, playerName.trim(), preferredAvatar);
      socket.join(game.code);
      broadcastState(game.code);
    });

    socket.on('game:join', ({ code, playerName, preferredAvatar }: { code: string; playerName: string; preferredAvatar?: string }) => {
      if (!playerId) {
        socket.emit('game:error', { message: 'not_authenticated' });
        return;
      }
      if (!playerName?.trim()) {
        socket.emit('game:error', { message: 'name_required' });
        return;
      }
      if (!code?.trim()) {
        socket.emit('game:error', { message: 'code_required' });
        return;
      }
      const { game, error } = gm.addPlayer(code.toUpperCase(), playerId, socket.id, playerName.trim(), preferredAvatar);
      if (error || !game) {
        socket.emit('game:error', { message: error });
        return;
      }
      socket.join(game.code);
      broadcastState(game.code);
    });

    socket.on('game:watch', ({ code, playerName, preferredAvatar }: { code: string; playerName: string; preferredAvatar?: string }) => {
      if (!playerId) {
        socket.emit('game:error', { message: 'not_authenticated' });
        return;
      }
      if (!playerName?.trim()) {
        socket.emit('game:error', { message: 'name_required' });
        return;
      }
      if (!code?.trim()) {
        socket.emit('game:error', { message: 'code_required' });
        return;
      }
      const { game, error } = gm.addSpectator(code.toUpperCase(), playerId, socket.id, playerName.trim(), preferredAvatar);
      if (error || !game) {
        socket.emit('game:error', { message: error });
        return;
      }
      socket.join(game.code);
      broadcastState(game.code);
    });

    socket.on('game:convertToPlayer', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.convertToPlayer(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:setMode', ({ mode }: { mode: 'online' | 'local' }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.setMode(playerId, game.code, mode);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:setElimination', ({ enabled }: { enabled: boolean }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.setElimination(playerId, game.code, enabled);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:updateSettings', ({ settings }: { settings: Partial<GameSettings> }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.updateSettings(playerId, game.code, settings);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:skipMyTurn', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game || game.phase !== 'clues') return;
      if (!game.settings.allowSkip) {
        socket.emit('game:error', { message: 'skip_not_allowed' });
        return;
      }
      const activePlayers = game.players.filter((p: { isEliminated: boolean; isSpectator: boolean }) => !p.isEliminated && !p.isSpectator);
      const currentPlayer = activePlayers[game.turnIndex];
      if (!currentPlayer || currentPlayer.id !== playerId) return;
      gm.skipTurn(game.code);
      startTurnTimerIfNeeded(game.code);
      broadcastState(game.code);
    });

    socket.on('game:continueAfterElimination', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.continueAfterElimination(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      startTurnTimerIfNeeded(game.code);
      broadcastState(game.code);
    });

    socket.on('game:start', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.startGame(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:setWord', ({ word, category }: { word: string; category?: string }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.setWord(playerId, game.code, word, category);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:roleReady', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const prevPhase = game.phase;
      const { error } = gm.markRoleReady(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      // Start turn timer when transitioning to clues phase
      const updatedGame = gm.getGame(game.code);
      if (prevPhase !== 'clues' && updatedGame?.phase === 'clues') {
        startTurnTimerIfNeeded(game.code);
      }
      broadcastState(game.code);
    });

    socket.on('game:submitClue', ({ clue }: { clue: string }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.submitClue(playerId, game.code, clue);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      startTurnTimerIfNeeded(game.code);
      broadcastState(game.code);
    });

    socket.on('game:nextRound', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.nextRound(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      startTurnTimerIfNeeded(game.code);
      broadcastState(game.code);
    });

    socket.on('game:startVoting', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.startVoting(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      const updatedGame = gm.getGame(game.code);
      if (updatedGame?.phase === 'discussion') {
        startDiscussionTimerIfNeeded(game.code);
      }
      broadcastState(game.code);
    });

    socket.on('game:startDiscussionVoting', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.startDiscussionVoting(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:sendMessage', ({ text }: { text: string }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.sendMessage(playerId, game.code, text);
      if (error) {
        if (error !== 'rate_limited') socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:vote', ({ votedForId }: { votedForId: string }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const prevPhase = game.phase;
      const { error } = gm.vote(playerId, game.code, votedForId);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      // Start guess timer when transitioning to impostor-guess phase
      const updatedGame = gm.getGame(game.code);
      if (prevPhase !== 'impostor-guess' && updatedGame?.phase === 'impostor-guess') {
        startGuessTimer(game.code);
      }
      broadcastState(game.code);
    });

    socket.on('game:guessWord', ({ guess }: { guess: string }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.guessWord(playerId, game.code, guess);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:revealImpostor', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.revealImpostor(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:transferHost', ({ newHostId }: { newHostId: string }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) {
        socket.emit('game:error', { message: 'room_not_found' });
        return;
      }
      const { error } = gm.transferHost(playerId, game.code, newHostId);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:playAgain', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.playAgain(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
      }
      broadcastState(game.code);
    });

    socket.on('game:leave', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const code = game.code;
      const isHost = game.hostId === playerId;

      if (isHost) {
        // Host leaving → end the game for everyone
        for (const p of game.players) {
          if (p.socketId && p.id !== playerId) {
            io.to(p.socketId).emit('game:ended');
          }
        }
        gm.endGame(code);
      } else {
        // Non-host leaving → remove them, game may end if impostor left or too few players
        const { game: updatedGame, gameEnded } = gm.removePlayer(playerId);
        if (updatedGame && gameEnded) {
          for (const p of updatedGame.players) {
            if (p.socketId) io.to(p.socketId).emit('game:ended');
          }
          gm.endGame(code);
        } else if (updatedGame) {
          if (updatedGame.phase === 'clues') {
            startTurnTimerIfNeeded(code);
          }
          broadcastState(code);
        }
      }

      socket.leave(code);
      socket.emit('game:left');
    });

    socket.on('game:end', () => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      // Notify all connected players
      for (const p of game.players) {
        if (p.socketId) io.to(p.socketId).emit('game:ended');
      }
      gm.endGame(game.code);
    });

    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.id} (player: ${playerId})`);
      if (!playerId) return;

      // Mark as disconnected (don't remove yet — grace period)
      const { playerId: pid, code } = gm.markDisconnected(socket.id);
      if (!pid || !code) return;

      // Broadcast updated state (shows player as disconnected)
      broadcastState(code);

      // Start grace period timer — if they don't reconnect, remove them
      gm.setDisconnectTimer(pid, () => {
        console.log(`Grace period expired for player ${pid}, removing from game`);
        const { game, gameEnded } = gm.removePlayer(pid);
        if (!game) return;

        if (gameEnded) {
          for (const p of game.players) {
            if (p.socketId) io.to(p.socketId).emit('game:ended');
          }
          gm.endGame(game.code);
        } else {
          if (game.phase === 'clues') {
            startTurnTimerIfNeeded(game.code);
          }
          broadcastState(game.code);
        }
      });
    });
  });
}
