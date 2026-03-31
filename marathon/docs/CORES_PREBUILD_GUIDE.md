# Cores Page — Prebuild & SEO Guide

> **Purpose:** This document tracks the prebuild architecture for the cores page and the SEO improvements applied, mirroring the implants page spec.

---

## Architecture Overview

The cores page uses a **prebuild + client hydration** model (identical to implants):

1. **`build/prebuild-cores.js`** — A Node.js script that runs at build time.
   - Fetches all core data from `https://cores.marathondb.gg/api/cores`
   - Injects a `window.__CORES_DATA` JSON blob into `cores/index.html`
   - Generates static HTML cards inside `#coresGrid` (visible to Google)
   - Generates an SEO-only `<noscript>` core link list (crawlable fallback)
   - Updates the structured data `<script type="application/ld+json">` with current data + `itemListElement`
   - Updates the `<title>`, `<meta description>`, and item count automatically

2. **`js/cores.js`** — Client-side JavaScript on page load.
   - Reads from `window.__CORES_DATA` instead of calling the API
   - **No API call is made for the listing grid** — data is already embedded
   - Hydrates interactive behavior: filtering, sorting, search, runner tabs, rarity pills
   - Modal detail view still calls `MarathonAPI.getCoreBySlug(slug)` live (only on user click)
   - SEO detail block: When `?core=slug` is in the URL, renders a crawlable `<section>` with full detail, updates canonical, title, meta, OG tags, injects TechArticle JSON-LD, and extends the breadcrumb

3. **`cores/index.html`** — The page template.
   - Contains placeholder markers that the prebuild script replaces
   - Static HTML cards are SEO-crawlable even with JS disabled
   - Modal HTML remains static (populated by JS on click)
   - `<section id="coreDetailSeo">` container for the SEO detail block

---

## How to Run the Prebuild

```bash
node build/prebuild-cores.js
```

This modifies `cores/index.html` in-place. Run it:
- Before deploying to production
- After any core data changes in the API
- As part of the CI/CD pipeline

---

## What the Prebuild Script Does

| Step | What it does |
|------|-------------|
| 1 | Fetches `GET /api/cores` from the cores API |
| 2 | Replaces content between `<!--PREBUILD:JSON_DATA_START-->` / `_END-->` with `<script>window.__CORES_DATA = [...]</script>` |
| 3 | Replaces content between `<!--PREBUILD:GRID_CARDS_START-->` / `_END-->` with static HTML cards |
| 4 | Replaces content between `<!--PREBUILD:SEO_LIST_START-->` / `_END-->` with a `<noscript>` crawlable link list |
| 5 | Replaces content between `<!--PREBUILD:STRUCTURED_DATA_START-->` / `_END-->` with updated JSON-LD (with `itemListElement`) |
| 6 | Updates the item count in the `#coreCount` span via regex |

All replacements are **idempotent** — the script can be run any number of times on the same HTML file.

---

## SEO Features

### Page-Level
- **Title:** `Marathon Cores – All Runner Upgrades, Stats & Effects | MarathonDB`
- **Meta Description:** Keyword-rich, mentions all runner classes
- **OG/Twitter Tags:** Consistent title & description
- **Structured Data:** `CollectionPage` with `itemListElement` listing all cores
- **Static HTML Cards:** Pre-rendered in DOM for crawlers
- **`<noscript>` Fallback:** Crawlable link list for JS-disabled bots

### Item-Level (via `?core=` URL)
- **Self-Referencing Canonical:** `<link rel="canonical">` updates to `?core=slug`
- **TechArticle Schema:** JSON-LD injected into `<head>` per item
- **Item Title/Meta/OG:** Updates dynamically for each core
- **Breadcrumb Extension:** Home > Cores > Core Name
- **Visible Detail Section:** `#coreDetailSeo` renders crawlable HTML with name, runner, rarity, description, effects, stats, capabilities

### Images
- **Descriptive Alt Text:** `"Core Name – Marathon Runner core"` format
- **Fallback Icons:** `.icon-fallback` CSS class with SVG pseudo-element placeholder when images fail to load

---

## Placeholder Markers in index.html

The prebuild script uses **start/end marker pairs** so it can re-run on already-built HTML:

```html
<!--PREBUILD:JSON_DATA_START-->
    <script>window.__CORES_DATA = [...];</script>
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

The count is updated via regex on the `#coreCount` span — no marker needed.

> **Do not remove or rename these markers.** The prebuild script depends on them for idempotent replacements.

---

## File Map

| File | Role |
|------|------|
| `build/prebuild-cores.js` | Build script — fetches API data, injects into HTML |
| `cores/index.html` | Page template with prebuild placeholders |
| `js/cores.js` | Client JS — reads prebuilt data, handles interactivity + modal + SEO detail block |
| `js/api.js` | API client — still used for modal detail fetches |
| `css/pages.css` | Styles for cards, modal, filters, SEO detail block, icon fallback |

---

## Modal Detail Fetch (Still Live)

The modal popup still calls `MarathonAPI.getCoreBySlug(slug)` when a user clicks a card. This is intentional:
- Detail data (perk rolls, full balance history) is heavier and changes less frequently
- Only fires on user interaction, not on page load
- Not exposed to search engine crawlers
- Could be prebuilt in future if API exposure is a concern

---

## Layout

- **Grid:** 4 columns at desktop (>1024px), 2 columns at tablet (769–1024px), 2 columns at mobile (<768px)
- **Card Layout:** Matches the implants page pattern — icon, name, runner type, rarity, description, cost, capability badges

---

## Maintenance Notes

- If new cores are added to the API, re-run `node build/prebuild-cores.js`
- The prebuild script is idempotent — safe to run multiple times
- The structured data `itemListElement` is auto-generated from API data
- The `numberOfItems` count updates automatically
- Internal linking: the cores page links to `/implants/` (and vice versa)
