# Implants API — Frontend Integration Guide

> **API Base URL:** `https://implants.marathondb.gg`
> **Version:** 3.0.0
> **Last Updated:** June 2025
> **Total Implants:** 88 (30 head · 24 torso · 24 legs · 10 shield)

---

## Changelog

### v2.1.0 → v3.0.0

| Change | Details |
|---|---|
| **`server_slam_verified` → `verified`** | Renamed to a general verification flag. |
| **`is_purchaseable` added** | Boolean flag + `vendor_name`, `vendor_rank`, `purchase_location` fields for store-buyable implants. |
| **Ratings system added** | 1–5 emoji community rating system (🔥😍😐👎💩), same as cores/runner-skins. |
| **`/api/implants/hot` added** | Top-rated implants endpoint (min 3 votes). |
| **`/api/implants/counts` added** | Implant count per slot. |
| **`rating` field on all items** | Every implant now includes a `rating` field (`null` when no votes). |

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [List Implants](#1-list-implants)
   - [Implant Counts](#2-implant-counts)
   - [Hot Implants](#3-hot-implants)
   - [Implants by Slot](#4-implants-by-slot)
   - [Implant Detail](#5-implant-detail)
   - [Rate an Implant](#6-rate-an-implant)
   - [Get Implant Ratings](#7-get-implant-ratings)
   - [Stats Summary](#8-stats-summary)
3. [Data Model](#data-model)
4. [Slot Reference](#slot-reference)
5. [Rarity Hierarchy](#rarity-hierarchy)
6. [Stat Names Reference](#stat-names-reference)
7. [Traits](#traits)
8. [Verified Flag](#verified-flag)
9. [Purchaseable Implants](#purchaseable-implants)
10. [Ratings System](#ratings-system)
11. [Frontend Implementation Patterns](#frontend-implementation-patterns)
12. [TypeScript Types](#typescript-types)
13. [Test URLs](#test-urls)
14. [Implant Families Reference](#implant-families-reference)

---

## Quick Start

```ts
const API = 'https://implants.marathondb.gg';

// Fetch all active implants (includes stats + rating)
const res = await fetch(`${API}/api/implants`);
const { success, count, data } = await res.json();

// Fetch all head implants
const res2 = await fetch(`${API}/api/implants/slot/head`);
const { data: headImplants } = await res2.json();

// Fetch a single implant by slug (includes variants + rating)
const res3 = await fetch(`${API}/api/implants/augmented-capacitors-v1`);
const { data: implant } = await res3.json();

// Only purchaseable implants
const res4 = await fetch(`${API}/api/implants?purchaseable=true`);
const { data: shopImplants } = await res4.json();

// Top rated implants
const res5 = await fetch(`${API}/api/implants/hot`);
const { data: hotImplants } = await res5.json();

// Implant count per slot (for badges)
const res6 = await fetch(`${API}/api/implants/counts`);
const { data: counts } = await res6.json();
// counts = { head: 30, torso: 24, legs: 24, shield: 10 }
```

**CORS** is fully open (`origin: *`) — call directly from any frontend.

---

## API Endpoints

### Health Check

```
GET /
```

Returns API metadata:

```json
{
  "api": "Marathon Implants API",
  "version": "3.0.0",
  "description": "Implant stats, traits, ratings, and purchasing info. Each runner equips 1 head + 1 torso + 1 legs + 1 shield implant.",
  "slots": ["head", "torso", "legs", "shield"],
  "endpoints": {
    "implants": "/api/implants",
    "implant_detail": "/api/implants/:slug",
    "implant_by_slot": "/api/implants/slot/:slot",
    "implant_counts": "/api/implants/counts",
    "implant_hot": "/api/implants/hot",
    "rate_implant": "/api/implants/:slug/rate",
    "implant_ratings": "/api/implants/:slug/ratings",
    "traits": "/api/traits",
    "stats": "/api/stats"
  }
}
```

---

### 1. List Implants

```
GET /api/implants
```

Returns all active implants with enriched stats and rating. This is the **primary browse endpoint**.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `slot` | string | Filter by slot: `head`, `torso`, `legs`, `shield` |
| `rarity` | string | Filter by rarity: `standard`, `enhanced`, `deluxe`, `superior`, `prestige` |
| `verified` | `1` | Return only verified implants |
| `purchaseable` | `true` or `1` | Return only purchaseable implants |
| `active` | string | `"false"` returns inactive only; omit for active-only (default) |

**Response:**

```json
{
  "success": true,
  "count": 88,
  "data": [
    {
      "id": 1,
      "slug": "augmented-capacitors-v1",
      "name": "Augmented Capacitors V1",
      "slot": "head",
      "rarity": "standard",
      "description": "Head implant that boosts Prime Recovery.",
      "traits": [],
      "unique_trait_name": null,
      "unique_trait_description": null,
      "credits": 25,
      "icon_url": "assets/items/implants/head-72x72.png",
      "verified": 0,
      "is_active": 1,
      "is_purchaseable": 0,
      "vendor_name": null,
      "vendor_rank": null,
      "purchase_location": null,
      "created_at": "2026-03-01T03:25:37.000Z",
      "updated_at": "2026-03-01T03:25:37.000Z",
      "stats": [
        { "stat_name": "primeRecovery", "stat_value": 10 }
      ],
      "rating": null
    }
  ]
}
```

> **Note:** `rating` is `null` when an implant has zero votes. See [Ratings System](#ratings-system) for the shape when votes exist.

**Default ordering:** slot (head → torso → legs → shield), then rarity (standard → prestige), then name A–Z.

---

### 2. Implant Counts

```
GET /api/implants/counts
```

Implant count grouped by slot. Useful for badges on slot selection UIs.

**Response:**

```json
{
  "success": true,
  "data": {
    "head": 30,
    "torso": 24,
    "legs": 24,
    "shield": 10
  }
}
```

---

### 3. Hot Implants

```
GET /api/implants/hot
```

Top implants by `score_percent`, minimum 3 votes. Returns up to 10 by default.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | `10` | Max results (max `50`) |

**Response:**

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 5,
      "slug": "augmented-capacitors-v5",
      "name": "Augmented Capacitors V5",
      "slot": "head",
      "rarity": "prestige",
      "credits": 1800,
      "icon_url": "assets/items/implants/head-72x72.png",
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
        "last_updated": "2025-06-10T14:00:00.000Z"
      }
    }
  ]
}
```

---

### 4. Implants by Slot

```
GET /api/implants/slot/{slot}
```

**Valid slot values:** `head`, `torso`, `legs`, `shield`

Returns all active implants for the given slot, sorted by rarity then name. Includes enriched stats and rating.

**This is the primary endpoint for equipment screens** — when a user selects a slot, fetch implants for that slot.

```json
{
  "success": true,
  "slot": "legs",
  "count": 24,
  "data": [
    {
      "id": 51,
      "slug": "bionic-leg-upgrades-v1",
      "name": "Bionic Leg Upgrades V1",
      "slot": "legs",
      "rarity": "standard",
      "description": "Legs implant that increases agility.",
      "traits": [],
      "unique_trait_name": null,
      "unique_trait_description": null,
      "credits": 25,
      "icon_url": "assets/items/implants/legs-72x72.png",
      "verified": 0,
      "is_active": 1,
      "is_purchaseable": 0,
      "vendor_name": null,
      "vendor_rank": null,
      "purchase_location": null,
      "stats": [
        { "stat_name": "agility",            "stat_value": 15 },
        { "stat_name": "fallResistance",      "stat_value": 5  },
        { "stat_name": "shieldRecoverySpeed", "stat_value": -5 }
      ],
      "rating": null
    }
  ]
}
```

Returns `400` for invalid slot values:

```json
{ "success": false, "error": "Invalid slot. Valid: head, torso, legs, shield" }
```

---

### 5. Implant Detail

```
GET /api/implants/{slug}
```

Returns a single implant with **full enrichment**: stats, traits, family variants, and rating.

```json
{
  "success": true,
  "data": {
    "id": 5,
    "slug": "augmented-capacitors-v5",
    "name": "Augmented Capacitors V5",
    "slot": "head",
    "rarity": "prestige",
    "description": "Head implant that boosts Prime Recovery.",
    "traits": [
      {
        "name": "Efficient Curatives",
        "description": "Using a Shield Charge or Patch Kit has a chance to double its effectiveness."
      }
    ],
    "unique_trait_name": "Power Surge",
    "unique_trait_description": "Activating your Prime ability grants +20 Prime Recovery for 5 seconds.",
    "credits": 1800,
    "icon_url": "assets/items/implants/head-72x72.png",
    "verified": 0,
    "is_active": 1,
    "is_purchaseable": 0,
    "vendor_name": null,
    "vendor_rank": null,
    "purchase_location": null,
    "created_at": "2026-03-01T03:25:37.000Z",
    "updated_at": "2026-03-01T03:25:37.000Z",
    "stats": [
      { "stat_name": "hardware",      "stat_value": -10 },
      { "stat_name": "primeRecovery", "stat_value": 50  }
    ],
    "variants": [
      {
        "id": 1, "slug": "augmented-capacitors-v1",
        "name": "Augmented Capacitors V1",
        "rarity": "standard", "credits": 25, "verified": 0
      },
      {
        "id": 2, "slug": "augmented-capacitors-v2",
        "name": "Augmented Capacitors V2",
        "rarity": "enhanced", "credits": 70, "verified": 0
      },
      {
        "id": 3, "slug": "augmented-capacitors-v3",
        "name": "Augmented Capacitors V3",
        "rarity": "deluxe", "credits": 200, "verified": 0
      },
      {
        "id": 4, "slug": "augmented-capacitors-v4",
        "name": "Augmented Capacitors V4",
        "rarity": "superior", "credits": 600, "verified": 0
      }
    ],
    "rating": null
  }
}
```

**Key additions vs list endpoint:**
- `traits` always present (array of `{name, description}` — empty `[]` for non-Prestige)
- `variants` — other tier members of the same family, sorted by rarity, **excluding the current implant**
- `rating` — community rating aggregate (or `null` if no votes)
- Returns `404` if slug not found

---

### 6. Rate an Implant

```
POST /api/implants/{slug}/rate
```

Submit or update a community rating (1–5 emoji). One vote per `device_token` per implant — submitting again updates the previous vote.

**Request Body:**

```json
{
  "rating": 5,
  "device_token": "sha256-of-device-fingerprint"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `rating` | integer | **Yes** | 1–5 (1=💩, 2=👎, 3=😐, 4=😍, 5=🔥) |
| `device_token` | string | **Yes** | SHA-256 hash of a stable device identifier |

**Response:**

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
    "last_updated": "2025-06-10T12:00:00.000Z"
  }
}
```

> If the user already voted, `previous_rating` shows their previous value and `message` will be `"Rating updated"`.

---

### 7. Get Implant Ratings

```
GET /api/implants/{slug}/ratings
```

Get the rating aggregate for a single implant.

**Response:**

```json
{
  "success": true,
  "implant_slug": "augmented-capacitors-v5",
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
    "last_updated": "2025-06-10T08:00:00.000Z"
  }
}
```

`score_percent` formula: `((sum_of_ratings / total_votes) - 1) / 4 × 100`
This maps a 1.0 average → 0% and a 5.0 average → 100%.

**404 Response:**

```json
{ "success": false, "error": "No ratings found for 'unknown-slug'" }
```

---

### 8. Stats Summary

```
GET /api/stats
```

Returns aggregate counts — useful for dashboards and overview displays.

```json
{
  "success": true,
  "total": 88,
  "verified": 0,
  "by_slot": [
    { "slot": "head",   "count": 30 },
    { "slot": "torso",  "count": 24 },
    { "slot": "legs",   "count": 24 },
    { "slot": "shield", "count": 10 }
  ],
  "by_rarity": [
    { "rarity": "standard",  "count": 17 },
    { "rarity": "enhanced",  "count": 19 },
    { "rarity": "deluxe",    "count": 18 },
    { "rarity": "superior",  "count": 13 },
    { "rarity": "prestige",  "count": 21 }
  ],
  "stat_names": [
    "agility", "fallResistance", "finisherSiphon", "firewall",
    "hardware", "heatCapacity", "lootSpeed", "meleeDamage",
    "pingDuration", "primeRecovery", "reviveSpeed",
    "selfRepairSpeed", "tacticalRecovery"
  ]
}
```

---

## Data Model

### Implant Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Internal database ID |
| `slug` | `string` | URL-safe unique identifier (e.g. `augmented-capacitors-v1`) |
| `name` | `string` | Display name (e.g. `Augmented Capacitors V1`) |
| `slot` | `"head" \| "torso" \| "legs" \| "shield"` | Equipment slot |
| `rarity` | `"standard" \| "enhanced" \| "deluxe" \| "superior" \| "prestige"` | Tier |
| `description` | `string \| null` | Short gameplay description |
| `traits` | `Trait[]` | Shared passive traits (e.g. "Efficient Curatives") — may appear on any rarity |
| `unique_trait_name` | `string \| null` | Name of the implant's named unique ability (Prestige tier) |
| `unique_trait_description` | `string \| null` | Effect description of the unique ability |
| `credits` | `number` | In-game credit cost |
| `icon_url` | `string \| null` | Relative asset path — use [slot icon CDN URLs](#slot-reference) for reliable icons |
| `verified` | `0 \| 1` | Whether data is admin-confirmed |
| `is_active` | `0 \| 1` | Whether implant is currently available in-game |
| `is_purchaseable` | `0 \| 1` | Whether this implant can be bought from an in-game vendor |
| `vendor_name` | `string \| null` | Vendor name (only when purchaseable) |
| `vendor_rank` | `string \| null` | Required vendor rank to purchase |
| `purchase_location` | `string \| null` | In-game location of the vendor |
| `stats` | `Stat[]` | Array of stat modifiers (present on all endpoints) |
| `rating` | `RatingResponse \| null` | Community rating aggregate — `null` when no votes |
| `variants` | `VariantSummary[]` | Same-family other tiers — **detail endpoint only** |

### Stat Object

```ts
{
  stat_name:  string;   // camelCase key, e.g. "primeRecovery"
  stat_value: number;   // positive = buff, negative = penalty/trade-off
}
```

### Trait Object

```ts
{
  name:        string;  // Short trait name, e.g. "Power Surge"
  description: string;  // Full effect description
}
```

### Variant Summary

```ts
{
  id:       number;
  slug:     string;
  name:     string;
  rarity:   ImplantRarity;
  credits:  number;
  verified: 0 | 1;
}
```

### Rating Response

```ts
{
  total_votes:   number;
  score_percent: number;       // 0–100
  distribution: {
    fire:  { count: number; percent: number };  // 5 🔥
    love:  { count: number; percent: number };  // 4 😍
    meh:   { count: number; percent: number };  // 3 😐
    nah:   { count: number; percent: number };  // 2 👎
    trash: { count: number; percent: number };  // 1 💩
  };
  last_updated: string | null;
}
```

---

## Slot Reference

Slot icons are served from the Marathon helpbot CDN. Use these directly in your UI — the `icon_url` field in API responses is a relative path.

| Slot | CDN Icon URL | Implant families |
|------|--------------|------------------|
| `head` | `https://helpbot.marathondb.gg/assets/items/implants/head-72x72.png` | Augmented Capacitors, Energy Harvesting, Ping+, Regen, Sprint Kit, Thick Skull |
| `torso` | `https://helpbot.marathondb.gg/assets/items/implants/torso-72x72.png` | Helping Hands, Hurting Hands, Knife Fight, Nimble Fingers, Survival Kit |
| `legs` | `https://helpbot.marathondb.gg/assets/items/implants/legs-72x72.png` | Bionic Leg Upgrades, Distance Runner, Graceful Landings, Solid Stance, Strike Kit |
| `shield` | `https://helpbot.marathondb.gg/assets/items/implants/shield-72x72.png` | Firewall, Protector, Reinforced Shields, Spectre Armor, Volt Resistance |

```ts
const SLOT_ICONS: Record<string, string> = {
  head:   'https://helpbot.marathondb.gg/assets/items/implants/head-72x72.png',
  torso:  'https://helpbot.marathondb.gg/assets/items/implants/torso-72x72.png',
  legs:   'https://helpbot.marathondb.gg/assets/items/implants/legs-72x72.png',
  shield: 'https://helpbot.marathondb.gg/assets/items/implants/shield-72x72.png',
};

// Get icon for any implant
const iconUrl = SLOT_ICONS[implant.slot];
```

---

## Rarity Hierarchy

| Rarity | Tier | Typical Credits | Notes |
|--------|------|----------------|-------|
| `standard` | V1 | 25 cr | Base tier, minimal stats |
| `enhanced` | V2 | 70 cr | Moderate improvement |
| `deluxe` | V3 | 200 cr | Significant boost |
| `superior` | V4 | 600 cr | High-end stats |
| `prestige` | V5 | 1800 cr | Max tier — includes a **Unique Trait** ability |

> **Shield exceptions:** Protector credits are 150 / 400 / 900. Reinforced Shields V2 costs 3000 cr. Spectre Armor costs 3000 cr.

---

## Stat Names Reference

All `stat_value` values are **additive modifiers**. Positive = buff, negative = trade-off penalty.

| Stat name | Description |
|-----------|-------------|
| `agility` | Sprint and movement speed |
| `fallResistance` | Fall damage reduction |
| `finisherSiphon` | Health/resource gained on finisher kills |
| `firewall` | Firewall strength (shield implants) |
| `hardware` | Hardware capacity (ability charges/energy) |
| `heatCapacity` | Heat management capacity |
| `lootSpeed` | Looting and interaction speed |
| `meleeDamage` | Melee damage modifier |
| `pingDuration` | Duration of ping/sensor effects |
| `primeRecovery` | Prime ability cooldown recovery rate |
| `reviveSpeed` | Speed of reviving teammates |
| `selfRepairSpeed` | Passive health regeneration speed |
| `tacticalRecovery` | Tactical ability cooldown recovery rate |

---

## Traits

Implants have two distinct trait concepts returned by the API:

### 1. Unique Trait (`unique_trait_name` + `unique_trait_description`)

The named, gold-highlighted ability exclusive to a specific implant. Only Prestige (V5) implants have this.

```json
{
  "unique_trait_name": "Power Surge",
  "unique_trait_description": "Activating your Prime ability grants +20 Prime Recovery for 5 seconds."
}
```

> **Legacy note:** Implants seeded before March 2026 may have `unique_trait_name: null` and instead carry `{ name: "Unique Trait", description: "..." }` inside the `traits` array. Handle both when rendering:

```ts
function getUniqueTrait(implant: Implant): { name: string; description: string } | null {
  // New style — dedicated columns
  if (implant.unique_trait_description) {
    return {
      name:        implant.unique_trait_name ?? 'Unique Trait',
      description: implant.unique_trait_description,
    };
  }
  // Legacy style — stored inside traits array
  const legacy = implant.traits.find(t => t.name === 'Unique Trait');
  return legacy ?? null;
}
```

### 2. Shared Traits (`traits` array)

Passive abilities that multiple implants share (e.g. "Efficient Curatives"). Appear on Prestige implants alongside the unique trait. V1–V4 typically return `"traits": []`.

```json
{
  "traits": [
    {
      "name": "Efficient Curatives",
      "description": "Using a Shield Charge or Patch Kit has a chance to double its effectiveness."
    }
  ]
}
```

```ts
// Render shared traits
const sharedTraits = implant.traits.filter(t => t.name !== 'Unique Trait');
```

---

## Verified Flag

The `verified` integer (`0` or `1`) indicates whether an admin has confirmed that all data for this implant is accurate.

> **Migration note:** Previously named `server_slam_verified`. If you were using that field, update your code to use `verified`.

```ts
function renderVerifiedBadge(implant: Implant): string {
  if (!implant.verified) return '';
  return '<span class="verified-badge" title="Data verified">✓ Verified</span>';
}
```

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

## Purchaseable Implants

Implants that can be purchased from an in-game vendor have `is_purchaseable = 1` along with vendor details.

### Fields

| Field | Type | Notes |
|-------|------|-------|
| `is_purchaseable` | `0 \| 1` | Whether this implant can be bought |
| `vendor_name` | `string \| null` | Name of the vendor (e.g. "Zara") |
| `vendor_rank` | `string \| null` | Rank required (e.g. "Rank 3") |
| `purchase_location` | `string \| null` | Where to find them (e.g. "The Bazaar") |

### Frontend usage

```ts
function renderPurchaseInfo(implant: Implant): string {
  if (!implant.is_purchaseable) return '';
  return `
    <div class="purchase-info">
      <span class="purchase-badge">🏪 Purchaseable</span>
      ${implant.vendor_name ? `<p>Vendor: ${implant.vendor_name}</p>` : ''}
      ${implant.vendor_rank ? `<p>Required rank: ${implant.vendor_rank}</p>` : ''}
      ${implant.purchase_location ? `<p>Location: ${implant.purchase_location}</p>` : ''}
    </div>
  `;
}
```

### Filtering

```ts
// Only purchaseable implants
const res = await fetch(`${API}/api/implants?purchaseable=true`);

// Purchaseable implants for a specific slot
const res2 = await fetch(`${API}/api/implants?slot=head&purchaseable=true`);
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
|-------|-------|-------|
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
const API = 'https://implants.marathondb.gg';

async function rateImplant(slug: string, rating: 1|2|3|4|5): Promise<RatingResponse> {
  const token = await getDeviceToken();
  const res = await fetch(`${API}/api/implants/${slug}/rate`, {
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
  const v = localStorage.getItem(`mdb_implant_vote_${slug}`);
  return v ? parseInt(v) : null;
}

function setUserVote(slug: string, rating: number): void {
  localStorage.setItem(`mdb_implant_vote_${slug}`, String(rating));
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

## Frontend Implementation Patterns

### Slot Browser (Equipment Screen)

```ts
async function fetchSlot(slot: 'head' | 'torso' | 'legs' | 'shield') {
  const res = await fetch(`https://implants.marathondb.gg/api/implants/slot/${slot}`);
  const { data } = await res.json();
  return data as Implant[]; // sorted by rarity then name
}
```

### Implant Picker with Filters

```ts
async function fetchImplants(options: {
  slot?:          string;
  rarity?:        string;
  verified?:      boolean;
  purchaseable?:  boolean;
}) {
  const params = new URLSearchParams();
  if (options.slot)          params.set('slot',          options.slot);
  if (options.rarity)        params.set('rarity',        options.rarity);
  if (options.verified)      params.set('verified',      '1');
  if (options.purchaseable)  params.set('purchaseable',  'true');

  const res = await fetch(`https://implants.marathondb.gg/api/implants?${params}`);
  const { data } = await res.json();
  return data as Implant[];
}
```

### Family Tier Selector (V1 → V5 Upgrade Path)

```ts
const RARITY_ORDER: Record<string, number> = {
  standard: 1, enhanced: 2, deluxe: 3, superior: 4, prestige: 5
};

async function fetchImplantFamily(slug: string) {
  const res = await fetch(`https://implants.marathondb.gg/api/implants/${slug}`);
  const { data } = await res.json();

  // Combine current + variants into ordered upgrade path
  const family = [data, ...(data.variants ?? [])]
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);

  return family;
  // [V1 standard, V2 enhanced, V3 deluxe, V4 superior, V5 prestige]
}
```

### Displaying Stats with Sign and Label

```ts
const STAT_LABELS: Record<string, string> = {
  agility:          'Agility',
  fallResistance:   'Fall Resistance',
  finisherSiphon:   'Finisher Siphon',
  firewall:         'Firewall',
  hardware:         'Hardware',
  heatCapacity:     'Heat Capacity',
  lootSpeed:        'Loot Speed',
  meleeDamage:      'Melee Damage',
  pingDuration:     'Ping Duration',
  primeRecovery:    'Prime Recovery',
  reviveSpeed:      'Revive Speed',
  selfRepairSpeed:  'Self-Repair Speed',
  tacticalRecovery: 'Tactical Recovery',
};

function formatStat(stat: { stat_name: string; stat_value: number }): string {
  const label = STAT_LABELS[stat.stat_name] ?? stat.stat_name;
  const sign  = stat.stat_value >= 0 ? '+' : '';
  return `${label}: ${sign}${stat.stat_value}`;
}
// "Prime Recovery: +10"
// "Hardware: -5"
```

### Verified Check

```ts
const isVerified = implant.verified === 1;

// Fetch only verified implants
const verifiedRes  = await fetch('https://implants.marathondb.gg/api/implants?verified=1');
const { data }     = await verifiedRes.json();
```

---

## TypeScript Types

```ts
export type ImplantSlot   = 'head' | 'torso' | 'legs' | 'shield';
export type ImplantRarity = 'standard' | 'enhanced' | 'deluxe' | 'superior' | 'prestige';

export interface ImplantStat {
  stat_name:  string;
  stat_value: number;
}

export interface ImplantTrait {
  name:        string;
  description: string;
}

export interface ImplantVariant {
  id:       number;
  slug:     string;
  name:     string;
  rarity:   ImplantRarity;
  credits:  number;
  verified: 0 | 1;
}

export interface RatingResponse {
  total_votes:   number;
  score_percent: number;
  distribution: {
    fire:  { count: number; percent: number };
    love:  { count: number; percent: number };
    meh:   { count: number; percent: number };
    nah:   { count: number; percent: number };
    trash: { count: number; percent: number };
  };
  last_updated: string | null;
}

export interface Implant {
  id:                        number;
  slug:                      string;
  name:                      string;
  slot:                      ImplantSlot;
  rarity:                    ImplantRarity;
  description:               string | null;
  traits:                    ImplantTrait[];
  unique_trait_name:         string | null;
  unique_trait_description:  string | null;
  credits:                   number;
  icon_url:                  string | null;
  verified:                  0 | 1;
  is_active:                 0 | 1;
  is_purchaseable:           0 | 1;
  vendor_name:               string | null;
  vendor_rank:               string | null;
  purchase_location:         string | null;
  created_at:                string;
  updated_at:                string;
  stats:                     ImplantStat[];
  rating:                    RatingResponse | null;
  variants?:                 ImplantVariant[];  // detail endpoint only
}

export interface ImplantListResponse {
  success: boolean;
  count:   number;
  data:    Implant[];
}

export interface ImplantDetailResponse {
  success: boolean;
  data:    Implant;
}

export interface ImplantCountsResponse {
  success: boolean;
  data: Record<ImplantSlot, number>;
}

export interface ImplantStatsResponse {
  success:    boolean;
  total:      number;
  verified:   number;
  by_slot:    { slot: ImplantSlot; count: number }[];
  by_rarity:  { rarity: ImplantRarity; count: number }[];
  stat_names: string[];
}

export interface RatingsResponse {
  success:      boolean;
  implant_slug: string;
  data:         RatingResponse;
}
```

---

## Test URLs

```
# All implants
https://implants.marathondb.gg/api/implants

# Filter by slot
https://implants.marathondb.gg/api/implants?slot=head
https://implants.marathondb.gg/api/implants?slot=torso
https://implants.marathondb.gg/api/implants?slot=legs
https://implants.marathondb.gg/api/implants?slot=shield

# Filter by rarity
https://implants.marathondb.gg/api/implants?rarity=prestige
https://implants.marathondb.gg/api/implants?rarity=standard

# Combined filters
https://implants.marathondb.gg/api/implants?slot=legs&rarity=superior
https://implants.marathondb.gg/api/implants?slot=head&rarity=prestige

# Purchaseable only
https://implants.marathondb.gg/api/implants?purchaseable=true
https://implants.marathondb.gg/api/implants?slot=head&purchaseable=true

# By slot (primary equipment screen endpoint)
https://implants.marathondb.gg/api/implants/slot/head
https://implants.marathondb.gg/api/implants/slot/torso
https://implants.marathondb.gg/api/implants/slot/legs
https://implants.marathondb.gg/api/implants/slot/shield

# Counts per slot (for badges)
https://implants.marathondb.gg/api/implants/counts

# Top rated (hot)
https://implants.marathondb.gg/api/implants/hot
https://implants.marathondb.gg/api/implants/hot?limit=5

# Single implant — standard (no traits)
https://implants.marathondb.gg/api/implants/augmented-capacitors-v1
https://implants.marathondb.gg/api/implants/bionic-leg-upgrades-v1
https://implants.marathondb.gg/api/implants/protector-v1

# Single implant — prestige (unique_trait_name + unique_trait_description + shared traits)
https://implants.marathondb.gg/api/implants/thick-skull-v5
https://implants.marathondb.gg/api/implants/survival-kit-v5
https://implants.marathondb.gg/api/implants/strike-kit-v5

# Single implant — prestige legacy (unique trait stored in traits array)
https://implants.marathondb.gg/api/implants/augmented-capacitors-v5

# Shield implants
https://implants.marathondb.gg/api/implants/firewall-v1
https://implants.marathondb.gg/api/implants/firewall-v3
https://implants.marathondb.gg/api/implants/volt-resistance-v1
https://implants.marathondb.gg/api/implants/reinforced-shields-v1
https://implants.marathondb.gg/api/implants/reinforced-shields-v2
https://implants.marathondb.gg/api/implants/spectre-armor

# Rate an implant
# POST https://implants.marathondb.gg/api/implants/augmented-capacitors-v5/rate
# Body: { "rating": 5, "device_token": "your-device-hash" }

# Get ratings for an implant
https://implants.marathondb.gg/api/implants/augmented-capacitors-v5/ratings

# Stats summary
https://implants.marathondb.gg/api/stats
```

---

## Implant Families Reference

### Head (30 implants)

| Family | Slug prefix | Key stats |
|--------|-------------|-----------|
| Augmented Capacitors | `augmented-capacitors-v` | `primeRecovery` ↑, `hardware` ↓ |
| Energy Harvesting | `energy-harvesting-v` | `primeRecovery`, `tacticalRecovery`, `firewall` |
| Ping+ | `ping-plus-v` | `pingDuration` ↑, `lootSpeed` ↑ |
| Regen | `regen-v` | `selfRepairSpeed` ↑, `shieldRecoverySpeed` ↑ |
| Sprint Kit | `sprint-kit-v` | `agility` ↑, `hardware` ↓ |
| Thick Skull | `thick-skull-v` | `fallResistance` ↑, `meleeDamage` ↑ |

### Torso (24 implants)

| Family | Slug prefix | Key stats |
|--------|-------------|-----------|
| Helping Hands | `helping-hands-v` | `reviveSpeed` ↑, `lootSpeed` ↑ |
| Hurting Hands | `hurting-hands-v` | `meleeDamage` ↑, `finisherSiphon` ↑ |
| Knife Fight | `knife-fight-v` | `meleeDamage` ↑, `selfRepairSpeed` ↑ |
| Nimble Fingers | `nimble-fingers-v` | `lootSpeed` ↑ |
| Survival Kit | `survival-kit-v` | `primeRecovery`, `tacticalRecovery`, `selfRepairSpeed`, `reviveSpeed` (all ↑) |

### Legs (24 implants)

| Family | Slug prefix | Key stats |
|--------|-------------|-----------|
| Bionic Leg Upgrades | `bionic-leg-upgrades-v` | `agility` ↑, `fallResistance` ↑, `shieldRecoverySpeed` ↓ |
| Distance Runner | `distance-runner-v` | `agility` ↑, `heatCapacity` ↓ |
| Graceful Landings | `graceful-landings-v` | `fallResistance` ↑, `agility` ↑ |
| Solid Stance | `solid-stance-v` | `heatCapacity` ↑, `meleeDamage` ↑, `agility` ↓ |
| Strike Kit | `strike-kit-v` | `meleeDamage` ↑, `agility` ↑ |

### Shield (10 implants)

| Family | Tiers | Credits | Key stats |
|--------|-------|---------|-----------|
| Firewall | V1 / V2 / V3 | 25 / 70 / 200 | `firewall` ↑ |
| Protector | V1 / V2 / V3 | 150 / 400 / 900 | `primeRecovery` ↓, `tacticalRecovery` ↓ (trade-off for shield bonus) |
| Reinforced Shields | V1 / V2 | 180 / 3000 | trait-based (V1 has no stat penalty) |
| Spectre Armor | — | 3000 | `agility` ↓, `heatCapacity` ↓ — grants invisibility on shield break |
| Volt Resistance | V1 | 150 | `primeRecovery` ↑, `tacticalRecovery` ↑ |
