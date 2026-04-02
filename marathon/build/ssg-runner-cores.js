#!/usr/bin/env node
/**
 * ssg-runner-cores.js
 * -------------------
 * Generates dedicated per-runner core listing pages for SEO:
 *   /cores/destroyer/index.html
 *   /cores/recon/index.html
 *   /cores/thief/index.html
 *   /cores/assassin/index.html
 *   /cores/vandal/index.html
 *   /cores/triage/index.html
 *
 * Each page shows only the cores for that runner class plus universal ("all") cores,
 * with unique SEO metadata, pre-rendered cards, structured data, and the same
 * modal/JS functionality as the main cores page.
 *
 * Usage:
 *   node build/ssg-runner-cores.js               — generate all 6 runner pages
 *   node build/ssg-runner-cores.js --runner=recon — generate a single runner page
 *   node build/ssg-runner-cores.js --dry-run      — log actions, write nothing
 */

'use strict';

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { generateNavigation } = require('./shared-nav');
const { generateFooter } = require('./site-footer');

// ─── Config ─────────────────────────────────────────────────────────────────

const API_URL    = 'https://cores.marathondb.gg/api/cores';
const SITE_URL   = 'https://marathondb.gg';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'cores');

const IS_DRYRUN  = process.argv.includes('--dry-run');
const RUNNER_ARG = (process.argv.find(a => a.startsWith('--runner=')) || '').replace('--runner=', '') || null;

const RUNNER_TYPES = ['destroyer', 'recon', 'thief', 'assassin', 'vandal', 'triage'];

const RARITY_ORDER = { prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };

const RUNNER_ICONS = {
    destroyer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    recon:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    thief:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    assassin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14.5 4h-5L7 7H2l5.5 5.5L5 22h7l-2.5-5.5L12 13l2.5 3.5L12 22h7l-2.5-9.5L22 7h-5l-2.5-3z"/></svg>',
    vandal:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    triage:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
};

const NAME_CORRECTIONS = {
    'Botique': 'Boutique',
};

const RUNNER_DESCRIPTIONS = {
    destroyer: 'Browse every Destroyer core in Marathon. Destroyer cores focus on durability, barrier generation, and explosive firepower — perfect for players who hold the line and absorb pressure.',
    recon:     'Browse every Recon core in Marathon. Recon cores enhance awareness, target tracking, and area control — ideal for intel-focused players who want to control engagements.',
    thief:     'Browse every Thief core in Marathon. Thief cores focus on loot efficiency, backpack interactions, and speed — built for extraction-focused runners who turn raids into profit.',
    assassin:  'Browse every Assassin core in Marathon. Assassin cores reward stealth, precision, and solo plays — designed for flankers who strike fast and disappear.',
    vandal:    'Browse every Vandal core in Marathon. Vandal cores boost mobility, weapon handling, and aggressive positioning — tuned for high-tempo players who apply constant pressure.',
    triage:    'Browse every Triage core in Marathon. Triage cores enhance healing, revival speed, and team support — essential for support players keeping their squad alive.',
};

const RUNNER_INTRO = {
    destroyer: 'Destroyer cores focus on <strong>durability, barrier generation, and explosive firepower</strong>. Spec into defensive builds with Reinforced Plating and Adaptive Barrier, or lean into aggressive plays with Missile Barrage. Destroyer cores reward players who stay in the fight and absorb pressure for the team.',
    recon:     'Recon cores enhance <strong>awareness, target tracking, and area control</strong>. Use Advanced Tracking for wallhack-style intel, Pulse Amplifier for extended scan radius, or Echo Chamber for lingering detection zones. Recon cores provide squad-wide intelligence and help you control engagements before they begin.',
    thief:     'Thief cores focus on <strong>loot efficiency, backpack interactions, and speed</strong>. Optimize extraction runs with Premium Package, boost agility through Boutique, or gain combat advantages via Crime Spree. Thief cores excel at turning loot-heavy raids into quick, profitable extractions.',
    assassin:  'Assassin cores reward <strong>stealth, precision, and solo plays</strong>. Equip Ghost Protocol for extended invisibility, Shadow Strike for burst damage out of cloak, or Safe Landings for better repositioning. Assassin cores are built for flankers and ambush-focused players.',
    vandal:    'Vandal cores boost <strong>mobility, weapon handling, and aggressive positioning</strong>. Use Blast Off for explosive movement, Adrenaline Rush for speed on kills, or Mechanized Holsters for faster weapon swaps. Vandal cores reward high-tempo play and constant pressure.',
    triage:    'Triage cores enhance <strong>healing, revival speed, and team support</strong>. Equip Combat Medic for mid-fight heals, Emergency Response for faster revives, or High Voltage for offensive utility. Triage cores let support players keep their squad alive while still contributing in combat.',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(text) {
    if (!text && text !== 0) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(text) {
    if (!text) return '';
    return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getRunnerIcon(runnerType) {
    return RUNNER_ICONS[runnerType] || '';
}

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
            });
        }).on('error', reject);
    });
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function applyDataCorrections(cores) {
    for (const core of cores) {
        if (NAME_CORRECTIONS[core.name]) {
            core.name = NAME_CORRECTIONS[core.name];
        }
    }
    const nameCounts = {};
    for (const core of cores) {
        nameCounts[core.name] = (nameCounts[core.name] || 0) + 1;
    }
    for (const core of cores) {
        if (nameCounts[core.name] > 1) {
            const runner = capitalizeFirst((core.runner_type || '').toLowerCase());
            core.name = `${core.name} (${runner})`;
        }
    }
    return cores;
}

