/**
 * MarathonDB Static Site Generator (SSG)
 * 
 * Generates static HTML pages from API data for improved SEO.
 * 
 * Usage: node build/ssg.js --charms
 *        node build/ssg.js --all
 *        node build/ssg.js --redirects --sitemap
 * 
 * Output: /charms/index.html (listing)
 *         /charms/[slug]/index.html (detail pages)
 *         /pages/*.html (redirect stubs)
 *         /_redirects (server-side 301 rules)
 *         /sitemap.xml (auto-generated from SSG output)
 */

// ============================================================
// IMPORTS & CONFIGURATION
// ============================================================

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { generateNavigation } = require('./shared-nav');
const { generateFooter } = require('./site-footer');
const { headLoaderScript } = require('./adsense-snippets');

// Configuration
const API_BASE = 'https://helpbot.marathondb.gg';
const SITE_URL = 'https://marathondb.gg';
const OUTPUT_DIR = path.join(__dirname, '..');

// News author profiles — add new authors here
const NEWS_AUTHORS = {
    'Chandler Bellgrave': {
        name: 'Chandler Bellgrave',
        role: 'Editor',
        url: `https://marathondb.gg/news/`,
        social: {
            twitter: 'https://x.com/MarathonDB',
        },
    },
};

// Source display names
const sourceNames = {
    'pre_order': 'Pre-Order Bonus',
    'deluxe_edition': 'Deluxe Edition',
    'collectors_edition': "Collector's Edition",
    'ps_plus': 'PlayStation Plus Launch Exclusive',
    'battle_pass': 'Battle Pass',
    'store': 'In-Game Store',
    'event': 'Limited Event',
    'twitch_drop': 'Twitch Drop',
    'achievement': 'Achievement',
    'free': 'Free',
    'unknown': 'Unknown Source'
};

// Rarity order for sorting
const rarityOrder = {
    'common': 1,
    'uncommon': 2,
    'rare': 3,
    'epic': 4,
    'legendary': 5,
    'exotic': 6
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Make HTTP(S) request
 */
function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON from ${url}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Write file with directory creation
 */
function writeFile(filePath, content) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Created: ${filePath}`);
}

/**
 * Check if a file is hand-crafted (contains HAND-CRAFTED marker in first 300 bytes)
 */
function isHandCrafted(filePath) {
    if (!fs.existsSync(filePath)) return false;
    try {
        const head = fs.readFileSync(filePath, 'utf8').slice(0, 300);
        return head.includes('HAND-CRAFTED');
    } catch (e) {
        return false;
    }
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format date
 */
function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

/**
 * Format date (short month) — used by cores, items, runners
 */
function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateStr || '-';
    }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
    if (!str) return '';
    // Convert to string if not already
    if (typeof str !== 'string') {
        str = String(str);
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"//marathon/g, '&quot;')
        .replace(/'//marathon/g, '&#039;');
}

// ============================================================
// SHARED UI COMPONENTS
// Navigation: generateNavigation from shared-nav.js
// Footer: generateFooter from site-footer.js
// ============================================================


/**
 * Generate the weapon tier list page — interactive drag-and-drop with shareable URLs
 */
function generateWeaponTierListPage(weapons) {
    const canonicalUrl = `${SITE_URL}/weapons/tier-list/`;

    // Collect unique categories and counts
    const categoryCounts = {};
    weapons.forEach(w => {
        const cat = w.category_name || '';
        if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const categories = Object.keys(categoryCounts).sort();

    // Pre-render weapon items for the unranked pool
    const weaponItemsHtml = weapons.map(w => {
        const iconUrl = ssgBuildWeaponIconLow(w);
        return `<div class="tier-weapon" draggable="true" data-slug="${w.slug}" data-name="${escapeHtml(w.name)}" data-category="${escapeHtml(w.category_name || '')}">
            <img src="${iconUrl}" alt="${escapeHtml(w.name)}" onerror="this.style.display='none'" loading="lazy">
            <span>${escapeHtml(w.name)}</span>
        </div>`;
    }).join('\n                    ');

    const tiers = ['S', 'A', 'B', 'C', 'D', 'F'];
    const tierRowsHtml = tiers.map(t => `
                <div class="tier-row">
                    <div class="tier-label tier-label-${t.toLowerCase()}">${t}</div>
                    <div class="tier-drop-zone" data-tier="${t}"></div>
                </div>`).join('');

    // Category filter pills
    const filterPillsHtml = categories.map(cat =>
        `<button class="tierlist-filter-pill active" data-category="${escapeHtml(cat)}">${escapeHtml(cat)} <span class="filter-count">${categoryCounts[cat]}</span></button>`
    ).join('\n                ');

    const categoryBreakdownHtml = categories.map(cat =>
        `<strong style="color:var(--text-secondary);">${escapeHtml(cat)}</strong> (${categoryCounts[cat]})`
    ).join(', ');

    // FAQ structured data for SEO
    const faqData = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "What is the best weapon in Marathon?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `Use this interactive tier list to rank all ${weapons.length} Marathon weapons from S to F tier. The meta shifts with patches, so build your own rankings and share them with the community.`
                }
            },
            {
                "@type": "Question",
                "name": "How do I share my Marathon tier list?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "After ranking weapons into tiers, click the 'Share Tier List' button to copy a shareable link. Anyone who opens the link will see your exact weapon rankings."
                }
            },
            {
                "@type": "Question",
                "name": "How many weapons are in Marathon?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": `There are currently ${weapons.length} weapons in Bungie's Marathon across ${categories.length} weapon categories: ${categories.join(', ')}.`
                }
            }
        ]
    };

    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/`},
            {"@type": "ListItem", "position": 2, "name": "Weapons", "item": `${SITE_URL}/weapons/`},
            {"@type": "ListItem", "position": 3, "name": "Tier List", "item": canonicalUrl}
        ]
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
${headLoaderScript()}
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Create and share your Marathon weapon tier list. Rank all ${weapons.length} weapons from S to F tier. Drag-and-drop tier list maker on gdb.gg.">
    <meta name="keywords" content="Marathon tier list, Marathon weapon tier list, Marathon weapon rankings, Marathon tierlist, Marathon weapon tierlist, Bungie Marathon tier list, Marathon best weapons, Marathon weapon meta, Marathon weapon ranking 2026, Marathon S tier weapons, Marathon meta weapons, Marathon gun tier list, Marathon gun rankings, Marathon PvP tier list, Marathon extraction shooter tier list, Marathon weapon guide, Marathon tier list maker, Marathon tierlist maker, Marathon weapon comparison, best weapons Marathon, Marathon top weapons, Marathon weapon tier list 2026, Marathon best pistol, Marathon best assault rifle, Marathon best shotgun, Marathon best sniper">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="gdb.gg">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="Marathon Weapon Tier List Maker — Rank Every Weapon | gdb.gg">
    <meta property="og:description" content="Build and share your own Marathon weapon tier list. Drag and drop all ${weapons.length} weapons into S, A, B, C, D, or F tier. Filter by weapon class and share your rankings.">
    <meta property="og:image" content="${SITE_URL}/Icon.png">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:site_name" content="gdb.gg Marathon">
    <meta property="og:locale" content="en_US">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@MarathonDB">
    <meta name="twitter:title" content="Marathon Weapon Tier List Maker — Rank Every Weapon">
    <meta name="twitter:description" content="Create, customize, and share your Marathon weapon tier list. Rank all ${weapons.length} weapons from S to F tier. Filter by class.">
    <meta name="twitter:image" content="${SITE_URL}/Icon.png">
    <meta name="theme-color" content="#d4ff00">
    <link rel="canonical" href="${canonicalUrl}">
    <title>Marathon Weapon Tier List - Rank S to F | gdb.gg</title>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Marathon Weapon Tier List Maker",
        "description": "Interactive tier list maker for Marathon weapons. Rank all ${weapons.length} weapons from S tier to F tier. Drag and drop to build your rankings, then share with friends.",
        "url": "${canonicalUrl}",
        "applicationCategory": "GameApplication",
        "operatingSystem": "Any",
        "publisher": {
            "@type": "Organization",
            "name": "gdb.gg",
            "url": "${SITE_URL}"
        }
    }
    </script>
    <script type="application/ld+json">
${JSON.stringify(breadcrumbData, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(faqData, null, 2)}
    </script>
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">
</head>
<body>
    ${generateNavigation('weapons')}

    <main class="container">

        <nav class="detail-breadcrumb" aria-label="Breadcrumb">
            <ol style="display:flex;align-items:center;gap:8px;list-style:none;margin:0;padding:0;">
                <li><a href="//marathon/">Home</a></li>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                <li><a href="//marathon/weapons/">Weapons</a></li>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                <li>Tier List</li>
            </ol>
        </nav>

        <div class="tierlist-header">
            <div>
                <h1>Marathon Weapon Tier List Maker</h1>
                <p style="color:var(--text-dim);font-size:0.85rem;margin:4px 0 0;">Drag and drop all ${weapons.length} Marathon weapons into tiers to build your weapon rankings. Share your tier list with friends!</p>
            </div>
            <div class="tierlist-actions">
                <button class="tierlist-btn" id="tierResetBtn" title="Reset all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Reset
                </button>
                <button class="tierlist-btn tierlist-btn-primary" id="tierShareBtn" title="Copy shareable link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    Share Tier List
                </button>
                <span class="tierlist-share-status" id="tierShareStatus">Link copied!</span>
            </div>
        </div>

        <div class="tierlist-filters" id="tierFilters">
            <span class="tierlist-filter-label">Filter:</span>
                ${filterPillsHtml}
            <span class="tierlist-divider"></span>
            <button class="tierlist-toggle" id="hideNamesToggle" title="Toggle weapon names">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                Hide Names
            </button>
        </div>

        <div class="tier-container" id="tierContainer">
${tierRowsHtml}
        </div>

        <div class="tier-pool" id="tierPool">
            <div class="tier-pool-label">Unranked Weapons</div>
            <div class="tier-pool-zone" data-tier="unranked">
                    ${weaponItemsHtml}
            </div>
        </div>

        <section class="tierlist-seo" style="margin-top:48px;padding-top:32px;border-top:1px solid var(--border);">
            <h2 style="font-size:1.1rem;color:var(--text-primary);margin:0 0 12px;">About the Marathon Weapon Tier List</h2>
            <p style="color:var(--text-dim);font-size:0.85rem;line-height:1.6;margin:0 0 10px;">Use this interactive Marathon tier list maker to rank every weapon in Bungie's Marathon. Whether you're looking for the best Marathon weapons for PvP, trying to figure out the current Marathon weapon meta, or just want to compare your gun rankings with friends — this tool makes it easy. Drag and drop all ${weapons.length} weapons into S, A, B, C, D, or F tier.</p>
            <p style="color:var(--text-dim);font-size:0.85rem;line-height:1.6;margin:0 0 10px;">Use the <strong style="color:var(--text-secondary);">category filters</strong> to focus on a single weapon class — rank the best Marathon assault rifles, machine guns, pistols, precision rifles, railguns, shotguns, sniper rifles, submachine guns separately, or rank them all together.</p>
            <p style="color:var(--text-dim);font-size:0.85rem;line-height:1.6;margin:0 0 10px;">Once you've built your Marathon weapon tier list, hit <strong style="color:var(--neon);">Share Tier List</strong> to copy a shareable link. Anyone who opens your link will see your exact weapon rankings — perfect for sharing your Marathon tierlist on Discord, Reddit, or social media.</p>
            <p style="color:var(--text-dim);font-size:0.85rem;line-height:1.6;margin:0 0 16px;">Looking for detailed weapon stats instead? Check out our <a href="//marathon/weapons/" style="color:var(--neon);">full Marathon weapons database</a> with damage numbers, fire rates, handling stats, patch history, and community ratings for every gun in Marathon. Structured data is provided by <a href="https://marathondb.gg/" rel="noopener noreferrer" style="color:var(--neon);">MarathonDB.gg</a>.</p>
            <h3 style="font-size:0.95rem;color:var(--text-primary);margin:0 0 8px;">Weapon Classes in Marathon</h3>
            <p style="color:var(--text-dim);font-size:0.85rem;line-height:1.6;margin:0 0 10px;">Marathon features ${categories.length} weapon categories: ${categoryBreakdownHtml}. Each class fills a unique role in Marathon's extraction shooter gameplay.</p>
            <h3 style="font-size:0.95rem;color:var(--text-primary);margin:0 0 8px;">Frequently Asked Questions</h3>
            <dl style="margin:0;">
                <dt style="color:var(--text-secondary);font-size:0.85rem;font-weight:700;margin:0 0 4px;">What is the best weapon in Marathon?</dt>
                <dd style="color:var(--text-dim);font-size:0.85rem;line-height:1.5;margin:0 0 12px 0;">The meta shifts with each patch. Use this tier list to build and share your own rankings based on the current balance.</dd>
                <dt style="color:var(--text-secondary);font-size:0.85rem;font-weight:700;margin:0 0 4px;">How many weapons are in Marathon?</dt>
                <dd style="color:var(--text-dim);font-size:0.85rem;line-height:1.5;margin:0 0 12px 0;">There are currently ${weapons.length} weapons in Bungie's Marathon across ${categories.length} weapon categories.</dd>
                <dt style="color:var(--text-secondary);font-size:0.85rem;font-weight:700;margin:0 0 4px;">How do I share my tier list?</dt>
                <dd style="color:var(--text-dim);font-size:0.85rem;line-height:1.5;margin:0;">Click "Share Tier List" to copy a link. Anyone who opens it will see your exact weapon rankings.</dd>
            </dl>
        </section>

    </main>

    ${generateFooter()}

    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>
    <script>
    (function() {
        const allWeapons = document.querySelectorAll('.tier-weapon');
        const dropZones = document.querySelectorAll('.tier-drop-zone, .tier-pool-zone');
        let draggedEl = null;

        allWeapons.forEach(el => {
            el.addEventListener('dragstart', e => {
                draggedEl = el;
                el.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', el.dataset.slug);
            });
            el.addEventListener('dragend', () => {
                el.classList.remove('dragging');
                draggedEl = null;
                dropZones.forEach(z => z.classList.remove('drag-over'));
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                zone.classList.add('drag-over');

                const afterEl = getDragAfterElement(zone, e.clientY);
                if (draggedEl) {
                    if (afterEl == null) {
                        zone.appendChild(draggedEl);
                    } else {
                        zone.insertBefore(draggedEl, afterEl);
                    }
                }
            });
            zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('drag-over');
            });
        });

        function getDragAfterElement(container, y) {
            const elements = [...container.querySelectorAll('.tier-weapon:not(.dragging)')];
            return elements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child };
                }
                return closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        let touchEl = null;
        let touchClone = null;
        let touchStartX, touchStartY;

        allWeapons.forEach(el => {
            el.addEventListener('touchstart', e => {
                touchEl = el;
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            }, { passive: true });
        });

        document.addEventListener('touchmove', e => {
            if (!touchEl) return;
            e.preventDefault();
            const touch = e.touches[0];
            if (!touchClone) {
                const dx = Math.abs(touch.clientX - touchStartX);
                const dy = Math.abs(touch.clientY - touchStartY);
                if (dx < 8 && dy < 8) return;

                touchClone = touchEl.cloneNode(true);
                touchClone.style.position = 'fixed';
                touchClone.style.zIndex = '9999';
                touchClone.style.pointerEvents = 'none';
                touchClone.style.opacity = '0.8';
                touchClone.style.transform = 'scale(1.05)';
                document.body.appendChild(touchClone);
                touchEl.classList.add('dragging');
            }
            touchClone.style.left = (touch.clientX - 40) + 'px';
            touchClone.style.top = (touch.clientY - 15) + 'px';

            dropZones.forEach(z => z.classList.remove('drag-over'));
            const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            const zone = elUnder && elUnder.closest('.tier-drop-zone, .tier-pool-zone');
            if (zone) zone.classList.add('drag-over');
        }, { passive: false });

        document.addEventListener('touchend', e => {
            if (!touchEl) return;
            if (touchClone) {
                const touch = e.changedTouches[0];
                const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
                const zone = elUnder && elUnder.closest('.tier-drop-zone, .tier-pool-zone');
                if (zone) zone.appendChild(touchEl);
                touchClone.remove();
                touchClone = null;
            }
            touchEl.classList.remove('dragging');
            dropZones.forEach(z => z.classList.remove('drag-over'));
            touchEl = null;
        });

        document.getElementById('tierShareBtn').addEventListener('click', () => {
            const state = {};
            document.querySelectorAll('.tier-drop-zone').forEach(zone => {
                const tier = zone.dataset.tier;
                const slugs = [...zone.querySelectorAll('.tier-weapon')].map(w => w.dataset.slug);
                if (slugs.length > 0) state[tier] = slugs;
            });

            if (Object.keys(state).length === 0) return;

            const encoded = btoa(JSON.stringify(state));
            const shareUrl = window.location.origin + window.location.pathname + '?t=' + encoded;

            navigator.clipboard.writeText(shareUrl).then(() => {
                const status = document.getElementById('tierShareStatus');
                status.classList.add('visible');
                setTimeout(() => status.classList.remove('visible'), 2500);
                history.replaceState(null, '', '?t=' + encoded);
            });
        });

        document.getElementById('tierResetBtn').addEventListener('click', () => {
            const pool = document.querySelector('.tier-pool-zone');
            document.querySelectorAll('.tier-drop-zone .tier-weapon').forEach(w => {
                pool.appendChild(w);
            });
            history.replaceState(null, '', window.location.pathname);
        });

        function loadFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const encoded = params.get('t');
            if (!encoded) return;

            try {
                const state = JSON.parse(atob(encoded));
                Object.entries(state).forEach(([tier, slugs]) => {
                    const zone = document.querySelector('.tier-drop-zone[data-tier="' + tier + '"]');
                    if (!zone) return;
                    slugs.forEach(slug => {
                        const el = document.querySelector('.tier-weapon[data-slug="' + slug + '"]');
                        if (el) zone.appendChild(el);
                    });
                });
            } catch (e) {
                console.warn('Failed to load tier list from URL:', e);
            }
        }

        loadFromUrl();

        const hideBtn = document.getElementById('hideNamesToggle');
        const tierContainer = document.getElementById('tierContainer');
        const tierPool = document.querySelector('.tier-pool');
        if (hideBtn) {
            hideBtn.addEventListener('click', () => {
                hideBtn.classList.toggle('active');
                tierContainer.classList.toggle('hide-names');
                tierPool.classList.toggle('hide-names');
            });
        }

        const filterPills = document.querySelectorAll('.tierlist-filter-pill');
        filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                pill.classList.toggle('active');
                const activeCategories = new Set(
                    [...document.querySelectorAll('.tierlist-filter-pill.active')].map(p => p.dataset.category)
                );
                allWeapons.forEach(w => {
                    if (activeCategories.has(w.dataset.category)) {
                        w.style.display = '';
                    } else {
                        w.style.display = 'none';
                    }
                });
            });
        });
    })();
    </script>
    <script src="//marathon/js/feedback.js"></script>

    <div class="ad-mobile-anchor">
        <div class="ad-container"></div>
    </div>

    <div class="ad-mobile-sticky-top">
        <div class="ad-container"></div>
    </div>
</body>
</html>`;
}

