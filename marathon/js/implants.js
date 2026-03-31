// Implants Page JavaScript — Popout Modal Redesign
// All implants load on one page; clicking opens a detail popout (no separate detail pages)

let allImplants = [];
let filteredImplants = [];
let currentSort = 'rarity';
let currentSlot = '';
let currentImplantSlug = null; // tracks which implant is open in the modal
let traitsCatalog = []; // global traits catalog fetched once
let implantRatingsMap = {}; // community ratings keyed by slug

const IMPLANTS_API = 'https://implants.marathondb.gg';

// ─── Constants ──────────────────────────────────────────────

const SLOT_ICONS_SVG = {
    head:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
    torso:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><rect x="8" y="2" width="8" height="12" rx="2"/></svg>',
    legs:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M6 2v8l-2 10h4l2-10V2M18 2v8l-2 10h4l2-10V2M14 2v8l-2 10"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
};

const SLOT_ICON_URLS = {
    head:   'https://helpbot.marathondb.gg/assets/items/implants/head-72x72.png',
    torso:  'https://helpbot.marathondb.gg/assets/items/implants/torso-72x72.png',
    legs:   'https://helpbot.marathondb.gg/assets/items/implants/legs-72x72.png',
    shield: 'https://helpbot.marathondb.gg/assets/items/implants/shield-72x72.png',
};

const STAT_LABELS_FULL = {
    agility:          'Agility',
    fallResistance:   'Fall Resistance',
    finisherSiphon:   'Finisher Siphon',
    firewall:         'Firewall',
    hardware:         'Hardware',
    heatCapacity:     'Heat Capacity',
    lootSpeed:        'Loot Speed',
    meleeDamage:      'Melee Damage',
    pingDuration:     'Ping Duration',
    primeRecovery:    'Prime Recovery',
    reviveSpeed:      'Revive Speed',
    selfRepairSpeed:  'Self-Repair Speed',
    shieldRecoverySpeed: 'Shield Recovery',
    tacticalRecovery: 'Tactical Recovery',
};

const STAT_LABELS_SHORT = {
    agility:          'AGI',
    fallResistance:   'FALL',
    finisherSiphon:   'SIPHON',
    firewall:         'FW',
    hardware:         'HW',
    heatCapacity:     'HEAT',
    lootSpeed:        'LOOT',
    meleeDamage:      'MELEE',
    pingDuration:     'PING',
    primeRecovery:    'PRIME',
    reviveSpeed:      'REVIVE',
    selfRepairSpeed:  'REPAIR',
    shieldRecoverySpeed: 'SRS',
    tacticalRecovery: 'TAC',
};

const RARITY_ORDER = { prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };

// ─── Initialisation ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    applyUrlFilters();
    await loadImplants();
    loadTraitsCatalog(); // fire-and-forget, non-blocking

    // Search
    document.getElementById('implantSearch')?.addEventListener('input', filterAndSortImplants);

    // Sort
    document.getElementById('implantSort')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndSortImplants();
    });

    // Slot tabs
    document.querySelectorAll('.runner-nav-pill[data-slot]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.runner-nav-pill[data-slot]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterAndSortImplants();
        });
    });

    // Rarity filter pills
    document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterAndSortImplants();
        });
    });

    // Reset filters button
    document.getElementById('resetFilters')?.addEventListener('click', () => {
        document.querySelectorAll('.runner-nav-pill[data-slot]').forEach(t => t.classList.remove('active'));
        document.querySelector('.runner-nav-pill[data-slot=""]')?.classList.add('active');
        document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(p => p.classList.remove('active'));
        document.querySelector('#rarityFilterPills .filter-pill-sm[data-filter="all"]')?.classList.add('active');
        const searchEl = document.getElementById('implantSearch');
        if (searchEl) searchEl.value = '';
        const sortEl = document.getElementById('implantSort');
        if (sortEl) sortEl.value = 'rarity';
        currentSort = 'rarity';
        filterAndSortImplants();
    });

    // ─── Modal wiring ───────────────────────────────────────
    const implantsGrid = document.getElementById('implantsGrid');
    if (implantsGrid) {
        implantsGrid.addEventListener('click', handleGridClick);
        implantsGrid.addEventListener('keydown', handleGridKeydown);
    }

    document.getElementById('implantModalBackdrop')?.addEventListener('click', closeImplantModal);
    document.getElementById('implantModalClose')?.addEventListener('click', closeImplantModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeImplantModal();
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.implantSlug) {
            openImplantModal(e.state.implantSlug, true);
        } else {
            closeImplantModal(true);
        }
    });

    // Check if an implant slug is in the URL on load
    const params = new URLSearchParams(window.location.search);
    const implantParam = params.get('implant');
    if (implantParam) {
        openImplantModal(implantParam, true);
    }

    // Trait picker wiring
    const traitSelect = document.getElementById('implantTraitSelect');
    if (traitSelect) {
        traitSelect.addEventListener('change', function() {
            onTraitSelected(this.value);
        });
    }
    const traitShareBtn = document.getElementById('implantTraitShare');
    if (traitShareBtn) {
        traitShareBtn.addEventListener('click', copyTraitShareLink);
    }
});

// ─── Data Loading ───────────────────────────────────────────

