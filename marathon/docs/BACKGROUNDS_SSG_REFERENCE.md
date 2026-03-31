# Backgrounds SSG — Build Reference

> Internal reference for building background detail pages via the standalone SSG script.

---

## Quick Commands

```powershell
# Full build — generates all background detail pages
node build/ssg-backgrounds.js

# Test mode — builds 1 page only (safe preview)
node build/ssg-backgrounds.js --test

# Dry run — logs what would be written, no file changes
node build/ssg-backgrounds.js --dry-run

# Single slug — build one specific background
node build/ssg-backgrounds.js --slug=apogee-intercept
```

---

## Architecture

### File Map

| File | Purpose |
|---|---|
| `build/ssg-backgrounds.js` | Standalone SSG — fetches API, generates all detail pages |
| `js/background-detail.js` | Client-side JS for the **concept page** (API-hydrated fallback) |
| `backgrounds/{slug}/index.html` | Output: one detail page per background |
| `backgrounds/index.html` | Listing page (separate, not part of SSG) |
| `js/cosmetics-backgrounds.js` | Listing page JS (separate) |
| `js/cosmetic-ratings.js` | Shared rating system (EmojiRatingWidget + CosmeticRatingsAPI) |
| `css/pages.css` | All detail page CSS (`bd-*` classes) + listing cards (`.bg-card`) |
| `BACKGROUNDS_FRONTEND_GUIDE.md` | Full API documentation |

### How SSG Pages Work

1. **SSG (build time):** `ssg-backgrounds.js` fetches every background from the API, bakes all content (name, rarity, images, badges, detail rows, related items, prev/next nav) into static HTML. Meta tags, structured data, and OG images are all populated at build time — great for SEO.

2. **Runtime JS (inline):** Each SSG page includes a small inline `<script>` block that handles:
   - Share buttons (Twitter/X, Discord copy, URL copy)
   - Lightbox for full-size image viewing
   - EmojiRatingWidget initialization (interactive community voting)

3. **Concept page (fallback):** `backgrounds/apogee-intercept/index.html` uses `background-detail.js` to fetch everything at runtime. This is the design prototype — it works without SSG but has weaker SEO since meta tags are generic until JS runs.

---

## API Reference

**Base URL:** `https://backgrounds.marathondb.gg`  
**Image CDN:** `https://helpbot.marathondb.gg/`

### Endpoints Used by SSG

| Endpoint | Used For |
|---|---|
| `GET /api/backgrounds` | List all backgrounds (for related items + prev/next nav) |
| `GET /api/backgrounds/:slug` | Full detail + ratings for one background |

### Response Shape (Detail)

```json
{
  "slug": "apogee-intercept",
  "name": "Apogee Intercept",
  "description": "...",
  "flavor_text": "...",
  "image_url": "assets/backgrounds/apogee-intercept/full.webp",
  "image_preview_url": "assets/backgrounds/apogee-intercept/preview.webp",
  "rarity": "legendary",
  "source_type": "store",
  "acquisition_summary": "Short text for cards",
  "acquisition_detail": "Longer guide text for detail pages",
  "price": 1200,
  "currency": "Credits",
  "battlepass_tier": null,
  "available_from": "2026-01-15",
  "available_until": null,
  "is_obtainable": 1,
  "faction_id": null,
  "faction_name": null,
  "faction_slug": null,
  "season_name": "Season 1",
  "ratings": {
    "score_percent": 72.5,
    "total_votes": 42,
    "distribution": { "1": {...}, "2": {...}, "3": {...}, "4": {...}, "5": {...} },
    "user_rating": null
  }
}
```

### Image Paths

Images are relative paths in the API. Resolve with CDN prefix:

```
preview: https://helpbot.marathondb.gg/assets/backgrounds/{slug}/preview.webp  (267×400)
full:    https://helpbot.marathondb.gg/assets/backgrounds/{slug}/full.webp      (800×1200)
```

Always use `aspect-ratio: 2 / 3` on containers.

