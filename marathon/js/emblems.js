/**
 * Emblems – listing + modal detail page
 * API: https://emblems.marathondb.gg
 * Pattern: modelled after implants.js (modal with ?emblem=slug)
 */

const EMBLEMS_API = 'https://emblems.marathondb.gg';

const RARITY_ORDER = { prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };

const SOURCE_LABELS = {
    free: 'Free',
    codex: 'Codex Reward',
    battlepass: 'Battle Pass',
    store: 'Store',
    event: 'Limited Event',
    ranked: 'Ranked Reward',
    unknown: 'Unknown'
};

const EMOJI_MAP = [
    { key: 'fire',  emoji: '\u{1F525}', value: 5, label: 'Fire',  color: '#ff4500' },
    { key: 'love',  emoji: '\u{1F60D}', value: 4, label: 'Love',  color: '#ff69b4' },
    { key: 'meh',   emoji: '\u{1F610}', value: 3, label: 'Meh',   color: '#ffa500' },
    { key: 'nah',   emoji: '\u{1F44E}', value: 2, label: 'Nah',   color: '#808080' },
    { key: 'trash', emoji: '\u{1F5D1}', value: 1, label: 'Trash', color: '#8b4513' }
];

const VOTE_KEY_MAP = { 5: 'fire', 4: 'love', 3: 'meh', 2: 'nah', 1: 'trash' };

// ─── State ────────────────────────────────────────────────
let allEmblems = [];
let filteredEmblems = [];
let currentSort = 'featured';
let currentEmblemSlug = null;

// ─── Helpers ──────────────────────────────────────────────

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getDeviceToken() {
    const key = 'marathondb_device_token';
    let token = localStorage.getItem(key);
    if (token && /^[a-zA-Z0-9-]{20,64}$/.test(token)) return token;
    token = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(36).padStart(2, '0')).join('').substring(0, 48);
    localStorage.setItem(key, token);
    return token;
}

function emblemImageUrl(emblem) {
    if (!emblem || !emblem.image_url) return null;
    if (emblem.image_url.startsWith('http')) return emblem.image_url;
    const path = emblem.image_url.replace(/^\/+/, '');
    return `${EMBLEMS_API}/${path}`;
}

// ─── API ──────────────────────────────────────────────────

async function fetchEmblems() {
    // Try build-time prefetch.json first (avoids live API call)
    try {
        const prefetchRes = await fetch('/marathon/emblems/prefetch.json', { cache: 'force-cache' });
        if (prefetchRes.ok) {
            const arr = await prefetchRes.json();
            if (Array.isArray(arr) && arr.length) return arr;
        }
    } catch { /* fall through to live API */ }

    const res = await fetch(`${EMBLEMS_API}/api/emblems`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    return json.data || [];
}

async function fetchEmblemDetail(slug) {
    const res = await fetch(`${EMBLEMS_API}/api/emblems/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    return json.data || null;
}

async function submitEmblemRating(slug, rating) {
    const res = await fetch(`${EMBLEMS_API}/api/emblems/${encodeURIComponent(slug)}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, device_token: getDeviceToken() })
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
}

// ─── Load & Display ───────────────────────────────────────

async function loadEmblems() {
    try {
        allEmblems = await fetchEmblems();
        document.getElementById('totalCount').textContent = `(${allEmblems.length})`;
        filterAndSortEmblems();
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('resultsSection').style.display = '';
    } catch (err) {
        console.error('Failed to load emblems:', err);
        document.getElementById('loadingState').innerHTML =
            '<h3>Failed to load emblems</h3><p>Please try refreshing the page</p><button class="btn-retry" onclick="location.reload()">Retry</button>';
    }
}

function filterAndSortEmblems() {
    const searchVal = (document.getElementById('emblemSearch')?.value || '').toLowerCase().trim();
    const activeSource = document.querySelector('#sourceTypeTabs .category-tab-sm.active');
    const sourceFilter = activeSource ? activeSource.dataset.source : '';

    filteredEmblems = allEmblems.filter(e => {
        if (searchVal && !(e.name || '').toLowerCase().includes(searchVal) &&
            !(e.description || '').toLowerCase().includes(searchVal) &&
            !(e.acquisition_summary || '').toLowerCase().includes(searchVal)) return false;
        if (sourceFilter && e.source_type !== sourceFilter) return false;
        return true;
    });

    sortEmblems();
    displayEmblems(filteredEmblems);
}

