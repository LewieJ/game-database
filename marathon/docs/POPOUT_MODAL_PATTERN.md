# Popout Modal Design Pattern

Reference document for converting item detail pages into single-page popout modals.  
First implemented on **Cores** (`feature/cores-popout-redesign`). Next targets: **Implants**, **Mods**.

---

## Overview

Instead of individual detail pages (e.g. `/cores/adaptive-barrier/index.html`), all items live on one listing page. Clicking a card opens a compact popout modal that fetches full detail from the API.

### Benefits
- Fewer static HTML pages to maintain / deploy
- Faster navigation (no full page load)
- Shareable URLs via query param (`?core=siphon-strike`)
- Better ad placement control inside the modal

---

## Architecture

### 1. Listing Page (`/{items}/index.html`)

- Existing grid + filters stay as-is
- Cards render as `<div>` with `data-slug`, `role="button"`, `tabindex="0"` (not `<a href>`)
- Modal overlay HTML appended before `</body>`

### 2. JavaScript (`/js/{items}.js`)

| Concern | Approach |
|---|---|
| **Grid event delegation** | Single `click` + `keydown` listener on the grid container, set up once in `DOMContentLoaded` |
| **Modal open** | `openModal(slug, skipPush)` — shows overlay, fetches detail via API, renders sections |
| **Modal close** | `closeModal(skipPush)` — hides overlay, clears URL param, restores body scroll |
| **URL state** | `?{item}=slug` query param, `history.pushState` / `popstate` for back/forward |
| **Deep link** | On page load, check `URLSearchParams` for item param and auto-open if present |
| **Loading state** | Show overlay immediately with "Loading..." text, populate on API response |

### 3. CSS (`/css/pages.css`)

~500 lines per item type. Key classes:

```
.{item}-modal-overlay    – fixed fullscreen, z-index 9999, opacity transition
.{item}-modal-backdrop   – click-to-close dark overlay
.{item}-modal            – centered card, max-width 1100px, max-height 92vh, slide-up animation
.{item}-modal-body       – flex row (left panel + right panel)
.{item}-modal-left       – 340px, dark bg, icon + ad slots
.{item}-modal-right      – flex-grow, overflow-y auto (scrollable detail)
body.modal-open          – overflow: hidden (prevent background scroll)
```

Responsive breakpoints: stack columns at 900px, adjust stat layout at 480px.

---

## HTML Template (Modal Overlay)

```html
<!-- {Item} Detail Popout Modal -->
<div class="{item}-modal-overlay" id="{item}Modal" aria-hidden="true">
    <div class="{item}-modal-backdrop" id="{item}ModalBackdrop"></div>
    <div class="{item}-modal" role="dialog" aria-modal="true" aria-labelledby="{item}ModalName">
        <button class="{item}-modal-close" id="{item}ModalClose" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
        </button>

        <div class="{item}-modal-body">
            <!-- Left: icon + ads -->
            <div class="{item}-modal-left">
                <div class="{item}-modal-ad {item}-modal-ad--top">
                    <span class="ad-label">Ad</span>
                    <div class="ad-container ad-placeholder" style="width:300px;height:250px;">Ad — 300x250</div>
                </div>
                <div class="{item}-modal-icon-area" id="{item}ModalIconArea">
                    <div class="{item}-modal-icon-frame" id="{item}ModalIconFrame">
                        <img id="{item}ModalIcon" src="" alt="" loading="lazy">
                    </div>
                    <div class="{item}-modal-rarity-glow" id="{item}ModalRarityGlow"></div>
                </div>
                <div class="{item}-modal-ad {item}-modal-ad--bottom">
                    <span class="ad-label">Ad</span>
                    <div class="ad-container ad-placeholder" style="width:300px;height:250px;">Ad — 300x250</div>
                </div>
            </div>

            <!-- Right: detail sections -->
            <div class="{item}-modal-right">
                <div class="{item}-modal-header">
                    <div class="{item}-modal-badges" id="{item}ModalBadges"></div>
                    <h2 class="{item}-modal-name" id="{item}ModalName">Loading...</h2>
                    <p class="{item}-modal-description" id="{item}ModalDescription"></p>
                </div>

                <div class="{item}-modal-quick-stats" id="{item}ModalQuickStats"></div>

                <!-- Repeat for each detail section (effects, perks, tags, history, etc.) -->
                <div class="{item}-modal-section" id="{item}ModalEffectsSection" style="display:none">
                    <div class="{item}-modal-section-header"><h3>Effects</h3></div>
                    <div class="{item}-modal-effects" id="{item}ModalEffects"></div>
                </div>

                <!-- Right-side ad -->
                <div class="{item}-modal-ad {item}-modal-ad--right">
                    <span class="ad-label">Ad</span>
                    <div class="ad-container ad-placeholder" style="width:100%;max-width:336px;height:280px;">Ad — 336x280</div>
                </div>

                <!-- Meta info -->
                <div class="{item}-modal-meta" id="{item}ModalMeta"></div>
            </div>
        </div>
    </div>
</div>
```

