FROM node:20-alpine AS base
WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Install client dependencies and build
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Install server dependencies and build
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY server/ ./server/
RUN cd server && npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

COPY --from=base /app/server/package.json /app/server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
