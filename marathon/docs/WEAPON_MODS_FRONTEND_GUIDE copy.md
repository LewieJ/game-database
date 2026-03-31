# Weapon Mods API — Frontend Integration Guide

**Version:** 1.1.0  
**Base URL:** `https://mods.marathondb.gg`  
**Last Updated:** March 3, 2026  
**Server Slam · Patch 0.9.0**

---

## Overview

The Weapon Mods API provides data for all 74 weapon mods available in Marathon.  
Mods are organized by **slot type** — the physical or logical socket on a weapon where  
the mod is equipped — and by **rarity**.

### Mod Counts

| Slot | Count |
|---|:---:|
| magazine | 20 |
| barrel | 16 |
| chip | 16 |
| optic | 13 |
| grip | 5 |
| generator | 2 |
| shield | 2 |
| **Total** | **74** |

| Rarity | Count |
|---|:---:|
| enhanced | 44 |
| deluxe | 17 |
| superior | 6 |
| prestige | 7 |

---

## Endpoints

### `GET /api/mods`

Returns all active mods. Supports optional query filters.

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `slot` | string | Filter by slot type: `optic` `barrel` `magazine` `grip` `chip` `generator` `shield` |
| `rarity` | string | Filter by rarity: `enhanced` `deluxe` `superior` `prestige` |
| `damage_type` | string | Filter by damage type: `Ballistic` `Volt` `Ballistic / Volt` |
| `season` | string | Filter by season version slug (e.g. `server-slam`) |

**Example Request**
```
GET /api/mods?slot=chip&rarity=enhanced
```

**Response**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 56,
      "slug": "battle-runner",
      "name": "Battle Runner",
      "slot_type": "chip",
      "rarity": "enhanced",
      "description": "Eliminations with this weapon grant increased sprint speed for a short duration.",
      "ability_name": null,
      "ability_description": null,
      "damage_type": "Ballistic / Volt",
      "cost": 23,
      "icon_url": "https://helpbot.marathondb.gg/assets/items/mods/chips/chip-1-72x72.png",
      "icon_url_webp": null,
      "is_active": 1,
      "season_id": 1,
      "season_name": "Server Slam"
    }
  ]
}
```

---

### `GET /api/mods/:slug`

Returns a single mod with full details: passive effects, compatible weapons, and patch history.

**Example Request**
```
GET /api/mods/thermal-optic
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": 9,
    "slug": "thermal-optic",
    "name": "Thermal Optic",
    "slot_type": "optic",
    "rarity": "deluxe",
    "description": "Increases zoom and ADS accuracy.",
    "ability_name": "Thermal Sight",
    "ability_description": "This sight highlights hostile heat signatures.",
    "damage_type": "Ballistic / Volt",
    "cost": 207,
    "icon_url": "https://helpbot.marathondb.gg/assets/items/mods/optics/optic-64x64.png",
    "icon_url_webp": null,
    "is_active": 1,
    "season_id": 1,
    "season_name": "Server Slam",
    "effects": [
      {
        "id": 1,
        "stat_key": "ads_accuracy",
        "delta": 5,
        "unit": "percent",
        "display_text": "+5%"
      }
    ],
    "weapon_specific_effects": {
      "overrun-ar": [
        {
          "id": 10,
          "stat_key": "ads_accuracy",
          "delta": 7,
          "unit": "percent",
          "display_text": "+7%"
        }
      ]
    },
    "is_partial_data": 0,
    "partial_data_notes": null,
    "compatible_weapons": [
      "brrt-smg",
      "bully-smg",
      "copperhead-rf",
      "impact-har",
      "overrun-ar",
      "v75-scar"
    ],
    "history": [
      {
        "id": 1,
        "season_id": 1,
        "season_name": "Server Slam",
        "patch_number": "0.9.0",
        "change_type": "added",
        "summary": "Added to the game.",
        "previous_values": null,
        "new_values": null,
        "changed_at": "2026-03-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### `GET /api/weapons/:weapon_slug/mods`

Returns all mods compatible with a specific weapon.

**Example Request**
```
GET /api/weapons/overrun-ar/mods
```

**Response**
```json
{
  "success": true,
  "count": 31,
  "data": [
    {
      "slug": "battle-runner",
      "name": "Battle Runner",
      "slot_type": "chip",
      "rarity": "enhanced",
      "damage_type": "Ballistic / Volt",
      "cost": 23,
      "icon_url": "https://helpbot.marathondb.gg/assets/items/mods/chips/chip-1-72x72.png"
    }
  ]
}
```

---

### `GET /api/weapons/:weapon_slug/slots`

Returns the mod slot layout for a weapon (which slot types it has and in what order).

**Example Request**
```
GET /api/weapons/overrun-ar/slots
```

**Response**
```json
{
  "success": true,
  "data": [
    { "weapon_slug": "overrun-ar", "slot_number": 1, "slot_type": "optic" },
    { "weapon_slug": "overrun-ar", "slot_number": 2, "slot_type": "barrel" },
    { "weapon_slug": "overrun-ar", "slot_number": 3, "slot_type": "magazine" },
    { "weapon_slug": "overrun-ar", "slot_number": 4, "slot_type": "chip" }
  ]
}
```

---

### `GET /api/seasons`

Returns all seasons (currently just Server Slam).

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Server Slam",
      "version": "server-slam",
      "patch_version": "0.9.0",
      "season_type": "alpha",
      "is_current": 1
    }
  ]
}
```

---

## Data Reference

### Mod Object (List)

```typescript
interface ModSummary {
  id:                  number;
  slug:                string;        // URL-safe identifier e.g. "thermal-optic"
  name:                string;
  slot_type:           SlotType;
  rarity:              Rarity;
  description:         string | null; // Passive stat description
  ability_name:        string | null; // Named special ability (e.g. "Thermal Sight")
  ability_description: string | null; // Ability tooltip text
  damage_type:         DamageType | null;
  cost:                number | null; // Credit cost
  icon_url:            string | null;
  icon_url_webp:       string | null;
  is_active:           0 | 1;
  season_id:           number | null;
  season_name:         string | null;
}
```

### Mod Object (Detail — `GET /api/mods/:slug`)

```typescript
interface ModDetail extends ModSummary {
  patch_number:             string | null;
  is_partial_data:          0 | 1;          // 1 if data is incomplete
  partial_data_notes:       string | null;  // Free text explaining what we do/don't know
  effects:                  ModEffect[];    // Default effects for all weapons
  weapon_specific_effects:  Record<string, ModEffect[]>; // Per-weapon overrides
  compatible_weapons:       string[];       // Array of weapon slugs
  history:                  ModHistory[];
}

