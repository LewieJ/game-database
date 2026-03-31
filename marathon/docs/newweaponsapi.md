# Marathon Weapon API — Reference

**Base URL:** `https://weapons.marathondb.gg`  
**Version:** 1.0.0  
**Created:** February 26, 2026  

All responses are JSON. All endpoints support CORS.

---

## Contents

1. [Weapon List](#1-get-apiweapons)
2. [Categories](#2-get-apiweaponscategories)
3. [Stat Ranges](#3-get-apiweaponsstat-ranges)
4. [Weapon Detail](#4-get-apiweaponsslug)
5. [Admin — Update Weapon](#5-put-apiadminweaponsslug)
6. [Admin — Upsert Stats](#6-put-apiadminweaponsslugstatssseason_id)
7. [Admin — Get Stats](#7-get-apiadminweaponsslugstats)
8. [Admin — Seasons](#8-seasons)
9. [Schema Reference](#9-schema-reference)

---

## 1. `GET /api/weapons`

Returns a lightweight list of all weapons.

**Query params:**
| Param | Type | Description |
|---|---|---|
| `category` | string | Filter by `category_slug`, e.g. `assault-rifles` |

**Example request:**
```
GET /api/weapons
GET /api/weapons?category=pistols
```

**Example response:**
```json
{
  "success": true,
  "count": 16,
  "data": [
    {
      "id": 1,
      "slug": "overrun-ar",
      "name": "Overrun AR",
      "prior_name": null,
      "category_slug": "assault-rifles",
      "category_name": "Assault Rifles",
      "type": "Standard Assault Rifle",
      "ammo_type": "standard",
      "description": "Light assault rifle with high rate of fire.",
      "cost_credits": 50,
      "icon_url": "https://helpbot.marathondb.gg/assets/weapons/overrun-ar/icon.png",
      "icon_url_webp": "https://helpbot.marathondb.gg/assets/weapons/overrun-ar/icon.webp"
    }
  ]
}
```

---

## 2. `GET /api/weapons/categories`

Returns all weapon categories with weapon counts.

**Example response:**
```json
{
  "success": true,
  "data": [
    { "slug": "assault-rifles", "name": "Assault Rifles", "description": "...", "weapon_count": 2 },
    { "slug": "pistols",         "name": "Pistols",         "description": "...", "weapon_count": 3 }
  ]
}
```

---

## 3. `GET /api/weapons/stat-ranges`

Returns `min`/`max` for every numeric stat across all weapons in the current season. Used by frontends to normalise and render proportional stat bars.

**Example response:**
```json
{
  "success": true,
  "data": {
    "firepower_score":     { "min": 14.7,  "max": 37.5 },
    "damage":              { "min": 10.5,  "max": 100.0 },
    "rate_of_fire":        { "min": 30,    "max": 1050  },
    "accuracy_score":      { "min": 23.1,  "max": 76.8  },
    "hipfire_spread":      { "min": 2.32,  "max": 3.13  },
    "handling_score":      { "min": 46,    "max": 49    },
    "range_meters":        { "min": 8,     "max": 175   },
    "zoom":                { "min": 1.1,   "max": 4.0   }
  }
}
```

---

## 4. `GET /api/weapons/:slug`

Full weapon detail including all season stat history.

**URL params:**
| Param | Description |
|---|---|
| `slug` | Weapon slug, e.g. `overrun-ar`, `v11-punch` |

**Example response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "overrun-ar",
    "name": "Overrun AR",
    "prior_name": null,
    "rename_notes": null,
    "category_slug": "assault-rifles",
    "category_name": "Assault Rifles",
    "type": "Standard Assault Rifle",
    "ammo_type": "standard",
    "description": "Light assault rifle with high rate of fire.",
    "cost_credits": 50,
    "icon_url": "https://helpbot.marathondb.gg/assets/weapons/overrun-ar/icon.png",
    "icon_url_webp": "https://helpbot.marathondb.gg/assets/weapons/overrun-ar/icon.webp",
    "stats": [
      {
        "season_id": 1,
        "season_name": "Pre-Season",
        "season_version": "pre-season",
        "patch_version": "1.0.0",
        "patch_notes": null,
        "season_type": "release",
        "release_date": "2026-04-23",
        "is_current": true,

        "firepower_score":    14.7,
        "damage":             10.5,
        "precision":          1.4,
        "rate_of_fire":       720,
        "charge_time_seconds": null,

        "accuracy_score":     50.3,
        "hipfire_spread":     2.32,
        "ads_spread":         0.94,
        "crouch_spread_bonus": 87.5,
        "moving_inaccuracy":  90.9,

        "handling_score":     46,
        "equip_speed":        0.94,
        "ads_speed":          0.43,
        "weight":             32.0,
        "recoil":             78.3,
        "aim_assist":         1.68,
        "reload_speed":       2.37,

        "range_meters":       40,
        "magazine_size":      20,
        "volt_drain":         null,
        "zoom":               1.2
      }
    ]
  }
}
```

> **Volt battery weapons** (e.g. `v11-punch`, `v22-volt-thrower`): `ammo_type = "volt_battery"`, `magazine_size = null`, `volt_drain` = percentage per shot as a number (e.g. `4.5` = 4.5%).

---

## 5. `PUT /api/admin/weapons/:slug`

Update weapon identity fields.

**Body (all fields optional):**
```json
{
  "name":          "Overrun AR",
  "prior_name":    null,
  "rename_notes":  null,
  "category_slug": "assault-rifles",
  "type":          "Standard Assault Rifle",
  "ammo_type":     "standard",
  "description":   "Light assault rifle with high rate of fire.",
  "cost_credits":  50,
  "icon_url":      "https://helpbot.marathondb.gg/assets/weapons/overrun-ar/icon.png",
  "icon_url_webp": "https://helpbot.marathondb.gg/assets/weapons/overrun-ar/icon.webp"
}
```

**`ammo_type` values:** `standard` | `volt_battery`

---

## 6. `PUT /api/admin/weapons/:slug/stats/:season_id`

Upsert all stats for a weapon in a given season. If no row exists it is created; if one exists all provided fields are updated.

**URL params:**
| Param | Description |
|---|---|
| `slug` | Weapon slug |
| `season_id` | Integer season ID (e.g. `1`) |

**Body — all fields optional, provide only what you want to set:**
```json
{
  "weapon_name": "Overrun AR",

  "firepower_score":     14.7,
  "damage":              10.5,
  "precision":           1.4,
  "rate_of_fire":        720,
  "charge_time_seconds": null,

  "accuracy_score":      50.3,
  "hipfire_spread":      2.32,
  "ads_spread":          0.94,
  "crouch_spread_bonus": 87.5,
  "moving_inaccuracy":   90.9,

  "handling_score":      46,
  "equip_speed":         0.94,
  "ads_speed":           0.43,
  "weight":              32.0,
  "recoil":              78.3,
  "aim_assist":          1.68,
  "reload_speed":        2.37,

  "range_meters":        40,
  "magazine_size":       20,
  "volt_drain":          null,
  "zoom":                1.2
}
```

**Notes:**
- `rate_of_fire` is `null` for charge-based weapons (railguns). Use `charge_time_seconds` instead.
- `volt_drain` is only meaningful for `ammo_type = "volt_battery"` weapons.
- `magazine_size` is `null` for volt battery weapons (they use `volt_drain` to indicate ammo).

---

## 7. `GET /api/admin/weapons/:slug/stats`

Returns all season stat rows for a weapon.

---

## 8. Seasons

### `GET /api/admin/seasons`
Returns all seasons ordered by ID.

### `POST /api/admin/seasons`
Create a new season.

**Body:**
```json
{
  "name":          "Season 1",
  "version":       "s1",
  "patch_version": "1.1.0",
  "patch_notes":   "Season 1 launch balance",
  "season_type":   "release",
  "release_date":  "2026-06-01",
  "is_current":    0
}
```

**`season_type` values:** `alpha` | `beta` | `release` | `hotfix`

### `PUT /api/admin/seasons/:id`
Update any season fields. Same body shape as POST.

---

## 9. Schema Reference

### `weapons` table

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | PK |
| `slug` | TEXT | Unique URL-safe identifier |
| `name` | TEXT | Display name |
| `prior_name` | TEXT | Name before any rename |
| `rename_notes` | TEXT | Human-readable rename note |
| `category_slug` | TEXT | FK → `weapon_categories.slug` |
| `type` | TEXT | e.g. "Standard Assault Rifle" |
| `ammo_type` | TEXT | `standard` or `volt_battery` |
| `description` | TEXT | In-game flavour text |
| `cost_credits` | INTEGER | In-game purchase cost (⊙) |
| `icon_url` | TEXT | PNG icon at CDN |
| `icon_url_webp` | TEXT | WebP icon at CDN |

### `weapon_stats` table — Firepower

| Column | Type | Notes |
|---|---|---|
| `firepower_score` | REAL | Aggregate score shown in UI |
| `damage` | REAL | Damage per bullet / pellet |
| `precision` | REAL | Precision multiplier |
| `rate_of_fire` | INTEGER | RPM; NULL for charge-based weapons |
| `charge_time_seconds` | REAL | Seconds to charge; NULL for non-charge weapons |

### `weapon_stats` table — Accuracy

| Column | Type | Notes |
|---|---|---|
| `accuracy_score` | REAL | Aggregate score |
| `hipfire_spread` | REAL | Degrees |
| `ads_spread` | REAL | Degrees |
| `crouch_spread_bonus` | REAL | Percentage |
| `moving_inaccuracy` | REAL | Percentage |

### `weapon_stats` table — Handling

| Column | Type | Notes |
|---|---|---|
| `handling_score` | REAL | Aggregate score |
| `equip_speed` | REAL | Seconds |
| `ads_speed` | REAL | Seconds |
| `weight` | REAL | Percentage |
| `recoil` | REAL | Percentage |
| `aim_assist` | REAL | Degrees |
| `reload_speed` | REAL | Seconds |

### `weapon_stats` table — Other

| Column | Type | Notes |
|---|---|---|
| `range_meters` | INTEGER | Effective range in metres |
| `magazine_size` | INTEGER | NULL for volt_battery weapons |
| `volt_drain` | REAL | % per shot; NULL for standard ammo weapons |
| `zoom` | REAL | Magnification e.g. `1.2` |

---

## Asset URLs

Icons are hosted on the main CDN at `helpbot.marathondb.gg`:

```
https://helpbot.marathondb.gg/assets/weapons/{slug}/icon.png
https://helpbot.marathondb.gg/assets/weapons/{slug}/icon.webp
```

**Known weapon slugs:**

| Slug | Name | Category |
|---|---|---|
| `overrun-ar` | Overrun AR | Assault Rifles |
| `m77-assault-rifle` | M77 Assault Rifle | Assault Rifles |
| `conquest-lmg` | Conquest LMG | Machine Guns |
| `ce-tactical-sidearm` | CE Tactical Sidearm | Pistols |
| `v11-punch` | V11 Punch ⚡ | Pistols |
| `magnum-mc` | Magnum MC | Pistols |
| `twin-tap-hbr` | Twin Tap HBR | Precision Rifles |
| `repeater-hpr` | Repeater HPR | Precision Rifles |
| `hardline-pr` | Hardline PR | Precision Rifles |
| `v95-lookout` | V95 Lookout | Precision Rifles |
| `v00-zeus-rg` | V00 Zeus RG | Railguns |
| `wstr-combat-shotgun` | WSTR Combat Shotgun | Shotguns |
| `longshot` | Longshot | Sniper Rifles |
| `bully-smg` | Bully SMG | Submachine Guns |
| `brrt-smg` | BRRT SMG | Submachine Guns |
| `v22-volt-thrower` | V22 Volt Thrower ⚡ | Submachine Guns |

⚡ = Volt Battery ammo type
