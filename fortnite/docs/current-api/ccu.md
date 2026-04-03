# CCU (concurrent users)

Official mode counts and creative island CCU are stored in **D1** and refreshed on a **hourly** schedule. Public read routes avoid fan-out to Epic on every request; optional **live** and **crawler** paths exist for operators who accept higher upstream cost.

**Canonical public base:** use **`https://fapi.gdb.gg`** (or your deployed Worker) for all `GET /ccu/*` routes below. The legacy host **fortniteccu.gdb.gg** should be treated as retired once frontends are switched; behavior is aligned with these routes.

## Cadence and cost

| Mechanism | Schedule | Epic usage |
|-----------|----------|------------|
| **Hourly snapshot** | Cron `0 * * * *` | One Discovery `link-entries` batch for core playlists → `ccu_snapshots` / `ccu_mode_snapshots` |
| **Curated creative** | Same hourly run | Up to `CCU_CURATED_CAP` Ecosystem calls (default **96** if env unset, max **200**; list: `src/data/top-creative-islands.js`, fortnite.gg–style priority order) |
| **KV** | On read | ~3 minute cache on `ccu:cached:comprehensive:v1` (invalidated after each hourly job) |
| **Light crawl** | Cron `*/15 * * * *` if `CRON_CCU_LIGHT_CRAWL=true` | Small Ecosystem batches (`CCU_LIGHT_*`), **no** `CRON_HEAVY` required; skipped when `CRON_HEAVY` + `CRON_CCU_FULL_CRAWL` run the heavy path |
| **Heavy crawl** | Only if `CRON_HEAVY=true` and `CRON_CCU_FULL_CRAWL=true` | Bounded paginated Ecosystem crawl (`CRON_CCU_CRAWL_MAX_BATCHES`, time cap) |
| **Manual** | `GET /ccu/crawler/run` | One batch per call (defaults: 80 islands, 8 parallel, 100ms between chunks) |

Set `CCU_CURATED_CAP=0` to skip curated creative refresh in the hourly job.

### Workers Paid

Higher CPU time and subrequest limits allow larger **light** ticks (`CCU_LIGHT_*`), more **parallel** Ecosystem calls (`CCU_CRAWL_PARALLEL`, max **24**), and a longer **heavy** crawl window (`CRON_CCU_CRAWL_MAX_MS`). Defaults in code and `wrangler.toml` assume a paid account. On a free Worker, reduce batch sizes, `CCU_CRAWL_PARALLEL`, and wall-time caps if you hit limits or errors from Epic.

## Public `GET /ccu/*` routes

CORS: responses include `Access-Control-Allow-Origin: *` (suitable for gdb.gg pages).

| Path | Query params | Response notes |
|------|----------------|----------------|
| `/ccu/comprehensive` | `limit` (max **2000**), `live=true` (expensive) | Default: D1 + latest official snapshot + `creative.top_islands`. `_fapi.kv_hit` when served from KV. |
| `/ccu/all` | same | Alias of `/ccu/comprehensive`. |
| `/ccu/overview` | — | Hero stats, `breakdown`, `stats_24h`, `history_7d` (official/creative/total per snapshot), `history_7d_meta` (point count + cadence note). **404** if `ccu_history` is empty. |
| `/ccu/search` | `q` or `query` (required), `limit` (default 25, max **100**) | `{ success, query, count, islands[] }` — D1 search on title, island `code`, `creator`; not limited to top N by CCU. |
| `/ccu/island/info` | `code` (required) | Island metadata + CCU from **`island_ccu`**; if missing, **Ecosystem** island document (no CCU). **404** if neither has the island. |
| `/ccu/island/history` | `code`, `hours` (default **168**, max **2160**) | Hourly **Ecosystem** `peak-ccu` intervals: `history` and `series` (same array), `stats` (min/max/avg when values exist). |
| `/ccu/island` | `code` | Minute-level Ecosystem CCU; **falls back** to D1 `island_ccu.ccu` if live metrics are empty. |
| `/ccu/playlist` | `code` (link_code, e.g. `playlist_defaultsolo`), `hours` | Single official mode: `current_ccu`, `history[]`, `stats` from **D1** snapshots. |
| `/ccu/playlists` | `hours`, optional `category` | Per-mode time series keyed by **mode name**; also **`playlists_by_link_code`** keyed by `linkCode` for legacy clients. |
| `/ccu/modes` | `hours`, optional `category` | Snapshots grouped by timestamp with `modes[]` per bucket. |
| `/ccu/daily` | `days` (default 7, max **365**), `breakdown=true` or `breakdown=1` | Default: `source: ccu_daily_summary`. With breakdown: `source: ccu_history`, per-day **official vs creative** (`avgOfficial`, `avgCreative`, min/max variants, `snapshotCount`). |
| `/ccu/total` | `hours` | Total CCU + chart-friendly history. |
| `/ccu/history` | `hours`, `resolution` | Legacy snapshot history from `ccu_snapshots`. |
| `/ccu/current`, `/ccu` | `modes=true` optional | Latest `ccu_snapshots` row. |
| `/ccu/creative` | `limit`, `sort`, `min_ccu` | Creative islands from D1. |
| `/ccu/cached`, `/ccu/full` | `limit` | Cached comprehensive shape. |
| `/ccu/crawler/status` | — | Crawler state + cached comprehensive payload. |
| `/ccu/crawler/run` | — | Advance crawler batch. |
| `/ccu/supported-modes` | — | Static core playlist list from code. |

### Nullable / deprecated

- **Island / playlist**: `title`, `creator`, `category`, `ccu`, `peak_ccu`, `last_snapshot_at`, etc. may be **null** when the upstream has no data.
- **`history_7d`**: sparse when the hourly job is new, disabled, or D1 was reset; use **`history_7d_meta.point_count`** and the `note` field to diagnose.

### Rate limits / cache

- No per-client API keys on public CCU routes; rely on **Cloudflare** and **reasonable** client caching.
- **`/ccu/comprehensive`**: `Cache-Control` ~60s browser / 300s CDN (see `index.js`).
- **KV**: documented on comprehensive/crawler status (`_fapi.kv_hit` where applicable).
- **`/ccu/island/history`**: calls **Ecosystem** per request — use sparingly; prefer charts that can cache or poll infrequently.

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
- `CCU_CURATED_CAP` — curated island refresh count per hour (`0`–`200`; unset = default **96** in `ccu-pipeline.js`).
- `CCU_LIGHT_REFRESH_TOP` — optional refresh of top/stale islands per 15m tick (`0` = off; `wrangler.toml` may set e.g. **50**).