async function loadImplants() {
    try {
        // Prefer prebuilt data (injected by build/prebuild-implants.js)
        if (window.__IMPLANTS_DATA && Array.isArray(window.__IMPLANTS_DATA)) {
            allImplants = window.__IMPLANTS_DATA.slice();
        } else {
            // Fallback: live API call (dev / prebuild not run yet)
            console.warn('No prebuilt data found — falling back to live API');
            const response = await MarathonAPI.getImplants();
            if (response && response.data) {
                allImplants = response.data.slice();
            } else {
                showError('No implants data available');
                return;
            }
        }
        filteredImplants = [...allImplants];
        filterAndSortImplants();
        updateCount();
        updateSlotTabCounts();
    } catch (error) {
        console.error('Error loading implants:', error);
        showError('Failed to load implants');
    }
}

function updateSlotTabCounts() {
    const counts = {};
    allImplants.forEach(imp => {
        const slot = (imp.slot || '').toLowerCase();
        counts[slot] = (counts[slot] || 0) + 1;
    });
    document.querySelectorAll('.runner-nav-pill[data-slot]').forEach(tab => {
        const slot = tab.dataset.slot;
        if (slot && counts[slot] !== undefined) {
            tab.textContent = `${capitalizeFirst(slot)} (${counts[slot]})`;
        }
    });
}

// ─── Grid: Filter, Sort, Display ────────────────────────────

function filterAndSortImplants() {
    const searchQuery = document.getElementById('implantSearch')?.value.toLowerCase() || '';
    const activeSlotTab = document.querySelector('.runner-nav-pill[data-slot].active');
    const slotFilter = activeSlotTab?.dataset.slot || '';
    const activeRarityPill = document.querySelector('#rarityFilterPills .filter-pill-sm.active');
    const rarityFilter = (activeRarityPill?.dataset.filter || 'all') === 'all' ? '' : activeRarityPill.dataset.filter;

    filteredImplants = allImplants.filter(implant => {
        if (searchQuery) {
            const name = (implant.name || '').toLowerCase();
            const description = (implant.description || '').toLowerCase();
            if (!name.includes(searchQuery) && !description.includes(searchQuery)) return false;
        }
        if (slotFilter && (implant.slot || '').toLowerCase() !== slotFilter) return false;
        if (rarityFilter && (implant.rarity || '') !== rarityFilter) return false;
        return true;
    });

    sortImplants();
    displayImplants(filteredImplants);
    updateCount();
}

function sortImplants() {
    filteredImplants.sort((a, b) => {
        switch (currentSort) {
            case 'name':      return (a.name || '').localeCompare(b.name || '');
            case 'name-desc': return (b.name || '').localeCompare(a.name || '');
            case 'rarity': {
                const rd = (RARITY_ORDER[(b.rarity || 'standard').toLowerCase()] || 0) -
                           (RARITY_ORDER[(a.rarity || 'standard').toLowerCase()] || 0);
                if (rd !== 0) return rd;
                const sc = (a.slot || '').localeCompare(b.slot || '');
                if (sc !== 0) return sc;
                return (a.name || '').localeCompare(b.name || '');
            }
            default: return 0;
        }
    });
}

function updateCount() {
    const el = document.getElementById('implantCount');
    if (el) el.textContent = `(${filteredImplants.length})`;
}

