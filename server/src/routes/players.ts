import { Router } from 'express';
import { eq, and, sql, desc, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { players, games, gamePlayers } from '../db/schema.js';
import { AVATARS } from '../constants.js';

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/players/:id — retrieve player profile
router.get('/:id', async (req, res) => {
  if (!db) {
    res.status(503).json({ error: 'database_unavailable' });
    return;
  }

  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  try {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    if (!player) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({
      id: player.id,
      displayName: player.displayName,
      avatar: player.avatar,
      createdAt: player.createdAt,
      lastSeenAt: player.lastSeenAt,
    });
  } catch (err) {
    console.error('GET /api/players/:id error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// PATCH /api/players/:id — update player profile
router.patch('/:id', async (req, res) => {
  if (!db) {
    res.status(503).json({ error: 'database_unavailable' });
    return;
  }

  const { id } = req.params;
  const requesterId = req.headers['x-player-id'];

  // Ownership check
  if (requesterId !== id) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  if (!UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  const { displayName, avatar } = req.body ?? {};

  // Validate displayName
  if (displayName !== undefined) {
    if (typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.length > 30) {
      res.status(400).json({ error: 'invalid_display_name' });
      return;
    }
  }

  // Validate avatar
  if (avatar !== undefined) {
    if (typeof avatar !== 'string' || !(AVATARS as readonly string[]).includes(avatar)) {
      res.status(400).json({ error: 'invalid_avatar' });
      return;
    }
  }

  try {
    const updateData: Record<string, unknown> = { lastSeenAt: new Date() };
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (avatar !== undefined) updateData.avatar = avatar;

    const [updated] = await db
      .update(players)
      .set(updateData)
      .where(eq(players.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.json({
      id: updated.id,
      displayName: updated.displayName,
      avatar: updated.avatar,
      createdAt: updated.createdAt,
      lastSeenAt: updated.lastSeenAt,
    });
  } catch (err) {
    console.error('PATCH /api/players/:id error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/players/:id/stats — aggregated lifetime stats
router.get('/:id/stats', async (req, res) => {
  if (!db) {
    res.status(503).json({ error: 'database_unavailable' });
    return;
  }

  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  try {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    if (!player) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const [agg] = await db
      .select({
        gamesPlayed:       sql<number>`COUNT(*)`,
        impostorPlayed:    sql<number>`COUNT(*) FILTER (WHERE ${gamePlayers.wasImpostor} = true)`,
        impostorWon:       sql<number>`COUNT(*) FILTER (WHERE ${gamePlayers.wasImpostor} = true AND ${games.winningTeam} = 'impostor')`,
        citizenPlayed:     sql<number>`COUNT(*) FILTER (WHERE ${gamePlayers.wasImpostor} = false)`,
        citizenWon:        sql<number>`COUNT(*) FILTER (WHERE ${gamePlayers.wasImpostor} = false AND ${games.winningTeam} = 'citizens')`,
        timesEliminated:   sql<number>`COUNT(*) FILTER (WHERE ${gamePlayers.wasEliminated} = true AND ${gamePlayers.wasImpostor} = false)`,
        votedCorrectCount: sql<number>`COUNT(*) FILTER (WHERE ${gamePlayers.votedCorrectly} = true)`,
        votedTotalCount:   sql<number>`COUNT(*) FILTER (WHERE ${gamePlayers.votedCorrectly} IS NOT NULL)`,
        totalCluesGiven:   sql<number>`COALESCE(SUM(array_length(${gamePlayers.finalClues}, 1)), 0)`,
        lastPlayedAt:      sql<Date | null>`MAX(${games.endedAt})`,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(gamePlayers.gameId, games.id))
      .where(and(eq(gamePlayers.playerId, id), isNotNull(games.endedAt)));

    const recentGames = await db
      .select({ wasImpostor: gamePlayers.wasImpostor, winningTeam: games.winningTeam })
      .from(gamePlayers)
      .innerJoin(games, eq(gamePlayers.gameId, games.id))
      .where(and(eq(gamePlayers.playerId, id), isNotNull(games.endedAt)))
      .orderBy(desc(games.endedAt), desc(games.id))
      .limit(100);

    let streakCount = 0;
    let streakType: 'win' | 'loss' | null = null;
    for (const g of recentGames) {
      const won =
        (g.wasImpostor && g.winningTeam === 'impostor') ||
        (!g.wasImpostor && g.winningTeam === 'citizens');
      const type = won ? 'win' : 'loss';
      if (streakType === null) {
        streakType = type;
        streakCount = 1;
      } else if (type === streakType) {
        streakCount++;
      } else {
        break;
      }
    }

    const winRate = (played: number, won: number) =>
      played === 0 ? 0 : Math.round((won / played) * 1000) / 1000;

    const gp = Number(agg.gamesPlayed);
    const ip = Number(agg.impostorPlayed);
    const iw = Number(agg.impostorWon);
    const cp = Number(agg.citizenPlayed);
    const cw = Number(agg.citizenWon);
    const vc = Number(agg.votedCorrectCount);
    const vt = Number(agg.votedTotalCount);

    res.json({
      gamesPlayed:    gp,
      memberSince:    player.createdAt,
      lastPlayedAt:   agg.lastPlayedAt,
      asImpostor: {
        played:  ip,
        won:     iw,
        winRate: winRate(ip, iw),
      },
      asPlayer: {
        played:         cp,
        won:            cw,
        winRate:        winRate(cp, cw),
        voteAccuracy:   winRate(vt, vc),
        timesEliminated: Number(agg.timesEliminated),
      },
      totalCluesGiven: Number(agg.totalCluesGiven),
      currentStreak:   streakType ? { type: streakType, count: streakCount } : null,
    });
  } catch (err) {
    console.error('GET /api/players/:id/stats error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /api/players/:id/history — paginated game history
router.get('/:id/history', async (req, res) => {
  if (!db) {
    res.status(503).json({ error: 'database_unavailable' });
    return;
  }

  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  const rawLimit = parseInt(String(req.query.limit ?? '20'), 10);
  const rawOffset = parseInt(String(req.query.offset ?? '0'), 10);

  if (isNaN(rawLimit) || rawLimit < 1 || rawLimit > 100) {
    res.status(400).json({ error: 'invalid_limit' });
    return;
  }
  if (isNaN(rawOffset) || rawOffset < 0) {
    res.status(400).json({ error: 'invalid_offset' });
    return;
  }

  const limit = rawLimit;
  const offset = rawOffset;

  try {
    const [player] = await db.select({ id: players.id }).from(players).where(eq(players.id, id));
    if (!player) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const baseWhere = and(eq(gamePlayers.playerId, id), isNotNull(games.endedAt));

    const [{ total }] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(gamePlayers)
      .innerJoin(games, eq(gamePlayers.gameId, games.id))
      .where(baseWhere);

    const rows = await db
      .select({
        gameId:         games.id,
        code:           games.code,
        mode:           games.mode,
        endedAt:        games.endedAt,
        secretWord:     games.secretWord,
        winningTeam:    games.winningTeam,
        roundsPlayed:   games.roundsPlayed,
        wasImpostor:    gamePlayers.wasImpostor,
        wasEliminated:  gamePlayers.wasEliminated,
        finalClues:     gamePlayers.finalClues,
        votedCorrectly: gamePlayers.votedCorrectly,
        playerCount:    sql<number>`(SELECT COUNT(*) FROM game_players gp2 WHERE gp2.game_id = ${games.id})`,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(gamePlayers.gameId, games.id))
      .where(baseWhere)
      .orderBy(desc(games.endedAt), desc(games.id))
      .limit(limit)
      .offset(offset);

    res.json({
      total:  Number(total),
      limit,
      offset,
      games: rows.map((r) => ({
        gameId:         r.gameId,
        code:           r.code,
        mode:           r.mode,
        endedAt:        r.endedAt,
        secretWord:     r.secretWord,
        winningTeam:    r.winningTeam,
        roundsPlayed:   r.roundsPlayed,
        wasImpostor:    r.wasImpostor,
        won:
          (r.wasImpostor && r.winningTeam === 'impostor') ||
          (!r.wasImpostor && r.winningTeam === 'citizens'),
        wasEliminated:  r.wasEliminated,
        finalClues:     r.finalClues ?? [],
        votedCorrectly: r.votedCorrectly,
        playerCount:    Number(r.playerCount),
      })),
    });
  } catch (err) {
    console.error('GET /api/players/:id/history error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
