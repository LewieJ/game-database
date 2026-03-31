# Weapon Skins SSG — Reference Document

> Saved for context continuity across sessions.
> Last updated after the abyss-sunrise build session.

---

## Architecture Overview

### Single Rating System

All weapon skin ratings (both listing page and detail pages) use **one API**:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/skins` | Inline `rating` object per skin (listing page) |
| `GET /api/skins/:slug` | Full rating data (detail page initial load) |
| `POST /api/skins/:slug/rate` | Submit vote `{ rating: 1-5, device_token }` |

**API Base:** `https://weaponskins.marathondb.gg`

The detail page rating widget is self-contained inline JS in the SSG template (no external dependency on `cosmetic-ratings.js`). Both listing and detail pages share the same localStorage keys (`mdb_ws_vote_{slug}`, `mdb_ws_device_id`) so votes sync across views.

### Slug Mapping (Critical)

Hand-coded detail pages use different slugs than the API:

| API slug | Page slug (in `SKIN_PAGE_SLUGS`) |
|----------|----------------------------------|
| `midnight-decay-misriah-2442` | `midnight-decay-misriah2442-skin` |
| `midnight-decay-overrun-ar` | `midnight-decay-overrun-ar-skin` |
| `zero-step-004-ce-tactical-sidearm` | `zero-step-004-ce-tactical-sidearm-skin` |
| `twitch-engine-demolition-hmg` | `twitch-engine-demolition-hmg-skin` |
| `no-harm` | `no-harm` |

SSG-generated pages (like `abyss-sunrise`) use the **API slug directly** as the page slug.

The helpbot API stores ratings keyed by **page slug**, so a reverse mapping (`PAGE_TO_API_SLUG`) is needed when merging helpbot ratings into the listing page.

---

## SSG System

### Script: `build/ssg-weapon-skins.js`

- **API:** `https://weaponskins.marathondb.gg/api/skins` (paginated, 100 per page)
- **Output:** `weapon-skins/{slug}/index.html`
- **CLI flags:**
  - `--slug=X` — build single page
  - `--test` — build first 3 skins only
  - `--dry-run` — no file writes
- **SKIP_SLUGS:** hand-coded pages are skipped (midnight-decay-misriah-2442, midnight-decay-overrun-ar, zero-step-004-ce-tactical-sidearm, twitch-engine-demolition-hmg)
- **Run command:** `node build/ssg-weapon-skins.js` (all) or `node build/ssg-weapon-skins.js --slug=abyss-sunrise` (single)

### Key Template Functions

| Function | Purpose |
|----------|---------|
| `generateWeaponSkinPage(skin, allSkins)` | Main page generator |
| `buildDetailRows(skin)` | Details card: rarity, weapon, source, collection, faction |
| `buildStoreRows(skin)` | Store info: packs, bundles, pricing |
| `buildQuickNav(skin, allSkins)` | Prev/next navigation |
| `buildCollectionSection(skin, allSkins)` | Related skins from same collection |
| `generateNavigation()` | Site-wide nav bar |
| `generateFooter()` | Site-wide footer |

### Template Changes Made This Session

1. **Description:** Moved from hero section to details card (`.wsd-card-desc` wrapper)
2. **Dates:** Release info card expanded with `availability.available_from`, `availability.available_until`, `metadata.created_at`, `metadata.updated_at`
3. **Labels:** "How to Get It" → "How to Unlock This Skin", "Source" → "Unlock Source"
4. **CSS added:** `.wsd-card-desc` (padding, border-top) and `.wsd-card-desc .wsd-desc-text` (italic, dim) in `css/pages.css`

---

## Weapon Skins API

- **Base:** `https://weaponskins.marathondb.gg`
- **Endpoints:**
  - `GET /api/skins` — paginated list (includes inline `rating` object per skin)
  - `GET /api/skins/:slug` — single skin detail
  - `POST /api/skins/:slug/rate` — submit vote (`{ rating: 1-5, device_token }`)
  - `GET /api/skins/weapon/:weaponSlug` — skins for a specific weapon
