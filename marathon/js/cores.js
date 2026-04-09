// Cores Page JavaScript — Popout Modal Redesign
// All cores load on one page; clicking opens a detail popout (no separate detail pages)

let allCores = [];
let filteredCores = [];
let currentSort = 'rarity';
let currentCoreSlug = null; // tracks which core is open in the modal
let coreRatingsMap = {}; // slug → { score_percent, total_votes, distribution }
let coreRatingWidget = null; // active EmojiRatingWidget instance in modal

// Rating constants
const CORES_API = 'https://cores.marathondb.gg';
const DIST_KEYS = ['fire', 'love', 'meh', 'nah', 'trash'];
const RATING_TO_KEY = { 5: 'fire', 4: 'love', 3: 'meh', 2: 'nah', 1: 'trash' };

// ─── Constants ──────────────────────────────────────────────

const RUNNER_ICONS = {
    destroyer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    recon:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    thief:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    assassin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M14.5 4h-5L7 7H2l5.5 5.5L5 22h7l-2.5-5.5L12 13l2.5 3.5L12 22h7l-2.5-9.5L22 7h-5l-2.5-3z"/></svg>',
    vandal:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    triage:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
};

const CHANGE_TYPE_META = {
    added:     { icon: '✚', cls: 'new',    label: 'Added' },
    buffed:    { icon: '▲', cls: 'buff',   label: 'Buffed' },
    nerfed:    { icon: '▼', cls: 'nerf',   label: 'Nerfed' },
    reworked:  { icon: '⟳', cls: 'rework', label: 'Reworked' },
    removed:   { icon: '✕', cls: 'nerf',   label: 'Removed' },
    unchanged: { icon: '—', cls: 'new',    label: 'Unchanged' },
};

// ─── Initialisation ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    applyUrlFilters();
    await loadCores();

    // Search
    document.getElementById('coreSearch')?.addEventListener('input', filterAndSortCores);

    // Sort
    document.getElementById('coreSort')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndSortCores();
    });

    // Rarity & other selects
    document.getElementById('coreRarity')?.addEventListener('change', filterAndSortCores);

    // Runner tabs (runner-nav-pill style)
    document.querySelectorAll('.runner-nav-pill[data-runner]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.runner-nav-pill[data-runner]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterAndSortCores();
        });
    });

    // Rarity filter pills
    document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterAndSortCores();
        });
    });

    // Reset filters button
    document.getElementById('resetFilters')?.addEventListener('click', () => {
        // Reset runner tabs
        document.querySelectorAll('.runner-nav-pill[data-runner]').forEach(t => t.classList.remove('active'));
        document.querySelector('.runner-nav-pill[data-runner=""]')?.classList.add('active');
        // Reset rarity pills
        document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(p => p.classList.remove('active'));
        document.querySelector('#rarityFilterPills .filter-pill-sm[data-filter="all"]')?.classList.add('active');
        // Reset search
        const searchEl = document.getElementById('coreSearch');
        if (searchEl) searchEl.value = '';
        // Reset sort
        const sortEl = document.getElementById('coreSort');
        if (sortEl) sortEl.value = 'rarity';
        currentSort = 'rarity';
        filterAndSortCores();
    });

    // ─── Modal wiring ───────────────────────────────────────
    // Grid click delegation (set up once — covers all future card renders)
    const coresGrid = document.getElementById('coresGrid');
    if (coresGrid) {
        coresGrid.addEventListener('click', handleGridClick);
        coresGrid.addEventListener('keydown', handleGridKeydown);
    }

    document.getElementById('coreModalBackdrop')?.addEventListener('click', closeCoreModal);
    document.getElementById('coreModalClose')?.addEventListener('click', closeCoreModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCoreModal();
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.coreSlug) {
            openCoreModal(e.state.coreSlug, true);
        } else {
            closeCoreModal(true);
        }
    });

    // Check if a core slug is in the URL on load (e.g. ?core=siphon-strike)
    const params = new URLSearchParams(window.location.search);
    const coreParam = params.get('core');
    if (coreParam) {
        openCoreModal(coreParam, true);
    }
});

// ─── Data Corrections (SEO rec #7 & #8) ─────────────────────

const NAME_CORRECTIONS = {
    'Botique': 'Boutique',
};

function applyDataCorrections(cores) {
    const nameCounts = {};
    for (const c of cores) {
        if (NAME_CORRECTIONS[c.name]) c.name = NAME_CORRECTIONS[c.name];
        nameCounts[c.name] = (nameCounts[c.name] || 0) + 1;
    }
    for (const c of cores) {
        if (nameCounts[c.name] > 1) {
            c.name = `${c.name} (${capitalizeFirst((c.runner_type || '').toLowerCase())})`;
        }
    }
    return cores;
}

// ─── Data Loading ───────────────────────────────────────────

