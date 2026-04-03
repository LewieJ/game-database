/**
 * ssg-weapon-skins.js
 * Emits thin redirect stubs for legacy /weapon-skins/{slug}/ URLs.
 * Skins are viewed in-modal on /marathon/weapon-skins/?skin={slug} (and per-weapon listings).
 *
 * Usage:
 *   node build/ssg-weapon-skins.js            — full run (all skins)
 *   node build/ssg-weapon-skins.js --test     — process one skin only
 *   node build/ssg-weapon-skins.js --dry-run
 *   node build/ssg-weapon-skins.js --slug=X   — single slug
 *
 * API: https://weaponskins.marathondb.gg
 */

'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const API_BASE   = 'https://weaponskins.marathondb.gg';
const { MARATHON_SITE_URL: SITE_URL } = require('./seo-config');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'weapon-skins');

const IS_TEST    = process.argv.includes('--test');
const IS_DRYRUN  = process.argv.includes('--dry-run');
const SLUG_ARG   = (process.argv.find(a => a.startsWith('--slug=')) || '').replace('--slug=', '') || null;
const SKIP_SLUGS = new Set([]);

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        proto.get(url, { headers: { 'User-Agent': 'marathondb-ssg-weapon-skins/2.0' } }, (res) => {
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

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchAllSkins() {
    let page = 1;
    let collected = [];
    let totalPages = 1;
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

/**
 * Legacy detail URL → listing with modal deep link (matches cosmetics-weapons.js).
 */
function generateWeaponSkinRedirectPage(slug) {
    const dest = `/marathon/weapon-skins/?skin=${encodeURIComponent(slug)}`;
    const safe = escapeHtml(slug);
    const canon = `${SITE_URL}/weapon-skins/?skin=${encodeURIComponent(slug)}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>${safe} — Weapon skin</title>
    <link rel="canonical" href="${canon}">
    <meta http-equiv="refresh" content="0;url=${dest}">
    <script>location.replace(${JSON.stringify(dest)});</script>
</head>
<body>
    <p>Opening this skin in the catalog… <a href="${dest}">Continue</a></p>
</body>
</html>`;
}

async function main() {
    console.log('\n  ═══ Weapon Skins SSG (redirect stubs) ═══\n');
    console.log(`  API:     ${API_BASE}`);
    console.log(`  Output:  ${OUTPUT_DIR}`);
    console.log(`  Mode:    ${IS_DRYRUN ? 'DRY RUN' : IS_TEST ? 'TEST (1 page)' : SLUG_ARG ? 'Single: ' + SLUG_ARG : 'FULL RUN'}\n`);

    const startTime = Date.now();
    let allSkins;

    try {
        allSkins = await fetchAllSkins();
        console.log(`  ✓ Fetched ${allSkins.length} weapon skins from API\n`);
    } catch (err) {
        console.error('  ✗ Failed to fetch weapon skins:', err.message);
        process.exit(1);
    }

    let toProcess;
    if (SLUG_ARG) {
        toProcess = allSkins.filter(s => s.slug === SLUG_ARG);
        if (toProcess.length === 0) {
            console.error(`  ✗ Slug "${SLUG_ARG}" not found in API`);
            process.exit(1);
        }
    } else if (IS_TEST) {
        toProcess = [allSkins.find(s => !SKIP_SLUGS.has(s.slug)) || allSkins[0]];
    } else {
        toProcess = allSkins;
    }

    console.log(`  Processing ${toProcess.length} skin path(s)...\n`);

    let successes = 0;
    let failures  = 0;
    let skipped   = 0;

    for (let i = 0; i < toProcess.length; i++) {
        const skinListItem = toProcess[i];
        const slug = skinListItem.slug;

        if (SKIP_SLUGS.has(slug) && !SLUG_ARG) {
            console.log(`  — ${slug} (skipped)`);
            skipped++;
            continue;
        }

        try {
            const html = generateWeaponSkinRedirectPage(slug);
            const outPath = path.join(OUTPUT_DIR, slug, 'index.html');

            if (IS_DRYRUN) {
                console.log(`  [DRY RUN] ${outPath} (${html.length} bytes)`);
            } else {
                writeFile(outPath, html);
                console.log(`  ✓ ${slug}/ (${(html.length / 1024).toFixed(1)} KB)`);
            }
            successes++;
        } catch (err) {
            console.error(`  ✗ ${slug}: ${err.message}`);
            failures++;
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  ── Done in ${elapsed}s ──`);
    console.log(`  ✓ ${successes} built  |  — ${skipped} skipped  |  ✗ ${failures} failed\n`);

    if (failures > 0) process.exit(1);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
