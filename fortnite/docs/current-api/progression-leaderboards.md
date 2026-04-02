# Progression charts and leaderboards (D1)

All endpoints below use **D1** data. Populations are **observed only**: accounts that have been loaded through your Worker (e.g. `GET /v1/profile/...`, search, legacy profile routes, or cron refresh). This is not a full Fortnite global index.

## How data gets into D1

- **`GET /v1/profile/{accountId}`** **best-effort** D1 writes in the background (`ctx.waitUntil`), **throttled to once per 15 minutes per account** by default (`persist_min_interval=900`): if `player_profiles.last_updated` or the latest `player_ranks.cached_at` is already within that window, **`storeProfile`** / **`storePlayerRank`** are skipped for that request (the JSON response is still live from Epic). Override with **`persist_force=true`** or a shorter interval via **`persist_min_interval`** (60–3600 seconds).
  - **`storeProfile`** → `player_profiles` + `profile_history` when totals / `raw_stat_count` change (kills/wins/matches progression).
  - **`storePlayerRank`** per ladder in `ranked.current` → `player_ranks` + `rank_history` when rank data changes.
- Stats JSON in D1 uses **`omitParsedData: true`** on that path (numeric columns updated; `parsed_data` kept only if already present — first insert may leave it null until a full `storeProfile` e.g. from cron).
- **`?cache_first=true`** serves **stats** from D1 when `parsed_data` exists and `last_updated` is within **`cache_max_age`** seconds (default `3600`, max `86400`). Account + ranked still come from Epic on that request. Omit `?raw=true` with cache-first (raw is not stored in D1).

## BR progression (kills / wins / matches)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/v1/progress/{accountId}` | Recent `profile_history` rows (`limit`, default 10) |
| GET | `/v1/progress/{accountId}/chart` | `?range=7d\|30d\|90d\|all` optional `&interval=hourly\|daily\|weekly` |

Legacy aliases: `/progress/{accountId}`, `/progress/{accountId}/chart` (same `dbService` methods).

## Ranked progression

| Method | Path | Notes |
|--------|------|--------|
| GET | `/v1/ranked/{accountId}/history` | `?type=ranked-br` optional, `&limit=` |
| GET | `/v1/ranked/{accountId}/chart` | **Required** `?type=ranked-br`, `&range=7d\|30d\|90d\|all` |

Legacy: `/ranked/{accountId}/history`, `/ranked/{accountId}/chart`.

## Global leaderboards (stored players)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/leaderboard` | `?category=wins\|kills\|win_rate\|kpm` — live query on `player_profiles` |
| GET | `/v1/leaderboard/ranked` | `?type=ranked-br` (default), `&limit=` — `player_ranks` |
| GET | `/v1/leaderboard/snapshot` | `?category=wins\|kills\|win_rate\|kpm` — precomputed JSON from cron |

Snapshots are refreshed when **`CRON_HEAVY=true`** on the scheduled Worker (same job as profile refresh). If snapshot returns **404**, use **`/leaderboard`** for live data.

## Cron maintenance (CRON_HEAVY)

When enabled, the scheduled handler also:

- Refreshes **`leaderboard_snapshots`** (top 500 per category, UTC day).
- **Prunes** `profile_history` / `rank_history` older than **180 days**.
- **Prunes** `leaderboard_snapshots` older than **60 days**.

## Auth

These reads do not require a browser token; they use your Worker’s D1 binding. Write paths that hit Epic still need **`SERVICE_ACCOUNT_ID`** and KV tokens (see [auth.md](./auth.md)).
