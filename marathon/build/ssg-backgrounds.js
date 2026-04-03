/**
 * ssg-backgrounds.js
 * Standalone SSG for Marathon Background detail pages.
 *
 * Generates: backgrounds/{slug}/index.html for every background in the API.
 *
 * Usage:
 *   node build/ssg-backgrounds.js            — full run (all backgrounds)
 *   node build/ssg-backgrounds.js --test     — process one background only (safe test)
 *   node build/ssg-backgrounds.js --dry-run  — log actions, write nothing
 *   node build/ssg-backgrounds.js --slug=X   — build a single background by slug
 *
 * API:   https://backgrounds.marathondb.gg
 * CDN:   https://helpbot.marathondb.gg/
 * Docs:  BACKGROUNDS_FRONTEND_GUIDE.md
 */

'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { generateNavigation: _sharedNav } = require('./shared-nav');
const { generateFooter } = require('./site-footer');

// ─── Configuration ──────────────────────────────────────────────────────────

const BG_API     = 'https://backgrounds.marathondb.gg';
const BG_CDN     = 'https://helpbot.marathondb.gg/';
const { MARATHON_SITE_URL: SITE_URL } = require('./seo-config');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'backgrounds');

const IS_TEST    = process.argv.includes('--test');
const IS_DRYRUN  = process.argv.includes('--dry-run');
const SLUG_ARG   = (process.argv.find(a => a.startsWith('--slug=')) || '').replace('--slug=', '') || null;

// ─── Colour Maps ────────────────────────────────────────────────────────────

const RARITY_COLOURS = {
    common:    '#95a5a6',
    uncommon:  '#2ecc71',
    rare:      '#3498db',
    epic:      '#9b59b6',
    legendary: '#f39c12'
};

const SOURCE_LABELS = {
    free:       'Free',
    codex:      'Codex Reward',
    battlepass: 'Battle Pass',
    store:      'Store',
    event:      'Limited Event',
    unknown:    'Unknown'
};

const SOURCE_COLOURS = {
    free:       '#2ecc71',
    codex:      '#00d4ff',
    battlepass: '#f39c12',
    event:      '#9b59b6',
    store:      '#3498db',
    unknown:    '#6b6b75'
};

const FACTION_COLOURS = {
    cyberacme: '#01d838',
    nucaloric: '#ff125d',
    traxus:    '#ff7300',
    vesper:    '#a855f7',
    arachne:   '#00d4ff',
    volantis:  '#facc15'
};