// ─── Card HTML (mirrors prebuild-cores.js) ──────────────────────────────────

function buildCardHtml(core) {
    const rarity     = (core.rarity || 'standard').toLowerCase();
    const runnerType = (core.runner_type || 'unknown').toLowerCase();
    const slug       = core.slug || core.id;
    const name       = escapeHtml(core.name || 'Unknown');
    const isActive   = core.is_active !== false;
    const iconUrl    = core.icon_url || `https://cores.marathondb.gg/assets/items/cores/${encodeURIComponent(core.icon_path || core.slug)}-72x72.png`;
    const altText    = escapeAttr(`${core.name || 'Core'} – Marathon ${capitalizeFirst(runnerType)} core`);
    const desc       = core.description ? escapeHtml(core.description) : '';
    const credits    = core.credits || core.cost || 0;

    const verifiedSvg = core.verified
        ? '<span class="verified-badge" title="Verified from in-game data"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>'
        : '';

    // Rating heat strip
    const r = core.rating || {};
    const total = (r.fire||0)+(r.love||0)+(r.meh||0)+(r.nah||0)+(r.trash||0);
    const pct = k => total ? ((r[k]||0)/total*100).toFixed(1) : '0.0';
    const heatStrip = `
                    <div class="cw-heat-strip" data-slug="${escapeAttr(slug)}" data-total="${total}">
                        <button class="cw-heat-emoji" data-rating="5" title="Fire">🔥<span class="cw-heat-pct">${pct('fire')}%</span></button>
                        <button class="cw-heat-emoji" data-rating="4" title="Love">😍<span class="cw-heat-pct">${pct('love')}%</span></button>
                        <button class="cw-heat-emoji" data-rating="3" title="Meh">😐<span class="cw-heat-pct">${pct('meh')}%</span></button>
                        <button class="cw-heat-emoji" data-rating="2" title="Nah">👎<span class="cw-heat-pct">${pct('nah')}%</span></button>
                        <button class="cw-heat-emoji" data-rating="1" title="Trash">💩<span class="cw-heat-pct">${pct('trash')}%</span></button>
                        <span class="cw-heat-total">${total} votes</span>
                    </div>`;

    return `
                <div class="core-card ${rarity}" data-slug="${escapeAttr(slug)}" role="button" tabindex="0">
                    <div class="core-card-glow"></div>
                    <div class="core-card-header">
                        <span class="core-runner-pill ${runnerType}">${getRunnerIcon(runnerType)} ${capitalizeFirst(runnerType)}</span>
                        <span class="core-rarity-tag ${rarity}">${capitalizeFirst(rarity)}</span>
                    </div>
                    <div class="core-icon-container">
                        <div class="core-icon ${rarity}">
                            <img src="${iconUrl}" alt="${altText}" onerror="this.parentElement.classList.add('icon-fallback')" loading="lazy">
                        </div>
                        <div class="core-name">${name}${verifiedSvg}</div>
                    </div>
                    <div class="core-card-content">
                        ${desc ? `<div class="core-description-snippet">${desc}</div>` : ''}
                    </div>
                    <div class="core-card-footer">
                        ${credits ? `<span class="core-card-credits"><img src="//marathon/assets/icons/credits.webp" alt="" width="14" height="14">${Number(credits).toLocaleString()}</span>` : '<span></span>'}
                        <span class="core-card-cta">View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
                    </div>
                    ${heatStrip}
                    ${!isActive ? '<div class="core-inactive-badge">Inactive</div>' : ''}
                </div>`;
}

