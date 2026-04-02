# Profile bundle (stats + ranked)

For the **search → profile page** flow: after you resolve an Epic **account id** (from `/user/search`, `/account/displayName/...`, or the user pastes a UID), load everything needed for a basic profile in **one request**.

## Endpoint

`GET /v1/profile/{accountId}`

| Query | Default | Description |
|-------|---------|-------------|
| `raw` | omitted | If `true`, includes full Epic statsproxy JSON under `stats.raw` (large; use only for debugging) |
| `stats_debug` | `false` | If `true`, adds `stats.parser_debug`: Epic key count, how many `br_*` rows were parsed, full sorted `unique_playlists` list, and any `br_*` keys that still fail parsing (should be empty after fixes) |
| `stats_by_input` | `true` | If `false`, omits **`stats.by_input`** (smaller JSON). When enabled, splits BR stats by Epic input: keyboard+mouse, gamepad, touch (from `br_*_keyboardmouse_` / `_gamepad_` / `_touch_` in keys). **Ranked is unchanged** — Habanero has no per-input breakdown in this API. |
| `stats_by_experience` | `true` | If `false`, omits **`stats.summary.by_experience`** and **`by_experience`** inside each **`stats.by_input`** row (smaller JSON). |
| `ranked_history` | `true` | If `false`, skips the all-seasons Habanero fetch (smaller / faster; `ranked.historical` is `null`) |
| `ranked_history_enrich` | `false` | If `true`, enriches historical rows with track metadata (heavier; same idea as `?enrich=true` on `/ranked/{id}/all-seasons`) |
| `cache_first` | `false` | If `true`, serves **stats** from D1 when the player row has **`parsed_data`** and `last_updated` is within **`cache_max_age`** (skips Epic statsproxy for that request). Account + ranked still load from Epic. See [progression-leaderboards.md](./progression-leaderboards.md). |
| `cache_max_age` | `3600` | Seconds (60–86400) for `cache_first` freshness. |
| `persist_min_interval` | `900` | Minimum seconds between **D1 persist** runs for this account (**default 15 minutes**). If `player_profiles.last_updated` or the latest `player_ranks.cached_at` is newer than this window, **`storeProfile` / `storePlayerRank`** are skipped for this view (response is still fresh from Epic). Range 60–3600. |
| `persist_force` | `false` | If `true`, bypasses **`persist_min_interval`** and always runs D1 persist (ops / debugging). |

`{accountId}` must be **32 hex characters** (Epic account id).

### D1 persistence (background)

