# Build context is the repo root (Railway: Root Directory "/", Config File Path apps/api/railway.json).
# Runs the TypeScript sources with tsx, so there is no build step; apps/api/data/* ships with the sources.
FROM node:24-slim
ENV NODE_ENV=production COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter @sawa/api...
WORKDIR /app/apps/api
CMD ["node", "--import", "tsx", "src/index.ts"]
