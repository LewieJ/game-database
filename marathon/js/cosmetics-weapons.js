/**
 * Weapon Skins Page - cosmetics-weapons.js
 * Interactive filtering, search, and display of weapon cosmetics
 */

// State
let allSkins = [];
let filteredSkins = [];
let currentView = 'grid';
let ratingsMap = {};
let currentFilters = {
    rarity: '',
    weapon: '',
    unavailable: false,
    search: ''
};

// API Base
const API_BASE = 'https://weaponskins.marathondb.gg';

/** Query param for deep links / share URLs (listing or per-weapon page). */
const SKIN_URL_PARAM = 'skin';

// Slug → page-path mapping overrides (if any skin's page path differs from its API slug)
// All SSG-generated pages now use the API slug directly
const SKIN_PAGE_SLUGS = {};

// DOM Elements
const elements = {
    loadingState: null,
    resultsSection: null,
    skinsGrid: null,
    emptyState: null,
    searchInput: null,
    totalCount: null,
    resultsCount: null,
    skinModal: null,
    modalContent: null
};

/**
 * Initialize the page
 */
async function init() {
    cacheElements();
    setupEventListeners();
    await loadWeaponSkins();
    loadHeatRatings();

    const skinFromUrl = getSkinQueryParam();
    if (skinFromUrl) openSkinModal(skinFromUrl, true);
}

function getSkinQueryParam() {
    return new URLSearchParams(window.location.search).get(SKIN_URL_PARAM);
}

/** Shareable URL for the current path + ?skin=slug (preserves per-weapon listing paths). */
function buildSkinShareUrl(slug) {
    const pageSlug = SKIN_PAGE_SLUGS[slug] || slug;
    const u = new URL(window.location.href);
    u.searchParams.set(SKIN_URL_PARAM, pageSlug);
    return u.toString();
}

/**
 * Cache DOM elements
 */
function cacheElements() {
    elements.loadingState = document.getElementById('loadingState');
    elements.resultsSection = document.getElementById('resultsSection');
    elements.skinsGrid = document.getElementById('skinsGrid');
    elements.emptyState = document.getElementById('emptyState');
    elements.searchInput = document.getElementById('searchInput');
    elements.totalCount = document.getElementById('totalCount');
    elements.resultsCount = document.getElementById('resultsCount');
    elements.skinModal = document.getElementById('skinModal');
    elements.modalContent = document.getElementById('modalContent');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Rarity toggle pills
    document.querySelectorAll('.filter-pill, .filter-pill-sm').forEach(pill => {
        pill.addEventListener('click', () => handlePillClick(pill));
    });

    // Weapon dropdown — navigates to per-weapon page on the main listing;
    // on per-weapon pages the baked options already have full URL paths as values.
    document.getElementById('weaponFilter')?.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) {
            window.location.href = '/marathon/weapon-skins/';
        } else if (val.startsWith('/')) {
            let href = val;
            if (href.startsWith('/marathon/')) href = href.replace(/^\/\/marathon\//, '/marathon/');
            if (href.startsWith('/weapon-skins/')) href = '/marathon' + href;
            window.location.href = href;
        } else {
            window.location.href = `/marathon/weapon-skins/${val}/`;
        }
    });

    attachSkinCardModalDelegation();

    // Clear / reset filters
    document.getElementById('clearFilters')?.addEventListener('click', resetFilters);
    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener(
            'input',
            debounce(() => {
                currentFilters.search = searchInput.value;
                applyFilters();
            }, 200)
        );
    }

    // Modal close
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    elements.skinModal?.addEventListener('click', (e) => {
        if (e.target === elements.skinModal) closeModal();
    });

    // Escape: lightbox first, then modal
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (_imageLightboxEl) {
            closeImageLightbox();
            return;
        }
        closeModal();
    });

    window.addEventListener('popstate', (e) => {
        const slugFromParam = getSkinQueryParam();
        if (e.state && e.state.skinSlug) {
            openSkinModal(e.state.skinSlug, true);
        } else if (slugFromParam) {
            openSkinModal(slugFromParam, true);
        } else {
            closeModal(true);
        }
    });
}

/**
 * Prefetch: inline #weapon-skins-prefetch JSON, window.__WEAPON_SKINS_PREFETCH__, or /marathon/weapon-skins/prefetch.json
 */
function getPrefetchedSkinsFromDom() {
    const el = document.getElementById('weapon-skins-prefetch');
    if (el?.textContent?.trim()) {
        try {
            const data = JSON.parse(el.textContent);
            if (Array.isArray(data) && data.length > 0) return data;
        } catch (err) {
            console.warn('weapon-skins-prefetch: invalid JSON', err);
        }
    }
    if (Array.isArray(window.__WEAPON_SKINS_PREFETCH__) && window.__WEAPON_SKINS_PREFETCH__.length > 0) {
        return window.__WEAPON_SKINS_PREFETCH__;
    }
    return null;
}

