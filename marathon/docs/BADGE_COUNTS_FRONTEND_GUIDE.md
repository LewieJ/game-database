# Badge Count Endpoints — Frontend Integration Guide

**Last Updated:** March 2, 2026

---

## Overview

Four new lightweight endpoints return **aggregate counts** grouped by slug — designed to replace the expensive client-side counting that was fetching entire tables just to render badge numbers on runner/weapon cards.

All endpoints follow the same response shape:

```json
{
  "success": true,
  "data": {
    "<slug>": <integer>,
    ...
  }
}
```

On error:

```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

No pagination, no filtering, no enrichment — just a `{ slug: count }` map, typically under 1 KB.

---

## Table of Contents

1. [Core Counts (by runner type)](#1-core-counts-by-runner-type)
2. [Runner Skin Counts (by runner slug)](#2-runner-skin-counts-by-runner-slug)
3. [Weapon Mod Counts (by weapon slug)](#3-weapon-mod-counts-by-weapon-slug)
4. [Weapon Skin Counts (by weapon slug)](#4-weapon-skin-counts-by-weapon-slug)
5. [Frontend Integration Examples](#5-frontend-integration-examples)
6. [Performance Impact](#6-performance-impact)

---

## 1. Core Counts (by runner type)

```
GET https://cores.marathondb.gg/api/cores/counts
```

Returns the number of **active** cores grouped by `runner_type`.

### Response

```json
{
  "success": true,
  "data": {
    "all": 3,
    "assassin": 8,
    "destroyer": 6,
    "recon": 7,
    "rook": 5,
    "thief": 6,
    "triage": 4,
    "vandal": 5
  }
}
```

### Key Details

| Detail | Value |
|---|---|
| Keys | Lowercase `runner_type` values (matches `core.runner_type` from `/api/cores`) |
| Filter | Only counts cores where `is_active = 1` |
| `"all"` key | Included — skip it on the frontend if you only want runner-specific counts |

### Frontend Usage

Replaces `fetchCoreCounts()` in `js/runners.js` which previously fetched the entire `/api/cores` response.

```ts
const API = 'https://cores.marathondb.gg';

async function fetchCoreCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${API}/api/cores/counts`);
  const { success, data } = await res.json();
  if (!success) throw new Error('Failed to fetch core counts');
  return data; // { "assassin": 8, "destroyer": 6, ... }
}
```

---

## 2. Runner Skin Counts (by runner slug)

```
GET https://runnerskins.marathondb.gg/api/skins/counts
```

Returns the total skin count grouped by runner slug.

### Response

```json
{
  "success": true,
  "data": {
    "assassin": 12,
    "destroyer": 9,
    "recon": 11,
    "rook": 8,
    "thief": 7,
    "triage": 6,
    "vandal": 10
  }
}
```

### Key Details

| Detail | Value |
|---|---|
| Keys | Lowercase runner slugs (matches `skin.runner.slug` from `/api/skins`) |
| Filter | Counts **all** skins regardless of rarity or availability |

### Frontend Usage

Replaces `fetchSkinCounts()` in `js/runners.js` which previously paginated the entire `/api/skins` table.

```ts
const API = 'https://runnerskins.marathondb.gg';

async function fetchSkinCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${API}/api/skins/counts`);
  const { success, data } = await res.json();
  if (!success) throw new Error('Failed to fetch skin counts');
  return data; // { "assassin": 12, "destroyer": 9, ... }
}
```

---

## 3. Weapon Mod Counts (by weapon slug)

```
GET https://mods.marathondb.gg/api/mods/counts
```

Returns the total **active** mod count grouped by weapon slug.

### Response

```json
{
  "success": true,
  "data": {
    "m77-assault-rifle": 6,
    "v22-volt-thrower": 8,
    "overrun-ar": 5,
    "longshot": 4,
    "twin-tap-hbr": 7,
    "melee": 0
  }
}
```

### Key Details

| Detail | Value |
|---|---|
| Keys | Lowercase weapon slugs (matches what `/api/weapons/:slug/mods` uses) |
| Filter | Only counts **active** mods (`is_active = 1`) via the `weapon_mod_compatibility` table |
| Zero counts | Weapons with no compatible mods are included with count `0` |

### Frontend Usage

Replaces `loadWeaponModCounts()` in `js/weapons.js` which previously fired ~25 parallel `/api/weapons/:slug/mods` calls.

```ts
const API = 'https://mods.marathondb.gg';

