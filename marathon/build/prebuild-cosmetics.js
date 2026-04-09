#!/usr/bin/env node
/**
 * prebuild-cosmetics.js
 * ---------------------
 * Fetches all cosmetics listing data at build time and writes prefetch.json
 * files for each page so the browser never needs to call the live API.
 *
 * Pages covered:
 *   /marathon/stickers/      ← weaponstickers.marathondb.gg/api/stickers
 *   /marathon/backgrounds/   ← backgrounds.marathondb.gg/api/backgrounds
 *   /marathon/charms/        ← helpbot.marathondb.gg/cosmetics/charms
 *   /marathon/emblems/       ← emblems.marathondb.gg/api/emblems
 *   /marathon/weapon-skins/  ← weaponskins.marathondb.gg/api/skins  (paginated)
 *
 * Usage:  node build/prebuild-cosmetics.js
 *         node build/prebuild-cosmetics.js --only=stickers,charms
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ─── Config ─────────────────────────────────────────────────────────────────

const MARATHON_DIR = path.resolve(__dirname, '..');

const TARGETS = {
    stickers: {
        label:   'Stickers',
        outDir:  path.join(MARATHON_DIR, 'stickers'),
        fetch:   () => fetchSimple('https://weaponstickers.marathondb.gg/api/stickers', d => d.data),
    },
    backgrounds: {
        label:   'Backgrounds',
        outDir:  path.join(MARATHON_DIR, 'backgrounds'),
        fetch:   () => fetchSimple('https://backgrounds.marathondb.gg/api/backgrounds', d => d.data),
    },
    emblems: {
        label:   'Emblems',
        outDir:  path.join(MARATHON_DIR, 'emblems'),
        fetch:   () => fetchSimple('https://emblems.marathondb.gg/api/emblems', d => d.data),
    },
    'weapon-skins': {
        label:   'Weapon Skins',
        outDir:  path.join(MARATHON_DIR, 'weapon-skins'),
        fetch:   fetchAllWeaponSkins,
    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : require('http');
        proto.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'marathondb-prebuild-cosmetics/1.0' } }, (res) => {
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

async function fetchSimple(url, extract) {
    const json = await fetchJSON(url);
    const data = extract(json);
    if (!Array.isArray(data)) throw new Error(`Expected array from ${url}, got: ${JSON.stringify(data).slice(0, 80)}`);
    return data;
}

async function fetchAllWeaponSkins() {
    const BASE = 'https://weaponskins.marathondb.gg';
    let page = 1, totalPages = 1;
    let collected = [];
    do {
        const url = `${BASE}/api/skins?page=${page}&per_page=100`;
        console.log(`    Fetching weapon-skins page ${page}...`);
        const json = await fetchJSON(url);
        if (!json.data) throw new Error('Skins API returned no data');
        collected = collected.concat(json.data);
        totalPages = json.total_pages || 1;
        page++;
    } while (page <= totalPages);
    return collected;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n  ═══ Cosmetics Prebuild (prefetch.json) ═══\n');

    // Parse --only=x,y,z flag
    const onlyArg = process.argv.find(a => a.startsWith('--only='));
    const onlySet = onlyArg
        ? new Set(onlyArg.replace('--only=', '').split(',').map(s => s.trim()))
        : null;

    const keys = onlySet
        ? Object.keys(TARGETS).filter(k => onlySet.has(k))
        : Object.keys(TARGETS);

    if (keys.length === 0) {
        console.error('  ✗ No valid targets. Valid: ' + Object.keys(TARGETS).join(', '));
        process.exit(1);
    }

    let anyFailed = false;

    for (const key of keys) {
        const target = TARGETS[key];
        console.log(`  ▸ ${target.label}…`);

        try {
            const data = await target.fetch();
            if (!data.length) {
                console.warn(`    ⚠ No items returned — skipping write`);
                continue;
            }

            const outPath = path.join(target.outDir, 'prefetch.json');
            fs.mkdirSync(target.outDir, { recursive: true });
            fs.writeFileSync(outPath, JSON.stringify(data), 'utf8');

            const kb = (Buffer.byteLength(JSON.stringify(data)) / 1024).toFixed(1);
            console.log(`    ✓ ${data.length} items  →  ${path.relative(MARATHON_DIR, outPath)}  (${kb} KB)\n`);
        } catch (err) {
            console.error(`    ✗ ${target.label} failed: ${err.message}\n`);
            anyFailed = true;
        }
    }

    if (anyFailed) {
        console.error('  ✗ One or more targets failed.\n');
        process.exit(1);
    }

    console.log('  ✓ Cosmetics prefetch.json files written.\n');
}

main().catch(err => {
    console.error('\n✗ Fatal:', err.message);
    process.exit(1);
});