/**
 * Generate item detail page (/items/[slug]/index.html)
 * Only generated for items that DON'T have bespoke SSG pages (cores, mods, etc.)
 */
function generateItemDetailPage(item, allItems) {
    const name = escapeHtml(item.name);
    const itemDescBase = item.description ? `${escapeHtml(item.description)} ` : '';
    const typeLower = (item.type || 'item').toLowerCase();
    const description = `${itemDescBase}${name} is a Marathon ${typeLower}. Find detailed stats, properties, and usage info on MarathonDB.`;
    const canonicalUrl = `${SITE_URL}/items/${item.slug}/`;
    const iconUrl = ssgGetItemIconUrl(item);
    const typeName = escapeHtml((item.type || 'Unknown').toUpperCase());
    const rarity = (item.rarity || '').toLowerCase();
    const rarityDisplay = escapeHtml(item.rarity || '');

    // Properties HTML
    const propertiesHtml = ssgRenderItemProperties(item);

    // Patch history HTML
    const patchHistoryHtml = ssgRenderItemPatchHistory(item);
    const hasPatchHistory = patchHistoryHtml.length > 0;

    // Dates
    const addedDate = item.created_at ? formatDateShort(item.created_at) : '-';
    const updatedDate = item.updated_at ? formatDateShort(item.updated_at) : '-';

    // Structured data
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": item.name,
        "description": item.description || `${item.name} item details for Marathon`,
        "image": iconUrl,
        "url": canonicalUrl,
        "brand": {
            "@type": "Brand",
            "name": "Marathon"
        },
        "category": item.type || "Item"
    };

    // Add rating if available
    if (item.average_rating && item.rating_count) {
        structuredData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": item.average_rating,
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": item.rating_count
        };
    }

    // Additional properties for schema
    const additionalProperties = [];
    if (item.rarity) {
        additionalProperties.push({ "@type": "PropertyValue", "name": "Rarity", "value": item.rarity });
    }
    if (item.value !== null && item.value !== undefined) {
        additionalProperties.push({ "@type": "PropertyValue", "name": "Value", "value": `${item.value} Credits` });
    }
    if (item.stack_size !== null && item.stack_size !== undefined) {
        additionalProperties.push({ "@type": "PropertyValue", "name": "Stack Size", "value": item.stack_size.toString() });
    }
    if (additionalProperties.length > 0) {
        structuredData.additionalProperty = additionalProperties;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <meta name="keywords" content="${name}, Marathon item, ${item.type || 'item'}, item stats, item effects, Marathon gear">
    <meta name="robots" content="index, follow">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${name} - ${item.type || 'Item'} | MarathonDB">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${iconUrl}">
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${name} - ${item.type || 'Item'} | MarathonDB">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${iconUrl}">
    
    <link rel="canonical" href="${canonicalUrl}">
    <title>${(() => { const t = (item.type || 'Item').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); const full = `${name} - ${t} | MarathonDB`; return full.length > 60 ? `${name} | MarathonDB` : full; })()}</title>
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">

    <!-- Structured Data -->
    <script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
    </script>
</head>
<body>
    ${generateNavigation('items')}

    <!-- Fixed Siderail Ads -->
    <aside class="ad-siderail-fixed ad-siderail-fixed--left">
        <div class="ad-siderail-sticky">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </aside>
    <aside class="ad-siderail-fixed ad-siderail-fixed--right">
        <div class="ad-siderail-sticky">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </aside>

    <main class="container">
        <!-- Breadcrumb -->
        <nav class="detail-breadcrumb" aria-label="Breadcrumb">
            <ol itemscope itemtype="https://schema.org/BreadcrumbList" style="display: flex; align-items: center; gap: 8px; list-style: none; margin: 0; padding: 0;">
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/">
                        <span itemprop="name">Home</span>
                    </a>
                    <meta itemprop="position" content="1" />
                </li>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/items/">
                        <span itemprop="name">Items</span>
                    </a>
                    <meta itemprop="position" content="2" />
                </li>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <span itemprop="name" id="breadcrumbName">${name}</span>
                    <meta itemprop="position" content="3" />
                </li>
            </ol>
        </nav>


        <!-- Mobile Top Ad -->

            <!-- Mid-content ad -->

            <!-- Patch History -->
            <div id="patchHistory" class="patch-history-section"${hasPatchHistory ? '' : ' style="display: none;"'}>
                <h2 class="section-header">Patch History</h2>
                <div id="patchList" class="patch-list">
${patchHistoryHtml}
                </div>
            </div>

            <!-- Metadata -->
            <div class="detail-meta">
                <div class="meta-item">
                    <span class="meta-label">Added</span>
                    <span id="addedDate" class="meta-value">${addedDate}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Last Updated</span>
                    <span id="updatedDate" class="meta-value">${updatedDate}</span>
                </div>
            </div>
        </div>
    </main>

    <!-- Pre-footer ad -->
    <div class="ad-safe-zone ad-safe-zone--mid-content" style="max-width:800px;margin:2rem auto;">
        <span class="ad-label">Ad</span>
        <div class="ad-container">
        </div>
    </div>

    ${generateFooter()}

    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/item-detail.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

/**
 * Build items pages
 */
async function buildItems() {
    console.log('\n📦 Building Items Pages...\n');

    try {
        // Fetch all items (unified endpoint)
        console.log('  Fetching items from API...');
        const response = await fetchJSON(`${API_BASE}/api/items/all`);

        if (!response || !response.data || !Array.isArray(response.data)) {
            throw new Error('Invalid API response: ' + JSON.stringify(response));
        }

        const itemsList = response.data;
        console.log(`  Found ${itemsList.length} items\n`);

        // Fetch item types for listing page tabs
        console.log('  Fetching item types...');
        let itemTypes = [];
        try {
            const typesResponse = await fetchJSON(`${API_BASE}/api/items/types`);
            if (typesResponse?.types) {
                itemTypes = typesResponse.types;
                console.log(`  Found ${itemTypes.length} item types\n`);
            }
        } catch (typesErr) {
            console.log('  ⚠ Item types fetch failed, tabs will use fallback\n');
        }

        // Separate items: bespoke (have their own SSG pages) vs generic (need /items/[slug]/)
        const bespokeItems = [];
        const genericItems = [];
        for (const item of itemsList) {
            const table = (item.source_table || '').toLowerCase();
            if (BESPOKE_ITEM_ROUTES[table]) {
                bespokeItems.push(item);
            } else {
                genericItems.push(item);
            }
        }
        console.log(`  Bespoke items (routed to existing pages): ${bespokeItems.length}`);
        console.log(`  Generic items (will get /items/[slug]/ pages): ${genericItems.length}\n`);

        // Fetch individual item details for generic items only
        console.log('  Fetching individual item details for generic items...');
        const fullGenericItems = [];
        for (const item of genericItems) {
            const slug = item.slug || item.id;
            try {
                const detailRes = await fetchJSON(`${API_BASE}/api/items/${slug}`);
                if (detailRes && detailRes.data) {
                    fullGenericItems.push(detailRes.data);
                    console.log(`    ✓ ${item.name}`);
                } else {
                    console.log(`    ⚠ ${item.name} - using list data`);
                    fullGenericItems.push(item);
                }
            } catch (err) {
                console.log(`    ⚠ ${item.name} - fetch failed, using list data`);
                fullGenericItems.push(item);
            }
        }

        // Create output directory
        const itemsDir = path.join(OUTPUT_DIR, 'items');
        ensureDir(itemsDir);

        // Generate listing page (includes ALL items — bespoke + generic)
        console.log('\n  Generating listing page...');
        const listingHtml = generateItemsListingPage(itemsList, itemTypes);
        writeFile(path.join(itemsDir, 'index.html'), listingHtml);

        // Generate individual item detail pages (generic items only)
        console.log('\n  Generating detail pages (generic items only)...');
        for (const item of fullGenericItems) {
            const slug = item.slug || item.id;
            const itemDir = path.join(itemsDir, slug);
            const detailHtml = generateItemDetailPage(item, itemsList);
            writeFile(path.join(itemDir, 'index.html'), detailHtml);
        }

        const totalPages = fullGenericItems.length + 1;
        console.log(`\n✅ Successfully generated ${totalPages} pages`);
        console.log(`   - 1 listing page: /items/index.html`);
        console.log(`   - ${fullGenericItems.length} detail pages: /items/[slug]/index.html`);
        console.log(`   - ${bespokeItems.length} items route to bespoke SSG pages (cores, mods)`);

    } catch (error) {
        console.error('\n❌ Error building items:', error.message);
        process.exit(1);
    }
}

// ============================================================
// FACTIONS SSG — Bespoke faction hub pages
// ============================================================

/**
 * Static faction data — bespoke content not dependent on API
 */