async function tryFetchPrefetchJson() {
    try {
        const res = await fetch('/marathon/weapon-skins/prefetch.json', { cache: 'force-cache' });
        if (!res.ok) return null;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
    } catch (_) { /* optional file */ }
    return null;
}

function attachSkinCardModalDelegation() {
    const grid = document.getElementById('skinsGrid');
    if (!grid || grid.dataset.modalDelegation === '1') return;
    grid.dataset.modalDelegation = '1';

    grid.addEventListener('click', (e) => {
        if (e.target.closest('.cw-heat-emoji')) return;
        const card = e.target.closest('.cw-skin-card');
        if (!card?.dataset.slug) return;
        if (e.metaKey || e.ctrlKey || e.button === 1) {
            const slug = SKIN_PAGE_SLUGS[card.dataset.slug] || card.dataset.slug;
            window.open(buildSkinShareUrl(slug), '_blank', 'noopener,noreferrer');
            return;
        }
        e.preventDefault();
        openSkinModal(card.dataset.slug);
    });

    grid.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest('.cw-heat-emoji')) return;
        const card = e.target.closest('.cw-skin-card');
        if (!card?.dataset.slug) return;
        e.preventDefault();
        openSkinModal(card.dataset.slug);
    });
}

/**
 * Load weapon skins from new API (paginated)
 */
