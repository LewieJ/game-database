# Marathon Cores API — Frontend Integration Guide v2.0

**API Base URL:** `https://cores.marathondb.gg`
**Fallback (workers.dev):** `https://marathon-cores-api.heymarathondb.workers.dev`
**Admin Dashboard:** `http://127.0.0.1:5501/cores-final/admin/index.html`
**Last Updated:** June 2025
**Total Cores Seeded:** 75 (across 7 runner types + "all")

---

## Changelog

### v1.0 → v2.0

| Change | Details |
|---|---|
| **Seasons removed** | `seasons` table and all season references (`season_id`, `patch_number`) are gone. Cores no longer belong to seasons. |
| **Perks removed** | `perks`, `core_perk_rolls` tables dropped. Cores no longer have attached perks. |
| **Tags & Effects removed** | `core_tags`, `core_effects` tables dropped. No tag or effect system. |
| **Capability Flags removed** | All 18 boolean/numeric capability columns removed (`has_cleanse`, `affects_crew`, `is_passive`, `is_pve`, `is_pvp`, `ability_cooldown`, etc.). |
| **`server_slam_verified` → `verified`** | Renamed to a general verification flag. All values reset to `0`. |
| **`is_purchaseable` added** | Boolean flag + `vendor_name`, `vendor_rank`, `purchase_location` fields for store-buyable cores. |
| **Credits set by rarity** | Standard=35, Enhanced=70, Deluxe=200, Superior=600, Prestige=3000. |
| **Ratings system added** | 1–5 emoji community rating system (🔥😍😐👎💩), same as runner-skins. |
| **`/api/cores/hot` added** | Top-rated cores endpoint (min 3 votes). |
| **`/api/cores/counts` added** | Core count per runner type. |
| **Image convention simplified** | Standard cores share `core-72x72.png`, non-standard use `{runner}-96x96.png`. |

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Endpoints](#endpoints)
   - [GET /api/cores](#get-apicores)
   - [GET /api/cores/counts](#get-apicorescounts)
   - [GET /api/cores/hot](#get-apicoreshold)
   - [GET /api/cores/runner/:runner](#get-apicoresrunnerrunner)
   - [GET /api/cores/:slug](#get-apicoresslug)
   - [POST /api/cores/:slug/rate](#post-apicoresslugrate)
   - [GET /api/cores/:slug/ratings](#get-apicoresslugratings)
   - [GET /api/stats/summary](#get-apistatssummary)
3. [Response Types (TypeScript)](#response-types-typescript)
4. [Images](#images)
5. [Verified Flag](#verified-flag)
6. [Purchaseable Cores](#purchaseable-cores)
7. [Ratings System](#ratings-system)
8. [Filtering & Sorting](#filtering--sorting)
9. [Error Handling](#error-handling)
10. [Full Fetch Examples](#full-fetch-examples)

---

## Quick Start

```ts
const API = 'https://cores.marathondb.gg';

// All active cores
const res = await fetch(`${API}/api/cores`);
const { success, count, data } = await res.json();

// Cores for a specific runner (includes universal "all" cores)
const res2 = await fetch(`${API}/api/cores/runner/assassin`);
const { data: assassinCores } = await res2.json();

// A single core with history + rating
const res3 = await fetch(`${API}/api/cores/close-and-personal`);
const { data: coreDetail } = await res3.json();

// Only purchaseable cores
const res4 = await fetch(`${API}/api/cores?purchaseable=true`);
const { data: shopCores } = await res4.json();

// Top rated cores
const res5 = await fetch(`${API}/api/cores/hot`);
const { data: hotCores } = await res5.json();
```

All responses use a consistent envelope:

```json
{ "success": true, "data": { ... } }
```

CORS is open (`*`). Requests can be made directly from any frontend origin.

---

## Endpoints

### `GET /api/cores`

List all cores with optional filtering. Returns all fields including ratings.

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `runner` | string | — | Runner slug: `all`, `assassin`, `destroyer`, `recon`, `rook`, `thief`, `triage`, `vandal` |
| `rarity` | string | — | `standard`, `enhanced`, `deluxe`, `superior`, `prestige` |
| `active` | string | `true` | `true` or `false` |
| `purchaseable` | string | — | `true` or `1` to filter only purchaseable cores |

#### Response

```json
{
  "success": true,
  "count": 75,
  "data": [
    {
      "id": 73,
      "slug": "close-and-personal",
      "name": "Close And Personal",
      "runner_type": "all",
      "rarity": "standard",
      "description": "Your melee and knife attacks generate less heat.",
      "credits": 35,
      "icon_url": "https://cores.marathondb.gg/assets/items/cores/core-72x72.png",
      "is_active": 1,
      "verified": 0,
      "is_purchaseable": 0,
      "vendor_name": null,
      "vendor_rank": null,
      "purchase_location": null,
      "created_at": "2026-02-28 15:43:15",
      "updated_at": "2026-03-08 13:56:32",
      "rating": null
    }
  ]
}
```

> **Note:** `rating` is `null` when a core has zero votes. See [Ratings System](#ratings-system) for the shape when votes exist.

---

### `GET /api/cores/counts`

Core count grouped by `runner_type`. Useful for badges on runner selection UIs.

#### Response

```json
{
  "success": true,
  "data": {
    "all": 22,
    "assassin": 8,
    "destroyer": 7,
    "recon": 8,
    "rook": 6,
    "thief": 8,
    "triage": 8,
    "vandal": 8
  }
}
```

---

### `GET /api/cores/hot`

Top cores by `score_percent`, minimum 3 votes. Returns up to 10 by default.

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `10` | Max results (max `50`) |

#### Response

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "slug": "siphon-strike",
      "name": "Siphon Strike",
      "runner_type": "assassin",
      "rarity": "enhanced",
      "credits": 70,
      "icon_url": "https://cores.marathondb.gg/assets/items/cores/assassin-96x96.png",
      "is_active": 1,
      "verified": 0,
      "is_purchaseable": 0,
      "vendor_name": null,
      "vendor_rank": null,
      "purchase_location": null,
      "rating": {
        "total_votes": 42,
        "score_percent": 87.5,
        "distribution": {
          "fire":  { "count": 30, "percent": 71.4 },
          "love":  { "count": 8,  "percent": 19.0 },
          "meh":   { "count": 3,  "percent": 7.1 },
          "nah":   { "count": 1,  "percent": 2.4 },
          "trash": { "count": 0,  "percent": 0.0 }
        },
        "last_updated": "2026-06-10T14:00:00.000Z"
      }
    }
  ]
}
```

---

### `GET /api/cores/runner/:runner`

All active cores for a specific runner — **includes universal cores** (where `runner_type = 'all'`). Ordered by rarity then name.

**Valid runners:** `all`, `assassin`, `destroyer`, `recon`, `rook`, `thief`, `triage`, `vandal`

```
GET /api/cores/runner/assassin
```

#### Response

```json
{
  "success": true,
  "runner": "assassin",
  "count": 30,
  "data": [
    {
      "slug": "close-and-personal",
      "name": "Close And Personal",
      "runner_type": "all",
      "rarity": "standard",
      "credits": 35,
      "icon_url": "https://cores.marathondb.gg/assets/items/cores/core-72x72.png",
      "rating": null
    },
    {
      "slug": "siphon-strike",
      "name": "Siphon Strike",
      "runner_type": "assassin",
      "rarity": "enhanced",
      "credits": 70,
      "icon_url": "https://cores.marathondb.gg/assets/items/cores/assassin-96x96.png",
      "rating": { "..." }
    }
  ]
}
```

> Universal cores (`runner_type: "all"`) appear in every runner's list alongside runner-specific cores.

---

### `GET /api/cores/:slug`

Full core detail — includes change history and rating.

#### Response

```json
{
  "success": true,
  "data": {
    "id": 73,
    "slug": "close-and-personal",
    "name": "Close And Personal",
    "runner_type": "all",
    "rarity": "standard",
    "description": "Your melee and knife attacks generate less heat.",
    "credits": 35,
    "icon_url": "https://cores.marathondb.gg/assets/items/cores/core-72x72.png",
    "is_active": 1,
    "verified": 0,
    "is_purchaseable": 0,
    "vendor_name": null,
    "vendor_rank": null,
    "purchase_location": null,
    "created_at": "2026-02-28 15:43:15",
    "updated_at": "2026-03-08 13:56:32",
    "rating": null,
    "history": [
      {
        "id": 1,
        "core_id": 73,
        "change_type": "buffed",
        "summary": "Melee heat reduction increased from 15% to 20%",
        "previous_values": "{\"description\":\"...\"}",
        "new_values": "{\"description\":\"...\"}",
        "changed_at": "2026-05-01 12:00:00"
      }
    ]
  }
}
```

#### Key fields

| Field | Type | Notes |
|---|---|---|
| `verified` | `0 \| 1` | Admin has confirmed data accuracy |
| `is_purchaseable` | `0 \| 1` | Can be bought from an in-game vendor |
| `vendor_name` | `string \| null` | Vendor name (only when purchaseable) |
| `vendor_rank` | `string \| null` | Required vendor rank to purchase |
| `purchase_location` | `string \| null` | In-game location of the vendor |
| `rating` | `RatingResponse \| null` | `null` when no votes exist |
| `history` | `CoreHistoryRow[]` | Chronological change log (newest first) |

#### 404 Response

```json
{ "success": false, "error": "Core not found" }
```

---

### `POST /api/cores/:slug/rate`

Submit or update a community rating (1–5 emoji). One vote per `device_token` per core — submitting again updates the previous vote.

#### Request Body

```json
{
  "rating": 5,
  "device_token": "sha256-of-device-fingerprint"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `rating` | integer | **Yes** | 1–5 (1=💩, 2=👎, 3=😐, 4=😍, 5=🔥) |
| `device_token` | string | **Yes** | SHA-256 hash of a stable device identifier |

#### Response

```json
{
  "success": true,
  "message": "Rating submitted",
  "previous_rating": null,
  "rating": 5,
  "aggregate": {
    "total_votes": 1,
    "score_percent": 100.0,
    "distribution": {
      "fire":  { "count": 1, "percent": 100.0 },
      "love":  { "count": 0, "percent": 0.0 },
      "meh":   { "count": 0, "percent": 0.0 },
      "nah":   { "count": 0, "percent": 0.0 },
      "trash": { "count": 0, "percent": 0.0 }
    },
    "last_updated": "2026-06-10T12:00:00.000Z"
  }
}
```

> If the user already voted, `previous_rating` shows their previous value and `message` will be `"Rating updated"`.

---

### `GET /api/cores/:slug/ratings`

Get the rating aggregate for a single core.

#### Response

```json
{
  "success": true,
  "core_slug": "siphon-strike",
  "data": {
    "total_votes": 42,
    "score_percent": 87.5,
    "distribution": {
      "fire":  { "count": 30, "percent": 71.4 },
      "love":  { "count": 8,  "percent": 19.0 },
      "meh":   { "count": 3,  "percent": 7.1 },
      "nah":   { "count": 1,  "percent": 2.4 },
      "trash": { "count": 0,  "percent": 0.0 }
    },
    "last_updated": "2026-06-10T08:00:00.000Z"
  }
}
```

`score_percent` formula: `((sum_of_ratings / total_votes) - 1) / 4 × 100`
This maps a 1.0 average → 0% and a 5.0 average → 100%.

#### 404 Response

```json
{ "success": false, "error": "No ratings found for 'unknown-slug'" }
```

---

### `GET /api/stats/summary`

Overview stats for the entire cores database.

#### Response

```json
{
  "success": true,
  "data": {
    "total": 75,
    "by_runner": [
      { "runner_type": "all", "count": 22 },
      { "runner_type": "assassin", "count": 8 },
      { "runner_type": "destroyer", "count": 7 }
    ],
    "by_rarity": [
      { "rarity": "standard", "count": 30 },
      { "rarity": "enhanced", "count": 20 },
      { "rarity": "deluxe", "count": 15 },
      { "rarity": "superior", "count": 7 },
      { "rarity": "prestige", "count": 3 }
    ]
  }
}
```

---

## Response Types (TypeScript)

Copy these directly into your project.

```ts
// ── Runner types ─────────────────────────────────────────
export type RunnerType = 'all' | 'assassin' | 'destroyer' | 'recon' | 'rook' | 'thief' | 'triage' | 'vandal';

// ── Rarity tiers ─────────────────────────────────────────
export type CoreRarity = 'standard' | 'enhanced' | 'deluxe' | 'superior' | 'prestige';

// ── List / detail item ───────────────────────────────────
export interface CoreListItem {
  id: number;
  slug: string;
  name: string;
  runner_type: RunnerType;
  rarity: CoreRarity;
  description: string | null;
  credits: number | null;
  icon_url: string | null;
  is_active: number;           // 0 or 1
  verified: number;            // 0 or 1
  is_purchaseable: number;     // 0 or 1
  vendor_name: string | null;
  vendor_rank: string | null;
  purchase_location: string | null;
  created_at: string;
  updated_at: string;
  rating: RatingResponse | null;
}

// ── Full detail (returned by /api/cores/:slug) ───────────
export interface CoreDetail extends CoreListItem {
  history: CoreHistoryRow[];
}

// ── Change history ───────────────────────────────────────
export interface CoreHistoryRow {
  id: number;
  core_id: number;
  change_type: 'added' | 'buffed' | 'nerfed' | 'reworked' | 'removed' | 'unchanged';
  summary: string | null;
  previous_values: string | null;
  new_values: string | null;
  changed_at: string;
}

// ── Rating ───────────────────────────────────────────────
export interface RatingResponse {
  total_votes: number;
  score_percent: number;
  distribution: {
    fire:  { count: number; percent: number };  // 5 🔥
    love:  { count: number; percent: number };  // 4 😍
    meh:   { count: number; percent: number };  // 3 😐
    nah:   { count: number; percent: number };  // 2 👎
    trash: { count: number; percent: number };  // 1 💩
  };
  last_updated: string | null;
}

// ── Core counts ──────────────────────────────────────────
export interface CoreCountsResponse {
  success: boolean;
  data: Record<string, number>; // runner_type → count
}

// ── API envelopes ────────────────────────────────────────
export interface CoresListResponse {
  success: boolean;
  count: number;
  data: CoreListItem[];
}

export interface CoreDetailResponse {
  success: boolean;
  data: CoreDetail;
}

export interface RatingsResponse {
  success: boolean;
  core_slug: string;
  data: RatingResponse;
}
```

---

## Images

Core images are static PNG files served from this worker's `public/` directory.

### Image Base URL

```
https://cores.marathondb.gg/assets/items/cores/
```

### Image Convention

| Core type | Image file | Dimensions | Example URL |
|---|---|---|---|
| **Standard** rarity (any runner) | `core-72x72.png` | 72×72 | `https://cores.marathondb.gg/assets/items/cores/core-72x72.png` |
| **Non-standard** (runner-specific) | `{runner}-96x96.png` | 96×96 | `https://cores.marathondb.gg/assets/items/cores/assassin-96x96.png` |

### Available runner images

| File | Runners |
|---|---|
| `core-72x72.png` | All standard-rarity cores |
| `assassin-96x96.png` | Assassin |
| `destroyer-96x96.png` | Destroyer |
| `recon-96x96.png` | Recon |
| `rook-96x96.png` | Rook |
| `thief-96x96.png` | Thief |
| `triage-96x96.png` | Triage |
| `vandal-96x96.png` | Vandal |

### Using the icon_url field

The `icon_url` field in the API response is already a full, ready-to-use URL. Just use it directly:

```ts
function getCoreImage(core: CoreListItem): string {
  return core.icon_url ?? 'https://cores.marathondb.gg/assets/items/cores/core-72x72.png';
}
```

```html
<img src="${core.icon_url}" alt="${core.name}" width="72" height="72" loading="lazy" />
```

### Image Caching

Images are served with cache headers via Cloudflare's asset pipeline. Use the `icon_url` directly — no cache-busting needed for static assets.

---

## Verified Flag

The `verified` integer (`0` or `1`) indicates whether an admin has confirmed that all data for this core is accurate.

### Frontend usage

```ts
function renderVerifiedBadge(core: CoreListItem): string {
  if (!core.verified) return '';
  return '<span class="verified-badge" title="Data verified">✓ Verified</span>';
}
```

### Suggested styling

```css
.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
```

---

## Purchaseable Cores

Cores that can be purchased from an in-game vendor have `is_purchaseable = 1` along with vendor details.

### Fields

| Field | Type | Notes |
|---|---|---|
| `is_purchaseable` | `0 \| 1` | Whether this core can be bought |
| `vendor_name` | `string \| null` | Name of the vendor (e.g. "Zara") |
| `vendor_rank` | `string \| null` | Rank required (e.g. "Rank 3") |
| `purchase_location` | `string \| null` | Where to find them (e.g. "The Bazaar") |

### Frontend usage

```ts
function renderPurchaseInfo(core: CoreListItem): string {
  if (!core.is_purchaseable) return '';
  return `
    <div class="purchase-info">
      <span class="purchase-badge">🏪 Purchaseable</span>
      ${core.vendor_name ? `<p>Vendor: ${core.vendor_name}</p>` : ''}
      ${core.vendor_rank ? `<p>Required rank: ${core.vendor_rank}</p>` : ''}
      ${core.purchase_location ? `<p>Location: ${core.purchase_location}</p>` : ''}
    </div>
  `;
}
```

### Filtering

```ts
// Only purchaseable cores
const res = await fetch(`${API}/api/cores?purchaseable=true`);

// Purchaseable cores for a specific runner
const res2 = await fetch(`${API}/api/cores?runner=assassin&purchaseable=true`);
```

### Suggested styling

```css
.purchase-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
  border: 1px solid rgba(234, 179, 8, 0.3);
}
.purchase-info p {
  font-size: 13px;
  color: #cbd5e1;
  margin: 4px 0;
}
```

---

## Ratings System

### Scale

| Value | Emoji | Label |
|---|---|---|
| 5 | 🔥 | Fire |
| 4 | 😍 | Love |
| 3 | 😐 | Meh |
| 2 | 👎 | Nah |
| 1 | 💩 | Trash |

### Score Percent Formula

$$\text{score\%} = \frac{\left(\frac{\sum \text{ratings}}{\text{total votes}}\right) - 1}{4} \times 100$$

A 100% score means all votes are 🔥 Fire. A 0% score means all votes are 💩 Trash.

### Generating a device token

The `device_token` must be a consistent, stable identifier for the device. Use a SHA-256 hash of a combination of browser properties:

```ts
async function getDeviceToken(): Promise<string> {
  let id = localStorage.getItem('mdb_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mdb_device_id', id);
  }
  const encoder = new TextEncoder();
  const data    = encoder.encode(id + navigator.userAgent);
  const hash    = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Submitting a vote

```ts
const API = 'https://cores.marathondb.gg';

async function rateCore(slug: string, rating: 1|2|3|4|5): Promise<RatingResponse> {
  const token = await getDeviceToken();
  const res = await fetch(`${API}/api/cores/${slug}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, device_token: token }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error);
  return body.aggregate;
}
```

### Checking if user has voted

The API doesn't expose individual votes for privacy. Store the user's vote locally:

```ts
function getUserVote(slug: string): number | null {
  const v = localStorage.getItem(`mdb_core_vote_${slug}`);
  return v ? parseInt(v) : null;
}

function setUserVote(slug: string, rating: number): void {
  localStorage.setItem(`mdb_core_vote_${slug}`, String(rating));
}
```

### Rendering a rating bar

```ts
const EMOJI_MAP: Record<string, string> = {
  fire: '🔥', love: '😍', meh: '😐', nah: '👎', trash: '💩'
};

function renderRatingBar(rating: RatingResponse | null): string {
  if (!rating) return '<span class="no-votes">No votes yet</span>';

  const bars = Object.entries(rating.distribution)
    .map(([key, { count, percent }]) =>
      `<div class="rating-row">
        <span class="emoji">${EMOJI_MAP[key]}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${percent}%"></div>
        </div>
        <span class="count">${count}</span>
      </div>`
    ).join('');

  return `
    <div class="rating-display">
      <div class="score">${rating.score_percent.toFixed(1)}%</div>
      <div class="votes">${rating.total_votes} votes</div>
      ${bars}
    </div>
  `;
}
```

---

## Runner Types

| Runner | Slug | Role |
|---|---|---|
| Universal | `all` | Available to all runners |
| Assassin | `assassin` | Duelist |
| Destroyer | `destroyer` | Bruiser |
| Recon | `recon` | Scout |
| Rook | `rook` | Opportunist |
| Thief | `thief` | Stealth / Mobility |
| Triage | `triage` | Medic |
| Vandal | `vandal` | Assault |

---

## Rarity Hierarchy & Credits

| Rarity | Credits | Color suggestion |
|---|---|---|
| Standard | 35 | `#9ca3af` (gray) |
| Enhanced | 70 | `#22c55e` (green) |
| Deluxe | 200 | `#3b82f6` (blue) |
| Superior | 600 | `#a855f7` (purple) |
| Prestige | 3000 | `#f59e0b` (amber/gold) |

```ts
const RARITY_COLORS: Record<CoreRarity, string> = {
  standard:  '#9ca3af',
  enhanced:  '#22c55e',
  deluxe:    '#3b82f6',
  superior:  '#a855f7',
  prestige:  '#f59e0b',
};

const RARITY_CREDITS: Record<CoreRarity, number> = {
  standard: 35,
  enhanced: 70,
  deluxe:   200,
  superior: 600,
  prestige: 3000,
};
```

---

## Filtering & Sorting

### Common filter combinations

```ts
const API = 'https://cores.marathondb.gg';

// All active cores (default)
/api/cores

// Only enhanced-rarity cores
/api/cores?rarity=enhanced

// Only purchaseable cores
/api/cores?purchaseable=true

// Assassin's cores (includes universal)
/api/cores/runner/assassin

// All cores including inactive
/api/cores?active=all

// Core count per runner (for badges)
/api/cores/counts

// Top rated cores
/api/cores/hot

// Top 5 rated (limit)
/api/cores/hot?limit=5
```

---

## Error Handling

```ts
async function fetchCore(slug: string): Promise<CoreDetail | null> {
  const res = await fetch(`https://cores.marathondb.gg/api/cores/${slug}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Cores API error: ${res.status}`);

  const body: CoreDetailResponse = await res.json();
  return body.data;
}
```

| Status | When |
|---|---|
| `400` | Missing required field or invalid input |
| `404` | Core not found / unknown runner slug |
| `500` | Server/database error |

---

## Full Fetch Examples

### Cores grid

```ts
const API = 'https://cores.marathondb.gg';

async function getAllCores(filters: Record<string, string> = {}): Promise<CoresListResponse> {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${API}/api/cores?${params}`);
  return await res.json();
}

// Usage
const { data: cores } = await getAllCores({ rarity: 'enhanced' });
```

### Core detail page

```ts
async function getCorePage(slug: string): Promise<CoreDetail | null> {
  const res = await fetch(`${API}/api/cores/${slug}`);
  if (res.status === 404) return null;
  const { data }: CoreDetailResponse = await res.json();
  return data;
}
```

### Runner cores page

```ts
async function getRunnerCores(runner: string) {
  const res = await fetch(`${API}/api/cores/runner/${runner}`);
  const body = await res.json();
  if (!body.success) return null;
  return body.data; // includes universal "all" cores
}
```

### Shop page (purchaseable only)

```ts
async function getShopCores() {
  const res = await fetch(`${API}/api/cores?purchaseable=true`);
  const { data } = await res.json();
  return data.map(core => ({
    ...core,
    vendorInfo: core.is_purchaseable
      ? { name: core.vendor_name, rank: core.vendor_rank, location: core.purchase_location }
      : null,
  }));
}
```

### Complete core card component

```ts
function renderCoreCard(core: CoreListItem): string {
  const rarityColor = RARITY_COLORS[core.rarity] ?? '#9ca3af';
  const imageUrl = core.icon_url ?? 'https://cores.marathondb.gg/assets/items/cores/core-72x72.png';

  return `
    <div class="core-card" style="border-color: ${rarityColor}">
      <img src="${imageUrl}" alt="${core.name}" width="72" height="72" loading="lazy" />
      <h3>${core.name}</h3>
      <span class="rarity" style="color: ${rarityColor}">${core.rarity}</span>
      <span class="credits">${core.credits} CR</span>
      ${core.runner_type === 'all'
        ? '<span class="universal">Universal</span>'
        : `<span class="runner">${core.runner_type}</span>`}
      ${core.verified ? '<span class="verified">✓</span>' : ''}
      ${core.is_purchaseable ? '<span class="shop">🏪</span>' : ''}
      ${core.rating
        ? `<span class="score">${core.rating.score_percent.toFixed(0)}%</span>`
        : ''}
    </div>
  `;
}
```

---

## Migration from v1.0

If you're upgrading from the v1.0 API, here's what to remove from your codebase:

### Removed endpoints

| Old Endpoint | Status |
|---|---|
| `GET /api/perks` | **Removed** |
| `GET /api/perks/:slug` | **Removed** |
| `GET /api/seasons` | **Removed** |
| `GET /api/seasons/current` | **Removed** |

### Removed fields from core responses

All of these fields no longer exist in the API response:

- `season_id`, `patch_number`
- `has_cleanse`, `affects_crew`, `reduces_cooldown`, `impacts_movement`, `affects_damage`, `affects_survivability`
- `affects_loot`, `is_passive`, `is_pve`, `is_pvp`, `enhances_ability`, `trigger_condition`
- `cooldown_reduction`, `ability_cooldown`, `ability_duration`, `ability_range`
- `server_slam_verified` (renamed to `verified`)
- `effects`, `tags`, `perk_rolls`

### New fields added

- `is_purchaseable`, `vendor_name`, `vendor_rank`, `purchase_location`
- `rating` (on all core responses)
- `verified` (replaces `server_slam_verified`)

### New endpoints

- `GET /api/cores/counts`
- `GET /api/cores/hot`
- `POST /api/cores/:slug/rate`
- `GET /api/cores/:slug/ratings`
