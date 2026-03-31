#!/usr/bin/env node
/**
 * prebuild-runners.js
 * -------------------
 * Fetches all runner data from the API at build time and injects
 * fresh, pre-rendered HTML into each runner detail page for SEO.
 *
 * Updated sections per runner page:
 *   1. Abilities cards   (inside #abilitiesList)
 *   2. Stats bars         (inside #statsContainer)
 *   3. Stats version selector (inside #statsVersionSelector)
 *   4. JSON-LD structured data
 *
 * The rating widget is NOT pre-rendered — it hydrates client-side
 * via runner-detail.js + ratings.js so votes always work properly.
 *
 * First run bootstraps <!--PREBUILD:*--> markers automatically.
 * Subsequent runs use markers for idempotent replacement.
 *
 * Usage:  node build/prebuild-runners.js
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── Config ─────────────────────────────────────────────────
const API_URL      = 'https://runners.marathondb.gg/api/runners';
const ASSET_BASE   = 'https://helpbot.marathondb.gg/assets/runners';
const SITE_URL     = 'https://marathondb.gg';
const RUNNERS_DIR  = path.resolve(__dirname, '..', 'runners');
const RUNNER_SLUGS = ['assassin', 'destroyer', 'recon', 'rook', 'thief', 'triage', 'vandal'];

// ─── Stat definitions (mirrors runner-detail.js) ────────────
const STAT_CONFIGS = [
    { key: 'heat_capacity',      label: 'Heat Capacity' },
    { key: 'agility',            label: 'Agility' },
    { key: 'loot_speed',         label: 'Loot Speed' },
    { key: 'melee_damage',       label: 'Melee Damage' },
    { key: 'prime_recovery',     label: 'Prime Recovery' },
    { key: 'tactical_recovery',  label: 'Tactical Recovery' },
    { key: 'self_repair_speed',  label: 'Self Repair' },
    { key: 'finisher_siphon',    label: 'Finisher Siphon' },
    { key: 'revive_speed',       label: 'Revive Speed' },
    { key: 'hardware',           label: 'Hardware' },
    { key: 'firewall',           label: 'Firewall' },
    { key: 'fall_resistance',    label: 'Fall Resistance' },
    { key: 'ping_duration',      label: 'Ping Duration' }
];

// ─── Ability ordering (mirrors runner-detail.js) ────────────
const ABILITY_ORDER = ['tech', 'prime', 'tactical', 'trait_1', 'trait_2'];

const ABILITY_TYPE_LABELS = {
    tech: 'TECH', prime: 'PRIME', tactical: 'TACTICAL',
    trait_1: 'TRAIT', trait_2: 'TRAIT', trait1: 'TRAIT', trait2: 'TRAIT',
    passive: 'PASSIVE'
};

function getAbilityTypeKey(type) {
    const t = (type || '').toLowerCase();
    if (['tech', 'prime', 'tactical', 'passive'].includes(t)) return t;
    if (t.startsWith('trait')) return 'trait';
    return 'other';
}

// ─── Helpers ────────────────────────────────────────────────

function escapeHtml(text) {
    if (!text && text !== 0) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"//marathon/g, '&quot;')
        .replace(/'//marathon/g, '&#039;');
}

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { Accept: 'application/json' } }, res => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
            });
        }).on('error', reject);
    });
}

// ─── Marker-based replacement ───────────────────────────────

function replaceMarkerBlock(html, tag, newContent) {
    const re = new RegExp(
        `<!--PREBUILD:${tag}_START-->[\\s\\S]*?<!--PREBUILD:${tag}_END-->`, ''
    );
    if (!re.test(html)) return null;          // markers not found
    return html.replace(re,
        `<!--PREBUILD:${tag}_START-->\n${newContent}\n<!--PREBUILD:${tag}_END-->`
    );
}

// ─── Container-based replacement (bootstrap) ────────────────
// Finds <div id="containerId" ...> and replaces the inner HTML,
// injecting PREBUILD markers so future runs use the fast path.

function replaceContainerContent(html, containerId, newInnerHtml, tag) {
    const openTagRe = new RegExp(`(<div[^>]*\\bid="${containerId}"[^>]*>)`);
    const match = html.match(openTagRe);
    if (!match) {
        console.error(`  ⚠ Container #${containerId} not found`);
        return html;
    }

    const startIdx = match.index + match[0].length;

    // Walk forward, tracking <div …> / </div> nesting
    const divRe = /<(\/?)div[\s>]/gi;
    divRe.lastIndex = startIdx;
    let depth = 1;
    let endIdx = -1;
    let m;

    while ((m = divRe.exec(html)) !== null) {
        if (m[1] === '//marathon/') {               // closing tag
            depth--;
            if (depth === 0) { endIdx = m.index; break; }
        } else {                           // opening tag
            depth++;
        }
    }

    if (endIdx === -1) {
        console.error(`  ⚠ Could not find closing </div> for #${containerId}`);
        return html;
    }

    const before = html.substring(0, startIdx);
    const after  = html.substring(endIdx);
    return `${before}\n<!--PREBUILD:${tag}_START-->\n${newInnerHtml}\n<!--PREBUILD:${tag}_END-->\n${after}`;
}

// Try markers first, fall back to container bootstrap
function smartReplace(html, containerId, tag, newContent) {
    const result = replaceMarkerBlock(html, tag, newContent);
    if (result !== null) return result;

    console.log(`    ⚙ Bootstrapping markers for ${tag}...`);
    return replaceContainerContent(html, containerId, newContent, tag);
}

// ─── HTML Generators ────────────────────────────────────────

function buildAbilitiesHtml(runner) {
    const abilities = runner.abilities || [];
    if (!abilities.length) return '<p class="no-data">No abilities data</p>';

    const bolt = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"//marathon/></svg>';

    // Sort into canonical order, append extras
    const sorted = ABILITY_ORDER
        .map(type => abilities.find(a => a.ability_type === type))
        .filter(Boolean);
    abilities.forEach(a => { if (!sorted.includes(a)) sorted.push(a); });

    return sorted.map(ability => {
        const typeName = ABILITY_TYPE_LABELS[ability.ability_type]
            || (ability.ability_type || 'ABILITY').toUpperCase();
        const typeKey = getAbilityTypeKey(ability.ability_type);

        // Stat pills
        const pills = [];
        const cd = ability.cooldown_seconds ?? ability.cooldown;
        if (cd != null) pills.push(
            `<span class="ability-stat-pill ability-stat-pill--cooldown">`
            + `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"//marathon/><path d="M12 6v6l4 2"//marathon/></svg>`
            + `${cd}s CD</span>`
        );
        if (ability.duration != null) pills.push(
            `<span class="ability-stat-pill ability-stat-pill--duration">`
            + `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"//marathon/><line x1="16" y1="2" x2="16" y2="6"//marathon/><line x1="8" y1="2" x2="8" y2="6"//marathon/><line x1="3" y1="10" x2="21" y2="10"//marathon/></svg>`
            + `${ability.duration}s</span>`
        );
        if (ability.charges != null) pills.push(
            `<span class="ability-stat-pill ability-stat-pill--charges">`
            + `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"//marathon/><circle cx="12" cy="12" r="3"//marathon/></svg>`
            + `${ability.charges} charge${ability.charges !== 1 ? 's' : ''}</span>`
        );
        if (ability.range != null) pills.push(
            `<span class="ability-stat-pill ability-stat-pill--range">`
            + `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"//marathon/><path d="M21 21l-4.35-4.35"//marathon/></svg>`
            + `${ability.range}m</span>`
        );

        return `
                            <div class="ability-card ability-card--${typeKey}">
                                <div class="ability-header">
                                    <div class="ability-icon-wrap">
                                        ${bolt}
                                    </div>
                                    <div class="ability-header-text">
                                        <div class="ability-type ability-type--${typeKey}">${typeName}</div>
                                        <div class="ability-name">${escapeHtml(ability.name)}</div>
                                    </div>
                                </div>
                                ${ability.description ? `<div class="ability-desc">${escapeHtml(ability.description)}</div>` : ''}
                                ${pills.length ? `<div class="ability-stats">${pills.join('')}</div>` : ''}
                            </div>`;
    }).join('\n');
}

function buildStatsHtml(stats) {
    if (!stats) return '<p class="no-data">No stats available</p>';

    return STAT_CONFIGS.map(cfg => {
        const value = stats[cfg.key];
        if (value === null || value === undefined) return '';

        const pct = Math.max(0, Math.min(100, (value / 100) * 100));

        return `
                    <div class="stat-bar-row">
                        <div class="stat-bar-label">
                            <span>${cfg.label.toUpperCase()}</span>
                        </div>
                        <div class="stat-bar-track">
                            <div class="stat-bar-fill" style="width: ${pct}%"></div>
                        </div>
                        <div class="stat-bar-value">${value}</div>
                    </div>`;
    }).filter(Boolean).join('\n');
}

function buildStatsSelectorHtml(statsArray) {
    if (!statsArray || !statsArray.length) return '';

    return statsArray.map((item, i) => {
        const label = escapeHtml(
            item.season_name || item.patch_version || item.season_version || `Season ${i + 1}`
        );
        const active = i === 0 ? ' active' : '';
        return `<button class="stat-version-btn${active}" onclick="selectStatVersion(${i})">${label}</button>`;
    }).join('');
}

function buildStructuredData(runner) {
    const imageUrl = `${ASSET_BASE}/${runner.slug}-300x460.png`;

    const data = {
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        name: 'Marathon',
        url: `${SITE_URL}/runners/${runner.slug}/`,
        description: `${runner.name} runner guide for Marathon — stats, abilities, skins, loadouts, and cores.`,
        image: imageUrl,
        publisher: { '@type': 'Organization', name: 'Bungie' },
        character: {
            '@type': 'Thing',
            name: runner.name,
            description: runner.description || `${runner.name} runner class in Marathon`
        }
    };

    // Add aggregate rating if available
    if (runner.average_rating && runner.rating_count) {
        data.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: runner.average_rating,
            bestRating: '5',
            worstRating: '1',
            ratingCount: runner.rating_count
        };
    }

    return JSON.stringify(data, null, 2);
}

// ─── SEO noscript fallback for abilities ────────────────────

function buildNoscriptAbilities(runner) {
    const abilities = runner.abilities || [];
    if (!abilities.length) return '';

    const items = abilities.map(a =>
        `        <li><strong>${escapeHtml(a.name)}</strong> (${escapeHtml(a.ability_type || 'ability')}) — ${escapeHtml(a.description || '')}</li>`
    );

    return `    <noscript>
    <div class="seo-abilities-list">
        <h2>${escapeHtml(runner.name)} Abilities</h2>
        <ul>\n${items.join('\n')}\n        </ul>
    </div>
    </noscript>`;
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
    console.log('\n🏃 Prebuilding Runner Detail Pages...\n');

    let updated = 0;

    for (const slug of RUNNER_SLUGS) {
        const htmlPath = path.join(RUNNERS_DIR, slug, 'index.html');

        if (!fs.existsSync(htmlPath)) {
            console.log(`  ⚠ Skipping ${slug} — ${htmlPath} not found`);
            continue;
        }

        // Fetch individual runner data (includes abilities + stats)
        console.log(`  Fetching ${slug}...`);
        let runner;
        try {
            const response = await fetchJSON(`${API_URL}/${slug}`);
            if (!response?.success || !response?.data) {
                console.log(`  ⚠ Skipping ${slug} — API returned no data`);
                continue;
            }
            runner = response.data;
        } catch (err) {
            console.log(`  ⚠ Skipping ${slug} — API error: ${err.message}`);
            continue;
        }

        console.log(`  📄 ${runner.name} (${slug})`);
        let html = fs.readFileSync(htmlPath, 'utf8');

        // ── Abilities ──
        const abilitiesHtml = buildAbilitiesHtml(runner);
        html = smartReplace(html, 'abilitiesList', 'ABILITIES', abilitiesHtml);

        // ── Stats (default to first entry = latest season) ──
        const statsArray = runner.stats || [];
        const defaultStats = statsArray.length > 0 ? statsArray[0] : null;

        if (defaultStats) {
            const statsHtml = buildStatsHtml(defaultStats);
            html = smartReplace(html, 'statsContainer', 'STATS', statsHtml);

            const selectorHtml = buildStatsSelectorHtml(statsArray);
            html = smartReplace(html, 'statsVersionSelector', 'STATS_SELECTOR', selectorHtml);
        }

        // ── Structured Data ──
        const structuredJson = buildStructuredData(runner);
        const sdBlock = `    <script type="application/ld+json">\n${structuredJson}\n    </script>`;
        const sdResult = replaceMarkerBlock(html, 'STRUCTURED_DATA', sdBlock);
        if (sdResult !== null) {
            html = sdResult;
        } else {
            // Bootstrap: wrap existing JSON-LD with markers
            html = html.replace(
                /[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>/,
                `<!--PREBUILD:STRUCTURED_DATA_START-->\n${sdBlock}\n<!--PREBUILD:STRUCTURED_DATA_END-->`
            );
        }

        // ── Write ──
        fs.writeFileSync(htmlPath, html, 'utf8');
        updated++;

        const abilCount = runner.abilities?.length || 0;
        const statCount = defaultStats
            ? STAT_CONFIGS.filter(c => defaultStats[c.key] != null).length
            : 0;
        console.log(`    ✅ ${abilCount} abilities, ${statCount} stats, structured data updated`);
    }

    console.log(`\n✅ Prebuild complete — ${updated}/${RUNNER_SLUGS.length} runner pages updated`);
    console.log('   Votes/ratings are unaffected (client-side hydration)\n');
}

main().catch(err => {
    console.error('\n❌ Prebuild failed:', err.message);
    process.exit(1);
});