async function loadWeaponSkins() {
    try {
        let collected = getPrefetchedSkinsFromDom();
        if (!collected) {
            collected = await tryFetchPrefetchJson();
        }
        if (!collected) {
            let page = 1;
            let totalPages = 1;
            collected = [];
            do {
                const res = await fetch(`${API_BASE}/api/skins?page=${page}&per_page=100`);
                if (!res.ok) throw new Error(`API error ${res.status}`);
                const body = await res.json();
                if (!body.success) throw new Error('API returned success=false');
                collected = collected.concat(body.data || []);
                totalPages = body.total_pages || 1;
                page++;
            } while (page <= totalPages);
        }

        allSkins = collected.map(s => s);
        filteredSkins = [...allSkins];

        // Seed ratings map from inline data
        allSkins.forEach(skin => {
            if (skin.rating) ratingsMap[skin.slug] = skin.rating;
        });

        // List API doesn't include available_until — fetch individual endpoints
        // in parallel for any skin flagged as limited so we get the expiry date.
        const limitedSkins = allSkins.filter(s => s.is_limited);
        if (limitedSkins.length > 0) {
            await Promise.allSettled(
                limitedSkins.map(async (skin) => {
                    try {
                        const r = await fetch(`${API_BASE}/api/skins/${skin.slug}`);
                        if (!r.ok) return;
                        const d = await r.json();
                        if (d.success && d.data?.availability) {
                            skin.available_until = d.data.availability.available_until || null;
                        }
                    } catch (_) { /* non-fatal */ }
                })
            );
        }

        updateStats();
        populateFilters();

        // Per-weapon page: pre-apply the weapon filter and select correct option
        if (window.WEAPON_SKINS_FILTER) {
            currentFilters.weapon = window.WEAPON_SKINS_FILTER;
            const wf = document.getElementById('weaponFilter');
            if (wf) wf.value = window.WEAPON_SKINS_FILTER;
        }

        applyFilters();
        addSkinsStructuredData();

        elements.loadingState.style.display = 'none';
        elements.resultsSection.style.display = 'block';

        attachSkinCardModalDelegation();

        // Highlight any saved votes
        highlightUserVotes();
    } catch (error) {
        console.error('Failed to load weapon skins:', error);
        elements.loadingState.innerHTML = `
            <div class="error-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                </svg>
                <h3>Failed to Load</h3>
                <p>Unable to fetch weapon skins. Please try again later.</p>
                <button class="btn-retry" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Update header stats
 */
function updateStats() {
    const total = allSkins.length;
    if (elements.totalCount) {
        elements.totalCount.textContent = total;
    }
}

/**
 * Add ItemList structured data for SEO
 */
function addSkinsStructuredData() {
    if (!allSkins || allSkins.length === 0) return;
    
    // Create ItemList schema with skins (limit to first 50 for performance)
    const listBase =
        typeof window !== 'undefined'
            ? `${window.location.origin}/marathon/weapon-skins/?skin=`
            : 'https://marathondb.gg/marathon/weapon-skins/?skin=';
    const itemListData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Marathon Weapon Skins",
        "description": "Complete list of all weapon skins and gun cosmetics in Bungie's Marathon",
        "numberOfItems": allSkins.length,
        "itemListElement": allSkins.slice(0, 50).map((skin, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": skin.name,
            "url": `${listBase}${encodeURIComponent(skin.slug)}`,
            "item": {
                "@type": "Product",
                "name": `${skin.name} - Marathon Weapon Skin`,
                "category": skin.rarity || "Weapon Skin",
                "description": skin.description || `${skin.name} weapon skin for ${skin.weapon?.name || 'Marathon weapons'}`
            }
        }))
    };
    
    // Inject or update the script tag
    let script = document.getElementById('skins-list-data');
    if (!script) {
        script = document.createElement('script');
        script.id = 'skins-list-data';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(itemListData);
}

/**
 * Populate filter dropdowns with data from API
 */
function populateFilters() {
    // Weapons dropdown
    const weaponMap = {};
    allSkins.forEach(s => {
        if (s.weapon?.slug) weaponMap[s.weapon.slug] = s.weapon.name || s.weapon.slug;
    });
    const weaponFilter = document.getElementById('weaponFilter');
    if (weaponFilter) {
        weaponFilter.querySelectorAll('option:not([value=""])').forEach(o => o.remove());
        Object.entries(weaponMap).sort((a, b) => a[1].localeCompare(b[1])).forEach(([slug, name]) => {
            const option = document.createElement('option');
            option.value = slug;
            option.textContent = name;
            weaponFilter.appendChild(option);
        });
    }
}

/**
 * Handle filter pill click
 */
function handlePillClick(pill) {
    const filter = pill.dataset.filter;
    const rarity = pill.dataset.rarity;
    const pills = document.querySelectorAll('.filter-pill, .filter-pill-sm');

    if (filter === 'all') {
        currentFilters.rarity = '';
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
    } else if (filter === 'vaulted') {
        const isActive = pill.classList.contains('active');
        pills.forEach(p => p.classList.remove('active'));
        if (!isActive) {
            pill.classList.add('active');
            currentFilters.unavailable = true;
            currentFilters.rarity = '';
        } else {
            currentFilters.unavailable = false;
            document.querySelector('[data-filter="all"]')?.classList.add('active');
        }
    } else if (rarity) {
        const isActive = pill.classList.contains('active');
        pills.forEach(p => p.classList.remove('active'));
        if (!isActive) {
            pill.classList.add('active');
            currentFilters.rarity = rarity;
            currentFilters.unavailable = false;
        } else {
            currentFilters.rarity = '';
            document.querySelector('[data-filter="all"]')?.classList.add('active');
        }
    }

    applyFilters();
}

/**
 * Apply all filters and sort
 */
function applyFilters() {
    const q = (currentFilters.search || '').trim().toLowerCase();

    filteredSkins = allSkins.filter(skin => {
        // Rarity filter
        if (currentFilters.rarity && skin.rarity !== currentFilters.rarity) return false;

        // Vaulted filter — show only unavailable skins
        if (currentFilters.unavailable && skin.is_available !== false) return false;

        // Weapon filter
        if (currentFilters.weapon && skin.weapon?.slug !== currentFilters.weapon) return false;

        if (q) {
            const name = (skin.name || '').toLowerCase();
            const wname = (skin.weapon?.name || '').toLowerCase();
            if (!name.includes(q) && !wname.includes(q)) return false;
        }

        return true;
    });

    sortSkins();
    renderSkins();
}

// Skins expire at 18:00 UTC (6 PM GMT) on their available_until date
const EXPIRES_HOUR_UTC = 18;

/**
 * Returns the expiry Date (at 18:00 UTC) for a skin with available_until, or null.
 */
function getSkinExpiry(skin) {
    // available_until is merged from individual endpoint after list fetch
    if (!skin.available_until || skin.is_available === false) return null;
    const d = new Date(skin.available_until);
    d.setUTCHours(EXPIRES_HOUR_UTC, 0, 0, 0);
    return d;
}

/**
 * Format remaining milliseconds into a short countdown string.
 * e.g. "3d 14h" or "5h 22m" or "4m 30s"
 */
function formatCountdown(ms) {
    if (ms <= 0) return 'Expired';
    const totalSecs = Math.floor(ms / 1000);
    const days  = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins  = Math.floor((totalSecs % 3600) / 60);
    const secs  = totalSecs % 60;
    if (days > 0)  return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${secs}s`;
}

// Reference to the live countdown interval so we can restart on re-render
let _countdownInterval = null;
let _imageLightboxEl = null;

/**
 * Start (or restart) the live countdown ticker.
 * Finds all .cw-countdown-value elements and updates them every second.
 */
function startCountdownTicker() {
    if (_countdownInterval) clearInterval(_countdownInterval);

    function tick() {
        const now = Date.now();
        document.querySelectorAll('.cw-countdown-value[data-expires-at]').forEach(el => {
            const expiresAt = parseInt(el.dataset.expiresAt, 10);
            const remaining = expiresAt - now;
            el.textContent = formatCountdown(remaining);
            const badge = el.closest('.cw-countdown-badge');
            if (badge) {
                // Highlight urgently when under 24 hours
                badge.classList.toggle('cw-countdown-badge--urgent', remaining > 0 && remaining < 86400000);
            }
        });
    }

    tick();
    _countdownInterval = setInterval(tick, 1000);
}

function mergedSkinRating(skin) {
    return ratingsMap[skin.slug] || skin.rating || null;
}

/** Count of 🔥 (value 5) votes from API distribution. */
function getFireVoteCount(skin) {
    const r = mergedSkinRating(skin);
    const d = r?.distribution;
    if (!d) return 0;
    const fire = d.fire;
    if (fire == null) return 0;
    if (typeof fire === 'number') return fire;
    return fire.count ?? 0;
}

/**
 * Sort skins: expiring soonest first → regular available → unavailable last.
 * Within each group: most 🔥 votes, then higher score_percent.
 */
function sortSkins() {
    const now = Date.now();

    filteredSkins.sort((a, b) => {
        const aUnavail = a.is_available === false;
        const bUnavail = b.is_available === false;
        const aExpiry  = getSkinExpiry(a)?.getTime() ?? null;
        const bExpiry  = getSkinExpiry(b)?.getTime() ?? null;
        const aExpiring = aExpiry !== null && aExpiry > now;
        const bExpiring = bExpiry !== null && bExpiry > now;

        // Unavailable skins always last
        if (aUnavail !== bUnavail) return aUnavail ? 1 : -1;
        if (aUnavail && bUnavail)  return 0;

        // Expiring skins float to top, sorted soonest-to-expire first
        if (aExpiring !== bExpiring) return aExpiring ? -1 : 1;
        if (aExpiring && bExpiring)  return aExpiry - bExpiry;

        const fireDiff = getFireVoteCount(b) - getFireVoteCount(a);
        if (fireDiff !== 0) return fireDiff;

        const score = (s) => mergedSkinRating(s)?.score_percent ?? -1;
        return score(b) - score(a);
    });
}

/**
 * Update active filters display (simplified - no longer showing active filter tags)
 */
function updateActiveFilters() {
    // Active filter tags removed in compact design
    // Filters are now visually indicated by pill/dropdown states
}

/**
 * Reset all filters
 */
function resetFilters() {
    currentFilters = { rarity: '', weapon: '', unavailable: false, search: '' };

    const weaponFilter = document.getElementById('weaponFilter');
    if (weaponFilter) weaponFilter.value = '';
    if (elements.searchInput) elements.searchInput.value = '';

    document.querySelectorAll('.filter-pill, .filter-pill-sm').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-filter="all"]')?.classList.add('active');

    applyFilters();
}

