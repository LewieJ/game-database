/**
 * Weapon Loadout Builder — weapon + mods page logic (v4).
 *
 * v4 changes (API integration):
 *   - Dynamic stat bar ranges from /api/weapons/stat-ranges
 *   - Canonical stat keys (no more body_damage fallback)
 *   - Uses stat_modifier_value (numeric) instead of regex parsing
 *   - Full mod data from weapon detail response (no individual mod fetches)
 *   - mod_types from weapon detail for slot layout
 *   - Server-side save via POST /api/loadouts with profanity handling
 *   - Server-only share codes (no hash encoding)
 *   - Current season auto-tagged on save
 *   - View count display on shared loadouts
 *   - hipfire_spread + ads_spread stats
 *   - Null-safe stat handling (volt_drain, TTK)
 */
(function () {
    'use strict';

    const S = LoadoutShared;
    const API_BASE = S.API_BASE;
    const WEAPONS_API_BASE = S.WEAPONS_API_BASE;
    const STORAGE_KEY = 'marathondb_weapon_loadouts'; // localStorage saved builds
    const MAX_MODS = 4;

    // ================================================================
    // STAT CONFIGS — maxValue filled dynamically from /api/weapons/stat-ranges
    // ================================================================
    const CORE_STATS = [
        { key: 'firepower_score', label: 'FIREPOWER', suffix: '' },
        { key: 'accuracy_score',  label: 'ACCURACY',  suffix: '' },
        { key: 'handling_score',  label: 'HANDLING',  suffix: '' },
        { key: 'range_meters',    label: 'RANGE',     suffix: 'm' },
        { key: 'magazine_size',   label: 'MAGAZINE',  suffix: '' },
        { key: 'zoom',            label: 'ZOOM',      suffix: '', isRaw: true },
    ];

    const ADVANCED_STATS = [
        { key: 'damage',               label: 'DAMAGE',         suffix: '' },
        { key: 'rate_of_fire',         label: 'RATE OF FIRE',   suffix: '', isRaw: true },
        { key: 'reload_speed',         label: 'RELOAD SPEED',   suffix: 's', inverse: true, isRaw: true },
        { key: 'equip_speed',          label: 'EQUIP SPEED',    suffix: 's', inverse: true, isRaw: true },
        { key: 'ads_speed',            label: 'ADS SPEED',      suffix: 's', inverse: true, isRaw: true },
        { key: 'aim_assist',           label: 'AIM ASSIST',     suffix: '' },
        { key: 'recoil',               label: 'RECOIL',         suffix: '%' },
        { key: 'precision',            label: 'PRECISION',      suffix: 'x' },
        { key: 'charge_time_seconds',  label: 'CHARGE TIME',    suffix: 's', inverse: true },
        { key: 'volt_drain',           label: 'VOLT DRAIN',     suffix: '%' },
        { key: 'weight',               label: 'WEIGHT',         suffix: '%' },
        { key: 'hipfire_spread',       label: 'HIPFIRE SPREAD', suffix: '', inverse: true },
        { key: 'ads_spread',           label: 'ADS SPREAD',     suffix: '', inverse: true },
        { key: 'crouch_spread_bonus',  label: 'CROUCH BONUS',   suffix: '%' },
        { key: 'moving_inaccuracy',    label: 'MOVE INACCURACY',suffix: '%', inverse: true },
    ];

    const TTK_STATS = [
        { key: 'ttk_no_shield',     label: 'No Shield',     color: 'var(--text-secondary)' },
        { key: 'ttk_green_shield',  label: 'Green Shield',  color: '#4ade80' },
        { key: 'ttk_blue_shield',   label: 'Blue Shield',   color: '#60a5fa' },
        { key: 'ttk_purple_shield', label: 'Purple Shield', color: '#c084fc' },
    ];

    // Hardcoded fallback ranges (used if /api/weapons/stat-ranges fails)
    const FALLBACK_RANGES = {
        firepower_score: { min: 14, max: 50 },
        accuracy_score: { min: 20, max: 100 },
        handling_score: { min: 40, max: 100 },
        range_meters: { min: 8, max: 200 },
        magazine_size: { min: 5, max: 60 },
        zoom: { min: 1, max: 5 },
        damage: { min: 10, max: 150 },
        rate_of_fire: { min: 30, max: 1200 },
        reload_speed: { min: 1.2, max: 5 },
        equip_speed: { min: 0.3, max: 2 },
        ads_speed: { min: 0.1, max: 1 },
        aim_assist: { min: 0, max: 5 },
        recoil: { min: 5, max: 100 },
        precision: { min: 1, max: 5 },
        charge_time_seconds: { min: 0.1, max: 5 },
        volt_drain: { min: 0, max: 100 },
        weight: { min: 0, max: 100 },
        hipfire_spread: { min: 0.5, max: 8 },
        ads_spread: { min: 0.1, max: 3.5 },
        crouch_spread_bonus: { min: 0, max: 100 },
        moving_inaccuracy: { min: 0, max: 100 },
    };

    /** Dynamic stat ranges — populated on init from API */
    let statRanges = { ...FALLBACK_RANGES };

    /** Current season — fetched once on init */
    let currentSeason = null;



    // ================================================================
    // STATE — single weapon slot
    // ================================================================
    function emptySlot() {
        return {
            weapon: null,
            weaponDetail: null,
            mods: [null, null, null, null],
            compatibleMods: [],   // full mod objects from mods API
            modSlotLayout: [],    // slot layout from mods API /api/weapons/:slug/slots
        };
    }

    const state = {
        slot: emptySlot(),
        shareCode: null,  // set when loaded from a share link
        views: null,      // view count from server
    };

    function active() { return state.slot; }

    const dom = {};

    // ================================================================
    // DOM REFERENCES
    // ================================================================
    function initDomRefs() {
        // Header actions
        dom.clearBtn = document.getElementById('clearLoadoutBtn');
        dom.shareBtn = document.getElementById('shareLoadoutBtn');

        // Save modal
        dom.saveModal = document.getElementById('saveModal');
        dom.saveModalClose = document.getElementById('saveModalClose');
        dom.loadoutNameInput = document.getElementById('loadoutNameInput');
        dom.authorNameInput = document.getElementById('authorNameInput');
        dom.saveConfirmBtn = document.getElementById('saveConfirmBtn');
        dom.saveError = document.getElementById('saveError');
        dom.shareToast = document.getElementById('shareToast');

        // Saved / community list
        dom.savedList = document.getElementById('savedLoadoutsList');
        dom.noSaved = document.getElementById('noSavedLoadouts');

        // Empty state
        dom.emptyState = document.getElementById('weaponEmptyState');
        dom.selectWeaponBtn = document.getElementById('selectWeaponBtn');
        dom.changeWeaponBtn = document.getElementById('changeWeaponBtn');

        // Builder layout
        dom.builderLayout = document.getElementById('weaponBuilderLayout');

        // Preview
        dom.previewImg = document.getElementById('weaponPreviewImg');
        dom.previewName = document.getElementById('weaponPreviewName');
        dom.previewBadges = document.getElementById('weaponPreviewBadges');
        dom.previewDesc = document.getElementById('weaponPreviewDesc');

        // Stats
        dom.coreStats = document.getElementById('coreStatsContainer');
        dom.advancedStats = document.getElementById('advancedStatsContainer');
        dom.advancedToggle = document.getElementById('advancedToggle');
        dom.ttkSection = document.getElementById('ttkSection');
        dom.ttkContainer = document.getElementById('ttkContainer');
        dom.statsModHint = document.getElementById('statsModHint');
        dom.statChangeBadge = document.getElementById('statChangeBadge');

        // Mods
        dom.modsSection = document.getElementById('modsSection');
        dom.modSlots = document.getElementById('modSlotsContainer');
        dom.modCountBadge = document.getElementById('modCountBadge');

        // Mod effects
        dom.modEffectsPanel = document.getElementById('modEffectsPanel');
        dom.modEffectsList = document.getElementById('modEffectsList');

        // Build summary
        dom.buildSummary = document.getElementById('buildSummary');
    }

    // ================================================================
    // RENDER ACTIVE STATE
    // ================================================================
    function renderActiveSlot() {
        const slot = active();
        if (slot.weapon) {
            dom.emptyState.classList.add('hidden');
            dom.builderLayout.classList.remove('hidden');
            renderWeaponPreview();
            renderStats();
            renderModSlots();
            renderModEffects();
        } else {
            dom.builderLayout.classList.add('hidden');
            dom.emptyState.classList.remove('hidden');
            dom.modEffectsPanel.classList.add('hidden');
        }
        renderBuildSummary();
    }

    // ================================================================
    // WEAPON ICON HELPERS
    // ================================================================
    function getWeaponHighResUrl(weapon) {
        if (!weapon) return '';
        // Prefer the explicit icon_url_high from API
        if (weapon.icon_url_high) {
            return weapon.icon_url_high.startsWith('http')
                ? weapon.icon_url_high
                : `${WEAPONS_API_BASE}${weapon.icon_url_high.startsWith('/') ? '' : '/'}${weapon.icon_url_high}`;
        }
        // Fallback chain
        const build = (path) => {
            if (!path) return null;
            if (path.startsWith('http')) return path;
            return `${WEAPONS_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
        };
        return build(weapon.icon_url) || build(weapon.icon_path_high)
            || build(weapon.icon_path) || `${WEAPONS_API_BASE}/assets/weapons/${weapon.slug}-800x600.png`;
    }

    // ================================================================
    // RENDER WEAPON PREVIEW
    // ================================================================
    function renderWeaponPreview() {
        const slot = active();
        const w = slot.weaponDetail || slot.weapon;
        if (!w) return;

        dom.previewImg.src = getWeaponHighResUrl(w);
        dom.previewImg.alt = w.name;
        dom.previewImg.onerror = function () {
            this.src = S.getItemIcon(w, 'weapon');
        };

        dom.previewName.textContent = w.name;

        const badges = [];
        if (w.category_name || w.category)
            badges.push(`<span class="wb-badge wb-badge-category">${w.category_name || w.category}</span>`);
        if (w.ammo_type) {
            const ammoLabel = w.ammo_type === 'volt_battery' ? 'Volt Battery' : S.capitalize(w.ammo_type);
            badges.push(`<span class="wb-badge wb-badge-ammo">${ammoLabel}</span>`);
        }
        if (w.fire_mode)
            badges.push(`<span class="wb-badge wb-badge-fire">${S.capitalize(w.fire_mode)}</span>`);
        if (w.rarity)
            badges.push(`<span class="wb-badge wb-badge-rarity rarity-${w.rarity}">${S.capitalize(w.rarity)}</span>`);
        const slotCount = active().modSlotLayout?.length || w.mod_slot_count;
        if (slotCount != null)
            badges.push(`<span class="wb-badge wb-badge-mods">${slotCount} Mod Slots</span>`);
        dom.previewBadges.innerHTML = badges.join('');

        dom.previewDesc.textContent = w.description || '';
        dom.previewDesc.style.display = w.description ? '' : 'none';
    }

    // ================================================================
    // STAT BARS — uses dynamic stat ranges from API
    // ================================================================
    function getMaxValue(statKey) {
        const range = statRanges[statKey];
        return range ? range.max : 100;
    }

    function getBaseStatValue(config) {
        const stats = (active().weaponDetail || {}).stats || {};
        return stats[config.key] ?? null;
    }

    function getModStatDelta(statKey) {
        const slot = active();
        let total = 0;
        for (const mod of slot.mods) {
            if (!mod || !mod.effects) continue;
            for (const effect of mod.effects) {
                if (effect.stat_name === statKey) {
                    const val = effect.stat_modifier_value;
                    if (val != null && !isNaN(val)) total += val;
                }
            }
        }
        return total;
    }

    function renderStatBar(config, delta) {
        const value = getBaseStatValue(config);
        if (value == null) return '';

        const numericBase = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(numericBase)) return '';

        const maxValue = getMaxValue(config.key);
        const modified = numericBase + delta;
        const displayBase = config.isRaw ? value : (numericBase + (config.suffix || ''));
        const displayMod = config.isRaw ? modified : (modified + (config.suffix || ''));

        let basePercent, modPercent;
        if (config.inverse) {
            basePercent = Math.max(0, Math.min(100, ((maxValue - numericBase) / maxValue) * 100));
            modPercent = Math.max(0, Math.min(100, ((maxValue - modified) / maxValue) * 100));
        } else {
            basePercent = Math.max(0, Math.min(100, (numericBase / maxValue) * 100));
            modPercent = Math.max(0, Math.min(100, (modified / maxValue) * 100));
        }

        const hasDelta = delta !== 0;
        const isPositive = (config.inverse ? delta < 0 : delta > 0);
        const deltaClass = hasDelta ? (isPositive ? 'stat-positive' : 'stat-negative') : '';
        const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;

        return `
            <div class="wb-stat-row ${deltaClass}">
                <div class="wb-stat-label">${config.label}</div>
                <div class="wb-stat-bar-track">
                    <div class="wb-stat-bar-base" style="width: ${basePercent}%"></div>
                    ${hasDelta ? `<div class="wb-stat-bar-mod ${isPositive ? 'positive' : 'negative'}" style="left: ${Math.min(basePercent, modPercent)}%; width: ${Math.abs(modPercent - basePercent)}%"></div>` : ''}
                </div>
                <div class="wb-stat-value">
                    ${hasDelta
                        ? `<span class="wb-stat-modified">${displayMod}</span><span class="wb-stat-delta ${isPositive ? 'positive' : 'negative'}">(${deltaStr})</span>`
                        : `<span>${displayBase}</span>`
                    }
                </div>
            </div>`;
    }

    function renderStats() {
        const slot = active();
        if (!slot.weaponDetail) {
            dom.coreStats.innerHTML = '';
            dom.advancedStats.innerHTML = '';
            dom.ttkSection.style.display = 'none';
            return;
        }

        const stats = slot.weaponDetail.stats || {};
        const hasModEffects = slot.mods.some(m => m != null);

        // Core stats
        let coreHTML = '';
        for (const config of CORE_STATS) {
            coreHTML += renderStatBar(config, getModStatDelta(config.key));
        }
        dom.coreStats.innerHTML = coreHTML;

        // Advanced stats — skip stats the weapon doesn't have (null)
        let advHTML = '';
        for (const config of ADVANCED_STATS) {
            if (stats[config.key] == null) continue;
            advHTML += renderStatBar(config, getModStatDelta(config.key));
        }
        dom.advancedStats.innerHTML = advHTML;

        // TTK — only show section if any TTK stat exists and is non-null
        const ttkEntries = TTK_STATS.filter(t => stats[t.key] != null);
        if (ttkEntries.length) {
            dom.ttkSection.style.display = '';
            dom.ttkContainer.innerHTML = ttkEntries.map(t => `
                <div class="wb-ttk-item">
                    <span class="wb-ttk-label" style="color: ${t.color}">${t.label}</span>
                    <span class="wb-ttk-value">${stats[t.key]}s</span>
                </div>`).join('');
        } else {
            dom.ttkSection.style.display = 'none';
        }

        dom.statsModHint.textContent = hasModEffects ? 'Including mod stats' : '';

        // Stat change badge — count how many stats are modified by mods
        const allStats = [...CORE_STATS, ...ADVANCED_STATS];
        const modifiedCount = allStats.filter(c => getModStatDelta(c.key) !== 0).length;
        if (modifiedCount > 0) {
            const positiveCount = allStats.filter(c => {
                const d = getModStatDelta(c.key);
                return c.inverse ? d < 0 : d > 0;
            }).length;
            const negativeCount = allStats.filter(c => {
                const d = getModStatDelta(c.key);
                return c.inverse ? d > 0 : d < 0;
            }).length;

            let badgeParts = [];
            if (positiveCount > 0) badgeParts.push(`<span class="badge-up">&#9650;${positiveCount}</span>`);
            if (negativeCount > 0) badgeParts.push(`<span class="badge-down">&#9660;${negativeCount}</span>`);
            dom.statChangeBadge.innerHTML = badgeParts.join(' ');
            dom.statChangeBadge.classList.remove('hidden');
        } else {
            dom.statChangeBadge.classList.add('hidden');
        }
    }

    // ================================================================
    // MOD SLOTS — uses mod_types from weapon detail
    // ================================================================
    function getModTypeSlots() {
        const slot = active();

        // Use slot layout from mods API (/api/weapons/:slug/slots)
        if (slot.modSlotLayout && slot.modSlotLayout.length) {
            return slot.modSlotLayout.map(s => {
                const modsOfType = slot.compatibleMods.filter(m => m.slot_type === s.slot_type);
                return { type: s.slot_type, mods: modsOfType };
            });
        }

        // Fallback: derive types from compatible mods
        if (!slot.compatibleMods.length) return [];
        const typeMap = {};
        for (const mod of slot.compatibleMods) {
            const t = mod.slot_type || mod.type || 'mod';
            if (!typeMap[t]) typeMap[t] = [];
            typeMap[t].push(mod);
        }
        return Object.entries(typeMap).slice(0, MAX_MODS).map(([type, mods]) => ({ type, mods }));
    }

    function renderModSlots() {
        const slot = active();
        const typeSlots = getModTypeSlots();
        const slotCount = typeSlots.length || 0;

        const equippedCount = slot.mods.filter(m => m != null).length;
        dom.modCountBadge.textContent = equippedCount > 0 ? `${equippedCount}/${slotCount}` : `0/${slotCount}`;

        if (!slotCount) {
            dom.modSlots.innerHTML = '<div class="wb-mod-empty">No compatible mods for this weapon.</div>';
            return;
        }

        let html = '';
        typeSlots.forEach((ts, idx) => {
            const equipped = slot.mods[idx];
            const modIcon = equipped ? (equipped.icon_url || S.getItemIcon(equipped, 'mod')) : '';

            html += `
                <button class="wb-mod-slot${equipped ? ' wb-mod-filled' : ''}" data-slot-index="${idx}" data-mod-type="${ts.type}"${equipped && equipped.rarity ? ` data-rarity="${equipped.rarity}"` : ''}>
                    <div class="wb-mod-slot-header">
                        <span class="wb-mod-type-label">${S.capitalize(ts.type)}</span>
                        ${equipped ? `<button class="wb-mod-clear" data-slot-index="${idx}" title="Remove">×</button>` : ''}
                    </div>
                    <div class="wb-mod-slot-body">
                        ${equipped ? `
                            <img class="wb-mod-icon" src="${modIcon}" alt="${equipped.name}" onerror="this.style.display='none'" loading="lazy">
                            <div class="wb-mod-info">
                                <span class="wb-mod-name">${equipped.name}</span>
                                ${equipped.effects && equipped.effects.length
                                    ? `<span class="wb-mod-effects-preview">${equipped.effects.map(e => formatEffect(e)).join(', ')}</span>`
                                    : ''}
                            </div>
                            ${equipped.effects && equipped.effects.length ? `
                            <div class="wb-mod-tooltip">
                                <div class="wb-mod-tooltip-title">${equipped.name}${equipped.rarity ? ` <span class="wb-tooltip-rarity rarity-${equipped.rarity}">${S.capitalize(equipped.rarity)}</span>` : ''}</div>
                                <div class="wb-mod-tooltip-effects">
                                    ${equipped.effects.map(e => {
                                        const val = e.stat_modifier_value;
                                        const isPos = val != null && val > 0;
                                        const isNeg = val != null && val < 0;
                                        return `<div class="wb-tooltip-effect${isPos ? ' positive' : ''}${isNeg ? ' negative' : ''}">
                                            <span>${S.formatStatName(e.stat_name || '')}</span>
                                            <span>${e.stat_modifier || ''}</span>
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>` : ''}
                        ` : `
                            <div class="wb-mod-placeholder">
                                <img src="/marathon/assets/icons/builder/${ts.type.toLowerCase()}-96x96.png" alt="${S.capitalize(ts.type)}" width="20" height="20" style="opacity:0.5" onerror="this.style.display='none'">
                                <span>Add ${S.capitalize(ts.type)} Mod</span>
                            </div>
                        `}
                    </div>
                </button>`;
        });

        dom.modSlots.innerHTML = html;

        // Bind events
        dom.modSlots.querySelectorAll('.wb-mod-slot').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.wb-mod-clear')) return;
                openModPicker(parseInt(el.dataset.slotIndex), el.dataset.modType);
            });
        });
        dom.modSlots.querySelectorAll('.wb-mod-clear').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearMod(parseInt(btn.dataset.slotIndex));
            });
        });
    }

    function formatEffect(effect) {
        if (!effect) return '';
        const name = S.formatStatName(effect.stat_name || '');
        const val = effect.stat_modifier || '';
        return `${val} ${name}`;
    }

    function clearMod(idx) {
        active().mods[idx] = null;
        renderModSlots();
        renderStats();
        renderModEffects();
        renderBuildSummary();
    }

    // ================================================================
    // MOD EFFECTS SUMMARY — uses stat_modifier_value
    // ================================================================
    function renderModEffects() {
        const slot = active();
        const allEffects = [];
        for (const mod of slot.mods) {
            if (!mod || !mod.effects) continue;
            for (const effect of mod.effects) {
                const val = effect.stat_modifier_value;
                if (val == null || isNaN(val)) continue;
                allEffects.push({
                    stat: effect.stat_name,
                    value: val,
                    source: mod.name,
                    display: effect.stat_modifier,
                });
            }
        }

        if (!allEffects.length) {
            dom.modEffectsPanel.classList.add('hidden');
            return;
        }

        dom.modEffectsPanel.classList.remove('hidden');

        // Group by stat key (keys are already canonical from API)
        const grouped = {};
        for (const e of allEffects) {
            if (!grouped[e.stat]) grouped[e.stat] = { stat: e.stat, total: 0, sources: [] };
            grouped[e.stat].total += e.value;
            grouped[e.stat].sources.push(e);
        }

        // Stats where higher values are worse (e.g. reload_speed, charge_time)
        const INVERSE_STATS = new Set(
            [...CORE_STATS, ...ADVANCED_STATS].filter(c => c.inverse).map(c => c.key)
        );

        dom.modEffectsList.innerHTML = Object.values(grouped).map(g => {
            const isInverse = INVERSE_STATS.has(g.stat);
            const isPositive = isInverse ? g.total < 0 : g.total > 0;
            const totalStr = g.total > 0 ? `+${g.total}` : `${g.total}`;
            return `
                <div class="wb-effect-row">
                    <span class="wb-effect-stat">${S.formatStatName(g.stat)}</span>
                    <span class="wb-effect-value ${isPositive ? 'positive' : 'negative'}">${totalStr}</span>
                </div>`;
        }).join('');
    }

    // ================================================================
    // BUILD SUMMARY HEADER
    // ================================================================
    function renderBuildSummary() {
        const slot = state.slot;
        if (!slot.weapon) {
            dom.buildSummary.classList.add('hidden');
            return;
        }

        const modCount = slot.mods.filter(m => m != null).length;
        let text = slot.weapon.name;
        if (modCount > 0) text += ` + ${modCount} Mod${modCount > 1 ? 's' : ''}`;

        dom.buildSummary.innerHTML = `<span class="wb-summary-slot">${text}</span>`;
        dom.buildSummary.classList.remove('hidden');
    }

    // ================================================================
    // PICKER INTEGRATION
    // ================================================================
    function openWeaponPicker() {
        S.openPicker('weapon', S.cache.weapons || [], {
            title: 'Select Weapon',
            filters: S.buildWeaponFilters(),
            filterFn: S.weaponFilterFn,
            itemType: 'weapon',
            currentItem: active().weapon || null,
        });
    }

    function openModPicker(slotIndex, modType) {
        const slot = active();
        const available = slot.compatibleMods.filter(m => m.slot_type === modType);

        // Build rarity filters
        let filtersHTML = '<button class="picker-filter-btn active" data-filter="all">All</button>';
        const rarities = [...new Set(available.map(m => m.rarity).filter(Boolean))];
        ['enhanced', 'deluxe', 'superior', 'prestige'].forEach(r => {
            if (rarities.some(ir => ir.toLowerCase() === r)) {
                filtersHTML += `<button class="picker-filter-btn" data-filter="${r}">${S.capitalize(r)}</button>`;
            }
        });

        S.openPicker(`mod_${slotIndex}`, available, {
            title: `Select ${S.capitalize(modType)} Mod`,
            filters: filtersHTML,
            filterFn: S.rarityFilterFn,
            itemType: 'mod',
            currentItem: slot.mods[slotIndex] || null,
        });
    }

    async function onPickerSelect(slotType, item) {
        if (slotType === 'weapon') {
            await selectWeapon(item);
        } else if (slotType.startsWith('mod_')) {
            const slot = active();
            const idx = parseInt(slotType.replace('mod_', ''));

            // Fetch full mod detail from mods API to get effects
            try {
                const resp = await MarathonAPI.getModBySlug(item.slug);
                const detail = resp?.data || resp;
                if (detail) {
                    // Normalize effects to match the field names used by stat delta code
                    item = {
                        ...item,
                        description: detail.description || item.description,
                        ability_name: detail.ability_name || null,
                        ability_description: detail.ability_description || null,
                        effects: (detail.effects || []).map(e => ({
                            stat_name: e.stat_key,
                            stat_modifier_value: e.delta,
                            stat_modifier: e.display_text || (e.delta > 0 ? `+${e.delta}` : `${e.delta}`),
                        })),
                    };
                }
            } catch (e) {
                console.warn('Failed to fetch mod detail:', e);
                // Equip without effects — user gets the mod but no stat preview
                item = { ...item, effects: [] };
            }

            slot.mods[idx] = item;

            renderModSlots();
            renderStats();
            renderModEffects();
            renderBuildSummary();
        }
    }

    // ================================================================
    // WEAPON SELECTION — full mod data comes from weapon detail
    // ================================================================
    async function selectWeapon(item) {
        const slot = active();
        slot.weapon = item;
        slot.mods = [null, null, null, null];
        slot.compatibleMods = [];
        slot.modSlotLayout = [];
        slot.weaponDetail = null;

        dom.emptyState.classList.add('hidden');
        dom.builderLayout.classList.remove('hidden');

        renderWeaponPreview();
        dom.coreStats.innerHTML = '<div class="wb-loading-stats">Loading stats…</div>';
        dom.advancedStats.innerHTML = '';
        dom.modSlots.innerHTML = '<div class="wb-loading-stats">Loading mods…</div>';

        try {
            // Fetch weapon detail, compatible mods, and slot layout in parallel
            const [weaponResp, modsResp, slotsResp] = await Promise.all([
                WeaponsAPI.getWeaponBySlug(item.slug),
                MarathonAPI.getModsForWeapon(item.slug),
                MarathonAPI.getModSlotsForWeapon(item.slug),
            ]);
            const weaponData = weaponResp?.data || weaponResp;
            if (weaponData) {
                slot.weaponDetail = weaponData;
            }

            // Slot layout from mods API — response is {weapon_slug, slots: [...]}
            const slotsObj = slotsResp?.data || slotsResp || {};
            const slotsArr = Array.isArray(slotsObj) ? slotsObj : (slotsObj.slots || []);
            slot.modSlotLayout = slotsArr.sort((a, b) => (a.slot_number || 0) - (b.slot_number || 0));

            // Compatible mods — response is {weapon_slug, slot_count, slots, unslotted_mods}
            const modsObj = modsResp?.data || modsResp || {};
            const modsArray = Array.isArray(modsObj)
                ? modsObj
                : [
                    ...((modsObj.slots || []).flatMap(s => s.mods || [])),
                    ...(modsObj.unslotted_mods || []),
                  ];
            slot.compatibleMods = modsArray.map(mod => ({
                ...mod,
                effects: [],  // effects fetched on equip via mod detail
            }));
        } catch (e) {
            console.error('Failed to fetch weapon detail:', e);
        }

        renderWeaponPreview();
        renderStats();
        renderModSlots();
        renderModEffects();
    }

    // ================================================================
    // URL — query-parameter share codes (?code=ABC123)
    // ================================================================
    async function loadFromURL() {
        const code = new URLSearchParams(window.location.search).get('code');
        if (code && /^[A-Za-z0-9]{6,10}$/.test(code)) {
            await loadFromShareCode(code);
        }
    }

    async function restoreModsForSlot(slot, modSlugs) {
        if (!modSlugs || !modSlugs.length) return;
        const fetches = [];
        for (let i = 0; i < Math.min(modSlugs.length, MAX_MODS); i++) {
            if (!modSlugs[i]) continue;
            const mod = slot.compatibleMods.find(m => m.slug === modSlugs[i]);
            if (mod) {
                const idx = i;
                fetches.push(
                    MarathonAPI.getModBySlug(mod.slug).then(resp => {
                        const detail = resp?.data || resp;
                        if (detail && detail.effects) {
                            slot.mods[idx] = {
                                ...mod,
                                description: detail.description || mod.description,
                                ability_name: detail.ability_name || null,
                                ability_description: detail.ability_description || null,
                                effects: detail.effects.map(e => ({
                                    stat_name: e.stat_key,
                                    stat_modifier_value: e.delta,
                                    stat_modifier: e.display_text || (e.delta > 0 ? `+${e.delta}` : `${e.delta}`),
                                })),
                            };
                        } else {
                            slot.mods[idx] = { ...mod, effects: [] };
                        }
                    }).catch(() => {
                        slot.mods[idx] = { ...mod, effects: [] };
                    })
                );
            }
        }
        if (fetches.length) await Promise.all(fetches);
    }

    // ================================================================
    // SHARE CODE — server-side persistence
    // ================================================================
    async function loadFromShareCode(code) {
        // Show loading feedback
        dom.emptyState.classList.add('hidden');
        dom.builderLayout.classList.remove('hidden');
        dom.coreStats.innerHTML = '<div class="wb-loading-stats">Loading shared build…</div>';
        dom.advancedStats.innerHTML = '';
        dom.modSlots.innerHTML = '';
        dom.previewName.textContent = 'Loading…';

        try {
            const resp = await MarathonAPI.getLoadout(code);
            const data = resp?.data || resp;
            if (!data) {
                showShareCodeError('Build not found. It may have been deleted.');
                return;
            }

            state.shareCode = data.share_code || code;
            state.views = data.views || 0;

            // Restore weapon (prefer primary, fall back to secondary for legacy codes)
            const weaponData = data.primary_weapon || data.secondary_weapon;
            const modsData = data.primary_weapon ? data.primary_mods : data.secondary_mods;
            if (weaponData) {
                const weaponSlug = typeof weaponData === 'string'
                    ? weaponData : weaponData.slug;
                const weapon = (S.cache.weapons || []).find(w => w.slug === weaponSlug);
                if (weapon) {
                    await selectWeapon(weapon);
                    const modSlugs = (modsData || []).map(m =>
                        typeof m === 'string' ? m : m.slug);
                    await restoreModsForSlot(state.slot, modSlugs);
                }
            }

            renderActiveSlot();
        } catch (e) {
            console.error('Failed to load shared loadout:', e);
            showShareCodeError('Failed to load this build. Please try again.');
        }
    }

    function showShareCodeError(message) {
        dom.builderLayout.classList.add('hidden');
        dom.emptyState.classList.remove('hidden');
        // Show error within the empty state area
        const existingErr = dom.emptyState.querySelector('.wb-share-error');
        if (existingErr) existingErr.remove();
        const errDiv = document.createElement('div');
        errDiv.className = 'wb-share-error';
        errDiv.innerHTML = `<p>${S.escapeHTML(message)}</p><a href="/marathon/weapon-loadout-builder/" class="loadout-action-btn">Start Fresh</a>`;
        dom.emptyState.appendChild(errDiv);
    }

    async function share() {
        if (!state.slot.weapon) return;

        if (state.shareCode) {
            const url = `${window.location.origin}/weapon-loadout-builder/?code=${state.shareCode}`;
            S.copyToClipboard(url, dom.shareToast);
            return;
        }

        const autoName = `${state.slot.weapon.name} Build`;
        await saveToServer(autoName, '', true);
    }

    // ================================================================
    // SAVE — server-side via POST /api/loadouts
    // ================================================================
    async function saveToServer(name, authorName, andShare) {
        const slot = state.slot;

        const payload = {
            name: name || 'Untitled Weapon Build',
            type: 'weapon',
            season: currentSeason ? currentSeason.version : undefined,
            primary_weapon: slot.weapon ? slot.weapon.slug : null,
            primary_mods: slot.mods.filter(m => m).map(m => m.slug),
            secondary_weapon: null,
            secondary_mods: [],
            runner: null,
            runner_equipment: null,
        };
        if (authorName) payload.author_name = authorName;

        // Clear previous error
        if (dom.saveError) {
            dom.saveError.textContent = '';
            dom.saveError.classList.add('hidden');
        }

        try {
            const resp = await MarathonAPI.createLoadout(payload);
            const data = resp?.data || resp;

            if (data && data.share_code) {
                state.shareCode = data.share_code;
                dom.saveModal.classList.remove('active');

                // Update URL to include share code
                history.replaceState(null, '', `/weapon-loadout-builder/?code=${data.share_code}`);

                if (andShare) {
                    const url = `${window.location.origin}/weapon-loadout-builder/?code=${data.share_code}`;
                    S.copyToClipboard(url, dom.shareToast);
                }

                // Also keep a local reference
                const entry = {
                    id: S.generateId(),
                    name: payload.name,
                    date: new Date().toISOString(),
                    shareCode: data.share_code,
                    weapon: slot.weapon ? { slug: slot.weapon.slug, name: slot.weapon.name } : null,
                };
                S.saveToStorage(STORAGE_KEY, entry);
                renderSaved();
            }
        } catch (err) {
            // Handle profanity + validation errors
            const body = err.body || {};
            const errorCode = body.error || '';
            let message = '';

            if (errorCode === 'profanity_detected') {
                message = body.detail || 'The name contains inappropriate language. Please choose another.';
            } else if (errorCode === 'name_required') {
                message = 'Please enter a build name.';
            } else if (errorCode === 'name_too_long') {
                message = 'Build name must be 60 characters or less.';
            } else if (errorCode === 'invalid_slug') {
                message = body.detail || 'One of the selected items is invalid.';
            } else if (errorCode === 'empty_loadout') {
                message = 'Select at least one weapon before saving.';
            } else {
                message = body.detail || 'Failed to save. Please try again.';
            }

            if (dom.saveError) {
                dom.saveError.textContent = message;
                dom.saveError.classList.remove('hidden');
            }
            console.error('Save failed:', err);
        }
    }

    function renderSaved() {
        const saved = S.getSavedLoadouts(STORAGE_KEY);
        S.renderSavedList(dom.savedList, dom.noSaved, saved, {
            basePath: '/marathon/weapon-loadout-builder/',
            toastEl: dom.shareToast,
            onLoad: (entry) => {
                if (entry.shareCode) {
                    window.location.href = `/weapon-loadout-builder/?code=${entry.shareCode}`;
                }
            },
            onDelete: (id) => {
                S.deleteFromStorage(STORAGE_KEY, id);
                renderSaved();
            },
        });
    }

    // ================================================================
    // SAVE MODAL
    // ================================================================
    function openSaveModal(andShareAfter = false) {
        if (!state.slot.weapon) return;

        const defaultName = `${state.slot.weapon.name} Build`;

        dom.loadoutNameInput.value = defaultName;
        if (dom.authorNameInput) dom.authorNameInput.value = '';
        if (dom.saveError) {
            dom.saveError.textContent = '';
            dom.saveError.classList.add('hidden');
        }

        // Store intent to share after save
        dom.saveConfirmBtn.dataset.andShare = andShareAfter ? '1' : '';

        dom.saveModal.classList.add('active');
        dom.loadoutNameInput.focus();
        dom.loadoutNameInput.select();
    }

    // ================================================================
    // CLEAR
    // ================================================================
    function clearAll() {
        state.slot = emptySlot();
        state.shareCode = null;
        state.views = null;

        renderActiveSlot();
        history.replaceState(null, '', '/marathon/weapon-loadout-builder/');
    }

    // ================================================================
    // EVENT LISTENERS
    // ================================================================
    function initEventListeners() {
        // Weapon selection
        dom.selectWeaponBtn.addEventListener('click', openWeaponPicker);
        dom.changeWeaponBtn.addEventListener('click', openWeaponPicker);

        // Header actions
        dom.clearBtn.addEventListener('click', clearAll);
        dom.shareBtn.addEventListener('click', share);

        // Advanced stats toggle
        dom.advancedToggle.addEventListener('click', () => {
            dom.advancedStats.classList.toggle('collapsed');
            dom.advancedToggle.classList.toggle('collapsed');
        });

        // Save modal
        dom.saveConfirmBtn.addEventListener('click', () => {
            const name = dom.loadoutNameInput.value.trim();
            const author = dom.authorNameInput ? dom.authorNameInput.value.trim() : '';
            const andShare = dom.saveConfirmBtn.dataset.andShare === '1';
            saveToServer(name, author, andShare);
        });

        dom.saveModalClose.addEventListener('click', () => dom.saveModal.classList.remove('active'));
        dom.saveModal.addEventListener('click', (e) => {
            if (e.target === dom.saveModal) dom.saveModal.classList.remove('active');
        });

        dom.loadoutNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); dom.saveConfirmBtn.click(); }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dom.saveModal.classList.contains('active')) {
                dom.saveModal.classList.remove('active');
            }
        });
    }

    // ================================================================
    // INIT
    // ================================================================
    async function init() {
        initDomRefs();
        S.initPicker({ onSelect: onPickerSelect });

        // Fetch weapon data, stat ranges, and current season in parallel
        const [, rangesResp, seasonResp] = await Promise.all([
            S.loadWeaponData(),
            WeaponsAPI.getStatRanges().catch(() => null),
            MarathonAPI.getCurrentSeason().catch(() => null),
        ]);

        // Apply stat ranges from API
        if (rangesResp) {
            const ranges = rangesResp.data || rangesResp;
            if (ranges && typeof ranges === 'object') {
                for (const [key, val] of Object.entries(ranges)) {
                    if (val && val.max != null) {
                        statRanges[key] = val;
                    }
                }
            }
        }

        // Store current season
        if (seasonResp) {
            currentSeason = seasonResp.data || seasonResp;
        }

        // Advanced stats collapsed by default
        dom.advancedStats.classList.add('collapsed');
        dom.advancedToggle.classList.add('collapsed');

        renderSaved();
        await loadFromURL();

        if (!state.slot.weapon) {
            renderActiveSlot();
        }

        initEventListeners();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
