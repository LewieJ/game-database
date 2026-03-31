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
        else if (path.indexOf('hub.html') !== -1) plat = 'home';
        if (!plat) return;
        document.documentElement.setAttribute('data-rnk-platform', plat);
    })();

    // Platform icons as SVG (from /assets/icons/)
    const ICONS = {
        twitch: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>',
        steam: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/></svg>',
        xbox: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 5.425c-1.888-1.125-4.106-1.922-6.473-2.249l-0.092-0.010c-0.070-0.005-0.152-0.008-0.234-0.008-0.613 0-1.188 0.16-1.687 0.441l0.017-0.009c2.357-1.634 5.277-2.61 8.426-2.61 0.008 0 0.016 0 0.024 0h0.019c0.005 0 0.011 0 0.018 0 3.157 0 6.086 0.976 8.501 2.642l-0.050-0.033c-0.478-0.272-1.051-0.433-1.662-0.433-0.085 0-0.169 0.003-0.252 0.009l0.011-0.001c-2.459 0.336-4.677 1.13-6.648 2.297l0.082-0.045zM5.554 5.268c-0.041 0.014-0.077 0.032-0.11 0.054l0.002-0.001c-2.758 2.723-4.466 6.504-4.466 10.684 0 3.584 1.256 6.875 3.353 9.457l-0.022-0.028c-1.754-3.261 4.48-12.455 7.61-16.159-3.53-3.521-5.277-4.062-6.015-4.062-0.010-0-0.021-0.001-0.032-0.001-0.115 0-0.225 0.021-0.326 0.060l0.006-0.002zM20.083 9.275c3.129 3.706 9.367 12.908 7.605 16.161 2.075-2.554 3.332-5.845 3.332-9.43 0-4.181-1.709-7.962-4.467-10.684l-0.002-0.002c-0.029-0.021-0.063-0.039-0.1-0.052l-0.003-0.001c-0.1-0.036-0.216-0.056-0.336-0.056-0.005 0-0.011 0-0.016 0h0.001c-0.741-0-2.485 0.543-6.014 4.063zM6.114 27.306c2.627 2.306 6.093 3.714 9.888 3.714s7.261-1.407 9.905-3.728l-0.017 0.015c2.349-2.393-5.402-10.901-9.89-14.29-4.483 3.39-12.24 11.897-9.886 14.29z"/></svg>',
        playstation: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.76.814.76 1.505v5.876c2.441 1.193 4.362-.002 4.362-3.153 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.391-1.502h-.002zm4.656 16.242 6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5v-2.385l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.03 5.437.661 1.848.601 2.041 1.472 1.576 2.072s-1.622 1.036-1.622 1.036l-8.544 3.107v-2.297l.02-.024zM1.348 18.611c-1.9-.615-2.206-1.878-1.327-2.63.834-.713 2.252-1.245 2.252-1.245l5.848-2.114v2.315l-4.222 1.508c-.715.254-.826.623-.247.818.581.195 1.627.14 2.347-.114l2.128-.769v2.142c-.123.021-.254.043-.396.063-1.701.238-3.519.034-5.156-.451l-1.227-.523z"/></svg>',
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
        if (path.endsWith('/hub.html')) return 'home';
        if (path === '/' || path === '/index.html') return 'home';
        return null;
    }

    // Platform links (slim top bar — brand is “home”)
    const PLATFORM_LINKS = [
        { id: 'marathon', href: '/marathon/', label: 'Marathon', icon: ICONS.marathon },
        { id: 'fortnite', href: '/fortnite/', label: 'Fortnite', icon: ICONS.fortnite },
        { id: 'twitch', href: '/twitch/', label: 'Twitch', icon: ICONS.twitch },
        { id: 'steam', href: '/steam/', label: 'Steam', icon: ICONS.steam },
        { id: 'xbox', href: '/xbox/', label: 'Xbox', icon: ICONS.xbox },
        { id: 'playstation', href: '/playstation/', label: 'PSN', icon: ICONS.playstation }
    ];

    const HOME_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';

    /** On the home page only, these platforms are non-navigable (soft launch). */
    const HOME_SOFT_LAUNCH_COMING_SOON = ['fortnite', 'twitch', 'steam', 'xbox', 'playstation'];

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
        var onHub = pathLower.indexOf('hub.html') !== -1;
        const homeAnchors = activeSection === 'home'
            ? (onHub
                ? '<div class="master-nav-anchors" aria-label="Sections">' +
                  '<a href="/hub.html#games">Games</a>' +
                  '<a href="/hub.html#features">Features</a>' +
                  '<a href="/hub.html#about">About</a>' +
                  '</div>'
                : '<div class="master-nav-anchors" aria-label="Quick links">' +
                  '<a href="/marathon/">Marathon</a>' +
                  '<a href="/hub.html">Explore</a>' +
                  '</div>')
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
            '<a href="/" class="master-nav-brand" title="gdb.gg home">' +
            '<img src="/assets/icons/gdb-mark.svg" alt="" class="master-nav-brand-mark" width="20" height="20">' +
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
            
            console.log('gdb.gg: Created missing #global-nav container');
        }
        
        // Ensure container is at the top of body (critical for sticky positioning)
        if (document.body.firstChild !== container) {
            document.body.insertBefore(container, document.body.firstChild);
            console.log('gdb.gg: Moved #global-nav to top of body');
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
        
        console.log('gdb.gg: Navbar initialized successfully');
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