/**
 * Render skins grid/list
 */
function renderSkins() {
    if (elements.resultsCount) elements.resultsCount.textContent = `${filteredSkins.length} skin${filteredSkins.length !== 1 ? 's' : ''} found`;
    // Keep the header count in sync on per-weapon pages
    if (window.WEAPON_SKINS_FILTER && elements.totalCount) elements.totalCount.textContent = filteredSkins.length;

    if (filteredSkins.length === 0) {
        elements.skinsGrid.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }

    elements.skinsGrid.style.display = '';
    elements.emptyState.style.display = 'none';

    if (currentView === 'list') {
        elements.skinsGrid.classList.add('list-view');
    } else {
        elements.skinsGrid.classList.remove('list-view');
    }

    const cards = filteredSkins.map(skin => renderSkinCard(skin));
    const midpoint = Math.ceil(cards.length / 2);
    const midAdHtml = `<div class="cw-grid-ad">
    </div>`;
    if (cards.length >= 8) {
        cards.splice(midpoint, 0, midAdHtml);
    }
    elements.skinsGrid.innerHTML = cards.join('');

    // Push mid-grid ad
    try { const midAd = elements.skinsGrid.querySelector('.cw-grid-ad ins.adsbygoogle'); if (midAd && !midAd.dataset.adsbygoogleStatus) { (adsbygoogle = window.adsbygoogle || []).push({}); } } catch(e) {}

    // Attach emoji vote handlers
    attachHeatEmojiHandlers();

    // Start live countdown ticker for expiring skins
    startCountdownTicker();
}

/**
 * Render a skin card
 */
