# Emblems — Frontend Integration Guide

> **API Base:** `https://emblems.marathondb.gg`  
> **Fallback (workers.dev):** `https://marathon-emblems-api.heymarathondb.workers.dev`  
> **Images:** 1:1 square — 512×512 px WebP, served from R2 at `/assets/emblems/{slug}.webp`

---

## Overview

Emblems are cosmetic player badges. Each emblem has:
- A **1:1 square image** (512×512 WebP) stored in R2
- A **rarity tier** (`standard` / `enhanced` / `deluxe` / `superior` / `prestige`)
- A **source type** indicating how it's obtained (free, codex, battlepass, store, event, ranked)
- A freeform **season** text field (e.g. "Season 1 - First Step")
- A two-level **acquisition description**: a short summary for cards, and a long detail for guide pages
- Optional **store / battlepass metadata** (price, tier, rotation dates)
- A **community rating** system using emoji reactions (🔥😍😐👎🗑️), one vote per device token

---

## Quick Reference

```
GET  /api/emblems                        — list all active+available emblems
GET  /api/emblems?rarity=deluxe          — filter by rarity
GET  /api/emblems?source_type=ranked     — filter by source
GET  /api/emblems?season=Season+1        — filter by season text
GET  /api/emblems?is_obtainable=1        — only currently obtainable
GET  /api/emblems/search?q=force         — search by name/description/acq
GET  /api/emblems/:slug                  — full detail + ratings
GET  /api/emblems/:slug/ratings          — ratings only
POST /api/emblems/:slug/rate             — submit/update a vote
GET  /api/emblems/stats/summary          — counts by rarity + source
GET  /api/emblems/seasons/list           — distinct season values
GET  /api/emblems/ratings/hot            — top-rated emblems
```

---

## 1. Listing Page (`/emblems`)

### Fetch all emblems

```js
const API = 'https://emblems.marathondb.gg';

async function fetchEmblems({ rarity, sourceType, season, obtainableOnly } = {}) {
  const params = new URLSearchParams();
  if (rarity)         params.set('rarity', rarity);
  if (sourceType)     params.set('source_type', sourceType);
  if (season)         params.set('season', season);
  if (obtainableOnly) params.set('is_obtainable', '1');

  const res = await fetch(`${API}/api/emblems?${params}`);
  const { data } = await res.json();
  return data;   // array of emblem objects with inline rating
}
```

### Emblem card component

Each card uses a **1:1 square** layout — use `aspect-ratio: 1 / 1` in CSS. There is no separate preview image; use the same `image_url` for both grid cards and detail views.

```jsx
function EmblemCard({ emblem }) {
  const imgSrc = emblem.image_url
    ? `${API}/${emblem.image_url}`
    : null;

  return (
    <a href={`/emblems/${emblem.slug}`} className="emblem-card">
      <div className="emblem-card-image" style={{ aspectRatio: '1 / 1' }}>
        {imgSrc
          ? <img src={imgSrc} alt={emblem.name} loading="lazy" />
          : <PlaceholderIcon />
        }
        <div className="emblem-card-overlay">
          <h3>{emblem.name}</h3>
          <div className="badges">
            <RarityBadge rarity={emblem.rarity} />
            <SourceBadge source={emblem.source_type} />
          </div>
        </div>
      </div>
      <div className="emblem-card-footer">
        <span className="season-label">{emblem.season ?? '–'}</span>
        {!emblem.is_obtainable && (
          <span className="legacy-label">Legacy</span>
        )}
      </div>
    </a>
  );
}
```

### Filter chips

**Rarity:** `standard` · `enhanced` · `deluxe` · `superior` · `prestige`  
**Source:** `free` · `codex` · `battlepass` · `store` · `event` · `ranked`  
**Season:** freeform text — populate from `/api/emblems/seasons/list`  
**Obtainable:** boolean toggle (hide legacy/vaulted emblems)

### Fetch seasons for filter dropdown

```js
async function fetchSeasons() {
  const res = await fetch(`${API}/api/emblems/seasons/list`);
  const { data } = await res.json();
  return data;   // ["Season 1 - First Step", "Season 2 - Breakaway", ...]
}
```

---

## 2. Detail Page (`/emblems/:slug`)

### Fetch full emblem

```js
async function fetchEmblem(slug) {
  const res = await fetch(`${API}/api/emblems/${slug}`);
  const { data } = await res.json();
  return data;
}
```

### Response shape