// ─── SEO Helpers ────────────────────────────────────────────────────────────

function buildSeoList(cores, runnerName) {
    const items = cores.map(core => {
        const rarity = capitalizeFirst((core.rarity || 'standard').toLowerCase());
        const name   = escapeHtml(core.name);
        const slug   = escapeAttr(core.slug);
        const runner = capitalizeFirst((core.runner_type || '').toLowerCase());
        return `        <li><a href="//marathon/cores/?core=${slug}">${name}</a> – ${rarity} ${runner} core</li>`;
    });

    return `    <noscript>
    <div class="seo-core-list">
        <h2>All ${runnerName} Cores in Marathon</h2>
        <ul>
${items.join('\n')}
        </ul>
    </div>
    </noscript>`;
}

function buildStructuredData(cores, runner) {
    const runnerName = capitalizeFirst(runner);
    const data = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `Marathon ${runnerName} Cores – Stats, Ratings & Balance History`,
        "description": RUNNER_DESCRIPTIONS[runner],
        "url": `${SITE_URL}/cores/${runner}/`,
        "numberOfItems": cores.length,
        "itemListElement": cores.map((core, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `${SITE_URL}/cores/?core=${core.slug}`,
            "name": core.name
        }))
    };
    return JSON.stringify(data, null, 2);
}

// ─── Page Generator ─────────────────────────────────────────────────────────

