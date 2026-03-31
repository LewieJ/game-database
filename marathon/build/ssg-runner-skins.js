/**
 * ssg-runner-skins.js
 * Standalone SSG for Marathon Runner Skin detail pages.
 *
 * Generates: runner-skins/{slug}/index.html for every skin in the API.
 *
 * Usage:
 *   node build/ssg-runner-skins.js            — full run (all skins)
 *   node build/ssg-runner-skins.js --test     — process one skin only (safe test)
 *   node build/ssg-runner-skins.js --dry-run  — log actions, write nothing
 *   node build/ssg-runner-skins.js --slug=X   — build a single skin by slug
 */

'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { generateNavigation: _sharedNav } = require('./shared-nav');
const { generateFooter } = require('./site-footer');

// ─── Configuration ──────────────────────────────────────────────────────────

const SKINS_API  = 'https://runnerskins.marathondb.gg';
const SITE_URL   = 'https://marathondb.gg';
const OUTPUT_DIR = path.resolve(__dirname, '..');

const IS_TEST    = process.argv.includes('--test');
const IS_DRYRUN  = process.argv.includes('--dry-run');
const SLUG_ARG   = (process.argv.find(a => a.startsWith('--slug=')) || '').replace('--slug=', '') || null;

// ─── HTTP helpers ─────────────────────────────────────────────────────────

/**
 * Fetch a URL and return parsed JSON. No external dependencies.
 */
