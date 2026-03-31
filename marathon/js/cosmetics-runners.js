/**
 * Runner Skins Cosmetics Page
 * Powered by the dedicated Runner Skins API (runnerskins.marathondb.gg)
 */

(function() {
    'use strict';

    // ── API constants ──────────────────────────────────────────────────
    const SKINS_API          = 'https://runnerskins.marathondb.gg';
    const SKINS_API_FALLBACK = 'https://marathon-runner-skins-api.heymarathondb.workers.dev';

    // Distribution key → numeric rating mapping (new API uses named keys)
    const DIST_KEYS = ['fire', 'love', 'meh', 'nah', 'trash']; // index 0 = rating 5
    const RATING_TO_KEY = { 5: 'fire', 4: 'love', 3: 'meh', 2: 'nah', 1: 'trash' };

    // State
    let allShells = [];
    let filteredShells = [];
    let ratingsMap = {};
    let currentFilters = {
        search: '',
        runner: '',
        rarity: '',
        limited: false,
        source: '',
        hideDefaults: false,
        unavailable: false
    };

    // DOM Elements
    const elements = {
        // Header
        totalCount: document.getElementById('totalCount'),
        
        // Search & Sort
        searchInput: document.getElementById('searchInput'),
        sortSelect: document.getElementById('sortSelect'),
        
        // Filter tabs (original page)
        runnerTabs: document.getElementById('runnerTabs'),
        rarityPills: document.getElementById('rarityPills'),
        
        // Filter elements (SSG page)
        filterPills: document.getElementById('filterPills'),
        hideDefaultsCheck: document.getElementById('hideDefaultsCheck'),
        hideDefaultsToggle: document.getElementById('hideDefaultsToggle'),
        runnerFilter: document.getElementById('runnerFilter'),
        sourceFilter: document.getElementById('sourceFilter'),
        resultsCount: document.getElementById('resultsCount'),
        
        // Content areas
        loadingState: document.getElementById('loadingState'),
        shellsGrid: document.getElementById('shellsGrid'),
        emptyState: document.getElementById('emptyState'),
        resetFilters: document.getElementById('resetFilters')
    };

    // Rarity order for sorting — includes both legacy and Marathon scale
    const rarityOrder = {
        'common':    1,
        'uncommon':  2,
        'rare':      3,
        'standard':  4,
        'epic':      5,
        'enhanced':  6,
        'deluxe':    7,
        'legendary': 8,
        'superior':  9,
        'exotic':   10,
        'prestige': 11
    };

    /**
     * Initialize the page
     */
    async function init() {
        try {
            // Allow sub-pages to pre-set a runner filter via window variable
            if (window.RUNNER_SKINS_FILTER) {
                currentFilters.runner = window.RUNNER_SKINS_FILTER;
            }

            await loadShells();
            await populateRunnerTabs();
            setupEventListeners();

            // Sync runner dropdown with pre-set filter
            if (currentFilters.runner && elements.runnerFilter) {
                elements.runnerFilter.value = currentFilters.runner;
            }

            applyFilters();
            loadHeatRatings(); // synchronous — ratings were embedded in the list response

            // Enrich newest skins with release dates (list API omits them)
            enrichNewestSkins();

            // Tick countdown badges every second
            setInterval(() => {
                document.querySelectorAll('.cw-countdown-badge[data-expiry]').forEach(badge => {
                    const ms = new Date(badge.dataset.expiry) - Date.now();
                    badge.textContent = `⏱ ENDS ${formatCountdown(ms)}`;
                });
            }, 1000);
        } catch (error) {
            console.error('Failed to initialize runner shells page:', error);
            showError();
        }
    }

    /**
     * Fetch from SKINS_API with automatic fallback
     */
    async function skinsApiFetch(path) {
        try {
            const res = await fetch(`${SKINS_API}${path}`, { cache: 'no-store' });
            if (res.ok) return res;
        } catch (_) { /* primary failed – try fallback */ }
        return fetch(`${SKINS_API_FALLBACK}${path}`, { cache: 'no-store' });
    }

    /**
     * Load all runner skins from the dedicated Skins API.
     * Paginates automatically if there are more than 100 skins.
     */
    async function loadShells() {
        const PER_PAGE = 100;
        let page = 1;
        let totalPages = 1;
        const collected = [];

        do {
            const res    = await skinsApiFetch(`/api/skins?per_page=${PER_PAGE}&page=${page}`);
            const result = await res.json();

            if (!result.success || !Array.isArray(result.data)) {
                throw new Error('Failed to load runner skins');
            }

            collected.push(...result.data);
            totalPages = result.total_pages || 1;
            page++;
        } while (page <= totalPages);

        allShells = collected
            .map(normalizeShell)
            .filter(shell => shell.icon_path); // hide skins with no image yet

        // Seed ratingsMap from embedded rating data in the list response
        allShells.forEach(shell => {
            if (shell._rawRating) {
                ratingsMap[shell.slug] = normalizeRating(shell._rawRating);
            }
        });

        filteredShells = [...allShells];

        // Fetch available_until for limited skins (needed for countdown badges)
        const limitedShells = allShells.filter(s => s.isLimited);
        if (limitedShells.length > 0) {
            await Promise.allSettled(
                limitedShells.map(async (shell) => {
                    try {
                        const r = await skinsApiFetch(`/api/skins/${shell.slug}`);
                        if (!r.ok) return;
                        const d = await r.json();
                        if (d.success && d.data?.availability) {
                            shell.available_until = d.data.availability.available_until || null;
                        }
                    } catch (_) { /* non-fatal */ }
                })
            );
        }

        // Update count in header
        if (elements.totalCount) elements.totalCount.textContent = `(${allShells.length})`;
    }

    /**
     * Fetch detail for the newest skins (by highest ID) to get release dates.
     * Re-sorts and re-renders if any new skins are found within 7 days.
     */
    async function enrichNewestSkins() {
        const NEW_CHECK_COUNT = 5; // check the 5 most recently added skins
        const NEW_BADGE_MS = 7 * 24 * 60 * 60 * 1000;
        const candidates = [...allShells]
            .sort((a, b) => (b.id || 0) - (a.id || 0))
            .slice(0, NEW_CHECK_COUNT)
            .filter(s => !s.release_date); // only fetch if we don't already have it

        if (candidates.length === 0) return;

        let changed = false;
        await Promise.allSettled(candidates.map(async (shell) => {
            try {
                const r = await skinsApiFetch(`/api/skins/${shell.slug}`);
                if (!r.ok) return;
                const d = await r.json();
                if (d.success && d.data?.release?.date) {
                    shell.release_date = d.data.release.date;
                    // Also update in filteredShells
                    const fs = filteredShells.find(s => s.slug === shell.slug);
                    if (fs) fs.release_date = shell.release_date;
                    if ((Date.now() - new Date(shell.release_date).getTime()) <= NEW_BADGE_MS) {
                        changed = true;
                    }
                }
            } catch (_) { /* non-fatal */ }
        }));

        if (changed) {
            applyFilters();
            // Re-apply ratings to the freshly rendered DOM
            document.querySelectorAll('.cw-heat-strip').forEach(strip => {
                updateStripData(strip, strip.dataset.slug);
            });
            highlightUserVotes();
            markHotBadges();
        }
    }

    /**
     * Normalise a raw SkinListItem from the new Skins API into the shape
     * the rest of this module expects.
     */
    function normalizeShell(skin) {
        const image      = skin.image      || {};
        const runner     = skin.runner     || {};
        const collection = skin.collection || {};

        // Image paths from the API are relative R2 keys — prefix with CDN base
        const cdnBase      = 'https://runnerskins.marathondb.gg/';
        const rawCard      = image.card      || '';
        const rawThumb     = image.thumbnail || '';
        const cardUrl      = rawCard  ? (rawCard.startsWith('http')  ? rawCard  : cdnBase + rawCard)  : '';
        const thumbnailUrl = rawThumb ? (rawThumb.startsWith('http') ? rawThumb : cdnBase + rawThumb) : '';

        return {
            ...skin,
            name:            skin.display_name || skin.name,
            runnerSlug:      runner.slug  || '',
            runnerName:      runner.name || formatName(runner.slug || ''),
            rarity:          skin.rarity  || 'common',
            source:          skin.source  || '',
            isAvailable:     skin.is_available !== false,
            isLimited:       Boolean(skin.is_limited),
            collection_name: collection.name || '',
            collection_slug: collection.slug || '',
            // card used for grid cards, thumbnail as low-res placeholder
            icon_path:       cardUrl,
            icon_path_low:   thumbnailUrl || cardUrl,
            release_date:    skin.release?.date || null,
            available_until: skin.availability?.available_until || skin.available_until || null,
            // stash the raw rating for seeding ratingsMap
            _rawRating:      skin.rating || null,
        };
    }

    /**
     * Normalise a rating object from the new API.
     * Converts named distribution keys (fire/love/meh/nah/trash) into the
     * numeric-key shape the rest of the UI uses internally.
     */
    function normalizeRating(raw) {
        if (!raw) return null;
        const dist = raw.distribution || {};
        // Build a numeric-keyed copy so updateStripData can look up by 1-5
        const numericDist = {
            5: dist.fire  || { count: 0, percent: 0 },
            4: dist.love  || { count: 0, percent: 0 },
            3: dist.meh   || { count: 0, percent: 0 },
            2: dist.nah   || { count: 0, percent: 0 },
            1: dist.trash || { count: 0, percent: 0 },
        };
        return {
            score_percent: raw.score_percent ?? null,
            total_votes:   raw.total_votes   ?? 0,
            distribution:  numericDist,
        };
    }

    // ── Countdown helpers ─────────────────────────────────────────────
    const EXPIRES_HOUR_UTC = 18;

    function getShellExpiry(shell) {
        if (!shell.available_until || !shell.isAvailable) return null;
        const d = new Date(shell.available_until);
        d.setUTCHours(EXPIRES_HOUR_UTC, 0, 0, 0);
        return d;
    }

    function formatCountdown(ms) {
        if (ms <= 0) return 'Expired';
        const totalSecs = Math.floor(ms / 1000);
        const days  = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins  = Math.floor((totalSecs % 3600) / 60);
        const secs  = totalSecs % 60;
        if (days > 0)  return `${days}D ${hours}H`;
        if (hours > 0) return `${hours}H ${mins}M`;
        return `${mins}M ${secs}S`;
    }

    /**
     * Populate runner tabs from API
     */
    async function populateRunnerTabs() {
        if (!elements.runnerTabs) return;

        try {
            const runners = await MarathonAPI.getRunners();
            const list = Array.isArray(runners) ? runners : runners?.data;

            if (!Array.isArray(list)) return;

            list.forEach(runner => {
                if (!runner?.slug || !runner?.name) return;
                const btn = document.createElement('button');
                btn.className = 'category-tab-sm';
                btn.dataset.runner = runner.slug;
                btn.textContent = runner.name;
                elements.runnerTabs.appendChild(btn);
            });
        } catch (error) {
            console.error('Failed to load runners for tabs:', error);
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Search
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(() => {
                currentFilters.search = elements.searchInput.value.toLowerCase().trim();
                applyFilters();
            }, 300));
        }

        // Sort
        if (elements.sortSelect) {
            elements.sortSelect.addEventListener('change', applyFilters);
        }

        // Runner tabs (original page)
        if (elements.runnerTabs) {
            elements.runnerTabs.addEventListener('click', (e) => {
                const tab = e.target.closest('.category-tab-sm');
                if (!tab) return;
                
                // Update active state
                elements.runnerTabs.querySelectorAll('.category-tab-sm').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                currentFilters.runner = tab.dataset.runner || '';
                applyFilters();
            });
        }

        // Runner filter dropdown (SSG page)
        if (elements.runnerFilter) {
            elements.runnerFilter.addEventListener('change', () => {
                currentFilters.runner = elements.runnerFilter.value || '';
                applyFilters();
            });
        }

        // Rarity pills (original page)
        if (elements.rarityPills) {
            elements.rarityPills.addEventListener('click', (e) => {
                const pill = e.target.closest('.filter-pill-sm');
                if (!pill) return;
                
                // Update active state
                elements.rarityPills.querySelectorAll('.filter-pill-sm').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                
                currentFilters.rarity = pill.dataset.rarity || '';
                applyFilters();
            });
        }

        // Filter pills (SSG page)
        if (elements.filterPills) {
            elements.filterPills.addEventListener('click', (e) => {
                const pill = e.target.closest('.filter-pill-sm, .filter-pill');
                if (!pill) return;
                // Don't let the toggle pill trigger rarity filter logic
                if (pill.classList.contains('filter-pill-toggle')) return;

                // Update active state
                elements.filterPills.querySelectorAll('.filter-pill-sm, .filter-pill:not(.filter-pill-toggle)').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                const filter = pill.dataset.filter || '';
                const rarity = pill.dataset.rarity || '';
                if (filter === 'all') {
                    currentFilters.rarity = '';
                    currentFilters.limited = false;
                    currentFilters.unavailable = false;
                } else if (filter === 'vaulted') {
                    currentFilters.rarity = '';
                    currentFilters.limited = false;
                    currentFilters.unavailable = true;
                } else if (rarity) {
                    currentFilters.rarity = rarity;
                    currentFilters.limited = false;
                    currentFilters.unavailable = false;
                } else if (filter === 'limited') {
                    currentFilters.rarity = '';
                    currentFilters.limited = true;
                    currentFilters.unavailable = false;
                }
                applyFilters();
            });
        }

        // Hide defaults toggle
        if (elements.hideDefaultsCheck) {
            elements.hideDefaultsCheck.addEventListener('change', () => {
                currentFilters.hideDefaults = elements.hideDefaultsCheck.checked;
                elements.hideDefaultsToggle?.classList.toggle('active', currentFilters.hideDefaults);
                applyFilters();
            });
        }

        // Reset filters
        if (elements.resetFilters) {
            elements.resetFilters.addEventListener('click', resetAllFilters);
        }
    }

    /**
     * Apply all filters and render
     */
    function applyFilters() {
        filteredShells = allShells.filter(shell => {
            // Search filter
            if (currentFilters.search) {
                const searchTarget = `${shell.name} ${shell.runnerName} ${shell.description || ''} ${shell.collection_name || ''}`.toLowerCase();
                if (!searchTarget.includes(currentFilters.search)) {
                    return false;
                }
            }

            // Runner filter
            if (currentFilters.runner && shell.runnerSlug !== currentFilters.runner && shell.runnerName?.toLowerCase() !== currentFilters.runner) {
                return false;
            }

            // Rarity filter
            if (currentFilters.rarity && shell.rarity !== currentFilters.rarity) {
                return false;
            }

            // Limited filter
            if (currentFilters.limited && !shell.isLimited) {
                return false;
            }

            // Vaulted (unavailable) filter
            if (currentFilters.unavailable && shell.isAvailable) {
                return false;
            }

            // Hide defaults filter
            if (currentFilters.hideDefaults && (shell.source === 'default' || shell.slug?.endsWith('-default'))) {
                return false;
            }

            return true;
        });

        // Update results count
        if (elements.resultsCount) {
            elements.resultsCount.textContent = `${filteredShells.length} runner skin${filteredShells.length !== 1 ? 's' : ''} found`;
        }

        // Update header total to reflect filtered count
        if (elements.totalCount) {
            elements.totalCount.textContent = `(${filteredShells.length})`;
        }

        sortShells();
        renderShells();
    }

    /**
     * Sort shells based on current selection
     */
    function sortShells() {
        const sortValue = elements.sortSelect ? elements.sortSelect.value : 'most-fired';

        filteredShells.sort((a, b) => {
            switch (sortValue) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'rarity-desc':
                    return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                case 'rarity-asc':
                    return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
                case 'newest': {
                    const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
                    const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
                    if (dateB.getTime() !== dateA.getTime()) {
                        return dateB - dateA;
                    }
                    return (b.id || 0) - (a.id || 0);
                }
                case 'most-fired': {
                    // New skins (released within last 7 days) pinned to the top
                    const NEW_MS = 7 * 24 * 60 * 60 * 1000;
                    const now2 = Date.now();
                    const aIsNew = a.release_date && (now2 - new Date(a.release_date).getTime()) <= NEW_MS ? 1 : 0;
                    const bIsNew = b.release_date && (now2 - new Date(b.release_date).getTime()) <= NEW_MS ? 1 : 0;
                    if (bIsNew !== aIsNew) return bIsNew - aIsNew;
                    const fireOf = s => {
                        const d = ratingsMap[s.slug]?.distribution;
                        return d ? (d[5]?.count || d['5']?.count || 0) : 0;
                    };
                    const diff = fireOf(b) - fireOf(a);
                    if (diff !== 0) return diff;
                    return a.name.localeCompare(b.name);
                }
                case 'featured':
                default: {
                    // New skins (released within last 7 days) pinned to the top
                    const NEW_SKIN_MS = 7 * 24 * 60 * 60 * 1000;
                    const now = Date.now();
                    const aNew = a.release_date && (now - new Date(a.release_date).getTime()) <= NEW_SKIN_MS ? 1 : 0;
                    const bNew = b.release_date && (now - new Date(b.release_date).getTime()) <= NEW_SKIN_MS ? 1 : 0;
                    if (bNew !== aNew) return bNew - aNew;
                    // Then by rarity (highest first), then name
                    const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                    if (rarityDiff !== 0) return rarityDiff;
                    return a.name.localeCompare(b.name);
                }
            }
        });
    }

    /**
     * Render shells to the grid
     */
    function renderShells() {
        if (elements.loadingState) elements.loadingState.style.display = 'none';

        if (filteredShells.length === 0) {
            if (elements.shellsGrid) elements.shellsGrid.style.display = 'none';
            if (elements.emptyState) elements.emptyState.style.display = 'flex';
            return;
        }

        if (elements.shellsGrid) {
            elements.shellsGrid.style.display = '';
            elements.shellsGrid.innerHTML = filteredShells.map(shell => createShellCard(shell)).join('');
        }
        if (elements.emptyState) elements.emptyState.style.display = 'none';

        // Attach emoji vote handlers + re-highlight
        attachHeatEmojiHandlers();
        highlightUserVotes();

        // Restore hot badges if ratings are already loaded
        if (Object.keys(ratingsMap).length > 0) {
            markHotBadges();
        }
    }

    /**
     * Get the detail page URL for a runner skin
     * Uses clean URLs when SSG pages are available
     */
    function getRunnerSkinDetailUrl(slug) {
        return `/runner-skins/${slug}/`;
    }

    /**
     * Create shell card HTML - Matching weapon skins card design
     */
    function createShellCard(shell) {
        // Images from the new API are always full absolute WebP URLs
        const imageUrl  = shell.icon_path     || '';
        const lowResUrl = shell.icon_path_low || imageUrl;
        const rarityLabel = (shell.rarity || 'common').charAt(0).toUpperCase() + (shell.rarity || 'common').slice(1);

        const isUnavailable = !shell.isAvailable;
        const unavailableBadge = isUnavailable
            ? `<div class="cw-unavailable-badge">No Longer Available</div>` : '';

        const expiryDate = getShellExpiry(shell);
        const countdownBadge = expiryDate
            ? `<div class="cw-countdown-badge" data-expiry="${expiryDate.toISOString()}">&#9203; ENDS ${formatCountdown(expiryDate - Date.now())}</div>`
            : '';

        // "NEW" badge for skins released within the last 7 days
        const NEW_BADGE_MS = 7 * 24 * 60 * 60 * 1000;
        const isNew = shell.release_date && (Date.now() - new Date(shell.release_date).getTime()) <= NEW_BADGE_MS;
        const newBadge = isNew ? `<span class="cw-new-badge">✦ NEW</span>` : '';

        return `
            <a href="${getRunnerSkinDetailUrl(shell.slug)}" class="cw-skin-card sticker-card-simple" data-rarity="${shell.rarity}" data-slug="${shell.slug}"${isUnavailable ? ' data-unavailable' : ''}>
                <span class="cw-hot-badge">🔥 Hot</span>
                ${newBadge}
                <div class="cw-skin-image">
                    ${imageUrl ? `
                        <img src="${lowResUrl}"
                             ${lowResUrl !== imageUrl ? `data-full="${imageUrl}"` : ''}
                             alt="${escapeHtml(shell.name)}"
                             loading="lazy"
                             ${lowResUrl !== imageUrl ? 'onload="this.onload=null; this.src=this.dataset.full"' : ''}
                             style="object-fit: cover; object-position: top; width: 100%; height: 100%;">
                    ` : `
                        <div class="cw-skin-placeholder">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
                            </svg>
                        </div>
                    `}
                    ${unavailableBadge}
                    ${countdownBadge}
                </div>
                <div class="cw-skin-info">
                    <span class="sticker-name-pill">${escapeHtml(shell.name)}</span>
                    <span class="cw-skin-weapon-sub">${escapeHtml(shell.runnerName)}</span>
                </div>
                <div class="cw-heat-strip" data-slug="${shell.slug}">
                    <div class="cw-heat-fill"></div>
                    <div class="cw-heat-emojis">
                        <button class="cw-heat-emoji" data-rating="5" data-slug="${shell.slug}" title="Fire">
                            <span class="cw-emoji-icon">🔥</span>
                            <span class="cw-emoji-count" data-rating-count="5">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="4" data-slug="${shell.slug}" title="Love">
                            <span class="cw-emoji-icon">😍</span>
                            <span class="cw-emoji-count" data-rating-count="4">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="3" data-slug="${shell.slug}" title="Meh">
                            <span class="cw-emoji-icon">😐</span>
                            <span class="cw-emoji-count" data-rating-count="3">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="2" data-slug="${shell.slug}" title="Nah">
                            <span class="cw-emoji-icon">👎</span>
                            <span class="cw-emoji-count" data-rating-count="2">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="1" data-slug="${shell.slug}" title="Trash">
                            <span class="cw-emoji-icon">💩</span>
                            <span class="cw-emoji-count" data-rating-count="1">—</span>
                        </button>
                    </div>
                </div>
            </a>
        `;
    }

    /**
     * Format source string for display
     */
    function formatSource(source) {
        if (!source) return 'Unknown';
        const map = {
            'pre_order': 'Pre-Order',
            'preorder': 'Pre-Order',
            'deluxe_edition': 'Deluxe Edition',
            'battle_pass': 'Battle Pass',
            'store': 'Store',
            'event': 'Event',
            'twitch_drop': 'Twitch Drop'
        };
        return map[source.toLowerCase()] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format vote count for compact display
     */
    function formatVoteCount(n) {
        if (!n || n === 0) return '\u2014';
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(n);
    }

    /**
     * Update emoji strip data from ratingsMap
     */
    function updateStripData(strip, slug) {
        const rating = ratingsMap[slug];
        const fill = strip.querySelector('.cw-heat-fill');

        if (!rating || rating.score_percent === null || rating.score_percent === undefined) {
            if (fill) fill.style.width = '0%';
            return;
        }

        if (fill) fill.style.width = `${Math.round(rating.score_percent)}%`;

        if (rating.distribution) {
            for (let v = 1; v <= 5; v++) {
                const countEl = strip.querySelector(`[data-rating-count="${v}"]`);
                if (countEl) {
                    const d = rating.distribution[v] || rating.distribution[String(v)];
                    countEl.textContent = formatVoteCount(d ? d.count : 0);
                }
            }
        }
    }

    /**
     * Apply ratings that were already embedded in the list response.
     * The new Skins API returns rating data per-skin in GET /api/skins,
     * so by the time this runs ratingsMap is already populated.
     */
    function loadHeatRatings() {
        // ratingsMap was seeded inside loadShells() from the embedded rating field.
        // Nothing extra to fetch — just trigger sort/render + badge pass.
        if (Object.keys(ratingsMap).length === 0) return;

        // Re-sort if most-fired is active (depends on fire counts)
        if (elements.sortSelect && elements.sortSelect.value === 'most-fired') {
            sortShells();
            renderShells();
        }

        // Update every visible strip that may have rendered before ratings were ready
        document.querySelectorAll('.cw-heat-strip').forEach(strip => {
            updateStripData(strip, strip.dataset.slug);
        });
        highlightUserVotes();
        markHotBadges();
    }

    /**
     * Mark the top fire-count skin(s) in the current view with a hot badge
     */
    function markHotBadges() {
        // Find the highest fire count among currently displayed skins
        let maxFire = 0;
        filteredShells.forEach(shell => {
            const d = ratingsMap[shell.slug]?.distribution;
            const count = d ? (d[5]?.count || d['5']?.count || 0) : 0;
            if (count > maxFire) maxFire = count;
        });

        if (maxFire === 0) return;

        // Show badge on any card tied for top fire count
        filteredShells.forEach(shell => {
            const d = ratingsMap[shell.slug]?.distribution;
            const count = d ? (d[5]?.count || d['5']?.count || 0) : 0;
            if (count === maxFire) {
                const card = document.querySelector(`.cw-skin-card[data-slug="${shell.slug}"]`);
                const badge = card?.querySelector('.cw-hot-badge');
                if (badge) badge.classList.add('visible');
            }
        });
    }

    /**
     * Highlight user's previous votes from localStorage
     */
    function highlightUserVotes() {
        const votes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
        Object.entries(votes).forEach(([slug, rating]) => {
            const strip = document.querySelector(`.cw-heat-strip[data-slug="${slug}"]`);
            if (!strip) return;
            strip.querySelectorAll('.cw-heat-emoji').forEach(btn => {
                if (parseInt(btn.dataset.rating) === rating) {
                    btn.classList.add('voted');
                }
            });
        });
    }

    /**
     * Generate (or retrieve) a stable per-device SHA-256 token for anonymous voting.
     */
    async function getDeviceToken() {
        let id = localStorage.getItem('mdb_device_id');
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36) + Date.now().toString(36));
            localStorage.setItem('mdb_device_id', id);
        }
        try {
            const data = new TextEncoder().encode(id + navigator.userAgent);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (_) {
            // Fallback: just use the raw id if Web Crypto unavailable
            return id;
        }
    }

    /**
     * Attach click handlers for emoji voting.
     * Uses POST /api/skins/:slug/rate on the dedicated Skins API.
     */
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

                const votes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
                votes[slug] = rating;
                localStorage.setItem('marathondb_emoji_votes', JSON.stringify(votes));

                try {
                    const token  = await getDeviceToken();
                    // POST is not a GET so call fetch directly with fallback
                    const postRes = await fetch(`${SKINS_API}/api/skins/${slug}/rate`, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ rating, device_token: token }),
                    }).catch(() => fetch(`${SKINS_API_FALLBACK}/api/skins/${slug}/rate`, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ rating, device_token: token }),
                    }));

                    if (postRes.ok) {
                        const body = await postRes.json();
                        if (body.success && body.aggregate) {
                            ratingsMap[slug] = normalizeRating(body.aggregate);
                            updateStripData(strip, slug);
                        }
                    }
                } catch (err) {
                    console.warn('Rating submission failed:', err);
                }
            });
        });
    }

    /**
     * Reset all filters
     */
    function resetAllFilters() {
        currentFilters = {
            search: '',
            runner: '',
            rarity: '',
            limited: false,
            source: '',
            hideDefaults: false,
            unavailable: false
        };

        elements.searchInput.value = '';
        elements.sortSelect.value = 'featured';

        // Reset runner tabs
        elements.runnerTabs.querySelectorAll('.category-tab-sm').forEach((t, i) => {
            t.classList.toggle('active', i === 0);
        });

        // Reset rarity pills
        elements.rarityPills.querySelectorAll('.filter-pill-sm').forEach((p, i) => {
            p.classList.toggle('active', i === 0);
        });

        applyFilters();
    }

    /**
     * Show error state
     */
    function showError() {
        elements.loadingState.innerHTML = `
            <div class="error-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Failed to load runner shells</h3>
                <p>Please try refreshing the page</p>
                <button class="btn-retry" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    /**
     * Utility: Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Utility: Capitalize first letter
     */
    function capitalizeFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    /**
     * Utility: Format slug to display name
     */
    function formatName(slug) {
        if (!slug) return 'Unknown';
        return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