const FACTION_DATA = {
    arachne: {
        name: 'Arachne',
        slug: 'arachne',
        color: '#e40b0d',
        iconUrl: 'https://helpbot.marathondb.gg/assets/items/reputations/arachne-200x200.png',
        tagline: 'Global Leader in Cybersecurity',
        agent: 'Arachne Agent',
        description: 'Arachne is a global leader in cybersecurity and information security solutions. They are known for their advanced threat detection and prevention technologies.',
        lore: `<p>Arachne operates at the intersection of surveillance and protection, weaving digital networks that monitor and secure the most sensitive data flows in the solar system. Their presence on Tau Ceti IV reflects their ambition to control information at its source.</p>
<p>Runners aligned with Arachne gain access to intelligence networks, threat detection tools, and security-focused contracts that reward precision and information gathering.</p>`,
        perks: [
            { icon: '🛡', name: 'Threat Intel', desc: 'Access to advanced threat detection contracts' },
            { icon: '🔍', name: 'Network Access', desc: 'Faction-exclusive intel and surveillance tools' },
            { icon: '💰', name: 'Security Bounties', desc: 'High-value contracts for eliminating threats' },
            { icon: '🎭', name: 'Exclusive Cosmetics', desc: 'Arachne-branded weapon skins and gear' },
        ],
        cosmetics: [],
        contracts: [],
    },
    cyberacme: {
        name: 'Cyberacme',
        slug: 'cyberacme',
        color: '#01d838',
        iconUrl: 'https://helpbot.marathondb.gg/assets/items/reputations/cyberacme-200x200.png',
        tagline: 'Cutting-Edge Cybernetics & AI',
        agent: 'Cyberacme Agent',
        description: 'Cyberacme is a leading technology company specializing in advanced cybernetics and artificial intelligence. They are known for their cutting-edge products and innovative solutions.',
        lore: `<p>Cyberacme pushes the boundaries of human augmentation and machine intelligence. Their research labs on Tau Ceti IV are developing next-generation cybernetic implants and AI systems that blur the line between human and machine.</p>
<p>Runners working with Cyberacme gain access to experimental tech, augmentation contracts, and rewards that enhance their combat systems.</p>`,
        perks: [
            { icon: '⚡', name: 'Tech Upgrades', desc: 'Access to experimental cybernetic enhancement contracts' },
            { icon: '🤖', name: 'AI Assistance', desc: 'Faction-exclusive AI-powered tools and intel' },
            { icon: '🔧', name: 'R&D Contracts', desc: 'Field-test new tech for Cyberacme R&D' },
            { icon: '🎭', name: 'Exclusive Cosmetics', desc: 'Cyberacme-branded skins and gear' },
        ],
        cosmetics: [],
        contracts: [],
    },
    nucaloric: {
        name: 'Nucaloric',
        slug: 'nucaloric',
        color: '#ff125d',
        iconUrl: 'https://helpbot.marathondb.gg/assets/items/reputations/nucaloric-200x200.png',
        tagline: 'Sustainable Energy & Power',
        agent: 'Nucaloric Agent',
        description: 'Nucaloric is a global leader in energy production and distribution, focusing on sustainable and renewable energy sources. They are committed to reducing carbon emissions and promoting environmental sustainability.',
        lore: `<p>Nucaloric\'s operations on Tau Ceti IV center around harnessing the planet\'s unique energy resources. Their fusion reactors and power grid infrastructure are critical to maintaining operations across the colony.</p>
<p>Runners aligned with Nucaloric take on energy-related contracts, protect infrastructure, and gain access to power-based rewards and exclusive faction cosmetics.</p>`,
        perks: [
            { icon: '⚡', name: 'Power Grid Access', desc: 'Contracts protecting critical energy infrastructure' },
            { icon: '🔋', name: 'Energy Rewards', desc: 'Bonus energy credits from faction missions' },
            { icon: '💥', name: 'Heavy Firepower', desc: 'Access to energy weapon contracts and rewards' },
            { icon: '🎭', name: 'Exclusive Cosmetics', desc: 'Nucaloric-branded weapon skins and gear' },
        ],
        cosmetics: [],
        contracts: [],
    },
    traxus: {
        name: 'Traxus',
        slug: 'traxus',
        color: '#ff7300',
        iconUrl: 'https://helpbot.marathondb.gg/assets/items/reputations/traxus-200x200.png',
        tagline: 'Transportation & Logistics',
        agent: 'Traxus Agent',
        description: 'Traxus is a multinational corporation specializing in transportation and logistics. They are known for their advanced supply chain solutions and innovative transportation technologies.',
        lore: `<p>Traxus controls the lifeblood of Tau Ceti IV — the supply lines. Their cargo networks, shipping routes, and logistics infrastructure keep the colony running. Control the supply chain, control the colony.</p>
<p>Runners aligned with Traxus handle escort missions, cargo recovery, and supply line defense contracts. Their rewards focus on loot and extraction efficiency.</p>`,
        perks: [
            { icon: '📦', name: 'Supply Contracts', desc: 'Cargo recovery and supply line defense missions' },
            { icon: '🚀', name: 'Extraction Bonus', desc: 'Enhanced extraction rewards from Traxus missions' },
            { icon: '🗺', name: 'Route Intel', desc: 'Faction intel on loot routes and high-value zones' },
            { icon: '🎭', name: 'Exclusive Cosmetics', desc: 'Traxus-branded weapon skins and gear' },
        ],
        cosmetics: [],
        contracts: [],
    },
    mida: {
        name: 'Mida',
        slug: 'mida',
        color: '#be72e4',
        iconUrl: 'https://helpbot.marathondb.gg/assets/items/reputations/mida-200x200.png',
        tagline: 'Finance & Asset Management',
        agent: 'MIDA Agent',
        description: 'Mida is a leading financial services company specializing in investment banking and asset management. They are known for their expertise in financial markets and innovative investment strategies.',
        lore: `<p>MIDA\'s influence on Tau Ceti IV extends far beyond banking. They fund expeditions, broker deals between factions, and control credit flow across the colony. Their interests are vast and their resources seemingly limitless.</p>
<p>Runners working for MIDA take on high-stakes contracts with premium credit payouts. Their faction rewards lean heavily toward economic advantages and exclusive luxury cosmetics.</p>`,
        perks: [
            { icon: '💰', name: 'Premium Payouts', desc: 'Higher credit rewards from faction contracts' },
            { icon: '📈', name: 'Investment Returns', desc: 'Bonus reputation gains from completed missions' },
            { icon: '💎', name: 'Luxury Rewards', desc: 'Access to premium cosmetics and rare items' },
            { icon: '🎭', name: 'Exclusive Cosmetics', desc: 'MIDA-branded weapon skins and gear' },
        ],
        cosmetics: [],
        contracts: [],
    },
    sekiguchi: {
        name: 'Sekiguchi',
        slug: 'sekiguchi',
        color: '#73f2c9',
        iconUrl: 'https://helpbot.marathondb.gg/assets/items/reputations/sekiguchi-200x200.png',
        tagline: 'Manufacturing & Engineering',
        agent: 'SekGen Agent',
        description: 'Sekiguchi is a multinational corporation specializing in manufacturing and engineering. They are known for their advanced production technologies and innovative engineering solutions.',
        lore: `<p>Sekiguchi\'s factories and engineering labs on Tau Ceti IV produce everything from weapon components to Runner shell parts. Their manufacturing dominance makes them an essential partner for any Runner looking to upgrade their arsenal.</p>
<p>Runners aligned with Sekiguchi take on production-focused contracts — retrieving materials, field testing prototypes, and defending manufacturing facilities. Rewards include exclusive gear and weapon modifications.</p>`,
        perks: [
            { icon: '🔨', name: 'Prototype Access', desc: 'Field-test experimental weapons and gear' },
            { icon: '⚙', name: 'Engineering Contracts', desc: 'Material retrieval and facility defense missions' },
            { icon: '🛠', name: 'Mod Expertise', desc: 'Faction-exclusive weapon mods and upgrades' },
            { icon: '🎭', name: 'Exclusive Cosmetics', desc: 'Sekiguchi-branded weapon skins and gear' },
        ],
        cosmetics: [],
        contracts: [],
    },
};

const ALL_FACTION_SLUGS = Object.keys(FACTION_DATA);

/**
 * Generate other-factions sidebar links (excluding current)
 */
function generateOtherFactionLinks(currentSlug) {
    return ALL_FACTION_SLUGS
        .map(slug => {
            const f = FACTION_DATA[slug];
            const isCurrent = slug === currentSlug;
            return `
                            <a href="//marathon/factions/${f.slug}/" class="fh-faction-link${isCurrent ? ' current' : ''}" style="--faction-color: ${f.color}">
                                <img src="${f.iconUrl}" alt="${escapeHtml(f.name)}" width="28" height="28">
                                <span class="fh-faction-link-name">${escapeHtml(f.name)}</span>
                            </a>`;
        }).join('');
}

/**
 * Generate a faction hub detail page
 */
function generateFactionHubPage(faction) {
    const canonicalUrl = `${SITE_URL}/factions/${faction.slug}/`;
    const title = `${faction.name} Faction Hub | MarathonDB`;
    const metaDesc = `${faction.description} Learn about ${faction.name} perks, cosmetics, contracts, and reputation in Marathon.`;

    // Perks HTML
    const perksHtml = faction.perks.map(p => `
                                <div class="fh-perk-card">
                                    <div class="fh-perk-icon">${p.icon}</div>
                                    <div>
                                        <div class="fh-perk-name">${escapeHtml(p.name)}</div>
                                        <div class="fh-perk-desc">${escapeHtml(p.desc)}</div>
                                    </div>
                                </div>`).join('');

    // Cosmetics section
    let cosmeticsBodyHtml = '';
    if (faction.cosmetics && faction.cosmetics.length > 0) {
        cosmeticsBodyHtml = `<div class="fh-cosmetics-grid">
${faction.cosmetics.map(c => `
                                <a href="${c.url}" class="fh-cosmetic-card">
                                    <img src="${c.icon}" alt="${escapeHtml(c.name)}" class="fh-cosmetic-img" onerror="this.style.display='none'" loading="lazy">
                                    <span class="fh-cosmetic-name">${escapeHtml(c.name)}</span>
                                    <span class="fh-cosmetic-type">${escapeHtml(c.type)}</span>
                                </a>`).join('')}
                            </div>`;
    } else {
        cosmeticsBodyHtml = `<div class="fh-coming-soon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"//marathon/><path d="M12 6v6l4 2"//marathon/></svg>
                                <p>Faction cosmetics will be revealed at launch. Check back soon!</p>
                            </div>`;
    }

    // Contracts section
    let contractsBodyHtml = '';
    if (faction.contracts && faction.contracts.length > 0) {
        contractsBodyHtml = `<div class="fh-contracts-list">
${faction.contracts.map(c => `
                                <a href="${c.url}" class="fh-contract-link">
                                    <div>
                                        <div class="fh-contract-name">${escapeHtml(c.name)}</div>
                                        <div class="fh-contract-meta">${escapeHtml(c.type)} &middot; ${escapeHtml(c.difficulty || '')}</div>
                                    </div>
                                    <svg class="fh-contract-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
                                </a>`).join('')}
                            </div>`;
    } else {
        contractsBodyHtml = `<div class="fh-coming-soon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"//marathon/><path d="M14 2v6h6"//marathon/></svg>
                                <p>Contracts for ${escapeHtml(faction.name)} will be available at launch. Check back soon!</p>
                            </div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <meta name="keywords" content="Marathon ${faction.name}, ${faction.name} faction, ${faction.name} contracts, ${faction.name} perks, ${faction.name} cosmetics, ${faction.name} reputation, Marathon factions">
    <meta name="robots" content="index, follow">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:image" content="${faction.iconUrl}">
    
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
    <meta name="twitter:image" content="${faction.iconUrl}">
    
    <link rel="canonical" href="${canonicalUrl}">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">
</head>
<body>
    ${generateNavigation('factions')}

    <main class="container">
        <!-- Breadcrumb -->
        <nav class="detail-breadcrumb" aria-label="Breadcrumb">
            <ol itemscope itemtype="https://schema.org/BreadcrumbList" style="display: flex; align-items: center; gap: 8px; list-style: none; margin: 0; padding: 0;">
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/"><span itemprop="name">Home</span></a>
                    <meta itemprop="position" content="1" />
                </li>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/factions/"><span itemprop="name">Factions</span></a>
                    <meta itemprop="position" content="2" />
                </li>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <span itemprop="name">${escapeHtml(faction.name)}</span>
                    <meta itemprop="position" content="3" />
                </li>
            </ol>
        </nav>

        <a href="//marathon/factions/" class="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"//marathon/></svg>
            Back to Factions
        </a>


        <!-- Mobile Top Ad -->

        <!-- Hero -->
        <div class="fh-hero" style="--faction-color: ${faction.color}">
            <div class="fh-hero-accent"></div>
            <div class="fh-hero-inner">
                <div class="fh-icon-wrap">
                    <img src="${faction.iconUrl}" alt="${escapeHtml(faction.name)}" width="96" height="96">
                </div>
                <div class="fh-hero-info">
                    <div class="fh-hero-badges">
                        <span class="fh-badge fh-badge-faction">Faction</span>
                        <span class="fh-badge fh-badge-agent">${escapeHtml(faction.agent)}</span>
                    </div>
                    <h1 class="fh-name">${escapeHtml(faction.name)}</h1>
                    <p class="fh-tagline">${escapeHtml(faction.tagline)}</p>
                    <p class="fh-description">${escapeHtml(faction.description)}</p>
                </div>
            </div>
        </div>

        <!-- Two Column Layout -->
        <div class="fh-grid" style="--faction-color: ${faction.color}">

            <!-- Left Column -->
            <div class="fh-left">

                <!-- About -->
                <div class="fh-panel">
                    <div class="fh-panel-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"//marathon/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"//marathon/></svg>
                        <h2>About ${escapeHtml(faction.name)}</h2>
                    </div>
                    <div class="fh-panel-body">
                        <div class="fh-lore-text">
                            ${faction.lore}
                        </div>
                    </div>
                </div>

                <!-- Faction Perks -->
                <div class="fh-panel">
                    <div class="fh-panel-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"//marathon/></svg>
                        <h2>Faction Perks</h2>
                    </div>
                    <div class="fh-panel-body">
                        <div class="fh-perks-grid">
${perksHtml}
                        </div>
                    </div>
                </div>

                <!-- Cosmetics -->
                <div class="fh-panel">
                    <div class="fh-panel-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9Z"//marathon/><path d="M11 3l1 6h-9"//marathon/><path d="M13 3l-1 6h9"//marathon/></svg>
                        <h2>Faction Cosmetics</h2>
                    </div>
                    <div class="fh-panel-body">
                        ${cosmeticsBodyHtml}
                    </div>
                </div>

                <!-- Contracts -->
                <div class="fh-panel">
                    <div class="fh-panel-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"//marathon/><path d="M14 2v6h6"//marathon/><path d="M16 13H8"//marathon/><path d="M16 17H8"//marathon/></svg>
                        <h2>Contracts</h2>
                    </div>
                    <div class="fh-panel-body">
                        ${contractsBodyHtml}
                    </div>
                </div>

            </div>

            <!-- Right Column / Sidebar -->
            <div class="fh-right">

                <!-- Quick Links -->
                <div class="fh-panel">
                    <div class="fh-panel-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"//marathon/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"//marathon/></svg>
                        <h2>Quick Links</h2>
                    </div>
                    <div class="fh-panel-body">
                        <div class="fh-quick-links">
                            <a href="//marathon/contracts/?faction=${faction.slug}" class="fh-quick-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"//marathon/><path d="M14 2v6h6"//marathon/></svg>
                                View All Contracts
                            </a>
                            <a href="/weapon-skins/" class="fh-quick-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"//marathon/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"//marathon/></svg>
                                Weapon Skins
                            </a>
                            <a href="/runner-skins/" class="fh-quick-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"//marathon/><circle cx="12" cy="7" r="4"//marathon/></svg>
                                Runner Skins
                            </a>
                            <a href="/charms/" class="fh-quick-link">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9Z"//marathon/></svg>
                                Charms
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Other Factions -->
                <div class="fh-panel">
                    <div class="fh-panel-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"//marathon/><circle cx="9" cy="7" r="4"//marathon/><path d="M22 21v-2a4 4 0 0 0-3-3.87"//marathon/><path d="M16 3.13a4 4 0 0 1 0 7.75"//marathon/></svg>
                        <h2>All Factions</h2>
                    </div>
                    <div class="fh-panel-body">
                        <div class="fh-other-factions">
${generateOtherFactionLinks(faction.slug)}
                        </div>
                    </div>
                </div>

            </div>
        </div>


        <!-- Mobile Top Ad -->
    </main>

    ${generateFooter()}

    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate factions listing page (/factions/index.html)
 */
function generateFactionsListingPage() {
    const canonicalUrl = `${SITE_URL}/factions/`;
    const title = 'Marathon Factions | MarathonDB';
    const metaDesc = 'Browse all factions in Marathon. Explore faction hubs for Arachne, Cyberacme, Nucaloric, Traxus, Mida, and Sekiguchi — perks, contracts, cosmetics, and lore.';

    const factionCardsHtml = ALL_FACTION_SLUGS.map(slug => {
        const f = FACTION_DATA[slug];
        return `
                <a href="//marathon/factions/${f.slug}/" class="fh-listing-card" style="--faction-color: ${f.color}">
                    <img src="${f.iconUrl}" alt="${escapeHtml(f.name)}" class="fh-listing-icon" width="56" height="56">
                    <div class="fh-listing-info">
                        <div class="fh-listing-name">${escapeHtml(f.name)}</div>
                        <div class="fh-listing-desc">${escapeHtml(f.description)}</div>
                    </div>
                    <svg class="fh-listing-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
                </a>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <meta name="keywords" content="Marathon factions, Arachne, Cyberacme, Nucaloric, Traxus, Mida, Sekiguchi, Marathon faction guide, faction contracts, faction perks">
    <meta name="robots" content="index, follow">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:image" content="https://marathondb.gg/Icon.png">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
    <meta name="twitter:image" content="https://marathondb.gg/Icon.png">
    
    <link rel="canonical" href="${canonicalUrl}">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">

    <!-- Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": title,
        "url": canonicalUrl,
        "description": metaDesc,
        "publisher": { "@type": "Organization", "name": "MarathonDB", "url": SITE_URL + "//marathon/" },
        "itemListElement": ALL_FACTION_SLUGS.map((slug, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": FACTION_DATA[slug].name,
            "url": `${SITE_URL}/factions/${slug}/`
        }))
    }, null, 2)}
    </script>
    <script type="application/ld+json">
    ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "//marathon/" },
            { "@type": "ListItem", "position": 2, "name": "Factions", "item": canonicalUrl }
        ]
    }, null, 2)}
    </script>
