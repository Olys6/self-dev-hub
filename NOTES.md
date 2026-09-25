# Development notes

Personal dashboard — projects, day-to-day tasks, and Mealie meal-plan sync. Next.js 16 App Router, SQLite via Drizzle ORM (dev) / raw better-sqlite3 (production runtime — see below). Deployed at **https://hub.example.com**, Dockge-managed stack on my home server.

## Local setup

```bash
npm install
npm run db:push   # create/update the SQLite schema at data/hub.db
npm run dev
```

Open http://localhost:3000 — first thing you'll hit is `/login` (see Auth below).

## Environment variables (`.env.local`, gitignored)

| Var | Purpose |
|---|---|
| `MEALIE_BASE_URL` | Mealie instance URL, e.g. `https://mealie.example.com` |
| `MEALIE_API_TOKEN` | Long-lived Mealie API token (Settings → API Tokens) |
| `MCP_API_TOKEN` | Bearer token required to call `/api/mcp` |
| `HUB_PASSWORD` | Site password checked by `/login` |
| `SESSION_SECRET` | HMAC key signing the session cookie |
| `CALENDAR_FEED_TOKEN` | Token required as `?token=` on `/api/calendar.ics` |

## Auth

A real HTML login (`/login`) gated by `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts` — **but the matcher export must still be named `config`**, not `proxyConfig`; verified against Next's own source, contradicts some docs). Session is an HMAC-signed cookie (`src/lib/auth.ts`), no database of users — single shared password, on purpose. `/api/mcp` is excluded from this gate entirely; it authenticates itself via bearer token instead.

## Scripts

- `npm run db:push` — apply schema changes to `data/hub.db` (dev only)
- `npm run db:seed` — fill with demo data (dev/testing only)
- `npm run db:clear` — wipe all items + projects
- `npm run sync:mealie` — pull the next 14 days of Mealie meal plan into `items` (kind `cook`, source `mealie`) — dev version, uses drizzle-orm

## MCP server

`/api/mcp` exposes the hub as MCP tools (read: `get_dashboard`, `list_projects`, `get_project_board`, `list_items`, `get_meal_plan`; write: `create_project`, `delete_project`, `add_project_task`, `move_task`, `toggle_item_done`, `reschedule_item`, `rename_item`, `delete_item`, `create_item`). Streamable HTTP transport, stateless (fresh server+transport per request), bearer-token auth via `MCP_API_TOKEN`. `GET` is refused (405) rather than delegated to the transport — its SSE server-push stream isn't used by anything here and was found to tie up a connection through Caddy that follow-up requests then queued behind (60s hangs). None of these tools need it; removing GET support entirely fixed it.

Connect with Claude Code:

```bash
claude mcp add --transport http self-dev-hub https://hub.example.com/api/mcp \
  --header "Authorization: Bearer <MCP_API_TOKEN>"
```

Claude.ai (web/desktop) custom connectors also support this directly via static header auth (beta) — paste the URL and the same bearer token in the connector's settings, no OAuth server needed.

## Gym tracking

Currently disabled (`src/lib/config.ts` → `FEATURES.gym`) until Open Gym gets wired in as a real spoke. The schema and UI code paths for it still exist; flip the flag back on when ready.

## Production deployment

Stack lives at `<stack-dir>/{app/,docker-compose.yml,.env,data/}`, symlinked into Dockge's `stacks/` dir, on the shared `caddy_net` docker network so Caddy can `reverse_proxy self-dev-hub:3000` by container name. `Caddyfile` block for `hub.example.com` is a bare reverse proxy — no `basic_auth`, the app handles its own login.

**Deploying a source change:**
```bash
COPYFILE_DISABLE=1 tar -czf - --exclude node_modules --exclude .next --exclude data \
  --exclude '.env*' --exclude .git --exclude '*.tsbuildinfo' --exclude next-env.d.ts . \
  | ssh <user>@<server> "tar -xzf - -C <stack-dir>/app/"
ssh <user>@<server> "cd <stack-dir> && docker compose build && docker compose up -d"
```
`COPYFILE_DISABLE=1` is required from macOS or `tar` embeds `._*` AppleDouble sidecar files in the archive.

**Production runtime avoids drizzle-orm entirely.** Next's standalone output only keeps real `node_modules` entries for packages it can't bundle (native addons like `better-sqlite3`); pure-JS deps like `drizzle-orm` get inlined into the compiled server bundle and aren't `require`/`import`-able from a hand-added script. `scripts/migrate.mjs` and `scripts/sync-mealie.mjs` are therefore dependency-light ports that only use `better-sqlite3` + native `fetch` — regenerate `drizzle/*.sql` locally with `npx drizzle-kit generate` when the schema changes; `migrate.mjs` applies whatever's in `drizzle/` on every container start (tracked in its own `_migrations` table, not drizzle's).

**Dockerfile notes:** Node 22+ required (`better-sqlite3@13.0.3` needs it — Node 20 silently SIGSEGVs during build). Runs as root in the final image (single-tenant homelab box; sidesteps host/container UID mismatches on the bind-mounted `./data` volume, which Docker auto-creates root-owned on the host).

**`src/app/page.tsx` needs `export const dynamic = "force-dynamic"`.** It reads the sqlite db directly (not via `fetch`), which Next's automatic static/dynamic detection doesn't see — without this a production build silently prerenders the dashboard once and freezes it at build-time data forever. Always run `npm run build` locally and check the route table (look for `ƒ` not `○` next to `/`) before shipping.