// ─── HTTP helpers ─────────────────────────────────────────────────────────

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        proto.get(url, { headers: { 'User-Agent': 'marathondb-ssg-backgrounds/1.0' } }, (res) => {
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

// ─── Filesystem helpers ───────────────────────────────────────────────────

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
}

// ─── Text helpers ─────────────────────────────────────────────────────────

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function resolveImage(imgPath) {
    if (!imgPath) return '';
    if (imgPath.startsWith('http')) return imgPath;
    return BG_CDN + imgPath;
}

// ─── API helpers ──────────────────────────────────────────────────────────

/** Fetch all backgrounds. Returns array. */
async function fetchAllBackgrounds() {
    const bust = Date.now();
    const url = `${BG_API}/api/backgrounds?_nocache=${bust}`;
    console.log(`  Fetching all backgrounds: ${url}`);
    const json = await fetchJSON(url);
    if (!json.data) throw new Error('Backgrounds API returned no data');
    return json.data;
}

/** Fetch full detail for one background. Returns data object or null. */
async function fetchBackgroundDetail(slug) {
    const url = `${BG_API}/api/backgrounds/${slug}?_nocache=${Date.now()}`;
    const json = await fetchJSON(url);
    if (!json.data) return null;
    return json.data;
}
// Navigation HTML — imported from shared-nav.js
function generateNavigation() {
    return _sharedNav('backgrounds');
}

// Footer: generateFooter from site-footer.js

// ─── Page Template ────────────────────────────────────────────────────────

/**
 * Generate the full HTML for one background detail page.
 *
 * @param {object}   bg       - Full detail from GET /api/backgrounds/:slug
 * @param {object[]} allBgs   - Full listing for prev/next nav & related items
 */
function generateBackgroundPage(bg, allBgs) {
    const slug = bg.slug;
    const name = bg.name || slug;
    const rarity = bg.rarity || 'common';
    const canonicalUrl = `${SITE_URL}/backgrounds/${slug}/`;

    // Build-time image URLs
    const fullImg    = resolveImage(bg.image_url);
    const previewImg = resolveImage(bg.image_preview_url) || fullImg;
    const ogImage    = previewImg || `https://gdb.gg/assets/icons/marathon.svg`;

    // SEO
    const metaDesc = bg.acquisition_summary
        ? `${capitalize(rarity)} background \u00b7 ${bg.acquisition_summary}`
        : bg.description || `${name} profile background in Marathon`;
    const metaTitle = `${escapeHtml(name)} \u2014 Background | MarathonDB`;
    const keywords  = [name, 'Marathon background', 'Marathon profile backgrounds', capitalize(rarity) + ' background', 'Bungie Marathon cosmetics', bg.faction_name || ''].filter(Boolean).map(escapeHtml).join(', ');

    // Structured data
    const ratingBlock = (bg.ratings && bg.ratings.total_votes > 0)
        ? `,"aggregateRating":{"@type":"AggregateRating","ratingValue":"${(bg.ratings.score_percent / 20).toFixed(1)}","bestRating":"5","worstRating":"1","ratingCount":${bg.ratings.total_votes}}`
        : '';

    // Build detail rows
    const detailRowsHtml = buildDetailRows(bg);
    const storeRowsHtml  = buildStoreRows(bg);
    const hasStoreData   = storeRowsHtml.length > 0;

    // Badges
    const rarityBadgeHtml = `<span class="bd-rarity-badge" style="background:${RARITY_COLOURS[rarity] || '#6b6b75'}">${capitalize(rarity)}</span>`;
    const sourceBadgeHtml = bg.source_type && bg.source_type !== 'unknown'
        ? `<span class="bd-tag" style="background:${SOURCE_COLOURS[bg.source_type] || '#6b6b75'}">${escapeHtml(SOURCE_LABELS[bg.source_type] || capitalize(bg.source_type))}</span>`
        : '';
    const factionBadgeHtml = bg.faction_name && bg.faction_slug
        ? `<span class="bd-tag" style="background:${FACTION_COLOURS[bg.faction_slug] || '#6b6b75'}">${escapeHtml(bg.faction_name)}</span>`
        : '';
    const legacyBadgeHtml = !bg.is_obtainable
        ? '<span class="bd-tag bd-tag-limited">Legacy</span>'
        : '';

    // Acquisition
    const acqText = bg.acquisition_summary || bg.acquisition_detail || '';
    const acqHtml = acqText ? `
                    <div class="bd-acquisition bd-acquisition--hero">
                        <div class="bd-acquisition-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </div>
                        <div class="bd-acquisition-content">
                            <span class="bd-acquisition-label">How to unlock ${escapeHtml(name)}</span>
                            <p class="bd-acquisition-text">${escapeHtml(acqText)}</p>
                        </div>
                    </div>` : '';

    // Description / Flavor
    const descHtml = bg.description ? `<p class="bd-description">${escapeHtml(bg.description)}</p>` : '';
    const flavorHtml = bg.flavor_text ? `<p class="bd-flavor-text">&ldquo;${escapeHtml(bg.flavor_text)}&rdquo;</p>` : '';

    // Related backgrounds (same faction or rarity, max 4, exclude self) — baked at build time
    const relatedPool = bg.faction_id
        ? allBgs.filter(b => b.faction_id === bg.faction_id && b.slug !== slug)
        : allBgs.filter(b => b.rarity === rarity && b.slug !== slug);
    const related = relatedPool.slice(0, 4);
    const relatedHtml = related.length > 0 ? buildRelatedSection(related) : '';

    // Prev / Next nav — removed for cleaner design

    return `<!DOCTYPE html>
<html lang="en">
<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metaTitle}</title>
    <meta name="description" content="${escapeHtml(metaDesc)}">
    <meta name="keywords" content="${keywords}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="MARATHON DB">
    <link rel="icon" type="image/svg+xml" href="/assets/icons/marathon.svg">
    <link rel="apple-touch-icon" href="/assets/icons/marathon.svg">
    <link rel="canonical" href="${canonicalUrl}">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${metaTitle}">
    <meta property="og:description" content="${escapeHtml(metaDesc)}">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta property="og:site_name" content="MarathonDB">
    <meta property="og:locale" content="en_US">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@MarathonDB">
    <meta name="twitter:title" content="${metaTitle}">
    <meta name="twitter:description" content="${escapeHtml(metaDesc)}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">

    <link rel="stylesheet" href="/marathon/css/style.css">
    <link rel="stylesheet" href="/marathon/css/pages.css">
    <link rel="stylesheet" href="/marathon/css/auth.css">

    <!-- Structured Data -->
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Thing",
  "name": "${escapeHtml(name)} \u2014 Marathon Background",
  "description": "${escapeHtml(metaDesc)}",
  "url": "${canonicalUrl}",
  "image": "${escapeHtml(ogImage)}"${ratingBlock}
}
    </script>
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
    { "@type": "ListItem", "position": 2, "name": "Backgrounds", "item": `${SITE_URL}/backgrounds/` },
    { "@type": "ListItem", "position": 3, "name": "${escapeHtml(name)}", "item": "${canonicalUrl}" }
  ]
}
    </script>
</head>
<body>

${generateNavigation()}

    <main class="bd-page">
    <div class="ad-page-wrapper">

        <!-- Left Siderail Ad -->
        <aside class="ad-siderail ad-siderail--left">
            <div class="ad-siderail-sticky">
                <span class="ad-label">Ad</span>
                <div class="ad-container">
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <div class="bd-page-content">

        <!-- Hero Section (baked at build time) -->
        <section class="bd-hero" data-rarity="${rarity}">
            <div class="bd-hero-bg"></div>
            <div class="bd-hero-inner">

                <!-- Left: 2:3 Portrait Preview -->
                <div class="bd-hero-preview">
                    <div class="bd-preview-frame bd-preview-frame--portrait" id="previewBox" data-rarity="${rarity}">
                        <img id="cosmeticImage" src="${escapeHtml(previewImg)}" alt="${escapeHtml(name)}" width="800" height="1200" style="aspect-ratio:2/3; object-fit:cover;" data-full="${escapeHtml(fullImg)}">
                        <button class="bd-preview-expand" id="fullscreenBtn" title="View full image">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Right: Info column -->
                <div class="bd-hero-info">
                    <nav class="breadcrumb bd-breadcrumb">
                        <a href="/marathon/">Home</a> /
                        <a href="/marathon/backgrounds/">Backgrounds</a> /
                        <span>${escapeHtml(name)}</span>
                    </nav>

                    <div class="bd-title-block">
                        <h1 class="bd-skin-name">${escapeHtml(name)}</h1>
                        <div class="bd-subtitle-row">
                            ${rarityBadgeHtml}
                            ${sourceBadgeHtml}
                            ${factionBadgeHtml}
                            ${legacyBadgeHtml}

                            <span class="bd-subtitle-sep"></span>

                            <button id="shareTwitter" class="bd-action-btn" title="Share on X">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </button>
                            <button id="shareDiscord" class="bd-action-btn" title="Copy for Discord">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                            </button>
                            <button id="shareCopy" class="bd-action-btn" title="Copy link">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Share Toast -->
                    <div id="rsdShareToast" class="bd-share-toast" aria-live="polite"></div>

                    ${acqHtml}

                    <!-- Community Rating -->
                    <div class="bd-rating-hero bd-rating-compact">
                        <div id="cosmeticHeatWidget" data-cosmetic-type="background" data-cosmetic-slug="${escapeHtml(slug)}" data-cosmetic-name="${escapeHtml(name)}"></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Info Body -->
        <div class="bd-body">
            <div class="bd-cards-grid">

                <!-- Details Card -->
                <div class="bd-card">
                    <h3 class="bd-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                        Details
                    </h3>
                    <div class="bd-card-rows">
${detailRowsHtml}
                    </div>
                </div>

                <!-- Store & Pricing Card -->
${hasStoreData ? `                <div class="bd-card">
                    <h3 class="bd-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                        Store &amp; Pricing
                    </h3>
                    <div class="bd-card-rows">
${storeRowsHtml}
                    </div>
                </div>` : ''}

            </div>

${relatedHtml}

            <!-- Ad -->

        </div><!-- /bd-body -->

        </div><!-- /bd-page-content -->

        <!-- Right Siderail Ad -->
        <aside class="ad-siderail ad-siderail--right">
            <div class="ad-siderail-sticky">
                <span class="ad-label">Ad</span>
                <div class="ad-container">
                </div>
            </div>
        </aside>

    </div><!-- /ad-page-wrapper -->
    </main>

${generateFooter()}

    <!-- Runtime JS: share buttons, lightbox, rating widget -->
    <script src="/marathon/js/search.js"></script>
    <script src="/marathon/js/cosmetic-ratings.js"></script>
    <script>
    (function(){
        // ─── Share buttons ───
        var NAME = ${JSON.stringify(name)};
        var RARITY = ${JSON.stringify(capitalize(rarity))};
        var pageUrl = window.location.href;
        var toastEl = document.getElementById('rsdShareToast');

        function showToast(msg, cls) {
            if (!toastEl) return;
            toastEl.textContent = msg;
            toastEl.className = 'bd-share-toast ' + (cls||'') + ' active';
            setTimeout(function(){ toastEl.classList.remove('active'); }, 2500);
        }

        document.getElementById('shareTwitter')?.addEventListener('click', function() {
            var text = encodeURIComponent(NAME + ' \\u2014 ' + RARITY + ' Background on MarathonDB');
            window.open('https://x.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(pageUrl), '_blank', 'width=550,height=420');
        });
        document.getElementById('shareDiscord')?.addEventListener('click', async function() {
            try {
                await navigator.clipboard.writeText('**' + NAME + '** \\u2014 ' + RARITY + ' Profile Background\\n' + pageUrl);
                showToast('Discord text copied!', 'toast-discord');
            } catch(e) { console.error('Copy failed', e); }
        });
        document.getElementById('shareCopy')?.addEventListener('click', async function() {
            try {
                await navigator.clipboard.writeText(pageUrl);
                showToast('Link copied to clipboard!', 'toast-copy');
            } catch(e) { console.error('Copy failed', e); }
        });

        // ─── Lightbox ───
        function openLightbox(src) {
            var overlay = document.createElement('div');
            overlay.className = 'ws-lightbox-overlay';
            overlay.innerHTML = '<div class="ws-lightbox-content"><img src="' + src + '" alt="Full size preview"><button class="ws-lightbox-close">&times;</button></div>';
            document.body.appendChild(overlay);
            requestAnimationFrame(function(){ overlay.classList.add('active'); });
            overlay.addEventListener('click', function(ev) {
                if (ev.target === overlay || ev.target.classList.contains('ws-lightbox-close')) {
                    overlay.classList.remove('active');
                    setTimeout(function(){ overlay.remove(); }, 200);
                }
            });
        }

        var img = document.getElementById('cosmeticImage');
        var fsBtn = document.getElementById('fullscreenBtn');
        var previewBox = document.getElementById('previewBox');

        if (fsBtn && img) {
            fsBtn.addEventListener('click', function(e) { e.stopPropagation(); openLightbox(img.dataset.full || img.src); });
        }
        if (previewBox && img) {
            previewBox.addEventListener('click', function(e) {
                if (e.target.closest('.bd-preview-expand')) return;
                openLightbox(img.dataset.full || img.src);
            });
        }

        // ─── Rating widget ───
        var widget = document.getElementById('cosmeticHeatWidget');
        if (widget && typeof EmojiRatingWidget !== 'undefined') {
            new EmojiRatingWidget(widget, widget.dataset.cosmeticSlug, {
                cosmeticType: 'background',
                skinName: widget.dataset.cosmeticName
            });
        }
    })();
    </script>
    <script src="/marathon/js/mobile-nav.js"></script>
    <script src="/marathon/js/auth.js"></script>
    <script src="/marathon/js/feedback.js"></script>

    <!-- Mobile Anchor Ad -->
    <div class="ad-mobile-anchor">
        <div class="ad-container">
        </div>
    </div>

    <!-- Mobile Sticky Top Ad -->
    <div class="ad-mobile-sticky-top">
        <div class="ad-container">
        </div>
    </div>
</body>
</html>`;
}

// ─── Build-time row generators ────────────────────────────────────────────

function row(label, valueHtml) {
    return `                        <div class="bd-row"><span class="bd-row-label">${label}</span><span class="bd-row-value">${valueHtml}</span></div>`;
}

function buildDetailRows(bg) {
    const lines = [];
    lines.push(row('Type', 'Profile Background'));
    if (bg.rarity) lines.push(row('Rarity', `<span style="color:${RARITY_COLOURS[bg.rarity]||'#fff'}">${capitalize(bg.rarity)}</span>`));
    if (bg.source_type && bg.source_type !== 'unknown') lines.push(row('Source', SOURCE_LABELS[bg.source_type] || capitalize(bg.source_type)));
    if (bg.season_name) lines.push(row('Season', escapeHtml(bg.season_name)));
    if (bg.faction_name && bg.faction_slug) {
        const fc = FACTION_COLOURS[bg.faction_slug] || '#fff';
        lines.push(row('Faction', `<a href="/marathon/factions/${bg.faction_slug}/" style="color:${fc}">${escapeHtml(bg.faction_name)}</a>`));
    }
    lines.push(row('Obtainable', bg.is_obtainable ? '<span style="color:#2ecc71">Yes</span>' : '<span style="color:#e74c3c">No (Legacy)</span>'));
    if (bg.description) lines.push(row('Description', escapeHtml(bg.description)));
    if (bg.flavor_text) lines.push(row('Flavor Text', `<em>&ldquo;${escapeHtml(bg.flavor_text)}&rdquo;</em>`));
    return lines.join('\n');
}

function buildStoreRows(bg) {
    const lines = [];
    if (bg.source_type === 'store') {
        if (bg.price) lines.push(row('Price', bg.price.toLocaleString() + ' ' + (bg.currency || 'Credits')));
        if (bg.available_from) lines.push(row('Available From', formatDate(bg.available_from)));
        if (bg.available_until) lines.push(row('Available Until', formatDate(bg.available_until)));
    }
    if (bg.source_type === 'battlepass' && bg.battlepass_tier) {
        lines.push(row('Battle Pass Tier', 'Tier ' + bg.battlepass_tier));
    }
    return lines.join('\n');
}

function buildRelatedSection(related) {
    const cards = related.map(r => {
        const imgSrc = resolveImage(r.image_preview_url) || resolveImage(r.image_url);
        const thumbHtml = imgSrc
            ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(r.name || '')}" loading="lazy" width="36" height="36">`
            : '';
        return `                    <a href="/marathon/backgrounds/${r.slug}/" class="bd-related-card">
                        <div class="bd-related-card-thumb">${thumbHtml}</div>
                        <span class="bd-related-card-name">${escapeHtml(r.name || r.slug)}</span>
                    </a>`;
    }).join('\n');

    return `            <!-- Related Backgrounds -->
            <section class="bd-related">
                <h2 class="bd-section-title">Related Backgrounds</h2>
                <div class="bd-related-grid">
${cards}
                </div>
            </section>`;
}

