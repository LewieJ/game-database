# Weapons SSG — Reference Document

> Saved for context continuity across sessions.
> Last updated after the Compare tab, Loadout builder deep link, and FOUC-elimination session.

---

## Architecture Overview

### Dual-Source API Data

The weapons SSG pulls from **two tiers** of the helpbot API to build complete pages:

| Endpoint | Purpose | Key Fields |
|----------|---------|------------|
| `GET /api/weapons` | List endpoint — basic weapon data | `name`, `slug`, `category_name`, `category_slug`, `ammo_type`, `skins_count`, `mods_count` |
| `GET /api/weapons/:slug` | Detail endpoint — full stats, mods, history | `stats` (object), `mods` (array), `description` |
| `GET /api/weapons/:slug/history` | Patch history per weapon | `title`, `change_type`, `affected_stats`, `season_name` |
| `GET /api/categories` | Weapon category list | `name`, `slug` |
| `GET /api/ratings/weapons` | Community ratings | `weapon_slug`, `average_rating`, `total_votes` |
| `GET /api/v3/cosmetics/weapon-skins` | V3 skin counts (most accurate) | `weapon.slug` per skin |

**API Base (SSG):** `https://helpbot.marathondb.gg`
**API Base (JS runtime):** `https://weapons.marathondb.gg`

### ⚠️ Helpbot vs Weapons API Field Differences (Critical)

The helpbot API (`helpbot.marathondb.gg`) and the client-side weapons API (`weapons.marathondb.gg`) use **different field conventions**. This matters when SSG-generated HTML must match the runtime JS output.

| Field | Helpbot API (SSG) | Weapons API (JS runtime) |
|-------|-------------------|--------------------------|
| ammo_type | `"Heavy Rounds"` (title case) | `"heavy_rounds"` (snake_case) |
| stats | Single object or `null` | Array of season objects |
| mag field | `mag_size` | `magazine_size` |
| rate_of_fire | `"450 RPM"` (string with unit) | `300` (number) |
| is_current | Not present | Present on stats array entries |

**Normalization applied in SSG:**
```javascript
// Ammo type: title case → snake_case + volt_battery → volt_cell
const ammoKey = rawAmmo.toLowerCase().replace(/\s+/g, '_').replace('volt_battery', 'volt_cell');

// Stats: strip " RPM" suffix, normalize mag field name
rate_of_fire: raw.rate_of_fire ? String(raw.rate_of_fire).replace(/\s*RPM$/i, '') : null,
magazine_size: raw.magazine_size || raw.mag_size || null
```

---

## SSG System

### Script: `build/ssg.js`

- **Run command:** `node build/ssg.js --weapons`
- **Output files:**
  - `weapons/index.html` — Listing page (SSG-managed, always regenerated)
  - `weapons/{slug}/index.html` — Detail pages (hand-crafted pages skipped)
  - `weapons/tier-list/index.html` — Tier list page (hand-crafted skipped)

### Build Pipeline (`buildWeapons()`)

```
1. Fetch weapon list        → GET /api/weapons              → weaponsList[]
2. Fetch categories          → GET /api/categories           → categories[]
3. Fetch weapon details      → GET /api/weapons/:slug × N    → fullWeapons[]
   └─ Also fetches history   → GET /api/weapons/:slug/history
4. Fetch community ratings   → GET /api/ratings/weapons      → applied to both arrays
5. Fetch V3 skin counts      → GET /api/v3/cosmetics/weapon-skins → override skins_count
6. Enrich stats              → statsMap from fullWeapons → weaponsList[]._stats
7. Generate listing page     → generateWeaponsListingPage(weaponsList, categories)
8. Generate detail pages     → generateWeaponDetailPage(weapon) × N (skip hand-crafted)
9. Generate tier list page   → generateWeaponsTierListPage(fullWeapons, categories)
```

### Stats Enrichment (Step 6)

The list endpoint (`/api/weapons`) returns **no stats data**. Stats must be fetched from individual detail endpoints and mapped back onto the listing weapons.

```javascript
// Detail API returns stats as a single object (current season) or null
const raw = Array.isArray(fw.stats) ? fw.stats[fw.stats.length - 1] : fw.stats;
if (raw && typeof raw === 'object' && raw.damage !== undefined) {
    statsMap[fw.slug] = {
        damage: raw.damage || null,
        rate_of_fire: raw.rate_of_fire ? String(raw.rate_of_fire).replace(/\s*RPM$/i, '') : null,
        magazine_size: raw.magazine_size || raw.mag_size || null
    };
}
// Then applied: weaponsList[n]._stats = statsMap[slug]
```

