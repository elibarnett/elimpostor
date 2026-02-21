import { db } from './index.js';
import { sessions, sessionScores } from './schema.js';
import { eq } from 'drizzle-orm';
import type { SessionScore } from '../types.js';

/** Create a new session row and return its DB id. Returns null if DB unavailable. */
export async function createSession(roomCode: string): Promise<number | null> {
  if (!db) return null;
  try {
    const [row] = await db.insert(sessions).values({ roomCode }).returning({ id: sessions.id });
    return row.id;
  } catch (err) {
    console.error('Failed to create session:', err);
    return null;
  }
}

/** Upsert all session scores after a round ends. Fire-and-forget safe. */
export async function persistSessionScores(
  sessionId: number,
  scores: SessionScore[],
  totalRounds: number,
): Promise<void> {
  if (!db || scores.length === 0) return;
  try {
    // Update total_rounds on the session
    await db
      .update(sessions)
      .set({ totalRounds })
      .where(eq(sessions.id, sessionId));

    // Upsert each player's cumulative score
    await Promise.all(
      scores.map((s) =>
        db!
          .insert(sessionScores)
          .values({
            sessionId,
            playerId: s.playerId,
            playerName: s.playerName,
            score: s.score,
            roundsWon: s.roundsWon,
            roundsPlayed: s.roundsPlayed,
            impostorCount: s.impostorCount,
          })
          .onConflictDoUpdate({
            target: [sessionScores.sessionId, sessionScores.playerId],
            set: {
              playerName: s.playerName,
              score: s.score,
              roundsWon: s.roundsWon,
              roundsPlayed: s.roundsPlayed,
              impostorCount: s.impostorCount,
            },
          })
      )
    );
  } catch (err) {
    console.error('Failed to persist session scores:', err);
  }
}

/** Mark a session as ended. Fire-and-forget safe. */
export async function endSession(sessionId: number, totalRounds: number): Promise<void> {
  if (!db) return;
  try {
    await db
      .update(sessions)
      .set({ endedAt: new Date(), totalRounds })
      .where(eq(sessions.id, sessionId));
  } catch (err) {
    console.error('Failed to end session:', err);
  }
}