async function loadCores() {
    try {
        // Prefer prebuilt data (instant, no API call)
        if (window.__CORES_DATA && Array.isArray(window.__CORES_DATA) && window.__CORES_DATA.length > 0) {
            allCores = applyDataCorrections(window.__CORES_DATA);
            filteredCores = [...allCores];
            filterAndSortCores();
            updateCount();
            return;
        }

        // Fallback: fetch from API
        const response = await MarathonAPI.getCores();
        if (response && response.data) {
            allCores = applyDataCorrections(response.data);
            filteredCores = [...allCores];
            filterAndSortCores();
            updateCount();
        } else {
            showEmpty('No cores data available');
        }
    } catch (error) {
        console.error('Error loading cores:', error);
        showError('Failed to load cores');
    }
}

// ─── Grid: Filter, Sort, Display ────────────────────────────

function filterAndSortCores() {
    const searchQuery = document.getElementById('coreSearch')?.value.toLowerCase() || '';
    const activeRarityPill = document.querySelector('#rarityFilterPills .filter-pill-sm.active');
    const rarityFilter = (activeRarityPill?.dataset.filter || 'all') === 'all' ? '' : activeRarityPill.dataset.filter;
    const activeTab = document.querySelector('.runner-nav-pill[data-runner].active');
    const runnerFilter = activeTab?.dataset.runner || '';

    filteredCores = allCores.filter(core => {
        if (searchQuery) {
            const name = (core.name || '').toLowerCase();
            const description = (core.description || '').toLowerCase();
            if (!name.includes(searchQuery) && !description.includes(searchQuery)) return false;
        }
        if (runnerFilter && (core.runner_type || '').toLowerCase() !== runnerFilter.toLowerCase()) return false;
        if (rarityFilter && (core.rarity || '') !== rarityFilter) return false;
        return true;
    });

    sortCores();
    displayCores(filteredCores);
    updateCount();
    updateClearBtn();
}

function sortCores() {
    const rarityOrder = { prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };
    filteredCores.sort((a, b) => {
        switch (currentSort) {
            case 'name':      return (a.name || '').localeCompare(b.name || '');
            case 'name-desc': return (b.name || '').localeCompare(a.name || '');
            case 'rarity': {
                const rd = (rarityOrder[(b.rarity || 'standard').toLowerCase()] || 0) -
                           (rarityOrder[(a.rarity || 'standard').toLowerCase()] || 0);
                if (rd !== 0) return rd;
                const rc = (a.runner_type || a.runner || '').localeCompare(b.runner_type || b.runner || '');
                if (rc !== 0) return rc;
                return (a.name || '').localeCompare(b.name || '');
            }
            case 'credits':   return (b.credits || b.cost || 0) - (a.credits || a.cost || 0);
            default: return 0;
        }
    });
}

function updateCount() {
    const el = document.getElementById('coreCount');
    if (el) el.textContent = `(${filteredCores.length})`;
}

function updateClearBtn() {
    const btn = document.getElementById('capClearBtn');
    if (btn) btn.style.display = 'none';
}