**Coverage:** ~20/29 weapons have stats (9 weapons like Impact HAR return `stats: null`).

### Hand-Crafted Page Detection

```javascript
function isHandCrafted(filePath) {
    // Checks first 300 chars for "HAND-CRAFTED" marker
}
```

- **Listing page (`weapons/index.html`):** Always regenerated (SSG-managed)
- **Detail pages:** Skipped if file starts with `<!-- HAND-CRAFTED -->` comment
- **Tier list page:** Skipped if hand-crafted

---

## Card Features (Listing Page)

All features are generated both in SSG (`generateWeaponsListingPage`) and at runtime (`js/weapons.js`) to eliminate flash-of-unstyled-content (FOUC).

### 1. Category Color Stripe

Left border on each card colored by weapon category.

```javascript
const ssgCategoryColors = {
    'Assault Rifles': '#ef4444',  // Red
    'Machine Guns':   '#f97316',  // Orange
    'Melee':          '#92400e',  // Brown
    'Pistols':        '#a855f7',  // Purple
    'Precision Rifles':'#3b82f6', // Blue
    'Railguns':       '#eab308',  // Yellow
    'Shotguns':       '#22c55e',  // Green
    'Sniper Rifles':  '#06b6d4',  // Cyan
    'Submachine Guns':'#ec4899'   // Pink
};
// Applied as: style="border-left:3px solid ${catColor}"
```

**Must stay in sync with** `categoryColors` in `js/weapons.js`.

### 2. Ammo Type Icon (Top-Right)

PNG icons positioned absolutely in the card's top-right corner.

```javascript
const ssgAmmoIcons = {
    light_rounds: '<img src="/assets/icons/ammo/light-rounds.png" ...>',
    heavy_rounds: '<img src="/assets/icons/ammo/heavy-rounds.png" ...>',
    volt_cell:    '<img src="/assets/icons/ammo/volt-cell-battery.png" ...>',
    mips_rounds:  '<img src="/assets/icons/ammo/mips-rounds.png" ...>'
};
```

**Assets:** `/assets/icons/ammo/` directory. Keys match snake_case after normalization.

**Must stay in sync with** `ammoIcons` in `js/weapons.js`.

### 3. Stat Row (Below Category)

Compact DMG / RPM / MAG display from enriched `_stats`.

```html
<div class="weapon-stat-row">
    <span class="wc-stat"><span class="wc-stat-label">DMG</span><span class="wc-stat-value">24</span></span>
    <span class="wc-stat"><span class="wc-stat-label">RPM</span><span class="wc-stat-value">450</span></span>
    <span class="wc-stat"><span class="wc-stat-label">MAG</span><span class="wc-stat-value">24</span></span>
</div>
```

Only shown for weapons with stats data (~20/29).

### 4. Trending Badge (Top-Left)

Green SVG arrow icon for weapons with 3+ community votes.

```javascript
const isTrending = weapon.rating_count && weapon.rating_count >= 3;
```

### 5. Category Filter Buttons (Color-Coded)

Each filter button has a left color stripe matching the category color, plus a `data-cat-color` attribute for active-state styling.

```html
<button class="weapon-filter-btn" data-category="assault-rifles"
        style="border-left:3px solid #ef4444" data-cat-color="#ef4444">
    Assault Rifles <span class="tab-count">4</span>
</button>
```

### 6. Hover Overlay Stats

On card hover, the `weapon-hover-overlay` shows DMG/RPM/MAG stats and a "View Details →" button. Uses `weapon-stats-preview` class.

---

## CSS Dependencies

All card feature styles live in `css/pages.css`:

| Class | Purpose |
|-------|---------|
| `.weapon-ammo` | Top-right ammo icon container (absolute positioned) |
| `.ammo-icon-img` | Ammo PNG icon (20×20, drop-shadow) |
| `.weapon-stat-row` | Flex row for DMG/RPM/MAG |
| `.wc-stat`, `.wc-stat-label`, `.wc-stat-value` | Individual stat spans |
| `.weapon-trending` | Top-left green trending arrow badge |
| `.weapon-filter-btn.active[data-cat-color]` | Active filter with category color border |
| `.weapon-hover-overlay`, `.weapon-stats-preview` | Hover state stat display |
| `.weapon-badge`, `.badge-skins`, `.badge-mods` | Skin/mod count badges |