interface ModEffect {
  id:           number;
  stat_key:     string;               // e.g. "ads_accuracy", "reload_speed"
  delta:        number;               // Numeric change value
  unit:         "flat" | "percent" | "degrees" | "seconds" | "multiplier";
  display_text: string | null;        // Human-readable e.g. "+5%"
}

interface ModHistory {
  id:              number;
  season_id:       number;
  season_name:     string;
  patch_number:    string | null;
  change_type:     ChangeType;
  summary:         string | null;
  previous_values: string | null;     // JSON string of old values
  new_values:      string | null;     // JSON string of new values
  changed_at:      string;            // ISO 8601 timestamp
}
```

### Type Enums

```typescript
type SlotType    = "optic" | "barrel" | "magazine" | "grip" | "chip" | "generator" | "shield";
type Rarity      = "enhanced" | "deluxe" | "superior" | "prestige";
type DamageType  = "Ballistic" | "Volt" | "Ballistic / Volt" | "Volt / Ballistic";
type ChangeType  = "added" | "buffed" | "nerfed" | "reworked" | "removed" | "unchanged";
```

---

## Slot Reference

| Slot | Icon Preview | Typical Weapons |
|---|---|---|
| `optic` | Sights & scopes | SMGs, ARs, Precision Rifles, Snipers |
| `barrel` | Barrels & muzzles | All weapon classes |
| `magazine` | Magazines & chambers | All weapon classes |
| `grip` | Grips | ARs, Shotguns |
| `chip` | Processor chips | All weapons (universal) |
| `generator` | Energy generators | Rail guns (Ares RG, V00 Zeus RG) |
| `shield` | Energy shields | LMGs (Conquest, Demolition, Retaliator) |

---

## Rarity Color Reference

Use these for styling rarity pills or labels:

| Rarity | Hex | CSS var suggestion |
|---|---|---|
| enhanced | `#a0a0a0` | `--rarity-enhanced` |
| deluxe | `#4db6ff` | `--rarity-deluxe` |
| superior | `#a363e3` | `--rarity-superior` |
| prestige | `#ffca28` | `--rarity-prestige` |

---

## Slot Color Reference

| Slot | Background | Text |
|---|---|---|
| optic | `#1a3a4a` | `#7ecff8` |
| barrel | `#2a2a1a` | `#f5c542` |
| magazine | `#1a2a1a` | `#7ae07a` |
| grip | `#2a1a1a` | `#f08080` |
| chip | `#1e1a2e` | `#b07aff` |
| generator | `#1a2a2a` | `#7af5f5` |
| shield | `#2a1a2a` | `#f07af0` |

