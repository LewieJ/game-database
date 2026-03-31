/**
 * Complete Loadout Builder — all 11 slots: runner, weapon, equipment, shield, cores, implants, mods.
 */
(function () {
    'use strict';

    const S = LoadoutShared;
    const STORAGE_KEY = 'marathondb_loadouts';

    const state = {
        runner: null,
        weapon: null,
        equipment: null,
        shield: null,
        core1: null,
        core2: null,
        implantHead: null,
        implantTorso: null,
        implantLegs: null,
        mod1: null,
        mod2: null,
    };

    const dom = {};

    function initDomRefs() {
        dom.runnerSelectorBar = document.getElementById('runnerSelectorBar');
        dom.runnerDisplay = document.getElementById('runnerDisplay');
        dom.runnerDisplayInfo = document.getElementById('runnerDisplayInfo');
        dom.runnerDisplayImg = document.getElementById('runnerDisplayImg');
        dom.runnerDisplayName = document.getElementById('runnerDisplayName');
        dom.runnerDisplayRole = document.getElementById('runnerDisplayRole');
        dom.runnerDisplayDesc = document.getElementById('runnerDisplayDesc');
        dom.runnerDisplayAbilities = document.getElementById('runnerDisplayAbilities');
        dom.runnerStatsPanel = document.getElementById('runnerStatsPanel');
        dom.runnerStatsBars = document.getElementById('runnerStatsBars');
        dom.coresHint = document.getElementById('coresHint');
        dom.modsHint = document.getElementById('modsHint');
        dom.statSummarySection = document.getElementById('statSummarySection');
        dom.statSummaryGrid = document.getElementById('statSummaryGrid');

        dom.clearBtn = document.getElementById('clearLoadoutBtn');
        dom.saveBtn = document.getElementById('saveLoadoutBtn');
        dom.shareBtn = document.getElementById('shareLoadoutBtn');
        dom.saveModal = document.getElementById('saveModal');
        dom.saveModalClose = document.getElementById('saveModalClose');
        dom.loadoutNameInput = document.getElementById('loadoutNameInput');
        dom.saveConfirmBtn = document.getElementById('saveConfirmBtn');
        dom.shareToast = document.getElementById('shareToast');
        dom.savedList = document.getElementById('savedLoadoutsList');
        dom.noSaved = document.getElementById('noSavedLoadouts');
    }

    // ================================================================
    // RUNNER SELECTOR
    // ================================================================
    function renderRunnerSelector() {
        if (!S.cache.runners.length) {
            dom.runnerSelectorBar.innerHTML = '<span style="color:var(--text-dim)">Loading runners...</span>';
            return;
        }

        dom.runnerSelectorBar.innerHTML = S.cache.runners
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(runner => `
                <button class="runner-select-btn${state.runner && state.runner.slug === runner.slug ? ' active' : ''}" 
                        data-slug="${runner.slug}">
                    <div class="runner-avatar">
                        <img src="${S.getItemIcon(runner, 'runner')}" 
                             alt="${runner.name}" 
                             onerror="this.style.display='none'" loading="lazy">
                    </div>
                    <span class="runner-select-name">${runner.name}</span>
                </button>
            `).join('');

        dom.runnerSelectorBar.querySelectorAll('.runner-select-btn').forEach(btn => {
            btn.addEventListener('click', () => selectRunner(btn.dataset.slug));
        });
    }

    async function selectRunner(slug) {
        const runner = S.cache.runners.find(r => r.slug === slug);
        if (!runner) return;

        // Toggle off
        if (state.runner && state.runner.slug === slug) {
            state.runner = null;
            state.core1 = null;
            state.core2 = null;
            renderRunnerDisplay();
            renderRunnerSelector();
            updateCoreSlots();
            updateStatSummary();
            return;
        }

        let fullRunner = runner;
        try {
            const detail = await S.fetchData(`/api/runners/${slug}`);
            if (detail && detail.name) fullRunner = detail;
        } catch (e) { /* use basic */ }

        state.runner = fullRunner;
        state.core1 = null;
        state.core2 = null;

        renderRunnerSelector();
        renderRunnerDisplay();
        updateCoreSlots();
        updateSlot('core1');
        updateSlot('core2');
        updateStatSummary();
    }

    function renderRunnerDisplay() {
        const empty = dom.runnerDisplay.querySelector('.runner-display-empty');

        if (!state.runner) {
            empty.classList.remove('hidden');
            dom.runnerDisplayInfo.classList.add('hidden');
            dom.runnerStatsPanel.classList.add('hidden');
            return;
        }

        empty.classList.add('hidden');
        dom.runnerDisplayInfo.classList.remove('hidden');

        const r = state.runner;
        dom.runnerDisplayImg.src = S.getRunnerPortrait(r.slug);
        dom.runnerDisplayImg.alt = r.name;
        dom.runnerDisplayName.textContent = r.name;
        dom.runnerDisplayRole.textContent = r.role || r.class || r.description || '';
        dom.runnerDisplayDesc.textContent = r.description || '';

        let abilitiesHTML = '';
        if (r.abilities && Array.isArray(r.abilities)) {
            const labels = ['PRIME', 'TACTICAL', 'TRAIT 1', 'TRAIT 2'];
            r.abilities.forEach((ability, idx) => {
                const name = typeof ability === 'string' ? ability : (ability.name || '');
                const label = labels[idx] || `ABILITY ${idx + 1}`;
                if (name) {
                    abilitiesHTML += `
                        <div class="ability-tag">
                            <span class="ability-tag-label">${label}</span>
                            <span class="ability-tag-name">${name}</span>
                        </div>`;
                }
            });
        }
        dom.runnerDisplayAbilities.innerHTML = abilitiesHTML;
        renderRunnerStats();
    }

    function renderRunnerStats() {
        const r = state.runner;
        if (!r) return;

        let stats = r.stats || {};
        const statKeys = [
            'health', 'speed', 'armor', 'shield', 'energy',
            'agility', 'heatCapacity', 'selfRepairSpeed', 'reviveSpeed',
            'lootSpeed', 'meleeDamage', 'hardware', 'firewall',
            'fallResistance', 'pingDuration', 'tacticalRecovery',
            'primeRecovery', 'finisherSiphon'
        ];
        statKeys.forEach(key => {
            if (r[key] !== undefined && stats[key] === undefined) stats[key] = r[key];
        });

        const entries = Object.entries(stats).filter(([_, v]) => v !== undefined && v !== null);
        if (!entries.length) {
            dom.runnerStatsPanel.classList.add('hidden');
            return;
        }

        dom.runnerStatsPanel.classList.remove('hidden');
        dom.runnerStatsBars.innerHTML = entries.map(([key, value]) => {
            const maxVal = 30;
            const pct = Math.min(100, Math.max(0, (value / maxVal) * 100));
            return `
                <div class="stat-bar-row">
                    <span class="stat-bar-label">${S.formatStatName(key)}</span>
                    <div class="stat-bar-track">
                        <div class="stat-bar-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="stat-bar-value">${value}</span>
                </div>`;
        }).join('');
    }

    // ================================================================
    // SLOT MANAGEMENT
    // ================================================================
    function updateCoreSlots() {
        const hasRunner = !!state.runner;
        const c1 = document.getElementById('slotCore1');
        const c2 = document.getElementById('slotCore2');
        if (c1) c1.disabled = !hasRunner;
        if (c2) c2.disabled = !hasRunner;
        if (dom.coresHint) dom.coresHint.style.display = hasRunner ? 'none' : '';
    }

    function updateModSlots() {
        const hasWeapon = !!state.weapon;
        const m1 = document.getElementById('slotMod1');
        const m2 = document.getElementById('slotMod2');
        if (m1) m1.disabled = !hasWeapon;
        if (m2) m2.disabled = !hasWeapon;
        if (dom.modsHint) dom.modsHint.style.display = hasWeapon ? 'none' : '';
    }

    function updateSlot(slotKey) {
        const map = {
            weapon: { el: 'slotWeapon', item: state.weapon, type: 'weapon' },
            mod1: { el: 'slotMod1', item: state.mod1, type: 'mod' },
            mod2: { el: 'slotMod2', item: state.mod2, type: 'mod' },
            equipment: { el: 'slotEquipment', item: state.equipment, type: 'equipment' },
            shield: { el: 'slotShield', item: state.shield, type: 'shield' },
            core1: { el: 'slotCore1', item: state.core1, type: 'core' },
            core2: { el: 'slotCore2', item: state.core2, type: 'core' },
            'implant-head': { el: 'slotImplantHead', item: state.implantHead, type: 'implant' },
            'implant-torso': { el: 'slotImplantTorso', item: state.implantTorso, type: 'implant' },
            'implant-legs': { el: 'slotImplantLegs', item: state.implantLegs, type: 'implant' },
        };
        const info = map[slotKey];
        if (!info) return;

        S.updateSlotUI(info.el, info.item, info.type);

        const el = document.getElementById(info.el);
        if (!el) return;
        const clearBtn = el.querySelector('.slot-clear-btn');
        if (clearBtn) {
            clearBtn.onclick = (e) => { e.stopPropagation(); clearSlot(slotKey); };
        }
    }

    function clearSlot(slotKey) {
        const stateMap = {
            weapon: 'weapon',
            mod1: 'mod1',
            mod2: 'mod2',
            equipment: 'equipment',
            shield: 'shield',
            core1: 'core1',
            core2: 'core2',
            'implant-head': 'implantHead',
            'implant-torso': 'implantTorso',
            'implant-legs': 'implantLegs',
        };
        const sk = stateMap[slotKey];
        if (sk) state[sk] = null;

        if (slotKey === 'weapon') {
            state.mod1 = null;
            state.mod2 = null;
            updateSlot('mod1');
            updateSlot('mod2');
            updateModSlots();
        }

        updateSlot(slotKey);
        updateStatSummary();
    }

    // ================================================================
    // PICKER
    // ================================================================
    function openSlotPicker(slotType) {
        let items, title, filters, filterFn, itemType;

        switch (slotType) {
            case 'weapon':
                items = S.cache.weapons || [];
                title = 'Select Weapon';
                filters = S.buildWeaponFilters();
                filterFn = S.weaponFilterFn;
                itemType = 'weapon';
                break;
            case 'mod1':
            case 'mod2':
                items = S.cache.mods || [];
                title = slotType === 'mod1' ? 'Select Mod 1' : 'Select Mod 2';
                filters = S.buildModFilters();
                filterFn = S.modFilterFn;
                itemType = 'mod';
                break;
            case 'equipment':
                items = (S.cache.items || []).filter(i =>
                    i.type === 'equipment' ||
                    (i.category && i.category.toLowerCase() === 'equipment') ||
                    (i.source_table && i.source_table === 'equipment')
                );
                title = 'Select Equipment';
                filters = '<button class="picker-filter-btn active" data-filter="all">All</button>';
                filterFn = null;
                itemType = 'equipment';
                break;
            case 'shield':
                items = S.cache.shields || [];
                title = 'Select Shield';
                filters = S.buildRarityFilters();
                filterFn = S.rarityFilterFn;
                itemType = 'shield';
                break;
            case 'core1':
            case 'core2': {
                if (!state.runner) return;
                const runnerType = (state.runner.role || state.runner.class || state.runner.name || '').toLowerCase();
                items = (S.cache.cores || []).filter(c => {
                    if (!c.runner_type) return true;
                    return c.runner_type.toLowerCase() === runnerType;
                });
                title = slotType === 'core1' ? 'Select Core 1' : 'Select Core 2';
                filters = S.buildCoreFilters();
                filterFn = S.rarityFilterFn;
                itemType = 'core';
                break;
            }
            case 'implant-head':
                items = (S.cache.implants || []).filter(i => i.slot_type === 'head');
                title = 'Select Head Implant';
                filters = S.buildRarityFilters();
                filterFn = S.rarityFilterFn;
                itemType = 'implant';
                break;
            case 'implant-torso':
                items = (S.cache.implants || []).filter(i => i.slot_type === 'torso');
                title = 'Select Torso Implant';
                filters = S.buildRarityFilters();
                filterFn = S.rarityFilterFn;
                itemType = 'implant';
                break;
            case 'implant-legs':
                items = (S.cache.implants || []).filter(i => i.slot_type === 'legs');
                title = 'Select Leg Implant';
                filters = S.buildRarityFilters();
                filterFn = S.rarityFilterFn;
                itemType = 'implant';
                break;
            default:
                return;
        }

        const currentMap = {
            weapon: state.weapon,
            mod1: state.mod1,
            mod2: state.mod2,
            equipment: state.equipment,
            shield: state.shield,
            core1: state.core1,
            core2: state.core2,
            'implant-head': state.implantHead,
            'implant-torso': state.implantTorso,
            'implant-legs': state.implantLegs,
        };

        S.openPicker(slotType, items, {
            title,
            filters,
            filterFn,
            itemType,
            currentItem: currentMap[slotType] || null,
        });
    }

    function onPickerSelect(slotType, item) {
        const stateMap = {
            weapon: 'weapon',
            mod1: 'mod1',
            mod2: 'mod2',
            equipment: 'equipment',
            shield: 'shield',
            core1: 'core1',
            core2: 'core2',
            'implant-head': 'implantHead',
            'implant-torso': 'implantTorso',
            'implant-legs': 'implantLegs',
        };
        const sk = stateMap[slotType];
        if (sk) state[sk] = item;

        // When weapon changes, clear mods
        if (slotType === 'weapon') {
            state.mod1 = null;
            state.mod2 = null;
            updateSlot('mod1');
            updateSlot('mod2');
            updateModSlots();
        }

        updateSlot(slotType);
        updateStatSummary();
    }

    // ================================================================
    // STAT SUMMARY
    // ================================================================
    function updateStatSummary() {
        const totals = {};
        const implants = [state.implantHead, state.implantTorso, state.implantLegs, state.shield];
        implants.forEach(implant => {
            if (implant && implant.stats && Array.isArray(implant.stats)) {
                implant.stats.forEach(s => {
                    totals[s.stat_name] = (totals[s.stat_name] || 0) + (s.stat_value || 0);
                });
            }
        });

        const entries = Object.entries(totals);
        if (!entries.length) {
            dom.statSummarySection.classList.add('hidden');
            return;
        }

        dom.statSummarySection.classList.remove('hidden');
        dom.statSummaryGrid.innerHTML = entries.map(([key, value]) => {
            const sign = value > 0 ? '+' : '';
            const cls = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
            return `
                <div class="stat-summary-item">
                    <span class="stat-summary-label">${S.formatStatName(key)}</span>
                    <span class="stat-summary-value ${cls}">${sign}${value}</span>
                </div>`;
        }).join('');
    }

    // ================================================================
    // URL SHARING — 11 slots
    // ================================================================
    function encode() {
        const parts = [
            state.runner ? state.runner.slug : '',
            state.weapon ? state.weapon.slug : '',
            state.equipment ? state.equipment.slug : '',
            state.shield ? state.shield.slug : '',
            state.core1 ? state.core1.slug : '',
            state.core2 ? state.core2.slug : '',
            state.implantHead ? state.implantHead.slug : '',
            state.implantTorso ? state.implantTorso.slug : '',
            state.implantLegs ? state.implantLegs.slug : '',
            state.mod1 ? state.mod1.slug : '',
            state.mod2 ? state.mod2.slug : '',
        ];
        return btoa(parts.join('|'));
    }

    function decode(hash) {
        try {
            const parts = atob(hash).split('|');
            return {
                runner: parts[0] || null,
                weapon: parts[1] || null,
                equipment: parts[2] || null,
                shield: parts[3] || null,
                core1: parts[4] || null,
                core2: parts[5] || null,
                implantHead: parts[6] || null,
                implantTorso: parts[7] || null,
                implantLegs: parts[8] || null,
                mod1: parts[9] || null,
                mod2: parts[10] || null,
            };
        } catch { return null; }
    }

    async function loadFromURL() {
        const hash = window.location.hash.replace('#', '');
        if (!hash) return;
        const slugs = decode(hash);
        if (!slugs) return;

        if (slugs.runner) {
            const runner = S.cache.runners.find(r => r.slug === slugs.runner);
            if (runner) await selectRunner(runner.slug);
        }
        if (slugs.weapon) {
            state.weapon = (S.cache.weapons || []).find(w => w.slug === slugs.weapon) || null;
            updateSlot('weapon');
            updateModSlots();
        }
        if (slugs.equipment) {
            state.equipment = (S.cache.items || []).find(i => i.slug === slugs.equipment) || null;
            updateSlot('equipment');
        }
        if (slugs.shield) {
            state.shield = (S.cache.shields || []).find(i => i.slug === slugs.shield) || null;
            updateSlot('shield');
        }
        if (slugs.core1) {
            state.core1 = (S.cache.cores || []).find(c => c.slug === slugs.core1) || null;
            updateSlot('core1');
        }
        if (slugs.core2) {
            state.core2 = (S.cache.cores || []).find(c => c.slug === slugs.core2) || null;
            updateSlot('core2');
        }
        if (slugs.implantHead) {
            state.implantHead = (S.cache.implants || []).find(i => i.slug === slugs.implantHead) || null;
            updateSlot('implant-head');
        }
        if (slugs.implantTorso) {
            state.implantTorso = (S.cache.implants || []).find(i => i.slug === slugs.implantTorso) || null;
            updateSlot('implant-torso');
        }
        if (slugs.implantLegs) {
            state.implantLegs = (S.cache.implants || []).find(i => i.slug === slugs.implantLegs) || null;
            updateSlot('implant-legs');
        }
        if (slugs.mod1) {
            state.mod1 = (S.cache.mods || []).find(m => m.slug === slugs.mod1) || null;
            updateSlot('mod1');
        }
        if (slugs.mod2) {
            state.mod2 = (S.cache.mods || []).find(m => m.slug === slugs.mod2) || null;
            updateSlot('mod2');
        }
        updateStatSummary();
    }

    function share() {
        const hasAnything = Object.values(state).some(v => v !== null);
        if (!hasAnything) return;
        const encoded = encode();
        const url = `${window.location.origin}/complete-loadout-builder/#${encoded}`;
        history.replaceState(null, '', `/marathon/complete-loadout-builder/#${encoded}`);
        S.copyToClipboard(url, dom.shareToast);
    }

    // ================================================================
    // SAVE / LOAD
    // ================================================================
    function save(name) {
        const entry = {
            id: S.generateId(),
            name: name || 'Untitled Loadout',
            date: new Date().toISOString(),
            hash: encode(),
            runner: state.runner ? { slug: state.runner.slug, name: state.runner.name } : null,
            weapon: state.weapon ? { slug: state.weapon.slug, name: state.weapon.name } : null,
        };
        S.saveToStorage(STORAGE_KEY, entry);
        renderSaved();
    }

    function renderSaved() {
        const saved = S.getSavedLoadouts(STORAGE_KEY);
        S.renderSavedList(dom.savedList, dom.noSaved, saved, {
            basePath: '/marathon/complete-loadout-builder/',
            toastEl: dom.shareToast,
            onLoad: (entry) => {
                window.location.hash = entry.hash;
                loadFromURL();
            },
            onDelete: (id) => {
                S.deleteFromStorage(STORAGE_KEY, id);
                renderSaved();
            },
        });
    }

    // ================================================================
    // CLEAR
    // ================================================================
    function clearAll() {
        Object.keys(state).forEach(k => state[k] = null);
        const allSlotKeys = [
            'weapon', 'mod1', 'mod2', 'equipment', 'shield',
            'core1', 'core2', 'implant-head', 'implant-torso', 'implant-legs'
        ];
        allSlotKeys.forEach(s => updateSlot(s));
        renderRunnerSelector();
        renderRunnerDisplay();
        updateCoreSlots();
        updateModSlots();
        updateStatSummary();
        history.replaceState(null, '', '/complete-loadout-builder/');
    }

    // ================================================================
    // INIT
    // ================================================================
    function initEventListeners() {
        document.querySelectorAll('.equipment-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                if (slot.disabled) return;
                openSlotPicker(slot.dataset.slot);
            });
        });

        dom.clearBtn.addEventListener('click', clearAll);
        dom.shareBtn.addEventListener('click', share);

        dom.saveBtn.addEventListener('click', () => {
            const hasAnything = Object.values(state).some(v => v !== null);
            if (!hasAnything) return;
            const name = state.runner
                ? state.runner.name + (state.weapon ? ' + ' + state.weapon.name : '') + ' Loadout'
                : state.weapon ? state.weapon.name + ' Loadout' : 'My Loadout';
            dom.loadoutNameInput.value = name;
            dom.saveModal.classList.add('active');
            dom.loadoutNameInput.focus();
            dom.loadoutNameInput.select();
        });

        dom.saveConfirmBtn.addEventListener('click', () => {
            save(dom.loadoutNameInput.value.trim());
            dom.saveModal.classList.remove('active');
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

    async function init() {
        initDomRefs();
        S.initPicker({ onSelect: onPickerSelect });

        dom.runnerSelectorBar.innerHTML = '<span style="color: var(--text-dim); font-size: 13px; padding: 20px;">Loading game data...</span>';

        // Load all data since we need everything
        await S.loadAllData();

        renderRunnerSelector();
        renderRunnerDisplay();
        updateCoreSlots();
        updateModSlots();
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