function displayImplants(implants) {
    const grid = document.getElementById('implantsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) return;

    if (!implants || implants.length === 0) {
        grid.innerHTML = '';
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = '';
        return;
    }

    grid.style.display = '';
    if (emptyState) emptyState.style.display = 'none';

    let adCount = 0;
    grid.innerHTML = implants.map((implant, idx) => {
        const slot = (implant.slot || 'head').toLowerCase();
        const iconUrl = SLOT_ICON_URLS[slot] || SLOT_ICON_URLS.head;
        const rarity = (implant.rarity || 'standard').toLowerCase();
        const slug = implant.slug || implant.id;
        const slotIconSvg = SLOT_ICONS_SVG[slot] || SLOT_ICONS_SVG.head;

        // Top-2 stats as a compact line: "+25 Revive · -10 Hardware"
        let statsLine = '';
        if (implant.stats && implant.stats.length > 0) {
            statsLine = '<div class="implant-card-stats">' + implant.stats.slice(0, 2).map(s => {
                const isPositive = s.stat_value >= 0;
                const sign = isPositive ? '+' : '';
                const label = STAT_LABELS_SHORT[s.stat_name] || s.stat_name.toUpperCase().slice(0, 5);
                return `<span class="implant-card-stat ${isPositive ? 'buff' : 'debuff'}">${sign}${s.stat_value} ${escapeHtml(label)}</span>`;
            }).join('<span class="implant-card-stat-sep">·</span>') + '</div>';
        }

        // Unique trait indicator
        const hasUniqueTrait = implant.unique_trait_description ||
            (implant.traits && implant.traits.some(t => t.name === 'Unique Trait'));

        const verifiedSvg = (implant.verified || implant.server_slam_verified)
            ? '<span class="verified-badge" title="Verified from in-game data"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>'
            : '';

        // Description snippet (truncated on card)
        const desc = implant.description
            ? `<div class="implant-description-snippet">${escapeHtml(implant.description)}</div>`
            : '';

        // Credits display
        const credits = implant.credits != null
            ? Number(implant.credits).toLocaleString()
            : '—';

        // In-grid ad every 8th card (max 2)
        let adHtml = '';
        if ((idx + 1) % 8 === 0 && adCount < 2) {
            adCount++;
            adHtml = `<div class="ad-safe-zone ad-safe-zone--in-grid">
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

        return adHtml + `
            <div class="implant-card ${rarity}" data-slug="${escapeAttr(slug)}" role="button" tabindex="0">
                <div class="implant-card-glow"></div>
                <div class="implant-card-header">
                    <span class="implant-slot-pill ${slot}">${slotIconSvg} ${capitalizeFirst(slot)}</span>
                    <span class="implant-rarity-tag ${rarity}">${capitalizeFirst(rarity)}</span>
                </div>
                <div class="implant-icon-container">
                    <div class="implant-icon ${rarity}">
                        <img src="${iconUrl}" alt="${escapeHtml(implant.name)} – Marathon ${capitalizeFirst(slot)} implant" onerror="this.parentElement.classList.add('icon-fallback')" loading="lazy">
                    </div>
                    <div class="implant-name">${escapeHtml(implant.name || 'Unknown')}${verifiedSvg}</div>
                </div>
                <div class="implant-card-content">
                    ${desc}
                    ${statsLine}
                    ${hasUniqueTrait ? '<span class="implant-unique-pill">★ Unique</span>' : ''}
                </div>
                <div class="implant-card-footer">
                    ${credits ? `<span class="implant-card-credits"><img src="/assets/icons/credits.webp" alt="" width="14" height="14">${credits}</span>` : '<span></span>'}
                    <span class="implant-card-cta">View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
                </div>
                <div class="cw-heat-strip" data-slug="${escapeAttr(slug)}">
                    <div class="cw-heat-fill"></div>
                    <div class="cw-heat-emojis">
                        <button class="cw-heat-emoji" data-rating="5" data-slug="${escapeAttr(slug)}" title="Fire"><span class="cw-emoji-icon">🔥</span><span class="cw-emoji-count" data-rating-count="5">—</span></button>
                        <button class="cw-heat-emoji" data-rating="4" data-slug="${escapeAttr(slug)}" title="Love"><span class="cw-emoji-icon">😍</span><span class="cw-emoji-count" data-rating-count="4">—</span></button>
                        <button class="cw-heat-emoji" data-rating="3" data-slug="${escapeAttr(slug)}" title="Meh"><span class="cw-emoji-icon">😐</span><span class="cw-emoji-count" data-rating-count="3">—</span></button>
                        <button class="cw-heat-emoji" data-rating="2" data-slug="${escapeAttr(slug)}" title="Nah"><span class="cw-emoji-icon">👎</span><span class="cw-emoji-count" data-rating-count="2">—</span></button>
                        <button class="cw-heat-emoji" data-rating="1" data-slug="${escapeAttr(slug)}" title="Trash"><span class="cw-emoji-icon">💩</span><span class="cw-emoji-count" data-rating-count="1">—</span></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Seed ratings from prebuilt data, attach handlers, highlight user votes
    seedImplantRatings();
    attachImplantHeatHandlers();
    highlightImplantUserVotes();
    refreshImplantRatingsFromAPI();

    // Push in-grid ads
    grid.querySelectorAll('.ad-safe-zone--in-grid ins.adsbygoogle').forEach(() => {
        try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
}

function handleGridClick(e) {
    const card = e.target.closest('.implant-card[data-slug]');
    if (card) openImplantModal(card.dataset.slug);
}

function handleGridKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.implant-card[data-slug]');
        if (card) { e.preventDefault(); openImplantModal(card.dataset.slug); }
    }
}

// ─── Modal: Open / Close / Render ───────────────────────────

async function openImplantModal(slug, skipPush) {
    if (!slug) return;
    currentImplantSlug = slug;

    // Update SEO metadata (canonical, title, structured data, detail block)
    renderSeoDetailBlock(slug);

    const overlay = document.getElementById('implantModal');
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

    // Reset loading state
    const nameEl = document.getElementById('implantModalName');
    if (nameEl) nameEl.textContent = 'Loading...';
    const descEl = document.getElementById('implantModalDescription');
    if (descEl) descEl.textContent = '';
    const badgesEl = document.getElementById('implantModalBadges');
    if (badgesEl) badgesEl.innerHTML = '';
    const qsEl = document.getElementById('implantModalQuickStats');
    if (qsEl) qsEl.innerHTML = '';
    const iconEl = document.getElementById('implantModalIcon');
    if (iconEl) iconEl.src = '';
    hideAllModalSections();

    // Update URL
    if (!skipPush) {
        const url = new URL(window.location);
        url.searchParams.set('implant', slug);
        url.searchParams.delete('trait'); // reset trait when switching implants
        history.pushState({ implantSlug: slug }, '', url);
    }

    try {
        const response = await MarathonAPI.getImplantBySlug(slug);
        if (!response || !response.data) {
            if (nameEl) nameEl.textContent = 'Implant not found';
            return;
        }
        renderImplantModal(response.data);
    } catch (err) {
        console.error('Failed to load implant detail:', err);
        if (nameEl) nameEl.textContent = 'Error loading implant';
    }
}

function closeImplantModal(skipPush) {
    const overlay = document.getElementById('implantModal');
    if (!overlay) return;
    if (!overlay.classList.contains('active')) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    currentImplantSlug = null;

    // Clean up SEO detail block when navigating away
    removeSeoDetailBlock();

    // Remove breadcrumb extension
    const bc = document.getElementById('implantDetailBreadcrumb');
    if (bc) {
        const prev = bc.previousElementSibling;
        if (prev && prev.tagName === 'svg') prev.remove();
        bc.remove();
    }

    if (skipPush !== true) {
        const url = new URL(window.location);
        url.searchParams.delete('implant');
        url.searchParams.delete('trait');
        history.pushState({}, '', url.pathname + (url.search || ''));
    }
}

function hideAllModalSections() {
    ['implantModalStatsSection', 'implantModalUniqueTraitSection',
     'implantModalTraitsSection', 'implantModalVariantsSection',
     'implantModalTraitPickerSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function renderImplantModal(implant) {
    const rarity = (implant.rarity || 'standard').toLowerCase();
    const slot = (implant.slot || 'head').toLowerCase();
    const iconUrl = SLOT_ICON_URLS[slot] || SLOT_ICON_URLS.head;

    // Set rarity class on modal panel for color accents
    const modalPanel = document.querySelector('#implantModal .core-modal');
    if (modalPanel) {
        modalPanel.classList.remove('standard', 'enhanced', 'deluxe', 'superior', 'prestige', 'contraband');
        modalPanel.classList.add(rarity);
    }

    // Icon
    const iconImg = document.getElementById('implantModalIcon');
    if (iconImg) { iconImg.src = iconUrl; iconImg.alt = `${implant.name || 'Implant'} – Marathon ${capitalizeFirst(slot)} implant`; }

    const iconFrame = document.getElementById('implantModalIconFrame');
    if (iconFrame) iconFrame.className = 'core-modal-icon-frame ' + rarity;

    const glow = document.getElementById('implantModalRarityGlow');
    if (glow) glow.className = 'core-modal-rarity-glow ' + rarity;

    // Name
    const nameEl = document.getElementById('implantModalName');
    if (nameEl) nameEl.textContent = implant.name || 'Unknown Implant';

    // Description
    const descEl = document.getElementById('implantModalDescription');
    if (descEl) descEl.textContent = implant.description || '';

    // Badges (slot + rarity + verified + value)
    const verifiedBadge = (implant.verified || implant.server_slam_verified)
        ? `<span class="cd-badge cd-badge-verified" title="Verified from in-game data">
               <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
               Verified
           </span>`
        : '';
    const credits = implant.credits;
    const valueBadge = credits
        ? `<span class="cd-badge cd-badge-value"><img src="/assets/icons/credits.webp" alt="" width="12" height="12" style="vertical-align:middle"> ${Number(credits).toLocaleString()}</span>`
        : '';
    const badgesEl = document.getElementById('implantModalBadges');
    if (badgesEl) {
        badgesEl.innerHTML = `
            <span class="cd-badge cd-badge-runner ${slot}">
                ${SLOT_ICONS_SVG[slot] || ''}
                ${capitalizeFirst(slot)}
            </span>
            <span class="cd-badge cd-badge-rarity ${rarity}">
                ${capitalizeFirst(rarity)}
            </span>
            ${verifiedBadge}
            ${valueBadge}
        `;
    }

    // Quick stats (credits)
    renderModalQuickStats(implant);

    // Stat modifiers
    renderModalStats(implant);

    // Unique trait
    renderModalUniqueTrait(implant);

    // Shared traits
    renderModalSharedTraits(implant);

    // Trait picker (from global catalog)
    renderModalTraitPicker(implant);

    // Family variants (upgrade path)
    renderModalVariants(implant);

    // Meta
    renderModalMeta(implant);

    // Share buttons
    bindImplantShareButtons(implant);
}

// ─── Modal Section Renderers ────────────────────────────────

function renderModalQuickStats(implant) {
    const stats = [];
    if (implant.credits) {
        stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Value</span><span class="core-modal-qs-value"><img src="/assets/icons/credits.png" class="credits-icon" alt="Credits" style="width:14px;height:14px;margin-right:4px">${implant.credits}</span></div>`);
    }
    stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Slot</span><span class="core-modal-qs-value">${capitalizeFirst(implant.slot || 'Unknown')}</span></div>`);
    stats.push(`<div class="core-modal-qs"><span class="core-modal-qs-label">Rarity</span><span class="core-modal-qs-value">${capitalizeFirst(implant.rarity || 'Standard')}</span></div>`);

    const qsEl = document.getElementById('implantModalQuickStats');
    if (qsEl) qsEl.innerHTML = stats.join('');
}

function renderModalStats(implant) {
    const section = document.getElementById('implantModalStatsSection');
    const container = document.getElementById('implantModalStats');
    if (!section || !container) return;

    const stats = implant.stats || [];
    if (!stats.length) { section.style.display = 'none'; return; }

    section.style.display = '';
    container.innerHTML = stats.map(s => {
        const isPositive = s.stat_value >= 0;
        const sign = isPositive ? '+' : '';
        const label = STAT_LABELS_FULL[s.stat_name] || s.stat_name;
        return `
            <div class="implant-modal-stat-row">
                <span class="implant-modal-stat-name">${escapeHtml(label)}</span>
                <span class="implant-modal-stat-value ${isPositive ? 'buff' : 'debuff'}">${sign}${s.stat_value}</span>
            </div>
        `;
    }).join('');
}

function renderModalUniqueTrait(implant) {
    const section = document.getElementById('implantModalUniqueTraitSection');
    const nameEl = document.getElementById('implantModalUniqueTraitName');
    const descEl = document.getElementById('implantModalUniqueTraitDesc');
    if (!section) return;

    // Handle both new style (unique_trait_description) and legacy (traits array)
    let traitName = implant.unique_trait_name;
    let traitDesc = implant.unique_trait_description;

    if (!traitDesc && implant.traits) {
        const legacy = implant.traits.find(t => t.name === 'Unique Trait');
        if (legacy) {
            traitName = 'Unique Trait';
            traitDesc = legacy.description;
        }
    }

    // Also check for named unique traits on prestige items (e.g. "Efficient Curatives")
    if (!traitDesc && implant.traits) {
        const rarity = (implant.rarity || '').toLowerCase();
        if (rarity === 'prestige' && implant.traits.length > 0) {
            const first = implant.traits[0];
            traitName = first.name;
            traitDesc = first.description;
        }
    }

    if (!traitDesc) { section.style.display = 'none'; return; }

    section.style.display = '';
    const isPrestige = (implant.rarity || '').toLowerCase() === 'prestige';

    if (nameEl) nameEl.textContent = traitName || 'Unique Trait';

    // For prestige implants, render an enhanced card instead of plain text
    if (isPrestige && descEl) {
        descEl.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'unique-trait-card prestige';
        card.innerHTML =
            '<div class="unique-trait-card-accent"></div>' +
            '<div class="unique-trait-card-body">' +
                '<div class="unique-trait-card-label">PRESTIGE PERK</div>' +
                '<div class="unique-trait-card-desc">' + escapeHtml(traitDesc) + '</div>' +
            '</div>';
        descEl.appendChild(card);
    } else if (descEl) {
        descEl.textContent = traitDesc;
    }
}

function renderModalSharedTraits(implant) {
    const section = document.getElementById('implantModalTraitsSection');
    const container = document.getElementById('implantModalTraits');
    if (!section || !container) return;

    const shared = (implant.traits || []).filter(t => t.name !== 'Unique Trait');
    if (!shared.length) { section.style.display = 'none'; return; }

    section.style.display = '';
    container.innerHTML = shared.map(t => `
        <div class="core-modal-effect-row">
            <span class="core-modal-effect-icon">◈</span>
            <div class="core-modal-effect-info">
                <span class="core-modal-effect-text"><strong>${escapeHtml(t.name)}</strong> — ${escapeHtml(t.description)}</span>
            </div>
        </div>
    `).join('');
}

function renderModalVariants(implant) {
    const section = document.getElementById('implantModalVariantsSection');
    const container = document.getElementById('implantModalVariants');
    if (!section || !container) return;

    const variants = implant.variants || [];
    if (!variants.length) { section.style.display = 'none'; return; }

    // Build full family: current + variants, sorted by rarity
    const family = [
        { id: implant.id, slug: implant.slug, name: implant.name, rarity: implant.rarity, credits: implant.credits, server_slam_verified: implant.server_slam_verified, isCurrent: true },
        ...variants.map(v => ({ ...v, isCurrent: false }))
    ].sort((a, b) => (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0));

    section.style.display = '';
    container.innerHTML = family.map(v => {
        const r = (v.rarity || 'standard').toLowerCase();
        const isCurrent = v.isCurrent;
        return `
            <div class="implant-modal-variant ${r} ${isCurrent ? 'current' : ''}" ${!isCurrent ? `data-variant-slug="${escapeAttr(v.slug)}"` : ''} ${!isCurrent ? 'role="button" tabindex="0"' : ''}>
                <span class="implant-modal-variant-rarity ${r}">${capitalizeFirst(r)}</span>
                <span class="implant-modal-variant-name">${escapeHtml(v.name)}</span>
                <span class="implant-modal-variant-credits">${v.credits ? v.credits + ' cr' : '—'}</span>
                ${isCurrent ? '<span class="implant-modal-variant-current">Viewing</span>' : ''}
            </div>
        `;
    }).join('');

    // Wire variant clicks to open that implant
    container.querySelectorAll('[data-variant-slug]').forEach(el => {
        el.addEventListener('click', () => openImplantModal(el.dataset.variantSlug));
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openImplantModal(el.dataset.variantSlug); }
        });
    });
}

function renderModalMeta(implant) {
    const rows = [];
    if (implant.is_active !== undefined) rows.push(['Status', implant.is_active ? 'Active' : 'Inactive']);
    const sharedTraitsCount = (implant.traits || []).filter(t => t.name !== 'Unique Trait').length;
    if (sharedTraitsCount) rows.push(['Shared Traits', sharedTraitsCount]);

    const container = document.getElementById('implantModalMeta');
    if (!container) return;
    if (!rows.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div class="core-modal-section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <h3>Details</h3>
        </div>
        <dl class="core-modal-meta-list">
            ${rows.map(([k, v]) => `<div class="core-modal-meta-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        </dl>
    `;
}

// ─── Share Buttons ────────────────────────────────────────────

function bindImplantShareButtons(implant) {
    const pageUrl = window.location.href;
    const toastEl = document.getElementById('implantShareToast');
    const rarity = capitalizeFirst((implant.rarity || 'standard').toLowerCase());
    const slot = capitalizeFirst((implant.slot || 'head').toLowerCase());
    const name = implant.name || 'Unknown Implant';

    function showToast(msg, cls) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.className = 'item-share-toast ' + (cls || '') + ' active';
        setTimeout(function () { toastEl.classList.remove('active'); }, 2500);
    }

    var twitterBtn = document.getElementById('implantShareTwitter');
    var discordBtn = document.getElementById('implantShareDiscord');
    var copyBtn    = document.getElementById('implantShareCopy');

    // Clone & replace to remove old listeners
    [twitterBtn, discordBtn, copyBtn].forEach(function (btn) {
        if (!btn) return;
        var clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
    });

    document.getElementById('implantShareTwitter')?.addEventListener('click', function () {
        var text = encodeURIComponent(name + ' — ' + rarity + ' ' + slot + ' Implant on MarathonDB');
        window.open('https://x.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(pageUrl), '_blank', 'width=550,height=420');
    });

    document.getElementById('implantShareDiscord')?.addEventListener('click', async function () {
        try {
            await navigator.clipboard.writeText('**' + name + '** — ' + rarity + ' ' + slot + ' Implant\n' + pageUrl);
            showToast('Discord text copied!', 'toast-discord');
        } catch (e) { console.error('Copy failed', e); }
    });

    document.getElementById('implantShareCopy')?.addEventListener('click', async function () {
        try {
            await navigator.clipboard.writeText(pageUrl);
            showToast('Link copied to clipboard!', 'toast-copy');
        } catch (e) { console.error('Copy failed', e); }
    });
}

// ─── SEO: Detail Block for ?implant= URLs ───────────────────
// When Googlebot (or a user) visits /implants/?implant=regen-v5,
// this renders a full crawlable detail section in the DOM, updates
// the canonical tag, page title, and injects item-level structured data.

function renderSeoDetailBlock(slug) {
    const container = document.getElementById('implantDetailSeo');
    if (!container) return;

    // Find implant in prebuilt data (available before API call)
    const implant = (window.__IMPLANTS_DATA || allImplants || [])
        .find(i => i.slug === slug);
    if (!implant) return; // will fall through to modal's API fetch

    const slot = (implant.slot || 'head').toLowerCase();
    const rarity = (implant.rarity || 'standard').toLowerCase();
    const slotLabel = capitalizeFirst(slot);
    const rarityLabel = capitalizeFirst(rarity);
    const iconUrl = SLOT_ICON_URLS[slot] || SLOT_ICON_URLS.head;

    // ── 1. Update <link rel="canonical"> to self-reference this URL ──
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        canonical.href = `https://marathondb.gg/implants/?implant=${encodeURIComponent(slug)}`;
    }

    // ── 2. Update <title> for this specific implant ──
    document.title = `${implant.name} – ${rarityLabel} ${slotLabel} Implant | MarathonDB`;

    // ── 3. Update meta description ──
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        const descText = implant.description
            ? `${implant.name}: ${implant.description} ${rarityLabel} ${slotLabel} implant stats, traits, and upgrade path.`
            : `${implant.name} is a ${rarityLabel} ${slotLabel} implant in Marathon. View full stats, traits, and upgrade path.`;
        metaDesc.content = descText;
    }

    // ── 4. Update OG / Twitter tags ──
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = `${implant.name} – ${rarityLabel} ${slotLabel} Implant | MarathonDB`;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = metaDesc ? metaDesc.content : '';
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = `https://marathondb.gg/implants/?implant=${encodeURIComponent(slug)}`;
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.content = `${implant.name} – ${rarityLabel} ${slotLabel} Implant | MarathonDB`;
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.content = metaDesc ? metaDesc.content : '';

    // ── 5. Inject TechArticle structured data ──
    const itemSchema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        'name': implant.name,
        'headline': `${implant.name} – Marathon ${slotLabel} Implant`,
        'description': implant.description || `${implant.name} is a ${rarityLabel} ${slotLabel} implant in Bungie's Marathon.`,
        'url': `https://marathondb.gg/implants/?implant=${encodeURIComponent(slug)}`,
        'image': iconUrl.startsWith('http') ? iconUrl : `https://marathondb.gg/${iconUrl}`,
        'isPartOf': {
            '@type': 'CollectionPage',
            'name': 'Marathon Implants Database',
            'url': 'https://marathondb.gg/implants/'
        },
        'about': {
            '@type': 'Thing',
            'name': 'Marathon',
            'description': "Extraction shooter by Bungie"
        },
        'author': {
            '@type': 'Organization',
            'name': 'MarathonDB',
            'url': 'https://marathondb.gg'
        }
    };
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.textContent = JSON.stringify(itemSchema);
    document.head.appendChild(schemaScript);

    // ── 6. Update breadcrumb to include implant name ──
    // Remove any existing detail breadcrumb first to prevent accumulation
    const existingBc = document.getElementById('implantDetailBreadcrumb');
    if (existingBc) {
        const prevSvg = existingBc.previousElementSibling;
        if (prevSvg && prevSvg.tagName === 'svg') prevSvg.remove();
        existingBc.remove();
    }
    const breadcrumbOl = document.querySelector('.detail-breadcrumb ol');
    if (breadcrumbOl) {
        const chevron = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
        // Make "Implants" a link
        const implantsBreadcrumb = breadcrumbOl.querySelectorAll('li')[1];
        if (implantsBreadcrumb) {
            const nameSpan = implantsBreadcrumb.querySelector('[itemprop="name"]');
            if (nameSpan && !implantsBreadcrumb.querySelector('a')) {
                const link = document.createElement('a');
                link.setAttribute('itemprop', 'item');
                link.href = '/marathon/implants/';
                link.appendChild(nameSpan);
                implantsBreadcrumb.prepend(link);
            }
        }
        // Add implant name as 3rd breadcrumb
        const li = document.createElement('li');
        li.setAttribute('itemprop', 'itemListElement');
        li.setAttribute('itemscope', '');
        li.setAttribute('itemtype', 'https://schema.org/ListItem');
        li.id = 'implantDetailBreadcrumb';
        li.innerHTML = `<span itemprop="name">${escapeHtml(implant.name)}</span><meta itemprop="position" content="3" />`;
        breadcrumbOl.insertAdjacentHTML('beforeend', chevron);
        breadcrumbOl.appendChild(li);
    }

    // ── 7. Render the visible detail section ──
    // Stats table rows
    let statsHtml = '';
    if (implant.stats && implant.stats.length > 0) {
        statsHtml = `
            <table class="implant-seo-stats-table">
                <thead><tr><th>Stat</th><th>Value</th></tr></thead>
                <tbody>
                    ${implant.stats.map(s => {
                        const isPositive = s.stat_value >= 0;
                        const sign = isPositive ? '+' : '';
                        const label = STAT_LABELS_FULL[s.stat_name] || s.stat_name;
                        return `<tr><td>${escapeHtml(label)}</td><td class="${isPositive ? 'buff' : 'debuff'}">${sign}${s.stat_value}</td></tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    }

    // Traits
    let traitsHtml = '';
    let uniqueTraitHtml = '';
    if (implant.traits && implant.traits.length > 0) {
        const unique = implant.traits.find(t => t.name === 'Unique Trait');
        const shared = implant.traits.filter(t => t.name !== 'Unique Trait');
        if (unique) {
            uniqueTraitHtml = `<div class="implant-seo-trait"><strong>Unique Trait:</strong> ${escapeHtml(unique.description)}</div>`;
        }
        if (implant.unique_trait_description && !unique) {
            uniqueTraitHtml = `<div class="implant-seo-trait"><strong>${escapeHtml(implant.unique_trait_name || 'Unique Trait')}:</strong> ${escapeHtml(implant.unique_trait_description)}</div>`;
        }
        if (shared.length) {
            traitsHtml = shared.map(t =>
                `<div class="implant-seo-trait"><strong>${escapeHtml(t.name)}:</strong> ${escapeHtml(t.description)}</div>`
            ).join('');
        }
    } else if (implant.unique_trait_description) {
        uniqueTraitHtml = `<div class="implant-seo-trait"><strong>${escapeHtml(implant.unique_trait_name || 'Unique Trait')}:</strong> ${escapeHtml(implant.unique_trait_description)}</div>`;
    }

    container.innerHTML = `
        <div class="implant-seo-detail ${rarity}">
            <div class="implant-seo-detail-header">
                <div class="implant-seo-detail-icon ${rarity}">
                    <img src="${iconUrl}" alt="${escapeHtml(implant.name)} – Marathon ${slotLabel} implant" loading="eager">
                </div>
                <div class="implant-seo-detail-title">
                    <h2 class="implant-seo-detail-name">${escapeHtml(implant.name)}</h2>
                    <div class="implant-seo-detail-badges">
                        <span class="implant-slot-pill ${slot}">${SLOT_ICONS_SVG[slot] || ''} ${slotLabel}</span>
                        <span class="implant-rarity-tag ${rarity}">${rarityLabel}</span>
                        ${implant.credits ? `<span class="implant-seo-credits">${implant.credits} credits</span>` : ''}
                    </div>
                </div>
            </div>
            ${implant.description ? `<p class="implant-seo-detail-desc">${escapeHtml(implant.description)}</p>` : ''}
            ${statsHtml}
            ${uniqueTraitHtml}
            ${traitsHtml}
            <p class="implant-seo-backlink"><a href="/implants/">← Browse all Marathon implants</a></p>
        </div>
    `;
    container.style.display = '';
}

// Remove the SEO detail block when navigating away from an item URL
function removeSeoDetailBlock() {
    const container = document.getElementById('implantDetailSeo');
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }
    // Restore canonical to hub page
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://marathondb.gg/implants/';
    // Restore title
    document.title = 'Marathon Implants – All Stats, Traits & Slots | MarathonDB';
}

// ─── Helpers ────────────────────────────────────────────────

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    if (!text && text !== 0) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return String(text).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function showError(message) {
    const grid = document.getElementById('implantsGrid');
    if (grid) grid.innerHTML = `<div class="empty-state error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><p>${message}</p></div>`;
}

function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const slot = params.get('slot');
    if (slot) {
        const tab = document.querySelector(`.runner-nav-pill[data-slot="${slot.toLowerCase()}"]`);
        if (tab) {
            document.querySelectorAll('.runner-nav-pill[data-slot]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        }
    }
    const rarity = params.get('rarity');
    if (rarity) {
        const pill = document.querySelector(`#rarityFilterPills .filter-pill-sm[data-filter="${rarity.toLowerCase()}"]`);
        if (pill) {
            document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        }
    }
}

// ─── Traits Catalog & Picker ────────────────────────────────

async function loadTraitsCatalog() {
    try {
        const response = await MarathonAPI.getTraits();
        if (response && response.success && Array.isArray(response.data)) {
            traitsCatalog = response.data;
        }
    } catch (err) {
        console.warn('Could not load traits catalog:', err);
    }
}

function renderModalTraitPicker(implant) {
    const section = document.getElementById('implantModalTraitPickerSection');
    const select  = document.getElementById('implantTraitSelect');
    const preview = document.getElementById('implantTraitPreview');
    const shareBtn = document.getElementById('implantTraitShare');
    const copiedEl = document.getElementById('implantTraitCopied');
    if (!section || !select) return;

    // Reset
    if (preview) preview.style.display = 'none';
    if (shareBtn) shareBtn.style.display = 'none';
    if (copiedEl) copiedEl.style.display = 'none';

    // Prestige / V5 implants have a fixed unique trait — no random rolls
    const rarity = (implant.rarity || '').toLowerCase();
    if (rarity === 'prestige') {
        section.style.display = 'none';
        return;
    }

    if (!traitsCatalog.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    // Filter traits to only those valid for this implant's slot (+ universal traits with null slot)
    var implantSlot = (implant.slot || '').toLowerCase();
    var relevantTraits = traitsCatalog.filter(function(t) {
        return !t.slot || t.slot === implantSlot;
    });

    if (!relevantTraits.length) {
        section.style.display = 'none';
        return;
    }

    // Populate options (keep first placeholder)
    var slotLabel = implantSlot ? implantSlot.charAt(0).toUpperCase() + implantSlot.slice(1) : '';
    select.innerHTML = '<option value="">\u2014 Select a ' + (slotLabel ? slotLabel + ' ' : '') + 'trait \u2014</option>';
    relevantTraits.forEach(function(t) {
        var opt = document.createElement('option');
        opt.value = t.slug;
        var suffix = t.slot ? '' : ' (Any Slot)';
        opt.textContent = t.name + suffix;
        select.appendChild(opt);
    });

    // If URL has ?trait=slug, pre-select it
    var params = new URLSearchParams(window.location.search);
    var traitParam = params.get('trait');
    if (traitParam) {
        select.value = traitParam;
        onTraitSelected(traitParam);
    }
}

function onTraitSelected(slug) {
    var preview  = document.getElementById('implantTraitPreview');
    var nameEl   = document.getElementById('implantTraitPreviewName');
    var descEl   = document.getElementById('implantTraitPreviewDesc');
    var shareBtn = document.getElementById('implantTraitShare');
    var copiedEl = document.getElementById('implantTraitCopied');

    if (copiedEl) copiedEl.style.display = 'none';

    if (!slug) {
        if (preview) preview.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none';
        // Remove trait from URL
        updateTraitInUrl(null);
        return;
    }

    var trait = traitsCatalog.find(function(t) { return t.slug === slug; });
    if (!trait) {
        if (preview) preview.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none';
        return;
    }

    // Show preview
    if (nameEl) nameEl.textContent = trait.name;
    if (descEl) descEl.textContent = trait.description || 'No description available.';
    if (preview) preview.style.display = 'flex';
    if (shareBtn) shareBtn.style.display = 'inline-flex';

    // Update URL with trait param
    updateTraitInUrl(slug);
}

function updateTraitInUrl(slug) {
    var url = new URL(window.location);
    if (slug) {
        url.searchParams.set('trait', slug);
    } else {
        url.searchParams.delete('trait');
    }
    history.replaceState(history.state, '', url);
}

function copyTraitShareLink() {
    var copiedEl = document.getElementById('implantTraitCopied');
    var url = window.location.href;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
            showCopiedFeedback(copiedEl);
        });
    } else {
        // Fallback
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopiedFeedback(copiedEl);
    }
}

