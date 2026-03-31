# Runner Detail Pages — Prebuild Guide

## Overview

`build/prebuild-runners.js` is a Node.js script that fetches runner data from the API at build time and injects pre-rendered HTML into each runner detail page (`/runners/{slug}/index.html`). This improves SEO (Google can crawl static content without executing JS) and reduces API pings on page load.

## Usage

```bash
node build/prebuild-runners.js
```

Run this whenever runner data changes (new abilities, stat rebalances, new seasons, etc.).

## What It Updates

For each of the 7 runner pages (assassin, destroyer, recon, rook, thief, triage, vandal):

| Section | Container ID | Marker Tag | Description |
|---------|-------------|------------|-------------|
| Abilities | `#abilitiesList` | `ABILITIES` | Ability cards (tech, prime, tactical, traits) with cooldown/duration/charge pills |
| Stats | `#statsContainer` | `STATS` | Stat bar rows (13 stats: heat capacity, agility, etc.) |
| Stats Selector | `#statsVersionSelector` | `STATS_SELECTOR` | Season/patch version toggle buttons |
| Structured Data | JSON-LD `<script>` | `STRUCTURED_DATA` | Schema.org VideoGame + character data |

## How It Works

1. **Fetches each runner individually** from `https://runners.marathondb.gg/api/runners/{slug}` (the list endpoint doesn't include abilities/stats)
2. **Generates static HTML** matching the same markup that `runner-detail.js` produces client-side
3. **Injects HTML** using `<!--PREBUILD:{TAG}_START-->` / `<!--PREBUILD:{TAG}_END-->` marker comments
4. **First run bootstraps markers** automatically by finding the target container div and wrapping content
5. **Subsequent runs** use markers for fast, idempotent replacement

## What It Does NOT Touch

- **Community Rating Widget** — intentionally left to client-side hydration (`ratings.js` + `RatingWidget`). Votes always work because the widget initializes fresh on every page load.
- **Skins Tab** — loaded on-demand when user clicks the tab
- **Cores Tab** — loaded on-demand when user clicks the tab  
- **Patch History** — fetched client-side from the history endpoint
- **Navigation / Footer / Ads** — untouched static HTML

## How Votes Still Work

The rating system is completely independent of the prebuild:

1. `runner-detail.js` detects SSG content via the `isSSGRendered` check (line ~24)
2. It hydrates interactive features: tabs, share buttons, lightbox
3. It fetches fresh API data and re-renders abilities (which includes the `#ratingWidgetInline` container)
4. `initRatingWidget()` creates a new `RatingWidget` instance that talks to the ratings API
5. The compact rating badge in the header is updated via `loadRatingBadge()`

The prebuild only provides the initial static HTML that Google sees. Client-side JS overwrites it with fresh data + interactive widgets.

## Marker Pattern

Same pattern used by `prebuild-cores.js`, `prebuild-implants.js`, and `prebuild-mods.js`:

```html
<!--PREBUILD:ABILITIES_START-->
... pre-rendered HTML ...
<!--PREBUILD:ABILITIES_END-->
```

The `replaceMarkerBlock()` helper uses regex to find and replace content between markers. If markers don't exist yet (first run), `smartReplace()` falls back to finding the container div by ID and bootstrapping markers around its content.

## API Details

| Endpoint | Returns |
|----------|---------|
| `GET /api/runners` | List of all runners (slug, name, role — no abilities/stats) |
| `GET /api/runners/{slug}` | Full runner detail including `abilities[]` and `stats[]` arrays |

### Stats Array Structure

Each entry in `stats[]` represents a season/patch version:

```json
{
  "season_id": 2,
  "season_name": "Server Slam",
  "season_version": "Server Slam",
  "is_current": true,
  "heat_capacity": 20,
  "agility": 15,
  "loot_speed": 10,
  ...
}
```

The script uses the first entry as the default displayed stats.

### Abilities Array Structure

```json
{
  "ability_type": "prime",
  "name": "Echo Pulse",
  "description": "Activate your shell's advanced detection systems...",
  "cooldown_seconds": 229,
  "icon_url": "https://helpbot.marathondb.gg/assets/runners/recon/abilities/prime.png"
}
```

## Graceful Handling

- **Missing stats** (e.g. Thief had `stats: []` during initial testing) — the script skips stats injection, preserving any hand-crafted stats already in the HTML
- **Missing abilities** — renders "No abilities data" placeholder
- **Missing runner page** — logs a warning and skips
- **API errors** — logs a warning per runner and continues with the rest

## File Locations

| File | Purpose |
|------|---------|
| `build/prebuild-runners.js` | The prebuild script |
| `runners/{slug}/index.html` | Runner detail pages (7 total) |
| `js/runner-detail.js` | Client-side JS that hydrates SSG pages |
| `js/ratings.js` | Rating widget (independent of prebuild) |
| `css/pages.css` | Styles for runner detail pages |

## Stat Icons (Removed)

As of March 2026, stat icons (`<img class="stat-icon">`) have been removed from the game and from all runner detail pages:

- Removed from all 7 runner HTML files
- Removed from `runner-detail.js` (the `hasIcon` property and icon rendering)
- Removed `.stat-icon` CSS rules from `pages.css`

The prebuild script generates stats without icons.
