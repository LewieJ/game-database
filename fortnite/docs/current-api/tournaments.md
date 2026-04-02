# Tournament / competitive events (viewer)

Read-only **event and window** data is served from **D1** (`COMPETITIVE_DB`). There are **no** live Epic calls on `GET` — you must populate the database with a **bulk sync** (one Epic request per run).

> **Schema note:** The canonical writer for this flow is [`CompetitiveImporter`](../../src/db/competitive-importer.js) (`event_id`, `regions` JSON, `event_windows.window_id`, etc.). The root [`schema.sql`](../../schema.sql) describes an older alternate shape; do not mix it with the importer on the same D1 without reconciling columns. The expensive path [`CompetitiveDB`](../../src/db/competitive-db.js) + [`getEnhancedLeaderboard`](../../src/api/competitive.js) is **not** used for the viewer sync.

## Sync (ingestion)

| Mechanism | When | Epic cost |
|-----------|------|-----------|
| **Hourly cron** | Same tick as CCU (`0 * * * *`) if `CRON_TOURNAMENT_EVENTS_SYNC=true` | **1×** `GET /api/v1/events/Fortnite/data/{SERVICE_ACCOUNT_ID}` (+ optional display-data fetches) |
| **Manual** | `POST /admin/tournaments/sync` (service token must be valid) | Same as above |

**Do not** enable `CRON_TOURNAMENT_LEADERBOARDS` unless you understand cost: it runs the legacy **`getEnhancedLeaderboard` + per-match DB writes** loop on the 15-minute heavy cron.

## Public routes (v1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/tournaments/events` | Paginated list. Query: `status` (`all` \| `active` \| `upcoming` \| `completed`), `limit` (max 200), `offset`, `region` (matches inside `regions` JSON, e.g. `EU`). |
| GET | `/v1/tournaments/events/{eventId}` | Event + windows; large `raw_*` blobs stripped from the JSON. |

Responses include `Cache-Control` for CDN caching.

## Legacy routes

`/competitive/events`, `/competitive/events/active`, etc. still read the same D1 via [`CompetitiveQueries`](../../src/db/competitive-queries.js). Prefer **`/v1/tournaments/*`** for new clients.

`POST /competitive/crawler/run` runs the **full** [`CompetitiveCrawler.crawl()`](../../src/db/competitive-crawler.js) (events **+** active leaderboards). Treat as **high cost**; prefer `/admin/tournaments/sync` for metadata-only refresh.

## Wrangler / D1 setup

1. Create a D1 database (once per Cloudflare account / name):  
   `npx wrangler d1 create fortnite-competitive`
2. In [`wrangler.toml`](../../wrangler.toml), bind it as `COMPETITIVE_DB` with the printed `database_id`.
3. Apply the **importer** schema (not root `schema.sql`):  
   `npx wrangler d1 execute fortnite-competitive --remote --file=schema-v2.sql`  
   For local `wrangler dev`:  
   `npx wrangler d1 execute fortnite-competitive --local --file=schema-v2.sql`
4. If an older DB was created before the `images` column existed:  
   `npx wrangler d1 execute fortnite-competitive --remote --file=migrations/0015_competitive_events_add_images.sql`

**Vars** ([`wrangler.toml`](../../wrangler.toml)):

- `CRON_TOURNAMENT_EVENTS_SYNC` — `true` runs bulk event sync on the hourly cron (`0 * * * *`) with CCU.
- `CRON_TOURNAMENT_LEADERBOARDS` — keep **`false`** unless you intentionally enable the legacy expensive crawl (requires `CRON_HEAVY`).

**Frontend base URLs:** production `https://fapi.gdb.gg`, Workers `https://fortnite-api.lewie.workers.dev` (same routes).

## Phase B (future) — leaderboards without $800 surprises

- Separate cron flag from event sync.
- Use [`CompetitiveImporter.importLeaderboard`](../../src/db/competitive-importer.js) (batched rows, capped session rows), **not** `getEnhancedLeaderboard(..., saveToDb: true)` in scheduled jobs.
- Per-window **cooldown**, max **windows per tick**, max **pages** per window, and **D1 pruning** for old rows.