function renderSkinCard(skin) {
    const resolveUrl = (path) => {
        if (!path) return '';
        return path.startsWith('http') ? path : `${API_BASE}/${path.replace(/^\//, '')}`;
    };
    // Grid: prefer thumbnail (smaller), then card — per API image guide
    const rawImageUrl = skin.image?.thumbnail || skin.image?.card || '';
    const imageUrl = resolveUrl(rawImageUrl) || `${API_BASE}/assets/weapon-skins/${skin.slug}/thumbnail.webp`;

    const weaponName = escapeHtml(skin.weapon?.name || 'Unknown');
    const collectionBadge = skin.collection?.name
        ? `<span class="cw-collection-badge">${escapeHtml(skin.collection.name)}</span>`
        : '';
    const factionBadge = skin.faction?.slug
        ? `<span class="cw-faction-badge" data-faction="${skin.faction.slug}">${escapeHtml(skin.faction.name || skin.faction.slug)}</span>`
        : '';

    // ── Availability ──────────────────────────────────────────────
    const isUnavailable = skin.is_available === false;
    const expiryDate    = getSkinExpiry(skin);
    const expiryMs      = expiryDate ? expiryDate.getTime() : null;
    const isExpiring    = expiryMs !== null && expiryMs > Date.now();

    const unavailableBadge = isUnavailable
        ? `<div class="cw-unavailable-badge">No Longer Available</div>`
        : '';

    const countdownBadge = isExpiring
        ? `<div class="cw-countdown-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Ends&nbsp;<span class="cw-countdown-value" data-expires-at="${expiryMs}">${formatCountdown(expiryMs - Date.now())}</span></span>
           </div>`
        : '';

    // Pre-fill heat bar if rating came with the skin
    const scorePercent = skin.rating?.score_percent ?? null;
    const heatFillStyle = scorePercent !== null ? `style="width:${Math.round(scorePercent)}%"` : '';

    const savedVote = localStorage.getItem(`mdb_ws_vote_${skin.slug}`);

    const emojiData = [
        { val: 5, icon: '🔥', label: 'fire',  title: 'Fire' },
        { val: 4, icon: '😍', label: 'love',  title: 'Love' },
        { val: 3, icon: '😐', label: 'meh',   title: 'Meh' },
        { val: 2, icon: '👎', label: 'nah',   title: 'Nah' },
        { val: 1, icon: '💩', label: 'trash', title: 'Trash' }
    ];

    const emojiBtns = emojiData.map(e => {
        const dist = skin.rating?.distribution;
        const count = dist ? (dist[e.label]?.count ?? dist[e.val] ?? 0) : 0;
        const isVoted = savedVote === String(e.val) ? ' voted' : '';
        return `<button class="cw-heat-emoji${isVoted}" data-val="${e.val}" data-slug="${skin.slug}" title="${e.title}">
                        <span class="cw-emoji-icon">${e.icon}</span>
                        <span class="cw-emoji-count" data-rating-count="${e.val}">${formatVoteCount(count)}</span>
                    </button>`;
    }).join('');

    return `
        <div tabindex="0" role="button" aria-label="View details for ${escapeHtml(skin.name)}"
             class="cw-skin-card sticker-card-simple" data-rarity="${skin.rarity || ''}" data-slug="${skin.slug}"${isUnavailable ? ' data-unavailable' : ''}>
            <div class="cw-skin-image">
                ${imageUrl ? `
                    <img src="${imageUrl}" alt="${escapeHtml(skin.name)}" loading="lazy">
                ` : `
                    <div class="cw-skin-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                        </svg>
                    </div>
                `}
                ${unavailableBadge}
                ${countdownBadge}
            </div>
            <div class="cw-skin-info">
                <span class="sticker-name-pill">${escapeHtml(skin.name)}</span>
                <span class="cw-skin-weapon">${weaponName}</span>
            </div>
            <div class="cw-heat-strip" data-slug="${skin.slug}">
                <div class="cw-heat-fill" ${heatFillStyle}></div>
                <div class="cw-heat-emojis">
                    ${emojiBtns}
                </div>
            </div>
        </div>
    `;
}

/**
 * Open skin detail modal
 */
function closeImageLightbox() {
    if (!_imageLightboxEl) return;
    _imageLightboxEl.classList.remove('ws-image-lightbox--open');
    const el = _imageLightboxEl;
    _imageLightboxEl = null;
    setTimeout(() => el.remove(), 200);
}