</head>
<body>
    ${generateNavigation('factions')}

    <main class="container">
        <header class="page-header compact-header">
            <div class="header-content">
                <div class="header-left">
                    <h1 class="page-title">FACTIONS</h1>
                    <span class="item-count">6 Factions</span>
                </div>
            </div>
            <p class="page-description" style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 8px; max-width: 700px;">
                Marathon features six competing factions, each with their own contracts, cosmetics, perks, and reputation systems. Pick your allegiance and start earning rewards.
            </p>
        </header>


        <!-- Mobile Top Ad -->

        <div class="fh-listing-grid">
${factionCardsHtml}
        </div>


        <!-- Mobile Top Ad -->
    </main>

    ${generateFooter()}

    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

/**
 * Build all faction pages (listing + 6 hub pages)
 */
async function buildFactions() {
    console.log('\n📦 Building Faction Hub Pages...\n');

    try {
        const factionsDir = path.join(OUTPUT_DIR, 'factions');
        ensureDir(factionsDir);

        // Listing page
        console.log('  Generating listing page...');
        const listingHtml = generateFactionsListingPage();
        writeFile(path.join(factionsDir, 'index.html'), listingHtml);

        // Individual faction hub pages
        console.log('  Generating faction hub pages...');
        for (const slug of ALL_FACTION_SLUGS) {
            const faction = FACTION_DATA[slug];
            const factionDir = path.join(factionsDir, slug);
            ensureDir(factionDir);
            const hubHtml = generateFactionHubPage(faction);
            writeFile(path.join(factionDir, 'index.html'), hubHtml);
            console.log(`    ✓ ${faction.name}`);
        }

        console.log(`\n✅ Successfully generated ${ALL_FACTION_SLUGS.length + 1} pages`);
        console.log('   - 1 listing page: /factions/index.html');
        console.log(`   - ${ALL_FACTION_SLUGS.length} hub pages: /factions/[slug]/index.html`);
    } catch (error) {
        console.error('\n❌ Error building factions:', error.message);
        process.exit(1);
    }
}

// ============================================================
// CONTRACTS SSG — Full pre-rendered faction contract pages
// ============================================================

/**
 * Helper: get reward detail URL for linking rewards to their detail pages
 */
function getRewardDetailUrl(reward) {
    if (!reward.reference_slug) return null;
    const slug = reward.reference_slug;
    const table = reward.reference_table || '';
    const cosmeticType = reward.cosmetic_type || '';

    if (table === 'cosmetics' || reward.reward_type === 'cosmetic') {
        const pathMap = {
            'background': '//marathon/backgrounds/',
            'charm': '//marathon/charms/',
            'emblem': '//marathon/emblems/',
            'sticker': '//marathon/stickers/',
            'weapon_skin': '//marathon/weapon-skins/',
            'runner_skin': '//marathon/runner-skins/',
        };
        return `${pathMap[cosmeticType] || '//marathon/runner-skins/'}${slug}/`;
    }
    if (table === 'cores') return `/marathon/cores/${slug}/`;
    if (table === 'items') return `/marathon/items/${slug}/`;
    if (table === 'weapons') return `/marathon/weapons/${slug}/`;
    if (table === 'mods') return `/marathon/mods/${slug}/`;
    return null;
}

/**
 * Render a single reward item as HTML (used in both sidebar and step rewards)
 */
function renderRewardHtml(reward, compact = false) {
    let iconHtml = '';
    let amountDisplay = '';

    if (reward.reward_type === 'reputation') {
        iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"//marathon/></svg>`;
        amountDisplay = `+${reward.amount}`;
    } else if (reward.reward_type === 'credits') {
        iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"//marathon/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8"//marathon/><path d="M12 18V6"//marathon/></svg>`;
        amountDisplay = reward.amount ? reward.amount.toLocaleString() : '';
    } else if (reward.reward_type === 'xp') {
        iconHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"//marathon/></svg>`;
        amountDisplay = `+${reward.amount} XP`;
    } else {
        iconHtml = reward.icon_url
            ? `<img src="${escapeHtml(reward.icon_url)}" alt="" loading="lazy">`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"//marathon/></svg>`;
        if (reward.amount && reward.amount > 1) amountDisplay = `×${reward.amount}`;
    }

    const chanceDisplay = (reward.is_guaranteed === false && reward.drop_chance)
        ? `<span class="reward-chance">${Math.round(reward.drop_chance * 100)}% chance</span>` : '';
    const rarityDisplay = reward.rarity
        ? `<span class="reward-rarity ${reward.rarity.toLowerCase()}">${escapeHtml(reward.rarity)}</span>` : '';
    const detailUrl = getRewardDetailUrl(reward);

    if (compact) {
        return `<span class="step-reward-chip">${reward.icon_url ? `<img src="${escapeHtml(reward.icon_url)}" alt="">` : ''}${amountDisplay || escapeHtml(reward.display_name)}</span>`;
    }

    const tag = detailUrl ? 'a' : 'div';
    const hrefAttr = detailUrl ? ` href="${detailUrl}"` : '';
    return `
        <${tag}${hrefAttr} class="reward-item">
            <div class="reward-icon ${reward.reward_type}">${iconHtml}</div>
            <div class="reward-info">
                <span class="reward-name">${escapeHtml(reward.display_name)}</span>
                ${amountDisplay ? `<span class="reward-amount">${amountDisplay}</span>` : ''}
                ${rarityDisplay}
                ${chanceDisplay}
            </div>
        </${tag}>`;
}

/**
 * Generate contract detail page HTML
 */