---

## Page Structure (Detail)

The SSG template `generateWeaponDetailPage(weapon, allWeapons)` produces a full two-column layout:

### Template Structure (ssg.js)

```
<div class="detail-container" id="weaponDetail">
  <div class="weapon-hero"> ... </div>

  <div class="weapon-detail-grid">           ← two-column grid
    <div class="weapon-detail-main">          ← left column (tabs)
      <div class="weapon-tabs">
        ├ Stats tab button (.active)
        ├ Skins tab button (#skinsTab)
        ├ Mods tab button (#modsTab)
        ├ Compare tab button (#compareTab)
        └ <a> Weapon Builder CTA (.weapon-tabs-cta)
      </div>
      <div id="statsTabContent">  ${statsHtml}  </div>
      <div id="modsTabContent">   loading state </div>
      <div id="compareTabContent"> picker + result </div>
      <div id="skinsTabContent">  loading state  </div>
    </div>

    <aside class="weapon-detail-sidebar">     ← right column
      ├ weaponInfoHtml (Type, Category, Ammo, Value)
      ├ weaponRatingWidget
      └ patchHistory
    </aside>
  </div>

  <div id="seasonComparison"> ... </div>
  ${similarWeaponsHtml}                       ← "More [Category]" section
</div>
```

### Compare Tab (SSG + JS)

The SSG template pre-renders the Compare tab with a weapon picker (`<select>` grouped by category) and result container. The JS (`setupCompareTab()` in `weapon-detail.js`) dynamically injects this tab on hand-crafted pages that lack it.

- **Lazy load:** All weapons fetched from `weapons.marathondb.gg/api/weapons` only when Compare tab is first clicked
- **Shareable URLs:** `?compare=slug` query param auto-loads comparison on page load
- **Stat comparison:** 15 stats with winner/loser/tie highlighting (`.compare-winner`, `.compare-loser`, `.compare-tie`)
- **CSS:** `.weapon-compare-section`, `.compare-picker`, `.compare-select`, `.compare-go-btn`, `.compare-header-row`, `.compare-stat-row` (all `border-radius: 0`)

### Loadout Builder Deep Link

Each weapon detail page links to the loadout builder pre-populated with that weapon:

```html
<a href="/weapon-loadout-builder/#${btoa(slug)}" class="weapon-tabs-cta">Weapon Builder</a>
```

- **SSG:** Rendered in the tab navigation bar
- **JS fallback:** `setupCompareTab()` also injects the CTA if missing on hand-crafted pages

### Similar Weapons

Generated statically in SSG via `similarWeaponsHtml`:
- Filters same-category weapons (max 4), renders cards with icon, name, DMG/RPM/MAG stats
- CSS: `.similar-weapons-section`, `.similar-weapons-grid`, `.similar-weapon-card`
- Sharp edges override applied (`.similar-weapon-card { border-radius: 0 }`)

### Hand-Crafted Pages (29/29 weapons)

All current weapon detail pages are hand-crafted. The SSG template only applies to **future** weapons. For existing pages, the JS dynamically injects:
- Compare tab button + content panel
- Loadout builder CTA link (if missing)

---

## FOUC Prevention (Listing Page)

The listing page uses a **three-phase hydration** strategy to prevent flash-of-unsorted-content:

### Phase 1: SSG Render (Instant)
- SSG pre-renders all 29+ weapon cards in the grid as `<a>` tags
- Cards include images, stats, category colors, ammo icons — visible immediately

### Phase 2: JS First Render (Skip innerHTML)
- `displayWeapons()` detects existing SSG cards via `grid.querySelectorAll('.weapon-card')`
- If cards exist and no filters/search are active, **skips the full `innerHTML` rewrite**
- Only hydrates star click handlers onto existing cards (`attachWeaponStarHandlers()`)
- Flag: `ssgHydrated` tracks whether initial SSG grid has been preserved

### Phase 3: Async Data Updates (In-Place)
- **Ratings load** → `updateWeaponCardRating()` patches stars/votes/trending in-place
- **Reorder** → `reorderWeaponGrid()` uses `grid.appendChild(existingNode)` to **move** DOM nodes (no flash, no image re-load)
- **Stats enrich** → Data stored on `weapon._stats` for future sorts; **no grid re-render** (SSG cards already have stats)

### Key Functions