- **Image CDN:** `https://weaponskins.marathondb.gg/assets/weapon-skins/{slug}/`
  - Sizes: `thumbnail` (200×400), `card` (400×800), `full` (800×1600)
  - Format: WebP, 1:2 portrait aspect ratio

### Rating System

- **5-emoji scale:** 🔥 Fire (5), 😍 Love (4), 😐 Meh (3), 👎 Nah (2), 💩 Trash (1)
- **Score formula:** `((sum / total) - 1) / 4 × 100` → 0-100%
- **Distribution format (weaponskins API):** Named keys: `{ fire: { count, percent }, love: {...}, ... }`
- **Distribution format (helpbot API):** Numeric keys: `{ "1": { count, percent }, "2": {...}, ... }`
- CSS classes: `.cw-heat-strip`, `.cw-heat-fill`, `.cw-heat-emoji`, `.cw-emoji-count`

### 8 Rarity Tiers

| Rarity | Color | CSS variable |
|--------|-------|-------------|
| common | #aaa | `--rarity-common` |
| uncommon | #22c55e | `--rarity-uncommon` |
| rare | #3b82f6 | `--rarity-rare` |
| legendary | #a855f7 | `--rarity-legendary` |
| exotic | #f59e0b | `--rarity-exotic` |
| deluxe | #ec4899 | `--rarity-deluxe` |
| enhanced | #06b6d4 | `--rarity-enhanced` |
| superior | #c084fc | `--rarity-superior` |

---

## File Inventory

### JS Files

| File | Purpose | Loaded on |
|------|---------|-----------|
| `js/cosmetics-weapons.js` | Listing page grid, filters, ratings (weaponskins API) | `/weapon-skins/` |
| `js/cosmetic-ratings.js` | `EmojiRatingWidget` class (helpbot API) — **NOT used by weapon skins** | Other cosmetic detail pages |
| `js/api.js` | Shared API utilities | Both |
| `js/search.js` | Site search | Both |
| `js/mobile-nav.js` | Mobile navigation | Both |
| `js/feedback.js` | Feedback widget | Both |

### CSS

- `css/pages.css` — All page-specific styles including `.wsd-*` weapon skin detail classes
  - WSD card/row styles: ~line 22663+
  - Rarity-based page theming: ~line 26983+
  - `.wsd-card-desc` styles: added this session

### Pages

| Path | Type |
|------|------|
| `weapon-skins/index.html` | Listing page (loads `cosmetics-weapons.js`) |
| `weapon-skins/abyss-sunrise/` | SSG-generated detail page |
| `weapon-skins/midnight-decay-misriah2442-skin/` | Hand-coded detail page |
| `weapon-skins/midnight-decay-overrun-ar-skin/` | Hand-coded detail page |
| `weapon-skins/zero-step-004-ce-tactical-sidearm-skin/` | Hand-coded detail page |
| `weapon-skins/twitch-engine-demolition-hmg-skin/` | Hand-coded detail page |
| `weapon-skins/no-harm/` | Hand-coded detail page |

---

## Design Decisions

1. **SSG over hand-coding** — All new weapon skin pages use the SSG system for consistency and scalability.
2. **Description in details card** — Moved from hero section to keep hero clean; description sits below the detail rows in an italic, dimmed style.
3. **Date expansion** — Release info shows all available dates (available_from, available_until, created, updated) via an IIFE in the template.
4. **Single-source ratings** — Both listing and detail pages use `weaponskins.marathondb.gg` exclusively. The detail page has an inline rating widget in the SSG template instead of depending on `cosmetic-ratings.js`/helpbot. Same localStorage keys (`mdb_ws_vote_`, `mdb_ws_device_id`) ensure votes sync across views.
5. **Slug consistency** — SSG pages use API slugs directly. Only legacy hand-coded pages have the `-skin` suffix mapping.

---

## Quick Commands

```bash
# Build all weapon skin pages
node build/ssg-weapon-skins.js

# Build a single skin page
node build/ssg-weapon-skins.js --slug=abyss-sunrise

# Dry run (no file writes)
node build/ssg-weapon-skins.js --dry-run

# Test mode (first 3 skins only)
node build/ssg-weapon-skins.js --test
```