On each profile view, the response is built from **Epic** (unless `cache_first` applies to stats). Separately, **`ctx.waitUntil`** may upsert **`player_profiles`** / **`profile_history`** (when stats exist) and **`player_ranks`** / **`rank_history`** for **`ranked.current`**. That persist runs **at most once per `persist_min_interval` seconds** per account (default **900** = 15 minutes), using `player_profiles.last_updated` and `MAX(player_ranks.cached_at)` so repeat refreshes do not spam D1. **`upsertDisplayName`** still runs every time when a display name is present (lightweight). Use **`persist_force=true`** to write immediately. Failures do not change HTTP status. Details: [progression-leaderboards.md](./progression-leaderboards.md).

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
| `by_experience` | object | Rollups by **game mode / experience** (playlist-id heuristics; first rule wins). Each key is `{ matches, wins, kills, win_rate }`. Keys are stable — see table below. Unclassified playlists land in **`other`**. For human-readable playlist names and ids, a useful reference is [Fortnite Italian Stats — Playlists](https://fortnite-stats.azurewebsites.net/Playlists). |
| `competitive` | object | `arena_matches`, `tournament_matches`, `tournament_wins` |

#### `by_experience` keys

| Key | Meaning (heuristic) |
|-----|---------------------|
| `battle_royale_build` | Core BR with building: `default*`, `trios`, `fm_build`, `bots_default`, `futuremap`, etc. |
| `battle_royale_zero_build` | Core Zero Build playlists (`nobuildbr`, `nobuild_*`, etc.) not already classified below |
| `reload_build` | Reload island family (see below) classified as **build** by the same rules as `by_build_variant.build` — e.g. `blastberry` / `sunflower` stems without `nobuild` / `nobuildbr` in the playlist id |
| `reload_zero_build` | Reload family with zero-build markers in the id (`nobuild`, `nobuildbr`, …) |
| `reload_unknown` | Reload family but build vs zero build could not be inferred (same limits as `by_build_variant.unknown`) |

Reload family (playlist id substrings): `blastberry`, `dashberry`, `punchberry`, `piperboot`, `sourspawn`, `timberstake`, `rusticpepper`, `tigerranch`, `squareclub`, `sugarclip`, `foxtrot`, ranked Reload (`habanero` + those markers or `sunflower`), and `sunflower` + mode tokens / `vkplay` / `nobuild` (see `StatsParser.isReloadPlaylist` in code).
| `blitz` | Blitz Royale / Forbidden Fruit (`forbiddenfruit`) |
| `og` | OG / Chapter-style island: `figment`, `barkline` (includes ranked OG when the id contains `figment`) |
| `competitive` | Arena / tournaments / ranked: `showdown*`, `habanero` (after Reload/OG rules) |
| `large_team` | Team Rumble–style and large-team LTMs: `respawn`, `papaya`, `bigbattle`, `delulu`, `teamrumble` |
| `ltm_other` | Other LTMs (Floor is Lava, Solid Gold, Ship It, Mini BR, etc.) |
| `creative` | Creative / UEFN / Festival islands / Del Mar / `vk_*`, `juno`, `sprout`, … |
| `other` | Anything that did not match the rules above |

### `stats.by_input` (default: included)

Same rollup shape as **`stats.summary`** for each device Epic tracks in statsv2:

| Key | Meaning |
|-----|---------|
| `keyboard_mouse` | Epic segment `keyboardmouse` (KBM) |
| `gamepad` | Controller |
| `touch` | Mobile / touch |

Each value includes: `total_matches`, `total_wins`, `total_kills`, `total_outlived`, `total_minutes`, `win_rate`, `kills_per_match`, `hours_played`, `top_3_finishes`, `top_5_finishes`, `total_score`, **`by_mode`**, **`by_build_variant`**, **`by_experience`** (unless `stats_by_experience=false`), **`competitive`** — all scoped to that input only.

- **`stats.summary`** remains the **all-input combined** view (sum of every `br_*` row regardless of device).
- Playlists that do not use the standard `br_*_{input}_m0_playlist_*` pattern are not in this split (same as parser rules).

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
    "by_input": {
      "keyboard_mouse": { "total_matches": 0, "by_mode": {}, "by_build_variant": {}, "competitive": {} },
      "gamepad": {},
      "touch": {}
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

- **`stats.summary`** — from `StatsParser`: totals are sums of all parsed `br_*_m0_playlist_*` rows (all playlists Epic returns). **`by_mode.octet`** covers 8-player-style playlists (e.g. Reload octets). **`by_build_variant`** and **`by_experience`** are **heuristics** from playlist id strings — not official Epic labels; use `?stats_debug=true` to see every playlist name we classified. Omit **`by_experience`** with `?stats_by_experience=false` if you need a smaller payload.  
- **`ranked.current`** — current-season summary (same idea as `getPlayerRankSummary`).  
- **`ranked.historical`** — all tracks / seasons (`getPlayerRanksAllSeasons`), grouped like standalone `/ranked/{accountId}/all-seasons`. `null` if `ranked_history=false` or that upstream call failed.  
- **`meta.partial`** — `true` if any upstream call failed; check **`meta.errors`** (`source`: `account` | `stats` | `ranked` | `ranked_history`).

## Frontend flow

1. Search: `GET /user/search?username=…&platform=epic` → pick `accountId` (or exact match).
2. Profile: `GET /v1/profile/{accountId}` → render header from `account`, KPIs from `stats.summary` (all inputs) or **`stats.by_input.{keyboard_mouse|gamepad|touch}`** for input-specific tabs, current rank cards from `ranked.current.modes`, history tables from `ranked.historical.by_ranking_type`.

## Older / heavier endpoints

- `GET /profile/{accountId}` and `GET /profile/v2/{accountId}` — larger bundles (playlists, extras). Prefer **`/v1/profile/...`** for a lean first screen; add detail tabs that call other routes later if needed.
- `GET /ranked/{accountId}/all-seasons` — still available with KV caching when you only need history and not stats.

## Auth

Uses the Worker **service account** (same as `/user/search`). No `auth_account_id` query param required.