function attrSafeUrl(u) {
    if (!u) return '';
    return String(u).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function openImageLightbox(src, alt) {
    if (!src) return;
    closeImageLightbox();
    const wrap = document.createElement('div');
    wrap.className = 'ws-image-lightbox';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ws-image-lightbox-close';
    btn.setAttribute('aria-label', 'Close preview');
    btn.innerHTML = '&times;';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || 'Skin preview';
    wrap.appendChild(btn);
    wrap.appendChild(img);
    wrap.addEventListener('click', (ev) => {
        if (ev.target === wrap || ev.target === btn) closeImageLightbox();
    });
    document.body.appendChild(wrap);
    _imageLightboxEl = wrap;
    requestAnimationFrame(() => wrap.classList.add('ws-image-lightbox--open'));
}

async function openSkinModal(slug, skipPush) {
    if (!slug) return;
    const pageSlug = SKIN_PAGE_SLUGS[slug] || slug;

    if (!elements.skinModal || !elements.modalContent) {
        window.location.href = buildSkinShareUrl(pageSlug);
        return;
    }

    if (skipPush !== true) {
        const url = new URL(window.location.href);
        url.searchParams.set(SKIN_URL_PARAM, pageSlug);
        history.pushState({ skinSlug: pageSlug }, '', url);
    }

    elements.skinModal.classList.add('active');
    elements.skinModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    elements.modalContent.innerHTML = `
        <div class="skin-modal-loading">
            <div class="loading-spinner"></div>
            <p>Loading skin details...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/api/skins/${slug}`);
        const data = await response.json();

        if (data.success && data.data) {
            renderModalContent(data.data);
        } else {
            throw new Error('Invalid response');
        }
    } catch (error) {
        console.error('Failed to load skin details:', error);
        elements.modalContent.innerHTML = `
            <div class="skin-modal-error">
                <p>Failed to load skin details</p>
            </div>
        `;
    }
}

/**
 * Normalize API asset path (list/detail responses use absolute URLs or relative paths).
 */
function resolveAssetUrl(path) {
    if (!path) return '';
    return path.startsWith('http') ? path : `${API_BASE}/${String(path).replace(/^\//, '')}`;
}

/**
 * Build ordered slides for modal: preview = card, lightbox = full (API: images.primary + images.gallery).
 */
