#!/usr/bin/env node
/**
 * prebuild-items.js
 * -----------------
 * Fetches all item data from the API at build time and injects:
 *   1. window.__ITEMS_DATA JSON blob  (so JS grid renders instantly, no API call)
 *   2. Static HTML cards inside #itemsGrid  (crawlable by Google)
 *   3. <noscript> link list  (crawlable fallback for bots with JS disabled)
 *   4. Updated JSON-LD structured data with numberOfItems + itemListElement
 *   5. Updated item count in the page header
 *
 * Usage:  node build/prebuild-items.js
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── Config ─────────────────────────────────────────────────
const ITEMS_API_URL = 'https://items.marathondb.gg/api/items';
const TYPES_API_URL = 'https://items.marathondb.gg/api/item-types';
const SITE_URL      = 'https://marathondb.gg';
const HTML_PATH     = path.resolve(__dirname, '..', 'items', 'index.html');

// ─── Constants (mirror items.js) ────────────────────────────
const RARITY_ORDER = { contraband: 6, prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };

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

// ─── Card HTML Generator (matches items.js displayItems) ────

function buildCardHtml(item) {
    const rarity  = (item.rarity || 'standard').toLowerCase();
    const slug    = escapeAttr(item.slug || item.id);
    const type    = escapeHtml(item.item_type || 'Item');
    const name    = escapeHtml(item.name || 'Unknown');
    const altText = escapeAttr(`${item.name || 'Item'} \u2013 Marathon item`);
    const imgSrc  = item.image_url ? `https://items.marathondb.gg${item.image_url}` : '';

    const verifiedBadge = item.verified
        ? '<svg class="item-verified-icon" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" title="Verified"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
        : '';

    const imgHtml = imgSrc
        ? `<img src="${escapeAttr(imgSrc)}" alt="${altText}" onerror="this.parentElement.classList.add('icon-fallback')" loading="lazy">`
        : `<span class="item-icon-placeholder">${escapeHtml((item.item_type || 'I').charAt(0))}</span>`;

    const descHtml = item.description
        ? `\n                    <div class="core-description-snippet">${escapeHtml(item.description)}</div>`
        : '';

    return `
                <div class="core-card ${rarity}" data-slug="${slug}" role="button" tabindex="0">
                    <div class="core-card-glow"></div>
                    <div class="core-card-header">
                        <span class="item-type-pill">${type}</span>
                    </div>
                    <div class="core-icon-container">
                        <div class="core-icon ${rarity}">
                            ${imgHtml}
                        </div>
                    </div>
                    <div class="core-card-content">
                        <div class="core-name">${name}${verifiedBadge}</div>${descHtml}
                    </div>
                    <div class="core-card-footer">
                        <span class="core-card-cta">View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
                    </div>
                </div>`;
}

// ─── SEO Link List Generator ────────────────────────────────

function buildSeoList(items) {
    const links = items.map(item => {
        const rarity = capitalizeFirst((item.rarity || 'standard').toLowerCase());
        const type   = escapeHtml(item.item_type || 'Item');
        const name   = escapeHtml(item.name);
        const slug   = escapeAttr(item.slug);
        return `        <li><a href="/items/?item=${slug}">${name}</a> \u2013 ${rarity} ${type}</li>`;
    });

    return `    <noscript>
    <div class="seo-item-list">
        <h2>All Marathon Items</h2>
        <ul>
${links.join('\n')}
        </ul>
    </div>
    </noscript>`;
}

// ─── Structured Data Generator ──────────────────────────────

function buildStructuredData(items) {
    const data = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Marathon Items Database \u2013 All Items, Gear & Consumables",
        "description": "Browse every item in Marathon. Consumables, equipment, ammo, grenades, upgrades, and more \u2014 complete with rarity, value, and where to find them.",
        "url": `${SITE_URL}/items/`,
        "numberOfItems": items.length,
        "publisher": {
            "@type": "Organization",
            "name": "MarathonDB",
            "url": `${SITE_URL}/`
        },
        "itemListElement": items.map((item, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `${SITE_URL}/items/?item=${encodeURIComponent(item.slug)}`,
            "name": item.name
        }))
    };
    return JSON.stringify(data, null, 2);
}

// ─── Type Pills Generator ───────────────────────────────────

function buildTypePills(types) {
    const allBtn = '<button class="filter-pill filter-pill-sm active" data-type="">All Types</button>';
    const pills = types.map(t =>
        `<button class="filter-pill filter-pill-sm" data-type="${escapeAttr(t)}">${escapeHtml(t)}</button>`
    ).join('\n                ');
    return `${allBtn}\n                ${pills}`;
}

// ─── Idempotent Replace Helper ──────────────────────────────

function replaceMarkerBlock(html, tag, newContent) {
    const re = new RegExp(
        `<!--PREBUILD:${tag}_START-->[\\s\\S]*?<!--PREBUILD:${tag}_END-->`,
        ''
    );
    const match = html.match(re);
    if (!match) {
        console.error(`  \u26A0 Marker pair PREBUILD:${tag}_START / _END not found \u2014 skipping`);
        return html;
    }
    return html.replace(re,
        `<!--PREBUILD:${tag}_START-->\n${newContent}\n<!--PREBUILD:${tag}_END-->`
    );
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
    console.log('\n\uD83D\uDCE6 Prebuilding Items Page...\n');

    // 1. Fetch data
    console.log('  Fetching item data from API...');
    const [itemsRes, typesRes] = await Promise.all([
        fetchJSON(ITEMS_API_URL),
        fetchJSON(TYPES_API_URL),
    ]);

    if (!itemsRes || !itemsRes.success || !Array.isArray(itemsRes.data)) {
        throw new Error('Invalid items API response: ' + JSON.stringify(itemsRes).slice(0, 200));
    }

    const items = itemsRes.data;
    const types = Array.isArray(typesRes?.data) ? typesRes.data : [];
    console.log(`  \u2705 Fetched ${items.length} items, ${types.length} types\n`);

    // Sort by rarity (highest first), then type, then alphabetical
    items.sort((a, b) => {
        const ra = RARITY_ORDER[(a.rarity || 'standard').toLowerCase()] || 0;
        const rb = RARITY_ORDER[(b.rarity || 'standard').toLowerCase()] || 0;
        if (rb !== ra) return rb - ra;
        const tc = (a.item_type || '').localeCompare(b.item_type || '');
        if (tc !== 0) return tc;
        return (a.name || '').localeCompare(b.name || '');
    });

    // 2. Read current HTML
    console.log('  Reading items/index.html...');
    let html = fs.readFileSync(HTML_PATH, 'utf8');

    // 3. Inject JSON data blob
    console.log('  Injecting window.__ITEMS_DATA...');
    const jsonBlob = `    <script>window.__ITEMS_DATA = ${JSON.stringify(items)};</script>`;
    html = replaceMarkerBlock(html, 'JSON_DATA', jsonBlob);

    // 4. Inject static grid cards
    console.log('  Generating static HTML cards...');
    const cardsHtml = items.map(item => buildCardHtml(item)).join('\n');
    html = replaceMarkerBlock(html, 'GRID_CARDS', cardsHtml);

    // 5. Inject noscript SEO link list
    console.log('  Generating noscript SEO link list...');
    const seoList = buildSeoList(items);
    html = replaceMarkerBlock(html, 'SEO_LIST', seoList);

    // 6. Inject structured data
    console.log('  Updating structured data...');
    const structuredData = buildStructuredData(items);
    html = replaceMarkerBlock(html, 'STRUCTURED_DATA',
        `    <script type="application/ld+json">\n${structuredData}\n    </script>`
    );

    // 7. Inject type filter pills
    console.log('  Updating type filter pills...');
    const typePills = buildTypePills(types);
    html = replaceMarkerBlock(html, 'TYPE_PILLS', typePills);

    // 8. Update item count in header
    console.log('  Updating item count...');
    html = html.replace(
        /(<span[^>]*id="itemCount"[^>]*>)[^<]*/,
        `$1(${items.length})`
    );

    // 9. Write back
    console.log('  Writing items/index.html...');
    fs.writeFileSync(HTML_PATH, html, 'utf8');

    console.log(`\n\u2705 Prebuild complete \u2014 ${items.length} items embedded into items/index.html`);
    console.log(`   - ${items.length} static cards in #itemsGrid`);
    console.log(`   - ${items.length} noscript links for SEO`);
    console.log(`   - ${types.length} type filter pills pre-rendered`);
    console.log(`   - JSON blob: ~${Math.round(JSON.stringify(items).length / 1024)}KB`);
    console.log(`   - Structured data: ${items.length} ListItem entries\n`);
}

main().catch(err => {
    console.error('\n\u274C Prebuild failed:', err.message);
    process.exit(1);
});
