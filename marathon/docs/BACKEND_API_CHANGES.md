# Backend API Changes — Badge Count Endpoints

## The Problem

The **Runners listing page** and **Weapons listing page** both need per-item counts (cores, skins, mods) to render badge numbers on cards. Today, the frontend solves this by **fetching every single record** from related APIs and counting client-side. This is the biggest performance bottleneck on the site.

### Current cost (Runners page — `/runners/`)

| What the frontend does | API calls | Records transferred |
|---|---|---|
| Fetch all runners | `GET cores.marathondb.gg/api/cores` | 1 call, **all** cores (~50+) |
| Count cores per `runner_type` | (client-side loop) | — |
| Paginate ALL runner skins | `GET runnerskins.marathondb.gg/api/skins?per_page=100&page=1,2,3…` | **N pages** × 100 records each |
| Count skins per `runner.slug` | (client-side loop) | — |

**Result**: To show a simple "3 cores" badge on a runner card, we download the **entire cores table** and the **entire runner-skins table**.

### Current cost (Weapons page — `/weapons/`)

| What the frontend does | API calls | Records transferred |
|---|---|---|
| Fetch mods per weapon | `GET mods.marathondb.gg/api/weapons/{slug}/mods` **× every weapon** | **~25 parallel calls** |
| Count mods from slot arrays | (client-side loop) | — |
| Paginate ALL weapon skins | `GET weaponskins.marathondb.gg/api/skins?page=1,2,3…&per_page=100` | **N pages** × 100 records each |
| Count skins per `weapon.slug` | (client-side loop) | — |

**Result**: ~25 individual API calls just for mod counts, plus downloading **all weapon skins** for skin badges.

---

## What I Need — 4 New Endpoints

### 1. `GET cores.marathondb.gg/api/cores/counts`

Return the core count grouped by `runner_type`.

```json
{
  "success": true,
  "data": {
    "thief": 8,
    "hacker": 6,
    "bruiser": 7,
    "ranger": 5,
    "support": 6,
    "all": 3
  }
}
```

**Key rules**:
- Keys should be **lowercase runner_type slugs** (matching what `/api/cores` returns in `core.runner_type`)
- Exclude `"all"` from the response OR include it — the frontend will skip keys where `runner_type === "all"` anyway
- Only count **active** cores (if there's an `active` / `is_active` flag)

**Frontend will consume**: `runners.js` replaces `fetchCoreCounts()` (currently fetches ALL cores) with a single call to this endpoint.

---

### 2. `GET runnerskins.marathondb.gg/api/skins/counts`

Return the skin count grouped by runner slug.

```json
{
  "success": true,
  "data": {
    "thief": 12,
    "hacker": 9,
    "bruiser": 11,
    "ranger": 8,
    "support": 7
  }
}
```

**Key rules**:
- Keys should be **lowercase runner slugs** (matching `skin.runner.slug` from the existing `/api/skins` response)
- Count all skins regardless of rarity or status

**Frontend will consume**: `runners.js` replaces `fetchSkinCounts()` (currently paginates ALL skins) with a single call.

---

### 3. `GET mods.marathondb.gg/api/mods/counts`

Return the total mod count grouped by weapon slug.

```json
{
  "success": true,
  "data": {
    "m77-assault-rifle": 6,
    "v22-volt-thrower": 8,
    "overrun-ar": 5,
    "longshot": 4,
    "twin-tap-hbr": 7,
    "melee": 0
  }
}
```

**Key rules**:
- Keys should be **lowercase weapon slugs** (matching what `GET /api/weapons/{slug}/mods` uses)
- Count = total number of distinct mods for that weapon (sum of mods across all slots + unslotted mods)
- Include every weapon slug, even if count is 0

**Frontend will consume**: `weapons.js` replaces `loadWeaponModCounts()` (currently fires ~25 parallel `/api/weapons/{slug}/mods` calls) with a single call.

---

### 4. `GET weaponskins.marathondb.gg/api/skins/counts`

Return the skin count grouped by weapon slug.

```json
{
  "success": true,
  "data": {
    "m77-assault-rifle": 3,
    "v22-volt-thrower": 2,
    "overrun-ar": 1,
    "longshot": 4,
    "twin-tap-hbr": 2,
    "melee": 0
  }
}
```

**Key rules**:
- Keys should be **lowercase weapon slugs** (matching `skin.weapon.slug` from the existing `/api/skins` response)
- Count all skins regardless of rarity

**Frontend will consume**: `weapons.js` replaces `loadWeaponSkinCounts()` (currently paginates ALL weapon skins) with a single call.

---

## Summary of Impact

| Page | Before | After |
|---|---|---|
| `/runners/` | 1 full cores fetch + N paginated skin fetches | **2 tiny JSON responses** |
| `/weapons/` | ~25 parallel mod fetches + N paginated skin fetches | **2 tiny JSON responses** |

Each counts endpoint returns a simple `{ slug: number }` map — typically under 1 KB. This eliminates **thousands of records** being transferred just to show badge numbers.

---

## Response Format

All 4 endpoints should follow the same shape:

```json
{
  "success": true,
  "data": {
    "<slug>": <integer>,
    ...
  }
}
```

On error:
```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

No pagination needed — these are aggregate counts, not record listings.

---

## Once These Are Live

Let me know when they're deployed and I'll rewire the frontend. The changes are isolated to:
- `js/runners.js` — replace `fetchCoreCounts()` and `fetchSkinCounts()`
- `js/weapons.js` — replace `loadWeaponModCounts()` and `loadWeaponSkinCounts()`

Both are ~30 line functions that collapse to a 3-line fetch.
