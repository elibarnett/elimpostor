import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: pg.Pool | null = null;

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
  });
  db = drizzle(pool, { schema });
} else {
  console.warn(
    'DATABASE_URL not set — running without database. Game data will not be persisted.'
  );
}

export { db, pool };
