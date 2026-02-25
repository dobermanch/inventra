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

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist

COPY server.ts tsconfig.json package.json ./

#   docker run -v inventra_data:/app/data ...
RUN mkdir -p data/expenses data/inventory

# Run as a non-root user
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app
USER app

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

CMD ["node_modules/.bin/tsx", "server.ts"]
