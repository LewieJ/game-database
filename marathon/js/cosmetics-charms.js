/**
 * Cosmetics Charms List Page
 * Handles loading, filtering, sorting, and displaying weapon charms
 */

(function() {
    'use strict';

    // API Base URL
    const API_BASE = 'https://helpbot.marathondb.gg';

    // State
    let allCharms = [];
    let filteredCharms = [];
    let currentView = 'grid';
    let ratingsMap = {};
    let currentFilters = {
        search: '',
        rarity: 'all',
        limited: false,
        unavailable: false,
        source: '',
        season: '',
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
            charmsGrid: document.getElementById('charmsGrid'),
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
            await loadCharms();
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
            console.error('Failed to initialize charms page:', error);
            showError();
        }
    }

    /**
     * Load charms from API
     */
    async function loadCharms() {
        const response = await MarathonAPI.get('/cosmetics/charms');
        
        if (response.success && response.data) {
            // Deduplicate charms by name (prefer entries with more complete data)
            const charmMap = new Map();
            response.data.forEach(charm => {
                const key = charm.name.toLowerCase();
                const existing = charmMap.get(key);
                if (!existing) {
                    charmMap.set(key, charm);
                } else {
                    // Prefer the one with more complete data (has meta_title, is_limited, etc.)
                    const existingScore = (existing.meta_title ? 1 : 0) + (existing.is_limited ? 1 : 0) + (existing.source_detail ? 1 : 0);
                    const newScore = (charm.meta_title ? 1 : 0) + (charm.is_limited ? 1 : 0) + (charm.source_detail ? 1 : 0);
                    if (newScore > existingScore) {
                        charmMap.set(key, charm);
                    }
                }
            });
            allCharms = Array.from(charmMap.values());
            filteredCharms = [...allCharms];
        } else {
            throw new Error('Failed to load charms');
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
                    renderCharms();
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
        filteredCharms = allCharms.filter(charm => {
            // Search filter
            if (currentFilters.search) {
                const searchTarget = `${charm.name} ${charm.description || ''} ${charm.collection_name || ''}`.toLowerCase();
                if (!searchTarget.includes(currentFilters.search)) {
                    return false;
                }
            }

            // Rarity filter
            if (currentFilters.rarity !== 'all' && charm.rarity !== currentFilters.rarity) {
                return false;
            }

            // Limited filter
            if (currentFilters.limited && !charm.is_limited) {
                return false;
            }

            // Collection filter
            if (currentFilters.collection && charm.collection_name !== currentFilters.collection) {
                return false;
            }

            // Vaulted / unavailable filter
            if (currentFilters.unavailable && charm.is_available !== false) {
                return false;
            }

            return true;
        });

        sortCharms();
        updateActiveFiltersDisplay();
        renderCharms();
    }

    /**
     * Sort charms based on current selection
     */
    function sortCharms() {
        const sortValue = elements.sortSelect ? elements.sortSelect.value : 'newest';

        filteredCharms.sort((a, b) => {
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
                    // Sort by created_at first, then by id
                    const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                    const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                    if (dateB.getTime() !== dateA.getTime()) {
                        return dateB - dateA;
                    }
                    return (b.id || 0) - (a.id || 0);
                default:
                    return 0;
            }
        });
    }

    /**
     * Render charms to the grid
     */
    function renderCharms() {
        if (elements.loadingState) elements.loadingState.style.display = 'none';
        if (elements.resultsSection) elements.resultsSection.style.display = 'block';

        if (filteredCharms.length === 0) {
            if (elements.charmsGrid) elements.charmsGrid.style.display = 'none';
            if (elements.emptyState) elements.emptyState.style.display = 'flex';
            if (elements.resultsCount) elements.resultsCount.textContent = '0 charms found';
            return;
        }

        if (elements.charmsGrid) elements.charmsGrid.style.display = '';
        if (elements.emptyState) elements.emptyState.style.display = 'none';
        if (elements.resultsCount) elements.resultsCount.textContent = `${filteredCharms.length} charm${filteredCharms.length !== 1 ? 's' : ''} found`;

        // Set grid or list class
        if (elements.charmsGrid) {
            elements.charmsGrid.className = currentView === 'list' ? 'cosmetics-grid charms-grid list-view' : 'cosmetics-grid charms-grid';
            elements.charmsGrid.innerHTML = filteredCharms.map(charm => createCharmCard(charm)).join('');
            attachHeatEmojiHandlers();
            highlightUserVotes();
        }
    }

    /**
     * Get charm detail page URL (supports SSG clean URLs)
     */
    function getCharmDetailUrl(slug) {
        return `/charms/${slug}/`;
    }

    /**
     * Create charm card HTML — simplified with rarity border and neon name pill
     */
    function createCharmCard(charm) {
        const imageUrl = charm.icon_path 
            ? (charm.icon_path.startsWith('http') ? charm.icon_path : `${API_BASE}${charm.icon_path}`)
            : '';
        const lowResUrl = charm.icon_path_low 
            ? (charm.icon_path_low.startsWith('http') ? charm.icon_path_low : `${API_BASE}${charm.icon_path_low}`)
            : imageUrl;
        const unavailableAttr  = charm.is_available === false ? ' data-unavailable' : '';
        const unavailableBadge = charm.is_available === false
            ? '<div class="cw-unavailable-badge">No Longer Available</div>' : '';
        const charmExpiry    = charm.available_until || null;
        const countdownBadge = charmExpiry
            ? `<div class="cw-countdown-badge" data-expiry="${charmExpiry}">\u23f1 &hellip;</div>` : '';

        return `
            <a href="${getCharmDetailUrl(charm.slug)}" class="cw-skin-card sticker-card-simple" data-rarity="${charm.rarity}"${unavailableAttr}>
                <div class="cw-skin-image">
                    ${imageUrl ? `
                        <img src="${lowResUrl}" 
                             data-full="${imageUrl}"
                             alt="${escapeHtml(charm.name)}" 
                             loading="lazy"
                             onload="this.onload=null; this.src=this.dataset.full">
                    ` : `
                        <div class="cw-skin-placeholder">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                    `}
                    ${unavailableBadge}${countdownBadge}
                </div>
                <div class="cw-skin-info">
                    <span class="sticker-name-pill">${escapeHtml(charm.name)}</span>
                </div>
                <div class="cw-heat-strip" data-slug="${charm.slug}">
                    <div class="cw-heat-fill"></div>
                    <div class="cw-heat-emojis">
                        <button class="cw-heat-emoji" data-rating="5" data-slug="${charm.slug}" title="Fire">
                            <span class="cw-emoji-icon">🔥</span>
                            <span class="cw-emoji-count" data-rating-count="5">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="4" data-slug="${charm.slug}" title="Love">
                            <span class="cw-emoji-icon">😍</span>
                            <span class="cw-emoji-count" data-rating-count="4">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="3" data-slug="${charm.slug}" title="Meh">
                            <span class="cw-emoji-icon">😐</span>
                            <span class="cw-emoji-count" data-rating-count="3">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="2" data-slug="${charm.slug}" title="Nah">
                            <span class="cw-emoji-icon">👎</span>
                            <span class="cw-emoji-count" data-rating-count="2">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="1" data-slug="${charm.slug}" title="Trash">
                            <span class="cw-emoji-icon">💩</span>
                            <span class="cw-emoji-count" data-rating-count="1">—</span>
                        </button>
                    </div>
                </div>
            </a>
        `;
    }

    /**
     * Update stats display
     */
    function updateStats() {
        const total = allCharms.length;
        const legendary = allCharms.filter(c => c.rarity === 'legendary').length;
        const limited = allCharms.filter(c => c.is_limited).length;

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
        
        const collections = [...new Set(allCharms.map(c => c.collection_name).filter(Boolean))];
        collections.sort();

        collections.forEach(collection => {
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

        if (currentFilters.rarity !== 'all') {
            tags.push({ label: `Rarity: ${capitalizeFirst(currentFilters.rarity)}`, filter: 'rarity' });
        }
        if (currentFilters.limited) {
            tags.push({ label: 'Limited Time Only', filter: 'limited' });
        }
        if (currentFilters.collection) {
            tags.push({ label: `Collection: ${currentFilters.collection}`, filter: 'collection' });
        }
        if (currentFilters.search) {
            tags.push({ label: `Search: "${currentFilters.search}"`, filter: 'search' });
        }

        if (tags.length === 0) {
            elements.activeFilters.style.display = 'none';
            return;
        }

        elements.activeFilters.style.display = 'flex';
        elements.activeFilterTags.innerHTML = tags.map(tag => `
            <button class="active-filter-tag" data-filter="${tag.filter}">
                ${tag.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `).join('');

        // Add click handlers for removing individual filters
        elements.activeFilterTags.querySelectorAll('.active-filter-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const filter = tag.dataset.filter;
                removeFilter(filter);
            });
        });
    }

    /**
     * Remove a specific filter
     */
    function removeFilter(filter) {
        switch (filter) {
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
            case 'search':
                currentFilters.search = '';
                if (elements.searchInput) elements.searchInput.value = '';
                break;
        }
        
        updateFilterPills();
        applyFilters();
    }

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

        updateFilterPills();
        applyFilters();
    }

    /**
     * Show error state
     */
    function showError() {
        if (!elements.loadingState) return;
        elements.loadingState.innerHTML = `
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Failed to load charms. Please try again later.</p>
        `;
    }

    /**
     * Format countdown to expiry
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

    /**
     * Capitalize first letter
     */
    function capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Escape HTML
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
     * Load community ratings for all charms
     */
    async function loadHeatRatings() {
        if (typeof CosmeticRatingsAPI === 'undefined') return;
        try {
            const result = await CosmeticRatingsAPI.getListRatings('charm', { limit: 200 });
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
                    const result = await CosmeticRatingsAPI.submitRating(slug, rating, 'charm');
                    if (result.success && result.data) {
                        ratingsMap[slug] = { slug, score_percent: result.data.score_percent, total_votes: result.data.total_votes, distribution: result.data.distribution };
                        updateStripData(strip, slug);
                    }
                }
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
