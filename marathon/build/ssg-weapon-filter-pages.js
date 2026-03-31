/**
 * ssg-weapon-filter-pages.js
 * Generates per-weapon listing pages for Marathon weapon skins.
 *
 * Creates: weapon-skins/{weapon-slug}/index.html for every unique weapon
 * found in the skins API, allowing users to browse skins for a specific weapon.
 *
 * Usage:
 *   node build/ssg-weapon-filter-pages.js            — full run (all weapons)
 *   node build/ssg-weapon-filter-pages.js --dry-run  — log actions, write nothing
 *   node build/ssg-weapon-filter-pages.js --slug=X   — build a single weapon by slug
 *
 * API:   https://weaponskins.marathondb.gg
 */

'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
// ─── Configuration ──────────────────────────────────────────────────────────

const API_BASE          = 'https://weaponskins.marathondb.gg';
const CANONICAL_ORIGIN  = 'https://gdb.gg';
const WEAPON_SKINS_HUB  = path.resolve(__dirname, '..', 'weapon-skins', 'index.html');
const OUTPUT_DIR        = path.resolve(__dirname, '..', 'weapon-skins');

const IS_DRYRUN  = process.argv.includes('--dry-run');
const SLUG_ARG   = (process.argv.find(a => a.startsWith('--slug=')) || '').replace('--slug=', '') || null;

// ─── Label Maps ─────────────────────────────────────────────────────────────

const WEAPON_TYPE_LABELS = {
    'assault-rifle':     'Assault Rifle',
    'smg':               'SMG',
    'lmg':               'LMG',
    'shotgun':           'Shotgun',
    'sniper':            'Sniper Rifle',
    'marksman-rifle':    'Marksman Rifle',
    'pistol':            'Pistol',
    'melee':             'Melee Weapon',
    'machine-gun':       'Machine Gun',
    'grenade-launcher':  'Grenade Launcher',
    'rocket-launcher':   'Rocket Launcher',
};

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        proto.get(url, { headers: { 'User-Agent': 'marathondb-ssg-weapon-filter/1.0' } }, (res) => {
            let raw = '';
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                }
                try { resolve(JSON.parse(raw)); }
                catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
            });
        }).on('error', reject);
    });
}

// ─── Filesystem helpers ──────────────────────────────────────────────────────

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
}

// ─── Text helpers ────────────────────────────────────────────────────────────

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchAllSkins() {
    let page = 1, collected = [], totalPages = 1;
    do {
        const url = `${API_BASE}/api/skins?page=${page}&per_page=100&_nocache=${Date.now()}`;
        console.log(`  Fetching skins page ${page}...`);
        const json = await fetchJSON(url);
        if (!json.data) throw new Error('Skins API returned no data');
        collected = collected.concat(json.data);
        totalPages = json.total_pages || 1;
        page++;
    } while (page <= totalPages);
    return collected;
}

// ─── Weapon extraction ───────────────────────────────────────────────────────

/**
 * Build a deduplicated, sorted list of unique weapons from all skins.
 * Returns: [{ slug, name, type, skinCount }]
 * Sorted alphabetically by name.
 */