function generateContractDetailPage(contract, factionSlug, allContracts) {
    const name = escapeHtml(contract.name);
    const slug = contract.slug;
    const desc = escapeHtml(contract.description || '');
    const faction = contract.faction || {};
    const factionName = escapeHtml(faction.name || '');
    const factionIcon = faction.icon_url || '';
    const factionColor = faction.color_surface || '#00ffa9';
    const factionOnColor = faction.color_on_surface || '#000';
    const canonicalUrl = `${SITE_URL}/factions/${factionSlug}/contracts/${slug}/`;

    const contractType = contract.contract_type || 'permanent';
    const difficulty = contract.difficulty || 'normal';
    const scope = contract.scope || 'cumulative';
    const steps = contract.steps || [];
    const completionRewards = contract.completion_rewards || [];
    const choiceRewards = contract.choice_rewards || [];
    const prerequisites = contract.prerequisites || [];
    const relatedContracts = contract.related_contracts || [];
    const tips = contract.tips || [];
    const tags = contract.tag_objects || (contract.tags || []).map(t => ({ slug: t, name: capitalizeFirst(t), color: '#666' }));

    const metaDesc = `${contract.name} contract guide for ${faction.name || factionSlug} in Marathon. ${steps.length}-step mission with walkthrough, objectives, and rewards.`;
    const ogImage = factionIcon || `${SITE_URL}/Icon.png`;

    // Structured data
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": contract.name,
        "description": contract.description || metaDesc,
        "image": ogImage,
        "totalTime": `PT${steps.length * 5}M`,
        "step": steps.map((s, i) => ({
            "@type": "HowToStep",
            "position": i + 1,
            "name": s.name,
            "text": s.description,
            ...(s.location_hint ? { "url": `${canonicalUrl}#step-${s.step_number}` } : {})
        }))
    };

    // Build steps HTML
    let stepsHtml = '';
    if (steps.length > 0) {
        const stepsInner = steps.map((step, idx) => {
            const locHint = step.location_hint ? `
                <div class="step-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"//marathon/><circle cx="12" cy="10" r="3"//marathon/></svg>
                    ${escapeHtml(step.location_hint)}
                </div>` : '';

            const stepRewardsHtml = (step.rewards && step.rewards.length > 0)
                ? `<div class="step-rewards-inline">${step.rewards.map(r => renderRewardHtml(r, true)).join('')}</div>` : '';

            const walkthroughHtml = step.walkthrough ? `
                <div class="step-walkthrough">
                    <button class="step-walkthrough-toggle" data-step="${step.step_number}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
                        View Guide
                    </button>
                    <div class="step-walkthrough-content">${markdownToHtml(step.walkthrough)}</div>
                </div>` : '';

            return `
            <div class="step-item" id="step-${step.step_number}">
                <div class="step-marker">${step.step_number}</div>
                <div class="step-card">
                    <div class="step-card-header">
                        <span class="step-name">${escapeHtml(step.name)}</span>
                        ${step.count > 1 ? `<span class="step-count">[${step.count}]</span>` : ''}
                    </div>
                    <p class="step-description">${escapeHtml(step.description)}</p>
                    ${locHint}
                    ${stepRewardsHtml}
                    ${walkthroughHtml}
                </div>
            </div>`;
        }).join('');

        stepsHtml = `
        <section class="contract-steps">
            <h2 class="contract-steps-title">Objectives — ${steps.length} Step${steps.length > 1 ? 's' : ''}</h2>
            <div class="step-timeline">${stepsInner}</div>
        </section>`;
    }

    // Chain navigation
    let chainHtml = '';
    if (contract.chain_slug && contract.chain_total > 1) {
        const chainContracts = allContracts
            .filter(c => c.chain_slug === contract.chain_slug)
            .sort((a, b) => (a.chain_position || 0) - (b.chain_position || 0));

        const dots = Array.from({ length: contract.chain_total }, (_, i) => {
            const pos = i + 1;
            const isCurrent = pos === contract.chain_position;
            const match = chainContracts.find(c => c.chain_position === pos);
            const href = match ? `/factions/${factionSlug}/contracts/${match.slug}/` : '#';
            return `<a href="${href}" class="chain-dot ${isCurrent ? 'current' : ''}" title="Part ${pos}"></a>`;
        }).join('');

        const prevContract = chainContracts.find(c => c.chain_position === (contract.chain_position || 1) - 1);
        const nextContract = chainContracts.find(c => c.chain_position === (contract.chain_position || 1) + 1);

        chainHtml = `
        <div class="chain-nav">
            <span class="chain-nav-label">Part ${contract.chain_position} of ${contract.chain_total}</span>
            <div class="chain-nav-progress">${dots}</div>
            <div class="chain-nav-links">
                ${prevContract ? `<a href="//marathon/factions/${factionSlug}/contracts/${prevContract.slug}/">← Prev</a>` : ''}
                ${nextContract ? `<a href="//marathon/factions/${factionSlug}/contracts/${nextContract.slug}/">Next →</a>` : ''}
            </div>
        </div>`;
    }

    // Tags HTML
    const tagsHtml = tags.length > 0 ? tags.map(t =>
        `<span class="contract-meta-tag" style="border-color:${t.color || '#666'};color:${t.color || '#666'}">${escapeHtml(t.name)}</span>`
    ).join('') : '';

    // Completion rewards sidebar
    const completionRewardsHtml = completionRewards.length > 0
        ? `<div class="sidebar-card"><div class="sidebar-card-header">Completion Rewards</div><div class="reward-list">${completionRewards.map(r => renderRewardHtml(r)).join('')}</div></div>` : '';

    // Choice rewards sidebar
    const choiceRewardsHtml = choiceRewards.length > 0
        ? choiceRewards.map(group => {
            const optionsHtml = group.options.map(opt => {
                const url = getRewardDetailUrl(opt);
                const tag = url ? 'a' : 'div';
                const href = url ? ` href="${url}"` : '';
                return `<${tag}${href} class="choice-option">
                    ${opt.icon_url ? `<img class="choice-option-icon" src="${escapeHtml(opt.icon_url)}" alt="" loading="lazy">` : ''}
                    <div class="choice-option-info">
                        <span class="choice-option-name">${escapeHtml(opt.display_name)}</span>
                        ${opt.rarity ? `<span class="choice-option-rarity reward-rarity ${opt.rarity.toLowerCase()}">${escapeHtml(opt.rarity)}</span>` : ''}
                    </div>
                </${tag}>`;
            }).join('');
            return `<div class="sidebar-card"><div class="sidebar-card-header">Choose Reward</div><div class="choice-reward-group">
                <p class="choice-prompt">${escapeHtml(group.prompt || 'Choose your reward')}</p>
                <p class="choice-pick-info">Pick ${group.min_picks}${group.max_picks > group.min_picks ? ` – ${group.max_picks}` : ''}</p>
                <div class="choice-options">${optionsHtml}</div>
            </div></div>`;
        }).join('') : '';

    // Prerequisites sidebar
    const prereqHtml = prerequisites.length > 0
        ? `<div class="sidebar-card"><div class="sidebar-card-header">Prerequisites</div><div class="prereq-list">${prerequisites.map(p => {
            if (p.type === 'contract') {
                return `<div class="prereq-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"//marathon/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"//marathon/></svg><span>Complete <a href="/factions/${factionSlug}/contracts/${p.slug}/">${escapeHtml(p.name)}</a></span></div>`;
            }
            return `<div class="prereq-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"//marathon/></svg><span>${escapeHtml(p.description || `Reach Rank ${p.rank_required}`)}</span></div>`;
        }).join('')}</div></div>` : '';

    // Tips sidebar
    const tipsHtml = tips.length > 0
        ? `<div class="sidebar-card"><div class="sidebar-card-header">Tips & Strategy</div><ul class="tips-list">${tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></div>` : '';

    // Related contracts sidebar
    const relatedHtml = relatedContracts.length > 0
        ? `<div class="sidebar-card"><div class="sidebar-card-header">Related Contracts</div><div class="related-list">${relatedContracts.map(r => {
            const relType = r.contract_type || 'permanent';
            return `<a href="//marathon/factions/${factionSlug}/contracts/${r.slug}/" class="related-item">
                <span class="related-name">${escapeHtml(r.name)}</span>
                <span class="related-type ${relType}">${capitalizeFirst(relType)}</span>
            </a>`;
        }).join('')}</div></div>` : '';

    // Video embed
    const videoHtml = contract.video_url ? `
        <div class="contract-video">
            <iframe src="${contract.video_url.replace('watch?v=', 'embed/')}" title="Video guide for ${name}" allowfullscreen loading="lazy"></iframe>
        </div>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <meta name="keywords" content="marathon, ${escapeHtml(contract.name)}, ${factionName}, contract, guide, walkthrough, rewards, objectives">
    <meta name="robots" content="index, follow">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${name} — ${factionName} Contract | MARATHON DB">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:image" content="${ogImage}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${name} — ${factionName} Contract | MARATHON DB">
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
    <meta name="twitter:image" content="${ogImage}">
    <link rel="canonical" href="${canonicalUrl}">
    <title>${name} — ${factionName} Contract | MarathonDB</title>
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">
    <link rel="stylesheet" href="//marathon/css/contracts.css">
    <style>:root{--faction-color:${factionColor};--faction-on-color:${factionOnColor}}</style>
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
    </script>
</head>
<body>
    ${generateNavigation('factions')}

    <main class="container contract-detail-page">
        <!-- Breadcrumb -->
        <nav class="detail-breadcrumb" aria-label="Breadcrumb">
            <ol itemscope itemtype="https://schema.org/BreadcrumbList">
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/"><span itemprop="name">Home</span></a>
                    <meta itemprop="position" content="1">
                </li>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/factions/"><span itemprop="name">Factions</span></a>
                    <meta itemprop="position" content="2">
                </li>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/factions/${factionSlug}/contracts/"><span itemprop="name">${factionName} Contracts</span></a>
                    <meta itemprop="position" content="3">
                </li>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <span itemprop="name">${name}</span>
                    <meta itemprop="position" content="4">
                </li>
            </ol>
        </nav>
        <a href="//marathon/factions/${factionSlug}/contracts/" class="back-link">← Back to ${factionName} Contracts</a>


        <!-- Mobile Top Ad -->

        <!-- Header -->
        <header class="contract-detail-header">
            <div class="contract-detail-badges">
                <a href="//marathon/factions/${factionSlug}/contracts/" class="contract-faction-badge">
                    ${factionIcon ? `<img src="${escapeHtml(factionIcon)}" alt="${factionName}">` : ''}
                    ${factionName}
                </a>
                <span class="contract-type-badge ${contractType}">${capitalizeFirst(contractType)}</span>
                <span class="contract-diff-badge ${difficulty}">${capitalizeFirst(difficulty)}</span>
                <span class="contract-scope-badge ${scope}">${scope === 'single_run' ? 'Single Run' : scope === 'cumulative' ? 'Cumulative' : capitalizeFirst(scope)}</span>
                ${contract.is_repeatable ? '<span class="contract-scope-badge">Repeatable</span>' : ''}
            </div>
            <h1 class="contract-detail-title">${name}</h1>
            <p class="contract-detail-desc">${desc}</p>
            ${tagsHtml ? `<div class="contract-detail-meta">${tagsHtml}</div>` : ''}
        </header>

        ${chainHtml}

        <div class="contract-detail-layout">
            <!-- Main column -->
            <div class="contract-main">
                ${stepsHtml}
                ${videoHtml}
            </div>

            <!-- Sidebar -->
            <aside class="contract-sidebar">
                ${completionRewardsHtml}
                ${choiceRewardsHtml}
                ${prereqHtml}
                ${tipsHtml}
                ${relatedHtml}
            </aside>
        </div>


        <!-- Mobile Top Ad -->
    </main>

    ${generateFooter()}
    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate faction contracts listing page HTML
 */
function generateFactionContractsListingPage(factionSummary, contracts, allTags) {
    const factionName = escapeHtml(factionSummary.name || '');
    const factionSlug = factionSummary.slug;
    const factionIcon = factionSummary.icon_url || '';
    const factionColor = factionSummary.color_surface || '#00ffa9';
    const factionOnColor = factionSummary.color_on_surface || '#000';
    const canonicalUrl = `${SITE_URL}/factions/${factionSlug}/contracts/`;
    const metaDesc = `All ${factionSummary.name} contracts and missions in Marathon. Browse ${contracts.length} contracts with objectives, rewards, guides, and walkthroughs.`;

    // Structured data
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${factionSummary.name} Contracts — Marathon`,
        "description": metaDesc,
        "url": canonicalUrl,
        "numberOfItems": contracts.length,
        "itemListElement": contracts.map((c, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": c.name,
            "url": `${SITE_URL}/factions/${factionSlug}/contracts/${c.slug}/`
        }))
    };

    // Aggregate counts for filter chips
    const typeCounts = {};
    const difficultyCounts = {};
    contracts.forEach(c => {
        const t = c.contract_type || 'permanent';
        const d = c.difficulty || 'normal';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
        difficultyCounts[d] = (difficultyCounts[d] || 0) + 1;
    });

    // Tag filter chips
    const usedTagSlugs = new Set(contracts.flatMap(c => c.tags || []));
    const relevantTags = allTags.filter(t => usedTagSlugs.has(t.slug));

    // Contract cards HTML
    const cardsHtml = contracts.map(c => {
        const cType = c.contract_type || 'permanent';
        const cDiff = c.difficulty || 'normal';
        const cTags = c.tag_objects || (c.tags || []).map(t => {
            const found = allTags.find(at => at.slug === t);
            return found || { slug: t, name: capitalizeFirst(t), color: '#666' };
        });
        const tagDots = cTags.map(t => `<span class="contract-tag-dot" style="background:${t.color}" title="${escapeHtml(t.name)}"></span>`).join('');

        return `
        <a href="//marathon/factions/${factionSlug}/contracts/${c.slug}/" class="contract-card" data-type="${cType}" data-difficulty="${cDiff}" data-tags="${(c.tags || []).join(',')}" style="--faction-color:${factionColor}">
            <div class="contract-card-top">
                <span class="contract-type-badge ${cType}">${capitalizeFirst(cType)}</span>
                <span class="contract-diff-badge ${cDiff}">${capitalizeFirst(cDiff)}</span>
                ${tagDots ? `<div class="contract-card-tags">${tagDots}</div>` : ''}
            </div>
            <h3>${escapeHtml(c.name)}</h3>
            <p class="contract-card-desc">${escapeHtml(c.description || '')}</p>
            <div class="contract-card-meta">
                <span class="contract-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"//marathon/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"//marathon/></svg>
                    ${c.step_count || 0} step${(c.step_count || 0) !== 1 ? 's' : ''}
                </span>
                ${c.total_reputation ? `<span class="contract-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"//marathon/></svg>+${c.total_reputation} Rep</span>` : ''}
                ${c.chain_slug ? `<span class="contract-chain-badge">Part ${c.chain_position || '?'} of ${c.chain_total || '?'}</span>` : ''}
            </div>
        </a>`;
    }).join('');

    // Filter type chips
    const typeChipsHtml = ['all', 'permanent', 'seasonal', 'daily', 'weekly', 'story']
        .filter(t => t === 'all' || typeCounts[t])
        .map(t => `<button class="filter-chip ${t === 'all' ? 'active' : ''}" data-filter="type" data-value="${t}">${capitalizeFirst(t)}${t !== 'all' ? ` <span class="chip-count">(${typeCounts[t] || 0})</span>` : ''}</button>`)
        .join('');

    // Filter difficulty chips
    const diffChipsHtml = ['all', 'easy', 'normal', 'hard', 'legendary']
        .filter(d => d === 'all' || difficultyCounts[d])
        .map(d => `<button class="filter-chip ${d === 'all' ? 'active' : ''}" data-filter="difficulty" data-value="${d}">${capitalizeFirst(d)}${d !== 'all' ? ` <span class="chip-count">(${difficultyCounts[d] || 0})</span>` : ''}</button>`)
        .join('');

    // Tag chips
    const tagChipsHtml = relevantTags.map(t =>
        `<button class="tag-chip" data-filter="tag" data-value="${t.slug}" style="--tag-color:${t.color};border-color:${t.color};color:${t.color}">${escapeHtml(t.name)}</button>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <meta name="keywords" content="marathon, ${factionName}, contracts, missions, guide, walkthrough, rewards">
    <meta name="robots" content="index, follow">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${factionName} Contracts | MARATHON DB">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:image" content="${factionIcon || `${SITE_URL}/Icon.png`}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${factionName} Contracts | MARATHON DB">
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
    <link rel="canonical" href="${canonicalUrl}">
    <title>${factionName} Contracts — Mission Guides & Rewards | MARATHON DB</title>
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">
    <link rel="stylesheet" href="//marathon/css/contracts.css">
    <style>:root{--faction-color:${factionColor};--faction-on-color:${factionOnColor}}</style>
    <script type="application/ld+json">
    ${JSON.stringify(structuredData, null, 2)}
    </script>
</head>
<body>
    ${generateNavigation('factions')}

    <main class="container contracts-page">
        <!-- Breadcrumb -->
        <nav class="detail-breadcrumb" aria-label="Breadcrumb">
            <ol itemscope itemtype="https://schema.org/BreadcrumbList">
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/"><span itemprop="name">Home</span></a>
                    <meta itemprop="position" content="1">
                </li>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/factions/"><span itemprop="name">Factions</span></a>
                    <meta itemprop="position" content="2">
                </li>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <span itemprop="name">${factionName} Contracts</span>
                    <meta itemprop="position" content="3">
                </li>
            </ol>
        </nav>
        <a href="//marathon/factions/" class="back-link">← Back to Factions</a>


        <!-- Mobile Top Ad -->

        <div class="contracts-header">
            ${factionIcon ? `<img src="${escapeHtml(factionIcon)}" alt="${factionName}" class="contracts-header-icon">` : ''}
            <div class="contracts-header-text">
                <h1>${factionName} Contracts</h1>
                <p>${contracts.length} contract${contracts.length !== 1 ? 's' : ''} · Missions, Objectives & Guides</p>
            </div>
        </div>

        <div class="contracts-filters">
            <div class="contracts-filter-group" data-label="Type">${typeChipsHtml}</div>
            <div class="contracts-filter-group" data-label="Difficulty">${diffChipsHtml}</div>
            ${tagChipsHtml ? `<div class="contracts-filter-group" data-label="Tags">${tagChipsHtml}</div>` : ''}
        </div>

        <div class="contracts-grid" id="contractsGrid">
            ${cardsHtml}
        </div>
        <div class="contracts-empty" id="contractsEmpty" style="display:none">No contracts match the selected filters.</div>


        <!-- Mobile Top Ad -->
    </main>

    ${generateFooter()}
    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/contracts-filter.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

/**
 * Build all contract pages — SSG from API data
 *
 * Generates:
 *   /factions/:slug/contracts/index.html  (listing per faction)
 *   /factions/:slug/contracts/:contract-slug/index.html (detail)
 */
async function buildContracts() {
    console.log('\n📋 Building Contracts Pages...\n');

    try {
        // 1. Fetch factions list
        const factionsRes = await fetchJSON(`${API_BASE}/api/factions`);
        if (!factionsRes || !factionsRes.data) {
            console.log('  ⚠️  No factions data returned from API');
            return;
        }
        const factions = factionsRes.data;
        console.log(`  Found ${factions.length} faction(s)`);

        // 2. Fetch all tags
        let allTags = [];
        try {
            const tagsRes = await fetchJSON(`${API_BASE}/api/contract-tags`);
            if (tagsRes && tagsRes.data) allTags = tagsRes.data;
        } catch (e) {
            console.log('  ⚠️  Could not fetch contract tags, continuing without');
        }

        // 3. Fetch all contracts (for cross-referencing chains)
        let allContractsListing = [];
        try {
            const allRes = await fetchJSON(`${API_BASE}/api/contracts`);
            if (allRes && allRes.data) allContractsListing = allRes.data;
        } catch (e) {
            console.log('  ⚠️  Could not fetch global contracts list');
        }

        let totalListingPages = 0;
        let totalDetailPages = 0;

        // 4. For each faction, fetch contracts and build pages
        for (const faction of factions) {
            console.log(`\n  📂 ${faction.name} (${faction.slug})`);

            // Fetch faction contracts listing
            let factionContracts = [];
            try {
                const fcRes = await fetchJSON(`${API_BASE}/api/factions/${faction.slug}/contracts`);
                if (fcRes && fcRes.data) {
                    factionContracts = fcRes.data;
                }
            } catch (e) {
                console.log(`    ⚠️  Could not fetch contracts for ${faction.slug}`);
                continue;
            }

            if (factionContracts.length === 0) {
                console.log(`    No contracts found, skipping`);
                continue;
            }

            console.log(`    Found ${factionContracts.length} contract(s)`);

            // contracts listing page
            const contractsDir = path.join(OUTPUT_DIR, 'factions', faction.slug, 'contracts');
            ensureDir(contractsDir);

            const listingHtml = generateFactionContractsListingPage(faction, factionContracts, allTags);
            writeFile(path.join(contractsDir, 'index.html'), listingHtml);
            totalListingPages++;

            // individual contract detail pages
            for (const contractSummary of factionContracts) {
                try {
                    const detailRes = await fetchJSON(`${API_BASE}/api/contracts/${contractSummary.slug}`);
                    if (!detailRes || !detailRes.contract) {
                        console.log(`    ⚠️  No detail for ${contractSummary.slug}`);
                        continue;
                    }

                    const contract = detailRes.contract;
                    const detailHtml = generateContractDetailPage(contract, faction.slug, allContractsListing);
                    const detailDir = path.join(contractsDir, contract.slug);
                    writeFile(path.join(detailDir, 'index.html'), detailHtml);
                    totalDetailPages++;
                } catch (e) {
                    console.log(`    ⚠️  Error building ${contractSummary.slug}: ${e.message}`);
                }
            }
        }

        console.log(`\n✅ Successfully generated ${totalListingPages + totalDetailPages} contract pages`);
        console.log(`   - ${totalListingPages} listing page(s): /factions/[faction]/contracts/index.html`);
        console.log(`   - ${totalDetailPages} detail page(s): /factions/[faction]/contracts/[slug]/index.html`);

    } catch (error) {
        console.error('\n❌ Error building contracts:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

// ============================================================
// MAPS SSG (shell page — content is client-rendered)
// ============================================================

/**
 * Generate maps page (/maps/index.html)
 * This is a shell page — map data is loaded client-side via API.
 */
function generateMapsPage() {
    const canonicalUrl = `${SITE_URL}/maps/`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
${headLoaderScript()}
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Explore Marathon game maps and locations. Complete map database with layouts, strategies, and competitive gameplay information for Bungie's Marathon.">
    <meta name="keywords" content="Marathon maps, game maps, map guide, map layout, level design, Marathon locations, competitive maps, gameplay strategy">
    <meta name="robots" content="index, follow">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="Maps Database - MARATHON DB">
    <meta property="og:description" content="Complete maps and locations database for Marathon by Bungie.">
    <meta property="og:image" content="https://marathondb.gg/Icon.png">
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Maps Database - MARATHON DB">
    <meta name="twitter:description" content="Complete maps database with layouts, strategies, and competitive information.">
    <meta name="twitter:image" content="https://marathondb.gg/Icon.png">
    
    <link rel="canonical" href="${canonicalUrl}">
    <title>Maps Database - MARATHON DB | Locations &amp; Strategies</title>
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">

    <!-- Structured Data -->
    <script type="application/ld+json">
    ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Maps Database - MARATHON DB",
        "url": canonicalUrl,
        "description": "Explore Marathon game maps and locations. Complete map database with layouts, strategies, and competitive gameplay information.",
        "publisher": { "@type": "Organization", "name": "MarathonDB", "url": SITE_URL + "//marathon/" }
    }, null, 2)}
    </script>
    <script type="application/ld+json">
    ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "//marathon/" },
            { "@type": "ListItem", "position": 2, "name": "Maps", "item": canonicalUrl }
        ]
    }, null, 2)}
    </script>
</head>
<body>
    ${generateNavigation('maps')}

    <!-- Fixed Siderail Ads (sticky) -->
    <aside class="ad-siderail-fixed ad-siderail-fixed--left">
        <div class="ad-siderail-sticky">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </aside>
    <aside class="ad-siderail-fixed ad-siderail-fixed--right">
        <div class="ad-siderail-sticky">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </aside>

    <main class="container">
        <!-- Compact Header -->
        <header class="page-header-compact">
            <div class="page-header-left">
                <h1 class="page-title-compact">INTERACTIVE MAPS</h1>
            </div>
            <div class="page-header-right">
                <p class="page-subtitle">Explore maps with points of interest, extraction zones, and activities</p>
            </div>
        </header>

        <section class="maps-main" aria-label="Map viewer">
                        <!-- Map Legend -->
                        <div class="map-legend">
                            <span class="legend-title">Quick Guide:</span>
                            <span class="legend-item"><span class="legend-dot navigation"></span> Navigation</span>
                            <span class="legend-item"><span class="legend-dot extraction"></span> Extraction</span>
                            <span class="legend-item"><span class="legend-dot activity"></span> Activities</span>
                            <span class="legend-item"><span class="legend-dot loot"></span> Loot</span>
                            <span class="legend-item"><span class="legend-dot enemy"></span> Enemies</span>
                        </div>
        </section>

        <!-- Pre-footer Ad -->
        <div class="ad-safe-zone ad-safe-zone--below-hero">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </main>

    ${generateFooter()}

    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/maps.js"></script>
    <script src="//marathon/js/main.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

