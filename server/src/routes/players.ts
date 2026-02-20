import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { players } from '../db/schema.js';
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

export default router;