---

## Ability vs. Description

Some mods have both a `description` and an `ability_name` + `ability_description`. They are distinct concepts:

| Field | Purpose | Example |
|---|---|---|
| `description` | Passive stat effect text | `"Increases zoom and ADS accuracy."` |
| `ability_name` | Name of a toggled/triggered special ability | `"Thermal Sight"` |
| `ability_description` | Tooltip for that ability | `"This sight highlights hostile heat signatures."` |

A mod can have either, both, or neither. Always check for null:

```typescript
function renderModTooltip(mod: ModSummary) {
  const lines: string[] = [];
  if (mod.description) lines.push(mod.description);
  if (mod.ability_name && mod.ability_description) {
    lines.push(`[${mod.ability_name}] ${mod.ability_description}`);
  }
  return lines.join('\n');
}
```

---

## Chip Mods — Universal Compatibility

All **chip** mods are compatible with every weapon. When building a weapon loadout UI,  
you can skip a per-weapon lookup for chips and show them as always available.

```typescript
// Quick check — chips are always available
function getAvailableMods(allMods: ModSummary[], weaponCompatSlugs: string[]) {
  return allMods.filter(m =>
    m.slot_type === 'chip' || weaponCompatSlugs.includes(m.slug)
  );
}
```

---

## Common Usage Patterns

### Load all mods and group by slot

```typescript
const res  = await fetch('https://mods.marathondb.gg/api/mods');
const json = await res.json();

const bySlot = json.data.reduce((acc, mod) => {
  (acc[mod.slot_type] ??= []).push(mod);
  return acc;
}, {} as Record<string, ModSummary[]>);

// bySlot.chip, bySlot.optic, bySlot.magazine …
```

### Load mods for a specific weapon

```typescript
const res  = await fetch(`https://mods.marathondb.gg/api/weapons/${weaponSlug}/mods`);
const json = await res.json();
const mods = json.data; // ModSummary[]
```

### Load mod detail on click

```typescript
async function loadMod(slug: string): Promise<ModDetail> {
  const res  = await fetch(`https://mods.marathondb.gg/api/mods/${slug}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}
```

### Filter by damage type client-side

```typescript
// Volt-only mods for a Volt weapon loadout
const voltMods = allMods.filter(m =>
  m.damage_type === 'Volt' || m.damage_type?.includes('Volt')
);
```

---

## Partial Data

Some mods have incomplete or unverified data. Check `is_partial_data` and display a warning when it's `1`.

```typescript
function renderModCard(mod: ModDetail) {
  if (mod.is_partial_data) {
    // Show a warning badge
    console.log('⚠ Partial data:', mod.partial_data_notes);
  }
}
```

---

## Per-Weapon Effects

Some mods affect each weapon differently. For example, a magazine mod might grant +15 ammo  
on one weapon but only +10 on another.

The `weapon_specific_effects` object is keyed by weapon slug. If a weapon has an entry,  
use those effects **instead of** the default `effects` array.

```typescript
function getEffectsForWeapon(mod: ModDetail, weaponSlug: string): ModEffect[] {
  // Use weapon-specific overrides if they exist, otherwise fall back to defaults
  return mod.weapon_specific_effects[weaponSlug] ?? mod.effects;
}

// Example: display mod stats on a weapon detail page
const effects = getEffectsForWeapon(mod, 'overrun-ar');
effects.forEach(e => {
  console.log(`${e.stat_key}: ${e.display_text ?? e.delta}`);
});
```

---

## Test URLs

| Description | URL |
|---|---|
| All mods | https://mods.marathondb.gg/api/mods |
| All chip mods | https://mods.marathondb.gg/api/mods?slot=chip |
| All optic mods | https://mods.marathondb.gg/api/mods?slot=optic |
| All shield mods | https://mods.marathondb.gg/api/mods?slot=shield |
| Prestige rarity only | https://mods.marathondb.gg/api/mods?rarity=prestige |
| Single mod — Thermal Optic | https://mods.marathondb.gg/api/mods/thermal-optic |
| Single mod — Battle Runner | https://mods.marathondb.gg/api/mods/battle-runner |
| Single mod — Balanced Shield | https://mods.marathondb.gg/api/mods/balanced-shield |
| All mods for Overrun AR | https://mods.marathondb.gg/api/weapons/overrun-ar/mods |
| Slot layout for Overrun AR | https://mods.marathondb.gg/api/weapons/overrun-ar/slots |
| Seasons | https://mods.marathondb.gg/api/seasons |