```json
{
  "id": 1,
  "slug": "full-force",
  "name": "Full Force",
  "description": "Awarded for achieving Diamond rank in competitive play.",
  "flavor_text": "No half measures.",
  "image_url": "assets/emblems/full-force.webp",
  "rarity": "superior",
  "season": "Season 1 - First Step",
  "is_active": 1,
  "is_available": 1,
  "is_obtainable": 1,
  "source_type": "ranked",
  "acquisition_summary": "Reach Diamond rank in Season 1",
  "acquisition_detail": "Achieve Diamond rank or higher in competitive playlist during Season 1.",
  "price": null,
  "currency": null,
  "battlepass_tier": null,
  "available_from": null,
  "available_until": null,
  "notes": null,
  "created_at": "2026-03-10T12:00:00",
  "updated_at": "2026-03-10T12:00:00",
  "rating": {
    "total_votes": 42,
    "score_percent": 78.5,
    "distribution": {
      "fire":  { "count": 18, "percent": 42.9 },
      "love":  { "count": 12, "percent": 28.6 },
      "meh":   { "count": 7,  "percent": 16.7 },
      "nah":   { "count": 3,  "percent": 7.1 },
      "trash": { "count": 2,  "percent": 4.8 }
    },
    "last_updated": "2026-03-10T14:30:00"
  }
}
```

### Detail page layout suggestion

```
┌─────────────────────────────────────────┐
│  [512×512 square image]  │  Name         │
│                          │  Rarity badge │
│                          │  Season       │
│                          │               │
│                          │  ── How to ── │
│                          │  Source badge  │
│                          │  Summary line │
│                          │  Detail text  │
│                          │               │
│                          │  ── Rating ── │
│                          │  🔥 ████ 42%  │
│                          │  😍 ███  28%  │
│                          │  😐 ██   16%  │
│                          │  👎 █     7%  │
│                          │  🗑️ █     4%  │
│                          │  Score: 78%   │
└─────────────────────────────────────────┘
```

---

## 3. Acquisition Section

```jsx
function AcquisitionSection({ emblem }) {
  return (
    <section className="acquisition">
      <h2>How to Obtain</h2>
      <SourceBadge source={emblem.source_type} />
      {emblem.acquisition_summary && (
        <p className="summary">{emblem.acquisition_summary}</p>
      )}
      {emblem.acquisition_detail && (
        <div className="detail-steps"><p>{emblem.acquisition_detail}</p></div>
      )}
      {emblem.source_type === 'store' && (
        <div className="store-info">
          {emblem.price && <span>{emblem.price} {emblem.currency}</span>}
          {emblem.available_until
            ? <span>Available until {formatDate(emblem.available_until)}</span>
            : <span>Permanently available</span>}
        </div>
      )}
      {emblem.source_type === 'battlepass' && (
        <div className="bp-info">
          {emblem.battlepass_tier && <span>Tier {emblem.battlepass_tier}</span>}
          {emblem.season && <span>{emblem.season}</span>}
        </div>
      )}
      {emblem.source_type === 'ranked' && (
        <div className="ranked-info">
          {emblem.season && <span>{emblem.season}</span>}
        </div>
      )}
      {!emblem.is_obtainable && (
        <div className="legacy-warning">⚠️ This emblem is no longer obtainable.</div>
      )}
    </section>
  );
}

function sourceTypeLabel(type) {
  const labels = {
    free: 'Free', codex: 'Codex Reward', battlepass: 'Battle Pass',
    store: 'Store', event: 'Limited Event', ranked: 'Ranked Reward',
    unknown: 'Unknown',
  };
  return labels[type] || type;
}
```

---

## 4. Community Ratings (Emoji Reactions)

Emblems use an **emoji-based** rating system instead of numeric stars. Each vote maps to an emoji label and a numeric value:

| Emoji | Label | Value | Meaning |
|---|---|---|---|
| 🔥 | `fire` | 5 | Amazing |
| 😍 | `love` | 4 | Love it |
| 😐 | `meh` | 3 | It's okay |
| 👎 | `nah` | 2 | Not great |
| 🗑️ | `trash` | 1 | Terrible |

**Score formula:** `((average - 1) / 4) × 100` → 0–100% scale

Votes are **one per device token** per emblem. If a user votes again with the same `device_token`, the previous vote is updated.

### Fetch ratings

```js
async function fetchRatings(slug) {
  const res = await fetch(`${API}/api/emblems/${slug}/ratings`);
  const { data } = await res.json();
  return data;   // null if no votes yet
}
```