function extractWeapons(skins) {
    const map = {};
    for (const skin of skins) {
        const w = skin.weapon;
        if (!w || !w.slug) continue;
        if (!map[w.slug]) {
            map[w.slug] = { slug: w.slug, name: w.name || w.slug, type: w.type || '', skinCount: 0 };
        }
        map[w.slug].skinCount++;
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Page generation (hub shell + weapon-specific <main>) ─────────────────────

function generatePage(weapon, allWeapons) {
    if (!fs.existsSync(WEAPON_SKINS_HUB)) {
        throw new Error(`Hub template missing: ${WEAPON_SKINS_HUB}`);
    }
    let html = fs.readFileSync(WEAPON_SKINS_HUB, 'utf8');

    const safeWeaponName = escapeHtml(weapon.name);
    const slugJson       = JSON.stringify(weapon.slug);
    const canonicalUrl   = `${CANONICAL_ORIGIN}/marathon/weapon-skins/${weapon.slug}/`;

    const breadcrumbJson = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Marathon', item: `${CANONICAL_ORIGIN}/marathon/` },
            { '@type': 'ListItem', position: 2, name: 'Weapon Skins', item: `${CANONICAL_ORIGIN}/marathon/weapon-skins/` },
            { '@type': 'ListItem', position: 3, name: `${weapon.name} skins`, item: canonicalUrl },
        ]
    }, null, 2);

    const collectionJson = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Marathon ${weapon.name} skins — gdb.gg`,
        description: `Browse every ${weapon.name} weapon skin in Marathon: rarities, sources, and community ratings.`,
        url: canonicalUrl,
        isPartOf: {
            '@type': 'WebSite',
            name: 'gdb.gg',
            url: `${CANONICAL_ORIGIN}/`
        },
        about: {
            '@type': 'VideoGame',
            name: 'Marathon',
            applicationCategory: 'Game',
            author: { '@type': 'Organization', name: 'Bungie' }
        }
    }, null, 2);

    const weaponOptionsHtml = allWeapons.map(w =>
        `            <option value="${w.slug}"${w.slug === weapon.slug ? ' selected' : ''}>${escapeHtml(w.name)}</option>`
    ).join('\n');

    const otherWeapons = allWeapons.filter(w => w.slug !== weapon.slug);
    const seoLinks = otherWeapons.map(w =>
        `<a href="/marathon/weapon-skins/${w.slug}/">${escapeHtml(w.name)}</a>`
    ).join(' · ');

    const mainHtml = `<main class="container ws-skins-page">
        <header class="ws-hub-hero ws-hub-hero--sub" aria-labelledby="ws-subhub-title">
            <div class="ws-hub-hero__glow" aria-hidden="true"></div>
            <nav class="ws-hub-breadcrumb" aria-label="Breadcrumb">
                <a href="/marathon/weapon-skins/">Weapon Skins</a>
                <span aria-hidden="true">›</span>
                <span>${safeWeaponName}</span>
            </nav>
            <div class="ws-hub-hero__inner ws-hub-hero__inner--split">
                <div>
                    <p class="ws-hub-kicker">${safeWeaponName} · Marathon</p>
                    <h1 class="ws-hub-title" id="ws-subhub-title">${safeWeaponName} skins <span class="ws-hub-count" id="totalCount"></span></h1>
                    <p class="ws-hub-tagline">All catalogued skins for this weapon. Filter, search, and open any card for full detail.</p>
                </div>
                <a href="/marathon/weapon-skins/" class="ws-hub-back">← All weapon skins</a>
            </div>
        </header>

        <aside class="ws-seo-preserve" aria-label="About this weapon skin listing">
            <h2 class="ws-seo-heading">Marathon ${safeWeaponName} skins</h2>
            <p>This page lists ${safeWeaponName} weapon skins from the Marathon cosmetics catalog. Skins are cosmetic only. Data is updated as new content releases.</p>
            <p>Browse other weapons: ${seoLinks}. <a href="/marathon/weapon-skins/">All weapon skins</a>.</p>
        </aside>

        <section class="ws-toolbar-wrap content-section-compact">
            <div class="ws-toolbar">
                <div class="ws-toolbar__pills">
                    <div class="filter-pills-inline ws-toolbar__pills-row" id="filterPills">
                        <button type="button" class="filter-pill-sm active" data-filter="all">All</button>
                        <button type="button" class="filter-pill-sm" data-rarity="prestige" data-filter="prestige">Prestige</button>
                        <button type="button" class="filter-pill-sm" data-rarity="superior" data-filter="superior">Superior</button>
                        <button type="button" class="filter-pill-sm" data-rarity="deluxe" data-filter="deluxe">Deluxe</button>
                        <button type="button" class="filter-pill-sm" data-rarity="enhanced" data-filter="enhanced">Enhanced</button>
                        <button type="button" class="filter-pill-sm" data-rarity="standard" data-filter="standard">Standard</button>
                        <button type="button" class="filter-pill-sm filter-pill-vaulted" data-filter="vaulted">Vaulted</button>
                    </div>
                    <select id="weaponFilter" class="filter-select-sm ws-toolbar__weapon-select" aria-label="Filter by weapon">
                        <option value="">All weapons</option>
