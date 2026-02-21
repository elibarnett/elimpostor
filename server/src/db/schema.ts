import {
  pgTable,
  uuid,
  varchar,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: varchar('display_name', { length: 30 }),
  avatar: varchar('avatar', { length: 10 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export const games = pgTable(
  'games',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 4 }).notNull(),
    mode: varchar('mode', { length: 10 }).notNull(),
    hostId: uuid('host_id')
      .notNull()
      .references(() => players.id),
    secretWord: varchar('secret_word', { length: 100 }),
    impostorId: uuid('impostor_id').references(() => players.id),
    settings: jsonb('settings').notNull(),
    winningTeam: varchar('winning_team', { length: 20 }),
    roundsPlayed: integer('rounds_played').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (table) => [index('games_ended_at_idx').on(table.endedAt)]
);

export const gamePlayers = pgTable(
  'game_players',
  {
    id: serial('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),
    playerName: varchar('player_name', { length: 30 }).notNull(),
    avatar: varchar('avatar', { length: 10 }).notNull(),
    color: varchar('color', { length: 7 }).notNull(),
    wasImpostor: boolean('was_impostor').notNull().default(false),
    wasEliminated: boolean('was_eliminated').notNull().default(false),
    eliminatedRound: integer('eliminated_round'),
    finalClues: text('final_clues').array(),
    votedCorrectly: boolean('voted_correctly'),
  },
  (table) => [
    uniqueIndex('game_players_game_id_player_id_idx').on(table.gameId, table.playerId),
    index('game_players_player_id_idx').on(table.playerId),
  ]
);
