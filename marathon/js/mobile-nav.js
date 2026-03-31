// Navbar shrink-on-scroll
(function() {
    'use strict';
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;
    var ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                navbar.classList.toggle('navbar--scrolled', window.scrollY > 40);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
})();

// Mobile Navigation Component
// Dynamically injects mobile bottom navigation into pages

(function() {
    'use strict';

    /** gdb.gg hosts Marathon under /marathon/ */
    var RNK_MARATHON_BASE = '/marathon';

    function pathForSection() {
        var p = window.location.pathname;
        if (p === RNK_MARATHON_BASE || p === RNK_MARATHON_BASE + '/') return '/';
        if (p.startsWith(RNK_MARATHON_BASE + '/')) return p.slice(RNK_MARATHON_BASE.length) || '/';
        return p;
    }
    
    // Only run on mobile-sized screens
    const isMobileSize = () => window.innerWidth <= 900;
    
    // Determine current page section for active state
    function getCurrentSection() {
        const path = pathForSection();
        if (path === '/' || path === '/index.html') return 'home';
        if (path.startsWith('/weapons') && !path.startsWith('/weapon-skins')) return 'weapons';
        if (path.startsWith('/runners') && !path.startsWith('/runner-skins')) return 'runners';
        if (path.startsWith('/weapon-skins') || path.startsWith('/runner-skins') || path.startsWith('/emblems') || path.startsWith('/backgrounds') || path.startsWith('/charms') || path.startsWith('/stickers')) return 'skins';
        if (path.startsWith('/loadouts')) return 'loadouts';
        return '';
    }
    
    // Generate mobile navigation HTML
    function getMobileNavHTML() {
        const section = getCurrentSection();
        
        return `
    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav" id="mobileBottomNav">
        <div class="mobile-nav-items">
            <a href="/marathon/" class="mobile-nav-item ${section === 'home' ? 'active' : ''}">
                <span class="mobile-nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                </span>
                <span class="mobile-nav-label">HOME</span>
            </a>
            <a href="/marathon/weapons/" class="mobile-nav-item ${section === 'weapons' ? 'active' : ''}">
                <span class="mobile-nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                    </svg>
                </span>
                <span class="mobile-nav-label">WEAPONS</span>
            </a>
            <a href="/marathon/runners/" class="mobile-nav-item ${section === 'runners' ? 'active' : ''}">
                <span class="mobile-nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="4" r="2"/>
                        <path d="M15 9l-3-1-3 1"/>
                        <path d="M9 9v3l-3 4"/>
                        <path d="M15 9v3l3 4"/>
                        <path d="M9 12h6"/>
                        <path d="M10 22l2-7 2 7"/>
                    </svg>
                </span>
                <span class="mobile-nav-label">RUNNERS</span>
            </a>
            <button class="mobile-nav-item ${section === 'skins' ? 'active' : ''}" id="mobileSkinsBtn">
                <span class="mobile-nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                        <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none"/>
                        <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none"/>
                    </svg>
                </span>
                <span class="mobile-nav-label">SKINS</span>
            </button>
            <button class="mobile-nav-item" id="mobileMoreBtn">
                <span class="mobile-nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="19" cy="12" r="1"/>
                        <circle cx="5" cy="12" r="1"/>
                    </svg>
                </span>
                <span class="mobile-nav-label">MORE</span>
            </button>
        </div>
    </nav>

    <!-- Mobile Skins Menu -->
    <div class="mobile-menu-backdrop mobile-skins-backdrop" id="mobileSkinsBackdrop"></div>
    <div class="mobile-more-menu mobile-skins-menu" id="mobileSkinsMenu">
        <div class="mobile-more-section">
            <div class="mobile-more-section-title">Cosmetics</div>
            <div class="mobile-more-grid">
                <a href="/marathon/weapon-skins/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/>
                        <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>
                    </svg>
                    <span>Weapon Skins</span>
                </a>
                <a href="/marathon/runner-skins/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="8" r="5"/>
                        <path d="M20 21a8 8 0 1 0-16 0"/>
                    </svg>
                    <span>Runner Skins</span>
                </a>
                <a href="/marathon/emblems/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
                    </svg>
                    <span>Emblems</span>
                </a>
                <a href="/marathon/backgrounds/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M3 9h18"/>
                    </svg>
                    <span>Backgrounds</span>
                </a>
                <a href="/marathon/charms/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                    </svg>
                    <span>Charms</span>
                </a>
                <a href="/marathon/stickers/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                    </svg>
                    <span>Stickers</span>
                </a>
            </div>
        </div>
    </div>

    <!-- Mobile More Menu -->
    <div class="mobile-menu-backdrop" id="mobileMenuBackdrop"></div>
    <div class="mobile-more-menu" id="mobileMoreMenu">
        <div id="mobileAuthSection"></div>
        <div class="mobile-more-section">
            <div class="mobile-more-section-title">Database</div>
            <div class="mobile-more-grid">
                <a href="/marathon/cores/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                    </svg>
                    <span>Cores</span>
                </a>
                <a href="/marathon/implants/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2a10 10 0 1 0 10 10"/>
                        <path d="M12 2v10l7-7"/>
                    </svg>
                    <span>Implants</span>
                </a>
                <a href="/marathon/mods/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    </svg>
                    <span>Mods</span>
                </a>
                <a href="/marathon/items/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                    <span>Items</span>
                </a>
                <a href="/marathon/contracts/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                        <path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
                    </svg>
                    <span>Contracts</span>
                </a>
                <a href="/marathon/factions/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>Factions</span>
                </a>
            </div>
        </div>
        <div class="mobile-more-section">
            <div class="mobile-more-section-title">Tools</div>
            <div class="mobile-more-grid">
                <a href="/marathon/loadout-builder/" class="mobile-more-item" style="${section === 'loadouts' ? 'border-color: var(--neon); color: var(--neon);' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    <span>Loadouts</span>
                </a>
                <a href="/marathon/tier-lists/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3h18"/><path d="M3 9h14"/><path d="M3 15h10"/><path d="M3 21h6"/>
                    </svg>
                    <span>Tier Lists</span>
                </a>
            </div>
        </div>
        <div class="mobile-more-section">
            <div class="mobile-more-section-title">Community</div>
            <div class="mobile-more-grid">
                <a href="/marathon/news/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
                    </svg>
                    <span>News</span>
                </a>
                <a href="/marathon/population/" class="mobile-more-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
                    </svg>
                    <span>Population</span>
                </a>
            </div>
        </div>
    </div>`;
    }
    
    // Initialize mobile navigation
    function initMobileNav() {
        // Check if mobile nav already exists
        if (document.getElementById('mobileBottomNav')) {
            return;
        }
        
        // Insert mobile nav HTML before closing body tag
        document.body.insertAdjacentHTML('beforeend', getMobileNavHTML());
        
        // Set up event listeners
        const moreBtn = document.getElementById('mobileMoreBtn');
        const moreMenu = document.getElementById('mobileMoreMenu');
        const backdrop = document.getElementById('mobileMenuBackdrop');
        const skinsBtn = document.getElementById('mobileSkinsBtn');
        const skinsMenu = document.getElementById('mobileSkinsMenu');
        const skinsBackdrop = document.getElementById('mobileSkinsBackdrop');

        // Helper: close all menus
        function closeAllMenus() {
            if (moreMenu) moreMenu.classList.remove('active');
            if (backdrop) backdrop.classList.remove('active');
            if (skinsMenu) skinsMenu.classList.remove('active');
            if (skinsBackdrop) skinsBackdrop.classList.remove('active');
        }
        
        if (moreBtn && moreMenu && backdrop) {
            moreBtn.addEventListener('click', () => {
                const wasActive = moreMenu.classList.contains('active');
                closeAllMenus();
                if (!wasActive) {
                    moreMenu.classList.add('active');
                    backdrop.classList.add('active');
                }
            });
            
            backdrop.addEventListener('click', closeAllMenus);
        }

        if (skinsBtn && skinsMenu && skinsBackdrop) {
            skinsBtn.addEventListener('click', () => {
                const wasActive = skinsMenu.classList.contains('active');
                closeAllMenus();
                if (!wasActive) {
                    skinsMenu.classList.add('active');
                    skinsBackdrop.classList.add('active');
                }
            });

            skinsBackdrop.addEventListener('click', closeAllMenus);
        }

        // Close menus on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllMenus();
            }
        });
    }
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
})();
