/**
 * LoadoutShared — Common utilities for all Loadout Builder pages.
 * Provides API fetching, cache, picker modal, save/load, share, and helpers.
 */
const LoadoutShared = (() => {
    'use strict';

    const API_BASE = 'https://helpbot.marathondb.gg';
    const WEAPONS_API_BASE = 'https://weapons.marathondb.gg';
    const CORES_API_BASE = 'https://cores.marathondb.gg';
    const IMPLANTS_API_BASE = 'https://implants.marathondb.gg';

    // ================================================================
    // DATA CACHE
    // ================================================================
    const cache = {
        runners: [],
        weapons: [],
        cores: [],
        implants: [],
        mods: [],
        items: [],
        shields: [],
    };

    // ================================================================
    // API HELPERS
    // ================================================================
    async function fetchData(endpoint) {
        try {
            if (typeof MarathonAPI !== 'undefined') {
                const cleanEndpoint = endpoint.replace(/^\/api/, '');
                const result = await MarathonAPI.get(cleanEndpoint);
                return result.data || result;
            }
            const res = await fetch(`${API_BASE}${endpoint}`);
            const json = await res.json();
            return json.data || json;
        } catch (e) {
            console.error(`Failed to fetch ${endpoint}:`, e);
            return [];
        }
    }

    async function loadAllData() {
        const [runners, weaponsResp, coresResp, implantsResp, modsResp, items] = await Promise.all([
            fetchData('/api/runners'),
            typeof WeaponsAPI !== 'undefined'
                ? WeaponsAPI.getWeapons()
                : fetchData('/api/weapons'),
            MarathonAPI.getCores().catch(() => null),
            MarathonAPI.getImplants().catch(() => null),
            typeof MarathonAPI !== 'undefined' && MarathonAPI.getMods
                ? MarathonAPI.getMods()
                : fetchData('/api/mods'),
            fetchData('/api/items/all'),
        ]);

        cache.runners = Array.isArray(runners) ? runners : [];

        const weaponsRaw = weaponsResp?.data || weaponsResp || [];
        cache.weapons = Array.isArray(weaponsRaw) ? weaponsRaw : [];

        const coresRaw = coresResp?.data || coresResp || [];
        cache.cores = Array.isArray(coresRaw) ? coresRaw : [];

        const implantsRaw = implantsResp?.data || implantsResp || [];
        cache.implants = (Array.isArray(implantsRaw) ? implantsRaw : []).map(i => ({
            ...i,
            icon_url: i.icon_url && !i.icon_url.startsWith('http')
                ? `${IMPLANTS_API_BASE}/${i.icon_url}`
                : i.icon_url,
        }));

        const modsRaw = modsResp?.data || modsResp || [];
        cache.mods = Array.isArray(modsRaw) ? modsRaw : [];

        cache.items = Array.isArray(items) ? items : [];
        cache.shields = cache.implants.filter(i => i.slot === 'shield' || i.slot_type === 'shield');
    }

    // Load only the subsets needed
    async function loadWeaponData() {
        const [weaponsResp, modsResp] = await Promise.all([
            typeof WeaponsAPI !== 'undefined'
                ? WeaponsAPI.getWeapons()
                : fetchData('/api/weapons'),
            typeof MarathonAPI !== 'undefined' && MarathonAPI.getMods
                ? MarathonAPI.getMods()
                : fetchData('/api/mods'),
        ]);
        const weaponsRaw = weaponsResp?.data || weaponsResp || [];
        cache.weapons = Array.isArray(weaponsRaw) ? weaponsRaw : [];
        const modsRaw = modsResp?.data || modsResp || [];
        cache.mods = Array.isArray(modsRaw) ? modsRaw : [];
    }

    async function loadRunnerData() {
        const [runners, coresResp, implantsResp, items] = await Promise.all([
            fetchData('/api/runners'),
            MarathonAPI.getCores().catch(() => null),
            MarathonAPI.getImplants().catch(() => null),
            fetchData('/api/items/all'),
        ]);
        cache.runners = Array.isArray(runners) ? runners : [];

        const coresRaw = coresResp?.data || coresResp || [];
        cache.cores = Array.isArray(coresRaw) ? coresRaw : [];

        // Normalize implant icon_url to absolute URLs
        const implantsRaw = implantsResp?.data || implantsResp || [];
        cache.implants = (Array.isArray(implantsRaw) ? implantsRaw : []).map(i => ({
            ...i,
            icon_url: i.icon_url && !i.icon_url.startsWith('http')
                ? `${IMPLANTS_API_BASE}/${i.icon_url}`
                : i.icon_url,
        }));

        cache.items = Array.isArray(items) ? items : [];
        cache.shields = cache.implants.filter(i => i.slot === 'shield' || i.slot_type === 'shield');
    }

    // ================================================================
    // ICON HELPERS
    // ================================================================
    function getItemIcon(item, type) {
        if (!item) return '';
        if (item.icon_url) return item.icon_url;
        const iconBase = (type === 'weapon') ? WEAPONS_API_BASE : API_BASE;
        if (item.icon_path) return `${iconBase}${item.icon_path.startsWith('/') ? '' : '/'}${item.icon_path}`;
        if (item.icon_url_low) return item.icon_url_low;
        if (item.icon_path_low) return `${iconBase}${item.icon_path_low.startsWith('/') ? '' : '/'}${item.icon_path_low}`;

        switch (type) {
            case 'weapon': return `${WEAPONS_API_BASE}/assets/weapons/${item.slug}-180x135.png`;
            case 'runner': return `${API_BASE}/assets/runners/${item.slug}-150x230.png`;
            case 'core': return `${CORES_API_BASE}/assets/items/cores/${item.slug}-72x72.png`;
            case 'implant':
            case 'shield': return `${IMPLANTS_API_BASE}/assets/items/implants/${item.slug}-72x72.png`;
            case 'mod': return `${API_BASE}/assets/items/mods/${item.slug}-72x72.png`;
            case 'equipment': return `${API_BASE}/assets/items/equipment/${item.slug}-72x72.png`;
            default: return '';
        }
    }

    function getRunnerPortrait(slug) {
        return `${API_BASE}/assets/runners/${slug}-300x460.png`;
    }

    // ================================================================
    // FORMATTING
    // ================================================================
    const STAT_DISPLAY_NAMES = {
        // Weapon stats (new weapons API keys)
        firepower_score: 'Firepower',
        accuracy_score: 'Accuracy',
        handling_score: 'Handling',
        range_meters: 'Range',
        magazine_size: 'Magazine',
        damage: 'Damage',
        zoom: 'Zoom',
        rate_of_fire: 'Rate of Fire',
        reload_speed: 'Reload Speed',
        equip_speed: 'Equip Speed',
        ads_speed: 'ADS Speed',
        aim_assist: 'Aim Assist',
        recoil: 'Recoil',
        precision: 'Precision',
        charge_time_seconds: 'Charge Time',
        volt_drain: 'Volt Drain',
        weight: 'Weight',
        hipfire_spread: 'Hipfire Spread',
        ads_spread: 'ADS Spread',
        crouch_spread_bonus: 'Crouch Bonus',
        moving_inaccuracy: 'Move Inaccuracy',
        // Legacy keys (backwards compat for mod effects)
        accuracy: 'Accuracy',
        handling: 'Handling',
        range: 'Range',
        mag_size: 'Magazine',
        precision_multiplier: 'Precision',
        charge_time: 'Charge Time',
        ads_accuracy: 'ADS Accuracy',
        // Mod slot types
        optic: 'Optic',
        barrel: 'Barrel',
        magazine: 'Magazine',
        grip: 'Grip',
        chip: 'Chip',
        generator: 'Generator',
        shield: 'Shield',
        // Runner stats
        heat_capacity: 'Heat Capacity',
        agility: 'Agility',
        loot_speed: 'Loot Speed',
        melee_damage: 'Melee Damage',
        prime_recovery: 'Prime Recovery',
        tactical_recovery: 'Tactical Recovery',
        self_repair_speed: 'Self Repair Speed',
        finisher_siphon: 'Finisher Siphon',
        revive_speed: 'Revive Speed',
        hardware: 'Hardware',
        firewall: 'Firewall',
        fall_resistance: 'Fall Resistance',
        ping_duration: 'Ping Duration',
    };

    function formatStatName(key) {
        if (!key) return '';
        if (STAT_DISPLAY_NAMES[key]) return STAT_DISPLAY_NAMES[key];
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, s => s.toUpperCase())
            .trim();
    }

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ================================================================
    // PICKER MODAL ENGINE
    // ================================================================
    let _pickerModal, _pickerTitle, _pickerSearch, _pickerFilters, _pickerGrid, _pickerEmpty, _pickerClose;
    let _pickerPreview = null;
    let _activePickerSlot = null;
    let _onPickerSelect = null;
    let _currentPickerItems = [];
    let _currentItemType = '';

    function initPicker(opts) {
        _pickerModal = document.getElementById('pickerModal');
        _pickerTitle = document.getElementById('pickerTitle');
        _pickerSearch = document.getElementById('pickerSearchInput');
        _pickerFilters = document.getElementById('pickerFilters');
        _pickerGrid = document.getElementById('pickerGrid');
        _pickerEmpty = document.getElementById('pickerEmpty');
        _pickerClose = document.getElementById('pickerClose');
        _onPickerSelect = opts.onSelect || null;

        // Create preview panel dynamically inside picker-body
        const pickerBody = _pickerModal.querySelector('.picker-body');
        if (pickerBody && !document.getElementById('pickerPreview')) {
            _pickerPreview = document.createElement('div');
            _pickerPreview.id = 'pickerPreview';
            _pickerPreview.className = 'picker-preview hidden';
            pickerBody.appendChild(_pickerPreview);
        } else {
            _pickerPreview = document.getElementById('pickerPreview');
        }

        _pickerClose.addEventListener('click', closePicker);
        _pickerModal.addEventListener('click', (e) => {
            if (e.target === _pickerModal) closePicker();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && _pickerModal.classList.contains('active')) closePicker();
        });
    }

    function openPicker(slotType, items, opts = {}) {
        _activePickerSlot = slotType;
        const title = opts.title || 'Select Item';
        const filtersHTML = opts.filters || '<button class="picker-filter-btn active" data-filter="all">All</button>';
        const itemType = opts.itemType || 'item';
        const currentItem = opts.currentItem || null;

        _pickerTitle.textContent = title;
        _pickerSearch.value = '';
        _pickerFilters.innerHTML = filtersHTML;

        renderPickerItems(items, itemType, currentItem);

        _pickerModal.classList.add('active');
        _pickerSearch.focus();

        // Search handler
        _pickerSearch.oninput = () => {
            const query = _pickerSearch.value.toLowerCase().trim();
            const activeFilter = _pickerFilters.querySelector('.picker-filter-btn.active');
            const filterValue = activeFilter ? activeFilter.dataset.filter : 'all';
            const filtered = filterItems(items, query, filterValue, opts.filterFn);
            renderPickerItems(filtered, itemType, currentItem);
        };

        // Filter handlers
        _pickerFilters.querySelectorAll('.picker-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                _pickerFilters.querySelectorAll('.picker-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const query = _pickerSearch.value.toLowerCase().trim();
                const filtered = filterItems(items, query, btn.dataset.filter, opts.filterFn);
                renderPickerItems(filtered, itemType, currentItem);
            });
        });
    }

    function closePicker() {
        if (_pickerModal) _pickerModal.classList.remove('active');
        _activePickerSlot = null;
        hideItemPreview();
    }

    function filterItems(items, query, filterValue, filterFn) {
        let filtered = items;
        if (query) {
            filtered = filtered.filter(item => {
                const name = (item.name || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                return name.includes(query) || desc.includes(query);
            });
        }
        if (filterValue && filterValue !== 'all' && filterFn) {
            filtered = filtered.filter(i => filterFn(i, filterValue));
        }
        return filtered;
    }

    function renderPickerItems(items, itemType, currentItem) {
        _currentPickerItems = items;
        _currentItemType = itemType;
        hideItemPreview();

        if (!items.length) {
            _pickerGrid.classList.add('hidden');
            _pickerEmpty.classList.remove('hidden');
            return;
        }
        _pickerGrid.classList.remove('hidden');
        _pickerEmpty.classList.add('hidden');

        _pickerGrid.innerHTML = items.map(item => {
            const icon = getItemIcon(item, itemType);
            const rarity = item.rarity || '';
            const meta = getPickerMeta(item, itemType);
            const isSelected = currentItem && currentItem.slug === item.slug;

            return `
                <button class="picker-item${rarity ? ' rarity-' + rarity : ''}${isSelected ? ' selected' : ''}"
                        data-slug="${item.slug}">
                    <img class="picker-item-icon" src="${icon}" alt="${item.name}"
                         onerror="this.style.display='none'" loading="lazy">
                    <div class="picker-item-info">
                        <div class="picker-item-name">${item.name}</div>
                        ${meta ? `<div class="picker-item-meta">${meta}</div>` : ''}
                    </div>
                    <span class="picker-item-detail-btn" title="View details">&#8505;</span>
                </button>`;
        }).join('');

        const hasHover = window.matchMedia('(hover: hover)').matches;

        _pickerGrid.querySelectorAll('.picker-item').forEach(el => {
            // Hover preview (desktop)
            if (hasHover) {
                el.addEventListener('mouseenter', () => {
                    const item = items.find(i => i.slug === el.dataset.slug);
                    if (item) showItemPreview(item, itemType);
                });
            }

            // Info button click (primarily for mobile/touch)
            const detailBtn = el.querySelector('.picker-item-detail-btn');
            if (detailBtn) {
                detailBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const item = items.find(i => i.slug === el.dataset.slug);
                    if (item) showItemPreview(item, itemType);
                });
            }

            // Click to select (immediate on all platforms)
            el.addEventListener('click', () => {
                const slug = el.dataset.slug;
                const item = items.find(i => i.slug === slug);
                if (item && _onPickerSelect) {
                    _onPickerSelect(_activePickerSlot, item);
                }
                closePicker();
            });
        });
    }

    // ================================================================
    // ITEM PREVIEW PANEL
    // ================================================================
    function showItemPreview(item, itemType) {
        if (!_pickerPreview) return;

        // Highlight the previewed item
        _pickerGrid.querySelectorAll('.picker-item').forEach(b => b.classList.remove('previewing'));
        const itemEl = _pickerGrid.querySelector(`[data-slug="${item.slug}"]`);
        if (itemEl) itemEl.classList.add('previewing');

        const icon = getItemIcon(item, itemType);
        const rarity = item.rarity ? item.rarity.toLowerCase() : '';

        let detailHTML = '';

        // Description
        if (item.description) {
            detailHTML += `<p class="preview-desc">${escapeHTML(item.description)}</p>`;
        }

        // Stats (implants, shields)
        if ((itemType === 'implant' || itemType === 'shield') && item.stats && item.stats.length) {
            detailHTML += '<div class="preview-stats">';
            item.stats.forEach(s => {
                const val = s.stat_value;
                const cls = val > 0 ? 'positive' : val < 0 ? 'negative' : '';
                const display = val > 0 ? `+${val}` : `${val}`;
                detailHTML += `<div class="preview-stat ${cls}">
                    <span class="preview-stat-name">${formatStatName(s.stat_name)}</span>
                    <span class="preview-stat-value">${display}</span>
                </div>`;
            });
            detailHTML += '</div>';
        }

        // Effects (cores)
        if (itemType === 'core' && item.effects && item.effects.length) {
            detailHTML += '<div class="preview-stats">';
            item.effects.forEach(e => {
                const val = e.stat_modifier_value;
                const cls = val > 0 ? 'positive' : val < 0 ? 'negative' : '';
                detailHTML += `<div class="preview-stat ${cls}">
                    <span class="preview-stat-name">${formatStatName(e.stat_name || '')}</span>
                    <span class="preview-stat-value">${e.stat_modifier || ''}</span>
                </div>`;
            });
            detailHTML += '</div>';
        }

        _pickerPreview.innerHTML = `
            <div class="preview-header">
                <img class="preview-icon" src="${icon}" alt="${escapeHTML(item.name)}" onerror="this.style.display='none'">
                <div class="preview-title">
                    <span class="preview-name">${escapeHTML(item.name)}</span>
                    ${rarity ? `<span class="preview-rarity rarity-text-${rarity}">${capitalize(rarity)}</span>` : ''}
                </div>
                <button class="preview-close-btn" title="Close preview">&times;</button>
            </div>
            ${detailHTML}
            <button class="preview-select-btn" data-slug="${item.slug}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Select
            </button>
        `;

        _pickerPreview.classList.remove('hidden');

        // Bind select button
        const selectBtn = _pickerPreview.querySelector('.preview-select-btn');
        if (selectBtn) {
            selectBtn.onclick = () => {
                const found = _currentPickerItems.find(i => i.slug === selectBtn.dataset.slug);
                if (found && _onPickerSelect) {
                    _onPickerSelect(_activePickerSlot, found);
                }
                closePicker();
            };
        }

        // Bind close button
        const closeBtn = _pickerPreview.querySelector('.preview-close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => hideItemPreview();
        }
    }

    function hideItemPreview() {
        if (_pickerPreview) {
            _pickerPreview.classList.add('hidden');
            _pickerPreview.innerHTML = '';
        }
        if (_pickerGrid) {
            _pickerGrid.querySelectorAll('.picker-item').forEach(b => b.classList.remove('previewing'));
        }
    }

    function getPickerMeta(item, type) {
        switch (type) {
            case 'weapon': return item.category_name || item.category || '';
            case 'core': return item.rarity ? capitalize(item.rarity) : '';
            case 'mod': return item.slot_type ? capitalize(item.slot_type) : (item.type || '');
            case 'implant':
            case 'shield': {
                const parts = [];
                if (item.rarity) parts.push(capitalize(item.rarity));
                if (item.stats && item.stats.length) {
                    const statStr = item.stats.map(s => {
                        const val = s.stat_value > 0 ? `+${s.stat_value}` : s.stat_value;
                        return `${val} ${formatStatName(s.stat_name)}`;
                    }).join(', ');
                    parts.push(statStr);
                }
                return parts.join(' · ');
            }
            default: return item.rarity ? capitalize(item.rarity) : '';
        }
    }

    // ================================================================
    // SLOT UI HELPERS
    // ================================================================
    function updateSlotUI(elementId, item, type) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const slotItem = el.querySelector('.slot-item');
        let clearBtn = el.querySelector('.slot-clear-btn');

        if (item) {
            el.classList.add('filled');
            if (slotItem) {
                slotItem.classList.remove('hidden');
                const img = slotItem.querySelector('.slot-item-icon');
                const nameEl = slotItem.querySelector('.slot-item-name');
                if (img) {
                    img.src = getItemIcon(item, type);
                    img.alt = item.name;
                    img.onerror = function () { this.style.display = 'none'; };
                }
                if (nameEl) nameEl.textContent = item.name;
            }
            if (!clearBtn) {
                clearBtn = document.createElement('button');
                clearBtn.className = 'slot-clear-btn';
                clearBtn.innerHTML = '×';
                clearBtn.title = 'Remove';
                el.appendChild(clearBtn);
            }
        } else {
            el.classList.remove('filled');
            if (slotItem) slotItem.classList.add('hidden');
            if (clearBtn) clearBtn.remove();
        }
    }

    // ================================================================
    // SAVE / LOAD (LOCAL STORAGE)
    // ================================================================
    function getSavedLoadouts(storageKey) {
        try {
            return JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch { return []; }
    }

    function saveToStorage(storageKey, entry) {
        const saved = getSavedLoadouts(storageKey);
        saved.unshift(entry);
        if (saved.length > 20) saved.pop();
        localStorage.setItem(storageKey, JSON.stringify(saved));
    }

    function deleteFromStorage(storageKey, id) {
        let saved = getSavedLoadouts(storageKey);
        saved = saved.filter(s => s.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(saved));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    // ================================================================
    // SHARE TOAST
    // ================================================================
    function showToast(toastEl) {
        if (!toastEl) return;
        toastEl.classList.remove('hidden');
        toastEl.classList.add('visible');
        setTimeout(() => {
            toastEl.classList.remove('visible');
            setTimeout(() => toastEl.classList.add('hidden'), 300);
        }, 2500);
    }

    function copyToClipboard(text, toastEl) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(toastEl);
        }).catch(() => {
            const input = document.createElement('input');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast(toastEl);
        });
    }

    // ================================================================
    // FILTER BUILDERS
    // ================================================================
    function buildWeaponFilters() {
        let html = '<button class="picker-filter-btn active" data-filter="all">All</button>';
        const categories = [...new Set((cache.weapons || []).map(w => w.category_name || w.category).filter(Boolean))];
        categories.sort().forEach(cat => {
            html += `<button class="picker-filter-btn" data-filter="${cat}">${cat}</button>`;
        });
        return html;
    }

    function buildCoreFilters() {
        let html = '<button class="picker-filter-btn active" data-filter="all">All</button>';
        const order = ['standard', 'enhanced', 'deluxe', 'superior', 'prestige'];
        const rarities = [...new Set((cache.cores || []).map(c => c.rarity).filter(Boolean))];
        rarities.sort((a, b) => order.indexOf(a) - order.indexOf(b));
        rarities.forEach(r => {
            html += `<button class="picker-filter-btn" data-filter="${r}">${capitalize(r)}</button>`;
        });
        return html;
    }

    function buildModFilters() {
        let html = '<button class="picker-filter-btn active" data-filter="all">All</button>';
        const types = [...new Set((cache.mods || []).map(m => {            // Support both new slot_type and legacy type field
            if (m.slot_type) return m.slot_type;            return (m.type || '').replace(/ Mod$/i, '').replace(/^(Standard|Enhanced|Deluxe|Superior|Prestige)\s*/i, '').trim();
        }).filter(Boolean))];
        types.sort().forEach(t => {
            html += `<button class="picker-filter-btn" data-filter="${t}">${t}</button>`;
        });
        return html;
    }

    function buildRarityFilters() {
        let html = '<button class="picker-filter-btn active" data-filter="all">All</button>';
        ['standard', 'enhanced', 'deluxe', 'superior', 'prestige'].forEach(r => {
            html += `<button class="picker-filter-btn" data-filter="${r}">${capitalize(r)}</button>`;
        });
        return html;
    }

    // Filter functions for picker
    function weaponFilterFn(item, filterValue) {
        return (item.category_name || item.category) === filterValue;
    }

    function rarityFilterFn(item, filterValue) {
        return (item.rarity || '').toLowerCase() === filterValue.toLowerCase();
    }

    function modFilterFn(item, filterValue) {
        // Support both new slot_type and legacy type field
        if (item.slot_type) return item.slot_type === filterValue;
        const t = (item.type || '').replace(/ Mod$/i, '').replace(/^(Standard|Enhanced|Deluxe|Superior|Prestige)\s*/i, '').trim();
        return t === filterValue;
    }

    // ================================================================
    // SAVED LOADOUTS RENDERER (generic)
    // ================================================================
    function renderSavedList(containerEl, emptyEl, saved, opts = {}) {
        const { onLoad, onShare, onDelete, basePath, toastEl } = opts;

        // Clear existing cards
        const existing = containerEl.querySelectorAll('.saved-loadout-card');
        existing.forEach(el => el.remove());

        if (!saved.length) {
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');

        saved.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'saved-loadout-card';

            const runnerIcon = entry.runner
                ? `<img src="${API_BASE}/assets/runners/${entry.runner.slug}-150x230.png" alt="${entry.runner.name}" onerror="this.style.display='none'">`
                : '';
            const weaponIcon = (!entry.runner && entry.weapon)
                ? `<img src="${getItemIcon(entry.weapon, 'weapon')}" alt="${entry.weapon.name}" onerror="this.style.display='none'" style="object-fit:contain">`
                : '';

            const meta = [];
            if (entry.runner) meta.push(entry.runner.name);
            if (entry.weapon) meta.push(entry.weapon.name);
            const dateStr = new Date(entry.date).toLocaleDateString();

            card.innerHTML = `
                <div class="saved-loadout-avatar">${runnerIcon || weaponIcon}</div>
                <div class="saved-loadout-info">
                    <div class="saved-loadout-name">${escapeHTML(entry.name)}</div>
                    <div class="saved-loadout-meta">${meta.join(' · ')}${meta.length ? ' · ' : ''}${dateStr}</div>
                </div>
                <div class="saved-loadout-actions">
                    <button class="saved-loadout-action-btn load-btn" title="Load" data-id="${entry.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>
                        </svg>
                    </button>
                    <button class="saved-loadout-action-btn share-btn" title="Copy link"${entry.shareCode ? '' : ' disabled'}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                    </button>
                    <button class="saved-loadout-action-btn delete" title="Delete" data-id="${entry.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>`;

            card.querySelector('.load-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (onLoad) onLoad(entry);
            });
            card.querySelector('.share-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (entry.shareCode) {
                    const url = `${window.location.origin}${basePath || '/marathon/loadout-builder/'}?code=${entry.shareCode}`;
                    copyToClipboard(url, toastEl);
                }
            });
            card.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (onDelete) onDelete(entry.id);
            });
            card.addEventListener('click', () => { if (onLoad) onLoad(entry); });

            containerEl.appendChild(card);
        });
    }

    // ================================================================
    // PUBLIC API
    // ================================================================
    return {
        API_BASE,
        WEAPONS_API_BASE,
        CORES_API_BASE,
        IMPLANTS_API_BASE,
        cache,
        fetchData,
        loadAllData,
        loadWeaponData,
        loadRunnerData,
        getItemIcon,
        getRunnerPortrait,
        formatStatName,
        capitalize,
        escapeHTML,

        // Picker
        initPicker,
        openPicker,
        closePicker,

        // Slot UI
        updateSlotUI,

        // Save/Load
        getSavedLoadouts,
        saveToStorage,
        deleteFromStorage,
        generateId,
        renderSavedList,

        // Share
        showToast,
        copyToClipboard,

        // Filter builders
        buildWeaponFilters,
        buildCoreFilters,
        buildModFilters,
        buildRarityFilters,
        weaponFilterFn,
        rarityFilterFn,
        modFilterFn,
    };
})();