function displayCores(cores) {
    const grid = document.getElementById('coresGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;

    if (!cores || cores.length === 0) {
        grid.innerHTML = '';
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = '';
        return;
    }

    grid.style.display = '';
    if (emptyState) emptyState.style.display = 'none';

    let adCount = 0;
    grid.innerHTML = cores.map((core, idx) => {
        const iconUrl = core.icon_url || MarathonAPI.getCoreIconUrl(core.icon_path || core.slug);
        const rarity = (core.rarity || 'standard').toLowerCase();
        const runnerType = (core.runner_type || 'unknown').toLowerCase();
        const isActive = core.is_active !== false;
        const slug = core.slug || core.id;
        const credits = core.credits || core.cost || 0;

        let adRow = '';
        if (idx > 0 && idx % 8 === 0 && adCount < 2) {
            adCount++;
            adRow = `<div class="ad-safe-zone ad-safe-zone--in-grid">
                <span class="ad-label">Ad</span>
                <div class="ad-container">
                    <ins class="adsbygoogle"
                         style="display:block"
                         data-ad-client="ca-pub-1865737750178944"
                         data-ad-slot="4792908350"
                         data-ad-format="auto"
                         data-full-width-responsive="true"></ins>
                </div>
            </div>`;
        }

        return adRow + `
            <div class="core-card ${rarity}" data-slug="${escapeAttr(slug)}" role="button" tabindex="0">
                <div class="core-card-glow"></div>
                <div class="core-card-header">
                    <span class="core-runner-pill ${runnerType}">${getRunnerIcon(runnerType)} ${formatRunnerType(runnerType)}</span>
                    <span class="core-rarity-tag ${rarity}">${escapeHtml(core.rarity || 'Standard')}</span>
                </div>
                <div class="core-icon-container">
                    <div class="core-icon ${rarity}">
                        <img src="${iconUrl}" alt="${escapeHtml(core.name)} – Marathon ${formatRunnerType(runnerType)} core" onerror="this.parentElement.classList.add('icon-fallback')" loading="lazy">
                    </div>
                    <div class="core-name">${escapeHtml(core.name || 'Unknown')}${core.verified ? '<span class="verified-badge" title="Item is fully verified from ingame data"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>' : ''}</div>
                </div>
                <div class="core-card-content">
                    ${core.description ? `<div class="core-description-snippet">${escapeHtml(core.description)}</div>` : ''}
                </div>
                <div class="core-card-footer">
                    ${credits ? `<span class="core-card-credits"><img src="/marathon/assets/icons/credits.webp" alt="" width="14" height="14">${credits.toLocaleString()}</span>` : '<span></span>'}
                    <span class="core-card-cta">View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
                </div>
                <div class="cw-heat-strip" data-slug="${escapeAttr(slug)}">
                    <div class="cw-heat-fill"></div>
                    <div class="cw-heat-emojis">
                        <button class="cw-heat-emoji" data-rating="5" data-slug="${escapeAttr(slug)}" title="Fire"><span class="cw-emoji-icon">\ud83d\udd25</span><span class="cw-emoji-count" data-rating-count="5">\u2014</span></button>
                        <button class="cw-heat-emoji" data-rating="4" data-slug="${escapeAttr(slug)}" title="Love"><span class="cw-emoji-icon">\ud83d\ude0d</span><span class="cw-emoji-count" data-rating-count="4">\u2014</span></button>
                        <button class="cw-heat-emoji" data-rating="3" data-slug="${escapeAttr(slug)}" title="Meh"><span class="cw-emoji-icon">\ud83d\ude10</span><span class="cw-emoji-count" data-rating-count="3">\u2014</span></button>
                        <button class="cw-heat-emoji" data-rating="2" data-slug="${escapeAttr(slug)}" title="Nah"><span class="cw-emoji-icon">\ud83d\udc4e</span><span class="cw-emoji-count" data-rating-count="2">\u2014</span></button>
                        <button class="cw-heat-emoji" data-rating="1" data-slug="${escapeAttr(slug)}" title="Trash"><span class="cw-emoji-icon">\ud83d\udca9</span><span class="cw-emoji-count" data-rating-count="1">\u2014</span></button>
                    </div>
                </div>
                ${!isActive ? '<div class="core-inactive-badge">Inactive</div>' : ''}
            </div>
        `;
    }).join('');

    // Seed ratingsMap from prebuilt data and update strips
    seedCoreRatings();
    attachCoreHeatHandlers();
    highlightCoreUserVotes();

    // Fetch live ratings in the background (prebuilt data may be stale)
    refreshCoreRatingsFromAPI();

    // Push in-grid ads (injected via innerHTML, need manual push)
    grid.querySelectorAll('.ad-safe-zone--in-grid ins.adsbygoogle').forEach(() => {
        try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
}

function handleGridClick(e) {
    const card = e.target.closest('.core-card[data-slug]');
    if (card) openCoreModal(card.dataset.slug);
}

function handleGridKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.core-card[data-slug]');
        if (card) { e.preventDefault(); openCoreModal(card.dataset.slug); }
    }
}

// ─── Modal: Open / Close / Render ───────────────────────────

async function openCoreModal(slug, skipPush) {
    if (!slug) return;
    currentCoreSlug = slug;

    const overlay = document.getElementById('coreModal');
    if (!overlay) return;

    // Show overlay immediately with loading state
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Push modal ads on first open (deferred so they don't load on hidden page)
    if (!overlay._adsPushed) {
        overlay._adsPushed = true;
        setTimeout(() => {
            overlay.querySelectorAll('ins.adsbygoogle').forEach(() => {
                try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
            });
        }, 300);
    }

    // Set loading state
    document.getElementById('coreModalName').textContent = 'Loading...';
    document.getElementById('coreModalDescription').textContent = '';
    document.getElementById('coreModalBadges').innerHTML = '';
    document.getElementById('coreModalQuickStats').innerHTML = '';
    document.getElementById('coreModalHistory').innerHTML = '';
    document.getElementById('coreModalMeta').innerHTML = '';
    document.getElementById('coreModalIcon').src = '';
    const ratingContainer = document.getElementById('coreModalRating');
    if (ratingContainer) ratingContainer.innerHTML = '';
    hideAllSections();

    // Update URL
    if (!skipPush) {
        const url = new URL(window.location);
        url.searchParams.set('core', slug);
        history.pushState({ coreSlug: slug }, '', url);
    }

    // Render SEO detail block for crawlers
    renderSeoDetailBlock(slug);

    try {
        const response = await MarathonAPI.getCoreBySlug(slug);
        if (!response || !response.data) {
            document.getElementById('coreModalName').textContent = 'Core not found';
            return;
        }
        renderCoreModal(response.data);
    } catch (err) {
        console.error('Failed to load core detail:', err);
        document.getElementById('coreModalName').textContent = 'Error loading core';
    }
}

function closeCoreModal(skipPush) {
    const overlay = document.getElementById('coreModal');
    if (!overlay) return;
    if (!overlay.classList.contains('active')) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    currentCoreSlug = null;

    // Remove SEO detail block
    removeSeoDetailBlock();

    // Remove breadcrumb extension
    const bc = document.getElementById('coreDetailBreadcrumb');
    if (bc) {
        const prev = bc.previousElementSibling;
        if (prev && prev.tagName === 'svg') prev.remove();
        bc.remove();
    }

    if (skipPush !== true) {
        const url = new URL(window.location);
        url.searchParams.delete('core');
        history.pushState({}, '', url.pathname + (url.search || ''));
    }
}

function hideAllSections() {
    ['coreModalHistorySection', 'coreModalRatingSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function renderCoreModal(core) {
    const rarity = (core.rarity || 'standard').toLowerCase();
    const runnerType = (core.runner_type || 'unknown').toLowerCase();
    const iconUrl = core.icon_url || MarathonAPI.getCoreIconUrl(core.icon_path || core.slug);

    // Icon
    const iconImg = document.getElementById('coreModalIcon');
    iconImg.src = iconUrl;
    iconImg.alt = core.name || '';

    const iconFrame = document.getElementById('coreModalIconFrame');
    iconFrame.className = 'core-modal-icon-frame ' + rarity;

    const glow = document.getElementById('coreModalRarityGlow');
    glow.className = 'core-modal-rarity-glow ' + rarity;

    // Name
    document.getElementById('coreModalName').textContent = core.name || 'Unknown Core';

    // Description
    document.getElementById('coreModalDescription').textContent = core.description || '';

    // Badges (runner + rarity + verified + purchaseable)
    const verifiedBadge = core.verified
        ? `<span class="cd-badge cd-badge-verified" title="Item is fully verified from ingame data">
               <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
               Verified
           </span>`
        : '';
    const purchaseableBadge = core.is_purchaseable
        ? `<span class="cd-badge cd-badge-purchaseable" title="Available from in-game vendor">\ud83c\udfea Purchaseable</span>`
        : '';
    const credits = core.credits;
    const valueBadge = credits
        ? `<span class="cd-badge cd-badge-value"><img src="/marathon/assets/icons/credits.webp" alt="" width="12" height="12" style="vertical-align:middle"> ${credits.toLocaleString()}</span>`
        : '';
    document.getElementById('coreModalBadges').innerHTML = `
        <span class="cd-badge cd-badge-runner ${runnerType}">
            ${getRunnerIcon(runnerType)}
            ${formatRunnerType(runnerType)}
        </span>
        <span class="cd-badge cd-badge-rarity ${rarity}">
            ${formatRarityLabel(rarity)}
        </span>
        ${verifiedBadge}
        ${purchaseableBadge}
        ${valueBadge}
    `;

    // Quick stats
    renderQuickStats(core);

    // History
    renderHistory(core);

    // Meta
    renderMeta(core);

    // Community Rating Widget
    renderCoreRatingWidget(core);

    // Share buttons
    bindShareButtons(core);
}

// ─── Modal Section Renderers ────────────────────────────────

function renderQuickStats(core) {
    const stats = [];
    const qsSection = document.getElementById('coreModalQuickStats');
    if (core.is_purchaseable) {
        if (core.vendor_name) {
            stats.push('<div class="core-modal-qs"><span class="core-modal-qs-label">Vendor</span><span class="core-modal-qs-value">' + escapeHtml(core.vendor_name) + '</span></div>');
        }
        if (core.vendor_rank) {
            stats.push('<div class="core-modal-qs"><span class="core-modal-qs-label">Required Rank</span><span class="core-modal-qs-value">' + escapeHtml(core.vendor_rank) + '</span></div>');
        }
        if (core.purchase_location) {
            stats.push('<div class="core-modal-qs"><span class="core-modal-qs-label">Location</span><span class="core-modal-qs-value">' + escapeHtml(core.purchase_location) + '</span></div>');
        }
    }
    qsSection.innerHTML = stats.join('');
    qsSection.style.display = stats.length ? '' : 'none';
}

function renderHistory(core) {
    const history = core.history || [];
    const section = document.getElementById('coreModalHistorySection');
    const container = document.getElementById('coreModalHistory');
    if (!history.length) { section.style.display = 'none'; return; }

    section.style.display = '';
    container.innerHTML = history.map((h, i) => {
        const meta = CHANGE_TYPE_META[h.change_type] || CHANGE_TYPE_META.unchanged;
        const isLast = i === history.length - 1;
        let changesHtml = '';

        if (h.previous_values || h.new_values) {
            try {
                const prev = typeof h.previous_values === 'string' ? JSON.parse(h.previous_values) : h.previous_values;
                const next = typeof h.new_values === 'string' ? JSON.parse(h.new_values) : h.new_values;
                const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
                changesHtml = Array.from(allKeys).map(key => {
                    const oldVal = prev?.[key] ?? '—';
                    const newVal = next?.[key] ?? '—';
                    const direction = (typeof newVal === 'number' && typeof oldVal === 'number')
                        ? (newVal > oldVal ? 'buff' : newVal < oldVal ? 'nerf' : '') : '';
                    return '<div class="core-modal-hist-change">' +
                        '<span class="core-modal-hist-key">' + formatLabel(key) + '</span>' +
                        '<span class="core-modal-hist-old">' + oldVal + '</span>' +
                        '<span class="core-modal-hist-arrow">→</span>' +
                        '<span class="core-modal-hist-new ' + direction + '">' + newVal + '</span></div>';
                }).join('');
            } catch (_) { /* ignore parse errors */ }
        }

        return `
            <div class="core-modal-hist-entry">
                <div class="core-modal-hist-marker">
                    <div class="core-modal-hist-dot ${meta.cls}">${meta.icon}</div>
                    ${!isLast ? '<div class="core-modal-hist-line"></div>' : ''}
                </div>
                <div class="core-modal-hist-body">
                    <div class="core-modal-hist-header">
                        <span class="change-type-badge ${meta.cls}">${meta.label}</span>
                        ${h.changed_at ? '<span class="core-modal-hist-date">' + new Date(h.changed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</span>' : ''}
                    </div>
                    ${h.summary ? '<p class="core-modal-hist-summary">' + escapeHtml(h.summary) + '</p>' : ''}
                    ${changesHtml ? '<div class="core-modal-hist-changes">' + changesHtml + '</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderMeta(core) {
    const rows = [];
    if (core.is_active !== undefined) rows.push(['Status', core.is_active ? 'Active' : 'Inactive']);
    if (core.is_purchaseable) rows.push(['Purchaseable', 'Yes']);

    const container = document.getElementById('coreModalMeta');
    if (!rows.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div class="core-modal-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <h3>Details</h3>
        </div>
        <dl class="core-modal-meta-list">
            ${rows.map(([k, v]) => '<div class="core-modal-meta-row"><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('')}
        </dl>
    `;
}

// ─── Share Buttons ────────────────────────────────────────────

function bindShareButtons(core) {
    const pageUrl = window.location.href;
    const toastEl = document.getElementById('coreShareToast');
    const rarity = (core.rarity || 'standard').toLowerCase();
    const rarityLabel = capitalizeFirst(rarity);
    const runnerType = capitalizeFirst((core.runner_type || 'unknown'));
    const coreName = core.name || 'Unknown Core';

    function showToast(msg, cls) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.className = 'item-share-toast ' + (cls || '') + ' active';
        setTimeout(function () { toastEl.classList.remove('active'); }, 2500);
    }

    var twitterBtn = document.getElementById('coreShareTwitter');
    var discordBtn = document.getElementById('coreShareDiscord');
    var copyBtn    = document.getElementById('coreShareCopy');

    // Clone & replace to remove old listeners
    [twitterBtn, discordBtn, copyBtn].forEach(function (btn) {
        if (!btn) return;
        var clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
    });

    document.getElementById('coreShareTwitter')?.addEventListener('click', function () {
        var text = encodeURIComponent(coreName + ' \u2014 ' + rarityLabel + ' ' + runnerType + ' Core on MarathonDB');
        window.open('https://x.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(pageUrl), '_blank', 'width=550,height=420');
    });

    document.getElementById('coreShareDiscord')?.addEventListener('click', async function () {
        try {
            await navigator.clipboard.writeText('**' + coreName + '** \u2014 ' + rarityLabel + ' ' + runnerType + ' Core\n' + pageUrl);
            showToast('Discord text copied!', 'toast-discord');
        } catch (e) { console.error('Copy failed', e); }
    });

    document.getElementById('coreShareCopy')?.addEventListener('click', async function () {
        try {
            await navigator.clipboard.writeText(pageUrl);
            showToast('Link copied to clipboard!', 'toast-copy');
        } catch (e) { console.error('Copy failed', e); }
    });
}

// ─── SEO Detail Block (for ?core= URLs) ───────────────────
// Renders a crawlable detail section, updates canonical, title,
// meta description, OG/Twitter tags, injects TechArticle JSON-LD,
// and extends the breadcrumb.

function renderSeoDetailBlock(slug) {
    const container = document.getElementById('coreDetailSeo');
    if (!container) return;

    // Find core in prebuilt data (available before API call)
    const core = (window.__CORES_DATA || allCores || [])
        .find(c => c.slug === slug);
    if (!core) return; // will fall through to modal's API fetch

    const rarity     = (core.rarity || 'standard').toLowerCase();
    const runnerType = (core.runner_type || 'unknown').toLowerCase();
    const rarityLabel = capitalizeFirst(rarity);
    const runnerLabel = capitalizeFirst(runnerType);
    const iconUrl    = core.icon_url || MarathonAPI.getCoreIconUrl(core.icon_path || core.slug);

    // ── 1. Update <link rel="canonical"> ──
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        canonical.href = `https://gdb.gg/marathon/cores/?core=${encodeURIComponent(slug)}`;
    }

    // ── 2. Update <title> ──
    document.title = `${core.name} – ${rarityLabel} ${runnerLabel} Core | GDB.GG`;

    // ── 3. Update meta description ──
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        const descText = core.description
            ? `${core.name}: ${core.description} ${rarityLabel} ${runnerLabel} core with full stats, effects, and balance history.`
            : `${core.name} is a ${rarityLabel} ${runnerLabel} core in Marathon. View full stats, effects, perk rolls, and balance history.`;
        metaDesc.content = descText;
    }

    // ── 4. Update OG / Twitter tags ──
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = `${core.name} – ${rarityLabel} ${runnerLabel} Core | GDB.GG`;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = metaDesc ? metaDesc.content : '';
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = `https://gdb.gg/marathon/cores/?core=${encodeURIComponent(slug)}`;
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.content = `${core.name} – ${rarityLabel} ${runnerLabel} Core | GDB.GG`;
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.content = metaDesc ? metaDesc.content : '';

    // ── 5. Inject TechArticle structured data ──
    const itemSchema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        'name': core.name,
        'headline': `${core.name} – Marathon ${runnerLabel} Core`,
        'description': core.description || `${core.name} is a ${rarityLabel} ${runnerLabel} core in Bungie's Marathon.`,
        'url': `https://gdb.gg/marathon/cores/?core=${encodeURIComponent(slug)}`,
        'image': iconUrl.startsWith('http') ? iconUrl : `https://gdb.gg/${iconUrl}`,
        'isPartOf': {
            '@type': 'CollectionPage',
            'name': 'Marathon Cores Database',
            'url': 'https://gdb.gg/marathon/cores/'
        },
        'about': {
            '@type': 'Thing',
            'name': 'Marathon',
            'description': "Extraction shooter by Bungie"
        },
        'author': {
            '@type': 'Organization',
            'name': 'GDB.GG',
            'url': 'https://gdb.gg'
        }
    };
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(itemSchema);
    document.head.appendChild(schemaScript);

    // ── 6. Extend breadcrumb (Home > Cores > Core Name) ──
    // Remove any existing detail breadcrumb first to prevent accumulation
    const existingBc = document.getElementById('coreDetailBreadcrumb');
    if (existingBc) {
        const prevSvg = existingBc.previousElementSibling;
        if (prevSvg && prevSvg.tagName === 'svg') prevSvg.remove();
        existingBc.remove();
    }
    const breadcrumbOl = document.querySelector('.detail-breadcrumb ol');
    if (breadcrumbOl) {
        const chevron = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
        // Make "Cores" a link
        const coresBreadcrumb = breadcrumbOl.querySelectorAll('li')[1];
        if (coresBreadcrumb) {
            const nameSpan = coresBreadcrumb.querySelector('[itemprop="name"]');
            if (nameSpan && !coresBreadcrumb.querySelector('a')) {
                const link = document.createElement('a');
                link.setAttribute('itemprop', 'item');
                link.href = '/marathon/cores/';
                link.appendChild(nameSpan);
                coresBreadcrumb.prepend(link);
            }
        }
        // Add core name as 3rd breadcrumb
        const li = document.createElement('li');
        li.setAttribute('itemprop', 'itemListElement');
        li.setAttribute('itemscope', '');
        li.setAttribute('itemtype', 'https://schema.org/ListItem');
        li.id = 'coreDetailBreadcrumb';
        li.innerHTML = `<span itemprop="name">${escapeHtml(core.name)}</span><meta itemprop="position" content="3" />`;
        breadcrumbOl.insertAdjacentHTML('beforeend', chevron);
        breadcrumbOl.appendChild(li);
    }

    // ── 7. Render visible detail section ──
    // Quick stats
    const statParts = [];
    const credits = core.credits;
    if (credits) statParts.push(`<li><strong>Value:</strong> ${credits.toLocaleString()} credits</li>`);
    if (core.is_purchaseable && core.vendor_name) {
        statParts.push(`<li><strong>Vendor:</strong> ${escapeHtml(core.vendor_name)}</li>`);
    }
    const statsListHtml = statParts.length ? `<ul class="core-seo-quick-stats">${statParts.join('')}</ul>` : '';

    container.innerHTML = `
        <div class="core-seo-detail ${rarity}">
            <div class="core-seo-detail-header">
                <div class="core-seo-detail-icon ${rarity}">
                    <img src="${iconUrl}" alt="${escapeHtml(core.name)} – Marathon ${runnerLabel} core" loading="eager"
                         onerror="this.parentElement.classList.add('icon-fallback')">
                </div>
                <div class="core-seo-detail-title">
                    <h2 class="core-seo-detail-name">${escapeHtml(core.name)}</h2>
                    <div class="core-seo-detail-badges">
                        <span class="cd-badge cd-badge-runner ${runnerType}">${getRunnerIcon(runnerType)} ${runnerLabel}</span>
                        <span class="core-rarity-tag ${rarity}">${rarityLabel}</span>
                        ${credits ? `<span class="core-seo-credits">${credits} credits</span>` : ''}
                    </div>
                </div>
            </div>
            ${core.description ? `<p class="core-seo-detail-desc">${escapeHtml(core.description)}</p>` : ''}
            ${statsListHtml}
            <p class="core-seo-backlink"><a href="/marathon/cores/">← Browse all Marathon cores</a></p>
        </div>
    `;
    container.style.display = '';
}

// Remove the SEO detail block when navigating away from an item URL
function removeSeoDetailBlock() {
    const container = document.getElementById('coreDetailSeo');
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    // Restore canonical to hub page
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://gdb.gg/marathon/cores/';
    // Restore title
    document.title = 'Marathon Cores – All Runner Upgrades, Stats & Effects | GDB.GG';
}

// ─── Helpers ────────────────────────────────────────────────

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getRunnerIcon(runnerType) {
    return RUNNER_ICONS[runnerType] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>';
}

function formatRunnerType(type) {
    if (!type) return 'Unknown';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatRarityLabel(r) {
    if (!r) return 'Standard';
    return r.charAt(0).toUpperCase() + r.slice(1);
}

function formatLabel(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function showEmpty(message) {
    const grid = document.getElementById('coresGrid');
    if (grid) grid.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><p>' + message + '</p></div>';
}

function showError(message) {
    const grid = document.getElementById('coresGrid');
    if (grid) grid.innerHTML = '<div class="empty-state error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><p>' + message + '</p></div>';
}

function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const runner = params.get('runner') || params.get('runner_type');
    if (runner) {
        const tab = document.querySelector('.runner-nav-pill[data-runner="' + runner.toLowerCase() + '"]');
        if (tab) {
            document.querySelectorAll('.runner-nav-pill[data-runner]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        }
    }
    const rarity = params.get('rarity');
    if (rarity) { const sel = document.getElementById('coreRarity'); if (sel) sel.value = rarity; }
}

// ─── Community Ratings (Heat Strip) ─────────────────────────

function normalizeRating(raw) {
    if (!raw) return null;
    const dist = raw.distribution || {};
    return {
        score_percent: raw.score_percent ?? null,
        total_votes:   raw.total_votes ?? 0,
        distribution: {
            5: dist.fire  || { count: 0, percent: 0 },
            4: dist.love  || { count: 0, percent: 0 },
            3: dist.meh   || { count: 0, percent: 0 },
            2: dist.nah   || { count: 0, percent: 0 },
            1: dist.trash || { count: 0, percent: 0 },
        },
    };
}

function seedCoreRatings() {
    // Seed from prebuilt __CORES_DATA rating fields
    (window.__CORES_DATA || allCores || []).forEach(core => {
        if (core.rating && !coreRatingsMap[core.slug]) {
            coreRatingsMap[core.slug] = normalizeRating(core.rating);
        }
    });
    // Update all visible strips
    document.querySelectorAll('.cw-heat-strip').forEach(strip => {
        updateCoreStripData(strip, strip.dataset.slug);
    });
}

// Fetch live ratings from the API and refresh all heat strips.
// Prebuilt __CORES_DATA may have stale/null ratings from build time.
async function refreshCoreRatingsFromAPI() {
    try {
        const res = await fetch(`${CORES_API}/api/cores`, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return;
        const body = await res.json();
        const cores = (body && body.data) || body;
        if (!Array.isArray(cores)) return;

        for (const core of cores) {
            if (core.rating && core.slug) {
                coreRatingsMap[core.slug] = normalizeRating(core.rating);
            }
        }
        document.querySelectorAll('.cw-heat-strip').forEach(strip => {
            updateCoreStripData(strip, strip.dataset.slug);
        });
    } catch (_) { /* ratings refresh is non-critical */ }
}

function formatVoteCount(n) {
    if (!n || n === 0) return '\u2014';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

function updateCoreStripData(strip, slug) {
    const rating = coreRatingsMap[slug];
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

async function getCoreDeviceToken() {
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
        return id;
    }
}

function attachCoreHeatHandlers() {
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

            // Store vote locally
            const votes = JSON.parse(localStorage.getItem('marathondb_core_votes') || '{}');
            votes[slug] = rating;
            localStorage.setItem('marathondb_core_votes', JSON.stringify(votes));

            try {
                const token = await getCoreDeviceToken();
                const res = await fetch(`${CORES_API}/api/cores/${encodeURIComponent(slug)}/rate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating, device_token: token }),
                });
                if (res.ok) {
                    const body = await res.json();
                    if (body.success && body.aggregate) {
                        coreRatingsMap[slug] = normalizeRating(body.aggregate);
                        updateCoreStripData(strip, slug);
                    }
                }
            } catch (err) {
                console.warn('Core rating submission failed:', err);
            }
        });
    });
}

function highlightCoreUserVotes() {
    const votes = JSON.parse(localStorage.getItem('marathondb_core_votes') || '{}');
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

// ─── Modal Rating Widget ────────────────────────────────────

function renderCoreRatingWidget(core) {
    const container = document.getElementById('coreModalRating');
    if (!container) return;

    const section = document.getElementById('coreModalRatingSection');
    if (section) section.style.display = '';

    const rating = core.rating ? normalizeRating(core.rating) : coreRatingsMap[core.slug] || null;
    const userVotes = JSON.parse(localStorage.getItem('marathondb_core_votes') || '{}');
    const userVote = userVotes[core.slug] || null;

    const scoreDisplay = rating && rating.score_percent !== null
        ? `${Math.round(rating.score_percent)}%`
        : '\u2014';
    const votesDisplay = rating ? `${rating.total_votes} ${rating.total_votes === 1 ? 'vote' : 'votes'}` : '0 votes';

    const emojiButtons = [
        { value: 5, emoji: '\ud83d\udd25', label: 'Fire' },
        { value: 4, emoji: '\ud83d\ude0d', label: 'Love' },
        { value: 3, emoji: '\ud83d\ude10', label: 'Meh' },
        { value: 2, emoji: '\ud83d\udc4e', label: 'Nah' },
        { value: 1, emoji: '\ud83d\udca9', label: 'Trash' },
    ];

    const distBars = emojiButtons.map(t => {
        const d = rating?.distribution?.[t.value] || { count: 0, percent: 0 };
        const colors = { 5: '#ff4500', 4: '#ff69b4', 3: '#ffa500', 2: '#808080', 1: '#8b4513' };
        return `<div class="emoji-dist-row" data-value="${t.value}">
            <span class="emoji-dist-icon">${t.emoji}</span>
            <div class="emoji-dist-bar-bg">
                <div class="emoji-dist-bar-fill" style="width: ${d.percent}%; background-color: ${colors[t.value]};"></div>
            </div>
            <span class="emoji-dist-count">${formatVoteCount(d.count)}</span>
        </div>`;
    }).join('');

    container.innerHTML = `
        <div class="emoji-rating-widget core-rating-widget">
            <div class="emoji-rating-header">
                <h3 class="emoji-rating-title">COMMUNITY RATING</h3>
                <div class="emoji-rating-votes">${votesDisplay}</div>
            </div>
            <div class="emoji-rating-body">
                <div class="emoji-score-display">
                    <span class="emoji-score-number">${scoreDisplay}</span>
                </div>
                <div class="emoji-rating-bar">
                    ${emojiButtons.map(t => `
                        <button class="emoji-rate-btn${userVote === t.value ? ' selected' : ''}" data-value="${t.value}" title="${t.label}">
                            <span class="emoji-rate-icon">${t.emoji}</span>
                            <span class="emoji-rate-label">${t.label}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="emoji-distribution">
                    ${distBars}
                </div>
                ${userVote ? `<div class="emoji-user-rating"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Your vote: <strong>${emojiButtons.find(e => e.value === userVote)?.emoji || ''}</strong></div>` : ''}
            </div>
        </div>
    `;

    // Attach vote handlers
    container.querySelectorAll('.emoji-rate-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const value = parseInt(btn.dataset.value);
            if (!value || value < 1 || value > 5) return;

            // Highlight immediately
            container.querySelectorAll('.emoji-rate-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            // Store locally
            const votes = JSON.parse(localStorage.getItem('marathondb_core_votes') || '{}');
            votes[core.slug] = value;
            localStorage.setItem('marathondb_core_votes', JSON.stringify(votes));

            try {
                const token = await getCoreDeviceToken();
                const res = await fetch(`${CORES_API}/api/cores/${encodeURIComponent(core.slug)}/rate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: value, device_token: token }),
                });
                if (res.ok) {
                    const body = await res.json();
                    if (body.success && body.aggregate) {
                        coreRatingsMap[core.slug] = normalizeRating(body.aggregate);
                        // Re-render widget with updated data
                        renderCoreRatingWidget({ ...core, rating: body.aggregate });
                        // Also update the grid strip if visible
                        const gridStrip = document.querySelector(`.cw-heat-strip[data-slug="${core.slug}"]`);
                        if (gridStrip) updateCoreStripData(gridStrip, core.slug);
                    }
                }
            } catch (err) {
                console.warn('Core modal rating failed:', err);
            }
        });
    });
}
