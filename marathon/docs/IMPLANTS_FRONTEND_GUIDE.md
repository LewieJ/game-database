# Implants API — Frontend Integration Guide

> **API Base URL:** `https://implants.marathondb.gg`
> **Version:** 2.1.0
> **Last Updated:** March 2026
> **Total Implants:** 84 (27 head · 24 torso · 24 legs · 9 shield)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [List Implants](#1-list-implants)
   - [Implants by Slot](#2-implants-by-slot)
   - [Implant Detail](#3-implant-detail)
   - [Stats Summary](#4-stats-summary)
3. [Data Model](#data-model)
4. [Slot Reference](#slot-reference)
5. [Rarity Hierarchy](#rarity-hierarchy)
6. [Stat Names Reference](#stat-names-reference)
7. [Traits](#traits)
8. [Frontend Implementation Patterns](#frontend-implementation-patterns)
9. [TypeScript Types](#typescript-types)
10. [Test URLs](#test-urls)
11. [Implant Families Reference](#implant-families-reference)

---

## Quick Start

```ts
const API_BASE = 'https://implants.marathondb.gg';

// Fetch all active implants
const res = await fetch(`${API_BASE}/api/implants`);
const { success, count, data } = await res.json();
// data = Implant[] with stats included

// Fetch all head implants
const res2 = await fetch(`${API_BASE}/api/implants/slot/head`);
const { data: headImplants } = await res2.json();

// Fetch a single implant by slug
const res3 = await fetch(`${API_BASE}/api/implants/augmented-capacitors-v1`);
const { data: implant } = await res3.json();
// implant includes: stats[], traits[], variants[]
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
  "version": "2.0.0",
  "description": "Implants equipped by runners — head, torso, legs, shield slots.",
  "slots": ["head", "torso", "legs", "shield"],
  "endpoints": {
    "implants": "GET /api/implants?slot=&rarity=&verified=",
    "by_slot": "GET /api/implants/slot/:slot",
    "implant_detail": "GET /api/implants/:slug",
    "stats": "GET /api/stats",
    "admin": "/api/admin/*"
  }
}
```

---

### 1. List Implants

```
GET /api/implants
```

Returns all active implants with enriched stats. This is the **primary browse endpoint**.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `slot` | string | Filter by slot: `head`, `torso`, `legs`, `shield` |
| `rarity` | string | Filter by rarity: `standard`, `enhanced`, `deluxe`, `superior`, `prestige` |
| `verified` | `1` | Return only Server Slam verified implants |
| `active` | string | `"false"` returns inactive only; omit for active-only (default) |

**Response:**

```json
{
  "success": true,
  "count": 84,
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
      "icon_url": null,
      "server_slam_verified": 0,
      "is_active": 1,
      "created_at": "2026-03-01T03:25:37.000Z",
      "updated_at": "2026-03-01T03:25:37.000Z",
      "stats": [
        { "stat_name": "hardware",      "stat_value": -5 },
        { "stat_name": "primeRecovery", "stat_value": 10 }
      ]
    }
  ]
}
```

**Default ordering:** slot (head → torso → legs → shield), then rarity (standard → prestige), then name A–Z.

---

### 2. Implants by Slot

```
GET /api/implants/slot/{slot}
```

**Valid slot values:** `head`, `torso`, `legs`, `shield`

Returns all active implants for the given slot, sorted by rarity then name. Includes enriched stats.

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
      "icon_url": null,
      "server_slam_verified": 0,
      "is_active": 1,
      "stats": [
        { "stat_name": "agility",            "stat_value": 15 },
        { "stat_name": "fallResistance",      "stat_value": 5  },
        { "stat_name": "shieldRecoverySpeed", "stat_value": -5 }
      ]
    }
  ]
}
```

Returns `400` for invalid slot values:

```json
{ "success": false, "error": "Invalid slot. Valid: head, torso, legs, shield" }
```

---

### 3. Implant Detail

```
GET /api/implants/{slug}
```

Returns a single implant with **full enrichment**: stats, traits, and family variants.

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
    "icon_url": null,
    "server_slam_verified": 0,
    "is_active": 1,
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
        "rarity": "standard", "credits": 25, "server_slam_verified": 0
      },
      {
        "id": 2, "slug": "augmented-capacitors-v2",
        "name": "Augmented Capacitors V2",
        "rarity": "enhanced", "credits": 70, "server_slam_verified": 0
      },
      {
        "id": 3, "slug": "augmented-capacitors-v3",
        "name": "Augmented Capacitors V3",
        "rarity": "deluxe", "credits": 200, "server_slam_verified": 0
      },
      {
        "id": 4, "slug": "augmented-capacitors-v4",
        "name": "Augmented Capacitors V4",
        "rarity": "superior", "credits": 600, "server_slam_verified": 0
      }
    ]
  }
}
```

**Key additions vs list endpoint:**
- `traits` always present (array of `{name, description}` — empty `[]` for non-Prestige)
- `variants` — other tier members of the same family, sorted by rarity, **excluding the current implant**
- Returns `404` if slug not found

---

### 4. Stats Summary

```
GET /api/stats
```

Returns aggregate counts — useful for dashboards and overview displays.

```json
{
  "success": true,
  "total": 84,
  "verified": 0,
  "by_slot": [
    { "slot": "head",   "count": 27 },
    { "slot": "torso",  "count": 24 },
    { "slot": "legs",   "count": 24 },
    { "slot": "shield", "count": 9  }
  ],
  "by_rarity": [
    { "rarity": "standard",  "count": 17 },
    { "rarity": "enhanced",  "count": 19 },
    { "rarity": "deluxe",    "count": 18 },
    { "rarity": "superior",  "count": 13 },
    { "rarity": "prestige",  "count": 17 }
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
| `icon_url` | `string \| null` | Deprecated — use [slot icon CDN URLs](#slot-reference) instead |
| `server_slam_verified` | `0 \| 1` | Whether stats are confirmed for Server Slam |
| `is_active` | `0 \| 1` | Whether implant is currently available in-game |
| `stats` | `Stat[]` | Array of stat modifiers (present on all endpoints) |
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
  id:                   number;
  slug:                 string;
  name:                 string;
  rarity:               ImplantRarity;
  credits:              number;
  server_slam_verified: 0 | 1;
}
```

---

## Slot Reference

Slot icons are served from the Marathon helpbot CDN. Use these directly in your UI — the `icon_url` field in API responses is deprecated and often `null`.

| Slot | CDN Icon URL | Implant families |
|------|--------------|------------------|
| `head` | `https://helpbot.marathondb.gg/assets/items/implants/head-72x72.png` | Augmented Capacitors, Energy Harvesting, Ping+, Regen, Sprint Kit |
| `torso` | `https://helpbot.marathondb.gg/assets/items/implants/torso-72x72.png` | Helping Hands, Hurting Hands, Knife Fight, Nimble Fingers, Survival Kit |
| `legs` | `https://helpbot.marathondb.gg/assets/items/implants/legs-72x72.png` | Bionic Leg Upgrades, Distance Runner, Graceful Landings, Solid Stance, Strike Kit |
| `shield` | `https://helpbot.marathondb.gg/assets/items/implants/shield-72x72.png` | Firewall, Protector, Reinforced Shields, Volt Resistance |

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

> **Shield exceptions:** Protector credits are 150 / 400 / 900. Reinforced Shields V2 costs 3000 cr.

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
  slot?:     string;
  rarity?:   string;
  verified?: boolean;
}) {
  const params = new URLSearchParams();
  if (options.slot)     params.set('slot',     options.slot);
  if (options.rarity)   params.set('rarity',   options.rarity);
  if (options.verified) params.set('verified', '1');

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

### Check Server Slam Verification

```ts
const isVerified = implant.server_slam_verified === 1;

// Fetch only SS-confirmed implants
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
  id:                   number;
  slug:                 string;
  name:                 string;
  rarity:               ImplantRarity;
  credits:              number;
  server_slam_verified: 0 | 1;
}

export interface Implant {
  id:                        number;
  slug:                      string;
  name:                      string;
  slot:                      ImplantSlot;
  rarity:                    ImplantRarity;
  description:               string | null;
  traits:                    ImplantTrait[];    // shared passive traits
  unique_trait_name:         string | null;     // named unique ability (Prestige)
  unique_trait_description:  string | null;     // effect of the unique ability
  credits:                   number;
  icon_url:                  string | null;     // deprecated — use SLOT_ICONS CDN
  server_slam_verified:      0 | 1;
  is_active:                 0 | 1;
  created_at:                string;
  updated_at:                string;
  stats:                     ImplantStat[];
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

export interface ImplantStatsResponse {
  success:    boolean;
  total:      number;
  verified:   number;
  by_slot:    { slot: ImplantSlot; count: number }[];
  by_rarity:  { rarity: ImplantRarity; count: number }[];
  stat_names: string[];
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

# By slot (primary equipment screen endpoint)
https://implants.marathondb.gg/api/implants/slot/head
https://implants.marathondb.gg/api/implants/slot/torso
https://implants.marathondb.gg/api/implants/slot/legs
https://implants.marathondb.gg/api/implants/slot/shield

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

# Stats summary
https://implants.marathondb.gg/api/stats
```

---

## Implant Families Reference

### Head (27 implants)

| Family | Slug prefix | Key stats |
|--------|-------------|-----------|
| Augmented Capacitors | `augmented-capacitors-v` | `primeRecovery` ↑, `hardware` ↓ |
| Energy Harvesting | `energy-harvesting-v` | `primeRecovery`, `tacticalRecovery`, `firewall` |
| Ping+ | `ping-plus-v` | `pingDuration` ↑, `lootSpeed` ↑ |
| Regen | `regen-v` | `selfRepairSpeed` ↑, `shieldRecoverySpeed` ↑ |
| Sprint Kit | `sprint-kit-v` | `agility` ↑, `hardware` ↓ |

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

### Shield (9 implants)

| Family | Tiers | Credits | Key stats |
|--------|-------|---------|-----------|
| Firewall | V1 / V2 / V3 | 25 / 70 / 200 | `firewall` ↑ |
| Protector | V1 / V2 / V3 | 150 / 400 / 900 | `primeRecovery` ↓, `tacticalRecovery` ↓ (trade-off for shield bonus) |
| Reinforced Shields | V1 / V2 | 180 / 3000 | trait-based (V1 has no stat penalty) |
| Volt Resistance | V1 | 150 | `primeRecovery` ↑, `tacticalRecovery` ↑ |