/**
 * Build maps page (single shell page)
 */
async function buildMaps() {
    console.log('\n📦 Building Maps Page...\n');

    try {
        const mapsDir = path.join(OUTPUT_DIR, 'maps');
        ensureDir(mapsDir);

        const html = generateMapsPage();
        writeFile(path.join(mapsDir, 'index.html'), html);

        console.log('\n✅ Successfully generated 1 page');
        console.log('   - 1 listing page: /maps/index.html');
    } catch (error) {
        console.error('\n❌ Error building maps:', error.message);
        process.exit(1);
    }
}

/**
 * Build weapons pages
 */
async function buildWeapons() {
    console.log('\n📦 Building Weapons Pages...\n');

    try {
        // Fetch all weapons (list endpoint)
        console.log('  Fetching weapons from API...');
        const response = await fetchJSON(`${API_BASE}/api/weapons`);

        if (!response || !response.success || !Array.isArray(response.data)) {
            throw new Error('Invalid API response: ' + JSON.stringify(response));
        }

        const weaponsList = response.data;
        console.log(`  Found ${weaponsList.length} weapons\n`);

        // Fetch categories for listing page tabs
        console.log('  Fetching weapon categories...');
        let categories = [];
        try {
            const catResponse = await fetchJSON(`${API_BASE}/api/categories`);
            if (catResponse?.data) {
                categories = catResponse.data;
                console.log(`  Found ${categories.length} categories\n`);
            }
        } catch (catErr) {
            console.log('  ⚠ Categories fetch failed, using empty\n');
        }

        // Fetch individual weapon details (for full stats, mods, history, etc.)
        console.log('  Fetching individual weapon details...');
        const fullWeapons = [];
        for (const listWeapon of weaponsList) {
            try {
                const detailRes = await fetchJSON(`${API_BASE}/api/weapons/${listWeapon.slug}`);
                if (detailRes && detailRes.data) {
                    // Also fetch history
                    try {
                        const historyRes = await fetchJSON(`${API_BASE}/api/weapons/${listWeapon.slug}/history`);
                        if (historyRes && historyRes.data) {
                            detailRes.data.history = historyRes.data;
                        }
                    } catch (histErr) {
                        console.log(`    ⚠ ${listWeapon.name} - history fetch failed`);
                    }
                    fullWeapons.push(detailRes.data);
                    console.log(`    ✓ ${listWeapon.name}`);
                } else {
                    console.log(`    ⚠ ${listWeapon.name} - using list data`);
                    fullWeapons.push(listWeapon);
                }
            } catch (err) {
                console.log(`    ⚠ ${listWeapon.name} - fetch failed, using list data`);
                fullWeapons.push(listWeapon);
            }
        }

        // Fetch community ratings for AggregateRating schema
        console.log('\n  Fetching weapon ratings...');
        try {
            const ratingsRes = await fetchJSON(`${API_BASE}/api/ratings/weapons`);
            if (ratingsRes?.success && Array.isArray(ratingsRes.data)) {
                let applied = 0;
                for (const r of ratingsRes.data) {
                    if (!r.weapon_slug || !r.average_rating || !r.total_votes) continue;
                    const w = fullWeapons.find(w => (w.slug || w.id) === r.weapon_slug);
                    if (w) {
                        w.average_rating = parseFloat(r.average_rating).toFixed(1);
                        w.rating_count = r.total_votes;
                        applied++;
                    }
                }
                console.log(`  Applied ratings to ${applied} weapons`);
            }
        } catch (ratErr) {
            console.log('  \u26A0 Weapon ratings fetch failed, schema will omit AggregateRating');
        }

        // Fetch V3 cosmetics for accurate skin counts
        console.log('\n  Fetching V3 weapon skin counts...');
        try {
            const v3Res = await fetchJSON(`${API_BASE}/api/v3/cosmetics/weapon-skins`);
            if (v3Res?.success && Array.isArray(v3Res.data)) {
                const skinCounts = {};
                for (const skin of v3Res.data) {
                    const wSlug = skin.weapon?.slug;
                    if (wSlug) skinCounts[wSlug] = (skinCounts[wSlug] || 0) + 1;
                }
                // Override skins_count on list & detail weapons
                for (const w of weaponsList) {
                    if (skinCounts[w.slug] !== undefined) w.skins_count = skinCounts[w.slug];
                }
                for (const w of fullWeapons) {
                    if (skinCounts[w.slug] !== undefined) w.skins_count = skinCounts[w.slug];
                }
                console.log(`  Applied V3 skin counts for ${Object.keys(skinCounts).length} weapons`);
            }
        } catch (v3Err) {
            console.log('  ⚠ V3 skin counts fetch failed, using API defaults');
        }

        // Create output directory
        const weaponsDir = path.join(OUTPUT_DIR, 'weapons');
        ensureDir(weaponsDir);

        // Generate listing page (skip if hand-crafted)
        const weaponsListingTarget = path.join(weaponsDir, 'index.html');
        if (isHandCrafted(weaponsListingTarget)) {
            console.log('\n  ⏭ Skipped listing page (hand-crafted): /weapons/index.html');
        } else {
            console.log('\n  Generating listing page...');
            const listingHtml = generateWeaponsListingPage(weaponsList, categories);
            writeFile(weaponsListingTarget, listingHtml);
        }

        // Generate individual weapon pages
        console.log('\n  Generating detail pages...');
        for (const weapon of fullWeapons) {
            const weaponDir = path.join(weaponsDir, weapon.slug);
            const targetFile = path.join(weaponDir, 'index.html');
            if (isHandCrafted(targetFile)) {
                console.log(`  ⏭ Skipped (hand-crafted): /weapons/${weapon.slug}/`);
                continue;
            }
            const detailHtml = generateWeaponDetailPage(weapon, weaponsList);
            writeFile(targetFile, detailHtml);
        }

        // Generate tier list page
        console.log('\n  Generating tier list page...');
        const tierListDir = path.join(weaponsDir, 'tier-list');
        const tierListHtml = generateWeaponTierListPage(weaponsList);
        writeFile(path.join(tierListDir, 'index.html'), tierListHtml);

        console.log(`\n✅ Successfully generated ${fullWeapons.length + 2} pages`);
        console.log(`   - 1 listing page: /weapons/index.html`);
        console.log(`   - ${fullWeapons.length} detail pages: /weapons/[slug]/index.html`);
        console.log(`   - 1 tier list page: /weapons/tier-list/index.html`);

    } catch (error) {
        console.error('\n❌ Error building weapons:', error.message);
        process.exit(1);
    }
}

// ============================================================
// NEWS / ARTICLES BUILDER
// ============================================================

/**
 * Parse Markdown frontmatter from article source files.
 * Expects YAML-style frontmatter between --- delimiters.
 */
function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: content };

    const meta = {};
    const lines = match[1].split(/\r?\n/);
    for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();

        // Handle quoted strings
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        // Handle arrays [item1, item2]
        if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        }
        // Handle booleans
        if (value === 'true') value = true;
        if (value === 'false') value = false;

        meta[key] = value;
    }

    return { meta, body: match[2] };
}

/**
 * Convert Markdown to HTML.
 * Lightweight parser — handles headings, bold, italic, links, images,
 * lists, blockquotes, code blocks, inline code, horizontal rules, and paragraphs.
 */
function markdownToHtml(md) {
    let html = '';
    const lines = md.split(/\r?\n/);
    let i = 0;
    let inList = false;
    let listType = null; // 'ul' or 'ol'

    function closeList() {
        if (inList) {
            html += `</${listType}>\n`;
            inList = false;
            listType = null;
        }
    }

    function inlineFormat(text) {
        // Images: ![alt](src)
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
        // Links: [text](url)
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        // Bold: **text** or __text__
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
        // Italic: *text* or _text_
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        text = text.replace(/_(.+?)_/g, '<em>$1</em>');
        // Inline code: `code`
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        return text;
    }

    while (i < lines.length) {
        const line = lines[i];

        // Code blocks: ```
        if (line.trim().startsWith('```')) {
            closeList();
            const lang = line.trim().slice(3).trim();
            i++;
            let code = '';
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                code += escapeHtml(lines[i]) + '\n';
                i++;
            }
            html += `<pre><code${lang ? ` class="language-${lang}"` : ''}>${code.trimEnd()}</code></pre>\n`;
            i++;
            continue;
        }

        // Horizontal rule: --- or ***
        if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
            closeList();
            html += '<hr>\n';
            i++;
            continue;
        }

        // Headings: ## Heading
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (headingMatch) {
            closeList();
            const level = headingMatch[1].length;
            const text = inlineFormat(headingMatch[2].trim());
            const id = headingMatch[2].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            html += `<h${level} id="${id}">${text}</h${level}>\n`;
            i++;
            continue;
        }

        // Blockquote: > text
        if (line.trim().startsWith('> ')) {
            closeList();
            let quoteLines = [];
            while (i < lines.length && lines[i].trim().startsWith('> ')) {
                quoteLines.push(lines[i].trim().slice(2));
                i++;
            }
            html += `<blockquote><p>${inlineFormat(quoteLines.join(' '))}</p></blockquote>\n`;
            continue;
        }

        // Unordered list: - item or * item
        const ulMatch = line.match(/^(\s*)[-*]\s+(.+)/);
        if (ulMatch) {
            if (!inList || listType !== 'ul') {
                closeList();
                html += '<ul>\n';
                inList = true;
                listType = 'ul';
            }
            html += `<li>${inlineFormat(ulMatch[2])}</li>\n`;
            i++;
            continue;
        }

        // Ordered list: 1. item
        const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
        if (olMatch) {
            if (!inList || listType !== 'ol') {
                closeList();
                html += '<ol>\n';
                inList = true;
                listType = 'ol';
            }
            html += `<li>${inlineFormat(olMatch[2])}</li>\n`;
            i++;
            continue;
        }

        // Empty line
        if (line.trim() === '') {
            closeList();
            i++;
            continue;
        }

        // Paragraph (collect consecutive non-empty lines)
        closeList();
        let paraLines = [];
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^#{1,6}\s/) && !lines[i].trim().startsWith('> ') && !lines[i].match(/^[-*]\s+/) && !lines[i].match(/^\d+\.\s+/) && !lines[i].trim().startsWith('```') && !/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[i].trim())) {
            paraLines.push(lines[i]);
            i++;
        }
        if (paraLines.length) {
            html += `<p>${inlineFormat(paraLines.join(' '))}</p>\n`;
        }
    }

    closeList();
    return html;
}

/**
 * Process {{type:slug}} embed placeholders in article body HTML.
 * These get replaced with styled embed cards linking to the relevant page.
 * Supported types: weapon, runner, core, mod, item, charm, emblem, sticker, background
 *
 * @param {string} html - Article body HTML
 * @param {Map<string, {name: string, image: string}>} assetLookup - Map of "type:slug" to asset data
 */
