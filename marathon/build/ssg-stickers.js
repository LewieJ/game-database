/**
 * ssg-stickers.js
 * Standalone SSG for Marathon Sticker detail pages.
 *
 * Generates: stickers/{slug}/index.html for every sticker in the API.
 *
 * Usage:
 *   node build/ssg-stickers.js            — full run (all stickers)
 *   node build/ssg-stickers.js --test     — process one sticker only
 *   node build/ssg-stickers.js --dry-run  — log actions, write nothing
 *   node build/ssg-stickers.js --slug=X   — build a single sticker by slug
 *
 * API:  https://weaponstickers.marathondb.gg
 */

'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { generateNavigation: _sharedNav } = require('./shared-nav');
const { generateFooter } = require('./site-footer');

// ─── Configuration ────────────────────────────────────────────────────────

const API_BASE   = 'https://weaponstickers.marathondb.gg';
const SITE_URL   = 'https://marathondb.gg';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'stickers');

const IS_TEST   = process.argv.includes('--test');
const IS_DRYRUN = process.argv.includes('--dry-run');
const SLUG_ARG  = (process.argv.find(a => a.startsWith('--slug=')) || '').replace('--slug=', '') || null;

// ─── Label Maps ───────────────────────────────────────────────────────────

const RARITY_CSS = {
    common:    'common',
    uncommon:  'uncommon',
    rare:      'rare',
    epic:      'epic',
    legendary: 'legendary',
    exotic:    'exotic'
};

const SOURCE_LABELS = {
    store:       'In-Game Store',
    battlepass:  'Battle Pass',
    event:       'Limited Event',
    codex:       'Codex',
    free:        'Free',
    unknown:     'Unknown'
};

