// Weapon Mods Page JavaScript — Popout Modal Redesign
// All mods load on one page; clicking opens a detail popout (no separate detail pages)

let allMods = [];
let filteredMods = [];
let currentSort = 'rarity';
let currentModSlug = null; // tracks which mod is open in the modal
let familiesCollapsed = true; // collapse family variants to one card per family in list view
let hideChips = false;         // hide chip-slot mods from the grid

// ─── Constants ──────────────────────────────────────────────

const SLOT_ICONS = {
    optic:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    barrel:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 12h20"/><path d="M6 8v8"/><path d="M18 8v8"/><circle cx="12" cy="12" r="2"/></svg>',
    magazine:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
    grip:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    chip:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2"/></svg>',
    generator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    shield:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
};

const CHANGE_TYPE_META = {
    added:     { icon: '✚', cls: 'new',    label: 'Added' },
    buffed:    { icon: '▲', cls: 'buff',   label: 'Buffed' },
    nerfed:    { icon: '▼', cls: 'nerf',   label: 'Nerfed' },
    reworked:  { icon: '⟳', cls: 'rework', label: 'Reworked' },
    removed:   { icon: '✕', cls: 'nerf',   label: 'Removed' },
    unchanged: { icon: '—', cls: 'new',    label: 'Unchanged' },
};

const RARITY_ORDER = { prestige: 5, superior: 4, deluxe: 3, enhanced: 2, standard: 1 };

function getWeaponSlug(w) { return (typeof w === 'object' && w !== null) ? w.weapon_slug : w; }

// ─── Initialisation ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    await loadMods();

    // Search (debounced)
    let searchTimer;
    document.getElementById('modSearch')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(filterAndSortMods, 250);
    });

    // Sort
    document.getElementById('modSort')?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndSortMods();
    });

    // Slot type tabs
    document.querySelectorAll('.runner-nav-pill[data-type]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.runner-nav-pill[data-type]').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterAndSortMods();
        });
    });

    // Rarity filter pills
    document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('#rarityFilterPills .filter-pill-sm').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterAndSortMods();
        });
    });

    // Weapon dropdown filter
    document.getElementById('modWeaponFilter')?.addEventListener('change', filterAndSortMods);

    // Family collapse toggle
    document.getElementById('familyCollapseToggle')?.addEventListener('click', () => {
        familiesCollapsed = !familiesCollapsed;
        filterAndSortMods();
    });

    // Hide chips toggle
    document.getElementById('hideChipsToggle')?.addEventListener('click', () => {
        hideChips = !hideChips;
        const btn = document.getElementById('hideChipsToggle');
        btn?.classList.toggle('active', hideChips);
        btn.textContent = hideChips ? 'Show mod chips' : 'Hide mod chips';
        filterAndSortMods();
    });

    // ─── Modal wiring ───────────────────────────────────────
    const modsGrid = document.getElementById('modsGrid');
    if (modsGrid) {
        modsGrid.addEventListener('click', handleGridClick);
        modsGrid.addEventListener('keydown', handleGridKeydown);
    }

    document.getElementById('modModalBackdrop')?.addEventListener('click', closeModModal);
    document.getElementById('modModalClose')?.addEventListener('click', closeModModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModModal();
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.modSlug) {
            openModModal(e.state.modSlug, true);
        } else {
            closeModModal(true);
        }
    });

    // Check if a mod slug is in the URL on load (e.g. ?mod=thermal-optic)
    const params = new URLSearchParams(window.location.search);
    const modParam = params.get('mod');
    if (modParam) {
        openModModal(modParam, true);
    }
});

// ─── Data Loading ───────────────────────────────────────────

async function loadMods() {
    // Use prebuilt data only — no API fallback (page is statically built)
    if (window.__MODS_DATA && Array.isArray(window.__MODS_DATA) && window.__MODS_DATA.length > 0) {
        allMods = window.__MODS_DATA.slice();
        filteredMods = [...allMods];
        populateWeaponDropdown();
        filterAndSortMods();
        updateCount();
        return;
    }
    showEmpty('No mods data available');
}

// ─── Weapon Dropdown ────────────────────────────────────────

