# Mods Page — Build Instructions

## API

- **Listing endpoint:** `https://mods.marathondb.gg/api/mods`  
  Returns all weapon mods. Response: `{ success: true, count: N, data: [...] }`

- **Detail endpoint:** `https://mods.marathondb.gg/api/mods/{slug}`  
  Returns full mod detail (effects, compatible weapons, history, **variants**).

> **Important:** The mods API is on `mods.marathondb.gg`, NOT `helpbot.marathondb.gg`.  
> The global `API_BASE` in `ssg.js` points to `helpbot.marathondb.gg` — the mods functions override this.

---

## Family Grouping (new)

Each non-prestige mod now belongs to a **family** of rarity variants (Standard → Enhanced → Deluxe → Superior), identified by the `family_slug` field.

- `family_slug` is `null` for Prestige mods (standalone)
- `is_hidden: 1` mods exist in the API but should not appear in the public grid
- The detail endpoint returns a `variants` array of sibling mods in the same family

**Hidden mods in the build:**
- `__MODS_DATA` includes **all** mods (including `is_hidden: 1`) so the JS family-tree can show locked variants in the modal
- Static HTML cards (`GRID_CARDS`) and SEO lists only include **visible** mods (`is_hidden: 0`)
- The `(N)` count in `#modCount` reflects visible mod count

---

## Build Commands

### Option 1: Prebuild Script (preferred for quick updates)

```bash
node build/prebuild-mods.js
```

- Fetches all 76 mods from `mods.marathondb.gg`
- Fetches detail for each mod (effects, compatible weapons, **variants**)
- `__MODS_DATA` includes all mods; visible-only filter applied to cards/SEO/count
- Replaces 4 marker sections in `mods/index.html` (see below)
- Updates the `(N)` count in the `#modCount` span (visible mods only)
- **Idempotent** — safe to run multiple times

### Option 2: SSG (full site generator)

```bash
node build/ssg.js --mods
```

- Same behavior as `prebuild-mods.js` but runs through the main SSG pipeline
- Uses the same marker-replacement approach
- API URL is hardcoded to `https://mods.marathondb.gg/api/mods` (overrides `API_BASE`)

---

## PREBUILD Markers

The page uses 4 marker pairs that the build scripts replace idempotently:

| Marker Tag | Content | Location |
|---|---|---|
| `STRUCTURED_DATA` | `<script type="application/ld+json">` with CollectionPage schema | `<head>` |
| `JSON_DATA` | `<script>window.__MODS_DATA = [...];</script>` (~49KB) | `<head>` |
| `GRID_CARDS` | Static HTML cards for all mods inside `#modsGrid` | Main grid |
| `SEO_LIST` | `<noscript>` fallback links for crawlers | After grid |

Each pair looks like:
```html
<!--PREBUILD:TAG_START-->
... generated content ...
<!--PREBUILD:TAG_END-->
```

**Never remove these markers.** The build scripts skip replacement if markers are missing.

---

## Card Format (new)

Cards use `<div>` wrappers with `data-slug` (not `<a>` links). Clicking opens a popout modal.

```html
<div class="mod-card {rarity}" data-slug="{slug}" role="button" tabindex="0">
    <div class="mod-card-glow"></div>
    <div class="mod-card-header">
        <span class="mod-slot-pill {slotType}">{icon} {SlotType}</span>
        <span class="mod-rarity-tag {rarity}">{Rarity}</span>
    </div>
    <div class="mod-icon-container">
        <div class="mod-icon {rarity}">
            <img src="{iconUrl}" alt="..." loading="lazy">
        </div>
    </div>
    <div class="mod-card-content">
        <div class="mod-name">{Name}</div>
        <div class="mod-card-effects">...</div>  <!-- only when effects exist -->
    </div>
</div>
```

---

## Page Structure

| Element | Purpose |
|---|---|
| Breadcrumb (`.detail-breadcrumb`) | Home > Mods, extended by JS for `?mod=` URLs |
| `#modDetailSeo` | Hidden section, rendered by JS for crawlable mod detail |
| `#typeTabs` | Slot type filter tabs (All, Optic, Grip, Magazine, Barrel, Chip, Generator, Shield) |
| `#rarityFilterPills` | Rarity filter pills (All, Prestige, Superior, Deluxe, Enhanced, **Standard**) |
| `#modSearch` / `#modSort` | Search input and sort dropdown (now includes **Grouped** option) |
| `#modsGrid` | Card grid with PREBUILD markers |
| Modal (`#modModal`) | Popout detail modal: icon, effects, stat impact, weapons, **variants**, history, meta, ads |

---

## JavaScript

- **`js/mods.js`** — Grid rendering, filtering, sorting, modal open/close, SEO detail
- Uses `window.__MODS_DATA` (prebuilt JSON) for instant load, falls back to API
- Modal fetches full detail via `MarathonAPI.getModBySlug(slug)` on click
- URL state: `?mod={slug}` with pushState/popstate

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Markers not found (skipped) | Check `mods/index.html` has all 4 `<!--PREBUILD:..._START/END-->` pairs |
| Only 56 mods | Build is using `helpbot.marathondb.gg` — fix to `mods.marathondb.gg` |
| Cards show old format (`<a>` links) | Run `prebuild-mods.js` to regenerate with new `<div>` format |
| Modal doesn't open | Verify modal overlay HTML exists before `</body>` |
| Count mismatch | Run build again — it updates `#modCount` automatically |
