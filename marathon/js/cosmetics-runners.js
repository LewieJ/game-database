/**
 * Runner Skins Cosmetics Page
 * Powered by the dedicated Runner Skins API (runnerskins.marathondb.gg)
 */

(function() {
    'use strict';

    // ── API constants ──────────────────────────────────────────────────
    const SKINS_API          = 'https://runnerskins.marathondb.gg';
    const SKINS_API_FALLBACK = 'https://marathon-runner-skins-api.heymarathondb.workers.dev';

    // Distribution key → numeric rating mapping (new API uses named keys)
    const DIST_KEYS = ['fire', 'love', 'meh', 'nah', 'trash']; // index 0 = rating 5
    const RATING_TO_KEY = { 5: 'fire', 4: 'love', 3: 'meh', 2: 'nah', 1: 'trash' };

    // State
    let allShells = [];
    let filteredShells = [];
    let ratingsMap = {};
    let currentFilters = {
        search: '',
        runner: '',
        rarity: '',
        limited: false,
        source: '',
        hideDefaults: false,
        unavailable: false
    };

    /** Deep-link / share: same query key as weapon skins hub */
    const SKIN_URL_PARAM = 'skin';
    const RUNNER_SKINS_LIST_CSS = '/marathon/css/weapon-skins-list.css';

    let shellModalEl = null;
    let shellModalContentEl = null;
    let _rsImageLightboxEl = null;
    let _shellGridModalBound = false;

    // DOM Elements
    const elements = {
        // Header
        totalCount: document.getElementById('totalCount'),
        
        // Search & Sort
        searchInput: document.getElementById('searchInput'),
        sortSelect: document.getElementById('sortSelect'),
        
        // Filter tabs (original page)
        runnerTabs: document.getElementById('runnerTabs'),
        rarityPills: document.getElementById('rarityPills'),
        
        // Filter elements (SSG page)
        filterPills: document.getElementById('filterPills'),
        hideDefaultsCheck: document.getElementById('hideDefaultsCheck'),
        hideDefaultsToggle: document.getElementById('hideDefaultsToggle'),
        runnerFilter: document.getElementById('runnerFilter'),
        sourceFilter: document.getElementById('sourceFilter'),
        resultsCount: document.getElementById('resultsCount'),
        
        // Content areas
        loadingState: document.getElementById('loadingState'),
        shellsGrid: document.getElementById('shellsGrid'),
        emptyState: document.getElementById('emptyState'),
        resetFilters: document.getElementById('resetFilters')
    };

    // Rarity order for sorting — includes both legacy and Marathon scale
    const rarityOrder = {
        'common':    1,
        'uncommon':  2,
        'rare':      3,
        'standard':  4,
        'epic':      5,
        'enhanced':  6,
        'deluxe':    7,
        'legendary': 8,
        'superior':  9,
        'exotic':   10,
        'prestige': 11
    };

    function ensureRunnerSkinsHubAssets() {
        if (!document.querySelector(`link[href="${RUNNER_SKINS_LIST_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = RUNNER_SKINS_LIST_CSS;
            document.head.appendChild(link);
        }

        let modal = document.getElementById('skinModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'skinModal';
            modal.className = 'skin-modal-overlay skin-modal--rnk';
            modal.setAttribute('aria-hidden', 'true');
            modal.innerHTML = `
        <div class="skin-modal skin-modal--rnk" role="dialog" aria-modal="true" aria-labelledby="runner-skin-modal-title">
            <button type="button" id="closeRunnerShellModal" class="skin-modal-close" aria-label="Close detail">&times;</button>
            <div id="modalContent" class="skin-modal-content"></div>
        </div>`;
            document.body.appendChild(modal);
        }

        shellModalEl = document.getElementById('skinModal');
        shellModalContentEl = document.getElementById('modalContent');

        const main = document.querySelector('main');
        if (main) {
            main.classList.add('ws-skins-page', 'rs-skins-page');
        }
    }

    function getShellQueryParam() {
        return new URLSearchParams(window.location.search).get(SKIN_URL_PARAM);
    }

    function buildShellShareUrl(slug) {
        const u = new URL(window.location.href);
        u.searchParams.set(SKIN_URL_PARAM, slug);
        return u.toString();
    }

    function attrSafeUrl(u) {
        if (!u) return '';
        return String(u).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    function resolveRunnerCdnUrl(path) {
        if (!path) return '';
        const s = String(path);
        if (/^https?:\/\//i.test(s)) return s;
        return `${SKINS_API}/${s.replace(/^\//, '')}`;
    }

    function collectRunnerModalSlides(detail) {
        const slides = [];
        const pushSlide = (thumb, preview, full, caption) => {
            const t = resolveRunnerCdnUrl(thumb);
            const p = resolveRunnerCdnUrl(preview || thumb);
            const f = resolveRunnerCdnUrl(full || preview || thumb);
            if (!p && !f) return;
            slides.push({
                thumb: t || p,
                preview: p,
                full: f,
                caption: caption || ''
            });
        };

        const primary = detail.images && detail.images.primary;
        if (primary) {
            pushSlide(
                primary.path_thumbnail,
                primary.path_card || primary.path_thumbnail,
                primary.path_full || primary.path_card,
                primary.image_name
            );
        }

        const gallery = detail.images && detail.images.gallery;
        if (Array.isArray(gallery)) {
            gallery.forEach((img) => {
                if (!img) return;
                pushSlide(
                    img.path_thumbnail,
                    img.path_card || img.path_thumbnail,
                    img.path_full || img.path_card,
                    img.image_name
                );
            });
        }

        if (slides.length === 0 && detail.image) {
            const im = detail.image;
            pushSlide(im.thumbnail, im.card || im.thumbnail, im.full || im.card || im.thumbnail, '');
        }

        const seen = new Set();
        const deduped = [];
        for (const s of slides) {
            const key = [s.preview, s.full, s.thumb].filter(Boolean).map((u) => String(u).split('?')[0].replace(/\/$/, ''))[0];
            if (!key) {
                deduped.push(s);
                continue;
            }
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(s);
        }
        return deduped;
    }

    function getSourceClassRunner(source) {
        if (!source) return 'source-unknown';
        const s = String(source).toLowerCase();
        if (s.includes('pre_order') || s.includes('preorder')) return 'source-preorder';
        if (s.includes('deluxe')) return 'source-deluxe';
        if (s.includes('battle')) return 'source-battlepass';
        if (s.includes('store')) return 'source-store';
        if (s.includes('event')) return 'source-event';
        if (s.includes('twitch')) return 'source-twitch';
        if (s === 'default') return 'source-default';
        return 'source-default';
    }

    function getSourceIconRunner(source) {
        if (!source) return '';
        const s = String(source).toLowerCase();
        if (s.includes('pre_order') || s.includes('preorder')) {
            return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
        }
        if (s.includes('deluxe')) {
            return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        }
        if (s.includes('battle')) {
            return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>';
        }
        if (s.includes('store')) {
            return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';
        }
        return '';
    }

    function closeRsImageLightbox() {
        if (!_rsImageLightboxEl) return;
        _rsImageLightboxEl.classList.remove('ws-image-lightbox--open');
        const el = _rsImageLightboxEl;
        _rsImageLightboxEl = null;
        setTimeout(() => el.remove(), 200);
    }

    function openRsImageLightbox(src, alt) {
        if (!src) return;
        closeRsImageLightbox();
        const wrap = document.createElement('div');
        wrap.className = 'ws-image-lightbox';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ws-image-lightbox-close';
        btn.setAttribute('aria-label', 'Close preview');
        btn.innerHTML = '&times;';
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt || 'Skin preview';
        wrap.appendChild(btn);
        wrap.appendChild(img);
        wrap.addEventListener('click', (ev) => {
            if (ev.target === wrap || ev.target === btn) closeRsImageLightbox();
        });
        document.body.appendChild(wrap);
        _rsImageLightboxEl = wrap;
        requestAnimationFrame(() => wrap.classList.add('ws-image-lightbox--open'));
    }

    function renderRunnerShellModalContent(detail) {
        const slug = detail.slug || '';
        const name = detail.display_name || detail.name || slug;
        const runner = detail.runner || {};
        const runnerSlug = runner.slug || '';
        const runnerName = runner.name || formatName(runnerSlug);
        const rarity = detail.rarity || 'common';
        const slides = collectRunnerModalSlides(detail);
        const first = slides[0] || { preview: '', full: '', thumb: '' };
        const imageUrl = first.preview;
        const fullSizeUrl = first.full || first.preview;
        const showThumbs = slides.length > 1;

        const avail = detail.availability || {};
        const isLimited = avail.is_limited ?? detail.is_limited;
        const isUnavailable = avail.is_available === false || detail.is_available === false;

        const collectionName = (detail.collection && detail.collection.name) || '';
        const bp = detail.battlepass || {};
        const bpLevel = bp.in_battlepass && bp.level ? bp.level : null;
        const release = detail.release || {};
        const releaseDate = release.date || detail.release_date || '';

        const questNotes = Array.isArray(detail.quest_notes) ? detail.quest_notes : [];
        const questBlock = questNotes.length
            ? `<div class="rs-modal-quest">
                <h4>Master challenges</h4>
                <ol>${questNotes.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
               </div>`
            : '';

        const metaRows = [];
        if (bpLevel) {
            metaRows.push(`<div class="skin-modal-meta-row"><span class="skin-modal-meta-label">Battle pass</span><span>Level ${bpLevel}</span></div>`);
        }
        if (releaseDate) {
            metaRows.push(`<div class="skin-modal-meta-row"><span class="skin-modal-meta-label">Released</span><span>${escapeHtml(releaseDate)}</span></div>`);
        }
        if (release.season_added) {
            metaRows.push(`<div class="skin-modal-meta-row"><span class="skin-modal-meta-label">Season</span><span>${escapeHtml(release.season_added)}</span></div>`);
        }
        if (isUnavailable) {
            metaRows.push('<div class="skin-modal-meta-row skin-modal-meta-row--warn"><span class="skin-modal-meta-label">Availability</span><span>No longer available</span></div>');
        }

        const sourceRaw = detail.source || '';
        const sourceDisplay = formatSource(sourceRaw) || 'Unknown';

        shellModalContentEl.innerHTML = `
        <div class="skin-modal-grid">
            <div class="skin-modal-gallery">
                <div class="skin-modal-main-image skin-modal-main-image--zoomable rs-runner-modal-hero" data-rarity="${escapeHtml(rarity)}">
                    ${imageUrl ? `<img src="${attrSafeUrl(imageUrl)}" alt="${escapeHtml(name)}" data-full-src="${attrSafeUrl(fullSizeUrl || imageUrl)}">` : ''}
                    ${isLimited ? '<span class="modal-limited-badge">LIMITED TIME</span>' : ''}
                </div>
                ${showThumbs ? `
                    <div class="skin-modal-thumbnails rs-runner-thumbs">
                        ${slides.map((sld, i) => `
                            <button type="button" class="skin-thumb ${i === 0 ? 'active' : ''}" data-src="${attrSafeUrl(sld.preview)}" data-full-src="${attrSafeUrl(sld.full || sld.preview)}">
                                <img src="${attrSafeUrl(sld.thumb || sld.preview)}" alt="${escapeHtml(sld.caption || name)}" loading="lazy">
                            </button>`).join('')}
                    </div>` : ''}
            </div>
            <div class="skin-modal-details">
                <div class="skin-modal-header">
                    <span class="skin-modal-rarity rarity-${escapeHtml(rarity)}">${String(rarity).toUpperCase()}</span>
                    ${collectionName ? `<span class="skin-modal-collection">${escapeHtml(collectionName)}</span>` : ''}
                </div>
                <h2 class="skin-modal-title" id="runner-skin-modal-title">${escapeHtml(name)}</h2>
                <div class="skin-modal-applies-to">
                    <span class="applies-label">Runner:</span>
                    ${runnerSlug
            ? `<a href="/marathon/runners/${escapeHtml(runnerSlug)}/" class="applies-weapon">${escapeHtml(runnerName)}</a>`
            : `<span class="applies-weapon">${escapeHtml(runnerName)}</span>`}
                </div>
                ${metaRows.join('')}
                ${detail.description ? `<p class="skin-modal-description">${escapeHtml(detail.description)}</p>` : ''}
                <div class="skin-modal-section">
                    <h4>Acquisition</h4>
                    <div class="skin-modal-acquisition">
                        <div class="acq-source ${getSourceClassRunner(sourceRaw)}">
                            ${getSourceIconRunner(sourceRaw)}
                            <span>${escapeHtml(sourceDisplay)}</span>
                        </div>
                        ${detail.source_detail ? `<p class="acq-detail">${escapeHtml(detail.source_detail)}</p>` : ''}
                        ${detail.acquisition_note ? `
                            <div class="acq-note">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                                </svg>
                                ${escapeHtml(detail.acquisition_note)}
                            </div>` : ''}
                    </div>
                </div>
                ${questBlock}
                <div class="skin-modal-actions skin-modal-actions--split">
                    <button type="button" class="modal-action-btn primary" id="runnerShellModalCopyLink" data-shell-slug="${escapeHtml(slug)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        <span class="skin-modal-copy-label">Copy link</span>
                    </button>
                    ${runnerSlug ? `
                    <a href="/marathon/runners/${escapeHtml(runnerSlug)}/" class="modal-action-btn modal-action-btn--ghost">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        View runner
                    </a>` : ''}
                </div>
            </div>
        </div>`;

        shellModalContentEl.querySelectorAll('.skin-thumb').forEach((thumb) => {
            thumb.addEventListener('click', () => {
                shellModalContentEl.querySelectorAll('.skin-thumb').forEach((t) => t.classList.remove('active'));
                thumb.classList.add('active');
                const mainImg = shellModalContentEl.querySelector('.skin-modal-main-image img');
                if (mainImg) {
                    const ts = thumb.dataset.src;
                    const tf = thumb.dataset.fullSrc || ts;
                    mainImg.src = ts;
                    mainImg.dataset.fullSrc = tf;
                }
            });
        });

        const mainWrap = shellModalContentEl.querySelector('.skin-modal-main-image');
        const mainImg = mainWrap && mainWrap.querySelector('img');
        if (mainWrap && mainImg) {
            mainWrap.addEventListener('click', () => {
                const src = mainImg.dataset.fullSrc || mainImg.src;
                openRsImageLightbox(src, name);
            });
        }

        const copyBtn = shellModalContentEl.querySelector('#runnerShellModalCopyLink');
        const copyLabel = copyBtn && copyBtn.querySelector('.skin-modal-copy-label');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const s = copyBtn.dataset.shellSlug || slug;
                const text = buildShellShareUrl(s);
                try {
                    await navigator.clipboard.writeText(text);
                    if (copyLabel) {
                        const prev = copyLabel.textContent;
                        copyLabel.textContent = 'Copied!';
                        setTimeout(() => { copyLabel.textContent = prev; }, 1600);
                    }
                } catch (err) {
                    window.prompt('Copy link:', text);
                }
            });
        }
    }

    async function openShellModal(slug, skipPush) {
        if (!slug) return;
        ensureRunnerSkinsHubAssets();
        shellModalEl = document.getElementById('skinModal');
        shellModalContentEl = document.getElementById('modalContent');
        if (!shellModalEl || !shellModalContentEl) return;

        if (skipPush !== true) {
            const url = new URL(window.location.href);
            url.searchParams.set(SKIN_URL_PARAM, slug);
            history.pushState({ runnerSkinSlug: slug }, '', url);
        }

        shellModalEl.classList.add('active');
        shellModalEl.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        shellModalContentEl.innerHTML = `
            <div class="skin-modal-loading">
                <div class="loading-spinner"></div>
                <p>Loading skin details...</p>
            </div>`;

        try {
            const response = await skinsApiFetch(`/api/skins/${encodeURIComponent(slug)}`);
            const data = await response.json();
            if (data.success && data.data) {
                renderRunnerShellModalContent(data.data);
            } else {
                throw new Error('Invalid response');
            }
        } catch (err) {
            console.error('Runner skin detail failed:', err);
            shellModalContentEl.innerHTML = '<div class="skin-modal-error"><p>Failed to load skin details</p></div>';
        }
    }

    function closeShellModal(skipPush) {
        closeRsImageLightbox();
        shellModalEl = document.getElementById('skinModal');
        if (!shellModalEl || !shellModalEl.classList.contains('active')) return;
        shellModalEl.classList.remove('active');
        shellModalEl.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        if (skipPush !== true) {
            const url = new URL(window.location.href);
            url.searchParams.delete(SKIN_URL_PARAM);
            const qs = url.searchParams.toString();
            history.pushState({}, '', url.pathname + (qs ? `?${qs}` : '') + url.hash);
        }
    }

    function attachShellGridModalDelegation() {
        const grid = document.getElementById('shellsGrid');
        if (!grid || _shellGridModalBound) return;
        _shellGridModalBound = true;

        grid.addEventListener('click', (e) => {
            if (e.target.closest('.cw-heat-emoji')) return;
            const card = e.target.closest('.cw-skin-card');
            if (!card || !card.dataset.slug) return;
            if (e.metaKey || e.ctrlKey || e.button === 1) {
                window.open(buildShellShareUrl(card.dataset.slug), '_blank', 'noopener,noreferrer');
                return;
            }
            e.preventDefault();
            openShellModal(card.dataset.slug);
        });

        grid.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (e.target.closest('.cw-heat-emoji')) return;
            const card = e.target.closest('.cw-skin-card');
            if (!card || !card.dataset.slug) return;
            e.preventDefault();
            openShellModal(card.dataset.slug);
        });
    }

    /**
     * Initialize the page
     */
    async function init() {
        try {
            ensureRunnerSkinsHubAssets();

            // Allow sub-pages to pre-set a runner filter via window variable
            if (window.RUNNER_SKINS_FILTER) {
                currentFilters.runner = window.RUNNER_SKINS_FILTER;
            }

            await loadShells();
            await populateRunnerTabs();
            setupEventListeners();

            // Sync runner dropdown with pre-set filter
            if (currentFilters.runner && elements.runnerFilter) {
                elements.runnerFilter.value = currentFilters.runner;
            }

            applyFilters();
            loadHeatRatings(); // synchronous — ratings were embedded in the list response

            // Enrich newest skins with release dates (list API omits them)
            enrichNewestSkins();

            attachShellGridModalDelegation();

            const skinFromUrl = getShellQueryParam();
            if (skinFromUrl) {
                openShellModal(skinFromUrl, true);
            }

            // Tick countdown badges every second
            setInterval(() => {
                document.querySelectorAll('.cw-countdown-badge[data-expiry]').forEach(badge => {
                    const ms = new Date(badge.dataset.expiry) - Date.now();
                    badge.textContent = `⏱ ENDS ${formatCountdown(ms)}`;
                });
            }, 1000);
        } catch (error) {
            console.error('Failed to initialize runner shells page:', error);
            showError();
        }
    }

    /**
     * Fetch from SKINS_API with automatic fallback
     */
    async function skinsApiFetch(path) {
        try {
            const res = await fetch(`${SKINS_API}${path}`, { cache: 'no-store' });
            if (res.ok) return res;
        } catch (_) { /* primary failed – try fallback */ }
        return fetch(`${SKINS_API_FALLBACK}${path}`, { cache: 'no-store' });
    }

    /**
     * Load all runner skins from the dedicated Skins API.
     * Paginates automatically if there are more than 100 skins.
     */
    async function loadShells() {
        const PER_PAGE = 100;
        let page = 1;
        let totalPages = 1;
        const collected = [];

        do {
            const res    = await skinsApiFetch(`/api/skins?per_page=${PER_PAGE}&page=${page}`);
            const result = await res.json();

            if (!result.success || !Array.isArray(result.data)) {
                throw new Error('Failed to load runner skins');
            }

            collected.push(...result.data);
            totalPages = result.total_pages || 1;
            page++;
        } while (page <= totalPages);

        allShells = collected
            .map(normalizeShell)
            .filter(shell => shell.icon_path); // hide skins with no image yet

        // Seed ratingsMap from embedded rating data in the list response
        allShells.forEach(shell => {
            if (shell._rawRating) {
                ratingsMap[shell.slug] = normalizeRating(shell._rawRating);
            }
        });

        filteredShells = [...allShells];

        // Fetch available_until for limited skins (needed for countdown badges)
        const limitedShells = allShells.filter(s => s.isLimited);
        if (limitedShells.length > 0) {
            await Promise.allSettled(
                limitedShells.map(async (shell) => {
                    try {
                        const r = await skinsApiFetch(`/api/skins/${shell.slug}`);
                        if (!r.ok) return;
                        const d = await r.json();
                        if (d.success && d.data?.availability) {
                            shell.available_until = d.data.availability.available_until || null;
                        }
                    } catch (_) { /* non-fatal */ }
                })
            );
        }

        // Update count in header
        if (elements.totalCount) elements.totalCount.textContent = `(${allShells.length})`;
    }

    /**
     * Fetch detail for the newest skins (by highest ID) to get release dates.
     * Re-sorts and re-renders if any new skins are found within 7 days.
     */
    async function enrichNewestSkins() {
        const NEW_CHECK_COUNT = 5; // check the 5 most recently added skins
        const NEW_BADGE_MS = 7 * 24 * 60 * 60 * 1000;
        const candidates = [...allShells]
            .sort((a, b) => (b.id || 0) - (a.id || 0))
            .slice(0, NEW_CHECK_COUNT)
            .filter(s => !s.release_date); // only fetch if we don't already have it

        if (candidates.length === 0) return;

        let changed = false;
        await Promise.allSettled(candidates.map(async (shell) => {
            try {
                const r = await skinsApiFetch(`/api/skins/${shell.slug}`);
                if (!r.ok) return;
                const d = await r.json();
                if (d.success && d.data?.release?.date) {
                    shell.release_date = d.data.release.date;
                    // Also update in filteredShells
                    const fs = filteredShells.find(s => s.slug === shell.slug);
                    if (fs) fs.release_date = shell.release_date;
                    if ((Date.now() - new Date(shell.release_date).getTime()) <= NEW_BADGE_MS) {
                        changed = true;
                    }
                }
            } catch (_) { /* non-fatal */ }
        }));

        if (changed) {
            applyFilters();
            // Re-apply ratings to the freshly rendered DOM
            document.querySelectorAll('.cw-heat-strip').forEach(strip => {
                updateStripData(strip, strip.dataset.slug);
            });
            highlightUserVotes();
            markHotBadges();
        }
    }

    /**
     * Normalise a raw SkinListItem from the new Skins API into the shape
     * the rest of this module expects.
     */
    function normalizeShell(skin) {
        const image      = skin.image      || {};
        const runner     = skin.runner     || {};
        const collection = skin.collection || {};

        // Image paths from the API are relative R2 keys — prefix with CDN base
        const cdnBase      = 'https://runnerskins.marathondb.gg/';
        const rawCard      = image.card      || '';
        const rawThumb     = image.thumbnail || '';
        const cardUrl      = rawCard  ? (rawCard.startsWith('http')  ? rawCard  : cdnBase + rawCard)  : '';
        const thumbnailUrl = rawThumb ? (rawThumb.startsWith('http') ? rawThumb : cdnBase + rawThumb) : '';

        return {
            ...skin,
            name:            skin.display_name || skin.name,
            runnerSlug:      runner.slug  || '',
            runnerName:      runner.name || formatName(runner.slug || ''),
            rarity:          skin.rarity  || 'common',
            source:          skin.source  || '',
            isAvailable:     skin.is_available !== false,
            isLimited:       Boolean(skin.is_limited),
            collection_name: collection.name || '',
            collection_slug: collection.slug || '',
            // card used for grid cards, thumbnail as low-res placeholder
            icon_path:       cardUrl,
            icon_path_low:   thumbnailUrl || cardUrl,
            release_date:    skin.release?.date || null,
            available_until: skin.availability?.available_until || skin.available_until || null,
            // stash the raw rating for seeding ratingsMap
            _rawRating:      skin.rating || null,
        };
    }

    /**
     * Normalise a rating object from the new API.
     * Converts named distribution keys (fire/love/meh/nah/trash) into the
     * numeric-key shape the rest of the UI uses internally.
     */
    function normalizeRating(raw) {
        if (!raw) return null;
        const dist = raw.distribution || {};
        // Build a numeric-keyed copy so updateStripData can look up by 1-5
        const numericDist = {
            5: dist.fire  || { count: 0, percent: 0 },
            4: dist.love  || { count: 0, percent: 0 },
            3: dist.meh   || { count: 0, percent: 0 },
            2: dist.nah   || { count: 0, percent: 0 },
            1: dist.trash || { count: 0, percent: 0 },
        };
        return {
            score_percent: raw.score_percent ?? null,
            total_votes:   raw.total_votes   ?? 0,
            distribution:  numericDist,
        };
    }

    // ── Countdown helpers ─────────────────────────────────────────────
    const EXPIRES_HOUR_UTC = 18;

    function getShellExpiry(shell) {
        if (!shell.available_until || !shell.isAvailable) return null;
        const d = new Date(shell.available_until);
        d.setUTCHours(EXPIRES_HOUR_UTC, 0, 0, 0);
        return d;
    }

    function formatCountdown(ms) {
        if (ms <= 0) return 'Expired';
        const totalSecs = Math.floor(ms / 1000);
        const days  = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins  = Math.floor((totalSecs % 3600) / 60);
        const secs  = totalSecs % 60;
        if (days > 0)  return `${days}D ${hours}H`;
        if (hours > 0) return `${hours}H ${mins}M`;
        return `${mins}M ${secs}S`;
    }

    /**
     * Populate runner tabs from API
     */
    async function populateRunnerTabs() {
        if (!elements.runnerTabs) return;

        try {
            const runners = await MarathonAPI.getRunners();
            const list = Array.isArray(runners) ? runners : runners?.data;

            if (!Array.isArray(list)) return;

            list.forEach(runner => {
                if (!runner?.slug || !runner?.name) return;
                const btn = document.createElement('button');
                btn.className = 'category-tab-sm';
                btn.dataset.runner = runner.slug;
                btn.textContent = runner.name;
                elements.runnerTabs.appendChild(btn);
            });
        } catch (error) {
            console.error('Failed to load runners for tabs:', error);
        }
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Search
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(() => {
                currentFilters.search = elements.searchInput.value.toLowerCase().trim();
                applyFilters();
            }, 300));
        }

        // Sort
        if (elements.sortSelect) {
            elements.sortSelect.addEventListener('change', applyFilters);
        }

        // Runner tabs (original page)
        if (elements.runnerTabs) {
            elements.runnerTabs.addEventListener('click', (e) => {
                const tab = e.target.closest('.category-tab-sm');
                if (!tab) return;
                
                // Update active state
                elements.runnerTabs.querySelectorAll('.category-tab-sm').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                currentFilters.runner = tab.dataset.runner || '';
                applyFilters();
            });
        }

        // Runner filter dropdown (SSG page)
        if (elements.runnerFilter) {
            elements.runnerFilter.addEventListener('change', () => {
                currentFilters.runner = elements.runnerFilter.value || '';
                applyFilters();
            });
        }

        // Rarity pills (original page)
        if (elements.rarityPills) {
            elements.rarityPills.addEventListener('click', (e) => {
                const pill = e.target.closest('.filter-pill-sm');
                if (!pill) return;
                
                // Update active state
                elements.rarityPills.querySelectorAll('.filter-pill-sm').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                
                currentFilters.rarity = pill.dataset.rarity || '';
                applyFilters();
            });
        }

        // Filter pills (SSG page)
        if (elements.filterPills) {
            elements.filterPills.addEventListener('click', (e) => {
                const pill = e.target.closest('.filter-pill-sm, .filter-pill');
                if (!pill) return;
                // Don't let the toggle pill trigger rarity filter logic
                if (pill.classList.contains('filter-pill-toggle')) return;

                // Update active state
                elements.filterPills.querySelectorAll('.filter-pill-sm, .filter-pill:not(.filter-pill-toggle)').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                const filter = pill.dataset.filter || '';
                const rarity = pill.dataset.rarity || '';
                if (filter === 'all') {
                    currentFilters.rarity = '';
                    currentFilters.limited = false;
                    currentFilters.unavailable = false;
                } else if (filter === 'vaulted') {
                    currentFilters.rarity = '';
                    currentFilters.limited = false;
                    currentFilters.unavailable = true;
                } else if (rarity) {
                    currentFilters.rarity = rarity;
                    currentFilters.limited = false;
                    currentFilters.unavailable = false;
                } else if (filter === 'limited') {
                    currentFilters.rarity = '';
                    currentFilters.limited = true;
                    currentFilters.unavailable = false;
                }
                applyFilters();
            });
        }

        // Hide defaults toggle
        if (elements.hideDefaultsCheck) {
            elements.hideDefaultsCheck.addEventListener('change', () => {
                currentFilters.hideDefaults = elements.hideDefaultsCheck.checked;
                elements.hideDefaultsToggle?.classList.toggle('active', currentFilters.hideDefaults);
                applyFilters();
            });
        }

        // Reset filters
        if (elements.resetFilters) {
            elements.resetFilters.addEventListener('click', resetAllFilters);
        }

        const closeRunnerBtn = document.getElementById('closeRunnerShellModal');
        if (closeRunnerBtn) {
            closeRunnerBtn.addEventListener('click', () => closeShellModal());
        }

        shellModalEl = document.getElementById('skinModal');
        if (shellModalEl) {
            shellModalEl.addEventListener('click', (e) => {
                if (e.target === shellModalEl) closeShellModal();
            });
        }

        window.addEventListener('popstate', (e) => {
            const slugParam = getShellQueryParam();
            if (e.state && e.state.runnerSkinSlug) {
                openShellModal(e.state.runnerSkinSlug, true);
            } else if (slugParam) {
                openShellModal(slugParam, true);
            } else {
                closeShellModal(true);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (_rsImageLightboxEl) {
                closeRsImageLightbox();
                return;
            }
            closeShellModal();
        });
    }

    /**
     * Apply all filters and render
     */
    function applyFilters() {
        filteredShells = allShells.filter(shell => {
            // Search filter
            if (currentFilters.search) {
                const searchTarget = `${shell.name} ${shell.runnerName} ${shell.description || ''} ${shell.collection_name || ''}`.toLowerCase();
                if (!searchTarget.includes(currentFilters.search)) {
                    return false;
                }
            }

            // Runner filter
            if (currentFilters.runner && shell.runnerSlug !== currentFilters.runner && shell.runnerName?.toLowerCase() !== currentFilters.runner) {
                return false;
            }

            // Rarity filter
            if (currentFilters.rarity && shell.rarity !== currentFilters.rarity) {
                return false;
            }

            // Limited filter
            if (currentFilters.limited && !shell.isLimited) {
                return false;
            }

            // Vaulted (unavailable) filter
            if (currentFilters.unavailable && shell.isAvailable) {
                return false;
            }

            // Hide defaults filter
            if (currentFilters.hideDefaults && (shell.source === 'default' || shell.slug?.endsWith('-default'))) {
                return false;
            }

            return true;
        });

        // Update results count
        if (elements.resultsCount) {
            elements.resultsCount.textContent = `${filteredShells.length} runner skin${filteredShells.length !== 1 ? 's' : ''} found`;
        }

        // Update header total to reflect filtered count
        if (elements.totalCount) {
            elements.totalCount.textContent = `(${filteredShells.length})`;
        }

        sortShells();
        renderShells();
    }

    /**
     * Sort shells based on current selection
     */
    function sortShells() {
        const sortValue = elements.sortSelect ? elements.sortSelect.value : 'most-fired';

        filteredShells.sort((a, b) => {
            switch (sortValue) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'rarity-desc':
                    return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                case 'rarity-asc':
                    return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
                case 'newest': {
                    const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
                    const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
                    if (dateB.getTime() !== dateA.getTime()) {
                        return dateB - dateA;
                    }
                    return (b.id || 0) - (a.id || 0);
                }
                case 'most-fired': {
                    // New skins (released within last 7 days) pinned to the top
                    const NEW_MS = 7 * 24 * 60 * 60 * 1000;
                    const now2 = Date.now();
                    const aIsNew = a.release_date && (now2 - new Date(a.release_date).getTime()) <= NEW_MS ? 1 : 0;
                    const bIsNew = b.release_date && (now2 - new Date(b.release_date).getTime()) <= NEW_MS ? 1 : 0;
                    if (bIsNew !== aIsNew) return bIsNew - aIsNew;
                    const fireOf = s => {
                        const d = ratingsMap[s.slug]?.distribution;
                        return d ? (d[5]?.count || d['5']?.count || 0) : 0;
                    };
                    const diff = fireOf(b) - fireOf(a);
                    if (diff !== 0) return diff;
                    return a.name.localeCompare(b.name);
                }
                case 'featured':
                default: {
                    // New skins (released within last 7 days) pinned to the top
                    const NEW_SKIN_MS = 7 * 24 * 60 * 60 * 1000;
                    const now = Date.now();
                    const aNew = a.release_date && (now - new Date(a.release_date).getTime()) <= NEW_SKIN_MS ? 1 : 0;
                    const bNew = b.release_date && (now - new Date(b.release_date).getTime()) <= NEW_SKIN_MS ? 1 : 0;
                    if (bNew !== aNew) return bNew - aNew;
                    // Then by rarity (highest first), then name
                    const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                    if (rarityDiff !== 0) return rarityDiff;
                    return a.name.localeCompare(b.name);
                }
            }
        });
    }

    /**
     * Render shells to the grid
     */
    function renderShells() {
        if (elements.loadingState) elements.loadingState.style.display = 'none';

        if (filteredShells.length === 0) {
            if (elements.shellsGrid) elements.shellsGrid.style.display = 'none';
            if (elements.emptyState) elements.emptyState.style.display = 'flex';
            return;
        }

        if (elements.shellsGrid) {
            elements.shellsGrid.style.display = '';
            elements.shellsGrid.innerHTML = filteredShells.map(shell => createShellCard(shell)).join('');
        }
        if (elements.emptyState) elements.emptyState.style.display = 'none';

        // Attach emoji vote handlers + re-highlight
        attachHeatEmojiHandlers();
        highlightUserVotes();

        // Restore hot badges if ratings are already loaded
        if (Object.keys(ratingsMap).length > 0) {
            markHotBadges();
        }
    }

    /**
     * Create shell card HTML - Matching weapon skins card design (opens in-page modal on click)
     */
    function createShellCard(shell) {
        // Images from the new API are always full absolute WebP URLs
        const imageUrl  = shell.icon_path     || '';
        const lowResUrl = shell.icon_path_low || imageUrl;
        const rarityLabel = (shell.rarity || 'common').charAt(0).toUpperCase() + (shell.rarity || 'common').slice(1);

        const isUnavailable = !shell.isAvailable;
        const unavailableBadge = isUnavailable
            ? `<div class="cw-unavailable-badge">No Longer Available</div>` : '';

        const expiryDate = getShellExpiry(shell);
        const countdownBadge = expiryDate
            ? `<div class="cw-countdown-badge" data-expiry="${expiryDate.toISOString()}">&#9203; ENDS ${formatCountdown(expiryDate - Date.now())}</div>`
            : '';

        // "NEW" badge for skins released within the last 7 days
        const NEW_BADGE_MS = 7 * 24 * 60 * 60 * 1000;
        const isNew = shell.release_date && (Date.now() - new Date(shell.release_date).getTime()) <= NEW_BADGE_MS;
        const newBadge = isNew ? `<span class="cw-new-badge">✦ NEW</span>` : '';

        return `
            <div tabindex="0" role="button" aria-label="View details for ${escapeHtml(shell.name)}"
                 class="cw-skin-card sticker-card-simple" data-rarity="${shell.rarity}" data-slug="${shell.slug}"${isUnavailable ? ' data-unavailable' : ''}>
                <span class="cw-hot-badge">🔥 Hot</span>
                ${newBadge}
                <div class="cw-skin-image">
                    ${imageUrl ? `
                        <img src="${lowResUrl}"
                             ${lowResUrl !== imageUrl ? `data-full="${imageUrl}"` : ''}
                             alt="${escapeHtml(shell.name)}"
                             loading="lazy"
                             ${lowResUrl !== imageUrl ? 'onload="this.onload=null; this.src=this.dataset.full"' : ''}
                             style="object-fit: cover; object-position: top; width: 100%; height: 100%;">
                    ` : `
                        <div class="cw-skin-placeholder">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
                            </svg>
                        </div>
                    `}
                    ${unavailableBadge}
                    ${countdownBadge}
                </div>
                <div class="cw-skin-info">
                    <span class="sticker-name-pill">${escapeHtml(shell.name)}</span>
                    <span class="cw-skin-weapon-sub">${escapeHtml(shell.runnerName)}</span>
                </div>
                <div class="cw-heat-strip" data-slug="${shell.slug}">
                    <div class="cw-heat-fill"></div>
                    <div class="cw-heat-emojis">
                        <button class="cw-heat-emoji" data-rating="5" data-slug="${shell.slug}" title="Fire">
                            <span class="cw-emoji-icon">🔥</span>
                            <span class="cw-emoji-count" data-rating-count="5">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="4" data-slug="${shell.slug}" title="Love">
                            <span class="cw-emoji-icon">😍</span>
                            <span class="cw-emoji-count" data-rating-count="4">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="3" data-slug="${shell.slug}" title="Meh">
                            <span class="cw-emoji-icon">😐</span>
                            <span class="cw-emoji-count" data-rating-count="3">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="2" data-slug="${shell.slug}" title="Nah">
                            <span class="cw-emoji-icon">👎</span>
                            <span class="cw-emoji-count" data-rating-count="2">—</span>
                        </button>
                        <button class="cw-heat-emoji" data-rating="1" data-slug="${shell.slug}" title="Trash">
                            <span class="cw-emoji-icon">💩</span>
                            <span class="cw-emoji-count" data-rating-count="1">—</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format source string for display
     */
    function formatSource(source) {
        if (!source) return 'Unknown';
        const map = {
            'pre_order': 'Pre-Order',
            'preorder': 'Pre-Order',
            'deluxe_edition': 'Deluxe Edition',
            'deluxe-edition': 'Deluxe Edition',
            'battle_pass': 'Battle Pass',
            'battlepass': 'Battle Pass',
            'store': 'Store',
            'event': 'Event',
            'twitch_drop': 'Twitch Drop',
            'default': 'Default',
            'unknown': 'Unknown'
        };
        return map[source.toLowerCase()] || source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format vote count for compact display
     */
    function formatVoteCount(n) {
        if (!n || n === 0) return '\u2014';
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(n);
    }

    /**
     * Update emoji strip data from ratingsMap
     */
    function updateStripData(strip, slug) {
        const rating = ratingsMap[slug];
        const fill = strip.querySelector('.cw-heat-fill');

        if (!rating || rating.score_percent === null || rating.score_percent === undefined) {
            if (fill) fill.style.width = '0%';
            return;
        }

        if (fill) fill.style.width = `${Math.round(rating.score_percent)}%`;

        if (rating.distribution) {
            for (let v = 1; v <= 5; v++) {
                const countEl = strip.querySelector(`[data-rating-count="${v}"]`);
                if (countEl) {
                    const d = rating.distribution[v] || rating.distribution[String(v)];
                    countEl.textContent = formatVoteCount(d ? d.count : 0);
                }
            }
        }
    }

    /**
     * Apply ratings that were already embedded in the list response.
     * The new Skins API returns rating data per-skin in GET /api/skins,
     * so by the time this runs ratingsMap is already populated.
     */
    function loadHeatRatings() {
        // ratingsMap was seeded inside loadShells() from the embedded rating field.
        // Nothing extra to fetch — just trigger sort/render + badge pass.
        if (Object.keys(ratingsMap).length === 0) return;

        // Re-sort if most-fired is active (depends on fire counts)
        if (elements.sortSelect && elements.sortSelect.value === 'most-fired') {
            sortShells();
            renderShells();
        }

        // Update every visible strip that may have rendered before ratings were ready
        document.querySelectorAll('.cw-heat-strip').forEach(strip => {
            updateStripData(strip, strip.dataset.slug);
        });
        highlightUserVotes();
        markHotBadges();
    }

    /**
     * Mark the top fire-count skin(s) in the current view with a hot badge
     */
    function markHotBadges() {
        // Find the highest fire count among currently displayed skins
        let maxFire = 0;
        filteredShells.forEach(shell => {
            const d = ratingsMap[shell.slug]?.distribution;
            const count = d ? (d[5]?.count || d['5']?.count || 0) : 0;
            if (count > maxFire) maxFire = count;
        });

        if (maxFire === 0) return;

        // Show badge on any card tied for top fire count
        filteredShells.forEach(shell => {
            const d = ratingsMap[shell.slug]?.distribution;
            const count = d ? (d[5]?.count || d['5']?.count || 0) : 0;
            if (count === maxFire) {
                const card = document.querySelector(`.cw-skin-card[data-slug="${shell.slug}"]`);
                const badge = card?.querySelector('.cw-hot-badge');
                if (badge) badge.classList.add('visible');
            }
        });
    }

    /**
     * Highlight user's previous votes from localStorage
     */
    function highlightUserVotes() {
        const votes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
        Object.entries(votes).forEach(([slug, rating]) => {
            const strip = document.querySelector(`.cw-heat-strip[data-slug="${slug}"]`);
            if (!strip) return;
            strip.querySelectorAll('.cw-heat-emoji').forEach(btn => {
                if (parseInt(btn.dataset.rating) === rating) {
                    btn.classList.add('voted');
                }
            });
        });
    }

    /**
     * Generate (or retrieve) a stable per-device SHA-256 token for anonymous voting.
     */
    async function getDeviceToken() {
        let id = localStorage.getItem('mdb_device_id');
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36) + Date.now().toString(36));
            localStorage.setItem('mdb_device_id', id);
        }
        try {
            const data = new TextEncoder().encode(id + navigator.userAgent);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (_) {
            // Fallback: just use the raw id if Web Crypto unavailable
            return id;
        }
    }

    /**
     * Attach click handlers for emoji voting.
     * Uses POST /api/skins/:slug/rate on the dedicated Skins API.
     */
    function attachHeatEmojiHandlers() {
        document.querySelectorAll('.cw-heat-emoji').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const slug   = btn.dataset.slug;
                const rating = parseInt(btn.dataset.rating);
                if (!slug || isNaN(rating) || rating < 1 || rating > 5) return;

                const strip = btn.closest('.cw-heat-strip');
                strip.querySelectorAll('.cw-heat-emoji').forEach(b => b.classList.remove('voted'));
                btn.classList.add('voted');

                const votes = JSON.parse(localStorage.getItem('marathondb_emoji_votes') || '{}');
                votes[slug] = rating;
                localStorage.setItem('marathondb_emoji_votes', JSON.stringify(votes));

                try {
                    const token  = await getDeviceToken();
                    // POST is not a GET so call fetch directly with fallback
                    const postRes = await fetch(`${SKINS_API}/api/skins/${slug}/rate`, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ rating, device_token: token }),
                    }).catch(() => fetch(`${SKINS_API_FALLBACK}/api/skins/${slug}/rate`, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ rating, device_token: token }),
                    }));

                    if (postRes.ok) {
                        const body = await postRes.json();
                        if (body.success && body.aggregate) {
                            ratingsMap[slug] = normalizeRating(body.aggregate);
                            updateStripData(strip, slug);
                        }
                    }
                } catch (err) {
                    console.warn('Rating submission failed:', err);
                }
            });
        });
    }

    /**
     * Reset all filters
     */
    function resetAllFilters() {
        currentFilters = {
            search: '',
            runner: '',
            rarity: '',
            limited: false,
            source: '',
            hideDefaults: false,
            unavailable: false
        };

        elements.searchInput.value = '';
        elements.sortSelect.value = 'featured';

        // Reset runner tabs
        elements.runnerTabs.querySelectorAll('.category-tab-sm').forEach((t, i) => {
            t.classList.toggle('active', i === 0);
        });

        // Reset rarity pills
        elements.rarityPills.querySelectorAll('.filter-pill-sm').forEach((p, i) => {
            p.classList.toggle('active', i === 0);
        });

        applyFilters();
    }

    /**
     * Show error state
     */
    function showError() {
        elements.loadingState.innerHTML = `
            <div class="error-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Failed to load runner shells</h3>
                <p>Please try refreshing the page</p>
                <button class="btn-retry" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    /**
     * Utility: Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Utility: Capitalize first letter
     */
    function capitalizeFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    /**
     * Utility: Format slug to display name
     */
    function formatName(slug) {
        if (!slug) return 'Unknown';
        return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
