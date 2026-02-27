export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WordPack {
  id: string;
  emoji: string;
  words: {
    easy: string[];
    medium: string[];
    hard: string[];
  };
}

export interface WordPacksResponse {
  es: WordPack[];
  en: WordPack[];
}

const wordPacksEs: WordPack[] = [
  {
    id: 'animals',
    emoji: '🐾',
    words: {
      easy: ['perro', 'gato', 'vaca', 'caballo', 'cerdo', 'gallina', 'pato', 'oso', 'león', 'tigre'],
      medium: ['delfín', 'canguro', 'jirafa', 'cocodrilo', 'pingüino', 'flamenco', 'mapache', 'zorro', 'lobo', 'búho'],
      hard: ['ornitorrinco', 'axolote', 'platipus', 'tapir', 'ñu', 'okapi', 'quokka', 'narval', 'dugongo', 'aardvark'],
    },
  },
  {
    id: 'food',
    emoji: '🍽️',
    words: {
      easy: ['pizza', 'taco', 'sopa', 'arroz', 'pan', 'leche', 'queso', 'huevo', 'pollo', 'pasta'],
      medium: ['enchilada', 'paella', 'ceviche', 'guacamole', 'tamale', 'empanada', 'gazpacho', 'mole', 'churro', 'arepa'],
      hard: ['escargot', 'foie gras', 'trufa', 'caviar', 'kimchi', 'tempura', 'prosciutto', 'tiramisu', 'bouillabaisse', 'bacalao'],
    },
  },
  {
    id: 'countries',
    emoji: '🌍',
    words: {
      easy: ['México', 'España', 'Francia', 'Brasil', 'Japón', 'China', 'Italia', 'Alemania', 'Rusia', 'Argentina'],
      medium: ['Colombia', 'Turquía', 'Marruecos', 'Vietnam', 'Sudáfrica', 'Polonia', 'Suecia', 'Tailandia', 'Portugal', 'Chile'],
      hard: ['Bielorrusia', 'Kazajistán', 'Mozambique', 'Azerbaijan', 'Uzbekistán', 'Kirguistán', 'Mauritania', 'Botsuana', 'Eritrea', 'Vanuatu'],
    },
  },
  {
    id: 'movies',
    emoji: '🎬',
    words: {
      easy: ['Titanic', 'Avatar', 'Joker', 'Coco', 'Up', 'Toy Story', 'Aladín', 'Frozen', 'Moana', 'Grease'],
      medium: ['Inception', 'Parasite', 'Gladiator', 'Matrix', 'Interstellar', 'Braveheart', 'Whiplash', 'Spotlight', 'Birdman', 'Moonlight'],
      hard: ['Mulholland Drive', 'Stalker', 'Nostalghia', 'Sátántangó', 'Jeanne Dielman', 'Werckmeister Harmonies', 'Au Hasard Balthazar', 'La Dolce Vita', 'Solaris', 'Teorema'],
    },
  },
  {
    id: 'professions',
    emoji: '👔',
    words: {
      easy: ['maestro', 'médico', 'chef', 'piloto', 'policía', 'bombero', 'dentista', 'abogado', 'actor', 'cantante'],
      medium: ['cirujano', 'arqueólogo', 'astrónomo', 'psicólogo', 'ingeniero', 'diplomático', 'periodista', 'veterinario', 'fisioterapeuta', 'economista'],
      hard: ['hepatólogo', 'actuario', 'numismático', 'glaciólogo', 'paleontólogo', 'ornitólogo', 'toxicólogo', 'endocrinólogo', 'geomorfólogo', 'lepidopterólogo'],
    },
  },
  {
    id: 'sports',
    emoji: '⚽',
    words: {
      easy: ['fútbol', 'tenis', 'boxeo', 'natación', 'golf', 'béisbol', 'baloncesto', 'ciclismo', 'atletismo', 'vóleibol'],
      medium: ['esgrima', 'remo', 'triatlón', 'balonmano', 'waterpolo', 'lucha libre', 'judo', 'taekwondo', 'tiro con arco', 'skeleton'],
      hard: ['sepaktakraw', 'kabaddi', 'hurling', 'pelota vasca', 'pato', 'calcio storico', 'bossaball', 'polocrosse', 'kronum', 'shorinji kempo'],
    },
  },
  {
    id: 'objects',
    emoji: '📦',
    words: {
      easy: ['silla', 'mesa', 'cama', 'puerta', 'ventana', 'teléfono', 'reloj', 'espejo', 'lámpara', 'bolígrafo'],
      medium: ['telescopio', 'caleidoscopio', 'metrónomo', 'sextante', 'compás', 'ábaco', 'catalejo', 'periscópio', 'termostato', 'sincrotón'],
      hard: ['astrolabio', 'baróscopo', 'cronógrafo', 'interferómetro', 'espectrógrafo', 'galvanómetro', 'clinómetro', 'refractómetro', 'radiogoniómetro', 'fluxómetro'],
    },
  },
];

