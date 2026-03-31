#!/usr/bin/env node
/**
 * prebuild-mods.js
 * ----------------
 * Fetches all weapon mod data from the API at build time and injects:
 *   1. window.__MODS_DATA JSON blob  (so JS grid renders instantly, no API call)
 *   2. Static HTML cards inside #modsGrid  (crawlable by Google)
 *   3. <noscript> link list  (crawlable fallback for bots with JS disabled)
 *   4. Updated JSON-LD structured data with itemListElement
 *   5. Updated item count
 *
 * Usage:  node build/prebuild-mods.js
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── Config ─────────────────────────────────────────────────
const API_URL       = 'https://mods.marathondb.gg/api/mods';
const SITE_URL      = 'https://marathondb.gg';
const HTML_PATH     = path.resolve(__dirname, '..', 'mods', 'index.html');

// ─── Constants ──────────────────────────────────────────────

const SLOT_ICONS = {
    optic:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"//marathon/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"//marathon/></svg>',
    barrel:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 12h20"//marathon/><path d="M6 8v8"//marathon/><path d="M18 8v8"//marathon/><circle cx="12" cy="12" r="2"//marathon/></svg>',
    magazine:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"//marathon/><path d="M3 9h18"//marathon/><path d="M3 15h18"//marathon/></svg>',
    grip:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"//marathon/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"//marathon/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"//marathon/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"//marathon/></svg>',
    chip:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="4" y="4" width="16" height="16" rx="2"//marathon/><rect x="9" y="9" width="6" height="6"//marathon/><path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2"//marathon/></svg>',
    generator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"//marathon/></svg>',
    shield:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"//marathon/></svg>',
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
        .replace(/'//marathon/g, '&#39;');
}

function escapeAttr(text) {
    if (!text) return '';
    return String(text).replace(/"//marathon/g, '&quot;').replace(/'//marathon/g, '&#39;');
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getSlotIcon(slot) {
    return SLOT_ICONS[slot] || SLOT_ICONS.chip;
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

// Fetch detail for a single mod (to get effects, compatible_weapons, etc.)
async function fetchModDetail(slug) {
    try {
        const res = await fetchJSON(`${API_URL}/${slug}`);
        return (res && res.success) ? res.data : null;
    } catch { return null; }
}

// Fetch all mod details in parallel batches
async function fetchAllModDetails(slugs, batchSize = 10) {
    const results = {};
    for (let i = 0; i < slugs.length; i += batchSize) {
        const batch = slugs.slice(i, i + batchSize);
        const details = await Promise.all(batch.map(s => fetchModDetail(s)));
        batch.forEach((slug, idx) => { if (details[idx]) results[slug] = details[idx]; });
    }
    return results;
}

// Format a single effect for display on card
function formatEffectShort(eff) {
    const label = (eff.stat_key || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const sign = eff.delta > 0 ? '+' : '';
    const unit = eff.unit === 'percent' ? '%' : eff.unit === 'degrees' ? '°' : eff.unit === 'seconds' ? 's' : '';
    return `${label} ${sign}${eff.delta}${unit}`;
}

// Format effects for SEO list text
function formatEffectsText(effects) {
    if (!effects || !effects.length) return '';
    return effects.map(formatEffectShort).join(', ');
}

// ─── Card HTML Generator ────────────────────────────────────
// Only non-hidden mods get static cards. Hidden variants are still included in
// __MODS_DATA so the JS family-tree renderer can show them as locked/dimmed.

const MODS_IMG_BASE = 'https://mods.marathondb.gg/images/';
const PLACEHOLDER_URL = MODS_IMG_BASE + '_placeholder.webp';

function resolveIconUrl(mod) {
    const slug = mod.slug || '';
    const webp = mod.icon_url_webp;
    const legacy = mod.icon_url;
    if (webp && webp !== PLACEHOLDER_URL) return webp;
    if (slug) return `${MODS_IMG_BASE}${encodeURIComponent(slug)}.webp`;
    return legacy || '';
}

function buildIconOnerror(mod) {
    const legacy = mod.icon_url || '';
    const webp = mod.icon_url_webp || '';
    if (legacy && legacy !== PLACEHOLDER_URL && legacy !== webp) {
        return `onerror="if(!this.dataset.retried){this.dataset.retried='1';this.src='${escapeAttr(legacy)}';}else{this.parentElement.classList.add('icon-fallback');this.style.display='none';}"`;
    }
    return `onerror="this.parentElement.classList.add('icon-fallback');this.style.display='none';"`;
}

function buildCardHtml(mod) {
    const rarity   = (mod.rarity || 'enhanced').toLowerCase();
    const slotType = (mod.slot_type || 'chip').toLowerCase();
    const slug     = mod.slug || mod.id;
    const name     = escapeHtml(mod.name || 'Unknown');
    const iconUrl  = resolveIconUrl(mod);
    const altText  = escapeAttr(`${mod.name || 'Mod'} – Marathon ${capitalizeFirst(slotType)} mod`);
    const cost     = mod.cost || 0;

    // Effects chips (up to 3)
    const effects = mod.effects || [];
    let effectsHtml = '';
    if (effects.length) {
        const shown = effects.slice(0, 3);
        const remaining = effects.length - shown.length;
        const chips = shown.map(eff => {
            if (!eff.stat_key) return '';
            const label = eff.stat_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const sign = eff.delta > 0 ? '+' : '';
            const unit = eff.unit === 'percent' ? '%' : eff.unit === 'seconds' ? 's' : eff.unit === 'degrees' ? '°' : '';
            const text = `${label} ${sign}${eff.delta}${unit}`;
            return `<span class="mod-card-effect buff">${escapeHtml(text)}</span>`;
        }).join('');
        const moreHtml = remaining > 0 ? `<span class="mod-card-effect-more">+${remaining} more</span>` : '';
        effectsHtml = `\n                        <div class="mod-card-effects">${chips}${moreHtml}</div>`;
    }

    // Description snippet (prefer description, fall back to ability_description)
    const snippetText = (!effects.length && (mod.description || mod.ability_description)) || '';
    const snippetHtml = snippetText
        ? `\n                        <div class="mod-description-snippet">${escapeHtml(snippetText)}</div>`
        : '';

    // Verified badge
    const verifiedSvg = mod.is_verified
        ? '<span class="verified-badge" title="Data verified"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"//marathon/></svg></span>'
        : '';

    const iconOnerror = buildIconOnerror(mod);
    return `
                <div class="mod-card ${rarity}" data-slug="${escapeAttr(slug)}" role="button" tabindex="0">
                    <div class="mod-card-glow"></div>
                    <div class="mod-card-header">
                        <span class="mod-slot-pill ${slotType}">${getSlotIcon(slotType)} ${capitalizeFirst(slotType)}</span>
                        <span class="mod-rarity-tag ${rarity}">${capitalizeFirst(rarity)}</span>
                    </div>
                    <div class="mod-icon-container">
                        <div class="mod-icon ${rarity}">
                            ${iconUrl
                                ? `<img src="${iconUrl}" alt="${altText}" ${iconOnerror} loading="lazy">`
                                : `<div class="icon-fallback"></div>`}
                        </div>
                        <div class="mod-name">${name}${verifiedSvg}</div>
                    </div>
                    <div class="mod-card-content">${snippetHtml}${effectsHtml}
                    </div>
                    <div class="mod-card-footer">
                        ${cost ? `<span class="mod-card-credits"><img src="//marathon/assets/icons/credits.webp" alt="" width="14" height="14">${cost.toLocaleString()}</span>` : '<span></span>'}
                        <span class="mod-card-cta">View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M5 12h14M12 5l7 7-7 7"//marathon/></svg></span>
                    </div>
                </div>`;
}

// ─── SEO Link List Generator ────────────────────────────────

function buildSeoList(mods) {
    const items = mods.map(mod => {
        const slot   = capitalizeFirst((mod.slot_type || '').toLowerCase());
        const rarity = capitalizeFirst((mod.rarity || 'enhanced').toLowerCase());
        const name   = escapeHtml(mod.name);
        const slug   = escapeAttr(mod.slug);
        const effectsText = formatEffectsText(mod.effects);
        const effectsSuffix = effectsText ? ` (${escapeHtml(effectsText)})` : '';
        return `        <li><a href="/mods/?mod=${slug}">${name}</a> – ${rarity} ${slot} mod${effectsSuffix}</li>`;
    });

    return `    <noscript>
    <div class="seo-mod-list">
        <h2>All Marathon Weapon Mods</h2>
        <ul>
${items.join('\n')}
        </ul>
    </div>
    </noscript>`;
}

// ─── Structured Data Generator ──────────────────────────────

function buildStructuredData(mods) {
    const data = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Marathon Weapon Mods – All Attachments, Stats & Effects",
        "description": "Browse every weapon mod in Marathon. Complete database with stats, effects, compatible weapons, rarity tiers, and slot types.",
        "url": `${SITE_URL}/mods/`,
        "numberOfItems": mods.length,
        "itemListElement": mods.map((mod, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `${SITE_URL}/mods/?mod=${mod.slug}`,
            "name": mod.name
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
    console.log('\n🔧 Prebuilding Mods Page...\n');

    // 1. Fetch data
    console.log('  Fetching mod data from API...');
    const response = await fetchJSON(API_URL);
    if (!response || !response.success || !Array.isArray(response.data)) {
        throw new Error('Invalid API response: ' + JSON.stringify(response).slice(0, 200));
    }

    const mods = response.data;
    console.log(`  ✅ Fetched ${mods.length} mods from list endpoint`);

    // Fetch detail for each mod to get effects, compatible_weapons, description, etc.
    console.log('  Fetching detail for each mod (effects, weapons)...');
    const details = await fetchAllModDetails(mods.map(m => m.slug));
    let effectCount = 0;
    mods.forEach(mod => {
        const detail = details[mod.slug];
        if (detail) {
            mod.effects = detail.effects || [];
            mod.compatible_weapons = detail.compatible_weapons || [];
            mod.description = detail.description || mod.description || '';
            mod.ability_name = detail.ability_name || null;
            mod.ability_description = detail.ability_description || null;
            mod.damage_type = detail.damage_type || null;
            mod.cost = detail.cost != null ? detail.cost : mod.cost;
            mod.is_verified = detail.is_verified || 0;
            mod.is_partial_data = detail.is_partial_data || 0;
            mod.partial_data_notes = detail.partial_data_notes || null;
            mod.updated_at = detail.updated_at || null;
            if (mod.effects.length > 0) effectCount++;
        }
    });
    console.log(`  ✅ ${effectCount}/${mods.length} mods have effects data\n`);

    // Sort by rarity (highest first), then slot type, then alphabetical
    mods.sort((a, b) => {
        const ra = RARITY_ORDER[(a.rarity || 'enhanced').toLowerCase()] ?? 0;
        const rb = RARITY_ORDER[(b.rarity || 'enhanced').toLowerCase()] ?? 0;
        if (rb !== ra) return rb - ra;
        const sc = (a.slot_type || '').localeCompare(b.slot_type || '');
        if (sc !== 0) return sc;
        return (a.name || '').localeCompare(b.name || '');
    });

    // Visible mods — hidden variants excluded from grid/SEO/count
    // (they remain in __MODS_DATA so the JS family-tree can show them as locked)
    const visibleMods = mods.filter(m => !m.is_hidden);

    // 2. Read current HTML
    console.log('  Reading mods/index.html...');
    let html = fs.readFileSync(HTML_PATH, 'utf8');

    // 3. Replace JSON data blob (all mods including hidden, for family tree JS)
    console.log('  Injecting window.__MODS_DATA...');
    const jsonBlob = `    <script>window.__MODS_DATA = ${JSON.stringify(mods)};</script>`;
    html = replaceMarkerBlock(html, 'JSON_DATA', jsonBlob);

    // 4. Replace grid cards (visible mods only)
    console.log('  Generating static HTML cards...');
    const cardsHtml = visibleMods.map(m => buildCardHtml(m)).join('\n');
    html = replaceMarkerBlock(html, 'GRID_CARDS', cardsHtml);

    // 5. Replace SEO link list (visible mods only)
    console.log('  Generating noscript SEO link list...');
    const seoList = buildSeoList(visibleMods);
    html = replaceMarkerBlock(html, 'SEO_LIST', seoList);

    // 6. Replace structured data (visible mods only)
    console.log('  Updating structured data...');
    const structuredData = buildStructuredData(visibleMods);
    html = replaceMarkerBlock(html, 'STRUCTURED_DATA',
        `    <script type="application/ld+json">\n${structuredData}\n    </script>`
    );

    // 7. Replace count inside modCount span — shows visible mod count
    console.log('  Updating item count...');
    html = html.replace(
        /(<span[^>]*id="modCount"[^>]*>)\([^)]*\)/,
        `$1(${visibleMods.length})`
    );

    // 8. Write back
    console.log('  Writing mods/index.html...');
    fs.writeFileSync(HTML_PATH, html, 'utf8');

    console.log(`\n✅ Prebuild complete — ${mods.length} mods embedded into mods/index.html`);
    console.log(`   - ${mods.length} static cards in #modsGrid`);
    console.log(`   - ${mods.length} noscript links for SEO`);
    console.log(`   - JSON blob: ~${Math.round(JSON.stringify(mods).length / 1024)}KB`);
    console.log(`   - Structured data: ${mods.length} ListItem entries\n`);
}

main().catch(err => {
    console.error('\n❌ Prebuild failed:', err.message);
    process.exit(1);
});