function processEmbeds(html, assetLookup = new Map()) {
    const embedTypes = {
        weapon: { label: 'Weapon', path: '//marathon/weapons/' },
        runner: { label: 'Runner', path: '//marathon/runners/' },
        core: { label: 'Core', path: '//marathon/cores/' },
        mod: { label: 'Mod', path: '//marathon/mods/' },
        item: { label: 'Item', path: '//marathon/items/' },
        charm: { label: 'Charm', path: '//marathon/charms/' },
        emblem: { label: 'Emblem', path: '//marathon/emblems/' },
        sticker: { label: 'Sticker', path: '//marathon/stickers/' },
        background: { label: 'Background', path: '//marathon/backgrounds/' },
        'weapon-skin': { label: 'Weapon Skin', path: '//marathon/weapon-skins/' },
        'runner-skin': { label: 'Runner Skin', path: '//marathon/runner-skins/' },
    };

    html = html.replace(/\{\{(\w[\w-]*):([a-z0-9-]+)\}\}/g, (match, type, slug) => {
        const embedInfo = embedTypes[type];
        if (!embedInfo) return match; // Unknown type, leave as-is

        // Look up real asset data
        const lookupKey = `${type}:${slug}`;
        const asset = assetLookup.get(lookupKey);
        const displayName = asset ? asset.name : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const imageUrl = asset ? asset.image : '';

        const imageHtml = imageUrl
            ? `<img src="${imageUrl}" alt="${escapeHtml(displayName)}" loading="lazy">`
            : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"//marathon/>
            <path d="m3.3 7 8.7 5 8.7-5"//marathon/><path d="M12 22V12"//marathon/>
        </svg>`;
        
        return `<a href="${embedInfo.path}${slug}/" class="article-embed">
    <div class="article-embed-image">
        ${imageHtml}
    </div>
    <div class="article-embed-info">
        <p class="article-embed-name">${escapeHtml(displayName)}</p>
        <span class="article-embed-type">View ${embedInfo.label} on MarathonDB →</span>
    </div>
</a>`;
    });

    // Unwrap embeds that are the sole content of a <p> tag
    html = html.replace(/<p>\s*(<a href="[^"]*" class="article-embed">[\s\S]*?<\/a>)\s*<\/p>/g, '$1');

    return html;
}

/**
 * Scan raw Markdown bodies for {{type:slug}} references
 * and return a Set of "type:slug" keys.
 */
function collectEmbedRefs(articles) {
    const refs = new Set();
    const regex = /\{\{(\w[\w-]*):([a-z0-9-]+)\}\}/g;
    for (const article of articles) {
        let m;
        while ((m = regex.exec(article.bodyMarkdown)) !== null) {
            refs.add(`${m[1]}:${m[2]}`);
        }
    }
    return refs;
}

/**
 * Fetch API data for embed references and return a lookup Map.
 * Groups refs by type, fetches only the needed API endpoints, and builds
 * a Map of "type:slug" → { name, image }.
 */
async function fetchEmbedAssets(refs) {
    const lookup = new Map();
    if (refs.size === 0) return lookup;

    // Group refs by type
    const byType = {};
    for (const ref of refs) {
        const [type, slug] = ref.split(':');
        if (!byType[type]) byType[type] = [];
        byType[type].push(slug);
    }

    // API endpoint mapping per embed type
    const apiEndpoints = {
        weapon: '/api/weapons',
        runner: '/api/runners',
        core: '/api/cores',
        mod: '/api/mods',
        item: '/api/items/all',
        charm: '/api/cosmetics/charms',
        emblem: '/api/cosmetics/emblems',
        sticker: '/api/cosmetics/stickers',
        background: '/api/cosmetics/backgrounds',
        'weapon-skin': '/api/v2/weapon-skins',
        'runner-skin': '/api/cosmetics/runners',
    };

    // Image field mapping (different API responses use different field names)
    const imageFields = {
        weapon: (item) => item.icon_path || item.image_path || '',
        runner: (item) => item.icon_path || item.image_path || '',
        core: (item) => item.icon_path || item.image_path || '',
        mod: (item) => item.icon_path || item.image_path || '',
        item: (item) => item.icon_path || item.image_path || '',
        charm: (item) => item.icon_path || '',
        emblem: (item) => item.icon_path || '',
        sticker: (item) => item.icon_path || '',
        background: (item) => item.icon_path || '',
        'weapon-skin': (item) => item.icon_path || item.image_path || '',
        'runner-skin': (item) => item.icon_path || item.image_path || '',
    };

    for (const [type, slugs] of Object.entries(byType)) {
        const endpoint = apiEndpoints[type];
        if (!endpoint) continue;

        try {
            console.log(`  Fetching ${type} data for embeds...`);
            const response = await fetchJSON(`${API_BASE}${endpoint}`);
            const items = Array.isArray(response) ? response : (response.data || response.items || []);

            for (const item of items) {
                const itemSlug = item.slug;
                if (slugs.includes(itemSlug)) {
                    const imgPath = imageFields[type] ? imageFields[type](item) : '';
                    lookup.set(`${type}:${itemSlug}`, {
                        name: item.name || item.title || itemSlug,
                        image: imgPath ? `${API_BASE}${imgPath}` : '',
                    });
                }
            }
        } catch (err) {
            console.log(`  ⚠️  Could not fetch ${type} API data: ${err.message}`);
        }
    }

    return lookup;
}

/**
 * Load all article source files from news/_articles/
 */
function loadArticles() {
    const articlesDir = path.join(OUTPUT_DIR, 'news', '_articles');
    if (!fs.existsSync(articlesDir)) {
        console.log('  No articles directory found at news/_articles/');
        return [];
    }

    const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));
    const articles = [];

    for (const file of files) {
        const raw = fs.readFileSync(path.join(articlesDir, file), 'utf8');
        const { meta, body } = parseFrontmatter(raw);

        if (!meta.title || !meta.slug) {
            console.log(`  ⚠️  Skipping ${file}: missing title or slug`);
            continue;
        }

        articles.push({
            ...meta,
            date: meta.date || '2026-01-01',
            author: meta.author || 'MarathonDB Team',
            category: meta.category || 'General',
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            excerpt: meta.excerpt || '',
            thumbnail: meta.thumbnail || '//marathon/assets/og-image.png',
            featured: meta.featured === true,
            bodyMarkdown: body,
            bodyHtml: null, // Populated later after embed assets are fetched
        });
    }

    // Sort by date descending (newest first)
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));

    return articles;
}

/**
 * Generate an individual article detail page
 */
function generateArticleDetailPage(article, allArticles) {
    const title = escapeHtml(article.title);
    const canonicalUrl = `${SITE_URL}/news/${article.slug}/`;
    const rawExcerpt = escapeHtml(article.excerpt) || '';
    const description = rawExcerpt.length > 155 ? rawExcerpt.substring(0, 152).trim() + '...' : rawExcerpt;
    const publishDate = formatDate(article.date);
    const isoDate = new Date(article.date).toISOString();

    // Related articles (same category, excluding self)
    const related = allArticles.filter(a => a.slug !== article.slug && a.category === article.category).slice(0, 3);
    // If not enough same-category, fill with latest
    if (related.length < 3) {
        const extras = allArticles.filter(a => a.slug !== article.slug && !related.find(r => r.slug === a.slug)).slice(0, 3 - related.length);
        related.push(...extras);
    }

    // Resolve author profile
    const authorProfile = NEWS_AUTHORS[article.author] || { name: article.author, role: 'Contributor', url: `${SITE_URL}/news/` };

    // Structured data — uses Person type for Google News compliance
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article.title,
        "description": article.excerpt,
        "image": article.thumbnail.startsWith('http') ? article.thumbnail : `${SITE_URL}${article.thumbnail}`,
        "datePublished": isoDate,
        "dateModified": isoDate,
        "author": {
            "@type": "Person",
            "name": authorProfile.name,
            "url": authorProfile.url || SITE_URL
        },
        "publisher": {
            "@type": "Organization",
            "name": "MarathonDB",
            "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/Icon.png`
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
        },
        "articleSection": article.category,
        "keywords": article.tags.join(', ')
    };
    
    // BreadcrumbList structured data
    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
            { "@type": "ListItem", "position": 2, "name": "News", "item": `${SITE_URL}/news/` },
            { "@type": "ListItem", "position": 3, "name": article.title, "item": canonicalUrl }
        ]
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title.length > 47 ? title.substring(0, 44).trim() + '...' : title} | MarathonDB</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${article.tags.map(t => escapeHtml(t)).join(', ')}, Marathon news, Marathon guide, MarathonDB">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="${escapeHtml(article.author)}">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${title} | MarathonDB">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${article.thumbnail.startsWith('http') ? article.thumbnail : `${SITE_URL}${article.thumbnail}`}">
    <meta property="og:site_name" content="MarathonDB">
    <meta property="og:locale" content="en_US">
    <meta property="article:published_time" content="${isoDate}">
    <meta property="article:author" content="${escapeHtml(article.author)}">
    <meta property="article:section" content="${escapeHtml(article.category)}">
    ${article.tags.map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n    ')}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@MarathonDB">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${article.thumbnail.startsWith('http') ? article.thumbnail : `${SITE_URL}${article.thumbnail}`}">
    
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">
    <link rel="stylesheet" href="//marathon/css/news.css">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(breadcrumbData, null, 2)}
    </script>
</head>
<body>
    ${generateNavigation('news')}

    <!-- Fixed Siderail Ads (sticky) -->
    <aside class="ad-siderail-fixed ad-siderail-fixed--left">
        <div class="ad-siderail-sticky">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </aside>
    <aside class="ad-siderail-fixed ad-siderail-fixed--right">
        <div class="ad-siderail-sticky">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </aside>

    <main class="container article-page">
        <!-- Breadcrumb -->
        <nav class="article-breadcrumb">
            <a href="//marathon/">Home</a>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
            <a href="/news/">News</a>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"//marathon/></svg>
            <span>${title}</span>
        </nav>


        <!-- Mobile Top Ad -->

        <div class="article-layout">
            <!-- Main Content -->
            <article class="article-main">
                <!-- Article Header -->
                <header class="article-header">
                    <div class="article-meta-top">
                        <span class="article-category-badge">${escapeHtml(article.category)}</span>
                        <span class="article-date">${publishDate}</span>
                    </div>
                    <h1 class="article-title">${title}</h1>
                    <p class="article-author">By <strong>${escapeHtml(article.author)}</strong></p>
                </header>

                ${article.thumbnail ? `
                <div class="article-hero-image">
                    <img src="${article.thumbnail}" alt="${title}" loading="lazy">
                </div>
                ` : ''}

                <!-- Article Body -->
                <div class="article-body">
                    ${article.bodyHtml}
                </div>

                <!-- Tags -->
                ${article.tags.length > 0 ? `
                <div class="article-tags">
                    ${article.tags.map(tag => `<span class="article-tag">${escapeHtml(tag)}</span>`).join('\n                    ')}
                </div>
                ` : ''}
            </article>

            <!-- Sidebar -->
            <aside class="article-sidebar">
                <!-- Share -->
                <div class="article-sidebar-section">
                    <h3 class="article-sidebar-title">Share</h3>
                    <div class="article-share-buttons">
                        <button class="article-share-btn" onclick="copyArticleLink()" id="copyLinkBtn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"//marathon/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"//marathon/>
                            </svg>
                            Copy Link
                        </button>
                        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title + ' — MarathonDB')}&url=${encodeURIComponent(canonicalUrl)}" target="_blank" class="article-share-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"//marathon/>
                            </svg>
                            Share on X
                        </a>
                    </div>
                </div>

                ${related.length > 0 ? `
                <!-- Related Articles -->
                <div class="article-sidebar-section">
                    <h3 class="article-sidebar-title">Related Articles</h3>
                    <div class="article-related">
                        ${related.map(r => `
                        <a href="//marathon/news/${r.slug}/" class="article-related-item">
                            <div class="article-related-thumb">
                                <img src="${r.thumbnail}" alt="${escapeHtml(r.title)}" loading="lazy">
                            </div>
                            <div class="article-related-info">
                                <span class="article-related-title">${escapeHtml(r.title)}</span>
                                <span class="article-related-date">${formatDate(r.date)}</span>
                            </div>
                        </a>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Back to News -->
                <div class="article-sidebar-section">
                    <a href="//marathon/news/" class="article-share-btn" style="justify-content: center; text-align: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5"//marathon/><path d="M12 19l-7-7 7-7"//marathon/>
                        </svg>
                        All Articles
                    </a>
                </div>
            </aside>
        </div>

        <!-- Pre-footer Ad -->
        <div class="ad-safe-zone ad-safe-zone--below-hero">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </main>

    ${generateFooter()}

    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>
    <script>
        function copyArticleLink() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const btn = document.getElementById('copyLinkBtn');
                const original = btn.innerHTML;
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"//marathon/></svg> Copied!';
                setTimeout(() => { btn.innerHTML = original; }, 2000);
            });
        }
    </script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate news listing page HTML
 */
function generateNewsListingPage(articles) {
    const count = articles.length;
    const canonicalUrl = `${SITE_URL}/news/`;

    // Collect unique categories
    const categories = [...new Set(articles.map(a => a.category))].sort();

    // Separate featured article
    const featured = articles.find(a => a.featured);
    const remainingArticles = articles.filter(a => !a.featured || a !== featured);

    // Structured data
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "MarathonDB News",
        "description": "Latest Marathon news, guides, weapon breakdowns, and community coverage from MarathonDB.",
        "url": canonicalUrl,
        "numberOfItems": count,
        "itemListElement": articles.map((article, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `${SITE_URL}/news/${article.slug}/`,
            "name": article.title
        }))
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marathon News & Guides | MarathonDB</title>
    <meta name="description" content="Latest Marathon news, weapon guides, patch notes, and community updates. Stay informed on MarathonDB.">
    <meta name="keywords" content="Marathon news, Marathon guides, Marathon tips, Marathon patch notes, Marathon weapon guide, Marathon runner guide, Marathon updates, Bungie Marathon, MarathonDB articles">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="MARATHON DB">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="Marathon News & Guides | MarathonDB">
    <meta property="og:description" content="Latest Marathon news, guides, weapon breakdowns, and community coverage.">
    <meta property="og:image" content="${SITE_URL}/assets/og-image.png">
    <meta property="og:site_name" content="MarathonDB">
    <meta property="og:locale" content="en_US">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@MarathonDB">
    <meta name="twitter:title" content="Marathon News & Guides | MarathonDB">
    <meta name="twitter:description" content="Latest Marathon news, guides, and community content.">
    <meta name="twitter:image" content="${SITE_URL}/assets/og-image.png">
    
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">
    <link rel="stylesheet" href="//marathon/css/news.css">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
    </script>
</head>
<body>
    ${generateNavigation('news')}

    <!-- Fixed Siderail Ads (sticky) -->
    <aside class="ad-siderail-fixed ad-siderail-fixed--left">
        <div class="ad-siderail-sticky">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </aside>
    <aside class="ad-siderail-fixed ad-siderail-fixed--right">
        <div class="ad-siderail-sticky">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </aside>

    <main class="container news-page">

        <!-- Mobile Top Ad -->

        <!-- Page Header -->
        <div class="news-header">
            <div class="news-header-top">
                <div>
                    <h1 class="news-title">NEWS</h1>
                    <p class="news-subtitle">Guides, breakdowns, and coverage for Bungie's Marathon</p>
                </div>
            </div>
            ${categories.length > 1 ? `
            <div class="news-filters">
                <button class="news-filter-btn active" data-category="all">All</button>
                ${categories.map(cat => `<button class="news-filter-btn" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('\n                ')}
            </div>
            ` : ''}
        </div>

        ${featured ? `
        <!-- Featured Article -->
        <div class="news-featured">
            <a href="//marathon/news/${featured.slug}/" class="news-featured-card" data-category="${escapeHtml(featured.category)}">
                <div class="news-featured-image">
                    <img src="${featured.thumbnail}" alt="${escapeHtml(featured.title)}" loading="lazy">
                </div>
                <div class="news-featured-body">
                    <div class="news-featured-meta">
                        <span class="news-featured-category">${escapeHtml(featured.category)}</span>
                        <span>·</span>
                        <span>${formatDate(featured.date)}</span>
                    </div>
                    <h2 class="news-featured-title">${escapeHtml(featured.title)}</h2>
                    <p class="news-featured-excerpt">${escapeHtml(featured.excerpt)}</p>
                    <span class="news-featured-readmore">Read Article →</span>
                </div>
            </a>
        </div>
        ` : ''}

        <!-- Article Grid -->
        <div class="news-grid">
            ${remainingArticles.map(article => `
            <a href="//marathon/news/${article.slug}/" class="news-card" data-category="${escapeHtml(article.category)}">
                <div class="news-card-image">
                    <img src="${article.thumbnail}" alt="${escapeHtml(article.title)}" loading="lazy">
                </div>
                <div class="news-card-body">
                    <div class="news-card-meta">
                        <span class="news-card-category">${escapeHtml(article.category)}</span>
                        <span>·</span>
                        <span>${formatDate(article.date)}</span>
                    </div>
                    <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
                    <p class="news-card-excerpt">${escapeHtml(article.excerpt)}</p>
                    <span class="news-card-readmore">Read More →</span>
                </div>
            </a>
            `).join('')}
            <div class="news-empty" style="display: none;">No articles found for this category.</div>
        </div>

        <!-- Pre-footer Ad -->
        <div class="ad-safe-zone ad-safe-zone--below-hero">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </main>

    ${generateFooter()}

    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>
    <script src="//marathon/js/news.js"></script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

/**
 * Build all news pages from Markdown source files.
 */
async function buildNews() {
    console.log('\n📰 Building news articles...');
    
    try {
        const articles = loadArticles();
        
        if (articles.length === 0) {
            console.log('  No articles found in news/_articles/');
            return;
        }

        console.log(`  Found ${articles.length} article(s)`);

        // Collect all embed references and fetch their API data
        const embedRefs = collectEmbedRefs(articles);
        let assetLookup = new Map();
        if (embedRefs.size > 0) {
            console.log(`  Found ${embedRefs.size} embed reference(s), fetching assets...`);
            assetLookup = await fetchEmbedAssets(embedRefs);
            console.log(`  Resolved ${assetLookup.size} embed asset(s)`);
        }

        // Process article bodies with the asset lookup
        for (const article of articles) {
            article.bodyHtml = processEmbeds(markdownToHtml(article.bodyMarkdown), assetLookup);
        }

        const newsDir = path.join(OUTPUT_DIR, 'news');

        // Generate listing page
        console.log('  Generating listing page...');
        const listingHtml = generateNewsListingPage(articles);
        writeFile(path.join(newsDir, 'index.html'), listingHtml);

        // Generate individual article pages
        console.log('  Generating article pages...');
        for (const article of articles) {
            const articleDir = path.join(newsDir, article.slug);
            const detailHtml = generateArticleDetailPage(article, articles);
            writeFile(path.join(articleDir, 'index.html'), detailHtml);
        }

        // Generate articles.json manifest for homepage widget
        const manifest = articles.map(a => ({
            title: a.title,
            slug: a.slug,
            date: a.date,
            author: a.author,
            category: a.category,
            excerpt: a.excerpt,
            thumbnail: a.thumbnail || null
        }));
        writeFile(path.join(newsDir, 'articles.json'), JSON.stringify(manifest));

        console.log(`\n✅ Successfully generated ${articles.length + 1} news pages + manifest`);
        console.log(`   - 1 listing page: /news/index.html`);
        console.log(`   - ${articles.length} article page(s): /news/[slug]/index.html`);
        console.log(`   - 1 manifest: /news/articles.json`);

    } catch (error) {
        console.error('\n❌ Error building news:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

// ============================================================
// SEO REDIRECT GENERATOR
// ============================================================

/**
 * Map of old /pages/ URLs to new clean URLs.
 * Listing pages use meta refresh (instant).
 * Detail pages use JavaScript to read ?slug= and redirect.
 */
const REDIRECT_MAP = {
    listing: [
        { old: 'weapons.html', newPath: '//marathon/weapons/', label: 'Weapons' },
        { old: 'runners.html', newPath: '//marathon/runners/', label: 'Runners' },
        { old: 'cores.html', newPath: '//marathon/cores/', label: 'Cores' },
        { old: 'mods.html', newPath: '//marathon/mods/', label: 'Mods' },
        { old: 'items.html', newPath: '//marathon/items/', label: 'Items' },
        { old: 'factions.html', newPath: '//marathon/factions/', label: 'Factions' },
        { old: 'cosmetics-weapons.html', newPath: '//marathon/weapon-skins/', label: 'Weapon Skins' },
        { old: 'cosmetics-runners.html', newPath: '//marathon/runner-skins/', label: 'Runner Skins' },
        { old: 'cosmetics-stickers.html', newPath: '//marathon/stickers/', label: 'Stickers' },
        { old: 'cosmetics-backgrounds.html', newPath: '//marathon/backgrounds/', label: 'Backgrounds' },
        { old: 'cosmetics-charms.html', newPath: '//marathon/charms/', label: 'Charms' },
        { old: 'cosmetics-emblems.html', newPath: '//marathon/emblems/', label: 'Emblems' },
    ],
    detail: [
        { old: 'weapon.html', newPath: '//marathon/weapons/', label: 'Weapon Details' },
        { old: 'runner.html', newPath: '//marathon/runners/', label: 'Runner Details' },
        { old: 'core.html', newPath: '//marathon/cores/', label: 'Core Details' },
        { old: 'mod.html', newPath: '//marathon/mods/', label: 'Mod Details' },
        { old: 'item.html', newPath: '//marathon/items/', label: 'Item Details' },
        { old: 'cosmetic-weapon.html', newPath: '//marathon/weapon-skins/', label: 'Weapon Skin Details' },
        { old: 'cosmetic.html', newPath: '//marathon/runner-skins/', label: 'Runner Skin Details' },
        { old: 'cosmetic-sticker.html', newPath: '//marathon/stickers/', label: 'Sticker Details' },
        { old: 'cosmetic-background.html', newPath: '//marathon/backgrounds/', label: 'Background Details' },
        { old: 'cosmetic-charm.html', newPath: '//marathon/charms/', label: 'Charm Details' },
        { old: 'cosmetic-emblem.html', newPath: '//marathon/emblems/', label: 'Emblem Details' },
        { old: 'contract.html', newPath: '//marathon/factions/', label: 'Contract Details' },
        { old: 'faction.html', newPath: '//marathon/factions/', label: 'Faction Details' },
    ]
};

/**
 * Generate a redirect stub for listing pages (no query string).
 * Server-side 301 in _redirects handles the redirect; this is a fallback.
 */
function generateListingRedirect(newPath, label) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${label} | MarathonDB - Page Moved</title>
<meta name="description" content="This page has moved. Visit the new ${label} page on MarathonDB.">
<link rel="canonical" href="${SITE_URL}${newPath}">
<meta name="robots" content="noindex, follow">
</head>
<body>
<h1>Page Moved</h1>
<p>This page has permanently moved to <a href="${newPath}">marathondb.gg${newPath}</a></p>
</body>
</html>`;
}

