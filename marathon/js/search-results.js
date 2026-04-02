// Search Results Page JavaScript
// Handles full search results display and filtering

(function() {
    'use strict';
    
    const API_BASE = 'https://helpbot.marathondb.gg';
    const SITE_BASE = '/marathon';
    
    // Type icons for search results
    const typeIcons = {
        weapon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12L18 8M22 12L18 16M22 12H6M6 12L2 8M6 12L2 16"/><circle cx="12" cy="12" r="3"/></svg>`,
        runner: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="5" r="3"/><path d="M12 8v4l3 3M12 12l-3 3M9 21l3-6 3 6M6 15h12"/></svg>`,
        item: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a4 4 0 018 0v2"/></svg>`,
        core: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/><circle cx="12" cy="12" r="3"/></svg>`,
        cosmetic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/></svg>`,
        faction: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
        map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
        mod: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4"/></svg>`
    };
    
    // Rarity colors
    const rarityColors = {
        common: '#9e9e9e',
        uncommon: '#4caf50',
        rare: '#2196f3',
        epic: '#9c27b0',
        legendary: '#ff9800',
        exotic: '#ffd700'
    };
    
    let currentQuery = '';
    let currentType = 'all';
    let allResults = [];
    
    // Convert API URL to frontend URL
    function convertUrl(url) {
        if (!url) return '#';
        // Remove leading slash if present
        let cleanUrl = url.startsWith('/') ? url.substring(1) : url;
        
        const patterns = [
            { match: /^weapons\/(.+)$/, replace: SITE_BASE + '/weapons/$1/' },
            { match: /^runners\/(.+)$/, replace: SITE_BASE + '/runners/$1/' },
            { match: /^items\/(.+)$/, replace: SITE_BASE + '/items/$1/' },
            { match: /^cores\/(.+)$/, replace: SITE_BASE + '/cores/$1/' },
            { match: /^mods\/(.+)$/, replace: SITE_BASE + '/mods/$1/' },
            { match: /^factions\/(.+)$/, replace: SITE_BASE + '/contracts/' },
            { match: /^cosmetics\/weapons\/(.+)$/, replace: SITE_BASE + '/weapon-skins/$1/' },
            { match: /^cosmetics\/runners\/(.+)$/, replace: SITE_BASE + '/runner-skins/?skin=$1' },
            { match: /^cosmetics\/charms\/(.+)$/, replace: SITE_BASE + '/charms/$1/' },
            { match: /^cosmetics\/emblems\/(.+)$/, replace: SITE_BASE + '/emblems/$1/' },
            { match: /^cosmetics\/backgrounds\/(.+)$/, replace: SITE_BASE + '/backgrounds/$1/' },
            { match: /^cosmetics\/stickers\/(.+)$/, replace: SITE_BASE + '/stickers/$1/' },
            { match: /^cosmetics\/(.+)$/, replace: SITE_BASE + '/runner-skins/?skin=$1' }
        ];
        
        for (const pattern of patterns) {
            if (pattern.match.test(cleanUrl)) {
                return cleanUrl.replace(pattern.match, pattern.replace);
            }
        }
        
        return SITE_BASE + '/' + cleanUrl;
    }
    
    // Get query from URL
    function getQueryFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('q') || '';
    }
    
    // Fetch search results
    async function fetchResults(query, type = 'all') {
        const typeParam = type !== 'all' ? `&type=${type}` : '';
        try {
            const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=100${typeParam}`);
            const data = await response.json();
            return data.success ? data : { data: [], total: 0, types_found: [] };
        } catch (error) {
            console.error('Search error:', error);
            return { data: [], total: 0, types_found: [] };
        }
    }
    
    // Build result card HTML
    function buildResultCard(result) {
        const icon = typeIcons[result.type] || typeIcons.item;
        const typeLabel = result.category || result.type;
        const rarityStyle = result.rarity ? `border-left: 3px solid ${rarityColors[result.rarity] || rarityColors.common}` : '';
        
        // Convert API URL to frontend page URL
        const url = convertUrl(result.url);
        
        return `
            <a href="${url}" class="search-result-card" style="${rarityStyle}">
                <div class="search-result-icon">${icon}</div>
                <div class="search-result-content">
                    <h3 class="search-result-name">${escapeHTML(result.name)}</h3>
                    ${result.description ? `<p class="search-result-desc">${escapeHTML(truncate(result.description, 100))}</p>` : ''}
                    <div class="search-result-meta">
                        <span class="search-result-type">${escapeHTML(typeLabel)}</span>
                        ${result.rarity ? `<span class="search-result-rarity" style="color: ${rarityColors[result.rarity]}">${result.rarity}</span>` : ''}
                    </div>
                </div>
            </a>
        `;
    }
    
    // Escape HTML
    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // Truncate text
    function truncate(str, len) {
        if (!str) return '';
        return str.length > len ? str.substring(0, len) + '...' : str;
    }
    
    // Render results
    function renderResults(results) {
        const container = document.getElementById('searchResults');
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <h3>No results found</h3>
                    <p>Try searching for something else</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = results.map(buildResultCard).join('');
    }
    
    // Update stats
    function updateStats(total, typesFound) {
        const statsEl = document.getElementById('searchStats');
        if (total === 0) {
            statsEl.innerHTML = '';
            return;
        }
        
        const typesText = typesFound.length > 0 
            ? ` in ${typesFound.join(', ')}`
            : '';
        
        statsEl.innerHTML = `Found <strong>${total}</strong> result${total !== 1 ? 's' : ''}${typesText}`;
    }
    
    // Update filter buttons with counts
    function updateFilters(grouped) {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            const type = btn.dataset.type;
            if (type === 'all') {
                const total = Object.values(grouped).reduce((sum, arr) => sum + (arr?.length || 0), 0);
                btn.textContent = `All (${total})`;
            } else if (grouped[type]) {
                btn.textContent = `${capitalize(type)}s (${grouped[type].length})`;
            }
        });
    }
    
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    // Perform search
    async function performSearch(query) {
        if (!query || query.length < 2) {
            document.getElementById('searchResults').innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <h3>Enter a search term</h3>
                    <p>Search for weapons, runners, items, and more</p>
                </div>
            `;
            return;
        }
        
        currentQuery = query;
        
        // Update UI
        document.getElementById('searchQuery').textContent = `Results for "${query}"`;
        document.getElementById('searchInput').value = query;
        document.title = `${query} - Search - MARATHON DB`;
        
        // Show loading
        document.getElementById('searchResults').innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Searching...</p>
            </div>
        `;
        
        // Fetch results
        const results = await fetchResults(query);
        allResults = results.data || [];
        
        // Update UI
        updateStats(results.total, results.types_found || []);
        updateFilters(results.grouped || {});
        
        // Filter and render
        filterAndRender();
    }
    
    // Filter and render based on current type
    function filterAndRender() {
        let filtered = allResults;
        if (currentType !== 'all') {
            filtered = allResults.filter(r => r.type === currentType);
        }
        renderResults(filtered);
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        const query = getQueryFromURL();
        
        // Set up search form
        const form = document.getElementById('searchForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const newQuery = document.getElementById('searchInput').value.trim();
            if (newQuery.length >= 2) {
                // Update URL without reload
                const url = new URL(window.location);
                url.searchParams.set('q', newQuery);
                window.history.pushState({}, '', url);
                performSearch(newQuery);
            }
        });
        
        // Set up filter buttons
        document.getElementById('searchFilters').addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentType = e.target.dataset.type;
                filterAndRender();
            }
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            performSearch(getQueryFromURL());
        });
        
        // Initial search
        if (query) {
            performSearch(query);
        }
    });
})();
