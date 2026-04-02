#!/usr/bin/env node
/**
 * prebuild-cores.js
 * -----------------
 * Fetches all core data from the API at build time and injects:
 *   1. window.__CORES_DATA JSON blob  (so JS grid renders instantly, no API call)
 *   2. Static HTML cards inside #coresGrid  (crawlable by Google)
 *   3. <noscript> link list  (crawlable fallback for bots with JS disabled)
 *   4. Updated JSON-LD structured data with itemListElement
 *   5. Updated item count
 *
 * Usage:  node build/prebuild-cores.js
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── Config ─────────────────────────────────────────────────
const API_URL       = 'https://cores.marathondb.gg/api/cores';
const SITE_URL      = 'https://marathondb.gg';
const HTML_PATH     = path.resolve(__dirname, '..', 'cores', 'index.html');

// ─── Constants (mirror cores.js) ────────────────────────────

const RUNNER_ICONS = {
    destroyer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    recon:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    thief:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    assassin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14.5 4h-5L7 7H2l5.5 5.5L5 22h7l-2.5-5.5L12 13l2.5 3.5L12 22h7l-2.5-9.5L22 7h-5l-2.5-3z"/></svg>',
    vandal:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    triage:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
};

const RARITY_ORDER = { prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };

// ─── Data Corrections (SEO rec #7 & #8) ─────────────────────
// Fix known API data issues before embedding.

const NAME_CORRECTIONS = {
    'Botique': 'Boutique',          // Rec #8 — schema typo
};

/**
 * Apply name corrections and disambiguate duplicate names by
 * appending runner class in parentheses (e.g. "Predator (Assassin)").
 */
function applyDataCorrections(cores) {
    // 1. Fix known typos
    for (const core of cores) {
        if (NAME_CORRECTIONS[core.name]) {
            console.log(`  🔧 Name fix: "${core.name}" → "${NAME_CORRECTIONS[core.name]}"`);
            core.name = NAME_CORRECTIONS[core.name];
        }
    }

    // 2. Disambiguate duplicate names (Rec #7)
    const nameCounts = {};
    for (const core of cores) {
        nameCounts[core.name] = (nameCounts[core.name] || 0) + 1;
    }
    for (const core of cores) {
        if (nameCounts[core.name] > 1) {
            const runner = capitalizeFirst((core.runner_type || '').toLowerCase());
            const oldName = core.name;
            core.name = `${core.name} (${runner})`;
            console.log(`  🔧 Disambiguate: "${oldName}" → "${core.name}"`);
        }
    }

    return cores;
}

// ─── Helpers ────────────────────────────────────────────────

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
    return RUNNER_ICONS[runnerType] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>';
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

// ─── Card HTML Generator ────────────────────────────────────

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

// ─── SEO Link List Generator ────────────────────────────────

function buildSeoList(cores) {
    const items = cores.map(core => {
        const runner = capitalizeFirst((core.runner_type || '').toLowerCase());
        const rarity = capitalizeFirst((core.rarity || 'standard').toLowerCase());
        const name   = escapeHtml(core.name);
        const slug   = escapeAttr(core.slug);
        return `        <li><a href="//marathon/cores/?core=${slug}">${name}</a> – ${rarity} ${runner} core</li>`;
    });

    return `    <noscript>
    <div class="seo-core-list">
        <h2>All Marathon Cores</h2>
        <ul>
${items.join('\n')}
        </ul>
    </div>
    </noscript>`;
}

// ─── Structured Data Generator ──────────────────────────────

function buildStructuredData(cores) {
    const data = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Marathon Cores – All Runner Upgrades, Stats & Effects",
        "description": "Browse every Marathon core across all runner classes. Complete database with stats, rarity tiers, community ratings, and balance history.",
        "url": `${SITE_URL}/cores/`,
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

// ─── Idempotent Replace Helper ──────────────────────────────

function replaceMarkerBlock(html, tag, newContent) {
    const re = new RegExp(
        `<!--PREBUILD:${tag}_START-->[\\s\\S]*?<!--PREBUILD:${tag}_END-->`,
        ''
    );
    const match = html.match(re);
    if (!match) {
        console.error(`  ⚠ Marker pair PREBUILD:${tag}_START / _END not found — skipping`);
        return html;
    }
    return html.replace(re,
        `<!--PREBUILD:${tag}_START-->\n${newContent}\n<!--PREBUILD:${tag}_END-->`
    );
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
    console.log('\n🧠 Prebuilding Cores Page...\n');

    // 1. Fetch data
    console.log('  Fetching core data from API...');
    const response = await fetchJSON(API_URL);
    if (!response || !response.success || !Array.isArray(response.data)) {
        throw new Error('Invalid API response: ' + JSON.stringify(response).slice(0, 200));
    }

    const cores = response.data;
    console.log(`  ✅ Fetched ${cores.length} cores\n`);

    // Apply data corrections (typos, duplicate names)
    applyDataCorrections(cores);

    // Sort by rarity (highest first), then runner class, then alphabetical
    cores.sort((a, b) => {
        const ra = RARITY_ORDER[(a.rarity || 'standard').toLowerCase()] || 0;
        const rb = RARITY_ORDER[(b.rarity || 'standard').toLowerCase()] || 0;
        if (rb !== ra) return rb - ra;
        const rc = (a.runner_type || a.runner || '').localeCompare(b.runner_type || b.runner || '');
        if (rc !== 0) return rc;
        return (a.name || '').localeCompare(b.name || '');
    });

    // 2. Read current HTML
    console.log('  Reading cores/index.html...');
    let html = fs.readFileSync(HTML_PATH, 'utf8');

    // 3. Replace JSON data blob (idempotent via markers)
    console.log('  Injecting window.__CORES_DATA...');
    const jsonBlob = `    <script>window.__CORES_DATA = ${JSON.stringify(cores)};</script>`;
    html = replaceMarkerBlock(html, 'JSON_DATA', jsonBlob);

    // 4. Replace grid cards (idempotent via markers)
    console.log('  Generating static HTML cards...');
    const cardsHtml = cores.map(c => buildCardHtml(c)).join('\n');
    html = replaceMarkerBlock(html, 'GRID_CARDS', cardsHtml);

    // 5. Replace SEO link list (idempotent via markers)
    console.log('  Generating noscript SEO link list...');
    const seoList = buildSeoList(cores);
    html = replaceMarkerBlock(html, 'SEO_LIST', seoList);

    // 6. Replace structured data (idempotent via markers)
    console.log('  Updating structured data...');
    const structuredData = buildStructuredData(cores);
    html = replaceMarkerBlock(html, 'STRUCTURED_DATA',
        `    <script type="application/ld+json">\n${structuredData}\n    </script>`
    );

    // 7. Replace count inside coreCount span (idempotent via regex)
    console.log('  Updating item count...');
    html = html.replace(
        /(<span[^>]*id="coreCount"[^>]*>)\([^)]*\)/,
        `$1(${cores.length})`
    );

    // 8. Write back
    console.log('  Writing cores/index.html...');
    fs.writeFileSync(HTML_PATH, html, 'utf8');

    console.log(`\n✅ Prebuild complete — ${cores.length} cores embedded into cores/index.html`);
    console.log(`   - ${cores.length} static cards in #coresGrid`);
    console.log(`   - ${cores.length} noscript links for SEO`);
    console.log(`   - JSON blob: ~${Math.round(JSON.stringify(cores).length / 1024)}KB`);
    console.log(`   - Structured data: ${cores.length} ListItem entries\n`);
}

main().catch(err => {
    console.error('\n❌ Prebuild failed:', err.message);
    process.exit(1);
});
