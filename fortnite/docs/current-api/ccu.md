# CCU (concurrent users)

Official mode counts and creative island CCU are stored in **D1** and refreshed on a **hourly** schedule. Public read routes avoid fan-out to Epic on every request; optional **live** and **crawler** paths exist for operators who accept higher upstream cost.

## Cadence and cost

| Mechanism | Schedule | Epic usage |
|-----------|----------|------------|
| **Hourly snapshot** | Cron `0 * * * *` | One Discovery `link-entries` batch for core playlists → `ccu_snapshots` / `ccu_mode_snapshots` |
| **Curated creative** | Same hourly run | Up to `CCU_CURATED_CAP` Ecosystem calls (default **36** in code, max **120** via env) for known island codes |
| **KV** | On read | ~3 minute cache on `ccu:cached:comprehensive:v1` (invalidated after each hourly job) |
| **Light crawl** | Cron `*/15 * * * *` if `CRON_CCU_LIGHT_CRAWL=true` | Small Ecosystem batches (`CCU_LIGHT_*`), **no** `CRON_HEAVY` required; skipped when `CRON_HEAVY` + `CRON_CCU_FULL_CRAWL` run the heavy path |
| **Heavy crawl** | Only if `CRON_HEAVY=true` and `CRON_CCU_FULL_CRAWL=true` | Bounded paginated Ecosystem crawl (`CRON_CCU_CRAWL_MAX_BATCHES`, time cap) |
| **Manual** | `GET /ccu/crawler/run` | One batch per call (defaults: 80 islands, 8 parallel, 100ms between chunks) |

Set `CCU_CURATED_CAP=0` to skip curated creative refresh in the hourly job.

### Workers Paid

Higher CPU time and subrequest limits allow larger **light** ticks (`CCU_LIGHT_*`), more **parallel** Ecosystem calls (`CCU_CRAWL_PARALLEL`, max **24**), and a longer **heavy** crawl window (`CRON_CCU_CRAWL_MAX_MS`). Defaults in code and `wrangler.toml` assume a paid account. On a free Worker, reduce batch sizes, `CCU_CRAWL_PARALLEL`, and wall-time caps if you hit limits or errors from Epic.

## Primary routes

| Method | Path | Notes |
|--------|------|--------|
| GET | `/ccu/comprehensive` or `/ccu/all` | **Default:** D1 + latest hourly official snapshot + creative from `island_ccu`. Query `limit` (max 2000). |
| GET | `/ccu/comprehensive?live=true` | **Expensive:** live Epic Ecosystem-style totals + DB creative; use sparingly. |
| GET | `/ccu/overview` | Dashboard-oriented summary from D1 (hourly). |
| GET | `/ccu/crawler/status` | Crawler state + same payload shape as cached comprehensive (KV may short-circuit). |
| GET | `/ccu/crawler/run` | Advance one crawler batch (idempotent lock while “running”). |
| POST | `/ccu/crawler/refresh-popular` | Body: `top_n` (default 80), `stale_minutes` (default 45). Refreshes stale + top islands only. |

Other `/ccu/*` routes in `src/index.js` (e.g. per-mode, creative lists) read from D1 or documented live paths as implemented.

## Response shape (cached comprehensive)

- `data_source`: `"d1_cache"` for the default path.
- `official`: map of `link_code` → `{ name, category, ccu }` from the latest snapshot.
- `creative.total_ccu`, `creative.top_islands`, `totals.combined`.
- `_fapi.kv_hit`: whether the response came from KV.

## Environment (Wrangler vars)

- `CRON_CCU_LIGHT_CRAWL` — **recommended** steady crawl on the 15-minute schedule without turning on `CRON_HEAVY`.
- `CCU_LIGHT_BATCH_SIZE` — islands per batch (default **40**, max 80).
- `CCU_LIGHT_BATCHES_PER_CRON` — batches per tick (default **1**, max 3).
- `CCU_LIGHT_DELAY_MS` — pause between parallel chunks (default **120**).
- `CCU_LIGHT_MAX_WALL_MS` — stop after this wall time (default **22000**).
- `CCU_LIGHT_REFRESH_TOP` — optional `refreshPopularIslands` top-N per tick (**0** = off; adds Epic calls).
- `CCU_CRAWL_PARALLEL` — concurrent `fetchIslandCCU` calls per wave in crawl / refresh-popular (default **12**, max **24**).
- `CRON_HEAVY` — enables 15-minute heavy work (profiles, optional full CCU crawl).
- `CRON_CCU_FULL_CRAWL` — with `CRON_HEAVY`, run bounded full island crawl.
- `CRON_CCU_CRAWL_MAX_BATCHES` — cap crawl batches per heavy cron tick (default **3**, max **6**).
- `CRON_CCU_CRAWL_MAX_MS` — wall-time budget for the heavy crawl loop (default **50000**, max **120000**).
- `CCU_CURATED_CAP` — curated island refresh count per hour (`0`–`120`; unset = default 36).
