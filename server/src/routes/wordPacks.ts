import { Router } from 'express';
import { wordPacks, getRandomWord } from '../wordPacks.js';
import type { Difficulty } from '../wordPacks.js';

const router = Router();

/** GET /api/wordpacks?lang=es|en — return all word packs for the given language */
router.get('/', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'es';
  res.json(wordPacks[lang]);
});

/** GET /api/wordpacks/random?lang=es|en&pack=animals&difficulty=easy */
router.get('/random', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'es';
  const packId = typeof req.query.pack === 'string' ? req.query.pack : '';
  const difficulty = (['easy', 'medium', 'hard'].includes(req.query.difficulty as string)
    ? req.query.difficulty
    : 'medium') as Difficulty;

  const word = getRandomWord(lang, packId, difficulty);
  if (!word) {
    res.status(404).json({ error: 'pack_not_found' });
    return;
  }
  res.json({ word });
});

export default router;
