# Implants Page — Prebuild & SEO Guide

> **Purpose:** This document tracks the prebuild architecture for the implants page and the SEO improvements applied based on the MarathonDB Implants SEO Audit.

---

## Architecture Overview

The implants page uses a **prebuild + client hydration** model:

1. **`build/prebuild-implants.js`** — A Node.js script that runs at build time.
   - Fetches all implant data from `https://implants.marathondb.gg/api/implants`
   - Injects a `window.__IMPLANTS_DATA` JSON blob into `implants/index.html`
   - Generates static HTML cards inside `#implantsGrid` (visible to Google)
   - Generates an SEO-only `<noscript>` implant link list (crawlable fallback)
   - Updates the structured data `<script type="application/ld+json">` with current data
   - Updates the `<title>`, `<meta description>`, H1, and item count automatically

2. **`js/implants.js`** — Client-side JavaScript on page load.
   - Reads from `window.__IMPLANTS_DATA` instead of calling the API
   - **No API call is made for the listing grid** — data is already embedded
   - Hydrates interactive behavior: filtering, sorting, search, slot tabs, rarity pills
   - Modal detail view still calls `MarathonAPI.getImplantBySlug(slug)` live (only on user click)

3. **`implants/index.html`** — The page template.
   - Contains placeholder markers that the prebuild script replaces
   - Static HTML cards are SEO-crawlable even with JS disabled
   - Modal HTML remains static (populated by JS on click)

---

## How to Run the Prebuild

```bash
node build/prebuild-implants.js
```

This modifies `implants/index.html` in-place. Run it:
- Before deploying to production
- After any implant data changes in the API
- As part of the CI/CD pipeline

---

## What the Prebuild Script Does

| Step | What it does |
|------|-------------|
| 1 | Fetches `GET /api/implants` from the implants API |
| 2 | Replaces content between `<!--PREBUILD:JSON_DATA_START-->` / `_END-->` with `<script>window.__IMPLANTS_DATA = [...]</script>` |
| 3 | Replaces content between `<!--PREBUILD:GRID_CARDS_START-->` / `_END-->` with static HTML cards |
| 4 | Replaces content between `<!--PREBUILD:SEO_LIST_START-->` / `_END-->` with a `<noscript>` crawlable link list |
| 5 | Replaces content between `<!--PREBUILD:STRUCTURED_DATA_START-->` / `_END-->` with updated JSON-LD |
| 6 | Updates the item count in the `#implantCount` span via regex |

All replacements are **idempotent** — the script can be run any number of times on the same HTML file. Each marker pair wraps the injected content, and re-runs replace the content between the markers.

---

## SEO Improvements Applied

Based on the **MarathonDB Implants SEO Audit** (`MarathonDB_Implants_SEO_Audit.docx`):

### Critical (Done)
- **JS-Only Content → Fixed:** Grid cards are now pre-rendered in static HTML
- **Crawlable HTML Links → Fixed:** `<noscript>` fallback list provides crawlable anchors
- **Title Tag → Optimized:** `Marathon Implants – All Stats, Traits & Slots | MarathonDB`
- **H1 → Optimized:** `Marathon Implants – Stats, Traits & Upgrade Paths` (count moved to `<span>`)

### High Impact (Done)
- **Semantic H2 Sections:** Added "Marathon Implant Slots", "Implant Rarity Tiers" sections
- **Image Alt Text:** Card and modal images use descriptive alt text (`"Energy Harvesting V3 – Marathon implant"`)

### Maintained
- **Internal Linking:** Handled site-wide (not page-specific)
- **Performance:** H1 remains LCP element; ads lazy-loaded below fold

---

## Placeholder Markers in index.html

The prebuild script uses **start/end marker pairs** so it can re-run on already-built HTML:

```html
<!--PREBUILD:JSON_DATA_START-->
    <script>window.__IMPLANTS_DATA = [...];</script>
<!--PREBUILD:JSON_DATA_END-->

<!--PREBUILD:GRID_CARDS_START-->
    ... static HTML cards ...
<!--PREBUILD:GRID_CARDS_END-->

<!--PREBUILD:SEO_LIST_START-->
    <noscript>...</noscript>
<!--PREBUILD:SEO_LIST_END-->

<!--PREBUILD:STRUCTURED_DATA_START-->
    <script type="application/ld+json">...</script>
<!--PREBUILD:STRUCTURED_DATA_END-->
```

The count is updated via regex on the `#implantCount` span — no marker needed.

> **Do not remove or rename these markers.** The prebuild script depends on them for idempotent replacements.

---

## File Map

| File | Role |
|------|------|
| `build/prebuild-implants.js` | Build script — fetches API data, injects into HTML |
| `implants/index.html` | Page template with prebuild placeholders |
| `js/implants.js` | Client JS — reads prebuilt data, handles interactivity + modal |
| `js/api.js` | API client — still used for modal detail fetches |
| `css/pages.css` | Styles for cards, modal, filters |

---

## Modal Detail Fetch (Still Live)

The modal popup still calls `MarathonAPI.getImplantBySlug(slug)` when a user clicks a card. This is intentional:
- Detail data (variants, full traits) is heavier and changes less frequently
- Only fires on user interaction, not on page load
- Not exposed to search engine crawlers
- Could be prebuilt in future if API exposure is a concern

---

## Maintenance Notes

- If new implants are added to the API, re-run `node build/prebuild-implants.js`
- The prebuild script is idempotent — safe to run multiple times
- The structured data `itemListElement` is auto-generated from API data
- The `numberOfItems` count updates automatically