---

## Colour Tokens

### Rarity

| Rarity | Hex |
|---|---|
| Common | `#95a5a6` |
| Uncommon | `#2ecc71` |
| Rare | `#3498db` |
| Epic | `#9b59b6` |
| Legendary | `#f39c12` |

### Source Type

| Source | Label | Hex |
|---|---|---|
| `free` | Free | `#2ecc71` |
| `codex` | Codex Reward | `#00d4ff` |
| `battlepass` | Battle Pass | `#f39c12` |
| `event` | Limited Event | `#9b59b6` |
| `store` | Store | `#3498db` |

### Factions

| Slug | Hex |
|---|---|
| `cyberacme` | `#01d838` |
| `nucaloric` | `#ff125d` |
| `traxus` | `#ff7300` |
| `vesper` | `#a855f7` |
| `arachne` | `#00d4ff` |
| `volantis` | `#facc15` |

---

## CSS Classes (in `pages.css`)

### Listing Page (`bg-*`)

- `.bg-card` — 2:3 portrait card container
- `.bg-card-image` — image wrapper with `aspect-ratio: 2 / 3`
- `.bg-card-name` — overlay name text
- `.bg-card-source--{type}` — source badge colour modifier
- `.bg-card-faction` — faction dot badge

### Detail Page (`bd-*`)

- `.bd-page` / `.bd-page-content` — main layout
- `.bd-hero` / `.bd-hero-inner` — hero section (image + info)
- `.bd-hero-preview` / `.bd-preview-frame--portrait` — 2:3 portrait frame
- `.bd-hero-info` — right column (name, badges, description)
- `.bd-rarity-badge` / `.bd-tag` — inline badges
- `.bd-breadcrumb` — breadcrumb nav
- `.bd-acquisition` — "How to Get It" box
- `.bd-rating-hero` — community rating widget area
- `.bd-body` / `.bd-cards-grid` — info cards layout
- `.bd-card` / `.bd-card-title` / `.bd-row` — detail info cards
- `.bd-related` / `.bd-related-grid` / `.bd-related-card` — related items grid
- `.bd-quick-nav` / `.bd-quick-link` — prev/next navigation
- `.bd-share-toast` — share confirmation toast
- `.ws-lightbox-overlay` / `.ws-lightbox-content` — fullscreen lightbox

---

## Rating System Integration

The rating widget uses the shared `cosmetic-ratings.js` (already included across all cosmetic pages).

**Key classes:**
- `CosmeticRatingsAPI` — client for `helpbot.marathondb.gg/api/ratings/cosmetics/:slug`
- `EmojiRatingWidget` — renders 🔥😍😐👎💩 interactive voting UI

**Initialization:**
```js
new EmojiRatingWidget(element, slug, {
    cosmeticType: 'background',
    skinName: 'Apogee Intercept'
});
```

The widget reads `data-cosmetic-slug` and `data-cosmetic-name` from the container element. Device token is stored in `localStorage` under `marathondb_device_token`.

---

## Deployment Notes

1. Run `node build/ssg-backgrounds.js` after any API content changes
2. SSG outputs go to `backgrounds/{slug}/index.html` — these are committed to the repo
3. Cloudflare Pages deploys from the repo root; pages are immediately live after push
4. The concept page at `backgrounds/apogee-intercept/` works without SSG (uses `background-detail.js` for runtime hydration)
5. The old detail pages at `backgrounds/{slug}-background/` should be redirected or removed once SSG pages are verified

---

## Maintenance Checklist

- [ ] When adding a new background via admin, re-run the SSG
- [ ] When updating nav HTML, update `generateNavigation()` in `ssg-backgrounds.js`
- [ ] When CSS class names change in `pages.css`, update the template in the SSG
- [ ] When the rating system changes, update the inline `<script>` in the SSG template
- [ ] Image CDN base is `https://helpbot.marathondb.gg/` — if this changes, update `BG_CDN` in both `ssg-backgrounds.js` and `background-detail.js`
