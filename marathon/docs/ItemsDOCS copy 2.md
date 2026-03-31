# Marathon Items API — Documentation

**API Base URL:** `https://items.marathondb.gg`  
**Database:** `marathon-items-db-001` (Cloudflare D1 — SQLite)  
**Image storage:** `marathon-items-images` (Cloudflare R2)  
**CORS:** Open — all origins allowed (`*`)  
**Last updated:** March 2026

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Infrastructure](#2-infrastructure)
3. [Database Schema](#3-database-schema)
4. [Backend — API Reference](#4-backend--api-reference)
   - [Public Endpoints](#41-public-endpoints)
   - [Admin Endpoints](#42-admin-endpoints)
   - [Image Endpoints](#43-image-endpoints)
5. [Frontend — Admin Dashboard](#5-frontend--admin-dashboard)
6. [Response Format](#6-response-format)
7. [Item Fields Reference](#7-item-fields-reference)
8. [Frontend Integration Guide](#8-frontend-integration-guide)
9. [Deployment](#9-deployment)
10. [Local Development](#10-local-development)
11. [Future Additions](#11-future-additions)
12. [Seed Script](#12-seed-script)

---

## 1. Project Structure

```
MarathonItemsAPI/
├── wrangler.toml                  # Cloudflare Worker config
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── DOCS.md                        # This file
│
├── src/
│   ├── index.ts                   # Worker entry point, CORS, routing, image proxy
│   ├── types.ts                   # Shared TypeScript interfaces
│   └── routes/
│       ├── items.ts               # Public read-only API routes
│       └── admin.ts               # Admin CRUD + image upload routes
│
├── migrations/
│   ├── 0001_create_schema.sql     # Base schema: items table + indexes
│   ├── 0002_add_acquisition_note_verified.sql  # Adds acquisition_note, verified, value
│   ├── 0003_add_known_locations.sql            # Adds known_locations JSON column
│   ├── 0004_add_purchasable.sql               # Adds is_purchasable, purchase_credits, armory_location, armory_faction_rank (legacy)
│   └── 0005_add_vendor_barter.sql             # Adds vendor_listings and barter_trades JSON columns
│
├── scripts/
│   └── seed-items.mjs             # One-off seed script — scrapes marathondb.gg/items/,
│                                  # converts PNGs to WebP, uploads to R2, inserts DB records
│
├── admin/
│   └── index.html                 # Admin dashboard (open locally, never deployed)
│
└── public/
    └── .gitkeep                   # Placeholder so Cloudflare assets binding is valid
```

**Key rule:** `admin/index.html` is **never deployed** — it's opened directly from disk and communicates with the live worker. The `public/` folder is the Cloudflare assets directory and is intentionally empty.

---

## 2. Infrastructure

| Component | Service | Name |
|---|---|---|
| Compute | Cloudflare Workers | `marathon-items-api` |
| Database | Cloudflare D1 (SQLite) | `marathon-items-db-001` |
| Image storage | Cloudflare R2 | `marathon-items-images` |
| Framework | Hono (TypeScript) | v4.6.x |

### Wrangler bindings

| Binding name | Type | Resource |
|---|---|---|
| `ITEMS_DB` | D1 Database | `marathon-items-db-001` |
| `ITEMS_IMAGES` | R2 Bucket | `marathon-items-images` |

---

## 3. Database Schema

Single table: `items`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `slug` | TEXT | Unique URL-safe identifier, auto-generated from name |
| `name` | TEXT | Display name of the item |
| `item_type` | TEXT | Free-text type (e.g. Weapon, Armour, Consumable) |
| `rarity` | TEXT | Enum — see Rarities below |
| `description` | TEXT | Item description, nullable |
| `image_url` | TEXT | Path to R2 image e.g. `/images/items/slug.webp`, nullable |
| `acquisition_note` | TEXT | How / where the item is obtained, nullable |
| `verified` | INTEGER | `1` = verified correct, `0` = unverified. Defaults to `0`. |
| `value` | REAL | Numerical value (e.g. sell price), nullable |
| `known_locations` | TEXT | JSON array of location strings, nullable |
| `is_purchasable` | INTEGER | `1` = can be purchased, `0` = not purchasable. Defaults to `0`. |
| `purchase_credits` | INTEGER | **Legacy.** Superseded by `vendor_listings`. |
| `armory_location` | TEXT | **Legacy.** Superseded by `vendor_listings`. |
| `armory_faction_rank` | TEXT | **Legacy.** Superseded by `vendor_listings`. |
| `vendor_listings` | TEXT | JSON array of `VendorListing` objects — multi-vendor credit and barter data. Nullable. |
| `barter_trades` | TEXT | **Deprecated.** Barter trades are now nested inside each `VendorListing`. Column retained for compatibility. |
| `is_active` | INTEGER | `1` = active, `0` = hidden from public API |
| `created_at` | TEXT | ISO datetime, set on insert |
| `updated_at` | TEXT | ISO datetime, updated on every PUT |

### Rarities (enforced by DB CHECK constraint)

| Value | Display |
|---|---|
| `standard` | Standard |
| `enhanced` | Enhanced |
| `deluxe` | Deluxe |
| `superior` | Superior |
| `prestige` | Prestige |
| `contraband` | Contraband |

### Indexes

- `idx_items_slug` on `slug`
- `idx_items_rarity` on `rarity`
- `idx_items_item_type` on `item_type`
- `idx_items_active` on `is_active`

---

## 4. Backend — API Reference

Base URL: `https://items.marathondb.gg`

All responses follow the [standard response format](#6-response-format).

---

### 4.1 Public Endpoints

These are read-only and accessible without any credentials.

---

#### `GET /`
Health check. Returns API metadata.

**Response:**
```json
{
  "api": "Marathon Items API",
  "version": "1.0.0",
  "description": "Items database for Marathon video game.",
  "rarities": ["standard", "enhanced", "deluxe", "superior", "prestige", "contraband"],
  "endpoints": { ... }
}
```

---

#### `GET /api/items`

List all active items. Supports optional filters.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `type` | string | Filter by `item_type` (exact match) |
| `rarity` | string | Filter by rarity (exact match) |
| `active` | string | `1` (default) = active only, `0` = inactive only, `all` = everything |

**Example:**
```
GET /api/items?rarity=prestige
GET /api/items?type=Weapon&rarity=deluxe
GET /api/items?active=all
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [ { ...item }, { ...item } ]
}
```

---

#### `GET /api/items/:slug`

Get a single item by its slug.

**Example:**
```
GET /api/items/plasma-pistol
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "plasma-pistol",
    "name": "Plasma Pistol",
    "item_type": "Weapon",
    "rarity": "enhanced",
    "description": "A compact energy sidearm.",
    "image_url": "/images/items/plasma-pistol.webp",
    "acquisition_note": "Found in supply caches on Tau Ceti IV.",
    "verified": 1,
    "value": 250.0,
    "known_locations": ["Supply cache — Tau Ceti IV", "Boss drop — Zone 3"],
    "is_active": 1,
    "created_at": "2026-03-06T12:00:00",
    "updated_at": "2026-03-06T12:00:00"
  }
}
```

Returns `404` if not found.

---

#### `GET /api/item-types`

Returns all distinct `item_type` values currently in the database, sorted alphabetically. Used by the admin dashboard dropdown and can be used by the frontend for filter UIs.

**Response:**
```json
{
  "success": true,
  "count": 4,
  "data": ["Armour", "Consumable", "Tool", "Weapon"]
}
```

---

#### `GET /api/stats`

Aggregate counts for use in dashboards or frontend filters.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 42,
    "active": 38,
    "by_rarity": [
      { "rarity": "standard", "count": 10 },
      { "rarity": "enhanced", "count": 12 }
    ],
    "by_type": [
      { "item_type": "Weapon", "count": 15 },
      { "item_type": "Armour", "count": 8 }
    ]
  }
}
```

---

### 4.2 Admin Endpoints

Prefix: `/api/admin/`

These endpoints have no authentication — access control is by keeping the admin dashboard URL private. If authentication needs to be added in the future, an `Authorization` header check can be inserted at the router level in `src/routes/admin.ts`.

---

#### `GET /api/admin/items`

List all items including inactive ones. Accepts same `?type=` and `?rarity=` filters as the public endpoint.

---

#### `GET /api/admin/items/:slug`

Fetch a single item by slug (includes inactive).

---

#### `POST /api/admin/items`

Create a new item.

**Request body (JSON):**

| Field | Required | Description |
|---|---|---|
| `name` | ✅ | Item display name |
| `rarity` | ✅ | One of the 6 valid rarity values |
| `slug` | ❌ | Auto-generated from `name` if omitted |
| `item_type` | ❌ | Free-text type |
| `description` | ❌ | Item description |
| `image_url` | ❌ | Usually set via the upload endpoint |
| `acquisition_note` | ❌ | How / where the item is obtained |
| `verified` | ❌ | Defaults to `false` (0) |
| `value` | ❌ | Numerical value |
| `known_locations` | ❌ | Array of location strings (max 5) |
| `is_purchasable` | ❌ | Defaults to `false` (0) |
| `vendor_listings` | ❌ | Array of `VendorListing` objects. Omit or pass `[]` for none. |
| `is_active` | ❌ | Defaults to `true` |

**`VendorListing` object schema:**

| Field | Type | Description |
|---|---|---|
| `location` | string \| null | One of: `Cyac`, `Nucal`, `Traxus`, `Mida`, `Arachne`, `Sekgen` |
| `credits` | number \| null | Credit cost at this vendor |
| `receive_quantity` | number \| null | How many of this item you receive per credit purchase |
| `faction_rank` | string \| null | Faction rank required to unlock this vendor listing |
| `barter_trades` | BarterTrade[] | Barter options at this vendor (may be empty) |

**`BarterTrade` object schema:**

| Field | Type | Description |
|---|---|---|
| `give_items` | BarterCost[] | Array of items required for this trade |
| `credits` | number \| null | Credit cost for this barter (if any) |
| `receive_quantity` | number | How many of this item you receive |
| `faction_rank` | string \| null | Faction rank required for this specific barter |

**`BarterCost` object schema:**

| Field | Type | Description |
|---|---|---|
| `item` | string | Name of the item to trade in |
| `quantity` | number | How many of the item to trade |

**Response:** `201` with the created item.

---

#### `PUT /api/admin/items/:slug`

Update any fields on an existing item. Only send the fields you want to change.

**Request body (JSON):** any subset of `name`, `item_type`, `rarity`, `description`, `image_url`, `acquisition_note`, `verified`, `value`, `known_locations`, `is_purchasable`, `vendor_listings`, `is_active`.

**Response:** `200` with the updated item.

---

#### `DELETE /api/admin/items/:slug`

Permanently delete an item. Also attempts to delete the associated R2 image at `items/{slug}.webp`. This is irreversible.

**Response:**
```json
{ "success": true, "message": "Item \"plasma-pistol\" deleted" }
```

---

#### `POST /api/admin/upload-image?slug=:slug`

Upload a pre-processed webp image for an item. The dashboard handles resizing client-side — this endpoint just stores the blob.

**Request:** `multipart/form-data` with a field named `image` (file, `image/webp`).

**Query parameter:** `slug` — the item slug this image belongs to.

**Storage path:** R2 key `items/{slug}.webp`

**Response:**
```json
{ "success": true, "url": "/images/items/plasma-pistol.webp" }
```

The returned `url` must then be saved to the item via a `PUT /api/admin/items/:slug` call with `{ "image_url": url }`. The admin dashboard does this automatically.

---

### 4.3 Image Endpoints

#### `GET /images/items/:slug.webp`

Serves the item image directly from R2 with appropriate headers.

- `Content-Type: image/webp`
- `Cache-Control: public, max-age=604800, immutable` (7-day browser + CDN cache)
- `ETag` for conditional requests

Returns `404` if no image has been uploaded for that slug.

---

## 5. Frontend — Admin Dashboard

**File:** `admin/index.html`  
**How to open:** Double-click the file, or open it in any browser. No server required.  
**API target:** Always hits `https://items.marathondb.gg` by default. Can be overridden with `?api=http://localhost:8787` for local `wrangler dev` testing.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Marathon Items"  [Admin Dashboard]        [+ New Item] │
├───────────────────────────────────────────────────────────────── │
│ Stats: Total | Active | Item Types | Rarities Used              │
├──────────────────┬──────────────────────────────────────────────┤
│ Sidebar          │ Main Panel (tabs)                            │
│                  │                                              │
│ [Search]         │  Info  |  Image  |  Live API                │
│                  │                                              │
│ Rarity filters   │  Info tab:                                   │
│ Type filters     │    Name, Item Type, Rarity, Active toggle,   │
│                  │    Description, Acquisition Note, Value,     │
│                  │    Verified toggle, Purchase Info section,   │
│                  │    Known Locations                           │
│ Item list        │                                              │
│  (scrollable)    │  Image tab:                                  │
│                  │    Drop/click upload → auto 128×128 webp     │
│                  │    conversion → preview → upload button      │
│                  │                                              │
│                  │  Live API tab:                               │
│                  │    Live JSON from /api/items/:slug           │
└──────────────────┴──────────────────────────────────────────────┘
```

### Features

- **Item list** — shows all items (including inactive), searchable, filterable by rarity and type
- **Rarity colour coding** — each rarity has a distinct colour throughout the UI
- **Type filter pills** — auto-populated from the API; no code change needed when new types are added
- **Active/inactive toggle** — inactive items are hidden from the public API but still editable
- **Purchase Info section** — toggled on/off via a **Purchasable** toggle. When enabled, reveals:
  - **Vendor Listings** — one card per vendor, each containing:
    - **Armory Location** — dropdown: `Cyac`, `Nucal`, `Traxus`, `Mida`, `Arachne`, `Sekgen`
    - **Credits** — integer credit cost
    - **For X of this item** — quantity received per credit purchase
    - **Faction Rank Required** — free-text rank to unlock the listing (e.g. `Trusted`, `Rank 2`)
    - **Barter Trades** — nested per-vendor; each trade can require multiple items (with quantities) and/or credits
- **Create modal** — name auto-generates a slug preview, optional image upload and purchase info in the same flow
- **Image upload flow:**
  1. Pick or drag a `.png`, `.jpg`, `.jpeg`, or `.webp` file
  2. Browser Canvas resizes to exactly 128×128 and converts to `.webp` (quality 0.9) client-side
  3. Preview shown before upload
  4. On confirm: blob POSTed to `/api/admin/upload-image`, URL saved back to item via PUT
- **Live API tab** — fetches and displays the raw public API response for the selected item
- **Toast notifications** — success/error feedback on all actions

### Rarity Colours

| Rarity | Colour |
|---|---|
| Standard | `#9ca3af` (grey) |
| Enhanced | `#4ade80` (green) |
| Deluxe | `#60a5fa` (blue) |
| Superior | `#c084fc` (purple) |
| Prestige | `#fbbf24` (gold) |
| Contraband | `#f87171` (red) |

### Slug Generation

Slugs are auto-generated from the item name:
- Lowercase
- Spaces → hyphens
- Special characters stripped
- Consecutive hyphens collapsed

Example: `"Plasma Pistol MK2"` → `"plasma-pistol-mk2"`

---

## 6. Response Format

All API endpoints return JSON in this shape:

**Success:**
```json
{
  "success": true,
  "data": { ... },      // object or array
  "count": 10           // present on list endpoints
}
```

**Error:**
```json
{
  "success": false,
  "error": "Item not found"
}
```

**HTTP status codes used:**
- `200` — OK
- `201` — Created
- `400` — Bad request (validation failure)
- `404` — Not found

---

## 7. Item Fields Reference

> See [Section 8 — Frontend Integration Guide](#8-frontend-integration-guide) for TypeScript types, fetch examples, and image URL patterns.

| Field | Notes |
|---|---|
| `slug` | URL-safe, unique. Never changes after creation. Used as the stable identifier in all URLs. |
| `name` | Display name, can be updated freely. |
| `item_type` | Fully free-text. Any value is valid. Previously used values appear as autocomplete suggestions in the admin. No code change required to add new types. |
| `rarity` | Strictly one of 6 values. Enforced at DB and API level. |
| `description` | Plain text. No HTML. |
| `image_url` | Relative path like `/images/items/slug.webp`. Nullable if no image uploaded yet. |
| `acquisition_note` | Plain text. Where / how the item is obtained. Nullable. |
| `verified` | `1` = data has been verified correct. `0` = unverified. |
| `value` | Floating-point number. Nullable. |
| `known_locations` | Array of up to 5 location strings. Returns `[]` if none set. Stored as JSON in the DB. |
| `is_purchasable` | `1` = item can be purchased from one or more vendors. `0` = not purchasable. |
| `vendor_listings` | Array of vendor listing objects. Each has: `location`, `credits`, `receive_quantity`, `faction_rank`, and `barter_trades[]`. Returns `[]` if none set. Stored as JSON. |
| `is_active` | `1` = visible on public API. `0` = hidden (admin-only). |

---

## 8. Frontend Integration Guide

All public endpoints are unauthenticated, CORS-open (`*`), and return JSON. No API key or proxy is needed — the frontend can call them directly from the browser.

---

### Base URL constant

```ts
const API = 'https://items.marathondb.gg';
```

---

### TypeScript types

Copy these into your frontend project:

```ts
export type Rarity = 'standard' | 'enhanced' | 'deluxe' | 'superior' | 'prestige' | 'contraband';

export type ArmoryLocation = 'Cyac' | 'Nucal' | 'Traxus' | 'Mida' | 'Arachne' | 'Sekgen';

export interface BarterCost {
  item:     string;   // name of the item to trade in
  quantity: number;   // how many of the item to trade
}

export interface BarterTrade {
  give_items:       BarterCost[];   // items required for this trade
  credits:          number | null;  // credit cost for this barter (if any)
  receive_quantity: number;
  faction_rank:     string | null;  // rank required for this barter
}

export interface VendorListing {
  location:         ArmoryLocation | null;
  credits:          number | null;
  receive_quantity: number | null;  // quantity received per credit purchase
  faction_rank:     string | null;  // rank required to unlock this listing
  barter_trades:    BarterTrade[];
}

export interface Item {
  id:              number;
  slug:            string;
  name:            string;
  item_type:       string;
  rarity:          Rarity;
  description:     string | null;
  image_url:       string | null;   // relative, e.g. "/images/items/patch-kit.webp"
  acquisition_note: string | null;
  verified:        0 | 1;
  value:           number | null;
  known_locations: string[];        // always an array, never null
  is_purchasable:  0 | 1;
  vendor_listings: VendorListing[]; // always an array, never null
  is_active:       0 | 1;
  created_at:      string;          // ISO datetime string
  updated_at:      string;
}

export interface ItemsResponse {
  success: true;
  count:   number;
  data:    Item[];
}

export interface ItemResponse {
  success: true;
  data:    Item;
}

export interface StatsResponse {
  success: true;
  data: {
    total:     number;
    active:    number;
    by_rarity: { rarity: Rarity; count: number }[];
    by_type:   { item_type: string; count: number }[];
  };
}
```

---

### Fetching items

```ts
const API = 'https://items.marathondb.gg';

// All active items
async function getItems(filters?: { type?: string; rarity?: Rarity }): Promise<Item[]> {
  const params = new URLSearchParams();
  if (filters?.type)   params.set('type', filters.type);
  if (filters?.rarity) params.set('rarity', filters.rarity);
  const res = await fetch(`${API}/api/items?${params}`);
  const json: ItemsResponse = await res.json();
  return json.data;
}

// Single item by slug
async function getItem(slug: string): Promise<Item | null> {
  const res = await fetch(`${API}/api/items/${slug}`);
  if (res.status === 404) return null;
  const json: ItemResponse = await res.json();
  return json.data;
}

// All item types (for filter UI population)
async function getItemTypes(): Promise<string[]> {
  const res = await fetch(`${API}/api/item-types`);
  const json = await res.json();
  return json.data;
}

// Stats (counts by rarity / type)
async function getStats() {
  const res = await fetch(`${API}/api/stats`);
  const json: StatsResponse = await res.json();
  return json.data;
}
```

---

### Building image URLs

`image_url` is a **root-relative path** (e.g. `/images/items/patch-kit.webp`).
Prefix it with the API base to get a fully-qualified URL:

```ts
function itemImageUrl(item: Item, fallback = '/img/placeholder.webp'): string {
  return item.image_url
    ? `https://items.marathondb.gg${item.image_url}`
    : fallback;
}
```

Images are served with `Cache-Control: public, max-age=604800` — browsers and CDNs will cache them for 7 days.

---

### Rarity colours

Use these consistently across item cards, badges, and borders:

```ts
export const RARITY_COLOUR: Record<Rarity, string> = {
  standard:   '#9ca3af',  // grey
  enhanced:   '#4ade80',  // green
  deluxe:     '#60a5fa',  // blue
  superior:   '#c084fc',  // purple
  prestige:   '#fbbf24',  // gold
  contraband: '#f87171',  // red
};
```

---

### Rarity display order

The API returns items sorted by rarity weight (standard → contraband). If you need to sort client-side:

```ts
const RARITY_WEIGHT: Record<Rarity, number> = {
  standard:   1,
  enhanced:   2,
  deluxe:     3,
  superior:   4,
  prestige:   5,
  contraband: 6,
};

items.sort((a, b) => RARITY_WEIGHT[a.rarity] - RARITY_WEIGHT[b.rarity]);
```

---

### Common UI patterns

**Item card (React example)**
```tsx
function ItemCard({ item }: { item: Item }) {
  const colour = RARITY_COLOUR[item.rarity];
  return (
    <div style={{ borderColor: colour }} className="item-card">
      <img src={itemImageUrl(item)} alt={item.name} width={64} height={64} />
      <span className="item-name">{item.name}</span>
      <span className="item-type">{item.item_type}</span>
      <span style={{ color: colour }} className="item-rarity">
        {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
      </span>
    </div>
  );
}
```

**Filter bar — populate types dynamically**
```ts
// On mount, fetch types so the filter bar never goes stale
const types = await getItemTypes();  // ["ammo", "backpack", "consumable", ...]
```

**Verified badge**
```ts
// item.verified is 0 or 1 from the DB
const isVerified = item.verified === 1;
```

**Known locations list**
```tsx
// known_locations is always an array — safe to .map() without null check
{item.known_locations.map(loc => <li key={loc}>{loc}</li>)}
```

**Purchase info**
```tsx
// Guard on is_purchasable before rendering purchase details
{item.is_purchasable === 1 && item.vendor_listings.length > 0 && (
  <div className="purchase-info">
    {item.vendor_listings.map((v, i) => (
      <div key={i} className="vendor-listing">
        {v.location       && <span>Vendor: {v.location}</span>}
        {v.credits != null && (
          <span>
            {v.credits} credits
            {v.receive_quantity != null && v.receive_quantity !== 1 && ` × ${v.receive_quantity}`}
          </span>
        )}
        {v.faction_rank   && <span>Rank required: {v.faction_rank}</span>}
        {v.barter_trades.map((b, j) => (
          <div key={j} className="barter-trade">
            Trade{' '}
            {b.give_items.map((g, k) => (
              <span key={k}>{k > 0 && ' + '}{g.quantity}× {g.item}</span>
            ))}
            {b.credits != null && <span>{b.give_items.length > 0 && ' + '}{b.credits} credits</span>}
            {' '}for {b.receive_quantity} of this item
            {b.faction_rank && <span> (Rank: {b.faction_rank})</span>}
          </div>
        ))}
      </div>
    ))}
  </div>
)}
```

---

## 9. Deployment

### Deploy the worker

```bash
cd MarathonItemsAPI
npx wrangler deploy
```

### Apply database migrations

First time (or after adding a new migration file):
```bash
npx wrangler d1 migrations apply ITEMS_DB --remote
```

Check what tables exist:
```bash
npx wrangler d1 execute ITEMS_DB --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

### Adding a new migration

1. Create a new file in `migrations/` — name it `0005_description.sql`, `0006_...` etc.
2. Write the SQL (`ALTER TABLE`, `CREATE TABLE`, etc.)
3. Apply the migration to the remote database:
   ```bash
   npx wrangler d1 migrations apply ITEMS_DB --remote
   ```
4. Redeploy the worker so the updated route code goes live:
   ```bash
   npx wrangler deploy
   ```

> **Important:** Both steps are required. Applying the migration alone adds the columns to the database but the live worker still runs the old code until redeployed. Skipping the deploy will cause new fields to silently not save.

Wrangler tracks which migrations have been applied in a `d1_migrations` table automatically.

### Custom domain (`items.marathondb.gg`)

The custom domain is **active**. The `[[custom_domains]]` entry in `wrangler.toml` is already configured. All frontend code and the admin dashboard target `https://items.marathondb.gg` directly.

---

## 10. Local Development

```bash
# Start local dev server (uses local D1 + R2 simulators)
npx wrangler dev

# Open admin dashboard pointed at local server
# Open admin/index.html in browser, then append:
?api=http://localhost:8787

# Apply migrations to local DB
npx wrangler d1 migrations apply ITEMS_DB --local

# Type-check source files
npx tsc --noEmit
```

---

## 11. Future Additions

Things likely to be added and notes for when they are:

- **Additional item fields** — add columns via a new migration file (`0004_...sql`) using `ALTER TABLE items ADD COLUMN ...`. No existing data is affected.
- **Item tags / keywords** — could be a JSON array column or a separate `item_tags` join table depending on filtering needs.
- **Authentication on admin routes** — insert a middleware check in `src/routes/admin.ts` that reads a `Authorization: Bearer <secret>` header against a Cloudflare Worker Secret (`npx wrangler secret put ADMIN_SECRET`).
- **Bulk import** — a `POST /api/admin/bulk-import` route accepting a JSON array of items. (A one-off seed script already exists at `scripts/seed-items.mjs` — see below.)
- **Pagination** — add `?limit=` and `?offset=` query params to list endpoints.
- **Frontend integration** — see [Section 8 — Frontend Integration Guide](#8-frontend-integration-guide) for ready-to-use TypeScript types and fetch helpers.
- **Search endpoint** — `GET /api/items?q=plasma` style full-text search (D1 supports `LIKE` queries).

---

## 12. Seed Script

**File:** `scripts/seed-items.mjs`

A Node.js script that bulk-imports items from `marathondb.gg/items/` into the API. Run it whenever you need to re-seed or top-up items from the source site.

### What it does (per item)

1. Downloads the item's PNG image from `helpbot.marathondb.gg`
2. Converts it to WebP (90% quality) using `sharp`
3. Uploads the WebP to R2 via `POST /api/admin/upload-image`
4. Creates the DB record via `POST /api/admin/items`

Items with `item_type` of **Implant**, **Core**, or **Mod** are excluded — those types have dedicated pages on MarathonDB and are managed separately.

Re-running the script is safe: slugs are unique in the DB, so any item that already exists is skipped automatically.

### Usage

```bash
# Install dependencies (one-time)
npm install

# Live run (hits https://items.marathondb.gg)
node scripts/seed-items.mjs

# Dry run — prints items and slugs, no API calls
DRY_RUN=1 node scripts/seed-items.mjs

# Target a different API base (e.g. local dev)
API_BASE=http://localhost:8787 node scripts/seed-items.mjs
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `API_BASE` | `https://items.marathondb.gg` | API host to seed against |
| `DRY_RUN` | `0` | Set to `1` to log only, no writes |

### Adding more items to the seed list

Edit the `ITEMS` array at the top of `scripts/seed-items.mjs`. Each entry has:

```js
{ name: 'Item Name', type: 'item-type', rarity: 'rarity', imageUrl: 'https://...' }
```

Then re-run the script — only new items (unrecognised slugs) will be inserted.
