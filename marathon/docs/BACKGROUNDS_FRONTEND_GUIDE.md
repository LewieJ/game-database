# Backgrounds — Frontend Integration Guide

> **API Base:** `https://backgrounds.marathondb.gg`  
> **Fallback (workers.dev):** `https://marathon-backgrounds-api.heymarathondb.workers.dev`  
> **Images:** 2:3 portrait ratio — full size 800×1200 px, preview 267×400 px (both WebP)

---

## Overview

Backgrounds are cosmetic player cards. Each background has:
- A **2:3 portrait image** (display card) with a smaller preview variant
- A **rarity tier** and **source type** (how it's obtained)
- An optional **faction association** (e.g. Cyberacme, Nucaloric) for faction-themed pages
- A two-level **acquisition description**: a short summary for cards, and a long detail for guide pages
- Optional **store / battlepass metadata** (price, tier, rotation dates)
- A **community rating** system (1–5 stars, one vote per user)

---

## Quick Reference

```
GET  /api/backgrounds                    — list all active backgrounds
GET  /api/backgrounds?rarity=rare        — filter by rarity
GET  /api/backgrounds?source_type=codex  — filter by acquisition source
GET  /api/backgrounds?faction_id=1       — filter by faction
GET  /api/backgrounds/search?q=arachne   — search by name/description
GET  /api/backgrounds/:slug              — full detail + ratings
GET  /api/backgrounds/:slug/ratings      — ratings only
POST /api/backgrounds/:slug/ratings      — submit/update a vote { "score": 4 }
GET  /api/stats/summary                  — counts by rarity + source
GET  /api/seasons/all                    — all seasons (from central DB)
GET  /api/seasons/current                — active season
GET  /api/backgrounds/factions/all       — all factions
```

---

## 1. Listing Page (`/backgrounds`)

### Fetch all backgrounds

```js
const API = 'https://backgrounds.marathondb.gg';

async function fetchBackgrounds({ rarity, sourceType, seasonId, factionId, obtainableOnly } = {}) {
  const params = new URLSearchParams();
  if (rarity)         params.set('rarity', rarity);
  if (sourceType)     params.set('source_type', sourceType);
  if (seasonId)       params.set('season_id', seasonId);
  if (factionId)      params.set('faction_id', factionId);
  if (obtainableOnly) params.set('is_obtainable', '1');

  const res = await fetch(`${API}/api/backgrounds?${params}`);
  const { data } = await res.json();
  return data;   // array of background objects
}
```

### Background card component

Each card is a **2:3 portrait** — use `aspect-ratio: 2 / 3` in CSS. The preview image (267×400) should be used for grid cards; the full image (800×1200) is for detail/lightbox views.

```jsx
function BackgroundCard({ bg }) {
  // Prefer preview, fall back to full
  const imgSrc = bg.image_preview_url || bg.image_url;

  return (
    <a href={`/backgrounds/${bg.slug}`} className="bg-card">
      <div className="bg-card-image" style={{ aspectRatio: '2 / 3' }}>
        {imgSrc
          ? <img src={imgSrc} alt={bg.name} loading="lazy" />
          : <PlaceholderIcon />
        }
        <div className="bg-card-overlay">
          <h3>{bg.name}</h3>
          <div className="badges">
            <RarityBadge rarity={bg.rarity} />
            <SourceBadge source={bg.source_type} />
            {bg.faction_name && <FactionBadge faction={bg.faction_slug} name={bg.faction_name} />}
          </div>
          {bg.acquisition_summary && (
            <p className="acq-summary">{bg.acquisition_summary}</p>
          )}
        </div>
      </div>
      {!bg.is_obtainable && (
        <div className="legacy-label">Legacy · No longer obtainable</div>
      )}
    </a>
  );
}
```

### Filter chips

The key filter dimensions for the listing page:

**Rarity:** `common` · `uncommon` · `rare` · `epic` · `legendary`  
**Source:** `free` · `codex` · `battlepass` · `store` · `event`  
**Faction:** filter by `faction_id` query param (see §10 for faction list)  
**Obtainable:** boolean toggle (hide legacy/vaulted backgrounds)

---

## 1a. Image Pipeline (content team reference)

Images are generated locally and deployed as Cloudflare static assets.

```powershell
# From MarathonAPI root:
python scripts/compress_background_images.py "SourceImage.PNG" background-slug
npx wrangler deploy
```

Outputs:

| File | Dimensions | DB field |
|---|---|---|
| `public/assets/backgrounds/{slug}/full.webp` | 800×1200 | `image_url` |
| `public/assets/backgrounds/{slug}/preview.webp` | 267×400 | `image_preview_url` |

**CDN base:** `https://helpbot.marathondb.gg/assets/backgrounds/{slug}/`

The admin drag-drop zone previews the image and auto-fills the URL fields — the command block that appears shows exactly what to run.

---

## 2. Detail Page (`/backgrounds/:slug`)

### Fetch full background

```js
async function fetchBackground(slug) {
  const res = await fetch(`${API}/api/backgrounds/${slug}`);
  const { data } = await res.json();
  return data;
  // data.ratings is the community rating object
  // data.acquisition_detail is the long guide text
  // data.season_name is resolved from the central seasons DB
  // data.faction_name / data.faction_slug are resolved from the local factions table
}
```

### Response shape (expanded)

```json
{
  "id": 1,
  "slug": "arachene-operative",
  "name": "Arachene Operative",
  "description": "A formal operative uniform in the style of Arachne's inner circle.",
  "flavor_text": "They don't issue this. You earn it.",
  "image_url": "assets/backgrounds/arachene-operative/full.webp",
  "image_preview_url": "assets/backgrounds/arachene-operative/preview.webp",
  "rarity": "rare",
  "source_type": "codex",
  "acquisition_summary": "Complete the ARACHNE XX codex entry",
  "acquisition_detail": "Achieve Reputation Rank 20 with Arachne.",
  "price": null,
  "currency": null,
  "battlepass_tier": null,
  "available_from": null,
  "available_until": null,
  "is_obtainable": 1,
  "is_available": 1,
  "faction_id": 5,
  "faction_name": "Arachne",
  "faction_slug": "arachne",
  "season_name": "Season 1",
  "season_version": "1.0.0",
  "ratings": {
    "slug": "arachene-operative",
    "type": "background",
    "score_percent": 46.4,
    "total_votes": 7,
    "distribution": {
      "1": { "count": 1, "percent": 14.3 },
      "2": { "count": 2, "percent": 28.6 },
      "3": { "count": 1, "percent": 14.3 },
      "4": { "count": 3, "percent": 42.9 },
      "5": { "count": 0, "percent": 0.0 }
    },
    "user_rating": null,
    "last_updated": "2026-02-27 12:00:00"
  }
}
```

### Detail page layout suggestion

```
┌─────────────────────────────────────────┐
│  [Full 800×1200 image]  │  Name          │
│                         │  Rarity badge  │
│                         │  Season        │
│                         │  Faction badge │
│                         │               │
│                         │  ─ How to get ─│
│                         │  Summary line  │
│                         │  Detail text   │
│                         │               │
│                         │  ─ Store info ─│
│                         │  (if store/BP) │
│                         │               │
│                         │  ─ Rating ─    │
│                         │  ★★★★☆  46%   │
│                         │  [Vote stars]  │
└─────────────────────────────────────────┘
```

---

## 3. Acquisition Section

Display acquisition in two tiers depending on what's available:

```jsx
function AcquisitionSection({ bg }) {
  return (
    <section className="acquisition">
      <h2>How to Obtain</h2>

      <div className="source-badge source-{bg.source_type}">
        {sourceTypeLabel(bg.source_type)}
      </div>

      {/* Always show if available — works as a subtitle on cards too */}
      {bg.acquisition_summary && (
        <p className="summary">{bg.acquisition_summary}</p>
      )}

      {/* Only show on detail pages — this is the guide text */}
      {bg.acquisition_detail && (
        <div className="detail-steps">
          <p>{bg.acquisition_detail}</p>
        </div>
      )}

      {/* Store / Battlepass block */}
      {bg.source_type === 'store' && (
        <div className="store-info">
          {bg.price && <span>{bg.price} {bg.currency}</span>}
          {bg.available_until
            ? <span>Available until {formatDate(bg.available_until)}</span>
            : <span>Permanently available</span>
          }
        </div>
      )}

      {bg.source_type === 'battlepass' && (
        <div className="bp-info">
          {bg.battlepass_tier && <span>Tier {bg.battlepass_tier}</span>}
          {bg.season_name && <span>{bg.season_name}</span>}
        </div>
      )}

      {!bg.is_obtainable && (
        <div className="legacy-warning">
          ⚠️ This background is no longer obtainable.
        </div>
      )}
    </section>
  );
}

function sourceTypeLabel(type) {
  const labels = {
    free:        'Free',
    codex:       'Codex Reward',
    battlepass:  'Battle Pass',
    store:       'Store',
    event:       'Limited Event',
    unknown:     'Unknown',
  };
  return labels[type] || type;
}
```

---

## 4. Community Ratings

The rating system matches the existing pattern used across MarathonDB (e.g. `helpbot.marathondb.gg/api/ratings/cosmetics/:slug`). The backgrounds API is self-contained — ratings are stored in `BACKGROUNDS_DB`.

### Reading ratings

Ratings are included in the `/api/backgrounds/:slug` response under `data.ratings`. You can also fetch them standalone:

```js
const res  = await fetch(`${API}/api/backgrounds/${slug}/ratings`);
const { data } = await res.json();
// data.score_percent  — e.g. 46.4  (0–100, proportion of max score)
// data.total_votes    — total number of votes cast
// data.distribution   — { "1": {count, percent}, ... "5": {count, percent} }
// data.user_rating    — 1–5 if this IP has voted, otherwise null
```

**Converting `score_percent` to a star display:**

```js
// score_percent is out of 100, where 100 = all 5-star votes
const starScore = (data.score_percent / 20).toFixed(1);  // e.g. "2.3"
const fullStars = Math.round(data.score_percent / 20);   // e.g. 2
```

### Star rating component

```jsx
function StarRating({ ratings, onVote }) {
  const [hovered, setHovered] = useState(null);
  const current = ratings.user_rating;

  return (
    <div className="star-rating">
      {/* Distribution bars */}
      <div className="distribution">
        {[5, 4, 3, 2, 1].map(i => (
          <div key={i} className="bar-row">
            <span>{i}★</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${ratings.distribution[i]?.percent ?? 0}%` }}
              />
            </div>
            <span>{ratings.distribution[i]?.count ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Vote stars */}
      <div className="vote-stars">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            className={`star ${i <= (hovered ?? current ?? 0) ? 'filled' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onVote(i)}
            aria-label={`Rate ${i} star${i !== 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
        {current && <span className="your-rating">Your rating: {current}/5</span>}
      </div>

      <p className="totals">
        {(ratings.score_percent / 20).toFixed(1)}/5 — {ratings.total_votes} vote{ratings.total_votes !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
```

### Submitting a vote

```js
async function submitRating(slug, score) {
  const res = await fetch(`${API}/api/backgrounds/${slug}/ratings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score }),
  });
  const { data } = await res.json();
  return data;  // updated ratings object — re-render component
}
```

> **One vote per IP.** Calling `POST` again with a different score updates (overwrites) the previous vote. `data.user_rating` will reflect the new score immediately.

---

## 5. Available / Obtainable Flags

Three status fields control visibility:

| Field | Meaning | Frontend use |
|---|---|---|
| `is_active` | Soft delete / hidden by admin | Never shown if `0` (API filters these out) |
| `is_available` | Appears in listings | Filter out `0` on listing pages if desired |
| `is_obtainable` | Can currently be earned | Show "Legacy" label when `0`; optionally hide from "Available now" filters |

Recommended listing behaviour:
- Default: show all `is_active = 1` regardless of `is_obtainable`
- "Available now" toggle: `?is_obtainable=1`
- Always label legacy backgrounds clearly

---

## 6. Image Handling

```jsx
function BackgroundImage({ bg, size = 'preview' }) {
  const src = size === 'full'
    ? bg.image_url
    : (bg.image_preview_url || bg.image_url);   // fall back to full if no preview

  if (!src) return <PlaceholderBackground />;

  return (
    <img
      src={`https://backgrounds.marathondb.gg/${src}`}
      alt={bg.name}
      width={size === 'full' ? 800 : 267}
      height={size === 'full' ? 1200 : 400}
      loading="lazy"
      style={{ aspectRatio: '2 / 3', objectFit: 'cover' }}
    />
  );
}
```

> Always set `width` + `height` attributes to prevent layout shift. The 2:3 aspect ratio should be enforced via CSS `aspect-ratio: 2 / 3` on the container — never rely on the image dimensions alone.

---

## 7. TypeScript Types

```ts
export type BackgroundRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type SourceType = 'store' | 'battlepass' | 'event' | 'codex' | 'free' | 'unknown';

export interface BackgroundRatings {
  slug:          string;
  type:          'background';
  score_percent: number;       // 0–100
  total_votes:   number;
  distribution: {
    [star: string]: { count: number; percent: number };
  };
  user_rating:   number | null;  // 1–5, null if not yet voted
  last_updated:  string | null;
}

export interface Faction {
  id:   number;
  slug: string;
  name: string;
}

export interface Background {
  id:                   number;
  slug:                 string;
  name:                 string;
  description:          string | null;
  flavor_text:          string | null;
  image_url:            string | null;
  image_preview_url:    string | null;
  rarity:               BackgroundRarity;
  season_id:            number | null;
  season_name:          string | null;
  season_version:       string | null;
  faction_id:           number | null;
  faction_name:         string | null;
  faction_slug:         string | null;
  is_active:            number;
  is_available:         number;
  is_obtainable:        number;
  source_type:          SourceType;
  acquisition_summary:  string | null;
  acquisition_detail:   string | null;
  price:                number | null;
  currency:             string | null;
  battlepass_tier:      number | null;
  available_from:       string | null;
  available_until:      string | null;
  notes:                string | null;
  created_at:           string;
  updated_at:           string;
  ratings?:             BackgroundRatings;   // included on detail endpoint only
}
```

---

## 8. SEO / Meta Tags (detail page)

```jsx
// In page <head> / Next.js generateMetadata / etc.
function BackgroundMeta({ bg }) {
  const description = bg.acquisition_summary
    ? `${bg.rarity} background · ${bg.acquisition_summary}`
    : bg.description ?? `${bg.name} background in Marathon`;

  return (
    <>
      <title>{bg.name} — Background | MarathonDB</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={`${bg.name} — Background`} />
      <meta property="og:description" content={description} />
      {bg.image_preview_url && (
        <meta
          property="og:image"
          content={`https://backgrounds.marathondb.gg/${bg.image_preview_url}`}
        />
      )}
      <meta property="og:type" content="article" />
    </>
  );
}
```

---

## 9. Rarity & Source Colours

Consistent colour tokens used in the admin dashboard — recommended to match on the frontend:

```css
/* Rarity */
--rarity-common:    #95a5a6;
--rarity-uncommon:  #2ecc71;
--rarity-rare:      #3498db;
--rarity-epic:      #9b59b6;
--rarity-legendary: #f39c12;

/* Source type */
--source-free:        #2ecc71;
--source-codex:       #00d4ff;
--source-battlepass:  #f39c12;
--source-event:       #9b59b6;
--source-store:       #3498db;
--source-unknown:     #6b6b75;

/* Faction */
--faction-cyberacme:  #01d838;
--faction-nucaloric:  #ff125d;
--faction-traxus:     #ff7300;
--faction-vesper:     #a855f7;
--faction-arachne:    #00d4ff;
--faction-volantis:   #facc15;
```

---

## 10. Factions

Backgrounds can optionally belong to a faction. The factions list is returned from a dedicated endpoint and can be used to build filter bars or badge components.

### Fetching factions

```js
async function fetchFactions() {
  const res = await fetch(`${API}/api/backgrounds/factions/all`);
  const { data } = await res.json();
  return data;
  // [{ id: 1, slug: "cyberacme", name: "Cyberacme" }, ...]
}
```

### Current factions

| ID | Slug | Name | Colour |
|---|---|---|---|
| 1 | `cyberacme` | Cyberacme | `#01d838` |
| 2 | `nucaloric` | Nucaloric | `#ff125d` |
| 3 | `traxus` | Traxus | `#ff7300` |
| 4 | `vesper` | Vesper | `#a855f7` |
| 5 | `arachne` | Arachne | `#00d4ff` |
| 6 | `volantis` | Volantis | `#facc15` |

### Filtering by faction

Append `?faction_id=<id>` to the backgrounds list endpoint:

```js
const arachneBackgrounds = await fetchBackgrounds({ factionId: 5 });
```

### FactionBadge component

```jsx
const FACTION_COLOURS = {
  cyberacme: '#01d838',
  nucaloric: '#ff125d',
  traxus:    '#ff7300',
  vesper:    '#a855f7',
  arachne:   '#00d4ff',
  volantis:  '#facc15',
};

function FactionBadge({ faction, name }) {
  const colour = FACTION_COLOURS[faction] ?? '#6b6b75';
  return (
    <span
      className="faction-badge"
      style={{
        background: colour,
        color: '#000',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
      }}
    >
      {name}
    </span>
  );
}
```

> Faction fields are `null` when a background has no faction association. Always null-check `faction_slug` before rendering the badge.