const wordPacksEn: WordPack[] = [
  {
    id: 'animals',
    emoji: '🐾',
    words: {
      easy: ['dog', 'cat', 'cow', 'horse', 'pig', 'chicken', 'duck', 'bear', 'lion', 'tiger'],
      medium: ['dolphin', 'kangaroo', 'giraffe', 'crocodile', 'penguin', 'flamingo', 'raccoon', 'fox', 'wolf', 'owl'],
      hard: ['platypus', 'axolotl', 'tapir', 'wildebeest', 'okapi', 'quokka', 'narwhal', 'dugong', 'aardvark', 'pangolin'],
    },
  },
  {
    id: 'food',
    emoji: '🍽️',
    words: {
      easy: ['pizza', 'taco', 'soup', 'rice', 'bread', 'milk', 'cheese', 'egg', 'chicken', 'pasta'],
      medium: ['enchilada', 'paella', 'ceviche', 'guacamole', 'empanada', 'gazpacho', 'ratatouille', 'moussaka', 'baklava', 'jerk chicken'],
      hard: ['escargot', 'foie gras', 'truffle', 'caviar', 'kimchi', 'tempura', 'prosciutto', 'tiramisu', 'bouillabaisse', 'haggis'],
    },
  },
  {
    id: 'countries',
    emoji: '🌍',
    words: {
      easy: ['Mexico', 'Spain', 'France', 'Brazil', 'Japan', 'China', 'Italy', 'Germany', 'Russia', 'Argentina'],
      medium: ['Colombia', 'Turkey', 'Morocco', 'Vietnam', 'South Africa', 'Poland', 'Sweden', 'Thailand', 'Portugal', 'Chile'],
      hard: ['Belarus', 'Kazakhstan', 'Mozambique', 'Azerbaijan', 'Uzbekistan', 'Kyrgyzstan', 'Mauritania', 'Botswana', 'Eritrea', 'Vanuatu'],
    },
  },
  {
    id: 'movies',
    emoji: '🎬',
    words: {
      easy: ['Titanic', 'Avatar', 'Joker', 'Coco', 'Up', 'Toy Story', 'Aladdin', 'Frozen', 'Moana', 'Grease'],
      medium: ['Inception', 'Parasite', 'Gladiator', 'The Matrix', 'Interstellar', 'Braveheart', 'Whiplash', 'Spotlight', 'Birdman', 'Moonlight'],
      hard: ['Mulholland Drive', 'Stalker', 'Nostalghia', 'Sátántangó', 'Jeanne Dielman', 'Werckmeister Harmonies', 'Au Hasard Balthazar', 'La Dolce Vita', 'Solaris', 'Teorema'],
    },
  },
  {
    id: 'professions',
    emoji: '👔',
    words: {
      easy: ['teacher', 'doctor', 'chef', 'pilot', 'police', 'firefighter', 'dentist', 'lawyer', 'actor', 'singer'],
      medium: ['surgeon', 'archaeologist', 'astronomer', 'psychologist', 'engineer', 'diplomat', 'journalist', 'veterinarian', 'physiotherapist', 'economist'],
      hard: ['hepatologist', 'actuary', 'numismatist', 'glaciologist', 'paleontologist', 'ornithologist', 'toxicologist', 'endocrinologist', 'geomorphologist', 'lepidopterologist'],
    },
  },
  {
    id: 'sports',
    emoji: '⚽',
    words: {
      easy: ['soccer', 'tennis', 'boxing', 'swimming', 'golf', 'baseball', 'basketball', 'cycling', 'track', 'volleyball'],
      medium: ['fencing', 'rowing', 'triathlon', 'handball', 'water polo', 'wrestling', 'judo', 'taekwondo', 'archery', 'skeleton'],
      hard: ['sepaktakraw', 'kabaddi', 'hurling', 'jai alai', 'pato', 'calcio storico', 'bossaball', 'polocrosse', 'kronum', 'tchoukball'],
    },
  },
  {
    id: 'objects',
    emoji: '📦',
    words: {
      easy: ['chair', 'table', 'bed', 'door', 'window', 'phone', 'clock', 'mirror', 'lamp', 'pen'],
      medium: ['telescope', 'kaleidoscope', 'metronome', 'sextant', 'compass', 'abacus', 'periscope', 'thermostat', 'barometer', 'gyroscope'],
      hard: ['astrolabe', 'chronograph', 'interferometer', 'spectrograph', 'galvanometer', 'clinometer', 'refractometer', 'radiogoniometer', 'fluxometer', 'synchrotron'],
    },
  },
];

export const wordPacks: WordPacksResponse = {
  es: wordPacksEs,
  en: wordPacksEn,
};

/** Pick a random word from a specific pack, language, and difficulty. */
export function getRandomWord(lang: 'es' | 'en', packId: string, difficulty: Difficulty): string | null {
  const packs = lang === 'es' ? wordPacksEs : wordPacksEn;
  const pack = packs.find((p) => p.id === packId);
  if (!pack) return null;
  const words = pack.words[difficulty];
  if (!words || words.length === 0) return null;
  return words[Math.floor(Math.random() * words.length)];
}
