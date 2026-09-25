FROM node:22-bookworm-slim AS base

FROM base AS deps
WORKDIR /app
# build tools as a fallback in case better-sqlite3's prebuilt binary doesn't
# match this platform and it has to compile from source
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next build loads src/db/index.ts's module graph to collect page data even
# for dynamic routes, and it opens the sqlite file as a top-level side
# effect — the dir just needs to exist for that; the resulting db file isn't
# copied into the runner stage.
RUN mkdir -p data && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# Runs as root: single-tenant homelab container, not a multi-tenant boundary,
# and it sidesteps host/container UID mismatches on the bind-mounted ./data
# volume (Docker auto-creates bind-mount sources as root on the host).
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
