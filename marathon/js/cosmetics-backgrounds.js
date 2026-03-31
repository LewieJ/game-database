/**
 * Cosmetics Backgrounds List Page  (v2 — backgrounds.marathondb.gg API)
 * Handles loading, filtering, sorting, and displaying profile backgrounds
 * API docs: BACKGROUNDS_FRONTEND_GUIDE.md
 */

(function () {
    'use strict';

    // ─── API ────────────────────────────────────────────────────────────
    const BG_API   = 'https://backgrounds.marathondb.gg';
    const BG_CDN   = 'https://helpbot.marathondb.gg/';       // image CDN prefix

    // ─── State ──────────────────────────────────────────────────────────
    let allBackgrounds      = [];
    let filteredBackgrounds  = [];
    let currentView          = 'grid';
    let ratingsMap           = {};
    let currentFilters = {
        search:      '',
        rarity:      'all',
        source:      'all',
        obtainable:  false,
        unavailable: false
    };

    // DOM cache
    let el = {};

    // ─── Rarity / Source helpers ────────────────────────────────────────
    const RARITY_ORDER = { standard: 1, enhanced: 2, deluxe: 3, superior: 4, prestige: 5, common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, exotic: 6 };

    const SOURCE_LABELS = {
        free:       'Free',
        codex:      'Codex',
        battlepass: 'Battle Pass',
        store:      'Store',
        event:      'Event',
        unknown:    'Unknown'
    };

    // ─── DOM cache ──────────────────────────────────────────────────────
    function cacheElements() {
        el = {
            totalCount:     document.getElementById('totalCount'),
            allCount:       document.getElementById('allCount'),
            searchInput:    document.getElementById('searchInput'),
            sortSelect:     document.getElementById('sortSelect'),
            sourceFilter:   document.getElementById('sourceFilter'),
            filterPills:    document.querySelectorAll('.filter-pill[data-filter]'),
            loadingState:   document.getElementById('loadingState'),
            resultsSection: document.getElementById('resultsSection'),
            backgroundsGrid:document.getElementById('backgroundsGrid'),
            emptyState:     document.getElementById('emptyState'),
            resetFilters:   document.getElementById('resetFilters'),
            obtainableToggle: document.getElementById('obtainableToggle')
        };
    }

    // ─── Init ───────────────────────────────────────────────────────────
    async function init() {
        cacheElements();
        try {
            await loadBackgrounds();
            setupEventListeners();
            updateStats();
            applyFilters();
            loadHeatRatings();           // existing CosmeticRatingsAPI (unchanged)
            setInterval(() => {
                document.querySelectorAll('.cw-countdown-badge[data-expiry]').forEach(badge => {
                    const txt = formatCountdown(badge.dataset.expiry);
                    if (txt) badge.textContent = `\u23f1 ENDS ${txt}`;
                    else badge.remove();
                });
            }, 1000);
        } catch (err) {
            console.error('Failed to init backgrounds page:', err);
            showError();
        }
    }

    // ─── Data fetching ──────────────────────────────────────────────────
    async function loadBackgrounds() {
        const res  = await fetch(`${BG_API}/api/backgrounds`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const json = await res.json();

        if (!json.data || !Array.isArray(json.data)) throw new Error('Bad API response');

        // Deduplicate by slug (safeguard)
        const map = new Map();
        json.data.forEach(bg => {
            if (!map.has(bg.slug)) {
                map.set(bg.slug, {
                    ...bg
                });
            }
        });
        allBackgrounds      = Array.from(map.values());
        filteredBackgrounds  = [...allBackgrounds];
    }

    // ─── Event listeners ────────────────────────────────────────────────
    function setupEventListeners() {
        // Search
        if (el.searchInput) {
            el.searchInput.addEventListener('input', debounce(() => {
                currentFilters.search = el.searchInput.value.toLowerCase().trim();
                applyFilters();
            }, 300));
        }

        // Rarity filter pills
        if (el.filterPills.length) {
            el.filterPills.forEach(pill => {
                pill.addEventListener('click', () => {
                    const f = pill.dataset.filter;
                    if (f === 'all') {
                        currentFilters.rarity = 'all';
                        currentFilters.unavailable = false;
                    } else if (f === 'vaulted') {
                        currentFilters.unavailable = !currentFilters.unavailable;
                        if (currentFilters.unavailable) currentFilters.rarity = 'all';
                    } else {
                        currentFilters.rarity = (currentFilters.rarity === f) ? 'all' : f;
                        currentFilters.unavailable = false;
                    }
                    syncFilterPills();
                    applyFilters();
                });
            });
        }

        // Source dropdown
        if (el.sourceFilter) {
            el.sourceFilter.addEventListener('change', () => {
                currentFilters.source = el.sourceFilter.value;
                applyFilters();
            });
        }

        // Obtainable toggle
        if (el.obtainableToggle) {
            el.obtainableToggle.addEventListener('change', () => {
                currentFilters.obtainable = el.obtainableToggle.checked;
                applyFilters();
            });
        }

        // Sort
        if (el.sortSelect) {
            el.sortSelect.addEventListener('change', applyFilters);
        }

        // Reset
        if (el.resetFilters) {
            el.resetFilters.addEventListener('click', resetAllFilters);
        }
    }

    function syncFilterPills() {
        el.filterPills.forEach(pill => {
            const f = pill.dataset.filter;
            if (f === 'all') {
                pill.classList.toggle('active', currentFilters.rarity === 'all' && !currentFilters.unavailable);
            } else if (f === 'vaulted') {
                pill.classList.toggle('active', currentFilters.unavailable);
            } else {
                pill.classList.toggle('active', currentFilters.rarity === f);
            }
        });
    }

    // ─── Filtering ──────────────────────────────────────────────────────
    function applyFilters() {
        filteredBackgrounds = allBackgrounds.filter(bg => {
            // Search
            if (currentFilters.search) {
                const hay = `${bg.name} ${bg.description || ''} ${bg.acquisition_summary || ''} ${bg.faction_name || ''}`.toLowerCase();
                if (!hay.includes(currentFilters.search)) return false;
            }
            // Rarity
            if (currentFilters.rarity !== 'all' && bg.rarity !== currentFilters.rarity) return false;
            // Source type
            if (currentFilters.source !== 'all' && bg.source_type !== currentFilters.source) return false;
            // Obtainable
            if (currentFilters.obtainable && !bg.is_obtainable) return false;
            // Vaulted / unavailable
            if (currentFilters.unavailable && bg.is_available !== false) return false;
            return true;
        });

        sortBackgrounds();
        renderBackgrounds();
    }

    // ─── Sorting ────────────────────────────────────────────────────────
    function sortBackgrounds() {
        const v = el.sortSelect ? el.sortSelect.value : 'featured';
        filteredBackgrounds.sort((a, b) => {
            switch (v) {
                case 'name-asc':     return a.name.localeCompare(b.name);
                case 'name-desc':    return b.name.localeCompare(a.name);
                case 'rarity-desc':  return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
                case 'rarity-asc':   return (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0);
                case 'newest':       return (b.id || 0) - (a.id || 0);
                default:             return 0;   // featured — server order
            }
        });
    }

    // ─── Rendering ──────────────────────────────────────────────────────
    function renderBackgrounds() {
        if (el.loadingState)   el.loadingState.style.display = 'none';
        if (el.resultsSection) el.resultsSection.style.display = 'block';

        if (filteredBackgrounds.length === 0) {
            if (el.backgroundsGrid) el.backgroundsGrid.style.display = 'none';
            if (el.emptyState) el.emptyState.style.display = 'flex';
            return;
        }

        if (el.backgroundsGrid) el.backgroundsGrid.style.display = '';
        if (el.emptyState) el.emptyState.style.display = 'none';

        if (el.backgroundsGrid) {
            el.backgroundsGrid.className = currentView === 'list'
                ? 'cosmetics-grid backgrounds-grid list-view'
                : 'cosmetics-grid backgrounds-grid';
            el.backgroundsGrid.innerHTML = filteredBackgrounds.map(createBackgroundCard).join('');
            attachHeatEmojiHandlers();
            highlightUserVotes();
        }
    }

    // ─── Card builder ───────────────────────────────────────────────────
    function imgUrl(bg, size) {
        const raw = size === 'full'
            ? (bg.image_url || bg.image_preview_url)
            : (bg.image_preview_url || bg.image_url);
        if (!raw) return '';
        return raw.startsWith('http') ? raw : `${BG_CDN}${raw}`;
    }

    function createBackgroundCard(bg) {
        const preview = imgUrl(bg, 'preview');
        const full    = imgUrl(bg, 'full');
        const slug    = bg.slug;
        const rarity  = bg.rarity || 'common';
        const legacy  = !bg.is_obtainable;
        const unavailableAttr  = bg.is_available === false ? ' data-unavailable' : '';
        const unavailableBadge = bg.is_available === false
            ? '<div class="cw-unavailable-badge">No Longer Available</div>' : '';
        const bgExpiry     = bg.available_until || null;
        const countdownBadge = bgExpiry
            ? `<div class="cw-countdown-badge" data-expiry="${bgExpiry}">\u23f1 &hellip;</div>` : '';
        const faction = bg.faction_name
            ? `<span class="bg-card-faction" data-faction="${esc(bg.faction_slug)}">${esc(bg.faction_name)}</span>`
            : '';
        const sourceLabel = SOURCE_LABELS[bg.source_type] || '';
        const sourceBadge = sourceLabel
            ? `<span class="bg-card-source bg-card-source--${esc(bg.source_type)}">${sourceLabel}</span>`
            : '';

        return `
            <a href="/backgrounds/${slug}/" class="bg-card" data-rarity="${rarity}"${unavailableAttr}>
                <div class="bg-card-image">
                    ${preview ? `
                        <img src="${preview}"
                             ${full !== preview ? `data-full="${full}"` : ''}
                             alt="${esc(bg.name)}"
                             width="267" height="400"
                             loading="lazy"
                             ${full !== preview ? 'onload="this.onload=null; if(this.dataset.full) this.src=this.dataset.full"' : ''}>
                    ` : `
                        <div class="bg-card-placeholder">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                            </svg>
                        </div>
                    `}
                    ${legacy ? '<span class="bg-card-legacy">Legacy</span>' : ''}
                    ${unavailableBadge}${countdownBadge}
                </div>
                <div class="bg-card-info">
                    <span class="bg-card-name">${esc(bg.name)}</span>
                    <div class="bg-card-badges">
                        ${sourceBadge}
                        ${faction}
                    </div>
                </div>
                <div class="cw-heat-strip" data-slug="${slug}">
                    <div class="cw-heat-fill"></div>
                    <div class="cw-heat-emojis">
                        <button class="cw-heat-emoji" data-rating="5" data-slug="${slug}" title="Fire">
                            <span class="cw-emoji-icon">🔥</span>
                            <span class="cw-emoji-count" data-rating-count="5">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="4" data-slug="${slug}" title="Love">
                            <span class="cw-emoji-icon">😍</span>
                            <span class="cw-emoji-count" data-rating-count="4">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="3" data-slug="${slug}" title="Meh">
                            <span class="cw-emoji-icon">😐</span>
                            <span class="cw-emoji-count" data-rating-count="3">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="2" data-slug="${slug}" title="Nah">
                            <span class="cw-emoji-icon">👎</span>
                            <span class="cw-emoji-count" data-rating-count="2">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="1" data-slug="${slug}" title="Trash">
                            <span class="cw-emoji-icon">💩</span>
                            <span class="cw-emoji-count" data-rating-count="1">—</span>
                        </button>
                    </div>
                </div>
            </a>`;
    }

    // ─── Stats ──────────────────────────────────────────────────────────
    function updateStats() {
        const total = allBackgrounds.length;
        if (el.totalCount) el.totalCount.textContent = total;
        if (el.allCount)   el.allCount.textContent   = total;
    }

    // ─── Reset ──────────────────────────────────────────────────────────
    function resetAllFilters() {
        currentFilters = { search: '', rarity: 'all', source: 'all', obtainable: false, unavailable: false };
        if (el.searchInput)    el.searchInput.value    = '';
        if (el.sourceFilter)   el.sourceFilter.value   = 'all';
        if (el.sortSelect)     el.sortSelect.value     = 'featured';
        if (el.obtainableToggle) el.obtainableToggle.checked = false;
        syncFilterPills();
        applyFilters();
    }

    // ─── Error state ────────────────────────────────────────────────────
    function showError() {
        if (!el.loadingState) return;
        el.loadingState.innerHTML = `
            <div class="error-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Failed to load backgrounds</h3>
                <p>Please try refreshing the page</p>
                <button class="btn-retry" onclick="location.reload()">Retry</button>
            </div>`;
    }

    // ─── Ratings (existing CosmeticRatingsAPI kept intact) ──────────────
    function formatVoteCount(n) {
        if (!n || n === 0) return '\u2014';
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(n);
    }

    function updateStripData(strip, slug) {
        const r = ratingsMap[slug];
        const fill = strip.querySelector('.cw-heat-fill');
        if (!r || r.score_percent == null) {
            if (fill) fill.style.width = '0%';
            return;
        }
        if (fill) fill.style.width = `${Math.round(r.score_percent)}%`;
        if (r.distribution) {
            for (let v = 1; v <= 5; v++) {
                const ce = strip.querySelector(`[data-rating-count="${v}"]`);
                if (ce) {
                    const d = r.distribution[v] || r.distribution[String(v)];
                    ce.textContent = formatVoteCount(d ? d.count : 0);
                }
            }
        }
    }

    async function loadHeatRatings() {
        if (typeof CosmeticRatingsAPI === 'undefined') return;
        try {
            const result = await CosmeticRatingsAPI.getListRatings('background', { limit: 500 });
            if (result.success && result.data) {
                result.data.forEach(r => { ratingsMap[r.slug] = r; });
                document.querySelectorAll('.cw-heat-strip').forEach(strip => {
                    updateStripData(strip, strip.dataset.slug);
                });
                highlightUserVotes();
            }
        } catch (err) {
            console.error('Failed to load heat ratings:', err);
        }
    }

    function highlightUserVotes() {
        const votes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
        Object.entries(votes).forEach(([slug, rating]) => {
            const strip = document.querySelector(`.cw-heat-strip[data-slug="${slug}"]`);
            if (!strip) return;
            strip.querySelectorAll('.cw-heat-emoji').forEach(btn => {
                if (parseInt(btn.dataset.rating) === rating) btn.classList.add('voted');
            });
        });
    }

    function attachHeatEmojiHandlers() {
        document.querySelectorAll('.cw-heat-emoji').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const slug   = btn.dataset.slug;
                const rating = parseInt(btn.dataset.rating);
                if (!slug || isNaN(rating) || rating < 1 || rating > 5) return;

                const strip = btn.closest('.cw-heat-strip');
                strip.querySelectorAll('.cw-heat-emoji').forEach(b => b.classList.remove('voted'));
                btn.classList.add('voted');

                // Persist vote locally
                const votes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
                votes[slug] = rating;
                localStorage.setItem('marathondb_emoji_votes', JSON.stringify(votes));

                // Submit to existing cosmetic ratings API (keeps system intact)
                if (typeof CosmeticRatingsAPI !== 'undefined') {
                    const result = await CosmeticRatingsAPI.submitRating(slug, rating, 'background');
                    if (result.success && result.data) {
                        ratingsMap[slug] = {
                            slug,
                            score_percent: result.data.score_percent,
                            total_votes:   result.data.total_votes,
                            distribution:  result.data.distribution
                        };
                        updateStripData(strip, slug);
                    }
                }
            });
        });
    }

    // ─── Countdown helpers ───────────────────────────────────────────────
    function formatCountdown(isoString) {
        if (!isoString) return null;
        const diff = new Date(isoString) - Date.now();
        if (diff <= 0) return null;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${s}s`;
    }

    // ─── Utilities ──────────────────────────────────────────────────────
    function debounce(fn, ms) {
        let t;
        return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    }

    function esc(s) {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ─── Boot ───────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
