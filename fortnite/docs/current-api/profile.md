# Profile bundle (stats + ranked)

For the **search → profile page** flow: after you resolve an Epic **account id** (from `/user/search`, `/account/displayName/...`, or the user pastes a UID), load everything needed for a basic profile in **one request**.

## Endpoint

`GET /v1/profile/{accountId}`

| Query | Default | Description |
|-------|---------|-------------|
| `raw` | omitted | If `true`, includes full Epic statsproxy JSON under `stats.raw` (large; use only for debugging) |
| `stats_debug` | `false` | If `true`, adds `stats.parser_debug`: Epic key count, how many `br_*` rows were parsed, full sorted `unique_playlists` list, and any `br_*` keys that still fail parsing (should be empty after fixes) |
| `ranked_history` | `true` | If `false`, skips the all-seasons Habanero fetch (smaller / faster; `ranked.historical` is `null`) |
| `ranked_history_enrich` | `false` | If `true`, enriches historical rows with track metadata (heavier; same idea as `?enrich=true` on `/ranked/{id}/all-seasons`) |

`{accountId}` must be **32 hex characters** (Epic account id).

### Examples

```bash
curl -sS "https://fapi.gdb.gg/v1/profile/956f46275d1c45949038ee0017190934"
```

## Response shape

### `stats.summary` fields (always present when stats load)

| Field | Type | Description |
|-------|------|-------------|
| `total_matches` | number | Sum of parsed `matchesplayed` across BR playlist rows |
| `total_wins` | number | `placetop1` total |
| `total_kills` | number | |
| `total_outlived` | number | `playersoutlived` |
| `total_minutes` | number | |
| `win_rate` | number | % wins / matches (overview) |
| `kills_per_match` | number | |
| `hours_played` | number | From `minutesplayed` |
| `top_3_finishes` | number | `placetop3` |
| `top_5_finishes` | number | `placetop5` |
| `total_score` | number | |
| `by_mode` | object | Per team size: `solo`, `duo`, `trio`, `squad`, **`octet`** — each `{ matches, wins, kills, win_rate }` |
| `by_build_variant` | object | Heuristic: **`build`**, **`nobuild`**, **`unknown`** — same shape as a mode row |
| `competitive` | object | `arena_matches`, `tournament_matches`, `tournament_wins` |

### JSON example (trimmed)

```json
{
  "accountId": "956f46275d1c45949038ee0017190934",
  "account": {
    "id": "956f46275d1c45949038ee0017190934",
    "displayName": "…"
  },
  "stats": {
    "summary": {
      "total_matches": 0,
      "total_wins": 0,
      "total_kills": 0,
      "total_outlived": 0,
      "total_minutes": 0,
      "win_rate": 0,
      "kills_per_match": 0,
      "hours_played": 0,
      "top_3_finishes": 0,
      "top_5_finishes": 0,
      "total_score": 0,
      "by_mode": {
        "solo": { "matches": 0, "wins": 0, "kills": 0, "win_rate": 0 },
        "duo": { "matches": 0, "wins": 0, "kills": 0, "win_rate": 0 },
        "trio": { "matches": 0, "wins": 0, "kills": 0, "win_rate": 0 },
        "squad": { "matches": 0, "wins": 0, "kills": 0, "win_rate": 0 },
        "octet": { "matches": 0, "wins": 0, "kills": 0, "win_rate": 0 }
      },
      "by_build_variant": {
        "build": { "matches": 0, "wins": 0, "kills": 0, "win_rate": 0 },
        "nobuild": { "matches": 0, "wins": 0, "kills": 0, "win_rate": 0 },
        "unknown": { "matches": 0, "wins": 0, "kills": 0, "win_rate": 0 }
      },
      "competitive": { "arena_matches": 0, "tournament_matches": 0, "tournament_wins": 0 }
    },
    "stat_count": 1234
  },
  "ranked": {
    "current": {
      "hasRankedData": true,
      "by_mode": {
        "ranked-br": {
          "name": "Battle Royale",
          "shortName": "BR",
          "currentRank": "Gold 2",
          "progress": 45,
          "trackGuid": "…",
          "lastUpdated": "…"
        }
      },
      "modes": [
        {
          "rankingType": "ranked-br",
          "name": "Battle Royale",
          "shortName": "BR",
          "currentRank": "Gold 2",
          "progress": 45,
          "trackGuid": "…",
          "lastUpdated": "…"
        }
      ]
    },
    "historical": {
      "description": "All historical ranked data across all seasons",
      "total_entries": 12,
      "total_seasons": 4,
      "enriched_with_metadata": false,
      "by_ranking_type": {
        "ranked-br": [
          {
            "trackGuid": "…",
            "seasonName": "…",
            "rankingTypeName": "Battle Royale",
            "rankingType": "ranked-br",
            "currentDivision": 10,
            "highestDivision": 12,
            "promotionProgress": 0.45,
            "currentRank": {},
            "highestRank": {},
            "progress": {},
            "lastUpdated": "…"
          }
        ]
      },
      "seasons_summary": {},
      "fetched_at": "2026-04-02T…"
    }
  },
  "meta": {
    "generated_at": "2026-04-02T…",
    "partial": false,
    "stats_source": {
      "upstream": "epic_statsproxy_statsv2",
      "worker_cached": false,
      "note": "Live Epic fetch each request; refresh the URL to update. Epic can lag slightly after a match."
    }
  }
}
```

