/**
 * Rebuilds the static SEO mod links on a weapon detail page.
 * Fetches compatible mods from the mods API and regenerates the
 * .seo-mod-links block in the weapon's index.html.
 *
 * Usage: node build/prebuild-weapon-mods.js <weapon-slug>
 *   e.g. node build/prebuild-weapon-mods.js v11-punch
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODS_API_BASE = 'https://mods.marathondb.gg';

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
            });
        }).on('error', reject);
    });
}

async function main() {
    const weaponSlug = process.argv[2];
    if (!weaponSlug) {
        console.error('Usage: node build/prebuild-weapon-mods.js <weapon-slug>');
        process.exit(1);
    }

    console.log(`\n🔧 Rebuilding weapon mod links for: ${weaponSlug}\n`);

    // Fetch compatible mods via per-weapon endpoint
    const url = `${MODS_API_BASE}/api/weapons/${encodeURIComponent(weaponSlug)}/mods`;
    console.log(`  Fetching ${url} ...`);
    const data = await fetchJSON(url);

    if (!data.success) throw new Error('API error: ' + JSON.stringify(data).slice(0, 200));

    // Flatten all mods from slots + unslotted, deduplicated
    const allMods = [];
    const seen = new Set();
    for (const slot of (data.data.slots || [])) {
        for (const mod of (slot.mods || [])) {
            if (!seen.has(mod.slug)) { seen.add(mod.slug); allMods.push(mod); }
        }
    }
    for (const mod of (data.data.unslotted_mods || [])) {
        if (!seen.has(mod.slug)) { seen.add(mod.slug); allMods.push(mod); }
    }

    console.log(`  ✅ ${allMods.length} compatible mods found`);
    allMods.forEach(m => console.log(`     - ${m.slug} | ${m.name}`));

    // Build replacement HTML
    const indent = '                                    ';
    const linksHtml = allMods
        .map(m => `${indent}<a href="//marathon/mods/?mod=${m.slug}" class="mod-tag clickable">${m.name}</a>`)
        .join('\n');

    // Read the weapon's index.html
    const htmlPath = path.join(__dirname, '..', 'weapons', weaponSlug, 'index.html');
    if (!fs.existsSync(htmlPath)) throw new Error(`File not found: ${htmlPath}`);

    let html = fs.readFileSync(htmlPath, 'utf8');

    // Replace the seo-mod-links block
    const SEO_START = '<div class="seo-mod-links">';
    const SEO_END_MARKER = '</div></div>';
    const startIdx = html.indexOf(SEO_START);
    const endIdx = html.indexOf(SEO_END_MARKER, startIdx);

    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Could not find .seo-mod-links block in ' + htmlPath);
    }

    const newBlock = `${SEO_START}\n${linksHtml}\n                                </div>\n                            </div>`;
    html = html.slice(0, startIdx) + newBlock + html.slice(endIdx + SEO_END_MARKER.length);

    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`\n✅ Updated weapons/${weaponSlug}/index.html with ${allMods.length} mod links\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