${weaponOptionsHtml}
                    </select>
                </div>
                <div class="ws-toolbar__search">
                    <label class="ws-sr-only" for="searchInput">Search skins by name or weapon</label>
                    <input type="search" id="searchInput" class="ws-search-input" placeholder="Search name or weapon…" autocomplete="off" enterkeyhint="search">
                </div>
            </div>
        </section>

        <section class="cosmetics-loading" id="loadingState">
            <div class="loading-spinner"></div>
            <p>Loading ${safeWeaponName} skins...</p>
        </section>

        <section class="cosmetics-results" id="resultsSection" style="display: none;">
            <div class="cosmetics-grid weapon-skins-grid ws-hub-grid" id="skinsGrid"></div>
            <div class="cosmetics-empty" id="emptyState" style="display: none;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <h3>No ${safeWeaponName} skins found</h3>
                <p>Try adjusting your filters or search term</p>
                <button class="btn-reset-filters" id="resetFilters">Reset Filters</button>
            </div>
            <div class="pagination-controls" id="paginationWrapper" style="display:none;"></div>
        </section>

        <div class="ad-safe-zone ad-safe-zone--below-hero">
            <span class="ad-label">Ad</span>
            <div class="ad-container">
            </div>
        </div>
    </main>`;

    html = html.replace(/<title>[^<]*<\/title>/, `<title>Marathon ${safeWeaponName} Skins — gdb.gg</title>`);
    html = html.replace(/<meta name="robots" content="noindex,nofollow">/, '<meta name="robots" content="index, follow">');
    html = html.replace(
        /(<link rel="apple-touch-icon" href="\/marathon\/Icon.png">)/,
        `$1\n    <meta name="description" content="${escapeHtml(`Browse every ${weapon.name} weapon skin in Marathon — rarities, sources, and community ratings.`)}">\n    <link rel="canonical" href="${canonicalUrl}">`
    );

    const ldJson = `
    <script type="application/ld+json">
${breadcrumbJson}
    </script>
    <script type="application/ld+json">
${collectionJson}
    </script>`;
    html = html.replace('<!-- Structured Data -->', `<!-- Structured Data -->${ldJson}`);

    if (!/<main class="container ws-skins-page">[\s\S]*<\/main>/.test(html)) {
        throw new Error('Hub index.html is missing expected <main class="container ws-skins-page">…</main> block.');
    }
    html = html.replace(/<main class="container ws-skins-page">[\s\S]*?<\/main>/, mainHtml);

    if (!html.includes('<script src="/marathon/js/cosmetics-weapons.js"></script>')) {
        throw new Error('Hub index.html is missing cosmetics-weapons.js script tag.');
    }
    html = html.replace(
        '<script src="/marathon/js/cosmetics-weapons.js"></script>',
        `<script>window.WEAPON_SKINS_FILTER = ${slugJson};</script>\n    <script src="/marathon/js/cosmetics-weapons.js"></script>`
    );

    return html;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  ssg-weapon-filter-pages — per-weapon listing   ║');
    console.log('╚══════════════════════════════════════════════════╝');
    if (IS_DRYRUN) console.log('  [DRY RUN — no files will be written]');

    console.log('\n─── Fetching skins from API...');
    const allSkins = await fetchAllSkins();
    console.log(`  Total skins: ${allSkins.length}`);

    const weapons = extractWeapons(allSkins);
    console.log(`  Unique weapons found: ${weapons.length}`);
    weapons.forEach(w => console.log(`    ${w.slug.padEnd(30)} ${w.name} (${w.type}) — ${w.skinCount} skins`));

    // Filter to just the requested slug if --slug= provided
    const toProcess = SLUG_ARG ? weapons.filter(w => w.slug === SLUG_ARG) : weapons;
    if (SLUG_ARG && toProcess.length === 0) {
        console.error(`\n  ERROR: No weapon found with slug "${SLUG_ARG}"`);
        process.exit(1);
    }

    console.log(`\n─── Generating ${toProcess.length} page(s)...`);
    let generated = 0, skipped = 0;

    for (const weapon of toProcess) {
        const outPath = path.join(OUTPUT_DIR, weapon.slug, 'index.html');

        // Don't overwrite existing SKIN detail pages (they have different content).
        // The check: if the existing file has WEAPON_SKINS_FILTER it's one of ours.
        if (fs.existsSync(outPath)) {
            const existing = fs.readFileSync(outPath, 'utf8');
            if (!existing.includes('WEAPON_SKINS_FILTER') && !existing.includes('weapon-filter-pages')) {
                console.log(`  SKIP  ${weapon.slug}/index.html  (existing non-filter page)`);
                skipped++;
                continue;
            }
        }

        const html = generatePage(weapon, weapons);

        if (IS_DRYRUN) {
            console.log(`  [dry]  ${weapon.slug}/index.html  (${weapon.skinCount} skins)`);
        } else {
            writeFile(outPath, html);
            console.log(`  ✓  ${weapon.slug}/index.html  (${weapon.skinCount} skins)`);
        }
        generated++;
    }

    console.log(`\n─── Done.  Generated: ${generated}  Skipped (conflict): ${skipped}`);
}

main().catch(err => {
    console.error('\nFATAL:', err.message);
    process.exit(1);
});