/**
 * Generate a redirect stub for detail pages (reads ?slug= query param).
 * Uses JavaScript to forward the slug to the clean URL.
 * Provides a direct link for no-JS clients (no meta refresh).
 */
function generateDetailRedirect(newBasePath, label) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${label} | MarathonDB - Page Moved</title>
<meta name="description" content="This page has moved. Visit the new ${label} page on MarathonDB.">
<link rel="canonical" href="${SITE_URL}${newBasePath}">
<meta name="robots" content="noindex, follow">
<script>
(function(){var s=new URLSearchParams(window.location.search).get('slug');window.location.replace(s?'${newBasePath}'+s+'//marathon/':'${newBasePath}');})();
</script>
</head>
<body>
<h1>Page Moved</h1>
<p>This page has permanently moved to <a href="${newBasePath}">marathondb.gg${newBasePath}</a></p>
</body>
</html>`;
}

/**
 * Build SEO redirect stubs for all old /pages/ URLs and generate _redirects file.
 *
 * Creates:
 * - Redirect stub HTML files in /pages/ for each SSG'd page
 * - _redirects file at project root (for Cloudflare Pages / Netlify)
 */
async function buildRedirects() {
    console.log('\n📄 Generating SEO redirects...');

    const pagesDir = path.join(OUTPUT_DIR, 'pages');
    let count = 0;

    // Generate listing page redirect stubs
    for (const page of REDIRECT_MAP.listing) {
        const filePath = path.join(pagesDir, page.old);
        fs.writeFileSync(filePath, generateListingRedirect(page.newPath, page.label));
        count++;
    }

    // Generate detail page redirect stubs
    for (const page of REDIRECT_MAP.detail) {
        const filePath = path.join(pagesDir, page.old);
        fs.writeFileSync(filePath, generateDetailRedirect(page.newPath, page.label));
        count++;
    }

    // Generate _redirects file
    let redirectsContent = '# MarathonDB Redirects\n';
    redirectsContent += '# Auto-generated by: node build/ssg.js --redirects\n\n';
    redirectsContent += '# Old /pages/ URLs \u2192 new clean URLs (301)\n';

    for (const page of REDIRECT_MAP.listing) {
        redirectsContent += `/pages/${page.old}  ${page.newPath}  301\n`;
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, '_redirects'), redirectsContent);

    console.log(`\n✅ Generated ${count} redirect stubs + _redirects file`);
}

// ============================================================
// SITEMAP GENERATOR
// ============================================================

/**
 * Build sitemap.xml by scanning SSG output directories.
 * Run this AFTER building all SSG pages (or with --all).
 *
 * Includes:
 * - Homepage
 * - All SSG-generated listing and detail pages
 * - Non-SSG'd static pages that are still active
 */
async function buildSitemap() {
    console.log('\n🗺️  Generating sitemap...');

    const today = new Date().toISOString().split('T')[0];
    const urls = [];

    // Homepage
    urls.push({ loc: '//marathon/', priority: '1.0', changefreq: 'daily', lastmod: today });

    // SSG directories to scan
    const ssgDirs = [
        { dir: 'weapons', listPriority: '0.9', detailPriority: '0.8' },
        { dir: 'runners', listPriority: '0.9', detailPriority: '0.8' },
        { dir: 'cores', listPriority: '0.9', detailPriority: '0.8' },
        { dir: 'mods', listPriority: '0.9', detailPriority: '0.7' },
        { dir: 'items', listPriority: '0.9', detailPriority: '0.7' },
        { dir: 'factions', listPriority: '0.8', detailPriority: '0.7', scanNested: 'contracts' },
        { dir: 'maps', listPriority: '0.8', detailPriority: '0.7' },
        { dir: 'weapon-skins', listPriority: '0.8', detailPriority: '0.6' },
        { dir: 'runner-skins', listPriority: '0.8', detailPriority: '0.6' },
        { dir: 'stickers', listPriority: '0.7', detailPriority: '0.6' },
        { dir: 'backgrounds', listPriority: '0.7', detailPriority: '0.6' },
        { dir: 'charms', listPriority: '0.7', detailPriority: '0.6' },
        { dir: 'emblems', listPriority: '0.7', detailPriority: '0.6' },
        { dir: 'news', listPriority: '0.9', detailPriority: '0.8' },
        { dir: 'contracts', listPriority: '0.8', detailPriority: '0.7' },
    ];

    // Scan each SSG directory for generated pages
    for (const { dir, listPriority, detailPriority } of ssgDirs) {
        const dirPath = path.join(OUTPUT_DIR, dir);
        if (!fs.existsSync(dirPath)) continue;

        // Listing page
        if (fs.existsSync(path.join(dirPath, 'index.html'))) {
            urls.push({ loc: `/${dir}/`, priority: listPriority, changefreq: 'weekly', lastmod: today });
        }

        // Detail pages (subdirectories containing index.html)
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && fs.existsSync(path.join(dirPath, entry.name, 'index.html'))) {
                    urls.push({ loc: `/${dir}/${entry.name}/`, priority: detailPriority, changefreq: 'weekly', lastmod: today });
                }

                // Scan nested directories (e.g. factions/:slug/contracts/:contract/)
                if (entry.isDirectory() && ssgDirs.find(d => d.dir === dir && d.scanNested)) {
                    const nestedSubdir = ssgDirs.find(d => d.dir === dir).scanNested;
                    const nestedPath = path.join(dirPath, entry.name, nestedSubdir);
                    if (fs.existsSync(nestedPath)) {
                        // Listing page for nested section
                        if (fs.existsSync(path.join(nestedPath, 'index.html'))) {
                            urls.push({ loc: `/${dir}/${entry.name}/${nestedSubdir}/`, priority: '0.8', changefreq: 'weekly', lastmod: today });
                        }
                        // Detail pages within nested section
                        try {
                            const nestedEntries = fs.readdirSync(nestedPath, { withFileTypes: true });
                            for (const nestedEntry of nestedEntries) {
                                if (nestedEntry.isDirectory() && fs.existsSync(path.join(nestedPath, nestedEntry.name, 'index.html'))) {
                                    urls.push({ loc: `/${dir}/${entry.name}/${nestedSubdir}/${nestedEntry.name}/`, priority: '0.7', changefreq: 'weekly', lastmod: today });
                                }
                            }
                        } catch (ne) { /* skip */ }
                    }
                }
            }
        } catch (e) {
            // Directory read error, skip
        }
    }

    // Non-SSG'd pages that are still active (keep in sitemap)
    // NOTE: Cloudflare Pages 307-redirects .html → non-.html, so omit extension
    const staticPages = [
        { loc: '//marathon/loadout-builder/', priority: '0.8', changefreq: 'weekly' },
        { loc: '//marathon/weapon-loadout-builder/', priority: '0.8', changefreq: 'weekly' },
        { loc: '//marathon/runner-loadout-builder/', priority: '0.8', changefreq: 'weekly' },
        { loc: '//marathon/complete-loadout-builder/', priority: '0.8', changefreq: 'weekly' },
        { loc: '//marathon/pages/beta', priority: '0.9', changefreq: 'daily' },
        { loc: '//marathon/pages/twitch', priority: '0.7', changefreq: 'daily' },
        { loc: '//marathon/pages/cosmetics-destiny2', priority: '0.6', changefreq: 'weekly' },
        { loc: '//marathon/pages/search', priority: '0.5', changefreq: 'weekly' },
        { loc: '//marathon/pages/about', priority: '0.5', changefreq: 'monthly' },
        { loc: '//marathon/pages/contact', priority: '0.5', changefreq: 'monthly' },
        { loc: '//marathon/pages/cookie-policy', priority: '0.3', changefreq: 'monthly' },
        { loc: '//marathon/pages/privacy-policy', priority: '0.3', changefreq: 'monthly' },
        { loc: '//marathon/pages/terms-and-conditions', priority: '0.3', changefreq: 'monthly' },
    ];

    for (const page of staticPages) {
        urls.push({ ...page, lastmod: today });
    }

    // Generate sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const url of urls) {
        xml += '  <url>\n';
        xml += `    <loc>${SITE_URL}${url.loc}</loc>\n`;
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += '  </url>\n';
    }

    xml += '</urlset>\n';

    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), xml);

    const detailCount = urls.length - ssgDirs.length - staticPages.length - 1;
    console.log(`\n✅ Generated sitemap.xml with ${urls.length} URLs (${ssgDirs.length} listings, ${detailCount} detail pages, ${staticPages.length} static pages)`);
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);
    
    console.log('═══════════════════════════════════════════');
    console.log('       MarathonDB Static Site Generator     ');
    console.log('═══════════════════════════════════════════');
    
    if (args.includes('--charms') || args.includes('--all')) {
        await buildCharms();
    }
    
    if (args.includes('--emblems') || args.includes('--all')) {
        await buildEmblems();
    }
    
    if (args.includes('--backgrounds') || args.includes('--all')) {
        await buildBackgrounds();
    }
    
    if (args.includes('--stickers') || args.includes('--all')) {
        await buildStickers();
    }
    
    if (args.includes('--runner-skins') || args.includes('--all')) {
        await buildRunnerSkins();
    }
    
    if (args.includes('--weapon-skins') || args.includes('--all')) {
        await buildWeaponSkins();
    }
    
    if (args.includes('--mods') || args.includes('--all')) {
        await buildMods();
    }
    
    if (args.includes('--cores') || args.includes('--all')) {
        await buildCores();
    }
    
    if (args.includes('--runners') || args.includes('--all')) {
        await buildRunners();
    }
    
    if (args.includes('--weapons') || args.includes('--all')) {
        await buildWeapons();
    }
    
    if (args.includes('--items') || args.includes('--all')) {
        await buildItems();
    }

    if (args.includes('--news') || args.includes('--all')) {
        await buildNews();
    }
    
    if (args.includes('--factions') || args.includes('--all')) {
        await buildFactions();
    }

    if (args.includes('--contracts') || args.includes('--all')) {
        await buildContracts();
    }
    
    if (args.includes('--maps') || args.includes('--all')) {
        await buildMaps();
    }

    // Redirects and sitemap run AFTER all pages are built
    if (args.includes('--redirects') || args.includes('--all')) {
        await buildRedirects();
    }

    if (args.includes('--sitemap') || args.includes('--all')) {
        await buildSitemap();
    }

    if (!args.includes('--charms') && !args.includes('--emblems') && !args.includes('--backgrounds') && !args.includes('--stickers') && !args.includes('--runner-skins') && !args.includes('--weapon-skins') && !args.includes('--mods') && !args.includes('--cores') && !args.includes('--runners') && !args.includes('--weapons') && !args.includes('--items') && !args.includes('--factions') && !args.includes('--contracts') && !args.includes('--maps') && !args.includes('--news') && !args.includes('--redirects') && !args.includes('--sitemap') && !args.includes('--all')) {
        console.log('\nUsage: node build/ssg.js [options]\n');
        console.log('Options:');
        console.log('  --charms        Generate charm pages');
        console.log('  --emblems       Generate emblem pages');
        console.log('  --backgrounds   Generate background pages');
        console.log('  --stickers      Generate sticker pages');
        console.log('  --runner-skins  Generate runner skin pages');
        console.log('  --weapon-skins  Generate weapon skin pages');
        console.log('  --mods          Generate mod pages');
        console.log('  --cores         Generate core pages');
        console.log('  --runners       Generate runner pages');
        console.log('  --weapons       Generate weapon pages');
        console.log('  --items         Generate item pages');
        console.log('  --factions      Generate factions page');
        console.log('  --contracts     Generate contract pages (per faction)');
        console.log('  --maps          Generate maps page');
        console.log('  --news          Generate news/article pages from Markdown');
        console.log('  --redirects     Generate SEO redirect stubs + _redirects file');
        console.log('  --sitemap       Generate sitemap.xml from SSG output');
        console.log('  --all           Generate all content types + redirects + sitemap');
        console.log('\nExample: node build/ssg.js --all');
    }
    
    console.log('\n═══════════════════════════════════════════\n');
}

main();