function showCopiedFeedback(el) {
    if (!el) return;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(function() { el.style.display = 'none'; }, 2000);
}

// ─── Community Ratings (Heat Strip) ─────────────────────────

function normalizeImplantRating(raw) {
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

function seedImplantRatings() {
    (window.__IMPLANTS_DATA || allImplants || []).forEach(implant => {
        if (implant.rating && !implantRatingsMap[implant.slug]) {
            implantRatingsMap[implant.slug] = normalizeImplantRating(implant.rating);
        }
    });
    document.querySelectorAll('.implant-card .cw-heat-strip').forEach(strip => {
        updateImplantStripData(strip, strip.dataset.slug);
    });
}

async function refreshImplantRatingsFromAPI() {
    try {
        const res = await fetch(`${IMPLANTS_API}/api/implants`, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return;
        const body = await res.json();
        const items = (body && body.data) || body;
        if (!Array.isArray(items)) return;

        for (const item of items) {
            if (item.rating && item.slug) {
                implantRatingsMap[item.slug] = normalizeImplantRating(item.rating);
            }
        }
        document.querySelectorAll('.implant-card .cw-heat-strip').forEach(strip => {
            updateImplantStripData(strip, strip.dataset.slug);
        });
    } catch (_) { /* ratings refresh is non-critical */ }
}

function formatImplantVoteCount(n) {
    if (!n || n === 0) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

function updateImplantStripData(strip, slug) {
    const rating = implantRatingsMap[slug];
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
                countEl.textContent = formatImplantVoteCount(d ? d.count : 0);
            }
        }
    }
}

