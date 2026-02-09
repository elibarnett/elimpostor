import type { Server, Socket } from 'socket.io';
import type { GameManager } from './gameManager.js';

export function registerHandlers(io: Server, gm: GameManager) {
  io.on('connection', (socket: Socket) => {
    console.log(`Connected: ${socket.id}`);

    // The persistent playerId sent by the client (survives reconnections)
    let playerId: string | null = null;

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

    // Client sends its persistent playerId on connection
    socket.on('auth', ({ playerId: pid }: { playerId: string }) => {
      playerId = pid;
      console.log(`Auth: socket ${socket.id} -> player ${playerId}`);

      // Try to reconnect to an existing game
      const { game, code } = gm.reconnectPlayer(playerId, socket.id);
      if (game && code) {
        console.log(`Reconnected player ${playerId} to game ${code}`);
        socket.join(code);
        broadcastState(code);
      }
    });

    socket.on('game:create', ({ playerName }: { playerName: string }) => {
      if (!playerId) {
        socket.emit('game:error', { message: 'not_authenticated' });
        return;
      }
      if (!playerName?.trim()) {
        socket.emit('game:error', { message: 'name_required' });
        return;
      }
      const game = gm.createGame(playerId, socket.id, playerName.trim());
      socket.join(game.code);
      broadcastState(game.code);
    });

    socket.on('game:join', ({ code, playerName }: { code: string; playerName: string }) => {
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
      const { game, error } = gm.addPlayer(code.toUpperCase(), playerId, socket.id, playerName.trim());
      if (error || !game) {
        socket.emit('game:error', { message: error });
        return;
      }
      socket.join(game.code);
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

    socket.on('game:setWord', ({ word }: { word: string }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.setWord(playerId, game.code, word);
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
      const { error } = gm.markRoleReady(playerId, game.code);
      if (error) {
        socket.emit('game:error', { message: error });
        return;
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
      broadcastState(game.code);
    });

    socket.on('game:vote', ({ votedForId }: { votedForId: string }) => {
      if (!playerId) return;
      const game = gm.findGameByPlayerId(playerId);
      if (!game) return;
      const { error } = gm.vote(playerId, game.code, votedForId);
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
          broadcastState(game.code);
        }
      });
    });
  });
}
