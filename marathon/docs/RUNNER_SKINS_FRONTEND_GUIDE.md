# Marathon Runner Skins API — Frontend Integration Guide v3.0

**API Base URL:** `https://runnerskins.marathondb.gg`
**Fallback (workers.dev):** `https://marathon-runner-skins-api.heymarathondb.workers.dev`
**Admin Dashboard:** `http://127.0.0.1:5501/runner-skins-api-final/admin/skins.html`
**Last Updated:** March 4, 2026

---

## Changelog

### v2.0 → v3.0

| Change | Details |
|---|---|
| **Image storage migrated to R2** | Images now served from Cloudflare R2 instead of KV. **No frontend URL changes required** — paths and domains are identical. Images are now properly sized per variant instead of storing the same raw bytes in all slots. |
| **Rook runner added** | `rook` (role: `Opportunist`) is now a valid `runner` filter value and appears in `/api/skins/runner/rook` |
| **Image sizes corrected** | Thumbnail ~13–21 KB, card ~27–43 KB, full ~52–113 KB. Previously all variants were 600 KB–1+ MB |
| **Old image CDN retired** | `helpbot.marathondb.gg/assets/skins/` is no longer the image source. All images are now at `runnerskins.marathondb.gg/assets/runner-skins/` |
| **Client-side upload resizing** | New uploads via the admin dashboard are auto-resized in-browser to correct pixel dimensions before storage |

### v1.0 → v2.0

| Change | Details |
|---|---|
| **`is_verified`** added | Boolean flag on detail response indicating data accuracy has been confirmed |
| **`quest_notes`** added | Array of up to 5 optional strings on detail response — in-game quest steps to unlock a skin |
| **`codex`** source added | New acquisition source value alongside `store`, `battlepass`, `event`, `deluxe-edition`, `default`, `unknown` |
| **Image hosting moved** | Images served directly from this worker at `https://runnerskins.marathondb.gg/assets/runner-skins/{slug}/...` |
| **`GET /api/skins/counts`** documented | Returns per-runner skin counts |

---

## Table of Contents