async function getImplantDeviceToken() {
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

function attachImplantHeatHandlers() {
    document.querySelectorAll('.implant-card .cw-heat-emoji').forEach(btn => {
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
            const votes = JSON.parse(localStorage.getItem('marathondb_implant_votes') || '{}');
            votes[slug] = rating;
            localStorage.setItem('marathondb_implant_votes', JSON.stringify(votes));

            try {
                const token = await getImplantDeviceToken();
                const res = await fetch(`${IMPLANTS_API}/api/implants/${encodeURIComponent(slug)}/rate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating, device_token: token }),
                });
                if (res.ok) {
                    const body = await res.json();
                    if (body.success && body.aggregate) {
                        implantRatingsMap[slug] = normalizeImplantRating(body.aggregate);
                        updateImplantStripData(strip, slug);
                    }
                }
            } catch (err) {
                console.warn('Implant rating submission failed:', err);
            }
        });
    });
}

function highlightImplantUserVotes() {
    const votes = JSON.parse(localStorage.getItem('marathondb_implant_votes') || '{}');
    Object.entries(votes).forEach(([slug, rating]) => {
        const card = document.querySelector(`.implant-card[data-slug="${slug}"]`);
        if (!card) return;
        const strip = card.querySelector('.cw-heat-strip');
        if (!strip) return;
        strip.querySelectorAll('.cw-heat-emoji').forEach(btn => {
            if (parseInt(btn.dataset.rating) === rating) {
                btn.classList.add('voted');
            }
        });
    });
}