### Optional: `?raw=true`

Adds **`stats.raw`** — the full statsproxy payload for that account (large). Use for debugging / comparing against Epic, not default UI.

### Optional: `?stats_debug=true`

Adds **`stats.parser_debug`**:

```json
{
  "epic_stat_key_count": 1540,
  "parsed_br_stat_rows": 1502,
  "unique_playlist_count": 178,
  "unique_playlists": ["defaultsolo", "…"],
  "skipped_br_key_count": 0,
  "skipped_br_keys": [],
  "skipped_br_keys_sample_cap": 48,
  "note": "…"
}
```

### Partial failures

If a slice fails, **`meta.partial`** is `true` and **`meta.errors`** is an array of `{ "source": "account" | "stats" | "ranked" | "ranked_history", "message": "…" }`. Other slices may still be present (`stats` or `ranked` can be partial).

- **`stats.summary`** — from `StatsParser`: totals are sums of all parsed `br_*_m0_playlist_*` rows (all playlists Epic returns). **`by_mode.octet`** covers 8-player-style playlists (e.g. Reload octets). **`by_build_variant`** is a **heuristic** (`build` / `nobuild` / `unknown`) from playlist id strings — not official Epic labels; use `?stats_debug=true` to see every playlist name we classified.  
- **`ranked.current`** — current-season summary (same idea as `getPlayerRankSummary`).  
- **`ranked.historical`** — all tracks / seasons (`getPlayerRanksAllSeasons`), grouped like standalone `/ranked/{accountId}/all-seasons`. `null` if `ranked_history=false` or that upstream call failed.  
- **`meta.partial`** — `true` if any upstream call failed; check **`meta.errors`** (`source`: `account` | `stats` | `ranked` | `ranked_history`).

## Frontend flow

1. Search: `GET /user/search?username=…&platform=epic` → pick `accountId` (or exact match).
2. Profile: `GET /v1/profile/{accountId}` → render header from `account`, KPIs from `stats.summary`, current rank cards from `ranked.current.modes`, history tables from `ranked.historical.by_ranking_type`.

## Older / heavier endpoints

- `GET /profile/{accountId}` and `GET /profile/v2/{accountId}` — larger bundles (playlists, extras). Prefer **`/v1/profile/...`** for a lean first screen; add detail tabs that call other routes later if needed.
- `GET /ranked/{accountId}/all-seasons` — still available with KV caching when you only need history and not stats.

## Auth

Uses the Worker **service account** (same as `/user/search`). No `auth_account_id` query param required.
