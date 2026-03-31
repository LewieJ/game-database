/**
 * Stickers Page - cosmetics-stickers.js
 * Interactive filtering, search, and display of sticker cosmetics
 */

// State
let allStickers = [];
let filteredStickers = [];
let currentView = 'grid';
let ratingsMap = {};
let currentFilters = {
    search: '',
    rarity: '',
    source: '',
    collection: '',
    limited: false,
    unavailable: false
};

// Countdown helpers
const EXPIRES_HOUR_UTC = 18;
function getStickerExpiry(sticker) {
    if (!sticker.available_until || sticker.is_available === false) return null;
    const d = new Date(sticker.available_until);
    d.setUTCHours(EXPIRES_HOUR_UTC, 0, 0, 0);
    return d;
}
function formatCountdown(ms) {
    if (ms <= 0) return 'Expired';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60;
    if (d > 0)  return `${d}D ${h}H`;
    if (h > 0)  return `${h}H ${m}M`;
    return `${m}M ${sc}S`;
}

// API Base
const API_BASE = 'https://weaponstickers.marathondb.gg';

// DOM Elements
const elements = {
    loadingState: null,
    resultsSection: null,
    stickersGrid: null,
    emptyState: null,
    searchInput: null,
    totalCount: null,
    resultsCount: null
};

/**
 * Initialize the page
 */
async function init() {
    cacheElements();
    setupEventListeners();
    await loadStickers();
    loadHeatRatings();

    // Tick countdown badges every second
    setInterval(() => {
        document.querySelectorAll('.cw-countdown-badge[data-expiry]').forEach(badge => {
            const ms = new Date(badge.dataset.expiry) - Date.now();
            badge.textContent = `⏱ ENDS ${formatCountdown(ms)}`;
        });
    }, 1000);
}

/**
 * Cache DOM elements
 */
function cacheElements() {
    elements.loadingState = document.getElementById('loadingState');
    elements.resultsSection = document.getElementById('resultsSection');
    elements.stickersGrid = document.getElementById('stickersGrid');
    elements.emptyState = document.getElementById('emptyState');
    elements.searchInput = document.getElementById('searchInput');
    elements.totalCount = document.getElementById('totalCount');
    elements.resultsCount = document.getElementById('resultsCount');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search input with debounce
    elements.searchInput?.addEventListener('input', debounce((e) => {
        currentFilters.search = e.target.value.toLowerCase().trim();
        applyFilters();
    }, 300));

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => handlePillClick(pill));
    });

    // Dropdown filters
    document.getElementById('collectionFilter')?.addEventListener('change', (e) => {
        currentFilters.collection = e.target.value;
        applyFilters();
    });

    // Sort
    document.getElementById('sortSelect')?.addEventListener('change', () => {
        applyFilters();
    });

    // Clear filters
    document.getElementById('clearFilters')?.addEventListener('click', resetFilters);
    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close any modals if needed
        }
    });
}

/**
 * Load stickers from API
 */
