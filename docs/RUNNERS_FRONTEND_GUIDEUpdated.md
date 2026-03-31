# Marathon Runner API — Frontend Integration Guide

**API Base URL:** `https://runners.marathondb.gg`
**Fallback (workers.dev):** `https://marathon-runner-api.heymarathondb.workers.dev`
**Last Updated:** March 26, 2026

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
8. [Stat History Charts](#stat-history-charts)
9. [Special Cases](#special-cases)
10. [Error Handling](#error-handling)
11. [Caching](#caching)
12. [Full Fetch Examples](#full-fetch-examples)

---

## Overview

The Runner API is a single Cloudflare Worker backed by a dedicated D1 database (`marathon-runners-final`). Every endpoint returns JSON in a consistent envelope:

```json
{
  "success": true,
  "data": { ... }
}
```

CORS is restricted to an explicit origin allowlist. Permitted origins: `marathondb.gg`, `www.marathondb.gg`, `gdb.gg`, `www.gdb.gg`, and standard localhost dev ports. Requests from any other origin will be blocked by the browser.

---

## Endpoints

### `GET /api/runners`

Returns a **lightweight list** of all runners. Use this for cards, grids, or selection UIs where you don't need ability/stat data.

#### Response

```json
{
  "success": true,
  "count": 7,
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

| Runner | Slug | Notes |
|--------|------|-------|
| Triage | `triage` | |
| Destroyer | `destroyer` | |
| Vandal | `vandal` | Prior name: **Disruptor** |
| Recon | `recon` | |
| Assassin | `assassin` | Prior name: **Stealth** |
| Thief | `thief` | |
| Rook | `rook` | Limited-access — no hero image, only 2/5 abilities seeded (see [Special Cases](#special-cases)) |

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
        "season_id": 2,
        "season_name": "Server Slam",
        "season_version": "server-slam",
        "patch_version": "1.0.0",
        "patch_notes": null,
        "season_type": "beta",
        "release_date": "2025-08-23",
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

The `stats` array contains **one entry per season** the runner has been tracked, ordered oldest → newest (by season id). Each entry bundles the full season metadata so you don't need a separate seasons endpoint.

### Season types

| `season_type` | Meaning |
|---|---|
| `alpha` | Alpha / Pre-Season testing |
| `beta` | Closed or open beta |
| `release` | Full live release season |
| `hotfix` | Mid-season patch with stat adjustments |

Use `is_current: true` to identify the active season. The current active season is **Server Slam** (`season_id: 2`, `season_type: "beta"`).

> **Note:** Pre-Season data (id=1) was removed in a schema cleanup because the alpha stat values were unvalidated. All history currently starts from season 2 (Server Slam).

### Building a patch changelog

```ts
type StatKey = keyof Pick<StatResponse,
  'heat_capacity' | 'agility' | 'loot_speed' | 'melee_damage' | 'prime_recovery' |
  'tactical_recovery' | 'self_repair_speed' | 'finisher_siphon' | 'revive_speed' |
  'hardware' | 'firewall' | 'fall_resistance' | 'ping_duration'
>;

interface StatChange {
  season_id: number;
  season_name: string;
  patch_version: string | null;
  prev: number | null;
  curr: number | null;
  delta: number;
}

function getStatChanges(stats: StatResponse[], stat: StatKey): StatChange[] {
  return stats.slice(1).map((s, i) => {
    const prev = stats[i][stat] as number | null;
    const curr = s[stat] as number | null;
    const delta = (curr ?? 0) - (prev ?? 0);
    return { season_id: s.season_id, season_name: s.season_name, patch_version: s.patch_version, prev, curr, delta };
  }).filter(c => c.delta !== 0);
}
```

---

## Stat History Charts

The `stats` array is the data source for time-series charts showing how any runner stat has changed across seasons/patches. This section covers how to transform the data for common charting libraries.

### Data shape for a chart

Each point on the chart corresponds to one `StatResponse` entry. The x-axis label is the season name and the y-axis value is the stat.

```ts
interface ChartPoint {
  label: string;       // x-axis: season name + optional patch
  value: number | null; // y-axis: stat value
  is_current: boolean;
  season_type: string;
}

function buildStatChartData(stats: StatResponse[], stat: StatKey): ChartPoint[] {
  return stats.map(s => ({
    label: s.patch_version ? `${s.season_name} (${s.patch_version})` : s.season_name,
    value: s[stat] as number | null,
    is_current: s.is_current,
    season_type: s.season_type,
  }));
}
```

### Filtering out null seasons

Stat values may be `null` when official numbers haven't been confirmed yet. For a clean chart, filter to seasons that have actual data:

```ts
function buildStatChartDataFiltered(stats: StatResponse[], stat: StatKey): ChartPoint[] {
  return buildStatChartData(stats, stat).filter(p => p.value !== null);
}
```

### Multi-stat chart (radar / spider)

For a snapshot of the current season, all 13 stats can be plotted on a radar chart. Normalise each stat using the `stat-ranges` data so the scale is consistent:

```ts
const STAT_KEYS: StatKey[] = [
  'heat_capacity', 'agility', 'loot_speed', 'melee_damage',
  'prime_recovery', 'tactical_recovery', 'self_repair_speed',
  'finisher_siphon', 'revive_speed', 'hardware', 'firewall',
  'fall_resistance', 'ping_duration',
];

const STAT_LABELS: Record<StatKey, string> = {
  heat_capacity:      'Heat Capacity',
  agility:            'Agility',
  loot_speed:         'Loot Speed',
  melee_damage:       'Melee Damage',
  prime_recovery:     'Prime Recovery',
  tactical_recovery:  'Tactical Recovery',
  self_repair_speed:  'Self-Repair Speed',
  finisher_siphon:    'Finisher Siphon',
  revive_speed:       'Revive Speed',
  hardware:           'Hardware',
  firewall:           'Firewall',
  fall_resistance:    'Fall Resistance',
  ping_duration:      'Ping Duration',
};

function buildRadarData(stats: StatResponse, ranges: StatRanges) {
  return {
    labels: STAT_KEYS.map(k => STAT_LABELS[k]),
    data: STAT_KEYS.map(k => {
      const { min, max } = ranges[k] ?? {};
      return normaliseStat(stats[k] as number | null, min ?? null, max ?? null);
    }),
  };
}
```

### Single-stat line chart across seasons (Chart.js example)

```ts
import type { ChartData, ChartOptions } from 'chart.js';

function buildLineChartConfig(
  stats: StatResponse[],
  stat: StatKey,
  runnerName: string
): { data: ChartData<'line'>; options: ChartOptions<'line'> } {
  const points = buildStatChartData(stats, stat);

  const data: ChartData<'line'> = {
    labels: points.map(p => p.label),
    datasets: [
      {
        label: `${runnerName} — ${STAT_LABELS[stat]}`,
        data: points.map(p => p.value),
        spanGaps: false,          // break line on null (unconfirmed seasons)
        tension: 0.3,
        pointRadius: points.map(p => (p.is_current ? 6 : 4)),
        pointBackgroundColor: points.map(p => (p.is_current ? '#ff6b00' : '#888')),
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const v = ctx.raw;
            return v === null ? 'No data' : String(v);
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: false },
    },
  };

  return { data, options };
}
```

### Comparing runners on the same stat across seasons

Fetch multiple runner detail responses and merge their `stats` arrays on `season_id`:

```ts
async function getComparisonChartData(
  slugs: string[],
  stat: StatKey
): Promise<ChartData<'line'>> {
  const responses = await Promise.all(
    slugs.map(slug =>
      fetch(`https://runners.marathondb.gg/api/runners/${slug}`)
        .then(r => r.json() as Promise<RunnerDetailResponse>)
    )
  );

  // Collect all unique season labels in order
  const allSeasons = responses[0].data.stats.map(s =>
    s.patch_version ? `${s.season_name} (${s.patch_version})` : s.season_name
  );

  const datasets = responses.map(res => {
    const runner = res.data;
    return {
      label: runner.name,
      data: runner.stats.map(s => s[stat] as number | null),
      spanGaps: false,
      tension: 0.3,
    };
  });

  return { labels: allSeasons, datasets };
}
```

### Delta badges — showing stat changes between seasons

Useful for patch-notes-style UIs:

```ts
function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '±0';
}

function getDeltaClass(delta: number): string {
  if (delta > 0) return 'stat-buff';
  if (delta < 0) return 'stat-nerf';
  return 'stat-unchanged';
}

// Example: show all buffs/nerfs from the most recent patch
const changes = getStatChanges(runner.stats, 'agility');
for (const change of changes) {
  console.log(
    `${change.season_name}: ${change.prev} → ${change.curr} (${formatDelta(change.delta)})`
  );
}
```

---

## Special Cases

### Rook

Rook is a limited-access runner with incomplete data. Handle these differences:

| Field | Behaviour |
|---|---|
| `hero_url` / `hero_url_webp` | `null` — no hero image available yet |
| `lore_excerpt` | `null` — no lore data |
| `abilities` | Only `prime` and `tactical` are seeded (2 of 5). `tech`, `trait_1`, `trait_2` entries will be present in the array but with placeholder/empty data. |

```ts
function hasHeroImage(runner: RunnerDetail): boolean {
  return runner.hero_url !== null || runner.hero_url_webp !== null;
}

function getSeededAbilities(runner: RunnerDetail) {
  // Filter to abilities that have real data
  return runner.abilities.filter(a => a.name && a.description);
}
```

### Runners with prior names

Two runners have been renamed since alpha. Show the former name where relevant (e.g. a tooltip or "formerly known as" label):

| Current Name | Prior Name |
|---|---|
| Assassin | Stealth |
| Vandal | Disruptor |

```ts
function getDisplayName(runner: RunnerListItem | RunnerDetail): string {
  return runner.prior_name
    ? `${runner.name} (formerly ${runner.prior_name})`
    : runner.name;
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
