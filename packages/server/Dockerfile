# Board game API (Express + Socket.IO). Build from repository root:
#   docker build -f packages/server/Dockerfile -t board-game-server .
#
# Run:
#   docker run --rm -p 3001:3001 -e CLIENT_URL=https://your-frontend.example board-game-server
#
# pnpm workspace requires packages/client/package.json; the image does not bundle the Vite app.

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

RUN pnpm install --frozen-lockfile --filter "server..."

RUN pnpm --filter shared build && pnpm --filter server build
RUN pnpm --filter server deploy --prod /out

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup -g 1001 -S nodejs && adduser -S boardgame -u 1001 -G nodejs

COPY --from=builder --chown=boardgame:nodejs /out/ .

USER boardgame
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3001}/api/health > /dev/null || exit 1

CMD ["node", "dist/index.js"]