### Ratings response shape

```json
{
  "total_votes": 42,
  "score_percent": 78.5,
  "distribution": {
    "fire":  { "count": 18, "percent": 42.9 },
    "love":  { "count": 12, "percent": 28.6 },
    "meh":   { "count": 7,  "percent": 16.7 },
    "nah":   { "count": 3,  "percent": 7.1 },
    "trash": { "count": 2,  "percent": 4.8 }
  },
  "last_updated": "2026-03-10T14:30:00"
}
```

### Submit a vote

```js
async function submitRating(slug, rating, deviceToken) {
  const res = await fetch(`${API}/api/emblems/${slug}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, device_token: deviceToken }),
  });
  return res.json();
}

// Example: user taps the 🔥 emoji
await submitRating('full-force', 5, getDeviceToken());
```

### Device token

Generate a stable `device_token` per browser and persist it in `localStorage`:

```js
function getDeviceToken() {
  let token = localStorage.getItem('marathondb_device_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('marathondb_device_token', token);
  }
  return token;
}
```

### Emoji rating bar component

```jsx
const EMOJI_MAP = [
  { key: 'fire',  emoji: '🔥', value: 5 },
  { key: 'love',  emoji: '😍', value: 4 },
  { key: 'meh',   emoji: '😐', value: 3 },
  { key: 'nah',   emoji: '👎', value: 2 },
  { key: 'trash', emoji: '🗑️', value: 1 },
];