async function loadWeaponModCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${API}/api/mods/counts`);
  const { success, data } = await res.json();
  if (!success) throw new Error('Failed to fetch mod counts');
  return data; // { "m77-assault-rifle": 6, "longshot": 4, ... }
}
```

---

## 4. Weapon Skin Counts (by weapon slug)

```
GET https://weaponskins.marathondb.gg/api/skins/counts
```

Returns the total skin count grouped by weapon slug.

### Response

```json
{
  "success": true,
  "data": {
    "m77-assault-rifle": 3,
    "v22-volt-thrower": 2,
    "overrun-ar": 1,
    "longshot": 4,
    "twin-tap-hbr": 2,
    "melee": 0
  }
}
```

### Key Details

| Detail | Value |
|---|---|
| Keys | Lowercase weapon slugs (matches `skin.weapon.slug` from `/api/skins`) |
| Filter | Counts **all** skins regardless of rarity or availability |
| Zero counts | Weapons with no skins are included with count `0` |

### Frontend Usage

Replaces `loadWeaponSkinCounts()` in `js/weapons.js` which previously paginated the entire weapon skins table.

```ts
const API = 'https://weaponskins.marathondb.gg';

async function loadWeaponSkinCounts(): Promise<Record<string, number>> {
  const res = await fetch(`${API}/api/skins/counts`);
  const { success, data } = await res.json();
  if (!success) throw new Error('Failed to fetch skin counts');
  return data; // { "m77-assault-rifle": 3, "longshot": 4, ... }
}
```

---

## 5. Frontend Integration Examples

### Runners Page — Badge Rendering

```ts
// Fetch both counts in parallel
const [coreCounts, skinCounts] = await Promise.all([
  fetch('https://cores.marathondb.gg/api/cores/counts').then(r => r.json()),
  fetch('https://runnerskins.marathondb.gg/api/skins/counts').then(r => r.json()),
]);

// Render badges on each runner card
runners.forEach(runner => {
  const slug = runner.slug; // e.g. "assassin"
  const cores = coreCounts.data[slug] ?? 0;
  const skins = skinCounts.data[slug] ?? 0;

  card.querySelector('.core-badge').textContent = cores;
  card.querySelector('.skin-badge').textContent = skins;
});
```

### Weapons Page — Badge Rendering

```ts
// Fetch both counts in parallel
const [modCounts, skinCounts] = await Promise.all([
  fetch('https://mods.marathondb.gg/api/mods/counts').then(r => r.json()),
  fetch('https://weaponskins.marathondb.gg/api/skins/counts').then(r => r.json()),
]);

// Render badges on each weapon card
weapons.forEach(weapon => {
  const slug = weapon.slug; // e.g. "m77-assault-rifle"
  const mods  = modCounts.data[slug] ?? 0;
  const skins = skinCounts.data[slug] ?? 0;

  card.querySelector('.mod-badge').textContent = mods;
  card.querySelector('.skin-badge').textContent = skins;
});
```

### Error Handling Pattern

```ts
async function fetchCounts(url: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  } catch (err) {
    console.error(`Failed to fetch counts from ${url}:`, err);
    return {}; // Graceful fallback — badges show 0
  }
}
```

---

## 6. Performance Impact

| Page | Before | After | Improvement |
|---|---|---|---|
| `/runners/` | 1 full cores fetch (~50+ records) + N paginated skin fetches (100/page) | **2 requests**, each < 1 KB | ~95% reduction in data transferred |
| `/weapons/` | ~25 parallel mod fetches + N paginated skin fetches (100/page) | **2 requests**, each < 1 KB | ~97% reduction in API calls |

### What Changed

| Old Function | Old Behavior | New Endpoint | New Behavior |
|---|---|---|---|
| `fetchCoreCounts()` | `GET /api/cores` → loop & count client-side | `GET /api/cores/counts` | Single aggregated response |
| `fetchSkinCounts()` | Paginate all `/api/skins` → loop & count | `GET /api/skins/counts` (runner skins) | Single aggregated response |
| `loadWeaponModCounts()` | ~25× `GET /api/weapons/:slug/mods` | `GET /api/mods/counts` | Single aggregated response |
| `loadWeaponSkinCounts()` | Paginate all `/api/skins` → loop & count | `GET /api/skins/counts` (weapon skins) | Single aggregated response |

---

## Test URLs

```
https://cores.marathondb.gg/api/cores/counts
https://runnerskins.marathondb.gg/api/skins/counts
https://mods.marathondb.gg/api/mods/counts
https://weaponskins.marathondb.gg/api/skins/counts
```