1. [Overview](#overview)
2. [Endpoints](#endpoints)
   - [GET /api/skins](#get-apiskins)
   - [GET /api/skins/counts](#get-apiskinscounts)
   - [GET /api/skins/hot](#get-apiskinshot)
   - [GET /api/skins/runner/:runnerSlug](#get-apiskinsrunnerrunnerslug)
   - [GET /api/skins/:slug](#get-apiskinsslug)
   - [POST /api/skins/:slug/rate](#post-apiskinsslugrate)
   - [GET /api/skins/:slug/ratings](#get-apiskinsslugratings)
3. [Response Types (TypeScript)](#response-types-typescript)
4. [Images](#images)
5. [Verified Flag](#verified-flag)
6. [Quest Notes](#quest-notes)
7. [Ratings System](#ratings-system)
8. [Filtering & Sorting](#filtering--sorting)
9. [Error Handling](#error-handling)
10. [Full Fetch Examples](#full-fetch-examples)

---

## Overview

The Runner Skins API is a standalone Cloudflare Worker backed by an isolated D1 database (`marathon-runner-skins`) and Cloudflare R2 for image storage. It covers all runner cosmetics — outfits (`skin`) and armour shells (`shell`) — with full image management, pricing/availability, release tracking, quest unlock notes, a verified flag, and a 1–5 emoji community rating system.

**Supported runners:** `assassin`, `destroyer`, `recon`, `rook`, `thief`, `triage`, `vandal`

All responses use a consistent envelope:

```json
{ "success": true, "data": { ... } }
```

CORS is open (`*`). Requests can be made directly from any frontend origin.

---

## Endpoints

### `GET /api/skins`

Paginated list of all skins with optional filtering and sorting. Returns lightweight list items — no full description, quest notes, or full image set.

#### Query Parameters

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `per_page` | integer | `24` | Items per page (max `100`) |
| `sort` | string | `created_at` | `name`, `rarity`, `season`, `release_date`, `rating` |
| `order` | string | `DESC` | `ASC` or `DESC` |
| `rarity` | string | — | `common`, `uncommon`, `rare`, `legendary`, `exotic`, `deluxe`, `enhanced` |
| `source` | string | — | `store`, `battlepass`, `event`, `deluxe-edition`, `codex`, `default`, `unknown` |
| `skin_type` | string | — | `skin` or `shell` |
| `runner` | string | — | Runner slug, e.g. `triage` |
| `collection` | string | — | Collection slug |
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
  "count": 5,
  "total": 15,
  "page": 1,
  "per_page": 24,
  "total_pages": 1,
  "data": [
    {
      "id": 1,
      "slug": "midnight-decay-thief-shell",
      "name": "MIDNIGHT DECAY Thief",
      "display_name": "MIDNIGHT DECAY",
      "skin_type": "shell",
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
      "image": {
        "thumbnail": "assets/runner-skins/midnight-decay-thief-shell/thumbnail.webp",
        "card": "assets/runner-skins/midnight-decay-thief-shell/card.webp"
      },
      "runner": {
        "slug": "thief",
        "name": "Thief",
        "role": "Stealth / Mobility"
      },
      "rating": null
    }
  ]
}
```

> **Note:** The `image.thumbnail` and `image.card` paths are relative R2 keys. Prefix with `https://runnerskins.marathondb.gg/` to build full URLs.

---

### `GET /api/skins/counts`

Skin count grouped by runner slug. Useful for showing badges/counts on runner selection UIs.

#### Response

```json
{
  "success": true,
  "data": {
    "thief": 12,
    "triage": 8,
    "vandal": 15,
    "assassin": 10
  }
}
```

---

### `GET /api/skins/hot`

Top skins by `score_percent`, minimum 3 votes. Returns up to 10 results by default.

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
      "slug": "neon-striker-vandal",
      "name": "Neon Striker",
      "skin_type": "skin",
      "rarity": "legendary",
      "runner": { "slug": "vandal", "name": "Vandal", "role": "Assault" },
      "rating": { "total_votes": 142, "score_percent": 87.4, "distribution": { "..." } }
    }
  ]
}
```

---

### `GET /api/skins/runner/:runnerSlug`

All skins for a specific runner, ordered by skin_type then season then name.

```
GET /api/skins/runner/thief
```

#### Response

```json
{
  "success": true,
  "runner": { "slug": "thief", "name": "Thief", "role": "Stealth / Mobility" },
  "skins": {
    "count": 2,
    "data": [
      {
        "slug": "lilac-rabbit-thief",
        "name": "Lilac Rabbit",
        "skin_type": "skin",
        "rarity": "common",
        "source": "unknown",
        "is_limited": false,
        "is_available": true,
        "season_added": "Pre-Season",
        "price": null,
        "collection": null
      }
    ]
  }
}
```

---

### `GET /api/skins/:slug`

Full skin detail — single request, everything included. This is the only endpoint that returns `is_verified`, `quest_notes`, full image gallery, store/battlepass details, and SEO metadata.

#### Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "midnight-decay-thief-shell",
    "name": "MIDNIGHT DECAY Thief",
    "display_name": "MIDNIGHT DECAY",
    "skin_type": "shell",
    "rarity": "deluxe",
    "description": "An animated shell for Thief included in the Deluxe Edition.",
    "flavor_text": null,
    "source": "deluxe-edition",
    "source_detail": "Deluxe Edition (launch)",
    "acquisition_note": "Included with Deluxe Edition",
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
      "date": "2025-01-01",
      "patch": "0.1.0",
      "season": 0,
      "season_added": "Pre-Season"
    },
    "runner": {
      "slug": "thief",
      "name": "Thief",
      "role": "Stealth / Mobility"
    },
    "collection": {
      "slug": "midnight-decay",
      "name": "MIDNIGHT DECAY"
    },
    "faction_exclusive_id": null,
    "is_verified": true,
    "quest_notes": [
      "Complete 10 matches as Thief",
      "Earn 5,000 credits in a single match"
    ],
    "images": {
      "primary": {
        "id": 1,
        "image_name": "Primary",
        "image_slug": "midnight-decay-thief-shell-primary",
        "is_primary": true,
        "display_order": 0,
        "path_thumbnail": "assets/runner-skins/midnight-decay-thief-shell/thumbnail.webp",
        "path_card": "assets/runner-skins/midnight-decay-thief-shell/card.webp",
        "path_full": "assets/runner-skins/midnight-decay-thief-shell/full.webp"
      },
      "gallery": []
    },
    "rating": {
      "total_votes": 42,
      "score_percent": 78.6,
      "distribution": {
        "fire":  { "count": 20, "percent": 47.6 },
        "love":  { "count": 12, "percent": 28.6 },
        "meh":   { "count": 6,  "percent": 14.3 },
        "nah":   { "count": 3,  "percent": 7.1 },
        "trash": { "count": 1,  "percent": 2.4 }
      },
      "last_updated": "2026-03-01T12:00:00.000Z"
    },
    "seo": {
      "title": null,
      "description": null
    },
    "metadata": {
      "created_at": "2026-02-26T00:00:00.000Z",
      "updated_at": "2026-03-04T00:00:00.000Z"
    }
  }
}
```

#### Key v2 fields

| Field | Type | Notes |
|---|---|---|
| `is_verified` | `boolean` | `true` if admin has confirmed data accuracy |
| `quest_notes` | `string[]` | 0–5 entries. Empty array if none set. In-game quest steps to unlock |

#### 404 Response

```json
{ "success": false, "error": "Skin 'unknown-slug' not found" }
```

---

### `POST /api/skins/:slug/rate`

Submit or update a community rating (1-5 emoji). One vote per device per skin — submitting again updates the previous vote.

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
    "last_updated": "2026-03-04T12:00:00.000Z"
  }
}
```

> If the user already voted, `previous_rating` shows their previous value and `message` will be `"Rating updated"`.

---

### `GET /api/skins/:slug/ratings`

Get the rating aggregate for a single skin.

#### Response

```json
{
  "success": true,
  "skin_slug": "midnight-decay-thief-shell",
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
    "last_updated": "2026-03-04T08:00:00.000Z"
  }
}
```

`score_percent` formula: `((sum_of_ratings / total_votes) - 1) / 4 × 100`
This maps a 1.0 average → 0% and a 5.0 average → 100%.

---

## Response Types (TypeScript)

Copy these directly into your project.

```ts
// ── Source values ──────────────────────────────────────────
export type SkinSource = 'store' | 'battlepass' | 'event' | 'deluxe-edition' | 'codex' | 'default' | 'unknown';

// ── List item (returned by /api/skins, /api/skins/hot) ────
export interface SkinListItem {
  id: number;
  slug: string;
  name: string;
  display_name: string | null;
  skin_type: 'skin' | 'shell';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'exotic' | 'deluxe' | 'enhanced';
  source: SkinSource;
  is_limited: boolean;
  is_available: boolean;
  season_added: string | null;
  price: { credits: number | null; real: number | null; currency: string | null } | null;
  collection: { slug: string; name: string } | null;
  image: { thumbnail: string | null; card: string | null } | null;
  runner: { slug: string; name: string; role: string };
  rating: RatingResponse | null;
}

// ── Full detail (returned by /api/skins/:slug) ────────────
export interface SkinDetail {
  id: number;
  slug: string;
  name: string;
  display_name: string | null;
  skin_type: 'skin' | 'shell';
  rarity: string;
  description: string | null;
  flavor_text: string | null;
  source: SkinSource;
  source_detail: string | null;
  acquisition_note: string | null;
  price: { credits: number | null; real: number | null; currency: string | null } | null;
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
  runner: { slug: string; name: string; role: string };
  collection: { slug: string; name: string } | null;
  faction_exclusive_id: number | null;
  /** v2 — true if admin has marked this skin's data as confirmed accurate */
  is_verified: boolean;
  /** v2 — 0 to 5 in-game quest steps required to unlock this skin (empty array if none) */
  quest_notes: string[];
  images: {
    primary: SkinImage | null;
    gallery: SkinImage[];
  };
  rating: RatingResponse | null;
  seo: { title: string | null; description: string | null };
  metadata: { created_at: string; updated_at: string };
}

// ── Image (nested in detail response) ─────────────────────
export interface SkinImage {
  id: number;
  image_name: string;
  image_slug: string;
  is_primary: boolean;
  display_order: number;
  path_thumbnail: string | null;  // R2 key — prefix with API base URL to get full URL
  path_card: string | null;       // R2 key — prefix with API base URL to get full URL
  path_full: string | null;       // R2 key — prefix with API base URL to get full URL
}

// ── Rating ────────────────────────────────────────────────
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

// ── Runner skin counts ────────────────────────────────────
export interface SkinCountsResponse {
  success: boolean;
  data: Record<string, number>; // runner_slug → count
}

// ── API envelopes ─────────────────────────────────────────
export interface SkinsListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  data: SkinListItem[];
}

export interface SkinDetailResponse {
  success: boolean;
  data: SkinDetail;
}

export interface RatingsResponse {
  success: boolean;
  skin_slug: string;
  data: RatingResponse;
}
```

---

## Images

Images are stored in Cloudflare R2 and served directly from this worker.

### Image Base URL

```
https://runnerskins.marathondb.gg/assets/runner-skins/{skin-slug}/
```

### Image Standard

All skin images follow the **1:2 aspect ratio** (width:height — portrait orientation). When an image is uploaded via the admin dashboard it is resized in-browser and stored under 4 R2 keys:

| Variant | R2 Key | Dimensions | Typical size | Use case |
|---|---|---|---|---|
| `thumbnail.webp` | `assets/runner-skins/{slug}/thumbnail.webp` | 200 × 400 | ~13–21 KB | List grids, sidebar thumbnails |
| `card.webp` | `assets/runner-skins/{slug}/card.webp` | 400 × 800 | ~27–43 KB | Hover previews, detail cards |
| `full.webp` | `assets/runner-skins/{slug}/full.webp` | 800 × 1600 | ~52–113 KB | Full-size detail view, lightbox |
| `original.{ext}` | `assets/runner-skins/{slug}/original.png` | Source size | varies | Preserved original upload |

> **Note:** The `path_thumbnail`, `path_card`, and `path_full` values in the API response are **relative R2 keys**, not full URLs. Prefix them with the API base URL to build the complete image URL.

### Building full image URLs

```ts
const API_BASE = 'https://runnerskins.marathondb.gg';

function getImageUrl(r2Key: string | null): string {
  if (!r2Key) return '';
  return `${API_BASE}/${r2Key}`;
}

// Usage with a SkinDetail response:
const thumbnailUrl = getImageUrl(skin.images.primary?.path_thumbnail);
const cardUrl      = getImageUrl(skin.images.primary?.path_card);
const fullUrl      = getImageUrl(skin.images.primary?.path_full);
```

### Which variant to use

| Context | Variant | Field |
|---|---|---|
| List grid, thumbnails | `thumbnail.webp` (200×400) | `path_thumbnail` / `image.thumbnail` |
| Cards, hover previews | `card.webp` (400×800) | `path_card` / `image.card` |
| Detail page hero | `full.webp` (800×1600) | `path_full` |

```ts
// Defensive helper — falls back through variants if a size is missing
function getSkinImageUrl(skin: SkinListItem, prefer: 'thumbnail' | 'card' = 'card'): string {
  const path = skin.image?.[prefer] ?? skin.image?.thumbnail ?? skin.image?.card;
  return path ? `${API_BASE}/${path}` : '';
}
```

### HTML `<picture>` pattern

```html
<picture>
  <source srcset="https://runnerskins.marathondb.gg/assets/runner-skins/{slug}/full.webp" type="image/webp" media="(min-width: 800px)" />
  <source srcset="https://runnerskins.marathondb.gg/assets/runner-skins/{slug}/card.webp" type="image/webp" media="(min-width: 400px)" />
  <img src="https://runnerskins.marathondb.gg/assets/runner-skins/{slug}/thumbnail.webp" alt="{skin.name}" loading="lazy" />
</picture>
```

### Image Caching

Images are served with aggressive cache headers:

```
Cache-Control: public, max-age=31536000, immutable
```

Images are cached for 1 year. If a skin image is re-uploaded, the R2 key stays the same — append `?v={timestamp}` to bust the cache during development.

---

## Verified Flag

The `is_verified` boolean (detail endpoint only) indicates whether an admin has confirmed that all data for this skin is accurate and complete.

### Frontend usage

```ts
function renderVerifiedBadge(skin: SkinDetail): string {
  if (!skin.is_verified) return '';
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

## Quest Notes

The `quest_notes` array (detail endpoint only) contains **0 to 5** optional strings describing in-game quest steps required to unlock a skin. This is only populated for skins that require completing specific challenges.

### Frontend usage

```ts
function renderQuestNotes(skin: SkinDetail): string {
  if (!skin.quest_notes.length) return '';

  return `
    <div class="quest-notes">
      <h4>How to Unlock</h4>
      <ol>
        ${skin.quest_notes.map(note => `<li>${note}</li>`).join('')}
      </ol>
    </div>
  `;
}
```

### Suggested styling

```css
.quest-notes {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  padding: 16px 20px;
  margin-top: 16px;
}
.quest-notes h4 {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #3b82f6;
  margin-bottom: 12px;
}
.quest-notes ol {
  padding-left: 20px;
  margin: 0;
}
.quest-notes li {
  font-size: 14px;
  margin-bottom: 6px;
  color: #e2e8f0;
}
```

### Checking if a skin has quests

```ts
const hasQuests = skin.quest_notes.length > 0;
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
const BASE = 'https://runnerskins.marathondb.gg';

async function rateSkin(slug: string, rating: 1|2|3|4|5): Promise<RatingResponse> {
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
  const v = localStorage.getItem(`mdb_vote_${slug}`);
  return v ? parseInt(v) : null;
}

function setUserVote(slug: string, rating: number): void {
  localStorage.setItem(`mdb_vote_${slug}`, String(rating));
}
```

---

## Filtering & Sorting

### Available source values

| Source | Description |
|---|---|
| `store` | Purchased from the in-game store |
| `battlepass` | Earned through the battle pass |
| `event` | Earned during a limited-time event |
| `deluxe-edition` | Included with the Deluxe Edition purchase |
| `codex` | Unlocked via the in-game Codex system |
| `default` | Default skin that all players have |
| `unknown` | Source not yet determined |

### Common filter combinations

```ts
// All store skins, sorted by newest
/api/skins?source=store&sort=release_date&order=DESC

// All Codex-unlockable skins
/api/skins?source=codex

// All available legendary skins for Triage
/api/skins?runner=triage&rarity=legendary&is_available=true

// All Triage skins (dedicated endpoint)
/api/skins/runner/triage

// Current battlepass skins
/api/skins?in_battlepass=true&is_available=true

// Top rated skins
/api/skins/hot

// Search by name
/api/skins?search=midnight

// Skin counts per runner (for badges)
/api/skins/counts
```

---

## Error Handling

```ts
async function fetchSkin(slug: string): Promise<SkinDetail | null> {
  const res = await fetch(`https://runnerskins.marathondb.gg/api/skins/${slug}`);

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Skins API error: ${res.status}`);

  const body: SkinDetailResponse = await res.json();
  return body.data;
}
```

| Status | When |
|---|---|
| `400` | Missing required field or invalid input |
| `404` | Skin not found |
| `409` | Duplicate slug on create |
| `500` | Server/database error |

---

## Full Fetch Examples

### Skins grid (paginated)

```ts
const BASE = 'https://runnerskins.marathondb.gg';

async function getSkinsList(page = 1, filters: Record<string, string> = {}): Promise<SkinsListResponse> {
  const params = new URLSearchParams({ page: String(page), per_page: '24', ...filters });
  const res  = await fetch(`${BASE}/api/skins?${params}`);
  const body: SkinsListResponse = await res.json();
  return body;
}
```

### Skin detail page

```ts
async function getSkinPage(slug: string): Promise<SkinDetail | null> {
  const res = await fetch(`${BASE}/api/skins/${slug}`);
  if (res.status === 404) return null;
  const { data }: SkinDetailResponse = await res.json();
  return data;
}
```

### Runner cosmetics page

```ts
async function getRunnerSkins(runnerSlug: string) {
  const res  = await fetch(`${BASE}/api/skins/runner/${runnerSlug}`);
  const body = await res.json();
  if (!body.success) return null;
  return { runner: body.runner, skins: body.skins.data };
}
```

### Runner skin counts

```ts
async function getSkinCounts(): Promise<Record<string, number>> {
  const res  = await fetch(`${BASE}/api/skins/counts`);
  const body: SkinCountsResponse = await res.json();
  return body.data;
}
```

### Full skin card component (React-style)

```tsx
function SkinCard({ skin }: { skin: SkinListItem }) {
  const imageUrl = skin.image?.card
    ? `https://runnerskins.marathondb.gg/${skin.image.card}`
    : null;

  return (
    <a href={`/skins/${skin.slug}`} className="skin-card">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={skin.name}
          loading="lazy"
          style={{ aspectRatio: '1/2', objectFit: 'cover' }}
        />
      )}
      <div className="skin-card-info">
        <h3>{skin.display_name ?? skin.name}</h3>
        <span className={`rarity rarity-${skin.rarity}`}>{skin.rarity}</span>
        <span className="runner">{skin.runner.name}</span>
        {skin.rating && (
          <span className="score">{skin.rating.score_percent.toFixed(0)}%</span>
        )}
      </div>
    </a>
  );
}
```

### Full skin detail with quest notes and verified badge

```tsx
function SkinDetailView({ skin }: { skin: SkinDetail }) {
  const fullImage = skin.images.primary?.path_full
    ? `https://runnerskins.marathondb.gg/${skin.images.primary.path_full}`
    : null;

  return (
    <article>
      {fullImage && <img src={fullImage} alt={skin.name} />}

      <h1>
        {skin.display_name ?? skin.name}
        {skin.is_verified && <span className="verified-badge">✓ Verified</span>}
      </h1>

      <p className="meta">
        {skin.runner.name} · {skin.rarity} · {skin.source}
      </p>

      {skin.description && <p>{skin.description}</p>}
      {skin.flavor_text && <blockquote>{skin.flavor_text}</blockquote>}

      {skin.quest_notes.length > 0 && (
        <div className="quest-notes">
          <h4>How to Unlock</h4>
          <ol>
            {skin.quest_notes.map((note, i) => <li key={i}>{note}</li>)}
          </ol>
        </div>
      )}

      {skin.rating && <RatingBar rating={skin.rating} />}
    </article>
  );
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
