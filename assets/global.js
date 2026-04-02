/* ============================================
   gdb.gg — Global JavaScript
   Master Navbar & Shared Components
   ============================================ */

(function() {
    'use strict';

    /** Sets data-rnk-platform on <html> so gdb-subsite-shell.css applies. Skipped for /marathon/ — Marathon uses rnk-theme.css only. Skipped for / and /index.html — landing page keeps its own chrome. */
    (function applyRnkPlatformShell() {
        var path = window.location.pathname.toLowerCase();
        if (path.indexOf('/marathon') !== -1) return;
        if (path === '/' || path === '/index.html') return;
        var plat = '';
        if (path.indexOf('/fortnite') !== -1) plat = 'fortnite';
        else if (path.indexOf('/twitch') !== -1) plat = 'twitch';
        else if (path.indexOf('/steam') !== -1) plat = 'steam';
        else if (path.indexOf('/xbox') !== -1) plat = 'xbox';
        else if (path.indexOf('/playstation') !== -1) plat = 'playstation';
        if (!plat) return;
        document.documentElement.setAttribute('data-rnk-platform', plat);
    })();

    const ICONS = {
        fortnite: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m15.767 14.171.097-5.05H12.4V5.197h3.99L16.872 0H7.128v24l5.271-.985V14.17z"/></svg>',
        marathon: '<img src="/assets/icons/marathon.svg" style="width: 14px; height: 14px;" alt="Marathon">'
    };

    // Determine active section based on URL
    function getActiveSection() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/twitch')) return 'twitch';
        if (path.includes('/steam')) return 'steam';
        if (path.includes('/xbox')) return 'xbox';
        if (path.includes('/playstation')) return 'playstation';
        if (path.includes('/fortnite')) return 'fortnite';
        if (path.includes('/marathon')) return 'marathon';
        if (path === '/' || path === '/index.html') return 'home';
        return null;
    }

    // Platform links (slim top bar — brand is “home”). Only surfaces titles with live APIs.
    const PLATFORM_LINKS = [
        { id: 'marathon', href: '/marathon/', label: 'Marathon', icon: ICONS.marathon },
        { id: 'fortnite', href: '/fortnite/', label: 'Fortnite', icon: ICONS.fortnite }
    ];

    const HOME_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';

    /** On the home page only, these platforms are non-navigable (soft launch). */
    const HOME_SOFT_LAUNCH_COMING_SOON = ['fortnite'];

    function isHomeSoftLaunchPlatform(linkId, activeSection) {
        return activeSection === 'home' && HOME_SOFT_LAUNCH_COMING_SOON.indexOf(linkId) !== -1;
    }

    function platformNavItemDesktop(link, activeSection) {
        var isActive = activeSection === link.id ? ' active' : '';
        var label = '<span class="master-nav-label">' + link.label + '</span>';
        if (isHomeSoftLaunchPlatform(link.id, activeSection)) {
            return '<span class="nav-' + link.id + isActive + ' master-nav-platform--soon" role="text" tabindex="-1" title="Coming soon">' +
                link.icon + label + '</span>';
        }
        return '<a href="' + link.href + '" class="nav-' + link.id + isActive + '" data-platform="' + link.id + '">' +
            link.icon + label + '</a>';
    }

    function platformNavItemMobile(link, activeSection) {
        var isActive = activeSection === link.id ? ' active' : '';
        var inner = link.icon + '<span>' + link.label + '</span>';
        if (isHomeSoftLaunchPlatform(link.id, activeSection)) {
            return '<span class="nav-' + link.id + isActive + ' master-nav-platform--soon" role="text" tabindex="-1" title="Coming soon">' + inner + '</span>';
        }
        return '<a href="' + link.href + '" class="nav-' + link.id + isActive + '">' + inner + '</a>';
    }

    // Generate navbar HTML (Tracker-style single compact row)
    function generateNavbar() {
        const activeSection = getActiveSection();

        const platformsHTML = PLATFORM_LINKS.map(function (link) {
            return platformNavItemDesktop(link, activeSection);
        }).join('');

        var pathLower = window.location.pathname.toLowerCase();
        var onIndex = pathLower === '/' || pathLower.endsWith('/index.html');
        const homeAnchors = activeSection === 'home' && onIndex
            ? '<div class="master-nav-anchors" aria-label="Sections">' +
              '<a href="/#games">Games</a>' +
              '</div>'
            : '';

        const mobileItems = [{ id: 'home', href: '/', label: 'Home', icon: HOME_ICON }].concat(PLATFORM_LINKS);
        const mobileLinksHTML = mobileItems.map(function (link) {
            if (link.id === 'home') {
                var hAct = activeSection === 'home' ? ' active' : '';
                return '<a href="' + link.href + '" class="nav-home' + hAct + '">' + link.icon + '<span>' + link.label + '</span></a>';
            }
            return platformNavItemMobile(link, activeSection);
        }).join('\n    ');

        return (
            '<nav class="master-nav" aria-label="gdb.gg sites">' +
            '<div class="master-nav-inner">' +
            '<a href="/" class="master-nav-brand" title="GDB.GG home">' +
            '<img src="/logo.png" alt="" class="master-nav-brand-mark" width="20" height="20">' +
            '<span class="master-nav-wordmark">gdb<span class="master-nav-dot">.</span>gg</span>' +
            '</a>' +
            '<div class="master-nav-platforms" role="navigation">' + platformsHTML + '</div>' +
            '<div class="master-nav-trail">' + homeAnchors + '</div>' +
            '</div>' +
            '</nav>' +
            '<nav class="mobile-bottom-nav" aria-label="Quick navigation">' + mobileLinksHTML + '</nav>'
        );
    }



    // Initialize navbar
    function initNavbar() {
        let container = document.getElementById('global-nav');
        
        // Auto-create container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.id = 'global-nav';
            
            // Insert as first child of body
            if (document.body.firstChild) {
                document.body.insertBefore(container, document.body.firstChild);
            } else {
                document.body.appendChild(container);
            }
            
        }
        
        // Ensure container is at the top of body (critical for sticky positioning)
        if (document.body.firstChild !== container) {
            document.body.insertBefore(container, document.body.firstChild);
        }

        // Avoid double initialization
        if (container.hasAttribute('data-nav-initialized')) {
            return;
        }

        // Insert navbar HTML
        container.innerHTML = generateNavbar();
        container.setAttribute('data-nav-initialized', 'true');
        
        // Force visibility (safeguard against CSS conflicts)
        container.style.display = 'block';
        container.style.visibility = 'visible';
        
    }

    // Multiple initialization strategies to ensure navbar always loads
    // Strategy 1: Try immediate execution (works when script is after the div)
    if (document.readyState !== 'loading') {
        initNavbar();
    }
    if (document.getElementById('global-nav')) {
        initNavbar();
    }
    
    // Strategy 2: On DOMContentLoaded (works when script is in head or loads early)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initNavbar();
        });
    } else {
        // Document already loaded, initialize now
        initNavbar();
    }
    
    // Strategy 3: Fallback after delays to catch late-loading scenarios
    setTimeout(function() {
        initNavbar();
    }, 50);
    setTimeout(function() {
        initNavbar();
    }, 200);
    setTimeout(function() {
        initNavbar();
    }, 500);
    
    // Strategy 4: Final fallback on window load (catches all edge cases)
    window.addEventListener('load', function() {
        initNavbar();
    });

})();
