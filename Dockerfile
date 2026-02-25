# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Native build tools required by better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG APP_VERSION
ENV VITE_APP_VERSION=${APP_VERSION}

RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# su-exec lets the entrypoint drop from root to the app user at runtime,
# which is necessary to fix volume-mount permissions before starting the server.
RUN apk add --no-cache su-exec

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist

COPY server.ts tsconfig.json package.json ./

# Create the app user and take ownership of all app files.
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app

# Write an inline entrypoint that:
#   1. Creates the data sub-directories (safe after a volume mount)
#   2. Hands ownership of /app/data to the app user
#   3. Drops privileges and execs the real command
RUN printf '#!/bin/sh\nset -e\nmkdir -p /app/data/expenses /app/data/inventory /app/data/orders\nchown -R app:app /app/data\nexec su-exec app "$@"\n' \
    > /entrypoint.sh && chmod +x /entrypoint.sh

# ── Environment ────────────────────────────────────────────────────────────────
ENV NODE_ENV=production

ENV PORT=3000

# Set to "1" or "loopback" when running behind a reverse proxy (nginx, Caddy, etc.)
# so that Express correctly reads X-Forwarded-For / X-Forwarded-Proto headers.
# ENV TRUST_PROXY=1

# ── Health check ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:${PORT}/api/settings || exit 1

EXPOSE ${PORT}

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node_modules/.bin/tsx", "server.ts"]
