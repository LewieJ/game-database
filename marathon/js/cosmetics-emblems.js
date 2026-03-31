/**
 * Cosmetics Emblems List Page
 * Handles loading, filtering, sorting, and displaying player emblems
 */

(function() {
    'use strict';

    // API Base URL
    const API_BASE = 'https://helpbot.marathondb.gg';

    // State
    let allEmblems = [];
    let filteredEmblems = [];
    let currentView = 'grid';
    let ratingsMap = {};
    let currentFilters = {
        search: '',
        rarity: 'all',
        limited: false,
        unavailable: false,
        source: '',
        collection: ''
    };

    // DOM Elements - cached on init
    let elements = {};

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            // Stats
            totalCount: document.getElementById('totalCount'),
            legendaryCount: document.getElementById('legendaryCount'),
            limitedCount: document.getElementById('limitedCount'),
            allCount: document.getElementById('allCount'),
            
            // Search & Filters
            searchInput: document.getElementById('searchInput'),
            collectionFilter: document.getElementById('collectionFilter'),
            sortSelect: document.getElementById('sortSelect'),
            
            // Filter pills
            filterPills: document.querySelectorAll('.filter-pill'),
            
            // Active filters
            activeFilters: document.getElementById('activeFilters'),
            activeFilterTags: document.getElementById('activeFilterTags'),
            clearFilters: document.getElementById('clearFilters'),
            
            // View toggle
            viewBtns: document.querySelectorAll('.view-btn'),
            
            // Content areas
            loadingState: document.getElementById('loadingState'),
            resultsSection: document.getElementById('resultsSection'),
            emblemsGrid: document.getElementById('emblemsGrid'),
            emptyState: document.getElementById('emptyState'),
            resultsCount: document.getElementById('resultsCount'),
            resetFilters: document.getElementById('resetFilters')
        };
    }

    // Rarity order for sorting
    const rarityOrder = {
        'standard': 1,
        'enhanced': 2,
        'deluxe': 3,
        'superior': 4,
        'prestige': 5,
        'common': 1,
        'uncommon': 2,
        'rare': 3,
        'epic': 4,
        'legendary': 5,
        'exotic': 6
    };

    // Source display names
    const sourceNames = {
        'pre_order': 'Pre-Order',
        'deluxe_edition': 'Deluxe Edition',
        'collectors_edition': "Collector's Edition",
        'battle_pass': 'Battle Pass',
        'store': 'Store',
        'event': 'Event',
        'achievement': 'Achievement'
    };

    /**
     * Initialize the page
     */
    async function init() {
        cacheElements();
        try {
            await loadEmblems();
            setupEventListeners();
            updateStats();
            populateCollectionFilter();
            applyFilters();
            loadHeatRatings();
            setInterval(() => {
                document.querySelectorAll('.cw-countdown-badge[data-expiry]').forEach(badge => {
                    const txt = formatCountdown(badge.dataset.expiry);
                    if (txt) badge.textContent = `\u23f1 ENDS ${txt}`;
                    else badge.remove();
                });
            }, 1000);
        } catch (error) {
            console.error('Failed to initialize emblems page:', error);
            showError();
        }
    }

    /**
     * Load emblems from API
     */
    async function loadEmblems() {
        const response = await MarathonAPI.get('/cosmetics/emblems');
        
        if (response.success && response.data) {
            // Deduplicate emblems by name (prefer entries with more complete data)
            const emblemMap = new Map();
            response.data.forEach(emblem => {
                const key = emblem.name.toLowerCase();
                const existing = emblemMap.get(key);
                if (!existing) {
                    emblemMap.set(key, emblem);
                } else {
                    // Prefer the one with more complete data
                    const existingScore = (existing.meta_title ? 1 : 0) + (existing.is_limited ? 1 : 0) + (existing.source_detail ? 1 : 0);
                    const newScore = (emblem.meta_title ? 1 : 0) + (emblem.is_limited ? 1 : 0) + (emblem.source_detail ? 1 : 0);
                    if (newScore > existingScore) {
                        emblemMap.set(key, emblem);
                    }
                }
            });
            allEmblems = Array.from(emblemMap.values());
            filteredEmblems = [...allEmblems];
        } else {
            throw new Error('Failed to load emblems');
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

        // Filter pills
        if (elements.filterPills && elements.filterPills.length > 0) {
            elements.filterPills.forEach(pill => {
                pill.addEventListener('click', () => {
                    const filter = pill.dataset.filter;
                    
                    if (filter === 'all') {
                        currentFilters.rarity = 'all';
                        currentFilters.limited = false;
                        currentFilters.unavailable = false;
                    } else if (filter === 'limited') {
                        currentFilters.limited = !currentFilters.limited;
                        if (currentFilters.limited) {
                            currentFilters.rarity = 'all';
                            currentFilters.unavailable = false;
                        }
                    } else if (filter === 'vaulted') {
                        currentFilters.unavailable = !currentFilters.unavailable;
                        if (currentFilters.unavailable) {
                            currentFilters.rarity = 'all';
                            currentFilters.limited = false;
                        }
                    } else {
                        currentFilters.rarity = filter;
                        currentFilters.limited = false;
                        currentFilters.unavailable = false;
                    }
                    
                    updateFilterPills();
                    applyFilters();
                });
            });
        }

        // Dropdowns
        if (elements.collectionFilter) {
            elements.collectionFilter.addEventListener('change', () => {
                currentFilters.collection = elements.collectionFilter.value;
                applyFilters();
            });
        }

        // Sort
        if (elements.sortSelect) {
            elements.sortSelect.addEventListener('change', applyFilters);
        }

        // View toggle
        if (elements.viewBtns && elements.viewBtns.length > 0) {
            elements.viewBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    currentView = btn.dataset.view;
                    elements.viewBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderEmblems();
                });
            });
        }

        // Clear filters
        if (elements.clearFilters) {
            elements.clearFilters.addEventListener('click', resetAllFilters);
        }
        if (elements.resetFilters) {
            elements.resetFilters.addEventListener('click', resetAllFilters);
        }
    }

    /**
     * Update filter pill states
     */
    function updateFilterPills() {
        if (!elements.filterPills || elements.filterPills.length === 0) return;
        
        elements.filterPills.forEach(pill => {
            const filter = pill.dataset.filter;
            
            if (filter === 'all') {
                pill.classList.toggle('active', currentFilters.rarity === 'all' && !currentFilters.limited && !currentFilters.unavailable);
            } else if (filter === 'limited') {
                pill.classList.toggle('active', currentFilters.limited);
            } else if (filter === 'vaulted') {
                pill.classList.toggle('active', currentFilters.unavailable);
            } else {
                pill.classList.toggle('active', currentFilters.rarity === filter);
            }
        });
    }

    /**
     * Apply all filters and render
     */
    function applyFilters() {
        filteredEmblems = allEmblems.filter(emblem => {
            // Search filter
            if (currentFilters.search) {
                const searchTarget = `${emblem.name} ${emblem.description || ''} ${emblem.collection_name || ''}`.toLowerCase();
                if (!searchTarget.includes(currentFilters.search)) {
                    return false;
                }
            }

            // Rarity filter
            if (currentFilters.rarity !== 'all' && emblem.rarity !== currentFilters.rarity) {
                return false;
            }

            // Limited filter
            if (currentFilters.limited && !emblem.is_limited) {
                return false;
            }

            // Collection filter
            if (currentFilters.collection && emblem.collection_name !== currentFilters.collection) {
                return false;
            }

            // Vaulted / unavailable filter
            if (currentFilters.unavailable && emblem.is_available !== false) {
                return false;
            }

            return true;
        });

        sortEmblems();
        updateActiveFiltersDisplay();
        renderEmblems();
    }

    /**
     * Sort emblems based on current selection
     */
    function sortEmblems() {
        const sortValue = elements.sortSelect ? elements.sortSelect.value : 'name-asc';

        filteredEmblems.sort((a, b) => {
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
                    return (b.id || 0) - (a.id || 0);
                default:
                    return 0;
            }
        });
    }

    /**
     * Render emblems to the grid
     */
    function renderEmblems() {
        if (elements.loadingState) elements.loadingState.style.display = 'none';
        if (elements.resultsSection) elements.resultsSection.style.display = 'block';

        if (filteredEmblems.length === 0) {
            if (elements.emblemsGrid) elements.emblemsGrid.style.display = 'none';
            if (elements.emptyState) elements.emptyState.style.display = 'flex';
            if (elements.resultsCount) elements.resultsCount.textContent = '0 emblems found';
            return;
        }

        if (elements.emblemsGrid) elements.emblemsGrid.style.display = '';
        if (elements.emptyState) elements.emptyState.style.display = 'none';
        if (elements.resultsCount) elements.resultsCount.textContent = `${filteredEmblems.length} emblem${filteredEmblems.length !== 1 ? 's' : ''} found`;

        // Set grid or list class
        if (elements.emblemsGrid) {
            elements.emblemsGrid.className = currentView === 'list' ? 'cosmetics-grid emblems-grid list-view' : 'cosmetics-grid emblems-grid';
            elements.emblemsGrid.innerHTML = filteredEmblems.map(emblem => createEmblemCard(emblem)).join('');
            attachHeatEmojiHandlers();
            highlightUserVotes();
        }
    }

    /**
     * Get emblem detail page URL (supports SSG clean URLs)
     */
    function getEmblemDetailUrl(slug) {
        return `/emblems/${slug}/`;
    }

    /**
     * Create emblem card HTML — simplified with rarity border, neon name pill, wide image
     */
    function createEmblemCard(emblem) {
        const imageUrl = emblem.icon_path 
            ? (emblem.icon_path.startsWith('http') ? emblem.icon_path : `${API_BASE}${emblem.icon_path}`)
            : '';
        const lowResUrl = emblem.icon_path_low 
            ? (emblem.icon_path_low.startsWith('http') ? emblem.icon_path_low : `${API_BASE}${emblem.icon_path_low}`)
            : imageUrl;
        const unavailableAttr  = emblem.is_available === false ? ' data-unavailable' : '';
        const unavailableBadge = emblem.is_available === false
            ? '<div class="cw-unavailable-badge">No Longer Available</div>' : '';
        const emblemExpiry   = emblem.available_until || null;
        const countdownBadge = emblemExpiry
            ? `<div class="cw-countdown-badge" data-expiry="${emblemExpiry}">\u23f1 &hellip;</div>` : '';

        return `
            <a href="${getEmblemDetailUrl(emblem.slug)}" class="cw-skin-card sticker-card-simple" data-rarity="${emblem.rarity}"${unavailableAttr}>
                <div class="cw-skin-image cw-skin-image--wide">
                    ${imageUrl ? `
                        <img src="${lowResUrl}" 
                             data-full="${imageUrl}"
                             alt="${escapeHtml(emblem.name)}" 
                             loading="lazy"
                             onload="this.onload=null; this.src=this.dataset.full">
                    ` : `
                        <div class="cw-skin-placeholder">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
                            </svg>
                        </div>
                    `}
                    ${unavailableBadge}${countdownBadge}
                </div>
                <div class="cw-skin-info">
                    <span class="sticker-name-pill">${escapeHtml(emblem.name)}</span>
                </div>
                <div class="cw-heat-strip" data-slug="${emblem.slug}">
                    <div class="cw-heat-fill"></div>
                    <div class="cw-heat-emojis">
                        <button class="cw-heat-emoji" data-rating="5" data-slug="${emblem.slug}" title="Fire">
                            <span class="cw-emoji-icon">🔥</span>
                            <span class="cw-emoji-count" data-rating-count="5">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="4" data-slug="${emblem.slug}" title="Love">
                            <span class="cw-emoji-icon">😍</span>
                            <span class="cw-emoji-count" data-rating-count="4">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="3" data-slug="${emblem.slug}" title="Meh">
                            <span class="cw-emoji-icon">😐</span>
                            <span class="cw-emoji-count" data-rating-count="3">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="2" data-slug="${emblem.slug}" title="Nah">
                            <span class="cw-emoji-icon">👎</span>
                            <span class="cw-emoji-count" data-rating-count="2">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="1" data-slug="${emblem.slug}" title="Trash">
                            <span class="cw-emoji-icon">💩</span>
                            <span class="cw-emoji-count" data-rating-count="1">—</span>
                        </button>
                    </div>
                </div>
            </a>
        `;
    }

    /**
     * Get best available emblem image URL
     */
    function getEmblemImage(emblem, size = 'high') {
        const buildUrl = (path) => path ? (path.startsWith('http') ? path : `${API_BASE}${path}`) : '';
        if (size === 'low' && emblem.icon_path_low) {
            return buildUrl(emblem.icon_path_low);
        }
        if (emblem.icon_path_high) {
            return buildUrl(emblem.icon_path_high);
        }
        if (emblem.icon_path) {
            return buildUrl(emblem.icon_path);
        }
        return '';
    }

    /**
     * Update page statistics
     */
    function updateStats() {
        const total = allEmblems.length;
        const legendary = allEmblems.filter(e => e.rarity === 'legendary').length;
        const limited = allEmblems.filter(e => e.is_limited).length;

        if (elements.totalCount) elements.totalCount.textContent = total;
        if (elements.legendaryCount) elements.legendaryCount.textContent = legendary;
        if (elements.limitedCount) elements.limitedCount.textContent = limited;
        if (elements.allCount) elements.allCount.textContent = total;
    }

    /**
     * Populate collection filter dropdown
     */
    function populateCollectionFilter() {
        if (!elements.collectionFilter) return;
        
        const collections = [...new Set(allEmblems.map(e => e.collection_name).filter(Boolean))];
        
        collections.sort().forEach(collection => {
            const option = document.createElement('option');
            option.value = collection;
            option.textContent = collection;
            elements.collectionFilter.appendChild(option);
        });
    }

    /**
     * Update active filters display
     */
    function updateActiveFiltersDisplay() {
        // Skip if elements don't exist in compact layout
        if (!elements.activeFilters || !elements.activeFilterTags) {
            return;
        }
        
        const tags = [];

        if (currentFilters.search) {
            tags.push({ label: `"${currentFilters.search}"`, type: 'search' });
        }
        if (currentFilters.rarity !== 'all') {
            tags.push({ label: capitalizeFirst(currentFilters.rarity), type: 'rarity' });
        }
        if (currentFilters.limited) {
            tags.push({ label: 'Limited', type: 'limited' });
        }
        if (currentFilters.collection) {
            tags.push({ label: currentFilters.collection, type: 'collection' });
        }

        if (tags.length === 0) {
            elements.activeFilters.style.display = 'none';
            return;
        }

        elements.activeFilters.style.display = 'flex';
        elements.activeFilterTags.innerHTML = tags.map(tag => `
            <span class="filter-tag" data-type="${tag.type}">
                ${tag.label}
                <button class="filter-tag-remove" onclick="removeFilter('${tag.type}')">×</button>
            </span>
        `).join('');
    }

    /**
     * Remove a specific filter
     */
    window.removeFilter = function(type) {
        switch (type) {
            case 'search':
                currentFilters.search = '';
                if (elements.searchInput) elements.searchInput.value = '';
                break;
            case 'rarity':
                currentFilters.rarity = 'all';
                break;
            case 'limited':
                currentFilters.limited = false;
                break;
            case 'collection':
                currentFilters.collection = '';
                if (elements.collectionFilter) elements.collectionFilter.value = '';
                break;
        }
        updateFilterPills();
        applyFilters();
    };

    /**
     * Reset all filters
     */
    function resetAllFilters() {
        currentFilters = {
            search: '',
            rarity: 'all',
            limited: false,
            unavailable: false,
            collection: ''
        };

        if (elements.searchInput) elements.searchInput.value = '';
        if (elements.collectionFilter) elements.collectionFilter.value = '';
        if (elements.sortSelect) elements.sortSelect.value = 'name-asc';

        updateFilterPills();
        applyFilters();
    }

    /**
     * Show error state
     */
    function showError() {
        if (!elements.loadingState) return;
        elements.loadingState.innerHTML = `
            <div class="error-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Failed to load emblems</h3>
                <p>Please try refreshing the page</p>
                <button class="btn-retry" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    /**
     * Utility: Debounce function
     */
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

    /**
     * Utility: Debounce function (original)
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
     * Escape HTML
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
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
     * Load community ratings for all emblems
     */
    async function loadHeatRatings() {
        if (typeof CosmeticRatingsAPI === 'undefined') return;
        try {
            const result = await CosmeticRatingsAPI.getListRatings('emblem', { limit: 200 });
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
                    const result = await CosmeticRatingsAPI.submitRating(slug, rating, 'emblem');
                    if (result.success && result.data) {
                        ratingsMap[slug] = { slug, score_percent: result.data.score_percent, total_votes: result.data.total_votes, distribution: result.data.distribution };
                        updateStripData(strip, slug);
                    }
                }
            });
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