function buildQuickNav(allBgs, idx) {
    if (idx === -1 || allBgs.length < 2) return '';
    const prev = idx > 0 ? allBgs[idx - 1] : allBgs[allBgs.length - 1];
    const next = idx < allBgs.length - 1 ? allBgs[idx + 1] : allBgs[0];

    return `            <nav class="bd-quick-nav" style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;padding:24px 0;border-top:1px solid var(--border);margin-top:8px;">
                <a href="/marathon/backgrounds/${prev.slug}/" class="bd-quick-link bd-quick-link--prev">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                    <span>${escapeHtml(prev.name)}</span>
                </a>
                <a href="/backgrounds/" class="bd-quick-link bd-quick-link--all">All Backgrounds</a>
                <a href="/marathon/backgrounds/${next.slug}/" class="bd-quick-link bd-quick-link--next">
                    <span>${escapeHtml(next.name)}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </a>
            </nav>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   SSG: Background Detail Pages                   ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    console.log(`  API:     ${BG_API}`);
    console.log(`  CDN:     ${BG_CDN}`);
    console.log(`  Output:  ${OUTPUT_DIR}`);
    console.log(`  Mode:    ${IS_DRYRUN ? 'DRY RUN' : IS_TEST ? 'TEST (1 page)' : SLUG_ARG ? 'Single: ' + SLUG_ARG : 'FULL RUN'}\n`);

    const startTime = Date.now();
    let allBgs;

    try {
        allBgs = await fetchAllBackgrounds();
        console.log(`  ✓ Fetched ${allBgs.length} backgrounds from API\n`);
    } catch (err) {
        console.error('  ✗ Failed to fetch backgrounds:', err.message);
        process.exit(1);
    }

    // Decide which backgrounds to process
    let toProcess;
    if (SLUG_ARG) {
        toProcess = allBgs.filter(b => b.slug === SLUG_ARG);
        if (toProcess.length === 0) {
            console.error(`  ✗ Slug "${SLUG_ARG}" not found in API`);
            process.exit(1);
        }
    } else if (IS_TEST) {
        toProcess = [allBgs[0]];
    } else {
        toProcess = allBgs;
    }

    console.log(`  Processing ${toProcess.length} background(s)...\n`);

    let successes = 0;
    let failures  = 0;

    for (const bg of toProcess) {
        const slug = bg.slug;
        try {
            // Fetch full detail (includes ratings)
            const detail = await fetchBackgroundDetail(slug);
            if (!detail) {
                console.log(`  ⚠ Skipping ${slug} — no detail data`);
                failures++;
                continue;
            }

            const html = generateBackgroundPage(detail, allBgs);
            const outPath = path.join(OUTPUT_DIR, slug, 'index.html');

            if (IS_DRYRUN) {
                console.log(`  [DRY RUN] Would write: ${outPath} (${html.length} bytes)`);
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
    console.log(`  ✓ ${successes} built  |  ✗ ${failures} failed  |  Total: ${toProcess.length}\n`);

    if (failures > 0) process.exit(1);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