function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        proto.get(url, { headers: { 'User-Agent': 'marathondb-ssg/1.0' } }, (res) => {
            let raw = '';
            res.on('data', (chunk) => { raw += chunk; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                }
                try {
                    resolve(JSON.parse(raw));
                } catch (e) {
                    reject(new Error(`JSON parse error for ${url}: ${e.message}`));
                }
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
        .replace(/"//marathon/g, '&quot;')
        .replace(/'//marathon/g, '&#39;');
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

// ─── API helpers ──────────────────────────────────────────────────────────

/** Fetch all skins (auto-paginate). Returns array of skin objects. */
async function fetchAllSkins() {
    const skins = [];
    const bust  = Date.now();
    let page = 1;
    while (true) {
        const url  = `${SKINS_API}/api/skins?per_page=100&page=${page}&_nocache=${bust}`;
        console.log(`  Fetching list page ${page}: ${url}`);
        const json = await fetchJSON(url);
        if (!json.success) throw new Error('List API returned success=false');
        const data = json.data || (json.skins && json.skins.data) || [];
        if (data.length === 0) break;
        skins.push(...data);
        const meta = json.meta || (json.skins && json.skins.meta) || {};
        const totalPages = meta.last_page || meta.total_pages || 1;
        if (page >= totalPages) break;
        page++;
    }
    return skins;
}

/** Fetch full detail for one skin slug. Returns data object or null. */
async function fetchSkinDetail(slug) {
    const url  = `${SKINS_API}/api/skins/${slug}?_nocache=${Date.now()}`;
    const json = await fetchJSON(url);
    if (!json.success || !json.data) return null;
    return json.data;
}
// Navigation HTML — imported from shared-nav.js
function generateNavigation() {
    return _sharedNav('runner-skins');
}

// Footer: generateFooter from site-footer.js

// ─── Page generator ───────────────────────────────────────────────────────

const IMAGE_CDN = 'https://runnerskins.marathondb.gg';

/**
 * Generate the full HTML for one runner skin detail page.
 * @param {object} detail   - Full detail object from GET /api/skins/:slug
 * @param {object[]} allSkins - Full list of skins from the listing API
 */
function generateSkinDetailPage(detail, allSkins = []) {
    const slug        = detail.slug;
    const displayName = detail.display_name || detail.name || slug;
    const rarity      = detail.rarity || 'common';
    const runner      = detail.runner || {};
    const runnerSlug  = runner.slug || '';
    const runnerName  = runner.name || '';

    // Build-time image URLs (from API — relative R2 keys, prefix with CDN)
    const primary   = (detail.images && detail.images.primary) || {};
    const rawOgPath = primary.path_card || primary.path_thumbnail || '';
    const ogImage   = rawOgPath ? `${IMAGE_CDN}/${rawOgPath}` : `${SITE_URL}/Icon.png`;
    const hasOgImg  = ogImage !== `${SITE_URL}/Icon.png`;

    // SEO copy
    const metaTitle = `${escapeHtml(displayName)} - ${escapeHtml(runnerName)} Runner Skin | MarathonDB`;
    const metaDesc  = `${escapeHtml(displayName)} ${escapeHtml(runnerName)} skin for Marathon. ${capitalize(rarity)} rarity. View details, images, and community ratings on MarathonDB.`;
    const canonicalUrl = `${SITE_URL}/runner-skins/${slug}/`;

    // Keywords
    const keywords = [
        displayName,
        `${runnerName} skin`,
        'Marathon runner skin',
        'Bungie Marathon cosmetics',
        `${rarity} runner skin`,
        'Marathon character customization'
    ].map(escapeHtml).join(', ');

    // Availability / release data
    const avail       = detail.availability || {};
    const release     = detail.release || {};          // top-level, not nested under availability
    const releaseDate = release.date || '';
    const isAvailable = avail.is_available;
    const seasonAdded = release.season_added || '';

    // Source label
    const sourceMap   = { store: 'Store', battlepass: 'Battle Pass', event: 'Event', 'deluxe-edition': 'Deluxe Edition', 'default': 'Default', unknown: 'Unknown' };
    const sourceLabel = detail.source && detail.source !== 'unknown' ? (sourceMap[detail.source] || capitalize(detail.source)) : '';

    // Battlepass info
    const bp          = detail.battlepass || {};
    const bpLevel     = bp.in_battlepass && bp.level ? bp.level : null;

    // Bundled rating (seed widget immediately, no extra request needed)
    const bakedRating = detail.rating ? JSON.stringify(detail.rating) : 'null';

    // Static details card — runner + rarity baked in at build time
    const runnerRowHtml = runnerSlug
        ? `<div class="rsd-row"><span class="rsd-row-label">Runner</span><span class="rsd-row-value"><a href="//marathon/runners/${runnerSlug}/" class="rsd-row-link">${escapeHtml(runnerName)}</a></span></div>`
        : '';
    const rarityRowHtml = `<div class="rsd-row"><span class="rsd-row-label">Rarity</span><span class="rsd-row-value"><span class="rsd-tag rsd-rarity-${escapeHtml(rarity)}">${capitalize(rarity)}</span></span></div>`;
    const sourceRowHtml = sourceLabel
        ? `<div class="rsd-row"><span class="rsd-row-label">Source</span><span class="rsd-row-value">${escapeHtml(sourceLabel)}</span></div>`
        : '';
    const availRowHtml  = isAvailable !== undefined && isAvailable !== null
        ? `<div class="rsd-row"><span class="rsd-row-label">Availability</span><span class="rsd-row-value"><span class="rsd-tag${isAvailable ? '' : ' rsd-tag--unavailable'}">${isAvailable ? 'Available' : 'Unavailable'}</span></span></div>`
        : `<div class="rsd-row"><span class="rsd-row-label">Availability</span><span class="rsd-row-value"><span class="rsd-tag">Unknown</span></span></div>`;
    const bpRowHtml     = bpLevel
        ? `<div class="rsd-row"><span class="rsd-row-label">Battle Pass Level</span><span class="rsd-row-value">Level ${bpLevel}</span></div>`
        : '';
    const seasonRowHtml = seasonAdded
        ? `<div class="rsd-row"><span class="rsd-row-label">Season Added</span><span class="rsd-row-value">${escapeHtml(seasonAdded)}</span></div>`
        : '';

    // Quest steps (0–5 challenge objectives)
    const questNotes = Array.isArray(detail.quest_notes) ? detail.quest_notes : [];
    const questStepsHtml = questNotes.length > 0
        ? `<div class="rsd-quest-steps" id="questSteps">
                            <div class="rsd-quest-header">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"//marathon/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"//marathon/></svg>
                                <span class="rsd-quest-header-text">Master Challenges</span>
                                <span class="rsd-quest-count">${questNotes.length} step${questNotes.length !== 1 ? 's' : ''}</span>
                            </div>
                            <ol class="rsd-quest-list">
                                ${questNotes.map((step, i) => `<li class="rsd-quest-item"><span class="rsd-quest-num">${i + 1}</span><span class="rsd-quest-text">${escapeHtml(step)}</span></li>`).join('\n                                ')}
                            </ol>
                        </div>`
        : '';

    // Runner badge in hero
    const runnerBadgeHtml = runnerSlug
        ? `<a href="//marathon/runners/${runnerSlug}/" class="rsd-runner-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"//marathon/><path d="M20 21a8 8 0 1 0-16 0"//marathon/></svg>
                                ${escapeHtml(runnerName)}
                            </a>`
        : '';

    // JS string escaping for inline script usage
    const jsSlug        = slug.replace(/'//marathon/g, "\\'");
    const jsDisplayName = displayName.replace(/'//marathon/g, "\\'");
    const jsRarity      = capitalize(rarity).replace(/'//marathon/g, "\\'");
    const jsRunnerName  = runnerName.replace(/'//marathon/g, "\\'");

    return `<!DOCTYPE html>
<html lang="en">
<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metaTitle}</title>
    <meta name="description" content="${metaDesc}">
    <meta name="keywords" content="${keywords}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="MARATHON DB">
    <link rel="icon" type="image/png" href="//marathon/Icon.png">
    <link rel="apple-touch-icon" href="//marathon/Icon.png">
    <link rel="canonical" href="${canonicalUrl}">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(displayName)} ${escapeHtml(runnerName)} Skin - Marathon | MarathonDB">
    <meta property="og:description" content="${metaDesc}">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta property="og:image:width" content="${hasOgImg ? '400' : '512'}">
    <meta property="og:image:height" content="${hasOgImg ? '800' : '512'}">
    <meta property="og:site_name" content="MarathonDB">
    <meta property="og:locale" content="en_US">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="${hasOgImg ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:site" content="@MarathonDB">
    <meta name="twitter:title" content="${escapeHtml(displayName)} ${escapeHtml(runnerName)} Skin - Marathon">
    <meta name="twitter:description" content="${metaDesc}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">

    <link rel="stylesheet" href="//marathon/css/style.css">
    <link rel="stylesheet" href="//marathon/css/pages.css">
    <link rel="stylesheet" href="//marathon/css/auth.css">

    <!-- Structured Data -->
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Thing",
  "name": "${escapeHtml(displayName)} ${escapeHtml(runnerName)} Skin",
  "description": "${metaDesc}",
  "image": "${escapeHtml(ogImage)}",
  "url": "${canonicalUrl}"${releaseDate ? `,
  "releaseDate": "${releaseDate}"` : ''}
}
    </script>
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "${SITE_URL}"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Runner Skins",
      "item": "${SITE_URL}/runner-skins/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "${escapeHtml(displayName)}"
    }
  ]
}
    </script>
</head>
<body>

${generateNavigation()}

    <main class="rsd-page">
<!-- ═══ PAGE-LEVEL AD WRAPPER (siderails + content) ═══ -->
    <div class="ad-page-wrapper">

        <!-- Left Siderail Ad -->
        <aside class="ad-siderail ad-siderail--left">
            <div class="ad-siderail-sticky">
                <span class="ad-label">Ad</span>
                <div class="ad-container">
                    <!-- MDB - Left Siderail (160/300) -->
                </div>
            </div>
        </aside>

        <!-- Main Page Content -->
        <div class="rsd-page-content">

        <!-- ═══ HERO SECTION ═══ -->
        <section class="rsd-hero" data-rarity="${escapeHtml(rarity)}">
            <div class="rsd-hero-bg"></div>
            <div class="rsd-hero-inner">
                <!-- Left: Image Preview -->
                <div class="rsd-hero-preview">
                    <div class="rsd-preview-frame" id="previewBox" data-rarity="${escapeHtml(rarity)}">
                        <!-- src and data-full populated at runtime by enrichFromAPI() -->
                        <img id="cosmeticImage" src="" alt="${escapeHtml(displayName)} ${escapeHtml(runnerName)} Skin preview" style="display:none">
                        <button class="rsd-preview-expand" id="fullscreenBtn" title="View full image">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"//marathon/></svg>
                        </button>

                        <!-- Gallery nav arrows -->
                        <div class="rsd-gallery-nav" id="galleryNav">
                            <button class="rsd-gallery-arrow rsd-gallery-prev" id="galleryPrev" title="Previous image">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"//marathon/></svg>
                            </button>
                            <span class="rsd-gallery-counter" id="galleryCounter">1 / 1</span>
                            <button class="rsd-gallery-arrow rsd-gallery-next" id="galleryNext" title="Next image">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"//marathon/></svg>
                            </button>
                        </div>
                        <!-- Hidden data for gallery images — populated by JS from /api/skins/:slug -->
                        <div id="galleryData" style="display:none"></div>
                    </div>
                </div>

                <!-- Right: Title + Rating + Quick Stats -->
                <div class="rsd-hero-info">
                    <nav class="breadcrumb rsd-breadcrumb">
                        <a href="//marathon/">Home</a> /
                        <a href="//marathon/runner-skins/">Runner Skins</a> /
                        <span>${escapeHtml(displayName)}</span>
                    </nav>

                    <div class="rsd-title-block">
                        <h1 class="rsd-skin-name">${escapeHtml(displayName)}</h1>
                        <div class="rsd-subtitle-row">
                            ${runnerBadgeHtml}
                            <span class="rsd-rarity-badge rsd-rarity-${escapeHtml(rarity)}">${capitalize(rarity)}</span>

                            <span class="rsd-subtitle-sep"></span>

                            <button id="shareTwitter" class="rsd-action-btn" title="Share on X">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"//marathon/></svg>
                            </button>
                            <button id="shareDiscord" class="rsd-action-btn" title="Copy for Discord">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"//marathon/></svg>
                            </button>
                            <button id="shareCopy" class="rsd-action-btn" title="Copy link">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"//marathon/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"//marathon/></svg>
                            </button>
                        </div>
                        <!-- Share Toast — anchored near buttons -->
                        <div id="rsdShareToast" class="rsd-share-toast" aria-live="polite"></div>
                    </div>

                    <!-- How to unlock — above the fold -->
                    <div class="rsd-acquisition rsd-acquisition--hero${questNotes.length > 0 ? ' rsd-acquisition--has-quest' : ''}">
                        <div class="rsd-acquisition-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"//marathon/><polyline points="7 10 12 15 17 10"//marathon/><line x1="12" y1="15" x2="12" y2="3"//marathon/></svg>
                        </div>
                        <div class="rsd-acquisition-content">
                            <span class="rsd-acquisition-label">How to unlock ${escapeHtml(displayName)} for ${escapeHtml(runnerName)}</span>
                            <p class="rsd-acquisition-text">${escapeHtml(detail.acquisition_note || 'Source details are being updated. Check back for the latest information on how to obtain this skin.')}</p>
                            ${questStepsHtml}
                        </div>
                    </div>

                    <!-- Community Rating — compact, above the fold -->
                    <div class="rsd-rating-hero rsd-rating-compact">
                        <div id="cosmeticHeatWidget" data-cosmetic-slug="${escapeHtml(slug)}" data-cosmetic-type="runner-skin" data-cosmetic-name="${escapeHtml(displayName)}"></div>
                    </div>
                </div>
            </div>
        </section>

<!-- ═══ INFO BODY ═══ -->
        <div class="rsd-body">

            <!-- Info Cards Grid -->
            <div class="rsd-cards-grid">

                <!-- Details Card -->
                <div class="rsd-card">
                    <h3 class="rsd-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"//marathon/><path d="M14 2v6h6"//marathon/><path d="M16 13H8"//marathon/><path d="M16 17H8"//marathon/><path d="M10 9H8"//marathon/></svg>
                        Details
                    </h3>
                    <div class="rsd-card-rows" id="detailRows">
                        ${runnerRowHtml}
                        ${rarityRowHtml}
                        ${sourceRowHtml}
                        ${availRowHtml}
                        <div class="rsd-row" id="detailCollectionRow"><span class="rsd-row-label">Collection</span><span class="rsd-row-value" id="detailCollectionValue">—</span></div>
                    </div>
                </div>

                <!-- In Game Store Info (populated by API, fallback if no data) -->
                <div id="storeInfoCard" class="rsd-card">
                    <h3 class="rsd-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"//marathon/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"//marathon/><path d="M12 18V6"//marathon/></svg>
                        In Game Store Info
                    </h3>
                    <div class="rsd-card-rows" id="storeRows">
                        ${bpRowHtml}
                        <div class="rsd-store-fallback" id="storeFallback"${bpRowHtml ? ' style="display:none"' : ''}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"//marathon/><line x1="12" y1="8" x2="12" y2="12"//marathon/><line x1="12" y1="16" x2="12.01" y2="16"//marathon/></svg>
                            <span>No in-game store data available yet. Check back later!</span>
                        </div>
                    </div>
                </div>

                <!-- Release Info (populated by API) -->
                <div id="releaseInfoCard" class="rsd-card"${seasonRowHtml ? '' : ' style="display:none"'}>
                    <h3 class="rsd-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"//marathon/><line x1="16" y1="2" x2="16" y2="6"//marathon/><line x1="8" y1="2" x2="8" y2="6"//marathon/><line x1="3" y1="10" x2="21" y2="10"//marathon/></svg>
                        Release Info
                    </h3>
                    <div class="rsd-card-rows" id="releaseRows">${seasonRowHtml}</div>
                </div>
            </div>

            <!-- Related Links (Runner page, Collection) -->
            <div id="relatedLinks" class="rsd-related-links" style="display:none"></div>

            <!-- ═══ AD SAFE ZONE — Below Info Cards ═══ -->
            <div class="ad-safe-zone ad-safe-zone--below-cards">
                <span class="ad-label">Advertisement</span>
                <div class="ad-container">
                </div>
            </div>

            <!-- Other Runner Skins (baked at build time) -->
            ${(() => {
                const others = allSkins.filter(s => s.slug !== slug && (s.runner && s.runner.slug) === runnerSlug);
                if (others.length === 0) return '';
                const cards = others.slice(0, 8).map(s => {
                    const rawImg = (s.image && (s.image.card || s.image.thumbnail)) || '';
                    const imgUrl = rawImg ? (rawImg.startsWith('http') ? rawImg : `${IMAGE_CDN}/${rawImg}`) : `${IMAGE_CDN}/assets/runner-skins/${s.slug}/card.webp`;
                    const name   = escapeHtml(s.display_name || s.name || s.slug);
                    const rar    = s.rarity || 'common';
                    return `<a href="//marathon/runner-skins/${s.slug}/" class="rsd-skin-card">` +
                        `<div class="rsd-skin-card-img"><img src="${imgUrl}" alt="${name}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rsd-skin-card-placeholder'}))"></div>` +
                        `<div class="rsd-skin-card-info">` +
                            `<span class="rsd-skin-card-name">${name}</span>` +
                            `<span class="rsd-skin-card-rarity rsd-rarity-${rar}">${capitalize(rar)}</span>` +
                        `</div></a>`;
                }).join('');
                return `<section class="rsd-related" id="otherRunnerSkinsSection">` +
                    `<h2 class="rsd-section-title">Other ${escapeHtml(runnerName)} Skins</h2>` +
                    `<div class="rsd-related-grid" id="otherRunnerSkinsGrid">${cards}</div>` +
                    `</section>`;
            })()}
        </div>

        </div><!-- /rsd-page-content -->

        <!-- Right Siderail Ad -->
        <aside class="ad-siderail ad-siderail--right">
            <div class="ad-siderail-sticky">
                <span class="ad-label">Ad</span>
                <div class="ad-container">
                    <!-- MDB - Right Siderail (160/300) -->
                </div>
            </div>
        </aside>

    </div><!-- /ad-page-wrapper -->
    </main>


${generateFooter()}

    <script src="//marathon/js/api.js"></script>
    <script src="//marathon/js/search.js"></script>
    <script src="//marathon/js/mobile-nav.js"></script>
    <script src="//marathon/js/auth.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var SKIN_SLUG      = '${jsSlug}';
            var SKINS_API      = 'https://runnerskins.marathondb.gg';
            var SKINS_FALLBACK = 'https://marathon-runner-skins-api.heymarathondb.workers.dev';
            var BAKED_RATING   = ${bakedRating};

            // ─── Fetch helper with fallback ───
            async function skinsFetch(path, opts) {
                try {
                    var r = await fetch(SKINS_API + path, opts || {});
                    if (r.ok || opts) return r;
                } catch (_) {}
                return fetch(SKINS_FALLBACK + path, opts || {});
            }

            // ─── Share buttons ───
            document.getElementById('shareTwitter')?.addEventListener('click', function() {
                var text = 'Check out ${jsDisplayName} ${jsRunnerName} Skin on MarathonDB!';
                var url = window.location.href;
                window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'width=550,height=420');
            });
            var _toastTimer;
            function showShareToast(message, type) {
                var toast = document.getElementById('rsdShareToast');
                if (!toast) return;
                toast.textContent = '';
                var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                svg.setAttribute('width','14'); svg.setAttribute('height','14'); svg.setAttribute('viewBox','0 0 24 24');
                svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','2');
                var path = document.createElementNS('http://www.w3.org/2000/svg','path');
                path.setAttribute('d','M20 6 9 17l-5-5');
                svg.appendChild(path);
                toast.appendChild(svg);
                toast.appendChild(document.createTextNode(message));
                toast.className = 'rsd-share-toast ' + type;
                void toast.offsetWidth;
                toast.classList.add('visible');
                clearTimeout(_toastTimer);
                _toastTimer = setTimeout(function() { toast.classList.remove('visible'); }, 2200);
            }

            document.getElementById('shareDiscord')?.addEventListener('click', async function() {
                try {
                    var markdown = '**${jsDisplayName}** (${jsRarity} ${jsRunnerName} Skin)\\n' + window.location.href;
                    await navigator.clipboard.writeText(markdown);
                    var btn = document.getElementById('shareDiscord');
                    btn.classList.add('copied');
                    showShareToast('Discord text copied!', 'toast-discord');
                    setTimeout(function() { btn.classList.remove('copied'); }, 2200);
                } catch(e) { console.error('Copy failed', e); }
            });
            document.getElementById('shareCopy')?.addEventListener('click', async function() {
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    var btn = document.getElementById('shareCopy');
                    btn.classList.add('copied');
                    showShareToast('Link copied to clipboard!', 'toast-copy');
                    setTimeout(function() { btn.classList.remove('copied'); }, 2200);
                } catch(e) { console.error('Copy failed', e); }
            });

            // ─── Gallery prev/next arrows ───
            var galleryNodes   = document.querySelectorAll('#galleryData span');
            var mainImg        = document.getElementById('cosmeticImage');
            var galleryCounter = document.getElementById('galleryCounter');
            var galleryNav     = document.getElementById('galleryNav');
            var galleryIdx     = 0;
            var galleryTotal   = galleryNodes.length;

            if (galleryNav) galleryNav.style.display = 'none';

            function showGalleryImage(idx) {
                if (!galleryNodes[idx] || !mainImg) return;
                galleryIdx = idx;
                mainImg.src = galleryNodes[idx].dataset.src;
                mainImg.dataset.full = galleryNodes[idx].dataset.full || galleryNodes[idx].dataset.src;
                if (galleryCounter) galleryCounter.textContent = (idx + 1) + ' / ' + galleryTotal;
            }

            document.getElementById('galleryPrev')?.addEventListener('click', function(e) {
                e.stopPropagation();
                showGalleryImage((galleryIdx - 1 + galleryTotal) % galleryTotal);
            });
            document.getElementById('galleryNext')?.addEventListener('click', function(e) {
                e.stopPropagation();
                showGalleryImage((galleryIdx + 1) % galleryTotal);
            });

            // ─── Fullscreen / lightbox ───
            function openLightbox(src) {
                var overlay = document.createElement('div');
                overlay.className = 'ws-lightbox-overlay';
                overlay.innerHTML = '<div class="ws-lightbox-content"><img src="' + src + '" alt="Full size preview"><button class="ws-lightbox-close">&times;</button></div>';
                document.body.appendChild(overlay);
                requestAnimationFrame(function() { overlay.classList.add('active'); });
                overlay.addEventListener('click', function(ev) {
                    if (ev.target === overlay || ev.target.classList.contains('ws-lightbox-close')) {
                        overlay.classList.remove('active');
                        setTimeout(function() { overlay.remove(); }, 200);
                    }
                });
            }

            var fsBtn = document.getElementById('fullscreenBtn');
            var img   = document.getElementById('cosmeticImage');
            if (fsBtn && img) {
                fsBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openLightbox(img.dataset.full || img.src);
                });
            }
            var previewBox = document.getElementById('previewBox');
            if (previewBox && img) {
                previewBox.addEventListener('click', function(e) {
                    if (e.target.closest('.rsd-preview-expand')) return;
                    openLightbox(img.dataset.full || img.src);
                });
            }

            // ─── Rating widget — mirrors EmojiRatingWidget design, backed by Skins API ───
            var EMOJI_TIERS = [
                { value: 5, key: 'fire',  emoji: '🔥', label: 'Fire',  color: '#ff4500' },
                { value: 4, key: 'love',  emoji: '😍', label: 'Love',  color: '#ff69b4' },
                { value: 3, key: 'meh',   emoji: '😐', label: 'Meh',   color: '#ffa500' },
                { value: 2, key: 'nah',   emoji: '👎', label: 'Nah',   color: '#808080' },
                { value: 1, key: 'trash', emoji: '💩', label: 'Trash', color: '#8b4513' }
            ];

            function getScoreColor(pct) {
                if (pct === null || pct === undefined) return '#666';
                if (pct >= 80) return '#ff4500';
                if (pct >= 60) return '#ff69b4';
                if (pct >= 40) return '#ffa500';
                if (pct >= 20) return '#808080';
                return '#8b4513';
            }

            function getScoreTier(pct) {
                if (pct === null || pct === undefined) return 'none';
                if (pct >= 80) return 'fire';
                if (pct >= 60) return 'love';
                if (pct >= 40) return 'meh';
                if (pct >= 20) return 'nah';
                return 'trash';
            }

            async function getDeviceToken() {
                var id = localStorage.getItem('mdb_device_id');
                if (!id) {
                    id = (crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36) + Date.now().toString(36)));
                    localStorage.setItem('mdb_device_id', id);
                }
                try {
                    var data = new TextEncoder().encode(id + navigator.userAgent);
                    var hash = await crypto.subtle.digest('SHA-256', data);
                    return Array.from(new Uint8Array(hash)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
                } catch(_) { return id; }
            }

            function renderRatingWidget(container, ratingData, userVote) {
                var dist  = (ratingData && ratingData.distribution) || {};
                var pct   = ratingData ? (ratingData.score_percent || 0) : null;
                var total = ratingData ? (ratingData.total_votes || 0) : 0;
                var tier  = getScoreTier(pct);
                var scoreColor = getScoreColor(pct);
                var scoreText  = total > 0 ? Math.round(pct) + '%' : '—';

                var html = '<div class="emoji-rating-widget" data-tier="' + tier + '">';

                // Header
                html += '<div class="emoji-rating-header">';
                html += '<h3 class="emoji-rating-title">COMMUNITY RATING</h3>';
                html += '<div class="emoji-rating-votes"><span class="emoji-votes-count">' + total + '</span> ' + (total === 1 ? 'vote' : 'votes') + '</div>';
                html += '</div>';

                // Body
                html += '<div class="emoji-rating-body">';

                // Score
                html += '<div class="emoji-score-display">';
                html += '<span class="emoji-score-number" style="color:' + scoreColor + '">' + scoreText + '</span>';
                html += '</div>';

                // Emoji buttons
                html += '<div class="emoji-rating-bar">';
                EMOJI_TIERS.forEach(function(t) {
                    var d = dist[t.key] || { count: 0 };
                    var sel = userVote === t.value ? ' selected' : '';
                    html += '<button class="emoji-rate-btn' + sel + '" data-value="' + t.value + '" title="' + t.label + '">';
                    html += '<span class="emoji-rate-icon">' + t.emoji + '</span>';
                    html += '<span class="emoji-rate-label">' + t.label + '</span>';
                    html += '<span class="emoji-rate-count">' + (d.count || 0) + '</span>';
                    html += '</button>';
                });
                html += '</div>';

                // Distribution bars
                html += '<div class="emoji-distribution">';
                EMOJI_TIERS.forEach(function(t) {
                    var d = dist[t.key] || { count: 0, percent: 0 };
                    var barPct = d.percent || (total > 0 ? (d.count / total) * 100 : 0);
                    html += '<div class="emoji-dist-row" data-value="' + t.value + '">';
                    html += '<span class="emoji-dist-icon">' + t.emoji + '</span>';
                    html += '<div class="emoji-dist-bar-bg"><div class="emoji-dist-bar-fill" style="width:' + barPct.toFixed(1) + '%;background-color:' + t.color + '"></div></div>';
                    html += '<span class="emoji-dist-count">' + (d.count || 0) + '</span>';
                    html += '</div>';
                });
                html += '</div>';

                // User vote notice
                if (userVote) {
                    var ut = EMOJI_TIERS.find(function(t){ return t.value === userVote; });
                    html += '<div class="emoji-user-rating" style="display:flex">';
                    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="emoji-check-icon"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"//marathon/></svg>';
                    html += '<span>Your vote: <strong>' + (ut ? ut.emoji + ' ' + ut.label : '—') + '</strong></span>';
                    html += '<span class="emoji-change-hint">(click another to change)</span>';
                    html += '</div>';
                }

                html += '</div>'; // emoji-rating-body

                // Loading overlay
                html += '<div class="emoji-rating-loading" style="display:none"><div class="loading-spinner small"></div></div>';

                html += '</div>'; // emoji-rating-widget
                container.innerHTML = html;

                // Wire up vote buttons
                container.querySelectorAll('.emoji-rate-btn').forEach(function(btn) {
                    btn.addEventListener('click', async function() {
                        var rating = parseInt(btn.dataset.value);
                        // Optimistic UI
                        container.querySelectorAll('.emoji-rate-btn').forEach(function(b){ b.classList.remove('selected'); });
                        btn.classList.add('selected');
                        // Show/update user vote notice
                        var ut = EMOJI_TIERS.find(function(t){ return t.value === rating; });
                        var userRatingEl = container.querySelector('.emoji-user-rating');
                        if (!userRatingEl) {
                            userRatingEl = document.createElement('div');
                            userRatingEl.className = 'emoji-user-rating';
                            container.querySelector('.emoji-rating-body').appendChild(userRatingEl);
                        }
                        userRatingEl.style.display = 'flex';
                        userRatingEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="emoji-check-icon"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"//marathon/></svg>' +
                            '<span>Your vote: <strong>' + (ut ? ut.emoji + ' ' + ut.label : '—') + '</strong></span>' +
                            '<span class="emoji-change-hint">(click another to change)</span>';
                        localStorage.setItem('mdb_vote_' + SKIN_SLUG, String(rating));
                        // Set loading
                        var loadingEl = container.querySelector('.emoji-rating-loading');
                        if (loadingEl) loadingEl.style.display = 'flex';
                        try {
                            var token = await getDeviceToken();
                            var res = await fetch(SKINS_API + '/api/skins/' + SKIN_SLUG + '//marathon/rate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ rating: rating, device_token: token })
                            }).catch(function(){
                                return fetch(SKINS_FALLBACK + '/api/skins/' + SKIN_SLUG + '//marathon/rate', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ rating: rating, device_token: token })
                                });
                            });
                            if (res.ok) {
                                var body = await res.json();
                                if (body.success && body.aggregate) {
                                    renderRatingWidget(container, body.aggregate, rating);
                                }
                            }
                        } catch(err) { console.warn('Rating failed:', err); }
                        if (loadingEl) loadingEl.style.display = 'none';
                    });
                });
            }

            async function initRatingWidget() {
                var container = document.getElementById('cosmeticHeatWidget');
                if (!container) return;
                var userVote = localStorage.getItem('mdb_vote_' + SKIN_SLUG);
                userVote = userVote ? parseInt(userVote) : null;
                // Seed immediately from baked-in data, then refresh live from API
                if (BAKED_RATING) renderRatingWidget(container, BAKED_RATING, userVote);
                try {
                    var res  = await skinsFetch('/api/skins/' + SKIN_SLUG + '//marathon/ratings', { cache: 'no-store' });
                    var body = await res.json();
                    renderRatingWidget(container, body.success ? body.data : null, userVote);
                } catch(_) {
                    if (!BAKED_RATING) renderRatingWidget(container, null, userVote);
                }
            }
            initRatingWidget();

            // ─── Helpers ───
            function formatDate(dateStr) {
                if (!dateStr) return null;
                var d = new Date(dateStr);
                if (isNaN(d)) return dateStr;
                return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }

            function formatCredits(amount) {
                if (!amount && amount !== 0) return null;
                return amount.toLocaleString() + ' Lux';
            }

            function makeDetailRow(label, valueHtml) {
                var row = document.createElement('div');
                row.className = 'rsd-row';
                row.innerHTML = '<span class="rsd-row-label">' + label + '</span><span class="rsd-row-value">' + valueHtml + '</span>';
                return row;
            }

            function capitalize(str) {
                if (!str) return '';
                return str.charAt(0).toUpperCase() + str.slice(1);
            }

            // ─── Fetch skin detail from Skins API ───
            function imgUrl(r2Key) {
                if (!r2Key) return '';
                if (r2Key.startsWith('http')) return r2Key;
                return SKINS_API + '//marathon/' + r2Key;
            }
            async function enrichFromAPI() {
                try {
                    var resp = await skinsFetch('/api/skins/' + SKIN_SLUG, { cache: 'no-store' });
                    var json = await resp.json();
                    if (!json.success || !json.data) return;
                    var d = json.data;

                    // ── Images — populate hero + gallery from API ──
                    var primaryImg  = d.images && d.images.primary;
                    var galleryImgs = (d.images && d.images.gallery) || [];
                    var mainImg     = document.getElementById('cosmeticImage');
                    var galleryData = document.getElementById('galleryData');

                    if (primaryImg && mainImg) {
                        var cardSrc = imgUrl(primaryImg.path_card || primaryImg.path_thumbnail || '');
                        var fullSrc = imgUrl(primaryImg.path_full || primaryImg.path_card || '');
                        if (cardSrc) {
                            mainImg.src = cardSrc;
                            mainImg.dataset.full = fullSrc;
                            mainImg.style.display = '';
                        }
                    }

                    if (galleryData) {
                        galleryData.innerHTML = '';
                        var allImages = [];
                        if (primaryImg) allImages.push({ card: imgUrl(primaryImg.path_card || ''), full: imgUrl(primaryImg.path_full || primaryImg.path_card || '') });
                        galleryImgs.forEach(function(g) {
                            allImages.push({ card: imgUrl(g.path_card || ''), full: imgUrl(g.path_full || g.path_card || '') });
                        });
                        allImages.forEach(function(img) {
                            if (!img.card) return;
                            var s = document.createElement('span');
                            s.dataset.src  = img.card;
                            s.dataset.full = img.full;
                            galleryData.appendChild(s);
                        });
                        galleryNodes  = document.querySelectorAll('#galleryData span');
                        galleryTotal  = galleryNodes.length;
                        galleryIdx    = 0;
                        if (galleryNav)     galleryNav.style.display     = galleryTotal > 1 ? '' : 'none';
                        if (galleryCounter) galleryCounter.textContent   = '1 / ' + galleryTotal;
                    }

                    // ── Acquisition callout ──
                    var acqText = document.querySelector('.rsd-acquisition-text');
                    if (acqText && d.acquisition_note) {
                        acqText.textContent = d.acquisition_note;
                    }

                    // ── Quest steps (dynamic) ──
                    var questNotes = Array.isArray(d.quest_notes) ? d.quest_notes : [];
                    var acqBlock = document.querySelector('.rsd-acquisition--hero');
                    var existingSteps = document.getElementById('questSteps');
                    if (questNotes.length > 0 && acqBlock) {
                        acqBlock.classList.add('rsd-acquisition--has-quest');
                        var stepsHtml = '<div class="rsd-quest-steps" id="questSteps">';
                        stepsHtml += '<div class="rsd-quest-header">';
                        stepsHtml += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"//marathon/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"//marathon/></svg>';
                        stepsHtml += '<span class="rsd-quest-header-text">Master Challenges</span>';
                        stepsHtml += '<span class="rsd-quest-count">' + questNotes.length + ' step' + (questNotes.length !== 1 ? 's' : '') + '</span>';
                        stepsHtml += '</div>';
                        stepsHtml += '<ol class="rsd-quest-list">';
                        questNotes.forEach(function(step, i) {
                            stepsHtml += '<li class="rsd-quest-item"><span class="rsd-quest-num">' + (i + 1) + '</span><span class="rsd-quest-text">' + step.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</span></li>';
                        });
                        stepsHtml += '</ol></div>';
                        if (existingSteps) { existingSteps.outerHTML = stepsHtml; }
                        else { document.querySelector('.rsd-acquisition-content').insertAdjacentHTML('beforeend', stepsHtml); }
                    } else if (questNotes.length === 0 && existingSteps) {
                        existingSteps.remove();
                        if (acqBlock) acqBlock.classList.remove('rsd-acquisition--has-quest');
                    }

                    // ── Details card ──
                    // source + availability are already baked into static HTML; only update collection dynamically
                    if (d.collection && d.collection.name) {
                        var colVal = document.getElementById('detailCollectionValue');
                        if (colVal) colVal.textContent = d.collection.name;
                    }

                    // ── In Game Store Info card ──
                    var storeRows     = document.getElementById('storeRows');
                    var storeFallback = document.getElementById('storeFallback');
                    var hasStoreData  = false;

                    if (d.store && d.store.in_store && storeRows) {
                        if (d.store.price_credits) { storeRows.appendChild(makeDetailRow('Lux (Premium Currency)', formatCredits(d.store.price_credits))); hasStoreData = true; }
                        if (d.store.start)          { storeRows.appendChild(makeDetailRow('Store Start', formatDate(d.store.start))); hasStoreData = true; }
                        if (d.store.end)            { storeRows.appendChild(makeDetailRow('Store End',   formatDate(d.store.end)));   hasStoreData = true; }
                    }
                    if (d.battlepass && d.battlepass.in_battlepass && storeRows) {
                        if (d.battlepass.level) { storeRows.appendChild(makeDetailRow('Battle Pass Level', 'Level ' + d.battlepass.level)); hasStoreData = true; }
                        if (d.battlepass.start) { storeRows.appendChild(makeDetailRow('BP Start', formatDate(d.battlepass.start))); hasStoreData = true; }
                        if (d.battlepass.end)   { storeRows.appendChild(makeDetailRow('BP End',   formatDate(d.battlepass.end)));   hasStoreData = true; }
                    }
                    if (d.price && d.price.credits && storeRows) {
                        storeRows.appendChild(makeDetailRow('Lux (Premium Currency)', formatCredits(d.price.credits))); hasStoreData = true;
                    }
                    if (hasStoreData && storeFallback) storeFallback.style.display = 'none';

                    // ── Release Info card (d.release is top-level) ──
                    var releaseCard = document.getElementById('releaseInfoCard');
                    var releaseRows = document.getElementById('releaseRows');
                    if (releaseCard && releaseRows && d.release) {
                        var rel = d.release;
                        var hasRelease = releaseRows.children.length > 0; // may have baked rows already
                        if (rel.date)  { releaseRows.appendChild(makeDetailRow('Release Date', formatDate(rel.date))); hasRelease = true; }
                        if (rel.patch) { releaseRows.appendChild(makeDetailRow('Patch', 'v' + rel.patch));             hasRelease = true; }
                        if (d.availability) {
                            if (d.availability.available_from)  { releaseRows.appendChild(makeDetailRow('Available From',  formatDate(d.availability.available_from)));  hasRelease = true; }
                            if (d.availability.available_until) { releaseRows.appendChild(makeDetailRow('Available Until', formatDate(d.availability.available_until))); hasRelease = true; }
                        }
                        if (hasRelease) releaseCard.style.display = '';
                    }

                    // ── Related links (runner page + collection) ──
                    var linksContainer = document.getElementById('relatedLinks');
                    if (linksContainer) {
                        var linksHtml = '';
                        var runner = d.runner;
                        if (runner && runner.slug) {
                            linksHtml += '<a href="//marathon/runners/' + runner.slug + '//marathon/" class="rsd-link-card">' +
                                '<div class="rsd-link-icon rsd-link-icon--runner"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"//marathon/><path d="M20 21a8 8 0 1 0-16 0"//marathon/></svg></div>' +
                                '<div class="rsd-link-text"><span class="rsd-link-name">' + runner.name + '</span><span class="rsd-link-hint">View runner details &rarr;</span></div></a>';
                        }
                        if (d.collection && d.collection.slug) {
                            linksHtml += '<a href="//marathon/runner-skins/?collection=' + d.collection.slug + '" class="rsd-link-card">' +
                                '<div class="rsd-link-icon rsd-link-icon--collection"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"//marathon/><rect x="14" y="3" width="7" height="7" rx="1"//marathon/><rect x="3" y="14" width="7" height="7" rx="1"//marathon/><rect x="14" y="14" width="7" height="7" rx="1"//marathon/></svg></div>' +
                                '<div class="rsd-link-text"><span class="rsd-link-name">' + d.collection.name + '</span><span class="rsd-link-hint">Browse full collection &rarr;</span></div></a>';
                        }
                        if (linksHtml) { linksContainer.innerHTML = linksHtml; linksContainer.style.display = ''; }
                    }

                    // Other skins section is baked statically — no runtime fetch needed

                } catch(err) { console.warn('Runner skin API enrichment failed:', err); }
            }

            enrichFromAPI();
        });
    </script>
    <script src="//marathon/js/feedback.js"></script>

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

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
    const mode = SLUG_ARG ? `SINGLE: ${SLUG_ARG}` : IS_TEST ? 'TEST (1 skin)' : IS_DRYRUN ? 'DRY RUN' : 'FULL';
    console.log(`\n=== ssg-runner-skins.js [${mode}] ===\n`);

    // 1. Fetch all skins
    console.log('Fetching skin list from API...');
    let skins;
    try {
        skins = await fetchAllSkins();
    } catch (err) {
        console.error('FATAL: Could not fetch skin list:', err.message);
        process.exit(1);
    }
    console.log(`  Found ${skins.length} skin(s)\n`);

    if (SLUG_ARG) {
        skins = skins.filter(s => s.slug === SLUG_ARG);
        if (skins.length === 0) {
            console.error(`FATAL: Slug "${SLUG_ARG}" not found in API`);
            process.exit(1);
        }
        console.log(`  SINGLE MODE: processing only "${SLUG_ARG}"\n`);
    } else if (IS_TEST) {
        skins = skins.slice(0, 1);
        console.log(`  TEST MODE: processing only "${skins[0].slug}"\n`);
    }

    // 2. Process each skin
    let written = 0, failed = 0;

    for (const skin of skins) {
        const slug     = skin.slug;
        const outPath  = path.join(OUTPUT_DIR, 'runner-skins', slug, 'index.html');

        // Fetch detail
        let detail;
        try {
            detail = await fetchSkinDetail(slug);
            if (!detail) throw new Error('API returned no data');
        } catch (err) {
            console.error(`  [FAIL]  ${slug} — detail fetch failed: ${err.message}`);
            failed++;
            continue;
        }

        // Generate HTML
        let html;
        try {
            html = generateSkinDetailPage(detail, skins);
        } catch (err) {
            console.error(`  [FAIL]  ${slug} — HTML generation failed: ${err.message}`);
            failed++;
            continue;
        }

        // Write (or dry-run)
        if (IS_DRYRUN) {
            console.log(`  [DRY]   ${slug} → ${outPath}`);
        } else {
            try {
                writeFile(outPath, html);
                console.log(`  [WRITE] ${slug} → runner-skins/${slug}/index.html`);
            } catch (err) {
                console.error(`  [FAIL]  ${slug} — write failed: ${err.message}`);
                failed++;
                continue;
            }
        }
        written++;
    }

    // 3. Summary
    console.log(`\n─── Summary ────────────────────────────`);
    console.log(`  Written:  ${written}`);
    console.log(`  Failed:   ${failed}`);
    console.log(`────────────────────────────────────────\n`);

    if (failed > 0) process.exit(1);
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
