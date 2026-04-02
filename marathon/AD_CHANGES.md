# Ad Changes Log

A record of all ad optimisation changes made to the site, in reverse chronological order, for easy reversion if needed.

---

## 2026-03-15 — Removed all mobile ad slots (preparing for rebuild)

**Slots removed:**

| Slot ID | Ad Unit Name | RPM | Impressions |
|---|---|---|---|
| `4067441040` | Mobile Top Banner | £0.33 | 702 |
| `8182177389` | Mobile Mid-Content | £0.35 | 165 |
| `4207041840` | Below Hero Responsive | £0.16 | 284 |

**Why:** All three mobile/below-hero slots were severely underperforming (£0.16–£0.35 RPM, near-zero clicks). Removing to clear the slate for a proper mobile ad strategy rebuild on a dedicated branch.

**Files changed:** All weapon, runner, core, background, charm, contract, emblem, news, population, pc-requirements, and discord-bot pages. Build templates: `build/ssg.js`, `build/ssg-backgrounds.js`, `build/ssg-weapon-filter-pages.js`.

**How to revert:** Re-add from git history (`git diff HEAD~1`).

---

## 2026-03-15 — Siderail ad optimization

**Changes:**
1. **Lowered breakpoint** from 1700px → 1400px in `css/pages.css` — siderails now visible to more desktop users
2. **Changed ad format** from `data-ad-format="auto"` + `data-full-width-responsive="true"` to `data-ad-format="vertical"` on both siderail slots (`4717575097`, `1892101209`) — tells AdSense to serve tall skyscraper creatives optimized for narrow vertical containers
3. **Added siderails** to 5 pages that were missing them: `lfg/`, `leaderboards/`, `discord-bot/`, `marathon-pc-requirements/`, `editorial-policy/`

**Files changed:** `css/pages.css`, all files containing siderail slots (~100+ HTML files, build templates), plus 5 new-siderail pages

**Why:** Both siderails had 75-77% viewability but only £0.18–£0.23 RPM. `full-width-responsive` inside a 300px container was confusing the responsive sizing, and the 1700px breakpoint was cutting out a large portion of desktop traffic.

**How to revert:**
- Change `1400px` back to `1700px` in the two `@media` blocks in `css/pages.css`
- Bulk replace `data-ad-format="vertical"` → `data-ad-format="auto" data-full-width-responsive="true"` on slots `4717575097` and `1892101209`
- Remove siderail `<aside>` blocks from the 5 newly-added pages

---

## 2026-03-15 — Removed 4 underperforming ad slots

**Slots removed:**

| Slot ID | Ad Unit Name | RPM | Why removed |
|---|---|---|---|
| `7743437532` | MarathonDB – Mobile In-Content | £0.48 | 9 impressions, 0 clicks, negligible revenue |
| `4163285174` | Test horizontal mobile (320×50) | £0.29 | 4 impressions, 0 clicks, test unit never scaled |
| `7523956871` | 320×100 horiz (runner core mid-page) | £0.15 | 9 impressions, 0 clicks, lowest RPM on site |
| `3707688289` | News article mobile-only ad | — | Near-zero traffic, no measurable revenue |

**Files changed:**
- `7743437532` — removed from `build/ssg.js`, `build/ssg-weapon-skins.js`, 7 charm pages, ~62 weapon-skin pages
- `4163285174` — removed from `build/ssg.js`, 7 charm pages
- `7523956871` — removed from `build/ssg-runner-cores.js`, 6 core detail pages
- `3707688289` — removed from 4 news article pages

**How to revert:** Re-add the ad blocks from git history (`git diff HEAD~1`).

---

## 2026-03-13 — Fix siderail separation from content

**Files changed:** `css/pages.css`

**Problem:** On wide viewports (>~1816px), `position: fixed` siderails anchored at `left: 0` / `right: 0` created a large gap between the ads and the page content (content is centred in a 1200px container).

**Change:**
```css
/* Before */
.ad-siderail-fixed--left  { left: 0; }
.ad-siderail-fixed--right { right: 0; }

/* After */
.ad-siderail-fixed--left  { left:  max(0px, calc(50% - 908px)); }
.ad-siderail-fixed--right { right: max(0px, calc(50% - 908px)); }
```

**How to revert:** Change both rules back to `left: 0` and `right: 0`.

**Affects:** All pages using `ad-siderail-fixed` (~50 pages: weapons, runners, cores, mods, emblems, implants, items, population).

---

## 2026-03-15 — Removed 30s auto-refresh (reverted 2026-03-13 change)

**Files changed:** `js/ad-refresh.js` (deleted), all pages that loaded it (~53 files including `build/ssg.js`, `build/ssg-runner-cores.js`)

**Why:** The viewability-based 30-second refresh was compressing CPM faster than it added impressions, resulting in a net RPM drop. Removed the refresh script and all `<script src="/js/ad-refresh.js"></script>` references site-wide. The flanking 300×600 ad units themselves remain unchanged.

---

## ~~2026-03-13 — Viewability-based 30s auto-refresh~~ *(reverted 2026-03-15)*

**Files changed:** `js/ad-refresh.js` (new file), all pages with slot `4868305251` + `population/index.html`

**What it does:** After a 300×600 flanking ad has been continuously ≥50% visible for 30 seconds, it swaps in a fresh `<ins>` clone and fires a new AdSense push. The timer resets if the user scrolls the ad out of view.

**Ad slots covered:**
| Slot ID | Location |
|---|---|
| `4868305251` | All weapon, runner, cores, mods, emblems, implants, items pages (~49 pages) |
| `4717575097` | `population/index.html` (left siderail) |
| `1892101209` | `population/index.html` (right siderail) |

**Why 30 seconds:** Google AdSense policy requires a minimum of 30 seconds between refreshes. Shorter intervals inflate impression volume without proportionally increasing demand, compressing CPM and reducing net RPM.

**How to revert:**
- Delete `js/ad-refresh.js`
- Remove `<script src="/js/ad-refresh.js"></script>` from all affected pages (bulk find-replace)
- Remove the script reference from `build/ssg.js` and `build/ssg-runner-cores.js` templates

---

## 2026-03-12 — Flanking 300×600 ad units added to hub & detail pages

**Format:** `<ins>` 300×600, slot `4868305251`

**Pages added to:** 49 pages across weapons (all weapon detail pages), runners (all runner detail pages), cores (hub + all 6 detail pages), emblems hub, implants hub, items hub, items/purchasable, mods hub.

**Two units per page:** left flanking column + right flanking column.

**How to revert:** Remove all `<ins data-ad-slot="4868305251">` blocks and accompanying `<script>(adsbygoogle...).push({})</script>` calls from affected pages.
