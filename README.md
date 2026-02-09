# 🕵️ El Impostor

A real-time multiplayer party game where one player is the impostor — and everyone else must figure out who it is.

![El Impostor](client/public/art/home-bg.jpg)

## How to Play

1. **One player creates a game** and shares the 4-letter room code
2. **Everyone joins** from their phone
3. **The host picks a secret word** — everyone sees it except the impostor
4. **Players take turns giving one-word clues** about the secret word
5. **The group votes** on who they think the impostor is
6. If the impostor is caught — the group wins! If not — the impostor wins 🕵️

## Game Modes

| Mode | How it works |
|------|-------------|
| 🌐 **Online** | Clues, discussion, and voting all happen in the app |
| 🏠 **In Person** | Players see their roles on their phone, then play verbally face-to-face — the host reveals the impostor at the end |

## Tech Stack

- **Frontend**: React 19 · Vite · Tailwind CSS 4 · TypeScript
- **Backend**: Express 5 · Socket.IO · TypeScript
- **Deployment**: Docker · Railway

## Running Locally

```bash
# Install dependencies
npm install
cd client && npm install
cd ../server && npm install
cd ..

# Start both client and server
npm run dev
```

Client runs on `http://localhost:5173` · Server runs on `http://localhost:3001`

## Deployment

The app is configured for one-click deployment on [Railway](https://railway.app):

1. Connect your GitHub repo on Railway
2. Railway auto-detects the `Dockerfile` and deploys
3. Every push to `main` triggers a redeploy

The Express server serves the built Vite client as static files in production — single service, no CORS headaches.

## License

MIT