async function loadStickers() {
    try {
        const response = await fetch(`${API_BASE}/api/stickers`);
        const data = await response.json();

        if (data.success && data.data) {
            allStickers = data.data.map(sticker => ({
                ...sticker,
                name: sticker.name,
                faction_name: sticker.faction_name,
                // Derive is_limited from available_until (null = permanent = not limited)
                is_limited: sticker.available_until ? 1 : 0
            }));
            
            filteredStickers = [...allStickers];

            updateStats();
            populateFilters();
            applyFilters();

            elements.loadingState.style.display = 'none';
            elements.resultsSection.style.display = 'block';
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('Failed to load stickers:', error);
        elements.loadingState.innerHTML = `
            <div class="error-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                </svg>
                <h3>Failed to Load</h3>
                <p>Unable to fetch stickers. Please try again later.</p>
                <button class="btn-retry" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Update header stats
 */
function updateStats() {
    const total = allStickers.length;
    if (elements.totalCount) {
        elements.totalCount.textContent = total;
    }
}

/**
 * Populate filter dropdowns with data from API
 */
function populateFilters() {
    // Factions dropdown
    const collections = [...new Set(allStickers.map(s => s.faction_slug))].filter(Boolean);
    const collectionNames = {};
    allStickers.forEach(s => {
        if (s.faction_slug) collectionNames[s.faction_slug] = s.faction_name;
    });

    const collectionFilter = document.getElementById('collectionFilter');
    collections.forEach(slug => {
        const option = document.createElement('option');
        option.value = slug;
        option.textContent = collectionNames[slug] || slug;
        collectionFilter?.appendChild(option);
    });
}

/**
 * Handle filter pill click
 */
function handlePillClick(pill) {
    const filter = pill.dataset.filter;
    const rarity = pill.dataset.rarity;

    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

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
}

/**
 * Apply all filters and sort
 */
function applyFilters() {
    filteredStickers = allStickers.filter(sticker => {
        // Search filter
        if (currentFilters.search) {
            const searchStr = `${sticker.name} ${sticker.description} ${sticker.faction_name} ${sticker.acquisition_summary}`.toLowerCase();
            if (!searchStr.includes(currentFilters.search)) return false;
        }

        // Rarity filter
        if (currentFilters.rarity && sticker.rarity !== currentFilters.rarity) return false;

        // Faction filter
        if (currentFilters.collection && sticker.faction_slug !== currentFilters.collection) return false;

        // Limited filter
        if (currentFilters.limited && sticker.is_limited !== 1) return false;

        // Vaulted filter
        if (currentFilters.unavailable && sticker.is_available !== false) return false;

        return true;
    });

    // Sort
    const sortValue = document.getElementById('sortSelect')?.value || 'name-asc';
    sortStickers(sortValue);

    // Update UI
    renderStickers();
}

/**
 * Sort stickers
 */
function sortStickers(sortValue) {
    const rarityOrder = {
        'common': 1, 'uncommon': 2, 'rare': 3, 'standard': 4, 'epic': 5,
        'enhanced': 6, 'deluxe': 7, 'legendary': 8, 'superior': 9, 'exotic': 10, 'prestige': 11
    };

    filteredStickers.sort((a, b) => {
        switch (sortValue) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'rarity-desc':
                return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
            case 'rarity-asc':
                return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            default:
                return 0;
        }
    });
}

/**
 * Reset all filters
 */
function resetFilters() {
    currentFilters = {
        search: '',
        rarity: '',
        collection: '',
        limited: false,
        unavailable: false
    };

    if (elements.searchInput) elements.searchInput.value = '';
    const collectionFilter = document.getElementById('collectionFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    if (collectionFilter) collectionFilter.value = '';
    if (sortSelect) sortSelect.value = 'name-asc';

    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.filter-pill[data-filter="all"]')?.classList.add('active');

    applyFilters();
}

/**
 * Render stickers grid
 */
function renderStickers() {
    if (elements.resultsCount) elements.resultsCount.textContent = `${filteredStickers.length} sticker${filteredStickers.length !== 1 ? 's' : ''} found`;

    if (filteredStickers.length === 0) {
        elements.stickersGrid.style.display = 'none';
        elements.emptyState.style.display = 'flex';
        return;
    }

    elements.stickersGrid.style.display = '';
    elements.emptyState.style.display = 'none';

    elements.stickersGrid.innerHTML = filteredStickers.map(sticker => renderStickerCard(sticker)).join('');

    // Attach emoji vote handlers + re-highlight
    attachHeatEmojiHandlers();
    highlightUserVotes();
}

/**
 * Get the detail page URL for a sticker
 * Uses clean URLs when SSG pages are available
 */
function getStickerDetailUrl(slug) {
    return `/stickers/${slug}/`;
}

/**
 * Render a sticker card — simplified with rarity border and neon name pill
 */
function renderStickerCard(sticker) {
    const imageUrl = sticker.image_url
        ? (sticker.image_url.startsWith('http') ? sticker.image_url : `${API_BASE}${sticker.image_url}`)
        : '';
    const lowResUrl = sticker.image_preview_url
        ? (sticker.image_preview_url.startsWith('http') ? sticker.image_preview_url : `${API_BASE}${sticker.image_preview_url}`)
        : imageUrl;

    const isUnavailable = sticker.is_available === false;
    const unavailableBadge = isUnavailable
        ? `<div class="cw-unavailable-badge">No Longer Available</div>` : '';

    const expiryDate = getStickerExpiry(sticker);
    const countdownBadge = expiryDate
        ? `<div class="cw-countdown-badge" data-expiry="${expiryDate.toISOString()}">&#9203; ENDS ${formatCountdown(expiryDate - Date.now())}</div>`
        : '';

    return `
        <a href="${getStickerDetailUrl(sticker.slug)}" class="cw-skin-card sticker-card-simple" data-rarity="${sticker.rarity}"${isUnavailable ? ' data-unavailable' : ''}>
            <div class="cw-skin-image">
                ${imageUrl ? `
                    <img src="${lowResUrl}" 
                         data-full="${imageUrl}"
                         alt="${escapeHtml(sticker.name)}" 
                         loading="lazy"
                         onload="this.onload=null; this.src=this.dataset.full">
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
                <span class="sticker-name-pill">${escapeHtml(sticker.name)}</span>
            </div>
            <div class="cw-heat-strip" data-slug="${sticker.slug}">
                <div class="cw-heat-fill"></div>
                <div class="cw-heat-emojis">
                    <button class="cw-heat-emoji" data-rating="5" data-slug="${sticker.slug}" title="Fire">
                        <span class="cw-emoji-icon">🔥</span>
                        <span class="cw-emoji-count" data-rating-count="5">—</span>
                    </button>
                    <button class="cw-heat-emoji" data-rating="4" data-slug="${sticker.slug}" title="Love">
                        <span class="cw-emoji-icon">😍</span>
                        <span class="cw-emoji-count" data-rating-count="4">—</span>
                    </button>
                    <button class="cw-heat-emoji" data-rating="3" data-slug="${sticker.slug}" title="Meh">
                        <span class="cw-emoji-icon">😐</span>
                        <span class="cw-emoji-count" data-rating-count="3">—</span>
                    </button>
                    <button class="cw-heat-emoji" data-rating="2" data-slug="${sticker.slug}" title="Nah">
                        <span class="cw-emoji-icon">👎</span>
                        <span class="cw-emoji-count" data-rating-count="2">—</span>
                    </button>
                    <button class="cw-heat-emoji" data-rating="1" data-slug="${sticker.slug}" title="Trash">
                        <span class="cw-emoji-icon">💩</span>
                        <span class="cw-emoji-count" data-rating-count="1">—</span>
                    </button>
                </div>
            </div>
        </a>
    `;
}

/**
 * Format source for display
 */
function formatSource(source) {
    const sourceNames = {
        'store':       'In-Game Store',
        'battlepass':  'Battle Pass',
        'event':       'Limited Event',
        'codex':       'Codex',
        'free':        'Free',
        'unknown':     'Unknown'
    };
    return sourceNames[source] || source || 'Unknown';
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
 * Load community ratings for all stickers
 */
async function loadHeatRatings() {
    if (typeof CosmeticRatingsAPI === 'undefined') return;
    try {
        const result = await CosmeticRatingsAPI.getListRatings('sticker', { limit: 200 });
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
 * Attach click handlers for emoji voting
 */
function attachHeatEmojiHandlers() {
    document.querySelectorAll('.cw-heat-emoji').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const slug = btn.dataset.slug;
            const rating = parseInt(btn.dataset.rating);
            if (!slug || isNaN(rating) || rating < 1 || rating > 5) return;

            const strip = btn.closest('.cw-heat-strip');
            strip.querySelectorAll('.cw-heat-emoji').forEach(b => b.classList.remove('voted'));
            btn.classList.add('voted');

            const votes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
            votes[slug] = rating;
            localStorage.setItem('marathondb_emoji_votes', JSON.stringify(votes));

            if (typeof CosmeticRatingsAPI !== 'undefined') {
                const result = await CosmeticRatingsAPI.submitRating(slug, rating, 'sticker');
                if (result.success && result.data) {
                    ratingsMap[slug] = {
                        slug,
                        score_percent: result.data.score_percent,
                        total_votes: result.data.total_votes,
                        distribution: result.data.distribution
                    };
                    updateStripData(strip, slug);
                }
            }
        });
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce helper
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