| Function | Purpose |
|----------|---------|
| `hydrateSSGRatings()` | Patches rating data into existing SSG card DOM |
| `reorderWeaponGrid()` | Moves existing DOM nodes into sorted order via `appendChild` |
| `updateWeaponCardRating(slug, data)` | In-place update of stars, votes, trending badge |
| `filterAndDisplayWeapons()` | Full `innerHTML` rebuild — only for user-initiated filter/sort/search |

---

## Home Page Counters

Database and cosmetic item counts on the home page (`index.html`) are **hardcoded** in the HTML — no API calls.

### Current Values

| Card | Element ID | Count |
|------|-----------|-------|
| Weapons | `weaponCount` | 30 |
| Runners | `runnerCount` | 7 |
| Cores | `coreCount` | 77 |
| Implants | `implantCount` | 83 |
| Mods | `modCount` | 77 |
| Weapon Skins | `weaponSkinCount` | 49 |
| Runner Skins | `runnerSkinCount` | 46 |
| Charms | `charmCount` | 7 |
| Emblems | `emblemCount` | 3 |
| Backgrounds | `backgroundCount` | 28 |
| Stickers | `stickerCount` | 2 |

### Updating Counts

Edit `index.html` directly — search for the element ID (e.g., `id="coreCount"`) and update the number in the `<span>` tag. No JS or build step needed.

```html
<span class="db-count" id="coreCount">77</span>
```

> **Note:** `js/main.js` no longer fetches stats from the API. The `loadStats()`, `loadStatsFromIndividualEndpoints()`, and `loadCosmeticsCounts()` functions have been removed.

---

## Page Structure (Listing)

The generated `weapons/index.html` includes:

1. **`<!-- SSG:weapons-listing -->`** marker (first line)
2. **JSON-LD** `ItemList` structured data (all weapons)
3. **Navbar** (standard site navigation)
4. **Toolbar** — search, sort dropdown, compare button
5. **Category filter tabs** — "All" + one per category (color-coded)
6. **Weapons grid** — `.weapons-grid` with pre-rendered weapon cards
7. **SEO intro** — collapsible `<details>` with weapons overview text
8. **FAQ section** — common questions & answers
9. **Comparison panel** — hidden panel for weapon compare feature
10. **Weapon modal** — hidden overlay for quick detail view
11. **Footer** — standard site footer
12. **Scripts** — `js/weapons.js`, `js/cosmetic-ratings.js`, modal CSS/JS

---

## Sync Checklist

When updating weapon card features, changes must be made in **three places**:

| Change | SSG (`build/ssg.js`) | JS (`js/weapons.js`) | CSS (`css/pages.css`) |
|--------|---------------------|---------------------|----------------------|
| Category colors | `ssgCategoryColors` | `categoryColors` | N/A |
| Ammo icons | `ssgAmmoIcons` | `ammoIcons` | `.weapon-ammo`, `.ammo-icon-img` |
| Stat fields | `generateWeaponsListingPage` stat template | Card template stat section | `.weapon-stat-row`, `.wc-stat-*` |
| Trending threshold | `isTrending` check | `updateWeaponCardRating()` | `.weapon-trending` |
| Filter buttons | `filterButtonsHtml` generator | Filter button HTML | `.weapon-filter-btn` |
| Card structure | Card `<a>` template | Card `<div>` template | All `.weapon-card-*` |

**Note:** SSG uses `<a>` tags for cards (SEO crawlability), while JS uses `<div>` tags with onclick handlers. Both use identical class names so CSS applies equally.

---

## Troubleshooting

### Stats not showing on cards
1. Check if the detail endpoint returns stats: `curl https://helpbot.marathondb.gg/api/weapons/{slug}` → look for `"stats"` field
2. Helpbot returns `stats` as a **single object** (not array) — code handles both formats
3. Some weapons (e.g., Impact HAR) have `stats: null` — this is expected, no stat row shown

### Ammo icons not showing
1. Verify ammo type normalization: helpbot returns title case `"Heavy Rounds"` → must convert to `"heavy_rounds"`
2. Special case: `"Volt Battery"` maps to `"volt_cell"` key
3. Check assets exist in `/assets/icons/ammo/`

### FOUC (flash of old design)
- If `weapons/index.html` shows old card design briefly on reload, the SSG output is stale
- Re-run `node build/ssg.js --weapons` to regenerate
- The listing page is always regenerated (no hand-crafted skip)

### Ratings not showing
- Trending threshold is **3 votes** — weapons with fewer votes won't show the badge
- Community votes are low early on (max ~10-25)
