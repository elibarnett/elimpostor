import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { GameManager } from './gameManager.js';
import { registerHandlers } from './handlers.js';
import { db } from './db/index.js';
import playerRoutes from './routes/players.js';
import wordPackRoutes from './routes/wordPacks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
});

const gm = new GameManager();
registerHandlers(io, gm);

// JSON body parsing for REST API
app.use(express.json());

// REST API routes
app.use('/api/players', playerRoutes);
app.use('/api/wordpacks', wordPackRoutes);

// In production, serve built client
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

async function start() {
  if (db) {
    try {
      const migrationsFolder = path.join(__dirname, '../drizzle');
      await migrate(db, { migrationsFolder });
      console.log('Database migrations applied successfully');
    } catch (error) {
      console.error('Failed to run database migrations:', error);
      process.exit(1);
    }
  }

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