function EmblemRating({ rating, onVote }) {
  if (!rating) return <p>No ratings yet. Be the first!</p>;

  return (
    <div className="emblem-rating">
      <div className="score-percent">{rating.score_percent}%</div>
      <div className="total-votes">{rating.total_votes} votes</div>
      <div className="rating-bars">
        {EMOJI_MAP.map(({ key, emoji, value }) => {
          const dist = rating.distribution[key];
          return (
            <button
              key={key}
              className="rating-bar-row"
              onClick={() => onVote(value)}
            >
              <span className="emoji">{emoji}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${dist.percent}%` }} />
              </div>
              <span className="count">{dist.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### Vote response

```json
{
  "success": true,
  "message": "Rating submitted",
  "previous_rating": null,
  "rating": 5,
  "aggregate": {
    "total_votes": 43,
    "score_percent": 79.1,
    "distribution": { "fire": { "count": 19, "percent": 44.2 }, "..." }
  }
}
```

On update, `previous_rating` contains the old value and `message` is `"Rating updated"`.

---

## 5. Hot / Top-Rated Emblems

Fetch the highest-rated emblems (minimum 3 votes required):

```js
async function fetchHotEmblems(limit = 10) {
  const res = await fetch(`${API}/api/emblems/ratings/hot?limit=${limit}`);
  const { data } = await res.json();
  return data;
}
```

### Response shape

```json
[
  {
    "rank": 1,
    "slug": "full-force",
    "name": "Full Force",
    "rarity": "superior",
    "image_url": "assets/emblems/full-force.webp",
    "rating": {
      "total_votes": 42,
      "score_percent": 78.5,
      "distribution": { "..." },
      "last_updated": "2026-03-10T14:30:00"
    }
  }
]
```

---

## 6. Stats Summary

```js
async function fetchStats() {
  const res = await fetch(`${API}/api/emblems/stats/summary`);
  const { data } = await res.json();
  return data;
}
```

### Response shape

```json
{
  "total": 47,
  "active": 45,
  "by_rarity": [
    { "rarity": "standard", "count": 12 },
    { "rarity": "enhanced", "count": 10 },
    { "rarity": "deluxe", "count": 9 },
    { "rarity": "superior", "count": 8 },
    { "rarity": "prestige", "count": 6 }
  ],
  "by_source": [
    { "source_type": "free", "count": 8 },
    { "source_type": "codex", "count": 7 },
    { "source_type": "battlepass", "count": 10 },
    { "source_type": "store", "count": 8 },
    { "source_type": "ranked", "count": 6 },
    { "source_type": "event", "count": 8 }
  ]
}
```

---

## 7. Search

```js
async function searchEmblems(query) {
  const res = await fetch(`${API}/api/emblems/search?q=${encodeURIComponent(query)}`);
  const { data } = await res.json();
  return data;   // max 50 results
}
```

Searches across `name`, `description`, and `acquisition_summary`.

---

## 8. Available / Obtainable Flags

| Field | Meaning | Frontend use |
|---|---|---|
| `is_active` | Soft delete / hidden by admin | Never shown if `0` (API already filters these out) |
| `is_available` | Included in public listings | API filters these out; do not display if `0` |
| `is_obtainable` | Can currently be earned | Show "Legacy" label when `0` |

---

## 9. Image Handling

Emblems have a **single square image** (512×512 WebP) stored in Cloudflare R2. There is no preview variant — use the same URL everywhere.

```jsx
function EmblemImage({ emblem, size = 160 }) {
  if (!emblem.image_url) return <PlaceholderEmblem />;
  return (
    <img
      src={`${API}/${emblem.image_url}`}
      alt={emblem.name}
      width={size}
      height={size}
      loading="lazy"
      style={{ aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '8px' }}
    />
  );
}
```

Image URL pattern: `/assets/emblems/{slug}.webp`

Full URL example: `https://emblems.marathondb.gg/assets/emblems/full-force.webp`

---

## 10. TypeScript Types

```ts
type Rarity     = 'standard' | 'enhanced' | 'deluxe' | 'superior' | 'prestige';
type SourceType = 'store' | 'battlepass' | 'event' | 'codex' | 'free' | 'ranked' | 'unknown';

interface EmblemRatingDistribution {
  fire:  { count: number; percent: number };
  love:  { count: number; percent: number };
  meh:   { count: number; percent: number };
  nah:   { count: number; percent: number };
  trash: { count: number; percent: number };
}

interface EmblemRating {
  total_votes:   number;
  score_percent: number;
  distribution:  EmblemRatingDistribution;
  last_updated:  string | null;
}

interface Emblem {
  id:                  number;
  slug:                string;
  name:                string;
  description:         string | null;
  flavor_text:         string | null;
  image_url:           string | null;
  rarity:              Rarity;
  season:              string | null;
  is_active:           number;
  is_available:        number;
  is_obtainable:       number;
  source_type:         SourceType;
  acquisition_summary: string | null;
  acquisition_detail:  string | null;
  price:               number | null;
  currency:            string | null;
  battlepass_tier:     number | null;
  available_from:      string | null;
  available_until:     string | null;
  created_at:          string;
  updated_at:          string;
  rating:              EmblemRating | null;
}
```

---

## 11. SEO / Meta Tags

```jsx
function EmblemMeta({ emblem }) {
  const description = emblem.acquisition_summary
    ? `${emblem.rarity} emblem · ${emblem.acquisition_summary}`
    : emblem.description ?? `${emblem.name} emblem in Marathon`;
  const image = emblem.image_url
    ? `https://emblems.marathondb.gg/${emblem.image_url}`
    : null;
  return (
    <>
      <title>{emblem.name} — Emblem | MarathonDB</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={`${emblem.name} — Emblem`} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:type" content="article" />
    </>
  );
}
```

---

## 12. Rarity & Source Colours

```css
/* Rarity */
--rarity-standard:  #95a5a6;
--rarity-enhanced:  #2ecc71;
--rarity-deluxe:    #3498db;
--rarity-superior:  #9b59b6;
--rarity-prestige:  #f39c12;

/* Source */
--source-free:       #2ecc71;
--source-codex:      #00d4ff;
--source-battlepass:  #f39c12;
--source-event:      #9b59b6;
--source-store:      #3498db;
--source-ranked:     #e74c3c;
--source-unknown:    #6b6b75;
```

---

## 13. Key Differences from Backgrounds API

| Feature | Backgrounds | Emblems |
|---|---|---|
| Image shape | 2:3 portrait (800×1200 + 267×400 preview) | 1:1 square (512×512 only) |
| Image storage | Static assets (Wrangler deploy) | R2 bucket |
| Rarity values | common / uncommon / rare / epic / legendary | standard / enhanced / deluxe / superior / prestige |
| Factions | Yes (`faction_id` FK) | No |
| Seasons | `season_id` FK → seasons table | Freeform `season` text field |
| Source types | free / codex / battlepass / store / event | free / codex / battlepass / store / event / **ranked** |
| Rating system | IP-based, 1–5 stars | Device-token, emoji reactions (🔥😍😐👎🗑️) |
| Rate endpoint | `POST /:slug/ratings` `{ score }` | `POST /:slug/rate` `{ rating, device_token }` |
| Distribution keys | `"1"` – `"5"` (numeric strings) | `fire` / `love` / `meh` / `nah` / `trash` |