async function populateWeaponDropdown() {
    const select = document.getElementById('modWeaponFilter');
    if (!select) return;

    // Start with weapons referenced in mod data
    const weaponMap = new Map();
    allMods.forEach(mod => {
        (mod.compatible_weapons || []).forEach(w => {
            const slug = getWeaponSlug(w);
            if (slug && !weaponMap.has(slug)) {
                weaponMap.set(slug, slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
            }
        });
    });

    // Merge in all weapons from the WeaponsAPI so LMGs etc. aren't missing
    try {
        const res = await WeaponsAPI.getWeapons();
        const list = res?.data || (Array.isArray(res) ? res : []);
        list.forEach(w => {
            const slug = w.slug || '';
            if (slug && !weaponMap.has(slug)) {
                weaponMap.set(slug, w.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
            }
        });
    } catch (e) {
        console.warn('Could not fetch weapons list for filter dropdown:', e);
    }

    const sorted = [...weaponMap.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    select.innerHTML = '<option value="">All Weapons</option>' +
        sorted.map(([slug, label]) => `<option value="${slug}">${label}</option>`).join('');
}

// ─── Grid: Filter, Sort, Display ────────────────────────────

function filterAndSortMods() {
    const searchQuery = document.getElementById('modSearch')?.value.toLowerCase() || '';

    // Slot type tab
    const activeTab = document.querySelector('.runner-nav-pill[data-type].active');
    const slotFilter = (activeTab?.dataset.type || '').toLowerCase();

    // Rarity pills
    const activeRarityPill = document.querySelector('#rarityFilterPills .filter-pill-sm.active');
    const rarityFilter = (activeRarityPill?.dataset.filter || 'all') === 'all' ? '' : activeRarityPill.dataset.filter;

    // Weapon dropdown
    const weaponFilter = document.getElementById('modWeaponFilter')?.value || '';

    filteredMods = allMods.filter(mod => {
        // Hidden mods are excluded from public list views
        if (mod.is_hidden) return false;

        // Search
        if (searchQuery) {
            const name = (mod.name || '').toLowerCase();
            const desc = (mod.description || '').toLowerCase();
            const slot = (mod.slot_type || '').toLowerCase();
            const ability = (mod.ability_name || '').toLowerCase();
            if (!name.includes(searchQuery) && !desc.includes(searchQuery) &&
                !slot.includes(searchQuery) && !ability.includes(searchQuery)) {
                return false;
            }
        }

        // Slot type filter
        if (slotFilter && (mod.slot_type || '').toLowerCase() !== slotFilter) {
            return false;
        }

        // Rarity filter
        if (rarityFilter && (mod.rarity || '').toLowerCase() !== rarityFilter) {
            return false;
        }

        // Chip filter
        if (hideChips && (mod.slot_type || '').toLowerCase() === 'chip') {
            return false;
        }

        // Weapon filter — mods with no specific weapons are universal (apply to all)
        if (weaponFilter) {
            const weapons = mod.compatible_weapons || [];
            if (weapons.length > 0 && !weapons.some(w => getWeaponSlug(w) === weaponFilter)) {
                return false;
            }
        }

        return true;
    });

    sortMods();
    displayMods(filteredMods);
    updateCount();
}

function sortMods() {
    if (currentSort === 'grouped') return; // displayMods handles grouping
    filteredMods.sort((a, b) => {
        switch (currentSort) {
            case 'name':
                return (a.name || '').localeCompare(b.name || '');
            case 'name-desc':
                return (b.name || '').localeCompare(a.name || '');
            case 'rarity': {
                const ra = RARITY_ORDER[(a.rarity || '').toLowerCase()] ?? 0;
                const rb = RARITY_ORDER[(b.rarity || '').toLowerCase()] ?? 0;
                if (rb !== ra) return rb - ra;
                const sc = (a.slot_type || '').localeCompare(b.slot_type || '');
                if (sc !== 0) return sc;
                return (a.name || '').localeCompare(b.name || '');
            }
            case 'cost':
                return (b.cost || 0) - (a.cost || 0);
            default:
                return 0;
        }
    });
}

// ─── Family Grouping ────────────────────────────────────────

function groupByFamily(mods) {
    const families = new Map();
    const standalone = [];

    for (const mod of mods) {
        if (!mod.family_slug) {
            standalone.push(mod);
            continue;
        }
        if (!families.has(mod.family_slug)) {
            families.set(mod.family_slug, []);
        }
        families.get(mod.family_slug).push(mod);
    }

    // Sort each family's variants by rarity (standard → enhanced → deluxe → superior)
    for (const [, variants] of families) {
        variants.sort((a, b) => {
            const ra = RARITY_ORDER[(a.rarity || '').toLowerCase()] ?? 0;
            const rb = RARITY_ORDER[(b.rarity || '').toLowerCase()] ?? 0;
            return ra - rb; // ascending — standard first
        });
    }

    return { families: [...families.entries()], standalone };
}

function collapseByFamily(mods) {
    // Pass 1: find the best (highest rarity) representative per family
    const bestRep = new Map();
    for (const mod of mods) {
        if (!mod.family_slug) continue;
        const existing = bestRep.get(mod.family_slug);
        if (!existing) {
            bestRep.set(mod.family_slug, mod);
        } else {
            const ra = RARITY_ORDER[(mod.rarity || '').toLowerCase()] ?? 0;
            const rb = RARITY_ORDER[(existing.rarity || '').toLowerCase()] ?? 0;
            if (ra > rb) bestRep.set(mod.family_slug, mod);
        }
    }
    // Pass 2: rebuild list, inserting the rep at the first family member's position
    const usedFamilies = new Set();
    const result = [];
    for (const mod of mods) {
        if (!mod.family_slug) {
            result.push(mod);
        } else if (!usedFamilies.has(mod.family_slug)) {
            usedFamilies.add(mod.family_slug);
            const rep = bestRep.get(mod.family_slug);
            const count = mods.filter(m => m.family_slug === mod.family_slug).length;
            result.push(count > 1 ? { ...rep, _familyCount: count } : rep);
        }
    }
    return result;
}

function displayGroupedMods(mods, grid) {
    if (!mods || mods.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
                <p>No mods found</p>
            </div>
        `;
        return;
    }

    const { families, standalone } = groupByFamily(mods);
    let html = '';

    for (const [familySlug, variants] of families) {
        const rep = variants.find(v => v.rarity === 'enhanced') || variants[0];
        const slotType = (rep.slot_type || 'chip').toLowerCase();
        const name = escapeHtml(rep.name || familySlug);
        const iconUrl = resolveIconUrl(rep);
        const iconOnerror = buildIconOnerror(rep);
        const altText = escapeHtml(`${rep.name || 'Mod'} – Marathon ${capitalizeFirst(slotType)} mod`);

        const tiersHtml = variants.map(v => {
            const rarity = (v.rarity || 'enhanced').toLowerCase();
            const isHidden = v.is_hidden;
            const costStr = v.cost != null ? `${v.cost}₢` : '';
            return `<div class="mod-family-tier ${rarity}${isHidden ? ' mod-family-tier--hidden' : ''}" data-slug="${escapeHtml(v.slug)}" role="button" tabindex="0" title="${escapeHtml(v.name)} — ${capitalizeFirst(rarity)}${isHidden ? ' (locked)' : ''}">
                <span class="mod-family-tier-rarity">${capitalizeFirst(rarity)}</span>
                ${costStr ? `<span class="mod-family-tier-cost">${costStr}</span>` : ''}
                ${isHidden ? '<span class="mod-family-tier-locked">🔒</span>' : ''}
            </div>`;
        }).join('');

        html += `
            <div class="mod-family-group" data-family="${escapeHtml(familySlug)}">
                <div class="mod-card-glow"></div>
                <div class="mod-card-header">
                    <span class="mod-slot-pill ${slotType}">${getSlotIcon(slotType)} ${capitalizeFirst(slotType)}</span>
                    <span class="mod-family-badge">Family</span>
                </div>
                <div class="mod-icon-container">
                    <div class="mod-icon">
                        ${iconUrl
                            ? `<img src="${iconUrl}" alt="${altText}" ${iconOnerror} loading="lazy">`
                            : `<div class="icon-fallback"></div>`}
                    </div>
                </div>
                <div class="mod-card-content">
                    <div class="mod-name">${name}</div>
                    <div class="mod-family-tiers">${tiersHtml}</div>
                </div>
            </div>`;
    }

    // Prestige / standalone mods appended at the end
    for (const mod of standalone) {
        const rarity   = (mod.rarity || 'prestige').toLowerCase();
        const slotType = (mod.slot_type || 'chip').toLowerCase();
        const slug     = mod.slug || mod.id;
        const name     = escapeHtml(mod.name || 'Unknown');
        const iconUrl  = resolveIconUrl(mod);
        const altText  = escapeHtml(`${mod.name || 'Mod'} – Marathon ${capitalizeFirst(slotType)} mod`);
        const iconOnerror = buildIconOnerror(mod);
        html += `
            <div class="mod-card ${rarity}" data-slug="${escapeHtml(slug)}" role="button" tabindex="0">
                <div class="mod-card-glow"></div>
                <div class="mod-card-header">
                    <span class="mod-slot-pill ${slotType}">${getSlotIcon(slotType)} ${capitalizeFirst(slotType)}</span>
                    <span class="mod-rarity-tag ${rarity}">${capitalizeFirst(rarity)}</span>
                </div>
                <div class="mod-icon-container">
                    <div class="mod-icon ${rarity}">
                        ${iconUrl ? `<img src="${iconUrl}" alt="${altText}" ${iconOnerror} loading="lazy">` : `<div class="icon-fallback"></div>`}
                    </div>
                </div>
                <div class="mod-card-content">
                    <div class="mod-name">${name}</div>
                </div>
            </div>`;
    }

    grid.innerHTML = html;
}

function updateCount() {
    const countEl = document.getElementById('modCount');
    if (countEl) {
        countEl.textContent = `(${filteredMods.length})`;
    }
}

function updateFamilyToggleBtn() {
    const btn = document.getElementById('familyCollapseToggle');
    if (!btn) return;
    if (currentSort === 'grouped') {
        btn.style.display = 'none';
        return;
    }
    btn.style.display = '';
    btn.textContent = familiesCollapsed ? 'Show all variants' : 'Collapse families';
    btn.classList.toggle('active', familiesCollapsed);
}

function displayMods(mods) {
    const grid = document.getElementById('modsGrid');
    if (!grid) return;

    updateFamilyToggleBtn();

    if (currentSort === 'grouped') {
        displayGroupedMods(mods, grid);
        return;
    }

    const displayList = familiesCollapsed ? collapseByFamily(mods) : mods;

    if (!displayList || displayList.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
                <p>No mods found</p>
            </div>
        `;
        return;
    }

    let adCount = 0;
    grid.innerHTML = displayList.map((mod, idx) => {
        const rarity   = (mod.rarity || 'enhanced').toLowerCase();
        const slotType = (mod.slot_type || 'chip').toLowerCase();
        const slug     = mod.slug || mod.id;
        const name     = escapeHtml(mod.name || 'Unknown');
        const iconUrl  = resolveIconUrl(mod);
        const altText  = `${mod.name || 'Mod'} – Marathon ${capitalizeFirst(slotType)} mod`;
        const effects  = mod.effects || [];
        const cost     = mod.cost || 0;

        // Description snippet (prefer description, fall back to ability_description)
        const snippetText = mod.description || mod.ability_description || '';
        const snippetHtml = snippetText ? `<div class="mod-description-snippet">${escapeHtml(snippetText)}</div>` : '';

        const verifiedSvg = mod.is_verified
            ? '<span class="verified-badge" title="Data verified"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>'
            : '';

        // Effects summary for the card (max 3)
        let effectsHtml = '';
        if (effects.length) {
            const shown = effects.slice(0, 3);
            const remaining = effects.length - shown.length;
            const chips = shown.map(eff => {
                let text = '';
                if (eff.stat_key) {
                    text = formatLabel(eff.stat_key);
                    if (eff.delta != null) {
                        const sign = eff.delta > 0 ? '+' : '';
                        const unit = eff.unit === 'percent' ? '%' : eff.unit === 'degrees' ? '°' : eff.unit === 'seconds' ? 's' : '';
                        text += ' ' + sign + eff.delta + unit;
                    }
                } else if (eff.display_text) {
                    text = eff.display_text;
                }
                if (!text) return '';
                return `<span class="mod-card-effect buff">${escapeHtml(text)}</span>`;
            }).join('');
            const moreHtml = remaining > 0 ? `<span class="mod-card-effect-more">+${remaining} more</span>` : '';
            effectsHtml = `<div class="mod-card-effects">${chips}${moreHtml}</div>`;
        }

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

        const iconOnerror = buildIconOnerror(mod);
        return adHtml + `
            <div class="mod-card ${rarity}" data-slug="${escapeHtml(slug)}" role="button" tabindex="0">
                <div class="mod-card-glow"></div>
                <div class="mod-card-header">
                    <span class="mod-slot-pill ${slotType}">${getSlotIcon(slotType)} ${capitalizeFirst(slotType)}</span>
                    <span class="mod-rarity-tag ${rarity}">${capitalizeFirst(rarity)}</span>
                </div>
                <div class="mod-icon-container">
                    <div class="mod-icon ${rarity}">
                        ${iconUrl
                            ? `<img src="${iconUrl}" alt="${escapeHtml(altText)}" ${iconOnerror} loading="lazy">`
                            : `<div class="icon-fallback"></div>`}
                    </div>
                    <div class="mod-name">${name}${verifiedSvg}</div>
                </div>
                <div class="mod-card-content">
                    ${snippetHtml}
                    ${effectsHtml}
                </div>
                <div class="mod-card-footer">
                    ${cost ? `<span class="mod-card-credits"><img src="/assets/icons/credits.webp" alt="" width="14" height="14">${cost.toLocaleString()}</span>` : '<span></span>'}
                    <span class="mod-card-cta">View Details <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
                </div>
            </div>
        `;
    }).join('');

    // Push in-grid ads
    grid.querySelectorAll('.ad-safe-zone--in-grid ins.adsbygoogle').forEach(() => {
        try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
}

// ─── Grid Click Handlers ────────────────────────────────────

function handleGridClick(e) {
    const card = e.target.closest('.mod-card[data-slug]');
    if (card) { openModModal(card.dataset.slug); return; }
    // Grouped view: tier pill click
    const tier = e.target.closest('.mod-family-tier[data-slug]');
    if (tier && !tier.classList.contains('mod-family-tier--hidden')) openModModal(tier.dataset.slug);
}

function handleGridKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.mod-card[data-slug]');
        if (card) { e.preventDefault(); openModModal(card.dataset.slug); return; }
        const tier = e.target.closest('.mod-family-tier[data-slug]');
        if (tier && !tier.classList.contains('mod-family-tier--hidden')) { e.preventDefault(); openModModal(tier.dataset.slug); }
    }
}

// ─── Modal: Open / Close / Render ───────────────────────────

async function openModModal(slug, skipPush) {
    if (!slug) return;
    currentModSlug = slug;

    const overlay = document.getElementById('modModal');
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
    document.getElementById('modModalName').textContent = 'Loading...';
    document.getElementById('modModalDescription').textContent = '';
    document.getElementById('modModalBadges').innerHTML = '';
    document.getElementById('modModalQuickStats').innerHTML = '';
    document.getElementById('modModalQuickStats').style.display = 'none';
    document.getElementById('modModalEffects').innerHTML = '';
    document.getElementById('modModalWeapons').innerHTML = '';
    document.getElementById('modModalHistory').innerHTML = '';
    document.getElementById('modModalMeta').innerHTML = '';
    const partialBanner = document.getElementById('modModalPartialBanner');
    if (partialBanner) partialBanner.style.display = 'none';
    const statImpactSection = document.getElementById('modModalStatImpactSection');
    if (statImpactSection) { statImpactSection.style.display = 'none'; const sib = statImpactSection.querySelector('.stat-impact-body'); if (sib) sib.innerHTML = ''; }
    const iconEl = document.getElementById('modModalIcon');
    if (iconEl) iconEl.src = '';
    hideAllSections();

    // Update URL
    if (!skipPush) {
        const url = new URL(window.location);
        url.searchParams.set('mod', slug);
        history.pushState({ modSlug: slug }, '', url);
    }

    // Render SEO detail block for crawlers
    renderSeoDetailBlock(slug);

    try {
        const response = await MarathonAPI.getModBySlug(slug);
        if (!response || !response.data) {
            document.getElementById('modModalName').textContent = 'Mod not found';
            return;
        }
        renderModModal(response.data);
    } catch (err) {
        console.error('Failed to load mod detail:', err);
        document.getElementById('modModalName').textContent = 'Error loading mod';
    }
}

function closeModModal(skipPush) {
    const overlay = document.getElementById('modModal');
    if (!overlay) return;
    if (!overlay.classList.contains('active')) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    currentModSlug = null;

    // Remove SEO detail block
    removeSeoDetailBlock();

    if (skipPush !== true) {
        const url = new URL(window.location);
        url.searchParams.delete('mod');
        history.pushState({}, '', url.pathname + (url.search || ''));
    }
}

function hideAllSections() {
    ['modModalEffectsSection', 'modModalStatImpactSection', 'modModalWeaponsSection', 'modModalHistorySection', 'modModalVariantsSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function renderModModal(mod) {
    const rarity   = (mod.rarity || 'enhanced').toLowerCase();
    const slotType = (mod.slot_type || 'chip').toLowerCase();
    const iconUrl  = resolveIconUrl(mod);
    const legacyIcon = mod.icon_url || '';

    // Icon — reset state from any previous mod, then set new src
    const iconImg = document.getElementById('modModalIcon');
    if (iconImg) {
        delete iconImg.dataset.retried;
        iconImg.style.display = '';
        iconImg.parentElement.classList.remove('icon-fallback');
        iconImg.onerror = null;
        if (iconUrl) {
            iconImg.onerror = function() {
                if (!this.dataset.retried && legacyIcon && legacyIcon !== PLACEHOLDER_URL && legacyIcon !== iconUrl) {
                    this.dataset.retried = '1';
                    this.src = legacyIcon;
                } else {
                    this.parentElement.classList.add('icon-fallback');
                    this.style.display = 'none';
                }
            };
            iconImg.src = iconUrl;
            iconImg.alt = mod.name || '';
        } else {
            iconImg.parentElement.classList.add('icon-fallback');
            iconImg.style.display = 'none';
        }
    }

    const iconFrame = document.getElementById('modModalIconFrame');
    if (iconFrame) iconFrame.className = 'mod-modal-icon-frame ' + rarity;

    const glow = document.getElementById('modModalRarityGlow');
    if (glow) glow.className = 'mod-modal-rarity-glow ' + rarity;

    // Name
    document.getElementById('modModalName').textContent = mod.name || 'Unknown Mod';

    // Description
    const descEl = document.getElementById('modModalDescription');
    descEl.innerHTML = '';
    if (mod.description) {
        const p = document.createElement('p');
        p.textContent = mod.description;
        descEl.appendChild(p);
    }
    if (mod.ability_name) {
        const abilityBlock = document.createElement('div');
        abilityBlock.className = 'mod-ability-block';
        abilityBlock.innerHTML = `
            <div class="mod-ability-header">
                <span class="mod-ability-tag"><svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Ability</span>
                <span class="mod-ability-name">${escapeHtml(mod.ability_name)}</span>
            </div>
            ${mod.ability_description ? `<p class="mod-ability-desc">${escapeHtml(mod.ability_description)}</p>` : ''}
        `;
        descEl.appendChild(abilityBlock);
    }

    // Badges (slot + rarity + damage type + verified + value + compatible)
    const dmgBadge = mod.damage_type
        ? `<span class="cd-badge cd-badge-dmg">${escapeHtml(mod.damage_type)}</span>`
        : '';
    const verifiedBadge = mod.is_verified
        ? '<span class="cd-badge cd-badge-verified" title="Data verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Verified</span>'
        : '';
    const costBadge = mod.cost
        ? `<span class="cd-badge cd-badge-value"><img src="/assets/icons/credits.webp" alt="" width="12" height="12" style="vertical-align:middle"> ${mod.cost.toLocaleString()}</span>`
        : '';
    const bWeaponCount = (mod.compatible_weapons || []).length || mod.compatible_weapon_count || 0;
    const compatBadge = bWeaponCount > 0
        ? `<span class="cd-badge cd-badge-compat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><circle cx="12" cy="12" r="3"/></svg> ${bWeaponCount} weapon${bWeaponCount !== 1 ? 's' : ''}</span>`
        : `<span class="cd-badge cd-badge-compat">All weapons</span>`;
    document.getElementById('modModalBadges').innerHTML = `
        <span class="cd-badge cd-badge-slot ${slotType}">
            ${getSlotIcon(slotType)}
            ${capitalizeFirst(slotType)}
        </span>
        <span class="cd-badge cd-badge-rarity ${rarity}">
            ${capitalizeFirst(rarity)}
        </span>
        ${dmgBadge}
        ${verifiedBadge}
        ${costBadge}
        ${compatBadge}
    `;

    // Share buttons
    const shareEl = document.getElementById('modModalShare');
    if (shareEl) {
        const shareUrl = `${window.location.origin}/mods/?mod=${encodeURIComponent(mod.slug)}`;
        const shareText = `${escapeHtml(mod.name)} — ${capitalizeFirst(rarity)} ${capitalizeFirst(slotType)} mod on MarathonDB`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        const discordText = `${mod.name} — ${capitalizeFirst(rarity)} ${capitalizeFirst(slotType)} mod\n${shareUrl}`;
        shareEl.innerHTML = `
            <a class="mod-share-btn mod-share-btn--twitter" href="${twitterUrl}" target="_blank" rel="noopener noreferrer" title="Share on X / Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Share
            </a>
            <button class="mod-share-btn mod-share-btn--discord" title="Copy for Discord" data-discord="${escapeHtml(discordText)}">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.031.051a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                Discord
            </button>
            <button class="mod-share-btn mod-share-btn--copy" title="Copy link" data-url="${escapeHtml(shareUrl)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Copy link
            </button>
        `;
        // Copy link handler
        shareEl.querySelector('.mod-share-btn--copy')?.addEventListener('click', function() {
            navigator.clipboard.writeText(this.dataset.url).then(() => {
                const orig = this.innerHTML;
                this.innerHTML = this.innerHTML.replace('Copy link', 'Copied!');
                setTimeout(() => { this.innerHTML = orig; }, 1800);
            });
        });
        // Discord copy handler
        shareEl.querySelector('.mod-share-btn--discord')?.addEventListener('click', function() {
            navigator.clipboard.writeText(this.dataset.discord).then(() => {
                const orig = this.innerHTML;
                this.innerHTML = this.innerHTML.replace('Discord', 'Copied!');
                setTimeout(() => { this.innerHTML = orig; }, 1800);
            });
        });
    }

    // Partial data warning banner
    const partialBanner = document.getElementById('modModalPartialBanner');
    if (partialBanner) {
        if (mod.is_partial_data) {
            const note = mod.partial_data_notes ? escapeHtml(mod.partial_data_notes) : 'Partial data';
            partialBanner.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> <span>${note}</span>`;
            partialBanner.style.display = 'flex';
        } else {
            partialBanner.style.display = 'none';
        }
    }

    // Quick stats
    renderQuickStats(mod);

    // Effects — hidden (duplicate of per-weapon data shown in Compatible Weapons)
    const effectsSection = document.getElementById('modModalEffectsSection');
    if (effectsSection) effectsSection.style.display = 'none';

    // Hide old stat impact section — bar charts now live inside Compatible Weapons
    const statImpactSection = document.getElementById('modModalStatImpactSection');
    if (statImpactSection) statImpactSection.style.display = 'none';

    // Compatible weapons (includes inline stat impact)
    renderWeapons(mod);

    // Family variants
    renderVariants(mod);

    // History
    renderHistory(mod);

    // Meta
    renderMeta(mod);
}

// ─── Modal Section Renderers ────────────────────────────────

function renderQuickStats(mod) {
    const stats = [];
    if (mod.damage_type) {
        stats.push('<div class="mod-modal-qs"><span class="mod-modal-qs-label">Damage Type</span><span class="mod-modal-qs-value">' + escapeHtml(mod.damage_type) + '</span></div>');
    }
    if (mod.season_name) {
        stats.push('<div class="mod-modal-qs"><span class="mod-modal-qs-label">Season</span><span class="mod-modal-qs-value">' + escapeHtml(mod.season_name) + '</span></div>');
    }
    const el = document.getElementById('modModalQuickStats');
    if (!el) return;
    if (!stats.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    el.innerHTML = stats.join('');
}

function renderEffects(mod) {
    const effects = mod.effects || [];

    // Build weapon-specific effects map from compatible_weapons[].effects
    const wse = {};
    (mod.compatible_weapons || []).forEach(w => {
        const slug = getWeaponSlug(w);
        if (w.effects && w.effects.length > 0) {
            wse[slug] = w.effects;
        }
    });
    const hasWse = Object.keys(wse).length > 0;

    const section = document.getElementById('modModalEffectsSection');
    const container = document.getElementById('modModalEffects');
    if (!effects.length && !hasWse) { if (section) section.style.display = 'none'; return; }

    if (section) section.style.display = '';
    if (!container) return;

    let html = '';

    // Default effects (base effects that apply to all weapons equally)
    if (effects.length) {
        if (hasWse) html += '<div class="mod-modal-effect-group-label">Base Effects</div>';
        html += effects.map(eff => renderEffectRow(eff)).join('');
    }

    // Per-weapon effect overrides from compatible_weapons[].effects
    if (hasWse) {
        html += '<div class="mod-modal-effect-group-label" style="margin-top:12px">Per-Weapon Overrides</div>';
        for (const [weaponSlug, weaponEffects] of Object.entries(wse)) {
            html += `<div class="mod-modal-wse-weapon">${formatSlug(weaponSlug)}</div>`;
            html += weaponEffects.map(eff => renderEffectRow(eff)).join('');
        }
    }

    container.innerHTML = html;
}

function renderEffectRow(eff) {
    return `
        <div class="mod-modal-effect-row">
            <span class="mod-modal-effect-icon">⚡</span>
            <div class="mod-modal-effect-info">
                <span class="mod-modal-effect-text">${escapeHtml(eff.display_text || '')}</span>
                ${eff.stat_key ? '<span class="mod-modal-effect-stat">' + formatLabel(eff.stat_key) + (eff.delta != null ? ': ' + (eff.delta > 0 ? '+' : '') + eff.delta + (eff.unit === 'percent' ? '%' : eff.unit === 'degrees' ? '°' : eff.unit === 'seconds' ? 's' : '') : '') + '</span>' : ''}
            </div>
        </div>
    `;
}

function renderWeapons(mod) {
    const weapons = mod.compatible_weapons || [];
    const section = document.getElementById('modModalWeaponsSection');
    const container = document.getElementById('modModalWeapons');
    if (!weapons.length) {
        if (section) section.style.display = '';
        if (container) container.innerHTML = '<span class="mod-modal-universal-note">This mod can be applied to all compatible weapons.</span>';
        return;
    }

    if (section) section.style.display = '';
    if (!container) return;

    let html = '<div class="mod-weapons-grid">';

    weapons.forEach(w => {
        const slug = getWeaponSlug(w);

        html += `
            <div class="mod-weapon-card" data-weapon-slug="${escapeHtml(slug)}" role="button" tabindex="0" title="Click to view stat impact for ${formatSlug(slug)}">
                <div class="mod-weapon-card-name">${formatSlug(slug)}</div>
            </div>`;
    });

    html += '</div>';
    html += '<div class="mod-weapon-stat-impact" id="weaponStatImpactArea" style="display:none"></div>';

    container.innerHTML = html;

    // Wire up clickable weapon cards
    container.querySelectorAll('.mod-weapon-card').forEach(card => {
        const handler = () => {
            const slug = card.dataset.weaponSlug;
            const wasActive = card.classList.contains('active');
            container.querySelectorAll('.mod-weapon-card').forEach(c => c.classList.remove('active'));

            const impactArea = document.getElementById('weaponStatImpactArea');
            if (wasActive) {
                impactArea.style.display = 'none';
                impactArea.innerHTML = '';
                return;
            }

            card.classList.add('active');
            impactArea.style.display = '';
            loadWeaponStatImpactInline(slug, mod, impactArea);
        };
        card.addEventListener('click', handler);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
        });
    });

    // Auto-select the first weapon alphabetically
    const allCards = [...container.querySelectorAll('.mod-weapon-card')];
    if (allCards.length > 0) {
        const sorted = allCards.sort((a, b) => (a.dataset.weaponSlug || '').localeCompare(b.dataset.weaponSlug || ''));
        const first = sorted[0];
        first.classList.add('active');
        const impactArea = document.getElementById('weaponStatImpactArea');
        if (impactArea) {
            impactArea.style.display = '';
            loadWeaponStatImpactInline(first.dataset.weaponSlug, mod, impactArea);
        }
    }
}

function renderHistory(mod) {
    const history = mod.history || [];
    const section = document.getElementById('modModalHistorySection');
    const container = document.getElementById('modModalHistory');
    if (!history.length) { if (section) section.style.display = 'none'; return; }

    if (section) section.style.display = '';
    if (!container) return;
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
                    return '<div class="mod-modal-hist-change">' +
                        '<span class="mod-modal-hist-key">' + formatLabel(key) + '</span>' +
                        '<span class="mod-modal-hist-old">' + oldVal + '</span>' +
                        '<span class="mod-modal-hist-arrow">→</span>' +
                        '<span class="mod-modal-hist-new ' + direction + '">' + newVal + '</span></div>';
                }).join('');
            } catch (_) { /* ignore parse errors */ }
        }

        return `
            <div class="mod-modal-hist-entry">
                <div class="mod-modal-hist-marker">
                    <div class="mod-modal-hist-dot ${meta.cls}">${meta.icon}</div>
                    ${!isLast ? '<div class="mod-modal-hist-line"></div>' : ''}
                </div>
                <div class="mod-modal-hist-body">
                    <div class="mod-modal-hist-header">
                        <span class="change-type-badge ${meta.cls}">${meta.label}</span>
                        ${h.patch_number ? '<span class="mod-modal-hist-patch">v' + h.patch_number + '</span>' : ''}
                        ${h.season_name ? '<span class="mod-modal-hist-season">' + escapeHtml(h.season_name) + '</span>' : ''}
                        ${h.changed_at ? '<span class="mod-modal-hist-date">' + new Date(h.changed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</span>' : ''}
                    </div>
                    ${h.summary ? '<p class="mod-modal-hist-summary">' + escapeHtml(h.summary) + '</p>' : ''}
                    ${changesHtml ? '<div class="mod-modal-hist-changes">' + changesHtml + '</div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ── Stat Impact Comparison (with weapon selector) ──

const STAT_IMPACT_CONFIGS = [
    { key: 'firepower_score', label: 'FIREPOWER', maxValue: 50, suffix: '' },
    { key: 'accuracy_score', label: 'ACCURACY', maxValue: 100, suffix: '' },
    { key: 'handling_score', label: 'HANDLING', maxValue: 100, suffix: '' },
    { key: 'range_meters', label: 'RANGE', maxValue: 200, suffix: 'm' },
    { key: 'magazine_size', label: 'MAGAZINE', maxValue: 60, suffix: '' },
    { key: 'zoom', label: 'ZOOM', maxValue: 5, suffix: '', isRaw: true },
    { key: 'rate_of_fire', label: 'RATE OF FIRE', maxValue: 1200, suffix: '', isRaw: true },
    { key: 'reload_speed', label: 'RELOAD SPEED', maxValue: 5, suffix: 's', inverse: true },
    { key: 'aim_assist', label: 'AIM ASSIST', maxValue: 5, suffix: '' },
    { key: 'recoil', label: 'RECOIL', maxValue: 100, suffix: '%', inverse: true },
    { key: 'precision', label: 'PRECISION', maxValue: 5, suffix: 'x' },
    { key: 'charge_time_seconds', label: 'CHARGE TIME', maxValue: 5, suffix: 's', inverse: true },
    { key: 'volt_drain', label: 'VOLT DRAIN', maxValue: 100, suffix: '%', inverse: true },
    { key: 'damage', label: 'DAMAGE', maxValue: 150, suffix: '' },
    { key: 'weight', label: 'WEIGHT', maxValue: 100, suffix: '%', inverse: true },
    { key: 'hipfire_spread', label: 'HIPFIRE SPREAD', maxValue: 10, suffix: '°', inverse: true },
    { key: 'ads_spread', label: 'ADS SPREAD', maxValue: 5, suffix: '°', inverse: true },
    { key: 'equip_speed', label: 'EQUIP SPEED', maxValue: 3, suffix: 's', inverse: true },
    { key: 'ads_speed', label: 'ADS SPEED', maxValue: 3, suffix: 's', inverse: true },
    { key: 'moving_inaccuracy', label: 'MOVING INACCURACY', maxValue: 100, suffix: '%', inverse: true },
    { key: 'crouch_spread_bonus', label: 'CROUCH SPREAD BONUS', maxValue: 100, suffix: '%' },
];

const EFFECT_TO_STAT_KEY = {
    firepower: 'firepower_score', firepower_score: 'firepower_score',
    accuracy: 'accuracy_score', accuracy_score: 'accuracy_score',
    handling: 'handling_score', handling_score: 'handling_score',
    range: 'range_meters', range_meters: 'range_meters',
    magazine_size: 'magazine_size', magazine: 'magazine_size',
    zoom: 'zoom',
    fire_rate: 'rate_of_fire', rate_of_fire: 'rate_of_fire', rpm: 'rate_of_fire',
    reload_speed: 'reload_speed', reload_time: 'reload_speed',
    aim_assist: 'aim_assist', recoil: 'recoil', precision: 'precision',
    charge_time: 'charge_time_seconds', charge_time_seconds: 'charge_time_seconds',
    volt_drain: 'volt_drain', voltdrain: 'volt_drain', damage: 'damage', weight: 'weight',
    hipfire_spread: 'hipfire_spread', ads_spread: 'ads_spread',
    ads_zoom: 'zoom', ads_accuracy: 'ads_spread', ready_speed: 'equip_speed',
    crouch_spread_bonus: 'crouch_spread_bonus', moving_inaccuracy: 'moving_inaccuracy',
    equip_speed: 'equip_speed', ads_speed: 'ads_speed',
};

// Cache fetched weapon data to avoid re-fetching
const _weaponStatsCache = {};

async function loadWeaponStatImpactInline(weaponSlug, mod, container) {
    if (!container) return;

    container.innerHTML = '<div class="stat-impact-loading"><div class="loading-spinner"></div> Loading weapon stats…</div>';

    try {
        let weaponData = _weaponStatsCache[weaponSlug];
        if (!weaponData) {
            const res = await WeaponsAPI.getWeaponBySlug(weaponSlug);
            if (!res?.data?.stats) {
                container.innerHTML = '<p class="stat-impact-hint">Could not load stats for this weapon.</p>';
                return;
            }
            weaponData = res.data;
            _weaponStatsCache[weaponSlug] = weaponData;
        }

        const stats = weaponData.stats;

        // Determine effects: per-weapon overrides first, then base
        let effects = mod.effects || [];
        for (const cw of (mod.compatible_weapons || [])) {
            const cwSlug = getWeaponSlug(cw);
            if (cwSlug === weaponSlug && cw.effects && cw.effects.length > 0) {
                effects = cw.effects;
                break;
            }
        }

        // Map effects to weapon stats
        const mapped = [];
        for (const eff of effects) {
            if (eff.stat_key == null || eff.delta == null) continue;
            const wsKey = EFFECT_TO_STAT_KEY[eff.stat_key] || eff.stat_key;
            const config = STAT_IMPACT_CONFIGS.find(c => c.key === wsKey);
            if (!config) continue;
            const baseValue = parseFloat(stats[wsKey]);
            if (isNaN(baseValue)) continue;

            const modifiedValue = eff.unit === 'percent'
                ? baseValue + (baseValue * eff.delta / 100)
                : baseValue + eff.delta;

            mapped.push({ config, baseValue, modifiedValue, delta: eff.delta, unit: eff.unit });
        }

        if (mapped.length === 0) {
            container.innerHTML = '<p class="stat-impact-hint">No matching stat changes for this weapon.</p>';
            return;
        }

        const weaponName = weaponData.name || formatSlug(weaponSlug);
        let html = `<div class="stat-impact-inline-header"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg> Stat Impact on <strong>${escapeHtml(weaponName)}</strong></div>`;
        html += '<div class="stat-impact-rows">';

        for (const { config, baseValue, modifiedValue, delta, unit } of mapped) {
            const maxVal = config.maxValue;
            const inv = config.inverse;
            const basePercent = inv
                ? Math.max(0, Math.min(100, ((maxVal - baseValue) / maxVal) * 100))
                : Math.max(0, Math.min(100, (baseValue / maxVal) * 100));
            const modPercent = inv
                ? Math.max(0, Math.min(100, ((maxVal - modifiedValue) / maxVal) * 100))
                : Math.max(0, Math.min(100, (modifiedValue / maxVal) * 100));

            const isBuff = inv ? delta < 0 : delta > 0;
            const changeClass = isBuff ? 'stat-impact-buff' : 'stat-impact-nerf';
            const arrow = isBuff ? '▲' : '▼';

            const suffix = config.suffix;
            const baseDisplay = config.isRaw ? baseValue : (baseValue + suffix);
            const modDisplay = config.isRaw ? modifiedValue.toFixed(1).replace(/\.0$/, '') : (modifiedValue.toFixed(1).replace(/\.0$/, '') + suffix);
            const sign = delta >= 0 ? '+' : '';
            const deltaUnit = unit === 'percent' ? '%' : (unit === 'degrees' ? '°' : (unit === 'seconds' ? 's' : ''));
            const deltaDisplay = `${sign}${delta}${deltaUnit}`;

            const minP = Math.min(basePercent, modPercent);
            const maxP = Math.max(basePercent, modPercent);
            const deltaWidth = maxP - minP;

            html += `
                <div class="stat-impact-row ${changeClass}">
                    <div class="stat-impact-label">${config.label}</div>
                    <div class="stat-impact-bars">
                        <div class="stat-impact-bar-track">
                            <div class="stat-impact-bar-base" style="width: ${basePercent}%"></div>
                            <div class="stat-impact-bar-delta" style="left: ${minP}%; width: ${deltaWidth}%"></div>
                        </div>
                    </div>
                    <div class="stat-impact-values">
                        <span class="stat-impact-base-val">${baseDisplay}</span>
                        <span class="stat-impact-arrow">${arrow}</span>
                        <span class="stat-impact-mod-val">${modDisplay}</span>
                        <span class="stat-impact-delta">(${deltaDisplay})</span>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Failed to load weapon stats:', err);
        container.innerHTML = '<p class="stat-impact-hint">Failed to load weapon stats.</p>';
    }
}

function renderVariants(mod) {
    const section = document.getElementById('modModalVariantsSection');
    const container = document.getElementById('modModalVariants');
    const variants = mod.variants || [];

    // A mod with no family_slug is prestige/standalone — no family tree
    if (!mod.family_slug || (!variants.length && mod.rarity === 'prestige')) {
        if (section) section.style.display = 'none';
        return;
    }

    if (section) section.style.display = '';
    if (!container) return;

    // Build full family: current mod + siblings, sorted by rarity tier
    const allMembers = [
        { slug: mod.slug, name: mod.name, rarity: mod.rarity, cost: mod.cost,
          is_hidden: mod.is_hidden, is_verified: mod.is_verified, isCurrent: true },
        ...variants.map(v => ({ ...v, isCurrent: false })),
    ];
    allMembers.sort((a, b) => {
        const ra = RARITY_ORDER[(a.rarity || '').toLowerCase()] ?? 0;
        const rb = RARITY_ORDER[(b.rarity || '').toLowerCase()] ?? 0;
        return ra - rb; // ascending: standard → enhanced → deluxe → superior
    });

    container.innerHTML = `
        <div class="mod-variants-row">
            ${allMembers.map(v => {
                const rarity = (v.rarity || 'enhanced').toLowerCase();
                const isHidden = v.is_hidden;
                const classes = ['mod-variant-pill', rarity,
                    v.isCurrent ? 'mod-variant-pill--current' : '',
                    isHidden   ? 'mod-variant-pill--hidden'  : ''
                ].filter(Boolean).join(' ');

                if (isHidden) {
                    return `<span class="${classes}" title="${escapeHtml(capitalizeFirst(rarity))} — locked">
                        <span class="mod-variant-rarity">${capitalizeFirst(rarity)}</span>
                        <span class="mod-variant-locked">🔒</span>
                    </span>`;
                }

                return `<a href="/mods/?mod=${encodeURIComponent(v.slug)}" class="${classes}" title="${escapeHtml(v.name)} — ${capitalizeFirst(rarity)}">
                    <span class="mod-variant-rarity">${capitalizeFirst(rarity)}</span>
                    ${v.is_verified ? '<span class="mod-variant-check">✓</span>' : ''}
                </a>`;
            }).join('')}
        </div>
    `;
}

function renderMeta(mod) {
    const rows = [];
    if (mod.family_slug) rows.push(['Family', escapeHtml(mod.family_slug)]);
    if (mod.season_name) rows.push(['Season', escapeHtml(mod.season_name)]);
    if (mod.patch_number) rows.push(['Introduced', 'v' + escapeHtml(String(mod.patch_number))]);
    if (mod.is_active !== undefined) rows.push(['Status', mod.is_active ? 'Active' : 'Inactive']);
    const weapons = mod.compatible_weapons || [];
    if (weapons.length) rows.push(['Compatible Weapons', weapons.length]);
    if (mod.updated_at) {
        const d = new Date(mod.updated_at);
        rows.push(['Last Updated', d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })]);
    }

    const container = document.getElementById('modModalMeta');
    if (!container) return;
    if (!rows.length) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div class="mod-modal-meta-grid">
            ${rows.map(([label, val]) => `<div class="mod-modal-meta-row"><span class="mod-modal-meta-label">${label}</span><span class="mod-modal-meta-value">${val}</span></div>`).join('')}
        </div>
    `;
}

// ─── SEO Detail Block (for ?mod= URLs) ─────────────────────
// Renders a crawlable detail section, updates canonical, title,
// meta description, OG/Twitter tags, injects TechArticle JSON-LD,
// and extends the breadcrumb.

function renderSeoDetailBlock(slug) {
    const container = document.getElementById('modDetailSeo');
    if (!container) return;

    // Find mod in prebuilt data (available before API call)
    const mod = (window.__MODS_DATA || allMods || [])
        .find(m => m.slug === slug);
    if (!mod) return;

    const rarity    = (mod.rarity || 'enhanced').toLowerCase();
    const slotType  = (mod.slot_type || 'chip').toLowerCase();
    const rarityLabel = capitalizeFirst(rarity);
    const slotLabel = capitalizeFirst(slotType);
    const iconUrl   = resolveIconUrl(mod);

    // ── 1. Update <link rel="canonical"> ──
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
        canonical.href = `https://marathondb.gg/mods/?mod=${encodeURIComponent(slug)}`;
    }

    // ── 2. Update <title> ──
    document.title = `${mod.name} – ${rarityLabel} ${slotLabel} Mod | MarathonDB`;

    // ── 3. Update meta description ──
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        const descText = mod.description
            ? `${mod.name}: ${mod.description} ${rarityLabel} ${slotLabel} weapon mod with full stats, effects, and compatible weapons.`
            : `${mod.name} is a ${rarityLabel} ${slotLabel} weapon mod in Marathon. View stats, effects, compatible weapons, and balance history.`;
        metaDesc.content = descText;
    }

    // ── 4. Update OG / Twitter tags ──
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = `${mod.name} – ${rarityLabel} ${slotLabel} Mod | MarathonDB`;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = metaDesc ? metaDesc.content : '';
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = `https://marathondb.gg/mods/?mod=${encodeURIComponent(slug)}`;
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.content = `${mod.name} – ${rarityLabel} ${slotLabel} Mod | MarathonDB`;
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.content = metaDesc ? metaDesc.content : '';

    // ── 5. Inject TechArticle structured data ──
    const itemSchema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        'name': mod.name,
        'headline': `${mod.name} – Marathon ${slotLabel} Weapon Mod`,
        'description': mod.description || `${mod.name} is a ${rarityLabel} ${slotLabel} weapon mod in Bungie's Marathon.`,
        'url': `https://marathondb.gg/mods/?mod=${encodeURIComponent(slug)}`,
        'image': iconUrl.startsWith('http') ? iconUrl : `https://marathondb.gg/${iconUrl}`,
        'isPartOf': {
            '@type': 'CollectionPage',
            'name': 'Marathon Weapon Mods Database',
            'url': 'https://marathondb.gg/mods/'
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
    schemaScript.id = 'modDetailSchema';
    schemaScript.textContent = JSON.stringify(itemSchema);
    document.head.appendChild(schemaScript);

    // ── 6. Extend breadcrumb (Home > Mods > Mod Name) ──
    const breadcrumbOl = document.querySelector('.detail-breadcrumb ol');
    if (breadcrumbOl) {
        const chevron = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
        const modsBreadcrumb = breadcrumbOl.querySelectorAll('li')[1];
        if (modsBreadcrumb) {
            const nameSpan = modsBreadcrumb.querySelector('[itemprop="name"]');
            if (nameSpan && !modsBreadcrumb.querySelector('a')) {
                const link = document.createElement('a');
                link.setAttribute('itemprop', 'item');
                link.href = '/marathon/mods/';
                link.appendChild(nameSpan);
                modsBreadcrumb.prepend(link);
            }
        }
        const li = document.createElement('li');
        li.setAttribute('itemprop', 'itemListElement');
        li.setAttribute('itemscope', '');
        li.setAttribute('itemtype', 'https://schema.org/ListItem');
        li.id = 'modDetailBreadcrumb';
        li.innerHTML = `<span itemprop="name">${escapeHtml(mod.name)}</span><meta itemprop="position" content="3" />`;
        breadcrumbOl.insertAdjacentHTML('beforeend', chevron);
        breadcrumbOl.appendChild(li);
    }

    // ── 7. Render visible detail section ──
    const weaponCount = mod.compatible_weapon_count || 0;
    const costHtml = mod.cost ? `<li><strong>Value:</strong> ${mod.cost} credits</li>` : '';
    const dmgHtml = mod.damage_type ? `<li><strong>Damage Type:</strong> ${escapeHtml(mod.damage_type)}</li>` : '';
    const abilityHtml = mod.ability_name ? `<li><strong>Ability:</strong> ${escapeHtml(mod.ability_name)}</li>` : '';
    const weaponsHtml = weaponCount > 0 ? `<li><strong>Compatible:</strong> ${weaponCount} weapon${weaponCount !== 1 ? 's' : ''}</li>` : '';

    container.innerHTML = `
        <div class="mod-seo-detail ${rarity}">
            <div class="mod-seo-detail-header">
                <div class="mod-seo-detail-icon ${rarity}">
                    ${iconUrl
                        ? `<img src="${iconUrl}" alt="${escapeHtml(mod.name)} – Marathon ${slotLabel} mod" loading="eager" onerror="this.parentElement.classList.add('icon-fallback')">`
                        : '<div class="icon-fallback"></div>'}
                </div>
                <div class="mod-seo-detail-title">
                    <h2 class="mod-seo-detail-name">${escapeHtml(mod.name)}</h2>
                    <div class="mod-seo-detail-badges">
                        <span class="cd-badge cd-badge-slot ${slotType}">${getSlotIcon(slotType)} ${slotLabel}</span>
                        <span class="mod-rarity-tag ${rarity}">${rarityLabel}</span>
                    </div>
                </div>
            </div>
            ${mod.description ? `<p class="mod-seo-detail-desc">${escapeHtml(mod.description)}</p>` : ''}
            <ul class="mod-seo-quick-stats">${costHtml}${dmgHtml}${abilityHtml}${weaponsHtml}</ul>
            <p class="mod-seo-backlink"><a href="/mods/">← Browse all Marathon weapon mods</a></p>
        </div>
    `;
    container.style.display = '';
}

function removeSeoDetailBlock() {
    const container = document.getElementById('modDetailSeo');
    if (container) {
        container.innerHTML = '';
        container.style.display = 'none';
    }

    // Remove injected schema
    const schema = document.getElementById('modDetailSchema');
    if (schema) schema.remove();

    // Remove breadcrumb extension
    const bc = document.getElementById('modDetailBreadcrumb');
    if (bc) {
        const prev = bc.previousElementSibling;
        if (prev && prev.tagName === 'svg') prev.remove();
        bc.remove();
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://marathondb.gg/mods/';
    document.title = 'Marathon Weapon Mods – All Attachments, Stats & Effects | MarathonDB';

    // Restore hub meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = 'Browse every weapon mod in Marathon. Filter by slot type, rarity, and damage type. View effects, compatible weapons, and balance history for all mods.';
}

// ─── Helpers ────────────────────────────────────────────────

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatLabel(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatSlug(slug) {
    if (!slug) return '';
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getSlotIcon(slot) {
    return SLOT_ICONS[slot] || SLOT_ICONS.chip;
}

function escapeHtml(text) {
    if (!text && text !== 0) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

const MODS_IMG_BASE = 'https://mods.marathondb.gg/images/';
const PLACEHOLDER_URL = MODS_IMG_BASE + '_placeholder.webp';

function resolveIconUrl(mod) {
    const slug = mod.slug || '';
    const webp = mod.icon_url_webp;
    const legacy = mod.icon_url;
    // Prefer explicit webp if it's real (not placeholder)
    if (webp && webp !== PLACEHOLDER_URL) return webp;
    // Construct slug-based webp URL from the mods image API
    if (slug) return `${MODS_IMG_BASE}${encodeURIComponent(slug)}.webp`;
    // Fall back to legacy icon
    return legacy || '';
}

function buildIconOnerror(mod) {
    const legacy = mod.icon_url || '';
    const webp = mod.icon_url_webp || '';
    // On error, try legacy icon_url if it's different from what we loaded; otherwise show fallback
    if (legacy && legacy !== PLACEHOLDER_URL && legacy !== webp) {
        return `onerror="if(!this.dataset.retried){this.dataset.retried='1';this.src='${legacy.replace(/'/g, "\\'")}';}else{this.parentElement.classList.add('icon-fallback');this.style.display='none';}"`;
    }
    return `onerror="this.parentElement.classList.add('icon-fallback');this.style.display='none';"`;
}

function showEmpty(message) {
    const grid = document.getElementById('modsGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                </svg>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
}

function showError(message) {
    const grid = document.getElementById('modsGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="empty-state error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
}

