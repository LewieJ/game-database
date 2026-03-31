# Weapons API — Frontend Integration Guide

**API Base URL:** `https://weapons.marathondb.gg`  
**Fallback (workers.dev):** `https://marathon-weapon-api.heymarathondb.workers.dev`  
**Admin Dashboard:** `weapon-api-final/admin/index.html`  
**Last Updated:** March 26, 2026  
**Season 1 — Launch**

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Reference](#quick-reference)
3. [Endpoints — Weapon Data](#endpoints--weapon-data)
   - [GET /api/weapons](#get-apiweapons)
   - [GET /api/weapons/categories](#get-apiweaponscategories)
   - [GET /api/weapons/stat-ranges](#get-apiweaponsstat-ranges)
   - [GET /api/weapons/tier-list](#get-apiweaponstier-list)
   - [GET /api/weapons/:slug](#get-apiweaponsslug)
4. [Endpoints — Ratings](#endpoints--ratings)
   - [GET /api/weapons/:slug/ratings](#get-apiweaponsslugratings)
   - [POST /api/weapons/:slug/rate](#post-apiweaponsslugrate)
   - [GET /api/weapons/all](#get-apiweaponsall)
   - [GET /api/weapons/overview](#get-apiweaponsoverview)
   - [POST /api/weapons/combined-votes](#post-apiweaponscombined-votes)
5. [Endpoints — History & Timeline](#endpoints--history--timeline)
   - [GET /api/weapons/:slug/history](#get-apiweaponsslughistory)
   - [GET /api/weapons/:slug/timeline](#get-apiweaponsslugtimeline)
   - [GET /api/weapons/timeline](#get-apiweaponstimeline)
6. [Response Types (TypeScript)](#response-types-typescript)
7. [Asset Image Serving](#asset-image-serving)
8. [Weapon Categories](#weapon-categories)
9. [Stat Fields](#stat-fields)
10. [Ratings System](#ratings-system)
11. [Tier List System](#tier-list-system)
12. [Seasons & Patch Notes](#seasons--patch-notes)
13. [Error Handling](#error-handling)
14. [Full Fetch Examples](#full-fetch-examples)

---

## Overview

The Weapons API is a standalone Cloudflare Worker backed by a D1 database (`marathon-weapons-final`). It serves all Marathon weapon data: identity, stats per season, community star ratings, tier lists, and historical rating timelines.

Key facts:
- **30 weapons** across 9 categories
- **21 numeric stats** per weapon per season (firepower, accuracy, handling, etc.)
- **1–5 star ratings** with per-device-token deduplication
- **Tier list** auto-computed from community ratings (S/A/B/C/D/F)
- **Rating snapshots** stored daily for historical timeline charts
- **Season-aware** — all stats and ratings are scoped to a season
- **Patch notes** — per-weapon change notes each season
- CORS uses an **origin allowlist** — `marathondb.gg`, `gdb.gg`, and `localhost` variants are permitted; wildcard `*` is not used

All responses use a consistent envelope:

```json
{ "success": true, "data": { ... } }
```

Error responses:

```json
{ "success": false, "error": "Human-readable message" }
```

---

## Quick Reference

```
Weapon Data
  GET  /api/weapons                           — all weapons (lightweight list)
  GET  /api/weapons?category=assault-rifles   — filter by category
  GET  /api/weapons/categories                — all weapon categories with counts
  GET  /api/weapons/stat-ranges               — min/max for every stat (for bar normalisation)
  GET  /api/weapons/tier-list                 — S/A/B/C/D/F tier list from community ratings
  GET  /api/weapons/:slug                     — full weapon detail + stat history

Ratings
  POST /api/weapons/:slug/rate                — submit or update a 1–5 star vote
  GET  /api/weapons/:slug/ratings             — aggregate rating for one weapon
  GET  /api/weapons/all                       — all weapon ratings (current season)
  GET  /api/weapons/overview                  — ranked leaderboard
  POST /api/weapons/combined-votes            — all-time weighted aggregates for a batch of slugs

History & Timeline
  GET  /api/weapons/:slug/history             — per-season aggregate history
  GET  /api/weapons/:slug/timeline            — daily rating snapshots over time
  GET  /api/weapons/timeline                  — compare all weapons over time
```

---

## Endpoints — Weapon Data

### `GET /api/weapons`

Returns a lightweight list of all 30 weapons. Ideal for weapon pickers, sidebar lists, search, and grid views.

**Query Parameters**

| Parameter  | Type   | Description                          |
|-----------|--------|--------------------------------------|
| `category` | string | Filter by category slug (e.g. `assault-rifles`, `shotguns`) |

**Example Request**

```
GET /api/weapons
GET /api/weapons?category=assault-rifles
```

**Response**

```json
{
  "success": true,
  "count": 30,
  "data": [
    {
      "id": 17,
      "slug": "impact-har",
      "name": "Impact HAR",
      "prior_name": null,
      "category_slug": "assault-rifles",
      "category_name": "Assault Rifles",
      "type": "Heavy Assault Rifle",
      "ammo_type": "heavy_rounds",
      "description": "Heavy assault rifle.",
      "cost_credits": null,
      "icon_url": "https://helpbot.marathondb.gg/assets/weapons/impact-har/icon.png",
      "icon_url_webp": "https://helpbot.marathondb.gg/assets/weapons/impact-har/icon.webp",
      "verified": 0,
      "updated_at": "2026-03-01 13:40:23"
    }
  ]
}
```

**Frontend Notes:**
- Use `icon_url_webp` with a fallback to `icon_url` for images
- `updated_at` is auto-set when stats are saved in the admin dashboard
- `prior_name` is non-null when a weapon has been renamed (e.g. beta → launch name)
- `verified` indicates whether the weapon data has been reviewed/confirmed

---

### `GET /api/weapons/categories`

Returns all weapon categories with their weapon counts.

**Response**

```json
{
  "success": true,
  "data": [
    {
      "slug": "assault-rifles",
      "name": "Assault Rifles",
      "description": "Versatile automatic weapons for medium-range combat",
      "weapon_count": 4
    },
    {
      "slug": "shotguns",
      "name": "Shotguns",
      "description": "Close-range weapons with high burst damage",
      "weapon_count": 3
    }
  ]
}
```

**All Categories:**

| Slug | Name | Count |
|------|------|:-----:|
| `assault-rifles` | Assault Rifles | 4 |
| `machine-guns` | Machine Guns | 3 |
| `melee` | Melee | 1 |
| `pistols` | Pistols | 3 |
| `precision-rifles` | Precision Rifles | 7 |
| `railguns` | Railguns | 2 |
| `shotguns` | Shotguns | 3 |
| `sniper-rifles` | Sniper Rifles | 3 |
| `submachine-guns` | Submachine Guns | 4 |

---

### `GET /api/weapons/stat-ranges`

Returns the min and max value for every numeric stat across all weapons in the **current season**. Use this to normalise stat bars to a consistent scale.

**Response**

```json
{
  "success": true,
  "data": {
    "damage": { "min": 14, "max": 180 },
    "rate_of_fire": { "min": 60, "max": 1200 },
    "magazine_size": { "min": 1, "max": 100 },
    "range_meters": { "min": 5, "max": 80 }
  }
}
```

**Frontend Notes:**
- Returns values for all 21 stat fields (see [Stat Fields](#stat-fields))
- If no stats exist for the current season, values may be `null`
- Recalculate normalised bars as: `percent = ((value - min) / (max - min)) * 100`

---

### `GET /api/weapons/tier-list`

Auto-generated tier list grouping weapons into S/A/B/C/D/F tiers based on community ratings.

**Query Parameters**

| Parameter   | Type   | Description                              |
|------------|--------|------------------------------------------|
| `category`  | string | Filter by category slug                  |
| `min_votes` | number | Minimum votes required to be included (default: `0`) |

**Example Request**

```
GET /api/weapons/tier-list?min_votes=5&category=assault-rifles
```

**Response**

```json
{
  "success": true,
  "season": { "id": 3, "name": "Season 1 - Launch", "version": null },
  "category_filter": null,
  "min_votes_required": 5,
  "total_weapons": 12,
  "tiers": [
    {
      "tier": "S",
      "min_rating": 4.5,
      "max_rating": 5.0,
      "weapons": [
        {
          "slug": "impact-har",
          "name": "Impact HAR",
          "category_slug": "assault-rifles",
          "category_name": "Assault Rifles",
          "icon_url": "...",
          "icon_url_webp": "...",
          "average_rating": 4.78,
          "total_votes": 23
        }
      ]
    },
    { "tier": "A", "min_rating": 3.5, "max_rating": 4.49, "weapons": [] },
    { "tier": "B", "min_rating": 2.5, "max_rating": 3.49, "weapons": [] },
    { "tier": "C", "min_rating": 1.5, "max_rating": 2.49, "weapons": [] },
    { "tier": "D", "min_rating": 0.5, "max_rating": 1.49, "weapons": [] },
    { "tier": "F", "min_rating": 0,   "max_rating": 0.49, "weapons": [] }
  ]
}
```

**Tier Thresholds:**

| Tier | Min Rating | Max Rating |
|:----:|:----------:|:----------:|
| S | 4.50 | 5.00 |
| A | 3.50 | 4.49 |
| B | 2.50 | 3.49 |
| C | 1.50 | 2.49 |
| D | 0.50 | 1.49 |
| F | 0.00 | 0.49 |

---

### `GET /api/weapons/:slug`

Full weapon detail with stat history across all seasons.

**Response**

```json
{
  "success": true,
  "data": {
    "id": 17,
    "slug": "impact-har",
    "name": "Impact HAR",
    "prior_name": null,
    "rename_notes": null,
    "category_slug": "assault-rifles",
    "category_name": "Assault Rifles",
    "type": "Heavy Assault Rifle",
    "ammo_type": "heavy_rounds",
    "description": "Heavy assault rifle.",
    "cost_credits": null,
    "icon_url": "https://helpbot.marathondb.gg/assets/weapons/impact-har/icon.png",
    "icon_url_webp": "https://helpbot.marathondb.gg/assets/weapons/impact-har/icon.webp",
    "verified": false,
    "last_updated": "2026-03-01 13:40:23",
    "stats": [
      {
        "season_id": 2,
        "season_name": "Server Slam",
        "season_version": null,
        "patch_version": null,
        "patch_notes": null,
        "weapon_patch_notes": "Damage reduced from 48 to 44. Rate of fire increased.",
        "season_type": "playtest",
        "release_date": null,
        "is_current": false,
        "firepower_score": 72,
        "damage": 44,
        "precision": 30,
        "rate_of_fire": 600,
        "charge_time_seconds": null,
        "accuracy_score": 65,
        "hipfire_spread": 2.1,
        "ads_spread": 0.4,
        "crouch_spread_bonus": 0.8,
        "moving_inaccuracy": 1.2,
        "handling_score": 58,
        "equip_speed": 0.35,
        "ads_speed": 0.22,
        "weight": 3.5,
        "recoil": 12,
        "aim_assist": 45,
        "reload_speed": 2.1,
        "range_meters": 45,
        "magazine_size": 30,
        "volt_drain": null,
        "zoom": 1.5
      }
    ]
  }
}
```

**Frontend Notes:**
- `stats` is an array — **one entry per season** the weapon has data for
- To show current season stats: filter for `stats.find(s => s.is_current)`
- To show stat changes between seasons: compare two entries in the stats array
- `weapon_patch_notes` is a per-weapon-per-season text (e.g. "Damage reduced from 48 to 44")
- `patch_notes` comes from the season itself (global patch notes)
- `last_updated` is the `updated_at` from the weapon's most recent admin save

---

## Endpoints — Ratings

### `GET /api/weapons/:slug/ratings`

Get the aggregate community rating for a single weapon in the current season.

**Query Parameters**

| Parameter      | Type   | Description                                    |
|---------------|--------|------------------------------------------------|
| `device_token` | string | Include the user's own rating in the response |

**Example Request**

```
GET /api/weapons/impact-har/ratings
GET /api/weapons/impact-har/ratings?device_token=abc123
```

**Response**

```json
{
  "success": true,
  "weapon_slug": "impact-har",
  "weapon_name": "Impact HAR",
  "weapon_icon": "https://helpbot.marathondb.gg/assets/weapons/impact-har/icon.png",
  "category": { "name": "Assault Rifles", "slug": "assault-rifles" },
  "season": { "id": 3, "name": "Season 1 - Launch", "version": null, "is_current": true },
  "ratings": {
    "average_rating": 4.33,
    "total_votes": 12,
    "distribution": {
      "1": { "count": 0, "percent": 0 },
      "2": { "count": 1, "percent": 8.33 },
      "3": { "count": 1, "percent": 8.33 },
      "4": { "count": 4, "percent": 33.33 },
      "5": { "count": 6, "percent": 50 }
    }
  },
  "user_rating": 5,
  "last_updated": "2026-03-03 14:22:00"
}
```

**Frontend Notes:**
- `user_rating` is `null` if no `device_token` is provided or the user hasn't voted
- `distribution` keys are strings `"1"` through `"5"`
- `percent` values are rounded to 2 decimal places and sum to ~100

---

### `POST /api/weapons/:slug/rate`

Submit or update a star rating for a weapon. One vote per device_token per weapon per season.

**Request Body**

```json
{
  "rating": 4,
  "device_token": "unique-device-or-user-id"
}
```

| Field          | Type   | Required | Description              |
|---------------|--------|----------|--------------------------|
| `rating`       | number | Yes      | Integer from 1 to 5      |
| `device_token` | string | Yes      | Unique per-user identifier |

**Response**

```json
{
  "success": true,
  "message": "Rating submitted",
  "previous_rating": null,
  "rating": 4,
  "weapon_slug": "impact-har",
  "weapon_name": "Impact HAR",
  "season_id": 3,
  "aggregate": {
    "average_rating": 4.33,
    "total_votes": 13,
    "distribution": {
      "1": { "count": 0, "percent": 0 },
      "2": { "count": 1, "percent": 7.69 },
      "3": { "count": 1, "percent": 7.69 },
      "4": { "count": 5, "percent": 38.46 },
      "5": { "count": 6, "percent": 46.15 }
    }
  }
}
```

**Frontend Notes:**
- If the user updates an existing vote, `message` will be `"Rating updated"` and `previous_rating` will contain the old value
- The response includes the fresh aggregate so you can update the UI immediately without a second fetch
- Each vote automatically updates the daily rating snapshot for timeline tracking
- `device_token` should be a persistent identifier — e.g. a UUID stored in localStorage

---

### `GET /api/weapons/all`

All weapon ratings for the current season, ranked by average rating descending.

**Response**

```json
{
  "success": true,
  "season": { "id": 3, "name": "Season 1 - Launch", "version": null },
  "count": 18,
  "data": [
    {
      "weapon_slug": "impact-har",
      "weapon_name": "Impact HAR",
      "icon_url": "...",
      "icon_url_webp": "...",
      "category": { "slug": "assault-rifles", "name": "Assault Rifles" },
      "ratings": {
        "average_rating": 4.33,
        "total_votes": 12,
        "distribution": { "1": { "count": 0, "percent": 0 }, "...": "..." }
      },
      "last_updated": "2026-03-03 14:22:00"
    }
  ]
}
```

---

### `GET /api/weapons/overview`

Ranked leaderboard with optional filtering. Simpler than `/all` — no full distribution, just the key numbers.

**Query Parameters**

| Parameter          | Type    | Description                                                                 |
|-------------------|---------|-----------------------------------------------------------------------------|
| `min_votes`        | number  | Minimum votes to be included (default: `0`)                                 |
| `category`         | string  | Filter by category slug                                                     |
| `include_combined` | boolean | When `true`, adds all-time combined stats across all seasons to each entry  |

**Example Request**

```
GET /api/weapons/overview?min_votes=5&category=precision-rifles
GET /api/weapons/overview?include_combined=true
```

**Response**

```json
{
  "success": true,
  "season": { "id": 3, "name": "Season 1 - Launch", "version": null },
  "min_votes_required": 5,
  "count": 6,
  "data": [
    {
      "rank": 1,
      "weapon_slug": "impact-har",
      "weapon_name": "Impact HAR",
      "icon_url": "...",
      "icon_url_webp": "...",
      "category": { "slug": "assault-rifles", "name": "Assault Rifles" },
      "average_rating": 4.33,
      "total_votes": 12,
      "combined_total_votes": 35,
      "combined_average_rating": 4.21,
      "last_updated": "2026-03-03 14:22:00"
    }
  ]
}
```

**Frontend Notes:**
- `combined_total_votes` and `combined_average_rating` are only present when `include_combined=true`
- Combined stats are a weighted average across **all seasons** — useful for showing a weapon's overall all-time reception
- Accepted values for `include_combined`: `1`, `true`, `yes`

---

### `POST /api/weapons/combined-votes`

Batch endpoint that returns all-time weighted vote aggregates across **all seasons** for up to 50 weapon slugs in a single request. Ideal for leaderboard or comparison pages that need all-time data without per-weapon fetches.

**Request Body**

```json
{
  "slugs": ["impact-har", "rivet-m5", "volt-driver"]
}
```

| Field    | Type       | Required | Description                            |
|---------|------------|----------|----------------------------------------|
| `slugs`  | string[]   | Yes      | Array of weapon slugs (max **50**)     |

**Response**

```json
{
  "success": true,
  "data": [
    {
      "weapon_slug": "impact-har",
      "total_votes": 35,
      "average_rating": 4.21
    },
    {
      "weapon_slug": "rivet-m5",
      "total_votes": 18,
      "average_rating": 3.89
    }
  ]
}
```

**Frontend Notes:**
- Results are returned in the **same order** as the input `slugs` array
- Slugs with zero votes across all seasons are **omitted** from the result
- `average_rating` is a weighted average: `SUM(avg * votes) / SUM(votes)` across all seasons
- Returns a `400` error if more than 50 slugs are submitted (`error: "too_many_slugs"`)
- Returns an empty `data: []` array (not an error) if `slugs` is empty or all entries are invalid

---

## Endpoints — History & Timeline

### `GET /api/weapons/:slug/history`

Returns this weapon's aggregate rating across **every season** it has been rated in. Useful for showing how a weapon's reception changed between seasons/patches.

**Response**

```json
{
  "success": true,
  "weapon_slug": "impact-har",
  "weapon_name": "Impact HAR",
  "seasons": [
    {
      "season_id": 2,
      "season_name": "Server Slam",
      "season_version": null,
      "ratings": {
        "average_rating": 5.0,
        "total_votes": 1,
        "distribution": { "1": { "count": 0, "percent": 0 }, "5": { "count": 1, "percent": 100 } }
      },
      "last_updated": "2026-03-02 04:23:43"
    },
    {
      "season_id": 3,
      "season_name": "Season 1 - Launch",
      "season_version": null,
      "ratings": { "average_rating": 4.33, "total_votes": 12, "distribution": { "...": "..." } },
      "last_updated": "2026-03-03 14:22:00"
    }
  ]
}
```

**Frontend Notes:**
- Seasons are ordered by `season_id` ascending (chronological)
- Use this to build a season-over-season comparison table or bar chart

---

### `GET /api/weapons/:slug/timeline`

Daily rating snapshot time-series for a single weapon. Each data point is a snapshot of the aggregate rating on that day/period. Used for "popularity over time" line charts.

**Query Parameters**

| Parameter     | Type   | Default | Description                                              |
|--------------|--------|---------|----------------------------------------------------------|
| `days`        | number | `90`    | Number of days to look back (max 365)                    |
| `granularity` | string | `day`   | Bucket size: `day`, `week`, or `month`                   |
| `season_id`   | number | current | Specific season to query (defaults to the active season) |

**Example Request**

```
GET /api/weapons/impact-har/timeline?days=90&granularity=day
GET /api/weapons/impact-har/timeline?season_id=2&days=365
GET /api/weapons/impact-har/timeline?granularity=week&days=180
```

**Response**

```json
{
  "success": true,
  "weapon_slug": "impact-har",
  "weapon_name": "Impact HAR",
  "season": { "id": 2, "name": "Server Slam" },
  "granularity": "day",
  "days": 365,
  "data_points": 2,
  "timeline": [
    {
      "period": "2026-03-02",
      "average_rating": 5.0,
      "total_votes": 1,
      "distribution": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 }
    },
    {
      "period": "2026-03-03",
      "average_rating": 4.5,
      "total_votes": 4,
      "distribution": { "1": 0, "2": 0, "3": 0, "4": 2, "5": 2 }
    }
  ]
}
```

**Frontend Notes:**
- `period` format depends on granularity: `"2026-03-02"` (day), `"2026-W09"` (week), `"2026-03"` (month)
- Snapshots are auto-created every time a vote is cast, so `data_points` grows organically
- `distribution` values here are raw counts (not objects), unlike the aggregate endpoints
- Use this with Chart.js or similar to build a line chart — `period` on X axis, `average_rating` on Y

---

### `GET /api/weapons/timeline`

Compare **all weapons** over time in the current season. Returns data pivoted by weapon slug.

**Query Parameters**

| Parameter     | Type   | Default | Description                            |
|--------------|--------|---------|----------------------------------------|
| `days`        | number | `30`    | Number of days to look back (max 365)  |
| `granularity` | string | `day`   | Bucket size: `day`, `week`, or `month` |

**Response**

```json
{
  "success": true,
  "season": { "id": 3, "name": "Season 1 - Launch", "version": null },
  "granularity": "day",
  "days": 30,
  "weapons": {
    "impact-har": [
      { "period": "2026-03-02", "avg_rating": 4.5, "votes": 8 },
      { "period": "2026-03-03", "avg_rating": 4.33, "votes": 12 }
    ],
    "rivet-m5": [
      { "period": "2026-03-02", "avg_rating": 3.8, "votes": 5 }
    ]
  }
}
```

**Frontend Notes:**
- `weapons` is keyed by weapon slug — iterate with `Object.entries(data.weapons)`
- Each weapon may have different periods (only periods with data are included)
- Useful for a multi-line comparison chart showing all weapon trends together

---

## Response Types (TypeScript)

```typescript
// ---- Weapon List Item ----
interface WeaponListItem {
  id: number;
  slug: string;
  name: string;
  prior_name: string | null;
  category_slug: string;
  category_name: string;
  type: string | null;           // e.g. "Heavy Assault Rifle"
  ammo_type: string;             // "light_rounds" | "heavy_rounds" | "mips_rounds" | "volt_cell" | "none"
  description: string | null;
  cost_credits: number | null;
  icon_url: string | null;
  icon_url_webp: string | null;
  verified: number;              // 0 or 1
  updated_at: string | null;     // ISO datetime, auto-set on save
}

// ---- Weapon Detail ----
interface WeaponDetail {
  id: number;
  slug: string;
  name: string;
  prior_name: string | null;
  rename_notes: string | null;
  category_slug: string;
  category_name: string;
  type: string | null;
  ammo_type: string;
  description: string | null;
  cost_credits: number | null;
  icon_url: string | null;
  icon_url_webp: string | null;
  verified: boolean;
  last_updated: string | null;
  stats: StatEntry[];
}

// ---- Stat Entry (one per season) ----
interface StatEntry {
  season_id: number;
  season_name: string;
  season_version: string | null;
  patch_version: string | null;
  patch_notes: string | null;            // global season patch notes
  weapon_patch_notes: string | null;     // weapon-specific notes for this season
  season_type: string;                   // "playtest" | "season" | etc.
  release_date: string | null;
  is_current: boolean;
  // -- Firepower --
  firepower_score: number | null;
  damage: number | null;
  precision: number | null;
  rate_of_fire: number | null;
  charge_time_seconds: number | null;
  // -- Accuracy --
  accuracy_score: number | null;
  hipfire_spread: number | null;
  ads_spread: number | null;
  crouch_spread_bonus: number | null;
  moving_inaccuracy: number | null;
  // -- Handling --
  handling_score: number | null;
  equip_speed: number | null;
  ads_speed: number | null;
  weight: number | null;
  recoil: number | null;
  aim_assist: number | null;
  reload_speed: number | null;
  // -- Other --
  range_meters: number | null;
  magazine_size: number | null;
  volt_drain: number | null;
  zoom: number | null;
}

// ---- Rating Aggregate ----
interface RatingAggregate {
  average_rating: number;
  total_votes: number;
  distribution: {
    [star: string]: { count: number; percent: number };
  };
}

// ---- Tier Bucket ----
interface TierBucket {
  tier: "S" | "A" | "B" | "C" | "D" | "F";
  min_rating: number;
  max_rating: number;
  weapons: TierListWeapon[];
}

interface TierListWeapon {
  slug: string;
  name: string;
  category_slug: string;
  category_name: string;
  icon_url: string | null;
  icon_url_webp: string | null;
  average_rating: number;
  total_votes: number;
}

// ---- Overview Item ----
interface OverviewItem {
  rank: number;
  weapon_slug: string;
  weapon_name: string;
  icon_url: string | null;
  icon_url_webp: string | null;
  category: { slug: string; name: string };
  average_rating: number;
  total_votes: number;
  // Only present when ?include_combined=true
  combined_total_votes?: number;
  combined_average_rating?: number;
  last_updated: string | null;
}

// ---- Combined Votes Response ----
interface CombinedVotesItem {
  weapon_slug: string;
  total_votes: number;        // sum across all seasons
  average_rating: number;     // weighted average across all seasons
}

// ---- Timeline Data Point ----
interface TimelinePoint {
  period: string;              // "2026-03-02" | "2026-W09" | "2026-03"
  average_rating: number;
  total_votes: number;
  distribution: {
    "1": number; "2": number; "3": number; "4": number; "5": number;
  };
}

// ---- API Envelope ----
interface ApiSuccess<T> {
  success: true;
  data?: T;
  count?: number;
  [key: string]: unknown;
}

interface ApiError {
  success: false;
  error: string;
}
```

---

## Weapon Categories

All weapons belong to exactly one category:

| Slug | Name | Count | Ammo Types |
|------|------|:-----:|------------|
| `assault-rifles` | Assault Rifles | 4 | heavy_rounds |
| `machine-guns` | Machine Guns | 3 | heavy_rounds |
| `melee` | Melee | 1 | none |
| `pistols` | Pistols | 3 | light_rounds |
| `precision-rifles` | Precision Rifles | 7 | light_rounds, heavy_rounds |
| `railguns` | Railguns | 2 | volt_cell |
| `shotguns` | Shotguns | 3 | mips_rounds |
| `sniper-rifles` | Sniper Rifles | 3 | heavy_rounds |
| `submachine-guns` | Submachine Guns | 4 | light_rounds |

---

## Stat Fields

Every weapon has up to 21 numeric stats per season, grouped into three categories:

### Firepower
| Field | Type | Description |
|-------|------|-------------|
| `firepower_score` | number | Overall firepower score |
| `damage` | number | Damage per hit |
| `precision` | number | Precision multiplier rating |
| `rate_of_fire` | number | Rounds per minute |
| `charge_time_seconds` | number | Charge time (railguns, null for others) |

### Accuracy
| Field | Type | Description |
|-------|------|-------------|
| `accuracy_score` | number | Overall accuracy score |
| `hipfire_spread` | number | Hipfire cone spread |
| `ads_spread` | number | ADS cone spread |
| `crouch_spread_bonus` | number | Spread reduction when crouching |
| `moving_inaccuracy` | number | Inaccuracy penalty while moving |

### Handling
| Field | Type | Description |
|-------|------|-------------|
| `handling_score` | number | Overall handling score |
| `equip_speed` | number | Time to equip (seconds) |
| `ads_speed` | number | Time to aim down sights (seconds) |
| `weight` | number | Weapon weight |
| `recoil` | number | Recoil magnitude |
| `aim_assist` | number | Aim assist strength |
| `reload_speed` | number | Reload time (seconds) |

### Other
| Field | Type | Description |
|-------|------|-------------|
| `range_meters` | number | Effective range in meters |
| `magazine_size` | number | Rounds per magazine |
| `volt_drain` | number | Volt drain rate (volt weapons only) |
| `zoom` | number | Zoom magnification level |

> All stat fields are nullable — `null` means the stat doesn't apply to this weapon type (e.g. `charge_time_seconds` is null for non-railguns, `volt_drain` is null for ballistic weapons).

---

## Ratings System

### How It Works

1. User sends `POST /:slug/rate` with `{ rating: 1-5, device_token: "..." }`
2. One vote per device_token per weapon per season (updates overwrite)
3. Aggregate is recomputed immediately after each vote
4. A daily snapshot is also written for timeline tracking
5. Aggregates are scoped to the current active season

### Building a Rating UI

```typescript
// Fetch current rating + user's vote
const res = await fetch(`${API}/api/weapons/${slug}/ratings?device_token=${token}`);
const { ratings, user_rating } = await res.json();

// Submit a vote
const rate = await fetch(`${API}/api/weapons/${slug}/rate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rating: 4, device_token: token }),
});
const { aggregate } = await rate.json();
// aggregate contains the fresh totals — update UI directly
```

### Star Distribution Bars

```typescript
// Render 5-star breakdown
const dist = ratings.distribution;
for (const star of [5, 4, 3, 2, 1]) {
  const { count, percent } = dist[star];
  // Render: ★★★★★ ━━━━━━━━━ 42% (21 votes)
  renderBar(star, percent, count);
}
```

---

## Tier List System

Weapons are auto-bucketed into S through F tiers based on community average rating:

```typescript
const res = await fetch(`${API}/api/weapons/tier-list?min_votes=3`);
const { tiers } = await res.json();

for (const bucket of tiers) {
  console.log(`${bucket.tier} Tier (${bucket.min_rating}–${bucket.max_rating})`);
  for (const w of bucket.weapons) {
    console.log(`  ${w.name}: ${w.average_rating}★ (${w.total_votes} votes)`);
  }
}
```

> **Tip:** Use `min_votes` to filter out weapons with too few votes for a meaningful tier placement.

---

## Seasons & Patch Notes

All stats and ratings are scoped to seasons. The API always uses the **current active season** unless you specify `season_id`.

### Comparing Weapon Changes Between Seasons

```typescript
const res = await fetch(`${API}/api/weapons/${slug}`);
const { data } = await res.json();

const current = data.stats.find(s => s.is_current);
const previous = data.stats[data.stats.length - 2]; // second-to-last

if (current && previous) {
  const damageDiff = current.damage - previous.damage;
  console.log(`Damage: ${previous.damage} → ${current.damage} (${damageDiff > 0 ? '+' : ''}${damageDiff})`);

  if (current.weapon_patch_notes) {
    console.log(`Notes: ${current.weapon_patch_notes}`);
  }
}
```

### Rating History Across Seasons

```typescript
const res = await fetch(`${API}/api/weapons/${slug}/history`);
const { seasons } = await res.json();

for (const s of seasons) {
  console.log(`${s.season_name}: ${s.ratings.average_rating}★ (${s.ratings.total_votes} votes)`);
}
```

---

## Error Handling

All errors return the same envelope:

```json
{ "success": false, "error": "Human-readable message" }
```

| HTTP Status | Typical Cause |
|:-----------:|---------------|
| 400 | Invalid request body, missing required field, rating out of range |
| 404 | Weapon slug not found, no active season |

```typescript
const res = await fetch(`${API}/api/weapons/${slug}/ratings`);
const data = await res.json();

if (!data.success) {
  console.error(data.error); // e.g. "Weapon 'invalid-slug' not found"
  return;
}
```

---

## Full Fetch Examples

### Weapon Grid Page

```typescript
const API = 'https://weapons.marathondb.gg';

// Fetch weapons and categories in parallel
const [weaponsRes, catsRes] = await Promise.all([
  fetch(`${API}/api/weapons`).then(r => r.json()),
  fetch(`${API}/api/weapons/categories`).then(r => r.json()),
]);

const weapons = weaponsRes.data;
const categories = catsRes.data;

// Group by category
const grouped = {};
for (const cat of categories) {
  grouped[cat.slug] = {
    name: cat.name,
    weapons: weapons.filter(w => w.category_slug === cat.slug),
  };
}
```

### Weapon Detail Page

```typescript
const slug = 'impact-har';
const deviceToken = localStorage.getItem('device_token') || crypto.randomUUID();
localStorage.setItem('device_token', deviceToken);

// Fetch weapon detail, ratings, stat-ranges, and history in parallel
const [detailRes, ratingsRes, rangesRes, historyRes] = await Promise.all([
  fetch(`${API}/api/weapons/${slug}`).then(r => r.json()),
  fetch(`${API}/api/weapons/${slug}/ratings?device_token=${deviceToken}`).then(r => r.json()),
  fetch(`${API}/api/weapons/stat-ranges`).then(r => r.json()),
  fetch(`${API}/api/weapons/${slug}/history`).then(r => r.json()),
]);

const weapon = detailRes.data;
const currentStats = weapon.stats.find(s => s.is_current);
const statRanges = rangesRes.data;

// Normalise a stat bar
function statPercent(field, value) {
  const range = statRanges[field];
  if (!range || range.min === null || range.max === null || value === null) return 0;
  if (range.max === range.min) return 100;
  return Math.round(((value - range.min) / (range.max - range.min)) * 100);
}
```

### Rating Timeline Chart (Chart.js)

```typescript
const timelineRes = await fetch(
  `${API}/api/weapons/${slug}/timeline?days=90&granularity=day`
).then(r => r.json());

const labels = timelineRes.timeline.map(p => p.period);
const ratings = timelineRes.timeline.map(p => p.average_rating);

new Chart(document.getElementById('myChart'), {
  type: 'line',
  data: {
    labels,
    datasets: [{
      label: 'Average Rating',
      data: ratings,
      borderColor: '#6366f1',
      fill: true,
      backgroundColor: 'rgba(99,102,241,0.1)',
      tension: 0.3,
    }],
  },
  options: {
    scales: {
      y: { min: 1, max: 5 },
    },
  },
});
```

### Multi-Weapon Comparison Chart

```typescript
const compRes = await fetch(
  `${API}/api/weapons/timeline?days=30&granularity=day`
).then(r => r.json());

const datasets = Object.entries(compRes.weapons).map(([slug, points]) => ({
  label: slug,
  data: points.map(p => ({ x: p.period, y: p.avg_rating })),
  borderWidth: 2,
  tension: 0.3,
}));

new Chart(document.getElementById('compChart'), {
  type: 'line',
  data: { datasets },
  options: {
    scales: {
      x: { type: 'category' },
      y: { min: 1, max: 5 },
    },
  },
});
```

### All-Time Combined Leaderboard

```typescript
// Get overview with all-time combined stats in one request
const overviewRes = await fetch(
  `${API}/api/weapons/overview?include_combined=true`
).then(r => r.json());

for (const item of overviewRes.data) {
  console.log(
    `#${item.rank} ${item.weapon_name}: ` +
    `${item.average_rating}★ this season (${item.total_votes} votes) | ` +
    `${item.combined_average_rating}★ all-time (${item.combined_total_votes} votes)`
  );
}

// OR: batch combined votes for a specific list of slugs
const batchRes = await fetch(`${API}/api/weapons/combined-votes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ slugs: ['impact-har', 'rivet-m5', 'volt-driver'] }),
}).then(r => r.json());

for (const item of batchRes.data) {
  console.log(`${item.weapon_slug}: ${item.average_rating}★ (${item.total_votes} votes all-time)`);
}
```

---

## Asset Image Serving

The API serves weapon (and other) images directly from Cloudflare R2 storage:

```
GET /assets/{path}
```

**Example**
```
GET /assets/weapons/impact-har/icon.png
GET /assets/weapons/impact-har/icon.webp
```

- Served with `Cache-Control: public, max-age=31536000, immutable` — images are permanently cached at the CDN edge
- The `icon_url` and `icon_url_webp` fields on all weapon responses already point to these paths (e.g. `https://helpbot.marathondb.gg/assets/weapons/impact-har/icon.png`)
- Always prefer `icon_url_webp` with a fallback to `icon_url` for better performance
- Returns `404` JSON (`{ "error": "Image not found" }`) if the asset doesn't exist in R2
