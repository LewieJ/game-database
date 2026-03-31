# Marathon Runner API — Frontend Integration Guide

**API Base URL:** `https://runners.marathondb.gg`
**Fallback (workers.dev):** `https://marathon-runner-api.heymarathondb.workers.dev`
**Last Updated:** February 26, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Endpoints](#endpoints)
   - [GET /api/runners](#get-apirunners)
   - [GET /api/runners/stat-ranges](#get-apirunnersstat-ranges)
   - [GET /api/runners/:slug](#get-apirunnersslug)
3. [Response Types (TypeScript)](#response-types-typescript)
4. [Images](#images)
5. [Abilities](#abilities)
6. [Stats & Stat Bars](#stats--stat-bars)
7. [Season History](#season-history)
8. [Error Handling](#error-handling)
9. [Caching](#caching)
10. [Full Fetch Examples](#full-fetch-examples)

---

## Overview

The Runner API is a single Cloudflare Worker backed by a dedicated D1 database (`marathon-runners-final`). Every endpoint returns JSON in a consistent envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

CORS is open (`*`), so requests can be made directly from any frontend origin.

---

## Endpoints

### `GET /api/runners`

Returns a **lightweight list** of all runners. Use this for cards, grids, or selection UIs where you don't need ability/stat data.

#### Response

```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "id": 1,
      "slug": "triage",
      "name": "Triage",
      "prior_name": null,
      "role": "Field Medic",
      "tech": "Damage mitigation",
      "portrait_url": "https://helpbot.marathondb.gg/assets/runners/triage/portrait.png",
      "portrait_url_webp": "https://helpbot.marathondb.gg/assets/runners/triage/portrait.webp",
      "hero_url": "https://helpbot.marathondb.gg/assets/runners/triage/hero.png",
      "hero_url_webp": "https://helpbot.marathondb.gg/assets/runners/triage/hero.webp"
    }
  ]
}
```

#### Field Notes

| Field | Type | Notes |
|---|---|---|
| `slug` | `string` | Unique URL-safe identifier. Use this as your route param and primary key for local state. |
| `prior_name` | `string \| null` | Previous name before a rename. Show as "formerly known as" if non-null. |
| `tech` | `string` | Short label for the runner's tech specialty (e.g. "Damage mitigation"). |
| `portrait_url_webp` | `string \| null` | Compressed WebP variant — ~71% smaller than PNG. Prefer this where supported. |
| `hero_url_webp` | `string \| null` | Compressed WebP variant — ~87% smaller than PNG. Prefer this where supported. |

---

### `GET /api/runners/stat-ranges`

Returns the **min and max** of every stat across all runners for the **current season**. Use this to normalise stat values into 0–100 percentage bars.

> **Important:** This route must come before `/:slug` in any routing logic — otherwise `stat-ranges` will be interpreted as a slug.

#### Response

```json
{
  "success": true,
  "data": {
    "heat_capacity":       { "min": 80,  "max": 140 },
    "agility":             { "min": 30,  "max": 60  },
    "loot_speed":          { "min": 1.0, "max": 2.5 },
    "melee_damage":        { "min": 50,  "max": 90  },
    "prime_recovery":      { "min": 10,  "max": 25  },
    "tactical_recovery":   { "min": 10,  "max": 25  },
    "self_repair_speed":   { "min": 5,   "max": 15  },
    "finisher_siphon":     { "min": 10,  "max": 30  },
    "revive_speed":        { "min": 3,   "max": 8   },
    "hardware":            { "min": 100, "max": 200 },
    "firewall":            { "min": 100, "max": 200 },
    "fall_resistance":     { "min": 20,  "max": 50  },
    "ping_duration":       { "min": 5,   "max": 15  }
  }
}
```

If only one runner exists in a season all `min` and `max` values will be equal. If no runners have stats for the current season, values will be `null`.

#### Normalising a stat value to a percentage bar

```ts
function normaliseStat(
  value: number | null,
  min: number | null,
  max: number | null
): number {
  if (value === null || min === null || max === null) return 0;
  if (max === min) return 100; // only one runner — show full bar
  return Math.round(((value - min) / (max - min)) * 100);
}

// Usage
const pct = normaliseStat(runner.stats[0].heat_capacity, ranges.heat_capacity.min, ranges.heat_capacity.max);
// → e.g. 72 (use as width: 72% on a bar element)
```

---

### `GET /api/runners/:slug`

The **catch-all detail endpoint** — returns everything about a runner in a single request: identity, all 5 abilities, and full stat history across every season.

#### Slugs

| Runner | Slug |
|--------|------|
| Triage | `triage` |
| Destroyer | `destroyer` |
| Vandal | `vandal` |
| Recon | `recon` |
| Assassin | `assassin` |
| Thief | `thief` |

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "triage",
    "name": "Triage",
    "prior_name": null,
    "rename_notes": null,
    "role": "Field Medic",
    "tech": "Damage mitigation",
    "description": "...",
    "lore_excerpt": "...",
    "portrait_url": "https://helpbot.marathondb.gg/assets/runners/triage/portrait.png",
    "portrait_url_webp": "https://helpbot.marathondb.gg/assets/runners/triage/portrait.webp",
    "hero_url": "https://helpbot.marathondb.gg/assets/runners/triage/hero.png",
    "hero_url_webp": "https://helpbot.marathondb.gg/assets/runners/triage/hero.webp",
    "abilities": [
      {
        "ability_type": "tech",
        "name": "Damage Mitigation",
        "description": "...",
        "cooldown_seconds": null,
        "icon_url": "https://helpbot.marathondb.gg/assets/runners/triage/abilities/tech.png"
      },
      {
        "ability_type": "prime",
        "name": "Reboot+",
        "description": "...",
        "cooldown_seconds": 30,
        "icon_url": "https://helpbot.marathondb.gg/assets/runners/triage/abilities/prime.png"
      },
      {
        "ability_type": "tactical",
        "name": "Med-Drone",
        "description": "...",
        "cooldown_seconds": 20,
        "icon_url": "https://helpbot.marathondb.gg/assets/runners/triage/abilities/tactical.png"
      },
      {
        "ability_type": "trait_1",
        "name": "Shareware.exe",
        "description": "...",
        "cooldown_seconds": null,
        "icon_url": "https://helpbot.marathondb.gg/assets/runners/triage/abilities/trait-1.png"
      },
      {
        "ability_type": "trait_2",
        "name": "Battery Overcharge",
        "description": "...",
        "cooldown_seconds": null,
        "icon_url": "https://helpbot.marathondb.gg/assets/runners/triage/abilities/trait-2.png"
      }
    ],
    "stats": [
      {
        "season_id": 1,
        "season_name": "Pre-Season",
        "season_version": null,
        "patch_version": null,
        "patch_notes": null,
        "season_type": "alpha",
        "release_date": null,
        "is_current": true,
        "heat_capacity": null,
        "agility": null,
        "loot_speed": null,
        "melee_damage": null,
        "prime_recovery": null,
        "tactical_recovery": null,
        "self_repair_speed": null,
        "finisher_siphon": null,
        "revive_speed": null,
        "hardware": null,
        "firewall": null,
        "fall_resistance": null,
        "ping_duration": null
      }
    ]
  }
}
```

#### 404 Response

```json
{
  "success": false,
  "error": "Runner 'unknown' not found"
}
```

---

## Response Types (TypeScript)

Copy these directly into your frontend project.

```ts
export interface RunnerListItem {
  id: number;
  slug: string;
  name: string;
  prior_name: string | null;
  role: string;
  tech: string;
  portrait_url: string | null;
  portrait_url_webp: string | null;
  hero_url: string | null;
  hero_url_webp: string | null;
}

export interface AbilityResponse {
  ability_type: 'tech' | 'prime' | 'tactical' | 'trait_1' | 'trait_2';
  name: string;
  description: string | null;
  cooldown_seconds: number | null;
  icon_url: string | null;
}

export interface StatResponse {
  season_id: number;
  season_name: string;
  season_version: string | null;
  patch_version: string | null;
  patch_notes: string | null;
  season_type: 'alpha' | 'beta' | 'release' | 'hotfix';
  release_date: string | null;
  is_current: boolean;
  heat_capacity: number | null;
  agility: number | null;
  loot_speed: number | null;
  melee_damage: number | null;
  prime_recovery: number | null;
  tactical_recovery: number | null;
  self_repair_speed: number | null;
  finisher_siphon: number | null;
  revive_speed: number | null;
  hardware: number | null;
  firewall: number | null;
  fall_resistance: number | null;
  ping_duration: number | null;
}

export interface RunnerDetail {
  id: number;
  slug: string;
  name: string;
  prior_name: string | null;
  rename_notes: string | null;
  role: string;
  tech: string;
  description: string | null;
  lore_excerpt: string | null;
  portrait_url: string | null;
  portrait_url_webp: string | null;
  hero_url: string | null;
  hero_url_webp: string | null;
  abilities: AbilityResponse[];
  stats: StatResponse[];
}

export type StatRanges = Record<string, { min: number | null; max: number | null }>;

// API envelopes
export interface RunnersListResponse {
  success: boolean;
  count: number;
  data: RunnerListItem[];
}

export interface RunnerDetailResponse {
  success: boolean;
  data: RunnerDetail;
}

export interface StatRangesResponse {
  success: boolean;
  data: StatRanges;
}
```

---

## Images

All images are served from `https://helpbot.marathondb.gg` via Cloudflare CDN.

### Folder Structure

```
/assets/runners/{slug}/
  portrait.png        ← Full quality portrait
  portrait.webp       ← Compressed (71% smaller) — prefer this
  hero.png            ← Full quality hero/banner image
  hero.webp           ← Compressed (87% smaller) — prefer this
  abilities/
    tech.png
    prime.png
    tactical.png
    trait-1.png
    trait-2.png
```

### Choosing PNG vs WebP

```ts
// Simple browser support check
const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
};

function getPortraitUrl(runner: RunnerListItem): string {
  if (supportsWebP() && runner.portrait_url_webp) {
    return runner.portrait_url_webp;
  }
  return runner.portrait_url ?? '';
}
```

Or use an HTML `<picture>` element to let the browser decide:

```html
<picture>
  <source srcset="{runner.portrait_url_webp}" type="image/webp" />
  <img src="{runner.portrait_url}" alt="{runner.name}" />
</picture>
```

### Ability icon notes

- Ability icons are PNG only (no WebP variants).
- Icons are 64×64px source files.
- `cooldown_seconds` is `null` for passive abilities (tech, trait_1, trait_2 typically).

---

## Abilities

The `abilities` array always contains exactly **5 items**, returned in this fixed order:

| Index | `ability_type` | Slot |
|-------|---------------|------|
| 0 | `tech` | Tech (passive — the runner's unique tech specialty) |
| 1 | `prime` | Prime ability (active, has cooldown) |
| 2 | `tactical` | Tactical ability (active, has cooldown) |
| 3 | `trait_1` | Passive trait |
| 4 | `trait_2` | Passive trait |

### Display labels

```ts
const ABILITY_LABELS: Record<string, string> = {
  tech:     'Tech',
  prime:    'Prime',
  tactical: 'Tactical',
  trait_1:  'Trait I',
  trait_2:  'Trait II',
};
```

### Showing cooldown

```ts
function formatCooldown(seconds: number | null): string {
  if (seconds === null) return 'Passive';
  return `${seconds}s`;
}
```

---

## Stats & Stat Bars

### The 13 stats

| Key | Display Name | Notes |
|-----|-------------|-------|
| `heat_capacity` | Heat Capacity | Max heat before overheat |
| `agility` | Agility | Movement speed modifier |
| `loot_speed` | Loot Speed | Looting interaction speed |
| `melee_damage` | Melee Damage | Base melee hit |
| `prime_recovery` | Prime Recovery | Cooldown reduction |
| `tactical_recovery` | Tactical Recovery | Cooldown reduction |
| `self_repair_speed` | Self-Repair Speed | Self-heal rate |
| `finisher_siphon` | Finisher Siphon | HP gained on finisher |
| `revive_speed` | Revive Speed | Revive interaction time |
| `hardware` | Hardware | Physical damage resistance |
| `firewall` | Firewall | EMP/hack resistance |
| `fall_resistance` | Fall Resistance | Damage reduction on landing |
| `ping_duration` | Ping Duration | Scan/mark duration in seconds |

### Recommended pattern — fetch ranges + detail together

```ts
const BASE = 'https://runners.marathondb.gg';

async function getRunnerPageData(slug: string) {
  const [detailRes, rangesRes] = await Promise.all([
    fetch(`${BASE}/api/runners/${slug}`),
    fetch(`${BASE}/api/runners/stat-ranges`),
  ]);

  const detail: RunnerDetailResponse = await detailRes.json();
  const ranges: StatRangesResponse   = await rangesRes.json();

  return { runner: detail.data, ranges: ranges.data };
}
```

### Current season stats

Only the current season is relevant for live stat display. Filter the stats array:

```ts
const currentStats = runner.stats.find(s => s.is_current);
```

---

## Season History

The `stats` array contains **one entry per season** the runner has been tracked, ordered oldest → newest. Each entry includes the full season metadata so you don't need a separate seasons endpoint.

| `season_type` | Meaning |
|---|---|
| `alpha` | Alpha / Pre-Season |
| `beta` | Beta |
| `release` | Full release season |
| `hotfix` | Mid-season patch with stat adjustments |

Use `is_current: true` to identify the active season. Use the full array to build a patch history changelog or a stat-over-time chart.

```ts
// Build changelog entries for stats that changed between seasons
function getStatChanges(stats: StatResponse[], stat: keyof StatResponse) {
  return stats.slice(1).map((s, i) => {
    const prev = stats[i][stat] as number | null;
    const curr = s[stat] as number | null;
    const delta = (curr ?? 0) - (prev ?? 0);
    return { season: s.season_name, prev, curr, delta };
  }).filter(c => c.delta !== 0);
}
```

---

## Error Handling

All errors return a non-2xx status with `{ "success": false, "error": "..." }`.

```ts
async function fetchRunner(slug: string): Promise<RunnerDetail | null> {
  const res = await fetch(`https://runners.marathondb.gg/api/runners/${slug}`);

  if (res.status === 404) return null; // runner doesn't exist

  if (!res.ok) {
    throw new Error(`Runner API error: ${res.status}`);
  }

  const body: RunnerDetailResponse = await res.json();
  return body.data;
}
```

---

## Caching

The Worker has no custom cache headers set, so responses use Cloudflare's default edge caching. For the frontend:

| Endpoint | Recommended cache strategy |
|---|---|
| `GET /api/runners` | Stale-while-revalidate, 5 min TTL |
| `GET /api/runners/stat-ranges` | Stale-while-revalidate, 5 min TTL |
| `GET /api/runners/:slug` | Cache per slug, 5 min TTL |

```ts
// Example with React Query / TanStack Query
const { data } = useQuery({
  queryKey: ['runner', slug],
  queryFn: () => fetchRunner(slug),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Full Fetch Examples

### Runners grid / selection screen

```ts
const BASE = 'https://runners.marathondb.gg';

async function getRunnersList(): Promise<RunnerListItem[]> {
  const res = await fetch(`${BASE}/api/runners`);
  const body: RunnersListResponse = await res.json();
  return body.data;
}
```

### Full runner detail page

```ts
async function getRunnerDetail(slug: string) {
  const [detailRes, rangesRes] = await Promise.all([
    fetch(`${BASE}/api/runners/${slug}`),
    fetch(`${BASE}/api/runners/stat-ranges`),
  ]);

  if (detailRes.status === 404) return null;

  const { data: runner }: RunnerDetailResponse = await detailRes.json();
  const { data: ranges }: StatRangesResponse   = await rangesRes.json();
  const currentStats = runner.stats.find(s => s.is_current) ?? null;

  return { runner, ranges, currentStats };
}
```

### Rendering stat bars (plain JS)

```ts
const STAT_KEYS = [
  'heat_capacity', 'agility', 'loot_speed', 'melee_damage',
  'prime_recovery', 'tactical_recovery', 'self_repair_speed',
  'finisher_siphon', 'revive_speed', 'hardware', 'firewall',
  'fall_resistance', 'ping_duration',
] as const;

function renderStatBars(
  stats: StatResponse,
  ranges: StatRanges,
  container: HTMLElement
) {
  for (const key of STAT_KEYS) {
    const value = stats[key] as number | null;
    const { min, max } = ranges[key] ?? {};
    const pct = normaliseStat(value, min ?? null, max ?? null);

    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-label">${key.replace(/_/g, ' ')}</span>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width: ${pct}%"></div>
      </div>
      <span class="stat-value">${value ?? '—'}</span>
    `;
    container.appendChild(row);
  }
}
```
