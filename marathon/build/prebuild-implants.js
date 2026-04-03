#!/usr/bin/env node
/**
 * prebuild-implants.js
 * --------------------
 * Fetches all implant data from the API at build time and injects:
 *   1. window.__IMPLANTS_DATA JSON blob  (so JS grid renders instantly, no API call)
 *   2. Static HTML cards inside #implantsGrid  (crawlable by Google)
 *   3. <noscript> link list  (crawlable fallback for bots with JS disabled)
 *   4. Updated JSON-LD structured data
 *   5. Updated item count
 *
 * Usage:  node build/prebuild-implants.js
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── Config ─────────────────────────────────────────────────
const API_URL       = 'https://implants.marathondb.gg/api/implants';
const SITE_URL      = 'https://marathondb.gg';
const HTML_PATH     = path.resolve(__dirname, '..', 'implants', 'index.html');

// ─── Constants (mirror implants.js) ─────────────────────────
const SLOT_ICONS_SVG = {
    head:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
    torso:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><rect x="8" y="2" width="8" height="12" rx="2"/></svg>',
    legs:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 2v8l-2 10h4l2-10V2M18 2v8l-2 10h4l2-10V2M14 2v8l-2 10"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
};

const SLOT_ICON_URLS = {
    head:   'https://helpbot.marathondb.gg/assets/items/implants/head-72x72.png',
    torso:  'https://helpbot.marathondb.gg/assets/items/implants/torso-72x72.png',
    legs:   'https://helpbot.marathondb.gg/assets/items/implants/legs-72x72.png',
    shield: 'https://helpbot.marathondb.gg/assets/items/implants/shield-72x72.png',
};

const STAT_LABELS_SHORT = {
    agility: 'AGI', fallResistance: 'FALL', finisherSiphon: 'SIPHON',
    firewall: 'FW', hardware: 'HW', heatCapacity: 'HEAT', lootSpeed: 'LOOT',
    meleeDamage: 'MELEE', pingDuration: 'PING', primeRecovery: 'PRIME',
    reviveSpeed: 'REVIVE', selfRepairSpeed: 'REPAIR', shieldRecoverySpeed: 'SRS',
    tacticalRecovery: 'TAC',
};

const RARITY_ORDER = { prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };

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

function buildCardHtml(implant) {
    const slot    = (implant.slot || 'head').toLowerCase();
    const rarity  = (implant.rarity || 'standard').toLowerCase();
    const slug    = implant.slug || implant.id;
    const iconUrl = SLOT_ICON_URLS[slot] || SLOT_ICON_URLS.head;
    const slotSvg = SLOT_ICONS_SVG[slot] || SLOT_ICONS_SVG.head;
    const name    = escapeHtml(implant.name || 'Unknown');
    const altText = escapeAttr(`${implant.name || 'Implant'} – Marathon ${capitalizeFirst(slot)} implant`);

    // Top-2 stats compact line
    let statsLine = '';
    if (implant.stats && implant.stats.length > 0) {
        statsLine = '<div class="implant-card-stats">' + implant.stats.slice(0, 2).map(s => {
            const isPositive = s.stat_value >= 0;
            const sign = isPositive ? '+' : '';
            const label = STAT_LABELS_SHORT[s.stat_name] || (s.stat_name || '').toUpperCase().slice(0, 5);
            return `<span class="implant-card-stat ${isPositive ? 'buff' : 'debuff'}">${sign}${s.stat_value} ${escapeHtml(label)}</span>`;
        }).join('<span class="implant-card-stat-sep">\u00b7</span>') + '</div>';
    }

    // Unique trait pill
    const hasUniqueTrait = implant.unique_trait_description ||
        (implant.traits && implant.traits.some(t => t.name === 'Unique Trait'));

    const verifiedSvg = (implant.verified || implant.server_slam_verified)
        ? '<span class="verified-badge" title="Verified from in-game data"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>'
        : '';

    // Description snippet
    const desc = implant.description
        ? `\n                        <div class="implant-description-snippet">${escapeHtml(implant.description)}</div>`
        : '';

    // Credits
    const credits = implant.credits != null
        ? Number(implant.credits).toLocaleString()
        : '\u2014';

    return `
                <div class="implant-card ${rarity}" data-slug="${escapeAttr(slug)}" role="button" tabindex="0">
                    <div class="implant-card-glow"></div>
                    <div class="implant-card-header">
                        <span class="implant-slot-pill ${slot}">${slotSvg} ${capitalizeFirst(slot)}</span>
                        <span class="implant-rarity-tag ${rarity}">${capitalizeFirst(rarity)}</span>
                    </div>
                    <div class="implant-icon-container">
                        <div class="implant-icon ${rarity}">
                            <img src="${iconUrl}" alt="${altText}" onerror="this.parentElement.classList.add('icon-fallback')" loading="lazy">
                        </div>
                        <div class="implant-name">${name}${verifiedSvg}</div>
                    </div>
                    <div class="implant-card-content">${desc}
                        ${statsLine}
                        ${hasUniqueTrait ? '<span class="implant-unique-pill">\u2605 Unique</span>' : ''}
                    </div>
                    <div class="implant-card-footer">
                        ${credits ? `<span class="implant-card-credits"><img src="/marathon/assets/icons/credits.webp" alt="" width="14" height="14">${credits}</span>` : '<span></span>'}
                        <span class="implant-card-cta">View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
                    </div>
                    <div class="cw-heat-strip" data-slug="${escapeAttr(slug)}">
                        <div class="cw-heat-fill"></div>
                        <div class="cw-heat-emojis">
                            <button class="cw-heat-emoji" data-rating="5" data-slug="${escapeAttr(slug)}" title="Fire"><span class="cw-emoji-icon">\ud83d\udd25</span><span class="cw-emoji-count" data-rating-count="5">\u2014</span></button>
                            <button class="cw-heat-emoji" data-rating="4" data-slug="${escapeAttr(slug)}" title="Love"><span class="cw-emoji-icon">\ud83d\ude0d</span><span class="cw-emoji-count" data-rating-count="4">\u2014</span></button>
                            <button class="cw-heat-emoji" data-rating="3" data-slug="${escapeAttr(slug)}" title="Meh"><span class="cw-emoji-icon">\ud83d\ude10</span><span class="cw-emoji-count" data-rating-count="3">\u2014</span></button>
                            <button class="cw-heat-emoji" data-rating="2" data-slug="${escapeAttr(slug)}" title="Nah"><span class="cw-emoji-icon">\ud83d\udc4e</span><span class="cw-emoji-count" data-rating-count="2">\u2014</span></button>
                            <button class="cw-heat-emoji" data-rating="1" data-slug="${escapeAttr(slug)}" title="Trash"><span class="cw-emoji-icon">\ud83d\udca9</span><span class="cw-emoji-count" data-rating-count="1">\u2014</span></button>
                        </div>
                    </div>
                </div>`;
}

// ─── SEO Link List Generator ────────────────────────────────

function buildSeoList(implants) {
    const items = implants.map(imp => {
        const slot   = capitalizeFirst((imp.slot || '').toLowerCase());
        const rarity = capitalizeFirst((imp.rarity || 'standard').toLowerCase());
        const name   = escapeHtml(imp.name);
        const slug   = escapeAttr(imp.slug);
        return `        <li><a href="/marathon/implants/?implant=${slug}">${name}</a> – ${rarity} ${slot} implant</li>`;
    });

    return `    <noscript>
    <div class="seo-implant-list">
        <h2>All Marathon Implants</h2>
        <ul>
${items.join('\n')}
        </ul>
    </div>
    </noscript>`;
}

// ─── Structured Data Generator ──────────────────────────────

function buildStructuredData(implants) {
    const data = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Marathon Implants – All Stats, Traits & Slots",
        "description": "Browse every Marathon implant across Head, Torso, Legs, and Shield slots. Complete database with stat modifiers, unique traits, rarity tiers, and upgrade paths.",
        "url": `${SITE_URL}/implants/`,
        "numberOfItems": implants.length,
        "itemListElement": implants.map((imp, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `${SITE_URL}/implants/?implant=${imp.slug}`,
            "name": imp.name
        }))
    };
    return JSON.stringify(data, null, 2);
}

// ─── Idempotent Replace Helper ──────────────────────────────
// Matches either:
//   <!--PREBUILD:TAG_START-->...anything...<!--PREBUILD:TAG_END-->
// and replaces the content between the markers while keeping the markers.

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
    console.log('\n🦴 Prebuilding Implants Page...\n');

    // 1. Fetch data
    console.log('  Fetching implant data from API...');
    const response = await fetchJSON(API_URL);
    if (!response || !response.success || !Array.isArray(response.data)) {
        throw new Error('Invalid API response: ' + JSON.stringify(response).slice(0, 200));
    }

    const implants = response.data;
    console.log(`  ✅ Fetched ${implants.length} implants\n`);

    // Sort by rarity (highest first), then slot type, then alphabetical
    implants.sort((a, b) => {
        const ra = RARITY_ORDER[(a.rarity || 'standard').toLowerCase()] || 0;
        const rb = RARITY_ORDER[(b.rarity || 'standard').toLowerCase()] || 0;
        if (rb !== ra) return rb - ra;
        const sc = (a.slot || '').localeCompare(b.slot || '');
        if (sc !== 0) return sc;
        return (a.name || '').localeCompare(b.name || '');
    });

    // 2. Read current HTML
    console.log('  Reading implants/index.html...');
    let html = fs.readFileSync(HTML_PATH, 'utf8');

    // 3. Replace JSON data blob (idempotent via markers)
    console.log('  Injecting window.__IMPLANTS_DATA...');
    const jsonBlob = `    <script>window.__IMPLANTS_DATA = ${JSON.stringify(implants)};</script>`;
    html = replaceMarkerBlock(html, 'JSON_DATA', jsonBlob);

    // 4. Replace grid cards (idempotent via markers)
    console.log('  Generating static HTML cards...');
    const cardsHtml = implants.map(imp => buildCardHtml(imp)).join('\n');
    html = replaceMarkerBlock(html, 'GRID_CARDS', cardsHtml);

    // 5. Replace SEO link list (idempotent via markers)
    console.log('  Generating noscript SEO link list...');
    const seoList = buildSeoList(implants);
    html = replaceMarkerBlock(html, 'SEO_LIST', seoList);

    // 6. Replace structured data (idempotent via markers — already used start/end)
    console.log('  Updating structured data...');
    const structuredData = buildStructuredData(implants);
    html = replaceMarkerBlock(html, 'STRUCTURED_DATA',
        `    <script type="application/ld+json">\n${structuredData}\n    </script>`
    );

    // 7. Replace count inside implantCount span (idempotent via regex)
    console.log('  Updating item count...');
    html = html.replace(
        /(<span[^>]*id="implantCount"[^>]*>)\([^)]*\)/,
        `$1(${implants.length})`
    );

    // 8. Write back
    console.log('  Writing implants/index.html...');
    fs.writeFileSync(HTML_PATH, html, 'utf8');

    console.log(`\n✅ Prebuild complete — ${implants.length} implants embedded into implants/index.html`);
    console.log(`   - ${implants.length} static cards in #implantsGrid`);
    console.log(`   - ${implants.length} noscript links for SEO`);
    console.log(`   - JSON blob: ~${Math.round(JSON.stringify(implants).length / 1024)}KB`);
    console.log(`   - Structured data: ${implants.length} ListItem entries\n`);
}

main().catch(err => {
    console.error('\n❌ Prebuild failed:', err.message);
    process.exit(1);
});