function generateRunnerPage(runner, runnerCores, allCores) {
    const runnerName  = capitalizeFirst(runner);
    const coreCount   = runnerCores.length;
    const description = RUNNER_DESCRIPTIONS[runner];
    const intro       = RUNNER_INTRO[runner];
    const navHtml     = generateNavigation('cores');

    const cardsHtml   = runnerCores.map(c => buildCardHtml(c)).join('\n');
    const seoList     = buildSeoList(runnerCores, runnerName);
    const structured  = buildStructuredData(runnerCores, runner);

    // JSON data blob: embed only this runner's cores for instant JS render
    const jsonBlob    = JSON.stringify(runnerCores);

    // Build runner tab pills — active tab uses data-runner="" so JS shows all
    // embedded cores (already pre-filtered to this runner + universal)
    const runnerTabs = RUNNER_TYPES.map(r => {
        if (r === runner) {
            return `                    <a href="//marathon/cores/${r}/" class="runner-nav-pill active" data-runner="">${capitalizeFirst(r)}</a>`;
        }
        return `                    <a href="//marathon/cores/${r}/" class="runner-nav-pill" data-runner="${r}">${capitalizeFirst(r)}</a>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeAttr(description)}">
    <meta name="keywords" content="Marathon ${runnerName} cores, ${runnerName} core database, ${runnerName} runner upgrades, ${runnerName} abilities, Marathon ${runnerName}, Bungie Marathon, core stats">
    <meta name="robots" content="index, follow">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">

    <!-- Open Graph Tags -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${SITE_URL}/cores/${runner}/">
    <meta property="og:title" content="Marathon ${runnerName} Cores – Stats, Ratings & Balance History | MarathonDB">
    <meta property="og:description" content="${escapeAttr(description)}">
    <meta property="og:image" content="${SITE_URL}/Icon.png">

    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Marathon ${runnerName} Cores – Stats, Ratings & Balance History | MarathonDB">
    <meta name="twitter:description" content="${escapeAttr(description)}">
    <meta name="twitter:image" content="${SITE_URL}/Icon.png">

    <link rel="canonical" href="${SITE_URL}/cores/${runner}/">
    <title>Marathon ${runnerName} Cores – Stats, Ratings & Balance History | MarathonDB</title>
    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">

    <!-- Structured Data -->
    <script type="application/ld+json">
${structured}
    </script>
</head>
<body class="no-hero">
    ${navHtml}

    <main class="container">
        <!-- Breadcrumb -->
        <nav class="detail-breadcrumb" aria-label="Breadcrumb">
            <ol itemscope itemtype="https://schema.org/BreadcrumbList" style="display: flex; align-items: center; gap: 8px; list-style: none; margin: 0; padding: 0;">
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/"><span itemprop="name">Home</span></a>
                    <meta itemprop="position" content="1" />
                </li>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <a itemprop="item" href="//marathon/cores/"><span itemprop="name">Cores</span></a>
                    <meta itemprop="position" content="2" />
                </li>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                    <span itemprop="name">${runnerName} Cores</span>
                    <meta itemprop="position" content="3" />
                </li>
            </ol>
        </nav>

        <!-- Compact Header with Search -->
        <header class="page-header-compact">
            <div class="page-header-left">
                <h1 class="page-title-compact">${runnerName.toUpperCase()} CORES <span class="page-count" id="coreCount">(${coreCount})</span></h1>
                <p class="page-subtitle-seo">Every ${runnerName} core in Marathon, with stats, community ratings, and balance history</p>
            </div>
            <div class="page-header-right">
                <div class="search-box-inline">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="text" id="coreSearch" placeholder="Search...">
                </div>
                <select id="coreSort" class="sort-select-inline">
                    <option value="name">A-Z</option>
                    <option value="name-desc">Z-A</option>
                    <option value="rarity" selected>Rarity</option>
                    <option value="credits">Value</option>
                </select>
            </div>
        </header>

        <!-- Filter Bar: Runner tabs + Rarity pills in one row -->
        <div class="cores-filter-bar">
            <nav class="runner-nav-pills" id="runnerTabs">
                <a href="//marathon/cores/" class="runner-nav-pill" data-runner="">All</a>
${runnerTabs}
            </nav>
            <div class="cores-filter-divider"></div>
            <div class="filter-pills-inline" id="rarityFilterPills">
                <button class="filter-pill filter-pill-sm active" data-filter="all">All</button>
                <button class="filter-pill filter-pill-sm" data-filter="prestige">Prestige</button>
                <button class="filter-pill filter-pill-sm" data-filter="superior">Superior</button>
                <button class="filter-pill filter-pill-sm" data-filter="deluxe">Deluxe</button>
                <button class="filter-pill filter-pill-sm" data-filter="enhanced">Enhanced</button>
                <button class="filter-pill filter-pill-sm" data-filter="standard">Standard</button>
            </div>
        </div>

        <!-- SEO content (hidden, accessible to crawlers) -->
        <div class="seo-only" aria-hidden="true">
            <p>${intro}</p>
            <p>This page shows all cores available to the <strong>${runnerName}</strong> runner class, plus universal cores usable by any runner. Use the <strong>rarity pills</strong> above to narrow by tier, or click any core to see full effects, perk rolls, and balance history.</p>
        </div>

        <!-- Mobile Top Banner Ad -->

        <!-- SEO Detail Block (rendered by JS for ?core= URLs) -->
        <section id="coreDetailSeo" style="display:none"></section>

        <!-- Cores Grid -->
        <section class="cosmetics-results" id="resultsSection">
            <div id="coresGrid" class="cores-grid">
${cardsHtml}
            </div>
        </section>

        ${seoList}

        <!-- SEO Content Footer -->
        <details class="seo-content-expander" open style="margin-top:2rem;">
            <summary class="seo-content-summary">
                <svg class="seo-intro-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                More about ${runnerName} cores
                <svg class="seo-intro-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </summary>
            <div class="seo-intro-body">
                <h2>All ${runnerName} Cores in Marathon</h2>
                <p>${intro}</p>
                <p>Universal cores (available to all runners) are also shown on this page. For the complete list across all runner classes, visit the <a href="//marathon/cores/">full cores database</a>.</p>
                <h2>Browse Cores by Runner Class</h2>
                <ul>
                    <li><a href="//marathon/cores/destroyer/">Destroyer Cores</a></li>
                    <li><a href="//marathon/cores/recon/">Recon Cores</a></li>
                    <li><a href="//marathon/cores/thief/">Thief Cores</a></li>
                    <li><a href="//marathon/cores/assassin/">Assassin Cores</a></li>
                    <li><a href="//marathon/cores/vandal/">Vandal Cores</a></li>
                    <li><a href="//marathon/cores/triage/">Triage Cores</a></li>
                </ul>
            </div>
        </details>
    </main>

    ${generateFooter()}

    <!-- Core Detail Popout Modal -->
    <div class="core-modal-overlay" id="coreModal" aria-hidden="true">
        <div class="core-modal-backdrop" id="coreModalBackdrop"></div>
        <div class="core-modal-layout">
            <div class="core-modal" role="dialog" aria-modal="true" aria-labelledby="coreModalName">
                <button class="core-modal-close" id="coreModalClose" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>

                <div class="core-modal-body">
                    <!-- Left: Core visual / icon area -->
                    <div class="core-modal-left">
                        <div class="core-modal-icon-area" id="coreModalIconArea">
                            <div class="core-modal-icon-frame" id="coreModalIconFrame">
                                <img id="coreModalIcon" src="" alt="" loading="lazy">
                            </div>
                            <div class="core-modal-rarity-glow" id="coreModalRarityGlow"></div>
                        </div>
                    </div>

                    <!-- Right: Detail panel -->
                    <div class="core-modal-right">
                        <div class="core-modal-header">
                            <div class="core-modal-badges" id="coreModalBadges"></div>
                            <h2 class="core-modal-name" id="coreModalName">Loading...</h2>
                            <p class="core-modal-description" id="coreModalDescription"></p>
                            <!-- Share Buttons -->
                            <div class="item-share-row" id="coreShareRow">
                                <button class="item-share-btn share-twitter" id="coreShareTwitter" title="Share on X">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    Share
                                </button>
                                <button class="item-share-btn share-discord" id="coreShareDiscord" title="Copy for Discord">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                                    Discord
                                </button>
                                <button class="item-share-btn share-copy" id="coreShareCopy" title="Copy link">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    Copy Link
                                </button>
                            </div>
                            <div id="coreShareToast" class="item-share-toast" aria-live="polite"></div>
                        </div>

                        <!-- Quick Stats -->
                        <div class="core-modal-quick-stats" id="coreModalQuickStats"></div>

                        <!-- Community Rating -->
                        <div class="core-modal-section" id="coreModalRatingSection" style="display:none">
                            <div class="core-modal-section-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                <h3>Community Rating</h3>
                            </div>
                            <div id="coreModalRating"></div>
                        </div>

                        <!-- Balance History -->
                        <div class="core-modal-section" id="coreModalHistorySection" style="display:none">
                            <div class="core-modal-section-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <h3>Balance History</h3>
                            </div>
                            <div class="core-modal-history" id="coreModalHistory"></div>
                        </div>

                        <!-- Meta Info -->
                        <div class="core-modal-meta" id="coreModalMeta"></div>

                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>window.__CORES_DATA = ${jsonBlob};</script>
    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/cores.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>
    <script src="//marathon/js/feedback.js"></script>

</body>
</html>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n🧠 Building Per-Runner Core Pages...\n');

    // 1. Fetch all cores
    console.log('  Fetching core data from API...');
    const response = await fetchJSON(API_URL);
    if (!response || !response.success || !Array.isArray(response.data)) {
        throw new Error('Invalid API response: ' + JSON.stringify(response).slice(0, 200));
    }

    const allCores = response.data;
    console.log(`  ✅ Fetched ${allCores.length} cores\n`);

    applyDataCorrections(allCores);

    // Sort by rarity (highest first), then alphabetical
    allCores.sort((a, b) => {
        const ra = RARITY_ORDER[(a.rarity || 'standard').toLowerCase()] || 0;
        const rb = RARITY_ORDER[(b.rarity || 'standard').toLowerCase()] || 0;
        if (rb !== ra) return rb - ra;
        return (a.name || '').localeCompare(b.name || '');
    });

    // Universal cores (runner_type === 'all')
    const universalCores = allCores.filter(c => (c.runner_type || '').toLowerCase() === 'all');
    console.log(`  Universal cores: ${universalCores.length}`);

    // 2. Determine which runners to build
    const runners = RUNNER_ARG ? [RUNNER_ARG.toLowerCase()] : RUNNER_TYPES;

    for (const runner of runners) {
        if (!RUNNER_TYPES.includes(runner)) {
            console.error(`  ❌ Unknown runner type: ${runner}`);
            continue;
        }

        // Filter cores for this runner + universal
        const classCores = allCores.filter(c => (c.runner_type || '').toLowerCase() === runner);
        const runnerCores = [...classCores, ...universalCores];

        // Re-sort the combined set
        runnerCores.sort((a, b) => {
            const ra = RARITY_ORDER[(a.rarity || 'standard').toLowerCase()] || 0;
            const rb = RARITY_ORDER[(b.rarity || 'standard').toLowerCase()] || 0;
            if (rb !== ra) return rb - ra;
            return (a.name || '').localeCompare(b.name || '');
        });

        console.log(`  📄 ${capitalizeFirst(runner)}: ${classCores.length} class cores + ${universalCores.length} universal = ${runnerCores.length} total`);

        const html = generateRunnerPage(runner, runnerCores, allCores);
        const outDir  = path.join(OUTPUT_DIR, runner);
        const outFile = path.join(outDir, 'index.html');

        if (IS_DRYRUN) {
            console.log(`  [DRY RUN] Would write: ${outFile} (${html.length} bytes)`);
        } else {
            ensureDir(outDir);
            fs.writeFileSync(outFile, html, 'utf8');
            console.log(`  ✅ Written: cores/${runner}/index.html`);
        }
    }

    console.log('\n✅ Per-runner core pages complete!\n');
}

main().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
});
