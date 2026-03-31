# Weapon Skins — Frontend Integration Guide

**API Base URL:** `https://weaponskins.marathondb.gg`
**Fallback (workers.dev):** `https://marathon-weapon-skins-api.heymarathondb.workers.dev`
**Admin Dashboard:** `http://127.0.0.1:5501/weapon-skins-final/admin/index.html`
**Last Updated:** March 26, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Reference](#quick-reference)
3. [Endpoints](#endpoints)
   - [GET /api/skins](#get-apiskins)
   - [GET /api/skins/counts](#get-apisinscounts)
   - [GET /api/skins/hot](#get-apisinshot)
   - [GET /api/skins/weapon/:weaponSlug](#get-apiskinsweaponweaponslug)
   - [GET /api/skins/:slug](#get-apiskinsslug)
   - [POST /api/skins/:slug/rate](#post-apiskinsslugrate)
   - [GET /api/skins/:slug/ratings](#get-apiskinsslugratings)
4. [Response Types (TypeScript)](#response-types-typescript)
5. [Rarity System](#rarity-system)
6. [Images](#images)
7. [Ratings System](#ratings-system)
8. [Filtering & Sorting](#filtering--sorting)
9. [Weapons List](#weapons-list)
10. [Collections & Factions](#collections--factions)
11. [Error Handling](#error-handling)
12. [Full Fetch Examples](#full-fetch-examples)

---

## Overview

The Weapon Skins API is a standalone Cloudflare Worker backed by an isolated D1 database (`marathon-weapon-skins`) and a KV namespace for image storage. It covers all weapon cosmetics with full image management, pricing/availability tracking, release metadata, collections, faction associations, and a 1–5 emoji community rating system.

Key facts:
- **30 weapons** in database (all Marathon weapons pre-seeded)
- **8 rarity tiers** — Common, Uncommon, Rare, Legendary, Exotic, Deluxe, Enhanced, Superior
- **6 real factions** — Cyberacme, Nucaloric, Traxus, Mida, Arachne, Sekiguchi
- **1:2 portrait images** — width:height (e.g. 400×800)
- **Images served from** `https://weaponskins.marathondb.gg/assets/weapon-skins/{slug}/...`
- CORS is **allowlist-based** — allowed origins are `marathondb.gg`, `gdb.gg`, and common localhost dev ports (`3000`, `5173`, `5500`, `8787`). Images at `/assets/weapon-skins/...` use open CORS (`*`)

All responses use a consistent envelope:

```json
{ "success": true, "data": { ... } }
```

---

## Quick Reference

```
GET  /api/skins                          — paginated list of all weapon skins
GET  /api/skins?rarity=superior          — filter by rarity
GET  /api/skins?weapon=misriah-2442      — filter by weapon slug
GET  /api/skins?weapon_type=Rifle        — filter by weapon type
GET  /api/skins?collection=midnight-decay — filter by collection
GET  /api/skins?faction=cyberacme        — filter by faction
GET  /api/skins?search=midnight          — search by name
GET  /api/skins/counts                   — skin count per weapon slug (all 30 weapons)
GET  /api/skins/hot                      — top rated skins (min 3 votes)
GET  /api/skins/weapon/:weaponSlug       — all skins for a specific weapon
GET  /api/skins/:slug                    — full detail (single skin)
POST /api/skins/:slug/rate               — submit/update a vote { "rating": 5, "device_token": "..." }
GET  /api/skins/:slug/ratings            — ratings aggregate only
```

---

## Endpoints

### `GET /api/skins`

Paginated list of all weapon skins with optional filtering and sorting. Returns lightweight list items — no full description or gallery images.

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `per_page` | integer | `24` | Items per page (max `100`) |
| `sort` | string | `created_at` | `name`, `rarity`, `season`, `release_date`, `rating` |
| `order` | string | `DESC` | `ASC` or `DESC` |
| `rarity` | string | — | `common`, `uncommon`, `rare`, `legendary`, `exotic`, `deluxe`, `enhanced`, `superior` |
| `source` | string | — | `store`, `battlepass`, `event`, `deluxe-edition`, `pre-order`, `default`, `unknown` |
| `weapon` | string | — | Weapon slug, e.g. `misriah-2442` |
| `weapon_type` | string | — | Weapon type, e.g. `Rifle`, `Shotgun`, `Melee` |
| `collection` | string | — | Collection slug, e.g. `midnight-decay` |
| `faction` | string | — | Faction slug, e.g. `cyberacme` |
| `season` | integer | — | Season number |
| `is_limited` | boolean | — | `true` or `false` |
| `is_available` | boolean | — | `true` or `false` |
| `in_store` | boolean | — | `true` or `false` |
| `in_battlepass` | boolean | — | `true` or `false` |
| `search` | string | — | Partial name match |

#### Response

```json
{
  "success": true,
  "count": 3,
  "total": 12,
  "page": 1,
  "per_page": 24,
  "total_pages": 1,
  "data": [
    {
      "id": 1,
      "slug": "midnight-decay-misriah-2442",
      "name": "MIDNIGHT DECAY Misriah 2442",
      "display_name": "MIDNIGHT DECAY",
      "rarity": "deluxe",
      "source": "deluxe-edition",
      "is_limited": true,
      "is_available": true,
      "season_added": "Pre-Season",
      "price": null,
      "collection": {
        "slug": "midnight-decay",
        "name": "MIDNIGHT DECAY"
      },
      "faction": null,
      "image": {
        "thumbnail": "https://weaponskins.marathondb.gg/assets/weapon-skins/midnight-decay-misriah-2442/thumbnail.webp",
        "card": "https://weaponskins.marathondb.gg/assets/weapon-skins/midnight-decay-misriah-2442/card.webp"
      },
      "weapon": {
        "slug": "misriah-2442",
        "name": "Misriah 2442",
        "type": "Rifle"
      },
      "rating": null
    }
  ]
}
```

---

### `GET /api/skins/counts`

Returns the skin count for every weapon in the database. All 30 weapons are always present in the response — weapons with no skins return `0`.

```
GET /api/skins/counts
```

No query parameters.

#### Response

```json
{
  "success": true,
  "data": {
    "misriah-2442": 4,
    "overrun-ar": 2,
    "volt-9": 1,
    "solenoid-12": 0
  }
}
```

Keys are lowercase weapon slugs. Values are integers (0 or more).

---

### `GET /api/skins/hot`

Top weapon skins by `score_percent`, minimum 3 votes. Returns up to 10 results by default.

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
      "rank": 1,
      "slug": "neon-fang-overrun-ar",
      "name": "Neon Fang Overrun AR",
      "rarity": "legendary",
      "weapon": { "slug": "overrun-ar", "name": "Overrun AR", "type": "Rifle" },
      "rating": {
        "total_votes": 87,
        "score_percent": 91.2,
        "distribution": {
          "fire":  { "count": 65, "percent": 74.7 },
          "love":  { "count": 15, "percent": 17.2 },
          "meh":   { "count": 5,  "percent": 5.7 },
          "nah":   { "count": 1,  "percent": 1.1 },
          "trash": { "count": 1,  "percent": 1.1 }
        },
        "last_updated": "2026-02-27T12:00:00.000Z"
      }
    }
  ]
}
```

---

### `GET /api/skins/weapon/:weaponSlug`

All skins for a specific weapon, ordered by season then name.

```
GET /api/skins/weapon/misriah-2442
```

#### Response

```json
{
  "success": true,
  "weapon": { "slug": "misriah-2442", "name": "Misriah 2442", "type": "Rifle" },
  "count": 2,
  "data": [
    {
      "id": 1,
      "slug": "midnight-decay-misriah-2442",
      "name": "MIDNIGHT DECAY Misriah 2442",
      "display_name": "MIDNIGHT DECAY",
      "rarity": "deluxe",
      "source": "deluxe-edition",
      "is_limited": true,
      "is_available": true,
      "season_added": "Pre-Season",
      "price": null,
      "collection": { "slug": "midnight-decay", "name": "MIDNIGHT DECAY" },
      "faction": null,
      "image": {
        "thumbnail": "https://weaponskins.marathondb.gg/assets/weapon-skins/midnight-decay-misriah-2442/thumbnail.webp",
        "card": "https://weaponskins.marathondb.gg/assets/weapon-skins/midnight-decay-misriah-2442/card.webp"
      },
      "rating": null
    }
  ]
}
```

---

### `GET /api/skins/:slug`

Full skin detail — single request, everything included.

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "midnight-decay-misriah-2442",
    "name": "MIDNIGHT DECAY Misriah 2442",
    "display_name": "MIDNIGHT DECAY",
    "rarity": "deluxe",
    "description": "A weapon skin featuring the MIDNIGHT DECAY aesthetic, included in the Deluxe Edition.",
    "flavor_text": null,
    "source": "deluxe-edition",
    "source_detail": "Deluxe Edition (launch)",
    "acquisition_note": "Included with Deluxe Edition purchase",
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
      "is_limited": true,
      "available_from": null,
      "available_until": null
    },
    "release": {
      "date": null,
      "patch": null,
      "season": null,
      "season_added": "Pre-Season"
    },
    "weapon": {
      "slug": "misriah-2442",
      "name": "Misriah 2442",
      "type": "Rifle"
    },
    "collection": {
      "slug": "midnight-decay",
      "name": "MIDNIGHT DECAY"
    },
    "faction": null,
    "images": {
      "primary": {
        "id": 1,
        "image_name": "Primary",
        "image_slug": "primary",
        "is_primary": true,
        "display_order": 0,
        "path_thumbnail": "https://weaponskins.marathondb.gg/assets/weapon-skins/midnight-decay-misriah-2442/thumbnail.webp",
        "path_card": "https://weaponskins.marathondb.gg/assets/weapon-skins/midnight-decay-misriah-2442/card.webp",
        "path_full": "https://weaponskins.marathondb.gg/assets/weapon-skins/midnight-decay-misriah-2442/full.webp"
      },
      "gallery": []
    },
    "rating": null,
    "seo": {
      "title": null,
      "description": null
    },
    "metadata": {
      "created_at": "2026-02-27T00:00:00.000Z",
      "updated_at": "2026-02-27T00:00:00.000Z"
    }
  }
}
```

#### 404 Response

```json
{ "success": false, "error": "Skin not found" }
```

---

### `POST /api/skins/:slug/rate`

Submit or update a community rating (1–5 emoji). One vote per device per skin — submitting again updates the previous vote.

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
    "last_updated": "2026-02-28T12:00:00.000Z"
  }
}
```

> If the user already voted, `previous_rating` shows their previous value and `message` will be `"Rating updated"`.

#### 404 Response

```json
{ "success": false, "error": "Skin '<slug>' not found" }
```

---

### `GET /api/skins/:slug/ratings`

Get the rating aggregate for a single skin.

#### Response

```json
{
  "success": true,
  "skin_slug": "midnight-decay-misriah-2442",
  "data": {
    "total_votes": 142,
    "score_percent": 87.4,
    "distribution": {
      "fire":  { "count": 95, "percent": 66.9 },
      "love":  { "count": 30, "percent": 21.1 },
      "meh":   { "count": 10, "percent": 7.0 },
      "nah":   { "count": 5,  "percent": 3.5 },
      "trash": { "count": 2,  "percent": 1.4 }
    },
    "last_updated": "2026-02-28T08:00:00.000Z"
  }
}
```

`score_percent` formula: `((sum_of_ratings / total_votes) - 1) / 4 × 100`
Maps 1.0 average → 0% and 5.0 average → 100%.

#### 404 Response

Returned when the skin has never received any votes (no aggregate row exists):

```json
{ "success": false, "error": "No ratings found for '<slug>'" }
```

---

## Response Types (TypeScript)

Copy these directly into your project.

```ts
// ── Rarity ──────────────────────────────────────────────────
export type WeaponSkinRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'legendary'
  | 'exotic'
  | 'deluxe'
  | 'enhanced'
  | 'superior';

// ── List Item (from GET /api/skins) ─────────────────────────
export interface WeaponSkinListItem {
  id: number;
  slug: string;
  name: string;
  display_name: string | null;
  rarity: WeaponSkinRarity;
  source: string;
  is_limited: boolean;
  is_available: boolean;
  season_added: string | null;
  price: {
    credits: number | null;
    real: number | null;
    currency: string | null;
  } | null;
  collection: { slug: string; name: string } | null;
  faction: { slug: string; name: string } | null;
  image: {
    thumbnail: string | null;
    card: string | null;
  } | null;
  weapon: {
    slug: string;
    name: string;
    type: string;
  };
  rating: RatingResponse | null;
}

// ── Full Detail (from GET /api/skins/:slug) ─────────────────
export interface WeaponSkinDetail {
  id: number;
  slug: string;
  name: string;
  display_name: string | null;
  rarity: WeaponSkinRarity;
  description: string | null;
  flavor_text: string | null;
  source: string;
  source_detail: string | null;
  acquisition_note: string | null;
  price: {
    credits: number | null;
    real: number | null;
    currency: string | null;
  } | null;
  store: {
    in_store: boolean;
    start: string | null;
    end: string | null;
    price_credits: number | null;
  };
  battlepass: {
    in_battlepass: boolean;
    start: string | null;
    end: string | null;
    level: number | null;
  };
  availability: {
    is_available: boolean;
    is_limited: boolean;
    available_from: string | null;
    available_until: string | null;
  };
  release: {
    date: string | null;
    patch: string | null;
    season: number | null;
    season_added: string | null;
  };
  weapon: { slug: string; name: string; type: string };
  collection: { slug: string; name: string } | null;
  faction: { slug: string; name: string } | null;
  images: {
    primary: SkinImage | null;
    gallery: SkinImage[];
  };
  rating: RatingResponse | null;
  seo: { title: string | null; description: string | null };
  metadata: { created_at: string; updated_at: string };
}

// ── Image ───────────────────────────────────────────────────
export interface SkinImage {
  id: number;
  image_name: string;
  image_slug: string;
  is_primary: boolean;
  display_order: number;
  path_thumbnail: string | null;  // 200×400 WebP
  path_card: string | null;       // 400×800 WebP
  path_full: string | null;       // 800×1600 WebP
}

// ── Rating ──────────────────────────────────────────────────
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
  last_updated: string;
}

// ── API Envelopes ───────────────────────────────────────────
export interface SkinsListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  data: WeaponSkinListItem[];
}

export interface SkinDetailResponse {
  success: boolean;
  data: WeaponSkinDetail;
}

export interface RatingsResponse {
  success: boolean;
  skin_slug: string;
  data: RatingResponse;
}

export interface WeaponSkinsResponse {
  success: boolean;
  weapon: { slug: string; name: string; type: string };
  count: number;
  data: WeaponSkinListItem[];
}
```

---

## Rarity System

The API supports **8 rarity tiers**. Every weapon skin has exactly one rarity value stored in the database with a CHECK constraint.

### Rarity Tiers

| Value | Label | Color | Hex |
|---|---|---|---|
| `common` | Common | Grey | `#aaa` |
| `uncommon` | Uncommon | Green | `#22c55e` |
| `rare` | Rare | Blue | `#3b82f6` |
| `legendary` | Legendary | Purple | `#a855f7` |
| `exotic` | Exotic | Amber | `#f59e0b` |
| `deluxe` | Deluxe | Pink | `#ec4899` |
| `enhanced` | Enhanced | Cyan | `#06b6d4` |
| `superior` | Superior | Bright Purple | `#c084fc` |

### Rarity Color Map (JS/TS)

```ts
const RARITY_COLORS: Record<WeaponSkinRarity, string> = {
  common:    '#aaa',
  uncommon:  '#22c55e',
  rare:      '#3b82f6',
  legendary: '#a855f7',
  exotic:    '#f59e0b',
  deluxe:    '#ec4899',
  enhanced:  '#06b6d4',
  superior:  '#c084fc',
};
```

### Rarity Badge CSS

```css
.rarity-common    { background: #aaa; }
.rarity-uncommon  { background: #22c55e; }
.rarity-rare      { background: #3b82f6; }
.rarity-legendary { background: #a855f7; }
.rarity-exotic    { background: #f59e0b; }
.rarity-deluxe    { background: #ec4899; }
.rarity-enhanced  { background: #06b6d4; }
.rarity-superior  { background: #c084fc; }
```

### Rendering a Rarity Badge

```tsx
function RarityBadge({ rarity }: { rarity: WeaponSkinRarity }) {
  return (
    <span
      className={`rarity-badge rarity-${rarity}`}
      style={{ color: RARITY_COLORS[rarity] }}
    >
      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
    </span>
  );
}
```

### Filtering by Rarity

```
GET /api/skins?rarity=superior
GET /api/skins?rarity=legendary
```

---

## Images

All images served from `https://weaponskins.marathondb.gg` via Cloudflare KV + Worker.

### Image Standard

All weapon skin images are uploaded at **1:2 aspect ratio** (width:height — portrait orientation). Three WebP variants are served:

| Variant | Dimensions | Use case |
|---|---|---|
| `thumbnail.webp` | 200 × 400 | List grids, small cards |
| `card.webp` | 400 × 800 | Hover previews, detail cards |
| `full.webp` | 800 × 1600 | Full-size detail / lightbox |

### URL Convention

```
https://weaponskins.marathondb.gg/assets/weapon-skins/{skin-slug}/thumbnail.webp
https://weaponskins.marathondb.gg/assets/weapon-skins/{skin-slug}/card.webp
https://weaponskins.marathondb.gg/assets/weapon-skins/{skin-slug}/full.webp
```

### Use `path_card` for most cases

The card variant (400×800) is the best balance of quality and size for most UI contexts.

```ts
function getSkinImageUrl(skin: WeaponSkinListItem): string {
  return skin.image?.card ?? skin.image?.thumbnail ?? '';
}
```

### Skin card image component

```tsx
function WeaponSkinImage({ skin }: { skin: WeaponSkinListItem }) {
  const src = skin.image?.card ?? skin.image?.thumbnail;

  return (
    <div className="skin-image" style={{ aspectRatio: '1 / 2' }}>
      {src
        ? <img src={src} alt={skin.name} loading="lazy" />
        : <div className="skin-placeholder">No Image</div>
      }
    </div>
  );
}
```

### Detail view with `<picture>` fallback

```html
<picture>
  <source srcset="{skin.images.primary?.path_full}" type="image/webp" />
  <img src="{skin.images.primary?.path_card}" alt="{skin.name}" />
</picture>
```

### CSS for 1:2 containers

```css
.skin-image {
  aspect-ratio: 1 / 2;
  overflow: hidden;
  border-radius: 8px;
}
.skin-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

The `device_token` must be a consistent, stable identifier for the device. Use a SHA-256 hash:

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
const BASE = 'https://weaponskins.marathondb.gg';

async function rateWeaponSkin(slug: string, rating: 1|2|3|4|5): Promise<RatingResponse> {
  const token = await getDeviceToken();
  const res = await fetch(`${BASE}/api/skins/${slug}/rate`, {
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
  const v = localStorage.getItem(`mdb_ws_vote_${slug}`);
  return v ? parseInt(v) : null;
}

function setUserVote(slug: string, rating: number): void {
  localStorage.setItem(`mdb_ws_vote_${slug}`, String(rating));
}
```

### Displaying the score bar

```ts
function renderScoreBar(rating: RatingResponse, container: HTMLElement) {
  const emojis: Array<[keyof RatingResponse['distribution'], string]> = [
    ['fire', '🔥'], ['love', '😍'], ['meh', '😐'], ['nah', '👎'], ['trash', '💩'],
  ];

  container.innerHTML = `
    <div class="score">${rating.score_percent.toFixed(1)}%</div>
    <div class="votes">${rating.total_votes} votes</div>
    ${emojis.map(([key, emoji]) => {
      const d = rating.distribution[key];
      return `
        <div class="rating-row">
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

---

## Filtering & Sorting

### Common filter combinations

```
# All store skins, newest first
/api/skins?source=store&sort=release_date&order=DESC

# All available superior skins
/api/skins?rarity=superior&is_available=true

# All available rare skins for the Misriah 2442
/api/skins?weapon=misriah-2442&rarity=rare&is_available=true

# All skins for a specific weapon (dedicated endpoint)
/api/skins/weapon/misriah-2442

# All Cyberacme faction skins
/api/skins?faction=cyberacme

# All MIDNIGHT DECAY collection skins
/api/skins?collection=midnight-decay

# Current battlepass weapon skins
/api/skins?in_battlepass=true&is_available=true

# All Rifle skins
/api/skins?weapon_type=Rifle

# Top rated weapon skins
/api/skins/hot

# Search by name
/api/skins?search=midnight
```

### Sort Options

| Value | Sorts by |
|---|---|
| `name` | Skin name alphabetically |
| `rarity` | Rarity value (alphabetical) |
| `season` | Season number |
| `release_date` | Release date |
| `rating` | Community score percent |
| *(default)* | Creation date |

### Pagination

```ts
async function getWeaponSkinsList(page = 1, filters: Record<string, string> = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: '24', ...filters });
  const res  = await fetch(`https://weaponskins.marathondb.gg/api/skins?${params}`);
  const body: SkinsListResponse = await res.json();
  return body;
}

// Usage
const { data, total, total_pages } = await getWeaponSkinsList(1, { rarity: 'legendary' });
```

---

## Weapons List

The API includes all 30 Marathon weapons. Each weapon skin is associated with exactly one weapon. Use `GET /api/skins/weapon/:slug` to list all skins for a weapon, or filter via `?weapon=slug`.

### Known weapons (as of Feb 2026)

| Slug | Name | Type |
|---|---|---|
| `misriah-2442` | Misriah 2442 | Rifle |
| `overrun-ar` | Overrun AR | Rifle |
| `sak-burst` | SAK Burst | Rifle |
| `ce-tactical-sidearm` | CE Tactical Sidearm | Pistol |
| `volt-9` | Volt-9 | SMG |
| `solenoid-12` | Solenoid-12 | Shotgun |
| `voss-s7` | Voss-S7 | Sniper |
| ... | *(30 total, fetch from API)* | ... |

> **Tip:** To get the full weapons list dynamically, query `GET /api/skins?per_page=1` and the response includes weapon info, or use the admin API.

---

## Collections & Factions

### Collections

Collections group themed skins (e.g. MIDNIGHT DECAY = Deluxe Edition set). A weapon skin has zero or one collection.

```ts
// Filter skins by collection
const res = await fetch('https://weaponskins.marathondb.gg/api/skins?collection=midnight-decay');
```

**Current collections:**
| Slug | Name |
|---|---|
| `zero-step` | ZERO STEP |
| `midnight-decay` | MIDNIGHT DECAY |
| `apogee-intercept` | APOGEE INTERCEPT |

### Factions

Marathon has 6 in-game factions. A weapon skin can be faction-exclusive (zero or one faction).

| Slug | Name | Theme Color |
|---|---|---|
| `cyberacme` | Cyberacme | `#01d838` (green) |
| `nucaloric` | Nucaloric | `#ff125d` (pink) |
| `traxus` | Traxus | `#ff7300` (orange) |
| `mida` | Mida | `#be72e4` (purple) |
| `arachne` | Arachne | `#e40b0d` (red) |
| `sekiguchi` | Sekiguchi | `#cfb72f` (yellow) |

```ts
// Filter skins by faction
const res = await fetch('https://weaponskins.marathondb.gg/api/skins?faction=traxus');
```

---

## Error Handling

```ts
async function fetchWeaponSkin(slug: string): Promise<WeaponSkinDetail | null> {
  const res = await fetch(`https://weaponskins.marathondb.gg/api/skins/${slug}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Weapon Skins API error: ${res.status}`);

  const body: SkinDetailResponse = await res.json();
  return body.data;
}
```

| Status | When |
|---|---|
| `200` | Success |
| `400` | Missing required field or invalid input |
| `404` | Skin or weapon not found |
| `409` | Duplicate slug on create (admin) |
| `500` | Server/database error |

All error responses follow:

```json
{ "success": false, "error": "Error message" }
```

---

## Full Fetch Examples

### Skins grid page (paginated, filtered)

```ts
const API = 'https://weaponskins.marathondb.gg';

async function getWeaponSkins(page = 1, filters: Record<string, string> = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: '24', ...filters });
  const res  = await fetch(`${API}/api/skins?${params}`);
  const body: SkinsListResponse = await res.json();
  return body;
}

// Grid card
function renderSkinCard(skin: WeaponSkinListItem): string {
  const imgSrc = skin.image?.card ?? skin.image?.thumbnail ?? '';
  return `
    <a href="/weapon-skins/${skin.slug}" class="skin-card">
      <div class="skin-card-image" style="aspect-ratio: 1/2;">
        ${imgSrc ? `<img src="${imgSrc}" alt="${skin.name}" loading="lazy" />` : '<div class="no-img">No Image</div>'}
        <div class="skin-card-badges">
          <span class="badge rarity-${skin.rarity}">${skin.rarity}</span>
          ${skin.weapon ? `<span class="badge weapon-type">${skin.weapon.type}</span>` : ''}
        </div>
      </div>
      <div class="skin-card-body">
        <h3>${skin.display_name || skin.name}</h3>
        <p class="weapon-name">${skin.weapon.name}</p>
        ${skin.collection ? `<span class="collection-tag">${skin.collection.name}</span>` : ''}
        ${skin.rating ? `<div class="rating-mini">${skin.rating.score_percent.toFixed(0)}% · ${skin.rating.total_votes} votes</div>` : ''}
      </div>
    </a>
  `;
}
```

### Skin detail page

```ts
async function getSkinDetail(slug: string) {
  const res = await fetch(`${API}/api/skins/${slug}`);
  if (res.status === 404) return null;
  const { data }: SkinDetailResponse = await res.json();
  return data;
}

// Usage
const skin = await getSkinDetail('midnight-decay-misriah-2442');
if (skin) {
  // Primary image (full size for detail view)
  const hero = skin.images.primary?.path_full ?? skin.images.primary?.path_card ?? '';

  // Weapon info
  console.log(`${skin.name} — ${skin.weapon.name} (${skin.weapon.type})`);

  // Collection
  if (skin.collection) console.log(`Collection: ${skin.collection.name}`);

  // Faction
  if (skin.faction) console.log(`Faction: ${skin.faction.name}`);

  // Rarity
  console.log(`Rarity: ${skin.rarity}`);
}
```

### All skins for a weapon page

```ts
async function getWeaponPage(weaponSlug: string) {
  const res  = await fetch(`${API}/api/skins/weapon/${weaponSlug}`);
  const body: WeaponSkinsResponse = await res.json();
  if (!body.success) return null;
  return { weapon: body.weapon, skins: body.data };
}

// Usage
const page = await getWeaponPage('misriah-2442');
// page.weapon = { slug, name, type }
// page.skins  = WeaponSkinListItem[]
```

### Rating component

```ts
async function submitRating(slug: string, value: 1|2|3|4|5) {
  const token = await getDeviceToken();
  const res = await fetch(`${API}/api/skins/${slug}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: value, device_token: token }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(body.error);

  // Save locally so we know user voted
  localStorage.setItem(`mdb_ws_vote_${slug}`, String(value));

  return body.aggregate as RatingResponse;
}
```

---

## Architecture Notes

| Component | Technology | Detail |
|---|---|---|
| API Worker | Cloudflare Workers + Hono | `marathon-weapon-skins-api` |
| Database | Cloudflare D1 | `marathon-weapon-skins` |
| Image Storage | Cloudflare KV | Uploaded images stored in KV, served via Worker route |
| Image Format | WebP, 1:2 portrait | 200×400, 400×800, 800×1600 |
| Custom Domain | `weaponskins.marathondb.gg` | Routes through Cloudflare |
| CORS | Allowlist | Allowed: `marathondb.gg`, `gdb.gg`, localhost dev ports. Images served with open CORS (`*`) |
| Rarity Tiers | 8 values | `common`, `uncommon`, `rare`, `legendary`, `exotic`, `deluxe`, `enhanced`, `superior` |

---

## Changelog

### March 26, 2026
- **Added `GET /api/skins/counts` endpoint** — returns skin count per weapon slug, including weapons with 0 skins
- Fixed CORS documentation — API routes use an origin allowlist, not open `*` (images still use open CORS)
- Added 404 response documentation for `POST /api/skins/:slug/rate` and `GET /api/skins/:slug/ratings`

### February 28, 2026
- **Added `superior` rarity tier** — bright purple (`#c084fc`), now accepted by the database CHECK constraint and available in the admin panel
- Updated rarity count from 7 to 8 across all documentation
- Added dedicated [Rarity System](#rarity-system) section with color map, CSS classes, and rendering examples
- Added `WeaponSkinRarity` union type to TypeScript definitions
- Added sort options reference table
