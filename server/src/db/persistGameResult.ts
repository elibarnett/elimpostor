import { db } from './index.js';
import { games, gamePlayers } from './schema.js';
import type { Game } from '../types.js';

export async function persistGameResult(game: Game, winningTeam: string): Promise<void> {
  if (!db) return;

  // Final snapshot: capture any clues still on players (from the last round)
  const finalClueHistory: Record<string, string[]> = {};
  for (const [pid, clues] of Object.entries(game.clueHistory)) {
    finalClueHistory[pid] = [...clues];
  }
  for (const p of game.players) {
    if (p.isSpectator) continue;
    if (p.clue !== null) {
      if (!finalClueHistory[p.id]) finalClueHistory[p.id] = [];
      finalClueHistory[p.id].push(p.clue);
    }
  }

  // Final snapshot: capture any votes still on the game (from the last round)
  const finalVoteHistory = [...game.voteHistory];
  if (Object.keys(game.votes).length > 0) {
    finalVoteHistory.push({ ...game.votes });
  }

  // Compute votedCorrectly per player across all vote rounds
  const votedCorrectlyMap: Record<string, boolean> = {};
  if (game.impostorId) {
    for (const roundVotes of finalVoteHistory) {
      for (const [voterId, votedForId] of Object.entries(roundVotes)) {
        if (votedForId === game.impostorId) {
          votedCorrectlyMap[voterId] = true;
        }
        if (!(voterId in votedCorrectlyMap)) {
          votedCorrectlyMap[voterId] = false;
        }
      }
    }
  }

  // Insert game record
  const [insertedGame] = await db
    .insert(games)
    .values({
      code: game.code,
      mode: game.mode,
      hostId: game.hostId,
      secretWord: game.secretWord,
      impostorId: game.impostorId,
      settings: game.settings,
      winningTeam,
      roundsPlayed: game.round,
      createdAt: new Date(game.createdAt),
      endedAt: new Date(),
    })
    .returning({ id: games.id });

  // Insert game_players for each non-spectator
  const nonSpectators = game.players.filter((p) => !p.isSpectator);
  if (nonSpectators.length > 0) {
    await db.insert(gamePlayers).values(
      nonSpectators.map((p) => {
        const elimEntry = game.eliminationHistory.find((e) => e.playerId === p.id);
        return {
          gameId: insertedGame.id,
          playerId: p.id,
          playerName: p.name,
          avatar: p.avatar,
          color: p.color,
          wasImpostor: p.id === game.impostorId,
          wasEliminated: p.isEliminated,
          eliminatedRound: elimEntry?.round ?? null,
          finalClues: finalClueHistory[p.id] ?? [],
          votedCorrectly: votedCorrectlyMap[p.id] ?? null,
        };
      }),
    );
  }

  console.log(`Game ${game.code} persisted (winner: ${winningTeam}, players: ${nonSpectators.length})`);
}
