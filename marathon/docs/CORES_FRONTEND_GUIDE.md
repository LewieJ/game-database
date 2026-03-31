# Cores API — Frontend Integration Guide

> **API Base URL:** `https://cores.marathondb.gg`
> **Version:** 1.0.0
> **Last Updated:** June 2025
> **Total Cores Seeded:** 75 (across 7 runner types + "all")

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [List Cores](#1-list-cores)
   - [Cores by Runner](#2-cores-by-runner)
   - [Core Detail](#3-core-detail)
   - [List Perks](#4-list-perks)
   - [Perk Detail](#5-perk-detail)
   - [All Seasons](#6-all-seasons)
   - [Current Season](#7-current-season)
   - [Stats Summary](#8-stats-summary)
3. [Data Model](#data-model)
4. [Runner Types](#runner-types)
5. [Rarity Hierarchy](#rarity-hierarchy)
6. [Frontend Implementation Patterns](#frontend-implementation-patterns)
7. [TypeScript Types](#typescript-types)
8. [Test URLs](#test-urls)

---

## Quick Start

```ts
const API_BASE = 'https://cores.marathondb.gg';

// Fetch all active cores
const res = await fetch(`${API_BASE}/api/cores`);
const { success, count, data } = await res.json();
// data = Core[] with effects enriched

// Fetch cores for a specific runner
const res2 = await fetch(`${API_BASE}/api/cores/runner/assassin`);
const { data: assassinCores } = await res2.json();

// Fetch a single core by slug
const res3 = await fetch(`${API_BASE}/api/cores/siphon-strike`);
const { data: coreDetail } = await res3.json();
// coreDetail includes: effects, history, tags, perk_rolls
```

**CORS** is fully open (`origin: *`) — call directly from any frontend.

---

## API Endpoints

### Health Check

```
GET /
```

Returns API metadata and available endpoints:

```json
{
  "api": "Marathon Cores API",
  "version": "1.0.0",
  "description": "Runner-specific cores — each runner has their own cores pool.",
  "runners": ["assassin","destroyer","recon","rook","thief","triage","vandal"],
  "endpoints": {
    "cores": "GET /api/cores?runner=&rarity=&active=",
    "by_runner": "GET /api/cores/runner/:runner",
    "core_detail": "GET /api/cores/:slug",
    "stats": "GET /api/stats/summary",
    "seasons": "GET /api/seasons/all",
    "current_season": "GET /api/seasons/current",
    "admin": "/api/admin/*"
  }
}
```

---

### 1. List Cores

```
GET /api/cores
```

Returns all cores with enriched effects. This is the **primary browse endpoint**.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `runner` | string | — | Filter by runner type |
| `rarity` | string | — | Filter by rarity (`standard`, `enhanced`, `deluxe`, `superior`, `prestige`) |
| `season_id` | number | — | Filter by season |
| `active` | string | `"true"` | `"true"` = active only, `"false"` = inactive only, omit or other = no filter |
| `has_cleanse` | `1` | — | Cores that cleanse status effects |
| `affects_crew` | `1` | — | Cores that affect all crew members |
| `reduces_cooldown` | `1` | — | Cores that reduce cooldowns |
| `impacts_movement` | `1` | — | Cores that affect movement |
| `affects_damage` | `1` | — | Cores that modify damage |
| `affects_survivability` | `1` | — | Cores that affect health/shields/resistance |
| `affects_loot` | `1` | — | Cores that affect loot/extraction |
| `is_passive` | `1` | — | Always-on cores (`0` for conditional) |
| `enhances_ability` | string | — | `prime`, `tactical`, `melee`, `passive`, `class_ability` |
| `trigger_condition` | string | — | `always_active`, `on_kill`, `on_revive`, `on_extraction`, `backpack_full`, `low_health`, `on_damage_taken`, `on_ability_use` |

> **Note:** Multiple capability filters are **AND-ed** — a core must match ALL active filters.

**Response:**

```json
{
  "success": true,
  "count": 75,
  "data": [
    {
      "id": 1,
      "slug": "siphon-strike",
      "name": "Siphon Strike",
      "runner_type": "assassin",
      "rarity": "enhanced",
      "description": "Melee kills restore a portion of health.",
      "credits": null,
      "icon_url": "https://marathon-guide.com/...",
      "is_active": 1,
      "season_id": 1,
      "patch_number": null,

      "has_cleanse": 0,
      "affects_crew": 0,
      "reduces_cooldown": 0,
      "impacts_movement": 0,
      "affects_damage": 0,
      "affects_survivability": 1,
      "affects_loot": 0,
      "is_passive": 0,

      "enhances_ability": "melee",
      "trigger_condition": "on_kill",
      "cooldown_reduction": null,
      "ability_cooldown": null,
      "ability_duration": null,
      "ability_range": null,

      "created_at": "...",
      "updated_at": "...",
      "season_name": "Season 0",
      "effect_count": 1,
      "tag_count": 3,

      "effects": [
        {
          "id": 1,
          "core_id": 1,
          "stat_name": "health_on_melee_kill",
          "stat_value": 25,
          "display_text": "+25 HP on melee kill"
        }
      ]
    }
  ]
}
```

---

### 2. Cores by Runner

```
GET /api/cores/runner/{runner}
```

**Valid runner values:** `all`, `assassin`, `destroyer`, `recon`, `rook`, `thief`, `triage`, `vandal`

Returns active cores for the given runner, sorted by rarity then name. Enriched with effects.

**This is the primary endpoint for loadout builders** — when a user picks a runner, fetch its available cores.

```json
{
  "success": true,
  "runner": "destroyer",
  "count": 14,
  "data": [
    {
      "id": 13,
      "slug": "explosive-payload",
      "name": "Explosive Payload",
      "runner_type": "destroyer",
      "rarity": "enhanced",
      "description": "Explosions deal increased damage in a wider area of effect.",
      "effects": [
        {
          "stat_name": "explosion_damage",
          "stat_value": 15,
          "display_text": "+15% explosion damage"
        },
        {
          "stat_name": "explosion_radius",
          "stat_value": 10,
          "display_text": "+10% explosion radius"
        }
      ],
      "...": "..."
    }
  ]
}
```

---

### 3. Core Detail

```
GET /api/cores/{slug}
```

Returns a single core with **full enrichment**: effects, history, tags, and perk_rolls.

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "siphon-strike",
    "name": "Siphon Strike",
    "runner_type": "assassin",
    "rarity": "enhanced",
    "description": "Melee kills restore a portion of health.",
    "credits": null,
    "icon_url": "https://marathon-guide.com/...",
    "is_active": 1,
    "season_id": 1,
    "patch_number": null,
    "season_name": "Season 0",

    "has_cleanse": 0,
    "affects_crew": 0,
    "reduces_cooldown": 0,
    "impacts_movement": 0,
    "affects_damage": 0,
    "affects_survivability": 1,
    "affects_loot": 0,
    "is_passive": 0,
    "enhances_ability": "melee",
    "trigger_condition": "on_kill",
    "cooldown_reduction": null,
    "ability_cooldown": null,
    "ability_duration": null,
    "ability_range": null,

    "effects": [
      {
        "id": 1,
        "core_id": 1,
        "stat_name": "health_on_melee_kill",
        "stat_value": 25,
        "display_text": "+25 HP on melee kill"
      }
    ],

    "history": [
      {
        "id": 1,
        "core_id": 1,
        "season_id": 1,
        "patch_number": "0.5.0",
        "change_type": "added",
        "summary": "Initial release",
        "previous_values": null,
        "new_values": null,
        "changed_at": "2025-06-01T00:00:00.000Z",
        "season_name": "Season 0"
      }
    ],

    "tags": [
      { "id": 1, "core_id": 1, "tag_category": "playstyle", "tag_value": "aggressive" },
      { "id": 2, "core_id": 1, "tag_category": "synergy",   "tag_value": "melee_focused" }
    ],

    "perk_rolls": [
      {
        "id": 1,
        "core_id": 1,
        "perk_id": 5,
        "roll_slot": 1,
        "is_curated": 1,
        "weight": 100,
        "created_at": "...",
        "perk_name": "Bloodthirst",
        "perk_slug": "bloodthirst",
        "perk_description": "Kills grant temporary health regen.",
        "perk_effect_type": "on_kill",
        "perk_effect_value": "+5 HP/s for 3s",
        "perk_icon_url": null
      }
    ]
  }
}
```

**Key differences from list endpoint:**
- Adds `history` array (balance change log)
- Adds `tags` array (category/value taxonomy)
- Adds `perk_rolls` array with full perk data joined in
- Does NOT include `effect_count` / `tag_count` — has the full arrays instead

---

### 4. List Perks

```
GET /api/perks
```

Returns all active perks. Perks are standalone reusable definitions that can appear on many cores via roll slots.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `effect_type` | string | Filter by effect type (e.g. `on_kill`, `passive`, `always_active`) |
| `season_id` | number | Filter by season |

```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": 1,
      "slug": "bloodthirst",
      "name": "Bloodthirst",
      "description": "Kills grant temporary health regen.",
      "effect_type": "on_kill",
      "effect_value": "+5 HP/s for 3s",
      "icon_url": null,
      "season_id": 1,
      "is_active": 1,
      "created_at": "...",
      "updated_at": "...",
      "season_name": "Season 0"
    }
  ]
}
```

---

### 5. Perk Detail

```
GET /api/perks/{slug}
```

Returns a single perk with a `used_by` array showing which cores it appears on.

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "bloodthirst",
    "name": "Bloodthirst",
    "description": "Kills grant temporary health regen.",
    "effect_type": "on_kill",
    "effect_value": "+5 HP/s for 3s",
    "icon_url": null,
    "season_id": 1,
    "is_active": 1,
    "season_name": "Season 0",
    "used_by": [
      {
        "roll_slot": 1,
        "is_curated": 1,
        "weight": 100,
        "core_slug": "siphon-strike",
        "core_name": "Siphon Strike",
        "runner_type": "assassin",
        "rarity": "enhanced"
      }
    ]
  }
}
```

---

### 6. All Seasons

```
GET /api/seasons/all
```

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Season 0",
      "version": "0.x",
      "patch_version": null,
      "season_type": "beta",
      "release_date": "2025-05-06",
      "end_date": null,
      "patch_notes": null,
      "is_current": 1,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### 7. Current Season

```
GET /api/seasons/current
```

Returns the single season with `is_current = 1`. Returns 404 if none set.

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Season 0",
    "version": "0.x",
    "season_type": "beta",
    "is_current": 1,
    "..."
  }
}
```

---

### 8. Stats Summary

```
GET /api/stats/summary
```

Aggregated statistics about the cores database.

```json
{
  "success": true,
  "data": {
    "total": 75,
    "by_runner": [
      { "runner_type": "all",       "count": 4 },
      { "runner_type": "assassin",  "count": 12 },
      { "runner_type": "destroyer", "count": 14 },
      { "runner_type": "recon",     "count": 11 },
      { "runner_type": "rook",      "count": 1 },
      { "runner_type": "thief",     "count": 12 },
      { "runner_type": "triage",    "count": 12 },
      { "runner_type": "vandal",    "count": 10 }
    ],
    "by_rarity": [
      { "rarity": "deluxe",   "count": 14 },
      { "rarity": "enhanced", "count": 41 },
      { "rarity": "standard", "count": 20 }
    ],
    "stat_names": [
      "accuracy_bonus",
      "active_camo_duration",
      "bonus_credits",
      "explosion_damage",
      "..."
    ]
  }
}
```

---

## Data Model

### Core Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Auto-increment primary key |
| `slug` | string | URL identifier, e.g. `"siphon-strike"` |
| `name` | string | Display name, e.g. `"Siphon Strike"` |
| `runner_type` | string | `all` \| `assassin` \| `destroyer` \| `recon` \| `rook` \| `thief` \| `triage` \| `vandal` |
| `rarity` | string | `standard` \| `enhanced` \| `deluxe` \| `superior` \| `prestige` (**lowercase**) |
| `description` | string? | Core perk description text |
| `credits` | number? | Credit cost |
| `icon_url` | string? | Full URL to icon (96x96 from marathon-guide.com) |
| `is_active` | number | `1` = active, `0` = vaulted/inactive |
| `season_id` | number? | FK to seasons table |
| `patch_number` | string? | Patch version when introduced (e.g. `"0.5.0"`) |
| `season_name` | string? | Joined from seasons table |
| `created_at` | string | ISO datetime |
| `updated_at` | string | ISO datetime |

### Capability Flags

These boolean/string fields on every core describe **what the core does** and are used for API filtering:

| Field | Type | Description |
|-------|------|-------------|
| `has_cleanse` | 0/1 | Cleanses status effects (burn, slow, poison, etc.) |
| `affects_crew` | 0/1 | Effect applies to all crew members, not just the user |
| `reduces_cooldown` | 0/1 | Reduces an ability cooldown |
| `cooldown_reduction` | string? | How much cooldown is reduced (e.g. `"15%"`, `"3s"`) |
| `impacts_movement` | 0/1 | Affects sprint speed, slide, dodge, etc. |
| `affects_damage` | 0/1 | Increases or modifies damage output |
| `affects_survivability` | 0/1 | Health, shields, resistance, self-repair |
| `affects_loot` | 0/1 | Affects loot drops, extraction bonuses |
| `is_passive` | 0/1 | `1` = always-on, `0` = conditional/triggered |
| `enhances_ability` | string? | `prime` \| `tactical` \| `melee` \| `passive` \| `class_ability` |
| `trigger_condition` | string? | `always_active` \| `on_kill` \| `on_revive` \| `on_extraction` \| `backpack_full` \| `low_health` \| `on_damage_taken` \| `on_ability_use` |

### Numeric Ability Tracking

| Field | Type | Description |
|-------|------|-------------|
| `ability_cooldown` | number? | Ability cooldown in seconds |
| `ability_duration` | number? | Ability duration in seconds |
| `ability_range` | number? | Ability range in metres |

### Effect Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Effect row ID |
| `core_id` | number | FK to cores |
| `stat_name` | string | Stat being modified (e.g. `explosion_radius`, `reload_speed`, `health_on_melee_kill`) |
| `stat_value` | number | Numeric value (e.g. `25`, `15`, `-3`) |
| `display_text` | string? | Human-readable (e.g. `"+25 HP on melee kill"`, `"+15% explosion damage"`) |

### Tag Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Tag row ID |
| `core_id` | number | FK to cores |
| `tag_category` | string | Category grouping (e.g. `playstyle`, `synergy`, `meta_tier`, `keyword`) |
| `tag_value` | string | Tag label (e.g. `aggressive`, `melee_focused`, `team_support`) |

### History Object (detail endpoint only)

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | History row ID |
| `core_id` | number | FK to cores |
| `season_id` | number? | FK to seasons |
| `patch_number` | string? | Patch version of the change |
| `change_type` | string | `added` \| `buffed` \| `nerfed` \| `reworked` \| `removed` \| `unchanged` |
| `summary` | string? | Description of what changed |
| `previous_values` | string? | JSON snapshot of old values |
| `new_values` | string? | JSON snapshot of new values |
| `changed_at` | string | ISO datetime of the change |
| `season_name` | string? | Joined season name |

### Perk Roll Object (detail endpoint only)

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Roll row ID |
| `core_id` | number | FK to cores |
| `perk_id` | number | FK to perks |
| `roll_slot` | number | Slot number (1, 2, ...) — a core can have multiple perk slots |
| `is_curated` | number | `1` = guaranteed curated roll, `0` = random |
| `weight` | number | Relative probability for random rolls (higher = more likely) |
| `perk_name` | string | Joined perk name |
| `perk_slug` | string | Joined perk slug |
| `perk_description` | string? | Joined perk description |
| `perk_effect_type` | string? | Joined perk effect type |
| `perk_effect_value` | string? | Joined perk effect value |
| `perk_icon_url` | string? | Joined perk icon URL |

### Season Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Primary key |
| `name` | string | Display name (e.g. `"Season 0"`) |
| `version` | string? | Version string (e.g. `"0.x"`) |
| `patch_version` | string? | Associated patch |
| `season_type` | string | `alpha` \| `beta` \| `release` \| `event` \| `other` |
| `release_date` | string? | ISO date |
| `end_date` | string? | ISO date |
| `patch_notes` | string? | Patch notes text |
| `is_current` | number | `1` = currently active season |

### Perk Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Primary key |
| `slug` | string | URL identifier |
| `name` | string | Display name |
| `description` | string? | What the perk does |
| `effect_type` | string? | `passive`, `on_kill`, `on_revive`, `on_extraction`, `on_ability_use`, `on_damage_taken`, `on_damage_dealt`, `backpack_full`, `low_health`, `always_active`, `conditional`, `other` |
| `effect_value` | string? | Human-readable value (e.g. `"+5 HP/s for 3s"`) |
| `icon_url` | string? | Icon URL |
| `season_id` | number? | FK to seasons |
| `is_active` | number | `1` = active |
| `season_name` | string? | Joined from seasons |

---

## Runner Types

| Runner Type | Display Name | Description |
|-------------|-------------|-------------|
| `all` | All Runners | Universal cores usable by any runner |
| `assassin` | Assassin | Stealth, flanking, melee |
| `destroyer` | Destroyer | Heavy firepower, explosives |
| `recon` | Recon | Scouting, intel, pings |
| `rook` | Rook | Defensive, area control |
| `thief` | Thief | Loot, extraction, speed |
| `triage` | Triage | Healing, crew buffs, revives |
| `vandal` | Vandal | Area denial, crowd control |

**Core counts by runner (seeded):**

| Runner | Count |
|--------|-------|
| all | 4 |
| assassin | 12 |
| destroyer | 14 |
| recon | 11 |
| rook | 1 |
| thief | 12 |
| triage | 12 |
| vandal | 10 |

---

## Rarity Hierarchy

```
standard → enhanced → deluxe → superior → prestige
```

> **Important:** Rarity values are **lowercase** in the API.

| Rarity | Color Suggestion | Hex |
|--------|-----------------|-----|
| standard | Grey | `#9e9e9e` |
| enhanced | Blue | `#2196f3` |
| deluxe | Purple | `#ce93d8` |
| superior | Gold | `#ffc107` |
| prestige | Orange | `#ff5722` |

---

## Frontend Implementation Patterns

### Page Flow

```
Page load  → GET /api/cores                    (all active cores)
           → GET /api/stats/summary            (for dashboard counts)

User clicks runner tab  → filter client-side, or:
                        → GET /api/cores/runner/destroyer

User clicks core card   → GET /api/cores/{slug}
                        → Show detail modal with effects, tags, history, perk rolls
```

### Recommended UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  CORES                                       [Stats: 75]    │
├─────────────────────────────────────────────────────────────┤
│  Runner: [All] [Assassin] [Destroyer] [Recon] [Rook]       │
│          [Thief] [Triage] [Vandal]                          │
├─────────────────────────────────────────────────────────────┤
│  [Search...]    [Rarity ▾]    [Trigger ▾]                   │
│                                                             │
│  Capability Filters:                                        │
│  [⚔️ Damage] [🛡️ Survivability] [🏃 Movement] [🧹 Cleanse]   │
│  [👥 Crew] [⏱️ Cooldown] [📦 Loot] [🎯 Ability]              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ icon     │ │ icon     │ │ icon     │ │ icon     │      │
│  │ Name     │ │ Name     │ │ Name     │ │ Name     │      │
│  │ enhanced │ │ deluxe   │ │ standard │ │ enhanced │      │
│  │ [⚔️][🛡️] │ │ [🏃][⏱️] │ │ [👥][📦] │ │ [🧹]    │      │
│  │ +dmg 15  │ │ +spd 10  │ │ +hp 25%  │ │ cleanse  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

### Capability Badges Component

The boolean capability fields are perfect for small icon badges on each core card:

```tsx
const CAPABILITY_BADGES = [
  { key: 'affects_damage',        icon: '⚔️',  label: 'Damage',        color: '#ef4444' },
  { key: 'affects_survivability', icon: '🛡️',  label: 'Survivability', color: '#22c55e' },
  { key: 'impacts_movement',     icon: '🏃',  label: 'Movement',      color: '#3b82f6' },
  { key: 'has_cleanse',          icon: '🧹',  label: 'Cleanse',       color: '#a855f7' },
  { key: 'affects_crew',         icon: '👥',  label: 'Crew',          color: '#f59e0b' },
  { key: 'reduces_cooldown',     icon: '⏱️',  label: 'Cooldown',      color: '#06b6d4' },
  { key: 'affects_loot',         icon: '📦',  label: 'Loot',          color: '#84cc16' },
] as const;

function CapabilityBadges({ core }: { core: Core }) {
  const active = CAPABILITY_BADGES.filter(b => core[b.key] === 1);
  if (!active.length) return null;

  return (
    <div className="capability-badges">
      {active.map(badge => (
        <span
          key={badge.key}
          className="badge"
          title={badge.label}
          style={{ backgroundColor: badge.color + '20', color: badge.color }}
        >
          {badge.icon}
        </span>
      ))}
    </div>
  );
}
```

---

### Rarity Badge Component

```tsx
const RARITY_COLORS: Record<string, string> = {
  standard:  '#9e9e9e',
  enhanced:  '#2196f3',
  deluxe:    '#ce93d8',
  superior:  '#ffc107',
  prestige:  '#ff5722',
};

function RarityBadge({ rarity }: { rarity: string }) {
  const color = RARITY_COLORS[rarity] || '#6b7280';
  return (
    <span
      className="rarity-badge"
      style={{
        backgroundColor: color + '20',
        color,
        border: `1px solid ${color}40`,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {rarity}
    </span>
  );
}
```

---

### Trigger Condition Display

```tsx
const TRIGGER_LABELS: Record<string, { label: string; color: string }> = {
  always_active:   { label: 'Always Active',   color: '#22c55e' },
  on_kill:         { label: 'On Kill',          color: '#ef4444' },
  on_revive:       { label: 'On Revive',        color: '#3b82f6' },
  on_extraction:   { label: 'On Extraction',    color: '#f59e0b' },
  backpack_full:   { label: 'Backpack Full',    color: '#84cc16' },
  low_health:      { label: 'Low Health',       color: '#f97316' },
  on_damage_taken: { label: 'On Damage Taken',  color: '#ef4444' },
  on_ability_use:  { label: 'On Ability Use',   color: '#a855f7' },
};

function TriggerBadge({ condition }: { condition: string | null }) {
  if (!condition) return null;
  const info = TRIGGER_LABELS[condition] || { label: condition, color: '#6b7280' };
  return (
    <span
      className="trigger-badge"
      style={{
        backgroundColor: info.color + '15',
        color: info.color,
        border: `1px solid ${info.color}40`,
      }}
    >
      {info.label}
    </span>
  );
}
```

---

### Ability Enhancement Display

```tsx
const ABILITY_LABELS: Record<string, string> = {
  prime:         '🔴 Prime',
  tactical:      '🔵 Tactical',
  melee:         '🗡️ Melee',
  passive:       '⚪ Passive',
  class_ability: '🟡 Class Ability',
};

function AbilityBadge({ ability }: { ability: string | null }) {
  if (!ability) return null;
  return (
    <span className="ability-badge">
      Enhances: {ABILITY_LABELS[ability] || ability}
    </span>
  );
}
```

---

### Effect Display Component

Effects use `stat_value` (numeric) and `display_text` (human-readable). Use `display_text` when available, fall back to formatting `stat_name` + `stat_value`:

```tsx
interface CoreEffect {
  id: number;
  core_id: number;
  stat_name: string;
  stat_value: number;
  display_text: string | null;
}

function EffectChip({ effect }: { effect: CoreEffect }) {
  const isPositive = effect.stat_value >= 0;
  const text = effect.display_text || `${formatStatName(effect.stat_name)} ${isPositive ? '+' : ''}${effect.stat_value}`;

  return (
    <span className={`effect-chip ${isPositive ? 'buff' : 'debuff'}`}>
      {text}
    </span>
  );
}

// Convert snake_case to display: "explosion_radius" → "Explosion Radius"
function formatStatName(key: string): string {
  return key
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
```

---

### Tags Display

Tags are organized by `tag_category`. Use them as filter chips or info labels:

```tsx
const TAG_CATEGORY_COLORS: Record<string, string> = {
  playstyle: '#a855f7',
  synergy:   '#3b82f6',
  keyword:   '#22c55e',
  meta_tier: '#f59e0b',
};

function TagList({ tags }: { tags: CoreTag[] }) {
  if (!tags?.length) return null;

  const grouped = tags.reduce((acc, tag) => {
    (acc[tag.tag_category] ??= []).push(tag);
    return acc;
  }, {} as Record<string, CoreTag[]>);

  return (
    <div className="tags">
      {Object.entries(grouped).map(([category, categoryTags]) => (
        <div key={category} className="tag-group">
          <span className="tag-category">{category}:</span>
          {categoryTags.map(tag => (
            <span
              key={tag.tag_value}
              className="tag-chip"
              style={{ color: TAG_CATEGORY_COLORS[category] || '#6b7280' }}
            >
              {tag.tag_value.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

### Perk Rolls Display

For the detail view, show perk rolls grouped by slot:

```tsx
function PerkRolls({ rolls }: { rolls: CorePerkRoll[] }) {
  if (!rolls?.length) return null;

  // Group by roll_slot
  const slots = rolls.reduce((acc, roll) => {
    (acc[roll.roll_slot] ??= []).push(roll);
    return acc;
  }, {} as Record<number, CorePerkRoll[]>);

  return (
    <section className="perk-rolls">
      <h3>Perk Rolls</h3>
      {Object.entries(slots).map(([slot, slotRolls]) => (
        <div key={slot} className="perk-slot">
          <h4>Slot {slot}</h4>
          {slotRolls.map(roll => (
            <div key={roll.id} className={`perk-roll ${roll.is_curated ? 'curated' : 'random'}`}>
              <span className="perk-name">{roll.perk_name}</span>
              {roll.is_curated === 1 && <span className="curated-badge">★ Curated</span>}
              {roll.perk_description && <p className="perk-desc">{roll.perk_description}</p>}
              {roll.perk_effect_value && <span className="perk-value">{roll.perk_effect_value}</span>}
              {!roll.is_curated && <span className="weight">Weight: {roll.weight}</span>}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
```

---

### Capability Filter Bar

Use the API query params to build a toggle-filter bar:

```tsx
const CAPABILITY_FILTERS = [
  { param: 'affects_damage',        label: '⚔️ Damage' },
  { param: 'affects_survivability', label: '🛡️ Survivability' },
  { param: 'impacts_movement',     label: '🏃 Movement' },
  { param: 'has_cleanse',          label: '🧹 Cleanse' },
  { param: 'affects_crew',         label: '👥 Crew' },
  { param: 'reduces_cooldown',     label: '⏱️ Cooldown' },
  { param: 'affects_loot',         label: '📦 Loot' },
];

function CapabilityFilterBar({ activeFilters, onToggle }: {
  activeFilters: string[];
  onToggle: (param: string) => void;
}) {
  return (
    <div className="filter-bar">
      {CAPABILITY_FILTERS.map(f => (
        <button
          key={f.param}
          className={`filter-chip ${activeFilters.includes(f.param) ? 'active' : ''}`}
          onClick={() => onToggle(f.param)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// Build API URL from active filters
function buildCoresUrl(filters: string[], runner?: string, rarity?: string): string {
  const params = new URLSearchParams();
  if (runner) params.set('runner', runner);
  if (rarity) params.set('rarity', rarity);
  filters.forEach(f => params.set(f, '1'));
  return `https://cores.marathondb.gg/api/cores?${params.toString()}`;
}
```

> **Note:** Multiple capability filters are AND-ed — a core must match ALL active filters.

---

### Passive vs. Conditional Indicator

```tsx
function PassiveIndicator({ isPassive }: { isPassive: number }) {
  return isPassive ? (
    <span className="passive-badge" title="Always active">⚡ Passive</span>
  ) : (
    <span className="conditional-badge" title="Triggered by condition">🎯 Conditional</span>
  );
}
```

---

### Core Detail Page

```tsx
function CoreDetail({ slug }: { slug: string }) {
  const [core, setCore] = useState<CoreDetailData | null>(null);

  useEffect(() => {
    fetch(`https://cores.marathondb.gg/api/cores/${slug}`)
      .then(r => r.json())
      .then(d => setCore(d.data));
  }, [slug]);

  if (!core) return <Loading />;

  return (
    <div className="core-detail">
      {/* Header */}
      <div className="header">
        {core.icon_url && <img src={core.icon_url} alt={core.name} width={96} height={96} />}
        <h1>{core.name}</h1>
        <RarityBadge rarity={core.rarity} />
        <span className="runner-type">{core.runner_type}</span>
        <PassiveIndicator isPassive={core.is_passive} />
      </div>

      {/* Description */}
      <p className="description">{core.description}</p>

      {/* Capabilities */}
      <section className="capabilities">
        <h3>Capabilities</h3>
        <CapabilityBadges core={core} />
        <TriggerBadge condition={core.trigger_condition} />
        <AbilityBadge ability={core.enhances_ability} />
        {core.cooldown_reduction && <span>Cooldown: {core.cooldown_reduction}</span>}
      </section>

      {/* Effects */}
      {core.effects?.length > 0 && (
        <section className="effects">
          <h3>Stat Effects</h3>
          {core.effects.map(e => <EffectChip key={e.id} effect={e} />)}
        </section>
      )}

      {/* Tags */}
      <TagList tags={core.tags} />

      {/* Perk Rolls */}
      <PerkRolls rolls={core.perk_rolls} />

      {/* Balance History */}
      {core.history?.length > 0 && (
        <section className="history">
          <h3>Balance History</h3>
          {core.history.map(change => (
            <div key={change.id} className={`change ${change.change_type}`}>
              {change.patch_number && <span className="patch">v{change.patch_number}</span>}
              <span className="type">{change.change_type}</span>
              {change.summary && <p>{change.summary}</p>}
              {change.season_name && <span className="season">{change.season_name}</span>}
            </div>
          ))}
        </section>
      )}

      {/* Credits */}
      {core.credits && <div className="credits">Cost: {core.credits} credits</div>}
    </div>
  );
}
```

---

### Loadout Builder Integration

When building a loadout, the user selects one core for their chosen runner:

```tsx
// Fetch cores for the selected runner
const res = await fetch(`https://cores.marathondb.gg/api/cores/runner/${selectedRunner}`);
const { data: availableCores } = await res.json();

// "all" runner type cores are universal — include them for any runner:
const allRes = await fetch(`https://cores.marathondb.gg/api/cores/runner/all`);
const { data: universalCores } = await allRes.json();

const combinedCores = [...availableCores, ...universalCores];

// In the loadout submission payload:
const loadout = {
  runner_slug: selectedRunner,
  core_slug: selectedCore?.slug || null,
  // ... weapons, mods, implants ...
};
```

---

## Suggested CSS

```css
/* Capability badges */
.capability-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Rarity badge */
.rarity-badge {
  text-transform: capitalize;
}

/* Trigger badge */
.trigger-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Effect chips */
.effect-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.effect-chip.buff {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.effect-chip.debuff {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Tag chips */
.tag-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.1);
  margin: 2px;
}

/* Perk rolls */
.perk-slot {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.perk-roll.curated {
  border-left: 3px solid #ffc107;
  padding-left: 8px;
}

.curated-badge {
  color: #ffc107;
  font-weight: 600;
  font-size: 0.75rem;
}

/* Filter bar */
.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 0;
}

.filter-chip {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #3b82f6;
}

/* Balance history */
.change { padding: 8px; margin: 4px 0; border-radius: 4px; }
.change.added    { border-left: 3px solid #3b82f6; }
.change.buffed   { border-left: 3px solid #22c55e; }
.change.nerfed   { border-left: 3px solid #ef4444; }
.change.reworked { border-left: 3px solid #a855f7; }
.change.removed  { border-left: 3px solid #6b7280; }
```

---

## TypeScript Types

```typescript
// ── Runner & Rarity ─────────────────────────────────────────

type RunnerType = 'all' | 'assassin' | 'destroyer' | 'recon' | 'rook' | 'thief' | 'triage' | 'vandal';
type Rarity = 'standard' | 'enhanced' | 'deluxe' | 'superior' | 'prestige';
type TriggerCondition =
  | 'always_active' | 'on_kill' | 'on_revive' | 'on_extraction'
  | 'backpack_full' | 'low_health' | 'on_damage_taken' | 'on_ability_use';
type AbilityType = 'prime' | 'tactical' | 'melee' | 'passive' | 'class_ability';
type ChangeType = 'added' | 'buffed' | 'nerfed' | 'reworked' | 'removed' | 'unchanged';

// ── Core (list endpoint) ────────────────────────────────────

interface Core {
  id: number;
  slug: string;
  name: string;
  runner_type: RunnerType;
  rarity: Rarity;
  description: string | null;
  credits: number | null;
  icon_url: string | null;
  is_active: number;
  season_id: number | null;
  patch_number: string | null;
  created_at: string;
  updated_at: string;

  // Capability flags (0 or 1)
  has_cleanse: number;
  affects_crew: number;
  reduces_cooldown: number;
  impacts_movement: number;
  affects_damage: number;
  affects_survivability: number;
  affects_loot: number;
  is_passive: number;

  // Capability details
  enhances_ability: AbilityType | null;
  trigger_condition: TriggerCondition | null;
  cooldown_reduction: string | null;

  // Numeric ability tracking
  ability_cooldown: number | null;
  ability_duration: number | null;
  ability_range: number | null;

  // Joined
  season_name: string | null;
  effect_count: number;
  tag_count: number;

  // Enriched
  effects: CoreEffect[];
}

// ── Core detail (/:slug endpoint) ───────────────────────────

interface CoreDetail extends Omit<Core, 'effect_count' | 'tag_count'> {
  history: CoreHistory[];
  tags: CoreTag[];
  perk_rolls: CorePerkRoll[];
}

// ── Sub-objects ──────────────────────────────────────────────

interface CoreEffect {
  id: number;
  core_id: number;
  stat_name: string;
  stat_value: number;
  display_text: string | null;
}

interface CoreTag {
  id: number;
  core_id: number;
  tag_category: string;
  tag_value: string;
}

interface CoreHistory {
  id: number;
  core_id: number;
  season_id: number | null;
  patch_number: string | null;
  change_type: ChangeType;
  summary: string | null;
  previous_values: string | null;  // JSON string
  new_values: string | null;       // JSON string
  changed_at: string;
  season_name: string | null;
}

interface CorePerkRoll {
  id: number;
  core_id: number;
  perk_id: number;
  roll_slot: number;
  is_curated: number;
  weight: number;
  created_at: string;
  perk_name: string;
  perk_slug: string;
  perk_description: string | null;
  perk_effect_type: string | null;
  perk_effect_value: string | null;
  perk_icon_url: string | null;
}

interface Perk {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  effect_type: string | null;
  effect_value: string | null;
  icon_url: string | null;
  season_id: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  season_name: string | null;
}

interface PerkDetail extends Perk {
  used_by: {
    roll_slot: number;
    is_curated: number;
    weight: number;
    core_slug: string;
    core_name: string;
    runner_type: RunnerType;
    rarity: Rarity;
  }[];
}

interface Season {
  id: number;
  name: string;
  version: string | null;
  patch_version: string | null;
  season_type: 'alpha' | 'beta' | 'release' | 'event' | 'other';
  release_date: string | null;
  end_date: string | null;
  patch_notes: string | null;
  is_current: number;
  created_at: string;
  updated_at: string;
}

// ── Response wrappers ────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ApiListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
}

interface StatsResponse {
  success: boolean;
  data: {
    total: number;
    by_runner: { runner_type: RunnerType; count: number }[];
    by_rarity: { rarity: Rarity; count: number }[];
    stat_names: string[];
  };
}
```

---

## Error Handling

All error responses follow this shape:

```json
{
  "success": false,
  "error": "Core not found"
}
```

| Status | When |
|--------|------|
| 400 | Bad request / missing required fields |
| 404 | Core/perk/season slug not found, or unknown runner type |

---

## Test URLs

| Endpoint | URL |
|----------|-----|
| Health check | [/](https://cores.marathondb.gg/) |
| All cores | [/api/cores](https://cores.marathondb.gg/api/cores) |
| Include inactive | [/api/cores?active=false](https://cores.marathondb.gg/api/cores?active=false) |
| Assassin cores | [/api/cores/runner/assassin](https://cores.marathondb.gg/api/cores/runner/assassin) |
| Destroyer cores | [/api/cores/runner/destroyer](https://cores.marathondb.gg/api/cores/runner/destroyer) |
| Recon cores | [/api/cores/runner/recon](https://cores.marathondb.gg/api/cores/runner/recon) |
| Thief cores | [/api/cores/runner/thief](https://cores.marathondb.gg/api/cores/runner/thief) |
| Triage cores | [/api/cores/runner/triage](https://cores.marathondb.gg/api/cores/runner/triage) |
| Vandal cores | [/api/cores/runner/vandal](https://cores.marathondb.gg/api/cores/runner/vandal) |
| Rook cores | [/api/cores/runner/rook](https://cores.marathondb.gg/api/cores/runner/rook) |
| Universal cores | [/api/cores/runner/all](https://cores.marathondb.gg/api/cores/runner/all) |
| Damage cores | [/api/cores?affects_damage=1](https://cores.marathondb.gg/api/cores?affects_damage=1) |
| Survivability cores | [/api/cores?affects_survivability=1](https://cores.marathondb.gg/api/cores?affects_survivability=1) |
| Movement cores | [/api/cores?impacts_movement=1](https://cores.marathondb.gg/api/cores?impacts_movement=1) |
| Cleanse cores | [/api/cores?has_cleanse=1](https://cores.marathondb.gg/api/cores?has_cleanse=1) |
| Crew-wide cores | [/api/cores?affects_crew=1](https://cores.marathondb.gg/api/cores?affects_crew=1) |
| On-kill triggers | [/api/cores?trigger_condition=on_kill](https://cores.marathondb.gg/api/cores?trigger_condition=on_kill) |
| Passive only | [/api/cores?is_passive=1](https://cores.marathondb.gg/api/cores?is_passive=1) |
| Conditional only | [/api/cores?is_passive=0](https://cores.marathondb.gg/api/cores?is_passive=0) |
| Enhanced rarity | [/api/cores?rarity=enhanced](https://cores.marathondb.gg/api/cores?rarity=enhanced) |
| Multi-filter | [/api/cores?affects_damage=1&runner=destroyer](https://cores.marathondb.gg/api/cores?affects_damage=1&runner=destroyer) |
| Single core | [/api/cores/siphon-strike](https://cores.marathondb.gg/api/cores/siphon-strike) |
| All perks | [/api/perks](https://cores.marathondb.gg/api/perks) |
| Perk detail | [/api/perks/bloodthirst](https://cores.marathondb.gg/api/perks/bloodthirst) |
| All seasons | [/api/seasons/all](https://cores.marathondb.gg/api/seasons/all) |
| Current season | [/api/seasons/current](https://cores.marathondb.gg/api/seasons/current) |
| Stats summary | [/api/stats/summary](https://cores.marathondb.gg/api/stats/summary) |

---

## Admin Endpoints

Full CRUD is available under `/api/admin/*`. See the admin panel or route source for details.

| Resource | Endpoints |
|----------|-----------|
| Seasons | `GET/POST /api/admin/seasons`, `PUT/DELETE /api/admin/seasons/:id` |
| Cores | `GET/POST /api/admin/cores`, `PUT/DELETE /api/admin/cores/:slug` |
| Core Effects | `GET/POST /api/admin/cores/:slug/effects`, `PUT/DELETE /api/admin/cores/:slug/effects/:id` |
| Core Tags | `GET/POST /api/admin/cores/:slug/tags`, `PUT/DELETE /api/admin/cores/:slug/tags/:id` |
| Core History | `GET/POST /api/admin/cores/:slug/history`, `DELETE /api/admin/cores/:slug/history/:id` |
| Core Perk Rolls | `GET/POST /api/admin/cores/:slug/perks`, `PUT/DELETE /api/admin/cores/:slug/perks/:id` |
| Perks | `GET/POST /api/admin/perks`, `GET/PUT/DELETE /api/admin/perks/:slug` |
