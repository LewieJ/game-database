# Runner Skins API — Frontend Integration Guide

**Base URL:** `https://runnerskins.marathondb.gg`  
**Fallback:** `https://marathon-runner-skins-api.heymarathondb.workers.dev`  
**CORS:** Open (`*`) — call directly from any frontend origin  
**Last Updated:** 2026-02-26

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Endpoints](#endpoints)
3. [TypeScript Types](#typescript-types)
4. [Images](#images)
5. [Ratings System](#ratings-system)
6. [Filtering & Sorting](#filtering--sorting)
7. [Error Handling](#error-handling)
8. [Full Examples](#full-examples)

---

## Quick Start

```ts
const SKINS_API = 'https://runnerskins.marathondb.gg';

// All skins
const res  = await fetch(`${SKINS_API}/api/skins`);
const body = await res.json();
// body.data → SkinListItem[]

// One skin
const detail = await fetch(`${SKINS_API}/api/skins/vandal-shadow-index`);
const skin   = (await detail.json()).data; // SkinDetailResponse
```

---

## Endpoints

### `GET /api/skins`

Paginated list. Returns lightweight items — no full description or image set.

**Query parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int | `1` | |
| `per_page` | int | `24` | Max `100` |
| `sort` | string | `created_at` | `name` \| `rarity` \| `season` \| `release_date` \| `rating` |
| `order` | string | `DESC` | `ASC` \| `DESC` |
| `rarity` | string | — | `common` \| `uncommon` \| `rare` \| `legendary` \| `exotic` \| `deluxe` \| `enhanced` |
| `source` | string | — | `store` \| `battlepass` \| `event` \| `deluxe-edition` \| `default` \| `unknown` |
| `skin_type` | string | — | `skin` \| `shell` |
| `runner` | string | — | Runner slug e.g. `triage` |
| `collection` | string | — | Collection slug e.g. `midnight-decay` |
| `season` | int | — | Season number (0 = Pre-Season) |
| `is_limited` | bool | — | `true` \| `false` |
| `is_available` | bool | — | `true` \| `false` |
| `in_store` | bool | — | `true` \| `false` |
| `in_battlepass` | bool | — | `true` \| `false` |
| `search` | string | — | Partial name match |

**Response:**
```json
{
  "success": true,
  "count": 18,
  "total": 18,
  "page": 1,
  "per_page": 24,
  "total_pages": 1,
  "data": [
    {
      "id": 7,
      "slug": "assassin-shadow-index",
      "name": "Shadow Index Assassin",
      "display_name": "Shadow Index",
      "skin_type": "skin",
      "rarity": "rare",
      "source": "battlepass",
      "is_limited": false,
      "is_available": true,
      "season_added": null,
      "price": null,
      "collection": null,
      "image": {
        "thumbnail": "https://helpbot.marathondb.gg/assets/skins/assassin-shadow-index/thumbnail.webp",
        "card": "https://helpbot.marathondb.gg/assets/skins/assassin-shadow-index/card.webp"
      },
      "runner": { "slug": "assassin", "name": "Assassin", "role": "Stealth / Assault" },
      "rating": null
    }
  ]
}
```

---

### `GET /api/skins/hot`

Top skins sorted by `score_percent`, minimum 3 votes required. Best for a "trending" or "community favourites" widget.

**Query params:** `limit` (int, default `10`, max `50`)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "rank": 1,
      "slug": "jade-rabbit-thief",
      "name": "Jade Rabbit",
      "skin_type": "skin",
      "rarity": "common",
      "runner": { "slug": "thief", "name": "Thief", "role": "Stealth / Mobility" },
      "rating": { "total_votes": 14, "score_percent": 91.1, "distribution": { ... } }
    }
  ]
}
```

---

### `GET /api/skins/runner/:runnerSlug`

All skins for one runner, ordered by `skin_type` → `season_number` → `name`.

```
GET /api/skins/runner/thief
```

**Response:**
```json
{
  "success": true,
  "runner": { "slug": "thief", "name": "Thief", "role": "Stealth / Mobility" },
  "skins": {
    "count": 5,
    "data": [ ... SkinListItem[] ... ]
  }
}
```

---

### `GET /api/skins/:slug`

Full skin detail. Single request returns all data — identity, images, ratings, availability, pricing, release info.

**Response shape:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "slug": "assassin-shadow-index",
    "name": "Shadow Index Assassin",
    "display_name": "Shadow Index",
    "skin_type": "skin",
    "rarity": "rare",
    "description": null,
    "flavor_text": null,
    "source": "battlepass",
    "source_detail": null,
    "acquisition_note": null,
    "price": null,
    "store": {
      "in_store": false,
      "start": null,
      "end": null,
      "price_credits": null
    },
    "battlepass": {
      "in_battlepass": false,
      "start": null,
      "end": null,
      "level": null
    },
    "availability": {
      "is_available": true,
      "is_limited": false,
      "available_from": null,
      "available_until": null
    },
    "release": {
      "date": null,
      "patch": null,
      "season": null,
      "season_added": null
    },
    "runner": { "slug": "assassin", "name": "Assassin", "role": "Stealth / Assault" },
    "collection": null,
    "faction_exclusive_id": null,
    "images": {
      "primary": {
        "id": 7,
        "image_name": "Primary",
        "image_slug": "primary",
        "is_primary": true,
        "display_order": 0,
        "path_thumbnail": "https://helpbot.marathondb.gg/assets/skins/assassin-shadow-index/thumbnail.webp",
        "path_card": "https://helpbot.marathondb.gg/assets/skins/assassin-shadow-index/card.webp",
        "path_full": "https://helpbot.marathondb.gg/assets/skins/assassin-shadow-index/full.webp"
      },
      "gallery": [
        {
          "id": 8,
          "image_name": "Secondary",
          "image_slug": "secondary",
          "is_primary": false,
          "display_order": 1,
          "path_thumbnail": "https://helpbot.marathondb.gg/assets/skins/assassin-shadow-index/gallery/secondary/thumbnail.webp",
          "path_card": "https://helpbot.marathondb.gg/assets/skins/assassin-shadow-index/gallery/secondary/card.webp",
          "path_full": "https://helpbot.marathondb.gg/assets/skins/assassin-shadow-index/gallery/secondary/full.webp"
        }
      ]
    },
    "rating": null,
    "seo": { "title": null, "description": null },
    "metadata": { "created_at": "...", "updated_at": "..." }
  }
}
```

**404:**
```json
{ "success": false, "error": "Skin 'unknown-slug' not found" }
```

---

### `POST /api/skins/:slug/rate`

Submit or update a community vote. Submitting again with a new rating updates the previous vote.

**Body:**
```json
{ "rating": 5, "device_token": "sha256-string" }
```

| Field | Type | Notes |
|---|---|---|
| `rating` | int | 1–5 required |
| `device_token` | string | Stable SHA-256 device identifier |

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted",
  "previous_rating": null,
  "rating": 5,
  "aggregate": { ...RatingResponse }
}
```

---

### `GET /api/skins/:slug/ratings`

Get the current rating aggregate.

**Response:**
```json
{
  "success": true,
  "skin_slug": "assassin-shadow-index",
  "data": {
    "total_votes": 42,
    "score_percent": 78.6,
    "distribution": {
      "fire":  { "count": 20, "percent": 47.6 },
      "love":  { "count": 12, "percent": 28.6 },
      "meh":   { "count": 6,  "percent": 14.3 },
      "nah":   { "count": 3,  "percent": 7.1 },
      "trash": { "count": 1,  "percent": 2.4 }
    },
    "last_updated": "2026-02-26T12:00:00.000Z"
  }
}
```

---

## TypeScript Types

```ts
// ── Enums ─────────────────────────────────────────────────────────────
export type SkinType = 'skin' | 'shell';
export type Rarity   = 'common' | 'uncommon' | 'rare' | 'legendary' | 'exotic' | 'deluxe' | 'enhanced';
export type Source   = 'store' | 'battlepass' | 'event' | 'deluxe-edition' | 'default' | 'unknown';

// ── Images ───────────────────────────────────────────────────────────
export interface SkinImage {
  id:            number;
  image_name:    string;
  image_slug:    string;
  is_primary:    boolean;
  display_order: number;
  path_thumbnail: string | null;  // 200×400 WebP
  path_card:      string | null;  // 400×800 WebP
  path_full:      string | null;  // 800×1600 WebP
  // path_original is intentionally omitted from the public API
}

// ── Ratings ──────────────────────────────────────────────────────────
export interface RatingTier {
  count:   number;
  percent: number;
}

export interface RatingResponse {
  total_votes:   number;
  score_percent: number;          // 0–100
  distribution: {
    fire:  RatingTier;  // 5 🔥
    love:  RatingTier;  // 4 😍
    meh:   RatingTier;  // 3 😐
    nah:   RatingTier;  // 2 👎
    trash: RatingTier;  // 1 💩
  };
  last_updated: string;
}

// ── Runner ───────────────────────────────────────────────────────────
export interface RunnerRef {
  slug: string;
  name: string;
  role: string;
}

// ── Collection ───────────────────────────────────────────────────────
export interface CollectionRef {
  slug: string;
  name: string;
}

// ── List item (returned by GET /api/skins) ───────────────────────────
export interface SkinListItem {
  id:           number;
  slug:         string;
  name:         string;
  display_name: string | null;
  skin_type:    SkinType;
  rarity:       Rarity;
  source:       Source;
  is_limited:   boolean;
  is_available: boolean;
  season_added: string | null;
  price: {
    credits:  number | null;
    real:     number | null;
    currency: string | null;
  } | null;
  collection: CollectionRef | null;
  image: {
    thumbnail: string | null;
    card:      string | null;
  } | null;
  runner: RunnerRef;
  rating: RatingResponse | null;
}

// ── Full detail (returned by GET /api/skins/:slug) ───────────────────
export interface SkinDetail {
  id:              number;
  slug:            string;
  name:            string;
  display_name:    string | null;
  skin_type:       SkinType;
  rarity:          Rarity;
  description:     string | null;
  flavor_text:     string | null;
  source:          Source;
  source_detail:   string | null;
  acquisition_note: string | null;
  price: { credits: number | null; real: number | null; currency: string | null } | null;
  store: {
    in_store:      boolean;
    start:         string | null;
    end:           string | null;
    price_credits: number | null;
  };
  battlepass: {
    in_battlepass: boolean;
    start:         string | null;
    end:           string | null;
    level:         number | null;
  };
  availability: {
    is_available:   boolean;
    is_limited:     boolean;
    available_from: string | null;
    available_until: string | null;
  };
  release: {
    date:        string | null;
    patch:       string | null;
    season:      number | null;
    season_added: string | null;
  };
  runner:               RunnerRef;
  collection:           CollectionRef | null;
  faction_exclusive_id: number | null;
  images: {
    primary: SkinImage | null;
    gallery: SkinImage[];
  };
  rating: RatingResponse | null;
  seo: { title: string | null; description: string | null };
  metadata: { created_at: string; updated_at: string };
}

// ── API response envelopes ────────────────────────────────────────────
export interface SkinsListResponse {
  success:     boolean;
  count:       number;
  total:       number;
  page:        number;
  per_page:    number;
  total_pages: number;
  data:        SkinListItem[];
}

export interface SkinDetailResponse {
  success: boolean;
  data:    SkinDetail;
}

export interface RatingsResponse {
  success:   boolean;
  skin_slug: string;
  data:      RatingResponse;
}
```

---

## Images

### Tiers

| Variant | Dimensions | File | Use case |
|---|---|---|---|
| thumbnail | 200 × 400 | `thumbnail.webp` | Grid cells, small cards |
| card | 400 × 800 | `card.webp` | Hover previews, detail cards |
| full | 800 × 1600 | `full.webp` | Full-size detail / lightbox |
| original | source res | `original.png` | Not in public API |

All skin images use **1:2 aspect ratio** (portrait).

### CDN base path

```
https://helpbot.marathondb.gg/assets/skins/{slug}/
```

### Gallery images path

```
https://helpbot.marathondb.gg/assets/skins/{slug}/gallery/{image-slug}/
```

### Choosing the right tier

```ts
// Grid list → thumbnail
function getGridImage(skin: SkinListItem): string {
  return skin.image?.thumbnail ?? '';
}

// Detail card → card
function getCardImage(skin: SkinListItem): string {
  return skin.image?.card ?? skin.image?.thumbnail ?? '';
}

// Detail page hero → full
function getHeroImage(skin: SkinDetail): string {
  return skin.images.primary?.path_full
      ?? skin.images.primary?.path_card
      ?? '';
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

### Score formula

```
score_percent = ((sum_of_ratings / total_votes) - 1) / 4 × 100
```

100% = all votes are 🔥, 0% = all votes are 💩.

### Device token

Use a stable per-device SHA-256 so votes persist between sessions without accounts:

```ts
async function getDeviceToken(): Promise<string> {
  let id = localStorage.getItem('mdb_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mdb_device_id', id);
  }
  const data = new TextEncoder().encode(id + navigator.userAgent);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Submitting a vote

```ts
async function rateSkin(slug: string, rating: 1|2|3|4|5): Promise<RatingResponse> {
  const token = await getDeviceToken();
  const res = await fetch(`${SKINS_API}/api/skins/${slug}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, device_token: token }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error);
  return body.aggregate;
}
```

### Persisting the user's own vote locally

The API doesn't expose individual votes by device for privacy. Store locally:

```ts
const getUserVote = (slug: string): number | null => {
  const v = localStorage.getItem(`mdb_vote_${slug}`);
  return v ? parseInt(v) : null;
};
const setUserVote = (slug: string, rating: number) =>
  localStorage.setItem(`mdb_vote_${slug}`, String(rating));
```

---

## Filtering & Sorting

```ts
// Skins grid (default sort, paginated)
/api/skins?page=1&per_page=24

// All shells
/api/skins?skin_type=shell

// All store skins, newest first
/api/skins?source=store&sort=release_date&order=DESC

// All skins for one runner
/api/skins/runner/triage

// Current battlepass skins
/api/skins?in_battlepass=true&is_available=true

// Top rated (community favorites widget)
/api/skins/hot?limit=5

// Search
/api/skins?search=shadow
```

---

## Error Handling

```ts
async function fetchSkin(slug: string): Promise<SkinDetail | null> {
  const res = await fetch(`${SKINS_API}/api/skins/${slug}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Skins API ${res.status}`);
  const body: SkinDetailResponse = await res.json();
  return body.data;
}
```

| Status | Meaning |
|---|---|
| `400` | Missing required field or invalid value |
| `404` | Skin not found |
| `409` | Duplicate slug on create |
| `500` | Server / database error |

---

## Full Examples

### Skins grid page

```ts
async function getSkinsList(
  page = 1,
  filters: Partial<Record<string, string>> = {}
): Promise<SkinsListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: '24',
    ...filters,
  });
  const res = await fetch(`${SKINS_API}/api/skins?${params}`);
  if (!res.ok) throw new Error(`Skins API ${res.status}`);
  return res.json();
}

// Usage
const { data, total_pages } = await getSkinsList(1, { skin_type: 'skin', sort: 'rating' });
```

### Skin detail page

```ts
async function getSkinPage(slug: string): Promise<SkinDetail | null> {
  const res = await fetch(`${SKINS_API}/api/skins/${slug}`);
  if (res.status === 404) return null;
  const body: SkinDetailResponse = await res.json();
  return body.data;
}
```

### Runner cosmetics section

```ts
async function getRunnerSkins(runnerSlug: string) {
  const res  = await fetch(`${SKINS_API}/api/skins/runner/${runnerSlug}`);
  const body = await res.json();
  if (!body.success) return null;
  return { runner: body.runner, skins: body.skins.data as SkinListItem[] };
}
```

### Rating bar component

```ts
function renderRatingBar(rating: RatingResponse, container: HTMLElement) {
  const tiers: Array<[keyof RatingResponse['distribution'], string]> = [
    ['fire', '🔥'], ['love', '😍'], ['meh', '😐'], ['nah', '👎'], ['trash', '💩'],
  ];
  container.innerHTML = `
    <div class="score">${rating.score_percent.toFixed(1)}%</div>
    <div class="votes">${rating.total_votes} votes</div>
    ${tiers.map(([key, emoji]) => {
      const d = rating.distribution[key];
      return `
        <div class="bar-row">
          <span>${emoji}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${d.percent}%"></div>
          </div>
          <span>${d.count}</span>
        </div>
      `;
    }).join('')}
  `;
}
```
