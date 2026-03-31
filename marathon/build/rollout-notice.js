/**
 * Rolls out the dismissible feedback notice banner to all index.html pages.
 * Inserts as the first child of <main ...> on every page.
 * Skips pages that already have the banner (idempotent).
 *
 * Usage: node build/rollout-notice.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const BANNER_HTML = `
        <!-- Feedback Notice Banner -->
        <div class="site-notice" id="siteNoticeBanner">
            <div class="site-notice-inner">
                <span class="site-notice-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"//marathon/></svg>
                </span>
                <p class="site-notice-text">
                    <strong>Feedback Time!</strong> If you have any feedback — positive or negative — you can
                    <a href="https://discord.gg/marathondb" target="_blank" rel="noopener">join our Discord</a> or
                    <button type="button" class="site-notice-link" onclick="document.getElementById('feedbackNavBtn')?.click()">submit a ticket here</button>.
                    We're working on some major updates now Marathon is mid-season. We're listening, we're learning. Thank you!
                </p>
                <button class="site-notice-dismiss" id="siteNoticeDismiss" title="Dismiss" aria-label="Dismiss notice">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 6L6 18M6 6l12 12"//marathon/></svg>
                </button>
            </div>
        </div>
        <script>
        (function() {
            var key = 'mdb_notice_dismissed_v1';
            var banner = document.getElementById('siteNoticeBanner');
            if (!banner) return;
            if (localStorage.getItem(key)) { banner.remove(); return; }
            banner.style.display = 'block';
            document.getElementById('siteNoticeDismiss')?.addEventListener('click', function() {
                banner.style.display = 'none';
                localStorage.setItem(key, '1');
            });
        })();
        </script>`;

// Recursively find all index.html files
function findHtmlFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // Skip node_modules, .git, build, docs, functions, discord-bot, assets
            if (['node_modules', '.git', 'build', 'docs', 'functions', 'discord-bot', 'assets'].includes(entry.name)) continue;
            results.push(...findHtmlFiles(full));
        } else if (entry.name === 'index.html') {
            results.push(full);
        }
    }
    return results;
}

const files = findHtmlFiles(ROOT);
let injected = 0;
let skipped = 0;
let noMain = 0;

for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');

    // Skip if already has the banner
    if (html.includes('id="siteNoticeBanner"')) {
        skipped++;
        continue;
    }

    // Find the <main ...> opening tag and inject banner after it
    const mainTagRegex = /(<main\b[^>]*>)/;
    const match = html.match(mainTagRegex);
    if (!match) {
        const rel = path.relative(ROOT, file);
        console.log(`  SKIP (no <main>): ${rel}`);
        noMain++;
        continue;
    }

    const idx = html.indexOf(match[0]);
    const insertPoint = idx + match[0].length;
    html = html.slice(0, insertPoint) + '\n' + BANNER_HTML + html.slice(insertPoint);

    fs.writeFileSync(file, html, 'utf8');
    injected++;
}

console.log(`\nNotice banner rollout complete:`);
console.log(`  Injected: ${injected}`);
console.log(`  Already had banner: ${skipped}`);
console.log(`  No <main> tag: ${noMain}`);
console.log(`  Total files scanned: ${files.length}`);
