// Search functionality for MarathonDB
// Handles hero search and navbar search with autocomplete suggestions

(function() {
    'use strict';
    
    const API_BASE = 'https://helpbot.marathondb.gg';
    const SITE_BASE = '/marathon';
    const DEBOUNCE_DELAY = 150;
    const MIN_QUERY_LENGTH = 1;
    
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
    
    // Debounce utility
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
    
    // No longer needed - all URLs are absolute clean URLs now
    
    // Convert API URL to frontend URL
    function convertUrl(url) {
        if (!url) return '#';
        // Remove leading slash if present
        let cleanUrl = url.startsWith('/') ? url.substring(1) : url;
        // Convert API paths to clean SSG URLs
        const patterns = [
            { match: /^weapons\/(.+)$/, replace: SITE_BASE + '/weapons/$1/' },
            { match: /^runners\/(.+)$/, replace: SITE_BASE + '/runners/$1/' },
            { match: /^items\/(.+)$/, replace: SITE_BASE + '/items/$1/' },
            { match: /^cores\/(.+)$/, replace: SITE_BASE + '/cores/$1/' },
            { match: /^mods\/(.+)$/, replace: SITE_BASE + '/mods/$1/' },
            { match: /^factions\/(.+)$/, replace: SITE_BASE + '/contracts/' },
            { match: /^cosmetics\/weapons\/(.+)$/, replace: SITE_BASE + '/weapon-skins/$1/' },
            { match: /^cosmetics\/runners\/(.+)$/, replace: SITE_BASE + '/runner-skins/$1/' },
            { match: /^cosmetics\/charms\/(.+)$/, replace: SITE_BASE + '/charms/$1/' },
            { match: /^cosmetics\/emblems\/(.+)$/, replace: SITE_BASE + '/emblems/$1/' },
            { match: /^cosmetics\/backgrounds\/(.+)$/, replace: SITE_BASE + '/backgrounds/$1/' },
            { match: /^cosmetics\/stickers\/(.+)$/, replace: SITE_BASE + '/stickers/$1/' },
            { match: /^cosmetics\/(.+)$/, replace: SITE_BASE + '/runner-skins/$1/' }
        ];
        
        for (const pattern of patterns) {
            if (pattern.match.test(cleanUrl)) {
                return cleanUrl.replace(pattern.match, pattern.replace);
            }
        }
        
        return SITE_BASE + '/' + cleanUrl;
    }
    
    // Fetch suggestions from API
    async function fetchSuggestions(query) {
        if (query.length < MIN_QUERY_LENGTH) return [];
        
        try {
            const response = await fetch(`${API_BASE}/api/search/suggestions?q=${encodeURIComponent(query)}&limit=8`);
            const data = await response.json();
            return data.success ? data.suggestions : [];
        } catch (error) {
            console.warn('Search suggestions error:', error);
            return [];
        }
    }
    
    // Build suggestion item HTML
    function buildSuggestionHTML(suggestion) {
        const icon = typeIcons[suggestion.type] || typeIcons.item;
        const typeLabel = suggestion.category || suggestion.type;
        const url = convertUrl(suggestion.url);
        
        return `
            <a href="${url}" class="search-suggestion-item" data-url="${url}">
                <span class="search-suggestion-icon">${icon}</span>
                <span class="search-suggestion-name">${escapeHTML(suggestion.name)}</span>
                <span class="search-suggestion-type">${escapeHTML(typeLabel)}</span>
            </a>
        `;
    }
    
    // Escape HTML to prevent XSS
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // Initialize a search component
    function initSearchComponent(container, options = {}) {
        const input = container.querySelector('.search-input');
        const form = container.querySelector('.search-form');
        
        if (!input || !form) return;
        
        // Create suggestions dropdown
        let suggestionsEl = container.querySelector('.search-suggestions');
        if (!suggestionsEl) {
            suggestionsEl = document.createElement('div');
            suggestionsEl.className = 'search-suggestions';
            form.appendChild(suggestionsEl);
        }
        
        let selectedIndex = -1;
        let suggestions = [];
        
        // Handle input changes with debounce
        const handleInput = debounce(async (e) => {
            const query = e.target.value.trim();
            
            if (query.length < MIN_QUERY_LENGTH) {
                suggestionsEl.innerHTML = '';
                suggestionsEl.classList.remove('active');
                suggestions = [];
                selectedIndex = -1;
                return;
            }
            
            suggestions = await fetchSuggestions(query);
            
            if (suggestions.length > 0) {
                suggestionsEl.innerHTML = suggestions.map(buildSuggestionHTML).join('');
                suggestionsEl.classList.add('active');
            } else {
                suggestionsEl.innerHTML = '<div class="search-no-results">No results found</div>';
                suggestionsEl.classList.add('active');
            }
            selectedIndex = -1;
        }, DEBOUNCE_DELAY);
        
        input.addEventListener('input', handleInput);
        
        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            const items = suggestionsEl.querySelectorAll('.search-suggestion-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(items);
            } else if (e.key === 'Enter' && selectedIndex >= 0 && items[selectedIndex]) {
                e.preventDefault();
                window.location.href = items[selectedIndex].dataset.url;
            } else if (e.key === 'Escape') {
                suggestionsEl.classList.remove('active');
                selectedIndex = -1;
                if (options.onEscape) options.onEscape();
            }
        });
        
        function updateSelection(items) {
            items.forEach((item, i) => {
                item.classList.toggle('selected', i === selectedIndex);
            });
        }
        
        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                suggestionsEl.classList.remove('active');
                selectedIndex = -1;
            }
        });
        
        // Focus shows suggestions if there's content
        input.addEventListener('focus', () => {
            if (suggestions.length > 0) {
                suggestionsEl.classList.add('active');
            }
        });
        
        // Form submission - go to search results page
        form.addEventListener('submit', (e) => {
            const query = input.value.trim();
            if (query.length < 2) {
                e.preventDefault();
                return;
            }
            // Redirect to search page
            e.preventDefault();
            window.location.href = `/pages/search.html?q=${encodeURIComponent(query)}`;
        });
    }
    
    // Initialize navbar search toggle
    function initNavbarSearch() {
        const navSearchToggle = document.getElementById('navSearchToggle');
        const navSearchOverlay = document.getElementById('navSearchOverlay');
        const navSearchClose = document.getElementById('navSearchClose');
        const navSearchInput = document.querySelector('.nav-search-input');
        
        if (!navSearchToggle || !navSearchOverlay) return;
        
        // Open search
        navSearchToggle.addEventListener('click', () => {
            navSearchOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => navSearchInput?.focus(), 100);
        });
        
        // Close search
        function closeNavSearch() {
            navSearchOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        navSearchClose?.addEventListener('click', closeNavSearch);
        
        navSearchOverlay.addEventListener('click', (e) => {
            if (e.target === navSearchOverlay) {
                closeNavSearch();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navSearchOverlay.classList.contains('active')) {
                closeNavSearch();
            }
            // Cmd/Ctrl + K to open search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (navSearchOverlay.classList.contains('active')) {
                    closeNavSearch();
                } else {
                    navSearchToggle.click();
                }
            }
        });
        
        // Initialize the search component in the overlay
        const navSearchContainer = navSearchOverlay.querySelector('.nav-search-container');
        if (navSearchContainer) {
            initSearchComponent(navSearchContainer, {
                onEscape: closeNavSearch
            });
        }
    }
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize hero search
        const heroSearch = document.querySelector('.hero-search');
        if (heroSearch) {
            initSearchComponent(heroSearch);
        }
        
        // Initialize navbar search
        initNavbarSearch();
    });
})();