// ─── HTTP helpers ─────────────────────────────────────────────────────────

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        proto.get(url, { headers: { 'User-Agent': 'marathondb-ssg-stickers/1.0' } }, (res) => {
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

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
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
    return `${API_BASE}/${imgPath.replace(/^\//, '')}`;
}

// ─── API helpers ──────────────────────────────────────────────────────────

async function fetchAllStickers() {
    const url = `${API_BASE}/api/stickers?_nocache=${Date.now()}`;
    console.log('  Fetching stickers...');
    const json = await fetchJSON(url);
    if (!json.data) throw new Error('Stickers API returned no data');
    return json.data;
}

// ─── Navigation ───────────────────────────────────────────────────────────

function generateNavigation() {
    return _sharedNav('stickers');
}

// ─── Footer: site-footer.js (generateFooter) ───────────────────────────────

// ─── Detail helpers ───────────────────────────────────────────────────────

function buildDetailRows(sticker) {
    const rows = [];
    const rarity = sticker.rarity || 'common';
    const rarityCss = RARITY_CSS[rarity] || 'common';
    const isLimited = !!sticker.available_until;
    const sourceLabel = SOURCE_LABELS[sticker.source_type] || capitalize(sticker.source_type || '');

    rows.push(`<div class="sd-row"><span class="sd-row-label">Rarity</span><span class="sd-row-value"><span class="sd-tag sd-rarity-${rarityCss}">${capitalize(rarity)}</span></span></div>`);
    if (isLimited) rows.push(`<div class="sd-row"><span class="sd-row-label">Availability</span><span class="sd-row-value"><span class="sd-tag sd-tag-limited">Limited</span></span></div>`);
    if (sticker.is_animated) rows.push(`<div class="sd-row"><span class="sd-row-label">Animated</span><span class="sd-row-value">Yes</span></div>`);
    if (sourceLabel) rows.push(`<div class="sd-row"><span class="sd-row-label">Source</span><span class="sd-row-value">${escapeHtml(sourceLabel)}</span></div>`);
    if (sticker.season_name) rows.push(`<div class="sd-row"><span class="sd-row-label">Season</span><span class="sd-row-value">${escapeHtml(sticker.season_name)}</span></div>`);
    if (sticker.faction_name) rows.push(`<div class="sd-row"><span class="sd-row-label">Faction</span><span class="sd-row-value">${escapeHtml(sticker.faction_name)}</span></div>`);

    return rows.join('\n                        ');
}

function buildStoreRows(sticker) {
    const rows = [];
    if (sticker.source_type === 'store' && sticker.price) {
        rows.push(`<div class="sd-row"><span class="sd-row-label">Price</span><span class="sd-row-value">${escapeHtml(sticker.price.toLocaleString())} ${escapeHtml(sticker.currency || 'Credits')}</span></div>`);
    }
    if (sticker.source_type === 'battlepass' && sticker.battlepass_tier) {
        rows.push(`<div class="sd-row"><span class="sd-row-label">Battle Pass Tier</span><span class="sd-row-value">Tier ${sticker.battlepass_tier}</span></div>`);
    }
    if (sticker.available_from) {
        rows.push(`<div class="sd-row"><span class="sd-row-label">Available From</span><span class="sd-row-value">${escapeHtml(formatDate(sticker.available_from))}</span></div>`);
    }
    if (sticker.available_until) {
        rows.push(`<div class="sd-row"><span class="sd-row-label">Available Until</span><span class="sd-row-value">${escapeHtml(formatDate(sticker.available_until))}</span></div>`);
    }
    return rows.join('\n                        ');
}

function buildQuickNav(allStickers, currentIdx) {
    const prev = currentIdx > 0 ? allStickers[currentIdx - 1] : allStickers[allStickers.length - 1];
    const next = currentIdx < allStickers.length - 1 ? allStickers[currentIdx + 1] : allStickers[0];
    return `
            <nav class="sd-quick-nav" style="display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center; padding:24px 0; border-top:1px solid var(--border); margin-top:8px;">
                <a href="/marathon/stickers/${escapeHtml(prev.slug)}/" style="display:flex; align-items:center; gap:8px; text-decoration:none; color:var(--text-primary); padding:12px 16px; border:1px solid var(--border); border-radius:var(--radius-lg); transition:all .2s;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
                    <span><span style="display:block; font-size:0.7rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.05em;">Previous</span><span style="font-size:0.85rem; font-weight:600;">${escapeHtml(prev.name)}</span></span>
                </a>
                <a href="/marathon/stickers/" style="font-size:0.78rem; font-weight:700; color:var(--text-dim); text-decoration:none; text-transform:uppercase; letter-spacing:0.06em;">All Stickers</a>
                <a href="/marathon/stickers/${escapeHtml(next.slug)}/" style="display:flex; align-items:center; gap:8px; text-decoration:none; color:var(--text-primary); padding:12px 16px; border:1px solid var(--border); border-radius:var(--radius-lg); justify-content:flex-end; text-align:right; transition:all .2s;">
                    <span><span style="display:block; font-size:0.7rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.05em;">Next</span><span style="font-size:0.85rem; font-weight:600;">${escapeHtml(next.name)}</span></span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                </a>
            </nav>`;
}

function buildRelatedSection(sticker, allStickers) {
    // Related = same faction, or just other stickers if no faction
    const siblings = allStickers
        .filter(s => s.slug !== sticker.slug && (sticker.faction_slug ? s.faction_slug === sticker.faction_slug : true))
        .slice(0, 6);
    if (siblings.length === 0) return '';

    const cards = siblings.map(s => {
        const img = resolveImage(s.image_preview_url || s.image_url || '');
        const rarity = s.rarity || 'common';
        return `<a href="/stickers/${escapeHtml(s.slug)}/" class="sd-skin-card">
                        <div class="sd-skin-card-img">${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(s.name)}" loading="lazy">` : '<span class="sd-skin-card-placeholder"></span>'}</div>
                        <div class="sd-skin-card-info">
                            <span class="sd-skin-card-name">${escapeHtml(s.name)}</span>
                            <span class="sd-skin-card-rarity sd-rarity-${RARITY_CSS[rarity] || 'common'}">${capitalize(rarity)}</span>
                        </div>
                    </a>`;
    }).join('\n                    ');

    const title = sticker.faction_name ? `${escapeHtml(sticker.faction_name)} Stickers` : 'Related Stickers';
    return `
            <section class="sd-related" id="relatedItemsSection">
                <h2 class="sd-section-title">${title}</h2>
                <div class="sd-related-grid" id="relatedItemsGrid">
                    ${cards}
                </div>
            </section>`;
}

// ─── Page generator ───────────────────────────────────────────────────────

function generateStickerPage(sticker, allStickers, idx) {
    const slug   = sticker.slug;
    const name   = sticker.name || slug;
    const rarity = sticker.rarity || 'common';
    const rarityCss  = RARITY_CSS[rarity] || 'common';
    const isLimited  = !!sticker.available_until;
    const canonicalUrl = `${SITE_URL}/stickers/${slug}/`;

    // Images
    const fullImg    = resolveImage(sticker.image_url || '');
    const previewImg = resolveImage(sticker.image_preview_url || sticker.image_url || '');
    const ogImage    = fullImg || previewImg || `https://gdb.gg/assets/icons/marathon.svg`;

    // SEO
    const acqText  = sticker.acquisition_detail || sticker.acquisition_summary || '';
    const metaDesc = acqText
        ? `${name} ${capitalize(rarity)} weapon sticker in Marathon. ${acqText}`
        : `${name} is a ${rarity} weapon sticker in Marathon. View details on MarathonDB.`;
    const metaTitle = `${escapeHtml(name)} - Marathon Sticker | MarathonDB`;
    const keywords  = [name, `Marathon ${name}`, `how to get ${name}`, 'Marathon stickers', `${rarity} Marathon sticker`, 'Marathon sticker guide'].map(escapeHtml).join(', ');

    // Content blocks
    const detailRowsHtml = buildDetailRows(sticker);
    const storeRowsHtml  = buildStoreRows(sticker);
    const hasStoreData   = storeRowsHtml.length > 0;
    const relatedHtml    = buildRelatedSection(sticker, allStickers);
    const quickNavHtml   = buildQuickNav(allStickers, idx);

    const limitedBadge = isLimited ? '<span class="sd-tag sd-tag-limited">Limited</span>' : '';
    const descHtml = sticker.description ? `<p class="sd-desc-text">${escapeHtml(sticker.description)}</p>` : '';
    const flavorHtml = sticker.flavor_text ? `<p class="sd-flavor-text"><em>${escapeHtml(sticker.flavor_text)}</em></p>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metaTitle}</title>
    <meta name="description" content="${escapeHtml(metaDesc).slice(0, 160)}">
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
    <meta property="og:description" content="${escapeHtml(metaDesc).slice(0, 160)}">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta property="og:site_name" content="MarathonDB">
    <meta property="og:locale" content="en_US">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@MarathonDB">
    <meta name="twitter:title" content="${metaTitle}">
    <meta name="twitter:description" content="${escapeHtml(metaDesc).slice(0, 160)}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">

    <link rel="stylesheet" href="/marathon/css/style.css">
    <link rel="stylesheet" href="/marathon/css/pages.css">
    <link rel="stylesheet" href="/marathon/css/auth.css">

    <!-- Structured Data -->
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Thing",
  "name": "${escapeHtml(name)} - Marathon Sticker",
  "description": "${escapeHtml((sticker.description || `${name} weapon sticker for Marathon.`).slice(0, 200))}",
  "image": "${escapeHtml(ogImage)}",
  "url": "${canonicalUrl}"}
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
      "item": "${SITE_URL}/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Stickers",
      "item": "${SITE_URL}/stickers/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "${escapeHtml(name)}",
      "item": "${canonicalUrl}"
    }
  ]
}
    </script>
</head>
<body>
    ${generateNavigation()}

    <main class="sd-page">
<!-- ═══ PAGE-LEVEL AD WRAPPER (siderails + content) ═══ -->
    <div class="ad-page-wrapper">

        <!-- Left Siderail Ad -->
        <aside class="ad-siderail ad-siderail--left">
            <div class="ad-siderail-sticky">
                <span class="ad-label">Ad</span>
                <div class="ad-container">
                </div>
            </div>
        </aside>

        <!-- Main Page Content -->
        <div class="sd-page-content">

        <!-- ═══ HERO SECTION ═══ -->
        <section class="sd-hero" data-rarity="${rarityCss}">
            <div class="sd-hero-bg"></div>
            <div class="sd-hero-inner">
                <!-- Left: Image Preview -->
                <div class="sd-hero-preview">
                    <div class="sd-preview-frame" id="previewBox" data-rarity="${rarityCss}">
                        ${previewImg ? `<img id="cosmeticImage" src="${escapeHtml(previewImg)}" alt="${escapeHtml(name)} preview" data-full="${escapeHtml(fullImg || previewImg)}">` : `<div class="sd-preview-placeholder" id="cosmeticImage"></div>`}
                        <button class="sd-preview-expand" id="fullscreenBtn" title="View full image">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                        </button>
                        <!-- Hidden gallery data -->
                        <div id="galleryData" style="display:none">
                            <span data-src="${escapeHtml(previewImg)}" data-full="${escapeHtml(fullImg || previewImg)}"></span>
                        </div>
                    </div>
                </div>

                <!-- Right: Title + Stats -->
                <div class="sd-hero-info">
                    <nav class="breadcrumb sd-breadcrumb">
                        <a href="/marathon/">Home</a> /
                        <a href="/marathon/stickers/">Stickers</a> /
                        <span>${escapeHtml(name)}</span>
                    </nav>

                    <div class="sd-title-block">
                        <h1 class="sd-skin-name">${escapeHtml(name)}</h1>
                        <div class="sd-subtitle-row">
                            <span class="sd-rarity-badge sd-rarity-${rarityCss}">${capitalize(rarity)}</span>
                            ${limitedBadge}
                            <span class="sd-subtitle-sep"></span>
                            <button id="shareTwitter" class="sd-action-btn" title="Share on X">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </button>
                            <button id="shareDiscord" class="sd-action-btn" title="Copy for Discord">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                            </button>
                            <button id="shareCopy" class="sd-action-btn" title="Copy link">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Share Toast -->
                    <div id="rsdShareToast" class="sd-share-toast" aria-live="polite"></div>

                    ${descHtml}
                    ${flavorHtml}

                    <!-- How to Unlock -->
                    <div class="sd-acquisition sd-acquisition--hero">
                        <div class="sd-acquisition-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </div>
                        <div class="sd-acquisition-content">
                            <span class="sd-acquisition-label">How to Unlock ${escapeHtml(name)}</span>
                            <p class="sd-acquisition-text">${acqText ? escapeHtml(acqText) : 'Details coming soon.'}</p>
                        </div>
                    </div>

                    <!-- Community Rating -->
                    <div class="sd-rating-hero sd-rating-compact">
                        <div id="cosmeticHeatWidget" data-cosmetic-slug="${escapeHtml(slug)}" data-cosmetic-type="sticker" data-cosmetic-name="${escapeHtml(name)}"></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ═══ INFO BODY ═══ -->
        <div class="sd-body">

            <!-- Info Cards Grid -->
            <div class="sd-cards-grid">

                <!-- Details Card -->
                <div class="sd-card">
                    <h3 class="sd-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                        Details
                    </h3>
                    <div class="sd-card-rows" id="detailRows">
                        ${detailRowsHtml}
                    </div>
                </div>

                <!-- Acquisition / Store Card -->
                <div id="storeInfoCard" class="sd-card">
                    <h3 class="sd-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                        In Game Store Info
                    </h3>
                    <div class="sd-card-rows" id="storeRows">
                        ${hasStoreData ? storeRowsHtml : `
                        <div class="sd-store-fallback" id="storeFallback">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <span>No in-game store data available yet. Check back later!</span>
                        </div>`}
                    </div>
                </div>

                <!-- Release Info Card (populated by API at runtime) -->
                <div id="releaseInfoCard" class="sd-card" style="display:none">
                    <h3 class="sd-card-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Release Info
                    </h3>
                    <div class="sd-card-rows" id="releaseRows"></div>
                </div>
            </div>

            <!-- Related Links (faction browse) -->
            <div id="relatedLinks" class="sd-related-links" style="${sticker.faction_slug ? '' : 'display:none'}">
                ${sticker.faction_slug ? `<a href="/marathon/stickers/?faction=${escapeHtml(sticker.faction_slug)}" class="sd-link-card">
                    <div class="sd-link-icon sd-link-icon--collection"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>
                    <div class="sd-link-text"><span class="sd-link-name">${escapeHtml(sticker.faction_name || sticker.faction_slug)}</span><span class="sd-link-hint">Browse faction stickers &rarr;</span></div>
                </a>` : ''}
            </div>

            ${relatedHtml}

            <!-- Mid-content Ad -->

            ${quickNavHtml}
        </div>
        </div><!-- /sd-page-content -->

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

    <script src="/marathon/js/api.js"></script>
    <script src="/marathon/js/search.js"></script>
    <script src="/marathon/js/cosmetic-ratings.js"></script>
    <script src="/marathon/js/mobile-nav.js"></script>
    <script src="/marathon/js/auth.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var COSMETIC_SLUG = '${escapeJs(slug)}';
            var STICKER_API  = 'https://weaponstickers.marathondb.gg';

            // ─── Share buttons ───
            document.getElementById('shareTwitter')?.addEventListener('click', function() {
                var text = 'Check out ${escapeJs(name)} (${escapeJs(capitalize(rarity))} Sticker) on MarathonDB!';
                window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(window.location.href), '_blank', 'width=550,height=420');
            });

            var _toastTimer;
            function showShareToast(message, type) {
                var toast = document.getElementById('rsdShareToast');
                if (!toast) return;
                toast.textContent = '';
                var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                svg.setAttribute('width','14'); svg.setAttribute('height','14'); svg.setAttribute('viewBox','0 0 24 24');
                svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','2');
                var p = document.createElementNS('http://www.w3.org/2000/svg','path');
                p.setAttribute('d','M20 6 9 17l-5-5'); svg.appendChild(p);
                toast.appendChild(svg);
                toast.appendChild(document.createTextNode(message));
                toast.className = 'sd-share-toast ' + type;
                void toast.offsetWidth;
                toast.classList.add('visible');
                clearTimeout(_toastTimer);
                _toastTimer = setTimeout(function() { toast.classList.remove('visible'); }, 2200);
            }

            document.getElementById('shareDiscord')?.addEventListener('click', async function() {
                try {
                    var md = '**${escapeJs(name)}** \u2014 ${escapeJs(capitalize(rarity))} Weapon Sticker\\n' + window.location.href;
                    await navigator.clipboard.writeText(md);
                    this.classList.add('copied');
                    showShareToast('Discord text copied!', 'toast-discord');
                    setTimeout(() => this.classList.remove('copied'), 2200);
                } catch(e) { console.error('Copy failed', e); }
            });

            document.getElementById('shareCopy')?.addEventListener('click', async function() {
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    this.classList.add('copied');
                    showShareToast('Link copied to clipboard!', 'toast-copy');
                    setTimeout(() => this.classList.remove('copied'), 2200);
                } catch(e) { console.error('Copy failed', e); }
            });

            // ─── Gallery ───
            var galleryData  = document.querySelectorAll('#galleryData span');
            var mainImg      = document.getElementById('cosmeticImage');
            var galleryNav   = document.getElementById('galleryNav');
            var galleryIdx   = 0;
            if (galleryData.length <= 1 && galleryNav) galleryNav.style.display = 'none';

            function showGalleryImage(idx) {
                if (!galleryData[idx] || !mainImg) return;
                galleryIdx = idx;
                mainImg.src = galleryData[idx].dataset.src;
                mainImg.dataset.full = galleryData[idx].dataset.full || galleryData[idx].dataset.src;
            }
            document.getElementById('galleryPrev')?.addEventListener('click', e => { e.stopPropagation(); showGalleryImage((galleryIdx - 1 + galleryData.length) % galleryData.length); });
            document.getElementById('galleryNext')?.addEventListener('click', e => { e.stopPropagation(); showGalleryImage((galleryIdx + 1) % galleryData.length); });

            // ─── Lightbox ───
            function openLightbox(src) {
                var overlay = document.createElement('div');
                overlay.className = 'ws-lightbox-overlay';
                overlay.innerHTML = '<div class="ws-lightbox-content"><img src="' + src + '" alt="Full size preview"><button class="ws-lightbox-close">&times;</button></div>';
                document.body.appendChild(overlay);
                requestAnimationFrame(() => overlay.classList.add('active'));
                overlay.addEventListener('click', ev => {
                    if (ev.target === overlay || ev.target.classList.contains('ws-lightbox-close')) {
                        overlay.classList.remove('active');
                        setTimeout(() => overlay.remove(), 200);
                    }
                });
            }
            var fsBtn = document.getElementById('fullscreenBtn');
            var img   = document.getElementById('cosmeticImage');
            if (fsBtn && img) fsBtn.addEventListener('click', e => { e.stopPropagation(); openLightbox(img.dataset.full || img.src); });
            var previewBox = document.getElementById('previewBox');
            if (previewBox && img) previewBox.addEventListener('click', e => { if (e.target.closest('.sd-preview-expand')) return; openLightbox(img.dataset.full || img.src); });

            // ─── Rating widget ───
            var widget = document.getElementById('cosmeticHeatWidget');
            if (widget && typeof EmojiRatingWidget !== 'undefined') {
                new EmojiRatingWidget(widget, widget.dataset.cosmeticSlug, {
                    cosmeticType: widget.dataset.cosmeticType || 'sticker',
                    skinName: widget.dataset.cosmeticName
                });
            }

            // ─── Helpers ───
            function formatDate(s) {
                if (!s) return null;
                var d = new Date(s);
                return isNaN(d) ? s : d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
            }
            function makeRow(label, valueHtml) {
                var row = document.createElement('div');
                row.className = 'sd-row';
                row.innerHTML = '<span class="sd-row-label">' + label + '</span><span class="sd-row-value">' + valueHtml + '</span>';
                return row;
            }

            // ─── Runtime API enrichment ───
            async function enrichFromAPI() {
                try {
                    var resp = await fetch(STICKER_API + '/api/stickers/' + COSMETIC_SLUG);
                    var json = await resp.json();
                    if (!json.success || !json.data) return;
                    var d = json.data;

                    // Update acquisition text if richer data is available
                    if (d.acquisition_detail) {
                        var acqEl = document.querySelector('.sd-acquisition-text');
                        if (acqEl) acqEl.textContent = d.acquisition_detail;
                    }

                    // Store/battlepass pricing
                    var storeRows = document.getElementById('storeRows');
                    var storeFallback = document.getElementById('storeFallback');
                    var hasStore = false;
                    if (d.source_type === 'store' && d.price && storeRows) {
                        storeRows.appendChild(makeRow('Price', (d.price.toLocaleString()) + ' ' + (d.currency || 'Credits'))); hasStore = true;
                    }
                    if (d.source_type === 'battlepass' && d.battlepass_tier && storeRows) {
                        storeRows.appendChild(makeRow('Battle Pass Tier', 'Tier ' + d.battlepass_tier)); hasStore = true;
                    }
                    if (d.available_from && storeRows) {
                        storeRows.appendChild(makeRow('Available From', formatDate(d.available_from))); hasStore = true;
                    }
                    if (d.available_until && storeRows) {
                        storeRows.appendChild(makeRow('Available Until', formatDate(d.available_until))); hasStore = true;
                    }
                    if (hasStore && storeFallback) storeFallback.style.display = 'none';

                    // Release / season info
                    if (d.season_name) {
                        var releaseCard = document.getElementById('releaseInfoCard');
                        var releaseRows = document.getElementById('releaseRows');
                        if (releaseCard && releaseRows) {
                            releaseRows.appendChild(makeRow('Season', d.season_name + (d.season_version ? ' (v' + d.season_version + ')' : '')));
                            releaseCard.style.display = '';
                        }
                    }
                } catch(err) { console.warn('Sticker API enrichment failed:', err); }
            }
            enrichFromAPI();
        });
    </script>
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

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n  \u2550\u2550\u2550 Stickers SSG \u2550\u2550\u2550\n');
    console.log(`  API:     ${API_BASE}`);
    console.log(`  Output:  ${OUTPUT_DIR}`);

    const mode = SLUG_ARG ? `Single: ${SLUG_ARG}` : IS_TEST ? 'TEST (1 sticker)' : IS_DRYRUN ? 'DRY RUN' : 'FULL RUN';
    console.log(`  Mode:    ${mode}\n`);

    let allStickers = await fetchAllStickers();
    console.log(`  \u2713 Fetched ${allStickers.length} stickers from API\n`);

    let toProcess = allStickers;
    if (SLUG_ARG) toProcess = allStickers.filter(s => s.slug === SLUG_ARG);
    else if (IS_TEST) toProcess = allStickers.slice(0, 1);

    if (toProcess.length === 0) {
        console.log(`  \u2717 No sticker found with slug: ${SLUG_ARG}`);
        process.exit(1);
    }

    console.log(`  Processing ${toProcess.length} sticker(s)...\n`);

    let built = 0, skipped = 0, failed = 0;

    for (const sticker of toProcess) {
        const idx = allStickers.indexOf(sticker);
        try {
            const html = generateStickerPage(sticker, allStickers, idx);
            const outPath = path.join(OUTPUT_DIR, sticker.slug, 'index.html');
            const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);

            if (!IS_DRYRUN) writeFile(outPath, html);
            console.log(`  \u2713 ${sticker.slug}/ (${kb} KB)`);
            built++;
        } catch (err) {
            console.error(`  \u2717 ${sticker.slug}: ${err.message}`);
            failed++;
        }
    }

    const elapsed = (process.uptime()).toFixed(1);
    console.log(`\n  \u2500\u2500 Done in ${elapsed}s \u2500\u2500`);
    console.log(`  \u2713 ${built} built  |  \u2014 ${skipped} skipped  |  \u2717 ${failed} failed  |  Total: ${built + skipped + failed}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
