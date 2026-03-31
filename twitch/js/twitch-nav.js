/**
 * gdb.gg - Twitch Sub-Navigation
 * Injects platform-specific navigation for Twitch pages
 */

(function() {
    'use strict';

    // Platform icons (synced with /assets/icons/)
    const ICONS = {
        home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
        twitch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
        steam: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/></svg>',
        xbox: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 5.425c-1.888-1.125-4.106-1.922-6.473-2.249l-0.092-0.010c-0.070-0.005-0.152-0.008-0.234-0.008-0.613 0-1.188 0.16-1.687 0.441l0.017-0.009c2.357-1.634 5.277-2.61 8.426-2.61 0.008 0 0.016 0 0.024 0h0.019c0.005 0 0.011 0 0.018 0 3.157 0 6.086 0.976 8.501 2.642l-0.050-0.033c-0.478-0.272-1.051-0.433-1.662-0.433-0.085 0-0.169 0.003-0.252 0.009l0.011-0.001c-2.459 0.336-4.677 1.13-6.648 2.297l0.082-0.045zM5.554 5.268c-0.041 0.014-0.077 0.032-0.11 0.054l0.002-0.001c-2.758 2.723-4.466 6.504-4.466 10.684 0 3.584 1.256 6.875 3.353 9.457l-0.022-0.028c-1.754-3.261 4.48-12.455 7.61-16.159-3.53-3.521-5.277-4.062-6.015-4.062-0.010-0-0.021-0.001-0.032-0.001-0.115 0-0.225 0.021-0.326 0.060l0.006-0.002zM20.083 9.275c3.129 3.706 9.367 12.908 7.605 16.161 2.075-2.554 3.332-5.845 3.332-9.43 0-4.181-1.709-7.962-4.467-10.684l-0.002-0.002c-0.029-0.021-0.063-0.039-0.1-0.052l-0.003-0.001c-0.1-0.036-0.216-0.056-0.336-0.056-0.005 0-0.011 0-0.016 0h0.001c-0.741-0-2.485 0.543-6.014 4.063zM6.114 27.306c2.627 2.306 6.093 3.714 9.888 3.714s7.261-1.407 9.905-3.728l-0.017 0.015c2.349-2.393-5.402-10.901-9.89-14.29-4.483 3.39-12.24 11.897-9.886 14.29z"/></svg>',
        fortnite: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m15.767 14.171.097-5.05H12.4V5.197h3.99L16.872 0H7.128v24l5.271-.985V14.17z"/></svg>',
        leaderboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
        categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
        more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>'
    };

    // Detect active page based on current URL
    function getActivePage() {
        const path = window.location.pathname.toLowerCase();
        const page = path.split('/').pop().replace('.html', '') || 'index';
        
        if (path.includes('leaderboards')) return 'leaderboards';
        if (path.includes('categories') && !path.includes('category.html')) return 'categories';
        if (path.includes('category.html')) return 'category';
        if (path.includes('profile')) return 'profile';
        if (path.includes('index') || path.endsWith('/twitch/') || path.endsWith('/twitch')) return 'home';
        
        return page;
    }

    // Generate sub-nav HTML (desktop)
    function generateTwitchSubNav() {
        const activePage = getActivePage();
        
        return `
        <nav class="twitch-sub-nav">
            <div class="twitch-sub-nav-inner">
                <div class="twitch-sub-nav-left">
                    <div class="twitch-sub-nav-brand-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                        </svg>
                    </div>
                </div>
                <div class="twitch-sub-nav-center">
                    <div class="twitch-sub-nav-search">
                        <select id="nav-search-type" class="nav-search-type">
                            <option value="creators">Creators</option>
                            <option value="categories">Categories</option>
                        </select>
                        <input type="text" id="nav-search-input" placeholder="Search creators or categories..." />
                        <button id="nav-search-btn" class="nav-search-btn" aria-label="Search">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </button>
                    </div>
                    <div id="nav-search-results" class="nav-search-results"></div>
                </div>
                <div class="twitch-sub-nav-right">
                    <div class="twitch-sub-nav-links">
                        <a href="/twitch/" class="${activePage === 'home' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            <span>Home</span>
                        </a>
                        <a href="/twitch/leaderboards.html" class="${activePage === 'leaderboards' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            <span>Leaderboards</span>
                        </a>
                        <a href="/twitch/categories.html" class="${activePage === 'categories' || activePage === 'category' ? 'active' : ''}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                            <span>Categories</span>
                        </a>
                    </div>
                </div>
            </div>
        </nav>
        `;
    }

    // Generate mobile bottom nav HTML
    function generateMobileNav() {
        const activePage = getActivePage();
        
        return `
        <nav class="twitch-mobile-nav">
            <a href="/twitch/" class="${activePage === 'home' ? 'active' : ''}">
                ${ICONS.twitch}
                <span>Home</span>
            </a>
            <a href="/twitch/leaderboards.html" class="${activePage === 'leaderboards' ? 'active' : ''}">
                ${ICONS.leaderboard}
                <span>Ranks</span>
            </a>
            <a href="/twitch/categories.html" class="${activePage === 'categories' || activePage === 'category' ? 'active' : ''}">
                ${ICONS.categories}
                <span>Games</span>
            </a>
            <button class="twitch-more-btn" aria-label="More platforms">
                ${ICONS.more}
                <span>More</span>
            </button>
        </nav>
        
        <div class="twitch-more-overlay"></div>
        
        <div class="twitch-more-menu">
            <div class="twitch-more-menu-title">Other Platforms</div>
            <div class="twitch-more-menu-grid">
                <a href="/" class="nav-home">
                    ${ICONS.home}
                    <span>Home</span>
                </a>
                <a href="/steam/" class="nav-steam">
                    ${ICONS.steam}
                    <span>Steam</span>
                </a>
                <a href="/xbox/" class="nav-xbox">
                    ${ICONS.xbox}
                    <span>Xbox</span>
                </a>
                <a href="/fortnite/" class="nav-fortnite">
                    ${ICONS.fortnite}
                    <span>Fortnite</span>
                </a>
            </div>
        </div>
        `;
    }

    // Search functionality
    function setupNavSearch() {
        const searchInput = document.getElementById('nav-search-input');
        const searchBtn = document.getElementById('nav-search-btn');
        const searchResults = document.getElementById('nav-search-results');
        const searchType = document.getElementById('nav-search-type');
        
        if (!searchInput || !searchResults) return;
        
        const performSearch = async () => {
            const query = searchInput.value.trim();
            if (!query) {
                searchResults.innerHTML = '';
                searchResults.classList.remove('active');
                return;
            }
            
            const isCreatorSearch = searchType.value === 'creators';
            
            try {
                searchResults.innerHTML = '<div class="nav-search-loading">Searching...</div>';
                searchResults.classList.add('active');
                
                const endpoint = isCreatorSearch 
                    ? `https://twitch.gdb.gg/api/v2/creators/search?query=${encodeURIComponent(query)}&limit=8`
                    : `https://twitch.gdb.gg/api/v2/search/categories?query=${encodeURIComponent(query)}&limit=8`;
                
                const response = await fetch(endpoint);
                if (!response.ok) throw new Error('Search failed');
                
                const data = await response.json();
                
                if (isCreatorSearch && data.creators && data.creators.length > 0) {
                    searchResults.innerHTML = data.creators.map(creator => `
                        <a href="/twitch/profile.html?username=${creator.login}" class="nav-search-result">
                            <img src="${creator.profile_image_url}" alt="${creator.display_name}" />
                            <div class="nav-search-result-info">
                                <div class="nav-search-result-name">${creator.display_name}</div>
                                ${creator.is_live ? '<span class="nav-search-live">LIVE</span>' : ''}
                            </div>
                        </a>
                    `).join('');
                } else if (!isCreatorSearch && data.categories && data.categories.length > 0) {
                    searchResults.innerHTML = data.categories.map(category => `
                        <a href="/twitch/category.html?id=${category.id}&name=${encodeURIComponent(category.name)}" class="nav-search-result">
                            <img src="${category.box_art_url.replace('{width}', '52').replace('{height}', '72')}" alt="${category.name}" />
                            <div class="nav-search-result-info">
                                <div class="nav-search-result-name">${category.name}</div>
                            </div>
                        </a>
                    `).join('');
                } else {
                    searchResults.innerHTML = '<div class="nav-search-empty">No results found</div>';
                }
            } catch (error) {
                console.error('Search error:', error);
                searchResults.innerHTML = '<div class="nav-search-empty">Search failed</div>';
            }
        };
        
        searchInput.addEventListener('input', () => {
            if (!searchInput.value.trim()) {
                searchResults.innerHTML = '';
                searchResults.classList.remove('active');
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        
        searchBtn.addEventListener('click', performSearch);
        
        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.twitch-sub-nav-search')) {
                searchResults.classList.remove('active');
            }
        });
    }
    
    // Initialize the sub-nav
    function initTwitchSubNav() {
        const container = document.getElementById('twitch-sub-nav');
        if (container) {
            container.innerHTML = generateTwitchSubNav() + generateMobileNav();
            
            // Setup search
            setupNavSearch();
            
            // Setup more menu toggle
            const moreBtn = container.querySelector('.twitch-more-btn');
            const moreMenu = container.querySelector('.twitch-more-menu');
            const moreOverlay = container.querySelector('.twitch-more-overlay');
            
            function toggleMoreMenu() {
                moreMenu.classList.toggle('active');
                moreOverlay.classList.toggle('active');
            }
            
            function closeMoreMenu() {
                moreMenu.classList.remove('active');
                moreOverlay.classList.remove('active');
            }
            
            if (moreBtn) {
                moreBtn.addEventListener('click', toggleMoreMenu);
            }
            
            if (moreOverlay) {
                moreOverlay.addEventListener('click', closeMoreMenu);
            }
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTwitchSubNav);
    } else {
        initTwitchSubNav();
    }
})();