function sortEmblems() {
    const sort = currentSort;
    filteredEmblems.sort((a, b) => {
        switch (sort) {
            case 'name-asc': return (a.name || '').localeCompare(b.name || '');
            case 'name-desc': return (b.name || '').localeCompare(a.name || '');
            case 'rarity-desc': return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0) || (a.name || '').localeCompare(b.name || '');
            case 'rarity-asc': return (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0) || (a.name || '').localeCompare(b.name || '');
            case 'newest': return (b.id || 0) - (a.id || 0);
            case 'rating': {
                const ra = a.rating?.score_percent ?? -1;
                const rb = b.rating?.score_percent ?? -1;
                return rb - ra || (a.name || '').localeCompare(b.name || '');
            }
            default: // featured – rarity desc then name
                return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0) || (a.name || '').localeCompare(b.name || '');
        }
    });
}

function formatVoteCount(n) {
    if (!n || n === 0) return '\u2014';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

function buildHeatStrip(emblem) {
    const slug = emblem.slug || '';
    const savedVote = localStorage.getItem(`mdb_emb_vote_${slug}`);

    const emojiBtns = EMOJI_MAP.map(e => {
        const dist = emblem.rating?.distribution;
        const count = dist ? (dist[e.key]?.count ?? 0) : 0;
        const isVoted = savedVote === String(e.value) ? ' voted' : '';
        return `<button class="cw-heat-emoji${isVoted}" data-val="${e.value}" data-slug="${escapeAttr(slug)}" title="${e.label}">
                    <span class="cw-emoji-icon">${e.emoji}</span>
                    <span class="cw-emoji-count" data-rating-count="${e.value}">${formatVoteCount(count)}</span>
                </button>`;
    }).join('');

    return `<div class="cw-heat-strip" data-slug="${escapeAttr(slug)}">
                <div class="cw-heat-fill"></div>
                <div class="cw-heat-emojis">${emojiBtns}</div>
            </div>`;
}

function displayEmblems(emblems) {
    const grid = document.getElementById('emblemsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;

    if (!emblems || emblems.length === 0) {
        grid.innerHTML = '';
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = '';
        return;
    }

    grid.style.display = '';
    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = emblems.map(emblem => {
        const rarity = (emblem.rarity || 'standard').toLowerCase();
        const slug = emblem.slug || '';
        const imgSrc = emblemImageUrl(emblem);
        const sourceLabel = SOURCE_LABELS[emblem.source_type] || capitalizeFirst(emblem.source_type || '');

        return `
            <div class="emblem-card ${rarity}" data-slug="${escapeAttr(slug)}" role="button" tabindex="0">
                <div class="implant-card-glow"></div>
                <div class="emblem-card-image">
                    ${imgSrc
                        ? `<img src="${imgSrc}" alt="${escapeHtml(emblem.name)}" loading="lazy">`
                        : `<div class="emblem-card-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg></div>`
                    }
                    <div class="emblem-hover-overlay">
                        <span class="emblem-view-btn">View all details \u2192</span>
                    </div>
                </div>
                <div class="emblem-card-content">
                    <div class="emblem-card-header">
                        <span class="implant-rarity-tag ${rarity}">${capitalizeFirst(rarity)}</span>
                        <span class="emblem-source-tag ${emblem.source_type || ''}">${escapeHtml(sourceLabel)}</span>
                    </div>
                    <div class="emblem-card-name">${escapeHtml(emblem.name || 'Unknown')}</div>
                    <div class="emblem-card-footer-row">
                        ${emblem.season ? `<span class="emblem-card-season">${escapeHtml(emblem.season)}</span>` : ''}
                        ${!emblem.is_obtainable ? '<span class="emblem-card-legacy">Legacy</span>' : ''}
                    </div>
                </div>
                ${buildHeatStrip(emblem)}
            </div>
        `;
    }).join('');

    attachHeatEmojiHandlers();
}

// ─── Heat Strip Handlers ──────────────────────────────────

function attachHeatEmojiHandlers() {
    document.querySelectorAll('.cw-heat-emoji').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const slug = btn.dataset.slug;
            const rating = parseInt(btn.dataset.val);
            if (!slug || isNaN(rating) || rating < 1 || rating > 5) return;

            const strip = btn.closest('.cw-heat-strip');
            strip.querySelectorAll('.cw-heat-emoji').forEach(b => b.classList.remove('voted'));
            btn.classList.add('voted');

            localStorage.setItem(`mdb_emb_vote_${slug}`, String(rating));

            try {
                const result = await submitEmblemRating(slug, rating);
                if (result.success && result.aggregate) {
                    updateStripData(strip, result.aggregate);
                }
            } catch (err) {
                console.error('Heat strip vote failed:', err);
            }
        });
    });
}

function updateStripData(strip, aggregate) {
    if (!aggregate || !aggregate.distribution) return;
    for (let v = 1; v <= 5; v++) {
        const countEl = strip.querySelector(`[data-rating-count="${v}"]`);
        if (countEl) {
            const namedKey = VOTE_KEY_MAP[v];
            const d = aggregate.distribution[namedKey] || aggregate.distribution[v] || aggregate.distribution[String(v)];
            countEl.textContent = formatVoteCount(d ? (d.count ?? d) : 0);
        }
    }
}

// ─── Grid Click ───────────────────────────────────────────

function handleGridClick(e) {
    // Ignore clicks on heat strip buttons
    if (e.target.closest('.cw-heat-strip')) return;
    const card = e.target.closest('.emblem-card[data-slug]');
    if (card) openEmblemModal(card.dataset.slug);
}

function handleGridKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.emblem-card[data-slug]');
        if (card) { e.preventDefault(); openEmblemModal(card.dataset.slug); }
    }
}

// ─── Modal ────────────────────────────────────────────────

async function openEmblemModal(slug, skipPush) {
    if (!slug) return;
    currentEmblemSlug = slug;

    renderSeoDetailBlock(slug);

    const overlay = document.getElementById('emblemModal');
    if (!overlay) return;

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Push modal ads on first open
    if (!overlay._adsPushed) {
        overlay._adsPushed = true;
        setTimeout(() => {
            overlay.querySelectorAll('ins.adsbygoogle').forEach(() => {
                try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
            });
        }, 300);
    }

    // Reset loading state
    const nameEl = document.getElementById('emblemModalName');
    if (nameEl) nameEl.textContent = 'Loading...';
    document.getElementById('emblemModalDescription').textContent = '';
    document.getElementById('emblemModalBadges').innerHTML = '';
    document.getElementById('emblemModalQuickStats').innerHTML = '';
    document.getElementById('emblemModalIcon').src = '';
    document.getElementById('emblemModalFlavor').style.display = 'none';
    hideAllModalSections();

    if (!skipPush) {
        const url = new URL(window.location);
        url.searchParams.set('emblem', slug);
        history.pushState({ emblemSlug: slug }, '', url);
    }

    try {
        const emblem = await fetchEmblemDetail(slug);
        if (!emblem) {
            if (nameEl) nameEl.textContent = 'Emblem not found';
            return;
        }
        renderEmblemModal(emblem);
    } catch (err) {
        console.error('Failed to load emblem detail:', err);
        if (nameEl) nameEl.textContent = 'Error loading emblem';
    }
}

function closeEmblemModal(skipPush) {
    const overlay = document.getElementById('emblemModal');
    if (!overlay || !overlay.classList.contains('active')) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    currentEmblemSlug = null;

    removeSeoDetailBlock();

    // Remove breadcrumb extension
    const bc = document.getElementById('emblemDetailBreadcrumb');
    if (bc) {
        const prev = bc.previousElementSibling;
        if (prev && prev.tagName === 'svg') prev.remove();
        bc.remove();
    }

    if (skipPush !== true) {
        const url = new URL(window.location);
        url.searchParams.delete('emblem');
        history.pushState({}, '', url.pathname + (url.search || ''));
    }
}

function hideAllModalSections() {
    ['emblemModalAcquisitionSection', 'emblemModalRatingSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// ─── Modal Rendering ──────────────────────────────────────

function renderEmblemModal(emblem) {
    const rarity = (emblem.rarity || 'standard').toLowerCase();
    const imgSrc = emblemImageUrl(emblem);

    // Icon
    const iconImg = document.getElementById('emblemModalIcon');
    if (iconImg) {
        iconImg.src = imgSrc || '';
        iconImg.alt = `${emblem.name || 'Emblem'} – Marathon player emblem`;
    }

    const iconFrame = document.getElementById('emblemModalIconFrame');
    if (iconFrame) iconFrame.className = 'core-modal-icon-frame emblem-icon-frame ' + rarity;

    const glow = document.getElementById('emblemModalRarityGlow');
    if (glow) glow.className = 'core-modal-rarity-glow ' + rarity;

    // Name
    const nameEl = document.getElementById('emblemModalName');
    if (nameEl) nameEl.textContent = emblem.name || 'Unknown Emblem';

    // Description
    const descEl = document.getElementById('emblemModalDescription');
    if (descEl) descEl.textContent = emblem.description || '';

    // Flavor text
    const flavorEl = document.getElementById('emblemModalFlavor');
    if (flavorEl) {
        if (emblem.flavor_text) {
            flavorEl.textContent = `"${emblem.flavor_text}"`;
            flavorEl.style.display = '';
        } else {
            flavorEl.style.display = 'none';
        }
    }

    // Badges
    const sourceLabel = SOURCE_LABELS[emblem.source_type] || capitalizeFirst(emblem.source_type || '');
    const badgesEl = document.getElementById('emblemModalBadges');
    if (badgesEl) {
        badgesEl.innerHTML = `
            <span class="cd-badge cd-badge-rarity ${rarity}">${capitalizeFirst(rarity)}</span>
            <span class="cd-badge emblem-source-badge ${emblem.source_type || ''}">${escapeHtml(sourceLabel)}</span>
            ${!emblem.is_obtainable ? '<span class="cd-badge emblem-legacy-badge">Legacy</span>' : ''}
        `;
    }

    // Quick stats
    renderModalQuickStats(emblem);

    // Acquisition
    renderModalAcquisition(emblem);

    // Community rating
    renderModalRating(emblem);

    // Share buttons
    renderModalShare(emblem);

    // Meta
    renderModalMeta(emblem);
}

function renderModalQuickStats(emblem) {
    const stats = [];
    stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Rarity</span><span class="core-modal-qs-value">${capitalizeFirst(emblem.rarity || 'Standard')}</span></div>`);
    stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Source</span><span class="core-modal-qs-value">${escapeHtml(SOURCE_LABELS[emblem.source_type] || capitalizeFirst(emblem.source_type || 'Unknown'))}</span></div>`);
    if (emblem.season) {
        stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Season</span><span class="core-modal-qs-value">${escapeHtml(emblem.season)}</span></div>`);
    }
    if (emblem.price) {
        stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Price</span><span class="core-modal-qs-value">${emblem.price} ${escapeHtml(emblem.currency || '')}</span></div>`);
    }

    const qsEl = document.getElementById('emblemModalQuickStats');
    if (qsEl) qsEl.innerHTML = stats.join('');
}

function renderModalAcquisition(emblem) {
    const section = document.getElementById('emblemModalAcquisitionSection');
    const container = document.getElementById('emblemModalAcquisition');
    if (!section || !container) return;

    const parts = [];

    if (emblem.acquisition_summary) {
        parts.push(`<p class="emblem-acq-summary">${escapeHtml(emblem.acquisition_summary)}</p>`);
    }
    if (emblem.acquisition_detail) {
        parts.push(`<p class="emblem-acq-detail">${escapeHtml(emblem.acquisition_detail)}</p>`);
    }

    if (emblem.source_type === 'store' && emblem.price) {
        parts.push(`<div class="emblem-store-info"><span>${emblem.price} ${escapeHtml(emblem.currency || 'credits')}</span></div>`);
    }
    if (emblem.source_type === 'battlepass' && emblem.battlepass_tier) {
        parts.push(`<div class="emblem-bp-info">Tier ${emblem.battlepass_tier}</div>`);
    }

    if (!emblem.is_obtainable) {
        parts.push(`<div class="emblem-legacy-warning">\u26A0\uFE0F This emblem is no longer obtainable.</div>`);
    }

    if (!parts.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    container.innerHTML = parts.join('');
}

function renderModalRating(emblem) {
    const section = document.getElementById('emblemModalRatingSection');
    const container = document.getElementById('emblemModalRating');
    if (!section || !container) return;

    section.style.display = '';

    const rating = emblem.rating;
    const userVotes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
    const userVote = userVotes[emblem.slug];

    if (!rating || !rating.total_votes) {
        container.innerHTML = `
            <p class="emblem-rating-prompt">No ratings yet. Be the first!</p>
            <div class="emblem-rating-emojis">
                ${EMOJI_MAP.map(e => `
                    <button class="emblem-emoji-btn${userVote === e.value ? ' voted' : ''}" data-rating="${e.value}" data-slug="${escapeAttr(emblem.slug)}" title="${e.label}">
                        <span class="emblem-emoji-icon">${e.emoji}</span>
                        <span class="emblem-emoji-label">${e.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
        attachModalRatingHandlers(emblem.slug);
        return;
    }

    const dist = rating.distribution || {};

    container.innerHTML = `
        <div class="emblem-rating-summary">
            <span class="emblem-rating-score">${Math.round(rating.score_percent)}%</span>
            <span class="emblem-rating-votes">${rating.total_votes} vote${rating.total_votes === 1 ? '' : 's'}</span>
        </div>
        <div class="emblem-rating-bars">
            ${EMOJI_MAP.map(e => {
                const d = dist[e.key] || { count: 0, percent: 0 };
                return `
                    <button class="emblem-rating-bar-row${userVote === e.value ? ' voted' : ''}" data-rating="${e.value}" data-slug="${escapeAttr(emblem.slug)}" title="Vote ${e.label}">
                        <span class="emblem-emoji-icon">${e.emoji}</span>
                        <div class="emblem-bar-track">
                            <div class="emblem-bar-fill" style="width:${d.percent}%;background:${e.color}"></div>
                        </div>
                        <span class="emblem-bar-count">${d.count}</span>
                    </button>
                `;
            }).join('')}
        </div>
    `;
    attachModalRatingHandlers(emblem.slug);
}

function attachModalRatingHandlers(slug) {
    const container = document.getElementById('emblemModalRating');
    if (!container) return;

    container.querySelectorAll('[data-rating][data-slug]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const ratingVal = parseInt(btn.dataset.rating);
            if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) return;

            // Immediate visual feedback
            container.querySelectorAll('[data-rating]').forEach(b => b.classList.remove('voted'));
            btn.classList.add('voted');

            // Store locally
            const votes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
            votes[slug] = ratingVal;
            localStorage.setItem('marathondb_emoji_votes', JSON.stringify(votes));

            try {
                const result = await submitEmblemRating(slug, ratingVal);
                if (result.success && result.aggregate) {
                    // Update bars in-place
                    updateRatingBars(container, result.aggregate);
                    // Also update the card in the grid
                    updateCardScore(slug, result.aggregate.score_percent);
                }
            } catch (err) {
                console.error('Rating submit failed:', err);
            }
        });
    });
}

function updateRatingBars(container, aggregate) {
    const summaryScore = container.querySelector('.emblem-rating-score');
    const summaryVotes = container.querySelector('.emblem-rating-votes');
    if (summaryScore) summaryScore.textContent = `${Math.round(aggregate.score_percent)}%`;
    if (summaryVotes) summaryVotes.textContent = `${aggregate.total_votes} vote${aggregate.total_votes === 1 ? '' : 's'}`;

    const dist = aggregate.distribution || {};
    EMOJI_MAP.forEach(e => {
        const d = dist[e.key] || { count: 0, percent: 0 };
        const fill = container.querySelector(`.emblem-rating-bar-row[data-rating="${e.value}"] .emblem-bar-fill`);
        const count = container.querySelector(`.emblem-rating-bar-row[data-rating="${e.value}"] .emblem-bar-count`);
        if (fill) fill.style.width = `${d.percent}%`;
        if (count) count.textContent = d.count;
    });
}

function updateCardScore(slug, scorePercent) {
    // Update the listing data
    const emblem = allEmblems.find(e => e.slug === slug);
    if (emblem) {
        if (!emblem.rating) emblem.rating = {};
        emblem.rating.score_percent = scorePercent;
    }
    // Update the visible card
    const card = document.querySelector(`.emblem-card[data-slug="${CSS.escape(slug)}"]`);
    if (!card) return;
    let scoreEl = card.querySelector('.emblem-card-score');
    if (scoreEl) {
        scoreEl.textContent = `${Math.round(scorePercent)}%`;
    }
}

function renderModalShare(emblem) {
    const container = document.getElementById('emblemModalShare');
    if (!container) return;

    const url = `https://marathondb.gg/emblems/?emblem=${encodeURIComponent(emblem.slug)}`;
    const text = `Check out ${emblem.name} on MarathonDB`;

    container.innerHTML = `
        <a class="share-btn share-btn--twitter" href="https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener" title="Share on X/Twitter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Tweet
        </a>
        <button class="share-btn share-btn--copy" title="Copy link" data-url="${escapeAttr(url)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Link
        </button>
    `;

    container.querySelector('.share-btn--copy')?.addEventListener('click', function () {
        navigator.clipboard.writeText(this.dataset.url).then(() => {
            this.textContent = 'Copied!';
            setTimeout(() => { this.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Link'; }, 2000);
        });
    });
}

function renderModalMeta(emblem) {
    const rows = [];
    if (emblem.season) rows.push(['Season', emblem.season]);
    rows.push(['Status', emblem.is_obtainable ? 'Obtainable' : 'Legacy']);
    if (emblem.available_from) rows.push(['Available From', new Date(emblem.available_from).toLocaleDateString()]);
    if (emblem.available_until) rows.push(['Available Until', new Date(emblem.available_until).toLocaleDateString()]);

    const container = document.getElementById('emblemModalMeta');
    if (!container) return;
    if (!rows.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div class="core-modal-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <h3>Details</h3>
        </div>
        <dl class="core-modal-meta-list">
            ${rows.map(([k, v]) => `<div class="core-modal-meta-row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('')}
        </dl>
    `;
}

// ─── SEO Detail Block ─────────────────────────────────────

function renderSeoDetailBlock(slug) {
    const container = document.getElementById('emblemDetailSeo');
    if (!container) return;

    const emblem = allEmblems.find(e => e.slug === slug);
    if (!emblem) return;

    const rarity = (emblem.rarity || 'standard').toLowerCase();
    const rarityLabel = capitalizeFirst(rarity);
    const imgSrc = emblemImageUrl(emblem);
    const sourceLabel = SOURCE_LABELS[emblem.source_type] || capitalizeFirst(emblem.source_type || '');

    // 1. Update canonical
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `https://marathondb.gg/emblems/?emblem=${encodeURIComponent(slug)}`;

    // 2. Update title
    document.title = `${emblem.name} \u2013 ${rarityLabel} Emblem | MarathonDB`;

    // 3. Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        const descText = emblem.acquisition_summary
            ? `${emblem.name}: ${rarityLabel} emblem \u00B7 ${emblem.acquisition_summary}`
            : `${emblem.name} is a ${rarityLabel} player emblem in Marathon. View details and rate it on MarathonDB.`;
        metaDesc.content = descText;
    }

    // 4. Update OG/Twitter
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = `${emblem.name} \u2013 ${rarityLabel} Emblem | MarathonDB`;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = metaDesc ? metaDesc.content : '';
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = `https://marathondb.gg/emblems/?emblem=${encodeURIComponent(slug)}`;
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && imgSrc) ogImage.content = imgSrc;
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.content = `${emblem.name} \u2013 ${rarityLabel} Emblem | MarathonDB`;
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.content = metaDesc ? metaDesc.content : '';
    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage && imgSrc) twImage.content = imgSrc;

    // 5. Inject structured data
    const itemSchema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        'name': emblem.name,
        'headline': `${emblem.name} \u2013 Marathon Player Emblem`,
        'description': emblem.description || `${emblem.name} is a ${rarityLabel} player emblem in Bungie's Marathon.`,
        'url': `https://marathondb.gg/emblems/?emblem=${encodeURIComponent(slug)}`,
        'image': imgSrc || 'https://marathondb.gg/Icon.png',
        'isPartOf': { '@type': 'CollectionPage', 'name': 'Marathon Emblems Database', 'url': 'https://marathondb.gg/emblems/' },
        'about': { '@type': 'Thing', 'name': 'Marathon', 'description': "Extraction shooter by Bungie" },
        'author': { '@type': 'Organization', 'name': 'MarathonDB', 'url': 'https://marathondb.gg' }
    };
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(itemSchema);
    document.head.appendChild(schemaScript);

    // 6. Update breadcrumb
    const existingBc = document.getElementById('emblemDetailBreadcrumb');
    if (existingBc) {
        const prevSvg = existingBc.previousElementSibling;
        if (prevSvg && prevSvg.tagName === 'svg') prevSvg.remove();
        existingBc.remove();
    }
    const breadcrumbOl = document.querySelector('.detail-breadcrumb ol');
    if (breadcrumbOl) {
        const chevron = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
        const emblemsBc = breadcrumbOl.querySelectorAll('li')[1];
        if (emblemsBc) {
            const nameSpan = emblemsBc.querySelector('[itemprop="name"]');
            if (nameSpan && !emblemsBc.querySelector('a')) {
                const link = document.createElement('a');
                link.setAttribute('itemprop', 'item');
                link.href = '/marathon/emblems/';
                link.appendChild(nameSpan);
                emblemsBc.prepend(link);
            }
        }
        const li = document.createElement('li');
        li.setAttribute('itemprop', 'itemListElement');
        li.setAttribute('itemscope', '');
        li.setAttribute('itemtype', 'https://schema.org/ListItem');
        li.id = 'emblemDetailBreadcrumb';
        li.innerHTML = `<span itemprop="name">${escapeHtml(emblem.name)}</span><meta itemprop="position" content="3" />`;
        breadcrumbOl.insertAdjacentHTML('beforeend', chevron);
        breadcrumbOl.appendChild(li);
    }

    // 7. Render visible SEO detail
    container.innerHTML = `
        <div class="implant-seo-detail ${rarity}">
            <div class="implant-seo-detail-header">
                ${imgSrc ? `<div class="implant-seo-detail-icon ${rarity}"><img src="${imgSrc}" alt="${escapeHtml(emblem.name)} – Marathon emblem" loading="eager" style="aspect-ratio:1/1;object-fit:cover;border-radius:8px"></div>` : ''}
                <div class="implant-seo-detail-title">
                    <h2 class="implant-seo-detail-name">${escapeHtml(emblem.name)}</h2>
                    <div class="implant-seo-detail-badges">
                        <span class="implant-rarity-tag ${rarity}">${rarityLabel}</span>
                        <span class="emblem-source-tag ${emblem.source_type || ''}">${escapeHtml(sourceLabel)}</span>
                    </div>
                </div>
            </div>
            ${emblem.description ? `<p class="implant-seo-detail-desc">${escapeHtml(emblem.description)}</p>` : ''}
            ${emblem.acquisition_summary ? `<p class="implant-seo-detail-desc">${escapeHtml(emblem.acquisition_summary)}</p>` : ''}
            <p class="implant-seo-backlink"><a href="/emblems/">\u2190 Browse all Marathon emblems</a></p>
        </div>
    `;
    container.style.display = '';
}

function removeSeoDetailBlock() {
    const container = document.getElementById('emblemDetailSeo');
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://marathondb.gg/emblems/';
    document.title = 'Marathon Emblems - All Player Emblems | MarathonDB';
    // Restore OG
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = 'https://marathondb.gg/emblems/';
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.content = 'https://marathondb.gg/Icon.png';
}

// ─── Init ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    await loadEmblems();

    // Search
    document.getElementById('emblemSearch')?.addEventListener('input', filterAndSortEmblems);

    // Sort
    document.getElementById('emblemSort')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndSortEmblems();
    });

    // Source type tabs
    document.querySelectorAll('#sourceTypeTabs .category-tab-sm').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#sourceTypeTabs .category-tab-sm').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterAndSortEmblems();
        });
    });

    // Reset filters
    document.getElementById('resetFilters')?.addEventListener('click', () => {
        document.querySelectorAll('#sourceTypeTabs .category-tab-sm').forEach(t => t.classList.remove('active'));
        document.querySelector('#sourceTypeTabs .category-tab-sm[data-source=""]')?.classList.add('active');
        const searchEl = document.getElementById('emblemSearch');
        if (searchEl) searchEl.value = '';
        const sortEl = document.getElementById('emblemSort');
        if (sortEl) sortEl.value = 'featured';
        currentSort = 'featured';
        filterAndSortEmblems();
    });

    // Modal wiring
    const grid = document.getElementById('emblemsGrid');
    if (grid) {
        grid.addEventListener('click', handleGridClick);
        grid.addEventListener('keydown', handleGridKeydown);
    }

    document.getElementById('emblemModalBackdrop')?.addEventListener('click', closeEmblemModal);
    document.getElementById('emblemModalClose')?.addEventListener('click', closeEmblemModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeEmblemModal();
    });

    // Browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.emblemSlug) {
            openEmblemModal(e.state.emblemSlug, true);
        } else {
            closeEmblemModal(true);
        }
    });

    // Open from URL on load
    const params = new URLSearchParams(window.location.search);
    const emblemParam = params.get('emblem');
    if (emblemParam) {
        openEmblemModal(emblemParam, true);
    }
});