---

## JS Pattern (Key Functions)

```js
// Event delegation — set up ONCE in DOMContentLoaded
const grid = document.getElementById('{items}Grid');
if (grid) {
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.{item}-card[data-slug]');
        if (card) openModal(card.dataset.slug);
    });
    grid.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('.{item}-card[data-slug]');
            if (card) { e.preventDefault(); openModal(card.dataset.slug); }
        }
    });
}

// Modal wiring
document.getElementById('{item}ModalBackdrop')?.addEventListener('click', closeModal);
document.getElementById('{item}ModalClose')?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// Browser back/forward
window.addEventListener('popstate', (e) => {
    if (e.state?.{item}Slug) openModal(e.state.{item}Slug, true);
    else closeModal(true);
});

// Deep link on load
const param = new URLSearchParams(window.location.search).get('{item}');
if (param) openModal(param, true);
```

### openModal(slug, skipPush)
1. Set `current{Item}Slug = slug`
2. Show overlay (`classList.add('active')`, `aria-hidden="false"`)
3. Add `body.modal-open`
4. Set loading text
5. If `!skipPush`, push URL state: `?{item}=slug`
6. Fetch detail: `MarathonAPI.get{Item}BySlug(slug)`
7. Call `renderModal(data)` to populate all sections

### closeModal(skipPush)
1. Remove `.active` from overlay, set `aria-hidden="true"`
2. Remove `body.modal-open`
3. Clear `current{Item}Slug`
4. If `!skipPush`, push clean URL (remove query param)

### Card Template (inside displayItems)
```html
<div class="{item}-card {rarity}" data-slug="{slug}" role="button" tabindex="0">
    <!-- card content — NO <a href> wrapper -->
</div>
```

---

## Ad Placements (3 slots per modal)

| Position | Size | Location |
|---|---|---|
| Top-left | 300×250 | Above icon in left panel |
| Bottom-left | 300×250 | Below icon in left panel |
| Right-side | 336×280 | After detail sections in right panel |

Currently using dashed-border placeholders. Replace with real AdSense units (`ca-pub-1865737750178944`) when ready.

---

## Conversion Checklist

When converting a new item type (implants, mods, etc.):

- [ ] **Backup** existing JS: `cp js/{items}.js js/{items}.js.bak`
- [ ] **Create branch**: `git checkout -b feature/{items}-popout-redesign`
- [ ] **HTML**: Add modal overlay to `/{items}/index.html` (use template above)
- [ ] **JS**: Rewrite `js/{items}.js` — cards as divs, event delegation, modal open/close/render
- [ ] **CSS**: Add ~500 lines to `css/pages.css` — modal overlay, layout, sections, responsive
- [ ] **API**: Ensure `MarathonAPI.get{Item}BySlug(slug)` exists in `js/api.js`
- [ ] **URL state**: `?{item}=slug` with pushState/popstate
- [ ] **Accessibility**: `role="button"`, `tabindex="0"`, `aria-modal`, keyboard nav, ESC close
- [ ] **Ad placeholders**: 3 slots (top-left, bottom-left, right-side)
- [ ] **Test**: Cards open modal, ESC/backdrop close, back/forward, deep links, API data loads
- [ ] **Commit & verify** on feature branch
- [ ] **Delete old detail pages** once validated (e.g. `/{items}/item-name/index.html`)

---

## Reference Implementation

- **Branch**: `feature/cores-popout-redesign`
- **HTML**: `cores/index.html` (lines 1932–2042)
- **JS**: `js/cores.js` (660 lines)
- **CSS**: `css/pages.css` (modal block ~500 lines before "RUNNER CORES SECTION")
- **Backup**: `js/cores.js.bak`
