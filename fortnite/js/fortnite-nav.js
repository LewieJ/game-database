/**
 * gdb.gg - Fortnite Sub-Navigation
 * Injects platform-specific navigation for Fortnite pages
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
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
        leaderboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
        shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>',
        metrics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>',
        trophy: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C13.1 2 14 2.9 14 4V5H19C19.55 5 20 5.45 20 6V9C20 11.21 18.21 13 16 13H15.72C15.37 14.39 14.34 15.5 13 15.86V18H15C15.55 18 16 18.45 16 19V21C16 21.55 15.55 22 15 22H9C8.45 22 8 21.55 8 21V19C8 18.45 8.45 18 9 18H11V15.86C9.66 15.5 8.63 14.39 8.28 13H8C5.79 13 4 11.21 4 9V6C4 5.45 4.45 5 5 5H10V4C10 2.9 10.9 2 12 2ZM6 7V9C6 10.1 6.9 11 8 11H8.28C8.63 9.61 9.66 8.5 11 8.14V7H6ZM18 7H13V8.14C14.34 8.5 15.37 9.61 15.72 11H16C17.1 11 18 10.1 18 9V7Z"/></svg>',
        playlists: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        streams: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
        updates: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
        feedback: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
        more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>'
    };

    // Detect active page based on current URL
    function getActivePage() {
        const path = window.location.pathname.toLowerCase();
        
        if (path.includes('leaderboards')) return 'leaderboards';
        if (path.includes('event')) return 'competitive';
        if (path.includes('shop')) return 'shop';
        if (path.includes('playlists')) return 'playlists';
        if (path.includes('streams')) return 'streams';
        if (path.includes('profile-pro')) return 'profile-pro';
        if (path.includes('profile')) return 'profile';
        if (path.includes('index') || path.endsWith('/fortnite/') || path.endsWith('/fortnite')) return 'search';
        
        return 'search';
    }

    // Generate sub-nav HTML (desktop)
    function generateFortniteSubNav() {
        const activePage = getActivePage();
        
        return `
        <nav class="fortnite-sub-nav">
            <div class="fortnite-sub-nav-inner">
                <div class="fortnite-sub-nav-left">
                    <div class="fortnite-status-rings" id="fortniteStatusRings">
                        <div class="status-ring-wrapper" id="ccuRingWrapper" style="display: none;">
                            <svg class="status-ring" viewBox="0 0 36 36">
                                <circle class="status-ring-bg" cx="18" cy="18" r="14" fill="none"/>
                                <circle class="status-ring-fill" id="ccuRingFill" cx="18" cy="18" r="14" fill="none" stroke-dasharray="0 100"/>
                            </svg>
                            <div class="status-ring-tooltip" id="ccuTooltip">Loading...</div>
                        </div>
                        <div class="status-ring-wrapper" id="twitchRingWrapper" style="display: none;">
                            <svg class="status-ring" viewBox="0 0 36 36">
                                <circle class="status-ring-bg twitch" cx="18" cy="18" r="14" fill="none"/>
                                <circle class="status-ring-fill twitch" id="twitchRingFill" cx="18" cy="18" r="14" fill="none" stroke-dasharray="0 100"/>
                            </svg>
                            <div class="status-ring-tooltip twitch" id="twitchTooltip">Loading...</div>
                        </div>
                    </div>
                </div>
                <div class="fortnite-sub-nav-right">
                    <div class="fortnite-sub-nav-links">
                        <div class="fortnite-nav-search-wrapper" id="fortniteNavSearchWrapper">
                            <button class="fortnite-nav-search-trigger ${activePage === 'search' || activePage === 'profile' ? 'active' : ''}" id="fortniteNavSearchTrigger">
                                ${ICONS.search}
                                <span>Player Search</span>
                            </button>
                            <div class="fortnite-nav-search-expanded" id="fortniteNavSearchExpanded">
                                <form class="fortnite-nav-search-form" id="fortniteNavSearchForm">
                                    <input type="text" 
                                           class="fortnite-nav-search-input" 
                                           id="fortniteNavSearchInput" 
                                           placeholder="Enter Epic username..." 
                                           autocomplete="off"
                                           spellcheck="false">
                                    <button type="submit" class="fortnite-nav-search-submit" id="fortniteNavSearchSubmit">
                                        ${ICONS.search}
                                    </button>
                                    <button type="button" class="fortnite-nav-search-close" id="fortniteNavSearchClose">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </form>
                                <div class="fortnite-nav-autocomplete" id="fortniteNavAutocomplete"></div>
                            </div>
                        </div>
                        <a href="/fortnite/leaderboards.html" class="${activePage === 'leaderboards' ? 'active' : ''}">
                            ${ICONS.leaderboard}
                            <span>Leaderboards</span>
                        </a>
                        <a href="/fortnite/events.html" class="${activePage === 'competitive' ? 'active' : ''}">
                            ${ICONS.trophy}
                            <span>Competitive Events</span>
                        </a>
                        <a href="/fortnite/shop.html" class="${activePage === 'shop' ? 'active' : ''}">
                            ${ICONS.shop}
                            <span>Item Shop</span>
                        </a>
                        <a href="/fortnite/playlists.html" class="${activePage === 'playlists' ? 'active' : ''}">
                            ${ICONS.playlists}
                            <span>Playlists</span>
                        </a>
                        <a href="/fortnite/streams.html" class="${activePage === 'streams' ? 'active' : ''}">
                            ${ICONS.streams}
                            <span>Streams</span>
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
        <nav class="fortnite-mobile-nav">
            <a href="/fortnite/" class="${activePage === 'search' || activePage === 'profile' ? 'active' : ''}">
                ${ICONS.fortnite}
                <span>Search</span>
            </a>
            <a href="/fortnite/leaderboards.html" class="${activePage === 'leaderboards' ? 'active' : ''}">
                ${ICONS.leaderboard}
                <span>Ranks</span>
            </a>
            <a href="/fortnite/shop.html" class="${activePage === 'shop' ? 'active' : ''}">
                ${ICONS.shop}
                <span>Shop</span>
            </a>
            <button class="fortnite-more-btn" aria-label="More options">
                ${ICONS.more}
                <span>More</span>
            </button>
        </nav>
        
        <div class="fortnite-more-overlay"></div>
        
        <div class="fortnite-more-menu">
            <div class="fortnite-more-menu-section">
                <div class="fortnite-more-menu-title">More Fortnite</div>
                <div class="fortnite-more-menu-grid">
                    <a href="/fortnite/playlists.html" class="${activePage === 'playlists' ? 'active' : ''}">
                        ${ICONS.playlists}
                        <span>Playlists</span>
                    </a>
                    <a href="/fortnite/streams.html" class="${activePage === 'streams' ? 'active' : ''}">
                        ${ICONS.streams}
                        <span>Streams</span>
                    </a>
                </div>
            </div>
            <div class="fortnite-more-menu-section">
                <div class="fortnite-more-menu-title">Other Platforms</div>
                <div class="fortnite-more-menu-grid">
                    <a href="/" class="nav-home">
                        ${ICONS.home}
                        <span>Home</span>
                    </a>
                    <a href="/twitch/" class="nav-twitch">
                        ${ICONS.twitch}
                        <span>Twitch</span>
                    </a>
                    <a href="/steam/" class="nav-steam">
                        ${ICONS.steam}
                        <span>Steam</span>
                    </a>
                    <a href="/xbox/" class="nav-xbox">
                        ${ICONS.xbox}
                        <span>Xbox</span>
                    </a>
                </div>
            </div>
        </div>
        `;
    }

    // Initialize the sub-nav
    function initFortniteSubNav() {
        const container = document.getElementById('fortnite-sub-nav')
            || document.getElementById('fortnite-nav');
        if (container) {
            container.innerHTML = generateFortniteSubNav() + generateMobileNav();
            
            // Setup more menu toggle
            const moreBtn = container.querySelector('.fortnite-more-btn');
            const moreMenu = container.querySelector('.fortnite-more-menu');
            const moreOverlay = container.querySelector('.fortnite-more-overlay');
            
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
            
            // Close when clicking a link in the more menu
            const moreMenuLinks = moreMenu.querySelectorAll('a');
            moreMenuLinks.forEach(link => {
                link.addEventListener('click', closeMoreMenu);
            });
            
            // Setup feedback button
            const feedbackBtn = container.querySelector('#fortniteFeedbackBtn');
            if (feedbackBtn) {
                feedbackBtn.addEventListener('click', () => {
                    // Trigger the feedback widget's open function
                    const feedbackButton = document.getElementById('feedback-button');
                    if (feedbackButton) {
                        feedbackButton.click();
                    }
                });
            }

            // Setup nav search
            initNavSearch(container);

            // Initialize status rings
            initStatusRings();
        }
    }

    // Nav search functionality
    function initNavSearch(container) {
        const wrapper = container.querySelector('#fortniteNavSearchWrapper');
        const trigger = container.querySelector('#fortniteNavSearchTrigger');
        const expanded = container.querySelector('#fortniteNavSearchExpanded');
        const form = container.querySelector('#fortniteNavSearchForm');
        const input = container.querySelector('#fortniteNavSearchInput');
        const closeBtn = container.querySelector('#fortniteNavSearchClose');
        const submitBtn = container.querySelector('#fortniteNavSearchSubmit');
        const autocomplete = container.querySelector('#fortniteNavAutocomplete');

        if (!wrapper || !trigger || !expanded || !input || !autocomplete) return;

        let autocompleteItems = [];
        let selectedIndex = -1;
        let debounceTimer;
        /** Public Fortnite Worker — see /fortnite/docs/current-api/users.md */
        const FAPI_BASE = 'https://fapi.gdb.gg';

        function isLikelyEpicAccountId(q) {
            return /^[a-f0-9]{32}$/i.test((q || '').trim());
        }

        async function searchEpicAccountsByPrefix(username) {
            const u = (username || '').trim();
            if (!u) return [];
            const res = await fetch(
                FAPI_BASE + '/user/search?username=' + encodeURIComponent(u) + '&platform=epic'
            );
            if (res.status === 503 || res.status === 401) {
                throw new Error('Player search is temporarily unavailable. Try again later.');
            }
            if (!res.ok) {
                throw new Error('Search failed (' + res.status + ').');
            }
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }

        function pickSearchHit(hits, query) {
            if (!hits.length) return null;
            const q = (query || '').trim().toLowerCase();
            const exact = hits.find(function (h) {
                return (h.displayName || '').toLowerCase() === q;
            });
            if (exact) return exact;
            const preferExact = hits.find(function (h) {
                return (h.matchType || '').toLowerCase() === 'exact';
            });
            return preferExact || hits[0];
        }

        // Open search
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            wrapper.classList.add('expanded');
            setTimeout(() => input.focus(), 100);
        });

        // Close search
        function closeSearch() {
            wrapper.classList.remove('expanded');
            input.value = '';
            if (autocomplete) {
                autocomplete.innerHTML = '';
                autocomplete.classList.remove('active');
            }
            autocompleteItems = [];
            selectedIndex = -1;
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeSearch);
        }

        // Close on click outside (only while expanded — avoids touching DOM on every page click)
        document.addEventListener('click', (e) => {
            if (!wrapper.classList.contains('expanded')) return;
            if (!wrapper.contains(e.target)) {
                closeSearch();
            }
        });

        // Close on Escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSearch();
                return;
            }

            if (!autocomplete.classList.contains('active') || autocompleteItems.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, autocompleteItems.length - 1);
                updateSelectedItem();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelectedItem();
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                const item = autocompleteItems[selectedIndex];
                navigateToProfile(item.id, item.name);
            }
        });

        function updateSelectedItem() {
            const items = autocomplete.querySelectorAll('.fn-nav-ac-item');
            items.forEach((item, i) => {
                item.classList.toggle('selected', i === selectedIndex);
            });
            if (selectedIndex >= 0 && items[selectedIndex]) {
                items[selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        // Autocomplete (same API as fortnite-index.js — GET /user/search)
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchAutocomplete(input.value.trim());
            }, 280);
        });

        async function fetchAutocomplete(query) {
            if (!query || query.length < 2) {
                autocomplete.innerHTML = '';
                autocomplete.classList.remove('active');
                autocompleteItems = [];
                return;
            }

            try {
                const hits = await searchEpicAccountsByPrefix(query);
                autocompleteItems = hits.slice(0, 6).map(hit => ({
                    id: (hit.accountId || hit.account_id || '').trim(),
                    name: (hit.displayName || hit.display_name || query || '').trim()
                })).filter(item => item.id && item.name);

                if (autocompleteItems.length === 0) {
                    autocomplete.innerHTML = '<div class="fn-nav-ac-empty">No Epic players found</div>';
                    autocomplete.classList.add('active');
                    return;
                }

                autocomplete.innerHTML = autocompleteItems.map((item, i) => `
                    <div class="fn-nav-ac-item" data-id="${item.id}" data-name="${escapeHtml(item.name)}">
                        <span class="fn-nav-ac-name">${escapeHtml(item.name)}</span>
                    </div>
                `).join('');
                
                autocomplete.classList.add('active');
                selectedIndex = -1;

                autocomplete.querySelectorAll('.fn-nav-ac-item').forEach(el => {
                    el.addEventListener('click', () => {
                        navigateToProfile(el.dataset.id, el.dataset.name);
                    });
                });

            } catch (err) {
                console.error('Autocomplete error:', err);
                autocomplete.innerHTML = `<div class="fn-nav-ac-error">${escapeHtml(err.message || 'Search failed')}</div>`;
                autocomplete.classList.add('active');
                autocompleteItems = [];
                selectedIndex = -1;
            }
        }

        // Form submit (prefix search + best hit — same as fortnite homepage)
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = input.value.trim();
                if (!username) return;

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="fn-nav-loading"></span>';
                }

                try {
                    if (isLikelyEpicAccountId(username)) {
                        const id = username.trim().toLowerCase();
                        navigateToProfile(id, 'Player');
                        return;
                    }

                    const hits = await searchEpicAccountsByPrefix(username);
                    if (!hits.length) {
                        showNavSearchError('Player not found');
                        return;
                    }

                    const hit = pickSearchHit(hits, username);
                    const accountId = (hit.accountId || hit.account_id || '').trim();
                    const displayName = hit.displayName || hit.display_name || username;
                    if (!accountId) throw new Error('Invalid response from user search');

                    navigateToProfile(accountId, displayName);

                } catch (err) {
                    showNavSearchError(err.message || 'Search failed. Try again.');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = ICONS.search;
                    }
                }
            });
        }

        function navigateToProfile(id, name) {
            const cleanId = (id || '').trim();
            if (!cleanId) return;
            window.location.href = `profile.html?id=${encodeURIComponent(cleanId)}&name=${encodeURIComponent(name)}&platform=Epic`;
        }

        function showNavSearchError(msg) {
            autocomplete.innerHTML = `<div class="fn-nav-ac-error">${escapeHtml(msg || 'Error')}</div>`;
            autocomplete.classList.add('active');
        }

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // Status ring data fetching and rendering
    async function initStatusRings() {
        loadCCURing();
        loadTwitchRing();
    }

    async function loadCCURing() {
        try {
            const res = await fetch('https://fortniteccu.gdb.gg/ccu/overview');
            if (!res.ok) return;
            const data = await res.json();
            
            const history = data.history_7d || [];
            if (!history.length) return;

            // Get current value
            const current = history[history.length - 1]?.total || 0;
            
            // Calculate 24h peak (last ~24 data points assuming hourly data, or filter by time)
            const now = Date.now();
            const dayAgo = now - 24 * 60 * 60 * 1000;
            const last24h = history.filter(point => {
                const pointTime = new Date(point.timestamp || point.time).getTime();
                return pointTime >= dayAgo;
            });
            
            const peak24h = Math.max(...(last24h.length ? last24h : history.slice(-24)).map(p => p.total || 0));
            const percentage = peak24h > 0 ? Math.min((current / peak24h) * 100, 100) : 0;

            // Update ring
            const wrapper = document.getElementById('ccuRingWrapper');
            const fill = document.getElementById('ccuRingFill');
            const tooltip = document.getElementById('ccuTooltip');
            
            if (wrapper && fill && tooltip) {
                wrapper.style.display = 'block';
                fill.style.strokeDasharray = `${percentage} ${100 - percentage}`;
                tooltip.innerHTML = `<strong>${formatNumber(current)}</strong> Online<br><span class="tooltip-sub">${Math.round(percentage)}% of 24h peak</span>`;
            }
        } catch (e) {
            console.error('CCU ring error:', e);
            // Hide on error
            const wrapper = document.getElementById('ccuRingWrapper');
            if (wrapper) wrapper.style.display = 'none';
        }
    }

    async function loadTwitchRing() {
        try {
            const res = await fetch('https://twitch.gdb.gg/api/v2/categories/33214/history-v2?range=7d');
            if (!res.ok) return;
            const data = await res.json();
            
            const history = data.timeseries || [];
            if (!history.length) return;

            // Get current value
            const current = history[history.length - 1]?.live_viewers || 0;
            
            // Calculate 24h peak
            const now = Date.now();
            const dayAgo = now - 24 * 60 * 60 * 1000;
            const last24h = history.filter(point => {
                const pointTime = new Date(point.timestamp || point.time).getTime();
                return pointTime >= dayAgo;
            });
            
            const peak24h = Math.max(...(last24h.length ? last24h : history.slice(-24)).map(p => p.live_viewers || 0));
            const percentage = peak24h > 0 ? Math.min((current / peak24h) * 100, 100) : 0;

            // Update ring
            const wrapper = document.getElementById('twitchRingWrapper');
            const fill = document.getElementById('twitchRingFill');
            const tooltip = document.getElementById('twitchTooltip');
            
            if (wrapper && fill && tooltip) {
                wrapper.style.display = 'block';
                fill.style.strokeDasharray = `${percentage} ${100 - percentage}`;
                tooltip.innerHTML = `<strong>${formatNumber(current)}</strong> Watching<br><span class="tooltip-sub">${Math.round(percentage)}% of 24h peak</span>`;
            }
        } catch (e) {
            console.error('Twitch ring error:', e);
            // Hide on error
            const wrapper = document.getElementById('twitchRingWrapper');
            if (wrapper) wrapper.style.display = 'none';
        }
    }

    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
        return num.toString();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFortniteSubNav);
    } else {
        initFortniteSubNav();
    }
})();
