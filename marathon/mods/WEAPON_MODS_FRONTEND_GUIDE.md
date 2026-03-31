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
| `slot_type` | `optic`, `barrel`, `magazine`, `grip`, `chip`, `generator` |
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
  icon_url: string | null;
  icon_url_webp: string | null;
  is_active: number;           // 0 or 1
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
  icon_url: string | null;
  icon_url_webp: string | null;
  is_active: number;
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
      "slug": "extended-mag",
      "name": "Extended Magazine",
      "slot_type": "magazine",
      "rarity": "enhanced",
      "description": "Increases magazine capacity",
      "ability_name": "Extended Capacity",
      "cost": 2,
      "icon_url": null,
      "icon_url_webp": "https://mods.marathondb.gg/images/extended-mag.webp",
      "is_active": 1,
      "season_id": 1,
      "season_name": "Season 1",
      "patch_number": "1.0.0",
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
    "icon_url": null,
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
        "effects": []
      },
      {
        "weapon_slug": "smg-x",
        "effects": [
          {
            "id": 5,
            "weapon_slug": "smg-x",
            "mod_slug": "extended-mag",
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
        "season_name": "Season 1",
        "patch_number": "1.0.0",
        "change_type": "added",
        "summary": "Mod introduced",
        "previous_values": null,
        "new_values": null,
        "changed_at": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

> **Per-weapon effects:** If `compatible_weapons[].effects` is non-empty, those override the base `effects` for that specific weapon. If empty, the weapon uses the base effects.

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
            "icon_url": null,
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

**Example:** `https://mods.marathondb.gg/images/extended-mag.webp`

Returns `404` if no image exists for that slug.

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
  "slug": "extended-mag",
  "name": "Extended Magazine",
  "slot_type": "magazine",
  "rarity": "enhanced",
  "description": "Increases magazine capacity",
  "ability_name": "Extended Capacity",
  "ability_description": "Adds extra rounds",
  "damage_type": null,
  "cost": 2,
  "icon_url": null,
  "icon_url_webp": null,
  "is_active": 1,
  "is_verified": 0,
  "is_partial_data": false,
  "partial_data_notes": null,
  "season_id": 1,
  "patch_number": "1.0.0",
  "patch_notes": null
}
```

**Required:** `slug`, `name`, `slot_type`, `rarity`

#### PUT /api/admin/mods/:slug

Update a mod. Send only the fields you want to change.

**Allowed Fields:** `name`, `slot_type`, `rarity`, `description`, `ability_name`, `ability_description`, `damage_type`, `cost`, `icon_url`, `icon_url_webp`, `is_active`, `is_verified`, `is_partial_data`, `partial_data_notes`, `season_id`, `patch_number`, `patch_notes`

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

Get all mods compatible with a weapon (returns full mod objects with `id`, `slug`, `name`, `slot_type`, `rarity`, `icon_url`).

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
    "key": "mod-icons/extended-mag.webp",
    "url": "https://mods.marathondb.gg/images/extended-mag.webp",
    "size": 4096
  }
}
```

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

Use `icon_url_webp` if available, otherwise fall back to `icon_url`:

```js
const iconSrc = mod.icon_url_webp || mod.icon_url || '/placeholder.png';
```