function collectModalSlides(skin) {
    const slides = [];
    const pushSlide = (thumb, preview, full, caption) => {
        const t = resolveAssetUrl(thumb);
        const p = resolveAssetUrl(preview);
        const f = resolveAssetUrl(full);
        const pv = p || t;
        const fb = f || pv;
        if (!pv && !fb) return;
        slides.push({
            thumb: t || pv,
            preview: pv,
            full: fb,
            caption: caption || ''
        });
    };

    const primary = skin.images?.primary;
    if (primary) {
        pushSlide(
            primary.path_thumbnail,
            primary.path_card || primary.path_thumbnail,
            primary.path_full || primary.path_card,
            primary.image_name
        );
    }

    const gallery = skin.images?.gallery;
    if (Array.isArray(gallery)) {
        gallery.forEach((img) => {
            if (!img) return;
            pushSlide(
                img.path_thumbnail,
                img.path_card || img.path_thumbnail,
                img.path_full || img.path_card,
                img.image_name
            );
        });
    }

    // Legacy shapes (older clients / prefetch)
    if (slides.length === 0 && skin.image) {
        pushSlide(
            skin.image.thumbnail,
            skin.image.card || skin.image.thumbnail,
            skin.image.full || skin.image.card || skin.image.thumbnail,
            ''
        );
    }

    if (slides.length === 0 && skin.slug) {
        pushSlide(
            `${API_BASE}/assets/weapon-skins/${skin.slug}/thumbnail.webp`,
            `${API_BASE}/assets/weapon-skins/${skin.slug}/card.webp`,
            `${API_BASE}/assets/weapon-skins/${skin.slug}/full.webp`,
            ''
        );
    }

    // Drop duplicates when primary is also listed in gallery (same preview/full URL).
    const seen = new Set();
    const deduped = [];
    for (const s of slides) {
        const key = [s.preview, s.full, s.thumb]
            .filter(Boolean)
            .map((u) => String(u).split('?')[0].replace(/\/$/, ''))[0];
        if (!key) {
            deduped.push(s);
            continue;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(s);
    }
    return deduped;
}

/**
 * Render modal content
 */
function renderModalContent(skin) {
    const pageSlug = SKIN_PAGE_SLUGS[skin.slug] || skin.slug;
    const slides = collectModalSlides(skin);
    const first = slides[0] || { preview: '', full: '', thumb: '' };
    const imageUrl = first.preview;
    const fullSizeUrl = first.full || first.preview;
    const showThumbs = slides.length > 1;
    const isLimited = skin.availability?.is_limited ?? skin.is_limited;
    const isUnavailable = skin.availability?.is_available === false || skin.is_available === false;

    // Custom features
    const details = skin.details || {};
    const features = [];
    if (details.has_custom_model) features.push({ name: 'Custom Model', icon: '🎨' });
    if (details.has_custom_effects) features.push({ name: 'Custom Effects', icon: '✨' });
    if (details.has_custom_sounds) features.push({ name: 'Custom Sounds', icon: '🔊' });
    if (details.has_custom_tracers) features.push({ name: 'Custom Tracers', icon: '💫' });

    const collectionName = skin.collection?.name || '';
    const weaponSlug = skin.weapon?.slug || '';
    const weaponName = skin.weapon?.name || 'Unknown';
    const factionBlock = skin.faction?.name
        ? `<div class="skin-modal-meta-row"><span class="skin-modal-meta-label">Faction</span><span>${escapeHtml(skin.faction.name)}</span></div>`
        : '';
    const availabilityBlock = isUnavailable
        ? `<div class="skin-modal-meta-row skin-modal-meta-row--warn"><span class="skin-modal-meta-label">Availability</span><span>No longer available</span></div>`
        : '';

    elements.modalContent.innerHTML = `
        <div class="skin-modal-grid">
            <div class="skin-modal-gallery">
                <div class="skin-modal-main-image skin-modal-main-image--zoomable" data-rarity="${skin.rarity}">
                    ${imageUrl ? `<img src="${attrSafeUrl(imageUrl)}" alt="${escapeHtml(skin.name)}" data-full-src="${attrSafeUrl(fullSizeUrl || imageUrl)}">` : ''}
                    ${isLimited ? '<span class="modal-limited-badge">LIMITED TIME</span>' : ''}
                </div>
                ${showThumbs ? `
                    <div class="skin-modal-thumbnails">
                        ${slides.map((sld, i) => `
                            <button type="button" class="skin-thumb ${i === 0 ? 'active' : ''}" data-src="${attrSafeUrl(sld.preview)}" data-full-src="${attrSafeUrl(sld.full || sld.preview)}">
                                <img src="${attrSafeUrl(sld.thumb || sld.preview)}" alt="${escapeHtml(sld.caption || skin.name)}" loading="lazy">
                            </button>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="skin-modal-details">
                <div class="skin-modal-header">
                    <span class="skin-modal-rarity rarity-${skin.rarity}">${(skin.rarity || 'common').toUpperCase()}</span>
                    ${collectionName ? `<span class="skin-modal-collection">${escapeHtml(collectionName)}</span>` : ''}
                </div>
                <h2 class="skin-modal-title" id="skin-modal-title-live">${escapeHtml(skin.name)}</h2>
                
                <div class="skin-modal-applies-to">
                    <span class="applies-label">Applies to:</span>
                    <a href="/marathon/weapons/${weaponSlug}/" class="applies-weapon">
                        ${escapeHtml(weaponName)}
                    </a>
                </div>
                ${factionBlock}
                ${availabilityBlock}

                ${skin.description ? `<p class="skin-modal-description">${escapeHtml(skin.description)}</p>` : ''}

                <div class="skin-modal-section">
                    <h4>Acquisition</h4>
                    <div class="skin-modal-acquisition">
                        <div class="acq-source ${getSourceClass(skin.source)}">
                            ${getSourceIcon(skin.source)}
                            <span>${formatSource(skin.source)}</span>
                        </div>
                        ${skin.source_detail ? `<p class="acq-detail">${escapeHtml(skin.source_detail)}</p>` : ''}
                        ${skin.acquisition_note ? `
                            <div class="acq-note">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                                </svg>
                                ${escapeHtml(skin.acquisition_note)}
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${features.length > 0 ? `
                    <div class="skin-modal-section">
                        <h4>Custom Features</h4>
                        <div class="skin-modal-features">
                            ${features.map(f => `
                                <div class="modal-feature">
                                    <span class="feature-icon">${f.icon}</span>
                                    <span>${f.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="skin-modal-actions skin-modal-actions--split">
                    <button type="button" class="modal-action-btn primary" id="skinModalCopyLink" data-skin-slug="${escapeHtml(pageSlug)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        <span class="skin-modal-copy-label">Copy link</span>
                    </button>
                    <a href="/marathon/weapons/${weaponSlug}/" class="modal-action-btn modal-action-btn--ghost">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                        </svg>
                        View weapon
                    </a>
                </div>
            </div>
        </div>
    `;

    // Gallery thumbnail clicks
    elements.modalContent.querySelectorAll('.skin-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
            elements.modalContent.querySelectorAll('.skin-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            const mainImg = elements.modalContent.querySelector('.skin-modal-main-image img');
            if (mainImg) {
                const ts = thumb.dataset.src;
                const tf = thumb.dataset.fullSrc || ts;
                mainImg.src = ts;
                mainImg.dataset.fullSrc = tf;
            }
        });
    });

    const mainWrap = elements.modalContent.querySelector('.skin-modal-main-image');
    const mainImg = mainWrap?.querySelector('img');
    if (mainWrap && mainImg) {
        mainWrap.addEventListener('click', () => {
            const src = mainImg.dataset.fullSrc || mainImg.src;
            openImageLightbox(src, skin.name);
        });
    }

    const copyBtn = elements.modalContent.querySelector('#skinModalCopyLink');
    const copyLabel = copyBtn?.querySelector('.skin-modal-copy-label');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const s = copyBtn.dataset.skinSlug || skin.slug;
            const text = buildSkinShareUrl(s);
            try {
                await navigator.clipboard.writeText(text);
                if (copyLabel) {
                    const prev = copyLabel.textContent;
                    copyLabel.textContent = 'Copied!';
                    setTimeout(() => { copyLabel.textContent = prev; }, 1600);
                }
            } catch (err) {
                console.warn('Clipboard failed', err);
                window.prompt('Copy link:', text);
            }
        });
    }
}

/**
 * Close modal
 */
function closeModal(skipPush) {
    closeImageLightbox();
    if (!elements.skinModal?.classList.contains('active')) return;
    elements.skinModal.classList.remove('active');
    elements.skinModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (skipPush !== true) {
        const url = new URL(window.location.href);
        url.searchParams.delete(SKIN_URL_PARAM);
        const qs = url.searchParams.toString();
        history.pushState({}, '', url.pathname + (qs ? `?${qs}` : ''));
    }
}

// Utility functions
function getSourceClass(source) {
    if (!source) return 'source-unknown';
    const s = source.toLowerCase();
    if (s.includes('pre_order') || s.includes('preorder')) return 'source-preorder';
    if (s.includes('deluxe')) return 'source-deluxe';
    if (s.includes('battle_pass')) return 'source-battlepass';
    if (s.includes('store')) return 'source-store';
    if (s.includes('event')) return 'source-event';
    if (s.includes('twitch')) return 'source-twitch';
    return 'source-default';
}

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

function getSourceIcon(source) {
    if (!source) return '';
    const s = source.toLowerCase();
    if (s.includes('pre_order') || s.includes('preorder')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    }
    if (s.includes('deluxe')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }
    if (s.includes('battle_pass')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>';
    }
    if (s.includes('store')) {
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
    }
    return '';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

// ─── Compact Emoji Rating System (v2) ───

function formatVoteCount(n) {
    if (!n || n === 0) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

// Map numeric vote value to distribution key names used by the new API
const VOTE_KEY_MAP = { 5: 'fire', 4: 'love', 3: 'meh', 2: 'nah', 1: 'trash' };

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
                const namedKey = VOTE_KEY_MAP[v];
                const d = rating.distribution[namedKey] || rating.distribution[v] || rating.distribution[String(v)];
                countEl.textContent = formatVoteCount(d ? (d.count ?? d) : 0);
            }
        }
    }
}

async function loadHeatRatings() {
    // Ratings are included in the skin data from the new API — ratingsMap is
    // seeded in loadWeaponSkins(). Just update strips that are already rendered.
    document.querySelectorAll('.cw-heat-strip').forEach(strip => {
        updateStripData(strip, strip.dataset.slug);
    });
    highlightUserVotes();
}

function highlightUserVotes() {
    document.querySelectorAll('.cw-heat-emoji').forEach(btn => {
        const slug = btn.dataset.slug;
        if (!slug) return;
        const saved = localStorage.getItem(`mdb_ws_vote_${slug}`);
        if (saved && btn.dataset.val === saved) {
            btn.classList.add('voted');
        }
    });
}

async function getDeviceToken() {
    const LS_KEY = 'mdb_ws_device_id';
    let id = localStorage.getItem(LS_KEY);
    if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem(LS_KEY, id);
    }
    const raw = id + (navigator.userAgent || '');
    if (crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback: just use the id directly (no SHA-256 support)
    return id;
}

function attachHeatEmojiHandlers() {
    document.querySelectorAll('.cw-heat-emoji').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const slug = btn.dataset.slug;
            const rating = parseInt(btn.dataset.val);
            if (!slug || isNaN(rating) || rating < 1 || rating > 5) return;

            // Optimistic UI
            const strip = btn.closest('.cw-heat-strip');
            strip.querySelectorAll('.cw-heat-emoji').forEach(b => b.classList.remove('voted'));
            btn.classList.add('voted');

            // Persist vote locally
            localStorage.setItem(`mdb_ws_vote_${slug}`, String(rating));

            // Submit to new API
            try {
                const deviceToken = await getDeviceToken();
                const res = await fetch(`${API_BASE}/api/skins/${slug}/rate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating, device_token: deviceToken })
                });
                const result = await res.json();
                if (result.success && result.data?.aggregate) {
                    const agg = result.data.aggregate;
                    ratingsMap[slug] = {
                        slug,
                        score_percent: agg.score_percent,
                        total_votes: agg.total_votes,
                        distribution: agg.distribution
                    };
                    const sk = allSkins.find(s => s.slug === slug);
                    if (sk) sk.rating = ratingsMap[slug];
                    updateStripData(strip, slug);
                    sortSkins();
                    renderSkins();
                }
            } catch (err) {
                console.error('Failed to submit rating:', err);
            }
        });
    });
}
