# Weapon Mods — Frontend API Guide

**Base URL:** `https://mods.marathondb.gg`

---

## Table of Contents

- [Data Types](#data-types)
- [Public Endpoints](#public-endpoints)
  - [GET /api/mods](#get-apimods)
  - [GET /api/mods/counts](#get-apimodscounts)
  - [GET /api/mods/:slug](#get-apimodsslug)
  - [GET /api/weapons/:slug/mods](#get-apiweaponsslugmods)
  - [GET /api/weapons/:slug/slots](#get-apiweaponsslugslots)
  - [GET /api/slot-types](#get-apislot-types)
  - [GET /api/seasons](#get-apiseasons)
  - [GET /api/seasons/current](#get-apiseasonscurrent)
  - [GET /images/:slug.webp](#get-imagesslugwebp)
- [Family Trees (Variant System)](#family-trees-variant-system)
  - [How Families Work](#how-families-work)
  - [Rarity Tiers](#rarity-tiers)
  - [Family Endpoints](#family-endpoints)
  - [Frontend: Rendering a Family Tree](#frontend-rendering-a-family-tree)
  - [Frontend: Filtering Hidden Mods](#frontend-filtering-hidden-mods)
- [Admin Endpoints](#admin-endpoints)
  - [Seasons](#seasons)
  - [Mods CRUD](#mods-crud)
  - [Mod Effects](#mod-effects)
  - [Mod History](#mod-history)
  - [Weapon Mod Slots](#weapon-mod-slots)
  - [Weapon-Mod Compatibility](#weapon-mod-compatibility)
  - [Per-Weapon Mod Effects](#per-weapon-mod-effects)
  - [Image Upload](#image-upload)

---

## Data Types

### Enums

| Field | Values |
|---|---|
| `slot_type` | `optic`, `barrel`, `magazine`, `grip`, `chip`, `generator`, `shield` |
| `rarity` | `standard`, `enhanced`, `deluxe`, `superior`, `prestige` |
| `unit` (effects) | `flat`, `percent`, `degrees`, `seconds`, `multiplier` |
| `change_type` (history) | `added`, `buffed`, `nerfed`, `reworked`, `removed`, `unchanged` |
| `season_type` | `alpha`, `beta`, `release`, `hotfix` |

### ModListItem

Returned by list endpoints (`GET /api/mods`, `GET /api/weapons/:slug/mods`).

```ts
{
  id: number;
  slug: string;
  name: string;
  slot_type: string;
  rarity: string;
  description: string | null;
  ability_name: string | null;
  cost: number | null;
  icon_url_webp: string | null;
  is_active: number;           // 0 or 1
  is_hidden: number;           // 0 or 1 — hidden variants flagged but still returned
  family_slug: string | null;  // groups variants together, null for prestige
  season_id: number | null;
  patch_number: string | null;
  compatible_weapon_count: number;
}
```

### ModDetail

Returned by `GET /api/mods/:slug`.

```ts
{
  // ...all ModRow fields...
  id: number;
  slug: string;
  name: string;
  slot_type: string;
  rarity: string;
  description: string | null;
  ability_name: string | null;
  ability_description: string | null;
  damage_type: string | null;
  cost: number | null;
  icon_url_webp: string | null;
  is_active: number;
  is_hidden: number;               // 0 or 1
  family_slug: string | null;      // family group key
  is_verified: number;
  is_partial_data: number;
  partial_data_notes: string | null;
  season_id: number | null;
  season_name: string | null;
  patch_number: string | null;
  patch_notes: string | null;
  created_at: string;
  updated_at: string;

  // Nested arrays
  effects: Effect[];
  compatible_weapons: CompatibleWeaponDetail[];
  history: HistoryEntry[];
  variants: Variant[];             // sibling mods in the same family
}
```

### Variant

Returned in `ModDetail.variants` — the other members of the same family.

```ts
{
  id: number;
  slug: string;
  name: string;
  rarity: string;       // "standard" | "enhanced" | "deluxe" | "superior"
  cost: number | null;
  is_hidden: number;    // 0 or 1
  is_verified: number;  // 0 or 1
}
```

### Effect

```ts
{
  id: number;
  mod_id: number;
  stat_key: string;     // e.g. "damage", "fire_rate", "reload_speed"
  delta: number;         // positive = buff, negative = nerf
  unit: string;          // "flat" | "percent" | "degrees" | "seconds" | "multiplier"
  display_text: string | null;
}
```

### CompatibleWeaponDetail

```ts
{
  weapon_slug: string;
  is_verified: boolean;          // true if stats for this weapon+mod pair have been confirmed in-game
  effects: WeaponModEffect[];   // per-weapon overrides (may be empty [])
}
```

### WeaponModEffect

```ts
{
  id: number;
  weapon_slug: string;
  mod_slug: string;
  stat_key: string;
  delta: number;
  unit: string;
  display_text: string | null;
}
```

### HistoryEntry

```ts
{
  id: number;
  mod_id: number;
  season_id: number;
  season_name: string | null;
  patch_number: string | null;
  change_type: string;          // "added" | "buffed" | "nerfed" | "reworked" | "removed" | "unchanged"
  summary: string | null;
  previous_values: string | null;   // JSON string
  new_values: string | null;        // JSON string
  changed_at: string;
}
```

### Season

```ts
{
  id: number;
  name: string;
  version: string | null;
  patch_version: string | null;
  patch_notes: string | null;
  season_type: string;          // "alpha" | "beta" | "release" | "hotfix"
  release_date: string | null;
  end_date: string | null;
  is_current: number;           // 0 or 1
  created_at: string;
}
```

---

## Public Endpoints

All public endpoints require no authentication.

---

### GET /api/mods

List all mods with optional filters. Only active mods by default.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `slot_type` | string | — | Filter by slot type |
| `rarity` | string | — | Filter by rarity |
| `season_id` | number | — | Filter by season |
| `active` | `"0"` or `"1"` | `"1"` | Set to `"0"` to include inactive mods |

**Response:**

```json
{
  "success": true,
  "count": 42,
  "data": [
    {
      "id": 1,
      "slug": "extended-mag-enhanced",
      "name": "Extended Magazine",
      "slot_type": "magazine",
      "rarity": "enhanced",
      "description": "Slightly increases magazine capacity",
      "ability_name": "Extended Capacity",
      "cost": 60,
      "icon_url_webp": "https://mods.marathondb.gg/images/extended-mag-enhanced.webp",
      "is_active": 1,
      "is_hidden": 0,
      "family_slug": "extended-mag",
      "season_id": 1,
      "season_name": "Server Slam",
      "patch_number": null,
      "compatible_weapon_count": 5
    }
  ]
}
```

**Sort Order:** slot_type (optic > barrel > magazine > grip > chip > generator), then rarity (standard > prestige), then name alphabetically.

---

### GET /api/mods/counts

Total active mod count grouped by weapon slug. Useful for showing badge counts on weapon cards.

**Response:**

```json
{
  "success": true,
  "data": {
    "ar-57": 12,
    "smg-x": 8,
    "shotgun-mk2": 3
  }
}
```

---

### GET /api/mods/:slug

Full detail for a single mod including effects, compatible weapons (with per-weapon effect overrides), and change history.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "extended-mag",
    "name": "Extended Magazine",
    "slot_type": "magazine",
    "rarity": "enhanced",
    "description": "Increases magazine capacity",
    "ability_name": "Extended Capacity",
    "ability_description": "Adds 10 rounds to the magazine",
    "damage_type": null,
    "cost": 2,
    "icon_url_webp": "https://mods.marathondb.gg/images/extended-mag.webp",
    "is_active": 1,
    "is_verified": 1,
    "is_partial_data": 0,
    "partial_data_notes": null,
    "season_id": 1,
    "season_name": "Season 1",
    "patch_number": "1.0.0",
    "patch_notes": null,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-15T00:00:00.000Z",

    "effects": [
      {
        "id": 1,
        "mod_id": 1,
        "stat_key": "magazine_size",
        "delta": 10,
        "unit": "flat",
        "display_text": "+10 rounds"
      }
    ],

    "compatible_weapons": [
      {
        "weapon_slug": "ar-57",
        "is_verified": true,
        "effects": []
      },
      {
        "weapon_slug": "smg-x",
        "is_verified": false,
        "effects": [
          {
            "id": 5,
            "weapon_slug": "smg-x",
            "mod_slug": "extended-mag-enhanced",
            "stat_key": "magazine_size",
            "delta": 8,
            "unit": "flat",
            "display_text": "+8 rounds (SMG override)"
          }
        ]
      }
    ],

    "history": [
      {
        "id": 1,
        "mod_id": 1,
        "season_id": 1,
        "season_name": "Server Slam",
        "patch_number": null,
        "change_type": "added",
        "summary": "Mod introduced",
        "previous_values": null,
        "new_values": null,
        "changed_at": "2025-01-01T00:00:00.000Z"
      }
    ],

    "variants": [
      {
        "id": 2,
        "slug": "extended-mag-standard",
        "name": "Extended Magazine",
        "rarity": "standard",
        "cost": 30,
        "is_hidden": 0,
        "is_verified": 0
      },
      {
        "id": 3,
        "slug": "extended-mag-deluxe",
        "name": "Extended Magazine",
        "rarity": "deluxe",
        "cost": 180,
        "is_hidden": 0,
        "is_verified": 0
      },
      {
        "id": 4,
        "slug": "extended-mag-superior",
        "name": "Extended Magazine",
        "rarity": "superior",
        "cost": 450,
        "is_hidden": 0,
        "is_verified": 0
      }
    ]
  }
}
```

> **Per-weapon effects:** If `compatible_weapons[].effects` is non-empty, those override the base `effects` for that specific weapon. If empty, the weapon uses the base effects.
>
> **Per-weapon verification:** Each `compatible_weapons[]` entry includes `is_verified` (boolean). This indicates whether the stat values for this specific weapon+mod combination have been manually confirmed in-game. Use this to show confidence indicators in your UI — e.g. a checkmark for verified weapons, or a warning/dimmed style for unverified ones. The mod-level `is_verified` field is separate and indicates whether the mod itself (base info, description, cost) has been confirmed.

---

### GET /api/weapons/:slug/mods

All mods compatible with a weapon, organized by mod slot. Also includes per-weapon effect overrides in each mod's `weapon_effects` array.

**Response:**

```json
{
  "success": true,
  "data": {
    "weapon_slug": "ar-57",
    "slot_count": 3,
    "slots": [
      {
        "slot_number": 1,
        "slot_type": "optic",
        "mods": [
          {
            "id": 2,
            "slug": "red-dot",
            "name": "Red Dot Sight",
            "slot_type": "optic",
            "rarity": "standard",
            "description": "Basic optic",
            "ability_name": null,
            "cost": 1,
            "icon_url_webp": null,
            "is_active": 1,
            "season_id": 1,
            "patch_number": "1.0.0",
            "compatible_weapon_count": 10,
            "weapon_effects": []
          }
        ]
      },
      {
        "slot_number": 2,
        "slot_type": "barrel",
        "mods": []
      }
    ],
    "unslotted_mods": []
  }
}
```

> **`weapon_effects`** on each mod: per-weapon effect overrides for this specific weapon. Empty array means use base effects. `unslotted_mods` contains any compatible mods whose `slot_type` doesn't match any of the weapon's defined slots.

---

### GET /api/weapons/:slug/slots

Returns the slot configuration for a weapon.

**Response:**

```json
{
  "success": true,
  "data": {
    "weapon_slug": "ar-57",
    "slots": [
      { "slot_number": 1, "slot_type": "optic" },
      { "slot_number": 2, "slot_type": "barrel" },
      { "slot_number": 3, "slot_type": "magazine" }
    ]
  }
}
```

---

### GET /api/slot-types

Returns all slot types and how many active mods exist for each.

**Response:**

```json
{
  "success": true,
  "data": [
    { "slot_type": "barrel", "mod_count": 8 },
    { "slot_type": "chip", "mod_count": 5 },
    { "slot_type": "generator", "mod_count": 3 },
    { "slot_type": "grip", "mod_count": 6 },
    { "slot_type": "magazine", "mod_count": 7 },
    { "slot_type": "optic", "mod_count": 10 }
  ]
}
```

---

### GET /api/seasons

Returns all seasons.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Season 1",
      "version": "1.0",
      "patch_version": "1.0.0",
      "patch_notes": null,
      "season_type": "release",
      "release_date": "2025-01-01",
      "end_date": null,
      "is_current": 1,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/seasons/current

Returns the current active season only.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Season 1",
    "version": "1.0",
    "is_current": 1
  }
}
```

Returns `404` if no season is marked as current.

---

### GET /images/:slug.webp

Serves a mod icon image from KV storage. Returns the raw WebP binary with `Content-Type: image/webp` and 24-hour cache headers.

**Example:** `https://mods.marathondb.gg/images/extended-mag-enhanced.webp`

Returns `404` if no image exists for that slug.

---

## Family Trees (Variant System)

### How Families Work

Every non-prestige mod belongs to a **family** — a group of mods that share the same base identity but differ in rarity tier. For example, "Combat Grip" exists as a Standard, Enhanced, Deluxe, and Superior variant.

Families are identified by the `family_slug` field on each mod. All mods with the same `family_slug` are siblings.

**Key points:**
- All family members share the same **name**, **icon**, **slot_type**, **compatible weapons**, **ability_name**, and **ability_description**
- Each variant has its own **rarity**, **cost**, **description** (intensity scales), and **stat effects** (deltas scale)
- **Prestige** mods have `family_slug: null` and are standalone — they are not part of any family
- A mod can be **hidden** (`is_hidden: 1`) — it still appears in the API but should be filtered out or dimmed in the UI

### Rarity Tiers

| Tier | Rarity | Slug Suffix | Description Prefix | Cost Scale | Effect Scale |
|---|---|---|---|---|---|
| V1 | `standard` | `-standard` | "Minimally" | 0.5x | 0.6x |
| V2 | `enhanced` | `-enhanced` | "Slightly" | 1.0x (base) | 1.0x (base) |
| V3 | `deluxe` | `-deluxe` | *(none)* | 3.0x | 1.4x |
| V4 | `superior` | `-superior` | *(none — "Greatly")* | 7.5x | 1.8x |

### Slug Convention

Family slug is derived by stripping the rarity suffix:

| Mod Slug | Family Slug | Rarity |
|---|---|---|
| `combat-grip-standard` | `combat-grip` | standard |
| `combat-grip-enhanced` | `combat-grip` | enhanced |
| `combat-grip-deluxe` | `combat-grip` | deluxe |
| `combat-grip-superior` | `combat-grip` | superior |

Some legacy mods may not follow this suffix convention — their `family_slug` is still set correctly in the database.

### Family Endpoints

#### GET /api/admin/families

List all families with completeness info. Sorted: incomplete first, then by slot_type, then name.

**Response:**

```json
{
  "success": true,
  "stats": {
    "total_families": 88,
    "complete": 12,
    "incomplete": 76
  },
  "data": [
    {
      "family_slug": "combat-grip",
      "family_name": "Combat Grip",
      "slot_type": "grip",
      "icon_url_webp": "https://mods.marathondb.gg/images/combat-grip-enhanced.webp",
      "variant_count": 2,
      "variants": [
        {
          "id": 1,
          "slug": "combat-grip-enhanced",
          "name": "Combat Grip",
          "rarity": "enhanced",
          "cost": 60,
          "is_active": 1,
          "is_hidden": 0,
          "is_verified": 1,
          "is_partial_data": 0,
          "effect_count": 2
        },
        {
          "id": 2,
          "slug": "combat-grip-deluxe",
          "name": "Combat Grip",
          "rarity": "deluxe",
          "cost": 180,
          "is_active": 1,
          "is_hidden": 0,
          "is_verified": 0,
          "is_partial_data": 1,
          "effect_count": 2
        }
      ],
      "missing_rarities": ["standard", "superior"],
      "is_complete": false
    }
  ]
}
```

#### POST /api/admin/families/populate-slugs

One-time utility: populates `family_slug` for all non-prestige mods based on their slug suffix. Safe to re-run.

#### POST /api/admin/families/generate-all

Bulk-generate all missing variants across every family. Auto-scales descriptions, costs, and effects. Generated mods are marked `is_partial_data: 1`.

**Response:**

```json
{
  "success": true,
  "message": "Generated 252 variants across 76 families",
  "total_generated": 252,
  "report": [
    { "family_slug": "combat-grip", "generated": 2, "slugs": ["combat-grip-standard", "combat-grip-superior"] }
  ]
}
```

#### POST /api/admin/families/:familySlug/generate

Generate missing variants for a single family.

#### PUT /api/admin/families/mods/:slug/hidden

Toggle a mod's hidden state. 

**Body:**

```json
{ "is_hidden": true }
```

#### POST /api/admin/families/:familySlug/propagate-icon

Push an icon to all members of a family.

**Body:**

```json
{
  "icon_url_webp": "https://mods.marathondb.gg/images/combat-grip-enhanced.webp"
}
```

> **Note:** Icon propagation also happens automatically when you upload an image via `POST /api/admin/mods/:slug/image` — it propagates to all siblings in the same family.

### Frontend: Rendering a Family Tree

When displaying a mod detail page, use the `variants` array to show the full family tree. The current mod is NOT included in the `variants` array (it's the siblings only).

```tsx
function ModFamilyTree({ currentMod, variants }) {
  // Build complete family: current mod + siblings
  const allVariants = [
    { slug: currentMod.slug, rarity: currentMod.rarity, cost: currentMod.cost, 
      is_hidden: currentMod.is_hidden, is_verified: currentMod.is_verified },
    ...variants
  ];

  // Sort by rarity tier
  const RARITY_ORDER = { standard: 0, enhanced: 1, deluxe: 2, superior: 3 };
  allVariants.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99));

  return (
    <div className="family-tree">
      <h3>{currentMod.name} — Variants</h3>
      <div className="tier-row">
        {allVariants
          .filter(v => !v.is_hidden)   // optionally hide hidden variants
          .map(v => (
            <a 
              key={v.slug} 
              href={`/mods/${v.slug}`}
              className={`tier-card ${v.slug === currentMod.slug ? 'active' : ''}`}
            >
              <span className={`rarity-${v.rarity}`}>
                {v.rarity.charAt(0).toUpperCase() + v.rarity.slice(1)}
              </span>
              {v.cost != null && <span>{v.cost} credits</span>}
              {v.is_verified && <span>✓</span>}
            </a>
          ))}
      </div>
    </div>
  );
}
```

**Grouping mods by family in a list view:**

```js
function groupByFamily(mods) {
  const families = new Map();
  const standalone = [];

  for (const mod of mods) {
    if (!mod.family_slug) {
      standalone.push(mod);
      continue;
    }
    if (!families.has(mod.family_slug)) {
      families.set(mod.family_slug, []);
    }
    families.get(mod.family_slug).push(mod);
  }

  // Sort each family by rarity
  const RARITY_ORDER = { standard: 0, enhanced: 1, deluxe: 2, superior: 3, prestige: 4 };
  for (const [, variants] of families) {
    variants.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99));
  }

  return { families: [...families.entries()], standalone };
}
```

### Frontend: Filtering Hidden Mods

Hidden mods (`is_hidden: 1`) are returned by the API but should be hidden from users by default. This allows data to exist without being displayed, and can be toggled on later.

```js
// Filter out hidden mods in list views
const visibleMods = allMods.filter(m => !m.is_hidden);

// In family trees, you may want to show hidden variants as dimmed/locked
const allVariants = family.filter(v => !v.is_hidden || showHidden);
```

**When to show hidden mods:**
- **Public list pages**: Filter them out entirely
- **Mod detail pages**: Show the variant slot as "locked" or dimmed in the family tree (so users see there's a V1/V3/V4 but can't click)
- **Admin**: Always show, with a visual indicator

---

## Admin Endpoints

All admin endpoints are under `/api/admin/`. Standard JSON response wrapper:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Error message" }
```

---

### Seasons

#### GET /api/admin/seasons

Same as public but includes all seasons regardless of status.

#### POST /api/admin/seasons

Create a new season. If `is_current` is true, all other seasons are set to not-current.

**Body:**

```json
{
  "name": "Season 2",
  "version": "2.0",
  "patch_version": "2.0.0",
  "patch_notes": "Balance changes",
  "season_type": "release",
  "release_date": "2025-06-01",
  "end_date": null,
  "is_current": true
}
```

Required: `name`. All other fields optional.

#### PUT /api/admin/seasons/:id

Update a season. Send only the fields you want to change.

**Allowed Fields:** `name`, `version`, `patch_version`, `patch_notes`, `season_type`, `release_date`, `end_date`, `is_current`

#### DELETE /api/admin/seasons/:id

Delete a season. Cannot delete the current season.

---

### Mods CRUD

#### GET /api/admin/mods

List all mods including inactive ones. Returns extra fields: `compatible_weapon_count`, `effect_count`, `season_name`.

#### POST /api/admin/mods

Create a new mod.

**Body:**

```json
{
  "slug": "extended-mag-enhanced",
  "name": "Extended Magazine",
  "slot_type": "magazine",
  "rarity": "enhanced",
  "description": "Slightly increases magazine capacity",
  "ability_name": "Extended Capacity",
  "ability_description": "Adds extra rounds",
  "damage_type": null,
  "cost": 60,
  "icon_url_webp": "https://mods.marathondb.gg/images/extended-mag-enhanced.webp",
  "is_active": 1,
  "is_verified": 0,
  "is_partial_data": false,
  "partial_data_notes": null,
  "family_slug": "extended-mag",
  "is_hidden": 0,
  "season_id": 1,
  "patch_number": null,
  "patch_notes": null
}
```

**Required:** `slug`, `name`, `slot_type`, `rarity`

#### PUT /api/admin/mods/:slug

Update a mod. Send only the fields you want to change.

**Allowed Fields:** `name`, `slot_type`, `rarity`, `description`, `ability_name`, `ability_description`, `damage_type`, `cost`, `icon_url_webp`, `is_active`, `is_verified`, `is_partial_data`, `partial_data_notes`, `family_slug`, `is_hidden`, `season_id`, `patch_number`, `patch_notes`

#### DELETE /api/admin/mods/:slug

Delete a single mod and all associated data.

#### DELETE /api/admin/mods

**WARNING — Destructive:** Deletes ALL mods, effects, compatibility, and history. Used for fresh start only.

---

### Mod Effects

Base stat effects that apply to all compatible weapons (unless overridden by per-weapon effects).

#### GET /api/admin/mods/:slug/effects

Get all effects for a mod.

#### POST /api/admin/mods/:slug/effects

Add a single effect.

**Body:**

```json
{
  "stat_key": "magazine_size",
  "delta": 10,
  "unit": "flat",
  "display_text": "+10 rounds"
}
```

**Required:** `stat_key`, `delta`, `unit`

#### PUT /api/admin/mods/:slug/effects

**Replace ALL** effects for a mod (delete-and-reinsert). Send the full array.

**Body:**

```json
[
  { "stat_key": "magazine_size", "delta": 10, "unit": "flat", "display_text": "+10 rounds" },
  { "stat_key": "reload_speed", "delta": -5, "unit": "percent", "display_text": "-5% reload" }
]
```

#### DELETE /api/admin/mods/:slug/effects/:id

Remove a single effect by ID.

---

### Mod History

Track balance changes across seasons/patches.

#### GET /api/admin/mods/:slug/history

Get all history entries for a mod, newest first.

#### POST /api/admin/mods/:slug/history

Add a history entry.

**Body:**

```json
{
  "season_id": 1,
  "patch_number": "1.0.1",
  "change_type": "buffed",
  "summary": "Increased magazine bonus from 8 to 10",
  "previous_values": "{\"magazine_size\": 8}",
  "new_values": "{\"magazine_size\": 10}"
}
```

**Required:** `season_id`, `change_type`

#### DELETE /api/admin/mods/:slug/history/:id

Remove a history entry by ID.

---

### Weapon Mod Slots

Define which slot types a weapon has (e.g., a weapon has optic + barrel + magazine).

#### GET /api/admin/weapons/:slug/slots

Get slot configuration for a weapon.

#### PUT /api/admin/weapons/:slug/slots

**Replace ALL** slots for a weapon. Send the full array.

**Body:**

```json
[
  { "slot_number": 1, "slot_type": "optic" },
  { "slot_number": 2, "slot_type": "barrel" },
  { "slot_number": 3, "slot_type": "magazine" }
]
```

---

### Weapon-Mod Compatibility

Define which weapons can use which mods.

#### GET /api/admin/weapons/:slug/mods

Get all mods compatible with a weapon. Compatible mod objects expose `icon_url_webp`.

#### POST /api/admin/weapons/:weapon_slug/mods/:mod_slug

Add a compatibility link. Returns `409` if already exists.

**No body required.**

#### DELETE /api/admin/weapons/:weapon_slug/mods/:mod_slug

Remove compatibility. Also cleans up any per-weapon effects for that weapon+mod pair.

---

### Per-Weapon Mod Effects

Override base mod effects for a specific weapon. For example, a mag mod might give +10 rounds to ARs but +8 to SMGs.

Two URL patterns are available. Both do the same thing — use whichever is more convenient.

#### Weapon-centric URLs

```
GET    /api/admin/weapons/:weapon_slug/mods/:mod_slug/effects
PUT    /api/admin/weapons/:weapon_slug/mods/:mod_slug/effects
```

#### Mod-centric URLs (convenience routes)

```
PUT    /api/admin/mods/:mod_slug/weapon-effects/:weapon_slug
DELETE /api/admin/mods/:mod_slug/weapon-effects/:weapon_slug
```

#### GET /api/admin/weapons/:weapon_slug/mods/:mod_slug/effects

Get per-weapon effects for a specific weapon+mod pair.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "weapon_slug": "smg-x",
      "mod_slug": "extended-mag",
      "stat_key": "magazine_size",
      "delta": 8,
      "unit": "flat",
      "display_text": "+8 rounds (SMG)"
    }
  ]
}
```

#### PUT (either URL pattern)

**Replace ALL** per-weapon effects for a weapon+mod pair. Requires compatibility to exist first.

**Body:**

```json
[
  { "stat_key": "magazine_size", "delta": 8, "unit": "flat", "display_text": "+8 rounds (SMG)" }
]
```

Returns `404` if weapon-mod compatibility doesn't exist.

#### DELETE /api/admin/mods/:mod_slug/weapon-effects/:weapon_slug

Remove all per-weapon effects for a weapon+mod pair.

---

### Image Upload

Upload a mod icon. The image is stored in KV and served at `/images/:slug.webp`. The mod's `icon_url_webp` field is automatically updated.

#### POST /api/admin/mods/:slug/image

**Content-Type:** `multipart/form-data`

**Form Field:** `file` — the WebP image binary

**Example (JavaScript):**

```js
const formData = new FormData();
formData.append('file', blob, 'icon.webp');

const res = await fetch(`https://mods.marathondb.gg/api/admin/mods/${slug}/image`, {
  method: 'POST',
  body: formData,
});
```

**Response:**

```json
{
  "success": true,
  "data": {
    "key": "mod-icons/extended-mag-enhanced.webp",
    "url": "https://mods.marathondb.gg/images/extended-mag-enhanced.webp",
    "size": 4096,
    "family_propagated": true
  }
}
```

> **Icon propagation:** When a mod has a `family_slug`, uploading an icon automatically updates `icon_url_webp` for ALL siblings in the family. The `family_propagated` field in the response indicates whether this happened.

> **Frontend tip:** Convert images to 128x128 WebP client-side before uploading using canvas + `toBlob('image/webp')`.

---

## Frontend Implementation Notes

### Displaying mod effects with per-weapon overrides

When showing a mod's effects for a specific weapon:

1. Check `compatible_weapons` for the weapon slug
2. If `.effects` array is non-empty — use those (per-weapon override)
3. If `.effects` array is empty — fall back to the base `effects` array

```js
function getEffectsForWeapon(modDetail, weaponSlug) {
  const weaponEntry = modDetail.compatible_weapons.find(
    w => w.weapon_slug === weaponSlug
  );
  if (weaponEntry?.effects?.length > 0) {
    return weaponEntry.effects;  // per-weapon override
  }
  return modDetail.effects;       // base effects
}
```

### Building a weapon loadout mod picker

Use `GET /api/weapons/:slug/mods` — it returns mods pre-organized by slot with per-weapon effects included in `weapon_effects` on each mod object.

### Mod icon URL

Use `icon_url_webp` for mod icons:

```js
const iconSrc = mod.icon_url_webp || '/placeholder.webp';
```

### Family-aware mod selector (weapon loadout builder)

When building a mod picker for weapon loadouts, group mods by family so users can pick a mod and then select the tier:

```js
async function buildModPicker(weaponSlug) {
  const res = await fetch(`https://mods.marathondb.gg/api/weapons/${weaponSlug}/mods`);
  const { data } = await res.json();

  for (const slot of data.slots) {
    // Group this slot's mods by family
    const byFamily = new Map();
    for (const mod of slot.mods) {
      if (mod.is_hidden) continue; // skip hidden
      const key = mod.family_slug || mod.slug; // prestige mods are standalone
      if (!byFamily.has(key)) byFamily.set(key, []);
      byFamily.get(key).push(mod);
    }

    // Each family becomes one "row" with tier buttons
    for (const [familySlug, variants] of byFamily) {
      const RARITY_ORDER = { standard: 0, enhanced: 1, deluxe: 2, superior: 3, prestige: 4 };
      variants.sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
      // Render: icon + name + [V1] [V2] [V3] [V4] tier buttons
    }
  }
}
```

### Detecting auto-generated vs manually curated

Auto-generated variants have `is_partial_data: 1` and `partial_data_notes` explaining they were generated. Use this to show a subtle indicator:

```js
if (mod.is_partial_data) {
  // Show "estimated stats" label, or a ⚠ icon
  // partial_data_notes contains details like:
  // "Auto-generated deluxe variant from combat-grip-enhanced. Verify stats and cost."
}
```
