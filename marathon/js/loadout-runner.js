/**
 * Runner Loadout Builder — runner + equipment page logic (v4).
 *
 * v4 changes (API integration):
 *   - Dynamic stat bar ranges from /api/runners/stat-ranges
 *   - Cores from dedicated Cores API (cores.marathondb.gg)
 *   - Implants from dedicated Implants API (implants.marathondb.gg)
 *   - Implant stat aggregation with equipment deltas on stat bars
 *   - Server-side save via POST /api/loadouts (type: "runner")
 *   - Share codes with full equipment hydration
 *   - Server-only share codes (no hash encoding)
 *   - Build summary header
 *   - Stat change badge with inverse-aware coloring
 *   - Rarity glow on equipment slots
 */
(function () {
    'use strict';

    const S = LoadoutShared;
    const API_BASE = S.API_BASE;
    const STORAGE_KEY = 'marathondb_runner_loadouts';

    // ================================================================
    // STAT CONFIGS — maxValue filled dynamically from /api/runners/stat-ranges
    // ================================================================
    const RUNNER_STATS = [
        { key: 'heat_capacity',     label: 'HEAT CAPACITY',     suffix: '' },
        { key: 'agility',           label: 'AGILITY',           suffix: '' },
        { key: 'loot_speed',        label: 'LOOT SPEED',        suffix: '' },
        { key: 'melee_damage',      label: 'MELEE DAMAGE',      suffix: '' },
        { key: 'prime_recovery',    label: 'PRIME RECOVERY',    suffix: '' },
        { key: 'tactical_recovery', label: 'TACTICAL RECOVERY', suffix: '' },
        { key: 'self_repair_speed', label: 'SELF REPAIR SPEED', suffix: 's', inverse: true, isRaw: true },
        { key: 'finisher_siphon',   label: 'FINISHER SIPHON',   suffix: '' },
        { key: 'revive_speed',      label: 'REVIVE SPEED',      suffix: 's', inverse: true, isRaw: true },
        { key: 'hardware',          label: 'HARDWARE',          suffix: '' },
        { key: 'firewall',          label: 'FIREWALL',          suffix: '' },
        { key: 'fall_resistance',   label: 'FALL RESISTANCE',   suffix: '' },
        { key: 'ping_duration',     label: 'PING DURATION',     suffix: 's', isRaw: true },
    ];

    // Fallback ranges (used if /api/runners/stat-ranges fails)
    const FALLBACK_RANGES = {
        heat_capacity:     { min: 80,  max: 200 },
        agility:           { min: 3,   max: 8   },
        loot_speed:        { min: 1.0, max: 3.5 },
        melee_damage:      { min: 50,  max: 120 },
        prime_recovery:    { min: 10,  max: 45  },
        tactical_recovery: { min: 5,   max: 30  },
        self_repair_speed: { min: 1.0, max: 5.0 },
        finisher_siphon:   { min: 0,   max: 100 },
        revive_speed:      { min: 1.0, max: 4.0 },
        hardware:          { min: 1,   max: 5   },
        firewall:          { min: 50,  max: 200 },
        fall_resistance:   { min: 0,   max: 100 },
        ping_duration:     { min: 2,   max: 10  },
    };

    /** Dynamic stat ranges — populated on init from API */
    let statRanges = { ...FALLBACK_RANGES };

    /** Current season — fetched once on init */
    let currentSeason = null;



    // ================================================================
    // STATE
    // ================================================================
    const state = {
        selectedRunner: null,     // basic runner object from list
        runnerDetail: null,       // full detail with stats & abilities
        compatibleCores: [],      // from Cores API (runner-specific + universal)
        compatibleImplants: {},   // from Implants API grouped by slot
        equipment: {
            equipment: null,
            shield: null,
            core1: null,
            core2: null,
            head: null,
            torso: null,
            legs: null,
        },
        shareCode: null,
        views: null,
    };

    const dom = {};

    // ================================================================
    // DOM REFERENCES
    // ================================================================
    function initDomRefs() {
        // Header actions
        dom.clearBtn = document.getElementById('clearLoadoutBtn');
        dom.shareBtn = document.getElementById('shareLoadoutBtn');

        // Runner selector
        dom.runnerSelectorBar = document.getElementById('runnerSelectorBar');

        // Runner display
        dom.runnerDisplay = document.getElementById('runnerDisplay');
        dom.runnerDisplayInfo = document.getElementById('runnerDisplayInfo');
        dom.runnerDisplayImg = document.getElementById('runnerDisplayImg');
        dom.runnerDisplayName = document.getElementById('runnerDisplayName');
        dom.runnerDisplayRole = document.getElementById('runnerDisplayRole');
        dom.runnerDisplayDesc = document.getElementById('runnerDisplayDesc');
        dom.runnerDisplayAbilities = document.getElementById('runnerDisplayAbilities');
        dom.runnerEquipmentBenefits = document.getElementById('runnerEquipmentBenefits');

        // Stats
        dom.runnerStatsPanel = document.getElementById('runnerStatsPanel');
        dom.runnerStatsBars = document.getElementById('runnerStatsBars');
        dom.statsModHint = document.getElementById('statsModHint');
        dom.statChangeBadge = document.getElementById('statChangeBadge');

        // Equipment slots
        dom.slotEquipment = document.getElementById('slotEquipment');
        dom.slotShield = document.getElementById('slotShield');
        dom.slotCore1 = document.getElementById('slotCore1');
        dom.slotCore2 = document.getElementById('slotCore2');
        dom.slotImplantHead = document.getElementById('slotImplantHead');
        dom.slotImplantTorso = document.getElementById('slotImplantTorso');
        dom.slotImplantLegs = document.getElementById('slotImplantLegs');
        dom.coresHint = document.getElementById('coresHint');

        // Stat summary
        dom.statSummarySection = document.getElementById('statSummarySection');
        dom.statSummaryGrid = document.getElementById('statSummaryGrid');

        // Save modal
        dom.saveModal = document.getElementById('saveModal');
        dom.saveModalClose = document.getElementById('saveModalClose');
        dom.loadoutNameInput = document.getElementById('loadoutNameInput');
        dom.authorNameInput = document.getElementById('authorNameInput');
        dom.saveConfirmBtn = document.getElementById('saveConfirmBtn');
        dom.saveError = document.getElementById('saveError');
        dom.shareToast = document.getElementById('shareToast');

        // Saved list
        dom.savedList = document.getElementById('savedLoadoutsList');
        dom.noSaved = document.getElementById('noSavedLoadouts');

        // Build summary
        dom.buildSummary = document.getElementById('buildSummary');
    }

    // ================================================================
    // RUNNER SELECTOR BAR
    // ================================================================
    function renderRunnerSelector() {
        const runners = S.cache.runners || [];
        if (!runners.length) {
            dom.runnerSelectorBar.innerHTML = '<span style="color:var(--text-dim); font-size: 13px; padding: 20px;">Loading runners…</span>';
            return;
        }

        dom.runnerSelectorBar.innerHTML = runners.map(r => {
            const portrait = S.getRunnerPortrait(r.slug);
            const isActive = state.selectedRunner && state.selectedRunner.slug === r.slug;
            return `
                <button class="runner-select-btn${isActive ? ' active' : ''}" data-slug="${r.slug}">
                    <div class="runner-avatar">
                        <img src="${portrait}" alt="${r.name}" onerror="this.style.display='none'" loading="lazy">
                    </div>
                    <span class="runner-select-name">${r.name}</span>
                </button>`;
        }).join('');

        dom.runnerSelectorBar.querySelectorAll('.runner-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const slug = btn.dataset.slug;
                const runner = runners.find(r => r.slug === slug);
                if (runner) selectRunner(runner);
            });
        });
    }

    // ================================================================
    // RUNNER SELECTION
    // ================================================================
    async function selectRunner(runner) {
        state.selectedRunner = runner;
        state.runnerDetail = null;

        // Clear equipment when switching runners (cores are runner-specific)
        state.equipment = { equipment: null, shield: null, core1: null, core2: null, head: null, torso: null, legs: null };

        // Update selector bar active state
        dom.runnerSelectorBar.querySelectorAll('.runner-select-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.slug === runner.slug);
        });

        // Show runner display
        const emptyEl = dom.runnerDisplay.querySelector('.runner-display-empty');
        if (emptyEl) emptyEl.classList.add('hidden');
        dom.runnerDisplayInfo.classList.remove('hidden');

        // Set portrait
        dom.runnerDisplayImg.src = S.getRunnerPortrait(runner.slug);
        dom.runnerDisplayImg.alt = runner.name;
        dom.runnerDisplayImg.onerror = function () { this.style.display = 'none'; };

        dom.runnerDisplayName.textContent = runner.name;
        dom.runnerDisplayRole.textContent = runner.role || '';
        dom.runnerDisplayDesc.textContent = runner.description || '';

        // Show stats panel with loading
        dom.runnerStatsPanel.classList.remove('hidden');
        dom.runnerStatsBars.innerHTML = '<div class="wb-loading-stats">Loading stats…</div>';

        // Enable core slots
        dom.slotCore1.disabled = false;
        dom.slotCore2.disabled = false;
        dom.coresHint.textContent = '';

        // Clear all slot UIs
        clearAllSlotUIs();

        // Fetch full runner detail (for stats & abilities) + runner-specific cores in parallel
        try {
            const [runnerResp, coresResp] = await Promise.all([
                MarathonAPI.getRunnerBySlug(runner.slug).catch(() => null),
                MarathonAPI.getCoresByRunner(runner.slug).catch(() => null),
            ]);

            if (runnerResp) {
                const data = runnerResp?.data || runnerResp;
                if (data) {
                    state.runnerDetail = data;
                    renderAbilities(data.abilities || []);
                }
            }

            // Merge runner-specific cores with universal ("all") cores from cache
            const runnerCores = coresResp?.data || coresResp || [];
            const universalCores = (S.cache.cores || []).filter(c => c.runner_type === 'all');
            const slugsSeen = new Set();
            state.compatibleCores = [];
            for (const c of [...(Array.isArray(runnerCores) ? runnerCores : []), ...universalCores]) {
                if (!slugsSeen.has(c.slug)) {
                    slugsSeen.add(c.slug);
                    state.compatibleCores.push(c);
                }
            }

            // Group implants from cache by slot
            const allImplants = S.cache.implants || [];
            state.compatibleImplants = {
                shield: allImplants.filter(i => i.slot === 'shield'),
                head:   allImplants.filter(i => i.slot === 'head'),
                torso:  allImplants.filter(i => i.slot === 'torso'),
                legs:   allImplants.filter(i => i.slot === 'legs'),
            };
        } catch (e) {
            console.error('Failed to fetch runner detail:', e);
        }

        renderStats();
        renderStatSummary();
        renderEquipmentBenefits();
        renderBuildSummary();
    }

    function renderAbilities(abilities) {
        if (!abilities || !abilities.length) {
            dom.runnerDisplayAbilities.innerHTML = '';
            return;
        }
        dom.runnerDisplayAbilities.innerHTML = abilities.map(a => {
            const type = typeof a === 'string' ? '' : (a.ability_type || '');
            const name = typeof a === 'string' ? a : (a.name || '');
            return `
                <div class="ability-tag">
                    <span class="ability-tag-label">${S.escapeHTML(type)}</span>
                    <span class="ability-tag-name">${S.escapeHTML(name)}</span>
                </div>`;
        }).join('');
    }

    // ================================================================
    // STAT BARS — uses dynamic stat ranges from API
    // ================================================================
    function getRunnerStats() {
        if (state.runnerDetail && state.runnerDetail.stats) return state.runnerDetail.stats;
        if (state.selectedRunner && state.selectedRunner.stats) return state.selectedRunner.stats;
        return {};
    }

    function getMaxValue(statKey) {
        const range = statRanges[statKey];
        return range ? range.max : 100;
    }

    /** Convert camelCase to snake_case (API stat names → config keys) */
    function toSnakeCase(str) {
        return str.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    /**
     * Get total implant/shield stat delta for a given stat key.
     * Implant stats are always flat additive (stat_value).
     * Note: API returns camelCase stat_name (e.g. selfRepairSpeed)
     * but RUNNER_STATS uses snake_case keys (e.g. self_repair_speed).
     */
    function getEquipmentStatDelta(statKey) {
        let total = 0;
        const eq = state.equipment;

        // Shield stats
        if (eq.shield && eq.shield.stats) {
            for (const s of eq.shield.stats) {
                if (s.stat_name === statKey || toSnakeCase(s.stat_name) === statKey) total += (s.stat_value || 0);
            }
        }

        // Implant stats (head, torso, legs)
        for (const slot of ['head', 'torso', 'legs']) {
            const item = eq[slot];
            if (item && item.stats) {
                for (const s of item.stats) {
                    if (s.stat_name === statKey || toSnakeCase(s.stat_name) === statKey) total += (s.stat_value || 0);
                }
            }
        }

        return total;
    }

    function renderStatBar(config, baseValue, delta) {
        if (baseValue == null) return '';

        const numericBase = typeof baseValue === 'number' ? baseValue : parseFloat(String(baseValue));
        if (isNaN(numericBase)) return '';

        const maxValue = getMaxValue(config.key);
        const modified = numericBase + delta;
        const displayBase = config.isRaw ? baseValue : (numericBase + (config.suffix || ''));
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
        const stats = getRunnerStats();
        if (!stats || !Object.keys(stats).length) {
            dom.runnerStatsBars.innerHTML = '';
            return;
        }

        const hasEquipment = Object.values(state.equipment).some(e => e != null);

        let html = '';
        for (const config of RUNNER_STATS) {
            const baseVal = stats[config.key];
            if (baseVal == null) continue;
            const delta = getEquipmentStatDelta(config.key);
            html += renderStatBar(config, baseVal, delta);
        }

        dom.runnerStatsBars.innerHTML = html;

        // Mod hint
        if (dom.statsModHint) {
            dom.statsModHint.textContent = hasEquipment ? 'Including equipment stats' : '';
        }

        // Stat change badge
        if (dom.statChangeBadge) {
            const INVERSE_STATS = new Set(RUNNER_STATS.filter(c => c.inverse).map(c => c.key));

            const modifiedStats = RUNNER_STATS.filter(c => stats[c.key] != null && getEquipmentStatDelta(c.key) !== 0);
            if (modifiedStats.length > 0) {
                const positiveCount = modifiedStats.filter(c => {
                    const d = getEquipmentStatDelta(c.key);
                    return INVERSE_STATS.has(c.key) ? d < 0 : d > 0;
                }).length;
                const negativeCount = modifiedStats.filter(c => {
                    const d = getEquipmentStatDelta(c.key);
                    return INVERSE_STATS.has(c.key) ? d > 0 : d < 0;
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
    }

    // ================================================================
    // STAT SUMMARY — aggregated implant/shield stat changes
    // ================================================================
    function renderStatSummary() {
        const eq = state.equipment;
        const allItems = [eq.shield, eq.head, eq.torso, eq.legs].filter(Boolean);

        if (!allItems.length) {
            dom.statSummarySection.classList.add('hidden');
            return;
        }

        // Aggregate all stats from equipment
        const statTotals = {};
        for (const item of allItems) {
            if (!item.stats) continue;
            for (const s of item.stats) {
                if (!statTotals[s.stat_name]) statTotals[s.stat_name] = 0;
                statTotals[s.stat_name] += (s.stat_value || 0);
            }
        }

        if (!Object.keys(statTotals).length) {
            dom.statSummarySection.classList.add('hidden');
            return;
        }

        dom.statSummarySection.classList.remove('hidden');
        dom.statSummaryGrid.innerHTML = Object.entries(statTotals).map(([key, total]) => {
            const isPositive = total > 0;
            const displayVal = total > 0 ? `+${total}` : `${total}`;
            return `
                <div class="stat-summary-item">
                    <span class="stat-summary-label">${S.formatStatName(key)}</span>
                    <span class="stat-summary-value ${isPositive ? 'positive' : 'negative'}">${displayVal}</span>
                </div>`;
        }).join('');
    }

    // ================================================================
    // EQUIPMENT BENEFITS — always-visible summary in left panel
    // ================================================================
    function renderEquipmentBenefits() {
        const el = dom.runnerEquipmentBenefits;
        if (!el) return;

        const eq = state.equipment;
        const items = [];

        // Collect equipped items in display order
        const slotEntries = [
            { key: 'equipment', label: 'Equipment', item: eq.equipment },
            { key: 'shield',    label: 'Shield',    item: eq.shield },
            { key: 'core1',     label: 'Core',      item: eq.core1 },
            { key: 'core2',     label: 'Core',      item: eq.core2 },
            { key: 'head',      label: 'Implant',   item: eq.head },
            { key: 'torso',     label: 'Implant',   item: eq.torso },
            { key: 'legs',      label: 'Implant',   item: eq.legs },
        ];

        for (const entry of slotEntries) {
            if (!entry.item) continue;
            const it = entry.item;
            let benefitsHtml = '';

            // Stats (shields, implants)
            if (it.stats && it.stats.length) {
                benefitsHtml += it.stats.map(s => {
                    const val = s.stat_value || 0;
                    const sign = val > 0 ? '+' : '';
                    const cls = val > 0 ? 'positive' : (val < 0 ? 'negative' : '');
                    return `<span class="benefit-stat ${cls}">${S.formatStatName(s.stat_name)} ${sign}${val}</span>`;
                }).join('');
            }

            // Effects (cores)
            if (it.effects && it.effects.length) {
                benefitsHtml += it.effects.map(e =>
                    `<span class="benefit-effect">${S.escapeHTML(e.display_text || e.effect || e.name || e)}</span>`
                ).join('');
            }

            // Description fallback (equipment/items without stats/effects)
            if (!benefitsHtml && it.description) {
                benefitsHtml = `<span class="benefit-desc">${S.escapeHTML(it.description)}</span>`;
            }

            items.push(`
                <div class="benefit-item">
                    <div class="benefit-item-header">
                        <span class="benefit-item-type">${entry.label}</span>
                        <span class="benefit-item-name">${S.escapeHTML(it.name)}</span>
                    </div>
                    ${benefitsHtml ? `<div class="benefit-item-details">${benefitsHtml}</div>` : ''}
                </div>`);
        }

        if (!items.length) {
            el.classList.add('hidden');
            el.innerHTML = '';
            return;
        }

        el.classList.remove('hidden');
        el.innerHTML = `
            <div class="benefits-header">EQUIPMENT PERKS</div>
            ${items.join('')}`;
    }

    // ================================================================
    // EQUIPMENT SLOTS — click handlers & rendering
    // ================================================================
    function clearAllSlotUIs() {
        S.updateSlotUI('slotEquipment', null, 'equipment');
        S.updateSlotUI('slotShield', null, 'shield');
        S.updateSlotUI('slotCore1', null, 'core');
        S.updateSlotUI('slotCore2', null, 'core');
        S.updateSlotUI('slotImplantHead', null, 'implant');
        S.updateSlotUI('slotImplantTorso', null, 'implant');
        S.updateSlotUI('slotImplantLegs', null, 'implant');

        // Clear rarity attributes
        ['slotEquipment', 'slotShield', 'slotCore1', 'slotCore2', 'slotImplantHead', 'slotImplantTorso', 'slotImplantLegs'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.removeAttribute('data-rarity');
        });
    }

    function updateEquipmentSlotUI(slotKey, item) {
        const slotMap = {
            equipment: 'slotEquipment',
            shield: 'slotShield',
            core1: 'slotCore1',
            core2: 'slotCore2',
            head: 'slotImplantHead',
            torso: 'slotImplantTorso',
            legs: 'slotImplantLegs',
        };
        const type = slotKey === 'equipment' ? 'equipment' :
                     slotKey.startsWith('core') ? 'core' :
                     slotKey === 'shield' ? 'shield' : 'implant';

        S.updateSlotUI(slotMap[slotKey], item, type);

        // Add rarity glow
        const el = document.getElementById(slotMap[slotKey]);
        if (el) {
            if (item && item.rarity) {
                el.setAttribute('data-rarity', item.rarity.toLowerCase());
            } else {
                el.removeAttribute('data-rarity');
            }
        }
    }

    function equipItem(slotKey, item) {
        state.equipment[slotKey] = item;
        updateEquipmentSlotUI(slotKey, item);
        renderStats();
        renderStatSummary();
        renderEquipmentBenefits();
        renderBuildSummary();
    }

    function clearSlot(slotKey) {
        equipItem(slotKey, null);
    }

    function initSlotEventListeners() {
        const slotConfigs = [
            { slotKey: 'equipment', elementId: 'slotEquipment' },
            { slotKey: 'shield', elementId: 'slotShield' },
            { slotKey: 'core1',  elementId: 'slotCore1' },
            { slotKey: 'core2',  elementId: 'slotCore2' },
            { slotKey: 'head',   elementId: 'slotImplantHead' },
            { slotKey: 'torso',  elementId: 'slotImplantTorso' },
            { slotKey: 'legs',   elementId: 'slotImplantLegs' },
        ];

        slotConfigs.forEach(({ slotKey, elementId }) => {
            const el = document.getElementById(elementId);
            if (!el) return;

            el.addEventListener('click', (e) => {
                // If clicking the clear button, clear the slot
                if (e.target.closest('.slot-clear-btn')) {
                    e.stopPropagation();
                    clearSlot(slotKey);
                    return;
                }

                // If disabled, do nothing
                if (el.disabled) return;

                // Open appropriate picker
                openSlotPicker(slotKey);
            });
        });
    }

    // ================================================================
    // PICKER INTEGRATION
    // ================================================================
    function openSlotPicker(slotKey) {
        if (!state.selectedRunner) return;

        if (slotKey === 'equipment') {
            const items = (S.cache.items || []).filter(i =>
                i.type === 'equipment' ||
                (i.category && i.category.toLowerCase() === 'equipment') ||
                (i.source_table && i.source_table === 'equipment')
            );
            S.openPicker('equipment', items, {
                title: 'Select Equipment',
                filters: '<button class="picker-filter-btn active" data-filter="all">All</button>',
                filterFn: null,
                itemType: 'equipment',
                currentItem: state.equipment.equipment,
            });
        } else if (slotKey === 'shield') {
            const shields = (state.compatibleImplants && state.compatibleImplants.shield) || [];
            S.openPicker('shield', shields, {
                title: 'Select Shield',
                filters: buildImplantRarityFilters(shields),
                filterFn: S.rarityFilterFn,
                itemType: 'shield',
                currentItem: state.equipment.shield,
            });
        } else if (slotKey === 'core1' || slotKey === 'core2') {
            const cores = state.compatibleCores || [];
            // Exclude the core already in the other slot
            const otherSlot = slotKey === 'core1' ? 'core2' : 'core1';
            const otherCore = state.equipment[otherSlot];
            const available = otherCore
                ? cores.filter(c => c.slug !== otherCore.slug)
                : cores;

            S.openPicker(slotKey, available, {
                title: `Select Core ${slotKey === 'core1' ? '1' : '2'}`,
                filters: buildImplantRarityFilters(available),
                filterFn: S.rarityFilterFn,
                itemType: 'core',
                currentItem: state.equipment[slotKey],
            });
        } else {
            // Implant slots: head, torso, legs
            const implants = (state.compatibleImplants && state.compatibleImplants[slotKey]) || [];
            S.openPicker(slotKey, implants, {
                title: `Select ${S.capitalize(slotKey)} Implant`,
                filters: buildImplantRarityFilters(implants),
                filterFn: S.rarityFilterFn,
                itemType: 'implant',
                currentItem: state.equipment[slotKey],
            });
        }
    }

    function buildImplantRarityFilters(items) {
        let html = '<button class="picker-filter-btn active" data-filter="all">All</button>';
        const order = ['standard', 'enhanced', 'deluxe', 'superior', 'prestige'];
        const rarities = [...new Set(items.map(i => (i.rarity || '').toLowerCase()).filter(Boolean))];
        rarities.sort((a, b) => order.indexOf(a) - order.indexOf(b));
        rarities.forEach(r => {
            html += `<button class="picker-filter-btn" data-filter="${r}">${S.capitalize(r)}</button>`;
        });
        return html;
    }

    function onPickerSelect(slotType, item) {
        // slotType is one of: 'equipment', 'shield', 'core1', 'core2', 'head', 'torso', 'legs'
        equipItem(slotType, item);
    }

    // ================================================================
    // BUILD SUMMARY HEADER
    // ================================================================
    function renderBuildSummary() {
        if (!state.selectedRunner) {
            dom.buildSummary.classList.add('hidden');
            return;
        }

        const eq = state.equipment;
        const parts = [];

        parts.push(`<span class="wb-summary-slot"><span class="wb-summary-label">Runner:</span> ${state.selectedRunner.name}</span>`);

        const equipCount = Object.values(eq).filter(v => v != null).length;
        if (equipCount > 0) {
            parts.push(`<span class="wb-summary-slot"><span class="wb-summary-label">Equipment:</span> ${equipCount} item${equipCount > 1 ? 's' : ''}</span>`);
        }

        dom.buildSummary.innerHTML = parts.join('<span class="wb-summary-divider">|</span>');
        dom.buildSummary.classList.remove('hidden');
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

    // ================================================================
    // SHARE CODE — server-side persistence
    // ================================================================
    async function loadFromShareCode(code) {
        // Show loading state
        const emptyEl = dom.runnerDisplay.querySelector('.runner-display-empty');
        if (emptyEl) emptyEl.classList.add('hidden');
        dom.runnerDisplayInfo.classList.remove('hidden');
        dom.runnerDisplayName.textContent = 'Loading…';
        dom.runnerDisplayRole.textContent = '';
        dom.runnerDisplayDesc.textContent = '';
        dom.runnerStatsPanel.classList.remove('hidden');
        dom.runnerStatsBars.innerHTML = '<div class="wb-loading-stats">Loading shared build…</div>';

        try {
            const resp = await MarathonAPI.getLoadout(code);
            const data = resp?.data || resp;
            if (!data) {
                showShareCodeError('Build not found. It may have been deleted.');
                return;
            }

            state.shareCode = data.share_code || code;
            state.views = data.views || 0;

            // Resolve runner
            const runnerRef = data.runner;
            const runnerSlug = typeof runnerRef === 'string' ? runnerRef : (runnerRef && runnerRef.slug);
            if (!runnerSlug) {
                showShareCodeError('This build has no runner data.');
                return;
            }

            const runner = (S.cache.runners || []).find(r => r.slug === runnerSlug);
            if (!runner) {
                showShareCodeError(`Runner "${runnerSlug}" not found.`);
                return;
            }

            await selectRunner(runner);

            // Now restore equipment from hydrated data
            const re = data.runner_equipment;
            if (re) {
                const implantsBySlot = state.compatibleImplants || {};
                const cores = state.compatibleCores || [];

                // Shield
                if (re.shield) {
                    const shieldSlug = typeof re.shield === 'string' ? re.shield : re.shield.slug;
                    if (shieldSlug) {
                        const shields = implantsBySlot.shield || [];
                        const shield = shields.find(s => s.slug === shieldSlug);
                        if (shield) equipItem('shield', shield);
                    }
                }

                // Cores
                if (re.cores && Array.isArray(re.cores)) {
                    re.cores.forEach((coreRef, idx) => {
                        const coreSlug = typeof coreRef === 'string' ? coreRef : (coreRef && coreRef.slug);
                        if (coreSlug) {
                            const core = cores.find(c => c.slug === coreSlug);
                            if (core) equipItem(idx === 0 ? 'core1' : 'core2', core);
                        }
                    });
                }

                // Implants
                if (re.implants) {
                    for (const slot of ['head', 'torso', 'legs']) {
                        const implantRef = re.implants[slot];
                        if (!implantRef) continue;
                        const implantSlug = typeof implantRef === 'string' ? implantRef : implantRef.slug;
                        if (implantSlug) {
                            const items = implantsBySlot[slot] || [];
                            const item = items.find(i => i.slug === implantSlug);
                            if (item) equipItem(slot, item);
                        }
                    }
                }

                // Equipment (tactical item)
                if (re.equipment) {
                    const equipSlug = typeof re.equipment === 'string' ? re.equipment : re.equipment.slug;
                    if (equipSlug) {
                        const equipmentItem = (S.cache.items || []).find(i => i.slug === equipSlug);
                        if (equipmentItem) equipItem('equipment', equipmentItem);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load shared loadout:', e);
            showShareCodeError('Failed to load this build. Please try again.');
        }
    }

    function showShareCodeError(message) {
        dom.runnerDisplayInfo.classList.add('hidden');
        dom.runnerStatsPanel.classList.add('hidden');

        const emptyEl = dom.runnerDisplay.querySelector('.runner-display-empty');
        if (emptyEl) emptyEl.classList.remove('hidden');

        // Show error in runner display area
        const existingErr = dom.runnerDisplay.querySelector('.wb-share-error');
        if (existingErr) existingErr.remove();

        const errDiv = document.createElement('div');
        errDiv.className = 'wb-share-error';
        errDiv.innerHTML = `<p>${S.escapeHTML(message)}</p><a href="/marathon/runner-loadout-builder/" class="loadout-action-btn">Start Fresh</a>`;
        dom.runnerDisplay.appendChild(errDiv);
    }

    async function share() {
        if (!state.selectedRunner) return;

        if (state.shareCode) {
            const url = `${window.location.origin}/runner-loadout-builder/?code=${state.shareCode}`;
            S.copyToClipboard(url, dom.shareToast);
            return;
        }

        // Quick-share: auto-generate a name and save directly (no modal)
        let autoName = `${state.selectedRunner.name} Build`;
        const firstCore = state.equipment.core1 || state.equipment.core2;
        if (firstCore) {
            autoName = `${state.selectedRunner.name} — ${firstCore.name}`;
        }
        await saveToServer(autoName, '', true);
    }

    // ================================================================
    // SAVE — server-side via POST /api/loadouts
    // ================================================================
    async function saveToServer(name, authorName, andShare) {
        if (!state.selectedRunner) return;

        const eq = state.equipment;
        const payload = {
            name: name || 'Untitled Runner Build',
            type: 'runner',
            season: currentSeason ? currentSeason.version : undefined,
            runner: state.selectedRunner.slug,
            runner_equipment: {
                shield: eq.shield ? eq.shield.slug : null,
                cores: [eq.core1, eq.core2].filter(Boolean).map(c => c.slug),
                implants: {
                    head: eq.head ? eq.head.slug : null,
                    torso: eq.torso ? eq.torso.slug : null,
                    legs: eq.legs ? eq.legs.slug : null,
                },
                equipment: eq.equipment ? eq.equipment.slug : null,
            },
            primary_weapon: null,
            primary_mods: [],
            secondary_weapon: null,
            secondary_mods: [],
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

                history.replaceState(null, '', `/marathon/runner-loadout-builder/?code=${data.share_code}`);

                if (andShare) {
                    const url = `${window.location.origin}/runner-loadout-builder/?code=${data.share_code}`;
                    S.copyToClipboard(url, dom.shareToast);
                }

                // Local reference
                const entry = {
                    id: S.generateId(),
                    name: payload.name,
                    date: new Date().toISOString(),
                    shareCode: data.share_code,
                    runner: state.selectedRunner
                        ? { slug: state.selectedRunner.slug, name: state.selectedRunner.name }
                        : null,
                };
                S.saveToStorage(STORAGE_KEY, entry);
                renderSaved();
            }
        } catch (err) {
            const body = err.body || {};
            const errorCode = body.error || '';
            let message = '';

            if (errorCode === 'profanity_detected') {
                message = body.detail || 'The name contains inappropriate language. Please choose another.';
            } else if (errorCode === 'name_required' || errorCode === 'validation_error') {
                message = body.detail || body.message || 'Please enter a valid build name.';
            } else if (errorCode === 'name_too_long') {
                message = 'Build name must be 60 characters or less.';
            } else if (errorCode === 'invalid_slug') {
                message = body.detail || body.message || 'One of the selected items is invalid.';
            } else if (errorCode === 'empty_loadout') {
                message = 'Select a runner and at least one piece of equipment before saving.';
            } else {
                message = body.detail || body.message || 'Failed to save. Please try again.';
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
            basePath: '/marathon/runner-loadout-builder/',
            toastEl: dom.shareToast,
            onLoad: (entry) => {
                if (entry.shareCode) {
                    window.location.href = `/runner-loadout-builder/?code=${entry.shareCode}`;
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
        if (!state.selectedRunner) return;

        let defaultName = `${state.selectedRunner.name} Build`;
        const firstCore = state.equipment.core1 || state.equipment.core2;
        if (firstCore) {
            defaultName = `${state.selectedRunner.name} — ${firstCore.name}`;
        }

        dom.loadoutNameInput.value = defaultName;
        if (dom.authorNameInput) dom.authorNameInput.value = '';
        if (dom.saveError) {
            dom.saveError.textContent = '';
            dom.saveError.classList.add('hidden');
        }

        dom.saveConfirmBtn.dataset.andShare = andShareAfter ? '1' : '';

        dom.saveModal.classList.add('active');
        dom.loadoutNameInput.focus();
        dom.loadoutNameInput.select();
    }

    // ================================================================
    // CLEAR
    // ================================================================
    function clearAll() {
        state.selectedRunner = null;
        state.runnerDetail = null;
        state.compatibleCores = [];
        state.compatibleImplants = {};
        state.equipment = { equipment: null, shield: null, core1: null, core2: null, head: null, torso: null, legs: null };
        state.shareCode = null;
        state.views = null;

        // Reset runner display
        const emptyEl = dom.runnerDisplay.querySelector('.runner-display-empty');
        if (emptyEl) emptyEl.classList.remove('hidden');
        dom.runnerDisplayInfo.classList.add('hidden');
        dom.runnerStatsPanel.classList.add('hidden');
        dom.statSummarySection.classList.add('hidden');
        if (dom.runnerEquipmentBenefits) {
            dom.runnerEquipmentBenefits.classList.add('hidden');
            dom.runnerEquipmentBenefits.innerHTML = '';
        }

        // Remove share errors
        const err = dom.runnerDisplay.querySelector('.wb-share-error');
        if (err) err.remove();

        // Reset core slots
        dom.slotCore1.disabled = true;
        dom.slotCore2.disabled = true;
        dom.coresHint.textContent = '(select a runner first)';

        // Clear slot UIs
        clearAllSlotUIs();

        // Remove selector active state
        dom.runnerSelectorBar.querySelectorAll('.runner-select-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        renderBuildSummary();
        history.replaceState(null, '', '/marathon/runner-loadout-builder/');
    }

    // ================================================================
    // EVENT LISTENERS
    // ================================================================
    function initEventListeners() {
        // Header actions
        dom.clearBtn.addEventListener('click', clearAll);
        dom.shareBtn.addEventListener('click', share);

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

        dom.runnerSelectorBar.innerHTML = '<span style="color: var(--text-dim); font-size: 13px; padding: 20px;">Loading game data…</span>';

        // Fetch runner data, stat ranges, and current season in parallel
        const [, rangesResp, seasonResp] = await Promise.all([
            S.loadRunnerData(),
            MarathonAPI.getRunnerStatRanges().catch(() => null),
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

        renderRunnerSelector();
        initSlotEventListeners();
        renderSaved();
        await loadFromURL();

        initEventListeners();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
