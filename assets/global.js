/* ============================================
   gdb.gg — Global JavaScript
   Master Navbar & Shared Components
   ============================================ */

(function() {
    'use strict';

    /**
     * Root-relative paths like /marathon/ resolve to file:///marathon/ when the site is opened
     * via file://. Under the repo folder “Gamedatabase”, compute a ../ prefix to the site root.
     */
    function fileSiteRootPrefix() {
        var p = window.location.pathname.replace(/\\/g, '/');
        var m = p.match(/(.*\/Gamedatabase)(?:\/|$)/i);
        if (!m) return null;
        var rootDir = m[1];
        var lastSlash = p.lastIndexOf('/');
        var currentDir = lastSlash === -1 ? p : p.slice(0, lastSlash);
        if (currentDir.length <= rootDir.length) return '';
        var extra = currentDir.slice(rootDir.length + 1);
        var depth = extra.split('/').filter(Boolean).length;
        return depth ? new Array(depth + 1).join('../') : '';
    }

    /** Map absolute site paths (e.g. /marathon/, /, /#games) for anchors and assets. */
    function siteHref(absPath) {
        var hash = '';
        var i = absPath.indexOf('#');
        if (i !== -1) {
            hash = absPath.slice(i);
            absPath = absPath.slice(0, i);
        }
        if (window.location.protocol !== 'file:') {
            return (absPath || '/') + hash;
        }
        var pre = fileSiteRootPrefix();
        var pathOnly = absPath || '/';
        if (pre === null) {
            if (pathOnly === '/') return 'index.html' + hash;
            return (pathOnly.charAt(0) === '/' ? pathOnly.slice(1) : pathOnly) + hash;
        }
        if (pathOnly === '/') return pre + 'index.html' + hash;
        if (pathOnly.charAt(0) === '/') return pre + pathOnly.slice(1) + hash;
        return pathOnly + hash;
    }

    function gdbNavIcon() {
        return '<img src="' + siteHref('/assets/icons/gdb-mark.svg') + '" style="width: 14px; height: 14px;" alt="GDB.GG">';
    }

    // Determine active section based on URL
    function getActiveSection() {
        var path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
        if (path.indexOf('/marathon') !== -1) return 'marathon';
        if (/\/pages\//i.test(path)) return null;
        if (path === '/' || path.endsWith('/index.html')) {
            var before = path.slice(0, path.lastIndexOf('/'));
            if (!/\/marathon$/i.test(before)) return 'home';
        }
        return null;
    }

    // Platform links pointing to external project sites
    const PLATFORM_LINKS = [
        { id: 'marathon', path: 'https://marathondb.gg/', label: 'Marathon DB', external: true },
        { id: 'gta6', path: 'https://gta6central.gg/', label: 'GTA 6 Central', external: true }
    ];

    const HOME_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';

    function platformNavItemDesktop(link, activeSection) {
        var isActive = activeSection === link.id ? ' active' : '';
        var label = '<span class="master-nav-label">' + link.label + '</span>';
        var href = link.external ? link.path : siteHref(link.path);
        var target = link.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return '<a href="' + href + '"' + target + ' class="nav-' + link.id + isActive + '" data-platform="' + link.id + '">' +
            link.iconHtml + label + '</a>';
    }

    function platformNavItemMobile(link, activeSection) {
        var isActive = activeSection === link.id ? ' active' : '';
        var href = link.external ? link.path : siteHref(link.path);
        var target = link.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        var inner = link.iconHtml + '<span>' + link.label + '</span>';
        return '<a href="' + href + '"' + target + ' class="nav-' + link.id + isActive + '">' + inner + '</a>';
    }

    // Generate navbar HTML (Tracker-style single compact row)
    function generateNavbar() {
        const activeSection = getActiveSection();

        const platformLinksResolved = PLATFORM_LINKS.map(function (l) {
            return { id: l.id, path: l.path, label: l.label, external: l.external, iconHtml: gdbNavIcon() };
        });

        const platformsHTML = platformLinksResolved.map(function (link) {
            return platformNavItemDesktop(link, activeSection);
        }).join('');

        const homeAnchors = '';

        const mobileItems = [{ id: 'home', path: '/', label: 'Home', iconHtml: HOME_ICON }].concat(platformLinksResolved);
        const mobileLinksHTML = mobileItems.map(function (link) {
            if (link.id === 'home') {
                var hAct = activeSection === 'home' ? ' active' : '';
                return '<a href="' + siteHref(link.path) + '" class="nav-home' + hAct + '">' + link.iconHtml + '<span>' + link.label + '</span></a>';
            }
            return platformNavItemMobile(link, activeSection);
        }).join('\n    ');

        return (
            '<nav class="master-nav" aria-label="gdb.gg sites">' +
            '<div class="master-nav-inner">' +
            '<a href="' + siteHref('/') + '" class="master-nav-brand" title="GDB.GG home">' +
            '<img src="' + siteHref('/assets/icons/gdb-mark.svg') + '" alt="" class="master-nav-brand-mark" width="20" height="20">' +
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
