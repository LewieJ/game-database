/**
 * Rollout Navbar — Replaces the desktop <nav> on all pages with the latest version
 * from shared-nav.js, preserving each page's active section.
 *
 * Usage: node build/rollout-navbar.js
 */
const fs = require('fs');
const path = require('path');
const { generateNavigation } = require('./shared-nav');

const ROOT = path.resolve(__dirname, '..');

// Recursively find all index.html files (skip root homepage)
function findPages(dir, results = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            findPages(full, results);
        } else if (entry.name === 'index.html' && full !== path.join(ROOT, 'index.html')) {
            results.push(full);
        }
    }
    return results;
}

// Detect what active section the old navbar has
function detectActiveSection(html) {
    // Check for nav-link active
    const linkMatch = html.match(/class="nav-link(?:\s+nav-db-link)?\s+active">(\w+)/);
    if (linkMatch) {
        const text = linkMatch[1].toLowerCase();
        const map = {
            weapons: 'weapons', runners: 'runners', cores: 'cores',
            implants: 'implants', mods: 'mods', items: 'items',
            factions: 'factions',
        };
        if (map[text]) return map[text];
        if (text === 'tier') return 'tier-lists';
    }
    // Check cosmetics dropdown active
    if (html.match(/nav-dropdown-toggle--cosmetics\s+active/)) {
        // Check specific sub-item
        const subMatch = html.match(/nav-dropdown-item\s+active">\s*(?:<svg[^>]*>[\s\S]*?<\/svg>\s*)?(\w[\w\s-]*)/);
        if (subMatch) {
            const sub = subMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
            return sub; // weapon-skins, runner-skins, stickers, backgrounds, charms, emblems
        }
        return 'cosmetics';
    }
    // Check for active in More dropdown items (href comes before class in generated HTML)
    const moreMatch = html.match(/href="\/([^/"]+)\/"[^>]*?class="nav-dropdown-item(?:\s+active|--active)"//marathon/);
    if (moreMatch) {
        const slug = moreMatch[1];
        if (slug === 'loadout-builder') return 'loadouts';
        if (slug === 'tier-lists') return 'tier-lists';
        if (slug === 'news') return 'news';
        if (slug === 'servers') return 'servers';
    }
    return '';
}

// Regex to match the <!-- Navigation --> comment + <nav>...</nav> block
const NAV_RE = /[ \t]*<!-- Navigation -->\s*<nav class="navbar[^"]*">[\s\S]*?<\/nav>/;

const pages = findPages(ROOT);
let updated = 0, skipped = 0, noNav = 0;

for (const filePath of pages) {
    const html = fs.readFileSync(filePath, 'utf8');
    const navMatch = html.match(NAV_RE);
    if (!navMatch) { noNav++; continue; }

    const activeSection = detectActiveSection(navMatch[0]);
    const newNav = generateNavigation(activeSection).replace(/^\n/, '');
    const updated_html = html.replace(NAV_RE, newNav);

    if (updated_html === html) {
        skipped++;
    } else {
        fs.writeFileSync(filePath, updated_html, 'utf8');
        updated++;
        const rel = path.relative(ROOT, filePath).replace(/\\/g, '//marathon/');
        console.log(`  ✓ ${rel} (active: ${activeSection || 'none'})`);
    }
}

console.log(`\nDone: ${updated} updated, ${skipped} already current, ${noNav} no navbar found`);
